import { useEffect, useMemo, useState } from 'react';
import { AppProviders } from './providers';
import { ErrorBoundary } from './ErrorBoundary';
import { Shell } from '../components/Shell/Shell';
import { Library } from '../components/Library/Library';
import { CapsuleEditor } from '../components/CapsuleEditor/CapsuleEditor';
import { DeployPanel } from '../components/DeployPanel/DeployPanel';
import { VoiceStudio } from '../components/VoiceStudio/VoiceStudio';
import { CommandPalette } from '../components/CommandPalette/CommandPalette';
import { ShareDialog } from '../components/ShareDialog';
import { ImportDialog } from '../components/ImportDialog';
import { SettingsDialog } from '../components/SettingsDialog';
import { VoiceDisclosure } from '../components/VoiceDisclosure';
import { TemplatesDialog } from '../components/Templates/TemplatesDialog';
import { HistoryDialog } from '../components/PromptHistory/HistoryDialog';
import { ShortcutsDialog } from '../components/ShortcutsDialog';
import { Onboarding } from '../components/Onboarding';
import { ToastViewport, toast } from '../components/ui/Toast';
import { UpdateToast } from '../components/Toasts/UpdateToast';
import { ConflictToast } from '../components/Toasts/ConflictToast';
import { useShortcut } from '../hooks/useShortcut';
import {
  useCapsulesStore,
  selectAllOrdered,
  selectActive,
} from '../features/capsules/store';
import { useDeployStore } from '../features/deploy/store';
import { useHistoryStore } from '../features/history/store';
import { decodeShareFromHash } from '../features/share/decode';
import { putCapsule } from '../db/repo';
import { toUserMessage } from '../lib/errors';
import { writeClipboard, downloadFile } from '../lib/clipboard';
import { useCompiled } from '../features/deploy/useCompiled';
import { Sparkles } from 'lucide-react';

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppInner />
        <ToastViewport />
        <UpdateToast />
        <ConflictToast />
      </AppProviders>
    </ErrorBoundary>
  );
}

function AppInner() {
  const active = useCapsulesStore(selectActive);
  const all = useCapsulesStore(selectAllOrdered);
  const createCapsule = useCapsulesStore((s) => s.createCapsule);
  const duplicateCapsule = useCapsulesStore((s) => s.duplicateCapsule);
  const hydrate = useCapsulesStore((s) => s.hydrate);
  const selectedIds = useDeployStore((s) => s.selectedCapsuleIds);
  const hydrateHistory = useHistoryStore((s) => s.hydrate);

  const [cmdOpen, setCmdOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Hydrate prompt history once.
  useEffect(() => {
    void hydrateHistory();
  }, [hydrateHistory]);

  // Handle import-from-URL-hash once on load.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#s=')) return;
    const payload = hash.slice(3);
    try {
      const parsed = decodeShareFromHash(payload);
      void (async () => {
        for (const c of parsed.capsules) {
          await putCapsule({ ...c, seq: c.seq + 1, updatedAt: Date.now() });
        }
        await hydrate();
        toast(`Imported ${parsed.capsules.length} capsule(s) from share link.`, 'success');
        history.replaceState(null, '', window.location.pathname + window.location.search);
      })();
    } catch (e) {
      toast(toUserMessage(e), 'error');
    }
  }, [hydrate]);

  const compiled = useCompiled();

  // Shortcuts.
  useShortcut('mod+k', () => setCmdOpen(true), { allowInInput: true });
  useShortcut('mod+n', () => void createCapsule());
  useShortcut('mod+t', () => setTemplatesOpen(true));
  useShortcut('mod+h', () => setHistoryOpen(true));
  useShortcut('mod+d', () => {
    if (active) void duplicateCapsule(active.id);
  });
  useShortcut('?', () => setShortcutsOpen(true));
  useShortcut('mod+shift+r', () => setVoiceOpen(true), { allowInInput: true });
  useShortcut('mod+/', () => window.dispatchEvent(new CustomEvent('capsule:focus-search')));
  useShortcut(
    'mod+shift+s',
    () => {
      if (active || selectedIds.length > 0) setShareOpen(true);
    },
    { allowInInput: true },
  );
  useShortcut(
    'mod+enter',
    () => {
      if (compiled.text) {
        void writeClipboard(compiled.text).then(
          () => toast('Copied compiled prompt.', 'success'),
          (e) => toast(toUserMessage(e), 'error'),
        );
      }
    },
    { allowInInput: true },
  );
  useShortcut(
    'mod+shift+enter',
    () => {
      if (!compiled.text) return;
      const ext = compiled.format === 'xml' ? 'xml' : 'md';
      downloadFile(`prompt.${ext}`, compiled.text);
      toast('Downloaded compiled prompt.', 'success');
    },
    { allowInInput: true },
  );
  useShortcut(
    'escape',
    () => {
      if (cmdOpen) setCmdOpen(false);
      else if (voiceOpen) setVoiceOpen(false);
      else if (shareOpen) setShareOpen(false);
      else if (importOpen) setImportOpen(false);
      else if (settingsOpen) setSettingsOpen(false);
      else if (templatesOpen) setTemplatesOpen(false);
      else if (historyOpen) setHistoryOpen(false);
      else if (shortcutsOpen) setShortcutsOpen(false);
    },
    { allowInInput: true },
  );

  const shareCapsules = useMemo(() => {
    if (active && selectedIds.length === 0) return [active];
    return selectedIds
      .map((id) => all.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
  }, [active, selectedIds, all]);

  return (
    <>
      <Shell
        left={
          <Library
            onImport={() => setImportOpen(true)}
            onExport={() => setSettingsOpen(true)}
            onTemplates={() => setTemplatesOpen(true)}
          />
        }
        center={
          active ? (
            <CapsuleEditor
              capsule={active}
              onOpenVoice={() => setVoiceOpen(true)}
              onShare={() => setShareOpen(true)}
            />
          ) : (
            <EmptyMain onTemplates={() => setTemplatesOpen(true)} onCreate={() => void createCapsule()} />
          )
        }
        right={<DeployPanel onShare={() => setShareOpen(true)} />}
        onOpenCommand={() => setCmdOpen(true)}
        onOpenVoice={() => setVoiceOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        onOpenVoice={() => setVoiceOpen(true)}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onImport={() => setImportOpen(true)}
        onExport={() => setSettingsOpen(true)}
      />

      <VoiceStudio open={voiceOpen} onOpenChange={setVoiceOpen} targetCapsuleId={active?.id ?? null} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} capsules={shareCapsules} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />
      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <VoiceDisclosure />
      <Onboarding onOpenTemplates={() => setTemplatesOpen(true)} />
    </>
  );
}

function EmptyMain({
  onCreate,
  onTemplates,
}: {
  onCreate: () => void;
  onTemplates: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Capsule</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Build reusable bundles of context — text, code, links, images, voice — and deploy them as
          structured prompts. Local-first, no account, no server.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            New blank capsule
          </button>
          <button
            type="button"
            onClick={onTemplates}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            Browse templates
          </button>
        </div>
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          Press <kbd className="kbd">?</kbd> for shortcuts ·{' '}
          <kbd className="kbd">⌘</kbd>
          <kbd className="kbd">K</kbd> for commands
        </div>
      </div>
    </div>
  );
}
