/** Shared SEO types and constants — safe to import in both server and client code. */

export type SeoPageEntry = {
  title?: string;
  description?: string;
  og_image?: string;
};

export const SEO_PAGE_KEYS = [
  "home",
  "guides",
  "fixes",
  "events",
  "news",
  "market",
  "rankings",
  "downloads",
  "donate",
  "vip",
  "influencers",
  "compose",
  "terms",
] as const;

export type SeoPageKey = (typeof SEO_PAGE_KEYS)[number];
