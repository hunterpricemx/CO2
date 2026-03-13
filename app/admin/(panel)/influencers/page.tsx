"use client";

import { useMemo, useState } from "react";
import { useList, useDelete } from "@refinedev/core";
import Link from "next/link";
import { Plus, Pencil, Trash2, Instagram, Youtube, Facebook } from "lucide-react";
import type { InfluencerRow } from "@/modules/influencers/types";

const FIELD_CLS =
  "bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12]";

export default function AdminInfluencersPage() {
  const [search, setSearch] = useState("");

  const { query } = useList<InfluencerRow>({
    resource: "influencers",
    sorters: [{ field: "sort_order", order: "asc" }],
    pagination: { pageSize: 200 },
  });

  const { mutate: deleteInfluencer } = useDelete();

  const influencers = useMemo(
    () => (query.data?.data ?? []) as InfluencerRow[],
    [query.data?.data],
  );
  const isLoading = query.isLoading;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return influencers;
    return influencers.filter(
      (inf) =>
        inf.name.toLowerCase().includes(term) ||
        (inf.streamer_code?.toLowerCase().includes(term) ?? false),
    );
  }, [influencers, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-5xl tracking-wider text-white">Influencers</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} de {influencers.length} influencers
          </p>
        </div>
        <Link
          href="/admin/influencers/create"
          className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo influencer
        </Link>
      </div>

      {/* Search bar */}
      <div className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o código de streamer..."
          className={`w-full max-w-md ${FIELD_CLS}`}
        />
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : (
        <div className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,215,0,0.08)]">
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider w-12">
                  Foto
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">
                  Redes
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">
                  Orden
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((inf) => (
                <tr
                  key={inf.id}
                  className="border-b border-[rgba(255,255,255,0.04)] hover:bg-white/2 transition-colors"
                >
                  <td className="px-4 py-3">
                    {inf.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={inf.photo_url}
                        alt={inf.name}
                        className="w-9 h-9 rounded-full object-cover border border-[rgba(255,215,0,0.2)]"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[rgba(255,215,0,0.08)] flex items-center justify-center text-[#f39c12] text-xs font-bold">
                        {inf.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{inf.name}</td>
                  <td className="px-4 py-3">
                    {inf.streamer_code ? (
                      <span className="font-mono text-xs bg-[rgba(255,215,0,0.08)] text-[#f39c12] px-2 py-1 rounded border border-[rgba(255,215,0,0.15)]">
                        {inf.streamer_code}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {inf.facebook_url  && <Facebook  className="h-3.5 w-3.5 text-blue-400" />}
                      {inf.instagram_url && <Instagram className="h-3.5 w-3.5 text-pink-400" />}
                      {inf.tiktok_url    && <span className="text-xs text-white/50 font-bold leading-none">TK</span>}
                      {inf.youtube_url   && <Youtube   className="h-3.5 w-3.5 text-red-400" />}
                      {inf.twitch_url    && <span className="text-xs text-purple-400 font-bold leading-none">TW</span>}
                      {!inf.facebook_url && !inf.instagram_url && !inf.tiktok_url && !inf.youtube_url && !inf.twitch_url && (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{inf.sort_order}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        inf.is_active
                          ? "bg-green-900/30 text-green-400 border-green-800/30"
                          : "bg-gray-800/50 text-gray-500 border-gray-700/30"
                      }`}
                    >
                      {inf.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin/influencers/edit/${inf.id}`}
                        className="p-1.5 text-gray-400 hover:text-[#f39c12] hover:bg-[rgba(243,156,18,0.1)] rounded-lg transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar "${inf.name}"?`)) {
                            deleteInfluencer({ resource: "influencers", id: inf.id });
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-600">
                    {search ? "No se encontraron influencers con ese criterio" : "No hay influencers. ¡Crea el primero!"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
