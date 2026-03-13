"use client";

import { useMemo, useState } from "react";
import { useList, useDelete } from "@refinedev/core";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-900/30 text-green-400 border-green-800/30",
  draft:     "bg-yellow-900/30 text-yellow-400 border-yellow-800/30",
  archived:  "bg-gray-800/50 text-gray-500 border-gray-700/30",
};

type NewsItem = {
  id: string;
  title_es: string;
  status: string;
  published_at: string | null;
  created_at: string;
  category_id: string | null;
};

type CategoryItem = { id: string; name_es: string };

export default function AdminNewsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { query } = useList({
    resource: "news_posts",
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 200 },
  });
  const { query: catQuery } = useList({
    resource: "news_categories",
    sorters: [{ field: "sort_order", order: "asc" }],
    pagination: { pageSize: 50 },
  });

  const { mutate: del } = useDelete();
  const news = (query.data?.data ?? []) as NewsItem[];
  const categories = (catQuery.data?.data ?? []) as CategoryItem[];
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name_es]));
  const isLoading = query.isLoading;

  const filtered = useMemo(() => {
    let result = [...news];
    const term = search.trim().toLowerCase();
    if (term) result = result.filter((n) => n.title_es.toLowerCase().includes(term));
    if (statusFilter !== "all") result = result.filter((n) => n.status === statusFilter);
    return result;
  }, [news, search, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-5xl tracking-wider text-white">Noticias</h1>
          <p className="text-sm text-gray-500 mt-1">{news.length} publicaciones registradas</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/news-categories"
            className="flex items-center gap-2 border border-[rgba(255,215,0,0.3)] text-[#f39c12] hover:bg-[rgba(243,156,18,0.1)] font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Categorías
          </Link>
          <Link
            href="/admin/news/create"
            className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus className="h-4 w-4" /> Nueva noticia
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar noticias..."
          className="bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] w-60"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#f39c12]"
        >
          <option value="all">Todos</option>
          <option value="published">Publicado</option>
          <option value="draft">Borrador</option>
          <option value="archived">Archivado</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : (
        <div className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,215,0,0.1)] text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Título</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Publicado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-600">
                    No hay noticias
                  </td>
                </tr>
              )}
              {filtered.map((n) => (
                <tr key={n.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{n.title_es}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {n.category_id ? (catMap[n.category_id] ?? "—") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[n.status] ?? ""}`}>
                      {n.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {n.published_at ? new Date(n.published_at).toLocaleDateString("es") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin/news/edit?id=${n.id}`}
                        className="p-1.5 text-gray-500 hover:text-[#f39c12] hover:bg-[rgba(243,156,18,0.1)] rounded transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm("¿Eliminar esta noticia?")) {
                            del({ resource: "news_posts", id: n.id });
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
