import "server-only";

import { getTikTokCanonicalUrl } from "@/lib/video";

export type TikTokOEmbedData = {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  width?: string | number;
  height?: string | number;
};

async function fetchTikTokOEmbed(url: string, useCache: boolean): Promise<TikTokOEmbedData | null> {
  const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
    cache: useCache ? "force-cache" : "no-store",
    ...(useCache ? { next: { revalidate: 3600 } } : {}),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) return null;

  return (await response.json()) as TikTokOEmbedData;
}

export async function getTikTokOEmbedData(url?: string | null): Promise<TikTokOEmbedData | null> {
  if (!url) return null;

  const canonicalUrl = getTikTokCanonicalUrl(url);
  const candidates = [canonicalUrl, url].filter((value, index, array): value is string => {
    return Boolean(value) && array.indexOf(value) === index;
  });

  try {
    for (const candidate of candidates) {
      const cached = await fetchTikTokOEmbed(candidate, true);
      if (cached?.thumbnail_url) return cached;

      const fresh = await fetchTikTokOEmbed(candidate, false);
      if (fresh) return fresh;
    }

    return null;
  } catch {
    return null;
  }
}
