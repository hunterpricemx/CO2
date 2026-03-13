import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function PaymentsAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("payments");
  return children;
}
