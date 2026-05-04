/**
 * Screenshots Module — Zod schemas + inferred input types.
 *
 * Lives outside actions.ts so types and constants can be exported normally —
 * files with "use server" can only export async functions.
 */

import { z } from "zod";

export const VERSION_VALUES = ["1.0", "2.0", "both"] as const;

export const ScreenshotInputSchema = z.object({
  slug:           z.string().min(3).max(120).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Slug inválido (a-z, 0-9, guiones; sin acentos ni espacios)."),
  version:        z.enum(VERSION_VALUES),
  category_id:    z.string().uuid().nullable(),
  title_es:       z.string().min(2).max(200),
  title_en:       z.string().max(200).optional().default(""),
  title_pt:       z.string().max(200).optional().default(""),
  description_es: z.string().max(2000).nullable().optional(),
  description_en: z.string().max(2000).nullable().optional(),
  description_pt: z.string().max(2000).nullable().optional(),
  image_url:      z.string().url().min(8),
  thumbnail_url:  z.string().url().nullable().optional(),
  status:         z.enum(["draft", "published"]).default("published"),
  tags:           z.array(z.string().max(40)).max(20).default([]),
});

export type ScreenshotInput = z.infer<typeof ScreenshotInputSchema>;

export const CategoryInputSchema = z.object({
  slug:    z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, "Slug inválido."),
  name_es: z.string().min(2).max(60),
  name_en: z.string().min(2).max(60),
  name_pt: z.string().min(2).max(60),
  icon:    z.string().max(40).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).default(0),
});
