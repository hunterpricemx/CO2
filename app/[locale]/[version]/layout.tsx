import { notFound } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";

const VALID_VERSIONS = ["1.0", "2.0"] as const;
type Version = (typeof VALID_VERSIONS)[number];

/**
 * Version layout.
 * Wraps all public pages with the game Header and Footer.
 */
export default async function VersionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; version: string }>;
}) {
  const { locale, version } = await params;

  if (!VALID_VERSIONS.includes(version as Version)) notFound();

  return (
    <div className="flex flex-col min-h-screen">
      <Header locale={locale} version={version} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} version={version} />
    </div>
  );
}
