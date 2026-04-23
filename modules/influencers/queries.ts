/**
 * Influencers Module — Queries
 */

import { createClient } from "@/lib/supabase/server";
import type { InfluencerRow } from "./types";

function normalizeInfluencerSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getAllInfluencersActive(): Promise<InfluencerRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("influencers")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as unknown as InfluencerRow[];
}

export async function getInfluencerBySlug(slug: string): Promise<InfluencerRow | null> {
  const supabase = await createClient();
  const rawSegment = slug.trim();
  const normalizedSegment = normalizeInfluencerSegment(rawSegment);

  const { data } = await supabase
    .from("influencers")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const influencers = (data ?? []) as InfluencerRow[];

  return influencers.find((influencer) => {
    const influencerSlug = influencer.slug.trim().toLowerCase();
    const influencerName = influencer.name.trim().toLowerCase();
    const normalizedSlugValue = normalizeInfluencerSegment(influencer.slug);
    const normalizedNameValue = normalizeInfluencerSegment(influencer.name);

    return (
      influencerSlug === rawSegment.toLowerCase() ||
      influencerName === rawSegment.toLowerCase() ||
      normalizedSlugValue === normalizedSegment ||
      normalizedNameValue === normalizedSegment
    );
  }) ?? null;
}

