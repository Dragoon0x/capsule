import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { parseBackup, applyBackup, type ImportStrategy } from '../features/backup/import';
import { decodeShareFromFile } from '../features/share/decode';
import { putCapsule } from '../db/repo';
import { useCapsulesStore } from '../features/capsules/store';
import { toast } from './ui/Toast';
import { toUserMessage } from '../lib/errors';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [strategy, setStrategy] = useState<ImportStrategy>('merge-newer');
  const [pending, setPending] = useState(false);
  const hydrate = useCapsulesStore((s) => s.hydrate);

  const handleFile = async (file: File): Promise<void> => {
    setPending(true);
    try {
      const text = await file.text();
      let parsedBackup = null;
      try {
        parsedBackup = parseBackup(text);
      } catch {
        /* fall through to share */
      }
      if (parsedBackup) {
        const r = await applyBackup(parsedBackup, strategy);
        toast(`Imported: ${r.added} added, ${r.replaced} replaced, ${r.skipped} skipped.`, 'success');
      } else {
        const sharePayload = decodeShareFromFile(text);
        for (const c of sharePayload.capsules) {
          await putCapsule({ ...c, seq: c.seq + 1, updatedAt: Date.now() });
        }
        toast(`Imported ${sharePayload.capsules.length} shared capsule(s).`, 'success');
      }
      await hydrate();
      onOpenChange(false);
    } catch (e) {
      toast(toUserMessage(e), 'error');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Import</DialogTitle>
          <DialogDescription>
            Import a Capsule backup or share file. Existing data stays unless your strategy says otherwise.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div>
            <Label className="mb-1.5 block">Conflict strategy</Label>
            <div className="space-y-1.5 rounded-md border border-border bg-card p-2.5">
              {(
                [
                  ['merge-newer', 'Merge', 'Keep whichever version is newer'],
                  ['skip-existing', 'Skip existing', 'Only add new capsules'],
                  ['replace', 'Replace', 'Overwrite everything with imported copy'],
                ] as const
              ).map(([val, name, desc]) => (
                <label
                  key={val}
                  className="flex cursor-pointer items-start gap-2 rounded p-1.5 text-sm hover:bg-muted"
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={val}
                    checked={strategy === val}
                    onChange={() => setStrategy(val)}
                    className="mt-0.5 accent-primary"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{name}</div>
                    <div className="text-[11px] text-muted-foreground">{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => fileRef.current?.click()} disabled={pending}>
            <Upload /> {pending ? 'Importing…' : 'Choose file'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
