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
import { getGameDb, type AccountRow } from "@/lib/game-db";
import { setGameSession, clearGameSession, getGameSession } from "@/lib/session";
import type { ActionResult } from "@/types";
import type { GameLoginInput, GameRegisterInput, LoginInput, RegisterInput } from "./types";
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

    // Check email uniqueness
    const [eRows] = await conn.execute<RowDataPacket[]>(
      `SELECT EntityID FROM \`${config.table_accounts}\` WHERE Email = ? LIMIT 1`,
      [email],
    );
    if (eRows.length > 0) {
      return { success: false, error: "email_taken" };
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
  newEmail: string;
  version: 1 | 2;
}): Promise<ActionResult> {
  const session = await getGameSession();
  if (!session) return { success: false, error: "unauthorized" };

  const { currentPassword, newEmail, version } = input;

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

    // Check email uniqueness
    const [emailRows] = await conn.execute<RowDataPacket[]>(
      `SELECT EntityID FROM \`${config.table_accounts}\` WHERE Email = ? AND EntityID != ? LIMIT 1`,
      [newEmail, session.uid],
    );
    if (emailRows.length > 0) return { success: false, error: "email_taken" };

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
