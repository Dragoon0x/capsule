import type { IR, IRCapsule, IRItem } from './serialize';

/**
 * Render IR → XML-tagged prompt. Default output format.
 * Deterministic and safe: CDATA for code, escaped attributes, placeholder for images.
 */

export interface XmlOptions {
  /** Indent spaces (default 2) */
  indent?: number;
  /** Include capsule version attribute (default true) */
  includeVersion?: boolean;
}

export function toXml(ir: IR, opts: XmlOptions = {}): string {
  const indent = opts.indent ?? 2;
  const includeVersion = opts.includeVersion ?? true;

  const pad = (n: number): string => ' '.repeat(n * indent);
  const lines: string[] = [];

  lines.push('<prompt>');
  for (const c of ir.capsules) {
    lines.push(...renderCapsule(c, 1, pad, includeVersion));
  }
  if (ir.scratch.length > 0) {
    lines.push(`${pad(1)}<scratch>`);
    for (const it of ir.scratch) {
      lines.push(...renderItem(it, 2, pad));
    }
    lines.push(`${pad(1)}</scratch>`);
  }
  if (ir.task.trim().length > 0) {
    lines.push(`${pad(1)}<task>${escapeText(ir.task)}</task>`);
  }
  lines.push('</prompt>');
  lines.push(''); // trailing newline

  return lines.join('\n');
}

function renderCapsule(
  c: IRCapsule,
  depth: number,
  pad: (n: number) => string,
  includeVersion: boolean,
): string[] {
  const lines: string[] = [];
  const attrs = [
    `id="${escapeAttr(c.id)}"`,
    `title="${escapeAttr(c.title)}"`,
    includeVersion ? `version="${c.version}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  lines.push(`${pad(depth)}<capsule ${attrs}>`);
  if (c.description.trim()) {
    lines.push(`${pad(depth + 1)}<description>${escapeText(c.description)}</description>`);
  }
  if (c.tags.length > 0) {
    lines.push(
      `${pad(depth + 1)}<tags>${c.tags.map((t) => escapeText(t)).join(', ')}</tags>`,
    );
  }
  for (const it of c.items) {
    lines.push(...renderItem(it, depth + 1, pad));
  }
  lines.push(`${pad(depth)}</capsule>`);
  return lines;
}

function renderItem(it: IRItem, depth: number, pad: (n: number) => string): string[] {
  const label = it.label ? ` label="${escapeAttr(it.label)}"` : '';
  switch (it.type) {
    case 'text':
      return [
        `${pad(depth)}<item type="text"${label}>`,
        indentBody(it.text ?? '', depth + 1, pad),
        `${pad(depth)}</item>`,
      ];
    case 'code': {
      const lang = ` language="${escapeAttr(it.language ?? 'plaintext')}"`;
      return [
        `${pad(depth)}<item type="code"${lang}${label}>`,
        `${pad(depth + 1)}<![CDATA[${safeCdata(it.text ?? '')}]]>`,
        `${pad(depth)}</item>`,
      ];
    }
    case 'url': {
      const href = ` href="${escapeAttr(it.href ?? '')}"`;
      const title = it.title ? ` title="${escapeAttr(it.title)}"` : '';
      if (!it.note) {
        return [`${pad(depth)}<item type="url"${href}${title}${label}/>`];
      }
      return [
        `${pad(depth)}<item type="url"${href}${title}${label}>`,
        `${pad(depth + 1)}<note>${escapeText(it.note)}</note>`,
        `${pad(depth)}</item>`,
      ];
    }
    case 'image': {
      const ref = ` ref="${escapeAttr(it.imageRef ?? '')}"`;
      const mime = it.imageMime ? ` mime="${escapeAttr(it.imageMime)}"` : '';
      if (it.imageDataUrl) {
        return [
          `${pad(depth)}<item type="image"${ref}${mime}${label}>`,
          `${pad(depth + 1)}<data>${it.imageDataUrl}</data>`,
          ...(it.note ? [`${pad(depth + 1)}<note>${escapeText(it.note)}</note>`] : []),
          `${pad(depth)}</item>`,
        ];
      }
      const note = it.note ? ` note="${escapeAttr(it.note)}"` : '';
      return [
        `${pad(depth)}<item type="image"${ref}${mime}${label}${note} placeholder="true"/>`,
      ];
    }
    case 'file': {
      const ref = ` ref="${escapeAttr(it.fileRef ?? '')}"`;
      const name = ` name="${escapeAttr(it.fileName ?? '')}"`;
      const mime = it.fileMime ? ` mime="${escapeAttr(it.fileMime)}"` : '';
      const size = typeof it.fileSize === 'number' ? ` size="${it.fileSize}"` : '';
      if (!it.note) {
        return [`${pad(depth)}<item type="file"${ref}${name}${mime}${size}${label}/>`];
      }
      return [
        `${pad(depth)}<item type="file"${ref}${name}${mime}${size}${label}>`,
        `${pad(depth + 1)}<note>${escapeText(it.note)}</note>`,
        `${pad(depth)}</item>`,
      ];
    }
    case 'voice': {
      const mode = ` mode="${escapeAttr(it.voiceMode ?? 'raw')}"`;
      return [
        `${pad(depth)}<item type="voice"${mode}${label}>`,
        indentBody(it.text ?? '', depth + 1, pad),
        `${pad(depth)}</item>`,
      ];
    }
  }
}

function indentBody(body: string, depth: number, pad: (n: number) => string): string {
  const prefix = pad(depth);
  return body
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((ln) => (ln.length > 0 ? prefix + escapeText(ln) : ''))
    .join('\n');
}

export function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Guard against `]]>` closing the CDATA section early. */
export function safeCdata(s: string): string {
  return s.replace(/]]>/g, ']]]]><![CDATA[>');
}
