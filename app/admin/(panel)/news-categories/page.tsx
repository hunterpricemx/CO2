"use client";

import { useDelete, useList } from "@refinedev/core";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { NewsCategoryRow } from "@/modules/news/types";

export default function AdminNewsCategoriesPage() {
  const { query } = useList({
    resource: "news_categories",
    sorters: [{ field: "sort_order", order: "asc" }],
    pagination: { pageSize: 100 },
  });
  const { mutate: remove } = useDelete();
  const categories = (query.data?.data ?? []) as NewsCategoryRow[];
  const isLoading = query.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-5xl tracking-wider text-white">Categorías de Noticias</h1>
          <p className="text-sm text-gray-500 mt-1">{categories.length} categorías registradas</p>
        </div>
        <Link
          href="/admin/news-categories/create"
          className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus className="h-4 w-4" /> Nueva categoría
        </Link>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : (
        <div className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,215,0,0.08)]">
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Orden</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Nombre ES</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Nombre EN</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Nombre PT</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-600">No hay categorías</td>
                </tr>
              )}
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-gray-400">{c.sort_order}</td>
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs">{c.slug}</td>
                  <td className="px-4 py-3 text-white">{c.name_es}</td>
                  <td className="px-4 py-3 text-gray-300">{c.name_en}</td>
                  <td className="px-4 py-3 text-gray-300">{c.name_pt}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={`/admin/news-categories/edit?id=${c.id}`}
                        className="p-1.5 text-gray-400 hover:text-[#f39c12] hover:bg-[rgba(243,156,18,0.1)] rounded-lg transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar categoría "${c.name_es}"?`)) {
                            remove({ resource: "news_categories", id: c.id });
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
