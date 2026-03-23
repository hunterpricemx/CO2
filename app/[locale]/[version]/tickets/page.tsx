import { redirect } from "next/navigation";
import Link from "next/link";
import { TicketCheck, Plus } from "lucide-react";
import { getGameSession } from "@/lib/session";
import { getSiteSettings } from "@/lib/site-settings";
import { getMyTickets } from "@/modules/tickets/queries";
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_CATEGORY_LABELS,
} from "@/modules/tickets/types";

export const metadata = { title: "Mis Tickets de Soporte" };

export default async function PlayerTicketsPage({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}) {
  const { locale, version } = await params;
  const gameSession = await getGameSession();
  if (!gameSession) redirect(`/${locale}/${version}/login`);

  const settings = await getSiteSettings();
  if (!settings.tickets_enabled) redirect(locale === "es" ? `/${version}` : `/${locale}/${version}`);

  const tickets = await getMyTickets(gameSession.username);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-4xl tracking-wider text-white">Mis Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} enviados
          </p>
        </div>
        <Link
          href={`/${locale}/${version}/tickets/new`}
          className="flex items-center gap-2 px-4 py-2 bg-[#f39c12] hover:bg-[#e67e22] text-black text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo ticket
        </Link>
      </div>

      {/* List */}
      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[rgba(15,5,3,0.7)] border border-[rgba(255,215,0,0.08)] rounded-2xl">
          <TicketCheck className="h-12 w-12 text-gray-700" />
          <p className="text-gray-500 text-sm">No has enviado ningún ticket aún.</p>
          <Link
            href={`/${locale}/${version}/tickets/new`}
            className="text-sm text-[#f39c12] hover:underline"
          >
            Crear mi primer ticket →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/${locale}/${version}/tickets/${ticket.id}`}
              className="block bg-[rgba(15,5,3,0.7)] border border-[rgba(255,215,0,0.08)] hover:border-[rgba(255,215,0,0.2)] rounded-2xl p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium line-clamp-1">
                    {ticket.ticket_number != null && (
                      <span className="text-[#f39c12] font-mono text-xs mr-1.5">
                        #{String(ticket.ticket_number).padStart(4, "0")}
                      </span>
                    )}
                    {ticket.title}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{ticket.description}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${TICKET_STATUS_COLORS[ticket.status]}`}>
                    {TICKET_STATUS_LABELS[ticket.status]}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${TICKET_PRIORITY_COLORS[ticket.priority]}`}>
                    {TICKET_PRIORITY_LABELS[ticket.priority]}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                <span>{TICKET_CATEGORY_LABELS[ticket.category]}</span>
                <span>·</span>
                <span>
                  {new Date(ticket.updated_at).toLocaleDateString("es-MX", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
