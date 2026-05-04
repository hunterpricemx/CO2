/**
 * Screenshots Module — Read-only queries (server components).
 */

import { createClient } from "@/lib/supabase/server";
import type {
  Screenshot,
  ScreenshotCategory,
  ScreenshotFilters,
  ScreenshotWithCategory,
  ScreenshotVersion,
} from "./types";

/** Returns categories ordered by sort_order. */
export async function getScreenshotCategories(): Promise<ScreenshotCategory[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("screenshot_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data ?? []) as ScreenshotCategory[];
}

/** Returns a paginated list of published screenshots filtered by version. */
export async function getPublishedScreenshots(
  version: ScreenshotVersion | "all",
  filters: Pick<ScreenshotFilters, "categorySlug" | "search" | "page" | "pageSize"> = {},
): Promise<{ rows: ScreenshotWithCategory[]; total: number }> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(6, filters.pageSize ?? 24));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("screenshots")
    .select("*, category:screenshot_categories(id,slug,name_es,name_en,name_pt,icon)", { count: "exact" })
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (version !== "all") {
    // Items con version 'both' aparecen en cualquier versión.
    q = q.in("version", [version, "both"]);
  }
  if (filters.categorySlug && filters.categorySlug !== "all") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cat } = await (supabase as any)
      .from("screenshot_categories").select("id").eq("slug", filters.categorySlug).single();
    if (cat?.id) q = q.eq("category_id", cat.id);
  }
  if (filters.search) {
    const s = filters.search.trim();
    if (s) {
      q = q.or(`title_es.ilike.%${s}%,title_en.ilike.%${s}%,title_pt.ilike.%${s}%`);
    }
  }

  q = q.range(from, to);
  const { data, count } = await q;
  return { rows: (data ?? []) as ScreenshotWithCategory[], total: count ?? 0 };
}

/** Returns a single published screenshot by slug. */
export async function getScreenshotBySlug(slug: string): Promise<ScreenshotWithCategory | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("screenshots")
    .select("*, category:screenshot_categories(id,slug,name_es,name_en,name_pt,icon)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return (data ?? null) as ScreenshotWithCategory | null;
}

/** Admin listing — includes drafts. Filterable. */
export async function getAdminScreenshots(
  filters: ScreenshotFilters = {},
): Promise<{ rows: ScreenshotWithCategory[]; total: number }> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(10, filters.pageSize ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("screenshots")
    .select("*, category:screenshot_categories(id,slug,name_es,name_en,name_pt,icon)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.version && filters.version !== "all") {
    q = q.eq("version", filters.version);
  }
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.search) {
    const s = filters.search.trim();
    if (s) q = q.or(`title_es.ilike.%${s}%,title_en.ilike.%${s}%,title_pt.ilike.%${s}%,slug.ilike.%${s}%`);
  }
  q = q.range(from, to);

  const { data, count } = await q;
  return { rows: (data ?? []) as ScreenshotWithCategory[], total: count ?? 0 };
}

export async function getScreenshotById(id: string): Promise<Screenshot | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from("screenshots").select("*").eq("id", id).single();
  return (data ?? null) as Screenshot | null;
}
