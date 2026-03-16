"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getGameDb } from "@/lib/game-db";
import { revalidatePath } from "next/cache";
import { logPayment } from "@/lib/payment-logger";

export type PaymentConfigData = {
  stripe_enabled:    boolean;
  stripe_mode:       "test" | "live";
  stripe_pk_test:    string;
  stripe_sk_test:    string;
  stripe_pk_live:    string;
  stripe_sk_live:    string;
  tebex_enabled:     boolean;
  tebex_secret:      string;
  tebex_webhook_secret: string;
  tebex_webstore_id: string;
  tebex_uri_v1:      string;
  tebex_uri_v2:      string;
  tebex_payment_table: string;
  tebex_category_id: string;
  tebex_product_id:  string;
};

export type ActionResult = {
  success: boolean;
  message: string;
  debug?: string[];
};

function sanitizeTableName(table: string): string {
  return table.replace(/`/g, "").trim() || "dbb_payments";
}

async function resolveCharacterForUsername(params: {
  username: string;
  version: 1 | 2;
  debug: string[];
}): Promise<{ characterName: string; entityId: number | null; level: number | null } | null> {
  const { username, version, debug } = params;

  debug.push(`[${new Date().toISOString()}] Opening MariaDB connection`);
  const { conn, config } = await getGameDb(version);
  const accountsTable = sanitizeTableName(config.table_accounts);
  const charactersTable = sanitizeTableName(config.table_characters);
  debug.push(`[${new Date().toISOString()}] Connected. accounts_table='${accountsTable}', characters_table='${charactersTable}'`);
  if (version === 2 && charactersTable.toLowerCase() === "topservers") {
    debug.push(`[${new Date().toISOString()}] WARNING: Version 2.0 is using characters_table='topservers' (usually v1 table). Review Admin > Game Server config.`);
  }
  if (version === 1 && charactersTable.toLowerCase() === "topserver_turbo") {
    debug.push(`[${new Date().toISOString()}] WARNING: Version 1.0 is using characters_table='topserver_turbo' (usually v2 table). Review Admin > Game Server config.`);
  }

  try {
    debug.push(`[${new Date().toISOString()}] Resolving character for username in selected server`);
    const [characterRows] = await conn.execute(
      `SELECT c.Name, c.Level, c.EntityID
         FROM \`${charactersTable}\` AS c
         INNER JOIN \`${accountsTable}\` AS a ON a.EntityID = c.EntityID
        WHERE a.Username = ?
        ORDER BY c.Level DESC, c.EntityID ASC
        LIMIT 1`,
      [username],
    );

    const rows = characterRows as Array<{ Name?: string; Level?: number; EntityID?: number }>;
    const characterName = String(rows[0]?.Name ?? "").trim();
    if (!characterName) {
      debug.push(`[${new Date().toISOString()}] No character found for username on this server`);
      return null;
    }

    const entityId = Number.isFinite(Number(rows[0]?.EntityID)) ? Number(rows[0]?.EntityID) : null;
    const level = Number.isFinite(Number(rows[0]?.Level)) ? Number(rows[0]?.Level) : null;
    debug.push(
      `[${new Date().toISOString()}] Character resolved: name='${characterName}', level='${String(level ?? "?")}', entity='${String(entityId ?? "?")}'`,
    );

    return { characterName, entityId, level };
  } finally {
    await conn.end();
    debug.push(`[${new Date().toISOString()}] MariaDB connection closed`);
  }
}

export async function insertManualPayment(params: {
  username: string;
  version: 1 | 2;
}): Promise<ActionResult> {
  const debug: string[] = [];
  const username = params.username.trim();
  debug.push(`[${new Date().toISOString()}] Request received`);
  debug.push(`[${new Date().toISOString()}] Payload username='${username}', version='${params.version}'`);

  if (!username) {
    debug.push(`[${new Date().toISOString()}] Validation failed: empty username`);
    return { success: false, message: "Debes ingresar un usuario.", debug };
  }

  const version = params.version === 1 ? 1 : 2;
  debug.push(`[${new Date().toISOString()}] Target server resolved: ${version}.0`);

  const txn = `manual-${randomUUID()}`;
  const basketIdent = `admin-${Date.now()}`;
  const unixTime = String(Math.floor(Date.now() / 1000));
  debug.push(`[${new Date().toISOString()}] Generated txn='${txn}', basket_ident='${basketIdent}'`);

  try {
    const character = await resolveCharacterForUsername({ username, version, debug });
    if (!character) {
      debug.push(`[${new Date().toISOString()}] Insert aborted`);
      return {
        success: false,
        message: `No se encontro personaje para el usuario '${username}' en el servidor ${version}.0.`,
        debug,
      };
    }

    debug.push(`[${new Date().toISOString()}] Opening MariaDB connection`);
    const { conn, config } = await getGameDb(version);
    const tableName = sanitizeTableName(config.table_payments);
    debug.push(`[${new Date().toISOString()}] Connected. payments_table='${tableName}'`);

    try {
      debug.push(`[${new Date().toISOString()}] Inserting payment row with user_id='${character.characterName}' and status=3`);
      await conn.execute(
        `INSERT INTO \`${tableName}\` (user_id, txn, product, price, basket_ident, item_number, status, date, since)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, NOW())`,
        [character.characterName, txn, "MANUAL_ADMIN", 0, basketIdent, 3, unixTime],
      );
      debug.push(`[${new Date().toISOString()}] Insert completed successfully`);
      await logPayment({ source: "manual", level: "info", event: "manual_insert",
        message: `Pago manual insertado para '${username}' → personaje '${character.characterName}' en servidor ${version}.0`,
        username, product: "MANUAL_ADMIN", amount: 0,
        metadata: { character_name: character.characterName, txn, basket_ident: basketIdent } });
    } finally {
      await conn.end();
      debug.push(`[${new Date().toISOString()}] MariaDB connection closed`);
    }

    revalidatePath("/admin/payments");
    debug.push(`[${new Date().toISOString()}] Cache revalidated for /admin/payments`);
    return {
      success: true,
      message: `Pago manual insertado para usuario '${username}' en servidor ${version}.0.`,
      debug,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "No se pudo insertar el pago manual.";
    debug.push(`[${new Date().toISOString()}] ERROR: ${errMsg}`);
    await logPayment({ source: "manual", level: "error", event: "manual_insert_error",
      message: `Error al insertar pago manual para '${username}': ${errMsg}`, username });
    return {
      success: false,
      message: errMsg,
      debug,
    };
  }
}

export async function insertZeroTebexPurchase(params: {
  username: string;
  version: 1 | 2;
}): Promise<ActionResult> {
  const debug: string[] = [];
  const username = params.username.trim();
  debug.push(`[${new Date().toISOString()}] Request received`);
  debug.push(`[${new Date().toISOString()}] Payload username='${username}', version='${params.version}'`);

  if (!username) {
    debug.push(`[${new Date().toISOString()}] Validation failed: empty username`);
    return { success: false, message: "Debes ingresar un usuario.", debug };
  }

  const version = params.version === 1 ? 1 : 2;
  const txn = `tebex-zero-${randomUUID()}`;
  const basketIdent = `tebex-zero-${Date.now()}`;
  const unixTime = String(Math.floor(Date.now() / 1000));
  debug.push(`[${new Date().toISOString()}] Target server resolved: ${version}.0`);
  debug.push(`[${new Date().toISOString()}] Generated txn='${txn}', basket_ident='${basketIdent}'`);

  try {
    const character = await resolveCharacterForUsername({ username, version, debug });
    if (!character) {
      return {
        success: false,
        message: `No se encontro personaje para el usuario '${username}' en el servidor ${version}.0.`,
        debug,
      };
    }

    const nowIso = new Date().toISOString();
    const supabase = await createClient();
    debug.push(`[${new Date().toISOString()}] Inserting donation row in Supabase with provider='tebex', amount=0, status='pending'`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const donationInsert = await (supabase as any)
      .from("donations")
      .insert({
        user_id: null,
        account_name: username,
        character_name: character.characterName,
        version,
        package_id: null,
        amount_paid: 0,
        currency: "USD",
        cps_base: 0,
        cps_total: 0,
        payment_provider: "tebex",
        tebex_transaction: txn,
        status: "pending",
        notes: `Tebex basket: ${basketIdent} (admin simulated $0)`,
      })
      .select("id")
      .single();

    if (donationInsert.error || !donationInsert.data) {
      debug.push(`[${new Date().toISOString()}] Supabase insert failed: ${donationInsert.error?.message ?? "unknown"}`);
      return { success: false, message: donationInsert.error?.message ?? "No se pudo crear la donacion Tebex $0.", debug };
    }

    const donationId = String((donationInsert.data as { id: string }).id);
    debug.push(`[${new Date().toISOString()}] Supabase donation created with id='${donationId}'`);

    debug.push(`[${new Date().toISOString()}] Simulating Tebex webhook event: payment.completed`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({
        status: "paid",
        amount_paid: 0,
        currency: "USD",
        tebex_transaction: txn,
      })
      .eq("id", donationId);
    debug.push(`[${new Date().toISOString()}] Donation updated to status='paid'`);

    debug.push(`[${new Date().toISOString()}] Opening MariaDB connection`);
    const { conn, config } = await getGameDb(version);
    const tableName = sanitizeTableName(config.table_payments);
    debug.push(`[${new Date().toISOString()}] Connected. payments_table='${tableName}'`);
    let pendingQueueInserted = false;

    try {
      debug.push(`[${new Date().toISOString()}] Inserting legacy Tebex payment row with price=0 and status=1 (paid)`);
      await conn.execute(
        `INSERT INTO \`${tableName}\` (user_id, txn, product, price, basket_ident, item_number, status, date, since)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, NOW())`,
        [username, txn, "TEBEX_ZERO_DEBUG", 0, basketIdent, 1, unixTime],
      );
      debug.push(`[${new Date().toISOString()}] Legacy payment row inserted`);

      debug.push(`[${new Date().toISOString()}] Checking cq_pending_donations table existence`);
      const [queueTableRows] = await conn.execute(
        "SELECT 1 AS ok FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'cq_pending_donations' LIMIT 1",
      );
      const hasPendingQueue = Array.isArray(queueTableRows) && queueTableRows.length > 0;

      if (hasPendingQueue) {
        debug.push(`[${new Date().toISOString()}] Inserting row into cq_pending_donations with status='pending'`);
        await conn.execute(
          `INSERT INTO cq_pending_donations
             (donation_uuid, char_name, account_name, version, cps_base, cps_total, status)
           VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
          [donationId, character.characterName, username, version, 0, 0],
        );
        pendingQueueInserted = true;
        debug.push(`[${new Date().toISOString()}] cq_pending_donations row inserted`);
      } else {
        debug.push(`[${new Date().toISOString()}] WARNING: cq_pending_donations does not exist. Donation will remain in status='paid'`);
      }
    } finally {
      await conn.end();
      debug.push(`[${new Date().toISOString()}] MariaDB connection closed`);
    }

    if (!pendingQueueInserted) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("donations")
        .update({
          status: "paid",
          notes: "Admin debug: Tebex $0 simulated purchase (pending queue table missing)",
        })
        .eq("id", donationId);
      debug.push(`[${new Date().toISOString()}] Donation kept in status='paid' (queue table missing)`);

      revalidatePath("/admin/payments");
      debug.push(`[${new Date().toISOString()}] Cache revalidated for /admin/payments`);

      await logPayment({ source: "debug", level: "warn", event: "debug_tebex_zero",
        message: `Compra Tebex $0 simulada para '${username}' → '${character.characterName}' en servidor ${version}.0 (sin cq_pending_donations)`,
        username, product: "TEBEX_ZERO_DEBUG", amount: 0, donation_id: donationId, txn_id: txn,
        metadata: { character_name: character.characterName, basket_ident: basketIdent, warning: "cq_pending_donations missing" } });

      return {
        success: true,
        message: `Compra Tebex $0 simulada para '${username}' en servidor ${version}.0 (sin cq_pending_donations).`,
        debug,
      };
    }

    debug.push(`[${new Date().toISOString()}] Updating Supabase donation to status='credited'`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({
        status: "credited",
        game_credited_at: nowIso,
        notes: "Admin debug: Tebex $0 simulated purchase (credited)",
      })
      .eq("id", donationId);
    debug.push(`[${new Date().toISOString()}] Donation updated to status='credited'`);

    revalidatePath("/admin/payments");
    debug.push(`[${new Date().toISOString()}] Cache revalidated for /admin/payments`);

    await logPayment({ source: "debug", level: "info", event: "debug_tebex_zero",
      message: `Compra Tebex $0 simulada correctamente para '${username}' → personaje '${character.characterName}' en servidor ${version}.0`,
      username, product: "TEBEX_ZERO_DEBUG", amount: 0, donation_id: donationId, txn_id: txn,
      metadata: { character_name: character.characterName, basket_ident: basketIdent } });

    return {
      success: true,
      message: `Compra Tebex $0 simulada para '${username}' en servidor ${version}.0.`,
      debug,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "No se pudo simular la compra Tebex $0.";
    debug.push(`[${new Date().toISOString()}] ERROR: ${errMsg}`);
    await logPayment({ source: "debug", level: "error", event: "debug_tebex_zero_error",
      message: `Error en Tebex $0 debug para '${username}': ${errMsg}`, username });

    const m = debug.join("\n").match(/Supabase donation created with id='([^']+)'/);
    const donationIdFromDebug = m?.[1] ?? null;
    if (donationIdFromDebug) {
      try {
        const supabase = await createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("donations")
          .update({ notes: `Tebex game DB insert failed: ${errMsg}` })
          .eq("id", donationIdFromDebug);
        debug.push(`[${new Date().toISOString()}] Donation note updated with game DB failure detail`);
      } catch {
        debug.push(`[${new Date().toISOString()}] Failed to persist error note in Supabase`);
      }
    }

    return {
      success: false,
      message: errMsg,
      debug,
    };
  }
}

export async function getPaymentConfig(): Promise<PaymentConfigData | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("server_config")
    .select("*")
    .eq("id", 1)
    .single();

  // sk keys are never sent to the client
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return {
    stripe_enabled:    d.stripe_enabled    ?? false,
    stripe_mode:       d.stripe_mode       ?? "test",
    stripe_pk_test:    d.stripe_pk_test    ?? "",
    stripe_sk_test:    "",
    stripe_pk_live:    d.stripe_pk_live    ?? "",
    stripe_sk_live:    "",
    tebex_enabled:     d.tebex_enabled     ?? false,
    tebex_secret:      "",
    tebex_webhook_secret: "",
    tebex_webstore_id: d.tebex_webstore_id ?? "",
    tebex_uri_v1:      d.tebex_uri_v1      ?? "",
    tebex_uri_v2:      d.tebex_uri_v2      ?? "",
    tebex_payment_table: d.tebex_payment_table ?? "dbb_payments",
    tebex_category_id: d?.tebex_category_id != null ? String(d.tebex_category_id) : "",
    tebex_product_id:  d?.tebex_product_id  != null ? String(d.tebex_product_id) : "",
  };
}

export async function getPaymentConfigHasSecrets(): Promise<{ has_stripe_sk_test: boolean; has_stripe_sk_live: boolean; has_tebex_secret: boolean; has_tebex_webhook_secret: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("server_config")
    .select("*")
    .eq("id", 1)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return {
    has_stripe_sk_test: !!d?.stripe_sk_test,
    has_stripe_sk_live: !!d?.stripe_sk_live,
    has_tebex_secret:   !!d?.tebex_secret,
    has_tebex_webhook_secret: !!d?.tebex_webhook_secret,
  };
}

export async function testStripeConnection(): Promise<ActionResult & { data?: Record<string, unknown> }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("server_config")
    .select("stripe_sk_test, stripe_mode")
    .eq("id", 1)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  if (!d?.stripe_sk_test) {
    return { success: false, message: "No hay secret key de pruebas guardada. Guarda la configuración primero." };
  }
  if (d.stripe_mode !== "test") {
    return { success: false, message: "El modo actual no es 'test'. Este botón solo funciona en modo pruebas." };
  }

  try {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: {
        Authorization: `Bearer ${d.stripe_sk_test}`,
      },
    });
    const json = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      const err = json.error as Record<string, unknown> | undefined;
      return { success: false, message: `Stripe error: ${String(err?.message ?? res.statusText)}` };
    }

    return {
      success: true,
      message: "✓ Conexión con Stripe exitosa. Secret key de pruebas válida.",
      data: {
        available: (json.available as { amount: number }[] | undefined)?.[0]?.amount ?? 0,
        currency: (json.available as { currency: string }[] | undefined)?.[0]?.currency?.toUpperCase() ?? "-",
      },
    };
  } catch (e: unknown) {
    return { success: false, message: `Error de red: ${e instanceof Error ? e.message : "desconocido"}` };
  }
}

export async function testTebexConnection(): Promise<ActionResult & { data?: Record<string, unknown> }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("server_config")
    .select("*")
    .eq("id", 1)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  const webstoreId = d?.tebex_webstore_id;
  const privateKey = d?.tebex_secret;

  if (!webstoreId) {
    return { success: false, message: "No hay Webstore ID guardado. Guarda la configuración primero." };
  }
  if (!privateKey) {
    return { success: false, message: "No hay Private key guardada. Guarda la configuración primero." };
  }

  try {
    const res = await fetch(`https://headless.tebex.io/api/accounts/${webstoreId}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${webstoreId}:${privateKey}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });
    const json = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      const err = (json.error_message ?? json.message ?? res.statusText) as string;
      return { success: false, message: `Tebex error: ${err}` };
    }

    const account = json.account as Record<string, unknown> | undefined;
    return {
      success: true,
      message: "✓ Conexión con Tebex exitosa. Credenciales válidas.",
      data: {
        name:     account?.name     ?? "-",
        currency: account?.currency ?? "-",
        domain:   account?.domain   ?? "-",
      },
    };
  } catch (e: unknown) {
    return { success: false, message: `Error de red: ${e instanceof Error ? e.message : "desconocido"}` };
  }
}

export async function getSecretValues(): Promise<{ stripe_sk_test: string; stripe_sk_live: string; tebex_secret: string; tebex_webhook_secret: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("server_config")
    .select("*")
    .eq("id", 1)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return {
    stripe_sk_test: d?.stripe_sk_test ?? "",
    stripe_sk_live: d?.stripe_sk_live ?? "",
    tebex_secret:   d?.tebex_secret   ?? "",
    tebex_webhook_secret: d?.tebex_webhook_secret ?? "",
  };
}

export async function savePaymentConfig(config: PaymentConfigData): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: existingRow } = await supabase
    .from("server_config")
    .select("*")
    .eq("id", 1)
    .single();

  const existingColumns = new Set(Object.keys((existingRow ?? {}) as Record<string, unknown>));
  const missingColumns: string[] = [];

  const payload: Record<string, unknown> = {
    id:                1,
    stripe_enabled:    config.stripe_enabled,
    stripe_mode:       config.stripe_mode,
    stripe_pk_test:    config.stripe_pk_test,
    stripe_pk_live:    config.stripe_pk_live,
    tebex_enabled:     config.tebex_enabled,
    tebex_webstore_id: config.tebex_webstore_id,
    tebex_uri_v1:      config.tebex_uri_v1.trim(),
    tebex_uri_v2:      config.tebex_uri_v2.trim(),
    tebex_payment_table: config.tebex_payment_table.trim(),
    updated_at:        new Date().toISOString(),
  };

  if (config.tebex_category_id.trim() !== "") {
    payload.tebex_category_id = config.tebex_category_id.trim();
  }
  if (config.tebex_product_id.trim() !== "") {
    payload.tebex_product_id = config.tebex_product_id.trim();
  }

  // Only update secret keys if the user typed a new value
  if (config.stripe_sk_test.trim() !== "") payload.stripe_sk_test = config.stripe_sk_test;
  if (config.stripe_sk_live.trim() !== "") payload.stripe_sk_live = config.stripe_sk_live;
  if (config.tebex_secret.trim()   !== "") payload.tebex_secret   = config.tebex_secret;
  if (config.tebex_webhook_secret.trim() !== "") payload.tebex_webhook_secret = config.tebex_webhook_secret;

  const optionalServerConfigColumns = [
    "tebex_webhook_secret",
    "tebex_uri_v1",
    "tebex_uri_v2",
    "tebex_payment_table",
    "tebex_category_id",
    "tebex_product_id",
  ];

  for (const column of optionalServerConfigColumns) {
    if (!(column in payload)) continue;
    if (!existingColumns.has(column)) {
      delete payload[column];
      missingColumns.push(column);
    }
  }

  const { error } = await supabase.from("server_config").upsert(payload);
  if (error) return { success: false, message: error.message };

  revalidatePath("/admin/payments");
  if (missingColumns.length > 0) {
    return {
      success: true,
      message: `Configuración guardada. Faltan columnas por migrar para: ${missingColumns.join(", ")}`,
    };
  }

  return { success: true, message: "Configuración de pagos guardada." };
}
