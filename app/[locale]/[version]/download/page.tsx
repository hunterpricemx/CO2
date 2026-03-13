import Link from "next/link";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { Download, HardDrive, Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getDownloads } from "@/modules/downloads/queries";
import type { DownloadRow } from "@/modules/downloads/types";

export const metadata: Metadata = { title: "Descargas" };

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}) {
  const { locale, version } = await params;
  const t = await getTranslations("download");

  const downloads = await getDownloads(version as "1.0" | "2.0");

  const clients = downloads.filter((d) => d.type === "client");
  const patches = downloads.filter((d) => d.type === "patch");

  const heroBg =
    version === "1.0"
      ? "/images/backgrounds/bg__main10.jpg"
      : "/images/backgrounds/bg__main20.jpg";

  const logoSrc =
    version === "1.0"
      ? "/images/logos/conquer_classic_plus_10_logo.png"
      : "/images/logos/conquer_classic_plus_20_logo.png";

  function getName(d: DownloadRow) {
    return locale === "en" ? d.name_en : locale === "pt" ? d.name_pt : d.name_es;
  }
  function getDesc(d: DownloadRow) {
    return locale === "en" ? d.description_en : locale === "pt" ? d.description_pt : d.description_es;
  }
  function homeHref() {
    return locale === "es" ? `/${version}` : `/${locale}/${version}`;
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
        <div
          className="absolute inset-0 z-0"
          style={{ background: "rgba(0,0,0,0.80)" }}
        />

        {/* Content */}
        <div className="relative z-10 text-center px-4 flex flex-col items-center gap-4">
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={`Conquer ${version}`}
            className="w-36 h-auto mb-2 drop-shadow-xl"
          />

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 font-poppins text-sm text-white/70">
            <Link href={homeHref()} className="text-[#ffd700] hover:text-[#ffed4e] transition-colors">
              {t("breadcrumb_home")}
            </Link>
            <span>/</span>
            <span>{t("breadcrumb_download")}</span>
          </nav>

          {/* Title */}
          <h1
            className="font-bebas tracking-widest text-white"
            style={{ fontSize: "3.5rem", textShadow: "3px 3px 10px rgba(0,0,0,0.8)", letterSpacing: "3px" }}
          >
            {t("hero_title")}
          </h1>

          {/* Subtitle */}
          <p
            className="font-poppins text-[#e0e0e0]"
            style={{ fontSize: "1.1rem", textShadow: "2px 2px 8px rgba(0,0,0,0.8)" }}
          >
            {t("hero_subtitle")}
          </p>
        </div>
      </section>

      {/* ═══════════════════════ CONTENT ═══════════════════════ */}
      <section className="px-4 py-12" style={{ background: "#080808" }}>
        <div className="container mx-auto max-w-5xl flex flex-col gap-12">

          {/* ── Full Clients ── */}
          {clients.length > 0 && (
            <div>
              <h2
                className="font-bebas text-2xl tracking-widest mb-6 flex items-center gap-3"
                style={{ color: "#ffd700" }}
              >
                <HardDrive size={22} />
                {t("section_clients")}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {clients.map((d) => (
                  <DownloadCard key={d.id} item={d} name={getName(d)} desc={getDesc(d)} t_download={t("btn_download")} type="client" />
                ))}
              </div>
            </div>
          )}

          {/* ── Patch History ── */}
          {patches.length > 0 && (
            <div>
              <h2
                className="font-bebas text-2xl tracking-widest mb-6 flex items-center gap-3"
                style={{ color: "#ffd700" }}
              >
                <Package size={22} />
                {t("section_patches")}
              </h2>
              <div className="flex flex-col gap-3">
                {patches.map((d) => (
                  <PatchRow key={d.id} item={d} name={getName(d)} desc={getDesc(d)} t_download={t("btn_download")} />
                ))}
              </div>
            </div>
          )}

          {downloads.length === 0 && (
            <p className="font-poppins text-center text-[#b4b4c8] py-16">{t("empty")}</p>
          )}
        </div>
      </section>
    </div>
  );
}

/* ─── Client card (large) ─── */
function DownloadCard({
  item,
  name,
  desc,
  t_download,
}: {
  item: DownloadRow;
  name: string;
  desc: string | null | undefined;
  t_download: string;
  type: string;
}) {
  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(26,26,46,0.97), rgba(46,46,76,0.97))",
        border: "1px solid rgba(255,215,0,0.25)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 pt-5 pb-3 flex items-center gap-3"
        style={{ borderBottom: "1px solid rgba(255,215,0,0.12)" }}
      >
        <HardDrive size={28} style={{ color: "#ffd700" }} />
        <h3 className="font-bebas tracking-wide text-lg text-white leading-tight">{name}</h3>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex flex-col gap-2 flex-1">
        {desc && (
          <p className="font-poppins text-[0.85rem] text-[#b4b4c8] leading-relaxed">{desc}</p>
        )}
        {item.file_size && (
          <div className="flex items-center gap-2 text-[0.8rem] text-[#888]">
            <span className="text-[#ffd700] font-semibold">Tamaño:</span>
            <span>{item.file_size}</span>
          </div>
        )}
        {item.patch_version && (
          <div className="flex items-center gap-2 text-[0.8rem] text-[#888]">
            <span className="text-[#ffd700] font-semibold">Versión:</span>
            <span className="font-mono">{item.patch_version}</span>
          </div>
        )}
        {item.release_date && (
          <div className="flex items-center gap-2 text-[0.8rem] text-[#888]">
            <span className="text-[#ffd700] font-semibold">Fecha:</span>
            <span>{new Date(item.release_date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-5">
        <a
          href={item.url}
          target={item.url !== "#" ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-bebas tracking-widest text-base transition-all duration-200 hover:brightness-110"
          style={{
            background: "linear-gradient(135deg, #c8960c, #ffd700)",
            color: "#0a0a1a",
            boxShadow: "0 2px 10px rgba(255,215,0,0.3)",
          }}
        >
          <Download size={16} />
          {t_download}
        </a>
      </div>
    </div>
  );
}

/* ─── Patch row (compact) ─── */
function PatchRow({
  item,
  name,
  desc,
  t_download,
}: {
  item: DownloadRow;
  name: string;
  desc: string | null | undefined;
  t_download: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl"
      style={{
        background: "linear-gradient(135deg, rgba(26,26,46,0.90), rgba(46,46,76,0.90))",
        border: "1px solid rgba(255,215,0,0.15)",
      }}
    >
      {/* Left: icon + info */}
      <div className="flex items-center gap-4 min-w-0">
        <Package size={22} className="shrink-0" style={{ color: "#ffd700" }} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bebas tracking-wide text-white text-base">{name}</span>
            {item.patch_version && (
              <span
                className="font-mono text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,215,0,0.12)", color: "#ffd700" }}
              >
                {item.patch_version}
              </span>
            )}
          </div>
          {desc && (
            <p className="font-poppins text-[0.78rem] text-[#888] mt-0.5 truncate max-w-xs">{desc}</p>
          )}
        </div>
      </div>

      {/* Right: size + date + button */}
      <div className="flex items-center gap-4 shrink-0">
        {item.file_size && (
          <span className="font-poppins text-[0.8rem] text-[#b4b4c8] hidden sm:block">{item.file_size}</span>
        )}
        {item.release_date && (
          <span className="font-poppins text-[0.78rem] text-[#666] hidden md:block">
            {new Date(item.release_date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
        <a
          href={item.url}
          target={item.url !== "#" ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bebas tracking-widest text-sm transition-all duration-200 hover:brightness-110 shrink-0"
          style={{
            background: "linear-gradient(135deg, #c8960c, #ffd700)",
            color: "#0a0a1a",
          }}
        >
          <Download size={13} />
          {t_download}
        </a>
      </div>
    </div>
  );
}
