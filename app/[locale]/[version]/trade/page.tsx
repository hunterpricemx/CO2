import Link from "next/link";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { ChevronRight, ArrowLeftRight, LogIn } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import {
  TradeLogTable,
  type TradeLogRow,
  type TradeLabels,
} from "@/components/shared/LogTable";
import { getGameDb } from "@/lib/game-db";
import { getGameSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2";

export const metadata: Metadata = { title: "Registro de Trades" };

interface TradeDbRow extends RowDataPacket {
  id: number;
  trade_id: number;
  user1_name: string;
  user2_name: string;
  owner: string;
  item_id: number;
  item_name: string;
  plus: number;
  bless: number;
  socket1: number;
  socket2: number;
  enchant: number;
  money: number;
  cps: number;
  trade_date: Date | string;
}

async function getCharTradeRows(
  versionNum: 1 | 2,
  uid: number,
): Promise<{ charName: string; rows: TradeLogRow[] }> {
  let conn: import("mysql2/promise").Connection | undefined;

  try {
    const { conn: c, config } = await getGameDb(versionNum);
    conn = c;

    // 1. Resolve character name for this account
    const [charRows] = await conn.execute<RowDataPacket[]>(
      `SELECT Name FROM \`${config.table_characters}\` WHERE EntityID = ? LIMIT 1`,
      [uid],
    );
    const charName: string = (charRows[0] as { Name: string } | undefined)?.Name ?? "";

    if (!charName) return { charName: "", rows: [] };

    // 2. Fetch trades where the character appears as owner, user1 or user2
    const [rows] = await conn.execute<TradeDbRow[]>(
      `SELECT id, trade_id, user1_name, user2_name, owner, item_id, item_name, plus, bless,
              socket1, socket2, enchant, money, cps, trade_date
       FROM \`trade_logs_public\`
       WHERE owner = ? OR user1_name = ? OR user2_name = ?
       ORDER BY id DESC
       LIMIT 1000`,
      [charName, charName, charName],
    );

    // Deduplicate: the table stores 2 rows per trade (one per side).
    // Keep the first occurrence of each trade_id (highest id, i.e. the owner's row).
    const seenTradeIds = new Set<number>();
    const unique = rows.filter((r) => {
      const tid = r.trade_id ?? r.id;
      if (seenTradeIds.has(tid)) return false;
      seenTradeIds.add(tid);
      return true;
    });

    const mapped: TradeLogRow[] = unique.map((r) => {
      const hasCps   = (r.cps   ?? 0) > 0;
      const hasMoney = (r.money ?? 0) > 0;
      const owner  = r.owner ?? "-";
      const target = (r.user1_name ?? "") !== owner ? (r.user1_name ?? "-") : (r.user2_name ?? "-");
      return {
        id: String(r.id),
        buyer: target,
        seller: owner,
        item_id: r.item_id ?? 0,
        item_name: r.item_name ?? "",
        plus: r.plus ?? 0,
        bless: r.bless ?? 0,
        socket1: r.socket1 ?? 0,
        socket2: r.socket2 ?? 0,
        enchant: r.enchant ?? 0,
        price: hasCps ? (r.cps ?? 0) : hasMoney ? (r.money ?? 0) : 0,
        price_type: hasCps ? "cps" : hasMoney ? "gold" : "other",
        version: versionNum === 1 ? "1.0" : "2.0",
        traded_at: r.trade_date instanceof Date
          ? r.trade_date.toISOString()
          : String(r.trade_date ?? new Date().toISOString()),
      };
    });

    return { charName, rows: mapped };
  } catch {
    return { charName: "", rows: [] };
  } finally {
    await conn?.end();
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TradePage({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}) {
  const { locale, version } = await params;
  const t = await getTranslations("trade");
  const versionNum: 1 | 2 = version === "1.0" ? 1 : 2;

  const session = await getGameSession();
  const loginHref = `/${locale === "es" ? "" : locale + "/"}${version}/login?next=/${locale === "es" ? "" : locale + "/"}${version}/trade`;
  if (!session) redirect(loginHref);

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);
  const homeHref = locale === "es" ? `/${version}` : `/${locale}/${version}`;

  const { charName, rows } = await getCharTradeRows(versionNum, session.uid);

  const labels: TradeLabels = {
    col_time:             t("col_time"),
    col_buyer:            t("col_buyer"),
    col_seller:           t("col_seller"),
    col_item:             t("col_item"),
    col_quality:          t("col_quality"),
    col_price:            t("col_price"),
    search_placeholder:   t("search_placeholder"),
    filter_all_versions:  t("filter_all_versions"),
    filter_all_qualities: t("filter_all_qualities"),
    simulated_notice:     t("simulated_notice"),
    no_results:           t("no_results"),
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
            <span className="text-gold font-medium">{t("breadcrumb_trade")}</span>
          </nav>

          <div className="flex items-center gap-3">
            <ArrowLeftRight className="h-6 w-6 text-gold/70" />
            <h1
              className="font-bebas tracking-widest uppercase drop-shadow-lg"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
            >
              {t("hero_title")}
            </h1>
          </div>

          {charName && (
            <p className="font-poppins text-base text-white/80 max-w-lg">
              {t("hero_subtitle_char", { name: charName })}
            </p>
          )}
        </div>
      </section>

      {/* ═══════════════════════ CONTENT ═══════════════════════ */}
      <section className="px-4 py-12" style={{ background: "#080808" }}>
        <div className="container mx-auto max-w-5xl">
          {!charName ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center text-muted-foreground">
              <LogIn className="h-10 w-10 text-white/10" />
              <p className="text-sm">{t("no_character")}</p>
            </div>
          ) : (
            <TradeLogTable rows={rows} labels={labels} />
          )}
        </div>
      </section>

    </div>
  );
}
