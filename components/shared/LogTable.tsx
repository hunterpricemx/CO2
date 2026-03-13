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
  map_name: string;
  version: string;
  dropped_at: string;
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
};

export type LotteryLogRow = {
  id: string;
  player_name: string;
  prize_name: string;
  prize_type: string;
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
  const [version, setVersion] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (version && r.version !== version) return false;
      if (
        term &&
        !r.player_name.toLowerCase().includes(term) &&
        !r.item_name.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [rows, search, version]);

  return (
    <div className="flex flex-col gap-6">
      <SimNotice text={labels.simulated_notice} />

      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={labels.search_placeholder}
        />
        <VersionFilter
          value={version}
          onChange={setVersion}
          allLabel={labels.filter_all_versions}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShieldX} text={labels.no_results} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface/60 border-b border-surface/50 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-14">{labels.col_time}</th>
                <th className="px-4 py-3 text-left">{labels.col_player}</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">{labels.col_monster}</th>
                <th className="px-4 py-3 text-left">{labels.col_item}</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell w-14">{labels.col_grade}</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">{labels.col_map}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-surface/30 hover:bg-surface/30 transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground/50 tabular-nums whitespace-nowrap">
                    {timeAgo(r.dropped_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground/90">{r.player_name}</span>
                      <VersionBadge v={r.version} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground/60 hidden md:table-cell text-xs">
                    {r.monster}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Sword className="h-3 w-3 text-white/20 shrink-0" />
                      <span className="font-semibold text-foreground/90">{r.item_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <PlusGrade n={r.item_plus} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground/50 hidden lg:table-cell">
                    {r.map_name}
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

// ── Mining Log Table ──────────────────────────────────────────────────────────

export function MiningLogTable({
  rows,
  labels,
}: {
  rows: MineLogRow[];
  labels: MiningLabels;
}) {
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (version && r.version !== version) return false;
      if (
        term &&
        !r.player_name.toLowerCase().includes(term) &&
        !r.item_name.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [rows, search, version]);

  return (
    <div className="flex flex-col gap-6">
      <SimNotice text={labels.simulated_notice} />

      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={labels.search_placeholder}
        />
        <VersionFilter
          value={version}
          onChange={setVersion}
          allLabel={labels.filter_all_versions}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Gem} text={labels.no_results} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface/60 border-b border-surface/50 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-14">{labels.col_time}</th>
                <th className="px-4 py-3 text-left">{labels.col_player}</th>
                <th className="px-4 py-3 text-left">{labels.col_item}</th>
                <th className="px-4 py-3 text-right w-16">{labels.col_qty}</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">{labels.col_zone}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-surface/30 hover:bg-surface/30 transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground/50 tabular-nums whitespace-nowrap">
                    {timeAgo(r.mined_at)}
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
  const [version, setVersion] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (version && r.version !== version) return false;
      if (
        term &&
        !r.player_name.toLowerCase().includes(term) &&
        !r.prize_name.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [rows, search, version]);

  return (
    <div className="flex flex-col gap-6">
      <SimNotice text={labels.simulated_notice} />

      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={labels.search_placeholder}
        />
        <VersionFilter
          value={version}
          onChange={setVersion}
          allLabel={labels.filter_all_versions}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Gift} text={labels.no_results} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface/60 border-b border-surface/50 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-14">{labels.col_time}</th>
                <th className="px-4 py-3 text-left">{labels.col_player}</th>
                <th className="px-4 py-3 text-left">{labels.col_prize}</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">{labels.col_type}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-surface/30 hover:bg-surface/30 transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground/50 tabular-nums whitespace-nowrap">
                    {timeAgo(r.won_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Gift className="h-3.5 w-3.5 text-gold/50 shrink-0" />
                      <span className="font-medium text-foreground/90">{r.player_name}</span>
                      <VersionBadge v={r.version} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-foreground/90">{r.prize_name}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${PRIZE_TYPE_CLS[r.prize_type] ?? PRIZE_TYPE_CLS.other}`}
                    >
                      {r.prize_type}
                    </span>
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
