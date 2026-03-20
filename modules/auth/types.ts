/**
 * Auth Module — Types
 *
 * Type definitions for authentication state and user profiles.
 *
 * @module modules/auth/types
 */

import type { UserRole } from "@/types";

export type GameVersion = 1 | 2;

/** The authenticated user as returned by Supabase Auth + profile data. */
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  in_game_name: string | null;
  banned: boolean;
}

/** Shape of the registration form (confirmPassword validated client-side). */
export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  captchaToken: string;
}

/** Shape of the game registration form. */
export interface GameRegisterInput {
  username: string;
  email: string;
  password: string;
  captchaToken: string;
  version: GameVersion;
}

/** Shape of the login form (Supabase / admin — uses email). */
export interface LoginInput {
  email: string;
  password: string;
}

/** Shape of the game login form — uses username, not email. */
export interface GameLoginInput {
  username: string;
  password: string;
  captchaToken: string;
  version: GameVersion;
}

/** Shape of the game password recovery request form. */
export interface GameRecoverPasswordRequestInput {
  username: string;
  email: string;
  captchaToken: string;
  version: GameVersion;
  locale: string;
}

/** Shape of the game password reset confirmation form. */
export interface GameRecoverPasswordConfirmInput {
  token: string;
  newPassword: string;
  version: GameVersion;
}
