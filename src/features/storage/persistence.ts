import { get, set } from 'idb-keyval';
import { requestPersistentStorage } from './quota';

const PERSIST_KEY = 'capsule:persist-requested';
const THEME_KEY = 'capsule:theme';
const LAYOUT_KEY = 'capsule:layout';
const VOICE_PREF_KEY = 'capsule:voice-pref';

/**
 * Fire-and-forget persistence request. Idempotent. Only runs once per install.
 */
export async function ensurePersistence(): Promise<void> {
  const already = await get<boolean>(PERSIST_KEY).catch(() => false);
  if (already) return;
  const granted = await requestPersistentStorage();
  await set(PERSIST_KEY, granted).catch(() => undefined);
}

export type Theme = 'light' | 'dark' | 'system';

export async function getTheme(): Promise<Theme> {
  // Prefer localStorage for boot-time access (no async), sync with idb-keyval.
  try {
    const ls = localStorage.getItem(THEME_KEY);
    if (ls === 'light' || ls === 'dark' || ls === 'system') return ls;
  } catch {
    /* private mode */
  }
  const v = await get<Theme>(THEME_KEY).catch(() => undefined);
  return v ?? 'system';
}

export async function setTheme(t: Theme): Promise<void> {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* private mode */
  }
  await set(THEME_KEY, t).catch(() => undefined);
}

export interface LayoutPrefs {
  libraryWidth: number;
  deployWidth: number;
  deployOpen: boolean;
}

const DEFAULT_LAYOUT: LayoutPrefs = {
  libraryWidth: 260,
  deployWidth: 360,
  deployOpen: true,
};

export async function getLayout(): Promise<LayoutPrefs> {
  const v = await get<LayoutPrefs>(LAYOUT_KEY).catch(() => undefined);
  return { ...DEFAULT_LAYOUT, ...(v ?? {}) };
}

export async function setLayout(l: Partial<LayoutPrefs>): Promise<void> {
  const prev = await getLayout();
  await set(LAYOUT_KEY, { ...prev, ...l }).catch(() => undefined);
}

export interface VoicePrefs {
  /** user has acknowledged the cloud-speech disclosure */
  disclosureAcked: boolean;
  /** preferred cleanup mode for new voice items */
  defaultMode: 'raw' | 'clean' | 'formatted';
  /** language tag (BCP-47), default browser's */
  lang: string | null;
}

const DEFAULT_VOICE: VoicePrefs = {
  disclosureAcked: false,
  defaultMode: 'clean',
  lang: null,
};

export async function getVoicePrefs(): Promise<VoicePrefs> {
  const v = await get<VoicePrefs>(VOICE_PREF_KEY).catch(() => undefined);
  return { ...DEFAULT_VOICE, ...(v ?? {}) };
}

export async function setVoicePrefs(p: Partial<VoicePrefs>): Promise<void> {
  const prev = await getVoicePrefs();
  await set(VOICE_PREF_KEY, { ...prev, ...p }).catch(() => undefined);
}
