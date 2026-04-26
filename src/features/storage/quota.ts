import { CapsuleError, reportError } from '../../lib/errors';

export interface QuotaInfo {
  /** bytes used by this origin (estimate) */
  usage: number;
  /** total quota in bytes (estimate) */
  quota: number;
  /** fraction used, 0..1 */
  fraction: number;
  /** true when fraction > 0.8 */
  nearFull: boolean;
}

export async function estimateQuota(): Promise<QuotaInfo | null> {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.storage === 'undefined' ||
    typeof navigator.storage.estimate !== 'function'
  ) {
    return null;
  }
  try {
    const est = await navigator.storage.estimate();
    const usage = est.usage ?? 0;
    const quota = est.quota ?? 0;
    const fraction = quota > 0 ? usage / quota : 0;
    return { usage, quota, fraction, nearFull: fraction > 0.8 };
  } catch (e) {
    reportError(e, { where: 'estimateQuota' });
    return null;
  }
}

/**
 * Request persistent storage. Only call on first meaningful write, not on boot.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.storage === 'undefined' ||
    typeof navigator.storage.persist !== 'function'
  ) {
    return false;
  }
  try {
    return await navigator.storage.persist();
  } catch (e) {
    reportError(e, { where: 'requestPersistentStorage' });
    return false;
  }
}

/**
 * Map an arbitrary error to a typed CapsuleError. Recognizes QuotaExceededError.
 */
export function wrapStorageError(e: unknown, op: string): CapsuleError {
  if (e instanceof DOMException && e.name === 'QuotaExceededError') {
    return new CapsuleError(
      'STORAGE_QUOTA',
      'Your browser storage is full. Export and prune to continue.',
      e,
    );
  }
  return new CapsuleError(
    op === 'read' ? 'DB_READ_FAILED' : 'DB_WRITE_FAILED',
    op === 'read' ? 'Failed to read from storage.' : 'Failed to write to storage.',
    e,
  );
}
