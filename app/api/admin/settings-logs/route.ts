import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentAdminContext } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const source = searchParams.get("source") ?? "all";
  const search = (searchParams.get("search") ?? "").trim();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("settings_logs")
    .select("id, created_at, source, event, message, admin_id, admin_username, setting_key, before_value, after_value, metadata")
    .order("created_at", { ascending: false })
    .limit(500);

  if (source !== "all") query = query.eq("source", source);
  if (search) {
    query = query.or(
      `admin_username.ilike.%${search}%,setting_key.ilike.%${search}%,event.ilike.%${search}%,message.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("[settings-logs/api] Query error:", error.message, error.details, error.hint);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdminContext();
  if (!admin?.permissions?.settings) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const source = typeof b.source === "string" ? b.source.trim() : "";
  const event  = typeof b.event  === "string" ? b.event.trim()  : "";
  const message = typeof b.message === "string" ? b.message.trim() : "";

  if (!source || !event || !message) {
    return NextResponse.json({ error: "source, event y message son requeridos" }, { status: 400 });
  }

  const ALLOWED_SOURCES = ["site_settings", "payment_config", "manual"];
  if (!ALLOWED_SOURCES.includes(source)) {
    return NextResponse.json({ error: "source inválido" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error } = await supabase.from("settings_logs").insert({
    source,
    event,
    message,
    admin_id:       admin.id,
    admin_username: admin.username,
    setting_key:    typeof b.setting_key  === "string" && b.setting_key.trim()  ? b.setting_key.trim()  : null,
    before_value:   typeof b.before_value === "string" && b.before_value.trim() ? b.before_value.trim() : null,
    after_value:    typeof b.after_value  === "string" && b.after_value.trim()  ? b.after_value.trim()  : null,
    metadata:       b.metadata && typeof b.metadata === "object" ? b.metadata : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
