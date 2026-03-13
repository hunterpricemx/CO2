/**
 * Market Module — Queries
 */

import { createClient } from "@/lib/supabase/server";
import type { MarketItemRow } from "./types";

export async function getMarketItems({
  version,
  limit = 300,
}: {
  version?: string;
  limit?: number;
} = {}): Promise<MarketItemRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("market_items")
    .select("*")
    .order("listed_at", { ascending: false })
    .limit(limit);

  if (version) {
    query = query.eq("version", version as any);
  }

  const { data } = await query;
  return (data ?? []) as unknown as MarketItemRow[];
}
