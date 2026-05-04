"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { getGameSession } from "@/lib/session";
import { getCharacterForAccount, deductCPs, creditCPs, getCpMarketRate } from "@/lib/game-db";
import { deliverShopItem, type ShopEnv } from "@/lib/shop-delivery";
import { isShopBuyerWhitelisted } from "@/lib/shop-whitelist";
import type { ActionResult } from "@/types";

export type MarketPurchaseStatus = "pending" | "completed" | "cancelled" | "refunded" | "failed";

export interface MarketPurchase {
  id: string;
  created_at: string;
  buyer_username: string;
  buyer_uid: number;
  char_name: string;
  item_id: string;
  item_name: string;
  item_plus: number;
  item_bless: number;
  item_soc1: string | null;
  item_soc2: string | null;
  seller_name: string;
  seller_x: number | null;
  seller_y: number | null;
  silver_price: number;
  cp_cost: number;
  cp_rate: number;
  version: string;
  status: MarketPurchaseStatus;
  admin_note: string | null;
  completed_at: string | null;
}

export interface BuyWithCPsInput {
  item_id: string;
  item_name: string;
  item_plus: number;
  item_bless: number;
  item_soc1: string | null;
  item_soc2: string | null;
  seller_name: string;
  seller_x: number | null;
  seller_y: number | null;
  silver_price: number;
  version: string; // "1.0" | "2.0"
  /** Marketlogs context — needed by the C# listener to remove the listing. */
  seller_uid?: number;
  item_uid?:   number;
}

/** Convert a marketlogs socket string to a C# byte for the shop listener. */
function socketStringToByte(s: string | null | undefined): number {
  const v = (s ?? "").trim();
  if (!v) return 0;
  const lower = v.toLowerCase();
  if (lower === "nosocket" || lower === "none" || lower === "0") return 0;
  const n = Number(v);
  if (Number.isFinite(n) && n >= 0 && n <= 255) return Math.floor(n);
  return 1;
}

function safeParseJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}

async function captureClientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/**
 * Server action: buy a market item using the player's in-game CPs.
 *
 * Flow (mirrors modules/shop-test/actions.ts:adminMarketBuyAsUid):
 *   1. Auth via getGameSession + whitelist gate.
 *   2. Get CP rate, compute cost, verify character balance.
 *   3. Insert market_purchases row with status='pending' (audit trail BEFORE side effects).
 *   4. Atomic deductCPs in game DB — abort + mark failed if insufficient.
 *   5. POST signed payload to the C# listener via deliverShopItem().
 *   6. On success → status='completed', delivered_at=now(), persist payload + response.
 *   7. On failure → creditCPs() refund + status='refunded' (or 'failed' if refund failed too).
 */
export async function buyWithCPsAction(
  input: BuyWithCPsInput,
): Promise<ActionResult<{ purchaseId: string; cpCost: number; newBalance: number }>> {
  const session = await getGameSession();
  if (!session) return { success: false, error: "Debes iniciar sesión para comprar." };

  // Beta gate — only whitelisted usernames can complete the purchase.
  const allowed = await isShopBuyerWhitelisted(session.username);
  if (!allowed) {
    return { success: false, error: "feature_not_enabled" };
  }

  const versionNum: 1 | 2 = input.version === "1.0" ? 1 : 2;
  const env: ShopEnv = versionNum === 1 ? "v1" : "v2";

  const cpRate = await getCpMarketRate();
  if (cpRate <= 0) return { success: false, error: "Tasa de conversión de CPs no configurada." };

  // The current public input doesn't carry the currency type — same conversion as
  // the legacy flow, identical to the previous behaviour to avoid regressions.
  const cpCost = Math.ceil(input.silver_price / cpRate);
  if (cpCost <= 0) return { success: false, error: "Precio inválido." };

  const character = await getCharacterForAccount(session.uid, versionNum);
  if (!character) return { success: false, error: "No se encontró tu personaje en este servidor." };
  if (character.cps < cpCost) {
    return {
      success: false,
      error: `CPs insuficientes. Necesitas ${cpCost.toLocaleString("es-ES")} CP, tienes ${character.cps.toLocaleString("es-ES")} CP.`,
    };
  }

  const ip = await captureClientIp();
  const supabase = await createAdminClient();

  // 1. Insert pending row first (audit trail before any side effect).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertErr } = await (supabase as any)
    .from("market_purchases")
    .insert({
      buyer_username: session.username,
      buyer_uid:      session.uid,
      char_name:      character.name,
      item_id:        input.item_id,
      item_name:      input.item_name,
      item_plus:      input.item_plus,
      item_bless:     input.item_bless,
      item_soc1:      input.item_soc1,
      item_soc2:      input.item_soc2,
      seller_name:    input.seller_name,
      seller_x:       input.seller_x,
      seller_y:       input.seller_y,
      silver_price:   input.silver_price,
      cp_cost:        cpCost,
      cp_rate:        cpRate,
      version:        input.version,
      status:         "pending" as MarketPurchaseStatus,
      player_ip:      ip,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return { success: false, error: `No se pudo registrar la compra: ${insertErr?.message ?? "unknown"}` };
  }
  const purchaseId = (inserted as { id: string }).id;

  // 2. Atomic deduction in game DB.
  let deductResult: { success: boolean; newBalance: number };
  try {
    deductResult = await deductCPs(session.uid, versionNum, cpCost);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "deduct_failed";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("market_purchases")
      .update({ status: "failed" as MarketPurchaseStatus, delivery_error: `deduct_error: ${msg}` })
      .eq("id", purchaseId);
    return { success: false, error: "Error al descontar CPs del personaje. Intenta de nuevo." };
  }
  if (!deductResult.success) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("market_purchases")
      .update({ status: "failed" as MarketPurchaseStatus, delivery_error: "insufficient_cps_at_charge" })
      .eq("id", purchaseId);
    return { success: false, error: "CPs insuficientes al momento del cobro. Intenta de nuevo." };
  }

  // 3. HTTP delivery to game server listener.
  const itemIdNum = Number(input.item_id);
  const delivery = await deliverShopItem({
    env,
    purchaseId,
    uid:        session.uid,
    itemId:     Number.isFinite(itemIdNum) ? itemIdNum : 0,
    ip,
    plus:       input.item_plus,
    bless:      input.item_bless,
    soc1:       socketStringToByte(input.item_soc1),
    soc2:       socketStringToByte(input.item_soc2),
    sellerUid:  input.seller_uid,
    sellerName: input.seller_name,
    itemUid:    input.item_uid,
    // Public market always quotes the price already pre-converted to CP-equivalent
    // by getMarketRows(); we forward it as `cp` for the listener to record.
    cp:         input.silver_price,
    gold:       0,
  });

  if (delivery.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("market_purchases")
      .update({
        status:            "completed" as MarketPurchaseStatus,
        completed_at:      new Date().toISOString(),
        delivered_at:      new Date().toISOString(),
        delivery_attempts: 1,
        request_payload:   safeParseJson(delivery.signedRequest.body),
        response_body:     delivery.body ?? null,
      })
      .eq("id", purchaseId);

    return {
      success: true,
      data: { purchaseId, cpCost, newBalance: deductResult.newBalance },
    };
  }

  // 4. Failure path — refund CPs and mark failed/refunded.
  let refunded = false;
  let refundError: string | undefined;
  let newBalance = deductResult.newBalance;
  try {
    const credit = await creditCPs(session.uid, versionNum, cpCost);
    refunded = credit.success;
    newBalance = credit.newBalance;
  } catch (e) {
    refundError = e instanceof Error ? e.message : "refund_failed";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("market_purchases")
    .update({
      status:            refunded ? ("refunded" as MarketPurchaseStatus) : ("failed" as MarketPurchaseStatus),
      delivery_attempts: 1,
      delivery_error:    refundError ? `${delivery.error ?? "unknown"} | refund_error: ${refundError}` : (delivery.error ?? "unknown"),
      request_payload:   safeParseJson(delivery.signedRequest.body),
      response_body:     delivery.body ?? null,
    })
    .eq("id", purchaseId);

  void newBalance;
  return {
    success: false,
    error: `Entrega fallida (${delivery.error ?? "unknown"})${refunded ? " — CPs reembolsados." : refundError ? ` — refund también falló: ${refundError}` : ""}`,
  };
}

/**
 * Get the purchase history for the currently logged-in player.
 */
export async function getMyPurchasesAction(): Promise<ActionResult<MarketPurchase[]>> {
  const session = await getGameSession();
  if (!session) return { success: false, error: "No autenticado." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("market_purchases")
    .select("*")
    .eq("buyer_uid", session.uid)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as MarketPurchase[] };
}

/**
 * Admin: get all purchases with optional filter.
 */
export async function adminGetPurchasesAction(filters?: {
  status?: MarketPurchaseStatus;
  version?: string;
}): Promise<ActionResult<MarketPurchase[]>> {
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("market_purchases")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.version) q = q.eq("version", filters.version);

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as MarketPurchase[] };
}

/**
 * Admin: update purchase status (complete, cancel, refund).
 * When completing, it should credit CPs back if refunding.
 */
export async function adminUpdatePurchaseAction(
  purchaseId: string,
  status: "completed" | "cancelled" | "refunded",
  adminNote?: string,
): Promise<ActionResult> {
  const supabase = await createAdminClient();

  const updatePayload: Record<string, unknown> = {
    status,
    admin_note: adminNote?.trim() || null,
  };
  if (status === "completed") updatePayload.completed_at = new Date().toISOString();

  // If refunding, credit CPs back to player
  if (status === "refunded") {
    const supabase2 = await createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: purchase } = await (supabase2 as any)
      .from("market_purchases")
      .select("buyer_uid, cp_cost, version")
      .eq("id", purchaseId)
      .single();

    if (purchase) {
      const versionNum: 1 | 2 = purchase.version === "1.0" ? 1 : 2;
      try {
        await creditCPs(purchase.buyer_uid, versionNum, purchase.cp_cost);
      } catch {
        return { success: false, error: "Error al reembolsar CPs en el game server." };
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("market_purchases")
    .update(updatePayload)
    .eq("id", purchaseId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}
