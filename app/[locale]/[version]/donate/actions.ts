"use server";

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { getGameSession } from "@/lib/session";

type CheckoutResult = { url: string } | { error: string };

export async function createStripeCheckout(params: {
  packageId: string;
  packageName: string;
  packageCps: number;
  priceUsd: number;
  characterName: string;
  version: string;
  locale: string;
  cpLabel: string;
}): Promise<CheckoutResult> {
  const session = await getGameSession();
  if (!session) return { error: "not_authenticated" };

  const { packageId, packageName, packageCps, priceUsd, characterName, version, locale, cpLabel } = params;

  if (!characterName.trim()) return { error: "char_name_required" };

  // Get Stripe secret key from Supabase config
  const supabase = await createAdminClient();
  const { data: cfg } = await supabase
    .from("server_config")
    .select("stripe_sk_test, stripe_sk_live, stripe_mode, stripe_enabled")
    .eq("id", 1)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = cfg as any;
  if (!c?.stripe_enabled) return { error: "stripe_disabled" };

  const sk: string = c.stripe_mode === "live" ? (c.stripe_sk_live ?? "") : (c.stripe_sk_test ?? "");
  if (!sk) return { error: "stripe_not_configured" };

  // Create pending donation record in Supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const donationInsert = await (supabase as any)
    .from("donations")
    .insert({
      user_id:          null,   // game session has no supabase uuid
      account_name:     session.username,
      character_name:   characterName.trim(),
      version:          version === "1.0" ? 1 : 2,
      package_id:       packageId,
      amount_paid:      priceUsd,
      currency:         "USD",
      cps_base:         packageCps,
      cps_total:        packageCps,
      payment_provider: "stripe",
      status:           "pending",
    })
    .select("id")
    .single();

  if (donationInsert.error || !donationInsert.data) {
    return { error: "db_error" };
  }

  const donationId = (donationInsert.data as { id: string }).id;
  const versionNum = version === "1.0" ? 1 : 2;

  // Build return URLs
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const localePath = locale === "es" ? "" : `/${locale}`;
  const successUrl = `${base}${localePath}/${version}/donate/success?session={CHECKOUT_SESSION_ID}`;
  const cancelUrl  = `${base}${localePath}/${version}/donate`;

  // Create Stripe Checkout Session
  const stripe = new Stripe(sk, { apiVersion: "2026-02-25.clover" });

  const checkoutSession = await stripe.checkout.sessions.create({
    mode:        "payment",
    line_items:  [{
      price_data: {
        currency:     "usd",
        unit_amount:  Math.round(priceUsd * 100),
        product_data: { name: `${packageName} — ${packageCps.toLocaleString()} ${cpLabel}` },
      },
      quantity: 1,
    }],
    metadata: {
      donation_id:     donationId,
      character_name:  characterName.trim(),
      account_name:    session.username,
      package_id:      packageId,
      version:         String(versionNum),
      username:        session.username,
    },
    success_url: successUrl,
    cancel_url:  cancelUrl,
  });

  // Store payment_intent_id on the donation record
  if (checkoutSession.payment_intent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({ payment_intent_id: checkoutSession.payment_intent as string })
      .eq("id", donationId);
  }

  return { url: checkoutSession.url! };
}
