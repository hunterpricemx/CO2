import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function NewsCategoriesAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("news");
  return children;
}
