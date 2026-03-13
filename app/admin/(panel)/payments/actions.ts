"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PaymentConfigData = {
  stripe_enabled:    boolean;
  stripe_mode:       "test" | "live";
  stripe_pk_test:    string;
  stripe_sk_test:    string;
  stripe_pk_live:    string;
  stripe_sk_live:    string;
  tebex_enabled:     boolean;
  tebex_secret:      string;
  tebex_webstore_id: string;
};

export type ActionResult = {
  success: boolean;
  message: string;
};

export async function getPaymentConfig(): Promise<PaymentConfigData | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("server_config")
    .select("stripe_enabled, stripe_mode, stripe_pk_test, stripe_pk_live, tebex_enabled, tebex_webstore_id")
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
    tebex_webstore_id: d.tebex_webstore_id ?? "",
  };
}

export async function getPaymentConfigHasSecrets(): Promise<{ has_stripe_sk_test: boolean; has_stripe_sk_live: boolean; has_tebex_secret: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("server_config")
    .select("stripe_sk_test, stripe_sk_live, tebex_secret")
    .eq("id", 1)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return {
    has_stripe_sk_test: !!d?.stripe_sk_test,
    has_stripe_sk_live: !!d?.stripe_sk_live,
    has_tebex_secret:   !!d?.tebex_secret,
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

export async function getSecretValues(): Promise<{ stripe_sk_test: string; stripe_sk_live: string; tebex_secret: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("server_config")
    .select("stripe_sk_test, stripe_sk_live, tebex_secret")
    .eq("id", 1)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return {
    stripe_sk_test: d?.stripe_sk_test ?? "",
    stripe_sk_live: d?.stripe_sk_live ?? "",
    tebex_secret:   d?.tebex_secret   ?? "",
  };
}

export async function savePaymentConfig(config: PaymentConfigData): Promise<ActionResult> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    id:                1,
    stripe_enabled:    config.stripe_enabled,
    stripe_mode:       config.stripe_mode,
    stripe_pk_test:    config.stripe_pk_test,
    stripe_pk_live:    config.stripe_pk_live,
    tebex_enabled:     config.tebex_enabled,
    tebex_webstore_id: config.tebex_webstore_id,
    updated_at:        new Date().toISOString(),
  };

  // Only update secret keys if the user typed a new value
  if (config.stripe_sk_test.trim() !== "") payload.stripe_sk_test = config.stripe_sk_test;
  if (config.stripe_sk_live.trim() !== "") payload.stripe_sk_live = config.stripe_sk_live;
  if (config.tebex_secret.trim()   !== "") payload.tebex_secret   = config.tebex_secret;

  const { error } = await supabase.from("server_config").upsert(payload);
  if (error) return { success: false, message: error.message };

  revalidatePath("/admin/payments");
  return { success: true, message: "Configuración de pagos guardada." };
}
