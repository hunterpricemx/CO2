import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function NewsAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("news");
  return children;
}
