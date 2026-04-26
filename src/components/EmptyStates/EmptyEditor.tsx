import { EmptyEditorArt } from './illustrations';

export function EmptyEditor() {
  return (
    <div className="mx-auto mt-8 flex max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <EmptyEditorArt className="h-24 w-44 text-muted-foreground/40" />
      <div>
        <div className="text-sm font-semibold text-foreground">Drop, paste, or speak</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Capsule auto-detects what you bring in: URLs become link cards, code keeps its language,
          voice transcribes in three modes, files attach quietly.
        </p>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="kbd">⌘V</span> paste
        <span aria-hidden>·</span>
        <span className="kbd">⇧⌘R</span> record
        <span aria-hidden>·</span>
        drop a file
      </div>
    </div>
  );
}
