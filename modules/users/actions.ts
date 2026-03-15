"use server";
/**
 * Users Module — Server Actions
 * @module modules/users/actions
 */

import { revalidatePath } from "next/cache";
import { normalizePanelPermissions, type PanelPermissions } from "@/lib/admin/permissions";
import { getCurrentAdminContext } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export type CreateAdminInput = {
  username: string;
  email: string;
  password: string;
  permissions: PanelPermissions;
};

async function ensureUsersPermission(): Promise<ActionResult | null> {
  const currentAdmin = await getCurrentAdminContext();

  if (!currentAdmin) return { success: false, error: "unauthorized" };
  if (!currentAdmin.permissions.users) {
    return { success: false, error: "No tienes acceso al panel de administradores." };
  }

  return null;
}

/**
 * Bans a user and records the reason.
 *
 * @param userId    - The profile UUID.
 * @param reason    - Human-readable ban reason.
 */
export async function banUser(userId: string, reason?: string): Promise<ActionResult> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ banned: true, ban_reason: reason ?? null, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/users");
  return { success: true, data: undefined };
}

/**
 * Removes a ban from a user.
 *
 * @param userId - The profile UUID.
 */
export async function unbanUser(userId: string): Promise<ActionResult> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ banned: false, ban_reason: null, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/users");
  return { success: true, data: undefined };
}

export async function createAdminUser(input: CreateAdminInput): Promise<ActionResult> {
  const denied = await ensureUsersPermission();
  if (denied) return denied;

  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const permissions = normalizePanelPermissions(input.permissions);

  if (!username || !email || !password) {
    return { success: false, error: "Completa usuario, email y contraseña." };
  }

  if (password.length < 8) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const supabase = await createAdminClient();

  // Prevent opaque Supabase auth errors caused by profile trigger failures
  // (for example, duplicate username unique constraint on public.profiles).
  const { data: existingUsername, error: usernameCheckError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .limit(1)
    .maybeSingle();

  if (usernameCheckError) {
    return { success: false, error: usernameCheckError.message };
  }

  if (existingUsername) {
    return { success: false, error: "Ese nombre de usuario ya existe." };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "admin",
      username,
      panel_permissions: permissions,
    },
  });

  if (error || !data.user) {
    const message = (error?.message ?? "").toLowerCase();

    if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
      return { success: false, error: "Ese correo ya esta registrado." };
    }

    if (message.includes("database error creating new user")) {
      return {
        success: false,
        error: "Error de base de datos al crear usuario. Revisa que username/email no esten duplicados.",
      };
    }

    return { success: false, error: error?.message ?? "No se pudo crear el administrador." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: data.user.id,
        username,
        email,
        role: "admin",
        panel_permissions: permissions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    return { success: false, error: profileError.message };
  }

  revalidatePath("/admin/users");
  return { success: true, data: undefined };
}

export async function updateAdminPermissions(
  userId: string,
  permissions: PanelPermissions,
): Promise<ActionResult> {
  const denied = await ensureUsersPermission();
  if (denied) return denied;

  const normalized = normalizePanelPermissions(permissions);
  const supabase = await createAdminClient();

  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError || !authUser.user) {
    return { success: false, error: authError?.message ?? "Administrador no encontrado." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      panel_permissions: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .eq("role", "admin");

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  const { error: metadataError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...(authUser.user.user_metadata ?? {}),
      role: "admin",
      panel_permissions: normalized,
    },
  });

  if (metadataError) {
    return { success: false, error: metadataError.message };
  }

  revalidatePath("/admin/users");
  return { success: true, data: undefined };
}

export async function updateAdminPassword(
  userId: string,
  newPassword: string,
): Promise<ActionResult> {
  const denied = await ensureUsersPermission();
  if (denied) return denied;

  const password = newPassword.trim();
  if (password.length < 8) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const supabase = await createAdminClient();

  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError || !authUser.user) {
    return { success: false, error: authError?.message ?? "Administrador no encontrado." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .single();

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Solo puedes cambiar contraseña de usuarios admin." };
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: undefined };
}
