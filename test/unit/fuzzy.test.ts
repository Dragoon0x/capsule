import { describe, it, expect } from 'vitest';
import { fuzzyMatch } from '../../src/features/search/fuzzy';
import { search } from '../../src/features/search';
import type { Capsule } from '../../src/features/capsules/types';

describe('fuzzyMatch', () => {
  it('returns null when needle not present', () => {
    expect(fuzzyMatch('xyz', 'abc')).toBeNull();
  });

  it('matches sequential chars', () => {
    const r = fuzzyMatch('abc', 'axbxc');
    expect(r).not.toBeNull();
    expect(r?.indices).toEqual([0, 2, 4]);
  });

  it('scores consecutive matches higher than scattered', () => {
    const a = fuzzyMatch('abc', 'abc');
    const b = fuzzyMatch('abc', 'axxxbxxxxc');
    expect((a?.score ?? 0)).toBeGreaterThan((b?.score ?? 0));
  });
});

describe('search', () => {
  const caps = (title: string, extra: Partial<Capsule> = {}): Capsule => ({
    id: `c_${title}`,
    title,
    description: '',
    tags: [],
    pinned: false,
    items: [],
    seq: 1,
    createdAt: 0,
    updatedAt: 0,
    lastUsedAt: 0,
    vars: {},
    ...extra,
  });

  it('returns all when query empty', () => {
    const result = search([caps('Alpha'), caps('Beta')], '');
    expect(result).toHaveLength(2);
  });

  it('ranks title match above body match', () => {
    const a = caps('auth reqs');
    const b = caps('styles', { description: 'auth colors' });
    const r = search([b, a], 'auth');
    expect(r[0]?.capsule.id).toBe(a.id);
  });
});
