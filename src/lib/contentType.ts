/**
 * Paste detection heuristics. Order: cheapest first.
 *
 * Returns a `DetectedContent` description. Caller creates the appropriate Item.
 */

export type DetectedContent =
  | { kind: 'url'; href: string }
  | { kind: 'json'; text: string; parsed: unknown }
  | { kind: 'code'; text: string; language: string }
  | { kind: 'markdown'; text: string }
  | { kind: 'text'; text: string };

const URL_ONE_LINE = /^\s*(https?:\/\/[^\s]+)\s*$/i;

const MD_SENTINELS = [/^#{1,6}\s/m, /^```/m, /^- /m, /^\* /m, /^\d+\. /m, /\[[^\]]+\]\([^)]+\)/];

/**
 * Heuristic code detection: consider 3+ lines where ≥45% look structural.
 * Conservative on purpose — misclassifying prose as code is worse than the reverse.
 */
function looksLikeCode(text: string): boolean {
  const lines = text.split('\n');
  if (lines.length < 3) return false;
  let structural = 0;
  for (const line of lines) {
    if (
      /^\s{2,}/.test(line) ||
      /^\t/.test(line) ||
      /[{};]\s*$/.test(line) ||
      /^(import|export|const|let|var|function|class|interface|type|def|fn|public|private|protected)\b/.test(
        line,
      ) ||
      /^\s*\/\//.test(line) ||
      /^\s*#/.test(line) ||
      /=>\s*{?$/.test(line)
    ) {
      structural += 1;
    }
  }
  return structural / lines.length >= 0.45;
}

/**
 * Narrow language detection using a few sentinels. Keep it conservative;
 * highlight.js auto-detect can run later if user changes the value.
 */
export function guessLanguage(text: string): string {
  const head = text.slice(0, 2000);
  if (/^\s*(import|export)\s.+from\s+['"]/.test(head) || /\b(interface|type)\s+\w+\s*[={]/.test(head))
    return 'typescript';
  if (/^\s*(import|export)\s.+from\s+['"]/.test(head) || /\bfunction\s+\w+\s*\(/.test(head))
    return 'javascript';
  if (/^\s*def\s+\w+\s*\(/m.test(head) || /^\s*import\s+\w+/m.test(head)) return 'python';
  if (/^\s*package\s+\w+/m.test(head) && /\bfunc\s+\w+/.test(head)) return 'go';
  if (/^\s*fn\s+\w+/m.test(head) && /->\s+\w+/.test(head)) return 'rust';
  if (/^\s*#include\s+</m.test(head)) return 'cpp';
  if (/^\s*public\s+(class|interface)\s+\w+/m.test(head)) return 'java';
  if (/^\s*<\?php/m.test(head)) return 'php';
  if (/^\s*SELECT\s.+\sFROM\s/im.test(head)) return 'sql';
  if (/^\s*#!\/.*(ba)?sh\b/m.test(head) || /^\s*(echo|if|for|while)\s/m.test(head)) return 'bash';
  if (/^\s*{/.test(head) || /^\s*\[/.test(head)) return 'json';
  if (/^\s*---\n/.test(head) || /^\s*\w+:\s/.test(head)) return 'yaml';
  if (/<(?:!DOCTYPE|html|head|body|div|span|p)\b/i.test(head)) return 'html';
  if (/\{\s*[\w-]+\s*:/.test(head) && /;\s*$/m.test(head)) return 'css';
  return 'plaintext';
}

export function detectContent(input: string): DetectedContent {
  const trimmed = input.trim();
  if (!trimmed) return { kind: 'text', text: input };

  // 1) URL (single-line)
  const urlMatch = trimmed.match(URL_ONE_LINE);
  if (urlMatch && urlMatch[1]) {
    try {
      const u = new URL(urlMatch[1]);
      // Restrict to http/https (ALLOWED_URI_REGEXP in sanitize.ts is authoritative for rendering).
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        return { kind: 'url', href: u.toString() };
      }
    } catch {
      /* not a valid URL; fall through */
    }
  }

  // 2) JSON
  if (/^[[{]/.test(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed);
      return { kind: 'json', text: input, parsed };
    } catch {
      /* not JSON; fall through */
    }
  }

  // 3) Code
  if (looksLikeCode(input)) {
    return { kind: 'code', text: input, language: guessLanguage(input) };
  }

  // 4) Markdown
  for (const sentinel of MD_SENTINELS) {
    if (sentinel.test(input)) {
      return { kind: 'markdown', text: input };
    }
  }

  // 5) Plain text
  return { kind: 'text', text: input };
}

/**
 * Lightweight MIME sniffing for pasted/dragged files: classify for storage path choice.
 */
export function classifyFile(mime: string): 'image' | 'file' {
  return mime.startsWith('image/') ? 'image' : 'file';
}
