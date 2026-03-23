import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function TicketsAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPanelAccess("tickets");
  return <>{children}</>;
}
