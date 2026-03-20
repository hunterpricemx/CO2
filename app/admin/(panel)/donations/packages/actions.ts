"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DonationPackageRow = {
  id: string;
  name: string;
  price_usd: number;
  cps: number;
  version: number;
  active: boolean;
  sort_order: number;
  bonus_label: string | null;
  image_url: string | null;
  tebex_package_id: string | null;
  game_product_id: number | null;
  created_at: string;
};

export type PackageFormData = {
  name: string;
  price_usd: number;
  cps: number;
  version: number;
  active: boolean;
  sort_order: number;
  bonus_label: string;
  image_url: string;
  tebex_package_id: string;
  game_product_id: number | null;
};

export type ActionResult = { success: boolean; message: string };
export type CloneActionResult = ActionResult & { package?: DonationPackageRow };

export async function getPackages(): Promise<DonationPackageRow[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("donation_packages")
    .select("*")
    .order("sort_order");
  if (error) return [];
  return (data ?? []) as DonationPackageRow[];
}

export async function createPackage(form: PackageFormData): Promise<ActionResult> {
  const supabase = await createAdminClient();
  const { error } = await (supabase as any).from("donation_packages").insert({
    name:            form.name.trim(),
    price_usd:       form.price_usd,
    cps:             form.cps,
    version:         form.version,
    active:          form.active,
    sort_order:      form.sort_order,
    bonus_label:     form.bonus_label.trim() || null,
    image_url:       form.image_url.trim() || null,
    tebex_package_id: form.tebex_package_id.trim() || null,
    game_product_id: form.game_product_id || null,
  });
  if (error) return { success: false, message: error.message };
  revalidatePath("/admin/donations/packages");
  return { success: true, message: "Paquete creado" };
}

export async function updatePackage(id: string, form: PackageFormData): Promise<ActionResult> {
  const supabase = await createAdminClient();
  const { error } = await (supabase as any).from("donation_packages").update({
    name:            form.name.trim(),
    price_usd:       form.price_usd,
    cps:             form.cps,
    version:         form.version,
    active:          form.active,
    sort_order:      form.sort_order,
    bonus_label:     form.bonus_label.trim() || null,
    image_url:       form.image_url.trim() || null,
    tebex_package_id: form.tebex_package_id.trim() || null,
    game_product_id: form.game_product_id || null,
  }).eq("id", id);
  if (error) return { success: false, message: error.message };
  revalidatePath("/admin/donations/packages");
  return { success: true, message: "Paquete actualizado" };
}

export async function togglePackage(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await createAdminClient();
  const { error } = await (supabase as any).from("donation_packages")
    .update({ active })
    .eq("id", id);
  if (error) return { success: false, message: error.message };
  revalidatePath("/admin/donations/packages");
  return { success: true, message: active ? "Paquete activado" : "Paquete desactivado" };
}

export async function deletePackage(id: string): Promise<ActionResult> {
  const supabase = await createAdminClient();
  const { error } = await (supabase as any).from("donation_packages")
    .delete()
    .eq("id", id);
  if (error) return { success: false, message: error.message };
  revalidatePath("/admin/donations/packages");
  return { success: true, message: "Paquete eliminado" };
}

export async function clonePackage(id: string): Promise<CloneActionResult> {
  const supabase = await createAdminClient();

  const { data: original, error: findError } = await (supabase as any)
    .from("donation_packages")
    .select("*")
    .eq("id", id)
    .single();

  if (findError || !original) {
    return { success: false, message: findError?.message ?? "No se encontró el paquete a clonar" };
  }

  const cloneName = `${original.name} (Copia)`;
  const payload = {
    name: cloneName,
    price_usd: original.price_usd,
    cps: original.cps,
    version: original.version,
    active: original.active,
    sort_order: (original.sort_order ?? 0) + 1,
    bonus_label: original.bonus_label,
    image_url: original.image_url,
    tebex_package_id: null,
    game_product_id: null,
  };

  const { data: created, error: insertError } = await (supabase as any)
    .from("donation_packages")
    .insert(payload)
    .select("*")
    .single();

  if (insertError || !created) {
    return { success: false, message: insertError?.message ?? "No se pudo clonar el paquete" };
  }

  revalidatePath("/admin/donations/packages");
  return {
    success: true,
    message: "Paquete clonado",
    package: created as DonationPackageRow,
  };
}

export type UploadResult = ActionResult & { url?: string };

export async function uploadPackageImage(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { success: false, message: "No se proporcionó archivo" };

  const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
  if (!ALLOWED.includes(file.type)) {
    return { success: false, message: "Solo se permiten imágenes JPG, PNG o WebP" };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { success: false, message: "La imagen no puede superar 2 MB" };
  }

  const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
  const path = `donate-packages/${Date.now()}.${ext}`;

  const supabase = await createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from("conquer-media")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

  if (error) return { success: false, message: error.message };

  const { data: { publicUrl } } = supabase.storage
    .from("conquer-media")
    .getPublicUrl(path);

  return { success: true, message: "Imagen subida", url: publicUrl };
}
