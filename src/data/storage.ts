import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { Status } from '../engine/types';

/** localStorage can throw (private mode, blocked storage) — never let that break the UI. */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, fallback));
  useEffect(() => write(key, value), [key, value]);
  return [value, setValue] as const;
}

export const STATUS_LABEL: Record<Status, string> = {
  todo: '— Not set —',
  progress: 'In progress',
  pending: 'Practice pending',
  solved: 'Solved',
  revise: 'Needs revision',
};
export const STATUS_ORDER: Status[] = ['todo', 'progress', 'pending', 'solved', 'revise'];

type StatusMap = Record<string, Status>;

export function useProgress() {
  const [map, setMap] = useStored<StatusMap>('algoflow.progress', {});
  const get = useCallback((slug: string): Status => map[slug] ?? 'todo', [map]);
  const set = useCallback(
    (slug: string, s: Status) =>
      setMap((m) => {
        const next = { ...m };
        if (s === 'todo') delete next[slug];
        else next[slug] = s;
        return next;
      }),
    [setMap],
  );
  return { get, set };
}

export function useNote(slug: string) {
  const [notes, setNotes] = useStored<Record<string, string>>('algoflow.notes', {});
  return [notes[slug] ?? '', (text: string) => setNotes((n) => ({ ...n, [slug]: text }))] as const;
}

/**
 * One shared theme store: every toggle (library header, problem page, pattern page) reads and writes
 * the same value, so they can never disagree. `<html data-theme>` is the source of truth (index.html
 * sets it before first paint from localStorage).
 */
type Theme = 'dark' | 'light';
const themeListeners = new Set<() => void>();
const readTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

function setThemeEverywhere(next: Theme) {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('algoflow.theme', next);
  } catch {
    /* ignore */
  }
  themeListeners.forEach((l) => l());
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => {
      themeListeners.add(cb);
      return () => themeListeners.delete(cb);
    },
    readTheme,
    () => 'dark' as Theme,
  );
  return [theme, () => setThemeEverywhere(readTheme() === 'dark' ? 'light' : 'dark')] as const;
}
