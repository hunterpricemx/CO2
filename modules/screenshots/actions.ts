"use server";

/**
 * Screenshots Module — Server Actions (admin CRUD + public view increment).
 */

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireAdminPanelAccess, getCurrentAdminContext } from "@/lib/admin/auth";
import type { ActionResult } from "@/types";
import type { ScreenshotStatus } from "./types";
import { ScreenshotInputSchema, CategoryInputSchema } from "./schemas";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/** Public-safe util that admins use to autogenerate slugs from titles. */
export async function suggestScreenshotSlug(title: string): Promise<string> {
  return slugify(title) || `shot-${Date.now()}`;
}

export async function createScreenshot(input: unknown): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdminPanelAccess("screenshots");
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "unauthorized" };

  const parsed = ScreenshotInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos: " + parsed.error.issues.map(i => i.message).join(", ") };
  }
  const data = parsed.data;

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("screenshots")
    .insert({
      slug:           data.slug,
      version:        data.version,
      category_id:    data.category_id,
      title_es:       data.title_es,
      title_en:       data.title_en  || data.title_es,
      title_pt:       data.title_pt  || data.title_es,
      description_es: data.description_es ?? null,
      description_en: data.description_en ?? null,
      description_pt: data.description_pt ?? null,
      image_url:      data.image_url,
      thumbnail_url:  data.thumbnail_url ?? null,
      uploaded_by:    admin.id,
      uploader_name:  admin.username,
      status:         data.status,
      tags:           data.tags,
    })
    .select("id, slug")
    .single();

  if (error || !row) {
    if (error?.code === "23505") return { success: false, error: "Ya existe un screenshot con ese slug." };
    return { success: false, error: error?.message ?? "No se pudo guardar el screenshot." };
  }

  revalidatePath("/admin/screenshots");
  revalidatePath("/[locale]/[version]/screenshots", "page");
  return { success: true, data: { id: row.id as string, slug: row.slug as string } };
}

export async function updateScreenshot(id: string, input: unknown): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdminPanelAccess("screenshots");

  const parsed = ScreenshotInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos: " + parsed.error.issues.map(i => i.message).join(", ") };
  }
  const data = parsed.data;

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("screenshots")
    .update({
      slug:           data.slug,
      version:        data.version,
      category_id:    data.category_id,
      title_es:       data.title_es,
      title_en:       data.title_en  || data.title_es,
      title_pt:       data.title_pt  || data.title_es,
      description_es: data.description_es ?? null,
      description_en: data.description_en ?? null,
      description_pt: data.description_pt ?? null,
      image_url:      data.image_url,
      thumbnail_url:  data.thumbnail_url ?? null,
      status:         data.status,
      tags:           data.tags,
      updated_at:     new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, slug")
    .single();

  if (error || !row) {
    if (error?.code === "23505") return { success: false, error: "Ya existe un screenshot con ese slug." };
    return { success: false, error: error?.message ?? "No se pudo actualizar el screenshot." };
  }

  revalidatePath("/admin/screenshots");
  revalidatePath(`/admin/screenshots/edit/${id}`);
  revalidatePath("/[locale]/[version]/screenshots", "page");
  revalidatePath(`/[locale]/[version]/screenshots/${row.slug}`, "page");
  return { success: true, data: { id: row.id as string, slug: row.slug as string } };
}

export async function deleteScreenshot(id: string): Promise<ActionResult> {
  await requireAdminPanelAccess("screenshots");
  const supabase = await createAdminClient();
  const { error } = await supabase.from("screenshots").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/screenshots");
  return { success: true, data: undefined };
}

export async function setScreenshotStatus(id: string, status: ScreenshotStatus): Promise<ActionResult> {
  await requireAdminPanelAccess("screenshots");
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("screenshots")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/screenshots");
  return { success: true, data: undefined };
}

/** Public action — anyone can call. Increments view_count via SECURITY DEFINER RPC. */
export async function incrementScreenshotView(id: string): Promise<void> {
  if (!id) return;
  const supabase = await createClient();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc("increment_screenshot_view", { p_id: id });
  } catch {
    /* swallow — view counting is best-effort */
  }
}

// ─── Screenshot Categories CRUD ────────────────────────────────

export async function createScreenshotCategory(input: unknown): Promise<ActionResult> {
  await requireAdminPanelAccess("screenshots");
  const parsed = CategoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  }
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("screenshot_categories").insert(parsed.data);
  if (error) {
    if (error.code === "23505") return { success: false, error: "Ya existe una categoría con ese slug." };
    return { success: false, error: error.message };
  }
  revalidatePath("/admin/screenshot-categories");
  return { success: true, data: undefined };
}

export async function updateScreenshotCategory(id: string, input: unknown): Promise<ActionResult> {
  await requireAdminPanelAccess("screenshots");
  const parsed = CategoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  }
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("screenshot_categories").update(parsed.data).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/screenshot-categories");
  return { success: true, data: undefined };
}

export async function deleteScreenshotCategory(id: string): Promise<ActionResult> {
  await requireAdminPanelAccess("screenshots");
  const supabase = await createAdminClient();
  const { error } = await supabase.from("screenshot_categories").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/screenshot-categories");
  return { success: true, data: undefined };
}

// Note: NO type, const, or non-function exports here — files with "use server"
// can only export async functions. Schemas/types/constants live in
// ./schemas and ./types, re-exported via ./index.
