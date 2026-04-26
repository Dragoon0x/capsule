import { useState } from 'react';
import {
  AlignLeft,
  Code2,
  File as FileIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  AudioWaveform,
  Trash2,
  Pencil,
  Check,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';
import type { Item } from '../../features/capsules/types';
import { formatBytes } from '../../lib/format/bytes';
import { Button } from '../ui/Button';
import { Tip } from '../ui/Tooltip';
import { Input, Textarea } from '../ui/Input';
import { CodeBlock } from './CodeBlock';
import { MarkdownPreview } from './MarkdownPreview';
import { cn } from '../../lib/cn';

interface Props {
  item: Item;
  onUpdate: (m: (draft: Item) => void) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  blobUrl?: string | undefined;
}

export function ItemRenderer({ item, onUpdate, onRemove, onDuplicate, blobUrl }: Props) {
  const [editing, setEditing] = useState(false);
  const [showRendered, setShowRendered] = useState(true);
  return (
    <div
      className="group/item relative flex gap-3 rounded-lg border border-border bg-card p-3 shadow-xs transition-shadow hover:shadow-sm"
      data-item-type={item.type}
    >
      <TypeChip type={item.type} />
      <div className="min-w-0 flex-1">
        <Header
          item={item}
          editing={editing}
          showRendered={showRendered}
          onLabelChange={(label) =>
            onUpdate((d) => {
              d.label = label;
            })
          }
          onToggleRendered={() => setShowRendered((v) => !v)}
        />
        {editing ? (
          <EditView item={item} onUpdate={onUpdate} onDone={() => setEditing(false)} />
        ) : (
          <PreviewView item={item} blobUrl={blobUrl} showRendered={showRendered} />
        )}
      </div>
      <div className="flex flex-shrink-0 items-start gap-0.5 opacity-0 transition-opacity duration-150 group-hover/item:opacity-100 focus-within:opacity-100">
        <Tip content={editing ? 'Done' : 'Edit'}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing((v) => !v)}
            aria-label={editing ? 'Finish editing' : 'Edit item'}
          >
            {editing ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Pencil className="h-3.5 w-3.5" />}
          </Button>
        </Tip>
        <Tip content="Duplicate">
          <Button variant="ghost" size="icon-sm" onClick={onDuplicate} aria-label="Duplicate item">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </Tip>
        <Tip content="Remove">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label="Remove item"
            className="hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </Tip>
      </div>
    </div>
  );
}

function TypeChip({ type }: { type: Item['type'] }) {
  const Icon =
    type === 'text'
      ? AlignLeft
      : type === 'code'
        ? Code2
        : type === 'url'
          ? LinkIcon
          : type === 'image'
            ? ImageIcon
            : type === 'file'
              ? FileIcon
              : AudioWaveform;
  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}

function Header({
  item,
  editing,
  showRendered,
  onLabelChange,
  onToggleRendered,
}: {
  item: Item;
  editing: boolean;
  showRendered: boolean;
  onLabelChange: (v: string) => void;
  onToggleRendered: () => void;
}) {
  const isText = item.type === 'text';
  if (!editing && !item.label && !isText) return null;
  return (
    <div className="mb-1 flex items-center gap-2 text-[11px]">
      <span className="font-mono uppercase tracking-wide text-muted-foreground">{item.type}</span>
      {editing ? (
        <Input
          value={item.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Label (optional)"
          className="h-6 text-[11px]"
        />
      ) : item.label ? (
        <span className="truncate text-muted-foreground">{item.label}</span>
      ) : null}
      {isText && !editing && (
        <button
          type="button"
          onClick={onToggleRendered}
          className="ml-auto flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-pressed={showRendered}
          title={showRendered ? 'Show source' : 'Show rendered markdown'}
        >
          {showRendered ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
          {showRendered ? 'rendered' : 'source'}
        </button>
      )}
    </div>
  );
}

function PreviewView({
  item,
  blobUrl,
  showRendered,
}: {
  item: Item;
  blobUrl?: string | undefined;
  showRendered: boolean;
}) {
  switch (item.type) {
    case 'text':
      if (!item.text.trim()) {
        return <div className="text-sm italic text-muted-foreground">Empty text — click edit to write.</div>;
      }
      return showRendered ? (
        <MarkdownPreview text={item.text} />
      ) : (
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">{item.text}</pre>
      );
    case 'code':
      return <CodeBlock text={item.text} language={item.language} />;
    case 'url':
      return (
        <div>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline',
              'tracking-tight',
            )}
          >
            {item.title || item.href}
          </a>
          {!item.title && (
            <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{item.href}</div>
          )}
          {item.note && <div className="mt-1.5 text-[12px] text-muted-foreground">{item.note}</div>}
        </div>
      );
    case 'image':
      return (
        <div>
          {(blobUrl || item.thumbDataUrl) && (
            <img
              src={blobUrl ?? item.thumbDataUrl}
              alt={item.label || 'image'}
              className="mt-0.5 max-h-48 rounded-md border border-border"
            />
          )}
          <div className="mt-1 font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
            {item.mime}
          </div>
          {item.note && <div className="mt-1 text-[12px] text-muted-foreground">{item.note}</div>}
        </div>
      );
    case 'file':
      return (
        <div className="text-sm">
          <div className="font-mono">{item.name}</div>
          <div className="text-[11px] text-muted-foreground">
            {item.mime} · {formatBytes(item.size)}
          </div>
          {item.note && <div className="mt-1 text-[12px] text-muted-foreground">{item.note}</div>}
        </div>
      );
    case 'voice':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-wide text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{item.mode}</span>
            <span className="tabular">{Math.round(item.durationMs / 1000)}s</span>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{item.text}</div>
        </div>
      );
  }
}

function EditView({
  item,
  onUpdate,
  onDone,
}: {
  item: Item;
  onUpdate: (m: (draft: Item) => void) => void;
  onDone: () => void;
}) {
  switch (item.type) {
    case 'text':
      return (
        <Textarea
          className="min-h-[5rem] font-sans"
          value={item.text}
          onChange={(e) =>
            onUpdate((d) => {
              if (d.type === 'text') d.text = e.target.value;
            })
          }
          onBlur={onDone}
          autoFocus
        />
      );
    case 'code':
      return (
        <div className="space-y-2">
          <Input
            value={item.language}
            placeholder="language (e.g. typescript)"
            onChange={(e) =>
              onUpdate((d) => {
                if (d.type === 'code') d.language = e.target.value;
              })
            }
          />
          <Textarea
            className="min-h-[7rem] font-mono text-xs"
            value={item.text}
            onChange={(e) =>
              onUpdate((d) => {
                if (d.type === 'code') d.text = e.target.value;
              })
            }
            onBlur={onDone}
            autoFocus
          />
        </div>
      );
    case 'url':
      return (
        <div className="space-y-2">
          <Input
            value={item.href}
            onChange={(e) =>
              onUpdate((d) => {
                if (d.type === 'url') d.href = e.target.value;
              })
            }
            placeholder="https://…"
          />
          <Input
            value={item.title}
            placeholder="Title (optional)"
            onChange={(e) =>
              onUpdate((d) => {
                if (d.type === 'url') d.title = e.target.value;
              })
            }
          />
          <Textarea
            className="min-h-[3rem]"
            value={item.note}
            placeholder="Note (optional)"
            onChange={(e) =>
              onUpdate((d) => {
                if (d.type === 'url') d.note = e.target.value;
              })
            }
            onBlur={onDone}
          />
        </div>
      );
    case 'image':
    case 'file':
      return (
        <Textarea
          className="min-h-[3rem]"
          value={item.note}
          placeholder="Note"
          onChange={(e) =>
            onUpdate((d) => {
              if (d.type === 'image' || d.type === 'file') d.note = e.target.value;
            })
          }
          onBlur={onDone}
          autoFocus
        />
      );
    case 'voice':
      return (
        <div className="space-y-2">
          <select
            value={item.mode}
            onChange={(e) =>
              onUpdate((d) => {
                if (d.type === 'voice') {
                  d.mode = e.target.value as 'raw' | 'clean' | 'formatted';
                }
              })
            }
            className="flex h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="raw">raw</option>
            <option value="clean">clean</option>
            <option value="formatted">formatted (best-effort)</option>
          </select>
          <Textarea
            className="min-h-[6rem]"
            value={item.text}
            onChange={(e) =>
              onUpdate((d) => {
                if (d.type === 'voice') d.text = e.target.value;
              })
            }
            onBlur={onDone}
            autoFocus
          />
        </div>
      );
  }
}
