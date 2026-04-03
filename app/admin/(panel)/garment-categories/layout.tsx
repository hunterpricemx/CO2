import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function GarmentCategoriesAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("garments");
  return children;
}
