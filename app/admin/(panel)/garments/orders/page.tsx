"use client";

import { useState, useTransition, useMemo } from "react";
import { useList } from "@refinedev/core";
import { Search, ExternalLink, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "../actions";

type GarmentOrder = {
  id: string;
  garment_name: string;
  account_name: string;
  character_name: string;
  version: number;
  is_custom: boolean;
  custom_description: string | null;
  reference_image_url: string | null;
  amount_paid: number;
  currency: string;
  status: string;
  tebex_transaction: string | null;
  admin_notes: string | null;
  delivered_at: string | null;
  created_at: string;
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "Pend. Pago",   cls: "bg-yellow-900/30 text-yellow-400 border-yellow-700/40" },
  paid:            { label: "Pagado",        cls: "bg-blue-900/30 text-blue-400 border-blue-700/40" },
  in_progress:     { label: "En Proceso",   cls: "bg-purple-900/30 text-purple-400 border-purple-700/40" },
  delivered:       { label: "Entregado",    cls: "bg-emerald-900/30 text-emerald-400 border-emerald-700/40" },
  cancelled:       { label: "Cancelado",    cls: "bg-gray-800/60 text-gray-500 border-gray-700/40" },
};

const STATUS_OPTIONS = [
  { value: "pending_payment", label: "Pend. Pago" },
  { value: "paid",            label: "Pagado" },
  { value: "in_progress",     label: "En Proceso" },
  { value: "delivered",       label: "Entregado" },
  { value: "cancelled",       label: "Cancelado" },
];

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminGarmentOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const { query } = useList<GarmentOrder>({
    resource: "garment_orders",
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 200 },
  });

  const orders = useMemo(() => (query.data?.data ?? []) as GarmentOrder[], [query.data?.data]);
  const isLoading = query.isLoading;

  const filtered = useMemo(() => {
    let result = [...orders];
    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (o) =>
          o.account_name.toLowerCase().includes(term) ||
          o.character_name.toLowerCase().includes(term) ||
          o.garment_name.toLowerCase().includes(term),
      );
    }
    if (statusFilter !== "all") result = result.filter((o) => o.status === statusFilter);
    return result;
  }, [orders, search, statusFilter]);

  function startEdit(order: GarmentOrder) {
    setEditingId(order.id);
    setEditStatus(order.status);
    setEditNotes(order.admin_notes ?? "");
  }

  function handleSave(orderId: string) {
    startTransition(async () => {
      const result = await updateOrderStatus({ orderId, status: editStatus, admin_notes: editNotes });
      if (result.success) {
        toast.success("Orden actualizada.");
        setEditingId(null);
        query.refetch();
      } else {
        toast.error(result.error ?? "Error al actualizar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-5xl tracking-wider text-white">Órdenes de Garments</h1>
          <p className="text-sm text-gray-500 mt-1">{orders.length} órdenes totales</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cuenta / personaje..."
            className="bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12] w-64"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#f39c12]"
        >
          <option value="all">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Cargando órdenes...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl">
          <PackageCheck className="h-12 w-12 text-gray-700" />
          <p className="text-gray-500 text-sm">No hay órdenes con esos filtros.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((order) => {
            const statusCfg = STATUS_CFG[order.status] ?? { label: order.status, cls: "bg-gray-800/60 text-gray-500 border-gray-700/40" };
            const isEditing = editingId === order.id;

            return (
              <div
                key={order.id}
                className="bg-[#1a1a1a] border border-[rgba(255,215,0,0.1)] rounded-xl p-4 flex flex-col gap-3"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{order.garment_name}</span>
                      {order.is_custom && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/30">
                          Custom
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {order.account_name} → <span className="text-gray-400">{order.character_name}</span> · v{order.version}.0
                    </span>
                    <span className="text-xs text-gray-600">{fmtDate(order.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusCfg.cls}`}>
                      {statusCfg.label}
                    </span>
                    <span className="text-xs text-[#f39c12] font-semibold">
                      ${order.amount_paid} {order.currency}
                    </span>
                  </div>
                </div>

                {/* Custom description */}
                {order.is_custom && order.custom_description && (
                  <div className="bg-[#111] rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Descripción personalizada</p>
                    <p className="text-sm text-gray-300">{order.custom_description}</p>
                  </div>
                )}

                {/* Reference image */}
                {order.reference_image_url && (
                  <a
                    href={order.reference_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#f39c12] hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver imagen de referencia
                  </a>
                )}

                {/* Txn */}
                {order.tebex_transaction && (
                  <p className="text-xs text-gray-600">Txn: {order.tebex_transaction}</p>
                )}

                {/* Edit section */}
                {isEditing ? (
                  <div className="flex flex-col gap-3 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Estado</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#f39c12]"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Notas admin</label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={2}
                        className="bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f39c12] w-full resize-none"
                        placeholder="Notas internas sobre esta orden..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(order.id)}
                        disabled={isPending}
                        className="bg-[#f39c12] hover:bg-[#e67e22] disabled:opacity-50 text-black font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
                      >
                        {isPending ? "Guardando..." : "Guardar"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-400 hover:text-white px-4 py-1.5 rounded-lg text-sm border border-[rgba(255,255,255,0.08)] transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                    {order.admin_notes && (
                      <p className="text-xs text-gray-500 flex-1">📋 {order.admin_notes}</p>
                    )}
                    <button
                      onClick={() => startEdit(order)}
                      className="ml-auto text-xs text-[#f39c12] hover:underline"
                    >
                      Actualizar estado
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
