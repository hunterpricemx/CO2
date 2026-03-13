import type { Metadata } from "next";
import { RefineProvider } from "./_provider/RefineProvider";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Conquer Classic Plus" };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RefineProvider>{children}</RefineProvider>;
}
