"use server";

/**
 * Shop test purchases — admin-only orchestration of an end-to-end purchase
 * against the "Pruebas" game server. Independent of the public market flow:
 * does NOT touch modules/market/* or market_purchases.
 *
 * Flow:
 *   1. requireAdminPanelAccess("gameServer")
 *   2. Insert market_test_purchases row (pending) BEFORE charging CPs
 *   3. deductCPs(uid, "test", cpAmount)  — atomic; bails out if insufficient
 *   4. deliverShopItem({ env: "test", purchaseId, uid, itemId, ip })
 *   5. on success → status='completed', delivered_at=now
 *      on failure → creditCPs() refund + status='failed' + delivery_error
 */

import { z } from "zod";
import { headers } from "next/headers";
import type { RowDataPacket } from "mysql2";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdminPanelAccess } from "@/lib/admin/auth";
import { deductCPs, creditCPs, getCharacterForAccount, getGameDb, getCpMarketRate } from "@/lib/game-db";
import { deliverShopItem } from "@/lib/shop-delivery";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types";
import type { TestPurchase, TestPurchaseResult, TestPurchaseStatus } from "./types";

const InputSchema = z.object({
  uid:      z.number().int().positive().max(2_147_483_647),
  itemId:   z.number().int().positive().max(9_007_199_254_740_991),
  cpAmount: z.number().int().min(0).max(1_000_000),
});

const TEST_PURCHASES_TABLE = "market_test_purchases";

async function captureClientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function testShopPurchase(input: unknown): Promise<ActionResult<TestPurchaseResult>> {
  const admin = await requireAdminPanelAccess("gameServer");

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos: " + parsed.error.issues.map(i => i.message).join(", ") };
  }
  const { uid, itemId, cpAmount } = parsed.data;

  const rl = checkRateLimit("shop_test", admin.email, { max: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return { success: false, error: "Demasiadas pruebas en poco tiempo. Espera un momento." };
  }

  const ip = await captureClientIp();
  const supabase = await createAdminClient();

  // 1. Insert pending row first (audit trail before any side effect)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertErr } = await (supabase as any)
    .from(TEST_PURCHASES_TABLE)
    .insert({
      admin_email: admin.email,
      uid,
      item_id:     itemId,
      cp_amount:   cpAmount,
      player_ip:   ip,
      status:      "pending" as TestPurchaseStatus,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return { success: false, error: `No se pudo registrar la prueba: ${insertErr?.message ?? "unknown"}` };
  }
  const purchaseId = (inserted as { id: string }).id;

  // 2. Deduct CPs (only if cpAmount > 0)
  let newBalance: number | null = null;
  if (cpAmount > 0) {
    let deductRes: { success: boolean; newBalance: number };
    try {
      deductRes = await deductCPs(uid, "test", cpAmount);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "deduct_failed";
      await markFailed(supabase, purchaseId, `deduct_error: ${msg}`);
      return { success: false, error: `Error al descontar CPs: ${msg}` };
    }

    if (!deductRes.success) {
      await markFailed(supabase, purchaseId, "insufficient_cps");
      return { success: false, error: "CPs insuficientes en el personaje." };
    }
    newBalance = deductRes.newBalance;
  }

  // 3. Deliver item via signed HTTP call to game server listener
  const delivery = await deliverShopItem({
    env: "test",
    purchaseId,
    uid,
    itemId,
    ip,
  });

  // 4. Outcome
  if (delivery.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from(TEST_PURCHASES_TABLE)
      .update({
        status:            "completed" as TestPurchaseStatus,
        delivered_at:      new Date().toISOString(),
        delivery_attempts: 1,
        request_payload:   safeParseJson(delivery.signedRequest.body),
        response_body:     delivery.body ?? null,
      })
      .eq("id", purchaseId);

    return {
      success: true,
      data: {
        purchaseId,
        status:            "completed",
        delivered:         !delivery.alreadyDelivered,
        alreadyDelivered:  delivery.alreadyDelivered,
        refunded:          false,
        newBalance,
      },
    };
  }

  // Failure path — refund CPs and mark failed
  let refunded = false;
  let refundError: string | undefined;
  if (cpAmount > 0) {
    try {
      const credit = await creditCPs(uid, "test", cpAmount);
      refunded = credit.success;
      newBalance = credit.newBalance;
    } catch (e) {
      refundError = e instanceof Error ? e.message : "refund_failed";
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from(TEST_PURCHASES_TABLE)
    .update({
      status:            refunded || cpAmount === 0 ? "refunded" : "failed",
      delivery_attempts: 1,
      delivery_error:    refundError ? `${delivery.error ?? "unknown"} | refund_error: ${refundError}` : (delivery.error ?? "unknown"),
      request_payload:   safeParseJson(delivery.signedRequest.body),
      response_body:     delivery.body ?? null,
    })
    .eq("id", purchaseId);

  return {
    success: false,
    error: `Entrega fallida (${delivery.error ?? "unknown"})${refunded ? " — CPs reembolsados." : refundError ? ` — refund también falló: ${refundError}` : ""}`,
  };
}

export async function listTestPurchases(): Promise<ActionResult<TestPurchase[]>> {
  await requireAdminPanelAccess("gameServer");
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from(TEST_PURCHASES_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as TestPurchase[] };
}

export interface PurchaseHistoryFilters {
  status?:   TestPurchaseStatus[];
  uid?:      number;
  itemId?:   number;
  search?:   string;            // matches admin_email, delivery_error, player_ip
  fromDate?: string;            // ISO yyyy-mm-dd
  toDate?:   string;            // ISO yyyy-mm-dd
  page?:     number;            // 1-based
  pageSize?: number;            // default 25
}

export interface PurchaseHistoryPage {
  rows:      TestPurchase[];
  total:     number;
  page:      number;
  pageSize:  number;
  totalPages: number;
}

/** Paginated, filtered list of test purchases for the dedicated history page. */
export async function getTestPurchaseHistory(
  filters: PurchaseHistoryFilters = {},
): Promise<ActionResult<PurchaseHistoryPage>> {
  await requireAdminPanelAccess("gameServer");
  const supabase = await createAdminClient();

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from(TEST_PURCHASES_TABLE)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.status && filters.status.length > 0) {
    q = q.in("status", filters.status);
  }
  if (filters.uid && filters.uid > 0) {
    q = q.eq("uid", filters.uid);
  }
  if (filters.itemId && filters.itemId > 0) {
    q = q.eq("item_id", filters.itemId);
  }
  if (filters.fromDate) {
    q = q.gte("created_at", `${filters.fromDate}T00:00:00.000Z`);
  }
  if (filters.toDate) {
    q = q.lte("created_at", `${filters.toDate}T23:59:59.999Z`);
  }
  if (filters.search) {
    const s = filters.search.trim();
    if (s.length > 0) {
      // PostgREST `or` filter: match on admin_email, delivery_error, player_ip
      q = q.or(`admin_email.ilike.%${s}%,delivery_error.ilike.%${s}%,player_ip.ilike.%${s}%`);
    }
  }

  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) return { success: false, error: error.message };

  const total = count ?? 0;
  return {
    success: true,
    data: {
      rows: (data ?? []) as TestPurchase[],
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

/** Reintenta SOLO el HTTP delivery; no re-deduce CPs. Útil cuando el game server estuvo caído. */
export async function retryTestPurchase(id: string): Promise<ActionResult<TestPurchaseResult>> {
  const admin = await requireAdminPanelAccess("gameServer");
  const rl = checkRateLimit("shop_test_retry", admin.email, { max: 20, windowMs: 60_000 });
  if (!rl.ok) return { success: false, error: "Demasiados reintentos. Espera un momento." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error: rowErr } = await (supabase as any)
    .from(TEST_PURCHASES_TABLE)
    .select("id, status, uid, item_id, cp_amount, player_ip, delivery_attempts")
    .eq("id", id)
    .single();
  if (rowErr || !row) return { success: false, error: "Compra no encontrada." };
  if (row.status === "completed") {
    return { success: false, error: "La compra ya está completada." };
  }
  if (row.status === "refunded") {
    return { success: false, error: "La compra ya fue reembolsada; no se puede reintentar." };
  }

  const delivery = await deliverShopItem({
    env: "test",
    purchaseId: row.id,
    uid:        row.uid,
    itemId:     row.item_id,
    ip:         row.player_ip ?? null,
  });

  const attempts = (row.delivery_attempts ?? 0) + 1;

  if (delivery.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from(TEST_PURCHASES_TABLE)
      .update({
        status:            "completed" as TestPurchaseStatus,
        delivered_at:      new Date().toISOString(),
        delivery_attempts: attempts,
        delivery_error:    null,
        response_body:     delivery.body ?? null,
      })
      .eq("id", id);

    return {
      success: true,
      data: {
        purchaseId: id,
        status:     "completed",
        delivered:  !delivery.alreadyDelivered,
        alreadyDelivered: delivery.alreadyDelivered,
        refunded:   false,
        newBalance: null,
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from(TEST_PURCHASES_TABLE)
    .update({
      delivery_attempts: attempts,
      delivery_error:    delivery.error ?? "unknown",
      response_body:     delivery.body ?? null,
    })
    .eq("id", id);

  return { success: false, error: `Reintento fallido (${delivery.error ?? "unknown"})` };
}

async function markFailed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  purchaseId: string,
  err: string,
) {
  await supabase
    .from(TEST_PURCHASES_TABLE)
    .update({ status: "failed", delivery_error: err })
    .eq("id", purchaseId);
}

function safeParseJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}

// ───── Market simulation: read items + impersonate a UID ─────────────

export interface TestMarketItem {
  marketRowId:    number;
  itemUid:        number;
  sellerUid:      number;
  sellerName:     string;
  itemId:         number;
  itemName:       string;
  itemPlus:       number;
  itemBless:      number;
  itemSoc1:       string;
  itemSoc2:       string;
  silverPrice:    number;
  currency:       "CP" | "Gold";
  quality:        string;
  x:              number;
  y:              number;
}

export interface TestCharacterInfo {
  uid:    number;
  name:   string;
  cps:    number;
  gold:   number;
  level:  number | null;
}

interface TestMarketRow extends RowDataPacket {
  ID: number;
  itemuid: number;
  selleruid: number;
  sellername: string;
  itemid: number;
  itemname: string;
  itemplus: string | number;
  itembless: string | number;
  itemsoc1: string;
  itemsoc2: string;
  price: string | number;
  type: number;
  X: string | number;
  Y: string | number;
  Quality: string;
}

/** Reads `marketlogs` from the test game DB. Returns up to `limit` rows (default 200). */
export async function getTestMarketItems(limit = 200): Promise<ActionResult<TestMarketItem[]>> {
  await requireAdminPanelAccess("gameServer");
  const safeLimit = Math.min(Math.max(1, limit | 0), 1000);

  let conn: import("mysql2/promise").Connection | undefined;
  try {
    const { conn: c } = await getGameDb("test");
    conn = c;
    const [rows] = await c.execute<TestMarketRow[]>(
      "SELECT ID, itemuid, selleruid, sellername, itemid, itemname, itemplus, itembless, itemsoc1, itemsoc2, price, type, X, Y, Quality FROM `marketlogs` ORDER BY ID DESC LIMIT ?",
      [safeLimit],
    );

    const items: TestMarketItem[] = rows.map(r => ({
      marketRowId: Number(r.ID),
      itemUid:     Number(r.itemuid),
      sellerUid:   Number(r.selleruid),
      sellerName:  r.sellername ?? "-",
      itemId:      Number(r.itemid),
      itemName:    r.itemname ?? "Unknown",
      itemPlus:    Number(r.itemplus  ?? 0),
      itemBless:   Number(r.itembless ?? 0),
      itemSoc1:    r.itemsoc1 ?? "",
      itemSoc2:    r.itemsoc2 ?? "",
      silverPrice: Number(r.price ?? 0),
      currency:    Number(r.type ?? 1) === 2 ? "Gold" : "CP",
      quality:     (r.Quality ?? "NotQuality").trim() || "NotQuality",
      x:           Number(r.X ?? 0),
      y:           Number(r.Y ?? 0),
    }));

    return { success: true, data: items };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return { success: false, error: `No se pudo leer el mercado de pruebas: ${msg}` };
  } finally {
    await conn?.end();
  }
}

/** Loads character info from the test game DB for impersonation. */
export async function getTestCharacter(uid: number): Promise<ActionResult<TestCharacterInfo>> {
  await requireAdminPanelAccess("gameServer");
  const parsed = z.number().int().positive().safeParse(uid);
  if (!parsed.success) return { success: false, error: "UID inválido." };

  let conn: import("mysql2/promise").Connection | undefined;
  try {
    const { conn: c, config } = await getGameDb("test");
    conn = c;
    const [rows] = await c.execute<RowDataPacket[]>(
      `SELECT EntityID, Name, CPs, Money, Level FROM \`${config.table_characters}\` WHERE EntityID = ? LIMIT 1`,
      [parsed.data],
    );
    if (!rows[0]) return { success: false, error: "Personaje no encontrado en el server pruebas." };
    return {
      success: true,
      data: {
        uid:   Number(rows[0].EntityID),
        name:  String(rows[0].Name),
        cps:   Number(rows[0].CPs   ?? 0),
        gold:  Number(rows[0].Money ?? 0),
        level: rows[0].Level != null ? Number(rows[0].Level) : null,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return { success: false, error: `Error MySQL: ${msg}` };
  } finally {
    await conn?.end();
  }
}

const MarketBuyInput = z.object({
  uid:         z.number().int().positive(),
  itemId:      z.number().int().positive(),
  silverPrice: z.number().int().nonnegative().max(2_000_000_000),
  currency:    z.enum(["CP", "Gold"]),
  plus:        z.number().int().min(0).max(255).optional(),
  bless:       z.number().int().min(0).max(255).optional(),
  soc1:        z.number().int().min(0).max(255).optional(),
  soc2:        z.number().int().min(0).max(255).optional(),
  sellerUid:   z.number().int().nonnegative().max(4_294_967_295).optional(),
  sellerName:  z.string().max(64).optional(),
  itemUid:     z.number().int().nonnegative().max(4_294_967_295).optional(),
});

/**
 * Buy an item AS the given UID — full journey on the test server.
 * Currency rules:
 *   - "CP"   → silverPrice IS the CP cost (already in CPs)
 *   - "Gold" → convert silverPrice to CPs via cp_market_rate (ceil)
 */
export async function adminMarketBuyAsUid(input: unknown): Promise<ActionResult<TestPurchaseResult>> {
  const admin = await requireAdminPanelAccess("gameServer");

  const parsed = MarketBuyInput.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos: " + parsed.error.issues.map(i => i.message).join(", ") };
  }
  const { uid, itemId, silverPrice, currency, plus, bless, soc1, soc2, sellerUid, sellerName, itemUid } = parsed.data;

  const rl = checkRateLimit("shop_test_market_buy", admin.email, { max: 30, windowMs: 60_000 });
  if (!rl.ok) return { success: false, error: "Demasiadas compras en poco tiempo. Espera un momento." };

  // Calculate CP cost
  let cpAmount: number;
  if (currency === "CP") {
    cpAmount = silverPrice;
  } else {
    const rate = await getCpMarketRate();
    if (rate <= 0) return { success: false, error: "Tasa de conversión CP no configurada." };
    cpAmount = Math.ceil(silverPrice / rate);
  }
  if (cpAmount <= 0) return { success: false, error: "Precio inválido." };

  // Verify character + balance BEFORE inserting pending row
  const character = await getCharacterForAccount(uid, "test");
  if (!character) return { success: false, error: "Personaje no encontrado en el server pruebas." };
  if (character.cps < cpAmount) {
    return { success: false, error: `CPs insuficientes. Necesita ${cpAmount.toLocaleString("es-ES")} CP, tiene ${character.cps.toLocaleString("es-ES")} CP.` };
  }

  const ip = await captureClientIp();
  const supabase = await createAdminClient();

  // Insert pending row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertErr } = await (supabase as any)
    .from(TEST_PURCHASES_TABLE)
    .insert({
      admin_email: admin.email,
      uid,
      item_id:     itemId,
      cp_amount:   cpAmount,
      player_ip:   ip,
      status:      "pending" as TestPurchaseStatus,
    })
    .select("id")
    .single();
  if (insertErr || !inserted) {
    return { success: false, error: `No se pudo registrar la compra: ${insertErr?.message ?? "unknown"}` };
  }
  const purchaseId = (inserted as { id: string }).id;

  // Atomic deduction
  let deductRes: { success: boolean; newBalance: number };
  try {
    deductRes = await deductCPs(uid, "test", cpAmount);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "deduct_failed";
    await markFailed(supabase, purchaseId, `deduct_error: ${msg}`);
    return { success: false, error: `Error al descontar CPs: ${msg}` };
  }
  if (!deductRes.success) {
    await markFailed(supabase, purchaseId, "insufficient_cps_at_charge");
    return { success: false, error: "CPs insuficientes al momento del cobro. Otro proceso pudo haberlos gastado." };
  }
  let newBalance: number | null = deductRes.newBalance;

  // HTTP delivery to game server listener.
  // Split price into gold/cp based on the listing currency:
  //   - listed in Gold → gold=silverPrice, cp=0
  //   - listed in CP   → cp=silverPrice,   gold=0
  const delivery = await deliverShopItem({
    env: "test",
    purchaseId,
    uid,
    itemId,
    ip,
    plus,
    bless,
    soc1,
    soc2,
    sellerUid,
    sellerName,
    itemUid,
    gold: currency === "Gold" ? silverPrice : 0,
    cp:   currency === "CP"   ? silverPrice : 0,
  });

  if (delivery.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from(TEST_PURCHASES_TABLE)
      .update({
        status:            "completed" as TestPurchaseStatus,
        delivered_at:      new Date().toISOString(),
        delivery_attempts: 1,
        request_payload:   safeParseJson(delivery.signedRequest.body),
        response_body:     delivery.body ?? null,
      })
      .eq("id", purchaseId);

    return {
      success: true,
      data: {
        purchaseId,
        status:           "completed",
        delivered:        !delivery.alreadyDelivered,
        alreadyDelivered: delivery.alreadyDelivered,
        refunded:         false,
        newBalance,
      },
    };
  }

  // Failure → refund
  let refunded = false;
  let refundError: string | undefined;
  try {
    const credit = await creditCPs(uid, "test", cpAmount);
    refunded = credit.success;
    newBalance = credit.newBalance;
  } catch (e) {
    refundError = e instanceof Error ? e.message : "refund_failed";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from(TEST_PURCHASES_TABLE)
    .update({
      status:            refunded ? "refunded" : "failed",
      delivery_attempts: 1,
      delivery_error:    refundError ? `${delivery.error ?? "unknown"} | refund_error: ${refundError}` : (delivery.error ?? "unknown"),
      request_payload:   safeParseJson(delivery.signedRequest.body),
      response_body:     delivery.body ?? null,
    })
    .eq("id", purchaseId);

  return {
    success: false,
    error: `Entrega fallida (${delivery.error ?? "unknown"})${refunded ? " — CPs reembolsados." : refundError ? ` — refund también falló: ${refundError}` : ""}`,
  };
}
