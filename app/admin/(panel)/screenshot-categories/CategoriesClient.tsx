"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Save, Trash2, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import {
  createScreenshotCategory,
  updateScreenshotCategory,
  deleteScreenshotCategory,
  type ScreenshotCategory,
} from "@/modules/screenshots";

type Draft = Omit<ScreenshotCategory, "id" | "created_at"> & { id?: string };

const inputCls = "w-full bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12]";

export function CategoriesClient({ initial }: { initial: ScreenshotCategory[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Draft[]>(initial);
  const [busyId, setBusyId] = useState<string | "new" | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [, startTransition] = useTransition();

  const [draftNew, setDraftNew] = useState<Draft>({
    slug: "", name_es: "", name_en: "", name_pt: "", icon: null, sort_order: 100,
  });

  const updateRowField = (id: string, k: keyof Draft, v: string | number | null) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [k]: v } : r));

  const handleSaveExisting = async (row: Draft) => {
    if (!row.id) return;
    setBusyId(row.id);
    const r = await updateScreenshotCategory(row.id, {
      slug: row.slug, name_es: row.name_es, name_en: row.name_en, name_pt: row.name_pt,
      icon: row.icon ?? null, sort_order: row.sort_order ?? 0,
    });
    setBusyId(null);
    setFeedback({ ok: r.success, msg: r.success ? "Categoría actualizada." : ("error" in r ? r.error : "Error") });
    if (r.success) startTransition(() => router.refresh());
  };

  const handleDelete = async (row: Draft) => {
    if (!row.id) return;
    if (!confirm(`¿Eliminar la categoría "${row.name_es}"? Los screenshots asignados quedarán sin categoría.`)) return;
    setBusyId(row.id);
    const r = await deleteScreenshotCategory(row.id);
    setBusyId(null);
    if (r.success) {
      setRows(prev => prev.filter(x => x.id !== row.id));
      setFeedback({ ok: true, msg: "Categoría eliminada." });
      startTransition(() => router.refresh());
    } else {
      setFeedback({ ok: false, msg: ("error" in r ? r.error : "Error") });
    }
  };

  const handleCreate = async () => {
    setBusyId("new");
    const r = await createScreenshotCategory(draftNew);
    setBusyId(null);
    if (r.success) {
      setFeedback({ ok: true, msg: "Categoría creada." });
      setDraftNew({ slug: "", name_es: "", name_en: "", name_pt: "", icon: null, sort_order: 100 });
      startTransition(() => router.refresh());
    } else {
      setFeedback({ ok: false, msg: ("error" in r ? r.error : "Error") });
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabla existentes */}
      <div className="bg-[#111] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wider bg-[#0a0a0a]">
                <th className="px-3 py-2.5 w-32">Slug</th>
                <th className="px-3 py-2.5">Español</th>
                <th className="px-3 py-2.5">English</th>
                <th className="px-3 py-2.5">Português</th>
                <th className="px-3 py-2.5 w-24">Icono</th>
                <th className="px-3 py-2.5 w-20 text-center">Orden</th>
                <th className="px-3 py-2.5 w-40"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="px-3 py-2"><input className={`${inputCls} font-mono text-xs`} value={row.slug} onChange={e => updateRowField(row.id!, "slug", e.target.value)} /></td>
                  <td className="px-3 py-2"><input className={inputCls} value={row.name_es} onChange={e => updateRowField(row.id!, "name_es", e.target.value)} /></td>
                  <td className="px-3 py-2"><input className={inputCls} value={row.name_en} onChange={e => updateRowField(row.id!, "name_en", e.target.value)} /></td>
                  <td className="px-3 py-2"><input className={inputCls} value={row.name_pt} onChange={e => updateRowField(row.id!, "name_pt", e.target.value)} /></td>
                  <td className="px-3 py-2"><input className={inputCls} value={row.icon ?? ""} onChange={e => updateRowField(row.id!, "icon", e.target.value || null)} placeholder="lucide" /></td>
                  <td className="px-3 py-2"><input type="number" className={`${inputCls} text-center`} value={row.sort_order ?? 0} onChange={e => updateRowField(row.id!, "sort_order", +e.target.value)} /></td>
                  <td className="px-3 py-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleSaveExisting(row)}
                      disabled={busyId === row.id}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 disabled:opacity-50"
                    >
                      {busyId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      disabled={busyId === row.id}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] bg-red-900/20 border border-red-700/40 text-red-300 hover:bg-red-900/40 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">Sin categorías. Crea la primera abajo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Crear nueva */}
      <div className="bg-[#111] rounded-xl p-5 border border-white/5 space-y-3">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#f39c12]" />
          <h3 className="text-sm font-medium text-white uppercase tracking-wide">Nueva categoría</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <input className={`${inputCls} font-mono`} placeholder="slug" value={draftNew.slug} onChange={e => setDraftNew(d => ({ ...d, slug: e.target.value }))} />
          <input className={inputCls} placeholder="Español" value={draftNew.name_es} onChange={e => setDraftNew(d => ({ ...d, name_es: e.target.value }))} />
          <input className={inputCls} placeholder="English" value={draftNew.name_en} onChange={e => setDraftNew(d => ({ ...d, name_en: e.target.value }))} />
          <input className={inputCls} placeholder="Português" value={draftNew.name_pt} onChange={e => setDraftNew(d => ({ ...d, name_pt: e.target.value }))} />
          <input className={inputCls} placeholder="icono (lucide)" value={draftNew.icon ?? ""} onChange={e => setDraftNew(d => ({ ...d, icon: e.target.value || null }))} />
          <input type="number" className={`${inputCls} text-center`} placeholder="orden" value={draftNew.sort_order ?? 100} onChange={e => setDraftNew(d => ({ ...d, sort_order: +e.target.value }))} />
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={busyId === "new" || !draftNew.slug || !draftNew.name_es || !draftNew.name_en || !draftNew.name_pt}
          className="inline-flex items-center gap-2 rounded-lg border border-[#f39c12]/30 bg-[#f39c12]/15 px-4 py-2 text-sm text-[#f39c12] hover:bg-[#f39c12]/25 disabled:opacity-40"
        >
          {busyId === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Crear categoría
        </button>
      </div>

      {feedback && (
        <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
          feedback.ok ? "border-green-700/40 bg-green-900/20 text-green-300" : "border-red-700/40 bg-red-900/20 text-red-300"
        }`}>
          {feedback.ok ? <CheckCircle className="h-4 w-4 mt-0.5" /> : <AlertCircle className="h-4 w-4 mt-0.5" />}
          <p>{feedback.msg}</p>
        </div>
      )}
    </div>
  );
}
