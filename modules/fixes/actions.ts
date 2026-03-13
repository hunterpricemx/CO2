"use server";
/**
 * Fixes Module — Server Actions
 * @module modules/fixes/actions
 */

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";
import { fixSchema, type CreateFixInput } from "./types";

export async function createFix(input: CreateFixInput): Promise<ActionResult<{ id: string }>> {
  const parsed = fixSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const supabase = await createAdminClient();
  const { data, error } = await supabase.from("fixes").insert(parsed.data).select("id").single();

  if (error || !data) return { success: false, error: error?.message ?? "Error" };
  revalidatePath("/admin/fixes");
  revalidatePath("/", "layout");
  return { success: true, data: { id: data.id } };
}

export async function updateFix(id: string, input: Partial<CreateFixInput>): Promise<ActionResult> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("fixes")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/fixes");
  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

export async function deleteFix(id: string): Promise<ActionResult> {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("fixes").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/fixes");
  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

export async function setFixStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  return updateFix(id, { status });
}
