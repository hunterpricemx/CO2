export function getYouTubeEmbedUrl(url?: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v")?.trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function isTikTokUrl(url?: string | null): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("tiktok.com");
  } catch {
    return false;
  }
}

export function getTikTokVideoId(url?: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("tiktok.com")) return null;

    const match = parsed.pathname.match(/\/video\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function getTikTokCanonicalUrl(url?: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("tiktok.com")) return null;

    const videoId = getTikTokVideoId(url);
    if (!videoId) return null;

    const cleanPath = parsed.pathname.replace(/\/+$/, "");
    const basePath = cleanPath.replace(/\/video\/\d+$/, "");

    return `${parsed.protocol}//${parsed.host}${basePath}/video/${videoId}`;
  } catch {
    return null;
  }
}

export function getTikTokEmbedUrl(url?: string | null): string | null {
  const videoId = getTikTokVideoId(url);
  return videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : null;
}
