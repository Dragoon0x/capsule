import type { IR, IRItem } from './serialize';

/**
 * Render IR → Markdown prompt. Alternative to XML.
 * Uses code fences (with language); images placeholder by default.
 */

export interface MarkdownOptions {
  includeHeadings?: boolean;
  headingLevel?: 1 | 2 | 3;
}

export function toMarkdown(ir: IR, opts: MarkdownOptions = {}): string {
  const headingLevel = opts.headingLevel ?? 2;
  const includeHeadings = opts.includeHeadings ?? true;
  const h = (lvl: number, s: string): string => `${'#'.repeat(Math.min(6, lvl))} ${s}`;

  const lines: string[] = [];

  for (const c of ir.capsules) {
    if (includeHeadings) {
      lines.push(h(headingLevel, `${c.title}${c.version ? ` · v${c.version}` : ''}`));
    }
    if (c.description.trim()) lines.push('', c.description.trim());
    if (c.tags.length > 0) lines.push('', `_tags: ${c.tags.join(', ')}_`);

    for (const it of c.items) {
      lines.push('');
      lines.push(...renderItem(it, headingLevel + 1, h));
    }
    lines.push(''); // blank between capsules
  }

  if (ir.scratch.length > 0) {
    if (includeHeadings) lines.push(h(headingLevel, 'Scratch'));
    for (const it of ir.scratch) {
      lines.push('');
      lines.push(...renderItem(it, headingLevel + 1, h));
    }
    lines.push('');
  }

  if (ir.task.trim().length > 0) {
    if (includeHeadings) lines.push(h(headingLevel, 'Task'));
    lines.push('', ir.task.trim(), '');
  }

  return (
    lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '') + (lines.length ? '' : '')
  );
}

function renderItem(it: IRItem, lvl: number, h: (lvl: number, s: string) => string): string[] {
  const out: string[] = [];
  const label = it.label?.trim();
  switch (it.type) {
    case 'text':
      if (label) out.push(h(lvl, label));
      out.push((it.text ?? '').trim());
      break;
    case 'code': {
      if (label) out.push(h(lvl, label));
      const lang = it.language ?? 'plaintext';
      const body = (it.text ?? '').replace(/\r\n/g, '\n');
      // Protect against ``` inside body by using a longer fence if needed.
      const fenceLen = longestBacktickRun(body) + 1;
      const fence = '`'.repeat(Math.max(3, fenceLen));
      out.push(`${fence}${lang}`, body, fence);
      break;
    }
    case 'url': {
      const title = label || it.title?.trim() || it.href || '';
      out.push(`- [${title}](${it.href ?? ''})`);
      if (it.note && it.note.trim()) out.push(`  ${it.note.trim()}`);
      break;
    }
    case 'image':
      if (label) out.push(h(lvl, label));
      if (it.imageDataUrl) {
        out.push(`![image](${it.imageDataUrl})`);
      } else {
        out.push(`> image placeholder (ref: \`${it.imageRef ?? ''}\`, mime: \`${it.imageMime ?? ''}\`)`);
      }
      if (it.note && it.note.trim()) out.push('', it.note.trim());
      break;
    case 'file':
      if (label) out.push(h(lvl, label));
      out.push(
        `> file: \`${it.fileName ?? ''}\` · ${it.fileMime ?? ''}${
          typeof it.fileSize === 'number' ? ` · ${it.fileSize} bytes` : ''
        }`,
      );
      if (it.note && it.note.trim()) out.push('', it.note.trim());
      break;
    case 'voice':
      if (label) out.push(h(lvl, `${label}${it.voiceMode ? ` · ${it.voiceMode}` : ''}`));
      out.push((it.text ?? '').trim());
      break;
  }
  return out;
}

function longestBacktickRun(s: string): number {
  let max = 0;
  let cur = 0;
  for (const ch of s) {
    if (ch === '`') {
      cur += 1;
      if (cur > max) max = cur;
    } else {
      cur = 0;
    }
  }
  return max;
}
