import { useEffect, useState } from 'react';
import { Mic, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';
import { getVoicePrefs, setVoicePrefs } from '../features/storage/persistence';
import { useCapabilities } from '../app/providers';

interface Props {
  demand?: boolean;
  onClose?: () => void;
}

export function VoiceDisclosure({ demand, onClose }: Props) {
  const caps = useCapabilities();
  const [open, setOpen] = useState(false);
  const [acked, setAcked] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getVoicePrefs().then((p) => {
      if (cancelled) return;
      setAcked(p.disclosureAcked);
      if (demand && !p.disclosureAcked) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [demand]);

  useEffect(() => {
    if (demand && acked === false) setOpen(true);
  }, [demand, acked]);

  if (!caps.webSpeech) return null;

  const provider =
    caps.uaFamily === 'safari' ? 'Apple' : caps.uaFamily === 'firefox' ? '(unsupported)' : 'Google';

  const confirm = async (): Promise<void> => {
    await setVoicePrefs({ disclosureAcked: true });
    setAcked(true);
    setOpen(false);
    onClose?.();
  };

  const handleOpen = (v: boolean): void => {
    setOpen(v);
    if (!v) onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>About voice capture</DialogTitle>
          <DialogDescription>One-time disclosure before voice activates.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Mic className="h-4 w-4" />
            </div>
            <p className="text-sm leading-relaxed">
              Capsule uses your browser&apos;s built-in speech recognition. On{' '}
              <strong>{caps.uaFamily === 'safari' ? 'Safari' : 'Chrome/Edge'}</strong>, audio may be
              streamed to <strong>{provider}</strong> for transcription.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3 text-[12px] text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <p>
              Everything else in Capsule stays on your device. Recordings themselves are not stored —
              only the transcripts you save.
            </p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)}>
            Not now
          </Button>
          <Button variant="primary" onClick={() => void confirm()}>
            I understand — enable voice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
