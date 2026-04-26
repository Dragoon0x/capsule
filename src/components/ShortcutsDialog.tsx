import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { formatCombo } from '../lib/keyboard';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SECTIONS: { title: string; rows: { combo: string; label: string }[] }[] = [
  {
    title: 'General',
    rows: [
      { combo: 'mod+k', label: 'Open command palette' },
      { combo: '?', label: 'Show keyboard shortcuts' },
      { combo: 'escape', label: 'Close dialog / overlay' },
    ],
  },
  {
    title: 'Library',
    rows: [
      { combo: 'mod+n', label: 'New capsule' },
      { combo: 'mod+/', label: 'Focus search' },
      { combo: 'mod+t', label: 'Open templates' },
      { combo: 'mod+d', label: 'Duplicate active capsule' },
      { combo: 'mod+h', label: 'Open prompt history' },
    ],
  },
  {
    title: 'Capture',
    rows: [
      { combo: 'mod+v', label: 'Paste content into the editor (auto-detect)' },
      { combo: 'mod+shift+r', label: 'Open voice studio' },
    ],
  },
  {
    title: 'Deploy',
    rows: [
      { combo: 'mod+enter', label: 'Copy compiled prompt' },
      { combo: 'mod+shift+enter', label: 'Download compiled prompt' },
      { combo: 'mod+shift+s', label: 'Share selected capsules' },
    ],
  },
];

export function ShortcutsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Designed for one-hand operation. ⌘ on Mac, Ctrl elsewhere.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2">
          {SECTIONS.map((sec) => (
            <div key={sec.title}>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {sec.title}
              </div>
              <ul className="space-y-1.5">
                {sec.rows.map((row) => (
                  <li key={row.combo} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{row.label}</span>
                    <KbdGroup combo={row.combo} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KbdGroup({ combo }: { combo: string }) {
  const display = formatCombo(combo);
  const isMacFormat = !display.includes('+');
  const parts = isMacFormat ? Array.from(display) : display.split('+');
  return (
    <span className="flex items-center gap-0.5">
      {parts.map((p, i) => (
        <kbd key={i} className="kbd">
          {p}
        </kbd>
      ))}
    </span>
  );
}
