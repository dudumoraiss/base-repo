/**
 * Secret redaction. The library must NEVER emit raw secrets, so redaction is
 * applied centrally by the {@link Logger} before any provider sees the data.
 */

/** Default denylist. A key is redacted if it contains any of these (case-insensitive). */
export const DEFAULT_REDACT_KEYS = [
  'password',
  'token',
  'secret',
  'authorization',
  'key',
] as const;

/** Replacement value written in place of a redacted field. */
export const REDACTED = '[REDACTED]';

function matchesDenylist(key: string, denylist: readonly string[]): boolean {
  const normalized = key.toLowerCase();
  return denylist.some((denied) => normalized.includes(denied.toLowerCase()));
}

/**
 * Deep-redact a value: returns a structural copy in which any object key
 * matching the denylist is replaced with {@link REDACTED}. Arrays and nested
 * objects are walked recursively. The input is never mutated, and circular
 * references are handled safely.
 *
 * Matching is substring-based (e.g. `apiKey`, `access_token`, `X-Authorization`
 * are all caught), which favours safety over precision — documented in the ADR.
 */
export function redact<T>(
  value: T,
  redactKeys: readonly string[] = DEFAULT_REDACT_KEYS,
  seen: WeakSet<object> = new WeakSet(),
): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value as object)) {
    return value;
  }
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, redactKeys, seen)) as unknown as T;
  }

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    result[key] = matchesDenylist(key, redactKeys)
      ? REDACTED
      : redact(source[key], redactKeys, seen);
  }
  return result as unknown as T;
}
