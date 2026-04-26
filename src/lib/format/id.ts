/**
 * ID generation. Uses crypto.randomUUID when available, with a deterministic-ish fallback.
 * Prefix lets us tag ids (cap_, itm_, etc.) for debuggability without structure dependence.
 */

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback (only hit if crypto is missing)
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

export function makeId(prefix: 'cap' | 'itm' | 'ver' | 'tag' | 'run'): string {
  return `${prefix}_${uuid().replace(/-/g, '')}`;
}
