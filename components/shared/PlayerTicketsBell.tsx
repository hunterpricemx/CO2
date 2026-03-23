"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, TicketCheck, MessageSquare } from "lucide-react";
import type { UnreadCountResponse, TicketNotification } from "@/app/api/player/tickets/unread-count/route";

type Props = {
  ticketsHref: string;
  locale:      string;
  version:     string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)  return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export function PlayerTicketsBell({ ticketsHref, locale, version }: Props) {
  const [notifications, setNotifications] = useState<TicketNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const count = notifications.length;

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/player/tickets/unread-count", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as UnreadCountResponse;
        setNotifications(data.notifications ?? []);
      } catch { /* ignore */ }
    };
    void run();
    const id = setInterval(() => void run(), 30_000);
    return () => clearInterval(id);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const ticketHref = (id: string) =>
    locale === "es" ? `/${version}/tickets/${id}` : `/${locale}/${version}/tickets/${id}`;

  function handleNotificationClick(ticketId: string) {
    setNotifications((prev) => prev.filter((n) => n.ticketId !== ticketId));
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-gold hover:bg-surface/50 transition-colors"
        aria-label="Notificaciones de soporte"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 flex items-center justify-center rounded-full bg-gold text-background text-[9px] font-bold leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1a1a] border border-[rgba(255,215,0,0.12)] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-[rgba(255,215,0,0.08)] flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Soporte</span>
            {count > 0 && (
              <span className="text-xs text-gold font-bold">{count} sin responder</span>
            )}
          </div>

          {/* Notification list */}
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <TicketCheck className="h-7 w-7 text-gray-700" />
              <p className="text-xs text-gray-600">No tienes notificaciones nuevas</p>
            </div>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.ticketId}>
                  <Link
                    href={ticketHref(n.ticketId)}
                    onClick={() => handleNotificationClick(n.ticketId)}
                    className="flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-[rgba(255,255,255,0.04)] last:border-0"
                  >
                    <div className="mt-0.5 shrink-0">
                      <MessageSquare className="h-4 w-4 text-gold/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white line-clamp-1">{n.ticketTitle}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.lastBody}</p>
                      <p className="text-[10px] text-gray-600 mt-1">
                        Soporte respondió · {timeAgo(n.lastAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[rgba(255,215,0,0.08)] text-center">
            <Link
              href={ticketsHref}
              onClick={() => setOpen(false)}
              className="text-xs text-gold hover:text-white transition-colors"
            >
              Ver todos mis tickets →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
