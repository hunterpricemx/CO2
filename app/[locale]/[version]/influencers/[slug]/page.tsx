import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Facebook, Instagram, Twitch, Youtube, ArrowLeft, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TikTokTutorialGrid } from "@/components/shared/TikTokTutorialGrid";
import { Badge } from "@/components/ui/badge";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { getTikTokEmbedUrl, isTikTokUrl } from "@/lib/video";
import { getInfluencerBySlug } from "@/modules/influencers/queries";
import { getPublishedGuides } from "@/modules/guides/queries";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z" />
    </svg>
  );
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string; version: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const influencer = await getInfluencerBySlug(slug);
  if (!influencer) return { title: "Influencer no encontrado" };

  const description =
    locale === "en"
      ? influencer.description_en
      : locale === "pt"
        ? influencer.description_pt
        : influencer.description_es;

  return {
    title: influencer.name,
    description: description?.trim() || undefined,
  };
}

export default async function InfluencerSinglePage({
  params,
}: {
  params: Promise<{ locale: string; version: string; slug: string }>;
}) {
  const { locale, version, slug } = await params;
  const t = await getTranslations("influencers");
  const influencer = await getInfluencerBySlug(slug);

  if (!influencer) notFound();

  const [settings, guides] = await Promise.all([
    getSiteSettings(),
    getPublishedGuides({ version: version as "1.0" | "2.0" }),
  ]);

  const { heroBg, logoSrc } = getVersionAssets(settings, version);
  const description =
    locale === "en"
      ? influencer.description_en
      : locale === "pt"
        ? influencer.description_pt
        : influencer.description_es;

  const tutorials = guides.filter(
    (guide) => guide.author_influencer_id === influencer.id && isTikTokUrl(guide.video_url),
  );

  const tutorialCards = tutorials.map((guide) => ({
    id: guide.id,
    title: locale === "en" ? guide.title_en : locale === "pt" ? guide.title_pt : guide.title_es,
    snippet: getGuideSummaryText(
      locale === "en" ? guide.summary_en : locale === "pt" ? guide.summary_pt : guide.summary_es,
      locale === "en" ? guide.content_en : locale === "pt" ? guide.content_pt : guide.content_es,
    ),
    catName: null,
    authorName: influencer.name,
    authorHref: locale === "es" ? `/${version}/influencers/${influencer.slug}` : `/${locale}/${version}/influencers/${influencer.slug}`,
    versionLabel: guide.version === "both" ? "1.0 + 2.0" : guide.version,
    guideHref: locale === "es" ? `/${version}/guides/${guide.slug}` : `/${locale}/${version}/guides/${guide.slug}`,
    videoUrl: guide.video_url,
    embedUrl: getTikTokEmbedUrl(guide.video_url),
    thumbnailUrl: guide.featured_image ?? null,
  }));

  const socials = [
    { href: influencer.youtube_url, label: "YouTube", Icon: Youtube, className: "text-red-400" },
    { href: influencer.twitch_url, label: "Twitch", Icon: Twitch, className: "text-purple-400" },
    { href: influencer.instagram_url, label: "Instagram", Icon: Instagram, className: "text-pink-400" },
    { href: influencer.tiktok_url, label: "TikTok", Icon: TikTokIcon, className: "text-white/80" },
    { href: influencer.facebook_url, label: "Facebook", Icon: Facebook, className: "text-blue-400" },
  ].filter((social) => !!social.href);

  const homeHref = locale === "es" ? `/${version}` : `/${locale}/${version}`;
  const influencersHref = locale === "es" ? `/${version}/influencers` : `/${locale}/${version}/influencers`;

  return (
    <div className="flex flex-col">
      <section className="relative flex min-h-90 flex-col items-center justify-end overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('${heroBg}')`,
            backgroundSize: "cover",
            backgroundPosition: "50% 24%",
          }}
        />
        <div className="absolute inset-0 bg-black/80" />

        <div className="relative z-10 flex flex-col items-center gap-3 px-4 pb-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Conquer" className="mb-2 w-36 drop-shadow-xl" />
          <p className="text-sm">
            <Link href={homeHref} className="text-gold transition-colors hover:text-gold-light">
              {t("breadcrumb_home")}
            </Link>
            <span className="mx-2 text-white/40">›</span>
            <Link href={influencersHref} className="text-gold transition-colors hover:text-gold-light">
              {t("breadcrumb_influencers")}
            </Link>
            <span className="mx-2 text-white/40">›</span>
            <span className="text-white/70">{influencer.name}</span>
          </p>
          <h1 className="font-bebas text-[3.5rem] leading-none tracking-widest text-white uppercase">
            {influencer.name}
          </h1>
          {description && <p className="max-w-2xl text-base text-white/70">{description}</p>}
        </div>
      </section>

      <section className="px-4 py-12" style={{ background: "#080808", minHeight: "50vh" }}>
        <div className="container mx-auto flex max-w-screen-2xl flex-col gap-8">
          <Link
            href={influencersHref}
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-gold"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back_to_influencers")}
          </Link>

          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            <aside className="overflow-hidden rounded-2xl border border-[rgba(255,215,0,0.15)] bg-[rgba(26,26,26,0.95)]">
              <div className="relative aspect-square bg-[#0d0603]">
                {influencer.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={influencer.photo_url} alt={influencer.name} className="absolute inset-0 h-full w-full object-contain" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center font-bebas text-7xl text-gold/20">
                    {influencer.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#111] via-transparent to-transparent" />
              </div>

              <div className="flex flex-col gap-4 p-5">
                {influencer.streamer_code && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-poppins uppercase tracking-wider text-white/40">
                      {t("streamer_code_label")}
                    </span>
                    <Badge variant="outline" className="w-fit border-gold/20 text-gold">
                      {influencer.streamer_code}
                    </Badge>
                  </div>
                )}

                {socials.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-poppins uppercase tracking-wider text-white/40">
                      {t("socials_label")}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {socials.map(({ href, label, Icon, className }) => (
                        <a
                          key={label}
                          href={href!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium transition-colors hover:border-white/20 hover:bg-white/10 ${className}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            <div className="flex flex-col gap-5">
              <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="font-bebas text-3xl uppercase tracking-widest text-white">
                    {t("single_tutorials_title")}
                  </h2>
                  <p className="mt-1 text-sm text-white/55">
                    {t("single_tutorials_count", { count: tutorials.length })}
                  </p>
                </div>
              </div>

              {tutorialCards.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/3 px-6 py-14 text-center text-white/45">
                  {t("single_no_tutorials")}
                </div>
              ) : (
                <TikTokTutorialGrid
                  items={tutorialCards}
                  labels={{
                    platformBadge: "TikTok",
                    authorLabel: t("single_author_label"),
                    openGuide: t("single_open_guide"),
                    playHere: t("single_play_here"),
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
