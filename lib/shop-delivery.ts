/**
 * Shop delivery — HMAC-signed HTTP client for the game server's shop listener.
 *
 * Reads `shop_endpoint_<env>`, `shop_hmac_secret_<env>`, `shop_timeout_ms_<env>`
 * and `shop_enabled_<env>` from Supabase `server_config` and POSTs a signed
 * payload to the listener (see docs/SHOP_ENDPOINT_SPEC.md for the contract).
 *
 * Per spec:
 *   - body is `{ purchase_id, uid, item_id, ip, env, timestamp, nonce }`
 *   - header `X-Shop-Signature: sha256=<hex(hmac_sha256(secret, raw_body))>`
 *
 * The function NEVER throws — all errors are returned as `{ ok:false, error }`
 * so the caller can refund deterministically.
 *
 * @module lib/shop-delivery
 */

import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";

export type ShopEnv = "test" | "v1" | "v2";

export interface ShopConfig {
  endpoint: string;
  secret: string;
  enabled: boolean;
  timeoutMs: number;
}

export interface ShopDeliveryInput {
  env: ShopEnv;
  purchaseId: string;
  uid: number;
  itemId: number;
  ip: string | null;
  /** Item attributes (all 0..255 byte range). Default 0 if not provided. */
  plus?:  number;   // enchant level (+N)
  bless?: number;   // bless / minus enchant
  soc1?:  number;   // socket 1 (0 = empty, !=0 = gem code)
  soc2?:  number;   // socket 2 (0 = empty, !=0 = gem code)
  /** Marketlogs context — required to remove the listing and credit seller. */
  sellerUid?:  number;          // EntityID of the seller
  sellerName?: string;          // display name of seller (max 64 chars)
  itemUid?:    number;          // unique instance UID of the item (NOT itemId)
  /** Price split: exactly one of these is non-zero, the other is 0. */
  gold?:       number;          // silver price if listed in Gold, else 0
  cp?:         number;          // CP price if listed in CP, else 0
}

export interface ShopDeliveryResult {
  ok: boolean;
  alreadyDelivered: boolean;
  status: number;
  body: unknown;
  signedRequest: {
    url: string;
    body: string;
    signature: string;
  };
  error?: string;
}

/** Loads the shop config for a given env from Supabase. Missing fields → empty/false. */
export async function getShopConfig(env: ShopEnv): Promise<ShopConfig | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase.from("server_config").select("*").eq("id", 1).single();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return {
    endpoint:  (d[`shop_endpoint_${env}`]    ?? "").toString().trim(),
    secret:    (d[`shop_hmac_secret_${env}`] ?? "").toString(),
    enabled:   Boolean(d[`shop_enabled_${env}`]),
    timeoutMs: Number(d[`shop_timeout_ms_${env}`] ?? 5000),
  };
}

/** HMAC-SHA256 hex of the body using the configured secret. */
export function signShopPayload(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/** Generates a fresh nonce (UUID v4) using node's crypto. */
function newNonce(): string {
  return crypto.randomUUID();
}

/** Clamp any input to a valid C# byte (0..255). undefined/NaN → 0. */
function clampByte(v: number | null | undefined): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 255) return 255;
  return Math.floor(n);
}

/** Clamp any input to a valid C# uint (0..4_294_967_295). undefined/NaN → 0. */
function clampUint(v: number | null | undefined): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 4_294_967_295) return 4_294_967_295;
  return Math.floor(n);
}

/**
 * Sends a signed POST to the game server shop listener.
 * Returns ok=true on HTTP 200 with `body.ok === true` (delivered or already_delivered).
 */
export async function deliverShopItem(input: ShopDeliveryInput): Promise<ShopDeliveryResult> {
  const cfg = await getShopConfig(input.env);

  const empty = {
    signedRequest: { url: "", body: "", signature: "" },
    status: 0,
    body: null as unknown,
    alreadyDelivered: false,
  };

  if (!cfg) {
    return { ok: false, error: "shop_config_missing", ...empty };
  }
  if (!cfg.enabled) {
    return { ok: false, error: "shop_disabled", ...empty };
  }
  if (!cfg.endpoint) {
    return { ok: false, error: "shop_endpoint_unset", ...empty };
  }
  if (!cfg.secret || cfg.secret.length < 16) {
    return { ok: false, error: "shop_secret_invalid", ...empty };
  }

  const payload = {
    purchase_id: input.purchaseId,
    uid:         input.uid,
    seller_uid:  clampUint(input.sellerUid),
    seller_name: (input.sellerName ?? "").toString().slice(0, 64),
    item_uid:    clampUint(input.itemUid),
    item_id:     input.itemId,
    gold:        clampUint(input.gold),
    cp:          clampUint(input.cp),
    ip:          input.ip,
    env:         input.env,
    plus:        clampByte(input.plus),
    bless:       clampByte(input.bless),
    soc1:        clampByte(input.soc1),
    soc2:        clampByte(input.soc2),
    timestamp:   Date.now(),
    nonce:       newNonce(),
  };

  const body = JSON.stringify(payload);
  const signature = `sha256=${signShopPayload(cfg.secret, body)}`;

  const signedRequest = { url: cfg.endpoint, body, signature };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, cfg.timeoutMs));

  try {
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: {
        "Content-Type":      "application/json; charset=utf-8",
        "X-Shop-Signature":  signature,
      },
      body,
      signal: controller.signal,
      cache:  "no-store",
    });

    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      parsed = await res.text().catch(() => null);
    }

    const ok = res.ok &&
      typeof parsed === "object" && parsed !== null &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (parsed as any).ok === true;

    const alreadyDelivered = ok &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (parsed as any).already_delivered === true;

    return {
      ok,
      alreadyDelivered,
      status: res.status,
      body: parsed,
      signedRequest,
      error: ok ? undefined : extractError(parsed) ?? `http_${res.status}`,
    };
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    const error = err.name === "AbortError" ? "timeout" : err.message || "network_error";
    return { ok: false, alreadyDelivered: false, status: 0, body: null, signedRequest, error };
  } finally {
    clearTimeout(timer);
  }
}

function extractError(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = (body as any).error;
    if (typeof e === "string") return e;
  }
  return undefined;
}

/**
 * Sends a synthetic ping to verify the endpoint is reachable and the secret is correct.
 * The listener may treat purchase_id `00000000-0000-0000-0000-000000000000` specially
 * (validate signature/timestamp/nonce but not actually deliver). Either way the
 * caller cares only about: did we get a 2xx with valid HMAC handshake?
 */
export async function pingShopEndpoint(env: ShopEnv): Promise<ShopDeliveryResult> {
  return deliverShopItem({
    env,
    purchaseId: "00000000-0000-0000-0000-000000000000",
    uid:        0,
    itemId:     0,
    ip:         null,
  });
}
