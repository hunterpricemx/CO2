"use server";
/**
 * Tickets Module — Queries (Supabase)
 */

import { createAdminClient } from "@/lib/supabase/server";
import type { Ticket, TicketFilters, TicketsPage, TicketMessage } from "./types";

const PAGE_SIZE = 20;

export async function getTicketsForAdmin(filters: TicketFilters = {}): Promise<TicketsPage> {
  const supabase = await createAdminClient();
  const page     = Math.max(1, filters.page     ?? 1);
  const pageSize = Math.max(1, filters.pageSize ?? PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("tickets")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filters.status   && filters.status   !== "all") query = query.eq("status",   filters.status);
  if (filters.priority && filters.priority !== "all") query = query.eq("priority", filters.priority);
  if (filters.category && filters.category !== "all") query = query.eq("category", filters.category);
  if (filters.version  && filters.version  !== "all") query = query.eq("version",  filters.version);
  if (filters.search?.trim()) {
    query = query.or(`title.ilike.%${filters.search.trim()}%,player_username.ilike.%${filters.search.trim()}%`);
  }

  const { data, count, error } = await query;
  if (error) return { data: [], total: 0, page, pageSize, totalPages: 0 };

  const total      = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  return { data: (data ?? []) as Ticket[], total, page, pageSize, totalPages };
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase.from("tickets").select("*").eq("id", id).single();
  return (data as unknown as Ticket) ?? null;
}

export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as TicketMessage[];
}

export async function getMyTickets(playerUsername: string): Promise<Ticket[]> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("tickets")
    .select("*")
    .eq("player_username", playerUsername)
    .order("updated_at", { ascending: false });
  return (data ?? []) as unknown as Ticket[];
}

export async function getOpenTicketsCount(): Promise<number> {
  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}
