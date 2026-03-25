"use client";

import { useId, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const FIELD_CLS =
  "bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors w-full";

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/|)(\d+)/);
  return m?.[1] ?? null;
}

type ImageUploadFieldProps = {
  label: string;
  value?: string | null;
  onChange: (value: string | null) => void;
  folder: string;
  allowVideo?: boolean;
};

export default function ImageUploadField({
  label,
  value,
  onChange,
  folder,
  allowVideo = false,
}: ImageUploadFieldProps) {
  const inputId = useId();
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type === "video/mp4" || file.type === "video/quicktime";

    if (!isImage && !(allowVideo && isVideo)) {
      toast.error(allowVideo ? "Solo se permiten imágenes o videos MP4." : "Solo se permiten imágenes.");
      event.target.value = "";
      return;
    }

    const maxSize = (allowVideo && isVideo) ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error((allowVideo && isVideo) ? "El video no puede superar 50 MB." : "La imagen no puede superar 5 MB.");
      event.target.value = "";
      return;
    }

    setIsUploading(true);

    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage
        .from("conquer-media")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage.from("conquer-media").getPublicUrl(fileName);
      onChange(data.publicUrl);
      toast.success("Imagen subida correctamente.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir la imagen.";
      toast.error(message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs text-gray-400 uppercase tracking-wider block">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-2 text-xs text-red-300 hover:text-red-200 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Quitar {value && (getVimeoId(value) ? "video Vimeo" : value.match(/\.(mp4|mov)$/i) ? "video" : "imagen")}
          </button>
        )}
      </div>

      <div className="rounded-xl border border-[rgba(255,215,0,0.12)] bg-[#120805] p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="w-full md:max-w-xs">
            {value ? (
              (() => {
                const vimeoId = getVimeoId(value);
                if (vimeoId) return (
                  <div className="relative h-36 w-full rounded-lg border border-[rgba(255,215,0,0.18)] overflow-hidden bg-black">
                    <iframe
                      src={`https://player.vimeo.com/video/${vimeoId}?badge=0&loop=1&autoplay=1&muted=1&background=1&controls=0`}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; fullscreen"
                      title="Vista previa Vimeo"
                    />
                  </div>
                );
                if (value.match(/\.(mp4|mov)$/i)) return (
                  <video
                    src={value}
                    className="h-36 w-full rounded-lg border border-[rgba(255,215,0,0.18)] object-cover"
                    muted
                    playsInline
                    controls
                  />
                );
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={value}
                    alt="Vista previa del thumbnail"
                    className="h-36 w-full rounded-lg border border-[rgba(255,215,0,0.18)] object-cover"
                  />
                );
              })()
            ) : (
              <div className="flex h-36 w-full items-center justify-center rounded-lg border border-dashed border-[rgba(255,215,0,0.18)] bg-black/20 text-sm text-gray-500">
                Sin imagen
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <label
              htmlFor={inputId}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#f39c12] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#e67e22]"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {isUploading ? "Subiendo..." : allowVideo ? "Subir imagen o video" : "Subir imagen"}
            </label>
            <input
              id={inputId}
              type="file"
              accept={allowVideo ? "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime" : "image/png,image/jpeg,image/webp,image/gif"}
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />

            <p className="text-xs text-gray-500">
              {allowVideo
                ? "Formatos: JPG, PNG, WEBP, GIF o MP4. Máx: 5 MB imagen / 50 MB video."
                : "Formatos permitidos: JPG, PNG, WEBP o GIF. Tamaño máximo: 5 MB."}
            </p>

            <div>
              <label className="mb-1 block text-xs text-gray-500">O pega una URL manual</label>
              <input
                type="url"
                value={value ?? ""}
                onChange={(event) => onChange(event.target.value || null)}
                placeholder="https://vimeo.com/123456789 o https://.../imagen.jpg"
                className={FIELD_CLS}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}