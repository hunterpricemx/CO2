import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function DonationsAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("donations");
  return children;
}