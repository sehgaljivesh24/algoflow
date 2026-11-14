/**
 * EAGER, complete pattern data for Node (scripts, the Vite SEO plugin, the SSR smoke test).
 *
 * Importing this module pulls in every pack, every detail batch and all pattern text (~700 kB of source), so the
 * browser entry must NEVER import it (scripts/check.mts enforces that). The browser reads the same data through
 *   ./patternCards.ts         light index: cards, groups, which patterns have a page   (generated, always loaded)
 *   ./patternText/load.ts     content / hero copy / examples of ONE pattern            (lazy chunks)
 * and `npm run check` proves both paths return exactly what this file builds.
 *
 * This file is the reference implementation of the merge order:
 *   content  = last pack that has it  >  patternContent.ts (EXTRA)  >  patterns.ts (BASE, + patternTemplates.ts), then
 *              DETAIL[slug].content replaces single fields
 *   meta     = last pack that has it  >  patternMeta.ts (BASE), then DETAIL[slug].meta replaces single fields
 *   examples = DETAIL[slug].examples  >  all packs' examples[slug] concatenated  >  the flagship animation alone
 *   cards    = patterns.ts BASE_GROUPS + every pack's `groups` appended to their family; DETAIL[slug].tags replace the tags
 */
import { BASE_CONTENT, BASE_GROUPS } from './patterns.ts';
import type { PatternCard, PatternContent } from './patterns.ts';
import type { PatternExample } from './packs/types.ts';
import { BASE_META } from './patternMeta.ts';
import type { PatternMeta } from './patternMeta.ts';
import { EXTRA_CONTENT } from './patternContent.ts';
import { TEMPLATES } from './patternTemplates.ts';
import { PACKS } from './packs/index.ts';
import { DETAIL } from './detail/index.ts';

export type { PatternCard, PatternContent, PatternExample, PatternMeta };

/** New pattern cards from the packs are appended to their family; unknown families are added at the end. */
function mergeGroups(base: { name: string; cards: PatternCard[] }[]): { name: string; cards: PatternCard[] }[] {
  const out = base.map((g) => ({ name: g.name, cards: [...g.cards] }));
  for (const pack of PACKS) {
    for (const g of pack.groups ?? []) {
      let fam = out.find((x) => x.name === g.name);
      if (!fam) {
        fam = { name: g.name, cards: [] };
        out.push(fam);
      }
      fam.cards.push(...g.cards.map((c) => ({ ...c, group: g.name })));
    }
  }
  return out;
}

/** Hero tag overrides from `src/data/detail/*` are applied last. */
export const PATTERN_GROUPS: { name: string; cards: PatternCard[] }[] = mergeGroups(BASE_GROUPS).map((g) => ({
  name: g.name,
  cards: g.cards.map((c) => (DETAIL[c.slug]?.tags ? { ...c, tags: DETAIL[c.slug].tags! } : c)),
}));

export const ALL_PATTERNS: PatternCard[] = PATTERN_GROUPS.flatMap((g) => g.cards);

/** First 13 pages (with their templates) plus everything in patternContent.ts. */
const BASE_WITH_TEMPLATES: Record<string, PatternContent> = Object.fromEntries(
  Object.entries(BASE_CONTENT).map(([slug, c]) => [slug, { ...c, template: c.template ?? TEMPLATES[slug] }]),
);
const MERGED_CONTENT: Record<string, PatternContent> = {
  ...BASE_WITH_TEMPLATES,
  ...EXTRA_CONTENT,
  ...Object.assign({}, ...PACKS.map((p) => p.content ?? {})),
};
/** Per-pattern overrides from `src/data/detail/*` replace individual fields last. */
export const CONTENT: Record<string, PatternContent> = Object.fromEntries(
  Object.entries(MERGED_CONTENT).map(([slug, c]) => [slug, DETAIL[slug]?.content ? { ...c, ...DETAIL[slug].content } : c]),
);

/** Copy for the original 44 patterns plus whatever the packs add for new patterns. */
const MERGED_META: Record<string, PatternMeta> = {
  ...BASE_META,
  ...Object.assign({}, ...PACKS.map((p) => p.meta ?? {})),
};
/** Per-pattern overrides from `src/data/detail/*` replace individual fields last. */
export const PATTERN_META: Record<string, PatternMeta> = Object.fromEntries(
  Object.entries(MERGED_META).map(([slug, m]) => [slug, DETAIL[slug]?.meta ? { ...m, ...DETAIL[slug].meta } : m]),
);

/**
 * The worked examples of a pattern: at least 3 different animated problems, each with a note on what it adds.
 * Patterns whose pack has not supplied examples yet fall back to their single flagship animation.
 */
export function examplesFor(slug: string): PatternExample[] {
  if (DETAIL[slug]?.examples?.length) return DETAIL[slug].examples!;
  const fromPacks = PACKS.flatMap((p) => p.examples?.[slug] ?? []);
  if (fromPacks.length) return fromPacks;
  const c = CONTENT[slug];
  return c ? [{ slug: c.animation, why: '' }] : [];
}

/** Everything the page of one pattern shows beyond its card; what the browser loads lazily as `PatternText`. */
export function textFor(slug: string): { content?: PatternContent; meta?: PatternMeta; examples: PatternExample[] } {
  return { content: CONTENT[slug], meta: PATTERN_META[slug], examples: examplesFor(slug) };
}
