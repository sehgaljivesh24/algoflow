import type { AnyProblem } from '../engine/types.ts';
import { MANIFEST, MODULES } from './manifest.ts';

/**
 * Browser-side access to problems. Only the light slug index (manifest.ts) is bundled eagerly;
 * a problem's animation code is fetched the first time it is needed. (Node scripts use ./registry.ts.)
 */

/** True when an animation exists for this catalog slug. Synchronous, no animation code loaded. */
export const isAnimated = (slug: string): boolean => Object.prototype.hasOwnProperty.call(MANIFEST, slug);

const cache = new Map<string, Promise<AnyProblem>>();

export function loadProblem(slug: string): Promise<AnyProblem> {
  const hit = cache.get(slug);
  if (hit) return hit;
  if (!isAnimated(slug)) return Promise.reject(new Error(`No animation for "${slug}"`));
  const [mod, name] = MANIFEST[slug];
  const p = MODULES[mod]().then((m) => {
    const v = m[name];
    const found = (Array.isArray(v) ? v.find((x: AnyProblem) => x.slug === slug) : v) as AnyProblem | undefined;
    if (!found) throw new Error(`Animation module for "${slug}" has no matching export`);
    return found;
  });
  // a failed fetch (offline, stale deploy) must be retryable
  p.catch(() => cache.delete(slug));
  cache.set(slug, p);
  return p;
}
