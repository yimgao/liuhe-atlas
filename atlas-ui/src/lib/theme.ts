/**
 * Theme management (dark/light) — singleton pattern matching i18n.ts.
 */
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'atlas-theme';

let _theme: Theme = (() => {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return 'dark';
})();

const _subscribers = new Set<() => void>();

function setThemeGlobal(t: Theme) {
  if (_theme === t) return;
  _theme = t;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, t);
    document.documentElement.classList.toggle('light', t === 'light');
  }
  _subscribers.forEach(fn => fn());
}

// Initial sync
if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('light', _theme === 'light');
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const sub = () => forceRender(x => x + 1);
    _subscribers.add(sub);
    return () => { _subscribers.delete(sub); };
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeGlobal(t);
    forceRender(x => x + 1);
  }, []);

  return { theme: _theme, setTheme };
}