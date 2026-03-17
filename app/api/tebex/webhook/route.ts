import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getGameDb } from "@/lib/game-db";
import { getTebexConfig, verifyTebexWebhookSignature } from "@/lib/tebex";
import { logPayment } from "@/lib/payment-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TebexPaymentSubject = {
  transaction_id?: string;
  price?: { amount?: number; currency?: string };
  status?: { id?: number; description?: string };
  custom?: Record<string, unknown> | null;
};

type TebexWebhookPayload = {
  id?: string;
  type?: string;
  subject?: TebexPaymentSubject;
};

function sanitizeTableName(table: string): string {
  return table.replace(/`/g, "").trim() || "dbb_payments";
}

function extractBasketIdent(note: string | null | undefined): string | null {
  const m = (note ?? "").match(/Tebex basket:\s*([^\s]+)/i);
  return m?.[1] ?? null;
}

async function upsertLegacyPayment(params: {
  versionNum: number;
  userId: string;
  txn: string | null;
  product: string;
  price: number;
  basketIdent: string;
  status: number;
}) {
  const { conn, config } = await getGameDb(params.versionNum as 1 | 2);
  const table = sanitizeTableName(config.table_payments);
  const unixTime = String(Math.floor(Date.now() / 1000));
  const normalizedPrice = Math.max(0, Math.round(Number(params.price) || 0));

  try {
    const lookupSql = params.txn
      ? `SELECT id FROM \`${table}\` WHERE txn = ? OR basket_ident = ? ORDER BY id DESC LIMIT 1`
      : `SELECT id FROM \`${table}\` WHERE basket_ident = ? ORDER BY id DESC LIMIT 1`;
    const lookupArgs = params.txn
      ? [params.txn, params.basketIdent]
      : [params.basketIdent];

    const [existing] = await conn.execute(lookupSql, lookupArgs);
    const rows = existing as Array<{ id: number }>;

    if (rows.length > 0) {
      await conn.execute(
        `UPDATE \`${table}\`
           SET user_id = ?, txn = ?, product = ?, price = ?, basket_ident = ?, item_number = 1, status = ?, date = ?, since = NOW()
         WHERE id = ?`,
        [params.userId, params.txn, params.product, normalizedPrice, params.basketIdent, params.status, unixTime, rows[0].id],
      );
      return;
    }

    await conn.execute(
      `INSERT INTO \`${table}\` (user_id, txn, product, price, basket_ident, item_number, status, date, since)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, NOW())`,
      [params.userId, params.txn, params.product, normalizedPrice, params.basketIdent, params.status, unixTime],
    );
  } finally {
    await conn.end();
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");
  const config = await getTebexConfig();

  if (!config.webhookSecret) {
    return NextResponse.json({ error: "Tebex webhook secret is not configured" }, { status: 500 });
  }

  if (!verifyTebexWebhookSignature(rawBody, signature, config.webhookSecret)) {
    return NextResponse.json({ error: "Invalid Tebex signature" }, { status: 400 });
  }

  const payload = JSON.parse(rawBody) as TebexWebhookPayload;
  if (payload.type === "validation.webhook" && payload.id) {
    return NextResponse.json({ id: payload.id });
  }

  if (!payload.type || !payload.subject) {
    return NextResponse.json({ error: "Invalid Tebex payload" }, { status: 400 });
  }

  const subject = payload.subject;
  const custom = (subject.custom ?? {}) as Record<string, unknown>;
  const donationId = typeof custom.donation_id === "string" ? custom.donation_id : "";
  const characterName = typeof custom.character_name === "string" ? custom.character_name : "";
  const accountName = typeof custom.account_name === "string" ? custom.account_name : null;
  const versionNum = Number.parseInt(String(custom.version ?? "2"), 10);
  const transactionId = subject.transaction_id ?? null;

  if (!donationId) {
    await logPayment({ source: "tebex", level: "error", event: "missing_donation_id",
      message: `Webhook type=${payload.type} recibido sin donation_id en custom data`,
      username: String(custom.account_name ?? custom.user_id ?? "") || null,
      txn_id: transactionId });
    return NextResponse.json({ error: "Missing donation_id in Tebex custom data" }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const donationQuery = await (supabase as any)
    .from("donations")
    .select("id, status, amount_paid, cps_base, cps_total, character_name, account_name, version, package_id, notes, tebex_transaction")
    .eq("id", donationId)
    .single();

  if (donationQuery.error || !donationQuery.data) {
    await logPayment({ source: "tebex", level: "error", event: "donation_not_found",
      message: `Donation ${donationId} no encontrada en Supabase`,
      donation_id: donationId, txn_id: transactionId });
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  const donation = donationQuery.data as {
    id: string;
    status: string;
    amount_paid: number;
    cps_base: number;
    cps_total: number;
    character_name: string;
    account_name: string | null;
    version: number;
    package_id: string | null;
    notes: string | null;
    tebex_transaction: string | null;
  };

  const resolvedVersion = Number.isFinite(versionNum) ? versionNum : donation.version;
  const basketIdent = extractBasketIdent(donation.notes) ?? donationId;
  const legacyProduct = String(custom.package_id ?? donation.package_id ?? "");
  const legacyUser = String(accountName || donation.account_name || "");
  const legacyPrice = Number(subject.price?.amount ?? donation.amount_paid ?? 0);

  if (payload.type === "payment.declined") {
    await logPayment({ source: "tebex", level: "warn", event: "payment_declined",
      message: `Pago rechazado: ${subject.status?.description ?? "motivo desconocido"}`,
      username: legacyUser || null, product: legacyProduct || null,
      amount: legacyPrice, donation_id: donationId, txn_id: transactionId, basket_ident: basketIdent });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({
        status: "expired",
        tebex_transaction: transactionId,
        notes: `Tebex declined payment (${subject.status?.description ?? "unknown reason"})`,
      })
      .eq("id", donationId);

    try {
      await upsertLegacyPayment({
        versionNum: resolvedVersion,
        userId: legacyUser,
        txn: transactionId,
        product: legacyProduct,
        price: legacyPrice,
        basketIdent,
        status: 0,
      });
    } catch {
      // Legacy table sync should not fail webhook acknowledgment
    }

    return NextResponse.json({ received: true });
  }

  if (payload.type === "payment.refunded") {
    await logPayment({ source: "tebex", level: "warn", event: "payment_refunded",
      message: "Pago reembolsado por Tebex",
      username: legacyUser || null, product: legacyProduct || null,
      amount: legacyPrice, donation_id: donationId, txn_id: transactionId, basket_ident: basketIdent });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({
        status: "refunded",
        tebex_transaction: transactionId,
        notes: "Tebex refunded payment",
      })
      .eq("id", donationId);

    try {
      await upsertLegacyPayment({
        versionNum: resolvedVersion,
        userId: legacyUser,
        txn: transactionId,
        product: legacyProduct,
        price: legacyPrice,
        basketIdent,
        status: 0,
      });
    } catch {
      // Legacy table sync should not fail webhook acknowledgment
    }

    return NextResponse.json({ received: true });
  }

  if (payload.type !== "payment.completed") {
    return NextResponse.json({ received: true });
  }

  if (["credited", "claimed"].includes(donation.status) && donation.tebex_transaction === transactionId) {
    await logPayment({ source: "tebex", level: "info", event: "duplicate_skipped",
      message: `Webhook duplicado ignorado (donation ya en estado '${donation.status}')`,
      username: legacyUser || null, donation_id: donationId, txn_id: transactionId });
    return NextResponse.json({ received: true, duplicate: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("donations")
    .update({
      status: "paid",
      amount_paid: subject.price?.amount ?? donation.amount_paid,
      currency: subject.price?.currency ?? "USD",
      tebex_transaction: transactionId,
    })
    .eq("id", donationId);

  await logPayment({ source: "tebex", level: "info", event: "payment_completed",
    message: `Pago completado: $${legacyPrice} | producto '${legacyProduct}' | v${resolvedVersion}`,
    username: legacyUser || null, product: legacyProduct || null,
    amount: legacyPrice, donation_id: donationId, txn_id: transactionId, basket_ident: basketIdent });

  try {
    await upsertLegacyPayment({
      versionNum: resolvedVersion,
      userId: legacyUser,
      txn: transactionId,
      product: legacyProduct,
      price: legacyPrice,
      basketIdent,
      status: 1,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({ status: "credited", game_credited_at: new Date().toISOString() })
      .eq("id", donationId);

    await logPayment({ source: "tebex", level: "info", event: "credited",
      message: `CPs acreditados: ${donation.cps_total} CP para '${characterName || donation.character_name}'`,
      username: legacyUser || null, product: legacyProduct || null,
      amount: legacyPrice, donation_id: donationId, txn_id: transactionId,
      metadata: { cps_total: donation.cps_total, character_name: characterName || donation.character_name } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await logPayment({ source: "tebex", level: "error", event: "credit_error",
      message: `Error acreditando CPs: ${message}`,
      username: legacyUser || null, product: legacyProduct || null,
      amount: legacyPrice, donation_id: donationId, txn_id: transactionId });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({ notes: `Tebex game DB insert failed: ${message}` })
      .eq("id", donationId);
  }

  return NextResponse.json({ received: true });
}