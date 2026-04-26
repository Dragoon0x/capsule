import { BackupFileSchema, type BackupFile } from './export';
import { CapsuleError } from '../../lib/errors';
import { putCapsule, getCapsule } from '../../db/repo';
import type { Capsule } from '../capsules/types';

/**
 * Parse a backup file from text. Defensive: returns typed errors.
 */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new CapsuleError('IMPORT_INVALID', 'File is not valid JSON.', e);
  }
  const parsed = BackupFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CapsuleError(
      'IMPORT_INVALID',
      'File has unexpected shape; refusing to import.',
      parsed.error,
    );
  }
  return parsed.data;
}

export interface ImportResult {
  added: number;
  replaced: number;
  skipped: number;
}

export type ImportStrategy = 'merge-newer' | 'replace' | 'skip-existing';

/**
 * Apply a backup to the library with a chosen conflict strategy.
 *  - merge-newer: incoming replaces local if incoming.updatedAt > local.updatedAt
 *  - replace: incoming always wins
 *  - skip-existing: never overwrite
 */
export async function applyBackup(
  backup: BackupFile,
  strategy: ImportStrategy,
): Promise<ImportResult> {
  let added = 0;
  let replaced = 0;
  let skipped = 0;
  for (const incoming of backup.capsules) {
    const existing = await getCapsule(incoming.id);
    if (!existing) {
      await putCapsule(incoming);
      added += 1;
      continue;
    }
    const shouldOverwrite =
      strategy === 'replace' ||
      (strategy === 'merge-newer' && incoming.updatedAt > existing.updatedAt);
    if (shouldOverwrite) {
      await putCapsule({ ...incoming, seq: Math.max(existing.seq, incoming.seq) + 1 });
      replaced += 1;
    } else {
      skipped += 1;
    }
  }
  return { added, replaced, skipped };
}

export function fromSharePayload(capsules: Capsule[]): Capsule[] {
  // Caller may want to regenerate ids to avoid collisions with existing library.
  return capsules;
}
