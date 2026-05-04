import { History } from "lucide-react";
import Link from "next/link";
import { requireAdminPanelAccess } from "@/lib/admin/auth";
import { PurchaseHistoryClient } from "./PurchaseHistoryClient";

export const metadata = { title: "Historial de Compras Pruebas — Admin" };
export const dynamic = "force-dynamic";

export default async function PurchaseHistoryPage() {
  await requireAdminPanelAccess("gameServer");

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bebas tracking-widest text-white flex items-center gap-2">
              Historial de Compras
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-300 border border-purple-700/40 font-normal tracking-normal">
                test-market
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Todas las compras del simulador admin con filtros, paginación y JSON completo del request/response del listener C#.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/game-server/test-market"
            className="text-xs px-3 py-1.5 rounded-lg bg-purple-900/20 border border-purple-700/40 text-purple-300 hover:bg-purple-900/40 transition-colors"
          >
            Simulador
          </Link>
          <Link
            href="/admin/game-server"
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
          >
            Configuración
          </Link>
        </div>
      </div>

      <PurchaseHistoryClient />
    </div>
  );
}
