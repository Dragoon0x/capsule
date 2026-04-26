import { unzlibSync, strFromU8 } from 'fflate';
import { SharePayloadSchema, type SharePayload } from './encode';
import { CapsuleError } from '../../lib/errors';

/**
 * Decode a URL-hash share string. Defensive: any failure produces a typed error
 * rather than throwing a raw one — the hash comes from untrusted input.
 */
export function decodeShareFromHash(hashEncoded: string): SharePayload {
  const bytes = fromBase64Url(hashEncoded);
  const json = decompressToJson(bytes);
  return validate(json);
}

/**
 * Decode a .capsule.json file's contents.
 */
export function decodeShareFromFile(text: string): SharePayload {
  try {
    const parsed = JSON.parse(text) as unknown;
    return validate(parsed);
  } catch (e) {
    throw new CapsuleError('SHARE_DECODE_INVALID', 'File is not a valid Capsule share.', e);
  }
}

function decompressToJson(bytes: Uint8Array): unknown {
  let text: string;
  try {
    const inflated = unzlibSync(bytes);
    text = strFromU8(inflated);
  } catch (e) {
    throw new CapsuleError('SHARE_DECODE_INVALID', 'Share payload is not valid compressed data.', e);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new CapsuleError('SHARE_DECODE_INVALID', 'Share payload is not valid JSON.', e);
  }
}

function validate(raw: unknown): SharePayload {
  const parsed = SharePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CapsuleError(
      'SHARE_DECODE_INVALID',
      'Share payload has unexpected shape; refusing to import.',
      parsed.error,
    );
  }
  return parsed.data;
}

function fromBase64Url(b64url: string): Uint8Array {
  // Reverse URL-safe transforms, pad, decode.
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  let bin: string;
  try {
    bin = atob(b64 + pad);
  } catch (e) {
    throw new CapsuleError('SHARE_DECODE_INVALID', 'Share payload is not valid base64.', e);
  }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i) & 0xff;
  }
  return bytes;
}
