import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function GameServerAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("gameServer");
  return children;
}