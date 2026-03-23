"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Send, Lock, Unlock, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Ticket, TicketMessage, TicketStatus, TicketPriority } from "@/modules/tickets/types";
import {
  TICKET_STATUS_LABELS, TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS, TICKET_PRIORITY_COLORS,
  TICKET_CATEGORY_LABELS,
} from "@/modules/tickets/types";
import {
  postAdminTicketMessageAction,
  updateTicketStatusAction,
  updateTicketPriorityAction,
  getTicketMessagesAction,
  deleteTicketAction,
} from "@/modules/tickets/actions";

type Props = {
  ticket: Ticket;
  initialMessages: TicketMessage[];
};

const FIELD_CLS =
  "bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors";

export default function TicketDetailPanel({ ticket: initialTicket, initialMessages }: Props) {
  const router = useRouter();
  const [ticket,   setTicket]   = useState<Ticket>(initialTicket);
  const [messages, setMessages] = useState<TicketMessage[]>(initialMessages);
  const [body,     setBody]     = useState("");
  const [pending,  startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function reloadMessages() {
    const fresh = await getTicketMessagesAction(ticket.id);
    setMessages(fresh);
  }

  function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await postAdminTicketMessageAction({ ticketId: ticket.id, body: trimmed });
      if (result.success) {
        setBody("");
        await reloadMessages();
      } else {
        toast.error(result.error ?? "Error enviando mensaje");
      }
    });
  }

  function handleStatusChange(newStatus: TicketStatus) {
    startTransition(async () => {
      const result = await updateTicketStatusAction(ticket.id, newStatus);
      if (result.success) {
        setTicket((t) => ({
          ...t, status: newStatus,
          closed_at: newStatus === "closed" ? new Date().toISOString() : t.closed_at,
        }));
        toast.success(`Estado actualizado a "${TICKET_STATUS_LABELS[newStatus]}"`);
      } else {
        toast.error(result.error ?? "Error actualizando estado");
      }
    });
  }

  function handlePriorityChange(newPriority: TicketPriority) {
    startTransition(async () => {
      const result = await updateTicketPriorityAction(ticket.id, newPriority);
      if (result.success) {
        setTicket((t) => ({ ...t, priority: newPriority }));
        toast.success(`Prioridad actualizada a "${TICKET_PRIORITY_LABELS[newPriority]}"`);
      } else {
        toast.error(result.error ?? "Error actualizando prioridad");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTicketAction(ticket.id);
      if (result.success) {
        toast.success("Ticket eliminado");
        router.push("/admin/tickets");
      } else {
        toast.error(result.error ?? "Error eliminando ticket");
        setConfirmDelete(false);
      }
    });
  }

  const isClosed = ticket.status === "closed";

  return (
    <div className="flex flex-col gap-6">
      {/* Back + title */}
      <div className="flex items-start gap-3">
        <Link
          href="/admin/tickets"
          className="mt-1 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-bebas text-4xl tracking-wider text-white leading-tight">{ticket.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {initialTicket.ticket_number != null
              ? `Ticket #${String(initialTicket.ticket_number).padStart(4, "0")}`
              : `Ticket ${initialTicket.id.slice(0, 8)}`
            } · {ticket.player_username} ·{" "}
            {new Date(ticket.created_at).toLocaleDateString("es-MX", {
              day: "2-digit", month: "long", year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Thread */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Initial description */}
          <div className="bg-[#111] border border-[rgba(255,215,0,0.1)] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500">Descripción inicial · {ticket.player_username}</span>
              {ticket.version && (
                <span className="text-xs px-2 py-0.5 bg-white/5 rounded-full text-gray-400">v{ticket.version}</span>
              )}
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
            {ticket.evidence_url && (
              <a
                href={ticket.evidence_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-xs text-[#f39c12] hover:underline"
              >
                Ver evidencia (video/link) →
              </a>
            )}
          </div>

          {/* Messages */}
          {messages.length > 0 && (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-4 ${
                    msg.sender_role === "admin"
                      ? "bg-[rgba(243,156,18,0.05)] border border-[rgba(243,156,18,0.15)] ml-8"
                      : "bg-[#111] border border-[rgba(255,255,255,0.06)]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-300">
                      {msg.sender_role === "admin" ? "Soporte" : msg.sender_username}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      msg.sender_role === "admin"
                        ? "bg-[rgba(243,156,18,0.15)] text-[#f39c12]"
                        : "bg-white/5 text-gray-400"
                    }`}>
                      {msg.sender_role === "admin" ? "Admin" : "Jugador"}
                    </span>
                    <span className="text-xs text-gray-600 ml-auto">
                      {new Date(msg.created_at).toLocaleString("es-MX")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{msg.body}</p>
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />

          {/* Reply box */}
          {!isClosed ? (
            <div className="bg-[#111] border border-[rgba(255,215,0,0.1)] rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-medium">Responder como soporte</p>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escribe tu respuesta..."
                className={`${FIELD_CLS} w-full resize-none`}
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleSend}
                  disabled={pending || !body.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#f39c12] hover:bg-[#e67e22] disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-colors"
                >
                  <Send className="h-4 w-4" />
                  {pending ? "Enviando..." : "Enviar respuesta"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-[#111] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3">
              <Lock className="h-4 w-4" />
              Este ticket está cerrado. No se pueden añadir más mensajes.
            </div>
          )}
        </div>

        {/* Sidebar controls */}
        <div className="w-64 shrink-0 flex flex-col gap-4">
          {/* Status */}
          <div className="bg-[#111] border border-[rgba(255,215,0,0.1)] rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-medium">Estado</p>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border mb-3 ${TICKET_STATUS_COLORS[ticket.status]}`}>
              {TICKET_STATUS_LABELS[ticket.status]}
            </span>
            <div className="flex flex-col gap-1.5">
              {(["open","in_progress","resolved","closed"] as TicketStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={pending || ticket.status === s}
                  className={`text-left text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-default ${
                    ticket.status === s
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {ticket.status === s ? "✓ " : ""}{TICKET_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="bg-[#111] border border-[rgba(255,215,0,0.1)] rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-medium">Prioridad</p>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border mb-3 ${TICKET_PRIORITY_COLORS[ticket.priority]}`}>
              {TICKET_PRIORITY_LABELS[ticket.priority]}
            </span>
            <div className="flex flex-col gap-1.5">
              {(["low","medium","high","critical"] as TicketPriority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePriorityChange(p)}
                  disabled={pending || ticket.priority === p}
                  className={`text-left text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-default ${
                    ticket.priority === p
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {ticket.priority === p ? "✓ " : ""}{TICKET_PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* meta */}
          <div className="bg-[#111] border border-[rgba(255,215,0,0.1)] rounded-xl p-4 flex flex-col gap-2 text-xs text-gray-400">
            <div className="flex justify-between">
              <span className="text-gray-600">Categoría</span>
              <span>{TICKET_CATEGORY_LABELS[ticket.category]}</span>
            </div>
            {ticket.version && (
              <div className="flex justify-between">
                <span className="text-gray-600">Versión</span>
                <span>v{ticket.version}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Creado</span>
              <span>{new Date(ticket.created_at).toLocaleDateString("es-MX")}</span>
            </div>
            {ticket.closed_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">Cerrado</span>
                <span>{new Date(ticket.closed_at).toLocaleDateString("es-MX")}</span>
              </div>
            )}
          </div>

          {/* Quick close/reopen */}
          {!isClosed ? (
            <button
              onClick={() => handleStatusChange("closed")}
              disabled={pending}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-red-800/40 text-red-400 hover:bg-red-900/20 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <Lock className="h-4 w-4" /> Cerrar ticket
            </button>
          ) : (
            <button
              onClick={() => handleStatusChange("open")}
              disabled={pending}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-green-800/40 text-green-400 hover:bg-green-900/20 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <Unlock className="h-4 w-4" /> Reabrir ticket
            </button>
          )}

          {ticket.priority === "critical" && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/10 border border-red-800/30 rounded-lg px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Prioridad crítica
            </div>
          )}

          {/* Delete */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-red-900/50 text-red-500/70 hover:text-red-400 hover:bg-red-900/20 hover:border-red-800/60 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Eliminar ticket
            </button>
          ) : (
            <div className="bg-red-900/10 border border-red-800/40 rounded-lg p-3 flex flex-col gap-2">
              <p className="text-xs text-red-300 text-center">¿Eliminar permanentemente?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={pending}
                  className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={pending}
                  className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {pending ? "Eliminando..." : "Sí, eliminar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
