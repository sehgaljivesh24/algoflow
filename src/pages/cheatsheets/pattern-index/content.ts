/** Lazy access to the imported DSA Pattern Index content (src/content/cheatsheets/pattern-index). */

export interface SectionMeta {
  id: string;
  number: string;
  title: string;
  navTitle: string;
  navNumber: string;
  /** Element the original page nests this section in besides <main> (an unclosed <code> in its markup), or null. */
  wrapper: 'code' | null;
  divider: string | null;
  codeBlocks: number;
  tables: number;
  rows: number;
  file: string;
  bytes: number;
  estHeight: number;
}

export interface PatternIndexMeta {
  id: string;
  title: string;
  pageTitle: string;
  sourceUrl: string;
  repoUrl: string;
  copyright: string;
  license: string;
  hero: { title: string; file: string };
  sections: SectionMeta[];
}

const BASE = '/src/content/cheatsheets/pattern-index/';

// One chunk per fragment; nothing here is imported statically.
const fragments = import.meta.glob<string>('/src/content/cheatsheets/pattern-index/*.html', { query: '?raw', import: 'default' });
const metaLoaders = import.meta.glob<PatternIndexMeta>('/src/content/cheatsheets/pattern-index/meta.json', { import: 'default' });

export function loadMeta(): Promise<PatternIndexMeta> {
  const load = metaLoaders[`${BASE}meta.json`];
  if (!load) return Promise.reject(new Error('pattern-index meta.json is missing - run the importer'));
  return load();
}

const cache = new Map<string, Promise<string>>();

export function loadFragment(file: string): Promise<string> {
  let p = cache.get(file);
  if (!p) {
    const load = fragments[`${BASE}${file}`];
    p = load ? load() : Promise.reject(new Error(`missing fragment ${file}`));
    p.catch(() => cache.delete(file));
    cache.set(file, p);
  }
  return p;
}
