import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getGameSession } from "@/lib/session";
import { getMyPurchasesAction, type MarketPurchase } from "@/modules/market/purchaseActions";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-400/10 border-yellow-400/30 text-yellow-400",
    completed: "bg-green-400/10 border-green-400/30 text-green-400",
    cancelled: "bg-zinc-500/10 border-zinc-500/30 text-zinc-400",
    refunded: "bg-blue-400/10 border-blue-400/30 text-blue-400",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${map[status] ?? map.pending}`}>
      {status}
    </span>
  );
}

type Props = { params: Promise<{ locale: string; version: string }> };

export default async function MarketHistoryPage({ params }: Props) {
  const { locale, version } = await params;
  const session = await getGameSession();
  if (!session) {
    const loginHref = locale === "es" ? `/${version}/login` : `/${locale}/${version}/login`;
    redirect(loginHref);
  }

  const t = await getTranslations("market");
  const result = await getMyPurchasesAction();
  const purchases: MarketPurchase[] = result.success ? result.data : [];

  const marketHref = locale === "es" ? `/${version}/market` : `/${locale}/${version}/market`;
  const homeHref = locale === "es" ? `/${version}` : `/${locale}/${version}`;

  return (
    <div className="min-h-screen" style={{ background: "#080808" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href={homeHref} className="text-gold hover:text-gold/80 transition-colors">
            {t("breadcrumb_home")}
          </Link>
          <span>/</span>
          <Link href={marketHref} className="text-gold hover:text-gold/80 transition-colors">
            {t("breadcrumb_market")}
          </Link>
          <span>/</span>
          <span>{t("history_title")}</span>
        </nav>

        <h1 className="text-2xl font-bold text-foreground mb-2">{t("history_title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          {session.username} · {purchases.length} {t("results_label")}
        </p>

        {purchases.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m5-9v9m4-9v9m3-9l2 9" />
            </svg>
            <p>{t("history_empty")}</p>
            <Link
              href={marketHref}
              className="px-4 py-2 rounded-lg bg-gold/20 border border-gold/30 text-gold text-sm font-semibold hover:bg-gold/30 transition-colors"
            >
              {t("breadcrumb_market")}
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-surface/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm border-collapse">
                <thead>
                  <tr className="bg-surface text-[10px] uppercase tracking-widest text-muted-foreground/50">
                    <th className="px-4 py-3 text-left">{t("history_col_date")}</th>
                    <th className="px-4 py-3 text-left">{t("history_col_item")}</th>
                    <th className="px-4 py-3 text-left">{t("history_col_seller")}</th>
                    <th className="px-4 py-3 text-right">{t("history_col_cost")}</th>
                    <th className="px-4 py-3 text-center">{t("history_col_version")}</th>
                    <th className="px-4 py-3 text-center">{t("history_col_status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`border-t border-white/4 ${i % 2 === 1 ? "bg-white/[0.015]" : ""}`}
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString("es-ES", {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {p.item_name}
                        {p.item_plus > 0 && <span className="text-gold ml-1">+{p.item_plus}</span>}
                        <span className="block text-[10px] text-muted-foreground/50">
                          {p.char_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.seller_name}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gold">
                        {p.cp_cost.toLocaleString("es-ES")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-muted-foreground bg-white/5 border border-white/10 rounded px-2 py-0.5">
                          v{p.version}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={p.status} />
                        {p.admin_note && (
                          <span className="block text-[10px] text-muted-foreground/50 mt-0.5 max-w-[120px] mx-auto truncate" title={p.admin_note}>
                            {p.admin_note}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
