import Link from "next/link";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { getGameDb } from "@/lib/game-db";
import { ChevronRight, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { RowDataPacket } from "mysql2";
import {
  RankingTable,
  type PlayerRow,
  type GuildRow,
  type RankTab,
} from "@/components/shared/RankingTable";

import { getSiteSettings, buildPageSeo } from "@/lib/site-settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}): Promise<Metadata> {
  void params;
  const settings = await getSiteSettings();
  return buildPageSeo(settings, "rankings", "Rankings");
}

interface KoBoardRow extends RowDataPacket {
  EntityID: number;
  Name: string;
  Points: number;
  Class: number;
  Rank: number;
}

interface PkBoardRow extends RowDataPacket {
  Name: string;
  PKPoints: number;
  Level: number;
  Reborn: number;
}

const CLASS_MAP: Record<number, string> = {
  10: "Trojan",
  20: "Warrior",
  40: "Archer",
  50: "Ninja",
  60: "Monk",
  70: "Pirate",
  80: "DragonWarrior",
  100: "Taoist",
  132: "WindWalker",
};

async function getKoPlayers(versionNum: 1 | 2): Promise<PlayerRow[]> {
  let conn: import("mysql2/promise").Connection | undefined;

  try {
    const { conn: c } = await getGameDb(versionNum);
    conn = c;

    const [rows] = await c.execute<KoBoardRow[]>(
      "SELECT EntityID, Name, Points, Class, Rank FROM `koboard` ORDER BY Rank ASC, Points DESC LIMIT 10",
    );

    return rows.map((r, i) => ({
      rank: Number(r.Rank ?? 0) > 0 ? Number(r.Rank) : i + 1,
      name: r.Name ?? "Unknown",
      level: 0,
      reborn: 0,
      cps: 0,
      pkPoints: 0,
      ko: Number(r.Points ?? 0),
      guild: CLASS_MAP[Number(r.Class ?? 0)] ?? `Class ${Number(r.Class ?? 0)}`,
      version: versionNum === 1 ? "1.0" : "2.0",
    }));
  } catch {
    return [];
  } finally {
    await conn?.end();
  }
}

async function getPkPlayers(versionNum: 1 | 2): Promise<PlayerRow[]> {
  let conn: import("mysql2/promise").Connection | undefined;

  try {
    const { conn: c, config } = await getGameDb(versionNum);
    conn = c;

    const [rows] = await c.execute<PkBoardRow[]>(
      `SELECT t.Name, t.PKPoints, t.Level, t.Reborn FROM \`${config.table_characters}\` AS t ORDER BY t.PKPoints DESC LIMIT 10`,
    );

    return rows.map((r, i) => ({
      rank: i + 1,
      name: r.Name ?? "Unknown",
      level: Number(r.Level ?? 0),
      reborn: Number(r.Reborn ?? 0),
      cps: 0,
      pkPoints: Number(r.PKPoints ?? 0),
      ko: 0,
      guild: "",
      version: versionNum === 1 ? "1.0" : "2.0",
    }));
  } catch {
    return [];
  } finally {
    await conn?.end();
  }
}

async function getKoPlayersSafe(versionNum: 1 | 2): Promise<PlayerRow[]> {
  try {
    const timeoutMs = 2500;
    const timeoutPromise = new Promise<PlayerRow[]>((resolve) => {
      setTimeout(() => resolve([]), timeoutMs);
    });
    return await Promise.race([getKoPlayers(versionNum), timeoutPromise]);
  } catch {
    return [];
  }
}

async function getPkPlayersSafe(versionNum: 1 | 2): Promise<PlayerRow[]> {
  try {
    const timeoutMs = 2500;
    const timeoutPromise = new Promise<PlayerRow[]>((resolve) => {
      setTimeout(() => resolve([]), timeoutMs);
    });
    return await Promise.race([getPkPlayers(versionNum), timeoutPromise]);
  } catch {
    return [];
  }
}

function mergePlayers(koPlayers: PlayerRow[], pkPlayers: PlayerRow[], versionNum: 1 | 2): PlayerRow[] {
  const map = new Map<string, PlayerRow>();

  for (const p of koPlayers) {
    map.set(p.name.toLowerCase(), { ...p });
  }

  for (const p of pkPlayers) {
    const key = p.name.toLowerCase();
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...p, ko: p.pkPoints });
      continue;
    }

    map.set(key, {
      ...prev,
      level: p.level || prev.level,
      reborn: p.reborn || prev.reborn,
      pkPoints: p.pkPoints,
      ko: prev.ko > 0 ? prev.ko : p.pkPoints,
      version: versionNum === 1 ? "1.0" : "2.0",
    });
  }

  return Array.from(map.values());
}

const SEASON = "KO + PK Board";

export default async function RankingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; version: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale, version } = await params;
  const { tab = "ko" } = await searchParams;
  const t = await getTranslations("rankings");
  const versionNum: 1 | 2 = version === "1.0" ? 1 : 2;

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);

  const homeHref = locale === "es" ? `/${version}` : `/${locale}/${version}`;

  const [koPlayers, pkPlayers] = await Promise.all([
    getKoPlayersSafe(versionNum),
    getPkPlayersSafe(versionNum),
  ]);
  const players = mergePlayers(koPlayers, pkPlayers, versionNum);
  const guilds: GuildRow[] = [];

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
    simulated_notice:  "Datos en vivo desde koboard y PKPoints (top 10).",
    search_placeholder: t("search_placeholder"),
  };

  const validTabs: RankTab[] = ["players", "pk", "ko", "guilds"];
  const defaultTab = validTabs.includes(tab as RankTab) ? (tab as RankTab) : "ko";

  return (
    <div className="flex flex-col">
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
