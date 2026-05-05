"use client";

import React, { useEffect, useState, useCallback, useTransition } from "react";
import { RefreshCw, AlertCircle, Info, AlertTriangle, Filter } from "lucide-react";

type PaymentLog = {
  id: string;
  created_at: string;
  source: string;
  level: string;
  event: string;
  username: string | null;
  product: string | null;
  amount: number | null;
  donation_id: string | null;
  txn_id: string | null;
  basket_ident: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
};

const SOURCE_COLORS: Record<string, string> = {
  tebex:  "bg-purple-900/40 text-purple-300 border-purple-700/40",
  stripe: "bg-blue-900/40 text-blue-300 border-blue-700/40",
  manual: "bg-amber-900/40 text-amber-300 border-amber-700/40",
  debug:  "bg-gray-700/40 text-gray-300 border-gray-600/40",
};

const LEVEL_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  info:  { color: "text-sky-400",    icon: <Info className="w-3 h-3" /> },
  warn:  { color: "text-yellow-400", icon: <AlertTriangle className="w-3 h-3" /> },
  error: { color: "text-red-400",    icon: <AlertCircle className="w-3 h-3" /> },
};

async function fetchLogs(source: string, level: string, search: string): Promise<PaymentLog[]> {
  const params = new URLSearchParams({ source, level, search });
  const res = await fetch(`/api/admin/payment-logs?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json() as Promise<PaymentLog[]>;
}

export default function PaymentLogsPage() {
  const [logs, setLogs]           = useState<PaymentLog[]>([]);
  const [filterSource, setSource] = useState("all");
  const [filterLevel, setLevel]   = useState("all");
  const [search, setSearch]       = useState("");
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const data = await fetchLogs(filterSource, filterLevel, search);
      setLogs(data);
    });
  }, [filterSource, filterLevel, search]);

  // Initial load and filter changes
  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 15 s
  useEffect(() => {
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Logs de Compras</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro en tiempo real de eventos de pago (Tebex, Stripe, Manual, Debug)</p>
        </div>
        <button
          onClick={load}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-white/10 text-sm text-gray-300 hover:border-white/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-[#111] border border-white/8 rounded-xl px-4 py-3">
        <Filter className="w-4 h-4 text-gray-500 shrink-0" />
        <select
          value={filterSource}
          onChange={e => setSource(e.target.value)}
          className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none"
        >
          <option value="all">Todas las fuentes</option>
          <option value="tebex">Tebex</option>
          <option value="stripe">Stripe</option>
          <option value="manual">Manual</option>
          <option value="debug">Debug</option>
        </select>
        <select
          value={filterLevel}
          onChange={e => setLevel(e.target.value)}
          className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none"
        >
          <option value="all">Todos los niveles</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        <input
          type="text"
          placeholder="Buscar usuario, evento, mensaje..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-50 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-white/30"
        />
        <span className="text-xs text-gray-600 ml-auto">{logs.length} entradas · auto-refresh 15s</span>
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-white/8 rounded-xl overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-16 text-center text-gray-600 text-sm">
            {isPending ? "Cargando..." : "No hay logs registrados aún"}
          </div>
        ) : (
          <>
            <p className="md:hidden text-[11px] text-gray-500 px-1 pb-1.5 italic">→ Desliza horizontal para ver todas las columnas</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-white/6">
                  {["Fecha/Hora", "Fuente", "Nivel", "Evento", "Usuario", "Productos / Monto", "Mensaje"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const lc = LEVEL_CONFIG[log.level] ?? LEVEL_CONFIG.info;
                  const isExpanded = expanded === log.id;
                  return (
                    <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpanded(isExpanded ? null : log.id)}
                      className="border-b border-white/4 hover:bg-white/3 transition-colors cursor-pointer"
                    >
                        {/* Date */}
                        <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("es-ES", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit", second: "2-digit",
                          })}
                        </td>
                        {/* Source */}
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-full border font-medium ${SOURCE_COLORS[log.source] ?? SOURCE_COLORS.debug}`}>
                            {log.source}
                          </span>
                        </td>
                        {/* Level */}
                        <td className={`px-4 py-2.5 ${lc.color}`}>
                          <span className="inline-flex items-center gap-1 text-xs font-medium">
                            {lc.icon}
                            {log.level}
                          </span>
                        </td>
                        {/* Event */}
                        <td className="px-4 py-2.5 text-gray-200 font-mono text-xs whitespace-nowrap">
                          {log.event}
                        </td>
                        {/* Username */}
                        <td className="px-4 py-2.5 text-gray-300 text-xs font-mono whitespace-nowrap">
                          {log.username ?? <span className="text-gray-600">—</span>}
                        </td>
                        {/* Product / Amount */}
                        <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                          {log.product && <span className="text-gray-400">{log.product}</span>}
                          {log.product && log.amount != null && <span className="text-gray-600 mx-1">/</span>}
                          {log.amount != null && <span className="text-green-400">${log.amount.toFixed(2)}</span>}
                          {!log.product && log.amount == null && <span className="text-gray-600">—</span>}
                        </td>
                        {/* Message */}
                        <td className="px-4 py-2.5 text-gray-300 text-xs max-w-xs truncate">
                          {log.message}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-white/4 bg-[#0d0d0d]">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {log.donation_id && (
                                <div>
                                  <span className="text-gray-500">donation_id: </span>
                                  <span className="text-gray-300 font-mono">{log.donation_id}</span>
                                </div>
                              )}
                              {log.txn_id && (
                                <div>
                                  <span className="text-gray-500">txn_id: </span>
                                  <span className="text-gray-300 font-mono break-all">{log.txn_id}</span>
                                </div>
                              )}
                              {log.basket_ident && (
                                <div>
                                  <span className="text-gray-500">basket_ident: </span>
                                  <span className="text-gray-300 font-mono">{log.basket_ident}</span>
                                </div>
                              )}
                              <div className="col-span-full">
                                <span className="text-gray-500">message: </span>
                                <span className="text-gray-200">{log.message}</span>
                              </div>
                              {log.metadata && (
                                <div className="col-span-full">
                                  <span className="text-gray-500 block mb-1">metadata:</span>
                                  <pre className="bg-[#0a0a0a] border border-white/6 rounded-lg p-3 text-gray-400 text-[11px] overflow-x-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
