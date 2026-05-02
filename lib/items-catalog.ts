/**
 * Items.ini parser & sprite-id lookup.
 *
 * Conquer's `Items.ini` maps each in-game `itemid` to a sprite filename id:
 *
 *   [900025]
 *   Item=900320
 *
 * The DB stores `itemid=900025`, but the actual icon lives at
 * `public/images/market/900320.png`. Multiple itemids can share the same
 * sprite (variants of +/bless/quality use the same base icon).
 *
 * This module reads `data/Items.ini` once at first call, caches the lookup
 * in a `Map<number, number>`, and exposes:
 *
 *   - getSpriteId(itemId)  → number | null    (raw lookup)
 *   - resolveSpriteFilename(itemId) → string  (always returns "<id>.png")
 *
 * Refreshing the catalog requires a process restart.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

let cache: Map<number, number> | null = null;

function loadCatalog(): Map<number, number> {
  if (cache) return cache;

  const map = new Map<number, number>();
  try {
    const file = path.join(process.cwd(), "data", "Items.ini");
    const raw = readFileSync(file, "utf8");

    // Match `[<digits>]` then on subsequent lines `Item=<digits>`.
    // Tolerates blank lines between fields and ignores `[Default]` and
    // any non-numeric section names.
    const sectionRe = /^\[(\d+)\]\s*$/;
    const itemRe    = /^Item\s*=\s*(\d+)\s*$/i;

    let currentId: number | null = null;
    for (const line of raw.split(/\r?\n/)) {
      const sm = sectionRe.exec(line);
      if (sm) {
        currentId = Number(sm[1]);
        continue;
      }
      if (currentId == null) continue;
      const im = itemRe.exec(line);
      if (im) {
        map.set(currentId, Number(im[1]));
        currentId = null; // first Item= per section wins
      }
    }
  } catch {
    // Missing or unreadable file → empty map (callers will fallback to itemId)
  }

  cache = map;
  return cache;
}

/** Returns the sprite-id mapped to an itemid in Items.ini, or null if not found. */
export function getSpriteId(itemId: number): number | null {
  const id = loadCatalog().get(itemId);
  return id ?? null;
}

/**
 * Returns the sprite filename to use for an itemid:
 *   1. If Items.ini maps `itemId` → `spriteId`, returns `${spriteId}.png`.
 *   2. Otherwise falls back to `${itemId}.png` (assumes 1:1 mapping).
 *
 * Caller still needs to verify the file exists on disk (see lib/market-images).
 */
export function resolveSpriteFilename(itemId: number): string {
  const sprite = getSpriteId(itemId) ?? itemId;
  return `${sprite}.png`;
}

/** For diagnostics — returns the catalog size (number of mapped itemids). */
export function getCatalogSize(): number {
  return loadCatalog().size;
}
