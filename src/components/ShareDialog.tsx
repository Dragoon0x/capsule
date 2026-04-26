import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, Share2, AlertTriangle, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';
import { encodeShare, toShareUrl } from '../features/share/encode';
import { writeClipboard, downloadFile } from '../lib/clipboard';
import { toast } from './ui/Toast';
import type { Capsule } from '../features/capsules/types';
import { toUserMessage } from '../lib/errors';
import { formatBytes } from '../lib/format/bytes';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capsules: Capsule[];
}

export function ShareDialog({ open, onOpenChange, capsules }: Props) {
  const [copied, setCopied] = useState(false);

  const encoded = useMemo(() => (capsules.length > 0 ? encodeShare(capsules) : null), [capsules]);
  const url = encoded ? toShareUrl(encoded, window.location.origin) : null;

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const copyUrl = async (): Promise<void> => {
    if (!url) return;
    try {
      await writeClipboard(url);
      setCopied(true);
      toast('Share link copied.', 'success');
    } catch (e) {
      toast(toUserMessage(e), 'error');
    }
  };

  const downloadPayload = (): void => {
    if (!encoded) return;
    downloadFile(encoded.fileName, encoded.fileBytes, 'application/json');
    toast('Share file downloaded.', 'success');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Share capsules</DialogTitle>
          <DialogDescription>
            Sharing keeps everything local — no server. Recipients fork into their own library.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {capsules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Pick capsules from the library first.</p>
          ) : !encoded ? null : (
            <>
              <p className="text-xs text-muted-foreground">
                Sharing {capsules.length} capsule{capsules.length === 1 ? '' : 's'} ·{' '}
                {formatBytes(encoded.fileBytes.byteLength)}
              </p>

              {encoded.inBudget && url ? (
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
                    URL share
                  </div>
                  <div className="break-all rounded border border-border bg-card p-2 font-mono text-[11px] text-foreground">
                    {url}
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    <Button size="sm" variant="primary" onClick={() => void copyUrl()}>
                      {copied ? <Check className="text-emerald-500" /> : <Copy />}
                      {copied ? 'Copied' : 'Copy link'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-2.5 text-xs text-warning">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <div>
                    Too large for a URL ({encoded.size} chars). Download as a file instead.
                  </div>
                </div>
              )}

              <div className="rounded-md border border-border bg-muted/40 p-3">
                <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
                  File share
                </div>
                <div className="flex items-center justify-between gap-2">
                  <code className="truncate font-mono text-[11px]">{encoded.fileName}</code>
                  <Button size="sm" variant="outline" onClick={downloadPayload}>
                    <Download /> Download
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                <Share2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <div>
                  Shares contain text, code, and URLs only — not attached images or files. Recipients
                  can fork into their own library.
                </div>
              </div>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
