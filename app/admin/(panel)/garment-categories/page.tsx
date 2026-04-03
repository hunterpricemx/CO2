"use client";

import { useState, useTransition } from "react";
import { useList } from "@refinedev/core";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteGarmentCategory } from "./actions";

type GarmentCategory = { id: string; name: string; sort_order: number };

export default function AdminGarmentCategoriesPage() {
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { query } = useList<GarmentCategory>({
    resource: "garment_categories",
    sorters: [{ field: "sort_order", order: "asc" }],
    pagination: { pageSize: 100 },
  });

  const categories = (query.data?.data ?? []) as GarmentCategory[];

  function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar la categoría "${name}"? Los garments con esta categoría quedarán sin categoría.`)) return;
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteGarmentCategory(id);
      if (result.success) {
        toast.success("Categoría eliminada.");
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
          <h1 className="font-bebas text-5xl tracking-wider text-white">Categorías de Garments</h1>
          <p className="text-sm text-gray-500 mt-1">{categories.length} categorías registradas</p>
        </div>
        <Link
          href="/admin/garment-categories/create"
          className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus className="h-4 w-4" /> Nueva Categoría
        </Link>
      </div>

      {query.isLoading ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : (
        <div className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,215,0,0.08)]">
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Orden</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-white/2">
                  <td className="px-4 py-3 text-gray-400">{c.sort_order}</td>
                  <td className="px-4 py-3 text-white">{c.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={`/admin/garment-categories/edit/${c.id}`}
                        className="p-1.5 text-gray-400 hover:text-[#f39c12] hover:bg-[rgba(243,156,18,0.1)] rounded-lg transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={isPending && deletingId === c.id}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-gray-600 text-sm">
                    No hay categorías creadas.
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
