import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getGameSession } from "@/lib/session";
import { getSiteSettings } from "@/lib/site-settings";
import { getTicketById, getTicketMessages } from "@/modules/tickets/queries";
import { PlayerTicketThread } from "./PlayerTicketThread";

export const metadata = { title: "Ticket de Soporte" };

export default async function PlayerTicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; version: string; id: string }>;
}) {
  const { locale, version, id } = await params;
  const gameSession = await getGameSession();
  if (!gameSession) redirect(`/${locale}/${version}/login`);

  const settings = await getSiteSettings();
  if (!settings.tickets_enabled) redirect(locale === "es" ? `/${version}` : `/${locale}/${version}`);

  const [ticket, messages] = await Promise.all([
    getTicketById(id),
    getTicketMessages(id),
  ]);

  if (!ticket) notFound();
  // Only the owner can view their ticket
  if (ticket.player_username !== gameSession.username) notFound();

  const playerUsername = gameSession.username;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href={`/${locale}/${version}/tickets`}
          className="mt-1 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-bebas text-3xl tracking-wider text-white leading-tight">{ticket.title}</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            {ticket.ticket_number != null ? `#${String(ticket.ticket_number).padStart(4, "0")}` : `#${ticket.id.slice(0, 8)}`} ·{" "}
            {new Date(ticket.created_at).toLocaleDateString("es-MX", {
              day: "2-digit", month: "long", year: "numeric",
            })}
          </p>
        </div>
      </div>

      <PlayerTicketThread ticket={ticket} initialMessages={messages} playerUsername={playerUsername} />
    </div>
  );
}
