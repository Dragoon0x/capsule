import DOMPurify from 'dompurify';
import type { Config as DOMPurifyConfig } from 'dompurify';
import { marked } from 'marked';

/**
 * Sanitizer wrapper. ALL rendered markdown MUST pass through here.
 * Config is intentionally conservative: safe HTML subset, no SVG/MathML, no raw style.
 */

const SANITIZE_CONFIG: DOMPurifyConfig = {
  ALLOWED_TAGS: [
    'a',
    'b',
    'blockquote',
    'br',
    'code',
    'del',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'img',
    'kbd',
    'li',
    'ol',
    'p',
    'pre',
    'span',
    'strong',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'ul',
  ],
  ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'class', 'lang', 'rel', 'target'],
  ALLOW_DATA_ATTR: false,
  FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
  KEEP_CONTENT: true,
  USE_PROFILES: { html: true },
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
};

/**
 * Sanitize arbitrary HTML (e.g. from marked) to a safe subset.
 */
export function sanitizeHtml(dirty: string): string {
  // DOMPurify returns `TrustedHTML | string` depending on config; our config
  // does not enable RETURN_TRUSTED_TYPE, so we reliably get a string.
  return DOMPurify.sanitize(dirty, SANITIZE_CONFIG) as unknown as string;
}

// Configure marked once with safe defaults.
marked.setOptions({
  gfm: true,
  breaks: false,
  async: false,
});

/**
 * Render a markdown string to sanitized HTML.
 */
export function renderMarkdown(md: string): string {
  const rendered = marked.parse(md, { async: false });
  // `marked.parse` with async:false returns string; defensive check for types.
  const html = typeof rendered === 'string' ? rendered : '';
  return sanitizeHtml(html);
}

/**
 * Harden external links after sanitization. DOMPurify can't add rel/target reliably;
 * do it in a post-pass that operates on strings.
 */
export function hardenExternalLinks(html: string): string {
  return html.replace(
    /<a\s+([^>]*?)href=(["'])(https?:\/\/[^"']+)\2([^>]*)>/gi,
    (_m, pre: string, q: string, url: string, post: string) => {
      const hasRel = /\brel=/.test(pre + post);
      const hasTarget = /\btarget=/.test(pre + post);
      const relAttr = hasRel ? '' : ' rel="noopener noreferrer"';
      const targetAttr = hasTarget ? '' : ' target="_blank"';
      return `<a ${pre}href=${q}${url}${q}${post}${relAttr}${targetAttr}>`;
    },
  );
}

export function renderMarkdownSafe(md: string): string {
  return hardenExternalLinks(renderMarkdown(md));
}
