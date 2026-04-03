"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin/auth";
import type { ActionResult } from "@/types";

// ── Types ────────────────────────────────────────────────────────────────────

export type GarmentFormData = {
  name: string;
  description: string;
  image_url: string | null;
  active: boolean;
  allows_custom: boolean;
  is_reserved: boolean;
  sort_order: number;
  category_id: string | null;
  versions: string;
};

export type OrderStatusUpdate = {
  orderId: string;
  status: string;
  admin_notes?: string;
};

// ── Garment CRUD ─────────────────────────────────────────────────────────────

export async function createGarment(data: GarmentFormData): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "No autorizado." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("garments").insert({
    name:          data.name.trim(),
    description:   data.description.trim(),
    image_url:     data.image_url || null,
    active:        data.active,
    allows_custom: data.allows_custom,
    is_reserved:   data.is_reserved,
    sort_order:    data.sort_order,
    category_id:   data.category_id || null,
    versions:      data.versions || 'both',
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/garments");
  return { success: true, data: undefined };
}

export async function updateGarment(id: string, data: GarmentFormData): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "No autorizado." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("garments")
    .update({
      name:          data.name.trim(),
      description:   data.description.trim(),
      image_url:     data.image_url || null,
      active:        data.active,
      allows_custom: data.allows_custom,
      is_reserved:   data.is_reserved,
      sort_order:    data.sort_order,
      category_id:   data.category_id || null,
      versions:      data.versions || 'both',
      updated_at:    new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/garments");
  return { success: true, data: undefined };
}

export async function deleteGarment(id: string): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "No autorizado." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("garments").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/garments");
  return { success: true, data: undefined };
}

export async function toggleGarmentActive(id: string, active: boolean): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "No autorizado." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("garments")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/garments");
  return { success: true, data: undefined };
}

export async function toggleGarmentReserved(id: string, isReserved: boolean): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "No autorizado." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("garments")
    .update({ is_reserved: isReserved, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/garments");
  return { success: true, data: undefined };
}

// ── Order management ──────────────────────────────────────────────────────────

export async function updateOrderStatus(params: OrderStatusUpdate): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "No autorizado." };

  const validStatuses = ["pending_payment", "paid", "in_progress", "delivered", "cancelled"];
  if (!validStatuses.includes(params.status)) {
    return { success: false, error: "Estado no válido." };
  }

  const supabase = await createAdminClient();
  const payload: Record<string, unknown> = {
    status:     params.status,
    updated_at: new Date().toISOString(),
  };
  if (params.admin_notes !== undefined) payload.admin_notes = params.admin_notes;
  if (params.status === "delivered") payload.delivered_at = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("garment_orders")
    .update(payload)
    .eq("id", params.orderId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/garments/orders");
  return { success: true, data: undefined };
}
