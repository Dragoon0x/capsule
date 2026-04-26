import type { Capsule } from './types';

export function isRecent(c: Capsule, windowMs = 7 * 24 * 60 * 60 * 1000): boolean {
  return Date.now() - c.updatedAt < windowMs;
}

export function sortByRecent(caps: Capsule[]): Capsule[] {
  return [...caps].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function allTags(caps: Capsule[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of caps) {
    for (const t of c.tags) {
      m.set(t, (m.get(t) ?? 0) + 1);
    }
  }
  return m;
}
