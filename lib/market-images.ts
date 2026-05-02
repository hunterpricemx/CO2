/**
 * Market images availability — server-side filesystem index.
 *
 * Lists `public/images/market/` once at module load and caches the set of
 * available PNG filenames. Lets server components decide whether to send the
 * client a real image src or `null` (so the placeholder renders immediately
 * instead of waiting for the browser's <img onError>).
 *
 * Refresh requires a process restart — appropriate for a static asset folder
 * that only changes on deploy.
 */

import { readdirSync } from "node:fs";
import path from "node:path";

let cache: Set<string> | null = null;

function loadIndex(): Set<string> {
  if (cache) return cache;
  try {
    const dir = path.join(process.cwd(), "public", "images", "market");
    const files = readdirSync(dir);
    cache = new Set(files.map(f => f.toLowerCase()));
  } catch {
    cache = new Set();
  }
  return cache;
}

/** Returns true when `<filename>.png` exists in public/images/market/. */
export function marketImageExists(filename: string | null | undefined): boolean {
  if (!filename) return false;
  return loadIndex().has(filename.toLowerCase());
}

/** Returns the original filename if it exists, else null. Use for `item_image`. */
export function safeMarketImage(filename: string | null | undefined): string | null {
  return marketImageExists(filename) ? (filename as string) : null;
}
