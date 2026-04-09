import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function MarketPurchasesAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("donations");
  return children;
}
