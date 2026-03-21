"use server";

/**
 * Auth Module — Server Actions
 *
 * Two separate auth systems:
 *
 * 1. **Game auth** (gameLoginAction, gameRegisterAction, gameLogoutAction):
 *    Authenticates against the remote MariaDB `accounts` table using the
 *    SHA3-512 + SHA3-256 password algorithm. Session stored in a signed
 *    httpOnly cookie (lib/session.ts).
 *
 * 2. **Admin auth** (loginAction, registerAction, logoutAction):
 *    Uses Supabase Auth. Only used by the admin panel.
 *
 * @module modules/auth/actions
 */

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getGameDb, type AccountRow } from "@/lib/game-db";
import { setGameSession, clearGameSession, getGameSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendResetPasswordEmail } from "@/lib/mailer";
import type { ActionResult } from "@/types";
import type { GameLoginInput, GameRecoverPasswordConfirmInput, GameRecoverPasswordRequestInput, GameRegisterInput, LoginInput, RegisterInput } from "./types";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

// ─────────────────────────────────────────────────────────────────────────────
// Password helpers (mirrors PHP functions.php encryptPassword / verifyPassword)
// ─────────────────────────────────────────────────────────────────────────────

function hashGamePassword(password: string, salt: string): string {
  const h1 = createHash("sha3-512").update(password + salt).digest("hex");
  return createHash("sha3-256").update(h1 + password + salt).digest("hex");
}

async function verifyRecaptcha(captchaToken: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret || !captchaToken) {
    return false;
  }

  const verifyRes = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${captchaToken}`,
    { method: "POST" },
  );
  const verifyData = await verifyRes.json() as { success: boolean };

  return verifyData.success;
}

function getLocalePrefix(locale: string): string {
  return locale === "es" ? "" : `/${locale}`;
}

function isRecoveryDebugEnabled(): boolean {
  return String(process.env.AUTH_RECOVERY_DEBUG ?? process.env.SMTP_DEBUG ?? "false").toLowerCase() === "true";
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "invalid-email";
  return `${local.slice(0, 2)}***@${domain}`;
}

function recoveryDebug(event: string, data: Record<string, unknown>) {
  if (!isRecoveryDebugEnabled()) return;
  console.info(`[RECOVERY_DEBUG] ${event}`, data);
}

async function getBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (configured && (!process.env.VERCEL || !configured.includes("localhost"))) {
    return configured;
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME AUTH — MariaDB accounts table
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authenticates a game player against the MariaDB accounts table.
 * Sets a signed httpOnly session cookie on success.
 */
export async function gameLoginAction(input: GameLoginInput): Promise<ActionResult> {
  const username = input.username.trim();
  const { password, captchaToken, version } = input;

  if (!username || !password) {
    return { success: false, error: "invalid_credentials" };
  }

  if (!(await verifyRecaptcha(captchaToken))) {
    return { success: false, error: "captcha_error" };
  }

  const { conn, config } = await getGameDb(version);
  try {
    const [rows] = await conn.execute<(AccountRow & RowDataPacket)[]>(
      `SELECT EntityID, Username, Password, Salt, Email, BannedID, State FROM \`${config.table_accounts}\` WHERE Username = ? LIMIT 1`,
      [username],
    );

    const account = rows[0];
    if (!account) {
      return { success: false, error: "invalid_credentials" };
    }

    // Verify password using SHA3-512 + SHA3-256 algorithm
    const computed = hashGamePassword(password, account.Salt);
    if (computed !== account.Password) {
      return { success: false, error: "invalid_credentials" };
    }

    // BannedID=2 means active; anything else blocks login
    if (account.BannedID !== 2) {
      return { success: false, error: "account_banned" };
    }

    await setGameSession({
      uid: account.EntityID,
      username: account.Username,
      email: account.Email,
      version,
    });

    return { success: true, data: undefined };
  } finally {
    await conn.end();
  }
}

/**
 * Registers a new game account in the MariaDB accounts table.
 * Auto-logs in the player by setting the session cookie on success.
 */
export async function gameRegisterAction(input: GameRegisterInput): Promise<ActionResult> {
  const username = input.username.trim();
  const { email, password, captchaToken, version } = input;

  // ── Verify reCAPTCHA server-side ──────────────────────────────────────────
  if (!(await verifyRecaptcha(captchaToken))) {
    return { success: false, error: "captcha_error" };
  }

  if (password.length < 6 || password.length > 16) {
    return { success: false, error: "weak_password" };
  }

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    null;

  const { conn, config } = await getGameDb(version);
  try {
    // Check username uniqueness
    const [uRows] = await conn.execute<RowDataPacket[]>(
      `SELECT EntityID FROM \`${config.table_accounts}\` WHERE Username = ? LIMIT 1`,
      [username],
    );
    if (uRows.length > 0) {
      return { success: false, error: "username_taken" };
    }

    // Hash password using the same algorithm as the game server
    const salt = randomBytes(16).toString("hex"); // 32-char hex
    const hash = hashGamePassword(password, salt);

    // Insert new account (BannedID=2 → active, State=0 → normal)
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO \`${config.table_accounts}\` (Username, Password, Salt, Email, IP, BannedID, State) VALUES (?, ?, ?, ?, ?, 2, 0)`,
      [username, hash, salt, email, ip],
    );

    const insertId = (result as ResultSetHeader).insertId;
    if (!insertId) {
      return { success: false, error: "unknown_error" };
    }

    await setGameSession({ uid: insertId, username, email, version });

    return { success: true, data: undefined };
  } finally {
    await conn.end();
  }
}

/**
 * Changes the password for the currently logged-in game player.
 */
export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  version: 1 | 2;
}): Promise<ActionResult> {
  const session = await getGameSession();
  if (!session) return { success: false, error: "unauthorized" };

  const { currentPassword, newPassword, version } = input;

  if (newPassword.length < 6 || newPassword.length > 16 || !/^[a-zA-Z0-9]+$/.test(newPassword)) {
    return { success: false, error: "weak_password" };
  }

  const { conn, config } = await getGameDb(version);
  try {
    const [rows] = await conn.execute<(AccountRow & RowDataPacket)[]>(
      `SELECT Password, Salt FROM \`${config.table_accounts}\` WHERE EntityID = ? LIMIT 1`,
      [session.uid],
    );
    if (rows.length === 0) return { success: false, error: "invalid_credentials" };

    const account = rows[0];
    if (hashGamePassword(currentPassword, account.Salt) !== account.Password) {
      return { success: false, error: "wrong_password" };
    }

    const newSalt = randomBytes(16).toString("hex");
    const newHash = hashGamePassword(newPassword, newSalt);

    await conn.execute(
      `UPDATE \`${config.table_accounts}\` SET Password = ?, Salt = ? WHERE EntityID = ?`,
      [newHash, newSalt, session.uid],
    );

    return { success: true, data: undefined };
  } finally {
    await conn.end();
  }
}

/**
 * Changes the email for the currently logged-in game player.
 */
export async function changeEmailAction(input: {
  currentPassword: string;
  currentEmail: string;
  newEmail: string;
  version: 1 | 2;
}): Promise<ActionResult> {
  const session = await getGameSession();
  if (!session) return { success: false, error: "unauthorized" };

  // Rate limit: max 5 attempts per user per 15 minutes
  const rl = checkRateLimit("change_email", String(session.uid), { max: 5, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) return { success: false, error: "rate_limited" };

  const { currentPassword, currentEmail, newEmail, version } = input;

  // Verify the user knows their current email
  if (currentEmail.trim().toLowerCase() !== (session.email ?? "").trim().toLowerCase()) {
    return { success: false, error: "wrong_current_email" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return { success: false, error: "invalid_email" };
  }

  const { conn, config } = await getGameDb(version);
  try {
    // Verify current password
    const [rows] = await conn.execute<(AccountRow & RowDataPacket)[]>(
      `SELECT Password, Salt FROM \`${config.table_accounts}\` WHERE EntityID = ? LIMIT 1`,
      [session.uid],
    );
    if (rows.length === 0) return { success: false, error: "invalid_credentials" };

    const account = rows[0];
    if (hashGamePassword(currentPassword, account.Salt) !== account.Password) {
      return { success: false, error: "wrong_password" };
    }

    await conn.execute(
      `UPDATE \`${config.table_accounts}\` SET Email = ? WHERE EntityID = ?`,
      [newEmail, session.uid],
    );

    // Update session with new email
    await setGameSession({ uid: session.uid, username: session.username, email: newEmail, version: session.version ?? version });

    return { success: true, data: undefined };
  } finally {
    await conn.end();
  }
}

/**
 * Recovers a game account password by validating username + email.
 */
export async function requestRecoverGamePasswordAction(input: GameRecoverPasswordRequestInput): Promise<ActionResult> {
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  const { captchaToken, version, locale } = input;

  if (!(await verifyRecaptcha(captchaToken))) {
    return { success: false, error: "captcha_error" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!username || !emailRegex.test(email)) {
    return { success: false, error: "recovery_data_invalid" };
  }

  const requestHeaders = await headers();
  const ipAddress =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "unknown";
  const rl = checkRateLimit("recover_password", `${username}:${ipAddress}`, { max: 5, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return { success: false, error: "rate_limited" };
  }

  recoveryDebug("INBOUND_RECOVER_REQUEST", {
    username,
    email: maskEmail(email),
    version,
    locale,
    ipAddress,
  });

  const { conn, config } = await getGameDb(version);
  try {
    const [rows] = await conn.execute<(AccountRow & RowDataPacket)[]>(
      `SELECT EntityID, Email FROM \`${config.table_accounts}\` WHERE Username = ? LIMIT 1`,
      [username],
    );

    const account = rows[0];
    if (!account || String(account.Email ?? "").trim().toLowerCase() !== email) {
      recoveryDebug("INBOUND_RECOVER_NO_MATCH", {
        username,
        email: maskEmail(email),
        version,
      });
      // Generic success to prevent account enumeration.
      return { success: true, data: undefined };
    }

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
        requested_ip: ipAddress,
        requested_user_agent: requestHeaders.get("user-agent") ?? null,
      });

    if (insertError) {
      recoveryDebug("OUTBOUND_RECOVER_TOKEN_INSERT_FAILED", {
        username,
        email: maskEmail(email),
        version,
        message: insertError.message,
      });
      return { success: false, error: "unknown_error" };
    }

    const base = await getBaseUrl();
    const localePath = getLocalePrefix(locale);
    const resetUrl = `${base}${localePath}/${version === 1 ? "1.0" : "2.0"}/reset-password?token=${encodeURIComponent(rawToken)}`;

    try {
      await sendResetPasswordEmail({
        to: email,
        username,
        resetUrl,
        expiresMinutes: 30,
        version,
      });
    } catch (emailError) {
      recoveryDebug("OUTBOUND_RECOVER_EMAIL_FAILED", {
        username,
        email: maskEmail(email),
        version,
        message: emailError instanceof Error ? emailError.message : String(emailError),
      });
      return { success: false, error: "unknown_error" };
    }

    recoveryDebug("OUTBOUND_RECOVER_EMAIL_SENT", {
      username,
      email: maskEmail(email),
      version,
    });

    return { success: true, data: undefined };
  } finally {
    await conn.end();
  }
}

export async function confirmRecoverGamePasswordAction(input: GameRecoverPasswordConfirmInput): Promise<ActionResult> {
  const token = input.token.trim();
  const { newPassword, version } = input;

  if (!token) return { success: false, error: "invalid_token" };

  if (newPassword.length < 6 || newPassword.length > 16) {
    return { success: false, error: "weak_password" };
  }
  if (!/^[a-zA-Z0-9]+$/.test(newPassword)) {
    return { success: false, error: "password_invalid" };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  recoveryDebug("INBOUND_RESET_CONFIRM", {
    version,
    tokenHashPrefix: tokenHash.slice(0, 8),
  });
  const adminClient = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tokenRow, error: tokenError } = await (adminClient as any)
    .from("password_reset_tokens")
    .select("id, username, email, version, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .single();

  if (tokenError || !tokenRow) {
    recoveryDebug("INBOUND_RESET_INVALID_TOKEN", {
      version,
      tokenHashPrefix: tokenHash.slice(0, 8),
      message: tokenError?.message ?? "token_row_not_found",
    });
    return { success: false, error: "invalid_token" };
  }

  if (Number(tokenRow.version) !== version) {
    return { success: false, error: "invalid_token" };
  }

  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return { success: false, error: "token_expired" };
  }

  const { conn, config } = await getGameDb(version);
  try {
    const [rows] = await conn.execute<(AccountRow & RowDataPacket)[]>(
      `SELECT EntityID, Email FROM \`${config.table_accounts}\` WHERE Username = ? LIMIT 1`,
      [String(tokenRow.username)],
    );

    const account = rows[0];
    if (!account || String(account.Email ?? "").trim().toLowerCase() !== String(tokenRow.email).trim().toLowerCase()) {
      return { success: false, error: "invalid_token" };
    }

    const newSalt = randomBytes(16).toString("hex");
    const newHash = hashGamePassword(newPassword, newSalt);
    await conn.execute(
      `UPDATE \`${config.table_accounts}\` SET Password = ?, Salt = ? WHERE EntityID = ?`,
      [newHash, newSalt, account.EntityID],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    recoveryDebug("INBOUND_RESET_SUCCESS", {
      username: String(tokenRow.username),
      email: maskEmail(String(tokenRow.email)),
      version,
      tokenId: tokenRow.id,
    });

    return { success: true, data: undefined };
  } finally {
    await conn.end();
  }
}

/**
 * Signs the current game player out and clears the session cookie.
 */
export async function gameLogoutAction(): Promise<void> {
  await clearGameSession();
  revalidatePath("/", "layout");
  redirect("/");
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN AUTH — Supabase (used only by /admin routes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authenticates a user with email and password.
 *
 * On success, Supabase sets the session cookie automatically.
 * The caller is responsible for redirecting after the action.
 *
 * @param input - Login credentials (email + password).
 * @returns ActionResult — success or error message.
 */
export async function loginAction(
  input: LoginInput,
): Promise<ActionResult<{ role: string }>> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    return { success: false, error: "invalid_credentials" };
  }

  const role = (data.user.user_metadata?.role as string) ?? "player";
  return { success: true, data: { role } };
}

/**
 * Registers a new player account.
 *
 * Creates a Supabase Auth user and a corresponding row in `profiles`
 * with `role: "player"`.
 *
 * @param input - Registration data (username, email, password).
 * @returns ActionResult — success or error message.
 */
export async function registerAction(
  input: RegisterInput,
): Promise<ActionResult> {
  if (input.password.length < 8) {
    return { success: false, error: "weak_password" };
  }

  const supabase = await createClient();

  // Create the auth user with role metadata.
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        role: "player",
        username: input.username,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { success: false, error: "email_taken" };
    }
    return { success: false, error: error.message };
  }

  if (!data.user) {
    return { success: false, error: "unknown_error" };
  }

  // Insert the profile row.
  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    username: input.username,
    email: input.email,
    role: "player",
  });

  if (profileError) {
    // If username is taken (unique constraint), surface that.
    if (profileError.code === "23505") {
      return { success: false, error: "username_taken" };
    }
    return { success: false, error: profileError.message };
  }

  return { success: true, data: undefined };
}

/**
 * Signs the current user out and clears the session cookie.
 * Redirects to the home page after logout.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
