"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { createClient } from "@/lib/supabase/client";
import { createGarment } from "../actions";

const FIELD_CLS =
  "bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors w-full";
const LABEL_CLS = "text-xs text-gray-400 uppercase tracking-wider mb-1 block";

export default function CreateGarmentPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [allowsCustom, setAllowsCustom] = useState(false);
  const [isReserved, setIsReserved] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [versions, setVersions] = useState("both");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    createClient()
      .from("garment_categories")
      .select("id, name")
      .order("sort_order")
      .then(({ data }) => setCategories((data ?? []) as { id: string; name: string }[]));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre del garment es requerido.");
      return;
    }
    startTransition(async () => {
      const result = await createGarment({
        name,
        description,
        image_url: imageUrl,
        active,
        allows_custom: allowsCustom,
        is_reserved: isReserved,
        sort_order: sortOrder,
        category_id: categoryId,
        versions,
      });
      if (result.success) {
        toast.success("Garment creado correctamente.");
        router.push("/admin/garments");
      } else {
        toast.error(result.error ?? "Error al crear el garment.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bebas text-4xl tracking-wider text-white">Nuevo Garment</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl p-6 flex flex-col gap-5"
      >
        {/* Name */}
        <div>
          <label className={LABEL_CLS}>Nombre *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={FIELD_CLS}
            placeholder="Ej: Traje de Caballero"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className={LABEL_CLS}>Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${FIELD_CLS} resize-none`}
            placeholder="Descripción del traje..."
          />
        </div>

        {/* Image */}
        <ImageUploadField
          label="Imagen del garment"
          value={imageUrl}
          onChange={setImageUrl}
          folder="garments"
          allowVideo
        />

        {/* Sort order */}
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

        {/* Categoría */}
        <div>
          <label className={LABEL_CLS}>Categoría</label>
          <select
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value || null)}
            className={FIELD_CLS}
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Versiones disponibles */}
        <div>
          <label className={LABEL_CLS}>Disponible en</label>
          <select
            value={versions}
            onChange={(e) => setVersions(e.target.value)}
            className={FIELD_CLS}
          >
            <option value="both">Ambas versiones (1.0 y 2.0)</option>
            <option value="1">Solo versión 1.0</option>
            <option value="2">Solo versión 2.0</option>
          </select>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 accent-[#f39c12]"
            />
            <span className="text-sm text-white">Activo (visible para jugadores)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowsCustom}
              onChange={(e) => setAllowsCustom(e.target.checked)}
              className="w-4 h-4 accent-[#f39c12]"
            />
            <span className="text-sm text-white">Permite versión personalizada</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isReserved}
              onChange={(e) => setIsReserved(e.target.checked)}
              className="w-4 h-4 accent-[#f39c12]"
            />
            <span className="text-sm text-white">Marcar como apartado</span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center justify-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? "Creando..." : "Crear Garment"}
        </button>
      </form>
    </div>
  );
}
