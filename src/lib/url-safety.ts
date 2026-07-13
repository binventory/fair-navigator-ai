/**
 * URL safety helpers.
 *
 * Reject anything that isn't a well-formed http(s) URL. Used both at
 * validation time (server-side zod schemas, CSV import) and at render time
 * (visitor pages) — stored rows may already be poisoned, so we never trust
 * what's in the DB when constructing an <a href> or <img src>.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
export const MAX_URL_LENGTH = 500;

export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v || v.length > MAX_URL_LENGTH) return false;
  try {
    const u = new URL(v);
    return ALLOWED_PROTOCOLS.has(u.protocol);
  } catch {
    return false;
  }
}

/** Returns the trimmed URL if safe, otherwise null. Safe to use in href/src. */
export function safeHttpUrl(value: unknown): string | null {
  if (!isSafeHttpUrl(value)) return null;
  return (value as string).trim();
}

/** Zod refinement helper. */
export function zodSafeHttpUrl<T extends { refine: Function }>(schema: T): T {
  // caller composes; kept for reference
  return schema;
}
