import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function GuideCategoriesAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("guides");
  return children;
}