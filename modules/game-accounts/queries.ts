/**
 * Game Accounts Module — Queries
 *
 * Reads game accounts from MariaDB (via getGameDb) and action logs from Supabase.
 * Password and Salt fields are NEVER selected.
 */

import type { RowDataPacket } from "mysql2";
import { getGameDb } from "@/lib/game-db";
import { createAdminClient } from "@/lib/supabase/server";
import type { GameAccountRow, GameAccountFilters, GameAccountsPage, AccountActionLog } from "./types";

export async function searchGameAccounts(filters: GameAccountFilters): Promise<GameAccountsPage> {
  const { search, version, banned, page, pageSize } = filters;
  const offset = (page - 1) * pageSize;

  const { conn, config } = await getGameDb(version);
  try {
    const conditions: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];

    if (search) {
      conditions.push("(Username LIKE ? OR Email LIKE ?)");
      const like = `%${search}%`;
      params.push(like, like);
    }

    if (banned === true) {
      conditions.push("BannedID != 2");
    } else if (banned === false) {
      conditions.push("BannedID = 2");
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countRows] = await conn.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM \`${config.table_accounts}\` ${where}`,
      params,
    );
    const total = Number((countRows[0] as RowDataPacket)?.total ?? 0);

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT EntityID, Username, Email, BannedID, State, Creation
       FROM \`${config.table_accounts}\`
       ${where}
       ORDER BY EntityID DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    return {
      data: rows as GameAccountRow[],
      total,
      page,
      pageSize,
    };
  } finally {
    await conn.end();
  }
}

export async function getGameAccountByUsername(
  username: string,
  version: 1 | 2,
): Promise<GameAccountRow | null> {
  const { conn, config } = await getGameDb(version);
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT EntityID, Username, Email, BannedID, State, Creation
       FROM \`${config.table_accounts}\`
       WHERE Username = ? LIMIT 1`,
      [username],
    );
    return (rows[0] as GameAccountRow) ?? null;
  } finally {
    await conn.end();
  }
}

export async function getAccountActionLogs(username: string): Promise<AccountActionLog[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("account_action_logs")
    .select("*")
    .eq("username", username)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as unknown as AccountActionLog[];
}
