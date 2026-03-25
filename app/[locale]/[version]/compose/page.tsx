import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComposeCalculator } from "@/components/shared/ComposeCalculator";

import { getSiteSettings, buildPageSeo } from "@/lib/site-settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}): Promise<Metadata> {
  void params;
  const settings = await getSiteSettings();
  return buildPageSeo(settings, "compose", "Calculadora de Compose");
}

export default async function ComposePage({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}) {
  const { locale, version } = await params;

  const marketHref =
    locale === "es" ? `/${version}/market` : `/${locale}/${version}/market`;

  return (
    <section className="min-h-[calc(100vh-160px)] py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Encabezado */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Calculadora de Compose
          </h1>
          <p className="text-muted-foreground text-sm">
            Calcula cuántos compose y CPS necesitas para subir el nivel de tu equipo.
          </p>
          <span className="inline-block px-2.5 py-0.5 rounded-full border border-border text-xs text-muted-foreground">
            Versión {version}
          </span>
        </div>

        <ComposeCalculator marketHref={marketHref} />
      </div>
    </section>
  );
}
