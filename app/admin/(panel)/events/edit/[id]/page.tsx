"use client";

import { useForm } from "@refinedev/react-hook-form";
import { useFieldArray } from "react-hook-form";
import { useBack } from "@refinedev/core";
import { ChevronLeft, Loader2, Plus, X } from "lucide-react";
import { SCHEDULE_DAYS, SCHEDULE_DAY_LABELS } from "@/modules/events/types";
import type { ScheduleDay } from "@/modules/events/types";

const FIELD_CLS =
  "bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors w-full";

const LABEL_CLS = "text-xs text-gray-400 uppercase tracking-wider mb-1 block";

export default function EventEditPage() {
  const back = useBack();

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
    saveButtonProps,
    refineCore: { onFinish, query: queryResult },
  } = useForm<Record<string, any>>({
    refineCoreProps: {
      resource: "events",
      action: "edit",
      redirect: "list",
    },
  });

  const { fields: scheduleFields, append: appendSchedule, remove: removeSchedule } =
    useFieldArray({ control, name: "schedule" });

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={back}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bebas text-4xl tracking-wider text-white">
          Editar Evento
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onFinish)}
        className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl p-6 flex flex-col gap-5"
      >
        <div className="grid grid-cols-3 gap-4">
          {(["es", "en", "pt"] as const).map((lang) => (
            <div key={lang}>
              <label className={LABEL_CLS}>Título {lang.toUpperCase()} *</label>
              <input
                {...register(`title_${lang}` as any, { required: true })}
                className={FIELD_CLS}
              />
            </div>
          ))}
        </div>

        <div>
          <label className={LABEL_CLS}>Horario *</label>
          <div className="flex flex-col gap-2">
            {scheduleFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                <select
                  {...register(`schedule.${index}.day` as any)}
                  className={FIELD_CLS}
                >
                  {SCHEDULE_DAYS.map((d) => (
                    <option key={d} value={d}>{SCHEDULE_DAY_LABELS[d].es}</option>
                  ))}
                </select>
                <input
                  type="time"
                  {...register(`schedule.${index}.time` as any, { required: true })}
                  className={`${FIELD_CLS} w-36 scheme-dark`}
                />
                {scheduleFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSchedule(index)}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => appendSchedule({ day: "daily" as ScheduleDay, time: "20:00" })}
              className="flex items-center gap-1.5 text-xs text-[#f39c12] hover:text-[#e67e22] transition-colors mt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar horario
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {(["es", "en", "pt"] as const).map((lang) => (
            <div key={lang}>
              <label className={LABEL_CLS}>Descripción {lang.toUpperCase()}</label>
              <textarea {...register(`description_${lang}` as any)} rows={4} className={FIELD_CLS} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {(["es", "en", "pt"] as const).map((lang) => (
            <div key={lang}>
              <label className={LABEL_CLS}>Recompensas {lang.toUpperCase()}</label>
              <textarea {...register(`rewards_${lang}` as any)} rows={3} className={FIELD_CLS} />
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
          <button
            type="button"
            onClick={back}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            {...saveButtonProps}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
