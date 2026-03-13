import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function UsersAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("users");
  return children;
}