"use client";

import { useCallback, useTransition, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { TicketCheck, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import type { TicketsPage, TicketFilters, Ticket } from "@/modules/tickets/types";
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_CATEGORY_LABELS,
} from "@/modules/tickets/types";

type Props = {
  initialData: TicketsPage;
  currentFilters: TicketFilters;
};

const FIELD_CLS =
  "bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] transition-colors";

export default function TicketsManager({ initialData, currentFilters }: Props) {
  const router    = useRouter();
  const pathname  = usePathname();
  const [, startTransition] = useTransition();

  const [search,   setSearch]   = useState(currentFilters.search   ?? "");
  const [status,   setStatus]   = useState(currentFilters.status   ?? "all");
  const [priority, setPriority] = useState(currentFilters.priority ?? "all");
  const [category, setCategory] = useState(currentFilters.category ?? "all");

  const { data: tickets, total, page, pageSize } = initialData;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildUrl(overrides: Partial<TicketFilters>) {
    const params = new URLSearchParams();
    const f = { ...currentFilters, ...overrides };
    if (f.page     && f.page > 1) params.set("page",     String(f.page));
    if (f.status   && f.status   !== "all") params.set("status",   f.status);
    if (f.priority && f.priority !== "all") params.set("priority", f.priority);
    if (f.category && f.category !== "all") params.set("category", f.category);
    if (f.version  && f.version  !== "all") params.set("version",  f.version);
    if (f.search?.trim()) params.set("search", f.search.trim());
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const applyFilters = useCallback(() => {
    startTransition(() => {
      router.push(buildUrl({ page: 1, search, status, priority, category }));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, priority, category]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-5xl tracking-wider text-white">Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">{total} ticket{total !== 1 ? "s" : ""} en total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#111] border border-[rgba(255,215,0,0.1)] rounded-xl p-4">
        <div className="flex items-center gap-1 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Buscar por título o jugador..."
                className={`${FIELD_CLS} pl-9 w-full`}
              />
            </div>
          </div>

          {/* Status */}
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={FIELD_CLS}>
            <option value="all">Todos los estados</option>
            {(["open","in_progress","resolved","closed"] as const).map((s) => (
              <option key={s} value={s}>{TICKET_STATUS_LABELS[s]}</option>
            ))}
          </select>

          {/* Priority */}
          <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={FIELD_CLS}>
            <option value="all">Todas las prioridades</option>
            {(["low","medium","high","critical"] as const).map((p) => (
              <option key={p} value={p}>{TICKET_PRIORITY_LABELS[p]}</option>
            ))}
          </select>

          {/* Category */}
          <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className={FIELD_CLS}>
            <option value="all">Todas las categorías</option>
            {(["account","payment","bug","other"] as const).map((c) => (
              <option key={c} value={c}>{TICKET_CATEGORY_LABELS[c]}</option>
            ))}
          </select>

          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-[#f39c12] hover:bg-[#e67e22] text-black text-sm font-semibold rounded-lg transition-colors"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-[rgba(255,215,0,0.1)] rounded-xl overflow-hidden">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <TicketCheck className="h-10 w-10 text-gray-700" />
            <p className="text-gray-500 text-sm">No se encontraron tickets</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,215,0,0.08)]">
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Ticket</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Jugador</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Prioridad</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Categoría</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket: Ticket) => (
                <tr
                  key={ticket.id}
                  className="border-b border-[rgba(255,255,255,0.04)] hover:bg-white/2 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/tickets/${ticket.id}`}
                      className="text-white hover:text-[#f39c12] transition-colors font-medium line-clamp-1"
                    >
                      {ticket.ticket_number != null && (
                        <span className="text-[#f39c12] font-mono text-xs mr-1.5">
                          #{String(ticket.ticket_number).padStart(4, "0")}
                        </span>
                      )}
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{ticket.player_username}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${TICKET_STATUS_COLORS[ticket.status]}`}>
                      {TICKET_STATUS_LABELS[ticket.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${TICKET_PRIORITY_COLORS[ticket.priority]}`}>
                      {TICKET_PRIORITY_LABELS[ticket.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{TICKET_CATEGORY_LABELS[ticket.category]}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(ticket.updated_at).toLocaleDateString("es-MX", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {page} de {totalPages} · {total} tickets
          </p>
          <div className="flex gap-2">
            <Link
              href={page > 1 ? buildUrl({ page: page - 1 }) : "#"}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                page > 1
                  ? "bg-white/5 text-gray-300 hover:bg-white/10"
                  : "opacity-30 pointer-events-none text-gray-600"
              }`}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Link>
            <Link
              href={page < totalPages ? buildUrl({ page: page + 1 }) : "#"}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                page < totalPages
                  ? "bg-white/5 text-gray-300 hover:bg-white/10"
                  : "opacity-30 pointer-events-none text-gray-600"
              }`}
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
