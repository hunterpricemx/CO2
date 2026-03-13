"use server";

import type { RowDataPacket } from "mysql2";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ServerConfigData = {
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_pass: string;
  table_accounts: string;
  table_characters_v1: string;
  table_characters_v2: string;
};

export type ActionResult = {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage = Reflect.get(error, "message");
    const maybeCode = Reflect.get(error, "code");
    const maybeSqlMessage = Reflect.get(error, "sqlMessage");

    const details = [maybeCode, maybeSqlMessage, maybeMessage]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .join(" | ");

    if (details.length > 0) return details;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

// ── Guardar configuración ────────────────────────────────────────
export async function saveServerConfig(config: ServerConfigData): Promise<ActionResult> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    id: 1,
    db_host:             config.db_host,
    db_port:             config.db_port,
    db_name:             config.db_name,
    db_user:             config.db_user,
    table_accounts:      config.table_accounts,
    table_characters_v1: config.table_characters_v1,
    table_characters_v2: config.table_characters_v2,
    updated_at:          new Date().toISOString(),
  };

  // Solo actualizar la contraseña si el usuario escribió una nueva
  if (config.db_pass.trim() !== "") {
    payload.db_pass = config.db_pass;
  }

  const { error } = await supabase
    .from("server_config")
    .upsert(payload);

  if (error) return { success: false, message: error.message };

  revalidatePath("/admin/game-server");
  return { success: true, message: "Configuración guardada." };
}

// ── Probar conexión ──────────────────────────────────────────────
export async function testGameServerConnection(config: ServerConfigData): Promise<ActionResult> {
  // La conexión MySQL se hace en el servidor — nunca expone credenciales al cliente
  try {
    const host = config.db_host.trim();
    const user = config.db_user.trim();
    const dbName = config.db_name.trim();
    const port = Number.isFinite(config.db_port) ? config.db_port : 3306;

    if (!host || !user || !dbName) {
      return { success: false, message: "Completa host, base de datos y usuario." };
    }

    // Si el campo contraseña está vacío en el form, usar la guardada en Supabase
    let password = config.db_pass;
    if (password.trim() === "") {
      const supabase = await createClient();
      const { data: stored } = await supabase
        .from("server_config")
        .select("db_pass")
        .eq("id", 1)
        .single();
      password = stored?.db_pass ?? "";
    }

    // Importación dinámica para que mysql2 no vaya al bundle del cliente
    const mysql = await import("mysql2/promise");

    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database:        dbName,
      connectTimeout:  8000,
    });

    const [[acctRow]]    = await conn.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM \`${config.table_accounts.trim()}\``
    );
    const [[charRowV1]]  = await conn.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM \`${config.table_characters_v1.trim()}\``
    );
    const [[charRowV2]]  = await conn.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM \`${config.table_characters_v2.trim()}\``
    );

    await conn.end();

    return {
      success: true,
      message: "Conexión exitosa.",
      data: {
        accounts:       acctRow.total,
        characters_v1:  charRowV1.total,
        characters_v2:  charRowV2.total,
      },
    };
  } catch (e: unknown) {
    const hostInfo = `${config.db_host.trim() || "(sin host)"}:${Number.isFinite(config.db_port) ? config.db_port : 3306}`;
    return { success: false, message: `[${hostInfo}] ${getErrorMessage(e, "Error de conexión.")}` };
  }
}

// ── Sincronizar MariaDB → Supabase ───────────────────────────────
export async function syncGameServer(): Promise<ActionResult> {
  const supabase = await createClient();

  // Leer config guardada
  const { data: cfg, error: cfgErr } = await supabase
    .from("server_config")
    .select("*")
    .eq("id", 1)
    .single();

  if (cfgErr || !cfg) return { success: false, message: "No hay configuración guardada." };
  if (!cfg.db_host || !cfg.db_user) return { success: false, message: "Configura el servidor primero." };

  try {
    const mysql = await import("mysql2/promise");

    const conn = await mysql.createConnection({
      host:           cfg.db_host,
      port:           cfg.db_port,
      user:           cfg.db_user,
      password:       cfg.db_pass    ?? undefined,
      database:       cfg.db_name    ?? undefined,
      connectTimeout: 10000,
    });

    // Traer accounts (sin password ni salt)
    const [accounts] = await conn.query<RowDataPacket[]>(
      `SELECT EntityID, Username, Email, EarthID, IP, BannedID, Creation, HWID, State
       FROM \`${cfg.table_accounts}\``
    );

    // Traer personajes v1.0
    const charQuery = `SELECT EntityID, Name, Money, CPs, GuildName, MoneySave, Mesh, Avatar,
              GenesisCoin, AutoHunting, PKPoints, Reborn, Strength, Agility,
              Vitality, Spirit, Additional, Spouse, Level, Status, MetScrolls
       FROM`;
    const [charsV1] = await conn.query<RowDataPacket[]>(
      `${charQuery} \`${cfg.table_characters_v1}\``
    );

    // Traer personajes v2.0
    const [charsV2] = await conn.query<RowDataPacket[]>(
      `${charQuery} \`${cfg.table_characters_v2}\``
    );

    await conn.end();

    // Upsert accounts → Supabase
    if (accounts.length > 0) {
      const acctRows = accounts.map((r: RowDataPacket) => ({
        entity_id: r.EntityID,
        username:  r.Username,
        email:     r.Email     ?? "",
        earth_id:  r.EarthID   ?? "",
        ip:        r.IP,
        banned_id: r.BannedID  ?? 2,
        creation:  r.Creation,
        hwid:      r.HWID,
        state:     r.State     ?? 0,
        synced_at: new Date().toISOString(),
      }));

      const { error: ae } = await supabase
        .from("game_accounts")
        .upsert(acctRows, { onConflict: "entity_id" });

      if (ae) return { success: false, message: "Error sync accounts: " + ae.message };
    }

    // Helper para mapear filas de personajes con su versión
    const mapChars = (rows: RowDataPacket[], version: string) =>
      rows.map((r: RowDataPacket) => ({
        entity_id:    r.EntityID,
        version,
        name:         r.Name,
        money:        r.Money        ?? 0,
        cps:          r.CPs          ?? 0,
        guild_name:   r.GuildName    ?? null,
        money_save:   r.MoneySave    ?? 0,
        mesh:         r.Mesh         ?? 0,
        avatar:       r.Avatar       ?? 0,
        genesis_coin: r.GenesisCoin  ?? 0,
        auto_hunting: r.AutoHunting  ?? 0,
        pk_points:    r.PKPoints     ?? 0,
        reborn:       r.Reborn       ?? 0,
        strength:     r.Strength     ?? 0,
        agility:      r.Agility      ?? 0,
        vitality:     r.Vitality     ?? 0,
        spirit:       r.Spirit       ?? 0,
        additional:   r.Additional   ?? 0,
        spouse:       r.Spouse       ?? null,
        level:        r.Level        ?? 1,
        status:       r.Status       ?? 0,
        met_scrolls:  r.MetScrolls   ?? 0,
        synced_at:    new Date().toISOString(),
      }));

    // Upsert personajes v1.0
    if (charsV1.length > 0) {
      const { error: ce } = await supabase
        .from("game_characters")
        .upsert(mapChars(charsV1, "1.0"), { onConflict: "entity_id,version" });
      if (ce) return { success: false, message: "Error sync characters v1.0: " + ce.message };
    }

    // Upsert personajes v2.0
    if (charsV2.length > 0) {
      const { error: ce } = await supabase
        .from("game_characters")
        .upsert(mapChars(charsV2, "2.0"), { onConflict: "entity_id,version" });
      if (ce) return { success: false, message: "Error sync characters v2.0: " + ce.message };
    }

    // Actualizar stats de last sync
    await supabase
      .from("server_config")
      .update({
        last_sync:             new Date().toISOString(),
        sync_accounts_count:   accounts.length,
        sync_characters_count: charsV1.length + charsV2.length,
      })
      .eq("id", 1);

    revalidatePath("/admin/game-server");

    return {
      success: true,
      message: `Sincronización completa.`,
      data: { accounts: accounts.length, characters_v1: charsV1.length, characters_v2: charsV2.length },
    };
  } catch (e: unknown) {
    return { success: false, message: getErrorMessage(e, "Error de sincronización.") };
  }
}

// ── Leer configuración (sin contraseña) ─────────────────────────
export async function getServerConfig() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("server_config")
    .select("db_host, db_port, db_name, db_user, db_pass, table_accounts, table_characters_v1, table_characters_v2, last_sync, sync_accounts_count, sync_characters_count, updated_at")
    .eq("id", 1)
    .single();

  if (!data) return null;

  // Nunca devolver la contraseña al cliente — solo indicar si está guardada
  const { db_pass, ...rest } = data;
  return { ...rest, has_password: (db_pass ?? "").trim().length > 0 };
}
