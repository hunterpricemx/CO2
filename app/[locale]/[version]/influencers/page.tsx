import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllInfluencersActive } from "@/modules/influencers/queries";
import { InfluencersList } from "./InfluencersList";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Influencers",
};

type Props = { params: Promise<{ locale: string; version: string }> };

export default async function InfluencersPage({ params }: Props) {
  const { locale, version } = await params;
  const t = await getTranslations("influencers");
  const tn = await getTranslations("nav");

  const influencers = await getAllInfluencersActive();

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);
  const homeHref = locale === "es" ? `/${version}` : `/${locale}/${version}`;

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section
        className="relative flex flex-col items-center justify-end overflow-hidden"
        style={{ minHeight: "320px" }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('${heroBg}')`,
            backgroundSize: "cover",
            backgroundPosition: "50% 24%",
          }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.80)" }} />

        <div className="relative z-10 flex flex-col items-center gap-3 pb-10 text-center px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Conquer" className="w-36 drop-shadow-xl mb-2" />
          <p className="text-sm">
            <Link href={homeHref} className="text-gold hover:text-gold-light transition-colors">
              {tn("home")}
            </Link>
            <span className="mx-2 text-white/40">›</span>
            <span className="text-white/70">{t("breadcrumb_influencers")}</span>
          </p>
          <h1
            className="font-bebas uppercase tracking-widest text-white leading-none"
            style={{ fontSize: "3.5rem" }}
          >
            {t("hero_title")}
          </h1>
          <p className="font-poppins text-white/70 text-base max-w-lg">{t("hero_subtitle")}</p>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="px-4 py-12" style={{ background: "#080808", minHeight: "50vh" }}>
        <div className="container mx-auto max-w-5xl flex flex-col gap-6">
          <InfluencersList
            influencers={influencers}
            locale={locale}
            searchPlaceholder={t("search_placeholder")}
            noResultsLabel={t("no_results")}
            viewMoreLabel={t("view_more")}
            streamerCodeLabel={t("streamer_code_label")}
          />
        </div>
      </section>
    </div>
  );
}
