import { redirect } from "next/navigation";

export default async function LocaleTermsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (locale === "es") {
    redirect("/1.0/terms");
  }

  redirect(`/${locale}/1.0/terms`);
}
