/**
 * Simple in-process rate limiter based on a sliding window counter.
 *
 * Keyed by an arbitrary string (IP, user ID, etc.).
 * State lives in memory — resets on process restart, sufficient for
 * protecting sensitive actions without external infrastructure.
 *
 * Usage:
 *   const result = checkRateLimit("change_email", userId, { max: 5, windowMs: 60_000 });
 *   if (!result.ok) return { success: false, error: "rate_limited" };
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

/** Clean up expired entries periodically to avoid unbounded memory growth. */
function prune() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

let lastPrune = Date.now();
const PRUNE_INTERVAL = 5 * 60 * 1000; // prune every 5 minutes

export function checkRateLimit(
  namespace: string,
  identifier: string,
  options: { max: number; windowMs: number },
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Lazy prune
  if (now - lastPrune > PRUNE_INTERVAL) {
    prune();
    lastPrune = now;
  }

  const key = `${namespace}:${identifier}`;
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // First hit or window expired — start fresh
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, remaining: options.max - 1, resetAt: now + options.windowMs };
  }

  if (entry.count >= options.max) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { ok: true, remaining: options.max - entry.count, resetAt: entry.resetAt };
}
