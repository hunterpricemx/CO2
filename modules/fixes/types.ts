/**
 * Fixes Module — Types
 * @module modules/fixes/types
 */

import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

export type FixRow = Database["public"]["Tables"]["fixes"]["Row"];
export type FixCategoryRow = Database["public"]["Tables"]["fix_categories"]["Row"];

export const fixSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  title_es: z.string().min(1, "Título en español requerido"),
  title_en: z.string().min(1, "English title required"),
  title_pt: z.string().min(1, "Título em português obrigatório"),
  content_es: z.string().optional().nullable(),
  content_en: z.string().optional().nullable(),
  content_pt: z.string().optional().nullable(),
  video_url: z.string().url("URL de video inválida").optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  featured_image: z.string().url("URL inválida").optional().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  version: z.enum(["1.0", "2.0", "both"]),
});

export type CreateFixInput = z.infer<typeof fixSchema>;
export type FixFormData = CreateFixInput;

export interface FixFilters {
  status?: "draft" | "published" | "archived";
  version?: "1.0" | "2.0" | "both";
  category_id?: string;
  search?: string;
}
