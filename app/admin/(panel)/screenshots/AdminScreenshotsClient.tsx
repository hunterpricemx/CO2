"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Search, Eye, EyeOff, Trash2, Pencil, ExternalLink, Image as ImageIcon, AlertTriangle, Loader2 } from "lucide-react";
import { deleteScreenshot, setScreenshotStatus } from "@/modules/screenshots/actions";
import type { ScreenshotCategory, ScreenshotWithCategory, ScreenshotStatus } from "@/modules/screenshots/types";

type Props = {
  initialRows: ScreenshotWithCategory[];
  categories: ScreenshotCategory[];
};

export function AdminScreenshotsClient({ initialRows, categories }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [versionFilter, setVersionFilter] = useState<"all" | "1.0" | "2.0" | "both">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ScreenshotStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ScreenshotWithCategory | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (versionFilter !== "all" && r.version !== versionFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (categoryFilter !== "all" && r.category?.slug !== categoryFilter) return false;
      if (!q) return true;
      return (
        r.title_es.toLowerCase().includes(q) ||
        r.title_en.toLowerCase().includes(q) ||
        r.title_pt.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        (r.uploader_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, versionFilter, statusFilter, categoryFilter]);

  const handleToggle = async (s: ScreenshotWithCategory) => {
    setBusyId(s.id);
    const next: ScreenshotStatus = s.status === "published" ? "draft" : "published";
    const r = await setScreenshotStatus(s.id, next);
    setBusyId(null);
    if (r.success) {
      setRows(prev => prev.map(x => x.id === s.id ? { ...x, status: next } : x));
      startTransition(() => router.refresh());
    }
  };

  const handleDelete = async (s: ScreenshotWithCategory) => {
    setBusyId(s.id);
    const r = await deleteScreenshot(s.id);
    setBusyId(null);
    setConfirmDelete(null);
    if (r.success) {
      setRows(prev => prev.filter(x => x.id !== s.id));
      startTransition(() => router.refresh());
    }
  };

  const inputCls = "bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12]/50";

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center bg-[#111] rounded-xl p-4 border border-white/5">
        <div className="relative flex-1 min-w-50">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            placeholder="Buscar título, slug, uploader..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${inputCls} w-full pl-10`}
          />
        </div>
        <select value={versionFilter} onChange={e => setVersionFilter(e.target.value as "all"|"1.0"|"2.0"|"both")} className={inputCls}>
          <option value="all">Todas las versiones</option>
          <option value="1.0">v1.0</option>
          <option value="2.0">v2.0</option>
          <option value="both">Ambas</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all"|ScreenshotStatus)} className={inputCls}>
          <option value="all">Todos los estados</option>
          <option value="published">Publicados</option>
          <option value="draft">Borradores</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={inputCls}>
          <option value="all">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.name_es}</option>)}
        </select>
        <span className="text-xs text-gray-500">{filtered.length} de {rows.length}</span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[#111] rounded-xl border border-white/5 px-6 py-16 text-center text-sm text-gray-500">
          <ImageIcon className="h-8 w-8 mx-auto mb-3 opacity-50" />
          {rows.length === 0 ? "Aún no hay screenshots. Click 'Nuevo screenshot' para subir el primero." : "Sin resultados con esos filtros."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="bg-[#111] rounded-xl border border-white/5 overflow-hidden flex flex-col">
              <div className="relative bg-black/40 aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.thumbnail_url || s.image_url} alt={s.title_es} className="w-full h-full object-cover" loading="lazy" />
                <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                  s.status === "published"
                    ? "bg-green-900/40 text-green-300 border-green-700/40"
                    : "bg-yellow-900/40 text-yellow-300 border-yellow-700/40"
                }`}>
                  {s.status === "published" ? "publicado" : "borrador"}
                </span>
                <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium bg-black/60 text-gray-200 border border-white/10">
                  v{s.version === "both" ? "1.0+2.0" : s.version}
                </span>
              </div>
              <div className="p-3 flex-1 flex flex-col gap-1.5">
                <h3 className="text-sm font-medium text-white line-clamp-2" title={s.title_es}>{s.title_es}</h3>
                <p className="text-[11px] text-gray-500 font-mono truncate">/{s.slug}</p>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-wrap">
                  {s.category && <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{s.category.name_es}</span>}
                  <span className="opacity-60">{s.uploader_name ?? "?"}</span>
                  <span className="opacity-60">· {s.view_count} vistas</span>
                </div>
              </div>
              <div className="flex border-t border-white/5">
                <Link
                  href={`/2.0/screenshots/${s.slug}`}
                  target="_blank"
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] text-blue-300 hover:bg-blue-900/20 transition-colors"
                  title="Ver pública"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver
                </Link>
                <button
                  type="button"
                  onClick={() => handleToggle(s)}
                  disabled={busyId === s.id}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] text-gray-300 hover:bg-white/5 disabled:opacity-50 border-l border-white/5"
                  title={s.status === "published" ? "Despublicar" : "Publicar"}
                >
                  {busyId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : s.status === "published" ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {s.status === "published" ? "Ocultar" : "Publicar"}
                </button>
                <Link
                  href={`/admin/screenshots/edit/${s.id}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] text-[#f39c12] hover:bg-[#f39c12]/10 transition-colors border-l border-white/5"
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(s)}
                  disabled={busyId === s.id}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] text-red-300 hover:bg-red-900/20 disabled:opacity-50 border-l border-white/5"
                >
                  <Trash2 className="h-3 w-3" />
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal confirmación borrar */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => busyId !== confirmDelete.id && setConfirmDelete(null)}
        >
          <div
            className="max-w-md w-full rounded-2xl border border-red-700/40 bg-[#0f0503] p-6 space-y-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-900/30 border border-red-700/40 rounded-xl p-2.5">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Eliminar screenshot</h3>
                <p className="text-xs text-gray-500 mt-0.5">El registro y la URL pública se borran permanentemente.</p>
              </div>
            </div>
            <p className="text-sm text-gray-300">
              ¿Eliminar <strong className="text-white">{confirmDelete.title_es}</strong>? La imagen en Storage permanece (puedes borrarla manualmente desde el bucket).
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={busyId === confirmDelete.id}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-300 hover:bg-white/10 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                disabled={busyId === confirmDelete.id}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-600/40 bg-red-700/30 text-sm text-red-100 hover:bg-red-700/50 disabled:opacity-50"
              >
                {busyId === confirmDelete.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
