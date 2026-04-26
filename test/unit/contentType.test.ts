import { describe, it, expect } from 'vitest';
import { detectContent, guessLanguage } from '../../src/lib/contentType';

describe('detectContent', () => {
  it('detects a bare URL', () => {
    const r = detectContent('https://example.com');
    expect(r.kind).toBe('url');
    if (r.kind === 'url') expect(r.href).toBe('https://example.com/');
  });

  it('does not detect URL in a multi-line blob', () => {
    const r = detectContent('Check this https://example.com\nand stuff');
    expect(r.kind).not.toBe('url');
  });

  it('detects valid JSON', () => {
    const r = detectContent('{"a":1,"b":[2,3]}');
    expect(r.kind).toBe('json');
  });

  it('detects TypeScript code', () => {
    const src = `import { x } from 'y';\nexport const f = () => {\n  return 1;\n};`;
    const r = detectContent(src);
    expect(r.kind).toBe('code');
    if (r.kind === 'code') expect(r.language).toBe('typescript');
  });

  it('detects python', () => {
    const src = `def greet(name):\n    print(f"Hello {name}")\n\ngreet("world")`;
    const r = detectContent(src);
    expect(r.kind).toBe('code');
    if (r.kind === 'code') expect(r.language).toBe('python');
  });

  it('detects markdown', () => {
    const r = detectContent('# Heading\n\nSome content');
    expect(r.kind).toBe('markdown');
  });

  it('falls back to text', () => {
    const r = detectContent('just a sentence.');
    expect(r.kind).toBe('text');
  });
});

describe('guessLanguage', () => {
  it('yaml', () => {
    expect(guessLanguage('---\nname: x\nport: 80\n')).toBe('yaml');
  });
  it('sql', () => {
    expect(guessLanguage('SELECT * FROM users WHERE id = 1')).toBe('sql');
  });
  it('rust', () => {
    expect(guessLanguage('fn main() -> Result<(), E> {\n  Ok(())\n}')).toBe('rust');
  });
});
