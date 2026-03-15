"use client";

import { useState, useMemo } from "react";
import { Search, X, Gem, Gift, Sword, ShieldX } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DropLogRow = {
  id: string;
  player_name: string;
  monster: string;
  item_name: string;
  item_type: string;
  item_plus: number;
  item_socks?: number;
  item_bless?: number;
  item_quality?: string;
  map_name: string;
  version: string;
  dropped_at: string;
  dropped_time?: string;
};

export type MineLogRow = {
  id: string;
  player_name: string;
  item_name: string;
  item_type: string;
  quantity: number;
  zone_name: string;
  version: string;
  mined_at: string;
  mined_time?: string;
};

export type LotteryLogRow = {
  id: string;
  player_name: string;
  prize_name: string;
  prize_type: string;
  item_id?: string;
  quality?: string;
  won_time?: string;
  version: string;
  won_at: string;
};

export type DropsLabels = {
  col_time: string;
  col_player: string;
  col_monster: string;
  col_item: string;
  col_grade: string;
  col_map: string;
  search_placeholder: string;
  filter_all_versions: string;
  simulated_notice: string;
  no_results: string;
};

export type MiningLabels = {
  col_time: string;
  col_player: string;
  col_item: string;
  col_qty: string;
  col_zone: string;
  search_placeholder: string;
  filter_all_versions: string;
  simulated_notice: string;
  no_results: string;
};

export type LotteryLabels = {
  col_time: string;
  col_player: string;
  col_prize: string;
  col_type: string;
  search_placeholder: string;
  filter_all_versions: string;
  simulated_notice: string;
  no_results: string;
};

// ── Shared helpers ────────────────────────────────────────────────────────────

function VersionBadge({ v }: { v: string }) {
  return (
    <span className="text-[9px] bg-gold/10 border border-gold/20 text-gold rounded-full px-1.5 py-0.5 font-semibold shrink-0">
      v{v}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function PlusGrade({ n }: { n: number }) {
  if (n === 0) return null;
  const cls =
    n >= 10
      ? "text-yellow-400 font-bold"
      : n >= 7
      ? "text-purple-400 font-semibold"
      : n >= 4
      ? "text-blue-400"
      : "text-muted-foreground";
  return <span className={`text-xs tabular-nums ${cls}`}>+{n}</span>;
}

function SimNotice({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 bg-gold/5 border border-gold/15 rounded-lg px-4 py-2.5 text-xs text-gold/80 w-fit">
      <span className="h-1.5 w-1.5 rounded-full bg-gold/60 animate-pulse" />
      {text}
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface/40 border border-surface/50 rounded-lg pl-9 pr-9 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/40 transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function VersionFilter({
  value,
  onChange,
  allLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-surface/40 border border-surface/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/40 transition-colors cursor-pointer"
    >
      <option value="">{allLabel}</option>
      <option value="1.0">v1.0 Classic Plus</option>
      <option value="2.0">v2.0 Experience</option>
    </select>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <Icon className="h-10 w-10 text-white/10" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ── Drops Log Table ───────────────────────────────────────────────────────────

export function DropsLogTable({
  rows,
  labels,
}: {
  rows: DropLogRow[];
  labels: DropsLabels;
}) {
  const [search, setSearch] = useState("");
  const [mapFilter, setMapFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"player" | "item" | "monster" | "quality" | "plus" | "soc" | "bless" | "map" | "time">("time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const pageSize = 50;

  const mapOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => (r.map_name ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const qualityOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => (r.item_quality ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = rows.filter((r) => {
      if (mapFilter && r.map_name !== mapFilter) return false;
      if (qualityFilter && (r.item_quality ?? "") !== qualityFilter) return false;
      if (
        term &&
        !r.player_name.toLowerCase().includes(term) &&
        !r.item_name.toLowerCase().includes(term) &&
        !r.monster.toLowerCase().includes(term)
      )
        return false;
      return true;
    });

    const qualityRank = (q?: string) => {
      const v = (q ?? "None").trim().toLowerCase();
      if (v === "none") return 0;
      if (v === "refined") return 1;
      if (v === "unique") return 2;
      if (v === "elite") return 3;
      if (v === "super") return 4;
      return 99;
    };

    return [...base].sort((a, b) => {
      if (sortBy === "time") {
        const diff = new Date(a.dropped_at).getTime() - new Date(b.dropped_at).getTime();
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortBy === "plus") {
        const diff = a.item_plus - b.item_plus;
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortBy === "soc") {
        const diff = (a.item_socks ?? 0) - (b.item_socks ?? 0);
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortBy === "bless") {
        const diff = (a.item_bless ?? 0) - (b.item_bless ?? 0);
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortBy === "quality") {
        const diff = qualityRank(a.item_quality) - qualityRank(b.item_quality);
        return sortDir === "asc" ? diff : -diff;
      }

      const av =
        sortBy === "player"
          ? a.player_name
          : sortBy === "item"
          ? a.item_name
          : sortBy === "monster"
          ? a.monster
          : a.map_name;
      const bv =
        sortBy === "player"
          ? b.player_name
          : sortBy === "item"
          ? b.item_name
          : sortBy === "monster"
          ? b.monster
          : b.map_name;

      const diff = av.localeCompare(bv);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [rows, search, mapFilter, qualityFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage],
  );

  const qualityClass = (quality?: string) => {
    const q = (quality ?? "None").toLowerCase();
    if (q === "none") return "text-slate-100 bg-slate-500/60 border-slate-400/30";
    if (q === "refined") return "text-cyan-100 bg-cyan-500/80 border-cyan-400/40";
    if (q === "unique") return "text-blue-100 bg-blue-600/80 border-blue-400/40";
    if (q === "elite") return "text-purple-100 bg-purple-600/80 border-purple-400/40";
    if (q === "super") return "text-amber-100 bg-amber-500/80 border-amber-400/40";
    return "text-white bg-white/20 border-white/20";
  };

  const goToPage = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
  };

  const toggleSort = (col: "player" | "item" | "monster" | "quality" | "plus" | "soc" | "bless" | "map" | "time") => {
    setPage(1);
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(col);
    setSortDir(col === "time" ? "desc" : "asc");
  };

  const sortMark = (col: "player" | "item" | "monster" | "quality" | "plus" | "soc" | "bless" | "map" | "time") => {
    if (sortBy !== col) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  return (
    <div className="flex flex-col gap-6">
      <SimNotice text={labels.simulated_notice} />

      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder={labels.search_placeholder}
        />
        <select
          value={mapFilter}
          onChange={(e) => {
            setMapFilter(e.target.value);
            setPage(1);
          }}
          className="bg-surface/40 border border-surface/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/40 transition-colors cursor-pointer"
        >
          <option value="">Todos los mapas</option>
          {mapOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={qualityFilter}
          onChange={(e) => {
            setQualityFilter(e.target.value);
            setPage(1);
          }}
          className="bg-surface/40 border border-surface/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/40 transition-colors cursor-pointer"
        >
          <option value="">Todas las calidades</option>
          {qualityOptions.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShieldX} text={labels.no_results} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface/60 border-b border-surface/50 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("player")}>{labels.col_player}{sortMark("player")}</th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("item")}>{labels.col_item}{sortMark("item")}</th>
                <th className="px-4 py-3 text-left hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort("monster")}>{labels.col_monster}{sortMark("monster")}</th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("quality")}>Calidad{sortMark("quality")}</th>
                <th className="px-4 py-3 text-right w-14 cursor-pointer select-none" onClick={() => toggleSort("plus")}>Más{sortMark("plus")}</th>
                <th className="px-4 py-3 text-right w-14 cursor-pointer select-none" onClick={() => toggleSort("soc")}>Soc{sortMark("soc")}</th>
                <th className="px-4 py-3 text-right w-14 hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort("bless")}>Bless{sortMark("bless")}</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort("map")}>{labels.col_map}{sortMark("map")}</th>
                <th className="px-4 py-3 text-right w-24 cursor-pointer select-none" onClick={() => toggleSort("time")}>{labels.col_time}{sortMark("time")}</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-surface/30 hover:bg-surface/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground/90">{r.player_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Sword className="h-3 w-3 text-white/20 shrink-0" />
                      <span className="font-semibold text-foreground/90">{r.item_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground/60 hidden md:table-cell text-xs">
                    {r.monster}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold ${qualityClass(r.item_quality)}`}>
                      {r.item_quality ?? "None"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PlusGrade n={r.item_plus} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground/85">
                    {r.item_socks ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs text-foreground/75 hidden lg:table-cell">
                    {r.item_bless ?? 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground/50 hidden sm:table-cell">
                    {r.map_name}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground/50 tabular-nums whitespace-nowrap">
                    {r.dropped_time ?? timeAgo(r.dropped_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            Mostrando {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-md border border-surface/60 bg-surface/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-gold/40"
            >
              Anterior
            </button>
            <span className="tabular-nums">{currentPage}/{totalPages}</span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-md border border-surface/60 bg-surface/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-gold/40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mining Log Table ──────────────────────────────────────────────────────────

export function MiningLogTable({
  rows,
  labels,
}: {
  rows: MineLogRow[];
  labels: MiningLabels;
}) {
  const [search, setSearch] = useState("");
  const [zone, setZone] = useState("");
  const [sortBy, setSortBy] = useState<"time" | "player" | "item" | "qty" | "zone">("time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const zoneOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => (r.zone_name ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = rows.filter((r) => {
      if (zone && r.zone_name !== zone) return false;
      if (
        term &&
        !r.player_name.toLowerCase().includes(term) &&
        !r.item_name.toLowerCase().includes(term)
      )
        return false;
      return true;
    });

    return [...base].sort((a, b) => {
      if (sortBy === "time") {
        const diff = new Date(a.mined_at).getTime() - new Date(b.mined_at).getTime();
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortBy === "qty") {
        const diff = a.quantity - b.quantity;
        return sortDir === "asc" ? diff : -diff;
      }

      const av = sortBy === "player" ? a.player_name : sortBy === "item" ? a.item_name : a.zone_name;
      const bv = sortBy === "player" ? b.player_name : sortBy === "item" ? b.item_name : b.zone_name;
      const diff = av.localeCompare(bv);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [rows, search, zone, sortBy, sortDir]);

  function toggleSort(col: "time" | "player" | "item" | "qty" | "zone") {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(col);
    setSortDir(col === "time" ? "desc" : "asc");
  }

  function sortMark(col: "time" | "player" | "item" | "qty" | "zone") {
    if (sortBy !== col) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  return (
    <div className="flex flex-col gap-6">
      <SimNotice text={labels.simulated_notice} />

      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={labels.search_placeholder}
        />
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className="bg-surface/40 border border-surface/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/40 transition-colors cursor-pointer"
        >
          <option value="">Todas las zonas</option>
          {zoneOptions.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Gem} text={labels.no_results} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface/60 border-b border-surface/50 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-14 cursor-pointer select-none" onClick={() => toggleSort("time")}>{labels.col_time}{sortMark("time")}</th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("player")}>{labels.col_player}{sortMark("player")}</th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("item")}>{labels.col_item}{sortMark("item")}</th>
                <th className="px-4 py-3 text-right w-16 cursor-pointer select-none" onClick={() => toggleSort("qty")}>{labels.col_qty}{sortMark("qty")}</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort("zone")}>{labels.col_zone}{sortMark("zone")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-surface/30 hover:bg-surface/30 transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground/50 tabular-nums whitespace-nowrap">
                    {r.mined_time ?? timeAgo(r.mined_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground/90">{r.player_name}</span>
                      <VersionBadge v={r.version} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Gem className="h-3 w-3 text-cyan-400/50 shrink-0" />
                      <span className="font-semibold text-foreground/90">{r.item_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-gold">
                    ×{r.quantity}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground/50 hidden sm:table-cell">
                    {r.zone_name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Lottery Log Table ─────────────────────────────────────────────────────────

const PRIZE_TYPE_CLS: Record<string, string> = {
  item:       "text-purple-400 bg-purple-400/10 border-purple-400/20",
  cp:         "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  mount:      "text-orange-400 bg-orange-400/10 border-orange-400/20",
  gem:        "text-cyan-400   bg-cyan-400/10   border-cyan-400/20",
  scroll:     "text-green-400  bg-green-400/10  border-green-400/20",
  dragonball: "text-gold       bg-gold/10       border-gold/20",
  other:      "text-muted-foreground bg-white/5 border-white/10",
};

export function LotteryLogTable({
  rows,
  labels,
}: {
  rows: LotteryLogRow[];
  labels: LotteryLabels;
}) {
  const [search, setSearch] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"time" | "player" | "item" | "quality" | "itemid">("time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const pageSize = 50;

  const qualityOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => (r.quality ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = rows.filter((r) => {
      if (qualityFilter && (r.quality ?? "") !== qualityFilter) return false;
      if (
        term &&
        !r.player_name.toLowerCase().includes(term) &&
        !r.prize_name.toLowerCase().includes(term) &&
        !(r.item_id ?? "").toLowerCase().includes(term)
      )
        return false;
      return true;
    });

    const qualityRank = (q?: string) => {
      const v = (q ?? "None").trim().toLowerCase();
      if (v === "none") return 0;
      if (v === "refined") return 1;
      if (v === "unique") return 2;
      if (v === "elite") return 3;
      if (v === "super") return 4;
      return 99;
    };

    return [...base].sort((a, b) => {
      if (sortBy === "time") {
        const diff = new Date(a.won_at).getTime() - new Date(b.won_at).getTime();
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortBy === "quality") {
        const diff = qualityRank(a.quality) - qualityRank(b.quality);
        return sortDir === "asc" ? diff : -diff;
      }

      const av = sortBy === "player" ? a.player_name : sortBy === "item" ? a.prize_name : a.item_id ?? "";
      const bv = sortBy === "player" ? b.player_name : sortBy === "item" ? b.prize_name : b.item_id ?? "";
      const diff = av.localeCompare(bv);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [rows, search, qualityFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage],
  );

  const qualityClass = (quality?: string) => {
    const q = (quality ?? "None").toLowerCase();
    if (q === "none") return "text-slate-100 bg-slate-500/60 border-slate-400/30";
    if (q === "refined") return "text-cyan-100 bg-cyan-500/80 border-cyan-400/40";
    if (q === "unique") return "text-blue-100 bg-blue-600/80 border-blue-400/40";
    if (q === "elite") return "text-purple-100 bg-purple-600/80 border-purple-400/40";
    if (q === "super") return "text-amber-100 bg-amber-500/80 border-amber-400/40";
    return "text-white bg-white/20 border-white/20";
  };

  const toggleSort = (col: "time" | "player" | "item" | "quality" | "itemid") => {
    setPage(1);
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(col);
    setSortDir(col === "time" ? "desc" : "asc");
  };

  const sortMark = (col: "time" | "player" | "item" | "quality" | "itemid") => {
    if (sortBy !== col) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const goToPage = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <SimNotice text={labels.simulated_notice} />

      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder={labels.search_placeholder}
        />
        <select
          value={qualityFilter}
          onChange={(e) => {
            setQualityFilter(e.target.value);
            setPage(1);
          }}
          className="bg-surface/40 border border-surface/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/40 transition-colors cursor-pointer"
        >
          <option value="">Todas las calidades</option>
          {qualityOptions.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Gift} text={labels.no_results} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface/60 border-b border-surface/50 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("player")}>{labels.col_player}{sortMark("player")}</th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("item")}>{labels.col_prize}{sortMark("item")}</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort("itemid")}>Item ID{sortMark("itemid")}</th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("quality")}>Calidad{sortMark("quality")}</th>
                <th className="px-4 py-3 text-right w-24 cursor-pointer select-none" onClick={() => toggleSort("time")}>{labels.col_time}{sortMark("time")}</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-surface/30 hover:bg-surface/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Gift className="h-3.5 w-3.5 text-gold/50 shrink-0" />
                      <span className="font-medium text-foreground/90">{r.player_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-foreground/90">{r.prize_name}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground/70">
                    {r.item_id ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold ${qualityClass(r.quality)}`}>
                      {r.quality ?? "None"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground/50 tabular-nums whitespace-nowrap">
                    {r.won_time ?? timeAgo(r.won_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            Mostrando {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-md border border-surface/60 bg-surface/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-gold/40"
            >
              Anterior
            </button>
            <span className="tabular-nums">{currentPage}/{totalPages}</span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-md border border-surface/60 bg-surface/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-gold/40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
