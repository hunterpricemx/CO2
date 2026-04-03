"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createGarmentCategory } from "../actions";

const FIELD_CLS =
  "bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors w-full";
const LABEL_CLS = "text-xs text-gray-400 uppercase tracking-wider mb-1 block";

export default function CreateGarmentCategoryPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("El nombre es requerido."); return; }
    startTransition(async () => {
      const result = await createGarmentCategory({ name, sort_order: sortOrder });
      if (result.success) {
        toast.success("Categoría creada.");
        router.push("/admin/garment-categories");
      } else {
        toast.error(result.error ?? "Error al crear.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bebas text-4xl tracking-wider text-white">Nueva Categoría</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl p-6 flex flex-col gap-5"
      >
        <div>
          <label className={LABEL_CLS}>Nombre *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={FIELD_CLS}
            placeholder="Ej: Épicos"
            required
          />
        </div>

        <div>
          <label className={LABEL_CLS}>Orden de aparición</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className={FIELD_CLS}
            min={0}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center justify-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? "Creando..." : "Crear Categoría"}
        </button>
      </form>
    </div>
  );
}
