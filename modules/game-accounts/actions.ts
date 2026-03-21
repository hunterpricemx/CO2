"use server";
/**
 * Game Accounts Module — Server Actions
 *
 * Admin-only actions: send recovery link and change email for game accounts.
 * Every action is logged to Supabase `account_action_logs`.
 */

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { getGameDb } from "@/lib/game-db";
import { createAdminClient } from "@/lib/supabase/server";
import { sendResetPasswordEmail } from "@/lib/mailer";
import { logAccountAction } from "@/lib/account-logger";
import { getCurrentAdminContext } from "@/lib/admin/auth";
import type { ActionResult } from "@/types";
import type { AccountActionLog } from "./types";
import type { RowDataPacket } from "mysql2";

async function ensureUsersPermission(): Promise<ActionResult | null> {
  const admin = await getCurrentAdminContext();
  if (!admin) return { success: false, error: "unauthorized" };
  if (!admin.permissions.users) {
    return { success: false, error: "No tienes acceso al panel de cuentas." };
  }
  return null;
}

async function getBaseUrl(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && !configured.includes("localhost")) return configured;
  return `${proto}://${host}`;
}

/**
 * Admin: sends a password recovery email for a game account.
 * Does NOT require the user's current password.
 */
export async function adminSendRecoveryLinkAction(input: {
  username: string;
  email: string;
  version: 1 | 2;
  locale: string;
}): Promise<ActionResult> {
  const denied = await ensureUsersPermission();
  if (denied) return denied;

  const admin = await getCurrentAdminContext();

  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  const { version, locale } = input;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!username || !emailRegex.test(email)) {
    return { success: false, error: "Datos de cuenta inválidos." };
  }

  // Verify account exists with that email
  const { conn, config } = await getGameDb(version);
  let entityId: number | null = null;
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT EntityID, Email FROM \`${config.table_accounts}\` WHERE Username = ? LIMIT 1`,
      [username],
    );
    const account = rows[0] as { EntityID: number; Email: string } | undefined;
    if (!account) {
      return { success: false, error: "Cuenta no encontrada." };
    }
    if (account.Email.trim().toLowerCase() !== email) {
      return { success: false, error: "El correo no coincide con el registrado en la cuenta." };
    }
    entityId = account.EntityID;
  } finally {
    await conn.end();
  }

  // Generate token
  const rawToken = randomBytes(48).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const adminClient = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (adminClient as any)
    .from("password_reset_tokens")
    .insert({
      username,
      email,
      version,
      token_hash: tokenHash,
      expires_at: expiresAt,
      requested_ip: "admin-panel",
      requested_user_agent: "admin-panel",
    });

  if (insertError) {
    return { success: false, error: "Error generando token de recuperación." };
  }

  const base = await getBaseUrl();
  const localePath = locale === "es" ? "" : `/${locale}`;
  const versionPath = version === 1 ? "1.0" : "2.0";
  const resetUrl = `${base}${localePath}/${versionPath}/reset-password?token=${encodeURIComponent(rawToken)}`;

  try {
    await sendResetPasswordEmail({ to: email, username, resetUrl, expiresMinutes: 30, version });
  } catch (e) {
    return { success: false, error: `Error enviando correo: ${e instanceof Error ? e.message : String(e)}` };
  }

  // Log action
  await logAccountAction({
    admin_id: admin?.id ?? null,
    admin_username: admin?.username ?? null,
    action: "recovery_sent",
    username,
    version,
    metadata: { email, entityId },
  });

  return { success: true, data: undefined };
}

/**
 * Admin: fetch action logs for a specific username (usable from client components).
 */
export async function getAccountActionLogsAction(username: string): Promise<AccountActionLog[]> {
  const admin = await getCurrentAdminContext();
  if (!admin) return [];
  const { getAccountActionLogs } = await import("./queries");
  return getAccountActionLogs(username);
}

/**
 * Admin: changes the email of a game account in MariaDB.
 */
export async function adminChangeGameEmailAction(input: {
  username: string;
  newEmail: string;
  version: 1 | 2;
}): Promise<ActionResult> {
  const denied = await ensureUsersPermission();
  if (denied) return denied;

  const admin = await getCurrentAdminContext();

  const username = input.username.trim();
  const newEmail = input.newEmail.trim().toLowerCase();
  const { version } = input;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!username || !emailRegex.test(newEmail)) {
    return { success: false, error: "Correo inválido." };
  }

  const { conn, config } = await getGameDb(version);
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT EntityID, Email FROM \`${config.table_accounts}\` WHERE Username = ? LIMIT 1`,
      [username],
    );
    const account = rows[0] as { EntityID: number; Email: string } | undefined;
    if (!account) {
      return { success: false, error: "Cuenta no encontrada." };
    }

    const oldEmail = account.Email;
    if (oldEmail.trim().toLowerCase() === newEmail) {
      return { success: false, error: "El nuevo correo es igual al actual." };
    }

    await conn.execute(
      `UPDATE \`${config.table_accounts}\` SET Email = ? WHERE Username = ? LIMIT 1`,
      [newEmail, username],
    );

    // Log action
    await logAccountAction({
      admin_id: admin?.id ?? null,
      admin_username: admin?.username ?? null,
      action: "email_changed",
      username,
      version,
      before_value: oldEmail,
      after_value: newEmail,
    });

    return { success: true, data: undefined };
  } finally {
    await conn.end();
  }
}
