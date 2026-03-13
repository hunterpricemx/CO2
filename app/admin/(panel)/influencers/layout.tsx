import { requireAdminPanelAccess } from "@/lib/admin/auth";

export default async function InfluencersAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelAccess("influencers");
  return children;
}
