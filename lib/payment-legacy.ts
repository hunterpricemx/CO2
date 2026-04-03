import { getGameDb } from "@/lib/game-db";

function sanitizeTableName(table: string): string {
  return table.replace(/`/g, "").trim() || "dbb_payments";
}

/**
 * Inserts or updates a row in the game server's dbb_payments table.
 *
 * Lookup priority:
 *  1. By `txn` OR `basket_ident`  — covers web-originated payments
 *  2. By `user_id + product`       — covers in-game-initiated rows (status=3)
 *  3. INSERT new row               — fallback when nothing is found
 */
export async function upsertLegacyPayment(params: {
  versionNum: number;
  userId: string;
  txn: string | null;
  product: string;
  price: number;
  basketIdent: string;
  status: number;
}): Promise<void> {
  const { conn, config } = await getGameDb(params.versionNum as 1 | 2);
  const table = sanitizeTableName(config.table_payments);
  const unixTime = String(Math.floor(Date.now() / 1000));
  const normalizedPrice = Math.max(0, Math.round(Number(params.price) || 0));

  try {
    // ── Lookup 1: txn / basket_ident ──────────────────────────────────
    const q1 = params.txn
      ? `SELECT id FROM \`${table}\` WHERE (txn = ? OR basket_ident = ?) AND product = ? ORDER BY id DESC LIMIT 1`
      : `SELECT id FROM \`${table}\` WHERE basket_ident = ? AND product = ? ORDER BY id DESC LIMIT 1`;
    const a1 = params.txn
      ? [params.txn, params.basketIdent, params.product]
      : [params.basketIdent, params.product];

    const [res1] = await conn.execute(q1, a1);
    const rows1 = res1 as Array<{ id: number }>;

    if (rows1.length > 0) {
      await conn.execute(
        `UPDATE \`${table}\`
            SET user_id = ?, txn = ?, product = ?, price = ?, basket_ident = ?,
                item_number = ?, status = ?, date = ?, since = NOW()
          WHERE id = ?`,
        [params.userId, params.txn, params.product, normalizedPrice,
          params.basketIdent, parseInt(params.product, 10) || 1, params.status, unixTime, rows1[0].id],
      );
      return;
    }

    // ── Lookup 2: user_id + product (in-game rows, usually status=3) ──
    if (params.product) {
      const [res2] = await conn.execute(
        `SELECT id FROM \`${table}\` WHERE user_id = ? AND product = ? ORDER BY id DESC LIMIT 1`,
        [params.userId, params.product],
      );
      const rows2 = res2 as Array<{ id: number }>;

      if (rows2.length > 0) {
        await conn.execute(
          `UPDATE \`${table}\`
              SET txn = ?, price = ?, basket_ident = ?,
                  item_number = ?, status = ?, date = ?, since = NOW()
            WHERE id = ?`,
          [params.txn, normalizedPrice, params.basketIdent,
            parseInt(params.product, 10) || 1, params.status, unixTime, rows2[0].id],
        );
        return;
      }
    }

    // ── Fallback: INSERT ───────────────────────────────────────────────
    await conn.execute(
      `INSERT INTO \`${table}\` (user_id, txn, product, price, basket_ident, item_number, status, date, since)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [params.userId, params.txn, params.product, normalizedPrice,
        params.basketIdent, parseInt(params.product, 10) || 1, params.status, unixTime],
    );
  } finally {
    await conn.end();
  }
}
