import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function EventsAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("events");
  return children;
}