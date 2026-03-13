/**
 * Supabase client for Refine data/auth providers.
 *
 * Refine's @refinedev/supabase expects a browser client. We use the SSR
 * browser helper so auth is also mirrored in cookies, allowing `proxy.ts`
 * to validate admin sessions on server-side route protection.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export const supabaseRefineClient = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
