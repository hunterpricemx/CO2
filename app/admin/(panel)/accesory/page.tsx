"use client";

import { useState, useTransition } from "react";
import { useList } from "@refinedev/core";
import Link from "next/link";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { deleteAccesory, toggleAccesoryActive, toggleAccesoryReserved } from "./actions";

type AccesoryItem = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  active: boolean;
  is_reserved: boolean;
  allows_custom: boolean;
  sort_order: number;
  created_at: string;
};

export default function AdminAccesoryPage() {
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [reservingId, setReservingId] = useState<string | null>(null);

  const { query } = useList<AccesoryItem>({
    resource: "accesory",
    sorters: [{ field: "sort_order", order: "asc" }, { field: "created_at", order: "desc" }],
    pagination: { pageSize: 200 },
  });

  const items = (query.data?.data ?? []) as AccesoryItem[];

  function handleToggle(id: string, currentActive: boolean) {
    setTogglingId(id);
    startTransition(async () => {
      const result = await toggleAccesoryActive(id, !currentActive);
      if (result.success) {
        toast.success(currentActive ? "Accesory desactivado." : "Accesory activado.");
        query.refetch();
      } else {
        toast.error(result.error ?? "Error al cambiar estado.");
      }
      setTogglingId(null);
    });
  }

  function handleToggleReserved(id: string, currentReserved: boolean) {
    setReservingId(id);
    startTransition(async () => {
      const result = await toggleAccesoryReserved(id, !currentReserved);
      if (result.success) {
        toast.success(currentReserved ? "Accesory marcado como disponible." : "Accesory marcado como apartado.");
        query.refetch();
      } else {
        toast.error(result.error ?? "Error al actualizar apartado.");
      }
      setReservingId(null);
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar el accesory "${name}"? Esta accion no se puede deshacer.`)) return;
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteAccesory(id);
      if (result.success) {
        toast.success("Accesory eliminado.");
        query.refetch();
      } else {
        toast.error(result.error ?? "Error al eliminar.");
      }
      setDeletingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-5xl tracking-wider text-white">Accesory</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} items en el catalogo</p>
        </div>
        <Link href="/admin/accesory/create" className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
          <Plus className="h-4 w-4" />
          Nuevo Accesory
        </Link>
      </div>

      {query.isLoading ? (
        <p className="text-gray-500 text-sm">Cargando accesory...</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl">
          <ShoppingBag className="h-14 w-14 text-gray-700" />
          <p className="text-gray-500 text-sm">No hay items en accesory aun.</p>
          <Link href="/admin/accesory/create" className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
            <Plus className="h-4 w-4" />
            Crear primer accesory
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className={`bg-[#1a1a1a] border rounded-xl overflow-hidden flex flex-col transition-opacity ${item.active ? "border-[rgba(255,215,0,0.15)]" : "border-[rgba(255,255,255,0.05)] opacity-60"}`}>
              <div className="relative h-40 bg-black shrink-0">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ShoppingBag className="h-12 w-12 text-gray-700" />
                  </div>
                )}

                <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.active ? "bg-emerald-900/70 text-emerald-400 border-emerald-700/40" : "bg-gray-800/70 text-gray-500 border-gray-700/40"}`}>
                  {item.active ? "Activo" : "Inactivo"}
                </span>

                {item.allows_custom && <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/70 text-purple-300 border border-purple-700/40">Custom</span>}
                {item.is_reserved && <span className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-900/70 text-red-300 border border-red-700/40">Apartado</span>}
              </div>

              <div className="flex flex-col gap-3 p-3 flex-1">
                <div>
                  <p className="text-sm font-semibold text-white leading-tight line-clamp-1">{item.name}</p>
                  {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                  <p className="text-xs text-gray-600 mt-1">Orden: {item.sort_order}</p>
                </div>

                <div className="flex items-center gap-1 mt-auto">
                  <button onClick={() => handleToggle(item.id, item.active)} disabled={isPending && togglingId === item.id} className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50">
                    {item.active ? <ToggleRight className="h-3.5 w-3.5 text-emerald-400" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                  </button>

                  <button onClick={() => handleToggleReserved(item.id, item.is_reserved)} disabled={isPending && reservingId === item.id} className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50">
                    {item.is_reserved ? "Disponible" : "Apartar"}
                  </button>

                  <Link href={`/admin/accesory/edit/${item.id}`} className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex-1 justify-center">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Link>

                  <button onClick={() => handleDelete(item.id, item.name)} disabled={isPending && deletingId === item.id} className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-red-900/30 text-red-500 hover:bg-red-900/20 transition-colors disabled:opacity-50">
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
