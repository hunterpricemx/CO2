"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Save, ArrowLeft, AlertCircle, CheckCircle, Wand2 } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { createScreenshot, updateScreenshot, suggestScreenshotSlug } from "@/modules/screenshots/actions";
import type { Screenshot, ScreenshotCategory } from "@/modules/screenshots/types";
import type { ScreenshotInput } from "@/modules/screenshots/schemas";

type Props = {
  mode: "create" | "edit";
  initial?: Screenshot;
  categories: ScreenshotCategory[];
};

const inputCls = "w-full bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors";
const labelCls = "text-xs text-gray-400 uppercase tracking-wider mb-1 block";
const helpCls  = "text-[10px] text-gray-600 mt-1";

export function ScreenshotForm({ mode, initial, categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const [form, setForm] = useState<ScreenshotInput>({
    slug:           initial?.slug           ?? "",
    version:        initial?.version        ?? "2.0",
    category_id:    initial?.category_id    ?? null,
    title_es:       initial?.title_es       ?? "",
    title_en:       initial?.title_en       ?? "",
    title_pt:       initial?.title_pt       ?? "",
    description_es: initial?.description_es ?? "",
    description_en: initial?.description_en ?? "",
    description_pt: initial?.description_pt ?? "",
    image_url:      initial?.image_url      ?? "",
    thumbnail_url:  initial?.thumbnail_url  ?? null,
    status:         initial?.status         ?? "published",
    tags:           initial?.tags           ?? [],
  });
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));

  const set = <K extends keyof ScreenshotInput>(k: K, v: ScreenshotInput[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSuggestSlug = async () => {
    if (!form.title_es.trim()) return;
    const slug = await suggestScreenshotSlug(form.title_es);
    set("slug", slug);
  };

  const handleSubmit = () => {
    setFeedback(null);
    const payload: ScreenshotInput = {
      ...form,
      tags: tagsInput.split(",").map(t => t.trim()).filter(Boolean).slice(0, 20),
      description_es: form.description_es?.trim() || null,
      description_en: form.description_en?.trim() || null,
      description_pt: form.description_pt?.trim() || null,
    };

    startTransition(async () => {
      const r = mode === "create"
        ? await createScreenshot(payload)
        : await updateScreenshot(initial!.id, payload);

      if (r.success) {
        setFeedback({ ok: true, msg: mode === "create" ? "Screenshot creado." : "Cambios guardados." });
        if (mode === "create") {
          setTimeout(() => router.push(`/admin/screenshots/edit/${r.data.id}`), 600);
        } else {
          router.refresh();
        }
      } else {
        setFeedback({ ok: false, msg: r.error });
      }
    });
  };

  const valid = form.slug.length >= 3 && form.title_es.length >= 2 && form.image_url.length > 8;

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/admin/screenshots"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al listado
      </Link>

      {/* Imagen + meta básica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#111] rounded-xl p-5 border border-white/5">
          <ImageUploadField
            label="Screenshot"
            value={form.image_url}
            onChange={(v) => set("image_url", v ?? "")}
            folder="screenshots"
          />
          <p className={helpCls}>JPG / PNG / WebP / GIF, máx 5 MB. Resolución recomendada ≥ 1280×720.</p>
        </div>

        <div className="bg-[#111] rounded-xl p-5 border border-white/5 space-y-4">
          <div>
            <label className={labelCls}>Versión</label>
            <div className="flex gap-2">
              {(["1.0", "2.0", "both"] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("version", v)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    form.version === v
                      ? "bg-[#f39c12]/20 border border-[#f39c12]/40 text-[#f39c12]"
                      : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {v === "both" ? "Ambas" : `v${v}`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Categoría</label>
            <select className={inputCls} value={form.category_id ?? ""} onChange={e => set("category_id", e.target.value || null)}>
              <option value="">— sin categoría —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_es}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Estado</label>
            <div className="flex gap-2">
              {(["published", "draft"] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("status", s)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    form.status === s
                      ? s === "published"
                        ? "bg-green-900/30 border border-green-700/40 text-green-300"
                        : "bg-yellow-900/30 border border-yellow-700/40 text-yellow-300"
                      : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {s === "published" ? "Publicado" : "Borrador"}
                </button>
              ))}
            </div>
            <p className={helpCls}>Los borradores no aparecen en la galería pública.</p>
          </div>
        </div>
      </div>

      {/* Slug */}
      <div className="bg-[#111] rounded-xl p-5 border border-white/5">
        <label className={labelCls}>Slug (URL pública)</label>
        <div className="flex gap-2">
          <input
            className={`${inputCls} font-mono`}
            placeholder="ej. boss-evil-god-2026-05"
            value={form.slug}
            onChange={e => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          />
          <button
            type="button"
            onClick={handleSuggestSlug}
            disabled={!form.title_es.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-[#f39c12]/15 border border-[#f39c12]/30 text-[#f39c12] hover:bg-[#f39c12]/25 disabled:opacity-40"
            title="Generar desde el título en español"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Auto
          </button>
        </div>
        <p className={helpCls}>
          URL final: <code className="text-[#f39c12]">/[locale]/[version]/screenshots/{form.slug || "<slug>"}</code>
          {" — "}solo a-z, 0-9, guiones. Único.
        </p>
      </div>

      {/* Títulos multilingual */}
      <div className="bg-[#111] rounded-xl p-5 border border-white/5 space-y-4">
        <h3 className="text-sm font-medium text-white uppercase tracking-wide">Títulos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Español *</label>
            <input className={inputCls} value={form.title_es} onChange={e => set("title_es", e.target.value)} placeholder="Obligatorio" />
          </div>
          <div>
            <label className={labelCls}>English</label>
            <input className={inputCls} value={form.title_en} onChange={e => set("title_en", e.target.value)} placeholder="Si vacío usa el español" />
          </div>
          <div>
            <label className={labelCls}>Português</label>
            <input className={inputCls} value={form.title_pt} onChange={e => set("title_pt", e.target.value)} placeholder="Si vacío usa el español" />
          </div>
        </div>
      </div>

      {/* Descripciones */}
      <div className="bg-[#111] rounded-xl p-5 border border-white/5 space-y-4">
        <h3 className="text-sm font-medium text-white uppercase tracking-wide">Descripciones (opcional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Español</label>
            <textarea className={`${inputCls} h-24 resize-none`} value={form.description_es ?? ""} onChange={e => set("description_es", e.target.value)} maxLength={2000} />
          </div>
          <div>
            <label className={labelCls}>English</label>
            <textarea className={`${inputCls} h-24 resize-none`} value={form.description_en ?? ""} onChange={e => set("description_en", e.target.value)} maxLength={2000} />
          </div>
          <div>
            <label className={labelCls}>Português</label>
            <textarea className={`${inputCls} h-24 resize-none`} value={form.description_pt ?? ""} onChange={e => set("description_pt", e.target.value)} maxLength={2000} />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-[#111] rounded-xl p-5 border border-white/5">
        <label className={labelCls}>Tags (separados por coma)</label>
        <input
          className={inputCls}
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          placeholder="ej. boss, raid, guild-vs-guild"
        />
        <p className={helpCls}>Máx 20 tags. Sirven para búsqueda futura y filtrado.</p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
          feedback.ok ? "border-green-700/40 bg-green-900/20 text-green-300" : "border-red-700/40 bg-red-900/20 text-red-300"
        }`}>
          {feedback.ok ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
          <p>{feedback.msg}</p>
        </div>
      )}

      {/* Submit — sticky en mobile para que el botón siempre esté a mano */}
      <div className="sticky bottom-0 -mx-4 md:mx-0 md:relative bg-[#0f0503]/95 md:bg-transparent backdrop-blur md:backdrop-blur-none border-t border-white/10 md:border-0 px-4 md:px-0 py-3 md:py-0 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !valid}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 md:py-2.5 rounded-lg bg-[#f39c12] text-black hover:bg-[#e67e22] md:bg-[#f39c12]/20 md:text-[#f39c12] md:border md:border-[#f39c12]/40 md:hover:bg-[#f39c12]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Crear screenshot" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
