/**
 * Runs once on boot. Every feature reads flags from here. No scattered `typeof` checks.
 */

export interface Capabilities {
  /** IndexedDB available (required — we fail loud otherwise) */
  indexedDB: boolean;
  /** OPFS for large binary; falls back to IDB blob storage */
  opfs: boolean;
  /** Web Speech Recognition (Chromium-family or Safari) */
  webSpeech: boolean;
  /** Whether speech audio is known to be sent to cloud (Google/Apple) */
  webSpeechCloud: boolean;
  /** Async Clipboard API (read & write) */
  clipboardRead: boolean;
  clipboardWrite: boolean;
  /** navigator.storage.persist() support */
  persistentStorage: boolean;
  /** BroadcastChannel for multi-tab */
  broadcastChannel: boolean;
  /** File System Access API (download with specific path) */
  fileSystemAccess: boolean;
  /** Web Share API (mobile-friendly share) */
  webShare: boolean;
  /** Detected user agent family (for browser-specific messaging) */
  uaFamily: 'chrome' | 'firefox' | 'safari' | 'edge' | 'other';
}

function detectUA(): Capabilities['uaFamily'] {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'chrome';
  if (ua.includes('firefox/')) return 'firefox';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'safari';
  return 'other';
}

function hasWebSpeech(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

function hasOPFS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    typeof navigator.storage !== 'undefined' &&
    typeof navigator.storage.getDirectory === 'function'
  );
}

let cached: Capabilities | null = null;

export function detectCapabilities(): Capabilities {
  if (cached) return cached;

  const ua = detectUA();
  const webSpeech = hasWebSpeech();

  cached = {
    indexedDB: typeof indexedDB !== 'undefined',
    opfs: hasOPFS(),
    webSpeech,
    // Known cloud routing: Chrome → Google, Safari → Apple. Firefox has no support.
    webSpeechCloud: webSpeech && (ua === 'chrome' || ua === 'edge' || ua === 'safari'),
    clipboardRead:
      typeof navigator !== 'undefined' &&
      typeof navigator.clipboard !== 'undefined' &&
      typeof navigator.clipboard.readText === 'function',
    clipboardWrite:
      typeof navigator !== 'undefined' &&
      typeof navigator.clipboard !== 'undefined' &&
      typeof navigator.clipboard.writeText === 'function',
    persistentStorage:
      typeof navigator !== 'undefined' &&
      typeof navigator.storage !== 'undefined' &&
      typeof navigator.storage.persist === 'function',
    broadcastChannel: typeof BroadcastChannel !== 'undefined',
    fileSystemAccess:
      typeof window !== 'undefined' &&
      'showSaveFilePicker' in window &&
      typeof (window as unknown as { showSaveFilePicker: unknown }).showSaveFilePicker === 'function',
    webShare: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    uaFamily: ua,
  };

  return cached;
}

/** Test-only reset */
export function __resetCapabilitiesForTest(): void {
  cached = null;
}
