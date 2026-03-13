/**
 * Auth Module — Queries
 *
 * Read-only helpers for fetching the current user's session and profile.
 * All functions use the server client (cookie-based sessions).
 *
 * @module modules/auth/queries
 */

import { createClient } from "@/lib/supabase/server";
import type { AuthUser } from "./types";

/**
 * Returns the authenticated user with their profile data, or `null`
 * if no valid session exists.
 *
 * @returns The authenticated user or null.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role, in_game_name, banned")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    username: profile.username,
    role: profile.role,
    in_game_name: profile.in_game_name,
    banned: profile.banned,
  };
}

/**
 * Returns `true` if the current session belongs to an admin user.
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}
