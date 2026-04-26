import { type DragEvent, type ReactNode, useRef, useState } from 'react';
import { detectContent, classifyFile } from '../../lib/contentType';
import { cn } from '../../lib/cn';
import type { Item } from '../../features/capsules/types';
import { makeId } from '../../lib/format/id';
import { putBlob } from '../../db/repo';
import { toast } from '../ui/Toast';
import { toUserMessage } from '../../lib/errors';

interface Props {
  onAdd: (item: Item) => Promise<void> | void;
  children?: ReactNode;
}

async function fileToItem(file: File): Promise<Item> {
  const now = Date.now();
  const blobId = makeId('itm').replace('itm_', 'blob_');
  const kind = classifyFile(file.type);
  await putBlob({
    id: blobId,
    mime: file.type || 'application/octet-stream',
    data: file,
    createdAt: now,
    size: file.size,
  });
  if (kind === 'image') {
    const thumb = await makeThumb(file);
    return {
      id: makeId('itm'),
      type: 'image',
      order: Number.MAX_SAFE_INTEGER, // store places at end
      label: file.name,
      blobId,
      mime: file.type || 'image/*',
      note: '',
      thumbDataUrl: thumb ?? undefined,
      createdAt: now,
      updatedAt: now,
    };
  }
  return {
    id: makeId('itm'),
    type: 'file',
    order: Number.MAX_SAFE_INTEGER,
    label: file.name,
    blobId,
    name: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    note: '',
    createdAt: now,
    updatedAt: now,
  };
}

async function makeThumb(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      if (typeof src !== 'string') return resolve(null);
      const img = new Image();
      img.onload = () => {
        const maxEdge = 256;
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const url = canvas.toDataURL('image/jpeg', 0.8);
          resolve(url.length <= 64 * 1024 ? url : null);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function textToItem(text: string): Item {
  const detected = detectContent(text);
  const now = Date.now();
  const id = makeId('itm');
  const base = { id, order: Number.MAX_SAFE_INTEGER, label: '', createdAt: now, updatedAt: now };
  switch (detected.kind) {
    case 'url':
      return { ...base, type: 'url', href: detected.href, title: '', note: '' };
    case 'code':
      return { ...base, type: 'code', text: detected.text, language: detected.language };
    case 'json':
      return { ...base, type: 'code', text: detected.text, language: 'json' };
    case 'markdown':
    case 'text':
      return { ...base, type: 'text', text: detected.text };
  }
}

export function PasteZone({ onAdd, children }: Props) {
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | File[]): Promise<void> => {
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const item = await fileToItem(f);
        await onAdd(item);
      }
    } catch (e) {
      toast(toUserMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    if (dt.files.length > 0) {
      void handleFiles(dt.files);
      return;
    }
    const text = dt.getData('text/plain');
    if (text) {
      void onAdd(textToItem(text));
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>): void => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      if (it && it.kind === 'file') {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      void handleFiles(files);
      return;
    }
    const text = e.clipboardData.getData('text/plain');
    if (text.trim()) {
      e.preventDefault();
      void onAdd(textToItem(text));
    }
  };

  return (
    <div
      ref={dropRef}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onPaste={onPaste}
      tabIndex={0}
      className={cn(
        'relative min-h-full outline-none transition-colors',
        isDragging && 'bg-primary/5 ring-2 ring-primary/40 ring-inset',
      )}
      aria-label="Capsule editor drop zone — paste or drag content"
    >
      {children}
      {busy && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center py-1 text-xs text-muted-foreground">
          Processing…
        </div>
      )}
    </div>
  );
}
