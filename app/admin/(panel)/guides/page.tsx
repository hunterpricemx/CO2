"use client";

import { useList, useDelete } from "@refinedev/core";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { InfluencerRow } from "@/modules/influencers/types";
import type { GuideRow } from "@/modules/guides/types";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-900/30 text-green-400 border-green-800/30",
  draft: "bg-yellow-900/30 text-yellow-400 border-yellow-800/30",
  archived: "bg-gray-800/50 text-gray-500 border-gray-700/30",
};

export default function AdminGuidesPage() {
  const { query } = useList({
    resource: "guides",
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 50 },
  });
  const { query: influencersQuery } = useList<InfluencerRow>({
    resource: "influencers",
    sorters: [{ field: "sort_order", order: "asc" }],
    pagination: { pageSize: 200 },
  });
  const { mutate: del } = useDelete();
  const guides = (query.data?.data ?? []) as GuideRow[];
  const influencers = (influencersQuery.data?.data ?? []) as InfluencerRow[];
  const isLoading = query.isLoading;

  function getAuthorName(id: string | null) {
    if (!id) return "Sin autor";
    return influencers.find((influencer) => influencer.id === id)?.name ?? "Influencer no encontrado";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-5xl tracking-wider text-white">Guías</h1>
          <p className="text-sm text-gray-500 mt-1">{guides.length} guías registradas</p>
        </div>
        <Link
          href="/admin/guides/create"
          className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus className="h-4 w-4" /> Nueva guía
        </Link>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : (
        <div className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,215,0,0.08)]">
                {["Slug", "Título", "Autor", "Versión", "Estado", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guides.map((g) => (
                <tr key={g.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-white/2">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{g.slug}</td>
                  <td className="px-4 py-3 text-white">{g.title_es}</td>
                  <td className="px-4 py-3 text-gray-300">{getAuthorName(g.author_influencer_id)}</td>
                  <td className="px-4 py-3 text-gray-400">{g.version}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[g.status] ?? ""}`}>{g.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/admin/guides/edit/${g.id}`} className="p-1.5 text-gray-400 hover:text-[#f39c12] hover:bg-[rgba(243,156,18,0.1)] rounded-lg transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button onClick={() => confirm(`¿Eliminar "${g.title_es}"?`) && del({ resource: "guides", id: g.id })} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {guides.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600">No hay guías</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
