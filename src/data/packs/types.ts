import type { PatternCard, PatternContent } from '../patterns.ts';
import type { PatternMeta } from '../patternMeta.ts';

/** One worked example shown on a pattern page (an animated problem plus why it is in the set). */
export interface PatternExample {
  /** Catalog slug of an ANIMATED problem (`<id>-<slugified title>`). */
  slug: string;
  /** One or two sentences, in your own words: what this example shows about the pattern that the others don't. */
  why: string;
}

/** A brand-new problem (beyond the original 188) that one of the new animations teaches. It becomes a catalog entry. */
export interface PackProblem {
  /** LeetCode number as a string, or a short label for non-LeetCode problems: 'GFG', 'IB', 'CP' (classic / competitive), 'ALG' (algorithm demo). */
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  /** Technique line shown under the title, e.g. "cyclic sort". */
  tag: string;
  /** An existing category name ("Arrays", "Tree", …) or a new one ("Advanced Data Structures", …). */
  category: string;
  /** Optional sub-group heading inside the category. */
  group?: string;
}

/**
 * Everything one agent adds. Every agent owns exactly one pack file (src/data/packs/pN.ts) and one problem group file
 * (src/problems/groups/packN.ts); the shared lists (catalog, patterns, pattern content, pattern meta, registry) merge them.
 */
export interface PatternPack {
  id: string;
  /** NEW pattern cards. `name` may be an existing family (cards are appended to it) or a new family. */
  groups?: { name: string; cards: PatternCard[] }[];
  /** Full page content for NEW patterns (`animation` must equal the first example's slug). */
  content?: Record<string, PatternContent>;
  /** Hero/pill/tip copy for NEW patterns. */
  meta?: Record<string, PatternMeta>;
  /**
   * The worked examples of a pattern — for EXISTING and NEW patterns alike. At least 3, all different problems;
   * the first one must be the pattern's `animation` (the existing flagship for existing patterns).
   */
  examples?: Record<string, PatternExample[]>;
  /** New problems introduced by this pack's new animations. */
  problems?: PackProblem[];
}
