"use client";

import React, { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Filter, RefreshCw, Info } from "lucide-react";

type SettingsLog = {
  id: string;
  created_at: string;
  source: string;
  summary: string;
};

const SOURCE_COLORS: Record<string, string> = {
  site_settings: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
  payment_config: "bg-orange-900/40 text-orange-300 border-orange-700/40",
};

async function fetchLogs(source: string, search: string): Promise<SettingsLog[]> {
  const params = new URLSearchParams({ source, search });
  const res = await fetch(`/api/settings-logs?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json() as Promise<SettingsLog[]>;
}

export default function PublicSettingsLogsPage() {
  const params = useParams<{ locale: string; version: string }>();
  const locale = params?.locale ?? "es";
  const version = params?.version ?? "1.0";

  const [logs, setLogs] = useState<SettingsLog[]>([]);
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const homeHref = locale === "es" ? `/${version}` : `/${locale}/${version}`;

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
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <section className="px-4 py-10" style={{ background: "#080808" }}>
      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="space-y-3">
          <nav className="flex items-center gap-2 text-xs text-white/60">
            <Link href={homeHref} className="hover:text-gold transition-colors">
              Inicio
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gold font-medium">Log de ajustes</span>
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-bebas tracking-wider text-4xl text-white">Log de ajustes</h1>
              <p className="text-sm text-gray-400">Historial de cambios en ajustes del sitio y pagos</p>
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
            placeholder="Buscar por tipo de ajuste..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-50 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-white/30"
          />
          <span className="text-xs text-gray-600 ml-auto">{logs.length} entradas · auto-refresh 20s</span>
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
                    {["Fecha/Hora", "Tipo", "Actualizacion"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          className="border-b border-white/4 hover:bg-white/3 transition-colors"
                        >
                          <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("es-ES", {
                              day: "2-digit", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit", second: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-full border font-medium ${SOURCE_COLORS[log.source] ?? "bg-gray-700/40 text-gray-300 border-gray-600/40"}`}>
                              {log.source === "payment_config" ? "Pagos" : "Ajustes del sitio"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-300 text-sm">
                            <span className="inline-flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              {log.summary}
                            </span>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
