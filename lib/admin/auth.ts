import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_ADMIN_PANEL_PERMISSIONS,
  hasPanelAccess,
  normalizePanelPermissions,
  type AdminPanelPermission,
  type PanelPermissions,
} from "./permissions";

export type CurrentAdminContext = {
  id: string;
  email: string;
  username: string;
  role: "admin" | "player";
  permissions: PanelPermissions;
};

export async function getCurrentAdminContext(): Promise<CurrentAdminContext | null> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, username, role, panel_permissions")
    .eq("id", authData.user.id)
    .single();

  if (!profile || profile.role !== "admin") return null;

  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    role: profile.role,
    permissions: normalizePanelPermissions(
      profile.panel_permissions,
      DEFAULT_ADMIN_PANEL_PERMISSIONS,
    ),
  };
}

export async function requireAdminPanelAccess(panel: AdminPanelPermission) {
  const admin = await getCurrentAdminContext();

  if (!admin) redirect("/admin/login");
  if (!hasPanelAccess(admin.permissions, panel)) redirect("/admin");

  return admin;
}