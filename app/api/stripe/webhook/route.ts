import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { getGameDb } from "@/lib/game-db";

export const runtime = "nodejs";
// Required to receive the raw body for signature verification
export const dynamic = "force-dynamic";

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
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
  }

  // 1. Mark donation as paid
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: donation, error: fetchErr } = await (supabase as any)
    .from("donations")
    .update({ status: "paid", payment_intent_id: paymentIntentId })
    .eq("id", donationId)
    .select("id, cps_base, cps_total")
    .single();

  if (fetchErr || !donation) {
    console.error("[stripe/webhook] Could not update donation:", fetchErr?.message);
    return NextResponse.json({ error: "Donation update failed" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const don = donation as any;

  // 2. Insert into game MariaDB (cq_pending_donations)
  try {
    const { conn } = await getGameDb();
    try {
      await conn.execute(
        `INSERT INTO cq_pending_donations
           (donation_uuid, char_name, account_name, version, cps_base, cps_total, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [donationId, characterName, accountName, versionNum, don.cps_base, don.cps_total],
      );
    } finally {
      await conn.end();
    }

    // 3. Mark donation as credited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({ status: "credited", game_credited_at: new Date().toISOString() })
      .eq("id", donationId);

  } catch (dbErr: unknown) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    console.error("[stripe/webhook] Game DB insert failed:", msg);
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
