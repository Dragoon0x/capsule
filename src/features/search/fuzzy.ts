/**
 * Minimal fuzzy matcher. Scores sequential-subsequence hits higher.
 * Intentionally simple — good enough for <5000 capsules.
 */

export interface MatchResult {
  score: number; // 0..1
  indices: number[]; // matched char positions in haystack
}

export function fuzzyMatch(needle: string, haystack: string): MatchResult | null {
  if (!needle) return { score: 0.5, indices: [] };
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();

  const indices: number[] = [];
  let hi = 0;
  let lastIdx = -1;
  let consecutive = 0;
  let maxConsecutive = 0;

  for (const ch of n) {
    while (hi < h.length && h[hi] !== ch) hi += 1;
    if (hi === h.length) return null;
    indices.push(hi);
    if (hi === lastIdx + 1) {
      consecutive += 1;
      if (consecutive > maxConsecutive) maxConsecutive = consecutive;
    } else {
      consecutive = 1;
    }
    lastIdx = hi;
    hi += 1;
  }

  const span = (indices[indices.length - 1] ?? 0) - (indices[0] ?? 0) + 1;
  const density = n.length / Math.max(span, 1);
  const headBoost = (indices[0] ?? 0) === 0 ? 0.15 : 0;
  const score = Math.min(1, density * 0.7 + (maxConsecutive / n.length) * 0.3 + headBoost);

  return { score, indices };
}
