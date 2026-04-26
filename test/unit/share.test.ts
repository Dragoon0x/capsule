import { describe, it, expect } from 'vitest';
import { encodeShare } from '../../src/features/share/encode';
import { decodeShareFromHash, decodeShareFromFile } from '../../src/features/share/decode';
import { CapsuleError } from '../../src/lib/errors';
import type { Capsule } from '../../src/features/capsules/types';

function cap(partial: Partial<Capsule> = {}): Capsule {
  return {
    id: 'cap_test',
    title: 'Test',
    description: '',
    tags: [],
    pinned: false,
    items: [],
    seq: 1,
    createdAt: 0,
    updatedAt: 0,
    lastUsedAt: 0,
    vars: {},
    ...partial,
  };
}

describe('share round-trip', () => {
  it('encodes and decodes a single capsule', () => {
    const input = [
      cap({
        id: 'cap_a',
        title: 'Auth',
        items: [
          {
            id: 'i1',
            type: 'text',
            order: 0,
            label: 'Background',
            text: 'hello world',
            createdAt: 0,
            updatedAt: 0,
          },
        ],
      }),
    ];
    const encoded = encodeShare(input);
    expect(encoded.size).toBeGreaterThan(0);
    const decoded = decodeShareFromHash(encoded.hash);
    expect(decoded.capsules).toHaveLength(1);
    const c = decoded.capsules[0]!;
    expect(c.title).toBe('Auth');
    expect(c.items[0]?.type).toBe('text');
  });

  it('encodes unicode and code safely', () => {
    const input = [
      cap({
        title: '🔥 エモい',
        items: [
          {
            id: 'c1',
            type: 'code',
            order: 0,
            label: '',
            text: 'const x = "🌟 \u2028 漢字";',
            language: 'typescript',
            createdAt: 0,
            updatedAt: 0,
          },
        ],
      }),
    ];
    const encoded = encodeShare(input);
    const decoded = decodeShareFromHash(encoded.hash);
    expect(decoded.capsules[0]?.title).toBe('🔥 エモい');
    const item = decoded.capsules[0]?.items[0];
    if (item?.type === 'code') {
      expect(item.text).toBe('const x = "🌟 \u2028 漢字";');
    }
  });

  it('strips image thumb data from share payload', () => {
    const input = [
      cap({
        items: [
          {
            id: 'i1',
            type: 'image',
            order: 0,
            label: '',
            blobId: 'b_1',
            mime: 'image/png',
            note: '',
            thumbDataUrl: 'data:image/png;base64,XXXX',
            createdAt: 0,
            updatedAt: 0,
          },
        ],
      }),
    ];
    const encoded = encodeShare(input);
    const decoded = decodeShareFromHash(encoded.hash);
    const item = decoded.capsules[0]?.items[0];
    if (item?.type === 'image') {
      expect(item.thumbDataUrl).toBeUndefined();
      expect(item.note).toContain('omitted');
    }
  });
});

describe('share decode defense', () => {
  it('rejects garbage base64', () => {
    expect(() => decodeShareFromHash('not-valid-base64!')).toThrow(CapsuleError);
  });

  it('rejects non-compressed payload', () => {
    // valid base64url but not gzip
    expect(() => decodeShareFromHash('aGVsbG8')).toThrow(CapsuleError);
  });

  it('rejects valid json with wrong shape', () => {
    const bad = JSON.stringify({ v: 1, capsules: [{ bogus: true }] });
    expect(() => decodeShareFromFile(bad)).toThrow(CapsuleError);
  });

  it('rejects wrong version', () => {
    const bad = JSON.stringify({ v: 99, capsules: [] });
    expect(() => decodeShareFromFile(bad)).toThrow(CapsuleError);
  });

  it('rejects invalid JSON', () => {
    expect(() => decodeShareFromFile('{not json')).toThrow(CapsuleError);
  });
});
