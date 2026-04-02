import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSiteSettings } from "@/lib/site-settings";
import { createAdminClient } from "@/lib/supabase/server";
import { AccesoryClient, type AccesoryItem } from "@/components/shared/AccesoryClient";

export const metadata: Metadata = { title: "Accesory" };

type Props = { params: Promise<{ locale: string; version: string }> };

export default async function AccesoryPage({ params }: Props) {
  const { locale, version } = await params;
  const settings = await getSiteSettings();

  if (!settings.garments_enabled) {
    redirect(locale === "es" ? `/${version}` : `/${locale}/${version}`);
  }

  const supabase = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawItems } = await (supabase as any)
    .from("accesory")
    .select("id, name, description, image_url, allows_custom, is_reserved")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const items: AccesoryItem[] = (rawItems ?? []) as AccesoryItem[];
  const whatsappPhone = "+1 (809) 998-0093";

  return (
    <main className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-6">
        <h1 className="font-bebas text-6xl tracking-wider text-white">Accesory</h1>
        <p className="text-gray-400 mt-2 text-sm">Galeria de accesory con solicitud directa por WhatsApp.</p>
      </div>

      <AccesoryClient items={items} version={version} whatsappPhone={whatsappPhone} />
    </main>
  );
}
