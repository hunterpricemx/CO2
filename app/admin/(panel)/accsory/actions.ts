"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin/auth";
import type { ActionResult } from "@/types";

export type AccsoryFormData = {
  name: string;
  description: string;
  image_url: string | null;
  active: boolean;
  allows_custom: boolean;
  is_reserved: boolean;
  sort_order: number;
};

export async function createAccsory(data: AccsoryFormData): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "No autorizado." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("accsory").insert({
    name: data.name.trim(),
    description: data.description.trim(),
    image_url: data.image_url || null,
    active: data.active,
    allows_custom: data.allows_custom,
    is_reserved: data.is_reserved,
    sort_order: data.sort_order,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/accsory");
  return { success: true, data: undefined };
}

export async function updateAccsory(id: string, data: AccsoryFormData): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "No autorizado." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("accsory")
    .update({
      name: data.name.trim(),
      description: data.description.trim(),
      image_url: data.image_url || null,
      active: data.active,
      allows_custom: data.allows_custom,
      is_reserved: data.is_reserved,
      sort_order: data.sort_order,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/accsory");
  return { success: true, data: undefined };
}

export async function deleteAccsory(id: string): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "No autorizado." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("accsory").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/accsory");
  return { success: true, data: undefined };
}

export async function toggleAccsoryActive(id: string, active: boolean): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "No autorizado." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("accsory")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/accsory");
  return { success: true, data: undefined };
}

export async function toggleAccsoryReserved(id: string, isReserved: boolean): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "No autorizado." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("accsory")
    .update({ is_reserved: isReserved, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/accsory");
  return { success: true, data: undefined };
}
