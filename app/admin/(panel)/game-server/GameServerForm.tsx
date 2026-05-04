"use client";

import { useEffect, useState, useTransition } from "react";
import { Plug, RefreshCw, Save, CheckCircle, XCircle, Database, FlaskConical, KeyRound, Send, ListOrdered } from "lucide-react";
import {
  saveServerConfig,
  testGameServerConnection,
  syncGameServer,
  testShopEndpoint,
  generateShopSecret,
  loadShopBuyerWhitelist,
  saveShopBuyerWhitelist,
  type ServerConfigData,
  type ServerEnv,
} from "./actions";
import { SecretInput } from "@/app/admin/_components/SecretInput";
import { testShopPurchase, listTestPurchases, retryTestPurchase, type TestPurchase } from "@/modules/shop-test";

type SyncStats = {
  last_sync:             string | null;
  sync_accounts_count:   number;
  sync_characters_count: number;
};

type Props = {
  initial: (ServerConfigData & SyncStats & {
    has_password_v1?: boolean;
    has_password_v2?: boolean;
    has_password_test?: boolean;
    has_shop_secret_test?: boolean;
    has_shop_secret_v1?:   boolean;
    has_shop_secret_v2?:   boolean;
  }) | null;
};

const inputCls = "w-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[rgba(243,156,18,0.5)]";
const labelCls = "text-xs text-gray-400 uppercase tracking-wide mb-1 block";

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
    db_host_test:          initial?.db_host_test          ?? "",
    db_port_test:          initial?.db_port_test          ?? 3306,
    db_name_test:          initial?.db_name_test          ?? "",
    db_user_test:          initial?.db_user_test          ?? "",
    db_pass_test:          "",
    table_accounts_test:   initial?.table_accounts_test   ?? "accounts",
    table_characters_test: initial?.table_characters_test ?? "topserver_turbo",
    table_payments_test:   initial?.table_payments_test   ?? "dbb_payments",
    shop_endpoint_test:    initial?.shop_endpoint_test    ?? "",
    shop_hmac_secret_test: "",
    shop_enabled_test:     initial?.shop_enabled_test     ?? false,
    shop_timeout_ms_test:  initial?.shop_timeout_ms_test  ?? 5000,
    shop_endpoint_v1:      initial?.shop_endpoint_v1      ?? "",
    shop_hmac_secret_v1:   "",
    shop_enabled_v1:       initial?.shop_enabled_v1       ?? false,
    shop_timeout_ms_v1:    initial?.shop_timeout_ms_v1    ?? 5000,
    shop_endpoint_v2:      initial?.shop_endpoint_v2      ?? "",
    shop_hmac_secret_v2:   "",
    shop_enabled_v2:       initial?.shop_enabled_v2       ?? false,
    shop_timeout_ms_v2:    initial?.shop_timeout_ms_v2    ?? 5000,
  });

  const hasPasswordV2     = initial?.has_password_v2     ?? false;
  const hasPasswordV1     = initial?.has_password_v1     ?? false;
  const hasPasswordTest   = initial?.has_password_test   ?? false;
  const hasShopSecretTest = initial?.has_shop_secret_test ?? false;
  const hasShopSecretV1   = initial?.has_shop_secret_v1  ?? false;
  const hasShopSecretV2   = initial?.has_shop_secret_v2  ?? false;

  const [result,    setResult]    = useState<{ ok: boolean; msg: string; data?: Record<string, unknown> } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showShopSecret, setShowShopSecret] = useState(false);

  const set = (k: keyof ServerConfigData, v: string | number | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    startTransition(async () => {
      const r = await saveServerConfig(form);
      setResult({ ok: r.success, msg: r.message });
    });
  };

  const handleTest = (env: ServerEnv) => () => {
    startTransition(async () => {
      const r = await testGameServerConnection(form, env);
      setResult({ ok: r.success, msg: r.message, data: r.data });
    });
  };

  const handleTestShopEndpointFor = (env: "test" | "v1" | "v2") => () => {
    startTransition(async () => {
      const r = await testShopEndpoint(env);
      setResult({ ok: r.success, msg: r.message, data: r.data });
    });
  };
  const handleTestShopEndpoint = handleTestShopEndpointFor("test");

  const handleGenerateSecretFor = (env: "test" | "v1" | "v2") => () => {
    const fieldKey = `shop_hmac_secret_${env}` as keyof ServerConfigData;
    startTransition(async () => {
      const { secret } = await generateShopSecret();
      setForm(prev => ({ ...prev, [fieldKey]: secret }));
      setShowShopSecret(true);
      setResult({ ok: true, msg: `Secret generado para ${env}. Guárdalo (clic en 'Guardar') y copia este valor al game server.` });
    });
  };
  const handleGenerateSecret = handleGenerateSecretFor("test");

  const handleSync = () => {
    startTransition(async () => {
      const r = await syncGameServer();
      setResult({ ok: r.success, msg: r.message, data: r.data });
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <ServerCard
        version={2}
        form={form}
        set={set}
        hasPasswordV1={hasPasswordV1}
        hasPasswordV2={hasPasswordV2}
        handleTest={handleTest}
        isPending={isPending}
      />
      <ServerCard
        version={1}
        form={form}
        set={set}
        hasPasswordV1={hasPasswordV1}
        hasPasswordV2={hasPasswordV2}
        handleTest={handleTest}
        isPending={isPending}
      />

      <TestServerCard
        form={form}
        set={set}
        hasPasswordTest={hasPasswordTest}
        hasShopSecretTest={hasShopSecretTest}
        showShopSecret={showShopSecret}
        setShowShopSecret={setShowShopSecret}
        isPending={isPending}
        onTestMysql={handleTest("test")}
        onTestEndpoint={handleTestShopEndpoint}
        onGenerateSecret={handleGenerateSecret}
      />

      <ShopTestRunner enabled={form.shop_enabled_test} />

      <ShopProdCard
        version="v2"
        form={form}
        set={set}
        hasShopSecret={hasShopSecretV2}
        showShopSecret={showShopSecret}
        setShowShopSecret={setShowShopSecret}
        isPending={isPending}
        onTestEndpoint={handleTestShopEndpointFor("v2")}
        onGenerateSecret={handleGenerateSecretFor("v2")}
      />

      <ShopProdCard
        version="v1"
        form={form}
        set={set}
        hasShopSecret={hasShopSecretV1}
        showShopSecret={showShopSecret}
        setShowShopSecret={setShowShopSecret}
        isPending={isPending}
        onTestEndpoint={handleTestShopEndpointFor("v1")}
        onGenerateSecret={handleGenerateSecretFor("v1")}
      />

      <ShopBuyerWhitelistCard />

      <TestPurchaseHistory />

      {/* Resultado */}
      {result && (
        <div className={`px-4 py-3 rounded-lg text-sm border ${
          result.ok
            ? "bg-green-900/20 border-green-800/40 text-green-300"
            : "bg-red-900/20 border-red-800/40 text-red-300"
        }`}>
          <div className="flex items-center gap-2 font-semibold mb-2">
            {result.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            {result.msg}
          </div>
          {result.data && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs font-mono opacity-80 mt-1 border-t border-white/10 pt-2">
              {"from_host" in result.data && (
                <span>🖥 Origen: <span className="text-white">{String(result.data.from_host)}</span></span>
              )}
              {"to_host" in result.data && (
                <span>🎯 Destino: <span className="text-white">{String(result.data.to_host)}:{String(result.data.to_port ?? "")}</span></span>
              )}
              {"db_name" in result.data && (
                <span>🗄 DB: <span className="text-white">{String(result.data.db_name)}</span></span>
              )}
              {"db_user" in result.data && (
                <span>👤 Usuario: <span className="text-white">{String(result.data.db_user)}</span></span>
              )}
              {"latency_ms" in result.data && (
                <span>⚡ Latencia: <span className="text-white">{String(result.data.latency_ms)}ms</span></span>
              )}
              {"accounts" in result.data && (
                <span>👥 Cuentas: <span className="text-white">{String(result.data.accounts)}</span></span>
              )}
              {"characters" in result.data && (
                <span>⚔️ Personajes: <span className="text-white">{String(result.data.characters)}</span></span>
              )}
              {"payments_table" in result.data && (
                <span>💳 Tabla pagos: <span className={result.data.payments_table_exists ? "text-green-400" : "text-red-400"}>
                  {String(result.data.payments_table)} {result.data.payments_table_exists ? "✓" : "✗ NO EXISTE"}
                </span></span>
              )}
              {"error" in result.data && (
                <span className="col-span-2 text-red-300">❌ {String(result.data.error)}</span>
              )}
              {"characters_v1" in result.data && (
                <span>⚔️ Personajes v1: <span className="text-white">{String(result.data.characters_v1)}</span></span>
              )}
              {"characters_v2" in result.data && (
                <span>⚔️ Personajes v2: <span className="text-white">{String(result.data.characters_v2)}</span></span>
              )}
            </div>
          )}
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

// ─── Tarjeta de servidor v1/v2 (sin cambios funcionales) ───────────
type ServerCardProps = {
  version: 1 | 2;
  form: ServerConfigData;
  set: (k: keyof ServerConfigData, v: string | number | boolean) => void;
  hasPasswordV1: boolean;
  hasPasswordV2: boolean;
  handleTest: (env: ServerEnv) => () => void;
  isPending: boolean;
};

function ServerCard({ version, form, set, hasPasswordV1, hasPasswordV2, handleTest, isPending }: ServerCardProps) {
  const v = version === 1 ? "v1" : "v2";
  const label = `${version}.0`;
  const borderColor = version === 2 ? "rgba(16,185,129,0.3)" : "rgba(59,130,246,0.3)";
  const accentColor = version === 2 ? "#10b981" : "#3b82f6";
  const hasPwd = version === 2 ? hasPasswordV2 : hasPasswordV1;
  const pwdPlaceholder = hasPwd && form[`db_pass_${v}` as keyof ServerConfigData] === ""
    ? "✓ Contraseña guardada (dejar vacío para no cambiar)"
    : "••••••••••";

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

// ─── Tarjeta Servidor Pruebas (independiente de v1/v2) ─────────────
type TestServerCardProps = {
  form: ServerConfigData;
  set: (k: keyof ServerConfigData, v: string | number | boolean) => void;
  hasPasswordTest: boolean;
  hasShopSecretTest: boolean;
  showShopSecret: boolean;
  setShowShopSecret: (v: boolean) => void;
  isPending: boolean;
  onTestMysql: () => void;
  onTestEndpoint: () => void;
  onGenerateSecret: () => void;
};

function TestServerCard({
  form, set, hasPasswordTest, hasShopSecretTest, showShopSecret, setShowShopSecret,
  isPending, onTestMysql, onTestEndpoint, onGenerateSecret,
}: TestServerCardProps) {
  const accentColor = "#a855f7"; // morado para distinguir de v1/v2
  const borderColor = "rgba(168,85,247,0.35)";
  const pwdPlaceholder = hasPasswordTest && form.db_pass_test === ""
    ? "✓ Contraseña guardada (dejar vacío para no cambiar)"
    : "••••••••••";
  const secretPlaceholder = hasShopSecretTest && form.shop_hmac_secret_test === ""
    ? "✓ Secret guardado (dejar vacío para no cambiar)"
    : "Genera o pega un HMAC secret de 64 hex chars";

  return (
    <div className="bg-[#111] rounded-xl p-6 space-y-5" style={{ border: `1px solid ${borderColor}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4" style={{ color: accentColor }} />
          <h2 className="text-sm font-medium text-white uppercase tracking-wide">Servidor Pruebas</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}55` }}>
            independiente
          </span>
        </div>
        <button
          type="button"
          onClick={onTestMysql}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
          style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}44`, color: accentColor }}
        >
          <Plug className="h-3 w-3" />
          Probar MySQL
        </button>
      </div>

      {/* MySQL */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Host / IP</label>
            <input className={inputCls} placeholder="192.168.1.50"
              value={form.db_host_test}
              onChange={e => set("db_host_test", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Puerto</label>
            <input className={inputCls} type="number" placeholder="3306"
              value={form.db_port_test}
              onChange={e => set("db_port_test", +e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Base de datos</label>
          <input className={inputCls} placeholder="conquer_pruebas"
            value={form.db_name_test}
            onChange={e => set("db_name_test", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Usuario</label>
            <input className={inputCls} placeholder="conquertest"
              value={form.db_user_test}
              onChange={e => set("db_user_test", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Contraseña</label>
            <input className={inputCls} type="password" placeholder={pwdPlaceholder}
              value={form.db_pass_test}
              onChange={e => set("db_pass_test", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Tabla cuentas</label>
            <input className={inputCls} placeholder="accounts"
              value={form.table_accounts_test}
              onChange={e => set("table_accounts_test", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Tabla personajes</label>
            <input className={inputCls} placeholder="topserver_turbo"
              value={form.table_characters_test}
              onChange={e => set("table_characters_test", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Tabla pagos</label>
            <input className={inputCls} placeholder="dbb_payments"
              value={form.table_payments_test}
              onChange={e => set("table_payments_test", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Shop Endpoint */}
      <div className="border-t border-white/10 pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" style={{ color: accentColor }} />
            <h3 className="text-xs font-medium text-white uppercase tracking-wide">Shop endpoint (HTTP listener C#)</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400">
            <input
              type="checkbox"
              checked={form.shop_enabled_test}
              onChange={e => set("shop_enabled_test", e.target.checked)}
              className="accent-purple-500"
            />
            Habilitado
          </label>
        </div>

        <div>
          <label className={labelCls}>URL del endpoint</label>
          <input className={inputCls} placeholder="http://192.168.1.50:8080/shop/"
            value={form.shop_endpoint_test}
            onChange={e => set("shop_endpoint_test", e.target.value)} />
        </div>

        <div>
          <label className={labelCls}>HMAC Secret (compartido con el game server)</label>
          <SecretInput
            value={form.shop_hmac_secret_test}
            onChange={v => set("shop_hmac_secret_test", v)}
            show={showShopSecret}
            onToggle={() => setShowShopSecret(!showShopSecret)}
            placeholder={secretPlaceholder}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Timeout (ms)</label>
            <input className={inputCls} type="number" min={1000} max={30000} step={500}
              value={form.shop_timeout_ms_test}
              onChange={e => set("shop_timeout_ms_test", +e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={onGenerateSecret}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-50 bg-purple-900/20 border border-purple-700/40 text-purple-300 hover:bg-purple-900/40"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Generar secret
            </button>
            <button
              type="button"
              onClick={onTestEndpoint}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
              style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}44`, color: accentColor }}
            >
              <Plug className="h-3.5 w-3.5" />
              Probar endpoint
            </button>
          </div>
        </div>

        <p className="text-[11px] text-gray-500 leading-relaxed">
          El portal firma cada compra con HMAC-SHA256 y la envía como POST al listener.
          Ver <code className="text-purple-300">docs/SHOP_ENDPOINT_SPEC.md</code> para el contrato que debe implementar el cliente C#.
        </p>
      </div>
    </div>
  );
}

// ─── Simulador de compra (admin-only) ──────────────────────────────
function ShopTestRunner({ enabled }: { enabled: boolean }) {
  const [uid,      setUid]      = useState("");
  const [itemId,   setItemId]   = useState("");
  const [cpAmount, setCpAmount] = useState("0");
  const [running,  setRunning]  = useState(false);
  const [outcome,  setOutcome]  = useState<{ ok: boolean; msg: string; data?: unknown } | null>(null);

  const run = async () => {
    setRunning(true);
    setOutcome(null);
    const r = await testShopPurchase({
      uid:      Number(uid),
      itemId:   Number(itemId),
      cpAmount: Number(cpAmount),
    });
    setRunning(false);
    if (r.success) {
      setOutcome({ ok: true, msg: "Compra entregada.", data: r.data });
    } else {
      setOutcome({ ok: false, msg: r.error });
    }
    // Refresca el historial al disparar el evento custom
    window.dispatchEvent(new Event("shop-test:refresh"));
  };

  const valid = Number(uid) > 0 && Number(itemId) > 0 && Number(cpAmount) >= 0;

  return (
    <div className="bg-[#111] rounded-xl p-6 space-y-4" style={{ border: "1px solid rgba(168,85,247,0.35)" }}>
      <div className="flex items-center gap-2">
        <Send className="h-4 w-4 text-purple-400" />
        <h2 className="text-sm font-medium text-white uppercase tracking-wide">Simulador de compra</h2>
        {!enabled && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-700/40">
            shop deshabilitado
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">UID jugador</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50"
            type="number" min={1}
            placeholder="123456"
            value={uid}
            onChange={e => setUid(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Item ID</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50"
            type="number" min={1}
            placeholder="720001"
            value={itemId}
            onChange={e => setItemId(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">CPs a descontar</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50"
            type="number" min={0}
            placeholder="0"
            value={cpAmount}
            onChange={e => setCpAmount(e.target.value)}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={run}
        disabled={!valid || running}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm bg-purple-900/30 border border-purple-700/50 text-purple-200 hover:bg-purple-900/50 transition-colors disabled:opacity-40"
      >
        {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Ejecutar compra de prueba
      </button>

      {outcome && (
        <div className={`px-4 py-3 rounded-lg text-sm border ${
          outcome.ok ? "bg-green-900/20 border-green-800/40 text-green-300" : "bg-red-900/20 border-red-800/40 text-red-300"
        }`}>
          <div className="flex items-center gap-2 font-semibold">
            {outcome.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {outcome.msg}
          </div>
          {outcome.data != null && (
            <pre className="mt-2 text-[11px] font-mono opacity-80 whitespace-pre-wrap break-all">
              {JSON.stringify(outcome.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Historial de compras de prueba ────────────────────────────────
function TestPurchaseHistory() {
  const [rows,    setRows]    = useState<TestPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [retryId, setRetryId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await listTestPurchases();
    setLoading(false);
    if (r.success) setRows(r.data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const onRefresh = () => { void load(); };
    window.addEventListener("shop-test:refresh", onRefresh);
    return () => window.removeEventListener("shop-test:refresh", onRefresh);
  }, []);

  const onRetry = async (id: string) => {
    setRetryId(id);
    await retryTestPurchase(id);
    setRetryId(null);
    load();
  };

  return (
    <div className="bg-[#111] rounded-xl p-6 space-y-3" style={{ border: "1px solid rgba(168,85,247,0.20)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-medium text-white uppercase tracking-wide">Historial de pruebas</h2>
          <span className="text-[10px] text-gray-500">(últimas 50)</span>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-gray-500">Sin pruebas todavía.</p>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wide">
                <th className="px-2 py-1.5">Fecha</th>
                <th className="px-2 py-1.5">UID</th>
                <th className="px-2 py-1.5">Item</th>
                <th className="px-2 py-1.5">CPs</th>
                <th className="px-2 py-1.5">IP</th>
                <th className="px-2 py-1.5">Estado</th>
                <th className="px-2 py-1.5">Intentos</th>
                <th className="px-2 py-1.5">Error</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 text-gray-400 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-2 py-1.5 text-white font-mono">{r.uid}</td>
                  <td className="px-2 py-1.5 text-white font-mono">{r.item_id}</td>
                  <td className="px-2 py-1.5 text-gray-300">{r.cp_amount}</td>
                  <td className="px-2 py-1.5 text-gray-500 font-mono">{r.player_ip ?? "—"}</td>
                  <td className="px-2 py-1.5">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-2 py-1.5 text-gray-400 text-center">{r.delivery_attempts}</td>
                  <td className="px-2 py-1.5 text-red-300 max-w-[200px] truncate" title={r.delivery_error ?? ""}>
                    {r.delivery_error ?? ""}
                  </td>
                  <td className="px-2 py-1.5">
                    {(r.status === "failed" || r.status === "pending") && (
                      <button
                        type="button"
                        onClick={() => onRetry(r.id)}
                        disabled={retryId === r.id}
                        className="px-2 py-1 rounded text-[10px] bg-purple-900/30 border border-purple-700/40 text-purple-300 hover:bg-purple-900/50 disabled:opacity-50"
                      >
                        {retryId === r.id ? "..." : "Reintentar"}
                      </button>
                    )}
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

function StatusBadge({ status }: { status: TestPurchase["status"] }) {
  const map: Record<TestPurchase["status"], { bg: string; border: string; color: string; label: string }> = {
    pending:   { bg: "bg-yellow-900/30",  border: "border-yellow-700/40",  color: "text-yellow-300",  label: "pending" },
    completed: { bg: "bg-green-900/30",   border: "border-green-700/40",   color: "text-green-300",   label: "completed" },
    failed:    { bg: "bg-red-900/30",     border: "border-red-700/40",     color: "text-red-300",     label: "failed" },
    refunded:  { bg: "bg-blue-900/30",    border: "border-blue-700/40",    color: "text-blue-300",    label: "refunded" },
  };
  const s = map[status];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${s.bg} ${s.border} ${s.color}`}>
      {s.label}
    </span>
  );
}

// ─── Tarjeta Shop Endpoint para v1.0 / v2.0 (producción) ───────────
type ShopProdCardProps = {
  version: "v1" | "v2";
  form: ServerConfigData;
  set: (k: keyof ServerConfigData, v: string | number | boolean) => void;
  hasShopSecret: boolean;
  showShopSecret: boolean;
  setShowShopSecret: (v: boolean) => void;
  isPending: boolean;
  onTestEndpoint: () => void;
  onGenerateSecret: () => void;
};

function ShopProdCard({
  version, form, set, hasShopSecret, showShopSecret, setShowShopSecret,
  isPending, onTestEndpoint, onGenerateSecret,
}: ShopProdCardProps) {
  const label = version === "v1" ? "1.0" : "2.0";
  const accentColor = version === "v1" ? "#3b82f6" : "#10b981";
  const borderColor = version === "v1" ? "rgba(59,130,246,0.35)" : "rgba(16,185,129,0.35)";
  const endpointKey = `shop_endpoint_${version}` as keyof ServerConfigData;
  const secretKey   = `shop_hmac_secret_${version}` as keyof ServerConfigData;
  const enabledKey  = `shop_enabled_${version}` as keyof ServerConfigData;
  const timeoutKey  = `shop_timeout_ms_${version}` as keyof ServerConfigData;
  const enabled     = form[enabledKey] as boolean;
  const secretValue = form[secretKey] as string;
  const secretPlaceholder = hasShopSecret && secretValue === ""
    ? "✓ Secret guardado (dejar vacío para no cambiar)"
    : "Genera o pega un HMAC secret de 64 hex chars";

  return (
    <div className="bg-[#111] rounded-xl p-6 space-y-4" style={{ border: `1px solid ${borderColor}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" style={{ color: accentColor }} />
          <h2 className="text-sm font-medium text-white uppercase tracking-wide">Shop endpoint v{label}</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}55` }}>
            producción
          </span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => set(enabledKey, e.target.checked)}
            className={version === "v1" ? "accent-blue-500" : "accent-emerald-500"}
          />
          Habilitado
        </label>
      </div>

      <div>
        <label className={labelCls}>URL del endpoint</label>
        <input className={inputCls} placeholder="http://51.222.254.2:8080/shop/"
          value={form[endpointKey] as string}
          onChange={e => set(endpointKey, e.target.value)} />
      </div>

      <div>
        <label className={labelCls}>HMAC Secret (compartido con el game server)</label>
        <SecretInput
          value={secretValue}
          onChange={v => set(secretKey, v)}
          show={showShopSecret}
          onToggle={() => setShowShopSecret(!showShopSecret)}
          placeholder={secretPlaceholder}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Timeout (ms)</label>
          <input className={inputCls} type="number" min={1000} max={30000} step={500}
            value={form[timeoutKey] as number}
            onChange={e => set(timeoutKey, +e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={onGenerateSecret}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}44`, color: accentColor }}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Generar secret
          </button>
          <button
            type="button"
            onClick={onTestEndpoint}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}44`, color: accentColor }}
          >
            <Plug className="h-3.5 w-3.5" />
            Probar endpoint
          </button>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed">
        Mientras <code className="text-gray-400">enabled</code> esté apagado o la whitelist esté vacía, el botón Comprar
        del market público sigue mostrando &quot;Próximamente&quot; — kill switch instantáneo.
      </p>
    </div>
  );
}

// ─── Whitelist de compradores ─────────────────────────────────────
function ShopBuyerWhitelistCard() {
  const [users, setUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await loadShopBuyerWhitelist();
      setUsers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const addUser = () => {
    const v = draft.trim();
    if (!v) return;
    if (users.some(u => u.toLowerCase() === v.toLowerCase())) {
      setFeedback({ ok: false, msg: `'${v}' ya está en la lista.` });
      setDraft("");
      return;
    }
    setUsers(prev => [...prev, v]);
    setDraft("");
    setFeedback(null);
  };

  const removeUser = (u: string) => {
    setUsers(prev => prev.filter(x => x !== u));
    setFeedback(null);
  };

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    const r = await saveShopBuyerWhitelist(users);
    setFeedback({ ok: r.success, msg: r.message });
    setSaving(false);
    if (r.success) await load();
  };

  return (
    <div className="bg-[#111] rounded-xl p-6 space-y-4" style={{ border: "1px solid rgba(168,85,247,0.30)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-medium text-white uppercase tracking-wide">Whitelist de compradores</h2>
          <span className="text-[10px] text-gray-500">({users.length})</span>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </button>
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed">
        Solo los <strong className="text-purple-300">usernames</strong> de esta lista pueden completar compras en el market público
        de v1.0 / v2.0. El resto de jugadores ven el botón &quot;Próximamente&quot;. Vacía la lista para deshabilitar el feature por completo.
      </p>

      {/* Input + add */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="username (case-insensitive)"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addUser(); } }}
          className={inputCls + " flex-1"}
        />
        <button
          type="button"
          onClick={addUser}
          disabled={!draft.trim()}
          className="px-3 py-2 rounded-lg text-xs bg-purple-900/30 border border-purple-700/40 text-purple-200 hover:bg-purple-900/50 disabled:opacity-40"
        >
          Agregar
        </button>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-1.5 min-h-8">
        {users.length === 0 ? (
          <span className="text-xs text-gray-600 italic">Lista vacía — feature deshabilitado para todos.</span>
        ) : (
          users.map(u => (
            <span
              key={u}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-purple-900/20 border border-purple-700/40 text-purple-200"
            >
              {u}
              <button
                type="button"
                onClick={() => removeUser(u)}
                className="text-purple-400/60 hover:text-red-400 transition-colors"
                title={`Quitar ${u}`}
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-purple-900/30 border border-purple-700/50 text-purple-200 hover:bg-purple-900/50 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar whitelist
        </button>
        {feedback && (
          <span className={`text-xs ${feedback.ok ? "text-green-400" : "text-red-400"}`}>
            {feedback.msg}
          </span>
        )}
      </div>
    </div>
  );
}
