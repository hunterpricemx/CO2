import { requireAdminPanelAccess } from "@/lib/admin/auth";
import { getUsersForAdmin } from "@/modules/users/queries";
import { AdminUsersManager } from "./AdminUsersManager";

const SUPER_ADMIN_EMAIL = "mariano@hunterprice.mx";

export default async function AdminUsersPage() {
  const currentAdmin = await requireAdminPanelAccess("users");
  const admins = await getUsersForAdmin({ role: "admin" });

  return (
    <AdminUsersManager
      admins={admins}
      currentAdminId={currentAdmin.id}
      isSuperAdmin={currentAdmin.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL}
    />
  );
}
