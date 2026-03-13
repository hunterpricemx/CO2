/**
 * next-intl request configuration.
 *
 * This module is read by next-intl's plugin to load the correct
 * messages and time zone for each incoming request.
 *
 * @module i18n/request
 */

import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // Validate that the locale from the URL is one we support.
  // Fall back to the default if it's not (middleware handles redirects,
  // but this is a safety net for direct server-side usage).
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "es" | "en" | "pt")) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    // Use UTC so server-rendered times are consistent regardless of
    // where Next.js is hosted.
    timeZone: "UTC",
  };
});
