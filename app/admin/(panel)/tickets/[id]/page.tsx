import { notFound } from "next/navigation";
import { getTicketById, getTicketMessages } from "@/modules/tickets/queries";
import TicketDetailPanel from "@/components/admin/TicketDetailPanel";

export const metadata = { title: "Ticket de Soporte" };

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ticket, messages] = await Promise.all([
    getTicketById(id),
    getTicketMessages(id),
  ]);

  if (!ticket) notFound();

  return <TicketDetailPanel ticket={ticket} initialMessages={messages} />;
}
