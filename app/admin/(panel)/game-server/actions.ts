"use server";

import type { RowDataPacket } from "mysql2";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdminPanelAccess } from "@/lib/admin/auth";
import { pingShopEndpoint, type ShopEnv } from "@/lib/shop-delivery";

export type ServerConfigData = {
  // V2.0
  db_host_v2: string;
  db_port_v2: number;
  db_name_v2: string;
  db_user_v2: string;
  db_pass_v2: string;
  table_accounts_v2: string;
  table_characters_v2: string;
  table_payments_v2: string;
  // V1.0
  db_host_v1: string;
  db_port_v1: number;
  db_name_v1: string;
  db_user_v1: string;
  db_pass_v1: string;
  table_accounts_v1: string;
  table_characters_v1: string;
  table_payments_v1: string;
  // Servidor Pruebas (independiente)
  db_host_test: string;
  db_port_test: number;
  db_name_test: string;
  db_user_test: string;
  db_pass_test: string;
  table_accounts_test: string;
  table_characters_test: string;
  table_payments_test: string;
  // Shop endpoint (HTTP listener del game server) — solo "test" por ahora
  shop_endpoint_test: string;
  shop_hmac_secret_test: string;
  shop_enabled_test: boolean;
  shop_timeout_ms_test: number;
};

export type ServerEnv = 1 | 2 | "test";

function envSuffix(env: ServerEnv): "v1" | "v2" | "test" {
  if (env === "test") return "test";
  return env === 1 ? "v1" : "v2";
}

function envLabel(env: ServerEnv): string {
  if (env === "test") return "Pruebas";
  return `V${env}.0`;
}

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
  await requireAdminPanelAccess("gameServer");
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    id: 1,
    db_host_v2:          config.db_host_v2,
    db_port_v2:          config.db_port_v2,
    db_name_v2:          config.db_name_v2,
    db_user_v2:          config.db_user_v2,
    table_accounts_v2:   config.table_accounts_v2,
    table_characters_v2: config.table_characters_v2,
    table_payments_v2:   config.table_payments_v2,
    db_host_v1:          config.db_host_v1,
    db_port_v1:          config.db_port_v1,
    db_name_v1:          config.db_name_v1,
    db_user_v1:          config.db_user_v1,
    table_accounts_v1:   config.table_accounts_v1,
    table_characters_v1: config.table_characters_v1,
    table_payments_v1:   config.table_payments_v1,
    // Servidor Pruebas
    db_host_test:          config.db_host_test,
    db_port_test:          config.db_port_test,
    db_name_test:          config.db_name_test,
    db_user_test:          config.db_user_test,
    table_accounts_test:   config.table_accounts_test,
    table_characters_test: config.table_characters_test,
    table_payments_test:   config.table_payments_test,
    // Shop endpoint
    shop_endpoint_test:    config.shop_endpoint_test,
    shop_enabled_test:     config.shop_enabled_test,
    shop_timeout_ms_test:  config.shop_timeout_ms_test,
    updated_at:            new Date().toISOString(),
  };

  if (config.db_pass_v2.trim()             !== "") payload.db_pass_v2          = config.db_pass_v2;
  if (config.db_pass_v1.trim()             !== "") payload.db_pass_v1          = config.db_pass_v1;
  if (config.db_pass_test.trim()           !== "") payload.db_pass_test        = config.db_pass_test;
  if (config.shop_hmac_secret_test.trim()  !== "") payload.shop_hmac_secret_test = config.shop_hmac_secret_test;

  const { error } = await supabase.from("server_config").upsert(payload);
  if (error) return { success: false, message: error.message };

  revalidatePath("/admin/game-server");
  return { success: true, message: "Configuración guardada." };
}

// ── Probar conexión ──────────────────────────────────────────────
export async function testGameServerConnection(config: ServerConfigData, env: ServerEnv): Promise<ActionResult> {
  await requireAdminPanelAccess("gameServer");
  try {
    const v = envSuffix(env);
    const host   = (config[`db_host_${v}` as keyof ServerConfigData] as string).trim();
    const user   = (config[`db_user_${v}` as keyof ServerConfigData] as string).trim();
    const dbName = (config[`db_name_${v}` as keyof ServerConfigData] as string).trim();
    const port   = config[`db_port_${v}` as keyof ServerConfigData] as number;
    const tableAccounts = (config[`table_accounts_${v}` as keyof ServerConfigData] as string).trim();
    const tableChars    = (config[`table_characters_${v}` as keyof ServerConfigData] as string).trim();

    if (!host || !user || !dbName) {
      return { success: false, message: `Completa host, base de datos y usuario para ${envLabel(env)}.` };
    }

    let password = config[`db_pass_${v}` as keyof ServerConfigData] as string;
    if (password.trim() === "") {
      const supabase = await createClient();
      const { data: stored } = await supabase
        .from("server_config")
        .select("*")
        .eq("id", 1)
        .single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      password = (stored as any)?.[`db_pass_${v}`] ?? "";
    }

    const mysql = await import("mysql2/promise");
    const t0 = Date.now();
    const conn = await mysql.createConnection({
      host, port, user, password, database: dbName, connectTimeout: 8000,
    });
    const latency = Date.now() - t0;

    const [[acctRow]]  = await conn.query<RowDataPacket[]>(`SELECT COUNT(*) as total FROM \`${tableAccounts}\``);
    const [[charRow]]  = await conn.query<RowDataPacket[]>(`SELECT COUNT(*) as total FROM \`${tableChars}\``);
    const tablePayments = (config[`table_payments_${v}` as keyof ServerConfigData] as string).trim();
    const [payRows] = await conn.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
      [dbName, tablePayments]
    );
    const paymentsExists = (payRows[0]?.total ?? 0) > 0;
    await conn.end();

    return {
      success: true,
      message: `Conexión ${envLabel(env)} exitosa.`,
      data: {
        from_host: "EC2 (3.213.176.132)",
        to_host: host,
        to_port: port,
        db_name: dbName,
        db_user: user,
        latency_ms: latency,
        accounts: acctRow.total,
        characters: charRow.total,
        payments_table: tablePayments,
        payments_table_exists: paymentsExists,
      },
    };
  } catch (e: unknown) {
    const v = envSuffix(env);
    const host = (config[`db_host_${v}` as keyof ServerConfigData] as string) || "(sin host)";
    const port = config[`db_port_${v}` as keyof ServerConfigData] as number || 3306;
    return { success: false, message: `Error de conexión`, data: { from_host: "EC2 (3.213.176.132)", to_host: host, to_port: port, error: getErrorMessage(e, "Error desconocido") } };
  }
}

// ── Probar shop endpoint (HTTP listener del game server) ─────────
export async function testShopEndpoint(env: ShopEnv = "test"): Promise<ActionResult> {
  await requireAdminPanelAccess("gameServer");

  const result = await pingShopEndpoint(env);

  // Aceptamos cualquier 2xx con body parseable como "endpoint vivo".
  // Si el listener responde 200 con `ok:true` (delivered o already_delivered) → conexión + firma OK.
  // Si responde 200 pero `ok:false` → endpoint vivo, pero el game server rechazó (probablemente uid_not_found para el ping).
  // Si responde 400 invalid_signature → conexión OK pero el secret no coincide.
  const data: Record<string, unknown> = {
    endpoint:   result.signedRequest.url || "(no configurado)",
    http_status: result.status,
    response:   result.body ?? null,
  };

  if (result.status === 0) {
    return { success: false, message: `Endpoint inaccesible: ${result.error ?? "network"}`, data };
  }
  if (result.status === 400) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = typeof result.body === "object" && result.body ? (result.body as any).error : null;
    if (err === "invalid_signature") {
      return { success: false, message: "El secret HMAC no coincide con el del game server.", data };
    }
    return { success: false, message: `Endpoint respondió 400: ${err ?? "bad_request"}`, data };
  }
  if (result.ok || result.status >= 200 && result.status < 300) {
    return { success: true, message: "Endpoint accesible y firma válida.", data };
  }
  return { success: false, message: `Endpoint respondió HTTP ${result.status}`, data };
}

// ── Sincronizar MariaDB → Supabase ───────────────────────────────
export async function syncGameServer(): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: cfg, error: cfgErr } = await supabase
    .from("server_config")
    .select("*")
    .eq("id", 1)
    .single();

  if (cfgErr || !cfg) return { success: false, message: "No hay configuración guardada." };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = cfg as any;
  if (!c.db_host_v2 || !c.db_user_v2) return { success: false, message: "Configura el servidor V2.0 primero." };

  try {
    const mysql = await import("mysql2/promise");

    // ── V2.0 connection (accounts + chars v2) ───────────────────
    const connV2 = await mysql.createConnection({
      host:           c.db_host_v2,
      port:           c.db_port_v2,
      user:           c.db_user_v2,
      password:       c.db_pass_v2    ?? undefined,
      database:       c.db_name_v2    ?? undefined,
      connectTimeout: 10000,
    });

    const [accounts] = await connV2.query<RowDataPacket[]>(
      `SELECT EntityID, Username, Email, EarthID, IP, BannedID, Creation, HWID, State
       FROM \`${c.table_accounts_v2}\``
    );

    const charQuery = `SELECT EntityID, Name, Money, CPs, GuildName, MoneySave, Mesh, Avatar,
              GenesisCoin, AutoHunting, PKPoints, Reborn, Strength, Agility,
              Vitality, Spirit, Additional, Spouse, Level, Status, MetScrolls
       FROM`;

    const [charsV2] = await connV2.query<RowDataPacket[]>(
      `${charQuery} \`${c.table_characters_v2}\``
    );
    await connV2.end();

    // ── V1.0 connection (chars v1 only, if configured) ───────────
    let charsV1: RowDataPacket[] = [];
    if (c.db_host_v1 && c.db_user_v1) {
      const connV1 = await mysql.createConnection({
        host:           c.db_host_v1,
        port:           c.db_port_v1,
        user:           c.db_user_v1,
        password:       c.db_pass_v1  ?? undefined,
        database:       c.db_name_v1  ?? undefined,
        connectTimeout: 10000,
      });
      const [rows] = await connV1.query<RowDataPacket[]>(
        `${charQuery} \`${c.table_characters_v1}\``
      );
      charsV1 = rows;
      await connV1.end();
    }

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
    .select("*")
    .eq("id", 1)
    .single();

  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return {
    db_host_v2:          d.db_host_v2          ?? "",
    db_port_v2:          d.db_port_v2          ?? 3306,
    db_name_v2:          d.db_name_v2          ?? "",
    db_user_v2:          d.db_user_v2          ?? "",
    db_pass_v2:          "",
    table_accounts_v2:   d.table_accounts_v2   ?? "accounts",
    table_characters_v2: d.table_characters_v2 ?? "topserver_turbo",
    table_payments_v2:   d.table_payments_v2   ?? "dbb_payments",
    db_host_v1:          d.db_host_v1          ?? "",
    db_port_v1:          d.db_port_v1          ?? 3306,
    db_name_v1:          d.db_name_v1          ?? "",
    db_user_v1:          d.db_user_v1          ?? "",
    db_pass_v1:          "",
    table_accounts_v1:   d.table_accounts_v1   ?? "accounts",
    table_characters_v1: d.table_characters_v1 ?? "topservers",
    table_payments_v1:   d.table_payments_v1   ?? "dbb_payments",
    db_host_test:          d.db_host_test          ?? "",
    db_port_test:          d.db_port_test          ?? 3306,
    db_name_test:          d.db_name_test          ?? "",
    db_user_test:          d.db_user_test          ?? "",
    db_pass_test:          "",
    table_accounts_test:   d.table_accounts_test   ?? "accounts",
    table_characters_test: d.table_characters_test ?? "topserver_turbo",
    table_payments_test:   d.table_payments_test   ?? "dbb_payments",
    shop_endpoint_test:    d.shop_endpoint_test    ?? "",
    shop_hmac_secret_test: "",
    shop_enabled_test:     Boolean(d.shop_enabled_test),
    shop_timeout_ms_test:  d.shop_timeout_ms_test  ?? 5000,
    has_password_v2:        ((d.db_pass_v2          ?? "") as string).trim().length > 0,
    has_password_v1:        ((d.db_pass_v1          ?? "") as string).trim().length > 0,
    has_password_test:      ((d.db_pass_test        ?? "") as string).trim().length > 0,
    has_shop_secret_test:   ((d.shop_hmac_secret_test ?? "") as string).trim().length > 0,
    last_sync:             d.last_sync             ?? null,
    sync_accounts_count:   d.sync_accounts_count   ?? 0,
    sync_characters_count: d.sync_characters_count ?? 0,
  };
}

/**
 * Generates a fresh 64-hex-char HMAC secret. Returned only to the admin once,
 * and only saved to DB when the form is saved (caller responsibility).
 */
export async function generateShopSecret(): Promise<{ secret: string }> {
  await requireAdminPanelAccess("gameServer");
  const { randomBytes } = await import("node:crypto");
  return { secret: randomBytes(32).toString("hex") };
}
