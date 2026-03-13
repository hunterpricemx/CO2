/**
 * Global shared types for Conquer Classic Plus.
 *
 * These types are shared across modules and should not contain
 * business logic — only type definitions and enums.
 *
 * @module types/index
 */

/** Supported game versions. */
export type GameVersion = "1.0" | "2.0" | "both";

/** Supported locales (i18n). */
export type Locale = "es" | "en" | "pt";

/** Content publication status. */
export type ContentStatus = "draft" | "published" | "archived";

/** User role in the system. */
export type UserRole = "admin" | "player";

export type AdminPanelPermission =
  | "events"
  | "guides"
  | "fixes"
  | "donations"
  | "users"
  | "gameServer";

/** Donation payment status. */
export type DonationStatus = "pending" | "completed" | "refunded";

/** Ranking type for PvP. */
export type RankingType = "pk" | "ko";

/** Multilingual text field set (ES / EN / PT). */
export interface MultilingualField {
  es: string;
  en: string;
  pt: string;
}

/**
 * Pagination parameters used across list queries.
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Standard paginated result returned by list queries.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Standard Server Action result.
 * All Server Actions return this shape for consistent error handling.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
