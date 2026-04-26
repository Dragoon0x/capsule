import type { Capsule, Item } from '../capsules/types';

/**
 * Normalized intermediate representation (IR) used by every output format.
 * Pure; deterministic; no side effects.
 */

export interface CompileInput {
  /** Capsules in the order the user selected them. */
  capsules: Capsule[];
  /** Ad-hoc scratch items attached to this deploy only. */
  scratch: Item[];
  /** Optional task string (goes into <task>…</task>). */
  task: string;
  /** Final variable bag to resolve. */
  vars: Record<string, string>;
  /** Whether to inline base64 image payloads (default false). */
  includeImages: boolean;
  /** Optional lookup for image data URLs (by blob id). */
  imageDataUrlById?: Record<string, string>;
}

export interface IRItem {
  id: string;
  type: Item['type'];
  label: string;
  /** text for text/code/voice */
  text?: string;
  /** language for code */
  language?: string;
  /** href/title for url */
  href?: string;
  title?: string;
  /** note for url/image/file */
  note?: string;
  /** image ref / inline */
  imageRef?: string;
  imageMime?: string;
  imageDataUrl?: string;
  /** file ref */
  fileRef?: string;
  fileName?: string;
  fileSize?: number;
  fileMime?: string;
  /** voice */
  voiceMode?: 'raw' | 'clean' | 'formatted';
}

export interface IRCapsule {
  id: string;
  title: string;
  version: number;
  description: string;
  tags: string[];
  items: IRItem[];
}

export interface IR {
  generatedAt: number;
  capsules: IRCapsule[];
  scratch: IRItem[];
  task: string;
  unresolvedVars: string[];
}

export function toIR(input: CompileInput): IR {
  const unresolved = new Set<string>();
  const images = input.imageDataUrlById ?? {};

  function itemToIR(it: Item): IRItem {
    const base: IRItem = { id: it.id, type: it.type, label: it.label };
    switch (it.type) {
      case 'text':
        base.text = resolveVars(it.text, input.vars, unresolved);
        break;
      case 'code':
        base.text = resolveVars(it.text, input.vars, unresolved);
        base.language = it.language || 'plaintext';
        break;
      case 'url':
        base.href = it.href;
        base.title = resolveVars(it.title, input.vars, unresolved);
        base.note = resolveVars(it.note, input.vars, unresolved);
        break;
      case 'image':
        base.imageRef = it.blobId;
        base.imageMime = it.mime;
        base.note = resolveVars(it.note, input.vars, unresolved);
        if (input.includeImages) {
          const du = images[it.blobId];
          if (du) base.imageDataUrl = du;
        }
        break;
      case 'file':
        base.fileRef = it.blobId;
        base.fileName = it.name;
        base.fileSize = it.size;
        base.fileMime = it.mime;
        base.note = resolveVars(it.note, input.vars, unresolved);
        break;
      case 'voice':
        base.text = resolveVars(it.text, input.vars, unresolved);
        base.voiceMode = it.mode;
        break;
    }
    return base;
  }

  const irCapsules: IRCapsule[] = input.capsules.map((c) => ({
    id: c.id,
    title: c.title,
    version: c.seq,
    description: resolveVars(c.description, input.vars, unresolved),
    tags: [...c.tags],
    items: [...c.items].sort((a, b) => a.order - b.order).map(itemToIR),
  }));

  return {
    generatedAt: 0, // deterministic; UI shows local time separately
    capsules: irCapsules,
    scratch: input.scratch.map(itemToIR),
    task: resolveVars(input.task, input.vars, unresolved),
    unresolvedVars: [...unresolved].sort(),
  };
}

/**
 * Resolve `{{name}}` tokens from a flat vars bag. Unresolved names are left
 * literally and recorded for UI warning.
 */
export function resolveVars(
  input: string,
  vars: Record<string, string>,
  unresolved: Set<string>,
): string {
  return input.replace(/\{\{\s*([a-zA-Z_][\w.-]*)\s*\}\}/g, (_m, name: string) => {
    const v = vars[name];
    if (v === undefined) {
      unresolved.add(name);
      return `{{${name}}}`;
    }
    return v;
  });
}

/**
 * Extract all variable names referenced anywhere in an input, without resolving.
 */
export function extractVarNames(input: CompileInput): string[] {
  const names = new Set<string>();
  const re = /\{\{\s*([a-zA-Z_][\w.-]*)\s*\}\}/g;
  const scan = (s: string): void => {
    let m: RegExpExecArray | null = re.exec(s);
    while (m) {
      if (m[1]) names.add(m[1]);
      m = re.exec(s);
    }
    re.lastIndex = 0;
  };
  for (const c of input.capsules) {
    scan(c.description);
    for (const it of c.items) {
      if (it.type === 'text' || it.type === 'code' || it.type === 'voice') scan(it.text);
      if (it.type === 'url') {
        scan(it.title);
        scan(it.note);
      }
      if (it.type === 'image' || it.type === 'file') scan(it.note);
    }
  }
  for (const it of input.scratch) {
    if (it.type === 'text' || it.type === 'code' || it.type === 'voice') scan(it.text);
    if (it.type === 'url') {
      scan(it.title);
      scan(it.note);
    }
    if (it.type === 'image' || it.type === 'file') scan(it.note);
  }
  scan(input.task);
  return [...names].sort();
}
