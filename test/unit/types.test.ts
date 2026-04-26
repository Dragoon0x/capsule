import { describe, it, expect } from 'vitest';
import { CapsuleSchema, ItemSchema } from '../../src/features/capsules/types';

describe('CapsuleSchema', () => {
  it('rejects missing title', () => {
    const r = CapsuleSchema.safeParse({
      id: 'cap_x',
      title: '',
      description: '',
      tags: [],
      pinned: false,
      items: [],
      seq: 0,
      createdAt: 0,
      updatedAt: 0,
      lastUsedAt: 0,
      vars: {},
    });
    expect(r.success).toBe(false);
  });

  it('applies defaults', () => {
    const r = CapsuleSchema.parse({
      id: 'cap_x',
      title: 'x',
      items: [],
      createdAt: 0,
      updatedAt: 0,
    });
    expect(r.tags).toEqual([]);
    expect(r.pinned).toBe(false);
    expect(r.vars).toEqual({});
  });

  it('rejects too many items', () => {
    const items = Array.from({ length: 2001 }, (_, i) => ({
      id: `i_${i}`,
      type: 'text' as const,
      order: i,
      label: '',
      text: '',
      createdAt: 0,
      updatedAt: 0,
    }));
    const r = CapsuleSchema.safeParse({
      id: 'cap_x',
      title: 'x',
      items,
      createdAt: 0,
      updatedAt: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe('ItemSchema discriminator', () => {
  it('accepts known types', () => {
    const r = ItemSchema.safeParse({
      id: 'i',
      type: 'url',
      order: 0,
      label: '',
      href: 'https://a.com',
      title: '',
      note: '',
      createdAt: 0,
      updatedAt: 0,
    });
    expect(r.success).toBe(true);
  });
  it('rejects unknown type', () => {
    const r = ItemSchema.safeParse({
      id: 'i',
      type: 'unknown',
      order: 0,
      label: '',
      createdAt: 0,
      updatedAt: 0,
    });
    expect(r.success).toBe(false);
  });
  it('rejects invalid URL', () => {
    const r = ItemSchema.safeParse({
      id: 'i',
      type: 'url',
      order: 0,
      label: '',
      href: 'not a url',
      title: '',
      note: '',
      createdAt: 0,
      updatedAt: 0,
    });
    expect(r.success).toBe(false);
  });
});
