"use client";

import { useState, useTransition } from "react";
import { Server, Plug, RefreshCw, Save, CheckCircle, XCircle, Database } from "lucide-react";
import { saveServerConfig, testGameServerConnection, syncGameServer, type ServerConfigData } from "./actions";

type SyncStats = {
  last_sync:             string | null;
  sync_accounts_count:   number;
  sync_characters_count: number;
};

type Props = {
  initial: (ServerConfigData & SyncStats & { has_password?: boolean }) | null;
};

export function GameServerForm({ initial }: Props) {
  const [form, setForm] = useState<ServerConfigData>({
    db_host:             initial?.db_host             ?? "",
    db_port:             initial?.db_port             ?? 3306,
    db_name:             initial?.db_name             ?? "",
    db_user:             initial?.db_user             ?? "",
    db_pass:             "",   // nunca se devuelve desde el servidor
    table_accounts:      initial?.table_accounts      ?? "accounts",
    table_characters_v1: initial?.table_characters_v1 ?? "topservers",
    table_characters_v2: initial?.table_characters_v2 ?? "topservers",
  });

  const hasPassword = initial?.has_password ?? false;

  const [result,   setResult]   = useState<{ ok: boolean; msg: string; data?: Record<string, unknown> } | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = (k: keyof ServerConfigData, v: string | number) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    startTransition(async () => {
      const r = await saveServerConfig(form);
      setResult({ ok: r.success, msg: r.message });
    });
  };

  const handleTest = () => {
    startTransition(async () => {
      const r = await testGameServerConnection(form);
      setResult({ ok: r.success, msg: r.message, data: r.data });
    });
  };

  const handleSync = () => {
    startTransition(async () => {
      const r = await syncGameServer();
      setResult({ ok: r.success, msg: r.message, data: r.data });
    });
  };

  const inputCls = "w-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[rgba(243,156,18,0.5)]";
  const labelCls = "text-xs text-gray-400 uppercase tracking-wide mb-1 block";

  return (
    <div className="max-w-2xl space-y-6">

      {/* Conexión MySQL */}
      <div className="bg-[#111] border border-[rgba(255,255,255,0.06)] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 text-[#f39c12]" />
          <h2 className="text-sm font-medium text-white uppercase tracking-wide">Conexión MySQL</h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Host / IP</label>
            <input className={inputCls} placeholder="77.37.74.50" value={form.db_host}
              onChange={e => set("db_host", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Puerto</label>
            <input className={inputCls} type="number" placeholder="3306" value={form.db_port}
              onChange={e => set("db_port", +e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Base de datos</label>
          <input className={inputCls} placeholder="hunterprice_conquerclassicplus" value={form.db_name}
            onChange={e => set("db_name", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Usuario</label>
            <input className={inputCls} placeholder="hunterprice_co2" value={form.db_user}
              onChange={e => set("db_user", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Contraseña</label>
            <input className={inputCls} type="password"
              placeholder={hasPassword && form.db_pass === "" ? "✓ Contraseña guardada (dejar vacío para no cambiar)" : "••••••••••"}
              value={form.db_pass}
              onChange={e => set("db_pass", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Tablas */}
      <div className="bg-[#111] border border-[rgba(255,255,255,0.06)] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Server className="h-4 w-4 text-[#f39c12]" />
          <h2 className="text-sm font-medium text-white uppercase tracking-wide">Tablas del juego</h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Tabla cuentas</label>
            <input className={inputCls} placeholder="accounts" value={form.table_accounts}
              onChange={e => set("table_accounts", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Personajes v1.0</label>
            <input className={inputCls} placeholder="topservers" value={form.table_characters_v1}
              onChange={e => set("table_characters_v1", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Personajes v2.0</label>
            <input className={inputCls} placeholder="topservers_v2" value={form.table_characters_v2}
              onChange={e => set("table_characters_v2", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Resultado */}
      {result && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm border ${
          result.ok
            ? "bg-green-900/20 border-green-800/40 text-green-300"
            : "bg-red-900/20 border-red-800/40 text-red-300"
        }`}>
          {result.ok
            ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
            : <XCircle    className="h-4 w-4 mt-0.5 shrink-0" />
          }
          <div>
            <p>{result.msg}</p>
            {result.data && (
              <p className="text-xs mt-1 opacity-70">
                Cuentas: {String(result.data.accounts ?? 0)}
                {" · "}
                Personajes v1.0: {String(result.data.characters_v1 ?? 0)}
                {" · "}
                Personajes v2.0: {String(result.data.characters_v2 ?? 0)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-3">
        <button onClick={handleTest} disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] text-gray-300 hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-colors disabled:opacity-50">
          <Plug className="h-4 w-4" />
          Probar conexión
        </button>

        <button onClick={handleSave} disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[rgba(243,156,18,0.15)] border border-[rgba(243,156,18,0.3)] text-[#f39c12] hover:bg-[rgba(243,156,18,0.25)] transition-colors disabled:opacity-50">
          <Save className="h-4 w-4" />
          Guardar
        </button>

        <button onClick={handleSync} disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-blue-900/20 border border-blue-800/40 text-blue-300 hover:bg-blue-900/40 transition-colors disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          Sincronizar → Supabase
        </button>
      </div>

      {/* Stats última sync */}
      {initial?.last_sync && (
        <p className="text-xs text-gray-600">
          Última sincronización:{" "}
          {new Date(initial.last_sync).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}
          {" · "}
          {initial.sync_accounts_count} cuentas
          {" · "}
          {initial.sync_characters_count} personajes totales
        </p>
      )}
    </div>
  );
}
