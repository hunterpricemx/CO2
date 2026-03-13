/**
 * Downloads Module — Types
 */

export interface DownloadRow {
  id: string;
  version: "1.0" | "2.0";
  type: "client" | "patch";
  patch_version: string | null;
  release_date: string | null;
  name_es: string;
  name_en: string;
  name_pt: string;
  description_es: string | null;
  description_en: string | null;
  description_pt: string | null;
  url: string;
  file_size: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DownloadFormData {
  version: "1.0" | "2.0";
  type: "client" | "patch";
  patch_version?: string | null;
  release_date?: string | null;
  name_es: string;
  name_en: string;
  name_pt: string;
  description_es?: string | null;
  description_en?: string | null;
  description_pt?: string | null;
  url: string;
  file_size?: string | null;
  sort_order: number;
  is_active: boolean;
}
