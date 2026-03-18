import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getCurrentAdminContext } from "@/lib/admin/auth";
import { logSettingChange } from "@/lib/settings-logger";

export async function POST(request: Request) {
  const admin = await getCurrentAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as Record<string, unknown>).entries)
  ) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const entries = (body as { entries: { key: string; value: string }[] }).entries;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const validEntries = entries.filter(
    (entry): entry is { key: string; value: string } =>
      typeof entry?.key === "string" && typeof entry?.value === "string",
  );

  const previousValues = new Map<string, string>();
  for (const entry of validEntries) {
    const keyQuery = encodeURIComponent(entry.key);
    const currentRes = await fetch(`${supabaseUrl}/rest/v1/site_settings?select=value&key=eq.${keyQuery}`, {
      method: "GET",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
      },
      cache: "no-store",
    });

    if (!currentRes.ok) continue;

    const currentRows = (await currentRes.json()) as Array<{ value?: string | null }>;
    const currentValue = currentRows[0]?.value;
    if (typeof currentValue === "string") {
      previousValues.set(entry.key, currentValue);
    }
  }

  const errors: string[] = [];
  for (const entry of entries) {
    if (typeof entry.key !== "string" || typeof entry.value !== "string") continue;

    const res = await fetch(`${supabaseUrl}/rest/v1/site_settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        // upsert: si la key ya existe, actualiza el value
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ key: entry.key, value: entry.value }),
    });

    if (!res.ok) {
      const text = await res.text();
      errors.push(`${entry.key}: ${text}`);
      continue;
    }

    const previousValue = previousValues.get(entry.key) ?? null;
    const changed = previousValue !== entry.value;

    if (changed) {
      await logSettingChange({
        source: "site_settings",
        event: "setting_updated",
        message: `Ajuste actualizado: ${entry.key}`,
        admin_id: admin.id,
        admin_username: admin.username,
        key: entry.key,
        before_value: previousValue,
        after_value: entry.value,
        metadata: {
          route: "/api/admin/settings",
        },
      });
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (revalidateTag as any)("site-settings");
  return NextResponse.json({ ok: true });
}
