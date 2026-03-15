"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X, ShieldAlert, LogIn, AlertCircle, CheckCircle2, ExternalLink,
  User, Loader2, CreditCard,
} from "lucide-react";
import type { PaymentConfig, DonationPackage } from "@/lib/game-db";
import { createStripeCheckout, createTebexCheckout } from "@/app/[locale]/[version]/donate/actions";

// -- Types ---------------------------------------------------------------------

export type DonateLabels = {
  packages_title: string;
  packages_subtitle: string;
  cp_points: string;
  btn_buy: string;
  badge_popular: string;
  badge_best_value: string;
  login_required: string;
  login_link: string;
  npc_title: string;
  npc_text: string;
  npc_caption: string;
  problem_title: string;
  problem_text: string;
  policy_title: string;
  policy_subtitle: string;
  policy_1: string;
  policy_2: string;
  policy_3: string;
  policy_4: string;
  policy_5: string;
  policy_accept: string;
  policy_cancel: string;
  checkout_title: string;
  checkout_text: string;
  checkout_close: string;
  no_payment_methods: string;
  tebex_pay: string;
  tebex_processing: string;
  stripe_test_mode_notice: string;
  char_name_label: string;
  char_name_placeholder: string;
  char_name_required: string;
  stripe_pay: string;
  stripe_processing: string;
  checkout_confirm: string;
};

type ModalState = { pkg: DonationPackage; step: "policy" | "checkout" };

// -- Component -----------------------------------------------------------------

type Props = {
  isLoggedIn: boolean;
  loginHref: string;
  labels: DonateLabels;
  paymentConfig?: PaymentConfig | null;
  packages: DonationPackage[];
  version: string;
  locale: string;
  sessionUsername: string;
};

export function DonateClient({ isLoggedIn, loginHref, labels, paymentConfig, packages, version, locale, sessionUsername }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [charName, setCharName] = useState(sessionUsername);
  const [stripeError, setStripeError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [pendingProvider, setPendingProvider] = useState<"stripe" | "tebex" | null>(null);

  const stripeActive = paymentConfig?.stripe_enabled ?? false;
  const tebexActive  = paymentConfig?.tebex_enabled  ?? false;
  const anyActive    = stripeActive || tebexActive;

  function handleBuy(pkg: DonationPackage) {
    if (!isLoggedIn) {
      router.push(loginHref);
      return;
    }
    setCharName(sessionUsername);
    setStripeError("");
    setModal({ pkg, step: "policy" });
  }

  function handleAccept() {
    if (!modal) return;
    setModal({ ...modal, step: "checkout" });
  }

  function handleStripeCheckout() {
    if (!modal) return;
    if (!charName.trim()) {
      setStripeError(labels.char_name_required);
      return;
    }
    setStripeError("");
    setPendingProvider("stripe");
    startTransition(async () => {
      const result = await createStripeCheckout({
        packageId:    modal.pkg.id,
        packageName:  modal.pkg.name,
        packageCps:   modal.pkg.cps,
        priceUsd:     modal.pkg.price_usd,
        characterName: charName.trim(),
        version,
        locale,
        cpLabel: labels.cp_points,
      });
      if ("url" in result) {
        window.location.href = result.url;
      } else {
        setStripeError(result.error);
        setPendingProvider(null);
      }
    });
  }

  function handleTebexCheckout() {
    if (!modal) return;
    if (!charName.trim()) {
      setStripeError(labels.char_name_required);
      return;
    }

    setStripeError("");
    setPendingProvider("tebex");
    startTransition(async () => {
      const result = await createTebexCheckout({
        packageId: modal.pkg.id,
        characterName: charName.trim(),
        version,
        locale,
      });

      if ("url" in result) {
        window.location.href = result.url;
      } else {
        setStripeError(result.error);
        setPendingProvider(null);
      }
    });
  }

  // Badge assignment: highest CPs = best value, mid = popular
  const sortedPkgs = [...packages].sort((a, b) => b.cps - a.cps);
  const bestValueId = sortedPkgs[0]?.id;
  const popularId   = sortedPkgs[Math.floor(sortedPkgs.length / 2)]?.id;

  return (
    <section className="px-4 py-12 max-w-6xl mx-auto w-full">

      {/* -- Login notice -- */}
      {!isLoggedIn && (
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <LogIn className="w-4 h-4 shrink-0" />
          <span>
            {labels.login_required}{" "}
            <button
              onClick={() => router.push(loginHref)}
              className="underline underline-offset-2 font-semibold hover:text-amber-200 transition-colors"
            >
              {labels.login_link}
            </button>
          </span>
        </div>
      )}

      {/* -- Section title -- */}
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold uppercase tracking-widest text-foreground">
          {labels.packages_title}
        </h2>
        <p className="text-foreground/50 mt-2 text-sm max-w-lg mx-auto">
          {labels.packages_subtitle}
        </p>
      </div>

      {/* -- Package cards -- */}
      {packages.length === 0 ? (
        <p className="text-center text-foreground/40 text-sm py-10">{labels.no_payment_methods}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 justify-items-center">
          {packages.map((pkg) => {
            const badge: "popular" | "value" | undefined =
              pkg.id === bestValueId ? "value" :
              pkg.id === popularId   ? "popular" : undefined;
            const isFeatured = !!badge;

            return (
              <div
                key={pkg.id}
                className={[
                  "relative flex flex-col rounded-2xl border overflow-hidden w-full max-w-56 transition-transform duration-200 hover:-translate-y-1",
                  isFeatured
                    ? "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20"
                    : "border-white/10 bg-white/4",
                ].join(" ")}
              >
                {/* Badge */}
                {(badge || pkg.bonus_label) && (
                  <span className={[
                    "absolute top-2 right-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    badge === "popular" ? "bg-amber-500 text-black" :
                    badge === "value"   ? "bg-violet-500 text-white" :
                                          "bg-green-600 text-white",
                  ].join(" ")}>
                    {pkg.bonus_label ?? (badge === "popular" ? labels.badge_popular : labels.badge_best_value)}
                  </span>
                )}

                {/* Package image */}
                <div className="w-full bg-black/20 flex items-center justify-center min-h-28">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/donate/${pkg.cps}.jpg`}
                    alt={`${pkg.cps.toLocaleString()} ${labels.cp_points}`}
                    className="w-full h-auto object-contain block"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>

                {/* Info */}
                <div className="flex flex-col items-center gap-1 px-4 py-5">
                  <span className="text-2xl font-extrabold text-amber-400">
                    {pkg.cps.toLocaleString()}
                  </span>
                  <span className="text-[11px] uppercase tracking-widest text-foreground/50">
                    {labels.cp_points}
                  </span>
                  <span className="mt-2 text-xl font-semibold text-foreground/90">
                    ${pkg.price_usd.toFixed(2)}{" "}
                    <span className="text-xs font-normal text-foreground/40">USD</span>
                  </span>
                  <button
                    onClick={() => handleBuy(pkg)}
                    className={[
                      "mt-3 w-full rounded-xl py-2 text-sm font-semibold transition-all duration-200",
                      isFeatured
                        ? "bg-amber-500 text-black hover:bg-amber-400"
                        : "bg-white/10 text-foreground hover:bg-white/15",
                    ].join(" ")}
                  >
                    {labels.btn_buy}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* -- NPC redemption info -- */}
      <div className="mt-14 flex flex-col sm:flex-row gap-6 rounded-2xl border border-white/10 bg-white/3 p-6 items-center">
        <div className="flex-1">
          <h3 className="font-bold text-base text-foreground mb-2">{labels.npc_title}</h3>
          <p className="text-foreground/55 text-sm leading-relaxed">{labels.npc_text}</p>
        </div>
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 bg-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/donate/premio-npc.png"
              alt="Premio NPC"
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <p className="text-center text-[11px] text-foreground/40 max-w-28">{labels.npc_caption}</p>
        </div>
      </div>

      {/* -- Problems notice -- */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/8 px-4 py-3">
        <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-blue-300">{labels.problem_title}</p>
          <p className="text-sm text-foreground/50 mt-0.5">{labels.problem_text}</p>
        </div>
      </div>

      {/* -------------------------- MODAL -------------------------- */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)} />

          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden">

            {modal.step === "policy" ? (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <h3 className="font-bold text-foreground leading-tight">{labels.policy_title}</h3>
                      <p className="text-[11px] text-foreground/40">{labels.policy_subtitle}</p>
                    </div>
                  </div>
                  <button onClick={() => setModal(null)} className="text-foreground/40 hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-3 max-h-72 overflow-y-auto">
                  {[labels.policy_1, labels.policy_2, labels.policy_3, labels.policy_4, labels.policy_5].map((text, i) => (
                    <p key={i} className="text-sm text-foreground/70 leading-relaxed">{text}</p>
                  ))}
                </div>

                <div className="px-6 pb-1 text-sm text-foreground/50">
                  <span className="font-semibold text-amber-400">{modal.pkg.cps.toLocaleString()} {labels.cp_points}</span>
                  {" — "}${modal.pkg.price_usd.toFixed(2)} USD
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-white/10">
                  <button onClick={() => setModal(null)} className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-foreground/60 hover:bg-white/5 transition-colors">
                    {labels.policy_cancel}
                  </button>
                  <button onClick={handleAccept} className="flex-1 rounded-xl bg-amber-500 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition-colors">
                    {labels.policy_accept}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    <h3 className="font-bold text-foreground">{labels.checkout_title}</h3>
                  </div>
                  <button onClick={() => setModal(null)} className="text-foreground/40 hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                  <p className="text-foreground/60 text-sm text-center">
                    <span className="font-semibold text-amber-400">{modal.pkg.cps.toLocaleString()} {labels.cp_points}</span>
                    {" — "}${modal.pkg.price_usd.toFixed(2)} USD
                  </p>

                  {anyActive ? (
                    <>
                      {/* Character name — pre-filled from session, read-only */}
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          {labels.char_name_label}
                        </label>
                        <div className="w-full bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-amber-400 font-semibold">
                          {charName}
                        </div>
                      </div>

                      {/* Confirmation summary */}
                      <p className="text-xs text-green-400/80 bg-green-900/20 border border-green-800/30 rounded-lg px-3 py-2 text-center leading-relaxed">
                        {labels.checkout_confirm
                          .replace("%cps%", modal.pkg.cps.toLocaleString())
                          .replace("%server%", `V${version}`)
                          .replace("%name%", charName)
                        }
                      </p>

                      {/* Stripe error */}
                      {stripeError && (
                        <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">{stripeError}</p>
                      )}

                      {/* Tebex button */}
                      {tebexActive && paymentConfig?.tebex_webstore_id && (
                        <button
                          onClick={handleTebexCheckout}
                          disabled={isPending}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors disabled:opacity-60"
                        >
                          {isPending && pendingProvider === "tebex"
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> {labels.tebex_processing}</>
                            : <><ExternalLink className="h-3.5 w-3.5" /> {labels.tebex_pay}</>
                          }
                        </button>
                      )}

                      {/* Stripe button */}
                      {stripeActive && (
                        <>
                          {paymentConfig?.stripe_mode === "test" && (
                            <p className="text-xs text-yellow-400/70 text-center">{labels.stripe_test_mode_notice}</p>
                          )}
                          <button
                            onClick={handleStripeCheckout}
                            disabled={isPending}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#635bff] hover:bg-[#5146e8] py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                          >
                            {isPending && pendingProvider === "stripe"
                              ? <><Loader2 className="h-4 w-4 animate-spin" /> {labels.stripe_processing}</>
                              : <><CreditCard className="h-4 w-4" /> {labels.stripe_pay}</>
                            }
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="text-foreground/50 text-sm leading-relaxed text-center">
                      {labels.no_payment_methods}
                    </p>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-white/10">
                  <button onClick={() => setModal(null)} className="w-full rounded-xl bg-white/10 py-2 text-sm text-foreground hover:bg-white/15 transition-colors">
                    {labels.checkout_close}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
