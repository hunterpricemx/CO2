import { redirect } from "next/navigation";

// /admin → redirect to dashboard inside (panel) route group
export default function AdminRootPage() {
  redirect("/admin/dashboard");
}
