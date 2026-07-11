'use client';
import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';
export type Resolved = 'light' | 'dark';

const KEY = 'fasi.theme';

function systemResolved(): Resolved {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(theme: Theme): Resolved {
  return theme === 'system' ? systemResolved() : theme;
}

function apply(resolved: Resolved) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

function readStored(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* localStorage indisponible */
  }
  return 'system';
}

interface ThemeState {
  theme: Theme;
  resolved: Resolved;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

/**
 * Store de thème (clair / sombre / système), persisté en clair sous la clé
 * localStorage `fasi.theme` — même format que le script anti-flash du <head>.
 * Applique le thème en (dé)posant la classe `dark` sur <html>.
 */
export const useTheme = create<ThemeState>((set, get) => ({
  theme: 'system',
  resolved: 'light',
  setTheme: (theme) => {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* quota / mode privé */
    }
    const resolved = resolve(theme);
    apply(resolved);
    set({ theme, resolved });
  },
  toggle: () => {
    const next: Resolved = get().resolved === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));

let inited = false;

/** À appeler une fois côté client : hydrate le store et suit `prefers-color-scheme`. */
export function initTheme() {
  if (inited || typeof window === 'undefined') return;
  inited = true;

  const theme = readStored();
  const resolved = resolve(theme);
  apply(resolved);
  useTheme.setState({ theme, resolved });

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    if (useTheme.getState().theme !== 'system') return;
    const r = systemResolved();
    apply(r);
    useTheme.setState({ resolved: r });
  });
}
