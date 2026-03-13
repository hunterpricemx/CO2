import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ArrowLeft, Tag, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getGuideBySlug, getGuideCategories } from "@/modules/guides/queries";
import { Badge } from "@/components/ui/badge";

function toYouTubeEmbed(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; version: string; slug: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) return { title: "Guía no encontrada" };
  const title =
    locale === "es" ? guide.title_es : locale === "en" ? guide.title_en : guide.title_pt;
  return { title };
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ locale: string; version: string; slug: string }>;
}) {
  const { locale, version, slug } = await params;
  const t = await getTranslations("guides");

  const [guide, categories] = await Promise.all([
    getGuideBySlug(slug),
    getGuideCategories(),
  ]);

  if (!guide) notFound();

  const heroBg =
    version === "1.0"
      ? "/images/backgrounds/bg__main10.jpg"
      : "/images/backgrounds/bg__main20.jpg";

  const logoSrc =
    version === "1.0"
      ? "/images/logos/conquer_classic_plus_10_logo.png"
      : "/images/logos/conquer_classic_plus_20_logo.png";

  function versionPath(path: string) {
    return locale === "es" ? `/${version}${path}` : `/${locale}/${version}${path}`;
  }

  const title =
    locale === "es" ? guide.title_es : locale === "en" ? guide.title_en : guide.title_pt;
  const content =
    locale === "es" ? guide.content_es : locale === "en" ? guide.content_en : guide.content_pt;

  const category = guide.category_id
    ? categories.find((c) => c.id === guide.category_id)
    : null;
  const catName = category
    ? locale === "es" ? category.name_es : locale === "en" ? category.name_en : category.name_pt
    : null;

  const versionLabel = guide.version === "both" ? "1.0 + 2.0" : guide.version;
  const videoEmbed = toYouTubeEmbed(guide.video_url);

  return (
    <div className="flex flex-col">

      {/* ═══════════════════════ HERO HEADER ═══════════════════════ */}
      <section
        className="relative flex items-center justify-center"
        style={{
          minHeight: "36vh",
          backgroundImage: `url('${heroBg}')`,
          backgroundSize: "cover",
          backgroundPosition: "50% 24%",
          backgroundRepeat: "no-repeat",
          paddingTop: "4rem",
          paddingBottom: "4rem",
        }}
      >
        <div className="absolute inset-0 z-0" style={{ background: "rgba(0,0,0,0.80)" }} />

        <div className="relative z-10 flex flex-col items-center gap-5 text-center px-4 max-w-3xl w-full">
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Logo" className="h-20 object-contain drop-shadow-lg" />

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/60 flex-wrap justify-center">
            <Link
              href={locale === "es" ? `/${version}` : `/${locale}/${version}`}
              className="hover:text-gold transition-colors"
            >
              {t("breadcrumb_home")}
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <Link href={versionPath("/guides")} className="hover:text-gold transition-colors">
              {t("breadcrumb_guides")}
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-gold font-medium line-clamp-1 max-w-50" title={title}>
              {title}
            </span>
          </nav>

          {/* Title */}
          <h1
            className="font-bebas tracking-widest uppercase drop-shadow-lg leading-tight"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
          >
            {title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-3 flex-wrap justify-center text-xs text-white/60">
            {catName && (
              <span className="flex items-center gap-1 text-gold font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20">
                <Tag className="h-3 w-3" />
                {catName}
              </span>
            )}
            <Badge variant="outline" className="border-gold/30 text-gold/80 text-xs">
              v{versionLabel}
            </Badge>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ CONTENT ═══════════════════════ */}
      <section className="px-4 py-12" style={{ background: "#080808" }}>
        <div className="container mx-auto max-w-3xl flex flex-col gap-8">

          {/* Back link */}
          <Link
            href={versionPath("/guides")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back_to_guides")}
          </Link>

          {/* Featured image */}
          {guide.featured_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={guide.featured_image}
              alt={title}
              className="w-full rounded-xl object-cover max-h-80 border border-white/10"
            />
          )}

          {/* YouTube embed */}
          {videoEmbed && (
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
              <iframe
                src={videoEmbed}
                title="YouTube video"
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          )}

          {/* External video link (non-YouTube) */}
          {guide.video_url && !videoEmbed && (
            <a
              href={guide.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-gold hover:text-gold/80 transition-colors w-fit"
            >
              <ExternalLink className="h-4 w-4" />
              {t("watch_video")}
            </a>
          )}

          {/* Article body */}
          {content ? (
            <article
              className="prose prose-invert prose-sm max-w-none
                prose-headings:font-bebas prose-headings:tracking-wider prose-headings:text-gold
                prose-a:text-gold prose-a:no-underline hover:prose-a:underline
                prose-strong:text-white
                prose-li:marker:text-gold/60"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-muted-foreground text-sm">{t("no_guides")}</p>
          )}

          {/* Bottom back link */}
          <div className="pt-4 border-t border-white/10">
            <Link
              href={versionPath("/guides")}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("back_to_guides")}
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
}
