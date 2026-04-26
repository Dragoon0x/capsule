import { useEffect, useState } from 'react';
import { get, set } from 'idb-keyval';
import { Sparkles, X, BookOpen } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  onOpenTemplates: () => void;
}

const ACK_KEY = 'capsule:onboarding-acked-v1';

/**
 * Subtle first-run hint. Anchors to the bottom-left, single dismissible card.
 * Idempotent — never returns once acked.
 */
export function Onboarding({ onOpenTemplates }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void get<boolean>(ACK_KEY).then((ack) => {
      if (!cancelled && !ack) setShow(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = (): void => {
    setShow(false);
    void set(ACK_KEY, true);
  };

  if (!show) return null;
  return (
    <div className="pointer-events-auto fixed bottom-4 left-4 z-40 max-w-xs animate-in slide-in-from-bottom-2 fade-in-0 duration-300">
      <div className="rounded-xl border border-border bg-popover p-3 shadow-pop">
        <div className="mb-2 flex items-start gap-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold tracking-tight">Welcome to Capsule</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Build reusable context once, deploy it as structured prompts forever. Press{' '}
              <span className="kbd">?</span> for shortcuts.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Dismiss welcome"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              dismiss();
              onOpenTemplates();
            }}
          >
            <BookOpen className="h-3.5 w-3.5" /> Browse templates
          </Button>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
