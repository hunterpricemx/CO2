/**
 * next-intl routing configuration.
 *
 * Defines supported locales, default locale, and the custom
 * routing strategy used by the middleware and navigation helpers.
 *
 * @module i18n/routing
 */

import { defineRouting } from "next-intl/routing";

/** All supported locales in display order. */
export const locales = ["es", "en", "pt"] as const;

/** Default locale used when no locale is detected in the URL. */
export const defaultLocale = "es" as const;

/** All supported game versions. */
export const gameVersions = ["1.0", "2.0"] as const;

/** Default game version for new visitors. */
export const defaultVersion = "1.0" as const;

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Omit locale prefix for the default locale (es).
  // Spanish → /1.0, /2.0  |  English → /en/1.0  |  Portuguese → /pt/1.0
  localePrefix: "as-needed",
  // Disable automatic locale detection from Accept-Language headers.
  // Users choose their language manually via the LanguageSelector.
  localeDetection: false,
});
