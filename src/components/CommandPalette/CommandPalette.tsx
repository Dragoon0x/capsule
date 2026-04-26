import { Command } from 'cmdk';
import { Search, Plus, Mic, Sun, Moon, Download, Upload, Rocket, BookOpen, History, Keyboard } from 'lucide-react';
import { useCapsulesStore, selectAllOrdered } from '../../features/capsules/store';
import { useDeployStore } from '../../features/deploy/store';
import { Dialog, DialogContent } from '../ui/Dialog';
import { useTheme } from '../../hooks/useTheme';
import { TEMPLATES } from '../../features/templates/library';
import { forkTemplate } from '../../features/templates/fork';
import { putCapsule } from '../../db/repo';
import { toast } from '../ui/Toast';
import { toUserMessage } from '../../lib/errors';
import { cn } from '../../lib/cn';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenVoice: () => void;
  onOpenTemplates: () => void;
  onOpenHistory: () => void;
  onOpenShortcuts: () => void;
  onOpenSettings: () => void;
  onImport: () => void;
  onExport: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onOpenVoice,
  onOpenTemplates,
  onOpenHistory,
  onOpenShortcuts,
  onOpenSettings,
  onImport,
  onExport,
}: Props) {
  const capsules = useCapsulesStore(selectAllOrdered);
  const create = useCapsulesStore((s) => s.createCapsule);
  const setActive = useCapsulesStore((s) => s.setActive);
  const hydrate = useCapsulesStore((s) => s.hydrate);
  const toggle = useDeployStore((s) => s.toggleCapsule);
  const { setTheme } = useTheme();

  const run = (fn: () => unknown): void => {
    onOpenChange(false);
    void Promise.resolve(fn()).catch(() => undefined);
  };

  const forkTpl = async (id: string): Promise<void> => {
    const tpl = TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    try {
      const cap = forkTemplate(tpl);
      await putCapsule(cap);
      await hydrate();
      setActive(cap.id);
      toast(`Forked "${tpl.name}".`, 'success');
    } catch (e) {
      toast(toUserMessage(e), 'error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" hideClose className="p-0">
        <Command className="w-full" label="Command palette">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Type a command, jump to a capsule, or fork a template…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="kbd">esc</kbd>
          </div>
          <Command.List className="max-h-96 overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-6 text-center text-xs text-muted-foreground">
              No matches.
            </Command.Empty>

            <CPGroup heading="Actions">
              <CPItem onSelect={() => run(() => create())} icon={<Plus className="h-3.5 w-3.5" />} label="New capsule" shortcut="⌘N" />
              <CPItem onSelect={() => run(onOpenTemplates)} icon={<BookOpen className="h-3.5 w-3.5" />} label="Browse templates" shortcut="⌘T" />
              <CPItem onSelect={() => run(onOpenVoice)} icon={<Mic className="h-3.5 w-3.5" />} label="Open voice studio" shortcut="⇧⌘R" />
              <CPItem onSelect={() => run(onOpenHistory)} icon={<History className="h-3.5 w-3.5" />} label="Prompt history" shortcut="⌘H" />
              <CPItem onSelect={() => run(onOpenShortcuts)} icon={<Keyboard className="h-3.5 w-3.5" />} label="Keyboard shortcuts" shortcut="?" />
              <CPItem onSelect={() => run(onImport)} icon={<Upload className="h-3.5 w-3.5" />} label="Import backup or share file" />
              <CPItem onSelect={() => run(onExport)} icon={<Download className="h-3.5 w-3.5" />} label="Export backup" />
              <CPItem onSelect={() => run(onOpenSettings)} icon={<Sun className="h-3.5 w-3.5" />} label="Open settings" />
              <CPItem onSelect={() => run(() => setTheme('light'))} icon={<Sun className="h-3.5 w-3.5" />} label="Switch to light mode" />
              <CPItem onSelect={() => run(() => setTheme('dark'))} icon={<Moon className="h-3.5 w-3.5" />} label="Switch to dark mode" />
            </CPGroup>

            <CPGroup heading="Templates">
              {TEMPLATES.map((t) => (
                <CPItem
                  key={t.id}
                  onSelect={() => run(() => forkTpl(t.id))}
                  icon={<span className="text-[14px]">{t.emoji}</span>}
                  label={`Fork: ${t.name}`}
                  hint={t.blurb}
                />
              ))}
            </CPGroup>

            {capsules.length > 0 && (
              <CPGroup heading="Jump to capsule">
                {capsules.slice(0, 20).map((c) => (
                  <CPItem
                    key={c.id}
                    onSelect={() => run(() => setActive(c.id))}
                    icon={<Rocket className="h-3.5 w-3.5 opacity-60" />}
                    label={c.title || 'Untitled'}
                    hint={`${c.items.length} items`}
                  />
                ))}
              </CPGroup>
            )}

            {capsules.length > 0 && (
              <CPGroup heading="Queue for deploy">
                {capsules.slice(0, 10).map((c) => (
                  <CPItem
                    key={c.id}
                    onSelect={() => run(() => toggle(c.id))}
                    icon={<Rocket className="h-3.5 w-3.5" />}
                    label={`Toggle: ${c.title || 'Untitled'}`}
                  />
                ))}
              </CPGroup>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CPGroup({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className={cn(
        '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2',
        '[&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase',
        '[&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground',
      )}
    >
      {children}
    </Command.Group>
  );
}

function CPItem({
  onSelect,
  icon,
  label,
  hint,
  shortcut,
}: {
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  shortcut?: string;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    >
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="hidden truncate text-[11px] text-muted-foreground sm:block">{hint}</span>}
      {shortcut && (
        <kbd className="kbd hidden font-mono sm:inline-flex">{shortcut}</kbd>
      )}
    </Command.Item>
  );
}
