"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { getGameSession } from "@/lib/session";
import { getTebexConfig, createTebexHeadlessCheckout } from "@/lib/tebex";
import { checkRateLimit } from "@/lib/rate-limit";
import { logPayment } from "@/lib/payment-logger";

type CheckoutResult = { url: string } | { error: string };

const ALLOWED_REFERENCE_HOSTS = new Set([
  "media.discordapp.net",
  "cdn.discordapp.com",
  "fjvadikuvcshwxikebhv.supabase.co",
]);

function sanitizeReferenceUrl(rawUrl?: string): { value: string | null; error?: string } {
  if (!rawUrl) return { value: null };

  const trimmed = rawUrl.trim();
  if (!trimmed) return { value: null };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { value: null, error: "invalid_reference_url" };
  }

  if (parsed.protocol !== "https:") {
    return { value: null, error: "invalid_reference_url" };
  }

  if (!ALLOWED_REFERENCE_HOSTS.has(parsed.hostname)) {
    return { value: null, error: "reference_url_not_allowed" };
  }

  if (!/\.(gif|png|jpe?g|webp|mp4|mov)$/i.test(parsed.pathname)) {
    return { value: null, error: "invalid_reference_url" };
  }

  return { value: parsed.toString() };
}

async function getBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (configured && (!process.env.VERCEL || !configured.includes("localhost"))) return configured;
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

export async function createGarmentCheckout(params: {
  garmentId: string | null;
  characterName: string;
  version: string;
  locale: string;
  isCustom: boolean;
  customDescription?: string;
  referenceImageUrl?: string;
}): Promise<CheckoutResult> {
  const session = await getGameSession();
  if (!session) return { error: "not_authenticated" };

  const characterName = params.characterName.trim();
  if (!characterName) return { error: "char_name_required" };

  const referenceValidation = params.isCustom
    ? sanitizeReferenceUrl(params.referenceImageUrl)
    : { value: null as string | null };

  if (referenceValidation.error) {
    return { error: referenceValidation.error };
  }

  // Rate limit: 2 garment checkout attempts per minute per user
  const h = await headers();
  const forwarded = h.get("x-forwarded-for") ?? "";
  const firstIp = forwarded.split(",")[0]?.trim();
  const ipStr = !firstIp || firstIp.includes(":") ? "unknown" : firstIp;
  const rateId = `${session.username}:${ipStr}`;
  const rl = checkRateLimit("garment_checkout", rateId, { max: 2, windowMs: 60_000 });
  if (!rl.ok) return { error: "rate_limited" };

  const supabase = await createAdminClient();
  const tebexConfig = await getTebexConfig();

  if (!tebexConfig.enabled) return { error: "tebex_disabled" };
  if (!tebexConfig.webstoreId || !tebexConfig.privateKey) return { error: "tebex_not_configured" };

  // Get tebex_garment_package_id from server_config
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cfgRow } = await (supabase as any)
    .from("server_config")
    .select("tebex_garment_package_id")
    .eq("id", 1)
    .single();

  const packageId = (cfgRow as { tebex_garment_package_id?: string } | null)?.tebex_garment_package_id?.trim() ?? "";
  if (!packageId) return { error: "garment_package_not_configured" };

  // Resolve garment name
  let garmentName = "Garment Personalizado";
  if (params.garmentId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: gRow } = await (supabase as any)
      .from("garments")
      .select("name, active, allows_custom")
      .eq("id", params.garmentId)
      .single();
    if (!gRow || !gRow.active) return { error: "garment_not_available" };
    if (params.isCustom && !gRow.allows_custom) return { error: "custom_not_allowed" };
    garmentName = gRow.name as string;
  }

  const versionNum = params.version === "1.0" ? 1 : 2;

  // Create garment_order record with status pending_payment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertResult = await (supabase as any)
    .from("garment_orders")
    .insert({
      garment_id:          params.garmentId,
      garment_name:        garmentName,
      account_name:        session.username,
      character_name:      characterName,
      version:             versionNum,
      is_custom:           params.isCustom,
      custom_description:  params.customDescription?.trim() || null,
      reference_image_url: referenceValidation.value,
      amount_paid:         60,
      currency:            "USD",
      status:              "pending_payment",
    })
    .select("id")
    .single();

  if (insertResult.error || !insertResult.data) {
    return { error: "db_error" };
  }

  const orderId = (insertResult.data as { id: string }).id;

  // Build return URLs
  const base = await getBaseUrl();
  const lp = params.locale === "es" ? "" : `/${params.locale}`;
  const completeUrl = `${base}${lp}/${params.version}/garments/orders?order=${orderId}`;
  const cancelUrl   = `${base}${lp}/${params.version}/garments`;

  await logPayment({
    source: "tebex",
    level: "info",
    event: "garment_checkout_initiated",
    message: `Iniciando checkout garment '${garmentName}' para '${characterName}' (cuenta: ${session.username}) v${versionNum}`,
    username: session.username,
    product: garmentName,
    amount: 60,
    metadata: {
      order_id: orderId,
      is_custom: params.isCustom,
      version: versionNum,
    },
  });

  try {
    const { checkoutUrl, basketIdent } = await createTebexHeadlessCheckout({
      config:        tebexConfig,
      packageId,
      accountName:   session.username,
      characterName,
      completeUrl,
      cancelUrl,
      custom: {
        garment_order_id: orderId,
        account_name:     session.username,
        character_name:   characterName,
        version:          String(versionNum),
        garment_name:     garmentName,
      },
    });

    // Store basket ident on the order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("garment_orders")
      .update({ tebex_basket_ident: basketIdent })
      .eq("id", orderId);

    return { url: checkoutUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await logPayment({
      source: "tebex",
      level: "error",
      event: "garment_checkout_error",
      message: `Error creando checkout garment: ${msg}`,
      username: session.username,
      metadata: { order_id: orderId },
    });
    return { error: "checkout_failed" };
  }
}
