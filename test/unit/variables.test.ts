import { describe, it, expect } from 'vitest';
import { mergeVars } from '../../src/features/compile/variables';
import type { Capsule } from '../../src/features/capsules/types';

function cap(vars: Record<string, string>): Capsule {
  return {
    id: `c_${Math.random()}`,
    title: 't',
    description: '',
    tags: [],
    pinned: false,
    items: [],
    seq: 1,
    createdAt: 0,
    updatedAt: 0,
    lastUsedAt: 0,
    vars,
  };
}

describe('mergeVars', () => {
  it('returns empty object for empty inputs', () => {
    expect(mergeVars({}, [], {})).toEqual({});
  });
  it('scratch overrides all', () => {
    const m = mergeVars({ x: 'S' }, [cap({ x: 'C' })], { x: 'G' });
    expect(m['x']).toBe('S');
  });
  it('later capsule overrides earlier', () => {
    const m = mergeVars({}, [cap({ k: '1' }), cap({ k: '2' })], {});
    expect(m['k']).toBe('2');
  });
  it('global provides fallback', () => {
    const m = mergeVars({}, [], { y: 'gval' });
    expect(m['y']).toBe('gval');
  });
});
