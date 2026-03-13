/**
 * Supabase Browser Client
 *
 * Use this in Client Components (`"use client"`) when you need to
 * interact with Supabase from the browser — e.g. subscribing to
 * Realtime channels, uploading files to Storage, or reading
 * publicly accessible data.
 *
 * For Server Components, API routes, and Server Actions use
 * `createServerClient` from `@/lib/supabase/server` instead.
 *
 * @module lib/supabase/client
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Creates a Supabase client for use in the browser.
 *
 * The client is initialized with the public anon key, which
 * respects Row Level Security (RLS) policies defined in Supabase.
 *
 * @returns A typed Supabase browser client.
 *
 * @example
 * ```tsx
 * "use client";
 * import { createClient } from "@/lib/supabase/client";
 *
 * export function MyComponent() {
 *   const supabase = createClient();
 *   // ...
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
