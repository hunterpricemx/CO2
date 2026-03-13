"use server";
/**
 * Guides Module — Server Actions
 * @module modules/guides/actions
 */

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";
import { guideSchema, type CreateGuideInput } from "./types";

export async function createGuide(input: CreateGuideInput): Promise<ActionResult<{ id: string }>> {
  const parsed = guideSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const supabase = await createAdminClient();
  const { data, error } = await supabase.from("guides").insert(parsed.data).select("id").single();

  if (error || !data) return { success: false, error: error?.message ?? "Failed to create guide" };

  revalidatePath("/admin/guides");
  revalidatePath("/", "layout");
  return { success: true, data: { id: data.id } };
}

export async function updateGuide(id: string, input: Partial<CreateGuideInput>): Promise<ActionResult> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("guides")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/guides");
  revalidatePath(`/admin/guides/${id}`);
  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

export async function deleteGuide(id: string): Promise<ActionResult> {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("guides").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/guides");
  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

export async function setGuideStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  return updateGuide(id, { status });
}
