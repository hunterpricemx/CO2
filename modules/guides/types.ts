/**
 * Guides Module — Types
 * @module modules/guides/types
 */

import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

export type GuideRow = Database["public"]["Tables"]["guides"]["Row"];
export type GuideCategoryRow = Database["public"]["Tables"]["guide_categories"]["Row"];

export const guideSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  title_es: z.string().min(1, "Título en español requerido"),
  title_en: z.string().min(1, "English title required"),
  title_pt: z.string().min(1, "Título em português obrigatório"),
  summary_es: z.string().optional().nullable(),
  summary_en: z.string().optional().nullable(),
  summary_pt: z.string().optional().nullable(),
  content_es: z.string().optional().nullable(),
  content_en: z.string().optional().nullable(),
  content_pt: z.string().optional().nullable(),
  video_url: z.string().url().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  featured_image: z.string().url().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  version: z.enum(["1.0", "2.0", "both"]),
});

export type CreateGuideInput = z.infer<typeof guideSchema>;
export type GuideFormData = CreateGuideInput;

export interface GuideFilters {
  status?: "draft" | "published" | "archived";
  version?: "1.0" | "2.0" | "both";
  category_id?: string;
  search?: string;
}
