import Dexie, { type Table } from 'dexie';
import type { Capsule } from '../features/capsules/types';

/**
 * Dexie schema with versioned migrations.
 *
 * RULES:
 *  - NEVER change a released version's schema string; always add a new version.
 *  - Every version upgrade MUST have a fixture at test/fixtures/db-v{n}.json that
 *    exercises it.
 *  - The shape of the stored object is validated with zod on read (see repo.ts).
 */

export interface BlobRecord {
  id: string; // matches image/file item blobId
  mime: string;
  data: Blob;
  createdAt: number;
  size: number;
}

export class CapsuleDB extends Dexie {
  capsules!: Table<Capsule, string>;
  blobs!: Table<BlobRecord, string>;

  constructor(name = 'capsule') {
    super(name);

    // ---- v1: initial schema ----
    // Indexes: primary key on id; by-updatedAt, by-pinned, by-lastUsedAt, *tags (multi-entry)
    this.version(1).stores({
      capsules: 'id, updatedAt, lastUsedAt, pinned, *tags',
      blobs: 'id, createdAt',
    });

    // Future versions example:
    // this.version(2).stores({...}).upgrade(tx => {...});
  }
}

let dbInstance: CapsuleDB | null = null;

export function getDB(): CapsuleDB {
  if (!dbInstance) dbInstance = new CapsuleDB();
  return dbInstance;
}

/** Test helper: open an isolated DB with a unique name. */
export function makeDBForTest(name: string): CapsuleDB {
  return new CapsuleDB(name);
}

/** Test helper: close and reset the shared instance. */
export async function __closeDBForTest(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
