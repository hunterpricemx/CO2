"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ShoppingBag, Search, ChevronLeft, ChevronRight, ZoomIn, MessageCircle, X } from "lucide-react";

const PAGE_SIZE = 9;

export type AccsoryItem = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  allows_custom: boolean;
  is_reserved: boolean;
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

function AccsoryMedia({ url, name }: { url: string | null; name: string }) {
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

  return <Image src={url} alt={name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="350px" />;
}

function buildWhatsAppHref(phone: string, text: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function Card({
  item,
  version,
  phone,
  reserved,
  buttonText,
  onZoom,
}: {
  item: AccsoryItem;
  version: string;
  phone: string;
  reserved: boolean;
  buttonText: string;
  onZoom: (url: string, name: string) => void;
}) {
  const message = [
    "Hola, quiero solicitar este Accsory.",
    `Accsory ID: ${item.id}`,
    `Accsory: ${item.name}`,
    `Version: ${version}`,
    reserved ? "Estado catalogo: Apartado" : "Estado catalogo: Disponible",
    ...(item.image_url ? [`Media URL: ${item.image_url}`] : []),
  ].join("\n");

  const href = buildWhatsAppHref(phone, message);

  return (
    <div className="group flex flex-col rounded-2xl overflow-hidden" style={{ background: "rgba(15,5,3,0.92)", border: "1px solid rgba(255,215,0,0.13)" }}>
      <div className="relative h-52 bg-black overflow-hidden">
        {item.image_url ? (
          <>
            <AccsoryMedia url={item.image_url} name={item.name} />
            <button onClick={() => onZoom(item.image_url!, item.name)} className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-gray-300 hover:text-white hover:bg-black/90 transition-colors opacity-0 group-hover:opacity-100">
              <ZoomIn className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <ShoppingBag className="h-16 w-16 text-gray-700" />
          </div>
        )}
        {item.allows_custom && <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-200 border border-purple-500/30">Custom</span>}
        <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${reserved ? "bg-red-900/70 text-red-300 border-red-700/40" : "bg-emerald-900/70 text-emerald-300 border-emerald-700/40"}`}>
          {reserved ? "Apartado" : "Disponible"}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-4 flex-1">
        <div>
          <h3 className="font-bebas text-xl tracking-wider text-white">{item.name}</h3>
          {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
        </div>

        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 mt-auto bg-[#25D366] hover:bg-[#1ebe57] text-black font-semibold text-sm py-2 rounded-lg transition-colors">
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

export function AccsoryClient({ items, version, whatsappPhone }: { items: AccsoryItem[]; version: string; whatsappPhone: string }) {
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [zoomName, setZoomName] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "regular" | "custom">("all");
  const [pageAvailable, setPageAvailable] = useState(1);
  const [pageReserved, setPageReserved] = useState(1);

  const filtered = useMemo(() => {
    let result = items;
    const term = search.trim().toLowerCase();
    if (term) result = result.filter((i) => i.name.toLowerCase().includes(term) || i.description.toLowerCase().includes(term));
    if (filterType === "regular") result = result.filter((i) => !i.allows_custom);
    if (filterType === "custom") result = result.filter((i) => i.allows_custom);
    return result;
  }, [items, search, filterType]);

  const available = filtered.filter((i) => !i.is_reserved);
  const reserved = filtered.filter((i) => i.is_reserved);

  const availablePages = Math.max(1, Math.ceil(available.length / PAGE_SIZE));
  const reservedPages = Math.max(1, Math.ceil(reserved.length / PAGE_SIZE));

  const safeAvailablePage = Math.min(pageAvailable, availablePages);
  const safeReservedPage = Math.min(pageReserved, reservedPages);

  const paginatedAvailable = available.slice((safeAvailablePage - 1) * PAGE_SIZE, safeAvailablePage * PAGE_SIZE);
  const paginatedReserved = reserved.slice((safeReservedPage - 1) * PAGE_SIZE, safeReservedPage * PAGE_SIZE);

  return (
    <>
      {zoomUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setZoomUrl(null)}>
          <button className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors" onClick={() => setZoomUrl(null)}>
            <X className="h-7 w-7" />
          </button>
          <div className="relative max-w-3xl w-full max-h-[80vh] rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {isVideoLikeUrl(zoomUrl) ? (
              <video src={zoomUrl} className="w-full h-auto max-h-[80vh] object-contain" controls autoPlay muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={zoomUrl} alt={zoomName} className="w-full h-auto max-h-[80vh] object-contain" />
            )}
          </div>
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
            placeholder="Buscar accsory..."
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
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filterType === f ? "bg-[#f39c12] text-black" : "text-gray-400 hover:text-white"}`}
            >
              {f === "all" ? "Todos" : f === "regular" ? "Regular" : "Custom"}
            </button>
          ))}
        </div>
      </div>

      <section className="mb-10">
        <h2 className="font-bebas text-3xl tracking-wider text-white mb-4">Disponibles</h2>
        {paginatedAvailable.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#120805]">
            <ShoppingBag className="h-10 w-10 text-gray-700" />
            <p className="text-sm text-gray-500">No hay accsory disponibles con este filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAvailable.map((item) => (
              <Card key={item.id} item={item} version={version} phone={whatsappPhone} reserved={false} buttonText="Solicitar Accsory" onZoom={(url, name) => { setZoomUrl(url); setZoomName(name); }} />
            ))}
          </div>
        )}

        {availablePages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPageAvailable((p) => Math.max(1, p - 1))} disabled={safeAvailablePage === 1} className="p-2 rounded-lg border border-[rgba(255,215,0,0.15)] text-gray-400 hover:text-white hover:border-[rgba(255,215,0,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-gray-500">{safeAvailablePage} / {availablePages}</span>
            <button onClick={() => setPageAvailable((p) => Math.min(availablePages, p + 1))} disabled={safeAvailablePage === availablePages} className="p-2 rounded-lg border border-[rgba(255,215,0,0.15)] text-gray-400 hover:text-white hover:border-[rgba(255,215,0,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
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
            <p className="text-sm text-gray-500">No hay accsory apartados con este filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedReserved.map((item) => (
              <Card key={item.id} item={item} version={version} phone={whatsappPhone} reserved buttonText="Consultar Accsory" onZoom={(url, name) => { setZoomUrl(url); setZoomName(name); }} />
            ))}
          </div>
        )}

        {reservedPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPageReserved((p) => Math.max(1, p - 1))} disabled={safeReservedPage === 1} className="p-2 rounded-lg border border-[rgba(255,215,0,0.15)] text-gray-400 hover:text-white hover:border-[rgba(255,215,0,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-gray-500">{safeReservedPage} / {reservedPages}</span>
            <button onClick={() => setPageReserved((p) => Math.min(reservedPages, p + 1))} disabled={safeReservedPage === reservedPages} className="p-2 rounded-lg border border-[rgba(255,215,0,0.15)] text-gray-400 hover:text-white hover:border-[rgba(255,215,0,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </>
  );
}
