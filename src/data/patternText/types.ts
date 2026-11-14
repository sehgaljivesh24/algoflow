import type { PatternContent, PracticeItem } from '../patterns.ts';
import type { PatternExample } from '../packs/types.ts';
import type { PatternMeta } from '../patternMeta.ts';

/** Everything one pattern page shows besides its card (slug, title, tags, complexity): fetched on demand in the browser. */
export interface PatternText {
  /** Missing for a card whose page is not written yet ("Animation coming soon"). */
  content?: PatternContent;
  /** Hero / pill / tip copy; missing for patterns that rely on the derived defaults. */
  meta?: PatternMeta;
  /** The example tabs (see examplesFor in ../patternsFull.ts). */
  examples: PatternExample[];
}

/** What the "Common patterns" roadmap shows per card, precomputed (generated, ./digest.ts) so that page needs no pattern chunks. */
export interface PatternDigest {
  /** Hero emoji from the pattern's meta (the page falls back to its family icon). */
  icon?: string;
  /** First sentence of the hero description (or of the summary when there is none). */
  lead: string;
  summary: string;
  /** Flagship animation slug: the card is "live" when this problem is animated. */
  animation: string;
  /** First practice entries that resolve to a catalog problem or are outside problems (at most 4), as a pills list needs them. */
  practice: (string | PracticeItem)[];
  /** Slugs of the worked examples (the card shows how many of them are animated). */
  examples: string[];
}
