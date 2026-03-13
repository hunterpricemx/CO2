/**
 * News Module — Types
 */

export interface NewsCategoryRow {
  id: string;
  slug: string;
  name_es: string;
  name_en: string;
  name_pt: string;
  sort_order: number;
  created_at: string;
}

export interface NewsPostRow {
  id: string;
  slug: string;
  category_id: string | null;
  title_es: string;
  title_en: string;
  title_pt: string;
  summary_es: string | null;
  summary_en: string | null;
  summary_pt: string | null;
  content_es: string | null;
  content_en: string | null;
  content_pt: string | null;
  featured_image: string | null;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsPostFormData {
  slug: string;
  category_id?: string | null;
  title_es: string;
  title_en: string;
  title_pt: string;
  summary_es?: string | null;
  summary_en?: string | null;
  summary_pt?: string | null;
  content_es?: string | null;
  content_en?: string | null;
  content_pt?: string | null;
  featured_image?: string | null;
  status: "draft" | "published" | "archived";
  published_at?: string | null;
}
