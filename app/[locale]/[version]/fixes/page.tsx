import Link from "next/link";
import { Suspense } from "react";
import { Wrench, ChevronRight, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getFixCategories, getPublishedFixes } from "@/modules/fixes/queries";
import type { FixRow } from "@/modules/fixes/types";
import NewsFilters from "@/components/shared/NewsFilters";
import { Badge } from "@/components/ui/badge";

import { getSiteSettings, buildPageSeo } from "@/lib/site-settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}): Promise<Metadata> {
  void params;
  const settings = await getSiteSettings();
  return buildPageSeo(settings, "fixes", "Fixes");
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default async function FixesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; version: string }>;
  searchParams: Promise<{ q?: string; cat?: string; sort?: string }>;
}) {
  const { locale, version } = await params;
  const { q = "", cat = "", sort = "newest" } = await searchParams;
  const t = await getTranslations("fixes");

  const [categories, allFixes] = await Promise.all([
    getFixCategories(),
    getPublishedFixes({ version: version as "1.0" | "2.0" }),
  ]);

  const catObj = cat ? categories.find((c) => c.slug === cat) : null;
  let filtered: FixRow[] = catObj
    ? allFixes.filter((f) => f.category_id === catObj.id)
    : allFixes;

  if (q.trim()) {
    const query = q.trim().toLowerCase();
    filtered = filtered.filter((f) => {
      const title = locale === "en" ? f.title_en : locale === "pt" ? f.title_pt : f.title_es;
      return title.toLowerCase().includes(query);
    });
  }

  if (sort === "oldest") {
    filtered = [...filtered].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

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

  function getTitle(f: FixRow) {
    return locale === "en" ? f.title_en : locale === "pt" ? f.title_pt : f.title_es;
  }

  function getSnippet(f: FixRow) {
    const content = locale === "en" ? f.content_en : locale === "pt" ? f.content_pt : f.content_es;
    const text = stripHtml(content);
    return text.length > 120 ? text.slice(0, 120) + "\u2026" : text || null;
  }

  function getCatName(catId: string | null) {
    if (!catId) return null;
    const c = categories.find((x) => x.id === catId);
    if (!c) return null;
    return locale === "en" ? c.name_en : locale === "pt" ? c.name_pt : c.name_es;
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
            <span className="text-gold font-medium">{t("breadcrumb_fixes")}</span>
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
              <Wrench className="h-12 w-12 text-white/15" />
              <p className="text-muted-foreground">{t("no_results")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((fix) => {
                const title = getTitle(fix);
                const snippet = getSnippet(fix);
                const catName = getCatName(fix.category_id);
                const versionLabel = fix.version === "both" ? "1.0 + 2.0" : fix.version;

                return (
                  <article
                    key={fix.id}
                    className="flex flex-col rounded-xl overflow-hidden border border-white/10 bg-surface hover:border-gold/30 transition-colors group"
                  >
                    <Link href={versionPath(`/fixes/${fix.slug}`)} className="block overflow-hidden">
                      {fix.featured_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fix.featured_image}
                          alt={title}
                          className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-44 flex items-center justify-center bg-white/5">
                          <Wrench className="h-10 w-10 text-white/20" />
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
                          href={versionPath(`/fixes/${fix.slug}`)}
                          className="hover:text-gold transition-colors"
                        >
                          {title}
                        </Link>
                      </h2>

                      {snippet && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {snippet}
                        </p>
                      )}

                      <div className="mt-auto pt-2 flex items-center gap-3">
                        <Link
                          href={versionPath(`/fixes/${fix.slug}`)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold/80 transition-colors"
                        >
                          {t("read_more")}
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                        {fix.video_url && (
                          <a
                            href={fix.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t("watch_video")}
                          </a>
                        )}
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

