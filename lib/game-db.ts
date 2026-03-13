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
  table_characters_v1: string;
  table_characters_v2: string;
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

/**
 * Opens a new MySQL2 connection using credentials stored in Supabase.
 * Caller MUST call `await conn.end()` when done.
 */
export async function getGameDb(): Promise<GameDbHandle> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("server_config")
    .select("db_host, db_port, db_name, db_user, db_pass, table_accounts, table_characters_v1, table_characters_v2")
    .eq("id", 1)
    .single();

  if (error || !data?.db_host) {
    throw new Error(
      "Game server not configured. Go to Admin → Game Server and save the connection.",
    );
  }

  const config: ServerConfig = {
    db_host: data.db_host,
    db_port: data.db_port ?? 3306,
    db_name: data.db_name ?? "",
    db_user: data.db_user ?? "",
    db_pass: data.db_pass ?? "",
    table_accounts: data.table_accounts ?? "accounts",
    table_characters_v1: data.table_characters_v1 ?? "topservers",
    table_characters_v2: data.table_characters_v2 ?? "topserver_turbo",
  };

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
export async function getCharacterName(entityId: number, versionNum: number): Promise<string | null> {
  let conn: mysql.Connection | undefined;
  try {
    const { conn: c, config } = await getGameDb();
    conn = c;
    const table = versionNum === 1 ? config.table_characters_v1 : config.table_characters_v2;
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT Name FROM \`${table}\` WHERE EntityID = ? LIMIT 1`,
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
