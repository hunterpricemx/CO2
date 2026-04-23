"use client";

import { useDelete, useList } from "@refinedev/core";
import Link from "next/link";
import { Plus, Pencil, Trash2, Clapperboard, ExternalLink } from "lucide-react";
import { isTikTokUrl } from "@/lib/video";
import type { InfluencerRow } from "@/modules/influencers/types";
import type { GuideRow } from "@/modules/guides/types";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-900/30 text-green-400 border-green-800/30",
  draft: "bg-yellow-900/30 text-yellow-400 border-yellow-800/30",
  archived: "bg-gray-800/50 text-gray-500 border-gray-700/30",
};

export default function AdminTutorialsPage() {
  const { query } = useList({
    resource: "guides",
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 100 },
  });
  const { query: influencersQuery } = useList<InfluencerRow>({
    resource: "influencers",
    sorters: [{ field: "sort_order", order: "asc" }],
    pagination: { pageSize: 200 },
  });
  const { mutate: del } = useDelete();

  const tutorials = ((query.data?.data ?? []) as GuideRow[]).filter((guide) => isTikTokUrl(guide.video_url));
  const influencers = (influencersQuery.data?.data ?? []) as InfluencerRow[];
  const isLoading = query.isLoading;

  function getAuthorName(id: string | null) {
    if (!id) return "Sin autor";
    return influencers.find((influencer) => influencer.id === id)?.name ?? "Influencer no encontrado";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-bebas text-5xl tracking-wider text-white">Video Tutoriales</h1>
          <p className="mt-1 text-sm text-gray-500">{tutorials.length} tutoriales detectados desde guías con URL de TikTok</p>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-500">
            Para que un contenido aparezca aquí, crea o edita una guía y pega una URL completa de TikTok en el campo de video.
          </p>
        </div>

        <Link
          href="/admin/guides/create"
          className="flex items-center gap-2 rounded-lg bg-[#f39c12] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#e67e22]"
        >
          <Plus className="h-4 w-4" /> Nuevo video tutorial
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : tutorials.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[rgba(255,215,0,0.1)] bg-[#1a1a1a] px-6 py-14 text-center">
          <Clapperboard className="h-10 w-10 text-gray-600" />
          <p className="text-sm text-gray-400">No hay video tutoriales todavía.</p>
          <Link
            href="/admin/guides/create"
            className="inline-flex items-center gap-2 text-sm text-[#f39c12] transition-colors hover:text-[#f1c16b]"
          >
            Crear el primero
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[rgba(255,215,0,0.1)] bg-[#1a1a1a]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,215,0,0.08)]">
                {["Slug", "Título", "Autor", "Versión", "Estado", "Video", ""].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {tutorials.map((tutorial) => (
                <tr key={tutorial.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-white/2">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{tutorial.slug}</td>
                  <td className="px-4 py-3 text-white">{tutorial.title_es}</td>
                  <td className="px-4 py-3 text-gray-300">{getAuthorName(tutorial.author_influencer_id)}</td>
                  <td className="px-4 py-3 text-gray-400">{tutorial.version}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_COLORS[tutorial.status] ?? ""}`}>
                      {tutorial.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tutorial.video_url ? (
                      <a
                        href={tutorial.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#f39c12] transition-colors hover:text-[#f1c16b]"
                      >
                        TikTok
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-600">Sin video</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/guides/edit/${tutorial.id}`}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-[rgba(243,156,18,0.1)] hover:text-[#f39c12]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => confirm(`¿Eliminar "${tutorial.title_es}"?`) && del({ resource: "guides", id: tutorial.id })}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-900/20 hover:text-red-400"
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
