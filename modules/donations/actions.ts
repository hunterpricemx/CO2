"use server";
/**
 * Donations Module — Server Actions
 * @module modules/donations/actions
 */

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";
import { donationSchema, type CreateDonationInput } from "./types";

export async function createDonation(input: CreateDonationInput): Promise<ActionResult<{ id: string }>> {
  const parsed = donationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const supabase = await createAdminClient();
  const { data, error } = await supabase.from("donations").insert(parsed.data).select("id").single();

  if (error || !data) return { success: false, error: error?.message ?? "Error" };
  revalidatePath("/admin/donations");
  return { success: true, data: { id: data.id } };
}

export async function updateDonationStatus(
  id: string,
  status: "pending" | "completed" | "refunded",
): Promise<ActionResult> {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("donations").update({ status }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/donations");
  return { success: true, data: undefined };
}
