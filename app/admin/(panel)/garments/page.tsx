"use client";

import { useState, useTransition } from "react";
import { useList } from "@refinedev/core";
import Link from "next/link";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ShoppingBag, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { toggleGarmentActive, deleteGarment } from "./actions";

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/|)(\d+)/);
  return m?.[1] ?? null;
}

type Garment = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  active: boolean;
  allows_custom: boolean;
  sort_order: number;
  created_at: string;
};

export default function AdminGarmentsPage() {
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { query } = useList<Garment>({
    resource: "garments",
    sorters: [{ field: "sort_order", order: "asc" }, { field: "created_at", order: "desc" }],
    pagination: { pageSize: 200 },
  });

  const garments = (query.data?.data ?? []) as Garment[];
  const isLoading = query.isLoading;

  function handleToggle(id: string, currentActive: boolean) {
    setTogglingId(id);
    startTransition(async () => {
      const result = await toggleGarmentActive(id, !currentActive);
      if (result.success) {
        toast.success(currentActive ? "Garment desactivado." : "Garment activado.");
        query.refetch();
      } else {
        toast.error(result.error ?? "Error al cambiar estado.");
      }
      setTogglingId(null);
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar el garment "${name}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteGarment(id);
      if (result.success) {
        toast.success("Garment eliminado.");
        query.refetch();
      } else {
        toast.error(result.error ?? "Error al eliminar.");
      }
      setDeletingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-5xl tracking-wider text-white">Garments</h1>
          <p className="text-sm text-gray-500 mt-1">{garments.length} trajes en el catálogo</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/garments/orders"
            className="flex items-center gap-2 border border-[rgba(255,215,0,0.3)] text-[#f39c12] hover:bg-[rgba(243,156,18,0.1)] font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            Órdenes
          </Link>
          <Link
            href="/admin/garments/create"
            className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo Garment
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Cargando garments...</p>
      ) : garments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl">
          <ShoppingBag className="h-14 w-14 text-gray-700" />
          <p className="text-gray-500 text-sm">No hay garments en el catálogo.</p>
          <Link
            href="/admin/garments/create"
            className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Crear primer garment
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {garments.map((g) => (
            <div
              key={g.id}
              className={`bg-[#1a1a1a] border rounded-xl overflow-hidden flex flex-col transition-opacity ${
                g.active
                  ? "border-[rgba(255,215,0,0.15)]"
                  : "border-[rgba(255,255,255,0.05)] opacity-60"
              }`}
            >
              {/* Image */}
              <div className="relative h-40 bg-black shrink-0">
                {g.image_url ? (
                  (() => {
                    const vimeoId = getVimeoId(g.image_url);
                    if (vimeoId) return (
                      <iframe
                        src={`https://player.vimeo.com/video/${vimeoId}?badge=0&loop=1&autoplay=1&muted=1&background=1&controls=0`}
                        className="absolute inset-0 w-full h-full"
                        allow="autoplay; fullscreen"
                        title={g.name}
                      />
                    );
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={g.image_url}
                        alt={g.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    );
                  })()
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ShoppingBag className="h-12 w-12 text-gray-700" />
                  </div>
                )}
                {/* Active badge */}
                <span
                  className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    g.active
                      ? "bg-emerald-900/70 text-emerald-400 border-emerald-700/40"
                      : "bg-gray-800/70 text-gray-500 border-gray-700/40"
                  }`}
                >
                  {g.active ? "Activo" : "Inactivo"}
                </span>
                {g.allows_custom && (
                  <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/70 text-purple-300 border border-purple-700/40">
                    Custom
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="flex flex-col gap-3 p-3 flex-1">
                <div>
                  <p className="text-sm font-semibold text-white leading-tight line-clamp-1">{g.name}</p>
                  {g.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{g.description}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">Orden: {g.sort_order}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-auto">
                  <button
                    onClick={() => handleToggle(g.id, g.active)}
                    disabled={isPending && togglingId === g.id}
                    className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                    title={g.active ? "Desactivar" : "Activar"}
                  >
                    {g.active ? (
                      <ToggleRight className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <Link
                    href={`/admin/garments/edit/${g.id}`}
                    className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex-1 justify-center"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(g.id, g.name)}
                    disabled={isPending && deletingId === g.id}
                    className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-red-900/30 text-red-500 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
