import { useCallback, useEffect, useState } from 'react';

/** localStorage can throw (private mode, blocked storage); the UI must never depend on it. */
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

/** A boolean persisted in this browser. */
export function useStoredFlag(key: string, initial = false) {
  const [value, setValue] = useState<boolean>(() => read(key, initial));
  useEffect(() => write(key, value), [key, value]);
  return [value, setValue] as const;
}

/** A set of strings (bookmarked problem slugs) persisted in this browser. */
export function useStoredSet(key: string) {
  const [items, setItems] = useState<string[]>(() => {
    const v = read<unknown>(key, []);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  });
  useEffect(() => write(key, items), [key, items]);
  const has = useCallback((s: string) => items.includes(s), [items]);
  const toggle = useCallback(
    (s: string) => setItems((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])),
    [],
  );
  return { has, toggle, size: items.length, items };
}
