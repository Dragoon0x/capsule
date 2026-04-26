import { z } from 'zod';
import { CapsuleSchema, type Capsule } from '../capsules/types';
import { listCapsules } from '../../db/repo';

export const BACKUP_VERSION = 1;

export const BackupFileSchema = z.object({
  kind: z.literal('capsule-backup'),
  v: z.literal(BACKUP_VERSION),
  exportedAt: z.number().int().nonnegative(),
  capsules: z.array(CapsuleSchema),
});

export type BackupFile = z.infer<typeof BackupFileSchema>;

/**
 * Collect full library into a JSON backup (pretty-printed).
 * NOTE: blob bytes aren't embedded; only blob refs travel.
 */
export async function exportBackup(): Promise<{ json: string; fileName: string; capsules: Capsule[] }> {
  const capsules = await listCapsules();
  const payload: BackupFile = {
    kind: 'capsule-backup',
    v: BACKUP_VERSION,
    exportedAt: Date.now(),
    capsules,
  };
  const json = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  return { json, fileName: `capsule-backup-${date}.json`, capsules };
}
