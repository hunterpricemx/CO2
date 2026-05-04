import { FolderTree } from "lucide-react";
import Link from "next/link";
import { requireAdminPanelAccess } from "@/lib/admin/auth";
import { getScreenshotCategories } from "@/modules/screenshots";
import { CategoriesClient } from "./CategoriesClient";

export const metadata = { title: "Categorías de Screenshots — Admin" };
export const dynamic = "force-dynamic";

export default async function ScreenshotCategoriesPage() {
  await requireAdminPanelAccess("screenshots");
  const categories = await getScreenshotCategories();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FolderTree className="h-6 w-6 text-[#f39c12]" />
          <div>
            <h1 className="text-2xl font-bebas tracking-widest text-white">Categorías de Screenshots</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Edita los nombres multilingual y el orden. {categories.length} categorías.
            </p>
          </div>
        </div>
        <Link
          href="/admin/screenshots"
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
        >
          ← Volver a Screenshots
        </Link>
      </div>
      <CategoriesClient initial={categories} />
    </div>
  );
}
