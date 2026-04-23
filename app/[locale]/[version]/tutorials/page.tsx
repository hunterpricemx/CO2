import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Clapperboard } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import NewsFilters from "@/components/shared/NewsFilters";
import { TikTokTutorialGrid } from "@/components/shared/TikTokTutorialGrid";
import { getTikTokEmbedUrl, isTikTokUrl } from "@/lib/video";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { getAllInfluencersActive } from "@/modules/influencers/queries";
import type { InfluencerRow } from "@/modules/influencers/types";
import { getGuideCategories, getPublishedGuides } from "@/modules/guides/queries";
import type { GuideRow } from "@/modules/guides/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tutorials" });

  return {
    title: t("meta_title"),
    description: t("meta_description"),
  };
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getGuideSummaryText(summary: string | null | undefined, content: string | null | undefined): string | null {
  const cleanSummary = summary?.trim();
  if (cleanSummary) return cleanSummary;

  const text = stripHtml(content);
  return text.length > 120 ? `${text.slice(0, 120)}...` : text || null;
}

export default async function TutorialsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; version: string }>;
  searchParams: Promise<{ q?: string; cat?: string; sort?: string }>;
}) {
  const { locale, version } = await params;
  const { q = "", cat = "", sort = "newest" } = await searchParams;
  const t = await getTranslations("tutorials");

  const [categories, allGuides, settings, influencers] = await Promise.all([
    getGuideCategories(),
    getPublishedGuides({ version: version as "1.0" | "2.0" }),
    getSiteSettings(),
    getAllInfluencersActive(),
  ]);

  const tutorials = allGuides.filter((guide) => isTikTokUrl(guide.video_url));
  const catObj = cat ? categories.find((entry) => entry.slug === cat) : null;

  let filtered: GuideRow[] = catObj
    ? tutorials.filter((guide) => guide.category_id === catObj.id)
    : tutorials;

  if (q.trim()) {
    const query = q.trim().toLowerCase();
    filtered = filtered.filter((guide) => {
      const title = locale === "en" ? guide.title_en : locale === "pt" ? guide.title_pt : guide.title_es;
      return title.toLowerCase().includes(query);
    });
  }

  if (sort === "oldest") {
    filtered = [...filtered].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  const { heroBg, logoSrc } = getVersionAssets(settings, version);

  function versionPath(path: string) {
    return locale === "es" ? `/${version}${path}` : `/${locale}/${version}${path}`;
  }

  function getTitle(guide: GuideRow) {
    return locale === "en" ? guide.title_en : locale === "pt" ? guide.title_pt : guide.title_es;
  }

  function getSnippet(guide: GuideRow) {
    const summary = locale === "en" ? guide.summary_en : locale === "pt" ? guide.summary_pt : guide.summary_es;
    const content = locale === "en" ? guide.content_en : locale === "pt" ? guide.content_pt : guide.content_es;
    return getGuideSummaryText(summary, content);
  }

  function getCatName(catId: string | null) {
    if (!catId) return null;
    const category = categories.find((entry) => entry.id === catId);
    if (!category) return null;
    return locale === "en" ? category.name_en : locale === "pt" ? category.name_pt : category.name_es;
  }

  function getAuthorName(authorId: string | null) {
    if (!authorId) return null;
    return (influencers as InfluencerRow[]).find((influencer) => influencer.id === authorId)?.name ?? null;
  }

  function getAuthorSlug(authorId: string | null) {
    if (!authorId) return null;
    return (influencers as InfluencerRow[]).find((influencer) => influencer.id === authorId)?.slug ?? null;
  }

  const tutorialCards = filtered.map((guide) => ({
    id: guide.id,
    title: getTitle(guide),
    snippet: getSnippet(guide),
    catName: getCatName(guide.category_id),
    authorName: getAuthorName(guide.author_influencer_id),
    authorHref: getAuthorSlug(guide.author_influencer_id)
      ? versionPath(`/influencers/${getAuthorSlug(guide.author_influencer_id)}`)
      : null,
    versionLabel: guide.version === "both" ? "1.0 + 2.0" : guide.version,
    guideHref: versionPath(`/guides/${guide.slug}`),
    videoUrl: guide.video_url,
    embedUrl: getTikTokEmbedUrl(guide.video_url),
    thumbnailUrl: guide.featured_image ?? null,
  }));

  return (
    <div className="flex flex-col">
      <section
        className="relative flex items-center justify-center"
        style={{
          minHeight: "40vh",
          backgroundImage: `url('${heroBg}')`,
          backgroundSize: "cover",
          backgroundPosition: "50% 24%",
          backgroundRepeat: "no-repeat",
          paddingTop: "4rem",
          paddingBottom: "4rem",
        }}
      >
        <div className="absolute inset-0 z-0" style={{ background: "rgba(0,0,0,0.80)" }} />

        <div className="relative z-10 flex flex-col items-center gap-5 px-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Logo" className="h-20 object-contain drop-shadow-lg" />

          <nav className="flex items-center gap-2 text-xs text-white/60">
            <Link
              href={locale === "es" ? `/${version}` : `/${locale}/${version}`}
              className="hover:text-gold transition-colors"
            >
              {t("breadcrumb_home")}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-gold">{t("breadcrumb_tutorials")}</span>
          </nav>

          <h1
            className="font-bebas tracking-widest uppercase drop-shadow-lg"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
          >
            {t("title")}
          </h1>

          <p className="max-w-2xl font-poppins text-base leading-relaxed text-white/80">
            {t("subtitle")}
          </p>
        </div>
      </section>

      <section className="px-4 py-12" style={{ background: "#080808" }}>
        <div className="container mx-auto flex max-w-screen-2xl flex-col gap-8">
          <Suspense fallback={<div className="h-20 animate-pulse rounded-xl bg-white/5" />}>
            <NewsFilters
              categories={categories}
              locale={locale}
              searchPlaceholder={t("search_placeholder")}
              allLabel={t("all_categories")}
              sortNewest={t("sort_newest")}
              sortOldest={t("sort_oldest")}
              currentCat={cat}
              currentSort={sort}
              currentQ={q}
            />
          </Suspense>

          {(q || cat) && (
            <p className="-mt-4 text-xs text-muted-foreground">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </p>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <Clapperboard className="h-12 w-12 text-white/15" />
              <p className="text-muted-foreground">{t("no_results")}</p>
              <p className="max-w-lg text-sm leading-relaxed text-white/50">{t("empty_hint")}</p>
            </div>
          ) : (
            <TikTokTutorialGrid
              items={tutorialCards}
              labels={{
                platformBadge: t("platform_badge"),
                authorLabel: t("author_label"),
                openGuide: t("open_guide"),
                playHere: t("play_here"),
              }}
            />
          )}
        </div>
      </section>
    </div>
  );
}
