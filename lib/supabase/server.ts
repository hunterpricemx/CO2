/**
 * Supabase Server Client
 *
 * Use this in Server Components, Server Actions, and Route Handlers
 * where you have access to Next.js cookies.
 *
 * There are two exported factories:
 * - `createClient()`         — uses the anon key + RLS (for reading data as a user)
 * - `createAdminClient()`    — uses the service_role key (bypasses RLS, for admin writes)
 *
 * @module lib/supabase/server
 */

import { createServerClient as _createServerClient } from "@supabase/ssr";
import { createClient as _createAdminServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Creates a server-side Supabase client that reads/writes cookies
 * for session management.
 *
 * Uses the **anon key** — RLS policies apply. Safe to use in Server
 * Components that render data for the logged-in user.
 *
 * @returns A typed Supabase server client bound to the current request cookies.
 *
 * @example
 * ```ts
 * // In a Server Component:
 * import { createClient } from "@/lib/supabase/server";
 *
 * export default async function Page() {
 *   const supabase = await createClient();
 *   const { data } = await supabase.from("events").select("*");
 *   // ...
 * }
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies();

  return _createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll is called from a Server Component when refreshing the
            // session. The cookie can only be set in a Server Action or
            // Route Handler, so we silently ignore errors here.
          }
        },
      },
    },
  );
}

/**
 * Creates a server-side Supabase client with the **service_role key**.
 *
 * ⚠️ This client **bypasses RLS**. Use it only in trusted server-side
 * contexts (Server Actions for admin operations, background jobs, etc.).
 * NEVER import or call this from client-side code.
 *
 * @returns A typed Supabase admin client with full database access.
 *
 * @example
 * ```ts
 * // In a Server Action (admin only):
 * import { createAdminClient } from "@/lib/supabase/server";
 *
 * export async function deleteUser(userId: string) {
 *   const supabase = await createAdminClient();
 *   await supabase.auth.admin.deleteUser(userId);
 * }
 * ```
 */
export async function createAdminClient() {
  return _createAdminServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
