import { requireAdminPanelAccess } from "@/lib/admin/auth";
import { getUsersForAdmin } from "@/modules/users/queries";
import { AdminUsersManager } from "./AdminUsersManager";

export default async function AdminUsersPage() {
  await requireAdminPanelAccess("users");
  const admins = await getUsersForAdmin({ role: "admin" });

  return <AdminUsersManager admins={admins} />;
}
