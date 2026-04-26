import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from './ui/Dialog';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ShieldAlert } from 'lucide-react';
import type { SecretFinding } from '../lib/secrets';
import { redact } from '../lib/secrets';

interface Props {
  open: boolean;
  findings: SecretFinding[];
  onCancel: () => void;
  onContinue: () => void;
  onRedact: () => void;
}

export function SensitiveWarning({ open, findings, onCancel, onContinue, onRedact }: Props) {
  const high = findings.filter((f) => f.severity === 'high').length;
  const med = findings.filter((f) => f.severity === 'medium').length;
  const low = findings.filter((f) => f.severity === 'low').length;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warning" />
            Sensitive content detected
          </DialogTitle>
          <DialogDescription>
            {findings.length} possible secret{findings.length === 1 ? '' : 's'} in this prompt
            {high > 0 && (
              <>
                {' · '}
                <span className="text-destructive">high: {high}</span>
              </>
            )}
            {med > 0 && (
              <>
                {' · '}
                <span className="text-warning">medium: {med}</span>
              </>
            )}
            {low > 0 && <> {' · '} low: {low}</>}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {findings.map((f, i) => (
              <li
                key={`${f.kind}-${f.startsAt}-${i}`}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-sm"
              >
                <Badge
                  variant={
                    f.severity === 'high' ? 'destructive' : f.severity === 'medium' ? 'warning' : 'secondary'
                  }
                >
                  {f.severity}
                </Badge>
                <span className="flex-1 truncate text-foreground">{f.label}</span>
                <code className="font-mono text-[11px] text-muted-foreground">{redact(f.match)}</code>
              </li>
            ))}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onRedact}>
            Redact &amp; copy
          </Button>
          <Button variant="primary" onClick={onContinue}>
            Copy as-is
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
