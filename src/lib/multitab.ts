/**
 * Multi-tab broadcast. Thin wrapper over BroadcastChannel with typed messages.
 * Falls back silently (no-op) if the browser lacks support.
 */

import { z } from 'zod';

const MESSAGE_SCHEMA = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('capsule.updated'),
    capsuleId: z.string(),
    seq: z.number().int().nonnegative(),
    originTabId: z.string(),
  }),
  z.object({
    kind: z.literal('capsule.deleted'),
    capsuleId: z.string(),
    originTabId: z.string(),
  }),
  z.object({
    kind: z.literal('library.changed'),
    originTabId: z.string(),
  }),
  z.object({
    kind: z.literal('settings.changed'),
    originTabId: z.string(),
  }),
]);

export type MultitabMessage = z.infer<typeof MESSAGE_SCHEMA>;
export type MultitabHandler = (msg: MultitabMessage) => void;

/**
 * Message shape as callers pass it (no originTabId; added internally).
 * We name each variant explicitly so TS narrows cleanly.
 */
export type MultitabOutgoing =
  | { kind: 'capsule.updated'; capsuleId: string; seq: number }
  | { kind: 'capsule.deleted'; capsuleId: string }
  | { kind: 'library.changed' }
  | { kind: 'settings.changed' };

const CHANNEL_NAME = 'capsule-v1';

let channel: BroadcastChannel | null = null;
const handlers = new Set<MultitabHandler>();

function ensureChannel(): BroadcastChannel | null {
  if (channel) return channel;
  if (typeof BroadcastChannel === 'undefined') return null;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.addEventListener('message', (ev) => {
    const parsed = MESSAGE_SCHEMA.safeParse(ev.data);
    if (!parsed.success) return;
    if (parsed.data.originTabId === getTabId()) return; // ignore echoes
    for (const h of handlers) {
      try {
        h(parsed.data);
      } catch {
        /* handler error must not break others */
      }
    }
  });
  return channel;
}

const TAB_ID = (() => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tab_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
})();

export function getTabId(): string {
  return TAB_ID;
}

export function postMultitab(msg: MultitabOutgoing): void {
  const ch = ensureChannel();
  if (!ch) return;
  ch.postMessage({ ...msg, originTabId: TAB_ID });
}

export function onMultitab(handler: MultitabHandler): () => void {
  ensureChannel();
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function closeMultitab(): void {
  if (channel) {
    channel.close();
    channel = null;
  }
  handlers.clear();
}
