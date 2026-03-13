/**
 * Events Module — Queries
 *
 * Read-only data fetching functions for events.
 * All functions use the server Supabase client and are safe to call
 * from Server Components.
 *
 * @module modules/events/queries
 */

import { createClient } from "@/lib/supabase/server";
import type { GameVersion } from "@/types";
import type { EventRow, EventFilters } from "./types";

/**
 * Fetches published events for public display.
 *
 * @param params.version - Game version to filter by.
 * @param params.limit   - Optional max results.
 */
export async function getPublishedEvents({
  version,
  limit,
}: {
  version: GameVersion;
  limit?: number;
}): Promise<EventRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("title_es", { ascending: true });

  if (version !== "both") {
    query = query.or(`version.eq.${version},version.eq.both`);
  }
  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  if (error || !data) return [];
  return data;
}

/**
 * Fetches a single event by ID.
 *
 * @param id - The event UUID.
 * @returns The full EventRow or null if not found.
 */
export async function getEventById(id: string): Promise<EventRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Fetches all events for the admin panel (all statuses).
 * Pagination is handled client-side in DataTable.
 */
export async function getEventsForAdmin(
  filters: EventFilters = {},
): Promise<EventRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.version && filters.version !== "both") {
    query = query.eq("version", filters.version);
  }
  if (filters.search) {
    query = query.or(
      `title_es.ilike.%${filters.search}%,title_en.ilike.%${filters.search}%`,
    );
  }

  const { data, error } = await query;
  return (error || !data) ? [] : data;
}


