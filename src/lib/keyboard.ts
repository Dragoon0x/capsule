/**
 * Global keyboard shortcut registry. Platform-aware ("mod" = ⌘ on Mac, Ctrl elsewhere).
 */

export type Combo = string; // e.g. "mod+k", "mod+enter", "shift+n"

const isMac =
  typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent || '');

export function formatCombo(combo: Combo): string {
  return combo
    .toLowerCase()
    .split('+')
    .map((key) => {
      switch (key) {
        case 'mod':
          return isMac ? '⌘' : 'Ctrl';
        case 'shift':
          return isMac ? '⇧' : 'Shift';
        case 'alt':
          return isMac ? '⌥' : 'Alt';
        case 'ctrl':
          return 'Ctrl';
        case 'enter':
          return '↵';
        case 'escape':
          return 'Esc';
        case 'space':
          return '␣';
        case 'arrowup':
          return '↑';
        case 'arrowdown':
          return '↓';
        case 'arrowleft':
          return '←';
        case 'arrowright':
          return '→';
        default:
          return key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
      }
    })
    .join(isMac ? '' : '+');
}

function matches(e: KeyboardEvent, combo: Combo): boolean {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  if (!key) return false;
  const want = {
    mod: parts.includes('mod'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    ctrl: parts.includes('ctrl') || (!isMac && parts.includes('mod')),
    meta: parts.includes('meta') || (isMac && parts.includes('mod')),
  };
  const ek = e.key.toLowerCase();
  if (ek !== key) return false;
  if (want.shift !== e.shiftKey) return false;
  if (want.alt !== e.altKey) return false;
  // mod matches either Ctrl or Meta per platform
  if (want.mod) {
    if (isMac && !e.metaKey) return false;
    if (!isMac && !e.ctrlKey) return false;
  } else if (!parts.includes('ctrl') && !parts.includes('meta')) {
    if (e.metaKey || e.ctrlKey) return false;
  }
  return true;
}

export interface ShortcutSpec {
  combo: Combo;
  handler: (e: KeyboardEvent) => void;
  /** If true, shortcut fires even when focus is inside inputs/textareas. */
  allowInInput?: boolean;
  /** If true, prevents default + stops propagation when matched. */
  preventDefault?: boolean;
}

const registered = new Set<ShortcutSpec>();

function isEditableTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return (
    t.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT'
  );
}

function onKeydown(e: KeyboardEvent): void {
  for (const spec of registered) {
    if (!matches(e, spec.combo)) continue;
    if (!spec.allowInInput && isEditableTarget(e)) continue;
    if (spec.preventDefault !== false) {
      e.preventDefault();
      e.stopPropagation();
    }
    spec.handler(e);
    return; // only first match fires
  }
}

let installed = false;
function ensureInstalled(): void {
  if (installed) return;
  if (typeof window === 'undefined') return;
  window.addEventListener('keydown', onKeydown);
  installed = true;
}

export function registerShortcut(spec: ShortcutSpec): () => void {
  ensureInstalled();
  registered.add(spec);
  return () => {
    registered.delete(spec);
  };
}
