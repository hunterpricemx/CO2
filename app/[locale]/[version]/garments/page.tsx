import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSiteSettings } from "@/lib/site-settings";
import { createAdminClient } from "@/lib/supabase/server";
import { GarmentsClient, type GarmentItem, type GarmentsLabels } from "../../../../components/shared/GarmentsClient";

export const metadata: Metadata = { title: "Garments" };

type Props = { params: Promise<{ locale: string; version: string }> };

export default async function GarmentsPage({ params }: Props) {
  const { locale, version } = await params;
  const t = await getTranslations("garments");

  const settings = await getSiteSettings();
  if (!settings.garments_enabled) {
    redirect(locale === "es" ? `/${version}` : `/${locale}/${version}`);
  }

  const supabase = await createAdminClient();

  // Fetch active garments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawGarments } = await (supabase as any)
    .from("garments")
    .select("id, name, description, image_url, allows_custom, is_reserved")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const garments: GarmentItem[] = (rawGarments ?? []) as GarmentItem[];

  const whatsappPhone = "+1 (809) 998-0093";

  const labels: GarmentsLabels = {
    title:                  t("title"),
    subtitle:               t("subtitle"),
    price_label:            t("price_label"),
    btn_order:              t("btn_order"),
    btn_custom:             t("btn_custom"),
    custom_badge:           t("custom_badge"),
    login_required:         t("login_required"),
    login_link:             t("login_link"),
    modal_title:            t("modal_title"),
    modal_custom_title:     t("modal_custom_title"),
    char_label:             t("char_label"),
    char_placeholder:       t("char_placeholder"),
    custom_desc_label:      t("custom_desc_label"),
    custom_desc_placeholder: t("custom_desc_placeholder"),
    ref_image_label:        t("ref_image_label"),
    btn_checkout:           t("btn_checkout"),
    orders_link:            t("orders_link"),
    empty_catalog:          t("empty_catalog"),
    not_configured:         t("not_configured"),
    tebex_checking:         t("tebex_checking"),
    tebex_error:            t("tebex_error"),
    tebex_retry:            t("tebex_retry"),
    custom_request_title:   t("custom_request_title"),
    custom_request_subtitle: t("custom_request_subtitle"),
    custom_request_btn:     t("custom_request_btn"),
  };

  return (
    <main className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-8">
        <h1 className="font-bebas text-6xl tracking-wider text-white">{labels.title}</h1>
        <p className="text-gray-400 mt-2 text-sm">{labels.subtitle}</p>
      </div>

      <GarmentsClient
        garments={garments}
        version={version}
        whatsappPhone={whatsappPhone}
        labels={labels}
      />
    </main>
  );
}
