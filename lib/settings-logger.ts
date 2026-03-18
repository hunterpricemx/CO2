/**
 * Settings audit logger — writes to Supabase `settings_logs` table.
 * Fire-and-forget safe: never throws, never crashes the caller.
 */
import { createClient } from "@supabase/supabase-js";

export type SettingsLogSource = "site_settings" | "payment_config";

export interface SettingsLogEntry {
  source: SettingsLogSource;
  event: string;
  message: string;
  admin_id?: string | null;
  admin_username?: string | null;
  key?: string | null;
  before_value?: string | null;
  after_value?: string | null;
  metadata?: Record<string, unknown> | null;
}

function redactIfSensitive(key: string, value: string | null | undefined): string | null {
  if (value == null) return null;

  const normalizedKey = key.toLowerCase();
  const isSensitive =
    normalizedKey.includes("secret") ||
    normalizedKey.includes("token") ||
    normalizedKey.includes("password") ||
    normalizedKey.includes("api_key") ||
    normalizedKey.includes("script_head") ||
    normalizedKey.includes("script_footer") ||
    normalizedKey.includes("stripe_sk") ||
    normalizedKey.includes("tebex_secret") ||
    normalizedKey.includes("webhook_secret");

  if (isSensitive) {
    return `[redacted length=${value.length}]`;
  }

  if (value.length > 220) {
    return `${value.slice(0, 220)}...[truncated ${value.length - 220} chars]`;
  }

  return value;
}

export async function logSettingChange(entry: SettingsLogEntry): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error("[settings-logger] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return;
    }

    const settingKey = entry.key ?? null;
    const beforeValue = settingKey ? redactIfSensitive(settingKey, entry.before_value) : (entry.before_value ?? null);
    const afterValue = settingKey ? redactIfSensitive(settingKey, entry.after_value) : (entry.after_value ?? null);

    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await supabase.from("settings_logs").insert({
      source: entry.source,
      event: entry.event,
      message: entry.message,
      admin_id: entry.admin_id ?? null,
      admin_username: entry.admin_username ?? null,
      setting_key: settingKey,
      before_value: beforeValue,
      after_value: afterValue,
      metadata: entry.metadata ?? null,
    });

    if (error) {
      console.error("[settings-logger] Insert error:", error.message, error.details, error.hint);
    }
  } catch (e) {
    console.error("[settings-logger] Unexpected error:", e);
  }
}
