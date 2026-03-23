"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Send, Lock } from "lucide-react";
import type { Ticket, TicketMessage } from "@/modules/tickets/types";
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_CATEGORY_LABELS,
} from "@/modules/tickets/types";
import { postTicketMessageAction } from "@/modules/tickets/actions";

type Props = {
  ticket: Ticket;
  initialMessages: TicketMessage[];
  playerUsername: string;
};

const FIELD_CLS =
  "bg-[rgba(15,5,3,0.8)] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors w-full";

export function PlayerTicketThread({ ticket: initialTicket, initialMessages, playerUsername }: Props) {
  const [ticket]   = useState<Ticket>(initialTicket);
  const [messages, setMessages] = useState<TicketMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isClosed = ticket.status === "closed";
  const isOwner  = ticket.player_username === playerUsername;

  function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await postTicketMessageAction({ ticketId: ticket.id, body: trimmed });
      if (result.success) {
        setBody("");
        // Optimistically append — server action revalidates for full reload
        setMessages((prev) => [
          ...prev,
          {
            id: `opt-${Date.now()}`,
            created_at: new Date().toISOString(),
            ticket_id: ticket.id,
            sender_id: null,
            sender_username: ticket.player_username,
            sender_role: "player",
            body: trimmed,
            attachment_urls: [],
          },
        ]);
      } else {
        toast.error(result.error ?? "Error enviando mensaje");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status / Meta bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${TICKET_STATUS_COLORS[ticket.status]}`}>
          {TICKET_STATUS_LABELS[ticket.status]}
        </span>
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${TICKET_PRIORITY_COLORS[ticket.priority]}`}>
          {TICKET_PRIORITY_LABELS[ticket.priority]}
        </span>
        <span className="text-xs text-gray-600">{TICKET_CATEGORY_LABELS[ticket.category]}</span>
        {ticket.version && <span className="text-xs text-gray-600">v{ticket.version}</span>}
      </div>

      {/* Initial description */}
      <div className="bg-[rgba(15,5,3,0.7)] border border-[rgba(255,215,0,0.08)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-500">Descripción inicial</span>
          <span className="text-xs text-gray-600">·</span>
          <span className="text-xs text-gray-600">
            {new Date(ticket.created_at).toLocaleString("es-MX")}
          </span>
        </div>
        <p className="text-sm text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
        {ticket.evidence_url && (
          <a
            href={ticket.evidence_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-xs text-[#f39c12] hover:underline"
          >
            Ver evidencia adjunta →
          </a>
        )}
      </div>

      {/* Messages */}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`rounded-xl p-4 ${
            msg.sender_role === "admin"
              ? "bg-[rgba(243,156,18,0.05)] border border-[rgba(243,156,18,0.2)] ml-6"
              : "bg-[rgba(15,5,3,0.7)] border border-[rgba(255,255,255,0.06)]"
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
              {msg.sender_role === "admin" ? "Admin" : "Tú"}
            </span>
            <span className="text-xs text-gray-600 ml-auto">
              {new Date(msg.created_at).toLocaleString("es-MX")}
            </span>
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{msg.body}</p>
        </div>
      ))}
      <div ref={bottomRef} />

      {/* Reply */}
      {isOwner && !isClosed ? (
        <div className="bg-[rgba(15,5,3,0.7)] border border-[rgba(255,215,0,0.08)] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-medium">Agregar respuesta</p>
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribe tu respuesta o información adicional..."
            className={`${FIELD_CLS} resize-none`}
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSend}
              disabled={pending || !body.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#f39c12] hover:bg-[#e67e22] disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-colors"
            >
              <Send className="h-4 w-4" />
              {pending ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      ) : isClosed ? (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-[rgba(15,5,3,0.5)] border border-[rgba(255,255,255,0.05)] rounded-xl px-4 py-3">
          <Lock className="h-4 w-4" />
          Este ticket está cerrado.
        </div>
      ) : null}
    </div>
  );
}
