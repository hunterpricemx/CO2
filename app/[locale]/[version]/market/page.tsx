import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Metadata } from "next";
import type { RowDataPacket } from "mysql2";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { getGameDb } from "@/lib/game-db";
import { MarketGrid, type MarketLabels } from "@/components/shared/MarketGrid";
import type { MarketItemRow } from "@/modules/market/types";

export const metadata: Metadata = { title: "Mercado" };

interface MarketDbRow extends RowDataPacket {
  ID: number;
  itemuid: number;
  selleruid: number;
  sellername: string;
  itemid: number;
  itemname: string;
  itemplus: string | number;
  itembless: string | number;
  itemsoc1: string;
  itemsoc2: string;
  price: string | number;
  type: number;
  X: string | number;
  Y: string | number;
  Quality: string;
}

function countSockets(s1?: string, s2?: string): number {
  const isSocket = (v?: string) => {
    const s = (v ?? "").trim().toLowerCase();
    return s !== "" && s !== "nosocket" && s !== "none" && s !== "0";
  };
  return Number(isSocket(s1)) + Number(isSocket(s2));
}

function inferType(itemName: string): string {
  const n = itemName.toLowerCase();
  if (n.includes("sword") || n.includes("blade") || n.includes("axe") || n.includes("spear") || n.includes("bow") || n.includes("club") || n.includes("wand") || n.includes("dagger") || n.includes("poleaxe")) return "weapon";
  if (n.includes("robe") || n.includes("armor") || n.includes("coat") || n.includes("frock") || n.includes("helmet") || n.includes("coronet") || n.includes("cap")) return "armor";
  if (n.includes("ring") || n.includes("necklace") || n.includes("earring") || n.includes("bracelet")) return "accessory";
  if (n.includes("gem") || n.includes("meteor") || n.includes("dragonball") || n.includes("dragon ball")) return "gem";
  if (n.includes("scroll") || n.includes("ticket") || n.includes("stone") || n.includes("potion") || n.includes("pack") || n.includes("box")) return "scroll";
  if (n.includes("mount")) return "mount";
  return "other";
}

async function getMarketRows(versionNum: 1 | 2): Promise<MarketItemRow[]> {
  let conn: import("mysql2/promise").Connection | undefined;

  try {
    const { conn: c } = await getGameDb(versionNum);
    conn = c;

    const [rows] = await conn.execute<MarketDbRow[]>(
      "SELECT ID, itemuid, selleruid, sellername, itemid, itemname, itemplus, itembless, itemsoc1, itemsoc2, price, type, X, Y, Quality FROM `marketlogs` ORDER BY ID DESC LIMIT 1000",
    );

    return rows.map((r, index) => ({
      id: String(r.ID),
      item_image: `${r.itemid}.png`,
      item_name: r.itemname ?? "Unknown",
      quality: (r.Quality ?? "NotQuality").trim() || "NotQuality",
      plus_enchant: Number(r.itemplus ?? 0),
      minus_enchant: Number(r.itembless ?? 0),
      sockets: countSockets(r.itemsoc1, r.itemsoc2),
      seller: r.sellername ?? "-",
      seller_x: Number(r.X ?? 0),
      seller_y: Number(r.Y ?? 0),
      price: Number(r.price ?? 0),
      currency: Number(r.type ?? 1) === 2 ? "Gold" : "CP",
      version: versionNum === 1 ? "1.0" : "2.0",
      item_type: inferType(r.itemname ?? ""),
      quantity: 1,
      listed_at: new Date(Date.now() - index * 1000).toISOString(),
    }));
  } catch {
    return [];
  } finally {
    await conn?.end();
  }
}

type Props = { params: Promise<{ locale: string; version: string }> };

export default async function MarketPage({ params }: Props) {
  const { locale, version } = await params;
  const versionNum: 1 | 2 = version === "1.0" ? 1 : 2;
  const t = await getTranslations("market");

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);

  const homeHref = locale === "es" ? `/${version}` : `/${locale}/${version}`;

  const labels: MarketLabels = {
    search_placeholder:    t("search_placeholder"),
    filter_all:            t("filter_all"),
    filter_all_versions:   t("filter_all_versions"),
    filter_all_currencies: t("filter_all_currencies"),
    sort_newest:           t("sort_newest"),
    sort_price_asc:        t("sort_price_asc"),
    sort_price_desc:       t("sort_price_desc"),
    type_weapon:           t("type_weapon"),
    type_armor:            t("type_armor"),
    type_accessory:        t("type_accessory"),
    type_gem:              t("type_gem"),
    type_scroll:           t("type_scroll"),
    type_mount:            t("type_mount"),
    type_other:            t("type_other"),
    seller_label:          t("seller_label"),
    qty_label:             t("qty_label"),
    results_label:         t("results_label"),
    simulated_notice:      "Datos en vivo desde marketlogs.",
    no_results:            t("no_results"),
    col_item:              t("col_item"),
    col_name:              t("col_name"),
    col_quality:           t("col_quality"),
    col_plus:              t("col_plus"),
    col_minus:             t("col_minus"),
    col_sockets:           t("col_sockets"),
    col_seller:            t("col_seller"),
    col_location:          t("col_location"),
    col_price:             t("col_price"),
    col_type:              t("col_type"),
    quality_not:           t("quality_not"),
    quality_normality:     t("quality_normality"),
    quality_elite:         t("quality_elite"),
    quality_super:         t("quality_super"),
    quality_refined:       t("quality_refined"),
    socket_none:           t("socket_none"),
    socket_1:              t("socket_1"),
    socket_2:              t("socket_2"),
    filter_title:          t("filter_title"),
    filter_quality:        t("filter_quality"),
    filter_sockets:        t("filter_sockets"),
    filter_plus_min:       t("filter_plus_min"),
    filter_price_from:     t("filter_price_from"),
    filter_price_to:       t("filter_price_to"),
    filter_clear:          t("filter_clear"),
    page_showing:          t("page_showing"),
    page_of:               t("page_of"),
    items_per_page:        t("items_per_page"),
    location_title:        t("location_title"),
    location_coords:       t("location_coords"),
    location_close:        t("location_close"),
    location_invalid:      t("location_invalid"),
  };

  const items = await getMarketRows(versionNum);

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

        <div className="relative z-10 text-center px-4 flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={`Conquer ${version}`}
            className="w-36 h-auto mb-2 drop-shadow-xl"
          />

          <nav className="flex items-center gap-2 font-poppins text-sm text-white/70">
            <Link href={homeHref} className="text-[#ffd700] hover:text-[#ffed4e] transition-colors">
              {t("breadcrumb_home")}
            </Link>
            <span>/</span>
            <span>{t("breadcrumb_market")}</span>
          </nav>

          <h1
            className="font-bebas tracking-widest text-white"
            style={{ fontSize: "3.5rem", textShadow: "3px 3px 10px rgba(0,0,0,0.8)", letterSpacing: "3px" }}
          >
            {t("hero_title")}
          </h1>

          <p
            className="font-poppins text-[#e0e0e0]"
            style={{ fontSize: "1.1rem", textShadow: "2px 2px 8px rgba(0,0,0,0.8)" }}
          >
            {t("hero_subtitle")}
          </p>
        </div>
      </section>

      <section className="py-10" style={{ background: "#080808" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MarketGrid items={items} labels={labels} defaultVersion={version} />
        </div>
      </section>
    </div>
  );
}
