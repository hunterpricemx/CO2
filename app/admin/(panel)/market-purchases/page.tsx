"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { ShoppingCart, CheckCircle2, XCircle, RotateCcw, Search, X, RefreshCcw, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { Fragment } from "react";
import {
  adminGetPurchasesAction,
  adminUpdatePurchaseAction,
  type MarketPurchase,
  type MarketPurchaseStatus,
} from "@/modules/market/purchaseActions";

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pendiente",   cls: "bg-yellow-900/30 text-yellow-400 border-yellow-700/40" },
  completed: { label: "Completado",  cls: "bg-green-900/30 text-green-400 border-green-700/40" },
  cancelled: { label: "Cancelado",   cls: "bg-zinc-800/60 text-zinc-400 border-zinc-700/40" },
  refunded:  { label: "Reembolsado", cls: "bg-blue-900/30 text-blue-400 border-blue-700/40" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

type ActionRowProps = {
  purchase: MarketPurchase;
  onRefresh: () => void;
};

function ActionRow({ purchase, onRefresh }: ActionRowProps) {
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState(purchase.admin_note ?? "");
  const [error, setError] = useState<string | null>(null);

  const updateStatus = useCallback(
    (status: "completed" | "cancelled" | "refunded") => {
      setError(null);
      startTransition(async () => {
        const res = await adminUpdatePurchaseAction(purchase.id, status, note);
        if (!res.success) setError(res.error ?? "Error desconocido");
        else onRefresh();
      });
    },
    [purchase.id, note, onRefresh],
  );

  if (purchase.status !== "pending") {
    return (
      <div className="text-xs text-muted-foreground/50 italic">
        {purchase.admin_note ?? "—"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota interna (opcional)"
        className="w-full text-xs bg-[#0d0d0d] border border-white/10 rounded px-2 py-1 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-gold/40"
      />
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      <div className="flex gap-1.5">
        <button
          disabled={isPending}
          onClick={() => updateStatus("completed")}
          title="Marcar como completado"
          className="flex items-center gap-1 px-2 py-1 rounded bg-green-900/30 border border-green-700/40 text-green-400 text-xs hover:bg-green-900/50 transition-colors cursor-pointer disabled:opacity-50"
        >
          <CheckCircle2 className="h-3 w-3" /> Completar
        </button>
        <button
          disabled={isPending}
          onClick={() => updateStatus("refunded")}
          title="Reembolsar CPs"
          className="flex items-center gap-1 px-2 py-1 rounded bg-blue-900/30 border border-blue-700/40 text-blue-400 text-xs hover:bg-blue-900/50 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" /> Reembolsar
        </button>
        <button
          disabled={isPending}
          onClick={() => updateStatus("cancelled")}
          title="Cancelar compra"
          className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 text-xs hover:bg-zinc-700/60 transition-colors cursor-pointer disabled:opacity-50"
        >
          <XCircle className="h-3 w-3" /> Cancelar
        </button>
      </div>
    </div>
  );
}

export default function MarketPurchasesAdminPage() {
  const [purchases, setPurchases] = useState<MarketPurchase[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [versionFilter, setVersionFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);

  const load = useCallback(() => {
    setLoading(true);
    startTransition(async () => {
      const res = await adminGetPurchasesAction({
        status: (statusFilter as MarketPurchaseStatus) || undefined,
        version: versionFilter || undefined,
      });
      if (res.success) setPurchases(res.data);
      setLoaded(true);
      setLoading(false);
    });
  }, [statusFilter, versionFilter]);

  // Auto-load on mount and when filters change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? purchases.filter(
        (p) =>
          p.buyer_username.toLowerCase().includes(term) ||
          p.item_name.toLowerCase().includes(term) ||
          p.seller_name.toLowerCase().includes(term) ||
          p.char_name.toLowerCase().includes(term),
      )
    : purchases;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-gold" />
          <h1 className="text-xl font-bold text-foreground">Compras Market</h1>
          <span className="text-sm text-muted-foreground/60">({filtered.length})</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface/40 border border-surface/50 text-sm text-muted-foreground hover:text-foreground hover:border-gold/30 cursor-pointer transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario, ítem, personaje..."
            className="pl-8 pr-8 py-1.5 text-sm bg-[#0d0d0d] border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-gold/40 w-64"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground cursor-pointer">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); }}
          className="py-1.5 px-3 text-sm bg-[#0d0d0d] border border-white/10 rounded-lg text-foreground focus:outline-none focus:border-gold/40 cursor-pointer"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
          <option value="refunded">Reembolsado</option>
        </select>

        <select
          value={versionFilter}
          onChange={(e) => { setVersionFilter(e.target.value); }}
          className="py-1.5 px-3 text-sm bg-[#0d0d0d] border border-white/10 rounded-lg text-foreground focus:outline-none focus:border-gold/40 cursor-pointer"
        >
          <option value="">Todas las versiones</option>
          <option value="1.0">v1.0 Classic Plus</option>
          <option value="2.0">v2.0 Experience</option>
        </select>

        <button
          onClick={load}
          className="py-1.5 px-3 text-sm bg-gold/20 border border-gold/30 rounded-lg text-gold hover:bg-gold/30 cursor-pointer transition-colors"
        >
          Filtrar
        </button>
      </div>

      {/* Mobile: cards verticales */}
      <div className="md:hidden space-y-3">
        {loading && (
          <div className="rounded-xl border border-surface/50 px-4 py-12 text-center text-muted-foreground text-sm">
            Cargando...
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="rounded-xl border border-surface/50 px-4 py-12 text-center text-muted-foreground text-sm">
            No hay compras.
          </div>
        )}
        {!loading && filtered.map((p) => (
          <div key={`m-${p.id}`} className="rounded-xl border border-surface/50 bg-surface/20 overflow-hidden">
            <div className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{p.buyer_username}</p>
                  <p className="text-[11px] text-muted-foreground/70 truncate">{p.char_name}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground bg-white/5 border border-white/10 rounded px-1.5 py-0.5">v{p.version}</span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-t border-white/5 pt-2">
                <p className="font-medium text-sm flex-1 min-w-0 truncate">
                  {p.item_name}
                  {p.item_plus > 0 && <span className="text-gold ml-1">+{p.item_plus}</span>}
                </p>
                <span className="font-mono font-semibold text-gold text-sm shrink-0">{p.cp_cost.toLocaleString("es-ES")} CP</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="truncate">de {p.seller_name}</span>
                <span className="shrink-0 whitespace-nowrap">
                  {new Date(p.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
            <div className="border-t border-white/5 bg-surface/10 p-2">
              <ActionRow purchase={p} onRefresh={load} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: tabla tradicional */}
      <div className="hidden md:block rounded-xl border border-surface/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm border-collapse">
            <thead>
              <tr className="bg-surface text-[10px] uppercase tracking-widest text-muted-foreground/50">
                <th className="px-2 py-3 w-8"></th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Usuario / Personaje</th>
                <th className="px-4 py-3 text-left">Ítem</th>
                <th className="px-4 py-3 text-left">Vendedor</th>
                <th className="px-4 py-3 text-right">Costo CP</th>
                <th className="px-4 py-3 text-center">Ver.</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-left">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-muted-foreground text-sm">
                    Cargando...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-muted-foreground text-sm">
                    No hay compras.
                  </td>
                </tr>
              )}
              {filtered.map((p, i) => {
                const isExpanded = expandedId === p.id;
                const hasErrorInfo = !!(p.delivery_error || p.delivery_attempts || p.request_payload || p.response_body);
                return (
                  <Fragment key={p.id}>
                    <tr
                      className={`border-t border-white/4 cursor-pointer hover:bg-gold/5 ${
                        isExpanded ? "bg-gold/5" : i % 2 === 1 ? "bg-white/[0.015]" : ""
                      }`}
                      onClick={() => toggleExpand(p.id)}
                    >
                      <td className="px-2 py-3 text-muted-foreground/60 text-center">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 inline" /> : <ChevronRight className="h-3.5 w-3.5 inline" />}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString("es-MX", {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{p.buyer_username}</span>
                        <span className="block text-[10px] text-muted-foreground/50">{p.char_name}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {p.item_name}
                        {p.item_plus > 0 && <span className="text-gold ml-1">+{p.item_plus}</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.seller_name}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gold">
                        {p.cp_cost.toLocaleString("es-ES")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-muted-foreground bg-white/5 border border-white/10 rounded px-2 py-0.5">
                          v{p.version}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <ActionRow purchase={p} onRefresh={load} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-[#0a0a0a] border-t border-white/4">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="space-y-3">
                            {/* Resumen del delivery */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-0.5">Intentos</div>
                                <div className="text-foreground font-mono">{p.delivery_attempts ?? 0}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-0.5">Entregado</div>
                                <div className="text-foreground font-mono">
                                  {p.delivered_at
                                    ? new Date(p.delivered_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" })
                                    : "—"}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-0.5">IP cliente</div>
                                <div className="text-foreground font-mono text-[11px] truncate">{p.player_ip ?? "—"}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-0.5">Purchase ID</div>
                                <div className="text-foreground font-mono text-[10px] select-all truncate" title={p.id}>{p.id}</div>
                              </div>
                            </div>

                            {/* Error de delivery (lo más importante para diagnóstico) */}
                            {p.delivery_error && (
                              <div className="rounded-lg border border-red-700/40 bg-red-900/15 px-3 py-2.5 flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] uppercase tracking-wider text-red-300/70 mb-0.5">Error de entrega</div>
                                  <p className="text-xs text-red-200 break-words font-mono">{p.delivery_error}</p>
                                </div>
                              </div>
                            )}

                            {/* JSON request + response */}
                            {(p.request_payload != null || p.response_body != null) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {p.request_payload != null && (
                                  <div>
                                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-purple-400/70 mb-1">
                                      <ChevronRight className="h-3 w-3" />
                                      Request firmado al listener
                                    </div>
                                    <pre className="bg-[#050505] border border-white/5 rounded-lg p-3 text-[10px] font-mono text-purple-200 overflow-x-auto whitespace-pre-wrap break-all max-h-80 overflow-y-auto">
                                      {JSON.stringify(p.request_payload, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {p.response_body != null && (
                                  <div>
                                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-blue-400/70 mb-1">
                                      <ChevronRight className="h-3 w-3" />
                                      Respuesta del listener
                                    </div>
                                    <pre className="bg-[#050505] border border-white/5 rounded-lg p-3 text-[10px] font-mono text-blue-200 overflow-x-auto whitespace-pre-wrap break-all max-h-80 overflow-y-auto">
                                      {JSON.stringify(p.response_body, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Hint si no hay info de delivery (compras viejas) */}
                            {!hasErrorInfo && (
                              <p className="text-[11px] text-muted-foreground/60 italic">
                                Sin info de delivery (compra anterior al tracking de la migración 051).
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
