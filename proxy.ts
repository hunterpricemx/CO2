/**
 * Next.js Middleware
 *
 * Handles two concerns in the following order:
 *
 * 1. **Admin route protection** — checks Supabase session for any request
 *    to `/admin/*`. Unauthenticated users or non-admins are redirected
 *    to `/admin/login`. Authenticated admins proceed normally.
 *
 * 2. **next-intl locale routing** — for all non-admin routes, the
 *    next-intl middleware adds the locale prefix and handles redirects
 *    (e.g. `/` → `/es/`).
 *
 * Execution order matters: auth check runs before i18n so we avoid
 * unnecessary locale detection for protected routes.
 *
 * @module middleware
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import createNextIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/** Routes that start with this prefix are admin-only. */
const ADMIN_PREFIX = "/admin";

/** The admin login page itself is public (no auth required). */
const ADMIN_LOGIN = "/admin/login";

const DEFAULT_LOCALE_VERSION_PATHS = new Set(["/1.0", "/2.0"]);

/**
 * next-intl middleware instance.
 * Handles locale detection, prefix, and redirects for public routes.
 */
const intlMiddleware = createNextIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Keep the split-screen landing at `/` instead of letting next-intl
  // redirect it to a locale-prefixed route.
  if (pathname === "/") {
    return NextResponse.next();
  }

  // API routes must bypass intl middleware entirely — next-intl would
  // redirect /api/... to /es/api/... which causes a 404.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Redirect legacy PHP language-switcher URLs, e.g. /2.0/lang?=es
  // These come from old game launchers / bookmarks and have no page here.
  if (/^\/(1\.0|2\.0)\/lang(\/|$)/.test(pathname)) {
    const version = pathname.split("/")[1]; // "1.0" or "2.0"
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${version}`;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl, 301);
  }

  // Resolve Spanish public routes without relying on next-intl to infer
  // that `/1.0/...` should map to `/es/1.0/...`.
  const isDefaultLocaleVersionPath =
    DEFAULT_LOCALE_VERSION_PATHS.has(pathname) ||
    pathname.startsWith("/1.0/") ||
    pathname.startsWith("/2.0/");

  if (isDefaultLocaleVersionPath) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/es${pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  // ----------------------------------------------------------------
  // 1. Admin route protection
  // ----------------------------------------------------------------
  if (pathname.startsWith(ADMIN_PREFIX)) {
    // Admin login page: bypass intl and serve as-is (no auth check needed)
    if (pathname === ADMIN_LOGIN) {
      return NextResponse.next();
    }

    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Create a Supabase client that can read/write cookies.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // Refresh the session to ensure the token is valid.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // No session at all → redirect to admin login.
    if (!user) {
      const loginUrl = new URL(ADMIN_LOGIN, request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Has session but not an admin → redirect to admin login with error.
    const role = user.user_metadata?.role as string | undefined;
    if (role !== "admin") {
      const loginUrl = new URL(ADMIN_LOGIN, request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }

    // Admin confirmed → proceed.
    return response;
  }

  // ----------------------------------------------------------------
  // 2. next-intl locale routing for public routes
  // ----------------------------------------------------------------
  return intlMiddleware(request);
}

/**
 * Limit the middleware to application routes only.
 * Static assets, Next.js internals, and media files are excluded so
 * the proxy never intercepts them (which would cause 404s for chunks,
 * images, etc.).
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
