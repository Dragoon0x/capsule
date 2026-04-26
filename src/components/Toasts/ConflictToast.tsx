import { useEffect } from 'react';
import { useCapsulesStore } from '../../features/capsules/store';
import { useToasts } from '../ui/Toast';

export function ConflictToast() {
  const conflict = useCapsulesStore((s) => s.conflict);
  const ack = useCapsulesStore((s) => s.acknowledgeConflict);
  const push = useToasts((s) => s.push);

  useEffect(() => {
    if (!conflict) return;
    push({
      kind: 'warn',
      message: 'Another tab updated this capsule. Your latest local edit may be outdated.',
      durationMs: 0,
      action: {
        label: 'Got it',
        onClick: () => ack(),
      },
    });
  }, [conflict, ack, push]);
  return null;
}
