import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function GuidesAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("guides");
  return children;
}