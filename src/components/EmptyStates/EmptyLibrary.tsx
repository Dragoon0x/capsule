import { Button } from '../ui/Button';
import { Plus, BookOpen } from 'lucide-react';
import { EmptyLibraryArt } from './illustrations';

interface Props {
  onCreate: () => void;
  onTemplates: () => void;
}

export function EmptyLibrary({ onCreate, onTemplates }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <EmptyLibraryArt className="h-24 w-44 text-muted-foreground/40" />
      <div>
        <div className="text-sm font-semibold text-foreground">Build your first capsule</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Reusable bundles of context — text, code, links, images, voice — that you deploy as
          structured prompts.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Button variant="primary" size="sm" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" /> New blank capsule
        </Button>
        <Button variant="ghost" size="sm" onClick={onTemplates}>
          <BookOpen className="h-3.5 w-3.5" /> Start from a template
        </Button>
      </div>
    </div>
  );
}
