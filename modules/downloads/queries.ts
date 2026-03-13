/**
 * Downloads Module — Queries
 */

import { createClient } from "@/lib/supabase/server";
import type { DownloadRow } from "./types";

export async function getDownloads(version: "1.0" | "2.0"): Promise<DownloadRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("downloads")
    .select("*")
    .eq("version", version)
    .eq("is_active", true)
    .order("type", { ascending: true })         // 'client' before 'patch'
    .order("release_date", { ascending: false }) // newest patches first
    .order("sort_order");
  return (data ?? []) as unknown as DownloadRow[];
}
