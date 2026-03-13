"use client";

import { useForm } from "@refinedev/react-hook-form";
import { useBack } from "@refinedev/core";
import { ChevronLeft, Loader2 } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import type { InfluencerFormData } from "@/modules/influencers/types";

const FIELD_CLS =
  "bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors w-full";
const LABEL_CLS = "text-xs text-gray-400 uppercase tracking-wider mb-1 block";

export default function AdminInfluencersEditPage() {
  const back = useBack();
  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { isSubmitting },
    refineCore: { onFinish },
  } = useForm<InfluencerFormData>({
    refineCoreProps: { resource: "influencers", action: "edit", redirect: "list" },
  });

  const photoUrl = watch("photo_url");

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={back}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bebas text-4xl tracking-wider text-white">Editar Influencer</h1>
      </div>

      <form
        onSubmit={handleSubmit(onFinish)}
        className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl p-6 flex flex-col gap-5"
      >
        {/* Nombre + Slug */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Nombre *</label>
            <input {...register("name", { required: true })} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Slug *</label>
            <input {...register("slug", { required: true })} className={FIELD_CLS} />
          </div>
        </div>

        {/* Foto */}
        <ImageUploadField
          label="Foto del influencer"
          value={photoUrl}
          onChange={(value) => setValue("photo_url", value, { shouldDirty: true })}
          folder="influencers"
        />

        {/* Descripción ES / EN / PT */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Descripción</span>
          <div className="grid grid-cols-3 gap-4 mt-1">
            {(["es", "en", "pt"] as const).map((lang) => (
              <div key={lang}>
                <label className={LABEL_CLS}>{lang.toUpperCase()}</label>
                <textarea
                  {...register(`description_${lang}` as keyof InfluencerFormData)}
                  rows={4}
                  className={FIELD_CLS}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Código de Streamer */}
        <div>
          <label className={LABEL_CLS}>Código de Streamer</label>
          <input {...register("streamer_code")} className={FIELD_CLS} />
        </div>

        {/* Redes sociales */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Redes Sociales</span>
          <div className="grid grid-cols-1 gap-3 mt-1">
            {(
              [
                { key: "facebook_url", label: "Facebook URL" },
                { key: "instagram_url", label: "Instagram URL" },
                { key: "tiktok_url", label: "TikTok URL" },
                { key: "youtube_url", label: "YouTube URL" },
                { key: "twitch_url", label: "Twitch URL" },
              ] as { key: keyof InfluencerFormData; label: string }[]
            ).map(({ key, label }) => (
              <div key={key} className="grid grid-cols-4 items-center gap-3">
                <label className="text-xs text-gray-500 text-right">{label}</label>
                <input {...register(key)} className={`col-span-3 ${FIELD_CLS}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Orden + Estado */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Orden (sort_order)</label>
            <input
              {...register("sort_order", { valueAsNumber: true })}
              type="number"
              min={0}
              className={FIELD_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Estado</label>
            <select
              {...register("is_active", { setValueAs: (v) => v === "true" || v === true })}
              className={FIELD_CLS}
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] disabled:opacity-50 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
