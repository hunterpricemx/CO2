import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function FixCategoriesAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("fixes");
  return children;
}