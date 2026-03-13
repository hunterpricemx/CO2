import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Metadata } from "next";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import { MarketGrid, type MarketLabels } from "@/components/shared/MarketGrid";
import type { MarketItemRow } from "@/modules/market/types";
// import { getMarketItems } from "@/modules/market/queries"; // replace with live data

export const metadata: Metadata = { title: "Mercado" };

// ── Mock market data (30 items) ────────────────────────────────────────────────
// Fields: item_image = filename from /images/market/, seller_x/y = market map coords

const MOCK_MARKET: MarketItemRow[] = [
  // Weapons – Elite / Super
  { id:"w1",  item_image:"410075.png", item_name:"Dragon Blade",     quality:"Elite",      plus_enchant:12, minus_enchant:0, sockets:2, seller:"DragonLord",  seller_x:210, seller_y:215, price:450000, currency:"CP",   version:"1.0", item_type:"weapon",    quantity:1,  listed_at:"2025-01-10T10:00:00Z" },
  { id:"w2",  item_image:"420175.png", item_name:"Heavenly Sword",   quality:"Elite",      plus_enchant:11, minus_enchant:0, sockets:2, seller:"HeavenSlayer", seller_x:195, seller_y:220, price:380000, currency:"CP",   version:"2.0", item_type:"weapon",    quantity:1,  listed_at:"2025-01-10T09:45:00Z" },
  { id:"w3",  item_image:"450175.png", item_name:"Rain Sword",       quality:"Elite",      plus_enchant:10, minus_enchant:0, sockets:1, seller:"RainMaster",   seller_x:205, seller_y:200, price:280000, currency:"CP",   version:"1.0", item_type:"weapon",    quantity:1,  listed_at:"2025-01-10T09:30:00Z" },
  { id:"w4",  item_image:"480076.png", item_name:"Ninja Sword",      quality:"Super",      plus_enchant:9,  minus_enchant:0, sockets:1, seller:"ShadowBlade",  seller_x:220, seller_y:210, price:180000, currency:"CP",   version:"2.0", item_type:"weapon",    quantity:1,  listed_at:"2025-01-10T09:00:00Z" },
  { id:"w5",  item_image:"560025.png", item_name:"Warrior Blade",    quality:"Super",      plus_enchant:8,  minus_enchant:0, sockets:0, seller:"IronFist",     seller_x:185, seller_y:225, price:95000,  currency:"CP",   version:"1.0", item_type:"weapon",    quantity:1,  listed_at:"2025-01-10T08:30:00Z" },
  { id:"w6",  item_image:"530175.png", item_name:"Heavenly Fan",     quality:"Super",      plus_enchant:9,  minus_enchant:0, sockets:1, seller:"TaoMaster",    seller_x:215, seller_y:205, price:125000, currency:"CP",   version:"2.0", item_type:"weapon",    quantity:1,  listed_at:"2025-01-10T08:00:00Z" },
  { id:"w7",  item_image:"580025.png", item_name:"Bone Blade",       quality:"Super",      plus_enchant:9,  minus_enchant:0, sockets:0, seller:"BoneSmith",    seller_x:200, seller_y:215, price:145000, currency:"CP",   version:"2.0", item_type:"weapon",    quantity:1,  listed_at:"2025-01-10T04:00:00Z" },
  // Armor
  { id:"a1",  item_image:"130300.png", item_name:"Tao Garment",      quality:"Elite",      plus_enchant:8,  minus_enchant:0, sockets:2, seller:"WisdomSage",   seller_x:225, seller_y:195, price:75000,  currency:"CP",   version:"1.0", item_type:"armor",     quantity:1,  listed_at:"2025-01-10T07:50:00Z" },
  { id:"a2",  item_image:"131300.png", item_name:"Warrior Robe",     quality:"Super",      plus_enchant:7,  minus_enchant:0, sockets:1, seller:"IronFist",     seller_x:185, seller_y:225, price:55000,  currency:"CP",   version:"2.0", item_type:"armor",     quantity:1,  listed_at:"2025-01-10T07:40:00Z" },
  { id:"a3",  item_image:"133300.png", item_name:"Archer Coat",      quality:"Elite",      plus_enchant:8,  minus_enchant:0, sockets:1, seller:"EagleEye",     seller_x:230, seller_y:220, price:70000,  currency:"CP",   version:"1.0", item_type:"armor",     quantity:1,  listed_at:"2025-01-10T07:30:00Z" },
  { id:"a4",  item_image:"132300.png", item_name:"Ninja Coat",       quality:"Normality",  plus_enchant:6,  minus_enchant:0, sockets:0, seller:"ShadowBlade",  seller_x:220, seller_y:210, price:40000,  currency:"CP",   version:"2.0", item_type:"armor",     quantity:1,  listed_at:"2025-01-10T07:20:00Z" },
  // Accessories
  { id:"c1",  item_image:"120000.png", item_name:"Phoenix Necklace", quality:"Elite",      plus_enchant:6,  minus_enchant:0, sockets:2, seller:"PhoenixLord",  seller_x:240, seller_y:215, price:120000, currency:"CP",   version:"1.0", item_type:"accessory", quantity:1,  listed_at:"2025-01-10T07:10:00Z" },
  { id:"c2",  item_image:"121000.png", item_name:"Kylin Ring",       quality:"Super",      plus_enchant:5,  minus_enchant:0, sockets:1, seller:"DragonLord",   seller_x:210, seller_y:215, price:85000,  currency:"CP",   version:"2.0", item_type:"accessory", quantity:1,  listed_at:"2025-01-10T07:00:00Z" },
  { id:"c3",  item_image:"120020.png", item_name:"Dragon Bracelet",  quality:"Elite",      plus_enchant:6,  minus_enchant:0, sockets:1, seller:"RainMaster",   seller_x:205, seller_y:200, price:95000,  currency:"CP",   version:"1.0", item_type:"accessory", quantity:1,  listed_at:"2025-01-10T06:50:00Z" },
  { id:"c4",  item_image:"120040.png", item_name:"Emerald Ring",     quality:"Normality",  plus_enchant:4,  minus_enchant:0, sockets:0, seller:"TaoMaster",    seller_x:215, seller_y:205, price:45000,  currency:"CP",   version:"2.0", item_type:"accessory", quantity:1,  listed_at:"2025-01-10T06:40:00Z" },
  { id:"c5",  item_image:"121030.png", item_name:"Jade Necklace",    quality:"Super",      plus_enchant:5,  minus_enchant:0, sockets:1, seller:"WisdomSage",   seller_x:225, seller_y:195, price:65000,  currency:"CP",   version:"1.0", item_type:"accessory", quantity:1,  listed_at:"2025-01-10T06:30:00Z" },
  // Gems
  { id:"g1",  item_image:"700001.png", item_name:"Dragon Ball",      quality:"NotQuality", plus_enchant:0,  minus_enchant:0, sockets:0, seller:"GemMerchant",  seller_x:190, seller_y:230, price:5000,   currency:"CP",   version:"1.0", item_type:"gem",       quantity:5,  listed_at:"2025-01-10T06:20:00Z" },
  { id:"g2",  item_image:"700002.png", item_name:"Super Gem",        quality:"NotQuality", plus_enchant:0,  minus_enchant:0, sockets:0, seller:"StarForge",    seller_x:235, seller_y:200, price:8000,   currency:"CP",   version:"2.0", item_type:"gem",       quantity:3,  listed_at:"2025-01-10T06:10:00Z" },
  { id:"g3",  item_image:"700003.png", item_name:"Kylin Gem",        quality:"NotQuality", plus_enchant:0,  minus_enchant:0, sockets:0, seller:"GemMerchant",  seller_x:190, seller_y:230, price:3500,   currency:"CP",   version:"1.0", item_type:"gem",       quantity:2,  listed_at:"2025-01-10T06:00:00Z" },
  { id:"g4",  item_image:"700012.png", item_name:"Meteor",           quality:"NotQuality", plus_enchant:0,  minus_enchant:0, sockets:0, seller:"CelestialX",   seller_x:212, seller_y:208, price:12000,  currency:"CP",   version:"2.0", item_type:"gem",       quantity:10, listed_at:"2025-01-10T05:50:00Z" },
  // Scrolls
  { id:"s1",  item_image:"2000014.png",item_name:"Moon Box",         quality:"NotQuality", plus_enchant:0,  minus_enchant:0, sockets:0, seller:"LunaTrader",   seller_x:198, seller_y:222, price:2500,   currency:"CP",   version:"1.0", item_type:"scroll",    quantity:5,  listed_at:"2025-01-10T05:40:00Z" },
  { id:"s2",  item_image:"2000019.png",item_name:"Heaven Blessing",  quality:"NotQuality", plus_enchant:0,  minus_enchant:0, sockets:0, seller:"HolyBroker",   seller_x:218, seller_y:203, price:3000,   currency:"CP",   version:"2.0", item_type:"scroll",    quantity:3,  listed_at:"2025-01-10T05:30:00Z" },
  { id:"s3",  item_image:"2000049.png",item_name:"Exchange Token",   quality:"NotQuality", plus_enchant:0,  minus_enchant:0, sockets:0, seller:"TokenShop",    seller_x:207, seller_y:218, price:5000,   currency:"CP",   version:"1.0", item_type:"scroll",    quantity:1,  listed_at:"2025-01-10T05:20:00Z" },
  { id:"s4",  item_image:"2000088.png",item_name:"Meteor Scroll",    quality:"NotQuality", plus_enchant:0,  minus_enchant:0, sockets:0, seller:"CelestialX",   seller_x:212, seller_y:208, price:15000,  currency:"CP",   version:"2.0", item_type:"scroll",    quantity:2,  listed_at:"2025-01-10T05:10:00Z" },
  // Mounts (Gold currency)
  { id:"m1",  item_image:"160010.png", item_name:"Unicorn Mount",    quality:"Refined",    plus_enchant:0,  minus_enchant:0, sockets:0, seller:"StableKing",   seller_x:245, seller_y:210, price:50,     currency:"Gold", version:"2.0", item_type:"mount",     quantity:1,  listed_at:"2025-01-10T05:00:00Z" },
  { id:"m2",  item_image:"160020.png", item_name:"Phoenix Mount",    quality:"Refined",    plus_enchant:0,  minus_enchant:0, sockets:0, seller:"SkyRider",     seller_x:242, seller_y:218, price:45,     currency:"Gold", version:"1.0", item_type:"mount",     quantity:1,  listed_at:"2025-01-10T04:50:00Z" },
  { id:"m3",  item_image:"160030.png", item_name:"Dragon Mount",     quality:"Refined",    plus_enchant:0,  minus_enchant:0, sockets:0, seller:"DragonLord",   seller_x:210, seller_y:215, price:60,     currency:"Gold", version:"1.0", item_type:"mount",     quantity:1,  listed_at:"2025-01-10T04:40:00Z" },
  // Other
  { id:"o1",  item_image:"1080010.png",item_name:"Lucky Pack",       quality:"NotQuality", plus_enchant:0,  minus_enchant:0, sockets:0, seller:"LuckyShop",    seller_x:202, seller_y:226, price:2000,   currency:"CP",   version:"2.0", item_type:"other",     quantity:10, listed_at:"2025-01-10T04:30:00Z" },
  { id:"o2",  item_image:"1040000.png",item_name:"Exp Potion",       quality:"NotQuality", plus_enchant:0,  minus_enchant:0, sockets:0, seller:"AlchemyLab",   seller_x:195, seller_y:220, price:400,    currency:"CP",   version:"1.0", item_type:"other",     quantity:20, listed_at:"2025-01-10T04:20:00Z" },
  { id:"o3",  item_image:"1041000.png",item_name:"VIP Potion",       quality:"NotQuality", plus_enchant:0,  minus_enchant:0, sockets:0, seller:"PremiumStore", seller_x:230, seller_y:212, price:15,     currency:"Gold", version:"2.0", item_type:"other",     quantity:5,  listed_at:"2025-01-10T04:10:00Z" },
  { id:"o4",  item_image:"030010.png", item_name:"Elixir",           quality:"NotQuality", plus_enchant:0,  minus_enchant:0, sockets:0, seller:"AlchemyLab",   seller_x:195, seller_y:220, price:800,    currency:"CP",   version:"1.0", item_type:"other",     quantity:50, listed_at:"2025-01-10T04:00:00Z" },
];

// ─────────────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ locale: string; version: string }> };

export default async function MarketPage({ params }: Props) {
  const { locale, version } = await params;
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
    simulated_notice:      t("simulated_notice"),
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

  // Replace with: const items = await getMarketItems({ version });
  const items = MOCK_MARKET;

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
        {/* Dark overlay */}
        <div className="absolute inset-0 z-0" style={{ background: "rgba(0,0,0,0.80)" }} />

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
            <Link href={homeHref} className="text-[#ffd700] hover:text-[#ffed4e] transition-colors">
              {t("breadcrumb_home")}
            </Link>
            <span>/</span>
            <span>{t("breadcrumb_market")}</span>
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
      <section className="py-10" style={{ background: "#080808" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MarketGrid items={items} labels={labels} defaultVersion={version} />
        </div>
      </section>
    </div>
  );
}