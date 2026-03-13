/**
 * Guides Module — Queries
 * @module modules/guides/queries
 */

import { createClient } from "@/lib/supabase/server";
import type { GameVersion } from "@/types";
import type { GuideRow, GuideCategoryRow, GuideFilters } from "./types";

/** Fetches all guide categories. */
export async function getGuideCategories(): Promise<GuideCategoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guide_categories")
    .select("*")
    .order("sort_order");
  return (data ?? []) as unknown as GuideCategoryRow[];
}

/** Fetches published guides for public listing. */
export async function getPublishedGuides({
  version,
  limit,
  categoryId,
}: {
  version: GameVersion;
  limit?: number;
  categoryId?: string;
}): Promise<GuideRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("guides")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (version !== "both") {
    query = query.or(`version.eq.${version},version.eq.both`);
  }
  if (categoryId) query = query.eq("category_id", categoryId);
  if (limit) query = query.limit(limit);

  const { data } = await query;
  return (data ?? []) as unknown as GuideRow[];
}

/** Fetches a single guide by its slug. */
export async function getGuideBySlug(slug: string): Promise<GuideRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guides")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return (data ?? null) as unknown as GuideRow | null;
}

/** Fetches a guide by ID (admin). */
export async function getGuideById(id: string): Promise<GuideRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guides")
    .select("*")
    .eq("id", id)
    .single();
  return (data ?? null) as unknown as GuideRow | null;
}

/** Fetches all guides for admin table. Pagination handled client-side. */
export async function getGuidesForAdmin(
  filters: GuideFilters = {},
): Promise<GuideRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("guides")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.version && filters.version !== "both") query = query.eq("version", filters.version);
  if (filters.category_id) query = query.eq("category_id", filters.category_id);
  if (filters.search) {
    query = query.or(`title_es.ilike.%${filters.search}%,title_en.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  return error || !data ? [] : (data as unknown as GuideRow[]);
}
