import { describe, it, expect } from 'vitest';
import { TEMPLATES, findTemplate } from '../../src/features/templates/library';
import { forkTemplate } from '../../src/features/templates/fork';
import { CapsuleSchema } from '../../src/features/capsules/types';

describe('TEMPLATES library', () => {
  it('exposes 6 starter templates', () => {
    expect(TEMPLATES.length).toBe(6);
  });

  it('has unique ids', () => {
    const ids = new Set(TEMPLATES.map((t) => t.id));
    expect(ids.size).toBe(TEMPLATES.length);
  });

  it.each(TEMPLATES.map((t) => [t.name, t]))('forks %s into a valid Capsule', (_n, tpl) => {
    const c = forkTemplate(tpl);
    const parsed = CapsuleSchema.safeParse(c);
    expect(parsed.success).toBe(true);
    expect(c.id.startsWith('cap_')).toBe(true);
    expect(c.items.every((it) => it.id.startsWith('itm_'))).toBe(true);
    expect(c.items.every((it, i) => it.order === i)).toBe(true);
    expect(c.createdAt).toBeGreaterThan(0);
  });

  it('findTemplate returns the right template', () => {
    expect(findTemplate('tpl_code_review')?.name).toBe('Code review');
    expect(findTemplate('nonexistent')).toBeUndefined();
  });
});
