/**
 * Shop buyer whitelist — gates the public market integration to a list of
 * approved usernames during the beta rollout.
 *
 * Whitelist lives in `server_config.shop_buyer_whitelist text[]` and is
 * cached in-process for 30s to avoid hitting Supabase on every market page
 * render. Editable from the admin Game Server panel without redeploy.
 *
 * To globally disable the feature without touching the whitelist, toggle
 * `shop_enabled_v1` / `shop_enabled_v2` in the same config row.
 *
 * @module lib/shop-whitelist
 */

import { createAdminClient } from "@/lib/supabase/server";

const CACHE_TTL_MS = 30_000;

let cache: { list: Set<string>; expiresAt: number } | null = null;

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

async function loadFromDb(): Promise<string[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("server_config")
    .select("shop_buyer_whitelist")
    .eq("id", 1)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const arr = ((data as any)?.shop_buyer_whitelist ?? []) as unknown[];
  return Array.isArray(arr)
    ? arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
}

/** Returns true when the username is in the cached whitelist (case-insensitive). */
export async function isShopBuyerWhitelisted(username: string | null | undefined): Promise<boolean> {
  if (!username) return false;
  const now = Date.now();
  if (!cache || cache.expiresAt < now) {
    try {
      const arr = await loadFromDb();
      cache = { list: new Set(arr.map(normalize)), expiresAt: now + CACHE_TTL_MS };
    } catch {
      cache = { list: new Set(), expiresAt: now + 5_000 };
    }
  }
  return cache.list.has(normalize(username));
}

/** Reads the whitelist directly from DB (no cache). Use in admin views. */
export async function getShopBuyerWhitelist(): Promise<string[]> {
  return loadFromDb();
}

/**
 * Replaces the whitelist atomically. Validates non-empty unique usernames,
 * trims, deduplicates (case-insensitive), and resets the in-process cache.
 */
export async function setShopBuyerWhitelist(list: string[]): Promise<void> {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(trimmed);
  }

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("server_config")
    .update({ shop_buyer_whitelist: cleaned })
    .eq("id", 1);
  if (error) throw new Error(`No se pudo guardar la whitelist: ${error.message}`);

  cache = { list: new Set(cleaned.map(normalize)), expiresAt: Date.now() + CACHE_TTL_MS };
}

/** Force-clears the in-process cache. Useful in tests or after manual SQL edits. */
export function invalidateShopBuyerWhitelistCache(): void {
  cache = null;
}
