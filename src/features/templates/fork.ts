import type { Capsule, Item } from '../capsules/types';
import { CapsuleSchema } from '../capsules/types';
import { makeId } from '../../lib/format/id';
import type { TemplateMeta } from './library';

/**
 * Fork a template into a fresh, persistable Capsule with new IDs and current timestamps.
 */
export function forkTemplate(tpl: TemplateMeta): Capsule {
  const now = Date.now();
  const items: Item[] = tpl.capsule.items.map((it, idx) => ({
    ...it,
    id: makeId('itm'),
    order: idx,
    createdAt: now,
    updatedAt: now,
  }));
  const fresh: Capsule = {
    ...tpl.capsule,
    id: makeId('cap'),
    items,
    seq: 1,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: 0,
  };
  return CapsuleSchema.parse(fresh);
}
