/**
 * News Module — Queries
 */

import { createClient } from "@/lib/supabase/server";
import type { NewsCategoryRow, NewsPostRow } from "./types";

export async function getNewsCategories(): Promise<NewsCategoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_categories")
    .select("*")
    .order("sort_order");
  return (data ?? []) as unknown as NewsCategoryRow[];
}

export async function getLatestNews({
  limit = 3,
}: { limit?: number } = {}): Promise<NewsPostRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as NewsPostRow[];
}

export async function getNewsBySlug(slug: string): Promise<NewsPostRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return (data ?? null) as unknown as NewsPostRow | null;
}

export async function getAllNewsPublished(): Promise<NewsPostRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return (data ?? []) as unknown as NewsPostRow[];
}
