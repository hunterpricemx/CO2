import Link from "next/link";
import { Suspense } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import { getSiteSettings, getVersionAssets, buildPageSeo } from "@/lib/site-settings";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { isTikTokUrl } from "@/lib/video";
import { getAllInfluencersActive } from "@/modules/influencers/queries";
import type { InfluencerRow } from "@/modules/influencers/types";
import { getGuideCategories, getPublishedGuides } from "@/modules/guides/queries";
import type { GuideRow } from "@/modules/guides/types";
import NewsFilters from "@/components/shared/NewsFilters";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}): Promise<Metadata> {
  void params;
  const settings = await getSiteSettings();
  return buildPageSeo(settings, "guides", "Guías");
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getGuideSummaryText(summary: string | null | undefined, content: string | null | undefined): string | null {
  const cleanSummary = summary?.trim();
  if (cleanSummary) return cleanSummary;

  const text = stripHtml(content);
  return text.length > 120 ? `${text.slice(0, 120)}\u2026` : text || null;
}

export default async function GuidesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; version: string }>;
  searchParams: Promise<{ q?: string; cat?: string; sort?: string }>;
}) {
  const { locale, version } = await params;
  const { q = "", cat = "", sort = "newest" } = await searchParams;
  const t = await getTranslations("guides");

  const [categories, allGuides, influencers] = await Promise.all([
    getGuideCategories(),
    getPublishedGuides({ version: version as "1.0" | "2.0" }),
    getAllInfluencersActive(),
  ]);

  const nonTutorialGuides = allGuides.filter((guide) => !isTikTokUrl(guide.video_url));
  const catObj = cat ? categories.find((c) => c.slug === cat) : null;
  let filtered: GuideRow[] = catObj
    ? nonTutorialGuides.filter((g) => g.category_id === catObj.id)
    : nonTutorialGuides;

  if (q.trim()) {
    const query = q.trim().toLowerCase();
    filtered = filtered.filter((g) => {
      const title = locale === "en" ? g.title_en : locale === "pt" ? g.title_pt : g.title_es;
      return title.toLowerCase().includes(query);
    });
  }

  if (sort === "oldest") {
    filtered = [...filtered].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);

  function versionPath(path: string) {
    return locale === "es" ? `/${version}${path}` : `/${locale}/${version}${path}`;
  }

  function getTitle(g: GuideRow) {
    return locale === "en" ? g.title_en : locale === "pt" ? g.title_pt : g.title_es;
  }

  function getSnippet(g: GuideRow) {
    const summary = locale === "en" ? g.summary_en : locale === "pt" ? g.summary_pt : g.summary_es;
    const content = locale === "en" ? g.content_en : locale === "pt" ? g.content_pt : g.content_es;
    return getGuideSummaryText(summary, content);
  }

  function getCatName(catId: string | null) {
    if (!catId) return null;
    const c = categories.find((x) => x.id === catId);
    if (!c) return null;
    return locale === "en" ? c.name_en : locale === "pt" ? c.name_pt : c.name_es;
  }

  function getAuthorName(authorId: string | null) {
    if (!authorId) return null;
    return (influencers as InfluencerRow[]).find((influencer) => influencer.id === authorId)?.name ?? null;
  }

  return (
    <div className="flex flex-col">

      {/* ═══════════════════════ HERO HEADER ═══════════════════════ */}
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

        <div className="relative z-10 flex flex-col items-center gap-5 text-center px-4">
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
            <span className="text-gold font-medium">{t("breadcrumb_guides")}</span>
          </nav>

          <h1
            className="font-bebas tracking-widest uppercase drop-shadow-lg"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
          >
            {t("title")}
          </h1>

          <p className="font-poppins text-base text-white/80 max-w-lg">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* ═══════════════════════ CONTENT ═══════════════════════ */}
      <section className="px-4 py-12" style={{ background: "#080808" }}>
        <div className="container mx-auto max-w-5xl flex flex-col gap-8">

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
            <p className="text-xs text-muted-foreground -mt-4">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </p>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <BookOpen className="h-12 w-12 text-white/15" />
              <p className="text-muted-foreground">{t("no_results")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((guide) => {
                const title = getTitle(guide);
                const snippet = getSnippet(guide);
                const catName = getCatName(guide.category_id);
                const authorName = getAuthorName(guide.author_influencer_id);
                const versionLabel = guide.version === "both" ? "1.0 + 2.0" : guide.version;

                return (
                  <article
                    key={guide.id}
                    className="flex flex-col rounded-xl overflow-hidden border border-white/10 bg-surface hover:border-gold/30 transition-colors group"
                  >
                    <Link href={versionPath(`/guides/${guide.slug}`)} className="block overflow-hidden">
                      {guide.featured_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={guide.featured_image}
                          alt={title}
                          className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-44 flex items-center justify-center bg-white/5">
                          <BookOpen className="h-10 w-10 text-white/20" />
                        </div>
                      )}
                    </Link>

                    <div className="flex flex-col gap-3 p-5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {catName && (
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-gold px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20">
                            {catName}
                          </span>
                        )}
                        <Badge variant="outline" className="ml-auto border-gold/20 text-muted-foreground text-[11px]">
                          v{versionLabel}
                        </Badge>
                      </div>

                      <h2 className="font-semibold text-sm leading-snug line-clamp-2">
                        <Link
                          href={versionPath(`/guides/${guide.slug}`)}
                          className="hover:text-gold transition-colors"
                        >
                          {title}
                        </Link>
                      </h2>

                      {authorName && (
                        <p className="text-[11px] uppercase tracking-wider text-white/45">
                          {t("author_label")}: <span className="text-white/75">{authorName}</span>
                        </p>
                      )}

                      {snippet && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {snippet}
                        </p>
                      )}

                      <div className="mt-auto pt-2">
                        <Link
                          href={versionPath(`/guides/${guide.slug}`)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold/80 transition-colors"
                        >
                          {t("read_more")}
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

        </div>
      </section>
    </div>
  );
}
