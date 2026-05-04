import { notFound } from "next/navigation";
import { Camera } from "lucide-react";
import { requireAdminPanelAccess } from "@/lib/admin/auth";
import { getScreenshotById, getScreenshotCategories } from "@/modules/screenshots";
import { ScreenshotForm } from "../../ScreenshotForm";

export const metadata = { title: "Editar screenshot — Admin" };

type Props = { params: Promise<{ id: string }> };

export default async function EditScreenshotPage({ params }: Props) {
  await requireAdminPanelAccess("screenshots");
  const { id } = await params;

  const [screenshot, categories] = await Promise.all([
    getScreenshotById(id),
    getScreenshotCategories(),
  ]);

  if (!screenshot) notFound();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Camera className="h-6 w-6 text-[#f39c12]" />
        <div>
          <h1 className="text-2xl font-bebas tracking-widest text-white">Editar screenshot</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">/{screenshot.slug}</p>
        </div>
      </div>
      <ScreenshotForm mode="edit" initial={screenshot} categories={categories} />
    </div>
  );
}
