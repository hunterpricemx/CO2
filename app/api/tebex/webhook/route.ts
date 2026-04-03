import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getTebexConfig, verifyTebexWebhookSignature } from "@/lib/tebex";
import { logPayment } from "@/lib/payment-logger";
import { upsertLegacyPayment } from "@/lib/payment-legacy";
import { sendGenericMail } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TebexPaymentSubject = {
  transaction_id?: string;
  price?: { amount?: number; currency?: string };
  status?: { id?: number; description?: string };
  custom?: Record<string, unknown> | null;
  // Full product list sent by Tebex — structure captured via raw_products_debug log
  products?: Array<Record<string, unknown>>;
};

type TebexWebhookPayload = {
  id?: string;
  type?: string;
  subject?: TebexPaymentSubject;
};

function extractBasketIdent(note: string | null | undefined): string | null {
  const m = (note ?? "").match(/Tebex basket:\s*([^\s]+)/i);
  return m?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");
  const config = await getTebexConfig();

  if (!config.webhookSecret) {
    return NextResponse.json({ error: "Tebex webhook secret is not configured" }, { status: 500 });
  }

  if (!verifyTebexWebhookSignature(rawBody, signature, config.webhookSecret)) {
    return NextResponse.json({ error: "Invalid Tebex signature" }, { status: 400 });
  }

  const payload = JSON.parse(rawBody) as TebexWebhookPayload;
  if (payload.type === "validation.webhook" && payload.id) {
    return NextResponse.json({ id: payload.id });
  }

  if (!payload.type || !payload.subject) {
    return NextResponse.json({ error: "Invalid Tebex payload" }, { status: 400 });
  }

  const subject = payload.subject;
  const custom = (subject.custom ?? {}) as Record<string, unknown>;
  const transactionId = subject.transaction_id ?? null;

  // ── Garment order branch ──────────────────────────────────────────────────
  const garmentOrderId = typeof custom.garment_order_id === "string" ? custom.garment_order_id : "";
  if (garmentOrderId) {
    const supabase = await createAdminClient();

    if (payload.type === "payment.declined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("garment_orders")
        .update({ status: "cancelled", tebex_transaction: transactionId })
        .eq("id", garmentOrderId);
      await logPayment({ source: "tebex", level: "warn", event: "garment_payment_declined",
        message: `Garment pago rechazado: ${subject.status?.description ?? "motivo desconocido"}`,
        txn_id: transactionId });
      return NextResponse.json({ received: true });
    }

    if (payload.type === "payment.refunded") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("garment_orders")
        .update({ status: "cancelled", tebex_transaction: transactionId })
        .eq("id", garmentOrderId);
      await logPayment({ source: "tebex", level: "warn", event: "garment_payment_refunded",
        message: "Garment pago reembolsado",
        txn_id: transactionId });
      return NextResponse.json({ received: true });
    }

    if (payload.type === "payment.completed") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: garmentOrder } = await (supabase as any)
        .from("garment_orders")
        .select("id, garment_name, account_name, character_name, version, is_custom, amount_paid, currency, status, tebex_transaction")
        .eq("id", garmentOrderId)
        .single();

      if (!garmentOrder) {
        await logPayment({ source: "tebex", level: "error", event: "garment_order_not_found",
          message: `Garment order ${garmentOrderId} no encontrada`,
          txn_id: transactionId });
        return NextResponse.json({ error: "Garment order not found" }, { status: 404 });
      }

      if (garmentOrder.status === "paid" && garmentOrder.tebex_transaction === transactionId) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("garment_orders")
        .update({
          status: "paid",
          amount_paid: subject.price?.amount ?? garmentOrder.amount_paid,
          currency: subject.price?.currency ?? garmentOrder.currency ?? "USD",
          tebex_transaction: transactionId,
        })
        .eq("id", garmentOrderId);

      await logPayment({ source: "tebex", level: "info", event: "garment_payment_completed",
        message: `Garment pagado: '${garmentOrder.garment_name}' — ${garmentOrder.account_name}`,
        username: garmentOrder.account_name ?? null, txn_id: transactionId });

      // Notify admin by email
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: settings } = await (supabase as any)
          .from("site_settings")
          .select("value")
          .eq("key", "support_notification_email")
          .single();
        const adminEmail = settings?.value as string | null;
        if (adminEmail) {
          const isCustom = Boolean(garmentOrder.is_custom);
          const garmentHtml = `<h2>Nuevo pedido de Garment recibido</h2>
<ul>
  <li><strong>Garment:</strong> ${garmentOrder.garment_name}${isCustom ? " <em>(Personalizado)</em>" : ""}</li>
  <li><strong>Jugador:</strong> ${garmentOrder.account_name}</li>
  <li><strong>Personaje:</strong> ${garmentOrder.character_name}</li>
  <li><strong>Versión:</strong> ${garmentOrder.version}.0</li>
  <li><strong>Monto:</strong> $${garmentOrder.amount_paid} ${garmentOrder.currency ?? "USD"}</li>
  <li><strong>ID de orden:</strong> ${garmentOrderId}</li>
</ul>
<p>Ve al panel de administración para gestionar este pedido.</p>`;
          await sendGenericMail({
            to: adminEmail,
            subject: `🛒 Nuevo pedido de Garment — ${garmentOrder.garment_name}`,
            html: garmentHtml,
            text: `Nuevo pedido de Garment recibido.\nGarment: ${garmentOrder.garment_name}\nJugador: ${garmentOrder.account_name}\nPersonaje: ${garmentOrder.character_name}\nVersión: ${garmentOrder.version}.0\nMonto: $${garmentOrder.amount_paid} ${garmentOrder.currency ?? "USD"}\nID de orden: ${garmentOrderId}`,
          });
        }
      } catch {
        // Email send failure should never block webhook acknowledgment
      }

      return NextResponse.json({ received: true });
    }

    // Unknown event type for garment order
    return NextResponse.json({ received: true });
  }
  // ── End garment order branch ──────────────────────────────────────────────

  const donationId = typeof custom.donation_id === "string" ? custom.donation_id : "";
  const characterName = typeof custom.character_name === "string" ? custom.character_name : "";
  const accountName = typeof custom.account_name === "string" ? custom.account_name : null;
  const versionNum = Number.parseInt(String(custom.version ?? "2"), 10);

  if (!donationId) {
    await logPayment({ source: "tebex", level: "error", event: "missing_donation_id",
      message: `Webhook type=${payload.type} recibido sin donation_id en custom data`,
      username: String(custom.account_name ?? custom.user_id ?? "") || null,
      txn_id: transactionId });
    return NextResponse.json({ error: "Missing donation_id in Tebex custom data" }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const donationQuery = await (supabase as any)
    .from("donations")
    .select("id, status, amount_paid, cps_base, cps_total, character_name, account_name, version, package_id, notes, tebex_transaction")
    .eq("id", donationId)
    .single();

  if (donationQuery.error || !donationQuery.data) {
    await logPayment({ source: "tebex", level: "error", event: "donation_not_found",
      message: `Donation ${donationId} no encontrada en Supabase`,
      donation_id: donationId, txn_id: transactionId });
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  const donation = donationQuery.data as {
    id: string;
    status: string;
    amount_paid: number;
    cps_base: number;
    cps_total: number;
    character_name: string;
    account_name: string | null;
    version: number;
    package_id: string | null;
    notes: string | null;
    tebex_transaction: string | null;
  };

  const resolvedVersion = Number.isFinite(versionNum) ? versionNum : donation.version;
  const basketIdent = extractBasketIdent(donation.notes) ?? donationId;

  // Resolve game-internal product ID (integer 1-5) from donation_packages
  let gameProductId: number | null = null;
  if (donation.package_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pkgRow } = await (supabase as any)
      .from("donation_packages")
      .select("game_product_id")
      .eq("id", donation.package_id)
      .single();
    gameProductId = pkgRow?.game_product_id ?? null;
  }

  const legacyProduct = String(gameProductId ?? "");
  const legacyUser = String(accountName || donation.account_name || "");
  const legacyPrice = Number(subject.price?.amount ?? donation.amount_paid ?? 0);

  if (payload.type === "payment.declined") {
    await logPayment({ source: "tebex", level: "warn", event: "payment_declined",
      message: `Pago rechazado: ${subject.status?.description ?? "motivo desconocido"}`,
      username: legacyUser || null, product: legacyProduct || null,
      amount: legacyPrice, donation_id: donationId, txn_id: transactionId, basket_ident: basketIdent });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({
        status: "expired",
        tebex_transaction: transactionId,
        notes: `Tebex declined payment (${subject.status?.description ?? "unknown reason"})`,
      })
      .eq("id", donationId);

    try {
      await upsertLegacyPayment({
        versionNum: resolvedVersion,
        userId: legacyUser,
        txn: transactionId,
        product: legacyProduct,
        price: legacyPrice,
        basketIdent,
        status: 0,
      });
    } catch {
      // Legacy table sync should not fail webhook acknowledgment
    }

    return NextResponse.json({ received: true });
  }

  if (payload.type === "payment.refunded") {
    await logPayment({ source: "tebex", level: "warn", event: "payment_refunded",
      message: "Pago reembolsado por Tebex",
      username: legacyUser || null, product: legacyProduct || null,
      amount: legacyPrice, donation_id: donationId, txn_id: transactionId, basket_ident: basketIdent });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({
        status: "refunded",
        tebex_transaction: transactionId,
        notes: "Tebex refunded payment",
      })
      .eq("id", donationId);

    try {
      await upsertLegacyPayment({
        versionNum: resolvedVersion,
        userId: legacyUser,
        txn: transactionId,
        product: legacyProduct,
        price: legacyPrice,
        basketIdent,
        status: 0,
      });
    } catch {
      // Legacy table sync should not fail webhook acknowledgment
    }

    return NextResponse.json({ received: true });
  }

  if (payload.type !== "payment.completed") {
    return NextResponse.json({ received: true });
  }

  if (["credited", "claimed"].includes(donation.status) && donation.tebex_transaction === transactionId) {
    await logPayment({ source: "tebex", level: "info", event: "duplicate_skipped",
      message: `Webhook duplicado ignorado (donation ya en estado '${donation.status}')`,
      username: legacyUser || null, donation_id: donationId, txn_id: transactionId });
    return NextResponse.json({ received: true, duplicate: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("donations")
    .update({
      status: "paid",
      amount_paid: subject.price?.amount ?? donation.amount_paid,
      currency: subject.price?.currency ?? "USD",
      tebex_transaction: transactionId,
    })
    .eq("id", donationId);

  await logPayment({ source: "tebex", level: "info", event: "payment_completed",
    message: `Pago completado: $${legacyPrice} | producto '${legacyProduct}' | v${resolvedVersion}`,
    username: legacyUser || null, product: legacyProduct || null,
    amount: legacyPrice, donation_id: donationId, txn_id: transactionId, basket_ident: basketIdent });

  try {
    // ── DEBUG: obtener config de DB antes de conectar ──
    const { createAdminClient } = await import("@/lib/supabase/server");
    const _supa = await createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: _dbCfg } = await (_supa as any)
      .from("server_config")
      .select(`db_host_v${resolvedVersion === 1 ? "1" : "2"}, db_port_v${resolvedVersion === 1 ? "1" : "2"}`)
      .eq("id", 1)
      .single();
    const _dbHost = _dbCfg?.[`db_host_v${resolvedVersion === 1 ? "1" : "2"}`] ?? "unknown";
    const _dbPort = _dbCfg?.[`db_port_v${resolvedVersion === 1 ? "1" : "2"}`] ?? "unknown";

    await logPayment({ source: "tebex", level: "info", event: "db_connect_attempt",
      message: `Intentando conectar EC2→${_dbHost}:${_dbPort} (v${resolvedVersion}) para insertar en dbb_payments`,
      username: legacyUser || null, donation_id: donationId, txn_id: transactionId,
      metadata: { db_host: _dbHost, db_port: _dbPort, version: resolvedVersion } });

    await upsertLegacyPayment({
      versionNum: resolvedVersion,
      userId: legacyUser,
      txn: transactionId,
      product: legacyProduct,
      price: legacyPrice,
      basketIdent,
      status: 1,
    });

    await logPayment({ source: "tebex", level: "info", event: "db_connect_ok",
      message: `Conexión OK: EC2→${_dbHost}:${_dbPort} | dbb_payments actualizado status=1`,
      username: legacyUser || null, donation_id: donationId, txn_id: transactionId,
      metadata: { db_host: _dbHost, db_port: _dbPort } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({ status: "credited", game_credited_at: new Date().toISOString() })
      .eq("id", donationId);

    await logPayment({ source: "tebex", level: "info", event: "credited",
      message: `CPs acreditados: ${donation.cps_total} CP para '${characterName || donation.character_name}'`,
      username: legacyUser || null, product: legacyProduct || null,
      amount: legacyPrice, donation_id: donationId, txn_id: transactionId,
      metadata: { cps_total: donation.cps_total, character_name: characterName || donation.character_name } });

    // ── Productos adicionales del mismo basket (multi-producto Tebex) ──
    const extraProducts = (subject.products ?? []).filter(
      (p) => String(p.custom) !== String(gameProductId)
    );
    for (const ep of extraProducts) {
      const epProductId = parseInt(String(ep.custom), 10);
      if (!epProductId) continue;
      const paidPrice = ep.paid_price as Record<string, unknown> | undefined;
      const epPrice = Number(paidPrice?.amount ?? 0);
      const epProductStr = String(epProductId);
      try {
        await upsertLegacyPayment({
          versionNum: resolvedVersion,
          userId: legacyUser,
          txn: transactionId,
          product: epProductStr,
          price: epPrice,
          basketIdent,
          status: 1,
        });
        await logPayment({ source: "tebex", level: "info", event: "extra_product_credited",
          message: `Producto extra acreditado: game_product_id=${epProductId} | $${epPrice}`,
          username: legacyUser || null, product: epProductStr,
          amount: epPrice, donation_id: donationId, txn_id: transactionId });
      } catch (epErr: unknown) {
        const epMsg = epErr instanceof Error ? epErr.message : String(epErr);
        await logPayment({ source: "tebex", level: "error", event: "extra_product_error",
          message: `Error acreditando producto extra game_product_id=${epProductId}: ${epMsg}`,
          username: legacyUser || null, donation_id: donationId, txn_id: transactionId });
      }
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await logPayment({ source: "tebex", level: "error", event: "credit_error",
      message: `Error acreditando CPs: ${message}`,
      username: legacyUser || null, product: legacyProduct || null,
      amount: legacyPrice, donation_id: donationId, txn_id: transactionId });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("donations")
      .update({ notes: `Tebex game DB insert failed: ${message}` })
      .eq("id", donationId);
  }

  return NextResponse.json({ received: true });
}