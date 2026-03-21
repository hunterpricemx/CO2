/**
 * Account action logger — writes to Supabase `account_action_logs` table.
 * Fire-and-forget safe: never throws, never crashes the caller.
 */
import { createClient } from "@supabase/supabase-js";

export type AccountAction = "recovery_sent" | "email_changed";

export interface AccountActionLogEntry {
  admin_id?: string | null;
  admin_username?: string | null;
  action: AccountAction;
  username: string;
  version: 1 | 2;
  before_value?: string | null;
  after_value?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logAccountAction(entry: AccountActionLogEntry): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error("[account-logger] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return;
    }

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await supabase.from("account_action_logs").insert({
      admin_id:       entry.admin_id       ?? null,
      admin_username: entry.admin_username ?? null,
      action:         entry.action,
      username:       entry.username,
      version:        entry.version,
      before_value:   entry.before_value   ?? null,
      after_value:    entry.after_value    ?? null,
      metadata:       entry.metadata       ?? null,
    });

    if (error) {
      console.error("[account-logger] Insert error:", error.message);
    }
  } catch (e) {
    console.error("[account-logger] Unexpected error:", e);
  }
}
