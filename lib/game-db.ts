/**
 * Game Database — per-request MySQL2 connection
 *
 * Credentials are stored in the Supabase `server_config` table and managed
 * from the Admin → Game Server page. No .env vars needed for the DB itself.
 *
 * Usage:
 *   const { conn, config } = await getGameDb();
 *   try { ... } finally { await conn.end(); }
 *
 * @module lib/game-db
 */

import mysql from "mysql2/promise";
import { createAdminClient } from "@/lib/supabase/server";

export interface ServerConfig {
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_pass: string;
  table_accounts: string;
  table_characters: string;
  table_payments: string;
}

export interface PaymentConfig {
  stripe_enabled:    boolean;
  stripe_mode:       "test" | "live";
  stripe_pk_test:    string;
  stripe_pk_live:    string;
  tebex_enabled:     boolean;
  tebex_webstore_id: string;
  // Secret keys are intentionally omitted — use only server-side via getPaymentSecrets()
}

/** Returns only public (client-safe) payment config fields. */
export async function getPublicPaymentConfig(): Promise<PaymentConfig | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("server_config")
    .select("stripe_enabled, stripe_mode, stripe_pk_test, stripe_pk_live, tebex_enabled, tebex_webstore_id")
    .eq("id", 1)
    .single();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return {
    stripe_enabled:    d.stripe_enabled    ?? false,
    stripe_mode:       d.stripe_mode       ?? "test",
    stripe_pk_test:    d.stripe_pk_test    ?? "",
    stripe_pk_live:    d.stripe_pk_live    ?? "",
    tebex_enabled:     d.tebex_enabled     ?? false,
    tebex_webstore_id: d.tebex_webstore_id ?? "",
  };
}

export interface GameDbHandle {
  conn: mysql.Connection;
  config: ServerConfig;
}

/** Game DB environment selector. Backwards-compatible with numeric `1` / `2` for v1.0 / v2.0. */
export type GameEnv = 1 | 2 | "test";

function envSuffix(env: GameEnv): "v1" | "v2" | "test" {
  if (env === "test") return "test";
  return env === 1 ? "v1" : "v2";
}

function envLabel(env: GameEnv): string {
  if (env === "test") return "Pruebas";
  return `v${env}.0`;
}

/**
 * Opens a new MySQL2 connection using credentials stored in Supabase.
 * Caller MUST call `await conn.end()` when done.
 */
export async function getGameDb(env: GameEnv = 2): Promise<GameDbHandle> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("server_config")
    .select("*")
    .eq("id", 1)
    .single();

  if (error || !data) {
    throw new Error(
      "Game server not configured. Go to Admin → Game Server and save the connection.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  const v = envSuffix(env);
  const defaultCharsTable = env === 1 ? "topservers" : "topserver_turbo";

  const config: ServerConfig = {
    db_host:          d[`db_host_${v}`]          ?? "",
    db_port:          d[`db_port_${v}`]          ?? 3306,
    db_name:          d[`db_name_${v}`]          ?? "",
    db_user:          d[`db_user_${v}`]          ?? "",
    db_pass:          d[`db_pass_${v}`]          ?? "",
    table_accounts:   d[`table_accounts_${v}`]   ?? "accounts",
    table_characters: d[`table_characters_${v}`] ?? defaultCharsTable,
    table_payments:   d[`table_payments_${v}`]   ?? "dbb_payments",
  };

  if (!config.db_host) {
    throw new Error(
      `Servidor ${envLabel(env)} no configurado. Ve a Admin → Game Server.`,
    );
  }

  const conn = await mysql.createConnection({
    host: config.db_host,
    port: config.db_port,
    database: config.db_name,
    user: config.db_user,
    password: config.db_pass,
    connectTimeout: 8000,
    charset: "utf8mb4",
  });

  return { conn, config };
}

/** Coerces a numeric or string version into a `GameEnv`. Falls back to v2 for unknown values. */
export function toGameEnv(value: unknown): GameEnv {
  if (value === "test" || value === 1 || value === 2) return value;
  if (value === "1" || value === "1.0") return 1;
  if (value === "2" || value === "2.0") return 2;
  return 2;
}

/** Row shape returned from the `accounts` table. */
export interface AccountRow {
  EntityID: number;
  Username: string;
  Password: string;
  Salt: string;
  Email: string;
  BannedID: number;
  State: number;
  Creation?: Date;
}

/** Row shape returned from the character table (topservers / topserver_turbo). */
export interface CharacterRow {
  EntityID: number;
  Name: string;
  Level: number;
  Reborn: number;
  CPs: number;
  Money: number;
  GuildName: string | null;
  Mesh: number;
  PKPoints: number;
  MetScrolls: number;
}

/** Donation package record from Supabase `donation_packages` table. */
export interface DonationPackage {
  id: string;
  name: string;
  price_usd: number;
  cps: number;
  version: number;   // 0=both | 1=v1 | 2=v2
  bonus_label: string | null;
  sort_order: number;
}

/**
 * Returns the in-game character name for an account on a given server version.
 * Returns null if no character is found or the DB is unreachable.
 */
export async function getCharacterName(entityId: number, env: GameEnv | number): Promise<string | null> {
  let conn: mysql.Connection | undefined;
  try {
    const { conn: c, config } = await getGameDb(toGameEnv(env));
    conn = c;
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT Name FROM \`${config.table_characters}\` WHERE EntityID = ? LIMIT 1`,
      [entityId],
    );
    return (rows[0]?.Name as string) ?? null;
  } catch {
    return null;
  } finally {
    await conn?.end();
  }
}

/**
 * Returns active donation packages visible for the given server version.
 * Packages with version=0 appear in both servers.
 */
export async function getDonationPackages(versionNum: number): Promise<DonationPackage[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("donation_packages")
    .select("id, name, price_usd, cps, version, bonus_label, sort_order")
    .eq("active", true)
    .in("version", [0, versionNum])
    .order("sort_order");
  return (data ?? []) as DonationPackage[];
}

/**
 * Returns the character row for an account on a given server version.
 * Returns null if no character is found or DB is unreachable.
 */
export async function getCharacterForAccount(
  entityId: number,
  env: GameEnv | number,
): Promise<{ name: string; cps: number; gold: number } | null> {
  let conn: mysql.Connection | undefined;
  try {
    const { conn: c, config } = await getGameDb(toGameEnv(env));
    conn = c;
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT Name, CPs, Money FROM \`${config.table_characters}\` WHERE EntityID = ? LIMIT 1`,
      [entityId],
    );
    if (!rows[0]) return null;
    return { name: rows[0].Name as string, cps: Number(rows[0].CPs ?? 0), gold: Number(rows[0].Money ?? 0) };
  } catch {
    return null;
  } finally {
    await conn?.end();
  }
}

/**
 * Atomically deducts CPs from a character in the game DB.
 * Returns { success, newBalance } or throws on DB error.
 * Uses an optimistic UPDATE with a WHERE CPs >= amount guard to prevent going negative.
 */
export async function deductCPs(
  entityId: number,
  env: GameEnv | number,
  amount: number,
): Promise<{ success: boolean; newBalance: number }> {
  let conn: mysql.Connection | undefined;
  try {
    const { conn: c, config } = await getGameDb(toGameEnv(env));
    conn = c;

    // Atomic deduction — only runs if balance is sufficient
    const [result] = await conn.execute<mysql.ResultSetHeader>(
      `UPDATE \`${config.table_characters}\` SET CPs = CPs - ? WHERE EntityID = ? AND CPs >= ?`,
      [amount, entityId, amount],
    );

    if (result.affectedRows === 0) {
      // Insufficient balance
      return { success: false, newBalance: 0 };
    }

    // Read new balance
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT CPs FROM \`${config.table_characters}\` WHERE EntityID = ? LIMIT 1`,
      [entityId],
    );
    return { success: true, newBalance: Number(rows[0]?.CPs ?? 0) };
  } finally {
    await conn?.end();
  }
}

/**
 * Credits CPs to a character in the game DB (used for refunds).
 */
export async function creditCPs(
  entityId: number,
  env: GameEnv | number,
  amount: number,
): Promise<{ success: boolean; newBalance: number }> {
  let conn: mysql.Connection | undefined;
  try {
    const { conn: c, config } = await getGameDb(toGameEnv(env));
    conn = c;
    await conn.execute(
      `UPDATE \`${config.table_characters}\` SET CPs = CPs + ? WHERE EntityID = ?`,
      [amount, entityId],
    );
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT CPs FROM \`${config.table_characters}\` WHERE EntityID = ? LIMIT 1`,
      [entityId],
    );
    return { success: true, newBalance: Number(rows[0]?.CPs ?? 0) };
  } finally {
    await conn?.end();
  }
}

/**
 * Returns the cp_market_rate from server_config (1 CP = N silvers).
 * Returns 100000 as default if not configured.
 */
export async function getCpMarketRate(): Promise<number> {
  try {
    const supabase = await createAdminClient();
    const { data } = await supabase
      .from("server_config")
      .select("cp_market_rate")
      .eq("id", 1)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Number((data as any)?.cp_market_rate ?? 100000);
  } catch {
    return 100000;
  }
}
