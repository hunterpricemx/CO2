/**
 * Fixes Module — Queries
 * @module modules/fixes/queries
 */

import { createClient } from "@/lib/supabase/server";
import type { GameVersion } from "@/types";
import type { FixRow, FixFilters, FixCategoryRow } from "./types";

export async function getFixCategories(): Promise<FixCategoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fix_categories")
    .select("*")
    .order("sort_order");
  return (data ?? []) as unknown as FixCategoryRow[];
}

export async function getPublishedFixes({
  version,
  limit,
  categoryId,
}: {
  version: GameVersion;
  limit?: number;
  categoryId?: string;
}): Promise<FixRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("fixes")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (version !== "both") {
    query = query.or(`version.eq.${version},version.eq.both`);
  }
  if (categoryId) query = query.eq("category_id", categoryId);
  if (limit) query = query.limit(limit);

  const { data } = await query;
  return (data ?? []) as unknown as FixRow[];
}

export async function getFixBySlug(slug: string): Promise<FixRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fixes")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return (data ?? null) as unknown as FixRow | null;
}

export async function getFixById(id: string): Promise<FixRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("fixes").select("*").eq("id", id).single();
  return (data ?? null) as unknown as FixRow | null;
}

export async function getFixesForAdmin(
  filters: FixFilters = {},
): Promise<FixRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("fixes")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.version && filters.version !== "both") query = query.eq("version", filters.version);
  if (filters.category_id) query = query.eq("category_id", filters.category_id);
  if (filters.search) {
    query = query.or(`title_es.ilike.%${filters.search}%,title_en.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  return error || !data ? [] : (data as unknown as FixRow[]);
}
