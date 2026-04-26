import { useEffect, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from './ui/Dialog';
import { Button } from './ui/Button';
import { Tabs, TabsList, TabsTrigger } from './ui/Tabs';
import { Label } from './ui/Label';
import { Separator } from './ui/Separator';
import { useTheme } from '../hooks/useTheme';
import { useCapabilities } from '../app/providers';
import { estimateQuota, type QuotaInfo } from '../features/storage/quota';
import { formatBytes } from '../lib/format/bytes';
import { getVoicePrefs, setVoicePrefs } from '../features/storage/persistence';
import { exportBackup } from '../features/backup/export';
import { downloadFile } from '../lib/clipboard';
import { gcOrphanBlobs } from '../db/repo';
import { toast } from './ui/Toast';
import { toUserMessage } from '../lib/errors';
import { cn } from '../lib/cn';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: Props) {
  const caps = useCapabilities();
  const { theme, setTheme } = useTheme();
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [voiceMode, setVoiceMode] = useState<'raw' | 'clean' | 'formatted'>('clean');
  const [gcBusy, setGcBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void estimateQuota().then(setQuota);
    void getVoicePrefs().then((p) => setVoiceMode(p.defaultMode));
  }, [open]);

  const runExport = async (): Promise<void> => {
    try {
      const { json, fileName } = await exportBackup();
      downloadFile(fileName, json, 'application/json');
      toast('Backup downloaded.', 'success');
    } catch (e) {
      toast(toUserMessage(e), 'error');
    }
  };

  const runGC = async (): Promise<void> => {
    setGcBusy(true);
    try {
      const n = await gcOrphanBlobs();
      toast(`Garbage collected ${n} orphan blob${n === 1 ? '' : 's'}.`, 'success');
      void estimateQuota().then(setQuota);
    } catch (e) {
      toast(toUserMessage(e), 'error');
    } finally {
      setGcBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <DialogBody className="divide-y divide-border">
          <Section title="Appearance">
            <div className="flex items-center justify-between gap-2">
              <Label>Theme</Label>
              <Tabs value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
                <TabsList>
                  <TabsTrigger value="system">System</TabsTrigger>
                  <TabsTrigger value="light">Light</TabsTrigger>
                  <TabsTrigger value="dark">Dark</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </Section>

          <Section title="Voice">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Default cleanup mode</Label>
                <Tabs
                  value={voiceMode}
                  onValueChange={(v) => {
                    setVoiceMode(v as 'raw' | 'clean' | 'formatted');
                    void setVoicePrefs({ defaultMode: v as 'raw' | 'clean' | 'formatted' });
                  }}
                >
                  <TabsList>
                    <TabsTrigger value="raw">Raw</TabsTrigger>
                    <TabsTrigger value="clean">Clean</TabsTrigger>
                    <TabsTrigger value="formatted">Formatted</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {caps.webSpeech && caps.webSpeechCloud && (
                <p className="text-[11px] text-muted-foreground">
                  Audio may be sent to {caps.uaFamily === 'safari' ? 'Apple' : 'Google'}. Everything else is local.
                </p>
              )}
              {!caps.webSpeech && (
                <p className="text-[11px] text-warning">
                  Your browser does not support Web Speech. Try Chrome or Edge.
                </p>
              )}
            </div>
          </Section>

          <Section title="Storage">
            <div className="space-y-3">
              {quota ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      Using <strong className="tabular text-foreground">{formatBytes(quota.usage)}</strong> of {formatBytes(quota.quota)}
                    </span>
                    <span className="tabular text-muted-foreground">{(quota.fraction * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full transition-all',
                        quota.nearFull ? 'bg-destructive' : 'bg-primary',
                      )}
                      style={{ width: `${Math.min(100, quota.fraction * 100)}%` }}
                    />
                  </div>
                  {quota.nearFull && (
                    <p className="text-[11px] text-warning">
                      Storage is filling up. Export a backup and prune unused capsules.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground">Storage estimate unavailable.</div>
              )}
              <Separator />
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => void runExport()}>
                  <Download /> Export backup
                </Button>
                <Button size="sm" variant="outline" onClick={() => void runGC()} disabled={gcBusy}>
                  <Trash2 /> {gcBusy ? 'Cleaning…' : 'GC orphan blobs'}
                </Button>
              </div>
            </div>
          </Section>

          <Section title="About">
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <p>
                Capsule is local-first. No account, no server. Your library lives only in this browser.
              </p>
              <p>
                Capabilities: {capLabel('IndexedDB', caps.indexedDB)} · {capLabel('OPFS', caps.opfs)} ·{' '}
                {capLabel('WebSpeech', caps.webSpeech)} · {capLabel('Multi-tab', caps.broadcastChannel)}
              </p>
            </div>
          </Section>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function capLabel(name: string, on: boolean): string {
  return `${name} ${on ? '✓' : '✗'}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="mb-2 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}
