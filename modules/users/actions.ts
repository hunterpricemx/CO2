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

const SUPER_ADMIN_EMAIL = "mariano@hunterprice.mx";

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
  if (username.length < 3) {
    return { success: false, error: "El usuario debe tener al menos 3 caracteres." };
  }
  if (!/^[\w.\-@+ ]{3,32}$/.test(username)) {
    return { success: false, error: "Usuario solo letras, números, .-_@+ y espacios (3-32 chars)." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Email inválido." };
  }
  if (password.length < 8) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const supabase = await createAdminClient();

  // Pre-checks to avoid opaque trigger errors.
  const [{ data: existingUsername }, { data: existingEmail }] = await Promise.all([
    supabase.from("profiles").select("id").eq("username", username).limit(1).maybeSingle(),
    supabase.from("profiles").select("id").eq("email", email).limit(1).maybeSingle(),
  ]);
  if (existingUsername) return { success: false, error: "Ese nombre de usuario ya existe." };
  if (existingEmail) return { success: false, error: "Ese correo ya está en uso." };

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "admin", username, panel_permissions: permissions },
  });

  if (createErr || !created.user) {
    console.error("[createAdminUser] auth.admin.createUser failed:", createErr);
    const msg = (createErr?.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return { success: false, error: "Ese correo ya está registrado en Supabase Auth." };
    }
    if (msg.includes("database error creating new user")) {
      return {
        success: false,
        error: "Error de base de datos al crear usuario. Posible: username/email duplicado, trigger profile fallando, o columna NOT NULL sin default. Revisa logs server.",
      };
    }
    if (msg.includes("password")) {
      return { success: false, error: `Contraseña rechazada por Supabase: ${createErr?.message}` };
    }
    return { success: false, error: createErr?.message ?? "No se pudo crear el administrador." };
  }

  // Force-write the profile row (covers both: no trigger, and trigger that wrote
  // a default 'player' role row we need to override).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await (supabase as any)
    .from("profiles")
    .upsert(
      {
        id: created.user.id,
        username,
        email,
        role: "admin",
        panel_permissions: permissions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (profileError) {
    console.error("[createAdminUser] profile upsert failed, rolling back auth user:", profileError);
    await supabase.auth.admin.deleteUser(created.user.id).catch(rbErr => {
      console.error("[createAdminUser] rollback deleteUser also failed:", rbErr);
    });
    return { success: false, error: `Error guardando profile: ${profileError.message}` };
  }

  // Post-create verification: read back the profile to confirm role/permissions saved.
  const { data: verify } = await supabase
    .from("profiles").select("role, username, email").eq("id", created.user.id).single();
  if (!verify || verify.role !== "admin") {
    console.error("[createAdminUser] post-verify failed:", verify);
    return {
      success: false,
      error: "El usuario fue creado pero el profile no quedó como admin. Revisa el trigger en profiles.",
    };
  }

  revalidatePath("/admin/users");
  return { success: true, data: undefined };
}

/**
 * Deletes an admin user from Supabase auth (cascades to profile).
 * Restrictions:
 *   - Only the super admin can delete other admins.
 *   - Cannot delete yourself.
 *   - Cannot delete the super admin (mariano).
 */
export async function deleteAdminUser(userId: string): Promise<ActionResult> {
  const denied = await ensureUsersPermission();
  if (denied) return denied;

  const currentAdmin = await getCurrentAdminContext();
  if (!currentAdmin) return { success: false, error: "unauthorized" };

  const isSuperAdmin = currentAdmin.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
  if (!isSuperAdmin) {
    return { success: false, error: "Solo el super admin puede eliminar administradores." };
  }
  if (currentAdmin.id === userId) {
    return { success: false, error: "No puedes eliminarte a ti mismo." };
  }

  const supabase = await createAdminClient();

  const { data: target } = await supabase
    .from("profiles").select("id, username, email, role").eq("id", userId).single();
  if (!target) return { success: false, error: "Administrador no encontrado." };
  if (target.role !== "admin") {
    return { success: false, error: "Esta cuenta no es un administrador." };
  }
  if (target.email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL) {
    return { success: false, error: "No se puede eliminar al super admin." };
  }

  const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId);
  if (deleteErr) {
    console.error("[deleteAdminUser] auth.admin.deleteUser failed:", deleteErr);
    return { success: false, error: `Supabase Auth no pudo borrar: ${deleteErr.message}` };
  }

  // Best-effort: ensure profile row is gone (Supabase usually cascades via FK,
  // but if RLS or a missing FK leaves it behind, drop it explicitly).
  await supabase.from("profiles").delete().eq("id", userId);

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

  const currentAdmin = await getCurrentAdminContext();
  if (!currentAdmin) return { success: false, error: "unauthorized" };

  const isSuperAdmin =
    currentAdmin.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
  const isSelfUpdate = currentAdmin.id === userId;

  if (!isSuperAdmin && !isSelfUpdate) {
    return {
      success: false,
      error: "Solo puedes cambiar tu propia contraseña.",
    };
  }

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
