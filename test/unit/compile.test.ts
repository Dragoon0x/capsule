import { describe, it, expect } from 'vitest';
import { toIR, resolveVars, extractVarNames } from '../../src/features/compile/serialize';
import { toXml, escapeAttr, safeCdata } from '../../src/features/compile/toXml';
import { toMarkdown } from '../../src/features/compile/toMarkdown';
import { mergeVars } from '../../src/features/compile/variables';
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

describe('compile/resolveVars', () => {
  it('resolves known vars', () => {
    const unresolved = new Set<string>();
    expect(resolveVars('Hello {{name}}!', { name: 'world' }, unresolved)).toBe('Hello world!');
    expect(unresolved.size).toBe(0);
  });

  it('leaves unknown vars literal and records them', () => {
    const unresolved = new Set<string>();
    expect(resolveVars('Hi {{x}} {{y}}', { x: 'X' }, unresolved)).toBe('Hi X {{y}}');
    expect([...unresolved]).toEqual(['y']);
  });

  it('ignores malformed braces', () => {
    const u = new Set<string>();
    expect(resolveVars('{{not}closed', {}, u)).toBe('{{not}closed');
  });
});

describe('compile/mergeVars', () => {
  it('scratch wins over capsule wins over global', () => {
    const merged = mergeVars(
      { k: 'scratch' },
      [cap({ vars: { k: 'cap' } })],
      { k: 'global' },
    );
    expect(merged['k']).toBe('scratch');
  });

  it('later capsules override earlier', () => {
    const merged = mergeVars(
      {},
      [cap({ id: 'a', vars: { k: 'first' } }), cap({ id: 'b', vars: { k: 'second' } })],
      {},
    );
    expect(merged['k']).toBe('second');
  });
});

describe('compile/toXml', () => {
  it('escapes special attr chars', () => {
    expect(escapeAttr('a"b<c&d>e\'f')).toBe('a&quot;b&lt;c&amp;d&gt;e&apos;f');
  });

  it('protects against CDATA escape', () => {
    expect(safeCdata(']]>')).toBe(']]]]><![CDATA[>');
    expect(safeCdata('no cdata here')).toBe('no cdata here');
  });

  it('renders deterministic output for a simple capsule', () => {
    const ir = toIR({
      capsules: [
        cap({
          id: 'cap_01',
          title: 'Auth',
          seq: 2,
          items: [
            {
              id: 'itm_1',
              type: 'text',
              order: 0,
              label: 'Background',
              text: 'hello',
              createdAt: 0,
              updatedAt: 0,
            },
            {
              id: 'itm_2',
              type: 'code',
              order: 1,
              label: '',
              text: 'const x = 1;',
              language: 'typescript',
              createdAt: 0,
              updatedAt: 0,
            },
          ],
        }),
      ],
      scratch: [],
      task: 'Do the thing',
      vars: {},
      includeImages: false,
    });
    const out1 = toXml(ir);
    const out2 = toXml(ir);
    expect(out1).toBe(out2); // deterministic
    expect(out1).toContain('<capsule id="cap_01" title="Auth" version="2">');
    expect(out1).toContain('language="typescript"');
    expect(out1).toContain('<![CDATA[const x = 1;]]>');
    expect(out1).toContain('<task>Do the thing</task>');
    expect(out1.endsWith('\n')).toBe(true);
  });

  it('renders image as placeholder by default', () => {
    const ir = toIR({
      capsules: [
        cap({
          items: [
            {
              id: 'i',
              type: 'image',
              order: 0,
              label: '',
              blobId: 'b1',
              mime: 'image/png',
              note: '',
              createdAt: 0,
              updatedAt: 0,
            },
          ],
        }),
      ],
      scratch: [],
      task: '',
      vars: {},
      includeImages: false,
    });
    const out = toXml(ir);
    expect(out).toContain('placeholder="true"');
    expect(out).not.toContain('<data>');
  });

  it('inlines image data when requested', () => {
    const ir = toIR({
      capsules: [
        cap({
          items: [
            {
              id: 'i',
              type: 'image',
              order: 0,
              label: '',
              blobId: 'b1',
              mime: 'image/png',
              note: '',
              createdAt: 0,
              updatedAt: 0,
            },
          ],
        }),
      ],
      scratch: [],
      task: '',
      vars: {},
      includeImages: true,
      imageDataUrlById: { b1: 'data:image/png;base64,XXXX' },
    });
    const out = toXml(ir);
    expect(out).toContain('<data>data:image/png;base64,XXXX</data>');
  });
});

describe('compile/toMarkdown', () => {
  it('uses a longer fence when content has backticks', () => {
    const ir = toIR({
      capsules: [
        cap({
          items: [
            {
              id: 'i',
              type: 'code',
              order: 0,
              label: '',
              text: '``` echo hi ```',
              language: 'bash',
              createdAt: 0,
              updatedAt: 0,
            },
          ],
        }),
      ],
      scratch: [],
      task: '',
      vars: {},
      includeImages: false,
    });
    const md = toMarkdown(ir);
    expect(md).toMatch(/````+bash/);
  });
});

describe('compile/extractVarNames', () => {
  it('lists unique var names across items, scratch, task', () => {
    const names = extractVarNames({
      capsules: [
        cap({
          description: 'Hi {{user}}',
          items: [
            {
              id: 'i',
              type: 'text',
              order: 0,
              label: '',
              text: 'Ref {{user}} and {{project}}',
              createdAt: 0,
              updatedAt: 0,
            },
          ],
        }),
      ],
      scratch: [],
      task: 'Do {{thing}}',
      vars: {},
      includeImages: false,
    });
    expect(names).toEqual(['project', 'thing', 'user']);
  });
});
