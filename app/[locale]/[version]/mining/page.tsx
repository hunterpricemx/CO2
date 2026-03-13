import Link from "next/link";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { ChevronRight, Gem } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import {
  MiningLogTable,
  type MineLogRow,
  type MiningLabels,
} from "@/components/shared/LogTable";

export const metadata: Metadata = { title: "Registro Mineros" };

// ── Mock data (replace with Supabase query once game server syncs) ────────────

const MOCK_MINES: MineLogRow[] = [
  { id: "m1",  player_name: "DragonMaster_X",  item_name: "Dragon Ball",  item_type: "dragonball", quantity: 1,  zone_name: "Phoenix Cave",  version: "1.0", mined_at: "2026-03-12T10:50:00Z" },
  { id: "m2",  player_name: "CrystalMage",     item_name: "Meteor",       item_type: "meteor",     quantity: 2,  zone_name: "Mine",          version: "2.0", mined_at: "2026-03-12T10:40:00Z" },
  { id: "m3",  player_name: "VoidReaper",      item_name: "Super Gem",    item_type: "gem",        quantity: 1,  zone_name: "Dragon Cave",   version: "1.0", mined_at: "2026-03-12T10:25:00Z" },
  { id: "m4",  player_name: "FrostWarden",     item_name: "Gold Mineral", item_type: "mineral",    quantity: 5,  zone_name: "Mine",          version: "2.0", mined_at: "2026-03-12T10:00:00Z" },
  { id: "m5",  player_name: "GoldenArrow",     item_name: "Dragon Ball",  item_type: "dragonball", quantity: 1,  zone_name: "Phoenix Cave",  version: "1.0", mined_at: "2026-03-12T09:35:00Z" },
  { id: "m6",  player_name: "ThunderStrike",   item_name: "Moon Box",     item_type: "scroll",     quantity: 1,  zone_name: "Dragon Cave",   version: "2.0", mined_at: "2026-03-12T09:10:00Z" },
  { id: "m7",  player_name: "StormWarrior",    item_name: "Iron Ore",     item_type: "mineral",    quantity: 8,  zone_name: "Mine",          version: "1.0", mined_at: "2026-03-12T08:55:00Z" },
  { id: "m8",  player_name: "EternalGuard",    item_name: "Kylin Gem",    item_type: "gem",        quantity: 1,  zone_name: "Mine",          version: "2.0", mined_at: "2026-03-12T08:30:00Z" },
  { id: "m9",  player_name: "MysticBlade",     item_name: "Meteor",       item_type: "meteor",     quantity: 3,  zone_name: "Phoenix Cave",  version: "1.0", mined_at: "2026-03-12T08:10:00Z" },
  { id: "m10", player_name: "SilverFang",      item_name: "Dragon Ball",  item_type: "dragonball", quantity: 1,  zone_name: "Dragon Cave",   version: "2.0", mined_at: "2026-03-12T07:50:00Z" },
  { id: "m11", player_name: "DarkTemplar",     item_name: "Gem Scroll",   item_type: "scroll",     quantity: 2,  zone_name: "Mine",          version: "1.0", mined_at: "2026-03-12T07:25:00Z" },
  { id: "m12", player_name: "FireArcher99",    item_name: "Silver Ore",   item_type: "mineral",    quantity: 6,  zone_name: "Mine",          version: "2.0", mined_at: "2026-03-12T06:50:00Z" },
  { id: "m13", player_name: "NightStalker",    item_name: "Super Gem",    item_type: "gem",        quantity: 1,  zone_name: "Phoenix Cave",  version: "1.0", mined_at: "2026-03-12T06:20:00Z" },
  { id: "m14", player_name: "PhoenixRising",   item_name: "Dragon Ball",  item_type: "dragonball", quantity: 1,  zone_name: "Dragon Cave",   version: "2.0", mined_at: "2026-03-11T23:00:00Z" },
  { id: "m15", player_name: "CrimsonBlade",    item_name: "Gold Mineral", item_type: "mineral",    quantity: 4,  zone_name: "Mine",          version: "1.0", mined_at: "2026-03-11T21:30:00Z" },
  { id: "m16", player_name: "BlazeHunter",     item_name: "Meteor",       item_type: "meteor",     quantity: 2,  zone_name: "Phoenix Cave",  version: "2.0", mined_at: "2026-03-11T20:00:00Z" },
  { id: "m17", player_name: "SoulBreaker",     item_name: "Kylin Gem",    item_type: "gem",        quantity: 1,  zone_name: "Mine",          version: "1.0", mined_at: "2026-03-11T18:45:00Z" },
  { id: "m18", player_name: "StarFallArcher",  item_name: "Dragon Ball",  item_type: "dragonball", quantity: 1,  zone_name: "Dragon Cave",   version: "2.0", mined_at: "2026-03-11T17:20:00Z" },
  { id: "m19", player_name: "IronWarrior",     item_name: "Iron Ore",     item_type: "mineral",    quantity: 10, zone_name: "Mine",          version: "1.0", mined_at: "2026-03-11T15:00:00Z" },
  { id: "m20", player_name: "VoidReaper",      item_name: "Moon Box",     item_type: "scroll",     quantity: 1,  zone_name: "Phoenix Cave",  version: "2.0", mined_at: "2026-03-11T13:30:00Z" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MiningPage({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}) {
  const { locale, version } = await params;
  const t = await getTranslations("mining");

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);

  const homeHref = locale === "es" ? `/${version}` : `/${locale}/${version}`;

  const rows =
    version === "1.0"
      ? MOCK_MINES.filter((r) => r.version !== "2.0")
      : version === "2.0"
      ? MOCK_MINES.filter((r) => r.version !== "1.0")
      : MOCK_MINES;

  const labels: MiningLabels = {
    col_time:            t("col_time"),
    col_player:          t("col_player"),
    col_item:            t("col_item"),
    col_qty:             t("col_qty"),
    col_zone:            t("col_zone"),
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
            <span className="text-gold font-medium">{t("breadcrumb_mining")}</span>
          </nav>

          <div className="flex items-center gap-3">
            <Gem className="h-6 w-6 text-cyan-400/70" />
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
          <MiningLogTable rows={rows} labels={labels} />
        </div>
      </section>

    </div>
  );
}
