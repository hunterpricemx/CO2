"use client";

import { useState, useRef, useTransition } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check, AlertCircle, Upload, ImageIcon } from "lucide-react";
import type { DonationPackageRow, PackageFormData } from "./actions";
import {
  createPackage, updatePackage, deletePackage, togglePackage, uploadPackageImage,
} from "./actions";

const VERSION_LABELS: Record<number, string> = { 0: "Ambas", 1: "V1", 2: "V2" };

const EMPTY_FORM: PackageFormData = {
  name: "", price_usd: 0, cps: 0, version: 0,
  active: true, sort_order: 10, bonus_label: "", image_url: "", tebex_package_id: "",
};

type Props = { packages: DonationPackageRow[] };

export default function PackagesManager({ packages: initial }: Props) {
  const [packages, setPackages] = useState(initial);
  const [modal, setModal] = useState<"create" | DonationPackageRow | null>(null);
  const [form, setForm] = useState<PackageFormData>(EMPTY_FORM);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function openCreate() {
    setForm(EMPTY_FORM);
    setModal("create");
    setMsg(null);
  }

  function openEdit(pkg: DonationPackageRow) {
    setForm({
      name: pkg.name, price_usd: pkg.price_usd, cps: pkg.cps,
      version: pkg.version, active: pkg.active, sort_order: pkg.sort_order,
      bonus_label: pkg.bonus_label ?? "", image_url: pkg.image_url ?? "", tebex_package_id: pkg.tebex_package_id ?? "",
    });
    setModal(pkg);
    setMsg(null);
  }

  function closeModal() { setModal(null); setMsg(null); }

  function handleToggle(pkg: DonationPackageRow) {
    startTransition(async () => {
      const res = await togglePackage(pkg.id, !pkg.active);
      if (res.success) {
        setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, active: !p.active } : p));
      } else {
        setMsg({ ok: false, text: res.message });
      }
    });
  }

  function handleDelete(pkg: DonationPackageRow) {
    if (!confirm(`¿Eliminar "${pkg.name}"?`)) return;
    startTransition(async () => {
      const res = await deletePackage(pkg.id);
      if (res.success) setPackages(prev => prev.filter(p => p.id !== pkg.id));
      else setMsg({ ok: false, text: res.message });
    });
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadPackageImage(fd);
    setUploading(false);
    if (res.success && res.url) {
      setForm(f => ({ ...f, image_url: res.url! }));
    } else {
      setMsg({ ok: false, text: res.message });
    }
  }

  function handleSubmit() {
    if (!form.name || form.price_usd <= 0 || form.cps <= 0) {
      setMsg({ ok: false, text: "Nombre, precio y CPs son obligatorios" });
      return;
    }
    startTransition(async () => {
      let res;
      if (modal === "create") {
        res = await createPackage(form);
        if (res.success) {
          window.location.reload();
        }
      } else if (modal && typeof modal === "object") {
        res = await updatePackage(modal.id, form);
        if (res.success) {
          setPackages(prev => prev.map(p =>
            p.id === (modal as DonationPackageRow).id
              ? { ...p, ...form, bonus_label: form.bonus_label || null }
              : p
          ));
          closeModal();
        }
      }
      if (res && !res.success) setMsg({ ok: false, text: res.message });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-5xl tracking-wider text-white">Paquetes de Donación</h1>
          <p className="text-sm text-gray-500 mt-1">{packages.length} paquetes configurados</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e08e0b] text-black font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo paquete
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-160">
          <thead>
            <tr className="border-b border-[rgba(255,215,0,0.08)]">
              {[
                "Imagen",
                "Orden",
                "Nombre",
                "CPs",
                "Precio",
                "Versión",
                "Tebex ID",
                "Bonus label",
                "Estado",
                "Acciones",
              ].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {packages.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-600">Sin paquetes</td></tr>
            )}
            {packages.map(pkg => (
              <tr key={pkg.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-white/2">
                <td className="px-4 py-3">
                  {pkg.image_url
                    ? <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={pkg.image_url} alt={pkg.name} className="w-10 h-10 object-cover rounded" />
                      </>
                    : <div className="w-10 h-10 rounded bg-[#222] flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-600" /></div>
                  }
                </td>
                <td className="px-4 py-3 text-gray-400">{pkg.sort_order}</td>
                <td className="px-4 py-3 text-white font-medium">{pkg.name}</td>
                <td className="px-4 py-3 text-amber-400 font-semibold">{pkg.cps.toLocaleString()}</td>
                <td className="px-4 py-3 text-white">${pkg.price_usd.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-300">{VERSION_LABELS[pkg.version] ?? pkg.version}</td>
                <td className="px-4 py-3 text-cyan-300 text-xs">{pkg.tebex_package_id ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{pkg.bonus_label ?? "—"}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggle(pkg)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                  >
                    {pkg.active
                      ? <><ToggleRight className="w-5 h-5 text-green-400" /><span className="text-green-400">Activo</span></>
                      : <><ToggleLeft className="w-5 h-5 text-gray-500" /><span className="text-gray-500">Inactivo</span></>
                    }
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(pkg)} className="text-blue-400 hover:text-blue-300 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(pkg)} className="text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.15)] rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
              <h2 className="text-white font-semibold text-lg">
                {modal === "create" ? "Nuevo paquete" : `Editar: ${(modal as DonationPackageRow).name}`}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              {msg && (
                <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${msg.ok ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                  {msg.ok ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {msg.text}
                </div>
              )}

              <Field label="Nombre">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] w-full" placeholder="Ej: Gold" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Precio USD">
                  <input type="number" min="0" step="0.01" value={form.price_usd}
                    onChange={e => setForm(f => ({ ...f, price_usd: parseFloat(e.target.value) || 0 }))}
                    className="bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] w-full" />
                </Field>
                <Field label="CPs">
                  <input type="number" min="0" value={form.cps}
                    onChange={e => setForm(f => ({ ...f, cps: parseInt(e.target.value) || 0 }))}
                    className="bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] w-full" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Versión">
                  <select value={form.version} onChange={e => setForm(f => ({ ...f, version: parseInt(e.target.value) }))}
                    className="bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] w-full">
                    <option value={0}>Ambas</option>
                    <option value={1}>Solo V1</option>
                    <option value={2}>Solo V2</option>
                  </select>
                </Field>
                <Field label="Orden">
                  <input type="number" min="0" value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                    className="bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] w-full" />
                </Field>
              </div>

              <Field label="Bonus label (opcional)">
                <input value={form.bonus_label}
                  onChange={e => setForm(f => ({ ...f, bonus_label: e.target.value }))}
                  className="bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] w-full" placeholder="Ej: +20% esta semana" />
              </Field>

              <Field label="Tebex package ID (opcional)">
                <input value={form.tebex_package_id}
                  onChange={e => setForm(f => ({ ...f, tebex_package_id: e.target.value }))}
                  className="bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] w-full"
                  placeholder="Ej: 6276316" />
              </Field>

              <Field label="Imagen del paquete">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden shrink-0">
                    {form.image_url
                      ? <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                        </>
                      : <ImageIcon className="w-6 h-6 text-gray-600" />
                    }
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 bg-[#111] border border-[rgba(255,255,255,0.1)] hover:border-[#f39c12] text-gray-300 hover:text-white rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {uploading ? "Subiendo..." : "Subir imagen"}
                    </button>
                    {form.image_url && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, image_url: "" }))}
                        className="text-xs text-red-400 hover:text-red-300 text-left transition-colors"
                      >
                        Quitar imagen
                      </button>
                    )}
                  </div>
                </div>
              </Field>

              <Field label="">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={form.active}
                    onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                    className="accent-amber-500 w-4 h-4" />
                  Paquete activo (visible en el sitio)
                </label>
              </Field>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[rgba(255,255,255,0.06)]">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || uploading}
                className="px-5 py-2 bg-[#f39c12] hover:bg-[#e08e0b] disabled:opacity-50 text-black font-semibold rounded-lg text-sm transition-colors"
              >
                {isPending ? "Guardando..." : modal === "create" ? "Crear" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs text-gray-400 uppercase tracking-wider">{label}</label>}
      {children}
    </div>
  );
}
