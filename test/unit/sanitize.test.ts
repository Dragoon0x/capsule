import { describe, it, expect } from 'vitest';
import { sanitizeHtml, renderMarkdownSafe } from '../../src/lib/sanitize';

describe('sanitize HTML', () => {
  const attacks = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<a href="javascript:alert(1)">click</a>',
    '<svg onload=alert(1)></svg>',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<div style="expression(alert(1))">x</div>',
    '<style>body{background:url("javascript:alert(1)")}</style>',
    '<form><input onfocus=alert(1) autofocus></form>',
    '<body onload=alert(1)>',
    '<object data="javascript:alert(1)"></object>',
  ];

  for (const a of attacks) {
    it(`strips: ${a.slice(0, 40)}…`, () => {
      const clean = sanitizeHtml(a);
      expect(clean).not.toMatch(/javascript:/i);
      expect(clean).not.toMatch(/on\w+=/i);
      expect(clean).not.toMatch(/<script/i);
      expect(clean).not.toMatch(/<iframe/i);
      expect(clean).not.toMatch(/<style/i);
    });
  }

  it('preserves safe anchor tags', () => {
    const html = sanitizeHtml('<a href="https://example.com">ok</a>');
    expect(html).toContain('href="https://example.com"');
  });
});

describe('markdown render', () => {
  it('renders headings, lists, links', () => {
    const out = renderMarkdownSafe('# Hello\n- one\n- [link](https://a.com)');
    expect(out).toContain('<h1>');
    expect(out).toContain('<ul>');
    expect(out).toContain('href="https://a.com"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('strips XSS from markdown', () => {
    const out = renderMarkdownSafe('[x](javascript:alert(1))');
    expect(out).not.toMatch(/javascript:/i);
  });
});
