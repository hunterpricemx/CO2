"use client";

import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { Search, Filter as FilterIcon, Eye, X } from "lucide-react";
import {
  pickTitle,
  pickCategoryName,
  type ScreenshotCategory,
  type ScreenshotWithCategory,
} from "@/modules/screenshots";

type Props = {
  initialItems: ScreenshotWithCategory[];
  categories:   ScreenshotCategory[];
  locale:       string;
  version:      string;
};

export function ScreenshotsGrid({ initialItems, categories, locale, version }: Props) {
  const [items] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [lightbox, setLightbox] = useState<ScreenshotWithCategory | null>(null);

  const detailHref = useCallback(
    (slug: string) => locale === "es" ? `/${version}/screenshots/${slug}` : `/${locale}/${version}/screenshots/${slug}`,
    [locale, version],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(s => {
      if (activeCat !== "all" && s.category?.slug !== activeCat) return false;
      if (!q) return true;
      const title = pickTitle(s, locale).toLowerCase();
      return title.includes(q) || s.tags.some(t => t.toLowerCase().includes(q));
    });
  }, [items, search, activeCat, locale]);

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-50">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            placeholder="Buscar por título o tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#111] border border-white/10 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12]/50"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <FilterIcon className="h-3.5 w-3.5" />
          <span>{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Pills de categoría */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCat("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            activeCat === "all"
              ? "bg-[#f39c12]/20 border-[#f39c12]/40 text-[#f39c12]"
              : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          Todas
        </button>
        {categories.map(c => {
          const active = activeCat === c.slug;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCat(c.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-[#f39c12]/20 border-[#f39c12]/40 text-[#f39c12]"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {pickCategoryName(c, locale)}
            </button>
          );
        })}
      </div>

      {/* Grid masonry-like */}
      {filtered.length === 0 ? (
        <div className="bg-[#111] rounded-xl border border-white/5 px-6 py-16 text-center text-sm text-gray-500">
          Sin screenshots en esta categoría todavía.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filtered.map(s => {
            const title = pickTitle(s, locale);
            return (
              <article
                key={s.id}
                className="group relative bg-[#111] rounded-xl overflow-hidden border border-white/5 hover:border-[#f39c12]/40 transition-all hover:shadow-xl hover:shadow-[#f39c12]/10"
              >
                <div className="relative aspect-square sm:aspect-[4/3] bg-black/40 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.thumbnail_url || s.image_url}
                    alt={title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={() => setLightbox(s)}
                    className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center"
                    aria-label="Ver en grande"
                  >
                    <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                  </button>
                  {s.category && (
                    <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-gray-200 border border-white/10">
                      {pickCategoryName(s.category, locale)}
                    </span>
                  )}
                  {s.version === "both" && (
                    <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-purple-900/60 backdrop-blur text-purple-200 border border-purple-700/40">
                      v1+v2
                    </span>
                  )}
                </div>
                <Link href={detailHref(s.slug)} className="block p-3 hover:bg-white/2 transition-colors">
                  <h3 className="text-sm font-medium text-white line-clamp-2 group-hover:text-[#f39c12] transition-colors">
                    {title}
                  </h3>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="truncate">{s.uploader_name ?? "anónimo"}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Eye className="h-3 w-3" />
                      {s.view_count.toLocaleString("es")}
                    </span>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="max-w-7xl max-h-full flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.image_url}
              alt={pickTitle(lightbox, locale)}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="text-center text-white max-w-2xl">
              <h3 className="text-lg font-semibold">{pickTitle(lightbox, locale)}</h3>
              <Link
                href={detailHref(lightbox.slug)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[#f39c12]/20 border border-[#f39c12]/40 text-[#f39c12] hover:bg-[#f39c12]/30"
              >
                Ver detalle y compartir →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
