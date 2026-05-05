"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import {
  Search, RefreshCw, Filter, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon,
  CheckCircle, XCircle, Clock, RotateCcw, AlertCircle,
} from "lucide-react";
import {
  getTestPurchaseHistory,
  retryTestPurchase,
  type TestPurchase,
  type TestPurchaseStatus,
  type PurchaseHistoryFilters,
} from "@/modules/shop-test";

const STATUS_CFG: Record<TestPurchaseStatus, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:   { label: "pending",   cls: "bg-yellow-900/30 text-yellow-300 border-yellow-700/40", icon: Clock },
  completed: { label: "completed", cls: "bg-green-900/30 text-green-300 border-green-700/40",    icon: CheckCircle },
  failed:    { label: "failed",    cls: "bg-red-900/30 text-red-300 border-red-700/40",          icon: XCircle },
  refunded:  { label: "refunded",  cls: "bg-blue-900/30 text-blue-300 border-blue-700/40",       icon: RotateCcw },
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function fmtDate(s: string) {
  return new Date(s).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" });
}

function fmtLatency(created: string, delivered: string | null): string {
  if (!delivered) return "—";
  const ms = new Date(delivered).getTime() - new Date(created).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function StatusBadge({ status }: { status: TestPurchaseStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export function PurchaseHistoryClient() {
  const [rows,       setRows]       = useState<TestPurchase[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [retryId,    setRetryId]    = useState<string | null>(null);
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set());

  // Filters
  const [statusFilter, setStatusFilter] = useState<Set<TestPurchaseStatus>>(new Set());
  const [uidFilter,    setUidFilter]    = useState("");
  const [itemIdFilter, setItemIdFilter] = useState("");
  const [search,       setSearch]       = useState("");
  const [fromDate,     setFromDate]     = useState("");
  const [toDate,       setToDate]       = useState("");
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState<number>(25);

  const load = useCallback(async () => {
    setLoading(true);
    const filters: PurchaseHistoryFilters = {
      status:   statusFilter.size > 0 ? Array.from(statusFilter) : undefined,
      uid:      Number(uidFilter) > 0 ? Number(uidFilter) : undefined,
      itemId:   Number(itemIdFilter) > 0 ? Number(itemIdFilter) : undefined,
      search:   search.trim() || undefined,
      fromDate: fromDate || undefined,
      toDate:   toDate || undefined,
      page,
      pageSize,
    };
    const r = await getTestPurchaseHistory(filters);
    setLoading(false);
    if (r.success) {
      setRows(r.data.rows);
      setTotal(r.data.total);
      setTotalPages(r.data.totalPages);
    }
  }, [statusFilter, uidFilter, itemIdFilter, search, fromDate, toDate, page, pageSize]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // When filters change, jump back to page 1
  useEffect(() => {
    setPage(1);
  }, [statusFilter, uidFilter, itemIdFilter, search, fromDate, toDate, pageSize]);

  const toggleStatus = (s: TestPurchaseStatus) => {
    setStatusFilter(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onRetry = async (id: string) => {
    setRetryId(id);
    await retryTestPurchase(id);
    setRetryId(null);
    await load();
  };

  const clearFilters = () => {
    setStatusFilter(new Set());
    setUidFilter("");
    setItemIdFilter("");
    setSearch("");
    setFromDate("");
    setToDate("");
  };

  const inputCls = "w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50";
  const labelCls = "text-[10px] text-gray-500 uppercase tracking-wider mb-1 block";

  return (
    <div className="space-y-4">
      {/* ── Filtros ── */}
      <div className="bg-[#111] rounded-xl p-5 border border-white/5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearFilters}
              className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              Limpiar
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-purple-900/30 border border-purple-700/40 text-purple-200 hover:bg-purple-900/50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refrescar
            </button>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_CFG) as TestPurchaseStatus[]).map(s => {
            const active = statusFilter.has(s);
            const cfg = STATUS_CFG[s];
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  active ? cfg.cls : "bg-white/2 text-gray-500 border-white/5 hover:text-gray-300"
                }`}
              >
                <cfg.icon className="h-3 w-3" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className={labelCls}>UID</label>
            <input className={inputCls} type="number" min={1} placeholder="UID exacto" value={uidFilter} onChange={e => setUidFilter(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Item ID</label>
            <input className={inputCls} type="number" min={1} placeholder="Item ID exacto" value={itemIdFilter} onChange={e => setItemIdFilter(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Buscar (admin / IP / error)</label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input className={`${inputCls} pl-9`} placeholder="texto libre…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Desde</label>
            <input className={inputCls} type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Hasta</label>
            <input className={inputCls} type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Resultados ── */}
      <div className="bg-[#111] rounded-xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
          <span className="text-xs text-gray-500">
            {loading ? "Cargando…" : `${total.toLocaleString("es")} resultado${total === 1 ? "" : "s"}`}
          </span>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Por página:</span>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className="bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500/50"
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wider bg-[#0a0a0a]">
                <th className="px-3 py-2.5 w-8"></th>
                <th className="px-3 py-2.5">Fecha</th>
                <th className="px-3 py-2.5">Admin</th>
                <th className="px-3 py-2.5">UID</th>
                <th className="px-3 py-2.5">Item ID</th>
                <th className="px-3 py-2.5">CPs</th>
                <th className="px-3 py-2.5">IP</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5 text-center">Intentos</th>
                <th className="px-3 py-2.5">Latencia</th>
                <th className="px-3 py-2.5">Error</th>
                <th className="px-3 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const isExpanded = expanded.has(r.id);
                return (
                  <Fragment key={r.id}>
                    <tr
                      className={`border-t border-white/5 hover:bg-white/2 cursor-pointer ${isExpanded ? "bg-purple-900/5" : ""}`}
                      onClick={() => toggleExpand(r.id)}
                    >
                      <td className="px-3 py-2 text-gray-500">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
                      </td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                      <td className="px-3 py-2 text-gray-300 truncate max-w-32" title={r.admin_email}>{r.admin_email}</td>
                      <td className="px-3 py-2 text-white font-mono">{r.uid}</td>
                      <td className="px-3 py-2 text-white font-mono">{r.item_id}</td>
                      <td className="px-3 py-2 text-purple-300 font-mono">{r.cp_amount.toLocaleString("es")}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono text-[10px]">{r.player_ip ?? "—"}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-2 text-gray-400 text-center">{r.delivery_attempts}</td>
                      <td className="px-3 py-2 text-gray-400 font-mono">{fmtLatency(r.created_at, r.delivered_at)}</td>
                      <td className="px-3 py-2 text-red-300 max-w-50 truncate" title={r.delivery_error ?? ""}>
                        {r.delivery_error ?? ""}
                      </td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        {(r.status === "failed" || r.status === "pending") && (
                          <button
                            onClick={() => onRetry(r.id)}
                            disabled={retryId === r.id}
                            className="px-2 py-1 rounded text-[10px] bg-purple-900/30 border border-purple-700/40 text-purple-300 hover:bg-purple-900/50 disabled:opacity-50"
                          >
                            {retryId === r.id ? "..." : "Reintentar"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-[#0a0a0a] border-t border-white/5">
                        <td colSpan={12} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="flex items-center gap-1.5 text-[10px] text-purple-400 uppercase tracking-wider mb-1.5">
                                <ChevronRightIcon className="h-3 w-3" />
                                Request firmado al listener
                              </div>
                              <pre className="bg-[#050505] border border-white/5 rounded-lg p-3 text-[10px] font-mono text-purple-200 overflow-x-auto whitespace-pre-wrap break-all max-h-80 overflow-y-auto">
                                {JSON.stringify(r.request_payload, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 text-[10px] text-blue-400 uppercase tracking-wider mb-1.5">
                                <ChevronRightIcon className="h-3 w-3" />
                                Response del listener
                              </div>
                              <pre className="bg-[#050505] border border-white/5 rounded-lg p-3 text-[10px] font-mono text-blue-200 overflow-x-auto whitespace-pre-wrap break-all max-h-80 overflow-y-auto">
                                {JSON.stringify(r.response_body, null, 2)}
                              </pre>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-500">
                            <span>purchase_id: <code className="text-purple-300 select-all">{r.id}</code></span>
                            {r.delivered_at && <span>delivered_at: {fmtDate(r.delivered_at)}</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-gray-500">
                    <AlertCircle className="h-5 w-5 mx-auto mb-2 opacity-50" />
                    Sin resultados con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-[#0a0a0a]">
            <span className="text-[11px] text-gray-500">
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:text-white disabled:opacity-30">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1 rounded text-gray-500 hover:text-white disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-9 h-9 sm:w-7 sm:h-7 rounded text-sm sm:text-xs font-medium ${
                      p === page ? "bg-purple-700 text-white" : "text-gray-500 hover:text-white hover:bg-white/5"
                    }`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1 rounded text-gray-500 hover:text-white disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:text-white disabled:opacity-30">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
