import Link from "next/link";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { ChevronRight, Sword } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import {
  DropsLogTable,
  type DropLogRow,
  type DropsLabels,
} from "@/components/shared/LogTable";

export const metadata: Metadata = { title: "Log de Caídas" };

// ── Mock data (replace with Supabase query once game server syncs) ────────────

const MOCK_DROPS: DropLogRow[] = [
  { id: "d1",  player_name: "DragonMaster_X",  monster: "DragonKing",    item_name: "Heavenly Blade",   item_type: "weapon",    item_plus: 9,  map_name: "Bird Island", version: "1.0", dropped_at: "2026-03-12T10:45:00Z" },
  { id: "d2",  player_name: "ShadowKnight",    monster: "WeaponMaster",  item_name: "Phoenix Necklace", item_type: "accessory", item_plus: 6,  map_name: "TC Twin",     version: "2.0", dropped_at: "2026-03-12T10:30:00Z" },
  { id: "d3",  player_name: "FireArcher99",    monster: "EvilTroll",     item_name: "Dragon Blade",     item_type: "weapon",    item_plus: 7,  map_name: "Desert",      version: "1.0", dropped_at: "2026-03-12T09:55:00Z" },
  { id: "d4",  player_name: "IronWarrior",     monster: "SnakeKing",     item_name: "Super Gem",        item_type: "gem",       item_plus: 0,  map_name: "Bird Island", version: "2.0", dropped_at: "2026-03-12T09:20:00Z" },
  { id: "d5",  player_name: "DarkTemplar",     monster: "BossMonster",   item_name: "Dragon Ball",      item_type: "gem",       item_plus: 0,  map_name: "Market",      version: "1.0", dropped_at: "2026-03-12T09:10:00Z" },
  { id: "d6",  player_name: "StormWarrior",    monster: "WoodMonster",   item_name: "Coral Ring",       item_type: "accessory", item_plus: 5,  map_name: "GreenTown",   version: "2.0", dropped_at: "2026-03-12T08:55:00Z" },
  { id: "d7",  player_name: "PhoenixRising",   monster: "FireBird",      item_name: "Tao Garb",         item_type: "armor",     item_plus: 8,  map_name: "Bird Island", version: "1.0", dropped_at: "2026-03-12T08:40:00Z" },
  { id: "d8",  player_name: "NightStalker",    monster: "GhostWarrior",  item_name: "Ninja Sword",      item_type: "weapon",    item_plus: 10, map_name: "Desert",      version: "2.0", dropped_at: "2026-03-12T08:20:00Z" },
  { id: "d9",  player_name: "BlazeHunter",     monster: "IceMonster",    item_name: "Moon Box",         item_type: "scroll",    item_plus: 0,  map_name: "Desert",      version: "1.0", dropped_at: "2026-03-12T07:45:00Z" },
  { id: "d10", player_name: "CrystalMage",     monster: "GroundMonster", item_name: "Stone of Kilin",   item_type: "accessory", item_plus: 0,  map_name: "TC Twin",     version: "1.0", dropped_at: "2026-03-12T07:30:00Z" },
  { id: "d11", player_name: "VoidReaper",      monster: "DragonKing",    item_name: "Heavenly Fan",     item_type: "weapon",    item_plus: 11, map_name: "Bird Island", version: "2.0", dropped_at: "2026-03-12T06:10:00Z" },
  { id: "d12", player_name: "ThunderStrike",   monster: "WeaponMaster",  item_name: "Archer Coat",      item_type: "armor",     item_plus: 6,  map_name: "Market",      version: "1.0", dropped_at: "2026-03-12T05:50:00Z" },
  { id: "d13", player_name: "GoldenArrow",     monster: "EvilTroll",     item_name: "Meteor Scroll",    item_type: "scroll",    item_plus: 0,  map_name: "GreenTown",   version: "2.0", dropped_at: "2026-03-11T22:30:00Z" },
  { id: "d14", player_name: "SilverFang",      monster: "BossMonster",   item_name: "Rain Sword",       item_type: "weapon",    item_plus: 12, map_name: "TC Twin",     version: "1.0", dropped_at: "2026-03-11T21:55:00Z" },
  { id: "d15", player_name: "EternalGuard",    monster: "FireBird",      item_name: "Emerald Ring",     item_type: "accessory", item_plus: 4,  map_name: "Bird Island", version: "2.0", dropped_at: "2026-03-11T20:15:00Z" },
  { id: "d16", player_name: "MysticBlade",     monster: "SnakeKing",     item_name: "Dragon Ball",      item_type: "gem",       item_plus: 0,  map_name: "Desert",      version: "1.0", dropped_at: "2026-03-11T19:40:00Z" },
  { id: "d17", player_name: "FrostWarden",     monster: "WoodMonster",   item_name: "Warrior Blade",    item_type: "weapon",    item_plus: 8,  map_name: "GreenTown",   version: "2.0", dropped_at: "2026-03-11T18:20:00Z" },
  { id: "d18", player_name: "CrimsonBlade",    monster: "GhostWarrior",  item_name: "Bone Blade",       item_type: "weapon",    item_plus: 7,  map_name: "Market",      version: "1.0", dropped_at: "2026-03-11T17:00:00Z" },
  { id: "d19", player_name: "DragonMaster_X",  monster: "IceMonster",    item_name: "Heaven Whip",      item_type: "weapon",    item_plus: 9,  map_name: "TC Twin",     version: "2.0", dropped_at: "2026-03-11T15:30:00Z" },
  { id: "d20", player_name: "StarFallArcher",  monster: "GroundMonster", item_name: "Super Gem",        item_type: "gem",       item_plus: 0,  map_name: "Bird Island", version: "1.0", dropped_at: "2026-03-11T14:00:00Z" },
  { id: "d21", player_name: "SoulBreaker",     monster: "DragonKing",    item_name: "Dragon Axe",       item_type: "weapon",    item_plus: 10, map_name: "Bird Island", version: "2.0", dropped_at: "2026-03-11T12:45:00Z" },
  { id: "d22", player_name: "IronWarrior",     monster: "WeaponMaster",  item_name: "Phoenix Ring",     item_type: "accessory", item_plus: 6,  map_name: "TC Twin",     version: "1.0", dropped_at: "2026-03-11T11:20:00Z" },
  { id: "d23", player_name: "PhoenixRising",   monster: "EvilTroll",     item_name: "Meteor Scroll",    item_type: "scroll",    item_plus: 0,  map_name: "Desert",      version: "2.0", dropped_at: "2026-03-11T10:00:00Z" },
  { id: "d24", player_name: "NightStalker",    monster: "BossMonster",   item_name: "Jade Necklace",    item_type: "accessory", item_plus: 5,  map_name: "Desert",      version: "1.0", dropped_at: "2026-03-11T09:15:00Z" },
  { id: "d25", player_name: "BlazeHunter",     monster: "FireBird",      item_name: "Heavenly Blade",   item_type: "weapon",    item_plus: 9,  map_name: "Bird Island", version: "2.0", dropped_at: "2026-03-10T22:00:00Z" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DropsPage({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}) {
  const { locale, version } = await params;
  const t = await getTranslations("drops");

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);

  const homeHref = locale === "es" ? `/${version}` : `/${locale}/${version}`;

  const rows =
    version === "1.0"
      ? MOCK_DROPS.filter((r) => r.version !== "2.0")
      : version === "2.0"
      ? MOCK_DROPS.filter((r) => r.version !== "1.0")
      : MOCK_DROPS;

  const labels: DropsLabels = {
    col_time:            t("col_time"),
    col_player:          t("col_player"),
    col_monster:         t("col_monster"),
    col_item:            t("col_item"),
    col_grade:           t("col_grade"),
    col_map:             t("col_map"),
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
            <span className="text-gold font-medium">{t("breadcrumb_drops")}</span>
          </nav>

          <div className="flex items-center gap-3">
            <Sword className="h-6 w-6 text-gold/70" />
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
          <DropsLogTable rows={rows} labels={labels} />
        </div>
      </section>

    </div>
  );
}
