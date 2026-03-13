import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getCurrentAdminContext } from "@/lib/admin/auth";

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
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (revalidateTag as any)("site-settings");
  return NextResponse.json({ ok: true });
}
