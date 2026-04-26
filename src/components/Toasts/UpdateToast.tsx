import { useEffect } from 'react';
import { useToasts } from '../ui/Toast';

/**
 * Listens for SW update events and surfaces a reload action.
 */
export function UpdateToast() {
  const push = useToasts((s) => s.push);
  useEffect(() => {
    const onUpdate = (): void => {
      push({
        kind: 'info',
        message: 'A new version is ready.',
        durationMs: 0,
        action: {
          label: 'Reload',
          onClick: () => {
            void window.__capsuleUpdateSW?.();
          },
        },
      });
    };
    const onOffline = (): void => {
      push({
        kind: 'success',
        message: 'Capsule is ready to work offline.',
        durationMs: 4000,
      });
    };
    window.addEventListener('capsule:sw-update', onUpdate);
    window.addEventListener('capsule:sw-offline-ready', onOffline);
    return () => {
      window.removeEventListener('capsule:sw-update', onUpdate);
      window.removeEventListener('capsule:sw-offline-ready', onOffline);
    };
  }, [push]);
  return null;
}
