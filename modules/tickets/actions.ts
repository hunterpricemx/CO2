"use server";
/**
 * Tickets Module -- Server Actions
 */

import { revalidatePath }         from "next/cache";
import { createAdminClient }      from "@/lib/supabase/server";
import { getCurrentAdminContext }  from "@/lib/admin/auth";
import { getGameSession }          from "@/lib/session";
import { sendGenericMail }         from "@/lib/mailer";
import type { ActionResult }       from "@/types";
import type { TicketStatus, TicketPriority, TicketMessage } from "./types";

// -- helpers --

async function getSupportEmail(): Promise<string | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return null;
    const res = await fetch(
      `${supabaseUrl}/rest/v1/site_settings?select=value&key=eq.support_notification_email`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { value?: string }[];
    return rows[0]?.value?.trim() || null;
  } catch {
    return null;
  }
}

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

/** Return the current game-session player identity (no Supabase profile needed). */
async function getPlayerProfile(): Promise<{ username: string } | null> {
  const session = await getGameSession();
  if (!session) return null;
  return { username: session.username };
}

// -- Public: player creates a ticket --

export async function createTicketAction(input: {
  title:           string;
  description:     string;
  category:        string;
  priority:        string;
  version:         string | null;
  evidence_url:    string | null;
  attachment_urls?: string[];
}): Promise<ActionResult<{ id: string }>> {
  const profile = await getPlayerProfile();
  if (!profile) return { success: false, error: "Debes iniciar sesión para crear un ticket." };

  const title       = input.title.trim();
  const description = input.description.trim();
  if (!title || !description) return { success: false, error: "Título y descripción son requeridos." };

  const ALLOWED_CATEGORIES = ["account", "payment", "bug", "other"];
  const ALLOWED_PRIORITIES = ["low", "medium", "high", "critical"];
  if (!ALLOWED_CATEGORIES.includes(input.category)) return { success: false, error: "Categoría inválida." };
  if (!ALLOWED_PRIORITIES.includes(input.priority))  return { success: false, error: "Prioridad inválida." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (await createAdminClient() as any)
    .from("tickets")
    .insert({
      player_id:       null,
      player_username: profile.username,
      title,
      description,
      status:          "open",
      priority:        input.priority,
      category:        input.category,
      version:         input.version || null,
      evidence_url:    input.evidence_url?.trim() || null,
      attachment_urls: input.attachment_urls ?? [],
    })
    .select("id, ticket_number")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Error creando ticket." };

  void getSupportEmail().then(async (to) => {
    if (!to) return;
    const base       = getBaseUrl();
    const newTicket  = data as { id: string; ticket_number?: number };
    const ticketRef  = newTicket.ticket_number != null
      ? `#${String(newTicket.ticket_number).padStart(4, "0")}`
      : "";
    const adminUrl   = `${base}/admin/tickets/${newTicket.id}`;
    const CATEGORY_LABELS: Record<string, string> = {
      account: "Cuenta", payment: "Pago", bug: "Bug", other: "Otro",
    };
    const PRIORITY_LABELS: Record<string, string> = {
      low: "Baja", medium: "Media", high: "Alta", critical: "Crítica",
    };
    await sendGenericMail({
      to,
      subject: `[Soporte] Ticket nuevo ${ticketRef} — ${title}`,
      text:    `Usuario: ${profile.username as string}\nCategoría: ${CATEGORY_LABELS[input.category] ?? input.category} | Prioridad: ${PRIORITY_LABELS[input.priority] ?? input.priority}\nTítulo: ${title}\n\n${description}\n\nVer en el panel:\n${adminUrl}`,
      html:    `<table style="font-family:sans-serif;font-size:14px;color:#333;border-collapse:collapse;width:100%"><tr><td style="padding:4px 8px;font-weight:bold;color:#888">Usuario</td><td style="padding:4px 8px">${profile.username as string}</td></tr><tr><td style="padding:4px 8px;font-weight:bold;color:#888">Categoría</td><td style="padding:4px 8px">${CATEGORY_LABELS[input.category] ?? input.category}</td></tr><tr><td style="padding:4px 8px;font-weight:bold;color:#888">Prioridad</td><td style="padding:4px 8px">${PRIORITY_LABELS[input.priority] ?? input.priority}</td></tr><tr><td style="padding:4px 8px;font-weight:bold;color:#888">Título</td><td style="padding:4px 8px">${title}</td></tr></table><hr style="margin:12px 0;border:none;border-top:1px solid #eee"/><p style="color:#555;white-space:pre-wrap">${description.replace(/\n/g, "<br>")}</p><p style="margin-top:20px"><a href="${adminUrl}" style="background:#f39c12;color:#000;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Ver ticket en el panel →</a></p>`,
    });
  });

  revalidatePath("/admin/tickets");
  return { success: true, data: { id: (data as { id: string }).id } };
}

// -- Player/Admin: post a message --

export async function postTicketMessageAction(input: {
  ticketId:         string;
  body:             string;
  attachment_urls?: string[];
}): Promise<ActionResult> {
  const profile = await getPlayerProfile();
  if (!profile) return { success: false, error: "No autenticado." };

  const body = input.body.trim();
  if (!body) return { success: false, error: "El mensaje no puede estar vacío." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ticket } = await (supabase as any)
    .from("tickets")
    .select("id, ticket_number, title, version, player_username, status")
    .eq("id", input.ticketId)
    .single() as { data: { id: string; ticket_number: number; title: string; version: string | null; player_username: string; status: string } | null };

  if (!ticket) return { success: false, error: "Ticket no encontrado." };
  if (ticket.status === "closed") return { success: false, error: "No puedes responder a un ticket cerrado." };

  const isOwner = ticket.player_username === profile.username;
  // Game-session users are always players in this context
  const isAdmin = false;
  if (!isOwner && !isAdmin) return { success: false, error: "Sin permiso para responder este ticket." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("ticket_messages").insert({
    ticket_id:       input.ticketId,
    sender_id:       null,
    sender_username: profile.username,
    sender_role:     isAdmin ? "admin" : "player",
    body,
    attachment_urls: input.attachment_urls ?? [],
  });

  if (error) return { success: false, error: error.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("tickets").update({
    updated_at: new Date().toISOString(),
    ...(isAdmin && ticket.status === "open" ? { status: "in_progress" } : {}),
  }).eq("id", input.ticketId);

  // If admin replied → notify player; if player replied → notify support
  if (isAdmin) {
    void (async () => {
      try {
        // Look up player email from game DB via username (best-effort)
        // For now, skip email to player since game accounts don't have Supabase profiles
        void ticket.player_username; // acknowledged
      } catch { /* swallow */ }
    })();
  } else {
    // Player replied → notify support
    void (async () => {
      try {
        const to = await getSupportEmail();
        if (!to) return;
        const base      = getBaseUrl();
        const ticketRef = `#${String(ticket.ticket_number).padStart(4, "0")}`;
        const adminUrl  = `${base}/admin/tickets/${ticket.id}`;
        await sendGenericMail({
          to,
          subject: `[Soporte] Respuesta de jugador en ${ticketRef} — ${ticket.title}`,
          text:    `El jugador ${profile.username as string} ha respondido en el ticket ${ticketRef}: "${ticket.title}".\n\nMensaje:\n${body}\n\nVer en el panel:\n${adminUrl}`,
          html:    `<p>El jugador <strong>${profile.username as string}</strong> ha respondido en el ticket <strong>${ticketRef}</strong>: <em>${ticket.title}</em>.</p><blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555;margin:12px 0">${body.replace(/\n/g, "<br>")}</blockquote><p style="margin-top:16px"><a href="${adminUrl}" style="background:#f39c12;color:#000;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:bold">Ver ticket en el panel →</a></p>`,
        });
      } catch { /* swallow */ }
    })();
  }

  revalidatePath(`/admin/tickets/${input.ticketId}`);
  return { success: true, data: undefined };
}

// -- Admin: post a message as support --

export async function postAdminTicketMessageAction(input: {
  ticketId:         string;
  body:             string;
  attachment_urls?: string[];
}): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin?.permissions.tickets) return { success: false, error: "Sin permiso." };

  const body = input.body.trim();
  if (!body) return { success: false, error: "El mensaje no puede estar vacío." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ticket } = await (supabase as any)
    .from("tickets")
    .select("id, ticket_number, title, status")
    .eq("id", input.ticketId)
    .single() as { data: { id: string; ticket_number: number; title: string; status: string } | null };

  if (!ticket) return { success: false, error: "Ticket no encontrado." };
  if (ticket.status === "closed") return { success: false, error: "No puedes responder a un ticket cerrado." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("ticket_messages").insert({
    ticket_id:       input.ticketId,
    sender_id:       admin.id,   // required by RLS: auth.uid() = sender_id
    sender_username: "Soporte",
    sender_role:     "admin",
    body,
    attachment_urls: input.attachment_urls ?? [],
  });

  if (error) return { success: false, error: (error as { message: string }).message };

  // Auto-transition open ticket to in_progress on first admin reply
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("tickets").update({
    updated_at: new Date().toISOString(),
    ...(ticket.status === "open" ? { status: "in_progress" } : {}),
  }).eq("id", input.ticketId);

  revalidatePath(`/admin/tickets/${input.ticketId}`);
  revalidatePath("/admin/tickets");
  return { success: true, data: undefined };
}

// -- Admin: update ticket status --

export async function updateTicketStatusAction(
  ticketId: string,
  status: TicketStatus,
): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin?.permissions.tickets) return { success: false, error: "Sin permiso." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("tickets")
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...(status === "closed" ? { closed_at: new Date().toISOString() } : {}),
    })
    .eq("id", ticketId);

  if (error) return { success: false, error: (error as { message: string }).message };

  // Notify player about status change
  void (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ticket } = await (supabase as any)
        .from("tickets")
        .select("ticket_number, title, version, player_id")
        .eq("id", ticketId)
        .single() as { data: { ticket_number: number; title: string; version: string | null; player_id: string } | null };
      if (!ticket) return;

      const { data: playerProfile } = await supabase
        .from("profiles")
        .select("email, username")
        .eq("id", ticket.player_id)
        .single() as { data: { email: string; username: string } | null };
      if (!playerProfile?.email) return;

      const STATUS_LABELS: Record<string, string> = {
        open: "Abierto", in_progress: "En progreso", resolved: "Resuelto", closed: "Cerrado",
      };
      const base       = getBaseUrl();
      const ticketRef  = `#${String(ticket.ticket_number).padStart(4, "0")}`;
      const ver        = ticket.version ?? "1.0";
      const playerUrl  = `${base}/es/${ver}/tickets/${ticketId}`;
      const statusLabel = STATUS_LABELS[status] ?? status;

      await sendGenericMail({
        to:      playerProfile.email,
        subject: `[Soporte] Ticket ${ticketRef} ahora está "${statusLabel}"`,
        text:    `Hola ${playerProfile.username},\n\nEl estado de tu ticket ${ticketRef}: "${ticket.title}" ha cambiado a: ${statusLabel}.\n\nVer ticket:\n${playerUrl}`,
        html:    `<p>Hola <strong>${playerProfile.username}</strong>,</p><p>El estado de tu ticket <strong>${ticketRef}</strong>: <em>${ticket.title}</em> ha cambiado a: <strong>${statusLabel}</strong>.</p><p style="margin-top:16px"><a href="${playerUrl}" style="background:#f39c12;color:#000;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:bold">Ver mi ticket →</a></p>`,
      });
    } catch { /* swallow */ }
  })();

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  return { success: true, data: undefined };
}

// -- Admin: update ticket priority --

export async function updateTicketPriorityAction(
  ticketId: string,
  priority: TicketPriority,
): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin?.permissions.tickets) return { success: false, error: "Sin permiso." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("tickets")
    .update({ priority, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { success: false, error: (error as { message: string }).message };
  revalidatePath(`/admin/tickets/${ticketId}`);
  return { success: true, data: undefined };
}

// -- Admin: delete ticket --

export async function deleteTicketAction(ticketId: string): Promise<ActionResult> {
  const admin = await getCurrentAdminContext();
  if (!admin?.permissions.tickets) return { success: false, error: "Sin permiso." };
  if (!ticketId) return { success: false, error: "ID de ticket inválido." };

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("tickets")
    .delete()
    .eq("id", ticketId)
    .select("id");

  if (error) {
    console.error("[deleteTicketAction] Supabase error:", error);
    return { success: false, error: (error as { message: string }).message };
  }
  if (!data || (Array.isArray(data) && data.length === 0)) {
    console.error("[deleteTicketAction] No rows deleted for id:", ticketId);
    return { success: false, error: "No se pudo eliminar el ticket. Intenta de nuevo." };
  }

  revalidatePath("/admin/tickets");
  return { success: true, data: undefined };
}

// -- Admin: fetch messages callable from client --

export async function getTicketMessagesAction(ticketId: string): Promise<TicketMessage[]> {
  const admin = await getCurrentAdminContext();
  if (!admin) return [];
  const { getTicketMessages } = await import("./queries");
  return getTicketMessages(ticketId);
}
