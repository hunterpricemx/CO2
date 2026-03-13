"use client";

import { useState, useTransition } from "react";
import { CreditCard, Save, CheckCircle, XCircle, ExternalLink, FlaskConical, Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { savePaymentConfig, testStripeConnection, getSecretValues, type PaymentConfigData } from "./actions";

type Props = {
  initial: PaymentConfigData | null;
  hasSecrets: { has_stripe_sk_test: boolean; has_stripe_sk_live: boolean; has_tebex_secret: boolean };
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
    tebex_webstore_id: initial?.tebex_webstore_id ?? "",
  });

  const [showSkTest,    setShowSkTest]    = useState(false);
  const [showSkLive,    setShowSkLive]    = useState(false);
  const [showTebexSk,   setShowTebexSk]   = useState(false);
  const [revealed,      setRevealed]      = useState(false);
  const [isRevealing,   setIsRevealing]   = useState(false);
  const [result,        setResult]        = useState<{ ok: boolean; msg: string; extra?: string } | null>(null);
  const [isPending,     startTransition]  = useTransition();

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
    }));
    setRevealed(true);
    setIsRevealing(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      const r = await savePaymentConfig(form);
      setResult({ ok: r.success, msg: r.message });
    });
  };

  const handleTestStripe = () => {
    startTransition(async () => {
      const r = await testStripeConnection();
      const extra = r.data
        ? `Balance disponible: ${Number(r.data.available) / 100} ${String(r.data.currency)}`
        : undefined;
      setResult({ ok: r.success, msg: r.message, extra });
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
            <div>
              <label className={labelCls}>Secret key</label>
              <SecretInput
                value={form.tebex_secret}
                onChange={v => set("tebex_secret", v)}
                show={showTebexSk}
                onToggle={() => setShowTebexSk(p => !p)}
                placeholder={hasSecrets.has_tebex_secret ? "Guardada - escribe para reemplazar" : "t_xxxxxxxx..."}
              />
            </div>
          </div>
        )}
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
          </div>
        </div>
      )}

      {/* Revelar claves guardadas */}
      {!revealed && (hasSecrets.has_stripe_sk_test || hasSecrets.has_stripe_sk_live || hasSecrets.has_tebex_secret) && (
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
        <button onClick={handleSave} disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[rgba(243,156,18,0.15)] border border-[rgba(243,156,18,0.3)] text-[#f39c12] hover:bg-[rgba(243,156,18,0.25)] transition-colors disabled:opacity-50">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar configuracion
        </button>
      </div>
    </div>
  );
}
