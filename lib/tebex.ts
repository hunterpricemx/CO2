import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";

const TEBEX_API_BASE = "https://headless.tebex.io/api";

type TebexConfigRow = {
  tebex_enabled?: boolean;
  tebex_webstore_id?: string;
  tebex_secret?: string;
  tebex_webhook_secret?: string;
};

type TebexRequestInit = {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  authenticated?: boolean;
};

type TebexBasketLinks = {
  payment?: string;
  checkout?: string;
};

type TebexBasket = {
  id: number;
  ident: string;
  complete: boolean;
  custom?: Record<string, unknown> | null;
  links?: TebexBasketLinks;
};

type TebexBasketResponse = {
  data: TebexBasket;
};

export type TebexConfig = {
  enabled: boolean;
  webstoreId: string;
  privateKey: string;
  webhookSecret: string;
};

function normalizeTebexPrivateKey(rawSecret: string, webstoreId: string): string {
  let secret = rawSecret.trim();
  if (!secret) return "";

  // Support users pasting a full Authorization header value ("Basic <base64>").
  // Only attempt base64 decoding when the "Basic " prefix is explicitly present,
  // to avoid corrupting raw private keys that are not base64-encoded.
  const hadBasicPrefix = /^Basic\s+/i.test(secret);
  secret = secret.replace(/^Basic\s+/i, "").trim();

  let candidate = secret;

  if (hadBasicPrefix) {
    // The value was a full Authorization header — safe to decode as base64.
    try {
      const decoded = Buffer.from(secret, "base64").toString("utf8").trim();
      if (decoded.includes(":")) {
        candidate = decoded;
      }
    } catch {
      // Not valid base64 — keep as-is.
    }
  }

  // Handle plain "webstoreId:privateKey" format (no base64 encoding).
  if (candidate.includes(":")) {
    const parts = candidate.split(":");
    const left = parts.shift()?.trim() ?? "";
    const right = parts.join(":").trim();
    if (right && (!left || left === webstoreId.trim())) {
      return right;
    }
  }

  return secret;
}

export async function getTebexConfig(): Promise<TebexConfig> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("server_config")
    .select("*")
    .eq("id", 1)
    .single();

  const row = (data ?? {}) as TebexConfigRow;
  const webstoreId = row.tebex_webstore_id?.trim() ?? "";
  const privateKey = normalizeTebexPrivateKey(row.tebex_secret?.trim() ?? "", webstoreId);
  return {
    enabled: !!row.tebex_enabled,
    webstoreId,
    privateKey,
    webhookSecret: row.tebex_webhook_secret?.trim() || row.tebex_secret?.trim() || "",
  };
}

function getAuthHeader(config: TebexConfig): string {
  // config.privateKey is already normalized by getTebexConfig — use it directly.
  const token = Buffer.from(`${config.webstoreId}:${config.privateKey}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

async function tebexRequest<T>(config: TebexConfig, path: string, init: TebexRequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (init.authenticated) {
    headers.Authorization = getAuthHeader(config);
  }

  const response = await fetch(`${TEBEX_API_BASE}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  let json: T | null = null;
  if (text) {
    try {
      json = JSON.parse(text) as T;
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const detail = text || response.statusText;
    if ([401, 403, 422].includes(response.status) && /invalid basic auth credentials/i.test(detail)) {
      throw new Error("Tebex auth error: invalid Webstore ID or Private key. Check Admin > Payments and save Tebex secret without prefix (only the private key).");
    }
    throw new Error(`Tebex API error (${response.status}): ${detail}`);
  }

  if (!json) {
    throw new Error("Tebex API returned an empty response.");
  }

  return json;
}

function extractCheckoutLink(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const basketLike = payload as { links?: TebexBasketLinks; data?: { links?: TebexBasketLinks } };
  return basketLike.links?.checkout ?? basketLike.data?.links?.checkout ?? null;
}

export async function createTebexHeadlessCheckout(params: {
  config: TebexConfig;
  packageId: string;
  accountName: string;
  characterName: string;
  email?: string;
  ipAddress?: string;
  completeUrl: string;
  cancelUrl: string;
  custom: Record<string, string>;
}): Promise<{ basketIdent: string; checkoutUrl: string }> {
  const { config, packageId, accountName, characterName, email, ipAddress, completeUrl, cancelUrl, custom } = params;

  const basket = await tebexRequest<TebexBasketResponse>(config, `/accounts/${config.webstoreId}/baskets`, {
    method: "POST",
    authenticated: true,
    body: {
      complete_url: completeUrl,
      cancel_url: cancelUrl,
      complete_auto_redirect: true,
      custom,
      // Tebex validates username strictly; use the account username to avoid
      // invalid characters from in-game character names (e.g. '#').
      username: accountName,
      ...(email ? { email } : {}),
      ...(ipAddress ? { ip_address: ipAddress } : {}),
    },
  });

  const addPackageResult = await tebexRequest<TebexBasket>(config, `/baskets/${basket.data.ident}/packages`, {
    method: "POST",
    body: {
      package_id: parseInt(packageId, 10),
      quantity: 1,
    },
  });

  let checkoutUrl = extractCheckoutLink(addPackageResult) ?? extractCheckoutLink(basket);
  if (!checkoutUrl) {
    const hydratedBasket = await tebexRequest<TebexBasketResponse>(config, `/accounts/${config.webstoreId}/baskets/${basket.data.ident}`, {
      authenticated: true,
    });
    checkoutUrl = extractCheckoutLink(hydratedBasket);
  }

  if (!checkoutUrl) {
    throw new Error("Tebex did not return a checkout URL for the basket.");
  }

  return {
    basketIdent: basket.data.ident,
    checkoutUrl,
  };
}

export function verifyTebexWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;

  // Current Tebex webhooks sign the raw request body directly.
  const expectedRaw = createHmac("sha256", secret).update(rawBody).digest("hex");
  // Backward-compat fallback for deployments that still use body-hash signing.
  const bodyHash = createHash("sha256").update(rawBody).digest("hex");
  const expectedHashed = createHmac("sha256", secret).update(bodyHash).digest("hex");

  const provided = Buffer.from(signature.trim().toLowerCase(), "utf8");
  const computedRaw = Buffer.from(expectedRaw.toLowerCase(), "utf8");
  const computedHashed = Buffer.from(expectedHashed.toLowerCase(), "utf8");

  const matchesRaw = provided.length === computedRaw.length && timingSafeEqual(provided, computedRaw);
  const matchesHashed = provided.length === computedHashed.length && timingSafeEqual(provided, computedHashed);
  return matchesRaw || matchesHashed;
}