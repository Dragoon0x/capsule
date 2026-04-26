import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/Dialog';
import { TEMPLATES, type TemplateMeta } from '../../features/templates/library';
import { forkTemplate } from '../../features/templates/fork';
import { useCapsulesStore } from '../../features/capsules/store';
import { putCapsule } from '../../db/repo';
import { toast } from '../ui/Toast';
import { toUserMessage } from '../../lib/errors';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ArrowRight } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplatesDialog({ open, onOpenChange }: Props) {
  const setActive = useCapsulesStore((s) => s.setActive);
  const hydrate = useCapsulesStore((s) => s.hydrate);

  const fork = async (tpl: TemplateMeta): Promise<void> => {
    try {
      const cap = forkTemplate(tpl);
      await putCapsule(cap);
      await hydrate();
      setActive(cap.id);
      onOpenChange(false);
      toast(`Forked "${tpl.name}" into your library.`, 'success');
    } catch (e) {
      toast(toUserMessage(e), 'error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Start from a template</DialogTitle>
          <DialogDescription>
            Curated capsules to fork into your library. Edit freely after forking &mdash; they are yours.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          {TEMPLATES.map((tpl) => (
            <Card
              key={tpl.id}
              role="button"
              tabIndex={0}
              onClick={() => void fork(tpl)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  void fork(tpl);
                }
              }}
              className="group cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex items-start gap-3 p-4">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-base">
                  <span aria-hidden>{tpl.emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <div className="text-sm font-semibold tracking-tight">{tpl.name}</div>
                    <ArrowRight className="h-3 w-3 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{tpl.blurb}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tpl.capsule.tags.slice(0, 3).map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                    <Badge variant="outline">{tpl.capsule.items.length} items</Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
