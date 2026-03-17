import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * Footer
 *
 * Server component — renders links, copyright and disclaimer.
 * Receives locale + version from the layout via URL context.
 */
export function Footer({
  locale,
  version,
  logoSrc,
}: {
  locale: string;
  version: string;
  logoSrc?: string;
}) {
  const t = useTranslations("footer");

  const lp = (path: string) => locale === "es" ? path : `/${locale}${path}`;

  const links = [
    { href: lp(`/${version}/terms`), label: t("terms") },
    { href: lp(`/${version}/donate`), label: t("donate") },
    { href: lp(`/${version}/download`), label: t("download") },
  ];

  return (
    <footer className="border-t border-surface mt-auto py-8 bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 flex flex-col items-center gap-4 text-center">
        {/* Brand */}
        <Image
          src={logoSrc ?? `/images/logos/conquer_classic_plus_${version === "1.0" ? "10" : "20"}_logo.png`}
          alt={version === "1.0" ? "Conquer Classic Plus 1.0" : "Conquer Classic Plus 2.0"}
          width={180}
          height={56}
          className="h-14 w-auto object-contain"
        />

        {/* Links */}
        <nav className="flex flex-wrap gap-4 justify-center">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs text-muted-foreground hover:text-gold transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
          {t("disclaimer")}
        </p>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Conquer Classic Plus. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
