/**
 * Influencers Module — Queries
 */

import { createClient } from "@/lib/supabase/server";
import type { InfluencerRow } from "./types";

export async function getAllInfluencersActive(): Promise<InfluencerRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("influencers")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as unknown as InfluencerRow[];
}
