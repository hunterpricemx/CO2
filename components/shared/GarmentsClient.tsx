"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, RefreshCw, X, Loader2, ImagePlus, Trash2, Search, ChevronLeft, ChevronRight, ZoomIn, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { createGarmentCheckout } from "@/app/[locale]/[version]/garments/actions";
import { checkTebexReady } from "@/app/[locale]/[version]/donate/actions";

const PAGE_SIZE = 9;

const FREEFORM_GARMENT: GarmentItem = {
  id: "__custom_request__",
  name: "Garment a Medida",
  description: "",
  image_url: null,
  allows_custom: true,
};

// ── Types ────────────────────────────────────────────────────────────────────

export type GarmentItem = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  allows_custom: boolean;
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

type TebexState = "idle" | "checking" | "ok" | "error";

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
  if (url.match(/\.(mp4|mov)$/i)) {
    return <video src={url} className="absolute inset-0 w-full h-full object-cover" muted playsInline loop autoPlay />;
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

const TEBEX_MESSAGES = [
  { icon: "⛏", text: "Enviando minero al servidor de pagos..." },
  { icon: "💀", text: "¡El minero fue eliminado! Reintentando..." },
  { icon: "⚔️", text: "Abriendo conexión segura con Tebex..." },
  { icon: "📡", text: "Señal débil... forzando enlace..." },
  { icon: "⚡", text: "Último intento de conexión..." },
];

export function GarmentsClient({
  garments,
  isLoggedIn,
  characterName: defaultCharName,
  version,
  locale,
  tebexActive,
  loginHref,
  ordersHref,
  labels,
}: {
  garments: GarmentItem[];
  isLoggedIn: boolean;
  characterName: string | null;
  version: string;
  locale: string;
  tebexActive: boolean;
  loginHref: string;
  ordersHref: string;
  labels: GarmentsLabels;
}) {
  // ── Modal state ──────────────────────────────────────────────────────────
  const [selectedGarment, setSelectedGarment] = useState<GarmentItem | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [charName, setCharName] = useState(defaultCharName ?? "");
  const [customDesc, setCustomDesc] = useState("");
  const [refImageUrl, setRefImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Zoom lightbox ─────────────────────────────────────────────────────────
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [zoomName, setZoomName] = useState("");

  // ── Search / filter / pagination ──────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "regular" | "custom">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let items = garments;
    const term = search.trim().toLowerCase();
    if (term) items = items.filter((g) => g.name.toLowerCase().includes(term) || g.description.toLowerCase().includes(term));
    if (filterType === "regular") items = items.filter((g) => !g.allows_custom);
    if (filterType === "custom")  items = items.filter((g) => g.allows_custom);
    return items;
  }, [garments, search, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when filter/search changes
  useEffect(() => { setPage(1); }, [search, filterType]);

  // ── Tebex verify state ────────────────────────────────────────────────────
  const [tebexReady, setTebexReady] = useState<TebexState>("idle");
  const [checkPhase, setCheckPhase] = useState(0);

  // ── Checkout transition ───────────────────────────────────────────────────
  const [isPending, startTransition] = useTransition();

  // ── Tebex verify logic ────────────────────────────────────────────────────
  async function verifyTebex() {
    setTebexReady("checking");
    setCheckPhase(0);
    for (let i = 0; i < TEBEX_MESSAGES.length; i++) {
      setCheckPhase(i);
      const [result] = await Promise.all([
        checkTebexReady(),
        new Promise<void>((r) => setTimeout(r, 600)),
      ]);
      if (result.ok) {
        setTebexReady("ok");
        return;
      }
    }
    setTebexReady("error");
  }

  // ── Auto-verify when modal opens ──────────────────────────────────────────
  useEffect(() => {
    if (selectedGarment && tebexActive) {
      setTebexReady("idle");
      setCheckPhase(0);
      verifyTebex();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGarment]);

  function openModal(g: GarmentItem, custom = false) {
    setSelectedGarment(g);
    setIsCustom(custom);
    setCharName(defaultCharName ?? "");
    setCustomDesc("");
    setRefImageUrl(null);
  }

  function closeModal() {
    setSelectedGarment(null);
    setIsCustom(false);
    setTebexReady("idle");
    setCheckPhase(0);
  }

  // ── Reference image upload ────────────────────────────────────────────────
  async function handleRefImageUpload(file: File) {
    const isFreeform = selectedGarment?.id === "__custom_request__";
    const isImage = file.type.startsWith("image/");
    const isVideo = !isFreeform && (file.type === "video/mp4" || file.type === "video/quicktime");
    if (!isImage && !isVideo) {
      toast.error(isFreeform ? "Solo se permiten imágenes." : "Solo se permiten imágenes o videos MP4.");
      return;
    }
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(isVideo ? "El video no puede superar 50 MB." : "La imagen no puede superar 10 MB.");
      return;
    }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/player/garments/upload-ref", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
      setRefImageUrl(json.url);
      toast.success("Imagen subida correctamente.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Checkout ──────────────────────────────────────────────────────────────
  function handleCheckout() {
    if (!selectedGarment) return;
    if (!charName.trim()) {
      toast.error("Ingresa el nombre de tu personaje.");
      return;
    }
    if (isCustom && !customDesc.trim()) {
      toast.error("Describe el garment personalizado que deseas.");
      return;
    }

    startTransition(async () => {
      const result = await createGarmentCheckout({
        garmentId:        selectedGarment.id === "__custom_request__" ? null : selectedGarment.id,
        characterName:    charName.trim(),
        version,
        locale,
        isCustom,
        customDescription: isCustom ? customDesc : undefined,
        referenceImageUrl: isCustom && refImageUrl ? refImageUrl : undefined,
      });

      if ("url" in result) {
        window.location.href = result.url;
      } else {
        const ERRORS: Record<string, string> = {
          not_authenticated:            "Debes iniciar sesión.",
          char_name_required:           "Ingresa el nombre de tu personaje.",
          tebex_disabled:               "Pagos con Tebex no disponibles.",
          tebex_not_configured:         "Tebex no está configurado. Contacta al admin.",
          garment_package_not_configured: "El paquete de garments no está configurado.",
          garment_not_available:        "Este garment no está disponible.",
          custom_not_allowed:           "Este garment no admite versión personalizada.",
          rate_limited:                 "Demasiados intentos. Espera un momento.",
          checkout_failed:              "Error al crear el checkout. Inténtalo de nuevo.",
          db_error:                     "Error interno. Inténtalo de nuevo.",
        };
        toast.error(ERRORS[result.error] ?? `Error: ${result.error}`);
      }
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!tebexActive) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ShoppingBag className="h-14 w-14 text-gray-700" />
        <p className="text-gray-500 text-sm">{labels.not_configured}</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Zoom Lightbox ── */}
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
              if (vid) return (
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={`https://player.vimeo.com/video/${vid}?badge=0&loop=1&autoplay=1&muted=1&background=1&controls=0`}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; fullscreen"
                    title={zoomName}
                  />
                </div>
              );
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={zoomUrl} alt={zoomName} className="w-full h-auto max-h-[80vh] object-contain" />
              );
            })()}
          </div>
          <p className="absolute bottom-6 text-lg text-gray-400 font-bebas tracking-wider">{zoomName}</p>
        </div>
      )}

      {/* ── Top bar: orders link ── */}
      {isLoggedIn && (
        <div className="flex justify-end mb-4">
          <Link href={ordersHref} className="text-xs text-[#f39c12] hover:underline">
            {labels.orders_link} →
          </Link>
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar garment..."
            className="w-full bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[rgba(243,156,18,0.5)] transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-[#0f0503] border border-[rgba(255,215,0,0.12)] rounded-lg p-1">
          {(["all", "regular", "custom"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                filterType === f
                  ? "bg-[#f39c12] text-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {f === "all" ? "Todos" : f === "regular" ? "Regular" : labels.custom_badge}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results count ── */}
      {(search || filterType !== "all") && (
        <p className="text-xs text-gray-600 mb-4">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          {search && <> para &ldquo;<span className="text-gray-400">{search}</span>&rdquo;</>}
        </p>
      )}

      {/* ── Garment grid ── */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <ShoppingBag className="h-14 w-14 text-gray-700" />
          <p className="text-gray-400 text-sm">{search || filterType !== "all" ? "No se encontraron garments." : labels.empty_catalog}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginated.map((g) => (
            <div
              key={g.id}
              className="group flex flex-col rounded-2xl overflow-hidden"
              style={{ background: "rgba(15,5,3,0.92)", border: "1px solid rgba(255,215,0,0.13)" }}
            >
              {/* Media */}
              <div className="relative h-52 bg-black overflow-hidden">
                {g.image_url ? (
                  <>
                    <GarmentMedia url={g.image_url} name={g.name} />
                    {/* Zoom button */}
                    <button
                      onClick={() => { setZoomUrl(g.image_url!); setZoomName(g.name); }}
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
                {g.allows_custom && (
                  <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-200 border border-purple-500/30">
                    {labels.custom_badge}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="flex flex-col gap-3 p-4 flex-1">
                <div>
                  <h3 className="font-bebas text-xl tracking-wider text-white">{g.name}</h3>
                  {g.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{g.description}</p>
                  )}
                </div>
                <p className="text-sm font-semibold text-[#f39c12] mt-auto">{labels.price_label}</p>

                {isLoggedIn ? (
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => openModal(g, false)}
                      className="flex-1 bg-[#f39c12] hover:bg-[#e67e22] text-black font-semibold text-sm py-2 rounded-lg transition-colors"
                    >
                      {labels.btn_order}
                    </button>
                    {g.allows_custom && (
                      <button
                        onClick={() => openModal(g, true)}
                        className="flex-1 border border-[rgba(255,215,0,0.4)] text-[#f39c12] hover:bg-[rgba(243,156,18,0.1)] font-semibold text-sm py-2 rounded-lg transition-colors"
                      >
                        {labels.btn_custom}
                      </button>
                    )}
                  </div>
                ) : (
                  <Link
                    href={loginHref}
                    className="block text-center bg-white/5 border border-[rgba(255,255,255,0.1)] text-gray-300 hover:text-white text-sm py-2 rounded-lg transition-colors"
                  >
                    {labels.login_required}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-[rgba(255,215,0,0.15)] text-gray-400 hover:text-white hover:border-[rgba(255,215,0,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                n === page
                  ? "bg-[#f39c12] text-black"
                  : "border border-[rgba(255,215,0,0.15)] text-gray-400 hover:text-white hover:border-[rgba(255,215,0,0.4)]"
              }`}
            >
              {n}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-[rgba(255,215,0,0.15)] text-gray-400 hover:text-white hover:border-[rgba(255,215,0,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Custom Request Banner ── */}
      {isLoggedIn ? (
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
          <button
            onClick={() => {
              setSelectedGarment(FREEFORM_GARMENT);
              setIsCustom(true);
              setCharName(defaultCharName ?? "");
              setCustomDesc("");
              setRefImageUrl(null);
            }}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-semibold text-sm transition-colors"
          >
            {labels.custom_request_btn}
          </button>
        </div>
      ) : (
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
          <Link
            href={loginHref}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-semibold text-sm transition-colors"
          >
            {labels.custom_request_btn}
          </Link>
        </div>
      )}

      {/* ── Order Modal ── */}
      {selectedGarment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={closeModal} />
          <div
            className="relative w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
            style={{ background: "#0f0503", border: "1px solid rgba(255,215,0,0.2)", boxShadow: "0 0 60px rgba(243,156,18,0.1)" }}
          >
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>

            <div>
              <h2 className="font-bebas text-3xl tracking-wider text-white">
                {selectedGarment.id === "__custom_request__"
                  ? labels.custom_request_btn
                  : isCustom
                  ? labels.modal_custom_title
                  : labels.modal_title}
              </h2>
              {selectedGarment.id !== "__custom_request__" && (
                <p className="text-sm text-[#f39c12] font-semibold">{selectedGarment.name}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">{labels.char_label}</label>
              <input
                value={charName}
                onChange={(e) => setCharName(e.target.value)}
                placeholder={labels.char_placeholder}
                className="w-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[rgba(243,156,18,0.5)]"
              />
            </div>

            {isCustom && (
              <>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">{labels.custom_desc_label}</label>
                  <textarea
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    placeholder={labels.custom_desc_placeholder}
                    rows={3}
                    className="w-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[rgba(243,156,18,0.5)] resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">{labels.ref_image_label}</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={selectedGarment?.id === "__custom_request__" ? "image/*" : "image/*,video/mp4,video/quicktime"}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleRefImageUpload(file);
                    }}
                  />
                  {refImageUrl ? (
                    <div className="flex items-center gap-2">
                      {refImageUrl.match(/\.(mp4|mov)$/i) ? (
                        <video src={refImageUrl} className="rounded-lg border border-[rgba(255,215,0,0.2)] h-14 w-20 object-cover" muted playsInline />
                      ) : (
                        <Image src={refImageUrl} alt="Referencia" width={60} height={60} className="rounded-lg object-cover border border-[rgba(255,215,0,0.2)]" />
                      )}
                      <button onClick={() => setRefImageUrl(null)} className="text-red-500 hover:text-red-400 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 border border-dashed border-[rgba(255,255,255,0.15)] rounded-lg hover:border-[rgba(243,156,18,0.4)] hover:text-gray-300 transition-colors disabled:opacity-50"
                    >
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      {isUploading ? "Subiendo..." : selectedGarment?.id === "__custom_request__" ? "Subir imagen de referencia" : "Subir imagen o video (MP4)"}
                    </button>
                  )}
                </div>
              </>
            )}

            {tebexReady === "checking" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>{TEBEX_MESSAGES[checkPhase]?.icon} {TEBEX_MESSAGES[checkPhase]?.text ?? labels.tebex_checking}</span>
                </div>
                <div className="w-full h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${((checkPhase + 1) / TEBEX_MESSAGES.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {tebexReady === "error" && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-red-400">{labels.tebex_error}</p>
                <button onClick={verifyTebex} className="flex items-center gap-2 text-sm text-[#f39c12] hover:underline">
                  <RefreshCw className="h-4 w-4" />
                  {labels.tebex_retry}
                </button>
              </div>
            )}

            {tebexReady === "ok" && (
              <button
                onClick={handleCheckout}
                disabled={isPending || isUploading}
                className="flex items-center justify-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm transition-colors"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? "Procesando..." : labels.btn_checkout}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
