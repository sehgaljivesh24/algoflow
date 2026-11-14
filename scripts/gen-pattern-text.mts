/**
 * Regenerates the three files that let the browser load pattern data lazily (like gen-manifest.mts does for problems):
 *   src/data/patternText/light.ts     pattern cards, pack problems, which patterns have a page, problem accents (always loaded)
 *   src/data/patternText/digest.ts    per-pattern summary for the "Common patterns" roadmap (loaded with that page only)
 *   src/data/patternText/manifest.ts  slug -> the source modules (base, extra, packs, detail batches...) that hold its text
 *
 *   node scripts/gen-pattern-text.mts            write the files
 *   node scripts/gen-pattern-text.mts --check    exit 1 when a file is out of date (scripts/check.mts runs the same test)
 *
 * Run it after adding a pattern card, a pack, a detail batch, a pack problem, or after a text change that moves a
 * pattern's text to another source file or changes what the roadmap shows (summary, first sentence of the hero line,
 * practice list start, icon). Plain wording edits inside an existing source file need no regeneration, except the
 * summary / hero line / practice list start / icon, which the digest copies.
 *
 * The data is read through src/data/patternsFull.ts (the eager reference). The source modules are located by object
 * identity, so a slug that two batches define is attributed to the one that wins.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ALL_PATTERNS, CONTENT, PATTERN_GROUPS, PATTERN_META, examplesFor } from '../src/data/patternsFull.ts';
import { BASE_CONTENT } from '../src/data/patterns.ts';
import { BASE_META } from '../src/data/patternMeta.ts';
import { EXTRA_CONTENT } from '../src/data/patternContent.ts';
import { TEMPLATES } from '../src/data/patternTemplates.ts';
import { PACKS } from '../src/data/packs/index.ts';
import { DETAIL } from '../src/data/detail/index.ts';
import { buildCatalog } from '../src/data/catalog.ts';
import { computeFeatured } from '../src/data/featuredAccent.ts';
import { resolveText } from '../src/data/patternText/resolve.ts';
import type { Layers } from '../src/data/patternText/resolve.ts';
import type { PatternDetail } from '../src/data/detail/types.ts';

const dataDir = fileURLToPath(new URL('../src/data/', import.meta.url));
const textDir = `${dataDir}patternText/`;

/** A source module of pattern text: `has` says whether it mentions a slug, `apply` puts its piece of that slug into the layers. */
interface Unit {
  file: string;
  kind: string;
  name: string;
  has: (slug: string) => boolean;
  apply: (L: Layers, slug: string) => void;
}

/* ------------------------------------------------------------------ units */

const dir = (v: unknown) => Object.keys((v ?? {}) as object);
const units: Unit[] = [
  { file: '../patterns.ts', kind: 'base', name: 'BASE_CONTENT', has: (s) => s in BASE_CONTENT, apply: (L, s) => { L.base = BASE_CONTENT[s]; } },
  { file: '../patternTemplates.ts', kind: 'templates', name: 'TEMPLATES', has: (s) => s in BASE_CONTENT && s in TEMPLATES, apply: (L, s) => { L.template = TEMPLATES[s]; } },
  { file: '../patternContent.ts', kind: 'extra', name: 'EXTRA_CONTENT', has: (s) => s in EXTRA_CONTENT, apply: (L, s) => { L.extra = EXTRA_CONTENT[s]; } },
  { file: '../patternMeta.ts', kind: 'baseMeta', name: 'BASE_META', has: (s) => s in BASE_META, apply: (L, s) => { L.baseMeta = BASE_META[s]; } },
];

// one unit per pack file src/data/packs/p<N>.ts (PACKS order) and per detail batch src/data/detail/d<N>.ts
for (let i = 0; i < PACKS.length; i++) {
  const file = `../packs/p${i + 1}.ts`;
  const mod = (await import(pathToFileURL(`${dataDir}packs/p${i + 1}.ts`).href)) as { pack?: unknown };
  if (mod.pack !== PACKS[i]) throw new Error(`src/data/packs/index.ts: PACKS[${i}] is not the \`pack\` export of ${file.slice(3)} (the generator maps packs to files by position)`);
  const pk = PACKS[i];
  const slugs = new Set([...dir(pk.content), ...dir(pk.meta), ...dir(pk.examples)]);
  units.push({ file, kind: 'pack', name: 'pack', has: (s) => slugs.has(s), apply: (L) => { L.packs.push(pk); } });
}
for (let n = 1; n <= 7; n++) {
  const mod = (await import(pathToFileURL(`${dataDir}detail/d${n}.ts`).href)) as Record<string, Record<string, unknown>>;
  const map = mod[`d${n}`] as Record<string, PatternDetail | undefined>;
  if (!map) throw new Error(`src/data/detail/d${n}.ts must export \`d${n}\``);
  // a slug counts when this batch is the one that wins in DETAIL and the entry changes content, meta or examples (tags live in light.ts)
  units.push({
    file: `../detail/d${n}.ts`, kind: 'detail', name: `d${n}`,
    has: (s) => !!map[s] && DETAIL[s] === map[s] && !!(DETAIL[s].content || DETAIL[s].meta || DETAIL[s].examples),
    apply: (L, s) => { L.detail = map[s]; },
  });
}

/**
 * The units the browser must fetch for a slug: every unit that mentions it, minus those whose removal does not change
 * the resolved text (e.g. the BASE / EXTRA layers of a page that a detail batch overrides field by field). Greedy, in
 * unit order; the result is re-verified against the eager data by scripts/check.mts on every run.
 */
function neededUnits(slug: string): number[] {
  const textOf = (ids: number[]) => {
    const L: Layers = { packs: [] };
    for (const i of ids) units[i].apply(L, slug);
    return JSON.stringify(resolveText(slug, L));
  };
  let ids = units.map((u, i) => (u.has(slug) ? i : -1)).filter((i) => i >= 0);
  if (!ids.length) return ids;
  const want = textOf(ids);
  for (const i of [...ids]) {
    const rest = ids.filter((x) => x !== i);
    if (textOf(rest) === want) ids = rest;
  }
  return ids;
}

/* ------------------------------------------------------------------ light.ts */

const cardLine = (c: { slug: string; title: string; tags: string[]; complexity: string }) =>
  `    [${JSON.stringify(c.slug)}, ${JSON.stringify(c.title)}, ${JSON.stringify(c.tags)}, ${JSON.stringify(c.complexity)}],`;

export function packProblems() {
  return PACKS.flatMap((p) => p.problems ?? []);
}

function lightText(): string {
  const featured = computeFeatured(ALL_PATTERNS, (s) => CONTENT[s], examplesFor);
  const byAccent = new Map<string, string[]>();
  for (const [slug, accent] of featured) (byAccent.get(accent) ?? byAccent.set(accent, []).get(accent)!).push(slug);
  return `// GENERATED by scripts/gen-pattern-text.mts — do not edit. Regenerate with: node scripts/gen-pattern-text.mts
// The light pattern index the browser always loads (decoded by ../patternCards.ts, ../catalog.ts and ../problemAccent.ts).
// Derived from src/data/patterns.ts, packs/*, detail/* and patternContent.ts; scripts/check.mts fails when it is stale.
import type { PackProblem } from '../packs/types.ts';

/** Families in display order with their cards: [slug, title, tags, complexity]. Detail-batch tag overrides are applied. */
export const CARD_GROUPS: [name: string, cards: [slug: string, title: string, tags: string[], complexity: string][]][] = [
${PATTERN_GROUPS.map((g) => `  [${JSON.stringify(g.name)}, [\n${g.cards.map(cardLine).join('\n')}\n  ]],`).join('\n')}
];

/** New catalog problems contributed by the packs (PACKS order); merged into the catalog by ../catalog.ts. */
export const PACK_PROBLEMS: PackProblem[] = [
${packProblems().map((p) => `  ${JSON.stringify(p)},`).join('\n')}
];

/** Slugs with a written page (the keys of CONTENT in ../patternsFull.ts). */
export const PAGE_SLUG_LIST: string[] = ${JSON.stringify(Object.keys(CONTENT).sort())};

/** Accent colour name -> space separated problem slugs featured by a pattern of that colour (see ../featuredAccent.ts). */
export const FEATURED: Record<string, string> = {
${[...byAccent].sort(([a], [b]) => (a < b ? -1 : 1)).map(([accent, slugs]) => `  ${JSON.stringify(accent)}: ${JSON.stringify(slugs.sort().join(' '))},`).join('\n')}
};
`;
}

/* ------------------------------------------------------------------ digest.ts */

const firstSentence = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();

function digestText(): string {
  const catalogSlugs = new Set(buildCatalog(packProblems()).flatMap((c) => c.entries.map((e) => e.slug)));
  const lines: string[] = [];
  for (const p of ALL_PATTERNS) {
    const content = CONTENT[p.slug];
    const meta = PATTERN_META[p.slug];
    if (!content && !meta) continue;
    const summary = content?.summary ?? '';
    // same selection as the pills of src/pages/PatternsIndex.tsx: catalog problems and outside problems, first four
    const practice: (string | object)[] = [];
    for (const item of content?.practice ?? []) {
      if (practice.length >= 4) break;
      const slug = typeof item === 'string' ? item : 'slug' in item ? item.slug : undefined;
      if (slug) {
        if (catalogSlugs.has(slug)) practice.push(slug);
      } else if (typeof item !== 'string' && 'id' in item) practice.push(item);
    }
    const d = {
      icon: meta?.icon,
      lead: meta?.desc ? firstSentence(meta.desc) : firstSentence(summary),
      summary,
      animation: content?.animation ?? '',
      practice,
      examples: examplesFor(p.slug).map((e) => e.slug),
    };
    lines.push(`  ${JSON.stringify(p.slug)}: ${JSON.stringify(d)},`);
  }
  return `// GENERATED by scripts/gen-pattern-text.mts — do not edit. Regenerate with: node scripts/gen-pattern-text.mts
// What the "Common patterns" roadmap (src/pages/PatternsIndex.tsx) shows per pattern; only that page imports it.
import type { PatternDigest } from './types.ts';

export const DIGEST: Record<string, PatternDigest> = {
${lines.join('\n')}
};
`;
}

/* ------------------------------------------------------------------ manifest.ts */

function manifestText(): string {
  const slugs = new Set<string>([...Object.keys(CONTENT), ...Object.keys(PATTERN_META), ...ALL_PATTERNS.map((p) => p.slug)]);
  const rows: string[] = [];
  for (const slug of [...slugs].sort()) {
    const ids = neededUnits(slug);
    // a slug with units must keep the key even when pruning left none (e.g. a card whose only text is a detail `tags` entry)
    if (ids.length) rows.push(`  ${JSON.stringify(slug)}: ${JSON.stringify(ids)},`);
  }
  return `// GENERATED by scripts/gen-pattern-text.mts — do not edit. Regenerate with: node scripts/gen-pattern-text.mts
// Light slug -> source-module index: the browser fetches the text of a pattern from the modules listed here, only when
// its page is opened (see ./load.ts). Node scripts keep using the eager ../patternsFull.ts.

/** One dynamic import per source module, with the kind of layer it provides and the export that holds it. */
export const UNITS: [load: () => Promise<Record<string, unknown>>, kind: string, name: string][] = [
${units.map((u) => `  [() => import(${JSON.stringify(u.file)}), ${JSON.stringify(u.kind)}, ${JSON.stringify(u.name)}],`).join('\n')}
];

/** slug -> indexes into UNITS (ascending: base layers first, then packs in PACKS order, then detail batches). */
export const SLUG_UNITS: Record<string, number[]> = {
${rows.join('\n')}
};
`;
}

/* ------------------------------------------------------------------ main */

/** The generated files by absolute path (also used by scripts/check.mts to prove they are current). */
export function generate(): Record<string, string> {
  return {
    [`${textDir}light.ts`]: lightText(),
    [`${textDir}digest.ts`]: digestText(),
    [`${textDir}manifest.ts`]: manifestText(),
  };
}

/** Paths of generated files that differ from what the data produces now. */
export function staleFiles(): string[] {
  const out: string[] = [];
  for (const [path, text] of Object.entries(generate())) {
    const cur = existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : '';
    if (cur !== text) out.push(path.slice(dataDir.length - 'src/data/'.length));
  }
  return out;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv.includes('--check')) {
    const stale = staleFiles();
    if (stale.length) {
      console.error(`out of date: ${stale.join(', ')} — run: node scripts/gen-pattern-text.mts`);
      process.exit(1);
    }
    console.log(`pattern text index up to date (${ALL_PATTERNS.length} patterns, ${units.length} source modules)`);
  } else {
    for (const [path, text] of Object.entries(generate())) {
      writeFileSync(path, text);
      console.log(`wrote ${path.slice(dataDir.length - 'src/data/'.length)} (${(text.length / 1024).toFixed(1)} kB)`);
    }
  }
}
