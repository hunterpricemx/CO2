import { AdminShell } from "../_components/AdminShell";

export default function AdminInnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
