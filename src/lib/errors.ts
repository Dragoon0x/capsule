/**
 * Typed error hierarchy. Every error has a stable `code` and a user-safe `message`.
 * Callers can discriminate without string-matching.
 */

export type ErrorCode =
  | 'STORAGE_QUOTA'
  | 'STORAGE_UNAVAILABLE'
  | 'DB_MIGRATION_FAILED'
  | 'DB_WRITE_FAILED'
  | 'DB_READ_FAILED'
  | 'SHARE_DECODE_INVALID'
  | 'SHARE_ENCODE_TOO_LARGE'
  | 'VOICE_UNSUPPORTED'
  | 'VOICE_PERMISSION_DENIED'
  | 'IMPORT_INVALID'
  | 'CLIPBOARD_UNAVAILABLE'
  | 'UNEXPECTED';

export class CapsuleError extends Error {
  readonly code: ErrorCode;
  readonly cause?: unknown;
  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'CapsuleError';
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

export function isCapsuleError(e: unknown): e is CapsuleError {
  return e instanceof CapsuleError;
}

export function toUserMessage(e: unknown): string {
  if (isCapsuleError(e)) return e.message;
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}

/**
 * Central reporter for unexpected errors. In dev, logs to console.error.
 * In production this could ship to a local log store; never network.
 */
export function reportError(e: unknown, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error('[capsule]', e, context);
  }
  // For production we keep a ring buffer in memory, accessible from Settings.
  pushToRing({ e, context, at: Date.now() });
}

interface RingEntry {
  e: unknown;
  context: Record<string, unknown> | undefined;
  at: number;
}

const RING_MAX = 50;
const ring: RingEntry[] = [];

function pushToRing(entry: RingEntry): void {
  ring.push(entry);
  if (ring.length > RING_MAX) ring.shift();
}

export function getRecentErrors(): ReadonlyArray<RingEntry> {
  return ring.slice();
}
