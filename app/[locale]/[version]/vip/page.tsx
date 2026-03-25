import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getSiteSettings, getVersionAssets, buildPageSeo } from "@/lib/site-settings";
import type { Metadata } from "next";
import { getGameSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return buildPageSeo(settings, "vip", "VIP System");
}

type Props = { params: Promise<{ locale: string; version: string }> };

// ── VIP config ────────────────────────────────────────────────────────────────

const VIP_THRESHOLDS = [0, 0.99, 199, 399, 999, 1500, 2000] as const;

function getVipLevel(total: number): number {
  if (total >= 2000) return 6;
  if (total >= 1500) return 5;
  if (total >= 999)  return 4;
  if (total >= 399)  return 3;
  if (total >= 199)  return 2;
  if (total >= 0.99) return 1;
  return 0;
}

// Hex colors for each level (1-indexed, 0 = no VIP)
const VIP_HEX = ["", "#cd7f32", "#4fc3f7", "#81c784", "#ce93d8", "#ff7043", "#ffd700"] as const;

// Tailwind badge classes per level
const VIP_BADGE: Record<number, string> = {
  0: "bg-gray-800/40 text-gray-400 border-gray-600/40",
  1: "bg-amber-900/30 text-amber-500 border-amber-600/50",
  2: "bg-sky-900/30 text-sky-400 border-sky-500/50",
  3: "bg-emerald-900/30 text-emerald-400 border-emerald-500/50",
  4: "bg-purple-900/30 text-purple-400 border-purple-500/50",
  5: "bg-orange-900/30 text-orange-400 border-orange-500/50",
  6: "bg-yellow-900/20 text-[#ffd700] border-yellow-500/50",
};

// Price label per level
const VIP_PRICE = ["", "$0.99", "$199", "$399", "$999", "$1,500", "$2,000"] as const;

// Benefit key count per level
const BENEFIT_COUNTS = [0, 5, 5, 5, 6, 4, 4] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function VipPage({ params }: Props) {
  const { locale, version } = await params;
  const t = await getTranslations("vip");
  const tn = await getTranslations("nav");

  const session = await getGameSession();

  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);
  const lp = (path: string) => locale === "es" ? path : `/${locale}${path}`;
  const homeHref = lp(`/${version}`);

  // ── Fetch VIP data (only when logged in) ────────────────────────────────────
  let totalDonated = 0;
  let vipLevel = 0;

  if (session) {
    try {
      const supabase = await createAdminClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("donations")
        .select("amount_paid, status")
        .eq("account_name", session.username);
      const rows = (data ?? []) as { amount_paid: number | string; status: string }[];
      totalDonated = rows
        .filter(r => r.status === "credited" || r.status === "claimed")
        .reduce((sum, r) => sum + Number(r.amount_paid), 0);
      vipLevel = getVipLevel(totalDonated);
    } catch {
      // Supabase unreachable — show page without VIP status
    }
  }

  const nextLevel = vipLevel < 6 ? vipLevel + 1 : null;
  const nextThreshold = nextLevel ? VIP_THRESHOLDS[nextLevel] : null;
  const amountNeeded = nextThreshold ? Math.max(0, nextThreshold - totalDonated) : 0;

  // Progress bar percentage toward next threshold
  const prevThreshold = VIP_THRESHOLDS[vipLevel] as number;
  const progressPct =
    nextThreshold && nextThreshold > prevThreshold
      ? Math.min(100, ((totalDonated - prevThreshold) / (nextThreshold - prevThreshold)) * 100)
      : vipLevel === 6
        ? 100
        : 0;

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section
        className="relative flex flex-col items-center justify-end overflow-hidden"
        style={{ minHeight: "320px" }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('${heroBg}')`,
            backgroundSize: "cover",
            backgroundPosition: "50% 24%",
          }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.80)" }} />

        <div className="relative z-10 flex flex-col items-center gap-3 pb-10 text-center px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Conquer" className="w-36 drop-shadow-xl mb-2" />
          <p className="text-sm">
            <Link href={homeHref} className="text-gold hover:text-gold-light transition-colors">
              {tn("home")}
            </Link>
            <span className="mx-2 text-white/40">›</span>
            <span className="text-white/70">{t("breadcrumb_vip")}</span>
          </p>
          <h1
            className="font-bebas uppercase tracking-widest text-white leading-none"
            style={{ fontSize: "3.5rem" }}
          >
            {t("hero_title")}
          </h1>
          <p className="font-poppins text-white/70 text-base max-w-lg">{t("hero_subtitle")}</p>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="px-4 py-12" style={{ background: "#080808", minHeight: "50vh" }}>
        <div className="container mx-auto max-w-5xl flex flex-col gap-8">

          {/* ── VIP Status card (logged-in only) ── */}
          {session ? (
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(26,26,26,0.9)",
                border: `1px solid ${vipLevel > 0 ? VIP_HEX[vipLevel] + "55" : "rgba(255,215,0,0.2)"}`,
              }}
            >
              <h2 className="font-bebas text-2xl tracking-widest text-gold mb-4">{t("your_status")}</h2>
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                {/* Badge */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center font-bebas text-2xl border-2"
                    style={{
                      background: vipLevel > 0 ? VIP_HEX[vipLevel] + "22" : "rgba(255,255,255,0.05)",
                      borderColor: vipLevel > 0 ? VIP_HEX[vipLevel] : "rgba(255,255,255,0.15)",
                      color: vipLevel > 0 ? VIP_HEX[vipLevel] : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {vipLevel === 0 ? "—" : `V${vipLevel}`}
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border font-poppins ${VIP_BADGE[vipLevel]}`}
                  >
                    {vipLevel === 0 ? t("no_vip") : `VIP ${vipLevel}`}
                  </span>
                </div>

                {/* Stats + progress */}
                <div className="flex-1 flex flex-col gap-3 w-full">
                  <div className="flex justify-between font-poppins text-sm">
                    <span className="text-white/60">{t("total_donated")}</span>
                    <span className="text-white font-semibold">${totalDonated.toFixed(2)}</span>
                  </div>

                  {vipLevel < 6 ? (
                    <>
                      <div className="w-full rounded-full overflow-hidden" style={{ height: "6px", background: "rgba(255,255,255,0.08)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progressPct}%`,
                            background: VIP_HEX[nextLevel ?? 1],
                          }}
                        />
                      </div>
                      <p className="font-poppins text-xs text-white/50">
                        {t("next_level_needed")
                          .replace("%amount%", amountNeeded.toFixed(2))
                          .replace("%level%", String(nextLevel))}
                      </p>
                    </>
                  ) : (
                    <p className="font-poppins text-sm font-bold" style={{ color: "#ffd700" }}>
                      {t("max_level")}
                    </p>
                  )}

                  {vipLevel === 0 && (
                    <p className="font-poppins text-xs text-white/40">{t("no_vip_hint")}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── Login hint (not logged in) ── */
            <div
              className="rounded-2xl p-5 flex items-center gap-4"
              style={{ background: "rgba(26,26,26,0.9)", border: "1px solid rgba(255,215,0,0.15)" }}
            >
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold text-lg shrink-0">
                ✦
              </div>
              <p className="font-poppins text-sm text-white/60">
                {t("login_hint")}{" "}
                <Link
                  href={lp(`/${version}/login?next=${lp(`/${version}/vip`)}`)}
                  className="text-gold hover:text-gold-light underline underline-offset-2 transition-colors"
                >
                  {tn("login")}
                </Link>
              </p>
            </div>
          )}

          {/* ── Intro text ── */}
          <p className="font-poppins text-sm text-white/50 text-center px-4">{t("intro_text")}</p>

          {/* ── Levels grid ── */}
          <div>
            <h2 className="font-bebas text-3xl tracking-widest text-gold mb-6">{t("levels_title")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {([1, 2, 3, 4, 5, 6] as const).map((lvl) => {
                const isCurrentLevel = vipLevel === lvl;
                const isUnlocked = vipLevel >= lvl;
                const hex = VIP_HEX[lvl];
                const count = BENEFIT_COUNTS[lvl];
                const benefits: string[] = [];
                for (let i = 1; i <= count; i++) {
                  benefits.push(t(`level_${lvl}_b${i}` as Parameters<typeof t>[0]));
                }

                return (
                  <div
                    key={lvl}
                    className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
                    style={{
                      background: "rgba(26,26,26,0.9)",
                      border: isCurrentLevel
                        ? `2px solid ${hex}`
                        : `1px solid ${isUnlocked ? hex + "44" : "rgba(255,255,255,0.08)"}`,
                      boxShadow: isCurrentLevel ? `0 0 20px ${hex}33` : "none",
                    }}
                  >
                    {/* Colored top bar */}
                    <div
                      className="h-1.5 w-full shrink-0"
                      style={{ background: isUnlocked ? hex : "rgba(255,255,255,0.08)" }}
                    />

                    <div className="p-5 flex flex-col gap-3 flex-1">
                      {/* Header row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bebas text-xl tracking-widest"
                            style={{ color: isUnlocked ? hex : "rgba(255,255,255,0.25)" }}
                          >
                            VIP {lvl}
                          </span>
                          {isCurrentLevel && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full font-poppins"
                              style={{ background: hex + "33", color: hex, border: `1px solid ${hex}55` }}
                            >
                              ✓ Tu nivel
                            </span>
                          )}
                        </div>
                        <span
                          className="font-poppins text-xs font-semibold"
                          style={{ color: isUnlocked ? hex : "rgba(255,255,255,0.2)" }}
                        >
                          {t("from_price")} {VIP_PRICE[lvl]}
                        </span>
                      </div>

                      {/* Benefits list */}
                      <ul className="flex flex-col gap-1.5 font-poppins text-xs flex-1">
                        {benefits.map((b, i) => (
                          <li key={i} className="flex gap-2 items-start">
                            <span
                              className="shrink-0 mt-0.5"
                              style={{ color: isUnlocked ? hex : "rgba(255,255,255,0.2)" }}
                            >
                              ▸
                            </span>
                            <span className={isUnlocked ? "text-white/80" : "text-white/30"}>
                              {b}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── CTA row ── */}
          <div className="flex flex-col sm:flex-row gap-3 mt-2 justify-center">
            <Link
              href={lp(`/${version}/donate`)}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-sm bg-gold hover:bg-gold-dark text-background transition-colors shadow-lg font-poppins"
            >
              {t("cta_donate")}
            </Link>
            {session && (
              <Link
                href={lp(`/${version}/donate/history`)}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-sm border border-gold/40 text-gold hover:bg-gold/10 transition-colors font-poppins"
              >
                {t("cta_history")}
              </Link>
            )}
          </div>

        </div>
      </section>
    </div>
  );
}
