import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getGameSession } from "@/lib/session";
import { getSiteSettings } from "@/lib/site-settings";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Mis Pedidos de Garments" };

type Props = { params: Promise<{ locale: string; version: string }> };

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "Pendiente de pago",  cls: "bg-yellow-900/30 text-yellow-400 border-yellow-700/40" },
  paid:            { label: "Pago confirmado",    cls: "bg-blue-900/30 text-blue-400 border-blue-700/40" },
  in_progress:     { label: "En elaboración",    cls: "bg-purple-900/30 text-purple-400 border-purple-700/40" },
  delivered:       { label: "Entregado",          cls: "bg-emerald-900/30 text-emerald-400 border-emerald-700/40" },
  cancelled:       { label: "Cancelado",          cls: "bg-gray-800/60 text-gray-500 border-gray-700/40" },
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function GarmentOrdersPage({ params }: Props) {
  const { locale, version } = await params;
  const t = await getTranslations("garments");

  const settings = await getSiteSettings();
  if (!settings.garments_enabled) {
    redirect(locale === "es" ? `/${version}` : `/${locale}/${version}`);
  }

  const session = await getGameSession();
  if (!session) {
    const lp = locale === "es" ? "" : `/${locale}`;
    redirect(`${lp}/${version}/login?next=${encodeURIComponent(`${lp}/${version}/garments/orders`)}`);
  }

  const supabase = await createAdminClient();

  type GarmentOrderRow = {
    id: string;
    garment_name: string;
    character_name: string;
    version: number;
    is_custom: boolean;
    amount_paid: number;
    currency: string;
    status: string;
    admin_notes: string | null;
    delivered_at: string | null;
    created_at: string;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawOrders } = await (supabase as any)
    .from("garment_orders")
    .select("id, garment_name, character_name, version, is_custom, amount_paid, currency, status, admin_notes, delivered_at, created_at")
    .eq("account_name", session.username)
    .order("created_at", { ascending: false });

  const orders: GarmentOrderRow[] = (rawOrders ?? []) as GarmentOrderRow[];

  const lp = locale === "es" ? "" : `/${locale}`;
  const backHref = `${lp}/${version}/garments`;

  return (
    <main className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={backHref}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← {t("btn_order")} tienda
        </Link>
      </div>

      <h1 className="font-bebas text-5xl tracking-wider text-white mb-6">
        {t("orders_link")}
      </h1>

      {orders.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl gap-4"
          style={{ background: "rgba(15,5,3,0.9)", border: "1px solid rgba(255,215,0,0.1)" }}
        >
          <p className="text-gray-500 text-sm">No tienes pedidos de garments aún.</p>
          <Link
            href={backHref}
            className="bg-[#f39c12] hover:bg-[#e67e22] text-black font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const sc = STATUS_CFG[order.status] ?? { label: order.status, cls: "bg-gray-800/60 text-gray-500 border-gray-700/40" };
            return (
              <div
                key={order.id}
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ background: "rgba(15,5,3,0.9)", border: "1px solid rgba(255,215,0,0.1)" }}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{order.garment_name}</span>
                      {order.is_custom && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/30">
                          Personalizado
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {order.character_name} · v{order.version}.0
                    </span>
                    <p className="text-xs text-gray-600 mt-0.5">{fmtDate(order.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sc.cls}`}>
                      {sc.label}
                    </span>
                    <span className="text-xs text-[#f39c12] font-semibold">
                      ${order.amount_paid} {order.currency}
                    </span>
                  </div>
                </div>

                {order.admin_notes && (
                  <div className="bg-[#1a1a1a] rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Nota del equipo</p>
                    <p className="text-sm text-gray-300">{order.admin_notes}</p>
                  </div>
                )}

                {order.delivered_at && (
                  <p className="text-xs text-emerald-400">
                    ✓ Entregado el {fmtDate(order.delivered_at)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
