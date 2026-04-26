import { create } from 'zustand';
import { Check, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn';

export type ToastKind = 'info' | 'success' | 'warn' | 'error';

export interface ToastSpec {
  id: string;
  kind: ToastKind;
  message: string;
  action?: { label: string; onClick: () => void } | undefined;
  durationMs?: number;
}

interface ToastState {
  items: ToastSpec[];
  push: (spec: Omit<ToastSpec, 'id'>) => string;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>((set) => ({
  items: [],
  push: (spec) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const toastObj: ToastSpec = { id, ...spec };
    set((s) => ({ items: [...s.items, toastObj] }));
    const dur = spec.durationMs ?? 4000;
    if (dur > 0) {
      setTimeout(() => {
        set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
      }, dur);
    }
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export function toast(message: string, kind: ToastKind = 'info'): string {
  return useToasts.getState().push({ kind, message });
}

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <Check className="h-3.5 w-3.5 text-emerald-500" />,
  error: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
  warn: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
  info: <Info className="h-3.5 w-3.5 text-muted-foreground" />,
};

export function ToastViewport() {
  const { items, dismiss } = useToasts();
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto rounded-lg border border-border bg-popover p-3 text-sm text-popover-foreground shadow-pop',
            'animate-in slide-in-from-bottom-2 fade-in-0 duration-200',
            t.kind === 'error' && 'border-destructive/40',
            t.kind === 'warn' && 'border-warning/40',
            t.kind === 'success' && 'border-emerald-500/40',
          )}
        >
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex-shrink-0">{ICONS[t.kind]}</div>
            <div className="flex-1 leading-snug">{t.message}</div>
            {t.action && (
              <button
                type="button"
                className="shrink-0 rounded border border-border bg-card px-2 py-0.5 text-xs font-medium hover:bg-muted"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              className="-mr-0.5 -mt-0.5 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
