import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getGameSession } from "@/lib/session";
import { getSiteSettings } from "@/lib/site-settings";
import { NewTicketForm } from "./NewTicketForm";

export const metadata = { title: "Nuevo Ticket de Soporte" };

export default async function NewTicketPage({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}) {
  const { locale, version } = await params;
  const gameSession = await getGameSession();
  if (!gameSession) redirect(`/${locale}/${version}/login`);

  const settings = await getSiteSettings();
  if (!settings.tickets_enabled) redirect(locale === "es" ? `/${version}` : `/${locale}/${version}`);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/${version}/tickets`}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-bebas text-4xl tracking-wider text-white">Nuevo Ticket</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Describe tu problema y el equipo de soporte te ayudará lo antes posible.
          </p>
        </div>
      </div>

      <NewTicketForm locale={locale} version={version} />
    </div>
  );
}
