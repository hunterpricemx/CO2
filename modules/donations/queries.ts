/**
 * Donations Module — Queries
 * @module modules/donations/queries
 */

import { createClient } from "@/lib/supabase/server";
import type { DonationRow, DonationFilters } from "./types";

export async function getDonationsForAdmin(
  filters: DonationFilters = {},
): Promise<DonationRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("donations")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) {
    query = query.ilike("player_name", `%${filters.search}%`);
  }

  const { data, error } = await query;
  return (error || !data) ? [] : data;
}

/** Returns total donation amount (completed only). */
export async function getTotalDonations(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("donations")
    .select("amount")
    .eq("status", "completed");
  return (data ?? []).reduce((sum, row) => sum + row.amount, 0);
}
