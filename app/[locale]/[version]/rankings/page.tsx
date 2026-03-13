import Link from "next/link";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { ChevronRight, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import {
  RankingTable,
  type PlayerRow,
  type GuildRow,
  type RankTab,
} from "@/components/shared/RankingTable";

export const metadata: Metadata = { title: "Rankings" };

// ── Simulated mock data ───────────────────────────────────────────────────────
// This data will be replaced by live Supabase queries once the game server syncs.

const MOCK_PLAYERS: PlayerRow[] = [
  { rank: 0, name: "DragonMaster_X",    level: 130, reborn: 2, cps: 45_230, pkPoints: 980,  ko: 1_240, guild: "Shadow Guild",   version: "1.0 + 2.0" },
  { rank: 0, name: "ShadowKnight",      level: 130, reborn: 2, cps: 38_100, pkPoints: 1_250, ko: 1_456, guild: "Dragon Order",   version: "2.0" },
  { rank: 0, name: "FireArcher99",      level: 130, reborn: 1, cps: 29_500, pkPoints: 720,  ko: 1_890, guild: "Eternal Flame",  version: "1.0" },
  { rank: 0, name: "IronWarrior",       level: 129, reborn: 2, cps: 22_800, pkPoints: 540,  ko: 2_340, guild: "Iron Legion",    version: "2.0" },
  { rank: 0, name: "DarkTemplar",       level: 130, reborn: 1, cps: 18_900, pkPoints: 856,  ko: 987,   guild: "Shadow Guild",   version: "1.0" },
  { rank: 0, name: "StormWarrior",      level: 128, reborn: 2, cps: 16_400, pkPoints: 410,  ko: 765,   guild: "Storm Riders",   version: "2.0" },
  { rank: 0, name: "PhoenixRising",     level: 130, reborn: 1, cps: 14_200, pkPoints: 330,  ko: 654,   guild: "Phoenix Clan",   version: "1.0" },
  { rank: 0, name: "NightStalker",      level: 127, reborn: 2, cps: 12_900, pkPoints: 290,  ko: 543,   guild: "Night Watch",    version: "2.0" },
  { rank: 0, name: "BlazeHunter",       level: 130, reborn: 1, cps: 11_100, pkPoints: 245,  ko: 478,   guild: "Eternal Flame",  version: "1.0" },
  { rank: 0, name: "CrystalMage",       level: 126, reborn: 1, cps: 9_800,  pkPoints: 198,  ko: 389,   guild: "Crystal Tower",  version: "2.0" },
  { rank: 0, name: "VoidReaper",        level: 125, reborn: 2, cps: 8_500,  pkPoints: 167,  ko: 312,   guild: "Void Walkers",   version: "1.0" },
  { rank: 0, name: "ThunderStrike",     level: 124, reborn: 1, cps: 7_200,  pkPoints: 134,  ko: 275,   guild: "Storm Riders",   version: "2.0" },
  { rank: 0, name: "GoldenArrow",       level: 123, reborn: 1, cps: 6_100,  pkPoints: 112,  ko: 234,   guild: "Golden Wing",    version: "1.0" },
  { rank: 0, name: "SilverFang",        level: 122, reborn: 1, cps: 5_400,  pkPoints: 98,   ko: 198,   guild: "Silver Pack",    version: "2.0" },
  { rank: 0, name: "EternalGuard",      level: 121, reborn: 1, cps: 4_800,  pkPoints: 87,   ko: 167,   guild: "Iron Legion",    version: "1.0" },
  { rank: 0, name: "MysticBlade",       level: 120, reborn: 2, cps: 4_200,  pkPoints: 76,   ko: 143,   guild: "Dragon Order",   version: "2.0" },
  { rank: 0, name: "FrostWarden",       level: 120, reborn: 1, cps: 3_900,  pkPoints: 65,   ko: 121,   guild: "Frost Keep",     version: "1.0" },
  { rank: 0, name: "CrimsonBlade",      level: 119, reborn: 1, cps: 3_400,  pkPoints: 54,   ko: 109,   guild: "Crimson Order",  version: "2.0" },
  { rank: 0, name: "StarFallArcher",    level: 118, reborn: 1, cps: 2_900,  pkPoints: 43,   ko: 95,    guild: "Star Guild",     version: "1.0" },
  { rank: 0, name: "SoulBreaker",       level: 117, reborn: 1, cps: 2_400,  pkPoints: 34,   ko: 82,    guild: "Night Watch",    version: "2.0" },
];

const MOCK_GUILDS: GuildRow[] = [
  { rank: 1, name: "Shadow Guild",   members: 48, totalCps: 183_400, maxLevel: 130, version: "1.0 + 2.0" },
  { rank: 2, name: "Dragon Order",   members: 42, totalCps: 154_200, maxLevel: 130, version: "2.0" },
  { rank: 3, name: "Eternal Flame",  members: 38, totalCps: 128_900, maxLevel: 130, version: "1.0" },
  { rank: 4, name: "Iron Legion",    members: 35, totalCps: 109_600, maxLevel: 129, version: "2.0" },
  { rank: 5, name: "Storm Riders",   members: 31, totalCps: 94_300,  maxLevel: 128, version: "2.0" },
  { rank: 6, name: "Phoenix Clan",   members: 28, totalCps: 78_500,  maxLevel: 130, version: "1.0" },
  { rank: 7, name: "Night Watch",    members: 26, totalCps: 66_200,  maxLevel: 127, version: "2.0" },
  { rank: 8, name: "Crystal Tower",  members: 24, totalCps: 54_800,  maxLevel: 126, version: "2.0" },
  { rank: 9, name: "Void Walkers",   members: 22, totalCps: 45_100,  maxLevel: 125, version: "1.0" },
  { rank: 10, name: "Golden Wing",   members: 19, totalCps: 36_700,  maxLevel: 123, version: "1.0" },
];

const SEASON = "Season 1";

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RankingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; version: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale, version } = await params;
  const { tab = "players" } = await searchParams;
  const t = await getTranslations("rankings");

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);

  const homeHref = locale === "es" ? `/${version}` : `/${locale}/${version}`;

  // Filter players by version if not 'both'
  const players =
    version === "1.0"
      ? MOCK_PLAYERS.filter((p) => p.version !== "2.0")
      : version === "2.0"
      ? MOCK_PLAYERS.filter((p) => p.version !== "1.0")
      : MOCK_PLAYERS;

  const guilds =
    version === "1.0"
      ? MOCK_GUILDS.filter((g) => g.version !== "2.0")
      : version === "2.0"
      ? MOCK_GUILDS.filter((g) => g.version !== "1.0")
      : MOCK_GUILDS;

  const labels = {
    tab_players:       t("tab_players"),
    tab_pk:            t("tab_pk"),
    tab_ko:            t("tab_ko"),
    tab_guilds:        t("tab_guilds"),
    col_rank:          t("col_rank"),
    col_player:        t("col_player"),
    col_level:         t("col_level"),
    col_reborn:        t("col_reborn"),
    col_pk:            t("col_pk"),
    col_ko:            t("col_ko"),
    col_guild:         t("col_guild"),
    col_members:       t("col_members"),
    col_cps:           t("col_cps"),
    season_label:      t("season_label"),
    simulated_notice:  t("simulated_notice"),
    search_placeholder: t("search_placeholder"),
  };

  const validTabs: RankTab[] = ["players", "pk", "ko", "guilds"];
  const defaultTab = validTabs.includes(tab as RankTab) ? (tab as RankTab) : "players";

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
            <span className="text-gold font-medium">{t("breadcrumb_rankings")}</span>
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

      {/* ═══════════════════════ RANKINGS ═══════════════════════ */}
      <section className="px-4 py-12" style={{ background: "#080808" }}>
        <div className="container mx-auto max-w-5xl flex flex-col gap-6">

          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4 text-gold" />
            <span className="text-sm font-medium">{t("live_label")}</span>
          </div>

          <RankingTable
            players={players}
            guilds={guilds}
            labels={labels}
            defaultTab={defaultTab}
            season={SEASON}
          />
        </div>
      </section>
    </div>
  );
}
