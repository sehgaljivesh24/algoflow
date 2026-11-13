import type { PatternContent } from '../patterns.ts';
import type { PatternMeta } from '../patternMeta.ts';
import type { PatternExample } from '../packs/types.ts';

/**
 * Per-pattern overrides, applied last (after BASE_CONTENT, EXTRA_CONTENT and the packs). One file per batch (d1..d6) so
 * several agents can enrich patterns at the same time without editing the same file.
 * Every field is optional and REPLACES the value it overrides (arrays are replaced as a whole, not appended to).
 */
export interface PatternDetail {
  /** Overrides of the written page content: summary, whenToUse (5 bullets), tip, template, practice (6-8 items), animation. */
  content?: Partial<PatternContent>;
  /** Overrides of the hero copy: icon, label, desc, useNote, complexityNote (30-40 words), highlight. */
  meta?: Partial<PatternMeta>;
  /** Hero tag chips (3-4). */
  tags?: string[];
  /** The example tabs of the pattern page (replaces `examplesFor`). */
  examples?: PatternExample[];
}

export type DetailMap = Record<string, PatternDetail>;
