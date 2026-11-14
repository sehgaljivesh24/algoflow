/**
 * Accent colour of the full problem page (/problem/<slug>), chosen so a problem looks like the pattern page of its family:
 * the pattern that features the problem (its flagship animation, a worked example or a practice entry) decides, and the
 * problem's own category / technique tag covers the rest.
 */
import { accentFor, type Accent } from './patternAccent.ts';
import { ALL_PATTERNS, CONTENT, examplesFor } from './patterns.ts';

let bySlug: Map<string, Accent> | undefined;

/** problem slug -> accent of the first pattern that features it (flagship animations first, then examples, then practice lists). */
function featured(): Map<string, Accent> {
  if (bySlug) return bySlug;
  const map = new Map<string, Accent>();
  const add = (slug: string | undefined, pattern: { slug: string; group: string }) => {
    if (slug && !map.has(slug)) map.set(slug, accentFor(pattern.slug, pattern.group));
  };
  for (const p of ALL_PATTERNS) add(CONTENT[p.slug]?.animation, p);
  for (const p of ALL_PATTERNS) for (const e of examplesFor(p.slug)) add(e.slug, p);
  for (const p of ALL_PATTERNS) {
    for (const item of CONTENT[p.slug]?.practice ?? []) {
      if (typeof item === 'string') add(item, p);
      else if ('slug' in item) add(item.slug, p);
    }
  }
  bySlug = map;
  return map;
}

/** Category -> the pattern family it belongs to (same colours as the pattern pages). */
const BY_CATEGORY: Record<string, Accent> = {
  Arrays: 'cyan',
  Strings: 'blue',
  Matrix: 'cyan',
  Stack: 'orange',
  Queue: 'orange',
  'Binary Search': 'blue',
  'Linked List': 'green',
  Greedy: 'yellow',
  Intervals: 'yellow',
  Backtracking: 'purple',
  Tree: 'green',
  Heap: 'orange',
  Graph: 'blue',
  'Dynamic Programming': 'purple',
  'Bit Manipulation': 'red',
  Sorting: 'orange',
  Trie: 'blue',
  Design: 'orange',
  'Divide and Conquer': 'purple',
  Math: 'yellow',
};

/** Technique tags inside the Arrays category that belong to another family. */
function byTag(tag: string): Accent | undefined {
  const t = tag.toLowerCase();
  if (t.includes('sliding window')) return 'cyan';
  if (t.includes('two pointers')) return 'green';
  if (/prefix|hash|frequency|kadane/.test(t)) return 'yellow';
  return undefined;
}

export function problemAccent(slug: string, category: string, tag: string): Accent {
  return featured().get(slug) ?? (category === 'Arrays' ? byTag(tag) : undefined) ?? BY_CATEGORY[category] ?? 'cyan';
}
