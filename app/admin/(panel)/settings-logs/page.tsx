"use client";

import React, { useCallback, useEffect, useState, useTransition } from "react";
import { Filter, RefreshCw, Info } from "lucide-react";

type SettingsLog = {
  id: string;
  created_at: string;
  source: string;
  event: string;
  message: string;
  admin_id: string | null;
  admin_username: string | null;
  setting_key: string | null;
  before_value: string | null;
  after_value: string | null;
  metadata: Record<string, unknown> | null;
};

const SOURCE_COLORS: Record<string, string> = {
  site_settings: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
  payment_config: "bg-orange-900/40 text-orange-300 border-orange-700/40",
};

async function fetchLogs(source: string, search: string): Promise<SettingsLog[]> {
  const params = new URLSearchParams({ source, search });
  const res = await fetch(`/api/admin/settings-logs?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json() as Promise<SettingsLog[]>;
}

export default function SettingsLogsPage() {
  const [logs, setLogs] = useState<SettingsLog[]>([]);
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const data = await fetchLogs(source, search);
      setLogs(data);
    });
  }, [source, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Log de Ajustes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cambios en ajustes del sitio y configuración de pagos</p>
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

      <div className="flex flex-wrap gap-3 items-center bg-[#111] border border-white/8 rounded-xl px-4 py-3">
        <Filter className="w-4 h-4 text-gray-500 shrink-0" />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none"
        >
          <option value="all">Todos</option>
          <option value="site_settings">Ajustes del Sitio</option>
          <option value="payment_config">Ajustes de Pagos</option>
        </select>
        <input
          type="text"
          placeholder="Buscar admin, clave, evento, mensaje..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-50 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-white/30"
        />
        <span className="text-xs text-gray-600 ml-auto">{logs.length} entradas · auto-refresh 15s</span>
      </div>

      <div className="bg-[#111] border border-white/8 rounded-xl overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-16 text-center text-gray-600 text-sm">
            {isPending ? "Cargando..." : "No hay logs registrados aún"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/6">
                  {["Fecha/Hora", "Fuente", "Admin", "Clave", "Evento", "Mensaje"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="border-b border-white/4 hover:bg-white/3 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("es-ES", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit", second: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-full border font-medium ${SOURCE_COLORS[log.source] ?? "bg-gray-700/40 text-gray-300 border-gray-600/40"}`}>
                            {log.source}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-300 text-xs font-mono whitespace-nowrap">
                          {log.admin_username ?? <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-200 text-xs font-mono whitespace-nowrap">
                          {log.setting_key ?? <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-sky-300 font-mono text-xs whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            {log.event}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-300 text-xs max-w-xs truncate">
                          {log.message}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="border-b border-white/4 bg-[#0d0d0d]">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 gap-3 text-xs">
                              <div>
                                <span className="text-gray-500">before_value: </span>
                                <span className="text-gray-300 font-mono break-all">{log.before_value ?? "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">after_value: </span>
                                <span className="text-gray-300 font-mono break-all">{log.after_value ?? "—"}</span>
                              </div>
                              {log.metadata && (
                                <div>
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
        )}
      </div>
    </div>
  );
}
