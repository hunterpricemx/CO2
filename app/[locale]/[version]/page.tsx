import Link from "next/link";
import { getPublishedEvents } from "@/modules/events/queries";
import { getPublishedGuides } from "@/modules/guides/queries";
import { getLatestNews } from "@/modules/news/queries";
import { ServerClock } from "@/components/shared/ServerClock";
import { ArrowRight, Crown, Gem } from "lucide-react";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EventsCountdownSidebar } from "@/components/shared/EventsCountdownSidebar";
import { HeroNextEvent } from "@/components/shared/HeroNextEvent";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { PromoSlider } from "@/components/shared/PromoSlider";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Conquer Online Classic Plus — el servidor privado más completo. Dos versiones: 1.0 y 2.0.",
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}) {
  const { locale, version } = await params;
  const t = await getTranslations("home");
  const te = await getTranslations("events");
  const [events, guides, latestNews, siteSettings] = await Promise.all([
    getPublishedEvents({ version: version as "1.0" | "2.0" }),
    getPublishedGuides({ version: version as "1.0" | "2.0", limit: 3 }),
    getLatestNews({ limit: 3 }),
    getSiteSettings(),
  ]);

  const versionLabel = version === "1.0" ? "Classic Plus 1.0" : "Experience 2.0";
  const { heroBg, logoSrc: heroLogo, videoUrl, promoSlides } = getVersionAssets(siteSettings, version);
  const heroTitle = version === "1.0" ? t("hero_title_10") : t("hero_title_20");
  const downloadBg =
    version === "1.0"
      ? "/images/buttons/descarga.png"
      : "/images/buttons/descarga20.png";

  const features = [
    t("feature_jump"),
    t("feature_maxlevel"),
    t("feature_gear"),
    t("feature_reborns"),
    t("feature_drops"),
    t("feature_stack"),
    t("feature_mining"),
    t("feature_pk"),
    t("feature_cps"),
    t("feature_quests"),
    t("feature_bp"),
  ];

  function versionPath(path: string) {
    return `/${locale === "es" ? "" : locale + "/"}${version}${path}`;
  }
  function extractYoutubeId(url: string) {
    const m = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : url;
  }
  function evTitle(ev: { title_es: string; title_en: string; title_pt: string }) {
    return locale === "es" ? ev.title_es : locale === "en" ? ev.title_en : ev.title_pt;
  }
  function guideTitle(g: { title_es: string; title_en: string; title_pt: string }) {
    return locale === "es" ? g.title_es : locale === "en" ? g.title_en : g.title_pt;
  }

  /* ─── inline style objects ─── */
  const sidebarCard: React.CSSProperties = {
    background: "linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(46, 46, 76, 0.95))",
    border: "1px solid rgba(255, 215, 0, 0.2)",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
  };
  const sidebarCardEvents: React.CSSProperties = {
    background: "linear-gradient(135deg, rgba(26, 26, 46, 0.98), rgba(46, 46, 76, 0.98))",
    border: "1px solid rgba(255, 215, 0, 0.3)",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
  };

  return (
    <div className="flex flex-col">

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section
        className="relative flex flex-col items-center justify-center overflow-visible pb-8"
        style={{
          minHeight: "calc(100vh - 200px)",
          backgroundImage: `url('${heroBg}')`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
        }}
      >
        {/* Logo + Title */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center py-24 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroLogo}
            alt={versionLabel}
            className="mb-8 max-w-68 w-full h-auto"
            style={{ filter: "drop-shadow(0 5px 15px rgba(0, 0, 0, 0.8))" }}
          />
          <h1
            className="font-bebas text-5xl sm:text-[4rem] uppercase tracking-widest text-white leading-none"
            style={{ textShadow: "3px 3px 10px rgba(0, 0, 0, 0.8)" }}
          >
            {heroTitle}
          </h1>
        </div>

        {/* Info Cards */}
        <div className="relative z-10 w-full max-w-5xl px-4 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-4">

            {/* Server Time Card */}
            <div
              className="rounded-xl p-4 min-h-25 flex items-center justify-between relative overflow-hidden hover:-translate-y-1.25 hover:shadow-2xl transition-all duration-300"
              style={{
                background: "url(/images/backgrounds/bg01.png) center / 100% 100% no-repeat",
              }}
            >
              <div className="absolute inset-0 rounded-xl bg-black/60" />
              <div className="relative z-10 w-[30%] flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/icons/reloj.png"
                  alt="Clock"
                  className="w-full"
                  style={{ marginBottom: "-12px", marginTop: "-11px", marginLeft: "-10px" }}
                />
              </div>
              <div className="relative z-10 w-[70%]">
                <p className="font-poppins text-white text-base font-normal -mb-0.75">{t("card_server_time")}</p>
                <div className="font-poppins text-white text-sm font-medium mt-1">
                  <ServerClock />
                </div>
              </div>
            </div>

            {/* Download Card */}
            <Link href={versionPath("/download")}>
              <div
                className="rounded-xl min-h-25 cursor-pointer hover:-translate-y-1.25 hover:shadow-2xl transition-all duration-300"
                style={{
                  background: `url('${downloadBg}') center / contain no-repeat`,
                }}
              />
            </Link>

            {/* Events Card */}
            <div
              className="rounded-xl p-4 min-h-25 flex items-center justify-between relative overflow-hidden hover:-translate-y-1.25 hover:shadow-2xl transition-all duration-300"
              style={{
                background: "url(/images/backgrounds/bg02.png) center / 100% 100% no-repeat",
              }}
            >
              <div className="absolute inset-0 rounded-xl bg-black/60" />
              <div className="relative z-10 w-[30%] flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/icons/eventos.png"
                  alt="Events"
                  className="w-full"
                  style={{ marginBottom: "-12px", marginTop: "-11px", marginLeft: "-10px" }}
                />
              </div>
              <div className="relative z-10 w-[70%]">
                <p className="font-poppins text-white text-base font-normal mb-1.25">{t("card_next_events")}</p>
                <HeroNextEvent
                  events={events}
                  locale={locale}
                  noEventsLabel={t("no_events_available")}
                  live={t("event_live")}
                  soon={t("event_soon")}
                  modalLabels={{
                    schedule: te("schedule"),
                    description: te("description"),
                    rewards: te("rewards"),
                    close: te("close"),
                  }}
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════ CONTENT SECTION ═══════════════════════ */}
      <section
        className="px-4 pb-12"
        style={{ backgroundColor: "#0f0503", minHeight: "50vh" }}
      >
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-[1fr_320px] gap-8 py-8">

            {/* ── MAIN CONTENT ── */}
            <div>
              <div
                className="rounded-2xl shadow-2xl"
                style={{
                  background: "linear-gradient(135deg, rgb(10, 10, 10) 0%, rgb(11, 10, 10) 100%)",
                  border: "2px solid rgba(243, 156, 18, 0.3)",
                  padding: "3rem",
                }}
              >
                {/* Header */}
                <div
                  className="text-center mb-12 pb-8"
                  style={{ borderBottom: "2px solid rgba(243, 156, 18, 0.2)" }}
                >
                  <h2 className="font-bebas text-[2.5rem] text-gold mb-2 uppercase tracking-widest">
                    {t("welcome_title")}
                  </h2>
                  <p className="font-poppins text-xl text-[#e0e0e0] font-light m-0">
                    {t("welcome_subtitle")}
                  </p>
                </div>

                {/* Video + Promo Slides */}
                {(videoUrl || promoSlides.filter((s) => s.image_url).length > 0) && (
                  <div className="grid md:grid-cols-2 gap-4 mb-10">
                    {/* Video */}
                    <div className="aspect-video rounded-xl overflow-hidden bg-black/40">
                      {videoUrl ? (
                        videoUrl.includes("youtu") ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${extractYoutubeId(videoUrl)}?rel=0&modestbranding=1`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Promo video"
                          />
                        ) : (
                          // eslint-disable-next-line jsx-a11y/media-has-caption
                          <video
                            src={videoUrl}
                            className="w-full h-full object-cover"
                            autoPlay
                            muted
                            loop
                            playsInline
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white/10 text-sm font-poppins">Sin video</span>
                        </div>
                      )}
                    </div>
                    {/* Promo Slides */}
                    <div className="aspect-video">
                      <PromoSlider slides={promoSlides} />
                    </div>
                  </div>
                )}

                {/* Features */}
                <div className="mb-10">
                  <h3 className="font-poppins text-2xl text-gold mb-6 font-semibold flex items-center gap-3">
                    <span className="text-[1.8rem]">⚔️</span>
                    {t("features_title")}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {features.map((feature, i) => (
                      <div
                        key={i}
                        className="font-poppins text-base text-[#e0e0e0] flex items-start gap-3 p-3 rounded-lg hover:bg-[rgba(243,156,18,0.1)] hover:translate-x-1.25 transition-all duration-300"
                        style={{ background: "rgba(243, 156, 18, 0.05)" }}
                      >
                        <span className="text-gold font-bold text-xl shrink-0">•</span>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Event Tags */}
                <div className="mb-10">
                  <h3 className="font-poppins text-2xl text-gold mb-6 font-semibold flex items-center gap-3">
                    <span className="text-[1.8rem]">🏆</span>
                    {t("events_section_title")}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {events.map((ev) => (
                      <span
                        key={ev.id}
                        className="font-poppins text-[0.95rem] text-white font-semibold px-5 py-2.5 rounded-full border-2 border-gold/30 hover:-translate-y-0.75 hover:scale-105 hover:shadow-[0_5px_15px_rgba(243,156,18,0.4)] transition-all duration-300"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(243, 156, 18, 0.8) 0%, rgba(230, 126, 34, 0.8) 100%)",
                        }}
                      >
                        {evTitle(ev)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Important Notice */}
                <div
                  className="rounded-xl p-6 flex gap-6 items-start mt-8"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(231, 76, 60, 0.15) 0%, rgba(192, 57, 43, 0.15) 100%)",
                    border: "2px solid rgba(231, 76, 60, 0.4)",
                  }}
                >
                  <span className="text-4xl shrink-0">⚠️</span>
                  <div>
                    <h4 className="font-poppins text-xl font-bold text-[#e74c3c] mb-3">
                      {t("notice_title")}
                    </h4>
                    <p className="font-poppins text-base text-[#e0e0e0] leading-relaxed m-0">
                      {t("notice_text")}{" "}
                      <strong className="text-[#e74c3c] font-bold">{t("notice_no_resp")}</strong>{" "}
                      {t("notice_text_end")}
                    </p>
                  </div>
                </div>

                {/* Latest Guides (bonus) */}
                {guides.length > 0 && (
                  <div className="mt-10">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-poppins text-2xl text-gold font-semibold flex items-center gap-3">
                        <span className="text-[1.8rem]">📖</span>
                        {t("latest_guides")}
                      </h3>
                      <Link
                        href={versionPath("/guides")}
                        className="font-poppins text-sm text-gold flex items-center gap-1 hover:text-gold-light transition-colors"
                      >
                        {t("read_all_guides")} <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      {guides.map((g) => (
                        <Link key={g.id} href={versionPath(`/guides/${g.slug}`)}>
                          <article
                            className="rounded-xl p-5 flex flex-col gap-3 h-full border border-white/5 hover:border-gold/30 hover:-translate-y-1 transition-all duration-300"
                            style={{ background: "rgba(243, 156, 18, 0.04)" }}
                          >
                            <span className="text-2xl">📖</span>
                            <h4 className="font-poppins text-sm font-semibold text-[#e0e0e0] hover:text-gold transition-colors line-clamp-3 leading-relaxed">
                              {guideTitle(g)}
                            </h4>
                            <span className="mt-auto font-poppins text-xs text-gold flex items-center gap-1">
                              {t("read_guide")} <ArrowRight className="h-3 w-3" />
                            </span>
                          </article>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── SIDEBAR ── */}
            <aside className="flex flex-col gap-6">

              {/* Events Schedule */}
              <div className="rounded-xl p-6" style={sidebarCardEvents}>
                <h3 className="font-bebas text-xl tracking-widest text-[#ffd700] mb-4 flex items-center gap-2">
                  <span>📅</span> {t("sidebar_events")}
                </h3>
                <EventsCountdownSidebar
                  events={events}
                  locale={locale}
                  eventsUrl={versionPath("/events")}
                  labels={{
                    title: t("sidebar_events"),
                    viewAll: t("sidebar_view_all_events"),
                    noEvents: t("no_events_available"),
                    live: t("event_live"),
                    soon: t("event_soon"),
                    startsIn: t("starts_in"),
                  }}
                  modalLabels={{
                    schedule: te("schedule"),
                    description: te("description"),
                    rewards: te("rewards"),
                    close: te("close"),
                  }}
                />
              </div>

              {/* Server Status */}
              <div className="rounded-xl p-6" style={sidebarCard}>
                <h3 className="font-bebas text-xl tracking-widest text-[#ffd700] mb-4 flex items-center gap-2">
                  <span>🟢</span> {t("sidebar_status")}
                </h3>
                <div className="flex flex-col">
                  <div
                    className="flex justify-between items-center py-2"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <span className="font-poppins text-[0.95rem] text-[#b4b4c8]">{t("sidebar_online_label")}</span>
                    <span className="font-poppins text-base font-black text-[#00ff88] uppercase">
                      {t("sidebar_online_value")}
                    </span>
                  </div>
                  <div
                    className="flex justify-between items-center py-2"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <span className="font-poppins text-[0.95rem] text-[#b4b4c8]">{t("sidebar_version_label")}</span>
                    <span className="font-poppins text-base font-semibold text-[#ffd700]">
                      {versionLabel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-poppins text-[0.95rem] text-[#b4b4c8]">{t("sidebar_server_time_label")}</span>
                    <ServerClock />
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="rounded-xl p-6" style={sidebarCard}>
                <h3 className="font-bebas text-xl tracking-widest text-[#ffd700] mb-4 flex items-center gap-2">
                  <span>🔗</span> {t("sidebar_quicklinks")}
                </h3>
                <div className="flex flex-col gap-2">
                  {[
                    { icon: "⬇️", label: t("sidebar_download"), href: versionPath("/download") },
                    { icon: "📖", label: t("sidebar_guides"), href: versionPath("/guides") },
                    { icon: "🏆", label: t("sidebar_rankings"), href: versionPath("/rankings") },
                    { icon: "💎", label: t("sidebar_donate"), href: versionPath("/donate") },
                  ].map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg font-poppins text-[#e0e0f0] hover:text-[#ffd700] border border-transparent hover:border-[rgba(255,215,0,0.3)] hover:translate-x-1.25 transition-all duration-300"
                      style={{ background: "rgba(0,0,0,0.2)" }}
                    >
                      <span className="text-xl">{l.icon}</span>
                      <span className="text-[0.9rem]">{l.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Latest News */}
              <div className="rounded-xl p-6" style={sidebarCard}>
                <h3 className="font-bebas text-xl tracking-widest text-[#ffd700] mb-4 flex items-center gap-2">
                  <span>📰</span> {t("sidebar_news")}
                </h3>
                <div className="flex flex-col gap-3">
                  {latestNews.length === 0 ? (
                    <p className="font-poppins text-sm text-[#b4b4c8]">{t("no_news_available")}</p>
                  ) : (
                    latestNews.map((n) => {
                      const title = locale === "en" ? n.title_en : locale === "pt" ? n.title_pt : n.title_es;
                      const summary = locale === "en" ? n.summary_en : locale === "pt" ? n.summary_pt : n.summary_es;
                      const dateStr = n.published_at
                        ? new Date(n.published_at).toLocaleDateString(
                            locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-ES",
                            { day: "numeric", month: "short", year: "numeric" }
                          )
                        : "";
                      return (
                        <Link
                          key={n.id}
                          href={versionPath(`/news/${n.slug}`)}
                          className="block p-3 rounded-lg hover:translate-x-1 transition-transform duration-300"
                          style={{
                            background: "rgba(0,0,0,0.2)",
                            borderLeft: "3px solid #ffd700",
                          }}
                        >
                          <p className="font-poppins text-[0.8rem] text-[#888] font-semibold mb-1">
                            {dateStr}
                          </p>
                          <p className="font-poppins text-[0.95rem] text-[#e0e0f0] leading-snug group-hover:text-[#ffd700]">
                            {title}
                          </p>
                          {summary && (
                            <p className="font-poppins text-[0.8rem] text-[#888] mt-0.5 leading-snug">
                              {summary}
                            </p>
                          )}
                        </Link>
                      );
                    })
                  )}
                  <Link
                    href={versionPath("/news")}
                    className="flex items-center justify-center gap-2 mt-2 py-2 rounded-lg font-bebas tracking-widest text-sm transition-colors duration-200"
                    style={{
                      background: "rgba(255,215,0,0.08)",
                      border: "1px solid rgba(255,215,0,0.25)",
                      color: "#ffd700",
                    }}
                  >
                    {t("sidebar_news_all")} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Discord */}
              <div className="rounded-xl p-6" style={sidebarCard}>
                <h3 className="font-bebas text-xl tracking-widest text-[#ffd700] mb-4 flex items-center gap-2">
                  <span>💬</span> {t("sidebar_community")}
                </h3>
                <p className="font-poppins text-[0.95rem] text-[#b4b4c8] leading-relaxed mb-4">
                  {t("sidebar_discord_text")}
                </p>
                <a
                  href="https://discord.gg/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center py-3 rounded-lg font-poppins font-bold text-white text-sm hover:-translate-y-0.5 transition-all duration-300"
                  style={{
                    background: "linear-gradient(135deg, #5865f2, #7289da)",
                    boxShadow: "0 4px 10px rgba(88, 101, 242, 0.3)",
                  }}
                >
                  {t("sidebar_discord_join")}
                </a>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FLOATING ACTION BUTTONS ═══════════════════════ */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
        {/* VIP */}
        <Link
          href={versionPath("/vip")}
          title="VIP"
          className="block w-[64px] h-[64px] hover:scale-110 transition-transform duration-200"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/icons/icon__vip.png" alt="VIP" className="w-full h-full object-contain drop-shadow-lg" />
        </Link>

        {/* Switch version */}
        <Link
          href={`/${locale === "es" ? "" : locale + "/"}${version === "1.0" ? "2.0" : "1.0"}`}
          title={version === "1.0" ? "Ir a versión 2.0" : "Ir a versión 1.0"}
          className="block w-[64px] h-[64px] hover:scale-110 transition-transform duration-200"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={version === "1.0" ? "/images/icons/icon__20.png" : "/images/icons/icon__10.png"}
            alt={version === "1.0" ? "2.0" : "1.0"}
            className="w-full h-full object-contain drop-shadow-lg"
          />
        </Link>

        {/* Donate */}
        <Link
          href={versionPath("/donate")}
          title={t("sidebar_donate")}
          className="block w-[64px] h-[64px] hover:scale-110 transition-transform duration-200"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/icons/icon__donation.png" alt="Donate" className="w-full h-full object-contain drop-shadow-lg" />
        </Link>
      </div>
    </div>
  );
}
