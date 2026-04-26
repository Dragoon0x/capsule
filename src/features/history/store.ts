import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { get as kvGet, set as kvSet } from 'idb-keyval';
import { z } from 'zod';
import { reportError } from '../../lib/errors';

/**
 * Prompt history: ring buffer of the last N deploys (default 20).
 * Persisted to IndexedDB via idb-keyval. Pure read/write — no opinions about
 * how the deploy was made.
 */

const KEY = 'capsule:history-v1';
const MAX = 20;

const EntrySchema = z.object({
  id: z.string(),
  at: z.number().int().nonnegative(),
  format: z.enum(['xml', 'markdown']),
  preview: z.string().max(280),
  text: z.string().max(64 * 1024),
  tokenEstimate: z.number().int().nonnegative(),
  capsuleIds: z.array(z.string()).max(50),
  task: z.string().max(2000),
});
export type HistoryEntry = z.infer<typeof EntrySchema>;

const StoreSchema = z.object({
  v: z.literal(1),
  entries: z.array(EntrySchema),
});
type StoredShape = z.infer<typeof StoreSchema>;

interface HistoryState {
  entries: HistoryEntry[];
  loaded: boolean;
  hydrate: () => Promise<void>;
  add: (entry: Omit<HistoryEntry, 'id' | 'at'>) => Promise<HistoryEntry>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>()(
  immer((set, get) => ({
    entries: [],
    loaded: false,

    hydrate: async () => {
      try {
        const raw = await kvGet<StoredShape>(KEY);
        if (raw) {
          const parsed = StoreSchema.safeParse(raw);
          if (parsed.success) {
            set((s) => {
              s.entries = parsed.data.entries;
              s.loaded = true;
            });
            return;
          }
        }
        set((s) => void (s.loaded = true));
      } catch (e) {
        reportError(e, { where: 'history.hydrate' });
        set((s) => void (s.loaded = true));
      }
    },

    add: async (entry) => {
      const id = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const full: HistoryEntry = { id, at: Date.now(), ...entry };
      set((s) => {
        s.entries.unshift(full);
        if (s.entries.length > MAX) s.entries.length = MAX;
      });
      void persist(get().entries);
      return full;
    },

    remove: async (id) => {
      set((s) => {
        s.entries = s.entries.filter((e) => e.id !== id);
      });
      void persist(get().entries);
    },

    clear: async () => {
      set((s) => void (s.entries = []));
      void persist([]);
    },
  })),
);

async function persist(entries: HistoryEntry[]): Promise<void> {
  try {
    await kvSet(KEY, { v: 1, entries } satisfies StoredShape);
  } catch (e) {
    reportError(e, { where: 'history.persist' });
  }
}

export const HISTORY_MAX = MAX;
