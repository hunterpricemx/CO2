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
import { getGameDb } from "@/lib/game-db";
import type { RowDataPacket } from "mysql2";

export const metadata: Metadata = { title: "Log de Caídas" };

interface DropDbRow extends RowDataPacket {
  ID: number;
  Type: string;
  Name: string;
  MonsterName: string;
  MapID: string;
  ITEMID: string;
  Socks: number | string;
  Plus: number;
  Bless: number | string;
  Quality: string;
  Hour: string;
}

function parseTodayHourToIso(hourRaw: string): string {
  const s = (hourRaw ?? "").trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return new Date().toISOString();

  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3] ?? "0");
  const ap = m[4].toUpperCase();

  if (ap === "AM" && hh === 12) hh = 0;
  if (ap === "PM" && hh !== 12) hh += 12;

  const d = new Date();
  d.setHours(hh, mm, ss, 0);
  return d.toISOString();
}

function getItemType(itemName: string): DropLogRow["item_type"] {
  const n = itemName.toLowerCase();
  if (n.includes("blade") || n.includes("sword") || n.includes("axe") || n.includes("spear") || n.includes("bow") || n.includes("club") || n.includes("whip") || n.includes("fan")) return "weapon";
  if (n.includes("ring") || n.includes("necklace") || n.includes("bracelet") || n.includes("earring")) return "accessory";
  if (n.includes("robe") || n.includes("armor") || n.includes("helmet") || n.includes("coronet") || n.includes("cap")) return "armor";
  if (n.includes("dragonball") || n.includes("dragon ball") || n.includes("gem")) return "gem";
  if (n.includes("scroll") || n.includes("box")) return "scroll";
  return "other";
}

async function getDropRows(versionNum: 1 | 2): Promise<DropLogRow[]> {
  let conn: import("mysql2/promise").Connection | undefined;

  try {
    const { conn: c } = await getGameDb(versionNum);
    conn = c;

    const [rows] = await conn.execute<DropDbRow[]>(
      "SELECT ID, Type, Name, MonsterName, MapID, ITEMID, Socks, Plus, Bless, Quality, Hour FROM `droploggs` ORDER BY ID DESC LIMIT 400",
    );

    return rows.map((r) => ({
      id: String(r.ID),
      player_name: r.Name ?? "-",
      monster: r.MonsterName ?? "-",
      item_name: r.ITEMID ?? "Unknown",
      item_type: getItemType(r.ITEMID ?? ""),
      item_plus: Number(r.Plus ?? 0),
      item_socks: Number(r.Socks ?? 0),
      item_bless: Number(r.Bless ?? 0),
      item_quality: (r.Quality ?? "None").trim() || "None",
      map_name: r.MapID ?? "-",
      version: versionNum === 1 ? "1.0" : "2.0",
      dropped_at: parseTodayHourToIso(r.Hour ?? ""),
      dropped_time: r.Hour ?? "",
    }));
  } catch {
    return [];
  } finally {
    await conn?.end();
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DropsPage({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}) {
  const { locale, version } = await params;
  const t = await getTranslations("drops");
  const versionNum: 1 | 2 = version === "1.0" ? 1 : 2;

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);

  const homeHref = locale === "es" ? `/${version}` : `/${locale}/${version}`;

  const rows = await getDropRows(versionNum);

  const labels: DropsLabels = {
    col_time:            t("col_time"),
    col_player:          t("col_player"),
    col_monster:         t("col_monster"),
    col_item:            t("col_item"),
    col_grade:           t("col_grade"),
    col_map:             t("col_map"),
    search_placeholder:  t("search_placeholder"),
    filter_all_versions: t("filter_all_versions"),
    simulated_notice:    "Datos en vivo desde droploggs.",
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
