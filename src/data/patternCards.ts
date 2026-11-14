/**
 * The LIGHT pattern index the browser always loads: cards (slug, title, tags, complexity, family), the family order,
 * and which patterns have a written page. Decoded from the generated ./patternText/light.ts, so it never drags the
 * pattern text (content, meta, examples, practice lists) into the entry chunk. Same values as ./patternsFull.ts
 * (the eager Node version); `npm run check` fails when they differ -> run `node scripts/gen-pattern-text.mts`.
 *
 * Text of one pattern:  ./patternText/load.ts  (usePatternText in pages).  Everything at once, Node only:  ./patternsFull.ts
 */
import type { PatternCard } from './patterns.ts';
import { CARD_GROUPS, PAGE_SLUG_LIST } from './patternText/light.ts';

export type { PatternCard };

export const PATTERN_GROUPS: { name: string; cards: PatternCard[] }[] = CARD_GROUPS.map(([name, cards]) => ({
  name,
  cards: cards.map(([slug, title, tags, complexity]) => ({ slug, group: name, title, tags, complexity })),
}));

export const ALL_PATTERNS: PatternCard[] = PATTERN_GROUPS.flatMap((g) => g.cards);

/** Slugs whose page content is written (the keys of CONTENT in patternsFull.ts). */
export const PAGE_SLUGS: ReadonlySet<string> = new Set(PAGE_SLUG_LIST);
