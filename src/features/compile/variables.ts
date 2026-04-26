import type { Capsule } from '../capsules/types';

/**
 * Variable resolution ordering:
 *   scratch-vars (highest) → capsule-vars (later capsules override earlier) → global-vars
 *
 * Returns a flat merged bag the serializer consumes.
 */
export function mergeVars(
  scratchVars: Record<string, string>,
  capsules: Capsule[],
  globalVars: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...globalVars };
  for (const c of capsules) {
    for (const [k, v] of Object.entries(c.vars)) {
      out[k] = v;
    }
  }
  for (const [k, v] of Object.entries(scratchVars)) {
    out[k] = v;
  }
  return out;
}
