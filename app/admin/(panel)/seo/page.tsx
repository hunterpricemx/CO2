"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Search, Globe, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ImageUploadField from "@/components/admin/ImageUploadField";
import type { SeoPageKey, SeoPageEntry } from "@/lib/seo-types";
import { SEO_PAGE_KEYS } from "@/lib/seo-types";

const FIELD_CLS =
  "bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors w-full";

type SettingsMap = Record<string, string>;

const PAGE_LABELS: Record<SeoPageKey, string> = {
  home:        "Inicio",
  guides:      "Guías",
  fixes:       "Fixes / Parches",
  events:      "Eventos",
  news:        "Noticias",
  market:      "Mercado",
  rankings:    "Rankings",
  downloads:   "Descargas",
  donate:      "Donar",
  vip:         "VIP",
  influencers: "Influencers",
  compose:     "Calculadora Compose",
  terms:       "Términos",
};

export default function AdminSeoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  /* ── Estado global ── */
  const [siteName,    setSiteName]    = useState("Conquer Classic Plus");
  const [description, setDescription] = useState("");
  const [ogImage,     setOgImage]     = useState<string | null>(null);

  /* ── Estado por página ── */
  const [pages, setPages] = useState<Partial<Record<SeoPageKey, SeoPageEntry>>>({});

  /* ── Carga ── */
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await (supabase as unknown as {
          from: (t: string) => { select: (c: string) => Promise<{ data: SettingsMap[] | null }> };
        })
          .from("site_settings")
          .select("key, value");

        if (!data) return;
        const map: SettingsMap = Object.fromEntries(data.map((r) => [r.key, r.value ?? ""]));

        setSiteName(map.seo_site_name || "Conquer Classic Plus");
        setDescription(map.seo_default_description || "");
        setOgImage(map.seo_og_image || null);
        try { setPages(JSON.parse(map.seo_pages || "{}")); } catch { setPages({}); }
      } catch {
        toast.error("No se pudieron cargar los ajustes SEO.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Guardar ── */
  async function save(entries: { key: string; value: string }[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error();
      toast.success("SEO guardado correctamente.");
    } catch {
      toast.error("No se pudieron guardar los ajustes SEO.");
    } finally {
      setSaving(false);
    }
  }

  function updatePage(key: SeoPageKey, field: keyof SeoPageEntry, value: string) {
    setPages((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-gray-500 text-sm font-poppins">Cargando ajustes SEO...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="font-bebas text-5xl tracking-wider text-white">SEO</h1>
        <p className="text-sm text-gray-500 mt-1 font-poppins">
          Título del sitio, descripciones e imágenes Open Graph para buscadores y redes sociales.
        </p>
      </div>

      {/* ── Global ── */}
      <Section
        title="Configuración Global"
        description="Se aplica a todas las páginas que no tengan un override específico."
        icon={<Globe className="h-5 w-5 text-gold/60" />}
        onSave={() =>
          save([
            { key: "seo_site_name",          value: siteName },
            { key: "seo_default_description", value: description },
            { key: "seo_og_image",            value: ogImage || "" },
          ])
        }
        saving={saving}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-poppins">
              Nombre del sitio
            </label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Conquer Classic Plus"
              className={FIELD_CLS}
            />
            <p className="text-[11px] text-gray-600 font-poppins">
              Aparece en las pestañas del navegador: &quot;Página | Nombre del sitio&quot;
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-poppins">
              Descripción por defecto
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Servidor privado de Conquer Online..."
              className={FIELD_CLS}
            />
            <p className="text-[11px] text-gray-600 font-poppins">
              Aparece como descripción en Google y al compartir en redes sociales.
            </p>
          </div>

          <ImageUploadField
            label="Imagen Open Graph por defecto (1200 × 630 px recomendado)"
            value={ogImage}
            onChange={(v) => setOgImage(v)}
            folder="site-settings/seo"
          />
        </div>
      </Section>

      {/* ── Por página ── */}
      <Section
        title="Por Página"
        description="Overrides específicos. Deja en blanco para heredar los valores globales."
        icon={<FileText className="h-5 w-5 text-gold/60" />}
        onSave={() => save([{ key: "seo_pages", value: JSON.stringify(pages) }])}
        saving={saving}
      >
        <div className="flex flex-col gap-4">
          {SEO_PAGE_KEYS.map((pageKey) => {
            const entry = pages[pageKey] ?? {};
            return (
              <div
                key={pageKey}
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-[#f39c12]" />
                  <span className="text-sm text-[#f39c12] font-semibold font-poppins">
                    {PAGE_LABELS[pageKey]}
                  </span>
                  <span className="text-xs text-gray-600 font-mono">/{pageKey}</span>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Título</label>
                    <input
                      type="text"
                      value={entry.title ?? ""}
                      onChange={(e) => updatePage(pageKey, "title", e.target.value)}
                      placeholder="Dejar en blanco = global"
                      className={FIELD_CLS}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Imagen OG (URL)</label>
                    <input
                      type="url"
                      value={entry.og_image ?? ""}
                      onChange={(e) => updatePage(pageKey, "og_image", e.target.value)}
                      placeholder="https://... o dejar en blanco"
                      className={FIELD_CLS}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Descripción</label>
                  <textarea
                    rows={2}
                    value={entry.description ?? ""}
                    onChange={(e) => updatePage(pageKey, "description", e.target.value)}
                    placeholder="Dejar en blanco = descripción global"
                    className={FIELD_CLS}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

/* ── Section wrapper ── */
function Section({
  title,
  description,
  children,
  onSave,
  saving,
  icon,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl flex flex-col gap-5"
      style={{
        background: "rgba(15,5,3,0.95)",
        border: "1px solid rgba(255,215,0,0.12)",
        padding: "1.5rem",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h2 className="font-bebas text-2xl tracking-wider text-white">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-poppins">{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] disabled:opacity-60 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors shrink-0"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
      {children}
    </div>
  );
}
