import { detectCapabilities } from '../capabilities/detect';
import { CapsuleError, reportError } from '../../lib/errors';

/**
 * OPFS (Origin Private File System) wrapper with IDB-blob fallback.
 *
 * Policy:
 *  - binary or >256KB text → OPFS if available, else IDB row with a Blob value
 *  - smaller text → keep inline in the domain row (handled by caller, not here)
 *
 * We keep a flat namespace: `blobs/<id>`. No subdirs (KISS).
 */

const DIR_NAME = 'blobs';

let dirHandlePromise: Promise<FileSystemDirectoryHandle | null> | null = null;

function getDir(): Promise<FileSystemDirectoryHandle | null> {
  if (dirHandlePromise) return dirHandlePromise;
  dirHandlePromise = (async () => {
    if (!detectCapabilities().opfs) return null;
    try {
      const root = await navigator.storage.getDirectory();
      return await root.getDirectoryHandle(DIR_NAME, { create: true });
    } catch (e) {
      reportError(e, { where: 'opfs.getDir' });
      return null;
    }
  })();
  return dirHandlePromise;
}

export async function opfsAvailable(): Promise<boolean> {
  const d = await getDir();
  return d !== null;
}

export async function writeBlobOPFS(id: string, data: Blob | ArrayBuffer): Promise<void> {
  const dir = await getDir();
  if (!dir) throw new CapsuleError('STORAGE_UNAVAILABLE', 'OPFS is not available.');
  try {
    const fh = await dir.getFileHandle(safeName(id), { create: true });
    const writable = await fh.createWritable();
    await writable.write(data);
    await writable.close();
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new CapsuleError(
        'STORAGE_QUOTA',
        'Your browser storage is full. Export and prune to continue.',
        e,
      );
    }
    throw new CapsuleError('DB_WRITE_FAILED', 'Failed to write blob.', e);
  }
}

export async function readBlobOPFS(id: string): Promise<Blob | null> {
  const dir = await getDir();
  if (!dir) return null;
  try {
    const fh = await dir.getFileHandle(safeName(id));
    const f = await fh.getFile();
    return f;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return null;
    throw new CapsuleError('DB_READ_FAILED', 'Failed to read blob.', e);
  }
}

export async function deleteBlobOPFS(id: string): Promise<void> {
  const dir = await getDir();
  if (!dir) return;
  try {
    await dir.removeEntry(safeName(id));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return;
    throw new CapsuleError('DB_WRITE_FAILED', 'Failed to delete blob.', e);
  }
}

function safeName(id: string): string {
  // Permit only [A-Za-z0-9_-].
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new CapsuleError('DB_WRITE_FAILED', `Invalid blob id: ${id}`);
  }
  return id;
}
