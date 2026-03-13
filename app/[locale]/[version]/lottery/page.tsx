import Link from "next/link";
import { ChevronRight, Gift } from "lucide-react";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import {
  LotteryLogTable,
  type LotteryLogRow,
  type LotteryLabels,
} from "@/components/shared/LogTable";

export const metadata: Metadata = { title: "Registro de Lotería" };

// ── Mock data (replace with Supabase query once game server syncs) ────────────

const MOCK_LOTTERY: LotteryLogRow[] = [
  { id: "l1",  player_name: "DragonMaster_X",  prize_name: "Dragon Ball x3",     prize_type: "dragonball", version: "1.0", won_at: "2026-03-12T10:55:00Z" },
  { id: "l2",  player_name: "ShadowKnight",    prize_name: "Super Pack",          prize_type: "item",       version: "2.0", won_at: "2026-03-12T10:45:00Z" },
  { id: "l3",  player_name: "VoidReaper",      prize_name: "Heaven Blessing",     prize_type: "scroll",     version: "1.0", won_at: "2026-03-12T10:30:00Z" },
  { id: "l4",  player_name: "CrystalMage",     prize_name: "10,000 CPs",          prize_type: "cp",         version: "2.0", won_at: "2026-03-12T10:15:00Z" },
  { id: "l5",  player_name: "ThunderStrike",   prize_name: "Mount Token",         prize_type: "mount",      version: "1.0", won_at: "2026-03-12T09:50:00Z" },
  { id: "l6",  player_name: "GoldenArrow",     prize_name: "Kylin Gem x2",        prize_type: "gem",        version: "2.0", won_at: "2026-03-12T09:30:00Z" },
  { id: "l7",  player_name: "FireArcher99",    prize_name: "Exchange Token",      prize_type: "scroll",     version: "1.0", won_at: "2026-03-12T09:10:00Z" },
  { id: "l8",  player_name: "NightStalker",    prize_name: "Lucky Pack",          prize_type: "item",       version: "2.0", won_at: "2026-03-12T08:50:00Z" },
  { id: "l9",  player_name: "BlazeHunter",     prize_name: "+12 Stone",           prize_type: "item",       version: "1.0", won_at: "2026-03-12T08:30:00Z" },
  { id: "l10", player_name: "StormWarrior",    prize_name: "Dragon Ball x5",      prize_type: "dragonball", version: "2.0", won_at: "2026-03-12T08:10:00Z" },
  { id: "l11", player_name: "EternalGuard",    prize_name: "5,000 CPs",           prize_type: "cp",         version: "1.0", won_at: "2026-03-12T07:45:00Z" },
  { id: "l12", player_name: "FrostWarden",     prize_name: "Super Gem x3",        prize_type: "gem",        version: "2.0", won_at: "2026-03-12T07:20:00Z" },
  { id: "l13", player_name: "MysticBlade",     prize_name: "Mount Token",         prize_type: "mount",      version: "1.0", won_at: "2026-03-11T23:45:00Z" },
  { id: "l14", player_name: "SilverFang",      prize_name: "Dragon Ball x3",      prize_type: "dragonball", version: "2.0", won_at: "2026-03-11T22:00:00Z" },
  { id: "l15", player_name: "CrimsonBlade",    prize_name: "Heaven Blessing x2",  prize_type: "scroll",     version: "1.0", won_at: "2026-03-11T20:30:00Z" },
  { id: "l16", player_name: "PhoenixRising",   prize_name: "Lucky Pack",          prize_type: "item",       version: "2.0", won_at: "2026-03-11T19:00:00Z" },
  { id: "l17", player_name: "DarkTemplar",     prize_name: "20,000 CPs",          prize_type: "cp",         version: "1.0", won_at: "2026-03-11T17:30:00Z" },
  { id: "l18", player_name: "SoulBreaker",     prize_name: "Super Pack",          prize_type: "item",       version: "2.0", won_at: "2026-03-11T16:00:00Z" },
  { id: "l19", player_name: "StarFallArcher",  prize_name: "Kylin Gem x1",        prize_type: "gem",        version: "1.0", won_at: "2026-03-11T14:30:00Z" },
  { id: "l20", player_name: "IronWarrior",     prize_name: "Exchange Token",      prize_type: "scroll",     version: "2.0", won_at: "2026-03-11T13:00:00Z" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LotteryPage({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}) {
  const { locale, version } = await params;
  const t = await getTranslations("lottery");

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);

  const homeHref = locale === "es" ? `/${version}` : `/${locale}/${version}`;

  const rows =
    version === "1.0"
      ? MOCK_LOTTERY.filter((r) => r.version !== "2.0")
      : version === "2.0"
      ? MOCK_LOTTERY.filter((r) => r.version !== "1.0")
      : MOCK_LOTTERY;

  const labels: LotteryLabels = {
    col_time:            t("col_time"),
    col_player:          t("col_player"),
    col_prize:           t("col_prize"),
    col_type:            t("col_type"),
    search_placeholder:  t("search_placeholder"),
    filter_all_versions: t("filter_all_versions"),
    simulated_notice:    t("simulated_notice"),
    no_results:          t("no_results"),
  };

  return (
    <div className="flex flex-col">

      {/* ═══════════════════════ HERO ═══════════════════════ */}
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
            <Link href={homeHref} className="hover:text-gold transition-colors">
              {t("breadcrumb_home")}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gold font-medium">{t("breadcrumb_lottery")}</span>
          </nav>

          <div className="flex items-center gap-3">
            <Gift className="h-6 w-6 text-gold/70" />
            <h1
              className="font-bebas tracking-widest uppercase drop-shadow-lg"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
            >
              {t("hero_title")}
            </h1>
          </div>

          <p className="font-poppins text-base text-white/80 max-w-lg">
            {t("hero_subtitle")}
          </p>
        </div>
      </section>

      {/* ═══════════════════════ CONTENT ═══════════════════════ */}
      <section className="px-4 py-12" style={{ background: "#080808" }}>
        <div className="container mx-auto max-w-5xl">
          <LotteryLogTable rows={rows} labels={labels} />
        </div>
      </section>

    </div>
  );
}
