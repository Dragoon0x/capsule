import type { Capsule } from '../features/capsules/types';
import { CapsuleSchema, LIMITS } from '../features/capsules/types';
import { CapsuleError, reportError } from '../lib/errors';
import { wrapStorageError } from '../features/storage/quota';
import { getDB, type BlobRecord, type CapsuleDB } from './schema';

/**
 * Typed repository. Every read validates via zod; every write catches
 * QuotaExceededError. No store reaches into Dexie directly.
 */

function db(): CapsuleDB {
  return getDB();
}

export async function getCapsule(id: string): Promise<Capsule | null> {
  try {
    const raw = await db().capsules.get(id);
    if (!raw) return null;
    const parsed = CapsuleSchema.safeParse(raw);
    if (!parsed.success) {
      reportError(parsed.error, { where: 'getCapsule', id });
      return null;
    }
    return parsed.data;
  } catch (e) {
    throw wrapStorageError(e, 'read');
  }
}

export async function listCapsules(): Promise<Capsule[]> {
  try {
    const all = await db().capsules.toArray();
    const out: Capsule[] = [];
    for (const raw of all) {
      const parsed = CapsuleSchema.safeParse(raw);
      if (parsed.success) {
        out.push(parsed.data);
      } else {
        reportError(parsed.error, { where: 'listCapsules', id: (raw as { id?: unknown }).id });
      }
    }
    return out;
  } catch (e) {
    throw wrapStorageError(e, 'read');
  }
}

export async function putCapsule(c: Capsule): Promise<void> {
  // Guard: validate before write so nothing corrupt lands in IDB.
  const parsed = CapsuleSchema.safeParse(c);
  if (!parsed.success) {
    throw new CapsuleError('DB_WRITE_FAILED', 'Capsule failed validation before write.');
  }
  if (parsed.data.items.length > LIMITS.MAX_ITEMS_PER_CAPSULE) {
    throw new CapsuleError(
      'DB_WRITE_FAILED',
      `Too many items in capsule (max ${LIMITS.MAX_ITEMS_PER_CAPSULE}).`,
    );
  }
  try {
    await db().capsules.put(parsed.data);
  } catch (e) {
    throw wrapStorageError(e, 'write');
  }
}

/**
 * Optimistic put: only succeeds if the existing seq matches `expectedSeq`.
 * Returns true on success, false on conflict.
 */
export async function putCapsuleOptimistic(c: Capsule, expectedSeq: number): Promise<boolean> {
  let ok = false;
  try {
    await db().transaction('rw', db().capsules, async () => {
      const current = await db().capsules.get(c.id);
      if (current && current.seq !== expectedSeq) {
        ok = false;
        return;
      }
      const parsed = CapsuleSchema.safeParse(c);
      if (!parsed.success) {
        throw new CapsuleError('DB_WRITE_FAILED', 'Capsule failed validation before write.');
      }
      await db().capsules.put(parsed.data);
      ok = true;
    });
    return ok;
  } catch (e) {
    throw wrapStorageError(e, 'write');
  }
}

export async function deleteCapsule(id: string): Promise<void> {
  try {
    await db().capsules.delete(id);
  } catch (e) {
    throw wrapStorageError(e, 'write');
  }
}

export async function countCapsules(): Promise<number> {
  try {
    return await db().capsules.count();
  } catch (e) {
    throw wrapStorageError(e, 'read');
  }
}

// ---- blobs ----

export async function putBlob(rec: BlobRecord): Promise<void> {
  try {
    await db().blobs.put(rec);
  } catch (e) {
    throw wrapStorageError(e, 'write');
  }
}

export async function getBlob(id: string): Promise<BlobRecord | null> {
  try {
    return (await db().blobs.get(id)) ?? null;
  } catch (e) {
    throw wrapStorageError(e, 'read');
  }
}

export async function deleteBlob(id: string): Promise<void> {
  try {
    await db().blobs.delete(id);
  } catch (e) {
    throw wrapStorageError(e, 'write');
  }
}

/**
 * Collect blob ids still referenced by any capsule. Used for GC after deletes.
 */
export async function referencedBlobIds(): Promise<Set<string>> {
  const caps = await listCapsules();
  const ids = new Set<string>();
  for (const c of caps) {
    for (const it of c.items) {
      if (it.type === 'image' || it.type === 'file') ids.add(it.blobId);
    }
  }
  return ids;
}

/**
 * GC: delete blobs that are no longer referenced by any capsule.
 * Returns the number of blobs deleted.
 */
export async function gcOrphanBlobs(): Promise<number> {
  const referenced = await referencedBlobIds();
  let deleted = 0;
  try {
    const all = await db().blobs.toArray();
    for (const b of all) {
      if (!referenced.has(b.id)) {
        await db().blobs.delete(b.id);
        deleted += 1;
      }
    }
  } catch (e) {
    throw wrapStorageError(e, 'write');
  }
  return deleted;
}
