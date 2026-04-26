import { useEffect, useState, type ReactNode } from 'react';
import { Header } from './Header';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/cn';
import { getLayout, setLayout, type LayoutPrefs } from '../../features/storage/persistence';

interface Props {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  onOpenCommand: () => void;
  onOpenVoice: () => void;
  onOpenSettings: () => void;
  onOpenTemplates: () => void;
  onOpenHistory: () => void;
  onOpenShortcuts: () => void;
}

export function Shell({
  left,
  center,
  right,
  onOpenCommand,
  onOpenVoice,
  onOpenSettings,
  onOpenTemplates,
  onOpenHistory,
  onOpenShortcuts,
}: Props) {
  const [prefs, setPrefs] = useState<LayoutPrefs | null>(null);

  useEffect(() => {
    void getLayout().then(setPrefs);
  }, []);

  if (!prefs) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="h-12 border-b border-border" />
        <div className="flex flex-1 gap-3 p-3">
          <Skeleton className="h-full w-[260px]" />
          <Skeleton className="h-full flex-1" />
          <Skeleton className="h-full w-[360px]" />
        </div>
      </div>
    );
  }

  const toggleDeploy = (): void => {
    setPrefs((p) => (p ? { ...p, deployOpen: !p.deployOpen } : p));
    void setLayout({ deployOpen: !prefs.deployOpen });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <Header
        onOpenCommand={onOpenCommand}
        onOpenVoice={onOpenVoice}
        onOpenSettings={onOpenSettings}
        onOpenTemplates={onOpenTemplates}
        onOpenHistory={onOpenHistory}
        onOpenShortcuts={onOpenShortcuts}
        deployOpen={prefs.deployOpen}
        onToggleDeploy={toggleDeploy}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside
          className="flex flex-shrink-0 flex-col border-r border-border bg-muted/30"
          style={{ width: prefs.libraryWidth }}
          aria-label="Library"
        >
          {left}
        </aside>
        <main className="flex flex-1 flex-col overflow-hidden bg-background" aria-label="Capsule editor">
          {center}
        </main>
        <aside
          className={cn(
            'flex flex-shrink-0 flex-col border-l border-border bg-muted/30 transition-[width,opacity] duration-200',
            prefs.deployOpen ? 'opacity-100' : 'w-0 overflow-hidden opacity-0',
          )}
          style={{ width: prefs.deployOpen ? prefs.deployWidth : 0 }}
          aria-label="Deploy"
          aria-hidden={!prefs.deployOpen}
        >
          {right}
        </aside>
      </div>
    </div>
  );
}
