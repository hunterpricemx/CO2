"use server";

import Stripe from "stripe";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { getGameSession } from "@/lib/session";
import { createTebexHeadlessCheckout, getTebexConfig } from "@/lib/tebex";
import { logPayment } from "@/lib/payment-logger";
import { upsertLegacyPayment } from "@/lib/payment-legacy";
import { checkRateLimit } from "@/lib/rate-limit";

type CheckoutResult = { url: string } | { error: string };

async function getBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  // Avoid using localhost URLs in production deployments.
  if (configured && (!process.env.VERCEL || !configured.includes("localhost"))) {
    return configured;
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

function getLocalePrefix(locale: string): string {
  return locale === "es" ? "" : `/${locale}`;
}

function getVersionNumber(version: string): number {
  return version === "1.0" ? 1 : 2;
}

type RequestContext = {
  ipAddress?: string;
  userAgent: string | null;
  referer: string | null;
  host: string | null;
};

async function getRequestContext(): Promise<RequestContext> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for") ?? "";
  const firstIp = forwarded.split(",")[0]?.trim();
  const ipAddress = !firstIp || firstIp.includes(":") ? undefined : firstIp;
  return {
    ipAddress,
    userAgent: headerStore.get("user-agent"),
    referer: headerStore.get("referer"),
    host: headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
  };
}

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

  const requestContext = await getRequestContext();
  const rateId = `${session.username}:${requestContext.ipAddress ?? "unknown"}`;
  const stripeRate = checkRateLimit("checkout_stripe_attempt", rateId, { max: 3, windowMs: 60_000 });
  if (!stripeRate.ok) {
    await logPayment({
      source: "stripe", level: "warn", event: "checkout_rate_limited",
      message: `Rate limit Stripe para '${session.username}'`,
      username: session.username, product: packageName, amount: priceUsd,
      metadata: {
        package_id: packageId,
        version,
        ip_address: requestContext.ipAddress,
        user_agent: requestContext.userAgent,
        referer: requestContext.referer,
        host: requestContext.host,
        reset_at: new Date(stripeRate.resetAt).toISOString(),
      },
    });
    return { error: "rate_limited" };
  }

  const stripeCooldown = checkRateLimit(
    "checkout_stripe_cooldown",
    `${session.username}:${packageId}:${version}`,
    { max: 1, windowMs: 90_000 },
  );
  if (!stripeCooldown.ok) {
    await logPayment({
      source: "stripe", level: "warn", event: "checkout_cooldown_active",
      message: `Cooldown Stripe activo para '${session.username}'`,
      username: session.username, product: packageName, amount: priceUsd,
      metadata: {
        package_id: packageId,
        version,
        ip_address: requestContext.ipAddress,
        user_agent: requestContext.userAgent,
        referer: requestContext.referer,
        host: requestContext.host,
        reset_at: new Date(stripeCooldown.resetAt).toISOString(),
      },
    });
    return { error: "cooldown_active" };
  }

  await logPayment({
    source: "stripe", level: "info", event: "checkout_initiated",
    message: `Iniciando checkout Stripe: paquete '${packageName}' ($${priceUsd}) para '${characterName.trim()}' (cuenta: ${session.username})`,
    username: session.username, product: packageName, amount: priceUsd,
    metadata: {
      package_id: packageId,
      version,
      ip_address: requestContext.ipAddress,
      user_agent: requestContext.userAgent,
      referer: requestContext.referer,
      host: requestContext.host,
      rate_limit_remaining: stripeRate.remaining,
      rate_limit_reset_at: new Date(stripeRate.resetAt).toISOString(),
      cooldown_reset_at: new Date(stripeCooldown.resetAt).toISOString(),
    },
  });

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
  const versionNum = getVersionNumber(version);

  // Build return URLs
  const base = await getBaseUrl();
  const localePath = getLocalePrefix(locale);
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

export async function createTebexCheckout(params: {
  packageId: string;
  characterName: string;
  version: string;
  locale: string;
}): Promise<CheckoutResult> {
  const session = await getGameSession();
  if (!session) return { error: "not_authenticated" };

  const characterName = params.characterName.trim();
  if (!characterName) return { error: "char_name_required" };

  const versionNum = getVersionNumber(params.version);
  const requestContext = await getRequestContext();

  const supabase = await createAdminClient();
  const tebexConfig = await getTebexConfig();

  if (!tebexConfig.enabled) {
    console.error("[tebex-checkout] Tebex disabled in config");
    return { error: "tebex_disabled" };
  }
  if (!tebexConfig.webstoreId || !tebexConfig.privateKey) {
    console.error("[tebex-checkout] Missing webstoreId or privateKey in Tebex config");
    return { error: "tebex_not_configured" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: packageRow, error: packageError } = await (supabase as any)
    .from("donation_packages")
    .select("id, name, price_usd, cps, version, active, tebex_package_id, game_product_id")
    .eq("id", params.packageId)
    .single();

  if (packageError || !packageRow) {
    console.error("[tebex-checkout] Package not found:", params.packageId, packageError?.message);
    return { error: "package_not_found" };
  }

  const pkg = packageRow as {
    id: string;
    name: string;
    price_usd: number;
    cps: number;
    version: number;
    active: boolean;
    tebex_package_id: string | null;
    game_product_id: number | null;
  };

  if (!pkg.active || ![0, versionNum].includes(pkg.version)) {
    console.error("[tebex-checkout] Package not available: active=%s version=%s required=%s", pkg.active, pkg.version, versionNum);
    return { error: "package_not_available" };
  }
  if (!pkg.tebex_package_id?.trim()) {
    console.error("[tebex-checkout] Package has no tebex_package_id mapped:", pkg.id, pkg.name);
    return { error: "tebex_package_not_mapped" };
  }

  await logPayment({
    source: "tebex", level: "info", event: "checkout_initiated",
    message: `Iniciando checkout Tebex: paquete '${pkg.name}' ($${pkg.price_usd}) para '${characterName}' (cuenta: ${session.username}) v${versionNum}`,
    username: session.username, product: pkg.name,
    amount: pkg.price_usd,
    metadata: {
      package_id: pkg.id,
      tebex_package_id: pkg.tebex_package_id,
      version: versionNum,
      ip_address: requestContext.ipAddress,
      user_agent: requestContext.userAgent,
      referer: requestContext.referer,
      host: requestContext.host,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const donationInsert = await (supabase as any)
    .from("donations")
    .insert({
      user_id:          null,
      account_name:     session.username,
      character_name:   characterName,
      version:          versionNum,
      package_id:       pkg.id,
      amount_paid:      pkg.price_usd,
      currency:         "USD",
      cps_base:         pkg.cps,
      cps_total:        pkg.cps,
      payment_provider: "tebex",
      status:           "pending",
    })
    .select("id")
    .single();

  if (donationInsert.error || !donationInsert.data) {
    const dbErr = donationInsert.error?.message ?? "unknown db error";
    console.error("[tebex-checkout] Donation insert failed:", dbErr);
    await logPayment({
      source: "tebex", level: "error", event: "checkout_db_error",
      message: `Error insertando donation en Supabase: ${dbErr}`,
      username: session.username, product: pkg.name, amount: pkg.price_usd,
    });
    return { error: `db_error: ${dbErr}` };
  }

  const donationId = (donationInsert.data as { id: string }).id;
  const baseUrl = await getBaseUrl();
  const localePath = getLocalePrefix(params.locale);
  const successUrl = `${baseUrl}${localePath}/${params.version}/donate/success?provider=tebex&donation=${donationId}`;
  const cancelUrl = `${baseUrl}${localePath}/${params.version}/donate`;

  try {
    const { basketIdent, checkoutUrl } = await createTebexHeadlessCheckout({
      config: tebexConfig,
      packageId: pkg.tebex_package_id,
      accountName: session.username,
      characterName,
      email: session.email || undefined,
      ipAddress: requestContext.ipAddress,
      completeUrl: successUrl,
      cancelUrl,
      custom: {
        donation_id: donationId,
        package_id: pkg.id,
        package_name: pkg.name,
        account_name: session.username,
        character_name: characterName,
        version: String(versionNum),
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({ notes: `Tebex basket: ${basketIdent}` })
      .eq("id", donationId);

    await logPayment({
      source: "tebex", level: "info", event: "checkout_url_obtained",
      message: `Basket creado OK. donation_id=${donationId}, basket=${basketIdent}`,
      username: session.username, product: pkg.name, amount: pkg.price_usd,
      donation_id: donationId, basket_ident: basketIdent,
    });

    // Pre-insert into dbb_payments with status=0 (mirrors old PHP checkout.php behavior).
    // This lets the webhook reliably find the row by basket_ident even if the
    // game server hasn't created an in-game row yet. Failures are non-fatal.
    if (pkg.game_product_id) {
      try {
        await upsertLegacyPayment({
          versionNum,
          userId: session.username,
          txn: null,
          product: String(pkg.game_product_id),
          price: pkg.price_usd,
          basketIdent,
          status: 0,
        });
      } catch (gameDbError) {
        const gameDbMsg = gameDbError instanceof Error ? gameDbError.message : String(gameDbError);
        await logPayment({
          source: "tebex", level: "warn", event: "checkout_game_db_warn",
          message: `Pre-insert dbb_payments falló (checkout continúa): ${gameDbMsg}`,
          username: session.username, donation_id: donationId, basket_ident: basketIdent,
        });
      }
    }

    return { url: checkoutUrl };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown Tebex error";
    console.error("[tebex-checkout] Tebex API error:", message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({ notes: `Tebex checkout init failed: ${message}` })
      .eq("id", donationId);
    await logPayment({
      source: "tebex", level: "error", event: "checkout_api_error",
      message: `Error en API Tebex: ${message}`,
      username: session.username, product: pkg.name, amount: pkg.price_usd,
      donation_id: donationId,
      metadata: {
        tebex_package_id: pkg.tebex_package_id,
        raw_error: message,
        ip_address: requestContext.ipAddress,
        user_agent: requestContext.userAgent,
        referer: requestContext.referer,
        host: requestContext.host,
      },
    });
    // Return generic error to client — technical details logged internally
    return { error: "checkout_failed" };
  }
}

export async function checkTebexReady(): Promise<{ ok: boolean }> {
  try {
    const config = await getTebexConfig();
    if (!config.webstoreId || !config.privateKey) return { ok: false };
    const token = Buffer.from(`${config.webstoreId}:${config.privateKey}`, "utf8").toString("base64");
    const res = await fetch(`https://headless.tebex.io/api/accounts/${config.webstoreId}`, {
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      // Fail fast on slow connections — each attempt has 4s max,
      // so 5 retries = ~20s worst case (server→Tebex) before showing error state.
      // 4s gives enough room for mobile data latency without hanging forever.
      signal: AbortSignal.timeout(4000),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
