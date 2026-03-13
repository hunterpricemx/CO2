"use client";

import { useState } from "react";
import { Crown, Sword, Target, Users, Medal, Search, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RankTab = "players" | "pk" | "ko" | "guilds";

export type PlayerRow = {
  rank: number;
  name: string;
  level: number;
  reborn: number;
  cps: number;
  pkPoints: number;
  ko: number;
  guild: string;
  version: string;
};

export type GuildRow = {
  rank: number;
  name: string;
  members: number;
  totalCps: number;
  maxLevel: number;
  version: string;
};

export type RankingTableLabels = {
  tab_players: string;
  tab_pk: string;
  tab_ko: string;
  tab_guilds: string;
  col_rank: string;
  col_player: string;
  col_level: string;
  col_reborn: string;
  col_pk: string;
  col_ko: string;
  col_guild: string;
  col_members: string;
  col_cps: string;
  season_label: string;
  simulated_notice: string;
  search_placeholder: string;
};

// ── Medal ─────────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-500/20 border border-yellow-500/40">
        <Crown className="h-3.5 w-3.5 text-yellow-400" />
      </span>
    );
  if (rank === 2)
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/20 border border-slate-400/40">
        <Medal className="h-3.5 w-3.5 text-slate-300" />
      </span>
    );
  if (rank === 3)
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 border border-amber-700/40">
        <Medal className="h-3.5 w-3.5 text-amber-600" />
      </span>
    );
  return (
    <span className="flex items-center justify-center w-7 h-7 text-xs font-bold text-muted-foreground/60 tabular-nums">
      {rank}
    </span>
  );
}

function VersionBadge({ version }: { version: string }) {
  return (
    <span className="text-[9px] bg-gold/10 border border-gold/20 text-gold rounded-full px-1.5 py-0.5 font-semibold">
      {version}
    </span>
  );
}

function fmt(n: number) {
  return n.toLocaleString("es-ES");
}

// ── Row highlight ─────────────────────────────────────────────────────────────

function rowCls(rank: number) {
  if (rank === 1) return "bg-yellow-500/5 border-b border-yellow-500/10";
  if (rank === 2) return "bg-slate-400/5 border-b border-slate-400/10";
  if (rank === 3) return "bg-amber-700/5 border-b border-amber-700/10";
  return "border-b border-surface/30 hover:bg-surface/30 transition-colors";
}

// ── Tables ────────────────────────────────────────────────────────────────────

function PlayersTable({ rows, labels }: { rows: PlayerRow[]; labels: RankingTableLabels }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-surface/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface/60 border-b border-surface/50 text-xs text-muted-foreground uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-12">{labels.col_rank}</th>
            <th className="px-4 py-3 text-left">{labels.col_player}</th>
            <th className="px-4 py-3 text-right">{labels.col_level}</th>
            <th className="px-4 py-3 text-right">{labels.col_reborn}</th>
            <th className="px-4 py-3 text-right">{labels.col_cps}</th>
            <th className="px-4 py-3 text-left hidden sm:table-cell">{labels.col_guild}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rank} className={rowCls(r.rank)}>
              <td className="px-4 py-3">
                <RankBadge rank={r.rank} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground/90">{r.name}</span>
                  <VersionBadge version={r.version} />
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium text-gold">{r.level}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">×{r.reborn}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmt(r.cps)}</td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-xs text-muted-foreground/70">{r.guild || "—"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PKTable({ rows, labels }: { rows: PlayerRow[]; labels: RankingTableLabels }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-surface/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface/60 border-b border-surface/50 text-xs text-muted-foreground uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-12">{labels.col_rank}</th>
            <th className="px-4 py-3 text-left">{labels.col_player}</th>
            <th className="px-4 py-3 text-right">{labels.col_pk}</th>
            <th className="px-4 py-3 text-right">{labels.col_level}</th>
            <th className="px-4 py-3 text-left hidden sm:table-cell">{labels.col_guild}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rank} className={rowCls(r.rank)}>
              <td className="px-4 py-3">
                <RankBadge rank={r.rank} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground/90">{r.name}</span>
                  <VersionBadge version={r.version} />
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-red-400">{fmt(r.pkPoints)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{r.level}</td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-xs text-muted-foreground/70">{r.guild || "—"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KOTable({ rows, labels }: { rows: PlayerRow[]; labels: RankingTableLabels }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-surface/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface/60 border-b border-surface/50 text-xs text-muted-foreground uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-12">{labels.col_rank}</th>
            <th className="px-4 py-3 text-left">{labels.col_player}</th>
            <th className="px-4 py-3 text-right">{labels.col_ko}</th>
            <th className="px-4 py-3 text-right">{labels.col_level}</th>
            <th className="px-4 py-3 text-left hidden sm:table-cell">{labels.col_guild}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rank} className={rowCls(r.rank)}>
              <td className="px-4 py-3">
                <RankBadge rank={r.rank} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground/90">{r.name}</span>
                  <VersionBadge version={r.version} />
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-orange-400">{fmt(r.ko)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{r.level}</td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-xs text-muted-foreground/70">{r.guild || "—"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GuildsTable({ rows, labels }: { rows: GuildRow[]; labels: RankingTableLabels }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-surface/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface/60 border-b border-surface/50 text-xs text-muted-foreground uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-12">{labels.col_rank}</th>
            <th className="px-4 py-3 text-left">{labels.col_guild}</th>
            <th className="px-4 py-3 text-right">{labels.col_members}</th>
            <th className="px-4 py-3 text-right">{labels.col_cps}</th>
            <th className="px-4 py-3 text-right hidden sm:table-cell">{labels.col_level}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rank} className={rowCls(r.rank)}>
              <td className="px-4 py-3">
                <RankBadge rank={r.rank} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground/90">{r.name}</span>
                  <VersionBadge version={r.version} />
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{r.members}</td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-gold">{fmt(r.totalCps)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{r.maxLevel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const TAB_ICONS: Record<RankTab, React.ReactNode> = {
  players: <Crown className="h-4 w-4" />,
  pk:      <Sword className="h-4 w-4" />,
  ko:      <Target className="h-4 w-4" />,
  guilds:  <Users className="h-4 w-4" />,
};

export function RankingTable({
  players,
  guilds,
  labels,
  defaultTab = "players",
  season,
}: {
  players: PlayerRow[];
  guilds: GuildRow[];
  labels: RankingTableLabels;
  defaultTab?: RankTab;
  season: string;
}) {
  const [tab, setTab] = useState<RankTab>(defaultTab);
  const [search, setSearch] = useState("");

  const tabs: { key: RankTab; label: string }[] = [
    { key: "players", label: labels.tab_players },
    { key: "pk",      label: labels.tab_pk },
    { key: "ko",      label: labels.tab_ko },
    { key: "guilds",  label: labels.tab_guilds },
  ];

  // Sort players per tab
  const topPlayers = [...players].sort(
    (a, b) => b.reborn - a.reborn || b.level - a.level || b.cps - a.cps
  ).map((p, i) => ({ ...p, rank: i + 1 }));

  const pkPlayers = [...players].sort((a, b) => b.pkPoints - a.pkPoints)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  const koPlayers = [...players].sort((a, b) => b.ko - a.ko)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  // Filter by search term
  const term = search.trim().toLowerCase();
  const filteredPlayers = term ? topPlayers.filter(p => p.name.toLowerCase().includes(term)) : topPlayers;
  const filteredPK      = term ? pkPlayers.filter(p => p.name.toLowerCase().includes(term)) : pkPlayers;
  const filteredKO      = term ? koPlayers.filter(p => p.name.toLowerCase().includes(term)) : koPlayers;
  const filteredGuilds  = term ? guilds.filter(g => g.name.toLowerCase().includes(term)) : guilds;

  return (
    <div className="flex flex-col gap-6">
      {/* Simulated notice */}
      <div className="flex items-center gap-2 bg-gold/5 border border-gold/15 rounded-lg px-4 py-2.5 text-xs text-gold/80 w-fit">
        <span className="h-1.5 w-1.5 rounded-full bg-gold/60 animate-pulse" />
        {labels.simulated_notice}
        <span className="ml-1 text-muted-foreground/60">{labels.season_label}: {season}</span>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={labels.search_placeholder}
          className="w-full bg-surface/40 border border-surface/50 rounded-lg pl-9 pr-9 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/40 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surface/40 border border-surface/50 rounded-xl p-1.5 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
              tab === t.key
                ? "bg-gold text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-surface/60"
            }`}
          >
            {TAB_ICONS[t.key]}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {tab === "players" && <PlayersTable rows={filteredPlayers} labels={labels} />}
      {tab === "pk"      && <PKTable rows={filteredPK} labels={labels} />}
      {tab === "ko"      && <KOTable rows={filteredKO} labels={labels} />}
      {tab === "guilds"  && <GuildsTable rows={filteredGuilds} labels={labels} />}
    </div>
  );
}
