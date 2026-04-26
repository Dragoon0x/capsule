import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Item } from '../../features/capsules/types';
import { ItemRenderer } from './ItemRenderer';
import { useBlobUrl } from './BlobResolver';

interface Props {
  item: Item;
  onUpdate: (m: (draft: Item) => void) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

export function SortableItem({ item, onUpdate, onRemove, onDuplicate }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const blobId = item.type === 'image' || item.type === 'file' ? item.blobId : null;
  const blobUrl = useBlobUrl(blobId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('relative flex gap-1.5', isDragging && 'z-10 opacity-60')}
    >
      <button
        type="button"
        className={cn(
          'mt-3 flex h-7 w-5 flex-shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/50',
          'transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        )}
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="min-w-0 flex-1">
        <ItemRenderer
          item={item}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          blobUrl={blobUrl}
        />
      </div>
    </div>
  );
}
