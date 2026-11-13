/** Content access for "The Only Cheatsheets": manifest + lazily loaded HTML fragments (one chunk per guide). */
export interface OnlyGuide {
  slug: string;
  title: string;
  sourcePath: string;
  words: number;
  description?: string;
}
export interface OnlyCategory {
  title: string;
  guides: OnlyGuide[];
}
export interface OnlyMeta {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  repoUrl: string;
  license: string;
  copyright: string;
  retrieved: string;
  route: string;
  categories: OnlyCategory[];
}

const BASE = '/src/content/cheatsheets/the-only/';
const FRAGMENTS = import.meta.glob<string>('/src/content/cheatsheets/the-only/*.html', { query: '?raw', import: 'default' });
const META = import.meta.glob<OnlyMeta>('/src/content/cheatsheets/the-only/meta.json', { import: 'default' });

export const ROUTE = '/cheatsheets/the-only';
export const SITE_URL = 'https://malharchauhan7.github.io/the-only-cheatsheets/';
export const REPO_URL = 'https://github.com/malharchauhan7/the-only-cheatsheets';

let metaPromise: Promise<OnlyMeta> | null = null;
export function loadMeta(): Promise<OnlyMeta> {
  const loader = META[`${BASE}meta.json`];
  if (!loader) return Promise.reject(new Error('the-only/meta.json is missing'));
  metaPromise ??= loader();
  return metaPromise;
}

export function loadFragment(name: string): Promise<string | null> {
  const loader = FRAGMENTS[`${BASE}${name}.html`];
  return loader ? loader() : Promise.resolve(null);
}

export function flatGuides(meta: OnlyMeta): OnlyGuide[] {
  return meta.categories.flatMap((c) => c.guides);
}
