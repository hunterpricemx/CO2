import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function DownloadsAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("downloads");
  return children;
}
