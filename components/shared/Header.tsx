import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { ServerClock } from "./ServerClock";
import { LanguageSelector } from "./LanguageSelector";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";
import { getGameSession } from "@/lib/session";
import { getSiteSettings } from "@/lib/site-settings";
import { createAdminClient } from "@/lib/supabase/server";
import { gameLogoutAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { NavDropdown } from "./NavDropdown";
import { PlayerTicketsBell } from "./PlayerTicketsBell";

export type NavItem =
  | { type: "link"; href: string; label: string }
  | { type: "dropdown"; label: string; items: { href: string; label: string }[] };

/**
 * Header
 *
 * Hybrid component: server shell (fetches auth state asynchronously)
 * that renders client sub-components (ServerClock, LanguageSelector, MobileMenu).
 */
export async function Header({
  locale,
  version,
  logoSrc,
}: {
  locale: string;
  version: string;
  logoSrc?: string;
}) {
  const t = await getTranslations("nav");

  const session = await getGameSession();
  const settings = await getSiteSettings();
  const ticketsEnabled = settings.tickets_enabled;
  const garmentsEnabled = settings.garments_enabled;
  const accesoryLabel = locale === "es" ? "Accesorios" : locale === "pt" ? "Acessorios" : "Accessories";
  const cosmeticsLabel = locale === "es" ? "Cosméticos" : locale === "pt" ? "Cosméticos" : "Cosmetics";

  // Fetch garment categories for the Cosméticos dropdown
  let garmentCategories: { id: string; name: string }[] = [];
  if (garmentsEnabled) {
    try {
      const supabase = await createAdminClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("garment_categories")
        .select("id, name")
        .order("sort_order");
      garmentCategories = (data ?? []) as { id: string; name: string }[];
    } catch {
      // si la tabla aún no existe no rompe el header
    }
  }

  // Build locale-aware path: omit prefix for default locale (es) with as-needed routing
  const lp = (path: string) => locale === "es" ? path : `/${locale}${path}`;

  const statsDropdown: NavItem = {
    type: "dropdown",
    label: t("stats"),
    items: [
      { href: lp(`/${version}/market`), label: t("market") },
      { href: lp(`/${version}/compose`), label: t("compose") },
      { href: lp(`/${version}/lottery`), label: t("lottery") },
      { href: lp(`/${version}/mining`), label: t("mining") },
      { href: lp(`/${version}/drops`), label: t("drops") },
      { href: lp(`/${version}/rankings`), label: t("rankings") },
    ],
  };

  const navItems: NavItem[] =
    version === "1.0"
      ? [
          { type: "link", href: lp("/1.0"), label: t("home") },
          { type: "link", href: lp("/1.0/news"), label: t("news") },
          {
            type: "dropdown",
            label: t("guides"),
            items: [
              { href: lp("/1.0/guides"), label: t("guides") },
              { href: lp("/1.0/tutorials"), label: t("tutorials") },
            ],
          },
          { type: "link", href: lp("/1.0/download"), label: t("download") },
          { type: "link", href: lp("/1.0/donate"), label: t("donate") },
          ...(garmentsEnabled ? [{
            type: "dropdown" as const,
            label: cosmeticsLabel,
            items: [
              { href: lp("/1.0/garments"), label: t("garments") },
              ...garmentCategories.map((cat) => ({ href: lp(`/1.0/garments?cat=${cat.id}`), label: cat.name })),
              { href: lp("/1.0/accesory"), label: accesoryLabel },
            ],
          }] : []),
          { type: "link", href: lp("/1.0/vip"), label: t("vip") },
          { type: "link", href: lp("/1.0/influencers"), label: t("influencers") },
          {
            type: "dropdown",
            label: t("info"),
            items: [
              { href: lp("/1.0/fixes"), label: t("fixes") },
              { href: lp("/1.0/events"), label: t("events") },
              { href: lp("/1.0/terms"), label: t("terms") },
              { href: lp("/1.0/rules"), label: t("rules") },
            ],
          },
          statsDropdown,
        ]
      : [
          { type: "link", href: lp("/2.0"), label: t("home") },
          { type: "link", href: lp("/2.0/news"), label: t("news") },
          {
            type: "dropdown",
            label: t("guides"),
            items: [
              { href: lp("/2.0/guides"), label: t("guides") },
              { href: lp("/2.0/tutorials"), label: t("tutorials") },
            ],
          },
          { type: "link", href: lp("/2.0/fixes"), label: t("fixes") },
          { type: "link", href: lp("/2.0/events"), label: t("events") },
          { type: "link", href: lp("/2.0/download"), label: t("download") },
          { type: "link", href: lp("/2.0/donate"), label: t("donate") },
          ...(garmentsEnabled ? [{
            type: "dropdown" as const,
            label: cosmeticsLabel,
            items: [
              { href: lp("/2.0/garments"), label: t("garments") },
              ...garmentCategories.map((cat) => ({ href: lp(`/2.0/garments?cat=${cat.id}`), label: cat.name })),
              { href: lp("/2.0/accesory"), label: accesoryLabel },
            ],
          }] : []),
          { type: "link", href: lp("/2.0/vip"), label: t("vip") },
          { type: "link", href: lp("/2.0/influencers"), label: t("influencers") },
          statsDropdown,
        ];

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-surface">
      {/* Top bar */}
      <div className="border-b border-surface/50 bg-surface/30 px-4 py-1.5 hidden sm:block">
        <div className="container mx-auto flex items-center justify-between">
          <ServerClock />
          <div className="flex items-center gap-2">
            {/* Version pill */}
            <span className="text-xs bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded-full font-medium">
              {version === "1.0" ? "Evolution 2.0" : "Experience 2.0"}
            </span>
            <LanguageSelector />
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href={lp(`/${version}`)} className="shrink-0">
          <Image
            src={logoSrc ?? `/images/logos/conquer_classic_plus_${version === "1.0" ? "10" : "20"}_logo.png`}
            alt={version === "1.0" ? "Conquer Classic Plus 1.0" : "Conquer Classic Plus 2.0"}
            width={160}
            height={50}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          <NavLinks navItems={navItems} />
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {session ? (
            <>
              {ticketsEnabled && (
                <PlayerTicketsBell ticketsHref={lp(`/${version}/tickets`)} locale={locale} version={version} />
              )}
              <NavDropdown
                label={session.username}
                items={[
                  { href: lp(`/${version}/myaccount`),        label: t("myaccount") },
                  { href: lp(`/${version}/donate/history`),   label: t("donate_history") },
                  ...(ticketsEnabled ? [{ href: lp(`/${version}/tickets`), label: t("tickets") }] : []),
                  { href: lp(`/${version}/trade`),            label: t("trade") },
                  { action: gameLogoutAction,                 label: t("logout") },
                ]}
              />
            </>
          ) : (
            <>
              <Link href={lp(`/${version}/login`)}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs hidden sm:flex"
                >
                  {t("login")}
                </Button>
              </Link>
              <Link href={lp(`/${version}/register`)}>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-gold hover:bg-gold-dark text-background font-semibold"
                >
                  {t("register")}
                </Button>
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <MobileMenu navItems={navItems} locale={locale} version={version} />
        </div>
      </div>
    </header>
  );
}
