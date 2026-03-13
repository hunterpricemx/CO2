import { getTranslations } from "next-intl/server";
import { getSiteSettings, getVersionAssets } from "@/lib/site-settings";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, CheckCircle2, Coins, AlertCircle, RefreshCcw, Timer } from "lucide-react";
import { getGameSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string; version: string }> };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: "Pendiente",  color: "bg-yellow-900/30 text-yellow-400 border-yellow-700/40",  icon: <Clock className="w-3 h-3" /> },
  paid:     { label: "Pagado",     color: "bg-blue-900/30 text-blue-400 border-blue-700/40",        icon: <RefreshCcw className="w-3 h-3" /> },
  credited: { label: "Listo ↗",   color: "bg-amber-900/30 text-amber-400 border-amber-700/40",     icon: <Coins className="w-3 h-3" /> },
  claimed:  { label: "Canjeado",   color: "bg-green-900/30 text-green-400 border-green-700/40",     icon: <CheckCircle2 className="w-3 h-3" /> },
  refunded: { label: "Reembolsado",color: "bg-red-900/30 text-red-400 border-red-700/40",           icon: <AlertCircle className="w-3 h-3" /> },
  expired:  { label: "Expirado",   color: "bg-gray-800/60 text-gray-500 border-gray-700/40",        icon: <Timer className="w-3 h-3" /> },
};

export default async function DonationHistoryPage({ params }: Props) {
  const { locale, version } = await params;
  const t = await getTranslations("donate");

  const session = await getGameSession();
  if (!session) {
    const returnPath = locale === "es" ? `/${version}/donate/history` : `/${locale}/${version}/donate/history`;
    const loginHref  = locale === "es"
      ? `/${version}/login?next=${encodeURIComponent(returnPath)}`
      : `/${locale}/${version}/login?next=${encodeURIComponent(returnPath)}`;
    redirect(loginHref);
  }

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: donations } = await (supabase as any)
    .from("donations")
    .select("id, character_name, account_name, version, cps_base, cps_total, amount_paid, currency, status, payment_provider, created_at, game_credited_at, claimed_at")
    .eq("account_name", session.username)
    .order("created_at", { ascending: false });

  const rows = (donations ?? []) as {
    id: string; character_name: string; account_name: string | null;
    version: number; cps_base: number; cps_total: number;
    amount_paid: number; currency: string; status: string;
    payment_provider: string; created_at: string;
    game_credited_at: string | null; claimed_at: string | null;
  }[];

  const donateHref = locale === "es" ? `/${version}/donate` : `/${locale}/${version}/donate`;
  const homeHref   = locale === "es" ? `/${version}` : `/${locale}/${version}`;
  const { heroBg, logoSrc } = getVersionAssets(await getSiteSettings(), version);

  const totalCps = rows
    .filter(r => r.status === "credited" || r.status === "claimed")
    .reduce((sum, r) => sum + r.cps_total, 0);
  const totalUsd = rows
    .filter(r => r.status !== "pending" && r.status !== "refunded")
    .reduce((sum, r) => sum + Number(r.amount_paid), 0);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section
        className="relative flex items-center justify-center"
        style={{
          minHeight: "36vh",
          backgroundImage: `url('${heroBg}')`,
          backgroundSize: "cover", backgroundPosition: "50% 24%", backgroundRepeat: "no-repeat",
          paddingTop: "4rem", paddingBottom: "4rem",
        }}
      >
        <div className="absolute inset-0 z-0" style={{ background: "rgba(0,0,0,0.82)" }} />
        <div className="relative z-10 text-center px-4 flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt={`Conquer ${version}`} className="w-32 h-auto mb-1 drop-shadow-xl" />
          <nav className="flex items-center gap-2 font-poppins text-sm text-white/70">
            <Link href={homeHref} className="text-[#ffd700] hover:text-[#ffed4e] transition-colors">{t("breadcrumb_home")}</Link>
            <span>/</span>
            <Link href={donateHref} className="text-[#ffd700] hover:text-[#ffed4e] transition-colors">{t("breadcrumb_donate")}</Link>
            <span>/</span>
            <span>{t("history_title")}</span>
          </nav>
          <h1 className="font-bebas tracking-widest text-white" style={{ fontSize: "3rem", letterSpacing: "3px" }}>
            {t("history_title")}
          </h1>
          <p className="font-poppins text-[#e0e0e0] text-sm">
            {t("history_account")}: <span className="text-[#ffd700] font-semibold">{session.username}</span>
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-5xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Stats */}
        {rows.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-[#141414] border border-[rgba(255,215,0,0.1)] rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("history_total_donations")}</p>
              <p className="text-2xl font-bebas text-white tracking-wider">{rows.length}</p>
            </div>
            <div className="bg-[#141414] border border-[rgba(255,215,0,0.1)] rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("history_total_cps")}</p>
              <p className="text-2xl font-bebas text-[#ffd700] tracking-wider">{totalCps.toLocaleString()}</p>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-[#141414] border border-[rgba(255,215,0,0.1)] rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("history_total_spent")}</p>
              <p className="text-2xl font-bebas text-green-400 tracking-wider">${totalUsd.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-[#111] border border-[rgba(255,215,0,0.08)] rounded-xl overflow-hidden">
          {rows.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Coins className="w-10 h-10 text-gray-700 mx-auto" />
              <p className="text-gray-500 text-sm">{t("history_empty")}</p>
              <Link href={donateHref}
                className="inline-block mt-2 px-5 py-2 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors">
                {t("history_cta")}
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,215,0,0.08)]">
                    {[
                      t("history_col_date"),
                      t("history_col_char"),
                      t("history_col_version"),
                      t("history_col_cps"),
                      t("history_col_amount"),
                      t("history_col_status"),
                    ].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => {
                    const sc = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.pending;
                    return (
                      <tr key={d.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-white/2 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(d.created_at).toLocaleDateString("es-ES", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-white font-medium">{d.character_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                            d.version === 1
                              ? "bg-sky-900/30 text-sky-400 border-sky-700/40"
                              : "bg-purple-900/30 text-purple-400 border-purple-700/40"
                          }`}>
                            v{d.version}.0
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#ffd700] font-semibold">
                          {d.cps_total.toLocaleString()} CP
                        </td>
                        <td className="px-4 py-3 text-green-400 font-semibold">
                          ${Number(d.amount_paid).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${sc.color}`}>
                            {sc.icon}
                            {sc.label}
                          </span>
                          {d.status === "credited" && (
                            <p className="text-[10px] text-gray-600 mt-0.5">{t("history_ready_to_claim")}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="flex justify-center">
          <Link href={donateHref}
            className="text-sm text-gray-500 hover:text-white transition-colors">
            ← {t("history_back")}
          </Link>
        </div>
      </div>
    </div>
  );
}
