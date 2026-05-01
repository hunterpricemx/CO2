import { ShoppingCart, FlaskConical } from "lucide-react";
import Link from "next/link";
import { requireAdminPanelAccess } from "@/lib/admin/auth";
import { getTestMarketItems } from "@/modules/shop-test";
import { getCpMarketRate } from "@/lib/game-db";
import { AdminMarketSimulator } from "./AdminMarketSimulator";

export const metadata = { title: "Mercado Pruebas — Admin" };
export const dynamic = "force-dynamic";

export default async function TestMarketPage() {
  await requireAdminPanelAccess("gameServer");

  const [marketRes, cpRate] = await Promise.all([
    getTestMarketItems(200),
    getCpMarketRate(),
  ]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bebas tracking-widest text-white flex items-center gap-2">
              Mercado Pruebas
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-300 border border-purple-700/40 font-normal tracking-normal">
                end-to-end
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Lee <code className="text-purple-300">marketlogs</code> del server pruebas y simula el journey completo (deduct → POST firmado → entrega o refund) actuando como cualquier UID real.
            </p>
          </div>
        </div>
        <Link
          href="/admin/game-server"
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-1.5"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Configuración del shop
        </Link>
      </div>

      {!marketRes.success ? (
        <div className="bg-red-900/20 border border-red-800/40 text-red-300 rounded-lg px-4 py-3 text-sm">
          {marketRes.error}
          <p className="text-xs text-red-400/70 mt-1">
            Asegúrate de tener configurado el server pruebas en <Link href="/admin/game-server" className="underline">Admin → Game Server</Link>.
          </p>
        </div>
      ) : (
        <AdminMarketSimulator items={marketRes.data} cpRate={cpRate} />
      )}
    </div>
  );
}
