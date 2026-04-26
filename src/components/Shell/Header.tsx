import { Sun, Moon, Mic, Search, Settings, Rocket, BookOpen, History, Keyboard } from 'lucide-react';
import { Button } from '../ui/Button';
import { Separator } from '../ui/Separator';
import { Tip, TooltipProvider } from '../ui/Tooltip';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  onOpenCommand: () => void;
  onOpenVoice: () => void;
  onOpenSettings: () => void;
  onOpenTemplates: () => void;
  onOpenHistory: () => void;
  onOpenShortcuts: () => void;
  deployOpen: boolean;
  onToggleDeploy: () => void;
}

export function Header({
  onOpenCommand,
  onOpenVoice,
  onOpenSettings,
  onOpenTemplates,
  onOpenHistory,
  onOpenShortcuts,
  deployOpen,
  onToggleDeploy,
}: Props) {
  const { theme, setTheme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <TooltipProvider delayDuration={250}>
      <header className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-border bg-card/40 px-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Logo />
          <div className="text-sm font-semibold tracking-tight">Capsule</div>
        </div>

        <Separator orientation="vertical" className="mx-2 h-5" />

        <Tip content="Templates" shortcut="⌘T">
          <Button variant="ghost" size="sm" onClick={onOpenTemplates}>
            <BookOpen /> <span className="hidden text-xs sm:inline">Templates</span>
          </Button>
        </Tip>
        <Tip content="Prompt history" shortcut="⌘H">
          <Button variant="ghost" size="icon-sm" onClick={onOpenHistory} aria-label="Prompt history">
            <History />
          </Button>
        </Tip>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onOpenCommand}
          className="hidden h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background sm:flex"
          aria-label="Open command palette"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Find or jump…</span>
          <span className="ml-4 inline-flex gap-0.5">
            <kbd className="kbd">⌘</kbd>
            <kbd className="kbd">K</kbd>
          </span>
        </button>
        <Tip content="Open command palette" shortcut="⌘K">
          <Button variant="ghost" size="icon-sm" onClick={onOpenCommand} className="sm:hidden" aria-label="Open command palette">
            <Search />
          </Button>
        </Tip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Tip content="Voice studio" shortcut="⇧⌘R">
          <Button variant="ghost" size="icon-sm" onClick={onOpenVoice} aria-label="Voice studio">
            <Mic />
          </Button>
        </Tip>
        <Tip content={isDark ? 'Light mode' : 'Dark mode'}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun /> : <Moon />}
          </Button>
        </Tip>
        <Tip content="Keyboard shortcuts" shortcut="?">
          <Button variant="ghost" size="icon-sm" onClick={onOpenShortcuts} aria-label="Keyboard shortcuts">
            <Keyboard />
          </Button>
        </Tip>
        <Tip content="Settings">
          <Button variant="ghost" size="icon-sm" onClick={onOpenSettings} aria-label="Settings">
            <Settings />
          </Button>
        </Tip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Tip content={deployOpen ? 'Hide deploy panel' : 'Show deploy panel'}>
          <Button
            variant={deployOpen ? 'primary' : 'outline'}
            size="sm"
            onClick={onToggleDeploy}
            aria-pressed={deployOpen}
          >
            <Rocket /> Deploy
          </Button>
        </Tip>
      </header>
    </TooltipProvider>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" width={20} height={20} aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="7" className="fill-foreground" />
      <path
        d="M10 10h12v2.2H10zM10 14.9h8v2.2h-8zM10 19.8h10v2.2H10z"
        className="fill-primary"
      />
      <circle cx="23.5" cy="15.5" r="2.4" className="fill-primary" />
    </svg>
  );
}
