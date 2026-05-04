import { Camera } from "lucide-react";
import { requireAdminPanelAccess } from "@/lib/admin/auth";
import { getScreenshotCategories } from "@/modules/screenshots";
import { ScreenshotForm } from "../ScreenshotForm";

export const metadata = { title: "Nuevo screenshot — Admin" };

export default async function CreateScreenshotPage() {
  await requireAdminPanelAccess("screenshots");
  const categories = await getScreenshotCategories();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Camera className="h-6 w-6 text-[#f39c12]" />
        <div>
          <h1 className="text-2xl font-bebas tracking-widest text-white">Nuevo screenshot</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sube una imagen y rellena los datos para publicar.</p>
        </div>
      </div>
      <ScreenshotForm mode="create" categories={categories} />
    </div>
  );
}
