import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getGameSession } from "@/lib/session";


export type TicketNotification = {
  ticketId:      string;
  ticketTitle:   string;
  lastBody:      string;
  lastAt:        string;
};

export type UnreadCountResponse = {
  count:         number;
  notifications: TicketNotification[];
};

/**
 * GET /api/player/tickets/unread-count
 *
 * Returns the player's tickets where the latest message was sent
 * by an admin (awaiting player reply), with a preview of each.
 */
export async function GET() {
  const gameSession = await getGameSession();
  if (!gameSession) return NextResponse.json<UnreadCountResponse>({ count: 0, notifications: [] });

  const supabase = await createAdminClient();

  // Tickets owned by this player (identified by game username)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tickets } = await (supabase as any)
    .from("tickets")
    .select("id, title")
    .eq("player_username", gameSession.username)
    .neq("status", "closed") as { data: { id: string; title: string }[] | null };

  if (!tickets || tickets.length === 0)
    return NextResponse.json<UnreadCountResponse>({ count: 0, notifications: [] });

  const ticketIds = tickets.map((t) => t.id);
  const titleById = Object.fromEntries(tickets.map((t) => [t.id, t.title]));

  // Latest message per ticket
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages } = await (supabase as any)
    .from("ticket_messages")
    .select("ticket_id, sender_role, body, created_at")
    .in("ticket_id", ticketIds)
    .order("created_at", { ascending: false }) as {
      data: { ticket_id: string; sender_role: string; body: string; created_at: string }[] | null;
    };

  if (!messages) return NextResponse.json<UnreadCountResponse>({ count: 0, notifications: [] });

  // Keep only the first (most-recent) message per ticket
  const latestByTicket = new Map<string, { sender_role: string; body: string; created_at: string }>();
  for (const msg of messages) {
    if (!latestByTicket.has(msg.ticket_id)) {
      latestByTicket.set(msg.ticket_id, { sender_role: msg.sender_role, body: msg.body, created_at: msg.created_at });
    }
  }

  const notifications: TicketNotification[] = [];
  for (const [ticketId, latest] of latestByTicket.entries()) {
    if (latest.sender_role === "admin") {
      notifications.push({
        ticketId,
        ticketTitle: titleById[ticketId] ?? "Ticket",
        lastBody:    latest.body.length > 80 ? latest.body.slice(0, 80) + "…" : latest.body,
        lastAt:      latest.created_at,
      });
    }
  }

  // Sort newest first
  notifications.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  return NextResponse.json<UnreadCountResponse>({ count: notifications.length, notifications });
}
