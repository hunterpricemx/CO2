import Link from "next/link";
import { Suspense } from "react";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { Newspaper, ChevronRight, Calendar } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getAllNewsPublished, getNewsCategories } from "@/modules/news/queries";
import type { NewsPostRow } from "@/modules/news/types";
import NewsFilters from "@/components/shared/NewsFilters";

export const metadata: Metadata = { title: "Noticias" };

export default async function NewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; version: string }>;
  searchParams: Promise<{ q?: string; cat?: string; sort?: string }>;
}) {
  const { locale, version } = await params;
  const { q = "", cat = "", sort = "newest" } = await searchParams;
  const t = await getTranslations("news");

  const [allPosts, categories] = await Promise.all([
    getAllNewsPublished(),
    getNewsCategories(),
  ]);

  // Filter by category
  const catObj = cat ? categories.find((c) => c.slug === cat) : null;
  let filtered: NewsPostRow[] = catObj
    ? allPosts.filter((p) => p.category_id === catObj.id)
    : allPosts;

  // Filter by search query
  if (q.trim()) {
    const query = q.trim().toLowerCase();
    filtered = filtered.filter((p) => {
      const title = locale === "en" ? p.title_en : locale === "pt" ? p.title_pt : p.title_es;
      const summary = locale === "en" ? p.summary_en : locale === "pt" ? p.summary_pt : p.summary_es;
      return (
        title.toLowerCase().includes(query) ||
        (summary?.toLowerCase().includes(query) ?? false)
      );
    });
  }

  // Sort
  if (sort === "oldest") {
    filtered = [...filtered].sort(
      (a, b) =>
        new Date(a.published_at ?? a.created_at).getTime() -
        new Date(b.published_at ?? b.created_at).getTime()
    );
  }

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);

  function homeHref() {
    return locale === "es" ? `/${version}` : `/${locale}/${version}`;
  }

  function versionPath(path: string) {
    return locale === "es" ? `/${version}${path}` : `/${locale}/${version}${path}`;
  }

  function getTitle(p: NewsPostRow) {
    return locale === "en" ? p.title_en : locale === "pt" ? p.title_pt : p.title_es;
  }

  function getSummary(p: NewsPostRow) {
    return locale === "en" ? p.summary_en : locale === "pt" ? p.summary_pt : p.summary_es;
  }

  function getCatName(catId: string | null) {
    if (!catId) return null;
    const c = categories.find((x) => x.id === catId);
    if (!c) return null;
    return locale === "en" ? c.name_en : locale === "pt" ? c.name_pt : c.name_es;
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(
      locale === "en" ? "en-US" : locale === "pt" ? "pt-BR" : "es-ES",
      { year: "numeric", month: "short", day: "numeric" }
    );
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
        {/* Dark overlay */}
        <div className="absolute inset-0 z-0" style={{ background: "rgba(0,0,0,0.80)" }} />

        <div className="relative z-10 flex flex-col items-center gap-5 text-center px-4">
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Logo" className="h-20 object-contain drop-shadow-lg" />

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/60">
            <Link href={homeHref()} className="hover:text-gold transition-colors">
              {t("breadcrumb_home")}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gold font-medium">{t("breadcrumb_news")}</span>
          </nav>

          {/* Title */}
          <h1
            className="font-bebas tracking-widest uppercase drop-shadow-lg"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
          >
            {t("hero_title")}
          </h1>

          {/* Subtitle */}
          <p className="font-poppins text-base text-white/80 max-w-lg">
            {t("hero_subtitle")}
          </p>
        </div>
      </section>

      {/* ═══════════════════════ CONTENT ═══════════════════════ */}
      <section className="px-4 py-12" style={{ background: "#080808" }}>
        <div className="container mx-auto max-w-5xl flex flex-col gap-8">

          {/* Filters */}
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

          {/* Count */}
          {(q || cat) && (
            <p className="text-xs text-muted-foreground -mt-4">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* News grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <Newspaper className="h-12 w-12 text-white/15" />
              <p className="text-muted-foreground">{t("no_results")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((post) => {
                const title = getTitle(post);
                const summary = getSummary(post);
                const catName = getCatName(post.category_id);
                const date = formatDate(post.published_at);

                return (
                  <article
                    key={post.id}
                    className="flex flex-col rounded-xl overflow-hidden border border-white/10 bg-surface hover:border-gold/30 transition-colors group"
                  >
                    {/* Featured image */}
                    <Link href={versionPath(`/news/${post.slug}`)} className="block overflow-hidden">
                      {post.featured_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.featured_image}
                          alt={title}
                          className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-44 flex items-center justify-center bg-white/5">
                          <Newspaper className="h-10 w-10 text-white/20" />
                        </div>
                      )}
                    </Link>

                    {/* Body */}
                    <div className="flex flex-col gap-3 p-5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {catName && (
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-gold px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20">
                            {catName}
                          </span>
                        )}
                        {date && (
                          <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {date}
                          </span>
                        )}
                      </div>

                      <h2 className="font-semibold text-sm leading-snug line-clamp-2">
                        <Link
                          href={versionPath(`/news/${post.slug}`)}
                          className="hover:text-gold transition-colors"
                        >
                          {title}
                        </Link>
                      </h2>

                      {summary && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {summary}
                        </p>
                      )}

                      <div className="mt-auto pt-2">
                        <Link
                          href={versionPath(`/news/${post.slug}`)}
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
