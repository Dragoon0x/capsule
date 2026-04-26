import { formatCombo } from '../../lib/keyboard';

interface Props {
  combo: string;
}

export function Kbd({ combo }: Props) {
  const parts = formatCombo(combo).split(/(?=[⌘⇧⌥]|\+)/g);
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-fg-muted">
      {parts.map((p, i) => (
        <kbd key={i} className="kbd">
          {p.replace(/^\+/, '')}
        </kbd>
      ))}
    </span>
  );
}
