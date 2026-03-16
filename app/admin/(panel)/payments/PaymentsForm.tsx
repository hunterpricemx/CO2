"use client";

import { useState, useTransition } from "react";
import { CreditCard, Save, CheckCircle, XCircle, ExternalLink, FlaskConical, Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { savePaymentConfig, testStripeConnection, testTebexConnection, getSecretValues, insertManualPayment, insertZeroTebexPurchase, type PaymentConfigData } from "./actions";

type Props = {
  initial: PaymentConfigData | null;
  hasSecrets: { has_stripe_sk_test: boolean; has_stripe_sk_live: boolean; has_tebex_secret: boolean; has_tebex_webhook_secret: boolean };
};

function SecretInput({
  value, onChange, show, onToggle, placeholder,
}: { value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string }) {
  return (
    <div className="relative">
      <input
        className="w-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] rounded-lg pl-3 pr-10 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[rgba(243,156,18,0.5)]"
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function PaymentsForm({ initial, hasSecrets }: Props) {
  const [form, setForm] = useState<PaymentConfigData>({
    stripe_enabled:    initial?.stripe_enabled    ?? false,
    stripe_mode:       initial?.stripe_mode       ?? "test",
    stripe_pk_test:    initial?.stripe_pk_test    ?? "",
    stripe_sk_test:    "",
    stripe_pk_live:    initial?.stripe_pk_live    ?? "",
    stripe_sk_live:    "",
    tebex_enabled:     initial?.tebex_enabled     ?? false,
    tebex_secret:      "",
    tebex_webhook_secret: "",
    tebex_webstore_id: initial?.tebex_webstore_id ?? "",
    tebex_uri_v1:      initial?.tebex_uri_v1      ?? "",
    tebex_uri_v2:      initial?.tebex_uri_v2      ?? "",
    tebex_payment_table: initial?.tebex_payment_table ?? "dbb_payments",
    tebex_category_id: initial?.tebex_category_id ?? "",
    tebex_product_id:  initial?.tebex_product_id  ?? "",
  });

  const [showSkTest,    setShowSkTest]    = useState(false);
  const [showSkLive,    setShowSkLive]    = useState(false);
  const [showTebexSk,   setShowTebexSk]   = useState(false);
  const [showTebexWebhookSk, setShowTebexWebhookSk] = useState(false);
  const [revealed,      setRevealed]      = useState(false);
  const [isRevealing,   setIsRevealing]   = useState(false);
  const [result,        setResult]        = useState<{ ok: boolean; msg: string; extra?: string; debug?: string[] } | null>(null);
  const [isPending,     startTransition]  = useTransition();
  const [manualUsername, setManualUsername] = useState("");
  const [manualVersion, setManualVersion] = useState<1 | 2>(2);

  const set = <K extends keyof PaymentConfigData>(k: K, v: PaymentConfigData[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleReveal = async () => {
    setIsRevealing(true);
    const secrets = await getSecretValues();
    setForm(prev => ({
      ...prev,
      stripe_sk_test: secrets.stripe_sk_test,
      stripe_sk_live: secrets.stripe_sk_live,
      tebex_secret:   secrets.tebex_secret,
      tebex_webhook_secret: secrets.tebex_webhook_secret,
    }));
    setRevealed(true);
    setIsRevealing(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      const r = await savePaymentConfig(form);
      setResult({ ok: r.success, msg: r.message, debug: r.debug });
    });
  };

  const handleInsertManual = () => {
    startTransition(async () => {
      const r = await insertManualPayment({
        username: manualUsername,
        version: manualVersion,
      });

      setResult({ ok: r.success, msg: r.message, debug: r.debug });
      if (r.success) setManualUsername("");
    });
  };

  const handleInsertZeroTebex = () => {
    startTransition(async () => {
      const r = await insertZeroTebexPurchase({
        username: manualUsername,
        version: manualVersion,
      });

      setResult({ ok: r.success, msg: r.message, debug: r.debug });
      if (r.success) setManualUsername("");
    });
  };

  const handleTestStripe = () => {
    startTransition(async () => {
      const r = await testStripeConnection();
      const extra = r.data
        ? `Balance disponible: ${Number(r.data.available) / 100} ${String(r.data.currency)}`
        : undefined;
      setResult({ ok: r.success, msg: r.message, extra, debug: r.debug });
    });
  };

  const handleTestTebex = () => {
    startTransition(async () => {
      const r = await testTebexConnection();
      const extra = r.data
        ? `Tienda: ${String(r.data.name)} · ${String(r.data.currency)} · ${String(r.data.domain)}`
        : undefined;
      setResult({ ok: r.success, msg: r.message, extra, debug: r.debug });
    });
  };

  const inputCls = "w-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[rgba(243,156,18,0.5)]";
  const labelCls = "text-xs text-gray-400 uppercase tracking-wide mb-1 block";

  return (
    <div className="max-w-2xl space-y-6">

      {/* Stripe */}
      <div className="bg-[#111] border border-[rgba(255,255,255,0.06)] rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#635bff]" />
            <h2 className="text-sm font-medium text-white uppercase tracking-wide">Stripe</h2>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-gray-400">{form.stripe_enabled ? "Activo" : "Inactivo"}</span>
            <button
              type="button"
              onClick={() => set("stripe_enabled", !form.stripe_enabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.stripe_enabled ? "bg-[#635bff]" : "bg-[#333]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.stripe_enabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </label>
        </div>

        {form.stripe_enabled && (
          <>
            <div>
              <label className={labelCls}>Modo</label>
              <div className="flex gap-2">
                {(["test", "live"] as const).map(mode => (
                  <button key={mode} type="button" onClick={() => set("stripe_mode", mode)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.stripe_mode === mode
                        ? mode === "test"
                          ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300"
                          : "bg-green-500/20 border-green-500/40 text-green-300"
                        : "bg-transparent border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-gray-300"
                    }`}>
                    {mode === "test" ? "Pruebas" : "Produccion"}
                  </button>
                ))}
              </div>
              {form.stripe_mode === "live" && (
                <p className="text-xs text-yellow-400/70 mt-2">Los keys de produccion procesan pagos reales.</p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Keys de prueba</p>
              <div>
                <label className={labelCls}>Publishable key (test)</label>
                <input className={inputCls} placeholder="pk_test_..." value={form.stripe_pk_test}
                  onChange={e => set("stripe_pk_test", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Secret key (test)</label>
                <SecretInput
                  value={form.stripe_sk_test}
                  onChange={v => set("stripe_sk_test", v)}
                  show={showSkTest}
                  onToggle={() => setShowSkTest(p => !p)}
                  placeholder={hasSecrets.has_stripe_sk_test ? "Guardada - escribe para reemplazar" : "sk_test_..."}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Keys de produccion</p>
              <div>
                <label className={labelCls}>Publishable key (live)</label>
                <input className={inputCls} placeholder="pk_live_..." value={form.stripe_pk_live}
                  onChange={e => set("stripe_pk_live", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Secret key (live)</label>
                <SecretInput
                  value={form.stripe_sk_live}
                  onChange={v => set("stripe_sk_live", v)}
                  show={showSkLive}
                  onToggle={() => setShowSkLive(p => !p)}
                  placeholder={hasSecrets.has_stripe_sk_live ? "Guardada - escribe para reemplazar" : "sk_live_..."}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tebex */}
      <div className="bg-[#111] border border-[rgba(255,255,255,0.06)] rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">cart</span>
            <h2 className="text-sm font-medium text-white uppercase tracking-wide">Tebex</h2>
            <a href="https://www.tebex.io/" target="_blank" rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-400 transition-colors">
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-gray-400">{form.tebex_enabled ? "Activo" : "Inactivo"}</span>
            <button
              type="button"
              onClick={() => set("tebex_enabled", !form.tebex_enabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.tebex_enabled ? "bg-[#f39c12]" : "bg-[#333]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.tebex_enabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </label>
        </div>

        {form.tebex_enabled && (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Webstore ID</label>
              <input className={inputCls} placeholder="xxxxxxxx" value={form.tebex_webstore_id}
                onChange={e => set("tebex_webstore_id", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>URL base V1.0</label>
                <input className={inputCls} placeholder="https://tusitio.com/1.0" value={form.tebex_uri_v1}
                  onChange={e => set("tebex_uri_v1", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>URL base V2.0</label>
                <input className={inputCls} placeholder="https://tusitio.com/2.0" value={form.tebex_uri_v2}
                  onChange={e => set("tebex_uri_v2", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Tabla de pagos</label>
                <input className={inputCls} placeholder="dbb_payments" value={form.tebex_payment_table}
                  onChange={e => set("tebex_payment_table", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Category ID</label>
                <input className={inputCls} placeholder="1406723" value={form.tebex_category_id}
                  onChange={e => set("tebex_category_id", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Product ID</label>
                <input className={inputCls} placeholder="6468425" value={form.tebex_product_id}
                  onChange={e => set("tebex_product_id", e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Los campos de URL/tabla/category/product se guardan para administración y referencia. El checkout headless actual usa el Webstore ID, la private key, el webhook secret y el mapeo por paquete.
            </p>
            <div>
              <label className={labelCls}>Secret key</label>
              <SecretInput
                value={form.tebex_secret}
                onChange={v => set("tebex_secret", v)}
                show={showTebexSk}
                onToggle={() => setShowTebexSk(p => !p)}
                placeholder={hasSecrets.has_tebex_secret ? "Guardada - escribe para reemplazar" : "Private key de Headless API"}
              />
            </div>
            <div>
              <label className={labelCls}>Webhook secret</label>
              <SecretInput
                value={form.tebex_webhook_secret}
                onChange={v => set("tebex_webhook_secret", v)}
                show={showTebexWebhookSk}
                onToggle={() => setShowTebexWebhookSk(p => !p)}
                placeholder={hasSecrets.has_tebex_webhook_secret ? "Guardado - escribe para reemplazar" : "Secret del endpoint webhook"}
              />
            </div>
          </div>
        )}
      </div>

      {/* Insercion manual MariaDB */}
      <div className="bg-[#111] border border-[rgba(255,255,255,0.06)] rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-white uppercase tracking-wide">Insercion manual MariaDB</h2>
          <p className="text-xs text-gray-500 mt-1">
            Inserta un pago manual en la tabla de pagos del servidor seleccionado (1.0 o 2.0).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className={labelCls}>Usuario</label>
            <input
              className={inputCls}
              placeholder="Nombre de usuario de la cuenta"
              value={manualUsername}
              onChange={e => setManualUsername(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Se busca el personaje de este usuario en el servidor elegido y ese personaje se usa para insertar el pago.
            </p>
          </div>

          <div>
            <label className={labelCls}>Servidor</label>
            <select
              className={inputCls}
              value={String(manualVersion)}
              onChange={e => setManualVersion(e.target.value === "1" ? 1 : 2)}
            >
              <option value="1">1.0</option>
              <option value="2">2.0</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleInsertManual}
            disabled={isPending || !manualUsername.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Insertar pago manual
          </button>

          <button
            onClick={handleInsertZeroTebex}
            disabled={isPending || !manualUsername.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
            Compra Tebex $0 (debug)
          </button>
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
            {result.extra && <p className="text-xs opacity-70 mt-0.5">{result.extra}</p>}
            {!!result.debug?.length && (
              <div className="mt-3 rounded-md border border-white/10 bg-black/25 p-3">
                <p className="text-[11px] uppercase tracking-widest opacity-70 mb-2">Debug trace</p>
                <div className="space-y-1 max-h-64 overflow-auto">
                  {result.debug.map((line, idx) => (
                    <p key={`${line}-${idx}`} className="text-xs font-mono opacity-90">{line}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revelar claves guardadas */}
      {!revealed && (hasSecrets.has_stripe_sk_test || hasSecrets.has_stripe_sk_live || hasSecrets.has_tebex_secret || hasSecrets.has_tebex_webhook_secret) && (
        <button
          type="button"
          onClick={handleReveal}
          disabled={isRevealing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] text-gray-300 hover:border-[rgba(255,255,255,0.25)] hover:text-white transition-colors disabled:opacity-50 w-fit"
        >
          {isRevealing ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Revelar claves guardadas
        </button>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-3">
        {form.stripe_enabled && form.stripe_mode === "test" && (
          <button onClick={handleTestStripe} disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 transition-colors disabled:opacity-50">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
            Probar Stripe (test)
          </button>
        )}
        {form.tebex_enabled && (
          <button onClick={handleTestTebex} disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
            Probar Tebex
          </button>
        )}
        <button onClick={handleSave} disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[rgba(243,156,18,0.15)] border border-[rgba(243,156,18,0.3)] text-[#f39c12] hover:bg-[rgba(243,156,18,0.25)] transition-colors disabled:opacity-50">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar configuracion
        </button>
      </div>
    </div>
  );
}
