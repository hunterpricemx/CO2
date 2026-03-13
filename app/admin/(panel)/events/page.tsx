"use client";

import { useMemo, useState } from "react";
import { useList, useDelete } from "@refinedev/core";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatSchedule } from "@/modules/events/types";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-900/30 text-green-400 border-green-800/30",
  draft: "bg-yellow-900/30 text-yellow-400 border-yellow-800/30",
  archived: "bg-gray-800/50 text-gray-500 border-gray-700/30",
};

const VERSION_LABELS: Record<string, string> = {
  "1.0": "v1.0",
  "2.0": "v2.0",
  both: "Ambas",
};

type EventItem = {
  id: string;
  title_es: string;
  title_en?: string | null;
  title_pt?: string | null;
  schedule: unknown;
  version: string;
  status: string;
  created_at?: string;
};

export default function AdminEventsPage() {
  const [search, setSearch] = useState("");
  const [versionFilter, setVersionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"created_at" | "title" | "schedule">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { query } = useList({
    resource: "events",
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 200 },
  });

  const { mutate: deleteEvent } = useDelete();

  const events = (query.data?.data ?? []) as EventItem[];
  const isLoading = query.isLoading;

  const filteredEvents = useMemo(() => {
    let result = [...events];

    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter((ev) => {
        const title = [ev.title_es, ev.title_en, ev.title_pt]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const scheduleText = formatSchedule(ev.schedule, "es").toLowerCase();
        return title.includes(term) || scheduleText.includes(term);
      });
    }

    if (versionFilter !== "all") {
      result = result.filter((ev) => ev.version === versionFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((ev) => ev.status === statusFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "title") {
        comparison = a.title_es.localeCompare(b.title_es, "es", {
          sensitivity: "base",
        });
      } else if (sortBy === "schedule") {
        comparison = formatSchedule(a.schedule, "es").localeCompare(
          formatSchedule(b.schedule, "es"),
          "es",
          { sensitivity: "base" },
        );
      } else {
        const aTime = new Date(a.created_at ?? 0).getTime();
        const bTime = new Date(b.created_at ?? 0).getTime();
        comparison = aTime - bTime;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [events, search, versionFilter, statusFilter, sortBy, sortOrder]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-5xl tracking-wider text-white">
            Eventos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredEvents.length} de {events.length} eventos
          </p>
        </div>
        <Link
          href="/admin/events/create"
          className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo evento
        </Link>
      </div>

      <div className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por titulo u horario"
          className="xl:col-span-2 bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12]"
        />

        <select
          value={versionFilter}
          onChange={(e) => setVersionFilter(e.target.value)}
          className="bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f39c12]"
        >
          <option value="all">Todas las versiones</option>
          <option value="1.0">v1.0</option>
          <option value="2.0">v2.0</option>
          <option value="both">Ambas</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f39c12]"
        >
          <option value="all">Todos los estados</option>
          <option value="published">Publicado</option>
          <option value="draft">Borrador</option>
          <option value="archived">Archivado</option>
        </select>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "created_at" | "title" | "schedule")
            }
            className="bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f39c12]"
          >
            <option value="created_at">Fecha</option>
            <option value="title">Titulo</option>
            <option value="schedule">Horario</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            className="bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f39c12]"
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : (
        <div className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,215,0,0.08)]">
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">
                  Título
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">
                  Horario
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">
                  Versión
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((ev) => (
                <tr
                  key={ev.id}
                  className="border-b border-[rgba(255,255,255,0.04)] hover:bg-white/2 transition-colors"
                >
                  <td className="px-4 py-3 text-white font-medium">
                    {ev.title_es}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs leading-relaxed">
                    {formatSchedule(ev.schedule, "es")}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {VERSION_LABELS[ev.version] ?? ev.version}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[ev.status] ?? ""}`}
                    >
                      {ev.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin/events/edit/${ev.id}`}
                        className="p-1.5 text-gray-400 hover:text-[#f39c12] hover:bg-[rgba(243,156,18,0.1)] rounded-lg transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar "${ev.title_es}"?`)) {
                            deleteEvent({ resource: "events", id: ev.id });
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-600"
                  >
                    No hay eventos para los filtros aplicados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
