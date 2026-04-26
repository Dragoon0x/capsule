import { useEffect } from 'react';
import { registerShortcut, type Combo } from '../lib/keyboard';

export function useShortcut(
  combo: Combo,
  handler: (e: KeyboardEvent) => void,
  opts: { allowInInput?: boolean; enabled?: boolean } = {},
): void {
  useEffect(() => {
    if (opts.enabled === false) return undefined;
    return registerShortcut({
      combo,
      handler,
      allowInInput: opts.allowInInput ?? false,
      preventDefault: true,
    });
  }, [combo, handler, opts.allowInInput, opts.enabled]);
}
