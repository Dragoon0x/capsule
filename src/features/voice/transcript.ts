/**
 * Three transcript cleanup modes.
 *
 * Raw     — verbatim.
 * Clean   — strip fillers, collapse whitespace.
 * Formatted — best-effort rule-based (no AI): dictated commands, capitalization,
 *             sentence insertion heuristic.
 *
 * Honest about limits: UI labels Formatted as "best effort".
 */

export type CleanupMode = 'raw' | 'clean' | 'formatted';

const FILLERS = [
  'um',
  'uh',
  'er',
  'erm',
  'ah',
  'uhm',
  'like',
  'you know',
  'i mean',
  'sort of',
  'kind of',
  'basically',
  'actually',
  'literally',
  'okay so',
  'so yeah',
];

const COMMANDS: Array<[RegExp, string]> = [
  [/\b(new paragraph)\b/gi, '\n\n'],
  [/\b(new line)\b/gi, '\n'],
  [/\b(period|full stop)\b/gi, '.'],
  [/\b(comma)\b/gi, ','],
  [/\b(question mark)\b/gi, '?'],
  [/\b(exclamation (point|mark))\b/gi, '!'],
  [/\b(colon)\b/gi, ':'],
  [/\b(semi colon|semicolon)\b/gi, ';'],
  [/\b(open (paren|parenthesis))\b/gi, '('],
  [/\b(close (paren|parenthesis))\b/gi, ')'],
  [/\b(open quote)\b/gi, '"'],
  [/\b(close quote)\b/gi, '"'],
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const FILLER_RE = new RegExp(`\\b(?:${FILLERS.map(escapeRegExp).join('|')})\\b`, 'gi');

export function cleanTranscript(input: string): string {
  let out = input;
  out = out.replace(FILLER_RE, ' ');
  out = out.replace(/[ \t]{2,}/g, ' ');
  out = out
    .split('\n')
    .map((l) => l.replace(/^[ \t]+|[ \t]+$/g, ''))
    .join('\n');
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

/** Returns density of punctuation characters in 0..1 */
export function punctuationDensity(s: string): number {
  if (!s) return 0;
  const matches = s.match(/[.,!?;:]/g);
  return matches ? matches.length / s.length : 0;
}

export function formatTranscript(input: string): string {
  if (!input) return '';

  // 1) Dictated commands (case-insensitive); do before filler stripping.
  let out = input;
  for (const [re, rep] of COMMANDS) {
    out = out.replace(re, rep);
  }

  // 2) Apply clean pipeline (filler strip + whitespace).
  out = cleanTranscript(out);

  // 3) Replace standalone "i" with "I".
  out = out.replace(/\bi\b/g, 'I');

  // 4) If existing punctuation density is sparse, break long runs into sentences
  //    on rough heuristic: split at places that look like clause boundaries.
  if (punctuationDensity(out) < 0.01) {
    out = out.replace(/\b(and then|but then|then|so)\s+/gi, (_m, conn: string) => `. ${conn} `);
  }

  // 5) Capitalize first letter of sentences.
  out = out.replace(/(^|[.!?]\s+|\n+)([a-z])/g, (_m, p1: string, p2: string) => p1 + p2.toUpperCase());

  // 6) Ensure terminal punctuation.
  if (out && !/[.!?]\s*$/.test(out)) {
    out = out.trimEnd() + '.';
  }

  return out;
}

export function applyCleanupMode(raw: string, mode: CleanupMode): string {
  switch (mode) {
    case 'raw':
      return raw;
    case 'clean':
      return cleanTranscript(raw);
    case 'formatted':
      return formatTranscript(raw);
  }
}
