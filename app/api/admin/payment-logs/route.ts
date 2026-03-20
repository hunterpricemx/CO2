import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify admin authentication
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const source = searchParams.get("source") ?? "all";
  const level  = searchParams.get("level")  ?? "all";
  const search = (searchParams.get("search") ?? "").trim();

  // Use service role for admin queries
  const adminSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (adminSupabase as any)
    .from("payment_logs")
    .select("id, created_at, source, level, event, username, product, amount, donation_id, txn_id, basket_ident, message, metadata")
    .order("created_at", { ascending: false })
    .limit(500);

  if (source !== "all") query = query.eq("source", source);
  if (level  !== "all") query = query.eq("level", level);
  if (search) {
    query = query.or(
      `username.ilike.%${search}%,event.ilike.%${search}%,message.ilike.%${search}%,product.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("[payment-logs/api] Query error:", error.message, error.details, error.hint);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
