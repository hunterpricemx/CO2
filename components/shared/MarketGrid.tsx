"use client";

import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  Search,
  X,
  MapPin,
  Package,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import type { MarketItemRow } from "@/modules/market/types";

// ── Quality theme ──────────────────────────────────────────────────────────────

const QUALITY_TEXT: Record<string, string> = {
  NotQuality: "text-zinc-500",
  Normality: "text-foreground/70",
  Elite: "text-pink-400",
  Super: "text-yellow-400",
  Refined: "text-violet-400",
};

const QUALITY_BADGE: Record<string, string> = {
  NotQuality: "text-zinc-500     bg-zinc-500/10     border-zinc-500/20",
  Normality: "text-foreground/60 bg-white/5         border-white/10",
  Elite: "text-pink-400     bg-pink-400/10     border-pink-400/20",
  Super: "text-yellow-400   bg-yellow-400/10   border-yellow-400/20",
  Refined: "text-violet-400   bg-violet-400/10   border-violet-400/20",
};

// ── CO market map coordinate transform ────────────────────────────────────────

function rotatePosition(n: number, t: number): [number, number] {
  const i = (n - t) * 32 + 4096;
  const r = (n + t - 383) * 16 + 4096;
  return [i, r];
}

// ── Label type ─────────────────────────────────────────────────────────────────

export type MarketLabels = {
  search_placeholder: string;
  filter_all: string;
  filter_all_versions: string;
  filter_all_currencies: string;
  sort_newest: string;
  sort_price_asc: string;
  sort_price_desc: string;
  type_weapon: string; type_armor: string; type_accessory: string;
  type_gem: string; type_scroll: string; type_mount: string; type_other: string;
  seller_label: string; qty_label: string; results_label: string;
  simulated_notice: string; no_results: string;
  col_item: string; col_name: string; col_quality: string;
  col_plus: string; col_minus: string; col_sockets: string;
  col_seller: string; col_location: string; col_price: string; col_type: string;
  quality_not: string; quality_normality: string; quality_elite: string;
  quality_super: string; quality_refined: string;
  socket_none: string; socket_1: string; socket_2: string;
  filter_title: string; filter_quality: string; filter_sockets: string;
  filter_plus_min: string; filter_price_from: string; filter_price_to: string;
  filter_clear: string;
  page_showing: string; page_of: string; items_per_page: string;
  location_title: string; location_coords: string;
  location_close: string; location_invalid: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function socketLabel(
  n: number,
  labels: Pick<MarketLabels, "socket_none" | "socket_1" | "socket_2">
): string {
  if (n >= 2) return labels.socket_2;
  if (n === 1) return labels.socket_1;
  return labels.socket_none;
}

function fmtPrice(n: number): string {
  return n.toLocaleString("es-ES");
}

type LocationData = { seller: string; x: number; y: number } | null;

function getLocationFromItem(item: MarketItemRow): LocationData {
  if (item.seller_x == null || item.seller_y == null) return null;
  return {
    seller: item.seller,
    x: item.seller_x,
    y: item.seller_y,
  };
}

function getFirstValidLocation(items: MarketItemRow[]): LocationData {
  for (const item of items) {
    const location = getLocationFromItem(item);
    if (location) return location;
  }
  return null;
}

function sameLocation(a: LocationData, b: LocationData): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.seller === b.seller && a.x === b.x && a.y === b.y;
}

// ── Map Panel ──────────────────────────────────────────────────────────────────

function LocationPanel({
  data,
  labels,
}: {
  data: LocationData;
  labels: MarketLabels;
}) {
  const mapRef = useRef<HTMLImageElement>(null);
  const [dot, setDot] = useState<{ left: number; top: number } | null>(null);

  const recalcDot = useCallback(() => {
    if (!data || !mapRef.current) {
      setDot(null);
      return;
    }

    const [rx, ry] = rotatePosition(data.x, data.y);
    let posX = rx * 0.0625;
    let posY = ry * 0.0625;
    const w = mapRef.current.clientWidth;
    const h = mapRef.current.clientHeight;
    const scaleWidth = w / 512;
    const scaleHeight = h / 512;

    posX *= scaleWidth;
    posY *= scaleHeight;

    // Match the legacy conquer marker anchor for the market map.
    posX -= 5.5;
    posY -= 2.5;

    if (posX >= 0 && posX <= w && posY >= 0 && posY <= h) {
      setDot({ left: posX, top: posY });
    } else {
      setDot(null);
    }
  }, [data]);

  useEffect(() => {
    const id = setTimeout(recalcDot, 120);
    const onResize = () => recalcDot();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", onResize);
    };
  }, [recalcDot]);

  return (
    <aside className="w-full lg:w-80 xl:w-96 shrink-0 rounded-xl border border-surface/50 overflow-hidden bg-[#0a0a0a] lg:sticky lg:top-24 h-fit">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gold/20 text-gold font-bold text-sm">
        <MapPin className="h-4 w-4" />
        {labels.location_title}
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="text-xs text-muted-foreground">
          {labels.seller_label}:{" "}
          <span className="text-gold font-semibold">{data?.seller ?? "—"}</span>
        </div>

        <div className="relative w-full rounded-lg overflow-hidden border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={mapRef}
            src="/images/market/market.jpg"
            alt="Market Map"
            className="w-full h-auto block"
            onLoad={recalcDot}
          />
          {dot && (
            <span
              className="absolute block h-3.5 w-3.5 rounded-full bg-gold border-2 border-white animate-ping"
              style={{ left: dot.left, top: dot.top }}
            />
          )}
        </div>

        {data ? (
          <p className="text-xs text-muted-foreground">
            {labels.location_coords}:{" "}
            <span className="bg-gold/10 border border-gold/30 text-gold rounded-md px-2 py-0.5 font-mono text-xs">
              X: {data.x}, Y: {data.y}
            </span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/60">{labels.col_location}</p>
        )}

        {data && !dot && (
          <p className="text-xs text-muted-foreground/50 italic">{labels.location_invalid}</p>
        )}
      </div>
    </aside>
  );
}

// ── ItemImage ──────────────────────────────────────────────────────────────────

function ItemImage({ src, alt }: { src: string | null; alt: string }) {
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && erroredSrc !== src;

  return (
    <div className="relative h-8 w-8 shrink-0">
      {!showImage && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Package className="h-8 w-8 text-white/20" />
        </span>
      )}

      {showImage && src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/images/market/${src}`}
          alt=""
          title={alt}
          width={32}
          height={32}
          className="h-8 w-8 object-contain"
          onError={() => setErroredSrc(src)}
        />
      )}
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 25, 50, 100] as const;

function PaginationBar({
  total, page, pageSize, labels, onPage, onPageSize,
}: {
  total: number; page: number; pageSize: number;
  labels: MarketLabels; onPage: (n: number) => void; onPageSize: (n: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-surface/50 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground/60 text-xs">
        <span>{labels.page_showing} {from}–{to} {labels.page_of} {total.toLocaleString()}</span>
        <span>·</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="bg-surface/40 border border-surface/50 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none cursor-pointer"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s} {labels.items_per_page}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
          className="h-7 w-7 flex items-center justify-center rounded border border-surface/50 text-muted-foreground hover:text-foreground hover:border-gold/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1 text-muted-foreground/40 text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`h-7 min-w-7 px-1.5 rounded border text-xs font-medium transition-colors cursor-pointer ${
                p === page
                  ? "bg-gold border-gold text-background font-bold"
                  : "border-surface/50 text-muted-foreground hover:text-foreground hover:border-gold/30"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
          className="h-7 w-7 flex items-center justify-center rounded border border-surface/50 text-muted-foreground hover:text-foreground hover:border-gold/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Filters ────────────────────────────────────────────────────────────────────

type Filters = {
  search: string; seller: string; quality: string;
  sockets: string; plusMin: string; version: string;
  currency: string; priceMin: string; priceMax: string;
  sort: "newest" | "price_asc" | "price_desc";
};

const DEFAULT_FILTERS = (v: string): Filters => ({
  search: "", seller: "", quality: "", sockets: "",
  plusMin: "", version: v, currency: "",
  priceMin: "", priceMax: "", sort: "newest",
});

function FilterSidebar({
  filters, labels, onChange, onClear,
}: {
  filters: Filters; labels: MarketLabels;
  onChange: (p: Partial<Filters>) => void; onClear: () => void;
}) {
  const inp = "w-full bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/40 transition-colors";
  const lbl = "block text-xs font-semibold text-muted-foreground/70 mb-1.5 uppercase tracking-wide";

  return (
    <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-5">
      <div className="flex items-center gap-2 text-gold font-bold text-sm">
        <SlidersHorizontal className="h-4 w-4" />
        {labels.filter_title}
      </div>

      <div>
        <label className={lbl}>{labels.col_name}</label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder={labels.search_placeholder}
            className={`${inp} pl-8 pr-8`}
          />
          {filters.search && (
            <button
              onClick={() => onChange({ search: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div>
        <label className={lbl}>{labels.col_seller}</label>
        <div className="relative">
          <input
            type="text"
            value={filters.seller}
            onChange={(e) => onChange({ seller: e.target.value })}
            placeholder={`${labels.col_seller}...`}
            className={`${inp} pr-8`}
          />
          {filters.seller && (
            <button
              onClick={() => onChange({ seller: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div>
        <label className={lbl}>{labels.filter_quality}</label>
        <select value={filters.quality} onChange={(e) => onChange({ quality: e.target.value })} className={inp + " cursor-pointer"}>
          <option value="">{labels.filter_all}</option>
          <option value="NotQuality">{labels.quality_not}</option>
          <option value="Normality">{labels.quality_normality}</option>
          <option value="Elite">{labels.quality_elite}</option>
          <option value="Super">{labels.quality_super}</option>
          <option value="Refined">{labels.quality_refined}</option>
        </select>
      </div>

      <div>
        <label className={lbl}>{labels.filter_sockets}</label>
        <select value={filters.sockets} onChange={(e) => onChange({ sockets: e.target.value })} className={inp + " cursor-pointer"}>
          <option value="">{labels.filter_all}</option>
          <option value="0">{labels.socket_none}</option>
          <option value="1">{labels.socket_1}</option>
          <option value="2">{labels.socket_2}</option>
        </select>
      </div>

      <div>
        <label className={lbl}>{labels.filter_plus_min}</label>
        <select value={filters.plusMin} onChange={(e) => onChange({ plusMin: e.target.value })} className={inp + " cursor-pointer"}>
          <option value="">{labels.filter_all}</option>
          {Array.from({ length: 13 }, (_, n) => n).map((n) => (
            <option key={n} value={String(n)}>+{n}{n < 12 ? "+" : ""}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={lbl}>{labels.filter_all_versions}</label>
        <select value={filters.version} onChange={(e) => onChange({ version: e.target.value })} className={inp + " cursor-pointer"}>
          <option value="">{labels.filter_all}</option>
          <option value="1.0">v1.0 Classic Plus</option>
          <option value="2.0">v2.0 Experience</option>
        </select>
      </div>

      <div>
        <label className={lbl}>{labels.filter_all_currencies}</label>
        <div className="flex gap-2">
          {(["", "CP", "Gold"] as const).map((c) => (
            <button
              key={c || "all"}
              onClick={() => onChange({ currency: c })}
              className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                filters.currency === c
                  ? c === "Gold"
                    ? "bg-yellow-300/20 border-yellow-300/40 text-yellow-300"
                    : c === "CP"
                      ? "bg-gold/20 border-gold/40 text-gold"
                      : "bg-white/10 border-white/20 text-foreground"
                  : "bg-surface/40 border-surface/50 text-muted-foreground hover:text-foreground hover:border-white/20"
              }`}
            >
              {c || labels.filter_all}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={lbl}>{labels.col_price}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={filters.priceMin}
            min={0}
            onChange={(e) => onChange({ priceMin: e.target.value })}
            placeholder={labels.filter_price_from}
            className={inp}
          />
          <span className="text-muted-foreground/40 text-xs shrink-0">–</span>
          <input
            type="number"
            value={filters.priceMax}
            min={0}
            onChange={(e) => onChange({ priceMax: e.target.value })}
            placeholder={labels.filter_price_to}
            className={inp}
          />
        </div>
      </div>

      <div>
        <label className={lbl}>{labels.sort_newest.split(":")[0]}</label>
        <select value={filters.sort} onChange={(e) => onChange({ sort: e.target.value as Filters["sort"] })} className={inp + " cursor-pointer"}>
          <option value="newest">{labels.sort_newest}</option>
          <option value="price_asc">{labels.sort_price_asc}</option>
          <option value="price_desc">{labels.sort_price_desc}</option>
        </select>
      </div>

      <button
        onClick={onClear}
        className="mt-1 w-full py-2.5 rounded-lg border border-surface/50 bg-surface/40 hover:border-gold/30 hover:text-gold text-sm font-semibold text-muted-foreground transition-colors cursor-pointer"
      >
        {labels.filter_clear}
      </button>
    </aside>
  );
}

// ── Main MarketGrid ────────────────────────────────────────────────────────────

export function MarketGrid({
  items, labels, defaultVersion,
}: {
  items: MarketItemRow[]; labels: MarketLabels; defaultVersion: string;
}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS(defaultVersion));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sideOpen, setSideOpen] = useState(false);
  const [hideFiltersDesktop, setHideFiltersDesktop] = useState(false);
  const [activeLocation, setActiveLocation] = useState<LocationData>(getFirstValidLocation(items));
  const [sortBy, setSortBy] = useState<"newest" | "name" | "quality" | "plus" | "minus" | "sockets" | "seller" | "price" | "currency">("newest");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isDraggingTable, setIsDraggingTable] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);

  const updateFilters = useCallback((partial: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...partial }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS(defaultVersion));
    setSortBy("newest");
    setSortDir("desc");
    setPage(1);
  }, [defaultVersion]);

  const changeFilters = useCallback((partial: Partial<Filters>) => {
    if (partial.sort) {
      if (partial.sort === "newest") {
        setSortBy("newest");
        setSortDir("desc");
      } else if (partial.sort === "price_asc") {
        setSortBy("price");
        setSortDir("asc");
      } else if (partial.sort === "price_desc") {
        setSortBy("price");
        setSortDir("desc");
      }
    }
    updateFilters(partial);
  }, [updateFilters]);

  const qualityLabel: Record<string, string> = {
    NotQuality: labels.quality_not,
    Normality: labels.quality_normality,
    Elite: labels.quality_elite,
    Super: labels.quality_super,
    Refined: labels.quality_refined,
  };

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    const sellTerm = filters.seller.trim().toLowerCase();
    const priceMin = filters.priceMin !== "" ? Number(filters.priceMin) : null;
    const priceMax = filters.priceMax !== "" ? Number(filters.priceMax) : null;
    const plusMinVal = filters.plusMin !== "" ? Number(filters.plusMin) : null;
    const sockVal = filters.sockets !== "" ? Number(filters.sockets) : null;

    const r = items.filter((item) => {
      if (filters.version && item.version !== filters.version) return false;
      if (filters.currency && item.currency !== filters.currency) return false;
      if (filters.quality && (item.quality ?? "") !== filters.quality) return false;
      if (sockVal !== null && item.sockets !== sockVal) return false;
      if (plusMinVal !== null && item.plus_enchant < plusMinVal) return false;
      if (priceMin !== null && item.price < priceMin) return false;
      if (priceMax !== null && item.price > priceMax) return false;
      if (term && !item.item_name.toLowerCase().includes(term)) return false;
      if (sellTerm && !item.seller.toLowerCase().includes(sellTerm)) return false;
      return true;
    });

    const qualityRank = (q: string | null) => {
      const v = (q ?? "NotQuality").toLowerCase();
      if (v === "notquality") return 0;
      if (v === "normality") return 1;
      if (v === "refined") return 2;
      if (v === "unique") return 3;
      if (v === "elite") return 4;
      if (v === "super") return 5;
      return 99;
    };

    const cmp = (a: MarketItemRow, b: MarketItemRow) => {
      if (sortBy === "newest") {
        return new Date(a.listed_at).getTime() - new Date(b.listed_at).getTime();
      }
      if (sortBy === "plus") return a.plus_enchant - b.plus_enchant;
      if (sortBy === "minus") return a.minus_enchant - b.minus_enchant;
      if (sortBy === "sockets") return a.sockets - b.sockets;
      if (sortBy === "price") return a.price - b.price;
      if (sortBy === "quality") return qualityRank(a.quality) - qualityRank(b.quality);

      const av =
        sortBy === "name"
          ? a.item_name
          : sortBy === "seller"
            ? a.seller
            : a.currency;
      const bv =
        sortBy === "name"
          ? b.item_name
          : sortBy === "seller"
            ? b.seller
            : b.currency;
      return av.localeCompare(bv);
    };

    return [...r].sort((a, b) => (sortDir === "asc" ? cmp(a, b) : -cmp(a, b)));
  }, [items, filters, sortBy, sortDir]);

  const toggleSort = useCallback((col: "newest" | "name" | "quality" | "plus" | "minus" | "sockets" | "seller" | "price" | "currency") => {
    setPage(1);
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(col);
    setSortDir(col === "newest" ? "desc" : "asc");
  }, [sortBy]);

  const sortMark = useCallback((col: "newest" | "name" | "quality" | "plus" | "minus" | "sockets" | "seller" | "price" | "currency") => {
    if (sortBy !== col) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }, [sortBy, sortDir]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const onTableMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!tableScrollRef.current) return;
    setIsDraggingTable(true);
    dragStartXRef.current = e.clientX;
    dragStartScrollRef.current = tableScrollRef.current.scrollLeft;
  }, []);

  const onTableMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingTable || !tableScrollRef.current) return;
    const delta = e.clientX - dragStartXRef.current;
    tableScrollRef.current.scrollLeft = dragStartScrollRef.current - delta;
  }, [isDraggingTable]);

  const stopTableDrag = useCallback(() => {
    setIsDraggingTable(false);
  }, []);

  const displayedLocation = useMemo(() => {
    if (activeLocation && filtered.some((item) => sameLocation(getLocationFromItem(item), activeLocation))) {
      return activeLocation;
    }
    return getFirstValidLocation(filtered);
  }, [activeLocation, filtered]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 bg-gold/5 border border-gold/15 rounded-lg px-4 py-2.5 text-xs text-gold/80 w-fit">
        <span className="h-1.5 w-1.5 rounded-full bg-gold/60 animate-pulse" />
        {labels.simulated_notice}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="lg:hidden flex items-center gap-2 bg-surface/40 border border-surface/50 rounded-lg px-4 py-2 text-sm font-medium w-fit cursor-pointer hover:border-gold/30 transition-colors"
          onClick={() => setSideOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {labels.filter_title}
        </button>

        <button
          className="hidden lg:flex items-center gap-2 bg-surface/40 border border-surface/50 rounded-lg px-4 py-2 text-sm font-medium cursor-pointer hover:border-gold/30 transition-colors"
          onClick={() => setHideFiltersDesktop((v) => !v)}
          aria-pressed={hideFiltersDesktop}
          title={labels.filter_title}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {labels.filter_title}
          {hideFiltersDesktop ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className={`${sideOpen ? "flex" : "hidden"} ${hideFiltersDesktop ? "lg:hidden" : "lg:flex"} flex-col order-1`}>
          <FilterSidebar filters={filters} labels={labels} onChange={changeFilters} onClear={clearFilters} />
        </div>

        <div className="order-2 lg:order-3">
          <LocationPanel data={displayedLocation} labels={labels} />
        </div>

        <div className="order-3 lg:order-2 flex-1 min-w-0 flex flex-col gap-0 rounded-xl border border-surface/50 overflow-hidden">
          <div
            ref={tableScrollRef}
            className={`overflow-x-auto ${isDraggingTable ? "cursor-grabbing select-none" : "cursor-grab"}`}
            onMouseDown={onTableMouseDown}
            onMouseMove={onTableMouseMove}
            onMouseUp={stopTableDrag}
            onMouseLeave={stopTableDrag}
          >
            <table className="w-full min-w-175 text-sm border-collapse">
              <thead>
                <tr className="bg-surface text-[10px] uppercase tracking-widest text-muted-foreground/50">
                  <th className="px-3 py-3 text-left w-10">{labels.col_item}</th>
                  <th className="px-3 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("name")}>{labels.col_name}{sortMark("name")}</th>
                  <th className="px-3 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("quality")}>{labels.col_quality}{sortMark("quality")}</th>
                  <th className="px-3 py-3 text-center w-10 cursor-pointer select-none" onClick={() => toggleSort("plus")}>{labels.col_plus}{sortMark("plus")}</th>
                  <th className="px-3 py-3 text-center w-10 cursor-pointer select-none" onClick={() => toggleSort("minus")}>{labels.col_minus}{sortMark("minus")}</th>
                  <th className="px-3 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("sockets")}>{labels.col_sockets}{sortMark("sockets")}</th>
                  <th className="px-3 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("seller")}>{labels.col_seller}{sortMark("seller")}</th>
                  <th className="px-3 py-3 text-center w-10 lg:hidden">{labels.col_location}</th>
                  <th className="px-3 py-3 text-right cursor-pointer select-none" onClick={() => toggleSort("price")}>{labels.col_price}{sortMark("price")}</th>
                  <th className="px-3 py-3 text-left w-14 cursor-pointer select-none" onClick={() => toggleSort("currency")}>{labels.col_type}{sortMark("currency")}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <ShoppingBag className="h-12 w-12 text-white/10" />
                        <span className="text-sm">{labels.no_results}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item, i) => {
                    const q = item.quality ?? "Normality";
                    const textCls = QUALITY_TEXT[q] ?? QUALITY_TEXT.Normality;
                    const badgCls = QUALITY_BADGE[q] ?? QUALITY_BADGE.Normality;
                    const isCP = item.currency === "CP";
                    const itemLocation = getLocationFromItem(item);
                    const isActiveLocation = sameLocation(displayedLocation, itemLocation);

                    return (
                      <tr
                        key={item.id}
                        onMouseEnter={() => {
                          if (itemLocation) setActiveLocation(itemLocation);
                        }}
                        className={`border-t border-white/4 hover:bg-white/5 transition-colors ${i % 2 === 1 ? "bg-white/1.5" : ""} ${isActiveLocation ? "bg-gold/10" : ""}`}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center h-8 w-8">
                            <ItemImage src={item.item_image} alt={item.item_name} />
                          </div>
                        </td>
                        <td className={`px-3 py-2 font-medium ${textCls}`}>
                          {item.item_name}
                          {item.quantity > 1 && <span className="ml-1 text-xs text-muted-foreground/50">×{item.quantity}</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badgCls}`}>
                            {qualityLabel[q] ?? q}
                          </span>
                        </td>
                        <td className={`px-3 py-2 text-center font-mono text-xs ${textCls}`}>{item.plus_enchant}</td>
                        <td className={`px-3 py-2 text-center font-mono text-xs ${textCls}`}>{item.minus_enchant}</td>
                        <td className={`px-3 py-2 text-xs ${textCls}`}>{socketLabel(item.sockets, labels)}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => updateFilters({ seller: item.seller })}
                            className={`text-xs underline underline-offset-2 cursor-pointer hover:opacity-80 transition-opacity ${textCls}`}
                          >
                            {item.seller}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center lg:hidden">
                          {itemLocation ? (
                            <button
                              onClick={() => setActiveLocation(itemLocation)}
                              className="inline-flex items-center justify-center h-7 w-7 rounded bg-gold/15 hover:bg-gold/30 border border-gold/30 text-gold transition-colors cursor-pointer"
                              title={labels.location_title}
                            >
                              <MapPin className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="text-muted-foreground/20">—</span>
                          )}
                        </td>
                        <td className={`px-3 py-2 text-right font-bold tabular-nums ${isCP ? "text-gold" : "text-yellow-300"}`}>
                          {fmtPrice(item.price)}
                        </td>
                        <td className={`px-3 py-2 text-xs font-semibold ${isCP ? "text-gold/60" : "text-yellow-300/60"}`}>
                          {item.currency}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            labels={labels}
            onPage={setPage}
            onPageSize={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
