"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getGameSession } from "@/lib/session";
import { getCharacterForAccount, deductCPs, creditCPs, getCpMarketRate } from "@/lib/game-db";
import type { ActionResult } from "@/types";

export type MarketPurchaseStatus = "pending" | "completed" | "cancelled" | "refunded";

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
}

/**
 * Server action: buy a market item using the player's in-game CPs.
 * Atomically deducts CPs from the game DB and records the purchase in Supabase.
 */
export async function buyWithCPsAction(
  input: BuyWithCPsInput,
): Promise<ActionResult<{ purchaseId: string; cpCost: number; newBalance: number }>> {
  const session = await getGameSession();
  if (!session) return { success: false, error: "Debes iniciar sesión para comprar." };

  const versionNum: 1 | 2 = input.version === "1.0" ? 1 : 2;

  // 1. Get current CP rate
  const cpRate = await getCpMarketRate();
  if (cpRate <= 0) return { success: false, error: "Tasa de conversión de CPs no configurada." };

  // 2. Calculate CP cost (round up)
  const cpCost = Math.ceil(input.silver_price / cpRate);
  if (cpCost <= 0) return { success: false, error: "Precio inválido." };

  // 3. Get character + verify balance
  const character = await getCharacterForAccount(session.uid, versionNum);
  if (!character) return { success: false, error: "No se encontró tu personaje en este servidor." };
  if (character.cps < cpCost) {
    return {
      success: false,
      error: `CPs insuficientes. Necesitas ${cpCost.toLocaleString("es-ES")} CP, tienes ${character.cps.toLocaleString("es-ES")} CP.`,
    };
  }

  // 4. Atomic deduction in game DB
  let deductResult: { success: boolean; newBalance: number };
  try {
    deductResult = await deductCPs(session.uid, versionNum, cpCost);
  } catch {
    return { success: false, error: "Error al descontar CPs del personaje. Intenta de nuevo." };
  }

  if (!deductResult.success) {
    return { success: false, error: "CPs insuficientes al momento del cobro. Intenta de nuevo." };
  }

  // 5. Record purchase in Supabase
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("market_purchases")
    .insert({
      buyer_username: session.username,
      buyer_uid: session.uid,
      char_name: character.name,
      item_id: input.item_id,
      item_name: input.item_name,
      item_plus: input.item_plus,
      item_bless: input.item_bless,
      item_soc1: input.item_soc1,
      item_soc2: input.item_soc2,
      seller_name: input.seller_name,
      seller_x: input.seller_x,
      seller_y: input.seller_y,
      silver_price: input.silver_price,
      cp_cost: cpCost,
      cp_rate: cpRate,
      version: input.version,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    // CPs were already deducted — log this as a critical error but tell user to contact support
    console.error("[market] CPs deducted but Supabase insert failed:", error?.message);
    return {
      success: false,
      error: "CPs descontados pero hubo un error al registrar la compra. Contacta soporte con tu usuario y el ítem.",
    };
  }

  return {
    success: true,
    data: {
      purchaseId: (data as { id: string }).id,
      cpCost,
      newBalance: deductResult.newBalance,
    },
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
