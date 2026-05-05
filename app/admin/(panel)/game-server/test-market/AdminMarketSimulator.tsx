"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, User, RefreshCw, ShoppingCart, CheckCircle, XCircle, Coins, Sparkles, AlertTriangle } from "lucide-react";
import {
  getTestCharacter,
  getTestMarketItems,
  adminMarketBuyAsUid,
  type TestMarketItem,
  type TestCharacterInfo,
} from "@/modules/shop-test";

type Props = {
  items: TestMarketItem[];
  cpRate: number;
};

type Outcome = {
  ok: boolean;
  msg: string;
  itemRowId?: number;
  details?: unknown;
};

const itemImage = (id: number) => `/images/market/${id}.png`;

function cpCostFor(item: TestMarketItem, cpRate: number): number {
  if (item.currency === "CP") return item.silverPrice;
  return cpRate > 0 ? Math.ceil(item.silverPrice / cpRate) : 0;
}

function fmtNum(n: number) {
  return n.toLocaleString("es-ES");
}

/**
 * Convert a marketlogs socket string ("NoSocket", "PhoenixGem", "0", "", etc.)
 * to a C# byte value. Returns 0 for empty/no-socket states, 1 for any non-empty
 * gem (the game server resolves the actual gem type from another source). If
 * the string is a numeric ID that fits in a byte, returns it directly.
 */
function socketStringToByte(s: string | null | undefined): number {
  const v = (s ?? "").trim();
  if (!v) return 0;
  const lower = v.toLowerCase();
  if (lower === "nosocket" || lower === "none" || lower === "0") return 0;
  const n = Number(v);
  if (Number.isFinite(n) && n >= 0 && n <= 255) return Math.floor(n);
  return 1; // gema presente, valor genérico — game server lo resuelve
}

export function AdminMarketSimulator({ items: initialItems, cpRate }: Props) {
  const [items, setItems] = useState<TestMarketItem[]>(initialItems);
  const [refreshingMarket, setRefreshingMarket] = useState(false);

  const [uidInput, setUidInput] = useState("");
  const [character, setCharacter] = useState<TestCharacterInfo | null>(null);
  const [charError, setCharError] = useState<string | null>(null);
  const [loadingChar, startLoadChar] = useTransition();

  const [query,    setQuery]    = useState("");
  const [currency, setCurrency] = useState<"all" | "CP" | "Gold">("all");

  const [busyRowId, setBusyRowId] = useState<number | null>(null);
  const [outcome,   setOutcome]   = useState<Outcome | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(it => {
      if (currency !== "all" && it.currency !== currency) return false;
      if (!q) return true;
      return (
        it.itemName.toLowerCase().includes(q) ||
        it.sellerName.toLowerCase().includes(q) ||
        String(it.itemId).includes(q) ||
        String(it.marketRowId).includes(q)
      );
    });
  }, [items, query, currency]);

  const loadCharacter = () => {
    setCharError(null);
    setCharacter(null);
    const uid = Number(uidInput);
    if (!Number.isFinite(uid) || uid <= 0) {
      setCharError("UID inválido.");
      return;
    }
    startLoadChar(async () => {
      const r = await getTestCharacter(uid);
      if (r.success) setCharacter(r.data);
      else setCharError(r.error);
    });
  };

  const refreshCharacter = async () => {
    if (!character) return;
    const r = await getTestCharacter(character.uid);
    if (r.success) setCharacter(r.data);
  };

  const refreshMarket = async () => {
    setRefreshingMarket(true);
    try {
      const r = await getTestMarketItems(200);
      if (r.success) setItems(r.data);
    } finally {
      setRefreshingMarket(false);
    }
  };

  const buy = async (item: TestMarketItem) => {
    if (!character) return;
    setOutcome(null);
    setBusyRowId(item.marketRowId);
    const r = await adminMarketBuyAsUid({
      uid:         character.uid,
      itemId:      item.itemId,
      silverPrice: item.silverPrice,
      currency:    item.currency,
      plus:        item.itemPlus,
      bless:       item.itemBless,
      soc1:        socketStringToByte(item.itemSoc1),
      soc2:        socketStringToByte(item.itemSoc2),
      sellerUid:   item.sellerUid,
      sellerName:  item.sellerName,
      itemUid:     item.itemUid,
    });
    setBusyRowId(null);
    if (r.success) {
      setOutcome({
        ok: true,
        msg: r.data.alreadyDelivered
          ? `Idempotente: el item ${item.itemId} ya estaba entregado.`
          : `Entregado: ${item.itemName} (${item.itemId}) → ${character.name}`,
        itemRowId: item.marketRowId,
        details: r.data,
      });
    } else {
      setOutcome({ ok: false, msg: r.error, itemRowId: item.marketRowId });
    }
    // Refresh both character (CPs/Gold/balance) and market list (item should
    // be removed from marketlogs by the game server after a successful buy).
    await Promise.all([refreshCharacter(), refreshMarket()]);
  };

  return (
    <div className="space-y-6">
      {/* Selector de jugador */}
      <div className="bg-[#111] rounded-xl p-5 border border-purple-700/30 space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-medium text-white uppercase tracking-wide">Actuar como jugador</h2>
        </div>

        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            placeholder="UID del personaje (ej. 100001)"
            value={uidInput}
            onChange={e => setUidInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") loadCharacter(); }}
            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50"
          />
          <button
            type="button"
            onClick={loadCharacter}
            disabled={loadingChar || !uidInput.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-purple-900/30 border border-purple-700/50 text-purple-200 hover:bg-purple-900/50 transition-colors disabled:opacity-40"
          >
            {loadingChar ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Cargar
          </button>
        </div>

        {charError && (
          <div className="text-xs text-red-300 flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5" />
            {charError}
          </div>
        )}

        {character && (
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Nombre</div>
              <div className="text-white font-medium">{character.name}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">UID</div>
              <div className="text-white font-mono">{character.uid}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">CPs</div>
              <div className="text-purple-300 font-mono flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                {fmtNum(character.cps)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Gold</div>
              <div className="text-yellow-300 font-mono flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" />
                {fmtNum(character.gold)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resultado de última compra */}
      {outcome && (
        <div className={`px-4 py-3 rounded-lg border text-sm ${
          outcome.ok
            ? "bg-green-900/20 border-green-800/40 text-green-300"
            : "bg-red-900/20 border-red-800/40 text-red-300"
        }`}>
          <div className="flex items-center gap-2 font-medium">
            {outcome.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {outcome.msg}
          </div>
          {outcome.details != null && (
            <pre className="mt-2 text-[11px] font-mono opacity-70 whitespace-pre-wrap break-all">
              {JSON.stringify(outcome.details, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-50 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            placeholder="Buscar por nombre, vendedor, ItemID, RowID..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <div className="flex gap-1 bg-[#1a1a1a] border border-white/10 rounded-lg p-1">
          {(["all", "CP", "Gold"] as const).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                currency === c ? "bg-purple-900/50 text-purple-200" : "text-gray-400 hover:text-white"
              }`}
            >
              {c === "all" ? "Todas" : c}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={refreshMarket}
          disabled={refreshingMarket}
          title="Recargar listado del marketlogs"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${refreshingMarket ? "animate-spin" : ""}`} />
          Refrescar
        </button>
        <span className="text-xs text-gray-500">
          {filtered.length} de {items.length}
        </span>
      </div>

      {/* Tabla */}
      <div className="bg-[#111] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wider bg-[#0a0a0a]">
                <th className="px-3 py-2.5 w-12"></th>
                <th className="px-3 py-2.5">Item</th>
                <th className="px-3 py-2.5">+ / Bless</th>
                <th className="px-3 py-2.5">Vendedor</th>
                <th className="px-3 py-2.5 text-right">Precio</th>
                <th className="px-3 py-2.5 text-right">CP cost</th>
                <th className="px-3 py-2.5 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const cpCost = cpCostFor(item, cpRate);
                const insufficient = character != null && character.cps < cpCost;
                const isBusy = busyRowId === item.marketRowId;
                const isLast = outcome?.itemRowId === item.marketRowId;

                return (
                  <tr
                    key={item.marketRowId}
                    className={`border-t border-white/5 ${
                      isLast
                        ? outcome?.ok ? "bg-green-900/10" : "bg-red-900/10"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className="relative w-10 h-10 bg-black/40 rounded">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={itemImage(item.itemId)}
                          alt={item.itemName}
                          className="w-full h-full object-contain"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0.2"; }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-white font-medium">{item.itemName}</div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        ItemID {item.itemId} · row {item.marketRowId}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-300 font-mono text-xs">
                      +{item.itemPlus} / {item.itemBless}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-gray-300">{item.sellerName}</div>
                      <div className="text-[10px] text-gray-600 font-mono">
                        UID {item.sellerUid} · ({item.x},{item.y})
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={item.currency === "CP" ? "text-purple-300" : "text-yellow-300"} >
                        {fmtNum(item.silverPrice)} {item.currency}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={insufficient ? "text-red-400 font-mono" : "text-purple-300 font-mono"}>
                        {fmtNum(cpCost)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => buy(item)}
                        disabled={!character || isBusy || busyRowId !== null || insufficient}
                        title={!character ? "Carga un UID primero" : insufficient ? "CPs insuficientes" : "Comprar"}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs bg-purple-900/30 border border-purple-700/40 text-purple-200 hover:bg-purple-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {isBusy ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
                        {isBusy ? "..." : character ? `Comprar como ${character.name.slice(0, 10)}` : "Comprar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500 text-sm">
                    {items.length === 0 ? "El mercado del server pruebas está vacío." : "Sin resultados con esos filtros."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!character && items.length > 0 && (
        <div className="text-xs text-gray-500 flex items-center gap-1.5 justify-center">
          <AlertTriangle className="h-3.5 w-3.5" />
          Carga un UID arriba para habilitar las compras.
        </div>
      )}
    </div>
  );
}

