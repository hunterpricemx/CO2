/**
 * Users Module — Queries
 * @module modules/users/queries
 *
 * NOTE: Currently reads from Supabase `profiles` table.
 * When MariaDB access is available, add mysql2 queries here and
 * keep the same function signatures — pages won't need to change.
 */

import { createClient } from "@/lib/supabase/server";
import type { ProfileRow, UserFilters } from "./types";

/**
 * Fetches all user profiles for the admin panel.
 * Pagination is handled client-side in DataTable.
 */
export async function getUsersForAdmin(
  filters: UserFilters = {},
): Promise<ProfileRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.role) query = query.eq("role", filters.role);
  if (filters.banned !== undefined) query = query.eq("banned", filters.banned);
  if (filters.search) {
    query = query.or(`username.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  return (error || !data) ? [] : data;
}

/** Returns a single user profile by ID. */
export async function getUserById(id: string): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
  return data ?? null;
}

/** Returns total player count. */
export async function getPlayerCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "player");
  return count ?? 0;
}
