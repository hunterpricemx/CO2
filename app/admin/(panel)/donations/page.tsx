"use client";

import { useList } from "@refinedev/core";
import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, TrendingUp, Clock, CheckCircle2, Coins } from "lucide-react";

/* ── Types ── */
type Donation = {
  id: string;
  character_name: string;
  account_name: string | null;
  version: number;
  amount_paid: number;
  currency: string;
  cps_total: number;
  cps_base: number;
  cps_bonus: number;
  payment_provider: string;
  status: string;
  influencer_code: string | null;
  created_at: string;
  claimed_at: string | null;
  game_credited_at: string | null;
  tebex_transaction: string | null;
  notes: string | null;
};

/** Extract `basket: <id>` from the donation's notes column (Tebex webhook stores it there). */
function extractBasket(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(/Tebex basket:\s*([^\s]+)/i);
  return m?.[1] ?? null;
}

/* ── Constants ── */
const PAGE_SIZE = 15;

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending:  { label: "Pendiente",  cls: "bg-yellow-900/30 text-yellow-400 border-yellow-700/40" },
  paid:     { label: "Pagado",     cls: "bg-blue-900/30 text-blue-400 border-blue-700/40" },
  credited: { label: "Acreditado", cls: "bg-emerald-900/30 text-emerald-400 border-emerald-700/40" },
  claimed:  { label: "Canjeado",   cls: "bg-green-900/30 text-green-400 border-green-700/40" },
  refunded: { label: "Reembolso",  cls: "bg-red-900/30 text-red-400 border-red-700/40" },
  expired:  { label: "Expirado",   cls: "bg-gray-800/60 text-gray-500 border-gray-700/40" },
};

const PROVIDER_ICON: Record<string, string> = {
  stripe: "💳",
  tebex:  "🛒",
  manual: "✏️",
};

/* ── Helpers ── */
function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div
      className="flex items-center gap-4 rounded-xl px-5 py-4"
      style={{ background: "rgba(15,5,3,0.9)", border: "1px solid rgba(255,215,0,0.1)" }}
    >
      <div className="text-[#f39c12]">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider font-poppins">{label}</p>
        <p className="text-xl font-bebas tracking-wider text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Page ── */
export default function AdminDonationsPage() {
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [versionFilter, setVersion] = useState("all");
  const [page, setPage]             = useState(1);

  const { query } = useList<Donation>({
    resource: "donations",
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { mode: "off" },
  });

  const all: Donation[] = (query.data?.data ?? []) as Donation[];

  /* ── Stats (always from all data) ── */
  const stats = useMemo(() => {
    const credited = all.filter((d) => d.status === "credited" || d.status === "claimed");
    const totalUsd = credited.reduce((s, d) => s + Number(d.amount_paid), 0);
    const totalCps = credited.reduce((s, d) => s + Number(d.cps_total), 0);
    const pending  = all.filter((d) => d.status === "pending" || d.status === "paid").length;
    return { total: all.length, totalUsd, totalCps, pending };
  }, [all]);

  /* ── Filtered / searched ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (versionFilter !== "all" && String(d.version) !== versionFilter) return false;
      if (q) {
        const basket = extractBasket(d.notes);
        const matches =
          d.character_name?.toLowerCase().includes(q) ||
          d.account_name?.toLowerCase().includes(q) ||
          d.payment_provider?.toLowerCase().includes(q) ||
          d.influencer_code?.toLowerCase().includes(q) ||
          d.tebex_transaction?.toLowerCase().includes(q) ||
          basket?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [all, search, statusFilter, versionFilter]);

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function goTo(p: number) { setPage(Math.max(1, Math.min(p, totalPages))); }
  function handleSearch(v: string)  { setSearch(v);  setPage(1); }
  function handleStatus(v: string)  { setStatus(v);  setPage(1); }
  function handleVersion(v: string) { setVersion(v); setPage(1); }

  const SEL_CLS = "bg-[#0f0503] border border-[rgba(255,215,0,0.12)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f39c12] transition-colors";

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div>
        <h1 className="font-bebas text-5xl tracking-wider text-white">Donaciones</h1>
        <p className="text-sm text-gray-500 mt-1 font-poppins">
          Historial completo de transacciones del servidor.
        </p>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<TrendingUp className="h-5 w-5" />}  label="Total recaudado"  value={`$${fmt(stats.totalUsd)} USD`} sub={`${stats.total} transacciones`} />
        <StatCard icon={<Coins className="h-5 w-5" />}       label="CPs acreditados"  value={stats.totalCps.toLocaleString()} sub="credited + claimed" />
        <StatCard icon={<Clock className="h-5 w-5" />}        label="Pendientes"        value={String(stats.pending)} sub="por acreditar" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Canjeados"         value={String(all.filter(d => d.status === "claimed").length)} sub="en NPC" />
      </div>

      {/* ── Filters ── */}
      <div
        className="flex flex-wrap gap-3 items-center rounded-xl px-5 py-4"
        style={{ background: "rgba(15,5,3,0.9)", border: "1px solid rgba(255,215,0,0.1)" }}
      >
        <div className="relative flex-1 min-w-45">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar jugador, código, basket, txn..."
            className={`${SEL_CLS} pl-9 w-full`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => handleStatus(e.target.value)} className={SEL_CLS}>
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={versionFilter} onChange={(e) => handleVersion(e.target.value)} className={SEL_CLS}>
          <option value="all">Todas las versiones</option>
          <option value="1">v1.0</option>
          <option value="2">v2.0</option>
        </select>
        <span className="text-xs text-gray-600 ml-auto font-poppins whitespace-nowrap">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table ── */}
      {query.isLoading ? (
        <div className="flex items-center justify-center py-24 text-gray-600 text-sm">Cargando...</div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,215,0,0.1)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-poppins">
              <thead>
                <tr style={{ background: "rgba(255,215,0,0.04)", borderBottom: "1px solid rgba(255,215,0,0.08)" }}>
                  {["Jugador", "User ID", "Ver.", "Monto", "CPs", "Plataforma", "Tebex / Basket", "Código", "Estado", "Fecha"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((d, i) => (
                  <tr
                    key={d.id}
                    className="transition-colors"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,215,0,0.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)")}
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {d.character_name || <span className="text-gray-600 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs font-mono whitespace-nowrap">
                      {d.account_name || <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-[#f39c12]/10 text-[#f39c12] font-medium whitespace-nowrap">
                        v{d.version}.0
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#f39c12] font-semibold tabular-nums whitespace-nowrap">
                      ${fmt(Number(d.amount_paid))} {d.currency}
                    </td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                      <span className="font-semibold text-white">{Number(d.cps_total).toLocaleString()}</span>
                      {d.cps_bonus > 0 && (
                        <span className="ml-1 text-xs text-emerald-400">(+{d.cps_bonus})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 capitalize">
                      {PROVIDER_ICON[d.payment_provider] ?? "💰"} {d.payment_provider}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                      {(() => {
                        const basket = extractBasket(d.notes);
                        const txn = d.tebex_transaction;
                        if (!basket && !txn) return <span className="text-gray-700">—</span>;
                        return (
                          <div className="flex flex-col gap-0.5 leading-tight">
                            {basket && (
                              <span className="text-purple-300 select-all cursor-text" title={`Basket completo: ${basket}`}>
                                🧺 {basket.length > 14 ? `…${basket.slice(-12)}` : basket}
                              </span>
                            )}
                            {txn && (
                              <span className="text-blue-300/70 select-all cursor-text" title={`Transaction completo: ${txn}`}>
                                #{txn.length > 14 ? `…${txn.slice(-12)}` : txn}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {d.influencer_code || <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium whitespace-nowrap ${(STATUS_CFG[d.status] ?? STATUS_CFG.pending).cls}`}>
                        {(STATUS_CFG[d.status] ?? { label: d.status }).label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {fmtDate(d.created_at)}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-600">
                      No se encontraron donaciones con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-5 py-3 flex-wrap gap-3"
              style={{ borderTop: "1px solid rgba(255,215,0,0.08)", background: "rgba(255,215,0,0.02)" }}
            >
              <span className="text-xs text-gray-600 font-poppins">
                Página {currentPage} de {totalPages} · {filtered.length} registros
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => goTo(1)} disabled={currentPage === 1}
                  className="px-2 py-1 rounded text-xs text-gray-500 hover:text-white disabled:opacity-30 transition-colors">«</button>
                <button onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1}
                  className="p-1 rounded text-gray-500 hover:text-white disabled:opacity-30 transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                  const p = start + i;
                  return (
                    <button key={p} onClick={() => goTo(p)}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                        p === currentPage ? "bg-[#f39c12] text-black" : "text-gray-500 hover:text-white hover:bg-white/5"
                      }`}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => goTo(currentPage + 1)} disabled={currentPage === totalPages}
                  className="p-1 rounded text-gray-500 hover:text-white disabled:opacity-30 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={() => goTo(totalPages)} disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded text-xs text-gray-500 hover:text-white disabled:opacity-30 transition-colors">»</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
