"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Globe } from "lucide-react";
import type { Locale } from "@/types";

const LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "pt", label: "Português", flag: "🇧🇷" },
];

/**
 * LanguageSelector
 *
 * Dropdown to switch between ES / EN / PT locales.
 * Swaps the current locale segment in the URL preserving the rest of the path.
 */
export function LanguageSelector() {
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = useLocale() as Locale;

  function buildHref(locale: Locale): string {
    const segments = pathname.split("/").filter(Boolean); // ["es","1.0","download"] or ["1.0","download"]
    const knownLocales: string[] = ["es", "en", "pt"];
    const hasLocalePrefix = segments.length > 0 && knownLocales.includes(segments[0]);

    if (hasLocalePrefix) {
      segments[0] = locale;
    } else {
      segments.unshift(locale);
    }
    return "/" + segments.join("/");
  }

  const current = LOCALES.find((l) => l.value === currentLocale) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 text-xs h-7 px-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none transition-colors">
        <Globe className="h-3.5 w-3.5 text-gold" />
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-35">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.value}
            onClick={() => router.push(buildHref(l.value))}
            className={l.value === currentLocale ? "text-gold font-medium" : ""}
          >
            <span className="mr-2">{l.flag}</span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
