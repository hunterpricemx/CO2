import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string; version: string }> };

export default async function AccsoryAliasPage({ params }: Props) {
  const { locale, version } = await params;
  const prefix = locale === "es" ? "" : `/${locale}`;
  redirect(`${prefix}/${version}/accesory`);
}
