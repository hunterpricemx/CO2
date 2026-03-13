import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function SiteSettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("settings");
  return children;
}
