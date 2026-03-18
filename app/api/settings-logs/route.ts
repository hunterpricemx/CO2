import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type PublicSettingsLog = {
  id: string;
  created_at: string;
  source: string;
  summary: string;
};

function getPublicSummary(source: string): string {
  if (source === "payment_config") {
    return "Se actualizo la configuracion de pagos para mejorar estabilidad y experiencia.";
  }
  return "Se actualizaron ajustes generales del sitio para mejorar el servicio.";
}

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
    .select("id, created_at, source")
    .order("created_at", { ascending: false })
    .limit(500);

  if (source !== "all") query = query.eq("source", source);

  const { data, error } = await query;
  if (error) {
    console.error("[settings-logs/public-api] Query error:", error.message, error.details, error.hint);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = ((data ?? []) as Array<{ id: string; created_at: string; source: string }>);
  const safeRows: PublicSettingsLog[] = rows.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    source: row.source,
    summary: getPublicSummary(row.source),
  }));

  const q = search.toLowerCase();
  const filtered = !q
    ? safeRows
    : safeRows.filter((row) => row.summary.toLowerCase().includes(q) || row.source.toLowerCase().includes(q));

  return NextResponse.json(filtered);
}
