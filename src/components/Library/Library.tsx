import { useMemo, useRef, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Plus, Search, Pin, Upload, Download, Tag, Rocket, BookOpen, Copy, Trash2, MoreHorizontal } from 'lucide-react';
import { useCapsulesStore, selectAllOrdered } from '../../features/capsules/store';
import { useDeployStore } from '../../features/deploy/store';
import { search } from '../../features/search';
import { allTags } from '../../features/capsules/selectors';
import { formatRelative } from '../../lib/format/date';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { Tip, TooltipProvider } from '../ui/Tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import { EmptyLibrary } from '../EmptyStates/EmptyLibrary';
import { cn } from '../../lib/cn';
import type { Capsule } from '../../features/capsules/types';

interface Props {
  onImport: () => void;
  onExport: () => void;
  onTemplates: () => void;
}

export function Library({ onImport, onExport, onTemplates }: Props) {
  const caps = useCapsulesStore(selectAllOrdered);
  const loading = useCapsulesStore((s) => s.loading);
  const error = useCapsulesStore((s) => s.error);
  const activeId = useCapsulesStore((s) => s.activeId);
  const setActive = useCapsulesStore((s) => s.setActive);
  const createCapsule = useCapsulesStore((s) => s.createCapsule);
  const setPinned = useCapsulesStore((s) => s.setPinned);
  const duplicateCapsule = useCapsulesStore((s) => s.duplicateCapsule);
  const deleteCapsule = useCapsulesStore((s) => s.deleteCapsule);
  const selected = useDeployStore((s) => s.selectedCapsuleIds);
  const toggleCapsule = useDeployStore((s) => s.toggleCapsule);

  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const tagFiltered = activeTag ? caps.filter((c) => c.tags.includes(activeTag)) : caps;
    if (!query.trim()) return tagFiltered;
    return search(tagFiltered, query).map((h) => h.capsule);
  }, [caps, query, activeTag]);

  const tags = useMemo(() => allTags(caps), [caps]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 6,
  });

  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const onFocusEvt = (): void => searchRef.current?.focus();
    window.addEventListener('capsule:focus-search', onFocusEvt);
    return () => window.removeEventListener('capsule:focus-search', onFocusEvt);
  }, []);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-1.5 px-3 pt-3 pb-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              className="pl-7"
              placeholder="Search capsules"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search capsules"
            />
          </div>
          <Tip content="New capsule" shortcut="⌘N">
            <Button
              size="icon"
              variant="primary"
              onClick={() => void createCapsule()}
              aria-label="Create capsule"
            >
              <Plus />
            </Button>
          </Tip>
        </div>

        {tags.size > 0 && (
          <div className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={cn(
                'inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-[11px] font-medium transition-colors',
                activeTag === null
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              All ({caps.length})
            </button>
            {[...tags.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 16)
              .map(([t, n]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveTag(activeTag === t ? null : t)}
                  className={cn(
                    'inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] font-medium transition-colors',
                    activeTag === t
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Tag className="h-2.5 w-2.5" /> {t} <span className="opacity-60">({n})</span>
                </button>
              ))}
          </div>
        )}

        <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1.5 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[68px]" />
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="m-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            query ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No capsules match <span className="font-mono">{query.slice(0, 40)}</span>.
              </div>
            ) : caps.length === 0 ? (
              <EmptyLibrary onCreate={() => void createCapsule()} onTemplates={onTemplates} />
            ) : null
          ) : (
            <div
              style={{
                height: rowVirtualizer.getTotalSize(),
                position: 'relative',
                width: '100%',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((v) => {
                const cap = filtered[v.index];
                if (!cap) return null;
                const isActive = cap.id === activeId;
                const isSelected = selected.includes(cap.id);
                return (
                  <div
                    key={cap.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      transform: `translateY(${v.start}px)`,
                    }}
                  >
                    <CapsuleRow
                      capsule={cap}
                      active={isActive}
                      selected={isSelected}
                      onOpen={() => setActive(cap.id)}
                      onToggleDeploy={() => toggleCapsule(cap.id)}
                      onPin={() => void setPinned(cap.id, !cap.pinned)}
                      onDuplicate={() => void duplicateCapsule(cap.id)}
                      onDelete={() => void deleteCapsule(cap.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 border-t border-border bg-card/40 p-2">
          <Tip content="Browse templates" shortcut="⌘T">
            <Button size="sm" variant="ghost" onClick={onTemplates}>
              <BookOpen /> Templates
            </Button>
          </Tip>
          <div className="flex-1" />
          <Tip content="Import backup or share file">
            <Button size="icon-sm" variant="ghost" onClick={onImport} aria-label="Import">
              <Upload />
            </Button>
          </Tip>
          <Tip content="Export backup">
            <Button size="icon-sm" variant="ghost" onClick={onExport} aria-label="Export">
              <Download />
            </Button>
          </Tip>
        </div>
      </div>
    </TooltipProvider>
  );
}

function CapsuleRow({
  capsule,
  active,
  selected,
  onOpen,
  onToggleDeploy,
  onPin,
  onDuplicate,
  onDelete,
}: {
  capsule: Capsule;
  active: boolean;
  selected: boolean;
  onOpen: () => void;
  onToggleDeploy: () => void;
  onPin: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        'group/row relative mx-2 my-1 cursor-pointer rounded-lg border p-2.5 transition-all duration-150',
        active
          ? 'border-primary/40 bg-card shadow-xs'
          : 'border-transparent hover:border-border hover:bg-card',
      )}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-pressed={active}
      aria-label={`Open capsule ${capsule.title}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDeploy();
          }}
          className={cn(
            'flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-[4px] border transition-colors',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-card hover:border-foreground/50',
          )}
          aria-label={selected ? 'Deselect for deploy' : 'Select for deploy'}
          aria-pressed={selected}
        >
          {selected && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4l1.7 1.7L6.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1 truncate text-sm font-medium tracking-tight">
          {capsule.title || 'Untitled'}
        </div>
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className={cn(
              'rounded p-1 transition-all',
              capsule.pinned
                ? 'text-primary'
                : 'text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover/row:opacity-100',
            )}
            aria-label={capsule.pinned ? 'Unpin capsule' : 'Pin capsule'}
            aria-pressed={capsule.pinned}
          >
            <Pin className="h-3 w-3" />
          </button>
          <RowMenu onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="tabular">{capsule.items.length} items</span>
        <span aria-hidden>·</span>
        <span>{formatRelative(capsule.updatedAt)}</span>
        {capsule.tags.length > 0 && (
          <>
            <span aria-hidden>·</span>
            <span className="truncate">{capsule.tags.slice(0, 2).join(', ')}</span>
          </>
        )}
        {selected && (
          <Badge variant="primary" className="ml-auto">
            <Rocket className="h-2.5 w-2.5" /> queued
          </Badge>
        )}
      </div>
    </div>
  );
}

function RowMenu({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover/row:opacity-100 data-[state=open]:opacity-100"
          aria-label="More actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem onSelect={onDuplicate}>
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onDelete}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
