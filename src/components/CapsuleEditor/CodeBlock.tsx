import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { default as HljsCoreModule } from 'highlight.js/lib/core';
import { writeClipboard } from '../../lib/clipboard';
import { cn } from '../../lib/cn';
import { toast } from '../ui/Toast';
import { toUserMessage } from '../../lib/errors';

type HljsCore = typeof HljsCoreModule;

const SUPPORTED = [
  'typescript',
  'javascript',
  'python',
  'go',
  'rust',
  'java',
  'cpp',
  'bash',
  'json',
  'yaml',
  'html',
  'css',
  'sql',
  'plaintext',
] as const;

type SupportedLang = (typeof SUPPORTED)[number];

let registeredLangs: Set<string> | null = null;
let hljsModule: HljsCore | null = null;

async function ensureHljs(lang: string): Promise<HljsCore | null> {
  try {
    if (!hljsModule) {
      const core = await import('highlight.js/lib/core');
      hljsModule = core.default;
      registeredLangs = new Set();
    }
    if (!registeredLangs?.has(lang) && (SUPPORTED as readonly string[]).includes(lang)) {
      // Map our lang names to hljs module paths.
      const modPath = lang === 'plaintext' ? null : lang;
      if (modPath) {
        const langMod = await loadLangModule(modPath as SupportedLang);
        if (langMod && hljsModule) {
          hljsModule.registerLanguage(
            lang,
            langMod as Parameters<typeof hljsModule.registerLanguage>[1],
          );
          registeredLangs?.add(lang);
        }
      }
    }
    return hljsModule;
  } catch {
    return null;
  }
}

async function loadLangModule(lang: SupportedLang): Promise<unknown> {
  switch (lang) {
    case 'typescript':
      return (await import('highlight.js/lib/languages/typescript')).default;
    case 'javascript':
      return (await import('highlight.js/lib/languages/javascript')).default;
    case 'python':
      return (await import('highlight.js/lib/languages/python')).default;
    case 'go':
      return (await import('highlight.js/lib/languages/go')).default;
    case 'rust':
      return (await import('highlight.js/lib/languages/rust')).default;
    case 'java':
      return (await import('highlight.js/lib/languages/java')).default;
    case 'cpp':
      return (await import('highlight.js/lib/languages/cpp')).default;
    case 'bash':
      return (await import('highlight.js/lib/languages/bash')).default;
    case 'json':
      return (await import('highlight.js/lib/languages/json')).default;
    case 'yaml':
      return (await import('highlight.js/lib/languages/yaml')).default;
    case 'html':
      return (await import('highlight.js/lib/languages/xml')).default;
    case 'css':
      return (await import('highlight.js/lib/languages/css')).default;
    case 'sql':
      return (await import('highlight.js/lib/languages/sql')).default;
    case 'plaintext':
      return null;
  }
}

interface Props {
  text: string;
  language: string;
  className?: string;
  maxHeightClass?: string;
}

export function CodeBlock({ text, language, className, maxHeightClass = 'max-h-72' }: Props) {
  const lang = (SUPPORTED as readonly string[]).includes(language) ? language : 'plaintext';
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (lang === 'plaintext') {
      setHtml(null);
      return;
    }
    void ensureHljs(lang).then((hljs) => {
      if (cancelled || !hljs) return;
      try {
        const result = hljs.highlight(text, { language: lang, ignoreIllegals: true });
        setHtml(result.value);
      } catch {
        setHtml(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [text, lang]);

  const copy = async (): Promise<void> => {
    try {
      await writeClipboard(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      toast(toUserMessage(e), 'error');
    }
  };

  return (
    <div className={cn('group/code relative overflow-hidden rounded-md border border-border bg-muted/40', className)}>
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-2.5 py-1">
        <span className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
          {language}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/code:opacity-100 focus-visible:opacity-100"
          aria-label={copied ? 'Copied' : 'Copy code'}
          title={copied ? 'Copied' : 'Copy'}
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <pre className={cn('overflow-auto p-2.5 font-mono text-xs leading-snug', maxHeightClass)}>
        {html !== null ? (
          <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code>{text}</code>
        )}
      </pre>
    </div>
  );
}
