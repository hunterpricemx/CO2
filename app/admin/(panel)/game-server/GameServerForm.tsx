"use client";

import { useState, useTransition } from "react";
import { Plug, RefreshCw, Save, CheckCircle, XCircle, Database } from "lucide-react";
import { saveServerConfig, testGameServerConnection, syncGameServer, type ServerConfigData } from "./actions";

type SyncStats = {
  last_sync:             string | null;
  sync_accounts_count:   number;
  sync_characters_count: number;
};

type Props = {
  initial: (ServerConfigData & SyncStats & { has_password_v1?: boolean; has_password_v2?: boolean }) | null;
};

export function GameServerForm({ initial }: Props) {
  const [form, setForm] = useState<ServerConfigData>({
    db_host_v2:          initial?.db_host_v2          ?? "",
    db_port_v2:          initial?.db_port_v2          ?? 3306,
    db_name_v2:          initial?.db_name_v2          ?? "",
    db_user_v2:          initial?.db_user_v2          ?? "",
    db_pass_v2:          "",
    table_accounts_v2:   initial?.table_accounts_v2   ?? "accounts",
    table_characters_v2: initial?.table_characters_v2 ?? "topserver_turbo",
    table_payments_v2:   initial?.table_payments_v2   ?? "dbb_payments",
    db_host_v1:          initial?.db_host_v1          ?? "",
    db_port_v1:          initial?.db_port_v1          ?? 3306,
    db_name_v1:          initial?.db_name_v1          ?? "",
    db_user_v1:          initial?.db_user_v1          ?? "",
    db_pass_v1:          "",
    table_accounts_v1:   initial?.table_accounts_v1   ?? "accounts",
    table_characters_v1: initial?.table_characters_v1 ?? "topservers",
    table_payments_v1:   initial?.table_payments_v1   ?? "dbb_payments",
  });

  const hasPasswordV2 = initial?.has_password_v2 ?? false;
  const hasPasswordV1 = initial?.has_password_v1 ?? false;

  const [result,    setResult]    = useState<{ ok: boolean; msg: string; data?: Record<string, unknown> } | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = (k: keyof ServerConfigData, v: string | number) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    startTransition(async () => {
      const r = await saveServerConfig(form);
      setResult({ ok: r.success, msg: r.message });
    });
  };

  const handleTest = (version: 1 | 2) => () => {
    startTransition(async () => {
      const r = await testGameServerConnection(form, version);
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

  function ServerCard({ version }: { version: 1 | 2 }) {
    const v = version === 1 ? "v1" : "v2";
    const label = `${version}.0`;
    const color = version === 2 ? "emerald" : "blue";
    const borderColor = version === 2 ? "rgba(16,185,129,0.3)" : "rgba(59,130,246,0.3)";
    const accentColor = version === 2 ? "#10b981" : "#3b82f6";
    const hasPwd = version === 2 ? hasPasswordV2 : hasPasswordV1;
    const pwdPlaceholder = hasPwd && form[`db_pass_${v}` as keyof ServerConfigData] === ""
      ? "✓ Contraseña guardada (dejar vacío para no cambiar)"
      : "••••••••••";
    void color;

    return (
      <div className="bg-[#111] rounded-xl p-6 space-y-4" style={{ border: `1px solid ${borderColor}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" style={{ color: accentColor }} />
            <h2 className="text-sm font-medium text-white uppercase tracking-wide">Servidor {label}</h2>
          </div>
          <button
            type="button"
            onClick={handleTest(version)}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}44`, color: accentColor }}
          >
            <Plug className="h-3 w-3" />
            Probar {label}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Host / IP</label>
            <input className={inputCls} placeholder="51.222.254.2"
              value={form[`db_host_${v}` as keyof ServerConfigData] as string}
              onChange={e => set(`db_host_${v}` as keyof ServerConfigData, e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Puerto</label>
            <input className={inputCls} type="number" placeholder="3306"
              value={form[`db_port_${v}` as keyof ServerConfigData] as number}
              onChange={e => set(`db_port_${v}` as keyof ServerConfigData, +e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Base de datos</label>
          <input className={inputCls} placeholder="conquerclassicplus"
            value={form[`db_name_${v}` as keyof ServerConfigData] as string}
            onChange={e => set(`db_name_${v}` as keyof ServerConfigData, e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Usuario</label>
            <input className={inputCls} placeholder="conquerplus"
              value={form[`db_user_${v}` as keyof ServerConfigData] as string}
              onChange={e => set(`db_user_${v}` as keyof ServerConfigData, e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Contraseña</label>
            <input className={inputCls} type="password" placeholder={pwdPlaceholder}
              value={form[`db_pass_${v}` as keyof ServerConfigData] as string}
              onChange={e => set(`db_pass_${v}` as keyof ServerConfigData, e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Tabla cuentas</label>
            <input className={inputCls} placeholder="accounts"
              value={form[`table_accounts_${v}` as keyof ServerConfigData] as string}
              onChange={e => set(`table_accounts_${v}` as keyof ServerConfigData, e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Tabla personajes</label>
            <input className={inputCls} placeholder={version === 1 ? "topservers" : "topserver_turbo"}
              value={form[`table_characters_${v}` as keyof ServerConfigData] as string}
              onChange={e => set(`table_characters_${v}` as keyof ServerConfigData, e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Tabla de pagos</label>
            <input className={inputCls} placeholder="dbb_payments"
              value={form[`table_payments_${v}` as keyof ServerConfigData] as string}
              onChange={e => set(`table_payments_${v}` as keyof ServerConfigData, e.target.value)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <ServerCard version={2} />
      <ServerCard version={1} />

      {/* Resultado */}
      {result && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm border ${
          result.ok
            ? "bg-green-900/20 border-green-800/40 text-green-300"
            : "bg-red-900/20 border-red-800/40 text-red-300"
        }`}>
          {result.ok ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 shrink-0" />}
          <div>
            <p>{result.msg}</p>
            {result.data && (
              <p className="text-xs mt-1 opacity-70">
                {"accounts" in result.data && `Cuentas: ${String(result.data.accounts)}`}
                {"characters" in result.data && ` · Personajes: ${String(result.data.characters)}`}
                {"characters_v1" in result.data && ` · Personajes v1: ${String(result.data.characters_v1)}`}
                {"characters_v2" in result.data && ` · Personajes v2: ${String(result.data.characters_v2)}`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-3">
        <button onClick={handleSave} disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[rgba(243,156,18,0.15)] border border-[rgba(243,156,18,0.3)] text-[#f39c12] hover:bg-[rgba(243,156,18,0.25)] transition-colors disabled:opacity-50">
          {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </button>

        <button onClick={handleSync} disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-blue-900/20 border border-blue-800/40 text-blue-300 hover:bg-blue-900/40 transition-colors disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          Sincronizar → Supabase
        </button>
      </div>

      {initial?.last_sync && (
        <p className="text-xs text-gray-600">
          Última sincronización:{" "}
          {new Date(initial.last_sync).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}
          {" · "}{initial.sync_accounts_count} cuentas
          {" · "}{initial.sync_characters_count} personajes totales
        </p>
      )}
    </div>
  );
}
