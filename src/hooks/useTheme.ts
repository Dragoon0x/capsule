import { useEffect, useState } from 'react';
import { getTheme, setTheme, type Theme } from '../features/storage/persistence';

function apply(theme: Theme): void {
  const root = document.documentElement;
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    let cancelled = false;
    void getTheme().then((t) => {
      if (cancelled) return;
      setThemeState(t);
      apply(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (theme !== 'system') return undefined;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (): void => apply('system');
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, [theme]);

  return {
    theme,
    setTheme: (t) => {
      setThemeState(t);
      apply(t);
      void setTheme(t);
    },
  };
}
