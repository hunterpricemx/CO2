"use client";

import { useBack } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { ChevronLeft, Loader2 } from "lucide-react";

const FIELD_CLS =
  "bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors w-full";
const LABEL_CLS = "text-xs text-gray-400 uppercase tracking-wider mb-1 block";

type GuideCategoryFormValues = {
  slug: string;
  name_es: string;
  name_en: string;
  name_pt: string;
  sort_order: number;
};

export default function GuideCategoryCreatePage() {
  const back = useBack();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    saveButtonProps,
    refineCore: { onFinish },
  } = useForm<GuideCategoryFormValues>({
    refineCoreProps: { resource: "guide_categories", action: "create", redirect: "list" },
    defaultValues: { sort_order: 0 },
  });

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={back} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bebas text-4xl tracking-wider text-white">Nueva categoria</h1>
      </div>

      <form onSubmit={handleSubmit(onFinish)} className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl p-6 flex flex-col gap-5">
        <div>
          <label className={LABEL_CLS}>Slug *</label>
          <input {...register("slug", { required: true })} className={FIELD_CLS} placeholder="events" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={LABEL_CLS}>Nombre ES *</label>
            <input {...register("name_es", { required: true })} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Nombre EN *</label>
            <input {...register("name_en", { required: true })} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Nombre PT *</label>
            <input {...register("name_pt", { required: true })} className={FIELD_CLS} />
          </div>
        </div>

        <div>
          <label className={LABEL_CLS}>Orden</label>
          <input type="number" {...register("sort_order", { valueAsNumber: true })} className={FIELD_CLS} />
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
