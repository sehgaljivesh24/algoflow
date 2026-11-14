/**
 * Per-route SEO metadata. PURE: no React, no DOM, no Vite-only APIs, so the browser hook (useRouteMeta.ts),
 * the build plugin (scripts/vite-seo-plugin.mts) and scripts/check-seo.mts all share it.
 *
 * Limits enforced by scripts/check-seo.mts: title <= 60 chars, description <= 160 chars, both unique per route.
 * Canonical values are site-relative paths; the caller prefixes the absolute site URL (src/config.ts SITE_URL).
 */
import { BRAND, TAGLINE } from '../config.ts';
import { ALL_ENTRIES } from '../data/catalog.ts';
import type { CatalogEntry } from '../data/catalog.ts';
import { ALL_PATTERNS } from '../data/patternCards.ts';
import type { PatternCard } from '../data/patternCards.ts';
import PATTERNS_GUIDE from '../content/cheatsheets/patterns-guide/meta.json' with { type: 'json' };
import THE_ONLY from '../content/cheatsheets/the-only/meta.json' with { type: 'json' };

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 160;
/** Share image (1200x630) in /public, referenced by every page. */
export const OG_IMAGE_PATH = '/og-default.png';

/**
 * Copy of title / description in src/content/cheatsheets/pattern-index/meta.json. It is not imported because
 * scripts/check-cs-pattern-index.mts forbids static imports of that collection's content (keeps it out of the main chunk);
 * scripts/check-seo.mts verifies that this copy still equals the manifest.
 */
export const PATTERN_INDEX_COPY = {
  title: 'DSA Pattern Index',
  description:
    'DSA pattern recognition cheat-sheet: 24 topics of clue-to-technique tables and worked C++ examples, from sorting and arrays to segment trees and tree rerooting.',
};

export interface RouteMeta {
  title: string;
  description: string;
  /** Site-relative canonical path, no query string (e.g. "/patterns/kadane"). */
  canonical: string;
  ogType: 'website' | 'article';
  /** Site-relative path of the share image. */
  image: string;
  /** True for pages that must not be indexed (unknown routes). */
  noindex?: boolean;
}

export interface MetaOptions {
  /**
   * Returns the animation's own statement for a problem slug. Node callers pass the registry (src/problems/registry.ts);
   * the browser hook passes the lazily loaded problem. Without it, problem descriptions fall back to catalog facts.
   */
  statementOf?: (slug: string) => string | undefined;
  /**
   * Returns the hero description (PATTERN_META[slug].desc) of a pattern slug. That text is part of the lazily loaded
   * pattern text, so this module does not import it: Node callers pass it from src/data/patternsFull.ts, the browser hook
   * passes the text it has loaded. Without it, pattern descriptions fall back to the card (tags and complexity); the
   * title never depends on it.
   */
  heroOf?: (slug: string) => string | undefined;
}

/* ------------------------------------------------------------------ */
/* text helpers                                                        */
/* ------------------------------------------------------------------ */

const SUFFIX = ` | ${BRAND}`;

const squash = (s: string) => s.replace(/`/g, '').replace(/\s+/g, ' ').trim();

/** Cut at a word boundary and add an ellipsis so that the result has at most `max` characters. */
export function clip(text: string, max: number): string {
  const s = squash(text);
  if (s.length <= max) return s;
  const cut = s.slice(0, Math.max(1, max - 1));
  const sp = cut.lastIndexOf(' ');
  const base = sp > max * 0.5 ? cut.slice(0, sp) : cut;
  return `${base.replace(/[\s,;:.\-–—(/]+$/, '')}…`;
}

/** First candidate that fits `max`; otherwise the last one's core text clipped (core + SUFFIX). */
function pickTitle(candidates: string[], core: string): string {
  for (const c of candidates) if (c.length <= TITLE_MAX) return c;
  return clip(core, TITLE_MAX - SUFFIX.length) + SUFFIX;
}

/** Text shortened to `room` characters; ends on a full sentence when that keeps at least ~60% of the room, else clipped with an ellipsis. */
function shorten(text: string, room: number): string {
  const m = squash(text);
  if (m.length <= room) return m;
  const upto = m.slice(0, room);
  const stop = Math.max(upto.lastIndexOf('. '), upto.endsWith('.') ? upto.length - 1 : -1);
  if (stop >= room * 0.6) return m.slice(0, stop + 1);
  return clip(m, room);
}

/** `main` plus an optional tail that is kept whole; `main` is shortened to make room. */
function fitDescription(main: string, tail = ''): string {
  const t = tail ? ` ${squash(tail)}` : '';
  return shorten(main, DESCRIPTION_MAX - t.length) + t;
}

/* ------------------------------------------------------------------ */
/* data indexes (built once, lazily)                                   */
/* ------------------------------------------------------------------ */

const ENTRY_BY_SLUG = new Map<string, CatalogEntry>(ALL_ENTRIES.map((e) => [e.slug, e]));
const PATTERN_BY_SLUG = new Map<string, PatternCard>(ALL_PATTERNS.map((p) => [p.slug, p]));

interface Guide { slug: string; title: string; description: string; words: number; category: string }
const GUIDES: Guide[] = THE_ONLY.categories.flatMap((c) =>
  c.guides.map((g) => ({ slug: g.slug, title: g.title, description: g.description ?? '', words: g.words ?? 0, category: c.title })),
);
const GUIDE_BY_SLUG = new Map(GUIDES.map((g) => [g.slug, g]));

const STATIC: Record<string, RouteMeta> = {
  '/': {
    title: `${BRAND}: Coding Interview Problems, Animated Step by Step`,
    description: fitDescription(
      `${ALL_ENTRIES.length} coding-interview problems and ${ALL_PATTERNS.length} DSA patterns, animated step by step with synced Java and Python code, custom input and progress tracking.`,
    ),
    canonical: '/', ogType: 'website', image: OG_IMAGE_PATH,
  },
  '/patterns': {
    title: `DSA Patterns Roadmap: ${ALL_PATTERNS.length} Patterns with Animations${SUFFIX}`,
    description: fitDescription(
      `A roadmap of ${ALL_PATTERNS.length} DSA patterns, from sliding window and two pointers to DP, graphs and segment trees. Each has an animation, when to use it and a Java template.`,
    ),
    canonical: '/patterns', ogType: 'website', image: OG_IMAGE_PATH,
  },
  '/cheatsheet': {
    title: `Java Code Tricks for Coding Interviews${SUFFIX}`,
    description: fitDescription(
      'A quick Java reference for coding interviews: the library calls, idioms and small routines you reach for every day, as short snippets with the pitfalls to avoid.',
    ),
    canonical: '/cheatsheet', ogType: 'website', image: OG_IMAGE_PATH,
  },
  '/cheatsheets': {
    title: `Cheatsheets for DSA and Developer Interviews${SUFFIX}`,
    description: fitDescription(
      `Curated study references in one place: DSA pattern-recognition tables, ${PATTERNS_GUIDE.counts.patterns} algorithm patterns with examples, and ${GUIDES.length} guides on web development, SQL, system design and Git.`,
    ),
    canonical: '/cheatsheets', ogType: 'website', image: OG_IMAGE_PATH,
  },
  '/cheatsheets/credits': {
    title: `Cheatsheet Credits and Licenses${SUFFIX}`,
    description: fitDescription(
      'Authors, source links and open-source licenses for every cheatsheet collection imported into AlgoFlow, with the copyright notices each license requires.',
    ),
    canonical: '/cheatsheets/credits', ogType: 'website', image: OG_IMAGE_PATH,
  },
  '/cheatsheets/pattern-index': {
    title: `${PATTERN_INDEX_COPY.title} Cheatsheet${SUFFIX}`,
    description: fitDescription(PATTERN_INDEX_COPY.description),
    canonical: '/cheatsheets/pattern-index', ogType: 'article', image: OG_IMAGE_PATH,
  },
  '/cheatsheets/patterns-guide': {
    title: `${PATTERNS_GUIDE.title}${SUFFIX}`,
    description: fitDescription(PATTERNS_GUIDE.description),
    canonical: '/cheatsheets/patterns-guide', ogType: 'article', image: OG_IMAGE_PATH,
  },
  '/cheatsheets/the-only': {
    title: `${THE_ONLY.title}: ${GUIDES.length} Dev and DSA Guides${SUFFIX}`,
    description: fitDescription(THE_ONLY.description),
    canonical: '/cheatsheets/the-only', ogType: 'article', image: OG_IMAGE_PATH,
  },
  '/quiz': {
    title: `Pattern Quiz: Name the Algorithm Pattern${SUFFIX}`,
    description: fitDescription(
      'Ten random interview scenarios per round. Name the pattern that solves each one, use free hints, and review which patterns to revisit. Scores are saved in your browser.',
    ),
    canonical: '/quiz', ogType: 'website', image: OG_IMAGE_PATH,
  },
  '/edge-cases': {
    title: `Java Edge Cases That Fail Interviews${SUFFIX}`,
    description: fitDescription(
      'The bugs that quietly fail interviews. Each card shows code that looks right, the input that breaks it, and the fix: overflow, empty input, off-by-one errors and more.',
    ),
    canonical: '/edge-cases', ogType: 'website', image: OG_IMAGE_PATH,
  },
};

/* ------------------------------------------------------------------ */
/* routes                                                              */
/* ------------------------------------------------------------------ */

/** Every indexable path of the app (static pages, cheatsheet guides, patterns, problems), in a stable order. */
export function allRoutes(): string[] {
  return [
    ...Object.keys(STATIC),
    ...GUIDES.map((g) => `/cheatsheets/the-only/${g.slug}`),
    ...ALL_PATTERNS.map((p) => `/patterns/${p.slug}`),
    ...ALL_ENTRIES.map((e) => `/problem/${e.slug}`),
  ];
}

/** Where a problem comes from: "LeetCode 643" for numeric ids, otherwise the label's source site. */
function sourceOf(e: CatalogEntry): { long: string; short: string } {
  if (/^\d+$/.test(e.id)) return { long: `LeetCode ${e.id}`, short: `LeetCode ${e.id}` };
  switch (e.id.toUpperCase()) {
    case 'GFG': return { long: 'GeeksforGeeks', short: 'GeeksforGeeks' };
    case 'IB': return { long: 'InterviewBit', short: 'InterviewBit' };
    case 'CP': return { long: 'Competitive programming', short: 'CP' };
    case 'ALG': return { long: 'Classic algorithm', short: 'Algorithm' };
    default: return { long: e.id, short: e.id };
  }
}

function patternMeta(p: PatternCard, heroText: string | undefined): RouteMeta {
  const hero = heroText ?? `${p.title}: ${p.tags.join(', ')}.`;
  const T = p.title;
  const title = pickTitle(
    [
      `${T}: Animation & Java Template${SUFFIX}`,
      `${T}: Animated Pattern Guide${SUFFIX}`,
      `${T} Pattern${SUFFIX}`,
      `${T}${SUFFIX}`,
    ],
    T,
  );
  return {
    title,
    description: fitDescription(hero, `Time / space: ${p.complexity}.`),
    canonical: `/patterns/${p.slug}`,
    ogType: 'article',
    image: OG_IMAGE_PATH,
  };
}

function problemMeta(e: CatalogEntry, statement: string | undefined): RouteMeta {
  const T = e.title;
  const src = sourceOf(e);
  const isLc = /^\d+$/.test(e.id);
  const title = pickTitle(
    [
      ...(isLc ? [`${T} (${src.short}) Animation${SUFFIX}`] : []),
      `${T}: Step-by-Step Animation${SUFFIX}`,
      `${T} Animation${SUFFIX}`,
      `${T}${SUFFIX}`,
    ],
    T,
  );
  const lead = `${e.difficulty} · ${src.long}.`;
  const body = statement
    ? statement
    : `${e.category} problem${e.tag ? ` (${e.tag})` : ''}: watch the solution run step by step with synced Java and Python code.`;
  return {
    title,
    description: `${lead} ${shorten(body, DESCRIPTION_MAX - lead.length - 1)}`,
    canonical: `/problem/${e.slug}`,
    ogType: 'article',
    image: OG_IMAGE_PATH,
  };
}

function guideMeta(g: Guide): RouteMeta {
  const T = g.title;
  const title = pickTitle([`${T} Guide and Cheatsheet${SUFFIX}`, `${T} Cheatsheet${SUFFIX}`, `${T}${SUFFIX}`], T);
  const about = squash(g.description).replace(/\s*;\s*/g, ', ').replace(/[.\s]+$/, '');
  const main = about ? `${T}: ${about}.` : `${T}: a study guide.`;
  const words = g.words >= 100 ? `about ${Math.round(g.words / 100) * 100} words` : '';
  const tail = `${g.category} guide from The Only Cheatsheets${words ? `, ${words}` : ''}.`;
  return {
    title,
    description: fitDescription(main, tail),
    canonical: `/cheatsheets/the-only/${g.slug}`,
    ogType: 'article',
    image: OG_IMAGE_PATH,
  };
}

function notFound(canonical: string): RouteMeta {
  return {
    title: `Page not found${SUFFIX}`,
    description: fitDescription(`This page does not exist. ${TAGLINE} Browse the problem library and the DSA patterns roadmap.`),
    canonical,
    ogType: 'website',
    image: OG_IMAGE_PATH,
    noindex: true,
  };
}

/** Metadata for a pathname. `_search` is accepted for call-site symmetry; queries (?step=3) never change the metadata or the canonical. */
export function metaFor(pathname: string, _search?: string, opts: MetaOptions = {}): RouteMeta {
  let path = pathname.split(/[?#]/)[0] || '/';
  path = path.replace(/\/{2,}/g, '/');
  if (path.length > 1) path = path.replace(/\/+$/, '');

  const fixed = STATIC[path];
  if (fixed) return fixed;

  let slug: string | undefined;
  const dec = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

  if ((slug = /^\/patterns\/([^/]+)$/.exec(path)?.[1])) {
    const p = PATTERN_BY_SLUG.get(dec(slug));
    if (p) return patternMeta(p, opts.heroOf?.(p.slug));
  } else if ((slug = /^\/problem\/([^/]+)$/.exec(path)?.[1])) {
    const e = ENTRY_BY_SLUG.get(dec(slug));
    if (e) return problemMeta(e, opts.statementOf?.(e.slug));
  } else if ((slug = /^\/cheatsheets\/the-only\/([^/]+)$/.exec(path)?.[1])) {
    const g = GUIDE_BY_SLUG.get(dec(slug));
    if (g) return guideMeta(g);
  }
  return notFound(path);
}
