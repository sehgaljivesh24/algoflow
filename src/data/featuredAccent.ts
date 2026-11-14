import { accentFor } from './patternAccent.ts';
import type { Accent } from './patternAccent.ts';
import type { PatternContent } from './patterns.ts';

/**
 * problem slug -> accent of the first pattern that features it (flagship animations first, then worked examples, then
 * practice lists). Needs the full pattern text, so it runs at generation time (scripts/gen-pattern-text.mts writes the
 * result into patternText/light.ts) and in the check that proves the generated map is current. The browser never calls it.
 */
export function computeFeatured(
  patterns: { slug: string; group: string }[],
  contentOf: (slug: string) => PatternContent | undefined,
  examplesOf: (slug: string) => { slug: string }[],
): Map<string, Accent> {
  const map = new Map<string, Accent>();
  const add = (slug: string | undefined, pattern: { slug: string; group: string }) => {
    if (slug && !map.has(slug)) map.set(slug, accentFor(pattern.slug, pattern.group));
  };
  for (const p of patterns) add(contentOf(p.slug)?.animation, p);
  for (const p of patterns) for (const e of examplesOf(p.slug)) add(e.slug, p);
  for (const p of patterns) {
    for (const item of contentOf(p.slug)?.practice ?? []) {
      if (typeof item === 'string') add(item, p);
      else if ('slug' in item) add(item.slug, p);
    }
  }
  return map;
}
