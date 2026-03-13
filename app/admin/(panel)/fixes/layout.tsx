import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function FixesAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("fixes");
  return children;
}