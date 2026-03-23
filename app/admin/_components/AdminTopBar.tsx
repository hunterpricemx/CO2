"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, TicketCheck } from "lucide-react";

type NotifCount = { open: number };

export function AdminTopBar() {
  const [count, setCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchCount() {
    try {
      const res = await fetch("/api/admin/notifications/count", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as NotifCount;
      setCount(data.open ?? 0);
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    const run = () => { void fetchCount(); };
    run();
    const id = setInterval(run, 30_000);
    return () => clearInterval(id);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <header className="h-12 shrink-0 bg-[#111] border-b border-[rgba(255,215,0,0.08)] flex items-center justify-end px-4 gap-3">
      {/* Tickets bell */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Tickets abiertos"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 flex items-center justify-center rounded-full bg-[#f39c12] text-black text-[10px] font-bold leading-none">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-64 bg-[#1a1a1a] border border-[rgba(255,215,0,0.12)] rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(255,215,0,0.08)] flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                Tickets Abiertos
              </span>
              {count > 0 && (
                <span className="text-xs text-[#f39c12] font-bold">{count}</span>
              )}
            </div>

            {count === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-600">
                No hay tickets abiertos
              </div>
            ) : (
              <div className="px-4 py-3 flex items-center gap-2 text-sm text-gray-300">
                <TicketCheck className="h-4 w-4 text-[#f39c12] shrink-0" />
                <span>{count} {count === 1 ? "ticket pendiente" : "tickets pendientes"}</span>
              </div>
            )}

            <div className="px-4 py-3 border-t border-[rgba(255,215,0,0.08)]">
              <Link
                href="/admin/tickets"
                onClick={() => setOpen(false)}
                className="block text-center text-xs text-[#f39c12] hover:text-white transition-colors"
              >
                Ver todos los tickets →
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
