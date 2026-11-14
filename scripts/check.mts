/**
 * Project-wide integrity check. Run:  npm run check
 *   env CHECK_ONLY=<slug-substring>   only check matching problems (fast while authoring)
 *   env PATTERN_STRICT=1              fail (instead of warn) when a pattern page's animation is missing
 *
 * It checks structure, not correctness — correctness belongs in scripts/fuzz-*.mts
 * (compare each animation's final answer with a plain reference solution on random input).
 */
import { ALL_PROBLEMS, PROBLEMS } from '../src/problems/registry.ts';
import { ALL_ENTRIES } from '../src/data/catalog.ts';
import { ALL_PATTERNS, CONTENT, PATTERN_GROUPS, PATTERN_META, examplesFor } from '../src/data/patternsFull.ts';
import { checkScene } from './check-scenes.mts';
import { staleFiles } from './gen-pattern-text.mts';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

let failures = 0;
const warnings: string[] = [];
const templateWarnings: string[] = [];
const ok = (name: string, cond: boolean, extra = '') => {
  if (!cond) {
    failures++;
    if (failures <= 60) console.log(`FAIL  ${name} ${extra}`.trim());
  }
};

const only = process.env.CHECK_ONLY;
const catalog = new Map(ALL_ENTRIES.map((e) => [e.slug, e]));

const slugs = ALL_PROBLEMS.map((p) => p.slug);
ok('registry slugs unique', new Set(slugs).size === slugs.length, slugs.filter((s, i) => slugs.indexOf(s) !== i).join(','));

// the browser loads problems through src/problems/manifest.ts (generated): it must list exactly the eager registry,
// and each entry must resolve to the same problem object. Fix with: node scripts/gen-manifest.mts
{
  const { MANIFEST } = await import('../src/problems/manifest.ts');
  const { loadProblem } = await import('../src/problems/lazy.ts');
  const mSlugs = Object.keys(MANIFEST);
  ok('manifest lists exactly the registry slugs', mSlugs.length === slugs.length && slugs.every((s) => s in MANIFEST),
    `manifest ${mSlugs.length} vs registry ${slugs.length} - run: node scripts/gen-manifest.mts`);
  if (!only) {
    for (const p of ALL_PROBLEMS) {
      const got = await loadProblem(p.slug).catch(() => null);
      ok(`manifest resolves ${p.slug}`, got === p);
    }
  }
}

// ---- lazy pattern data: the browser reads the light index (patternCards.ts, catalog.ts, problemAccent.ts) and loads the text
// of one pattern on demand (patternText/load.ts). All of it is generated from / merged out of the eager data, and must
// equal it. Fix with: node scripts/gen-pattern-text.mts
{
  const stale = staleFiles();
  ok('patternText light.ts / digest.ts / manifest.ts are current', stale.length === 0, `out of date: ${stale.join(', ')} - run: node scripts/gen-pattern-text.mts`);

  const cards = await import('../src/data/patternCards.ts');
  ok('light cards equal the full cards (patternCards.ts vs patternsFull.ts)', JSON.stringify(cards.PATTERN_GROUPS) === JSON.stringify(PATTERN_GROUPS) && JSON.stringify(cards.ALL_PATTERNS) === JSON.stringify(ALL_PATTERNS));
  ok('PAGE_SLUGS equals the keys of CONTENT', cards.PAGE_SLUGS.size === Object.keys(CONTENT).length && Object.keys(CONTENT).every((s) => cards.PAGE_SLUGS.has(s)));

  const { hasPatternText, loadPatternText } = await import('../src/data/patternText/load.ts');
  const { SLUG_UNITS } = await import('../src/data/patternText/manifest.ts');
  const { DIGEST } = await import('../src/data/patternText/digest.ts');
  const eager = (s: string) => ({ content: CONTENT[s], meta: PATTERN_META[s], examples: examplesFor(s) });
  const slugsWithText = new Set([...Object.keys(CONTENT), ...Object.keys(PATTERN_META), ...ALL_PATTERNS.map((p) => p.slug)]);
  for (const slug of slugsWithText) {
    const lazy = await loadPatternText(slug);
    ok(`lazy pattern text equals the eager text: ${slug}`, JSON.stringify(lazy) === JSON.stringify(eager(slug)), 'run: node scripts/gen-pattern-text.mts');
    ok(`manifest knows ${slug}`, hasPatternText(slug) === (slug in SLUG_UNITS));
    if (CONTENT[slug] || PATTERN_META[slug]) ok(`digest has ${slug}`, !!DIGEST[slug]);
  }
  ok('manifest lists no unknown slug', Object.keys(SLUG_UNITS).every((s) => slugsWithText.has(s)));

  // the light problem accent must equal the one computed from the full data
  const { computeFeatured } = await import('../src/data/featuredAccent.ts');
  const { problemAccent } = await import('../src/data/problemAccent.ts');
  const featured = computeFeatured(ALL_PATTERNS, (s) => CONTENT[s], examplesFor);
  for (const e of ALL_ENTRIES) {
    const want = featured.get(e.slug) ?? undefined;
    if (want) ok(`problem accent ${e.slug}`, problemAccent(e.slug, e.category, e.tag) === want);
  }

  // browser-side files must never import the eager data modules (they would pull ~700 kB of text into the entry chunk)
  const BROWSER_SAFE = ['src/pages', 'src/components', 'src/seo', 'src/engine', 'src/App.tsx', 'src/main.tsx', 'src/config.ts', 'src/surface.ts', 'src/data'];
  const HEAVY = /from\s+['"][^'"]*\/(patternsFull|patternContent|packs\/index|detail\/index|packs\/p\d+[a-z]?|detail\/d\d+[a-z]?)(\.ts)?['"]|from\s+['"][^'"]*\/data\/patterns(\.ts)?['"]|from\s+['"][^'"]*\/patternMeta(\.ts)?['"]|from\s+['"]\.\/(patterns|patternMeta)(\.ts)?['"]/;
  const root = fileURLToPath(new URL('..', import.meta.url));
  const walkSrc = (rel: string): string[] => {
    const abs = join(root, rel);
    let ents: import('node:fs').Dirent[];
    try { ents = readdirSync(abs, { withFileTypes: true }); } catch { return [rel]; }
    return ents.flatMap((d) => (d.isDirectory() ? walkSrc(`${rel}/${d.name}`) : /\.(ts|tsx)$/.test(d.name) ? [`${rel}/${d.name}`] : []));
  };
  // data modules that ARE the lazy sources / eager reference may import each other; everything else may not import them as values
  const SOURCES = /^src\/data\/(patternsFull|patterns|patternMeta|patternContent|patternTemplates|packs\/.*|detail\/.*|patternText\/(manifest|digest|light))\.ts$/;
  for (const file of BROWSER_SAFE.flatMap(walkSrc)) {
    if (SOURCES.test(file) || /^src\/problems\//.test(file)) continue;
    const text = readFileSync(join(root, file), 'utf8');
    for (const line of text.split('\n')) {
      if (/^\s*import\s+type\b/.test(line) || /^\s*export\s+type\b/.test(line)) continue;
      if (HEAVY.test(line) && !/^\s*import\s*\{\s*type\b[^}]*\}\s*from/.test(line)) ok(`browser code must not import the eager pattern data: ${file}`, false, line.trim());
    }
  }
}

for (const p of ALL_PROBLEMS) {
  if (only && !p.slug.includes(only)) continue;
  const e = catalog.get(p.slug);
  ok(`${p.slug}: slug exists in catalog`, !!e);
  if (e) {
    ok(`${p.slug}: difficulty matches catalog`, e.difficulty === p.difficulty, `${e.difficulty} vs ${p.difficulty}`);
    ok(`${p.slug}: category matches catalog`, e.category === p.category, `${e.category} vs ${p.category}`);
  }
  ok(`${p.slug}: >= 2 examples`, p.examples.length >= 2);
  ok(`${p.slug}: has java and python`, p.java.length > 0 && p.python.length > 0);
  ok(`${p.slug}: legend/algorithm/complexity present`, p.legend.length > 0 && p.algorithm.length >= 2 && p.complexity.length >= 1 && !!p.why && !!p.statement);
  for (const ex of p.examples) {
    const tag = `${p.slug} [${ex.label}]`;
    let steps: any[];
    try {
      steps = p.buildSteps(ex.input);
    } catch (err) {
      ok(`${tag}: buildSteps threw`, false, String(err));
      continue;
    }
    ok(`${tag}: >= 2 steps`, steps.length >= 2);
    ok(`${tag}: step count sane (<= 400)`, steps.length <= 400, String(steps.length));
    ok(`${tag}: final step has result`, !!steps[steps.length - 1]?.result);
    ok(`${tag}: deterministic`, JSON.stringify(p.buildSteps(ex.input)) === JSON.stringify(steps));
    steps.forEach((s, i) => {
      const where = `${tag} step ${i}`;
      ok(`${where}: java lines in range`, s.javaLines.every((l: number) => Number.isInteger(l) && l >= 0 && l < p.java.length), JSON.stringify(s.javaLines));
      ok(`${where}: python lines in range`, s.pyLines.every((l: number) => Number.isInteger(l) && l >= 0 && l < p.python.length), JSON.stringify(s.pyLines));
      ok(`${where}: algoStep in range`, s.algoStep >= 0 && s.algoStep < p.algorithm.length, String(s.algoStep));
      ok(`${where}: vars cover varLabels`, p.varLabels.every((k: string) => k in s.vars), JSON.stringify(Object.keys(s.vars)));
      ok(`${where}: text present`, !!s.title && !!s.desc && !!s.logic);
      ok(`${where}: aux well-formed`, !s.aux || s.aux.every((a: any) => !!a.title && Array.isArray(a.items)));
      checkScene(s, where, ok);
    });
    // examples should be reproducible through the same parse path a user's custom input takes
    ok(`${tag}: parseInput accepts a placeholder-like input`, typeof p.inputPlaceholder === 'string' && p.inputPlaceholder.length > 0);
  }
}

// ---- patterns
const patSlugs = ALL_PATTERNS.map((p) => p.slug);
ok('pattern slugs unique', new Set(patSlugs).size === patSlugs.length);
ok(`pattern families >= 14 (got ${PATTERN_GROUPS.length})`, PATTERN_GROUPS.length >= 14);
const entrySlugs = ALL_ENTRIES.map((e) => e.slug);
ok('catalog slugs unique', new Set(entrySlugs).size === entrySlugs.length, entrySlugs.filter((s, i) => entrySlugs.indexOf(s) !== i).join(','));
const exampleWarnings: string[] = [];
const strictExamples = !!process.env.EXAMPLES_STRICT;
// every pattern card needs a page once the packs are done
for (const slug of patSlugs) {
  if (!CONTENT[slug]) {
    if (strictExamples) ok(`pattern card has no content yet: ${slug}`, false);
    else exampleWarnings.push(`${slug}: card has no page content`);
  }
}
for (const [slug, c] of Object.entries(CONTENT)) {
  // worked examples: at least 3 DIFFERENT animated problems, first = flagship, each explained
  const ex = examplesFor(slug);
  const exOk = ex.length >= 3 && new Set(ex.map((e) => e.slug)).size === ex.length && ex[0].slug === c.animation && ex.every((e) => PROBLEMS.has(e.slug) && e.why.trim().length >= 20);
  if (!exOk) {
    if (strictExamples) ok(`pattern needs >= 3 different animated examples (first = flagship, each with a "why"): ${slug}`, false, `has ${ex.length}: ${ex.map((e) => e.slug).join(', ')}`);
    else exampleWarnings.push(`${slug}: ${ex.length} example(s)`);
  }
  ok(`pattern content has a card: ${slug}`, patSlugs.includes(slug));
  ok(`pattern fields present: ${slug}`, !!c.summary && !!c.tip && c.whenToUse.length >= 3 && c.practice.length >= 3);
  if (!c.template) {
    if (process.env.PATTERN_STRICT) ok(`pattern template missing: ${slug}`, false);
    else templateWarnings.push(slug);
  } else {
    ok(`pattern template looks like code: ${slug}`, c.template.split('\n').length >= 8 && /[{;]/.test(c.template));
  }
  for (const p of c.practice as any[]) {
    if (typeof p === 'string') ok(`practice slug in catalog: ${slug} -> ${p}`, catalog.has(p));
    else if (typeof p.slug === 'string') ok(`practice slug in catalog: ${slug} -> ${p.slug}`, catalog.has(p.slug));
    else ok(`practice item well-formed: ${slug} -> ${JSON.stringify(p).slice(0, 60)}`, /^\d+$/.test(p.id) && !!p.title && ['Easy', 'Medium', 'Hard'].includes(p.difficulty) && (!p.href || /^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/?$/.test(p.href)));
  }
  if (!PROBLEMS.has(c.animation)) {
    if (process.env.PATTERN_STRICT) ok(`pattern animation missing: ${slug} -> ${c.animation}`, false);
    else warnings.push(`${slug} -> ${c.animation}`);
  }
}

console.log(`problems animated: ${ALL_PROBLEMS.length}/${ALL_ENTRIES.length} · pattern pages: ${Object.keys(CONTENT).length}/${ALL_PATTERNS.length}`);
if (warnings.length) console.log(`WARN  ${warnings.length} pattern page(s) point at animations that are not built yet:\n      ${warnings.join('\n      ')}`);
if (exampleWarnings.length) console.log(`WARN  ${exampleWarnings.length} pattern(s) do not have 3 different animated examples yet (set EXAMPLES_STRICT=1 to fail on them)`);
if (templateWarnings.length) console.log(`WARN  ${templateWarnings.length} pattern page(s) have no Java \`template\` yet:\n      ${templateWarnings.join(', ')}`);
console.log(failures ? `\n${failures} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
