/**
 * Accent colour of the full problem page (/problem/<slug>), chosen so a problem looks like the pattern page of its family:
 * the pattern that features the problem (its flagship animation, a worked example or a practice entry) decides, and the
 * problem's own category / technique tag covers the rest.
 */
import type { Accent } from './patternAccent.ts';
import { FEATURED } from './patternText/light.ts';

let bySlug: Map<string, Accent> | undefined;

/**
 * problem slug -> accent of the first pattern that features it (flagship animations first, then examples, then practice lists).
 * Precomputed into patternText/light.ts by scripts/gen-pattern-text.mts (the algorithm is computeFeatured in featuredAccent.ts),
 * so this module needs none of the pattern text.
 */
function featured(): Map<string, Accent> {
  if (bySlug) return bySlug;
  const map = new Map<string, Accent>();
  for (const [accent, slugs] of Object.entries(FEATURED)) for (const s of slugs.split(' ')) if (s) map.set(s, accent as Accent);
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
