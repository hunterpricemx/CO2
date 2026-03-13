/**
 * Users Module — Types
 * @module modules/users/types
 */

import type { Database } from "@/lib/supabase/database.types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
/** Alias for ProfileRow — used in admin UI components. */
export type UserProfile = ProfileRow;

export interface UserFilters {
  role?: "admin" | "player";
  banned?: boolean;
  search?: string;
}
