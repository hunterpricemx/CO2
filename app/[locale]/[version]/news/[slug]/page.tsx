import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Tag, Calendar, ArrowLeft } from "lucide-react";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getNewsBySlug, getNewsCategories } from "@/modules/news/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; version: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getNewsBySlug(slug);
  if (!post) return { title: "Noticia no encontrada" };
  const title =
    locale === "en" ? post.title_en : locale === "pt" ? post.title_pt : post.title_es;
  const description =
    locale === "en"
      ? post.summary_en
      : locale === "pt"
        ? post.summary_pt
        : post.summary_es;
  return { title, description: description ?? undefined };
}

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ locale: string; version: string; slug: string }>;
}) {
  const { locale, version, slug } = await params;
  const t = await getTranslations("news");

  const [post, categories] = await Promise.all([
    getNewsBySlug(slug),
    getNewsCategories(),
  ]);

  if (!post) notFound();

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);

  function versionPath(path: string) {
    return locale === "es" ? `/${version}${path}` : `/${locale}/${version}${path}`;
  }

  const title =
    locale === "en" ? post.title_en : locale === "pt" ? post.title_pt : post.title_es;
  const content =
    locale === "en" ? post.content_en : locale === "pt" ? post.content_pt : post.content_es;

  const category = post.category_id
    ? categories.find((c) => c.id === post.category_id)
    : null;
  const catName = category
    ? locale === "en"
      ? category.name_en
      : locale === "pt"
        ? category.name_pt
        : category.name_es
    : null;

  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString(
        locale === "en" ? "en-US" : locale === "pt" ? "pt-BR" : "es-ES",
        { year: "numeric", month: "long", day: "numeric" }
      )
    : null;

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
            <Link href={versionPath("/news")} className="hover:text-gold transition-colors">
              {t("breadcrumb_news")}
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
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t("published_on")} {formattedDate}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ CONTENT ═══════════════════════ */}
      <section className="px-4 py-12" style={{ background: "#080808" }}>
        <div className="container mx-auto max-w-3xl flex flex-col gap-8">

          {/* Back link */}
          <Link
            href={versionPath("/news")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back_to_news")}
          </Link>

          {/* Featured image */}
          {post.featured_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.featured_image}
              alt={title}
              className="w-full rounded-xl object-cover max-h-80"
            />
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
            <p className="text-muted-foreground text-sm">{t("no_results")}</p>
          )}

          {/* Bottom back link */}
          <div className="pt-4 border-t border-white/10">
            <Link
              href={versionPath("/news")}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("back_to_news")}
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
}
