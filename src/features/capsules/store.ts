import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Capsule, Item } from './types';
import { CapsuleSchema, LIMITS } from './types';
import {
  deleteCapsule as repoDelete,
  getCapsule as repoGet,
  listCapsules as repoList,
  putCapsule as repoPut,
  putCapsuleOptimistic,
} from '../../db/repo';
import { makeId } from '../../lib/format/id';
import { CapsuleError, reportError } from '../../lib/errors';
import { onMultitab, postMultitab } from '../../lib/multitab';
import { ensurePersistence } from '../storage/persistence';

interface CapsulesState {
  byId: Record<string, Capsule>;
  order: string[]; // stable render order (by updatedAt desc)
  loading: boolean;
  error: string | null;
  activeId: string | null;
  conflict: { capsuleId: string; incomingSeq: number } | null;

  /** Boot: load from DB and subscribe to multitab events. */
  hydrate: () => Promise<void>;
  setActive: (id: string | null) => void;

  createCapsule: (partial?: Partial<Pick<Capsule, 'title' | 'description' | 'tags'>>) => Promise<Capsule>;
  updateCapsule: (id: string, mutator: (draft: Capsule) => void) => Promise<void>;
  deleteCapsule: (id: string) => Promise<void>;

  addItem: (capsuleId: string, item: Item) => Promise<void>;
  updateItem: (capsuleId: string, itemId: string, mutator: (draft: Item) => void) => Promise<void>;
  removeItem: (capsuleId: string, itemId: string) => Promise<void>;
  reorderItems: (capsuleId: string, idsInOrder: string[]) => Promise<void>;

  setPinned: (id: string, pinned: boolean) => Promise<void>;
  touchUsed: (id: string) => Promise<void>;
  duplicateCapsule: (id: string) => Promise<Capsule | null>;
  duplicateItem: (capsuleId: string, itemId: string) => Promise<void>;
  acknowledgeConflict: () => void;
}

function orderBy(byId: Record<string, Capsule>): string[] {
  return Object.values(byId)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    })
    .map((c) => c.id);
}

/**
 * Persist a capsule with optimistic concurrency against multi-tab writes.
 * On conflict, sets state.conflict; caller can merge/retry.
 */
async function persist(prev: Capsule | undefined, next: Capsule): Promise<'ok' | 'conflict'> {
  // First write: no prev → direct put.
  if (!prev) {
    await repoPut(next);
    postMultitab({ kind: 'capsule.updated', capsuleId: next.id, seq: next.seq });
    return 'ok';
  }
  const ok = await putCapsuleOptimistic(next, prev.seq);
  if (!ok) return 'conflict';
  postMultitab({ kind: 'capsule.updated', capsuleId: next.id, seq: next.seq });
  return 'ok';
}

export const useCapsulesStore = create<CapsulesState>()(
  immer((set, get) => ({
    byId: {},
    order: [],
    loading: true,
    error: null,
    activeId: null,
    conflict: null,

    hydrate: async () => {
      set((s) => {
        s.loading = true;
        s.error = null;
      });
      try {
        const all = await repoList();
        const byId: Record<string, Capsule> = {};
        for (const c of all) byId[c.id] = c;
        set((s) => {
          s.byId = byId;
          s.order = orderBy(byId);
          s.loading = false;
        });

        // Subscribe to multitab events.
        onMultitab(async (msg) => {
          if (msg.kind === 'capsule.updated') {
            const local = get().byId[msg.capsuleId];
            if (local && local.seq >= msg.seq) return; // we're ahead
            const fresh = await repoGet(msg.capsuleId);
            if (!fresh) return;
            set((s) => {
              s.byId[fresh.id] = fresh;
              s.order = orderBy(s.byId);
              // If the active capsule got updated elsewhere while we have unsaved edits,
              // surface a conflict for the UI to handle.
              if (
                s.activeId === fresh.id &&
                local &&
                local.seq < fresh.seq &&
                local.updatedAt >= fresh.updatedAt - 5_000
              ) {
                s.conflict = { capsuleId: fresh.id, incomingSeq: fresh.seq };
              }
            });
          } else if (msg.kind === 'capsule.deleted') {
            set((s) => {
              delete s.byId[msg.capsuleId];
              s.order = orderBy(s.byId);
              if (s.activeId === msg.capsuleId) s.activeId = null;
            });
          }
        });
      } catch (e) {
        reportError(e, { where: 'hydrate' });
        set((s) => {
          s.loading = false;
          s.error = 'Failed to load your library.';
        });
      }
    },

    setActive: (id) => set((s) => void (s.activeId = id)),

    createCapsule: async (partial) => {
      const now = Date.now();
      const c: Capsule = CapsuleSchema.parse({
        id: makeId('cap'),
        title: partial?.title ?? 'Untitled capsule',
        description: partial?.description ?? '',
        tags: partial?.tags ?? [],
        pinned: false,
        items: [],
        seq: 1,
        createdAt: now,
        updatedAt: now,
        lastUsedAt: 0,
        vars: {},
      });
      const result = await persist(undefined, c);
      if (result === 'conflict') throw new CapsuleError('DB_WRITE_FAILED', 'Conflict on create.');
      set((s) => {
        s.byId[c.id] = c;
        s.order = orderBy(s.byId);
        s.activeId = c.id;
      });
      // Fire-and-forget persistence request on first create.
      void ensurePersistence();
      return c;
    },

    updateCapsule: async (id, mutator) => {
      const prev = get().byId[id];
      if (!prev) return;
      const next = structuredClone(prev);
      mutator(next);
      next.updatedAt = Date.now();
      next.seq = prev.seq + 1;
      const parsed = CapsuleSchema.safeParse(next);
      if (!parsed.success) {
        reportError(parsed.error, { where: 'updateCapsule', id });
        return;
      }
      const result = await persist(prev, parsed.data);
      if (result === 'conflict') {
        // Re-fetch latest and surface conflict marker.
        const fresh = await repoGet(id);
        set((s) => {
          if (fresh) {
            s.byId[id] = fresh;
            s.order = orderBy(s.byId);
          }
          s.conflict = { capsuleId: id, incomingSeq: fresh?.seq ?? prev.seq + 1 };
        });
        return;
      }
      set((s) => {
        s.byId[id] = parsed.data;
        s.order = orderBy(s.byId);
      });
    },

    deleteCapsule: async (id) => {
      try {
        await repoDelete(id);
        postMultitab({ kind: 'capsule.deleted', capsuleId: id });
        set((s) => {
          delete s.byId[id];
          s.order = orderBy(s.byId);
          if (s.activeId === id) s.activeId = null;
        });
      } catch (e) {
        reportError(e, { where: 'deleteCapsule', id });
      }
    },

    addItem: async (capsuleId, item) => {
      await get().updateCapsule(capsuleId, (d) => {
        const max = d.items.reduce((m, it) => Math.max(m, it.order), -1);
        // Respect provided order if stable, else append.
        const order = Number.isFinite(item.order) && item.order >= 0 ? item.order : max + 1;
        const clone = { ...item, order } as Item;
        d.items.push(clone);
        d.items.sort((a, b) => a.order - b.order);
      });
    },

    updateItem: async (capsuleId, itemId, mutator) => {
      await get().updateCapsule(capsuleId, (d) => {
        const idx = d.items.findIndex((i) => i.id === itemId);
        if (idx < 0) return;
        const it = d.items[idx];
        if (!it) return;
        mutator(it);
        it.updatedAt = Date.now();
      });
    },

    removeItem: async (capsuleId, itemId) => {
      await get().updateCapsule(capsuleId, (d) => {
        d.items = d.items.filter((i) => i.id !== itemId);
      });
    },

    reorderItems: async (capsuleId, idsInOrder) => {
      await get().updateCapsule(capsuleId, (d) => {
        const byId = new Map(d.items.map((i) => [i.id, i] as const));
        const reordered: Item[] = [];
        for (let k = 0; k < idsInOrder.length; k += 1) {
          const id = idsInOrder[k];
          if (!id) continue;
          const it = byId.get(id);
          if (it) {
            reordered.push({ ...it, order: k });
          }
        }
        // Append anything missing from idsInOrder at the end (defensive).
        const seen = new Set(idsInOrder);
        let next = reordered.length;
        for (const it of d.items) {
          if (!seen.has(it.id)) {
            reordered.push({ ...it, order: next });
            next += 1;
          }
        }
        d.items = reordered;
      });
    },

    setPinned: async (id, pinned) => {
      await get().updateCapsule(id, (d) => void (d.pinned = pinned));
    },

    touchUsed: async (id) => {
      await get().updateCapsule(id, (d) => void (d.lastUsedAt = Date.now()));
    },

    duplicateCapsule: async (id) => {
      const src = get().byId[id];
      if (!src) return null;
      const now = Date.now();
      const cloned: Capsule = {
        ...src,
        id: makeId('cap'),
        title: `${src.title} (copy)`,
        items: src.items.map((it, idx) => ({
          ...it,
          id: makeId('itm'),
          order: idx,
          createdAt: now,
          updatedAt: now,
        })),
        seq: 1,
        createdAt: now,
        updatedAt: now,
        lastUsedAt: 0,
        pinned: false,
      };
      const parsed = CapsuleSchema.safeParse(cloned);
      if (!parsed.success) {
        reportError(parsed.error, { where: 'duplicateCapsule', id });
        return null;
      }
      const result = await persist(undefined, parsed.data);
      if (result === 'conflict') return null;
      set((s) => {
        s.byId[parsed.data.id] = parsed.data;
        s.order = orderBy(s.byId);
        s.activeId = parsed.data.id;
      });
      return parsed.data;
    },

    duplicateItem: async (capsuleId, itemId) => {
      await get().updateCapsule(capsuleId, (d) => {
        const idx = d.items.findIndex((i) => i.id === itemId);
        if (idx < 0) return;
        const src = d.items[idx];
        if (!src) return;
        const now = Date.now();
        const clone = {
          ...src,
          id: makeId('itm'),
          order: src.order + 0.5, // re-sorted below
          createdAt: now,
          updatedAt: now,
        } as Item;
        d.items.splice(idx + 1, 0, clone);
        d.items = d.items.map((it, i) => ({ ...it, order: i }));
      });
    },

    acknowledgeConflict: () => set((s) => void (s.conflict = null)),
  })),
);

// Selectors (stable references for perf).
export const selectAllOrdered = (s: CapsulesState): Capsule[] =>
  s.order.map((id) => s.byId[id]).filter((c): c is Capsule => Boolean(c));

export const selectActive = (s: CapsulesState): Capsule | null =>
  s.activeId ? s.byId[s.activeId] ?? null : null;

export const selectById = (id: string) => (s: CapsulesState) => s.byId[id] ?? null;

export { LIMITS };
