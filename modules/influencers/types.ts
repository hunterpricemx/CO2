/**
 * Influencers Module — Types
 */

export interface InfluencerRow {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  description_es: string | null;
  description_en: string | null;
  description_pt: string | null;
  streamer_code: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  twitch_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface InfluencerFormData {
  name: string;
  slug: string;
  photo_url?: string | null;
  description_es?: string | null;
  description_en?: string | null;
  description_pt?: string | null;
  streamer_code?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  twitch_url?: string | null;
  is_active: boolean;
  sort_order: number;
}
