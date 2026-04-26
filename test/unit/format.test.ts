import { describe, it, expect } from 'vitest';
import { formatBytes } from '../../src/lib/format/bytes';
import { formatRelative } from '../../src/lib/format/date';
import { makeId } from '../../src/lib/format/id';

describe('formatBytes', () => {
  it('handles 0', () => {
    expect(formatBytes(0)).toBe('0 B');
  });
  it('handles ranges', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB');
  });
  it('handles invalid', () => {
    expect(formatBytes(-5)).toBe('—');
    expect(formatBytes(Number.NaN)).toBe('—');
  });
});

describe('formatRelative', () => {
  const now = 1_700_000_000_000;
  it('just now', () => {
    expect(formatRelative(now - 10_000, now)).toBe('just now');
  });
  it('minutes', () => {
    expect(formatRelative(now - 90_000, now)).toBe('1m ago');
  });
  it('hours', () => {
    expect(formatRelative(now - 3 * 3600_000, now)).toBe('3h ago');
  });
  it('days', () => {
    expect(formatRelative(now - 2 * 86_400_000, now)).toBe('2d ago');
  });
});

describe('makeId', () => {
  it('has correct prefix', () => {
    expect(makeId('cap')).toMatch(/^cap_/);
    expect(makeId('itm')).toMatch(/^itm_/);
  });
  it('is unique', () => {
    const a = makeId('itm');
    const b = makeId('itm');
    expect(a).not.toBe(b);
  });
});
