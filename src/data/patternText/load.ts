import type { PatternPack } from '../packs/types.ts';
import { SLUG_UNITS, UNITS } from './manifest.ts';
import { resolveText } from './resolve.ts';
import type { Layers } from './resolve.ts';
import type { PatternText } from './types.ts';

/**
 * Browser-side access to the text of a pattern page (content, hero copy, examples). Only the light slug -> source
 * index (manifest.ts, generated) is bundled eagerly; the source modules (packs, detail batches, ...) are separate
 * chunks fetched the first time a pattern that they mention is opened, and shared by every other pattern in them.
 * Node scripts use the eager ../patternsFull.ts instead; `npm run check` proves both give the same text.
 */

/** True when any source has text for this slug (a card without it has no page yet). Synchronous, loads nothing. */
export const hasPatternText = (slug: string): boolean => Object.prototype.hasOwnProperty.call(SLUG_UNITS, slug);

type Mod = Record<string, any>;
const cache = new Map<string, Promise<PatternText>>();
const done = new Map<string, PatternText>();
const NONE: PatternText = { examples: [] };

/** The text when it is already in memory (loaded before, or nothing to load), so a revisit renders without a loading frame. */
export function peekPatternText(slug: string): PatternText | undefined {
  return hasPatternText(slug) ? done.get(slug) : NONE;
}

export function loadPatternText(slug: string): Promise<PatternText> {
  const hit = cache.get(slug);
  if (hit) return hit;
  if (!hasPatternText(slug)) return Promise.resolve(NONE);
  const ids = SLUG_UNITS[slug];
  const p = Promise.all(ids.map((i) => UNITS[i][0]())).then((mods) => {
    const L: Layers = { packs: [] };
    ids.forEach((id, k) => {
      const [, kind, name] = UNITS[id];
      const m = mods[k] as Mod;
      switch (kind) {
        case 'base': L.base = m[name][slug]; break;
        case 'templates': L.template = m[name][slug]; break;
        case 'extra': L.extra = m[name][slug]; break;
        case 'baseMeta': L.baseMeta = m[name][slug]; break;
        case 'pack': L.packs.push(m[name] as PatternPack); break;
        case 'detail': L.detail = m[name][slug]; break;
      }
    });
    const text = resolveText(slug, L);
    done.set(slug, text);
    return text;
  });
  // a failed fetch (offline, stale deploy) must be retryable
  p.catch(() => cache.delete(slug));
  cache.set(slug, p);
  return p;
}
