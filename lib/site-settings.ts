import "server-only";

export type PromoSlide = {
  image_url: string;
  link_url?: string;
  title?: string;
};

export type SiteSettings = {
  logo_v1: string;
  logo_v2: string;
  hero_bg_v1: string;
  hero_bg_v2: string;
  discord_url_v1: string;
  discord_url_v2: string;
  home_video_url_v1: string;
  home_video_url_v2: string;
  promo_slides_v1: PromoSlide[];
  promo_slides_v2: PromoSlide[];
  /** Raw HTML injected just after <body> opens (analytics head scripts). */
  script_head: string;
  /** Raw HTML injected just before </body> closes (footer pixels, etc.). */
  script_footer: string;
};

const DEFAULTS: SiteSettings = {
  logo_v1:           "/images/logos/conquer_classic_plus_10_logo.png",
  logo_v2:           "/images/logos/conquer_classic_plus_20_logo.png",
  hero_bg_v1:        "/images/backgrounds/bg__main10.jpg",
  hero_bg_v2:        "/images/backgrounds/bg__main20.jpg",
  discord_url_v1:    "",
  discord_url_v2:    "",
  home_video_url_v1: "",
  home_video_url_v2: "",
  promo_slides_v1:   [],
  promo_slides_v2:   [],
  script_head:       "",
  script_footer:     "",
};

function safeJSON<T>(str: string | undefined | null, fallback: T): T {
  try {
    return str ? (JSON.parse(str) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function _fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/site_settings?select=key,value`;
    const res = await fetch(url, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      // Next.js persistent cache — busted by revalidateTag("site-settings")
      cache: "force-cache",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { tags: ["site-settings"], revalidate: 60 } as any,
    });

    if (!res.ok) return DEFAULTS;

    const rows = (await res.json()) as { key: string; value: string }[];
    if (!Array.isArray(rows)) return DEFAULTS;

    const map: Record<string, string> = Object.fromEntries(
      rows.map((r) => [r.key, r.value ?? ""]),
    );

    return {
      logo_v1:           map.logo_v1           || DEFAULTS.logo_v1,
      logo_v2:           map.logo_v2           || DEFAULTS.logo_v2,
      hero_bg_v1:        map.hero_bg_v1        || DEFAULTS.hero_bg_v1,
      hero_bg_v2:        map.hero_bg_v2        || DEFAULTS.hero_bg_v2,
      discord_url_v1:    map.discord_url_v1    || "",
      discord_url_v2:    map.discord_url_v2    || "",
      home_video_url_v1: map.home_video_url_v1 || "",
      home_video_url_v2: map.home_video_url_v2 || "",
      promo_slides_v1:   safeJSON<PromoSlide[]>(map.promo_slides_v1, []),
      promo_slides_v2:   safeJSON<PromoSlide[]>(map.promo_slides_v2, []),
      script_head:       map.script_head   || "",
      script_footer:     map.script_footer || "",
    };
  } catch {
    return DEFAULTS;
  }
}

export const getSiteSettings = _fetchSiteSettings;

export function getVersionAssets(settings: SiteSettings, version: string) {
  return {
    heroBg:      version === "1.0" ? settings.hero_bg_v1        : settings.hero_bg_v2,
    logoSrc:     version === "1.0" ? settings.logo_v1           : settings.logo_v2,
    discordUrl:  version === "1.0" ? settings.discord_url_v1    : settings.discord_url_v2,
    videoUrl:    version === "1.0" ? settings.home_video_url_v1 : settings.home_video_url_v2,
    promoSlides: version === "1.0" ? settings.promo_slides_v1   : settings.promo_slides_v2,
  };
}
