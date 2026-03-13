"use client";

import { useForm } from "@refinedev/react-hook-form";
import { useBack, useList } from "@refinedev/core";
import { Controller } from "react-hook-form";
import { ChevronLeft, Loader2 } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import RichTextEditor from "@/components/admin/RichTextEditor";
import type { GuideCategoryRow, GuideFormData } from "@/modules/guides/types";

const FIELD_CLS =
  "bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors w-full";
const LABEL_CLS = "text-xs text-gray-400 uppercase tracking-wider mb-1 block";

function GuideForm({ action }: { action: "create" | "edit" }) {
  const back = useBack();
  const {
    register,
    control,
    setValue,
    watch,
    handleSubmit,
    formState: { isSubmitting },
    saveButtonProps,
    refineCore: { onFinish },
  } = useForm<GuideFormData>({
    refineCoreProps: { resource: "guides", action, redirect: "list" },
    defaultValues: action === "create" ? { status: "draft", version: "both" } : undefined,
  });

  const thumbnail = watch("featured_image");
  const { query: categoriesQuery } = useList<GuideCategoryRow>({
    resource: "guide_categories",
    sorters: [{ field: "sort_order", order: "asc" }],
    pagination: { pageSize: 100 },
  });
  const categories: GuideCategoryRow[] = categoriesQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={back} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bebas text-4xl tracking-wider text-white">
          {action === "create" ? "Nueva Guía" : "Editar Guía"}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onFinish)} className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl p-6 flex flex-col gap-5">
        <div>
          <label className={LABEL_CLS}>Slug *</label>
          <input {...register("slug", { required: true })} className={FIELD_CLS} placeholder="como-subir-de-nivel" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {(["es", "en", "pt"] as const).map((lang) => (
            <div key={lang}>
              <label className={LABEL_CLS}>Título {lang.toUpperCase()} *</label>
              <input {...register(`title_${lang}` as any, { required: true })} className={FIELD_CLS} />
            </div>
          ))}
        </div>

        <ImageUploadField
          label="Thumbnail"
          value={thumbnail}
          onChange={(value) => setValue("featured_image", value, { shouldDirty: true, shouldValidate: true })}
          folder="guides"
        />

        <div>
          <label className={LABEL_CLS}>Video YouTube (URL)</label>
          <input
            {...register("video_url")}
            className={FIELD_CLS}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        <div>
          <label className={LABEL_CLS}>Categoria</label>
          <select {...register("category_id")} className={FIELD_CLS}>
            <option value="">Sin categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name_es}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {(["es", "en", "pt"] as const).map((lang) => (
            <div key={lang}>
              <label className={LABEL_CLS}>Contenido {lang.toUpperCase()}</label>
              <Controller
                control={control}
                name={`content_${lang}` as any}
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={`Escribe contenido ${lang.toUpperCase()}...`}
                  />
                )}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Versión</label>
            <select {...register("version")} className={FIELD_CLS}>
              <option value="both">Ambas</option>
              <option value="1.0">1.0</option>
              <option value="2.0">2.0</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Estado</label>
            <select {...register("status")} className={FIELD_CLS}>
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="archived">Archivado</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-[rgba(255,255,255,0.06)]">
          <button type="button" onClick={back} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-[rgba(255,255,255,0.1)] rounded-lg transition-colors">
            Cancelar
          </button>
          <button {...saveButtonProps} disabled={isSubmitting} className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

export default function GuideCreatePage() {
  return <GuideForm action="create" />;
}
