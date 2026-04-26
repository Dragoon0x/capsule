import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useHistoryStore } from '../../features/history/store';
import { useDeployStore } from '../../features/deploy/store';
import { writeClipboard } from '../../lib/clipboard';
import { toast } from '../ui/Toast';
import { formatRelative } from '../../lib/format/date';
import { Copy, Trash2, History } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { toUserMessage } from '../../lib/errors';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistoryDialog({ open, onOpenChange }: Props) {
  const entries = useHistoryStore((s) => s.entries);
  const remove = useHistoryStore((s) => s.remove);
  const clear = useHistoryStore((s) => s.clear);
  const hydrate = useHistoryStore((s) => s.hydrate);
  const setTask = useDeployStore((s) => s.setTask);
  const setFormat = useDeployStore((s) => s.setFormat);

  useEffect(() => {
    if (open) void hydrate();
  }, [open, hydrate]);

  const recopy = async (text: string): Promise<void> => {
    try {
      await writeClipboard(text);
      toast('Copied that prompt again.', 'success');
    } catch (e) {
      toast(toUserMessage(e), 'error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Prompt history</DialogTitle>
          <DialogDescription>The last {entries.length} prompts you copied &mdash; saved on this device.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
              <History className="h-7 w-7 text-muted-foreground/60" />
              No prompts yet. Copy from the deploy panel and they will show up here.
            </div>
          ) : (
            <ul className="space-y-1">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="group flex items-start gap-3 rounded-md border border-transparent p-2.5 transition-colors hover:border-border hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <Badge variant={e.format === 'xml' ? 'primary' : 'secondary'}>
                        {e.format}
                      </Badge>
                      <span className="text-muted-foreground">{formatRelative(e.at)}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="tabular text-muted-foreground">~{e.tokenEstimate} tokens</span>
                      {e.task && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="truncate text-foreground">{e.task}</span>
                        </>
                      )}
                    </div>
                    <pre className="line-clamp-2 max-h-12 overflow-hidden whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {e.preview}
                    </pre>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        if (e.task) setTask(e.task);
                        setFormat(e.format);
                        onOpenChange(false);
                        toast('Restored task and format.', 'info');
                      }}
                      aria-label="Restore inputs"
                      title="Restore inputs"
                    >
                      <History className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void recopy(e.text)}
                      aria-label="Copy again"
                      title="Copy again"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void remove(e.id)}
                      aria-label="Remove from history"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {entries.length > 0 && (
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => void clear()}>
              Clear all history
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
