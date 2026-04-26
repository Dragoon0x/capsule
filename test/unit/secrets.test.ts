import { describe, it, expect } from 'vitest';
import { scanForSecrets, redact, redactText } from '../../src/lib/secrets';

// IMPORTANT: All secret-looking fixtures below are split into pieces and
// concatenated at runtime so GitHub Push Protection does not see them as
// complete leaked tokens in the source.
const A = (...parts: string[]): string => parts.join('');

describe('scanForSecrets', () => {
  it('finds AWS access key id', () => {
    const fake = A('AKIA', 'IOSFODNN7EXAMPLE');
    const r = scanForSecrets(`export AWS_ACCESS_KEY_ID=${fake}`);
    expect(r.some((f) => f.kind === 'aws-access-key-id')).toBe(true);
  });

  it('finds GitHub token', () => {
    const fake = A('ghp', '_', 'aBcDeFgHiJkLmNoPqRsTuVwXyZ', '0123456789');
    const r = scanForSecrets(`let token = "${fake}"`);
    expect(r.some((f) => f.kind === 'github-token')).toBe(true);
  });

  it('finds Anthropic API key', () => {
    const fake = A('sk', '-ant-', '1234567890abcdefghij', '1234567890abcdef');
    const r = scanForSecrets(`ANTHROPIC=${fake}`);
    expect(r.some((f) => f.kind === 'anthropic-key')).toBe(true);
  });

  it('finds OpenAI API key', () => {
    const fake = A('sk', '-', '1234567890abcdefghij1234');
    const r = scanForSecrets(`OPENAI_KEY=${fake}`);
    expect(r.some((f) => f.kind === 'openai-key')).toBe(true);
  });

  it('finds Google API key', () => {
    // Real shape: "AIza" + exactly 35 [A-Za-z0-9_-] characters.
    const fake = A('AI', 'za', 'SyDfakekey1234567890abcdefghijkl_xy');
    expect(fake.length).toBe(39);
    const r = scanForSecrets(`KEY=${fake}`);
    expect(r.some((f) => f.kind === 'google-api-key')).toBe(true);
  });

  it('finds JWT', () => {
    const fake = A(
      'eyJ',
      'hbGciOiJIUzI1NiJ9',
      '.',
      'eyJzdWIiOiIxMjM0NTY3ODkwIn0',
      '.',
      'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    );
    const r = scanForSecrets(`jwt = ${fake}`);
    expect(r.some((f) => f.kind === 'jwt')).toBe(true);
  });

  it('finds private key block', () => {
    const fake = A('-----', 'BEGIN ', 'RSA ', 'PRIVATE ', 'KEY', '-----');
    const r = scanForSecrets(`${fake}\nMIIEpAIBAAKCAQ`);
    expect(r.some((f) => f.kind === 'rsa-private-key')).toBe(true);
  });

  it('finds Slack token', () => {
    const fake = A('xox', 'b-', '1234567890', '-', 'abcdefghijklmnop');
    const r = scanForSecrets(`SLACK=${fake}`);
    expect(r.some((f) => f.kind === 'slack-token')).toBe(true);
  });

  it('finds SSN', () => {
    const r = scanForSecrets('Patient SSN: 123-45-6789');
    expect(r.some((f) => f.kind === 'ssn-us')).toBe(true);
  });

  it('skips invalid SSN format like 000-00-0000', () => {
    const r = scanForSecrets('zero ssn 000-00-0000 invalid 666-12-3456');
    expect(r.some((f) => f.kind === 'ssn-us')).toBe(false);
  });

  it('finds credit card via Luhn', () => {
    // 4111-1111-1111-1111 is a Visa test number with valid Luhn
    const r = scanForSecrets('CC: 4111-1111-1111-1111');
    expect(r.some((f) => f.kind === 'credit-card')).toBe(true);
  });

  it('rejects 16 digits that fail Luhn', () => {
    const r = scanForSecrets('1234-5678-9012-3456');
    expect(r.some((f) => f.kind === 'credit-card')).toBe(false);
  });

  it('finds an email address (low severity)', () => {
    const r = scanForSecrets('contact me at john.doe@example.com');
    const emails = r.filter((f) => f.kind === 'email-list');
    expect(emails.length).toBe(1);
    expect(emails[0]?.severity).toBe('low');
  });

  it('finds generic key in assignment', () => {
    const r = scanForSecrets('const apiKey = "abcdefghij1234567890";');
    expect(r.some((f) => f.kind === 'generic-api-key')).toBe(true);
  });

  it('returns empty array for benign text', () => {
    const r = scanForSecrets('Hello, this is a normal sentence.');
    expect(r).toHaveLength(0);
  });

  it('returns empty for empty input', () => {
    expect(scanForSecrets('')).toHaveLength(0);
  });

  it('orders findings by position', () => {
    const ghp = A('ghp', '_', 'aBcDeFgHiJkLmNoPqRsTuVwXyZ', '0123456789');
    const ant = A('sk', '-ant-', '1234567890abcdefghij', '1234567890abcdef');
    const r = scanForSecrets(`first ${ghp} then ${ant}`);
    for (let i = 1; i < r.length; i += 1) {
      expect((r[i]?.startsAt ?? 0) >= (r[i - 1]?.startsAt ?? 0)).toBe(true);
    }
  });
});

describe('redact', () => {
  it('redacts to first/last 2', () => {
    const fake = A('AKIA', 'IOSFODNN7EXAMPLE');
    expect(redact(fake)).toBe('AK…LE');
  });
  it('uses bullets when too short', () => {
    expect(redact('a').length).toBeGreaterThan(0);
    expect(redact('hi')).toBe('••••');
  });
});

describe('redactText', () => {
  it('replaces every finding in-place', () => {
    const ghp = A('ghp', '_', 'aBcDeFgHiJkLmNoPqRsTuVwXyZ', '0123456789');
    const text = `token=${ghp} done`;
    const findings = scanForSecrets(text);
    const out = redactText(text, findings);
    expect(out).not.toContain('aBcDeFgHi');
    expect(out).toContain('done');
  });

  it('leaves text unchanged when no findings', () => {
    expect(redactText('plain', [])).toBe('plain');
  });
});
