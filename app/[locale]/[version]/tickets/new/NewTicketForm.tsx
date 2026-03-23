"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { createTicketAction } from "@/modules/tickets/actions";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
} from "@/modules/tickets/types";

type Props = {
  locale: string;
  version: string;
};

const FIELD_CLS =
  "bg-[rgba(15,5,3,0.8)] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors w-full";

export function NewTicketForm({ locale, version }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState("account");
  const [priority,    setPriority]    = useState("medium");
  const [ticketVersion, setTicketVersion] = useState<string>("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  function handleSubmit() {
    const trimTitle = title.trim();
    const trimDesc  = description.trim();
    if (!trimTitle) { toast.error("Por favor ingresa un título."); return; }
    if (!trimDesc)  { toast.error("Por favor describe el problema."); return; }

    startTransition(async () => {
      const result = await createTicketAction({
        title:          trimTitle,
        description:    trimDesc,
        category,
        priority,
        version:        ticketVersion || null,
        evidence_url:   evidenceUrl.trim() || null,
        attachment_urls: [],
      });

      if (result.success && result.data) {
        toast.success("¡Ticket enviado! El equipo de soporte te responderá pronto.");
        router.push(`/${locale}/${version}/tickets/${result.data.id}`);
      } else if (!result.success) {
        toast.error(result.error ?? "Error enviando ticket.");
      }
    });
  }

  return (
    <div className="bg-[rgba(15,5,3,0.7)] border border-[rgba(255,215,0,0.1)] rounded-2xl p-6 flex flex-col gap-5">
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">
          Título <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resume el problema en una línea"
          maxLength={120}
          className={FIELD_CLS}
        />
      </div>

      {/* Category + Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">
            Categoría <span className="text-red-400">*</span>
          </label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={FIELD_CLS}>
            {(["account","payment","bug","other"] as const).map((c) => (
              <option key={c} value={c}>{TICKET_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">
            Prioridad <span className="text-red-400">*</span>
          </label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={FIELD_CLS}>
            {(["low","medium","high","critical"] as const).map((p) => (
              <option key={p} value={p}>{TICKET_PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Version */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">
          Versión del juego (opcional)
        </label>
        <select value={ticketVersion} onChange={(e) => setTicketVersion(e.target.value)} className={FIELD_CLS}>
          <option value="">No especificada</option>
          <option value="1.0">v1.0 — Evolution</option>
          <option value="2.0">v2.0 — Classic 2.0</option>
        </select>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">
          Descripción del problema <span className="text-red-400">*</span>
        </label>
        <textarea
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe con el mayor detalle posible el problema que tienes..."
          className={`${FIELD_CLS} resize-none`}
        />
      </div>

      {/* Evidence URL */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">
          Enlace de evidencia (opcional)
        </label>
        <input
          type="url"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=... o imagen en Imgur"
          className={FIELD_CLS}
        />
        <p className="text-[11px] text-gray-600">
          Puedes adjuntar capturas de pantalla, videos o cualquier evidencia relevante.
        </p>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={pending}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#f39c12] hover:bg-[#e67e22] disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-colors"
        >
          <Send className="h-4 w-4" />
          {pending ? "Enviando..." : "Enviar ticket"}
        </button>
      </div>
    </div>
  );
}
