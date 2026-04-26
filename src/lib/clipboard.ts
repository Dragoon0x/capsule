import { CapsuleError } from './errors';
import { detectCapabilities } from '../features/capabilities/detect';

export async function writeClipboard(text: string): Promise<void> {
  if (!detectCapabilities().clipboardWrite) {
    // Fallback: textarea + execCommand
    fallbackCopy(text);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    // Permissions policy may block the async API — try fallback once.
    try {
      fallbackCopy(text);
    } catch (e2) {
      throw new CapsuleError('CLIPBOARD_UNAVAILABLE', 'Clipboard write was blocked.', e2 ?? e);
    }
  }
}

function fallbackCopy(text: string): void {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  ta.setAttribute('readonly', '');
  document.body.appendChild(ta);
  ta.select();
  try {
    // document.execCommand is deprecated but still works broadly.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const ok = document.execCommand('copy');
    if (!ok) throw new Error('execCommand copy returned false');
  } finally {
    document.body.removeChild(ta);
  }
}

export function downloadFile(
  name: string,
  data: string | Blob | ArrayBuffer | Uint8Array,
  mime = 'application/octet-stream',
): void {
  let blob: Blob;
  if (data instanceof Blob) {
    blob = data;
  } else if (data instanceof Uint8Array) {
    // Copy into a fresh ArrayBuffer so the Blob constructor accepts it under strict DOM types.
    const buf = new ArrayBuffer(data.byteLength);
    new Uint8Array(buf).set(data);
    blob = new Blob([buf], { type: mime });
  } else {
    blob = new Blob([data], { type: mime });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke async so the click has time to initiate.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
