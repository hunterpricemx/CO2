import Link from "next/link";
import { Camera, Plus, FolderTree } from "lucide-react";
import { requireAdminPanelAccess } from "@/lib/admin/auth";
import { getAdminScreenshots, getScreenshotCategories } from "@/modules/screenshots";
import { AdminScreenshotsClient } from "./AdminScreenshotsClient";

export const metadata = { title: "Screenshots — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminScreenshotsPage() {
  await requireAdminPanelAccess("screenshots");

  const [{ rows, total }, categories] = await Promise.all([
    getAdminScreenshots({ pageSize: 100 }),
    getScreenshotCategories(),
  ]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Camera className="h-6 w-6 text-[#f39c12]" />
          <div>
            <h1 className="text-2xl font-bebas tracking-widest text-white">Screenshots</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Galería pública de imágenes para v1.0 y v2.0. {total.toLocaleString("es")} registradas.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/screenshot-categories"
            className="text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <FolderTree className="h-3.5 w-3.5" />
            Categorías
          </Link>
          <Link
            href="/admin/screenshots/create"
            className="text-xs px-3 py-2 rounded-lg bg-[rgba(243,156,18,0.15)] border border-[rgba(243,156,18,0.3)] text-[#f39c12] hover:bg-[rgba(243,156,18,0.25)] transition-colors flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo screenshot
          </Link>
        </div>
      </div>

      <AdminScreenshotsClient initialRows={rows} categories={categories} />
    </div>
  );
}
