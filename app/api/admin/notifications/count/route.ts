import { NextResponse } from "next/server";
import { getCurrentAdminContext } from "@/lib/admin/auth";
import { getOpenTicketsCount } from "@/modules/tickets/queries";

export async function GET() {
  const admin = await getCurrentAdminContext();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const open = await getOpenTicketsCount();
  return NextResponse.json({ open });
}
