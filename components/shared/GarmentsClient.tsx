"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { ShoppingBag, Search, ChevronLeft, ChevronRight, ZoomIn, Wand2, MessageCircle, X } from "lucide-react";

const PAGE_SIZE = 9;

export type GarmentItem = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  allows_custom: boolean;
  is_reserved: boolean;
  category_id: string | null;
};

export type GarmentsLabels = {
  title: string;
  subtitle: string;
  price_label: string;
  btn_order: string;
  btn_custom: string;
  custom_badge: string;
  login_required: string;
  login_link: string;
  modal_title: string;
  modal_custom_title: string;
  char_label: string;
  char_placeholder: string;
  custom_desc_label: string;
  custom_desc_placeholder: string;
  ref_image_label: string;
  btn_checkout: string;
  orders_link: string;
  empty_catalog: string;
  not_configured: string;
  tebex_checking: string;
  tebex_error: string;
  tebex_retry: string;
  custom_request_title: string;
  custom_request_subtitle: string;
  custom_request_btn: string;
};

function getUrlPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function isVideoLikeUrl(url: string): boolean {
  return /\.(mp4|mov)$/i.test(getUrlPathname(url));
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/|)(\d+)/);
  return m?.[1] ?? null;
}

function GarmentMedia({ url, name }: { url: string | null; name: string }) {
  if (!url) return null;

  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&loop=1&autoplay=1&muted=1&background=1&controls=0`}
        className="absolute inset-0 w-full h-full"
        allow="autoplay; fullscreen; picture-in-picture"
        title={name}
      />
    );
  }

  if (isVideoLikeUrl(url)) {
    return <video src={url} className="absolute inset-0 w-full h-full object-cover" muted playsInline loop autoPlay />;
  }

  // GIFs and regular images — use native <img> to preserve animation and avoid
  // Next.js image optimization converting GIFs to static WebP (breaks on iOS Safari)
  if (/\.gif$/i.test(getUrlPathname(url))) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
    );
  }

  return (
    <Image
      src={url}
      alt={name}
      fill
      className="object-cover group-hover:scale-105 transition-transform duration-300"
      sizes="350px"
    />
  );
}

function buildWhatsAppHref(phone: string, text: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function GarmentCard({
  garment,
  version,
  phone,
  onZoom,
  reserved,
  buttonText,
  categoryName,
}: {
  garment: GarmentItem;
  version: string;
  phone: string;
  onZoom: (url: string, name: string) => void;
  reserved: boolean;
  buttonText: string;
  categoryName?: string | null;
}) {
  const message = [
    "Hola, quiero solicitar este Garment.",
    `Garment ID: ${garment.id}`,
    `Garment: ${garment.name}`,
    `Version: ${version}`,
    reserved ? "Estado catalogo: Apartado" : "Estado catalogo: Disponible",
    ...(garment.image_url ? [`Media URL: ${garment.image_url}`] : []),
  ].join("\n");

  const href = buildWhatsAppHref(phone, message);

  return (
    <div
      className="group flex flex-col rounded-2xl overflow-hidden"
      style={{ background: "rgba(15,5,3,0.92)", border: "1px solid rgba(255,215,0,0.13)" }}
    >
      <div className="relative h-52 bg-black overflow-hidden">
        {garment.image_url ? (
          <>
            <GarmentMedia url={garment.image_url} name={garment.name} />
            <button
              onClick={() => onZoom(garment.image_url!, garment.name)}
              className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-gray-300 hover:text-white hover:bg-black/90 transition-colors opacity-0 group-hover:opacity-100"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <ShoppingBag className="h-16 w-16 text-gray-700" />
          </div>
        )}
        {(garment.allows_custom || categoryName) && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {garment.allows_custom && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-200 border border-purple-500/30">
                Custom
              </span>
            )}
            {categoryName && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/40">
                ⭐ {categoryName}
              </span>
            )}
          </div>
        )}
        <span
          className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            reserved
              ? "bg-red-900/70 text-red-300 border-red-700/40"
              : "bg-emerald-900/70 text-emerald-300 border-emerald-700/40"
          }`}
        >
          {reserved ? "Apartado" : "Disponible"}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4 flex-1">
        <div>
          <h3 className="font-bebas text-xl tracking-wider text-white">{garment.name}</h3>
          {garment.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{garment.description}</p>
          )}
        </div>

        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 mt-auto bg-[#25D366] hover:bg-[#1ebe57] text-black font-semibold text-sm py-2 rounded-lg transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            {buttonText}
          </a>
        ) : (
          <p className="text-xs text-red-400 mt-auto">Numero de WhatsApp invalido.</p>
        )}
      </div>
    </div>
  );
}

export function GarmentsClient({
  garments,
  categories,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialCategoryId: _,
  version,
  whatsappPhone,
  labels,
}: {
  garments: GarmentItem[];
  categories: { id: string; name: string }[];
  initialCategoryId: string | null;
  version: string;
  whatsappPhone: string;
  labels: GarmentsLabels;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedCategory = searchParams.get("cat");

  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [zoomName, setZoomName] = useState("");

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "regular" | "custom">("all");
  const [pageAvailable, setPageAvailable] = useState(1);
  const [pageReserved, setPageReserved] = useState(1);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const filtered = useMemo(() => {
    let items = garments;
    const term = search.trim().toLowerCase();
    if (term) items = items.filter((g) => g.name.toLowerCase().includes(term) || g.description.toLowerCase().includes(term));
    if (filterType === "regular") items = items.filter((g) => !g.allows_custom);
    if (filterType === "custom") items = items.filter((g) => g.allows_custom);
    if (selectedCategory) items = items.filter((g) => g.category_id === selectedCategory);
    return items;
  }, [garments, search, filterType, selectedCategory]);

  const available = filtered.filter((g) => !g.is_reserved);
  const reserved = filtered.filter((g) => g.is_reserved);

  const availablePages = Math.max(1, Math.ceil(available.length / PAGE_SIZE));
  const reservedPages = Math.max(1, Math.ceil(reserved.length / PAGE_SIZE));

  const safeAvailablePage = Math.min(pageAvailable, availablePages);
  const safeReservedPage = Math.min(pageReserved, reservedPages);

  const paginatedAvailable = available.slice((safeAvailablePage - 1) * PAGE_SIZE, safeAvailablePage * PAGE_SIZE);
  const paginatedReserved = reserved.slice((safeReservedPage - 1) * PAGE_SIZE, safeReservedPage * PAGE_SIZE);

  const customHref = buildWhatsAppHref(
    whatsappPhone,
    [
      "Hola, quiero solicitar un Garment personalizado.",
      `Version: ${version}`,
    ].join("\n"),
  );

  return (
    <>
      {zoomUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={() => setZoomUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            onClick={() => setZoomUrl(null)}
          >
            <X className="h-7 w-7" />
          </button>
          <div
            className="relative max-w-3xl w-full max-h-[80vh] rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const vid = getVimeoId(zoomUrl);
              if (vid) {
                return (
                  <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                      src={`https://player.vimeo.com/video/${vid}?badge=0&loop=1&autoplay=1&muted=1&background=1&controls=0`}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; fullscreen"
                      title={zoomName}
                    />
                  </div>
                );
              }
              if (isVideoLikeUrl(zoomUrl)) {
                return (
                  <video
                    src={zoomUrl}
                    className="w-full h-auto max-h-[80vh] object-contain"
                    controls
                    autoPlay
                    muted
                    playsInline
                  />
                );
              }
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={zoomUrl} alt={zoomName} className="w-full h-auto max-h-[80vh] object-contain" />
              );
            })()}
          </div>
          <p className="absolute bottom-6 text-lg text-gray-400 font-bebas tracking-wider">{zoomName}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageAvailable(1);
              setPageReserved(1);
            }}
            placeholder="Buscar garment..."
            className="w-full bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[rgba(243,156,18,0.5)] transition-colors"
          />
        </div>

        <div className="flex gap-1 bg-[#0f0503] border border-[rgba(255,215,0,0.12)] rounded-lg p-1">
          {(["all", "regular", "custom"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilterType(f);
                setPageAvailable(1);
                setPageReserved(1);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                filterType === f ? "bg-[#f39c12] text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              {f === "all" ? "Todos" : f === "regular" ? "Regular" : labels.custom_badge}
            </button>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { router.push(pathname); setPageAvailable(1); setPageReserved(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              selectedCategory === null
                ? "bg-[#f39c12] text-black border-[#f39c12]"
                : "bg-transparent text-gray-400 border-[rgba(255,215,0,0.2)] hover:text-white hover:border-[rgba(255,215,0,0.5)]"
            }`}
          >
            Todas las categorías
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { router.push(`${pathname}?cat=${cat.id}`); setPageAvailable(1); setPageReserved(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                selectedCategory === cat.id
                  ? "bg-[#f39c12] text-black border-[#f39c12]"
                  : "bg-transparent text-gray-400 border-[rgba(255,215,0,0.2)] hover:text-white hover:border-[rgba(255,215,0,0.5)]"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <section className="mb-10">
        <h2 className="font-bebas text-3xl tracking-wider text-white mb-4">Disponibles</h2>
        {paginatedAvailable.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#120805]">
            <ShoppingBag className="h-10 w-10 text-gray-700" />
            <p className="text-sm text-gray-500">No hay garments disponibles con este filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAvailable.map((g) => (
              <GarmentCard
                key={g.id}
                garment={g}
                version={version}
                phone={whatsappPhone}
                reserved={false}
                buttonText="Solicitar Garment"
                categoryName={g.category_id ? (categoryMap.get(g.category_id) ?? null) : null}
                onZoom={(url, name) => {
                  setZoomUrl(url);
                  setZoomName(name);
                }}
              />
            ))}
          </div>
        )}

        {availablePages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPageAvailable((p) => Math.max(1, p - 1))}
              disabled={safeAvailablePage === 1}
              className="p-2 rounded-lg border border-[rgba(255,215,0,0.15)] text-gray-400 hover:text-white hover:border-[rgba(255,215,0,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-gray-500">{safeAvailablePage} / {availablePages}</span>
            <button
              onClick={() => setPageAvailable((p) => Math.min(availablePages, p + 1))}
              disabled={safeAvailablePage === availablePages}
              className="p-2 rounded-lg border border-[rgba(255,215,0,0.15)] text-gray-400 hover:text-white hover:border-[rgba(255,215,0,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="font-bebas text-3xl tracking-wider text-white mb-4">Apartados</h2>
        {paginatedReserved.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#120805]">
            <ShoppingBag className="h-10 w-10 text-gray-700" />
            <p className="text-sm text-gray-500">No hay garments apartados con este filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedReserved.map((g) => (
              <GarmentCard
                key={g.id}
                garment={g}
                version={version}
                phone={whatsappPhone}
                reserved
                buttonText="Consultar Garment"
                categoryName={g.category_id ? (categoryMap.get(g.category_id) ?? null) : null}
                onZoom={(url, name) => {
                  setZoomUrl(url);
                  setZoomName(name);
                }}
              />
            ))}
          </div>
        )}

        {reservedPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPageReserved((p) => Math.max(1, p - 1))}
              disabled={safeReservedPage === 1}
              className="p-2 rounded-lg border border-[rgba(255,215,0,0.15)] text-gray-400 hover:text-white hover:border-[rgba(255,215,0,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-gray-500">{safeReservedPage} / {reservedPages}</span>
            <button
              onClick={() => setPageReserved((p) => Math.min(reservedPages, p + 1))}
              disabled={safeReservedPage === reservedPages}
              className="p-2 rounded-lg border border-[rgba(255,215,0,0.15)] text-gray-400 hover:text-white hover:border-[rgba(255,215,0,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      <div
        className="mt-12 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5"
        style={{ background: "linear-gradient(135deg, rgba(120,40,200,0.18) 0%, rgba(243,156,18,0.10) 100%)", border: "1px solid rgba(180,100,255,0.25)" }}
      >
        <div className="shrink-0 w-12 h-12 rounded-xl bg-purple-900/50 border border-purple-500/30 flex items-center justify-center">
          <Wand2 className="h-6 w-6 text-purple-300" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h3 className="font-bebas text-2xl tracking-wider text-white">{labels.custom_request_title}</h3>
          <p className="text-sm text-gray-400 mt-0.5">{labels.custom_request_subtitle}</p>
        </div>
        {customHref ? (
          <a
            href={customHref}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-black font-semibold text-sm transition-colors inline-flex items-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Solicitar Garment
          </a>
        ) : (
          <p className="text-xs text-red-300">Numero de WhatsApp invalido.</p>
        )}
      </div>
    </>
  );
}
