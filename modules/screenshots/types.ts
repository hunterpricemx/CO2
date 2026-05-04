/**
 * Screenshots Module — Types
 */

export type ScreenshotVersion = "1.0" | "2.0" | "both";
export type ScreenshotStatus  = "draft" | "published";

export interface ScreenshotCategory {
  id:         string;
  slug:       string;
  name_es:    string;
  name_en:    string;
  name_pt:    string;
  icon:       string | null;
  sort_order: number;
  created_at: string;
}

export interface Screenshot {
  id:              string;
  slug:            string;
  version:         ScreenshotVersion;
  category_id:     string | null;
  title_es:        string;
  title_en:        string;
  title_pt:        string;
  description_es:  string | null;
  description_en:  string | null;
  description_pt:  string | null;
  image_url:       string;
  thumbnail_url:   string | null;
  uploaded_by:     string | null;
  uploader_name:   string | null;
  status:          ScreenshotStatus;
  view_count:      number;
  tags:            string[];
  created_at:      string;
  updated_at:      string;
}

/** Screenshot with category data joined (for grid/detail rendering). */
export interface ScreenshotWithCategory extends Screenshot {
  category: Pick<ScreenshotCategory, "id" | "slug" | "name_es" | "name_en" | "name_pt" | "icon"> | null;
}

export interface ScreenshotFilters {
  version?:    ScreenshotVersion | "all";
  categorySlug?: string | "all";
  search?:     string;
  status?:     ScreenshotStatus;
  page?:       number;
  pageSize?:   number;
}

/** Pick the best title for the requested locale, falling back gracefully. */
export function pickTitle(s: { title_es: string; title_en: string; title_pt: string }, locale: string): string {
  if (locale === "en" && s.title_en) return s.title_en;
  if (locale === "pt" && s.title_pt) return s.title_pt;
  return s.title_es || s.title_en || s.title_pt || "Screenshot";
}

export function pickDescription(
  s: { description_es: string | null; description_en: string | null; description_pt: string | null },
  locale: string,
): string {
  if (locale === "en" && s.description_en) return s.description_en;
  if (locale === "pt" && s.description_pt) return s.description_pt;
  return s.description_es ?? s.description_en ?? s.description_pt ?? "";
}

export function pickCategoryName(c: ScreenshotCategory | Pick<ScreenshotCategory, "name_es" | "name_en" | "name_pt"> | null, locale: string): string {
  if (!c) return "";
  if (locale === "en") return c.name_en;
  if (locale === "pt") return c.name_pt;
  return c.name_es;
}
