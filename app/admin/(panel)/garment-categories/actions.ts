"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin/auth";
import type { ActionResult } from "@/types";

export type GarmentCategoryFormData = {
  name: string;
  sort_order: number;
};

export async function createGarmentCategory(data: GarmentCategoryFormData): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "No autorizado." };
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("garment_categories").insert({
    name: data.name.trim(),
    sort_order: data.sort_order,
  });
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/garment-categories");
  return { success: true, data: undefined };
}

export async function updateGarmentCategory(id: string, data: GarmentCategoryFormData): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "No autorizado." };
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("garment_categories")
    .update({ name: data.name.trim(), sort_order: data.sort_order, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/garment-categories");
  return { success: true, data: undefined };
}

export async function deleteGarmentCategory(id: string): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "No autorizado." };
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("garment_categories").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/garment-categories");
  return { success: true, data: undefined };
}
