import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
    .select("id, created_at, source, event, message, admin_username, setting_key, before_value, after_value, metadata")
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
    console.error("[settings-logs/public-api] Query error:", error.message, error.details, error.hint);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
