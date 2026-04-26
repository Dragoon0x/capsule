import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Plus, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Tabs, TabsList, TabsTrigger } from '../ui/Tabs';
import { Textarea } from '../ui/Input';
import { Label } from '../ui/Label';
import { Waveform } from './Waveform';
import { useCapabilities } from '../../app/providers';
import { isVoiceSupported, startVoiceSession, type VoiceSession } from '../../features/voice/recognition';
import { applyCleanupMode, type CleanupMode } from '../../features/voice/transcript';
import { getVoicePrefs } from '../../features/storage/persistence';
import type { VoiceItem, Item } from '../../features/capsules/types';
import { makeId } from '../../lib/format/id';
import { useCapsulesStore } from '../../features/capsules/store';
import { toast } from '../ui/Toast';
import { toUserMessage } from '../../lib/errors';
import { VoiceDisclosure } from '../VoiceDisclosure';
import { cn } from '../../lib/cn';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCapsuleId: string | null;
  onScratchAdd?: ((item: Item) => void) | undefined;
}

export function VoiceStudio({ open, onOpenChange, targetCapsuleId, onScratchAdd }: Props) {
  const caps = useCapabilities();
  const [running, setRunning] = useState(false);
  const [raw, setRaw] = useState('');
  const [interim, setInterim] = useState('');
  const [level, setLevel] = useState(0);
  const [mode, setMode] = useState<CleanupMode>('clean');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [needsAck, setNeedsAck] = useState(false);
  const sessionRef = useRef<VoiceSession | null>(null);
  const startedAt = useRef<number>(0);
  const tickRef = useRef<number>(0);
  const addItem = useCapsulesStore((s) => s.addItem);

  useEffect(() => {
    if (!open) {
      stop();
      setRaw('');
      setInterim('');
      setElapsedMs(0);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    void getVoicePrefs().then((p) => {
      setMode(p.defaultMode);
      setNeedsAck(!p.disclosureAcked);
    });
  }, [open]);

  const startOrStop = async (): Promise<void> => {
    if (running) return stop();
    if (!isVoiceSupported()) {
      toast('Speech recognition is not supported in this browser.', 'error');
      return;
    }
    if (needsAck) return;
    try {
      setRaw('');
      setInterim('');
      startedAt.current = Date.now();
      setElapsedMs(0);
      tickRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAt.current);
      }, 200);
      const session = await startVoiceSession({
        onEvent: (ev) => {
          setRaw(ev.final);
          setInterim(ev.interim);
          setLevel(ev.level);
        },
        onError: (err) => {
          toast(err.message, 'error');
          stop();
        },
        onEnd: () => {
          window.clearInterval(tickRef.current);
          setRunning(false);
        },
      });
      sessionRef.current = session;
      setRunning(true);
    } catch (e) {
      toast(toUserMessage(e), 'error');
    }
  };

  function stop(): void {
    sessionRef.current?.stop();
    sessionRef.current = null;
    window.clearInterval(tickRef.current);
    setRunning(false);
  }

  const cleaned = applyCleanupMode(raw + (interim ? ' ' + interim : ''), mode);

  const commit = (): void => {
    if (!raw.trim()) {
      toast('Nothing to save.', 'warn');
      return;
    }
    const now = Date.now();
    const text = applyCleanupMode(raw, mode);
    const item: VoiceItem = {
      id: makeId('itm'),
      type: 'voice',
      order: Number.MAX_SAFE_INTEGER,
      label: '',
      text,
      rawText: raw,
      mode,
      durationMs: elapsedMs,
      createdAt: now,
      updatedAt: now,
    };
    if (targetCapsuleId) {
      void addItem(targetCapsuleId, item);
    } else if (onScratchAdd) {
      onScratchAdd(item);
    }
    toast('Voice note saved.', 'success');
    onOpenChange(false);
  };

  const elapsedLabel = `${Math.floor(elapsedMs / 60000)}:${String(
    Math.floor((elapsedMs % 60000) / 1000),
  ).padStart(2, '0')}`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Voice capture</DialogTitle>
            <DialogDescription>
              Record a short note. Three cleanup modes — pick what fits the context.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {!caps.webSpeech && (
              <div role="alert" className="rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-warning">
                Speech recognition is not supported in this browser. Try Chrome or Edge.
              </div>
            )}

            {caps.webSpeech && caps.webSpeechCloud && (
              <div className="rounded-md border border-border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                Audio may be sent to {caps.uaFamily === 'safari' ? 'Apple' : 'Google'} for transcription.
              </div>
            )}

            <div className="flex items-center justify-center py-2">
              <button
                type="button"
                onClick={() => void startOrStop()}
                disabled={!caps.webSpeech}
                className={cn(
                  'flex h-20 w-20 items-center justify-center rounded-full transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  running
                    ? 'bg-destructive text-destructive-foreground shadow-lg [animation:pulse_1.6s_ease-in-out_infinite]'
                    : 'bg-primary text-primary-foreground shadow hover:brightness-110',
                  !caps.webSpeech && 'opacity-50',
                )}
                aria-label={running ? 'Stop recording' : 'Start recording'}
                aria-pressed={running}
              >
                {running ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </button>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              {running ? (
                <span className="tabular">Recording · {elapsedLabel}</span>
              ) : (
                <span>Click to record</span>
              )}
            </div>

            <Waveform level={level} active={running} />

            <div className="flex items-center justify-between gap-2">
              <Label>Cleanup mode</Label>
              <Tabs value={mode} onValueChange={(v) => setMode(v as CleanupMode)}>
                <TabsList>
                  <TabsTrigger value="raw">Raw</TabsTrigger>
                  <TabsTrigger value="clean">Clean</TabsTrigger>
                  <TabsTrigger value="formatted">Formatted</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {mode === 'formatted' && (
              <p className="text-[11px] text-muted-foreground">
                Formatted is rule-based, best-effort. Expect rough edges around long sentences.
              </p>
            )}

            <Textarea
              value={cleaned}
              readOnly
              rows={5}
              placeholder="Transcript will appear here…"
              aria-label="Transcript preview"
              className="font-sans"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={commit} disabled={!raw.trim()}>
              {targetCapsuleId ? (
                <>
                  <Check /> Save to capsule
                </>
              ) : (
                <>
                  <Plus /> Add to scratch
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <VoiceDisclosure demand={open && needsAck} onClose={() => setNeedsAck(false)} />
    </>
  );
}
