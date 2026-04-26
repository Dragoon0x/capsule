import { zlibSync, strToU8 } from 'fflate';
import { z } from 'zod';
import { CapsuleSchema, type Capsule } from '../capsules/types';
import { LIMITS } from '../capsules/types';
import { CapsuleError } from '../../lib/errors';

export const SHARE_VERSION = 1;

/**
 * Share payload: stripped-down capsules (no blob bodies; blob refs become placeholders).
 */
export const SharePayloadSchema = z.object({
  v: z.literal(SHARE_VERSION),
  capsules: z.array(CapsuleSchema).max(50),
});
export type SharePayload = z.infer<typeof SharePayloadSchema>;

/**
 * Strip binary content from capsules before sharing. Images become placeholder
 * items with a note, since blob data isn't portable via URL.
 */
export function stripForShare(capsules: Capsule[]): Capsule[] {
  return capsules.map((c) => ({
    ...c,
    items: c.items.map((it) => {
      if (it.type === 'image') {
        return {
          ...it,
          thumbDataUrl: undefined,
          note: it.note || '[image omitted in share — add on import]',
        };
      }
      return it;
    }),
  }));
}

export interface EncodeResult {
  /** Encoded URL-hash string (without leading #). */
  hash: string;
  /** Size in characters. */
  size: number;
  /** True if under the URL budget. */
  inBudget: boolean;
  /** Downloadable file contents (plain JSON bytes) for fallback case. */
  fileBytes: Uint8Array;
  /** Suggested filename for the fallback download. */
  fileName: string;
}

/**
 * Encode capsules for sharing. Returns both a URL-hash and a file-fallback
 * payload; caller picks based on `inBudget`.
 */
export function encodeShare(capsules: Capsule[]): EncodeResult {
  const stripped = stripForShare(capsules);
  const payload: SharePayload = { v: SHARE_VERSION, capsules: stripped };
  const json = JSON.stringify(payload);
  const bytes = strToU8(json);

  // gzip + base64url for URL
  const compressed = zlibSync(bytes, { level: 9 });
  const hash = toBase64Url(compressed);

  const fileName = suggestFileName(capsules);

  return {
    hash,
    size: hash.length,
    inBudget: hash.length <= LIMITS.SHARE_URL_BUDGET_CHARS,
    fileBytes: bytes, // raw JSON for the .capsule file
    fileName,
  };
}

function suggestFileName(capsules: Capsule[]): string {
  if (capsules.length === 1) {
    const first = capsules[0];
    const slug = first?.title ? sanitizeSlug(first.title) : 'capsule';
    return `${slug}.capsule.json`;
  }
  return `capsules-${capsules.length}.capsule.json`;
}

function sanitizeSlug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^\w\s-]+/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40) || 'capsule'
  );
}

/**
 * URL-safe base64 without padding. Works with bytes produced by fflate.
 */
export function toBase64Url(bytes: Uint8Array): string {
  // btoa operates on latin-1 strings; chunk to avoid argument length blowups.
  const CHUNK = 0x8000;
  let bin = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    bin += String.fromCharCode(...slice);
  }
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Assemble a full share URL from the current origin and an encoded hash.
 */
export function toShareUrl(encoded: EncodeResult, origin: string): string | null {
  if (!encoded.inBudget) return null;
  return `${origin}/#s=${encoded.hash}`;
}

/** Helper for raising when encode exceeds the URL budget and no fallback is desired. */
export function ensureInBudget(r: EncodeResult): void {
  if (!r.inBudget) {
    throw new CapsuleError(
      'SHARE_ENCODE_TOO_LARGE',
      'This share is too large for a URL. Download as a file instead.',
    );
  }
}
