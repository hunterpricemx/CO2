/**
 * Payment event logger — writes to Supabase `payment_logs` table.
 * Fire-and-forget safe: never throws, never crashes the caller.
 */
import { createClient } from "@supabase/supabase-js";

export type PaymentLogSource = "tebex" | "stripe" | "manual" | "debug";
export type PaymentLogLevel  = "info" | "warn" | "error";

export interface PaymentLogEntry {
  source:       PaymentLogSource;
  level?:       PaymentLogLevel;
  event:        string;
  message:      string;
  username?:    string | null;
  product?:     string | null;
  amount?:      number | null;
  donation_id?: string | null;
  txn_id?:      string | null;
  basket_ident?: string | null;
  metadata?:    Record<string, unknown> | null;
}

export async function logPayment(entry: PaymentLogEntry): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error("[payment-logger] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return;
    }
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await supabase.from("payment_logs").insert({
      source:       entry.source,
      level:        entry.level ?? "info",
      event:        entry.event,
      message:      entry.message,
      username:     entry.username    ?? null,
      product:      entry.product     ?? null,
      amount:       entry.amount      ?? null,
      donation_id:  entry.donation_id ?? null,
      txn_id:       entry.txn_id      ?? null,
      basket_ident: entry.basket_ident ?? null,
      metadata:     entry.metadata    ?? null,
    });
    if (error) {
      console.error("[payment-logger] Insert error:", error.message, error.details, error.hint);
    }
  } catch (e) {
    console.error("[payment-logger] Unexpected error:", e);
  }
}
