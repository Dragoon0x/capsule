import { useCallback, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Trash2, Mic, Share2, Tag as TagIcon, Check, X, Copy, MoreHorizontal, Wand2 } from 'lucide-react';
import { useCapsulesStore } from '../../features/capsules/store';
import type { Capsule, Item } from '../../features/capsules/types';
import { PasteZone, textToItem } from './PasteZone';
import { SortableItem } from './SortableItem';
import { EmptyEditor } from '../EmptyStates/EmptyEditor';
import { makeId } from '../../lib/format/id';
import { Button } from '../ui/Button';
import { Tip, TooltipProvider } from '../ui/Tooltip';
import { Badge } from '../ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '../ui/Dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/DropdownMenu';
import { cn } from '../../lib/cn';

interface Props {
  capsule: Capsule;
  onOpenVoice: () => void;
  onShare: () => void;
}

export function CapsuleEditor({ capsule, onOpenVoice, onShare }: Props) {
  const updateCapsule = useCapsulesStore((s) => s.updateCapsule);
  const deleteCapsule = useCapsulesStore((s) => s.deleteCapsule);
  const duplicateCapsule = useCapsulesStore((s) => s.duplicateCapsule);
  const duplicateItem = useCapsulesStore((s) => s.duplicateItem);
  const addItem = useCapsulesStore((s) => s.addItem);
  const updateItem = useCapsulesStore((s) => s.updateItem);
  const removeItem = useCapsulesStore((s) => s.removeItem);
  const reorderItems = useCapsulesStore((s) => s.reorderItems);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = capsule.items.map((i) => i.id);
      const oldIdx = ids.indexOf(String(active.id));
      const newIdx = ids.indexOf(String(over.id));
      if (oldIdx < 0 || newIdx < 0) return;
      const next = arrayMove(ids, oldIdx, newIdx);
      void reorderItems(capsule.id, next);
    },
    [capsule, reorderItems],
  );

  const addText = (): void => {
    const now = Date.now();
    const item: Item = {
      id: makeId('itm'),
      type: 'text',
      order: Number.MAX_SAFE_INTEGER,
      label: '',
      text: '',
      createdAt: now,
      updatedAt: now,
    };
    void addItem(capsule.id, item);
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="relative flex h-full min-h-0 flex-col">
        <div className="flex-shrink-0 space-y-2 border-b border-border bg-card/40 px-6 py-4">
          <div className="flex items-start gap-2">
            <input
              type="text"
              value={capsule.title}
              onChange={(e) => void updateCapsule(capsule.id, (d) => void (d.title = e.target.value))}
              className="w-full border-0 bg-transparent p-0 text-lg font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60"
              placeholder="Untitled capsule"
              aria-label="Capsule title"
            />
            <div className="flex-shrink-0">
              <Badge variant="secondary" className="tabular">
                v{capsule.seq}
              </Badge>
            </div>
            <Tip content="Share">
              <Button variant="ghost" size="icon-sm" onClick={onShare} aria-label="Share capsule">
                <Share2 />
              </Button>
            </Tip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="More actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void duplicateCapsule(capsule.id)}>
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate capsule
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setConfirmDelete(true)}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete capsule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <textarea
            value={capsule.description}
            onChange={(e) =>
              void updateCapsule(capsule.id, (d) => void (d.description = e.target.value))
            }
            placeholder="What is this capsule for? (optional)"
            rows={1}
            className="w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/50"
            aria-label="Capsule description"
          />
          <TagEditor
            value={capsule.tags}
            onChange={(tags) => void updateCapsule(capsule.id, (d) => void (d.tags = tags))}
          />
        </div>

        <PasteZone
          onAdd={async (it) => {
            await addItem(capsule.id, it);
          }}
        >
          <div className="min-h-full overflow-y-auto px-6 py-4">
            {capsule.items.length === 0 ? (
              <EmptyEditor />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={capsule.items.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2.5">
                    {capsule.items.map((it) => (
                      <SortableItem
                        key={it.id}
                        item={it}
                        onUpdate={(m) => void updateItem(capsule.id, it.id, m)}
                        onRemove={() => void removeItem(capsule.id, it.id)}
                        onDuplicate={() => void duplicateItem(capsule.id, it.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </PasteZone>

        <div className="flex flex-shrink-0 items-center gap-1.5 border-t border-border bg-card/40 px-4 py-2">
          <Tip content="Add a text block">
            <Button size="sm" variant="outline" onClick={addText}>
              <Plus /> Text
            </Button>
          </Tip>
          <Tip content="Add an empty block (auto-detect on paste)">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void addItem(capsule.id, textToItem(''))}
            >
              <Wand2 /> Auto
            </Button>
          </Tip>
          <Tip content="Voice studio" shortcut="⇧⌘R">
            <Button size="sm" variant="outline" onClick={onOpenVoice}>
              <Mic /> Voice
            </Button>
          </Tip>
          <div className="ml-auto tabular text-[11px] text-muted-foreground">
            {capsule.items.length} item{capsule.items.length === 1 ? '' : 's'}
          </div>
        </div>

        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Delete capsule?</DialogTitle>
              <DialogDescription>
                &ldquo;{capsule.title || 'Untitled'}&rdquo; and its {capsule.items.length} items will be removed. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <p className="text-sm text-muted-foreground">Consider exporting a backup first.</p>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  void deleteCapsule(capsule.id);
                  setConfirmDelete(false);
                }}
              >
                Delete capsule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function TagEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const commit = (): void => {
    const t = draft.trim().toLowerCase();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((t) => (
        <Badge key={t} variant="secondary" className="gap-1 pr-1">
          <TagIcon className="h-2.5 w-2.5" /> {t}
          <button
            type="button"
            className="rounded p-0.5 hover:bg-muted hover:text-destructive"
            onClick={() => onChange(value.filter((x) => x !== t))}
            aria-label={`Remove tag ${t}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <div
        className={cn(
          'flex items-center gap-1 rounded-full border border-dashed border-border bg-card px-2 py-0.5 text-xs',
          'focus-within:border-primary',
        )}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          placeholder="+ tag"
          size={6}
          className="bg-transparent text-[11px] outline-none placeholder:text-muted-foreground"
          aria-label="Add tag"
        />
        {draft && (
          <button
            type="button"
            className="rounded p-0.5 text-muted-foreground hover:text-primary"
            onMouseDown={(e) => {
              e.preventDefault();
              commit();
            }}
            aria-label="Add tag"
          >
            <Check className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}
