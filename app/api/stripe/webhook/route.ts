import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { getGameDb } from "@/lib/game-db";
import { logPayment } from "@/lib/payment-logger";

export const runtime = "nodejs";
// Required to receive the raw body for signature verification
export const dynamic = "force-dynamic";

function sanitizeTableName(table: string): string {
  return table.replace(/`/g, "").trim() || "dbb_payments";
}

async function tableExists(conn: Awaited<ReturnType<typeof getGameDb>>["conn"], table: string): Promise<boolean> {
  const [rows] = await conn.execute(
    "SELECT 1 AS ok FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1",
    [table],
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function creditCpsDirectly(params: {
  conn: Awaited<ReturnType<typeof getGameDb>>["conn"];
  accountsTable: string;
  charactersTable: string;
  accountName: string;
  characterName: string;
  cpsTotal: number;
}) {
  const [result] = await params.conn.execute(
    `UPDATE \`${params.charactersTable}\` AS t
       JOIN \`${params.accountsTable}\` AS a ON a.EntityID = t.EntityID
       SET t.CPs = t.CPs + ?
     WHERE a.Username = ? AND t.Name = ?`,
    [params.cpsTotal, params.accountName, params.characterName],
  );

  const res = result as { affectedRows?: number };
  if (!res.affectedRows) {
    throw new Error("Direct CP credit failed: character/account match not found.");
  }
}

async function upsertLegacyPayment(params: {
  conn: Awaited<ReturnType<typeof getGameDb>>["conn"];
  tableName: string;
  userId: string;
  txn: string;
  product: string;
  price: number;
  basketIdent: string;
  status: number;
}) {
  const table = sanitizeTableName(params.tableName);
  const unixTime = String(Math.floor(Date.now() / 1000));
  const normalizedPrice = Math.max(0, Math.round(Number(params.price) || 0));

  const [existing] = await params.conn.execute(
    `SELECT id FROM \`${table}\` WHERE txn = ? OR basket_ident = ? ORDER BY id DESC LIMIT 1`,
    [params.txn, params.basketIdent],
  );

  const existingRows = existing as Array<{ id: number }>;
  if (existingRows.length > 0) {
    await params.conn.execute(
      `UPDATE \`${table}\`
         SET user_id = ?, txn = ?, product = ?, price = ?, basket_ident = ?, item_number = 1, status = ?, date = ?, since = NOW()
       WHERE id = ?`,
      [params.userId, params.txn, params.product, normalizedPrice, params.basketIdent, params.status, unixTime, existingRows[0].id],
    );
    return;
  }

  await params.conn.execute(
    `INSERT INTO \`${table}\` (user_id, txn, product, price, basket_ident, item_number, status, date, since)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, NOW())`,
    [params.userId, params.txn, params.product, normalizedPrice, params.basketIdent, params.status, unixTime],
  );
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  const body = await req.text();

  // Get Stripe secret key from Supabase to verify the event
  const supabase = await createAdminClient();
  const { data: cfg } = await supabase
    .from("server_config")
    .select("stripe_sk_test, stripe_sk_live, stripe_mode")
    .eq("id", 1)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = cfg as any;
  const sk: string = c?.stripe_mode === "live" ? (c?.stripe_sk_live ?? "") : (c?.stripe_sk_test ?? "");
  if (!sk) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(sk, { apiVersion: "2026-02-25.clover" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe/webhook] Signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata ?? {};
  const donationId    = meta.donation_id;
  const characterName = meta.character_name;
  const accountName   = meta.account_name ?? meta.username ?? null;
  const versionNum    = parseInt(meta.version ?? "2", 10);

  if (!donationId || !characterName) {
    console.error("[stripe/webhook] Missing metadata on session:", session.id);
    await logPayment({ source: "stripe", level: "error", event: "missing_metadata",
      message: `Stripe session ${session.id} sin metadata donation_id o character_name` });
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

  // Prevent duplicate credits when Stripe retries the same webhook.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingDonationQuery = await (supabase as any)
    .from("donations")
    .select("id, status, payment_intent_id, cps_total, package_id, amount_paid")
    .eq("id", donationId)
    .single();

  const existingDonation = existingDonationQuery.data as {
    id: string;
    status: string;
    payment_intent_id: string | null;
    cps_total: number;
    package_id: string | null;
    amount_paid: number;
  } | null;

  if (existingDonation?.status === "credited" && existingDonation.payment_intent_id === paymentIntentId) {
    await logPayment({ source: "stripe", level: "info", event: "duplicate_skipped",
      message: `Stripe checkout duplicado ignorado (donation ya en estado 'credited')`,
      donation_id: donationId, txn_id: paymentIntentId });
    return NextResponse.json({ received: true, duplicate: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: donation, error: fetchErr } = await (supabase as any)
    .from("donations")
    .update({ status: "paid", payment_intent_id: paymentIntentId })
    .eq("id", donationId)
    .select("id, cps_base, cps_total, package_id, amount_paid")
    .single();

  if (fetchErr || !donation) {
    console.error("[stripe/webhook] Could not update donation:", fetchErr?.message);
    await logPayment({ source: "stripe", level: "error", event: "donation_update_failed",
      message: `No se pudo actualizar donation ${donationId}: ${fetchErr?.message ?? "sin datos"}`,
      donation_id: donationId, txn_id: paymentIntentId });
    return NextResponse.json({ error: "Donation update failed" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const don = donation as any;

  await logPayment({ source: "stripe", level: "info", event: "payment_completed",
    message: `Pago completado Stripe: $${don.amount_paid} | producto '${meta.package_id ?? don.package_id ?? ""}' | v${versionNum}`,
    username: accountName || null, product: String(meta.package_id ?? don.package_id ?? "") || null,
    amount: Number(don.amount_paid ?? 0), donation_id: donationId, txn_id: paymentIntentId });

  // 2. Insert into game MariaDB (cq_pending_donations)
  try {
    const { conn, config: gameCfg } = await getGameDb(versionNum as 1 | 2);
    try {
      await upsertLegacyPayment({
        conn,
        tableName: gameCfg.table_payments,
        userId: String(accountName ?? ""),
        txn: paymentIntentId ?? session.id,
        product: String(meta.package_id ?? don.package_id ?? ""),
        price: Number(don.amount_paid ?? 0),
        basketIdent: String(donationId),
        status: 1,
      });

      if (!accountName) {
        throw new Error("Direct CP credit failed: missing account_name metadata.");
      }

      await creditCpsDirectly({
        conn,
        accountsTable: gameCfg.table_accounts,
        charactersTable: gameCfg.table_characters,
        accountName,
        characterName,
        cpsTotal: Number(don.cps_total ?? don.cps_base ?? 0),
      });

      const hasPendingTable = await tableExists(conn, "cq_pending_donations");
      if (hasPendingTable) {
        await conn.execute(
          `INSERT INTO cq_pending_donations
             (donation_uuid, char_name, account_name, version, cps_base, cps_total, status)
           VALUES (?, ?, ?, ?, ?, ?, 'credited')`,
          [donationId, characterName, accountName, versionNum, don.cps_base, don.cps_total],
        );
      }
    } finally {
      await conn.end();
    }

    // 3. Mark donation as credited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({ status: "credited", game_credited_at: new Date().toISOString() })
      .eq("id", donationId);

    await logPayment({ source: "stripe", level: "info", event: "credited",
      message: `CPs acreditados: ${don.cps_total} CP para '${characterName}'`,
      username: accountName || null, product: String(meta.package_id ?? don.package_id ?? "") || null,
      amount: Number(don.amount_paid ?? 0), donation_id: donationId, txn_id: paymentIntentId,
      metadata: { cps_total: don.cps_total, character_name: characterName } });

  } catch (dbErr: unknown) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    console.error("[stripe/webhook] Game DB insert failed:", msg);
    await logPayment({ source: "stripe", level: "error", event: "credit_error",
      message: `Error acreditando CPs en game DB: ${msg}`,
      username: accountName || null, donation_id: donationId, txn_id: paymentIntentId });
    // Don't return error — payment was successful, manually credit if needed
    // But mark the donation with a note so admin can see it failed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({ notes: `Game DB insert failed: ${msg}` })
      .eq("id", donationId);
  }

  return NextResponse.json({ received: true });
}
