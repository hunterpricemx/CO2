import { getTicketsForAdmin } from "@/modules/tickets/queries";
import type { TicketStatus, TicketPriority, TicketCategory } from "@/modules/tickets/types";
import TicketsManager from "@/components/admin/TicketsManager";

export const metadata = { title: "Tickets de Soporte" };

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page     = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const status   = (sp.status   ?? "all") as TicketStatus | "all";
  const priority = (sp.priority ?? "all") as TicketPriority | "all";
  const category = (sp.category ?? "all") as TicketCategory | "all";
  const version  = sp.version  ?? "all";
  const search   = sp.search   ?? "";

  const ticketsPage = await getTicketsForAdmin({ page, status, priority, category, version, search });

  return (
    <TicketsManager
      initialData={ticketsPage}
      currentFilters={{ page, status, priority, category, version, search }}
    />
  );
}
