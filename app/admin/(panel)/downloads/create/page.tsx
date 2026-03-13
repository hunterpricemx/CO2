"use client";

import { useForm } from "@refinedev/react-hook-form";
import { useBack } from "@refinedev/core";
import { ChevronLeft, Loader2 } from "lucide-react";
import type { DownloadFormData } from "@/modules/downloads/types";

const FIELD_CLS =
  "bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors w-full";
const LABEL_CLS = "text-xs text-gray-400 uppercase tracking-wider mb-1 block";

function DownloadForm({ action }: { action: "create" | "edit" }) {
  const back = useBack();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    refineCore: { onFinish },
  } = useForm<DownloadFormData>({
    refineCoreProps: { resource: "downloads", action, redirect: "list" },
    defaultValues:
      action === "create"
        ? { version: "1.0", type: "patch", sort_order: 0, is_active: true, url: "#" }
        : undefined,
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={back}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bebas text-4xl tracking-wider text-white">
          {action === "create" ? "Nueva Descarga" : "Editar Descarga"}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onFinish)}
        className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl p-6 flex flex-col gap-5"
      >
        {/* Version + Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Versión *</label>
            <select {...register("version", { required: true })} className={FIELD_CLS}>
              <option value="1.0">1.0</option>
              <option value="2.0">2.0</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Tipo *</label>
            <select {...register("type", { required: true })} className={FIELD_CLS}>
              <option value="patch">Parche</option>
              <option value="client">Cliente completo</option>
            </select>
          </div>
        </div>

        {/* Patch version + Release date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Número de versión / parche</label>
            <input
              {...register("patch_version")}
              className={FIELD_CLS}
              placeholder="ej: 1.236"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Fecha de lanzamiento</label>
            <input
              {...register("release_date")}
              type="date"
              className={FIELD_CLS}
            />
          </div>
        </div>

        {/* Names */}
        <div className="grid grid-cols-3 gap-4">
          {(["es", "en", "pt"] as const).map((lang) => (
            <div key={lang}>
              <label className={LABEL_CLS}>Nombre {lang.toUpperCase()} *</label>
              <input
                {...register(`name_${lang}` as "name_es" | "name_en" | "name_pt", { required: lang === "es" })}
                className={FIELD_CLS}
              />
            </div>
          ))}
        </div>

        {/* Descriptions */}
        <div className="grid grid-cols-3 gap-4">
          {(["es", "en", "pt"] as const).map((lang) => (
            <div key={lang}>
              <label className={LABEL_CLS}>Descripción {lang.toUpperCase()}</label>
              <textarea
                {...register(`description_${lang}` as "description_es" | "description_en" | "description_pt")}
                rows={3}
                className={FIELD_CLS}
              />
            </div>
          ))}
        </div>

        {/* URL */}
        <div>
          <label className={LABEL_CLS}>URL de descarga *</label>
          <input
            {...register("url", { required: true })}
            className={FIELD_CLS}
            placeholder="https://... ó #"
          />
        </div>

        {/* File size + order */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Tamaño del archivo</label>
            <input
              {...register("file_size")}
              className={FIELD_CLS}
              placeholder="2.4 GB"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Orden</label>
            <input
              {...register("sort_order", { valueAsNumber: true })}
              type="number"
              className={FIELD_CLS}
            />
          </div>
        </div>

        {/* Active */}
        <div className="flex items-center gap-3">
          <input
            {...register("is_active")}
            type="checkbox"
            id="is_active"
            className="h-4 w-4 accent-[#f39c12]"
          />
          <label htmlFor="is_active" className="text-sm text-gray-300">
            Activo (visible en el sitio)
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] disabled:opacity-50 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {action === "create" ? "Crear descarga" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateDownloadPage() {
  return <DownloadForm action="create" />;
}
