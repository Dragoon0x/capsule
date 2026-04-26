import { describe, it, expect } from 'vitest';
import {
  cleanTranscript,
  formatTranscript,
  applyCleanupMode,
  punctuationDensity,
} from '../../src/features/voice/transcript';

describe('cleanTranscript', () => {
  it('strips common fillers', () => {
    const out = cleanTranscript('um so like you know i mean the api is actually broken basically');
    expect(out).not.toMatch(/\bum\b/i);
    expect(out).not.toMatch(/\blike\b/i);
    expect(out).not.toMatch(/\byou know\b/i);
    expect(out).not.toMatch(/\bi mean\b/i);
    expect(out).not.toMatch(/\bactually\b/i);
    expect(out).not.toMatch(/\bbasically\b/i);
    expect(out).toMatch(/the api is broken/);
  });

  it('collapses whitespace', () => {
    expect(cleanTranscript('a   b\t\tc')).toBe('a b c');
  });
});

describe('formatTranscript', () => {
  it('converts dictated commands', () => {
    const out = formatTranscript('hello period new line world comma goodbye');
    expect(out).toContain('.');
    expect(out).toContain(',');
    expect(out).toMatch(/\n/);
  });

  it('capitalizes sentences and standalone i', () => {
    const out = formatTranscript('hello world. i am here. okay.');
    expect(out.startsWith('Hello')).toBe(true);
    expect(out).toContain(' I ');
  });

  it('ensures terminal punctuation', () => {
    const out = formatTranscript('this is a statement');
    expect(out.endsWith('.')).toBe(true);
  });
});

describe('punctuationDensity', () => {
  it('0 for punctuation-free', () => {
    expect(punctuationDensity('hello world')).toBe(0);
  });
  it('non-zero for punctuated', () => {
    expect(punctuationDensity('hi, there.')).toBeGreaterThan(0);
  });
});

describe('applyCleanupMode', () => {
  it('raw is verbatim', () => {
    const raw = 'um so like this is what we know';
    expect(applyCleanupMode(raw, 'raw')).toBe(raw);
  });
  it('clean strips fillers', () => {
    expect(applyCleanupMode('um hello', 'clean')).toBe('hello');
  });
  it('formatted capitalizes and terminates', () => {
    const out = applyCleanupMode('hello world', 'formatted');
    expect(out.startsWith('H')).toBe(true);
    expect(out.endsWith('.')).toBe(true);
  });
});
