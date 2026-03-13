"use server";

/**
 * Events Module — Server Actions
 *
 * Mutations for creating, updating, and deleting events.
 * All actions require the caller to be an authenticated admin
 * (enforced by the middleware for `/admin/*` routes).
 *
 * @module modules/events/actions
 */

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";
import { eventSchema } from "./types";
import type { CreateEventInput } from "./types";

/**
 * Creates a new event.
 *
 * @param input - Event data validated against `eventSchema`.
 * @returns ActionResult with the created event's ID on success.
 */
export async function createEvent(
  input: CreateEventInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("events")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to create event" };
  }

  revalidatePath("/admin/events");
  revalidatePath("/", "layout"); // bust public pages cache

  return { success: true, data: { id: data.id } };
}

/**
 * Updates an existing event.
 *
 * @param id    - The event UUID to update.
 * @param input - Partial event data.
 * @returns ActionResult.
 */
export async function updateEvent(
  id: string,
  input: Partial<CreateEventInput>,
): Promise<ActionResult> {
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("events")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/", "layout");

  return { success: true, data: undefined };
}

/**
 * Deletes an event permanently.
 *
 * @param id - The event UUID to delete.
 * @returns ActionResult.
 */
export async function deleteEvent(id: string): Promise<ActionResult> {
  const supabase = await createAdminClient();

  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/events");
  revalidatePath("/", "layout");

  return { success: true, data: undefined };
}

/**
 * Toggles the publication status of an event.
 *
 * @param id     - The event UUID.
 * @param status - Target status.
 * @returns ActionResult.
 */
export async function setEventStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  return updateEvent(id, { status });
}
