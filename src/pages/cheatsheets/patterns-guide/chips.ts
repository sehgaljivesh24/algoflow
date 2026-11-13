/**
 * "▶ viz" chips for the imported patterns guide (our addition, not part of the original page):
 * an example link such as "3. Longest Substring Without Repeating Characters" gets a chip when LeetCode #3 is an
 * ANIMATED problem in AlgoFlow (catalog entry whose slug is registered in PROBLEMS). Shared by the page and its check script.
 */
import { ALL_ENTRIES } from '../../../data/catalog.ts';
import { isAnimated } from '../../../problems/lazy.ts';

let cache: Map<string, string> | null = null;

/** LeetCode number (catalog id) -> slug, only for animated problems. */
export function animatedByNumber(): Map<string, string> {
  if (!cache) {
    cache = new Map();
    for (const e of ALL_ENTRIES) if (/^\d+$/.test(e.id) && isAnimated(e.slug) && !cache.has(e.id)) cache.set(e.id, e.slug);
  }
  return cache;
}

/** Slug of the animated problem a link text like "3. Longest Substring…" points to, or null. */
export function chipSlugFor(linkText: string): string | null {
  const m = /^\s*(\d+)\./.exec(linkText);
  return (m && animatedByNumber().get(m[1])) || null;
}
