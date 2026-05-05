"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Menu, Shield, TicketCheck } from "lucide-react";

type NotifCount = { open: number };

type AdminTopBarProps = {
  /** Mobile-only callback to open the sidebar drawer. */
  onMenuToggle?: () => void;
};

export function AdminTopBar({ onMenuToggle }: AdminTopBarProps = {}) {
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
    <header className="h-14 shrink-0 bg-[#111] border-b border-[rgba(255,215,0,0.08)] flex items-center justify-between px-3 sm:px-4 gap-3">
      {/* Left: Hamburger (mobile only) + brand */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors -ml-1"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="md:hidden flex items-center gap-1.5 min-w-0">
          <Shield className="h-4 w-4 text-[#f39c12] shrink-0" />
          <span className="font-bebas text-base tracking-widest text-[#f39c12] truncate">Admin</span>
        </div>
      </div>

      {/* Right: Tickets bell */}
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
          <div
            className="absolute right-0 top-full mt-1 w-[min(18rem,calc(100vw-1.5rem))] bg-[#1a1a1a] border border-[rgba(255,215,0,0.12)] rounded-xl shadow-xl z-50 overflow-hidden"
            style={{ maxWidth: "calc(100vw - 1.5rem)" }}
          >
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
