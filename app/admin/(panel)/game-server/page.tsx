import { Server } from "lucide-react";
import { getServerConfig } from "./actions";
import { GameServerForm } from "./GameServerForm";

export const metadata = { title: "Game Server — Admin" };

export default async function GameServerPage() {
  const config = await getServerConfig();

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Server className="h-6 w-6 text-[#f39c12]" />
        <div>
          <h1 className="text-2xl font-bebas tracking-widest text-white">Game Server</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Conexión al servidor de juego (MariaDB) y sincronización con Supabase
          </p>
        </div>
      </div>

      <GameServerForm initial={config as any} />
    </div>
  );
}
