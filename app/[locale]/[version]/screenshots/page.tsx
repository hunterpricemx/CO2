import type { Metadata } from "next";
import Link from "next/link";
import { Camera } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSiteSettings, getVersionAssets, buildPageSeo } from "@/lib/site-settings";
import { getPublishedScreenshots, getScreenshotCategories, type ScreenshotVersion } from "@/modules/screenshots";
import { ScreenshotsGrid } from "./ScreenshotsGrid";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; version: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { version } = await params;
  const settings = await getSiteSettings();
  return buildPageSeo(settings, "screenshots" as never, `Galería v${version}`);
}

function asVersion(v: string): ScreenshotVersion | "all" {
  if (v === "1.0" || v === "2.0") return v;
  return "all";
}

export default async function ScreenshotsPage({ params }: Props) {
  const { locale, version } = await params;
  const v = asVersion(version);

  const [{ rows, total }, categories, settings] = await Promise.all([
    getPublishedScreenshots(v, { pageSize: 60 }),
    getScreenshotCategories(),
    getSiteSettings(),
  ]);
  const { heroBg, logoSrc } = getVersionAssets(settings, version);
  let t: (k: string) => string;
  try {
    t = await getTranslations("screenshots");
  } catch {
    t = (k: string) => k;
  }

  const homeHref      = locale === "es" ? `/${version}` : `/${locale}/${version}`;
  const otherVersion  = version === "1.0" ? "2.0" : "1.0";
  const otherHref     = locale === "es" ? `/${otherVersion}/screenshots` : `/${locale}/${otherVersion}/screenshots`;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section
        className="relative flex items-center justify-center"
        style={{
          minHeight: "32vh",
          backgroundImage: `url('${heroBg}')`,
          backgroundSize: "cover",
          backgroundPosition: "50% 30%",
          paddingTop: "4rem",
          paddingBottom: "3rem",
        }}
      >
        <div className="absolute inset-0 z-0" style={{ background: "rgba(0,0,0,0.80)" }} />
        <div className="relative z-10 text-center px-4 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt={`Conquer ${version}`} className="w-28 h-auto drop-shadow-xl" />
          <nav className="flex items-center gap-2 font-poppins text-sm text-white/70">
            <Link href={homeHref} className="text-[#ffd700] hover:text-[#ffed4e]">Inicio</Link>
            <span>/</span>
            <span>{t("title") !== "title" ? t("title") : "Screenshots"}</span>
          </nav>
          <h1 className="font-bebas tracking-widest text-white" style={{ fontSize: "3rem", textShadow: "3px 3px 10px rgba(0,0,0,0.8)" }}>
            <Camera className="inline-block h-9 w-9 mr-2 mb-2 text-[#f39c12]" />
            Screenshots v{version}
          </h1>
          <p className="font-poppins text-[#e0e0e0]" style={{ fontSize: "1rem" }}>
            {total.toLocaleString("es")} imágenes de la comunidad.
          </p>
          <Link
            href={otherHref}
            className="mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors backdrop-blur"
          >
            Ver galería de v{otherVersion} →
          </Link>
        </div>
      </section>

      {/* Grid + filtros */}
      <section className="py-10" style={{ background: "#080808" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScreenshotsGrid
            initialItems={rows}
            categories={categories}
            locale={locale}
            version={version}
          />
        </div>
      </section>
    </div>
  );
}
