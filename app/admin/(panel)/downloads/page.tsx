"use client";

import { useList, useDelete } from "@refinedev/core";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";

const VERSION_COLORS: Record<string, string> = {
  "1.0": "bg-blue-900/30 text-blue-400 border-blue-800/30",
  "2.0": "bg-purple-900/30 text-purple-400 border-purple-800/30",
};

const TYPE_COLORS: Record<string, string> = {
  client: "bg-amber-900/30 text-amber-400 border-amber-800/30",
  patch:  "bg-gray-800/50 text-gray-400 border-gray-700/30",
};

type DownloadItem = {
  id: string;
  version: string;
  type: string;
  patch_version?: string | null;
  release_date?: string | null;
  name_es: string;
  url: string;
  file_size?: string | null;
  sort_order: number;
  is_active: boolean;
};

export default function AdminDownloadsPage() {
  const { query } = useList({
    resource: "downloads",
    sorters: [{ field: "version", order: "asc" }, { field: "sort_order", order: "asc" }],
    pagination: { pageSize: 100 },
  });
  const { mutate: del } = useDelete();
  const downloads = (query.data?.data ?? []) as DownloadItem[];
  const isLoading = query.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-5xl tracking-wider text-white">Descargas</h1>
          <p className="text-sm text-gray-500 mt-1">{downloads.length} entradas registradas</p>
        </div>
        <Link
          href="/admin/downloads/create"
          className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus className="h-4 w-4" /> Nueva descarga
        </Link>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : (
        <div className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,215,0,0.1)] text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Ver.</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Tamaño</th>
                <th className="px-4 py-3 text-left">Activo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {downloads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-600">
                    No hay descargas registradas
                  </td>
                </tr>
              )}
              {downloads.map((d) => (
                <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">
                    {d.name_es}
                    {d.patch_version && (
                      <span className="ml-2 text-xs text-gray-500 font-mono">v{d.patch_version}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border ${VERSION_COLORS[d.version] ?? "text-gray-400"}`}>
                      {d.version}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border ${TYPE_COLORS[d.type] ?? "text-gray-400"}`}>
                      {d.type === "client" ? "Cliente" : "Parche"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {d.release_date ? new Date(d.release_date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{d.file_size ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border ${d.is_active ? "bg-green-900/30 text-green-400 border-green-800/30" : "bg-gray-800/50 text-gray-500 border-gray-700/30"}`}>
                      {d.is_active ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin/downloads/edit?id=${d.id}`}
                        className="p-1.5 text-gray-500 hover:text-[#f39c12] hover:bg-[rgba(243,156,18,0.1)] rounded transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm("¿Eliminar esta descarga?")) {
                            del({ resource: "downloads", id: d.id });
                          }
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
