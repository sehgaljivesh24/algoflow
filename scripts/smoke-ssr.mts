/**
 * Server-side render smoke test: renders every page of the site in Node and fails on crashes, React warnings,
 * empty pages and "NaN / undefined / [object Object]" leaking into the markup.   Run:  node scripts/smoke-ssr.mts
 *
 *   env ONLY=<slug,slug>   only these pattern / problem slugs (the fixed pages are skipped)
 *   env FAST=1             flagship example only (ex 1), still 3 steps (first / middle / last)
 *   env VERBOSE=1          print every warning and every rendered route
 *   env DUMP=<substring>   print the markup of every render whose route contains the substring (debug aid)
 *
 * How: Vite runs in middleware mode (no port, no file watcher, no HMR) and loads scripts/smoke/entry.tsx through
 * ssrLoadModule, so the project compiles exactly as in the real build. Pages render with react-dom/server inside a
 * StaticRouter. Three test-only source patches are applied by an in-memory Vite plugin below (the app files on disk
 * are never touched); each fails loudly when its target text changes:
 *   1. src/problems/useProblem.ts   -> returns the preloaded problem synchronously (the real hook loads in an effect,
 *                                      which never runs on the server, so SSR would only ever show "Loading animation...").
 *   2. src/engine/useStepPlayer.ts  -> initial step from globalThis.__SMOKE_STEP (the real page seeks in an effect
 *                                      from window.location.search; the pattern page reads ?step= during render, so it needs no patch).
 *   3. src/pages/ProblemPage.tsx    -> initial example from globalThis.__SMOKE_EX (there is no ?ex= on the problem page).
 *
 * Whitelisted console output (expected when rendering on the server, counted but not failures):
 *   - "useLayoutEffect does nothing on the server" (PatternAnimation measures its window frame in a layout effect)
 *   - anything mentioning hydration (we never hydrate; listed so a future hydrate step does not flood the log)
 *   - Node's own "ExperimentalWarning: localStorage is not available" notice (the app guards localStorage with try/catch)
 * Everything else React prints through console.error / console.warn (missing keys, invalid DOM nesting, NaN
 * attributes, unknown props ...) is a failure.
 *
 * Not covered (see AGENTS-GUIDE.md): layout, CSS, effects, browser APIs, animation timing, the cheatsheet viewers' lazily
 * fetched HTML (loaded in effects) - those routes are rendered only to prove the shell does not crash.
 */
import { createServer, type Plugin } from 'vite';
import { format } from 'node:util';

const T0 = Date.now();
const FAST = process.env.FAST === '1';
const VERBOSE = process.env.VERBOSE === '1';
const ONLY = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const g = globalThis as Record<string, any>;
g.__SMOKE_PROBLEMS = new Map<string, unknown>();
g.__SMOKE_STEP = 0;
g.__SMOKE_EX = 0;

/* ------------------------------------------------------------------ vite with the test-only patches */

const norm = (id: string) => id.split('?')[0].replace(/\\/g, '/');
function patch(code: string, from: string | RegExp, to: string, file: string): string {
  const out = code.replace(from, to);
  if (out === code) throw new Error(`smoke-ssr: patch target not found in ${file} (${String(from)}) - update scripts/smoke-ssr.mts`);
  return out;
}

const smokePlugin: Plugin = {
  name: 'smoke-ssr-patches',
  enforce: 'pre',
  load(id) {
    if (norm(id).endsWith('/src/problems/useProblem.ts')) {
      return `export function useProblem(slug) {
  const p = globalThis.__SMOKE_PROBLEMS.get(slug);
  return p ? { status: 'ready', problem: p } : { status: 'loading' };
}`;
    }
    return null;
  },
  transform(code, id) {
    const f = norm(id);
    if (f.endsWith('/src/engine/useStepPlayer.ts')) {
      return patch(
        code,
        'const [cur, setCur] = useState(0);',
        'const [cur, setCur] = useState(() => Math.max(0, Math.min(Number((globalThis as any).__SMOKE_STEP) || 0, steps.length - 1)));',
        'useStepPlayer.ts',
      );
    }
    if (f.endsWith('/src/pages/ProblemPage.tsx')) {
      let c = patch(code, 'useState<number | null>(0)', 'useState<number | null>((globalThis as any).__SMOKE_EX ?? 0)', 'ProblemPage.tsx');
      c = patch(c, 'useState(problem.examples[0].input)', 'useState(problem.examples[(globalThis as any).__SMOKE_EX ?? 0].input)', 'ProblemPage.tsx');
      return c;
    }
    return null;
  },
};

const vite = await createServer({
  plugins: [smokePlugin],
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: 'custom',
  logLevel: 'error',
});

/* ------------------------------------------------------------------ console capture */

const orig = { error: console.error, warn: console.warn };
let captured: string[] | null = null;
console.error = (...a: unknown[]) => (captured ? captured.push(`error: ${format(...a)}`) : orig.error(...a));
console.warn = (...a: unknown[]) => (captured ? captured.push(`warn: ${format(...a)}`) : orig.warn(...a));
const WHITELIST: [string, RegExp][] = [
  ['useLayoutEffect on the server', /useLayoutEffect does nothing on the server/i],
  ['hydration', /hydrat/i],
  // Node 26 prints this process warning (through console) the first time any code touches the global `localStorage`
  ['node localStorage experimental warning', /ExperimentalWarning: localStorage|--trace-warnings/],
];

/* ------------------------------------------------------------------ bookkeeping */

interface Failure { route: string; kind: string; detail: string }
const failures: Failure[] = [];
const warningKinds = new Map<string, { count: number; example: string }>();
const whitelisted = new Map<string, number>();
let renders = 0;
const routeSet = new Set<string>();
const fail = (route: string, kind: string, detail: string) => failures.push({ route, kind, detail });
const kindOf = (msg: string) => msg.replace(/\d+/g, 'N').replace(/\s+/g, ' ').slice(0, 110);

/* ------------------------------------------------------------------ html helpers */

/** Markup without React's text separators, scripts, styles, code blocks (<pre>) and the animation code panel lines. */
function scrub(html: string): string {
  return html
    .replace(/<!--(?!\$)[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<pre[\s\S]*?<\/pre>/g, '')
    .replace(/<span class="cp-code">[\s\S]*?<\/span><\/div>/g, '</div>');
}
const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
const textOf = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const count = (html: string, needle: string | RegExp) =>
  typeof needle === 'string' ? html.split(needle).length - 1 : (html.match(needle) ?? []).length;

const BAD = /\bNaN\b|undefined|\[object Object\]|\bInfinity\b/g;
/**
 * `null null` (a formatter printing two missing values next to each other) is a bug in prose, but tree inputs are
 * legitimately written level-order with several `null`s in a row ("1 2 3 null null 4 5"). Those only appear in the
 * example label spans, the custom-input placeholder and <code> blocks, which are removed before this scan.
 */
const NULL_NULL = /null null/g;
/**
 * Per-route allowances for words that legitimately appear in prose. Each entry: route test, regex applied to the
 * context of a hit that marks it as legitimate.
 */
const ALLOW: { route: RegExp; ctx: RegExp; why: string }[] = [
  { route: /^\/cheatsheet$/, ctx: /Infinity sentinels/, why: 'topic title "Infinity sentinels and Arrays.fill" in the cheatsheet' },
];

function scanBad(route: string, html: string) {
  const clean = scrub(html);
  const noLabels = clean
    .replace(/<span class="ex-input">[\s\S]*?<\/span>/g, '')
    .replace(/placeholder="[^"]*"/g, '')
    .replace(/<code>[\s\S]*?<\/code>/g, '');
  const seen = new Set<string>();
  for (const [re, src] of [[BAD, clean], [NULL_NULL, noLabels]] as [RegExp, string][]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const ctx = src.slice(Math.max(0, m.index - 40), m.index + m[0].length + 24).replace(/\s+/g, ' ');
      if (ALLOW.some((a) => a.route.test(route) && a.ctx.test(ctx))) continue;
      if (seen.has(ctx)) continue;
      seen.add(ctx);
      fail(route, `text:${m[0]}`, ctx);
      if (seen.size >= 3) return;
    }
  }
}

/** Internal links must point somewhere that exists (filled in once the data is loaded). */
let linkOk: (path: string) => boolean = () => true;
const linkChecked = new Map<string, boolean>();

/** Duplicate ids, aria references to ids that are not on the page, and dead internal links. */
function a11yChecks(route: string, html: string) {
  const ids = [...html.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]);
  const idSet = new Set(ids);
  if (idSet.size !== ids.length) fail(route, 'dup-id', `duplicate id(s): ${[...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))].slice(0, 4).join(', ')}`);
  for (const m of html.matchAll(/\saria-(?:labelledby|controls|describedby)="([^"]*)"/g)) {
    for (const ref of m[1].split(/\s+/).filter(Boolean)) if (!idSet.has(ref)) fail(route, 'aria-ref', `aria reference to missing id "${ref}"`);
  }
  for (const m of html.matchAll(/\shref="(\/[^"]*)"/g)) {
    const path = decode(m[1]).split(/[?#]/)[0];
    let ok = linkChecked.get(path);
    if (ok === undefined) linkChecked.set(path, (ok = linkOk(path)));
    if (!ok) fail(route, 'dead-link', `internal link ${path} matches no route / slug`);
  }
}

function genericChecks(route: string, html: string, errs: string[], opts: { thin?: boolean } = {}) {
  if (!opts.thin) a11yChecks(route, html);
  for (const e of errs) fail(route, 'render-error', e);
  if (html.includes('<!--$!-->') || html.includes('data-msg=') || html.includes('data-dgst=')) fail(route, 'suspense-error', 'a Suspense boundary fell back to client rendering (an error was thrown while rendering it)');
  const text = textOf(scrub(html));
  // `thin` routes are lazy viewers that fetch their content in effects: the server shell may legitimately have no text
  if (opts.thin ? html.length < 20 : text.length < 40) fail(route, 'empty-page', `only ${text.length} visible characters`);
  const main = /<main[\s\S]*?<\/main>/.exec(html);
  if (main && textOf(scrub(main[0])).length < 10) fail(route, 'empty-main', '<main> has no visible text');
  scanBad(route, html);
}

/** Debug aid: DUMP=<route substring> prints the markup of every matching render. */
const DUMP = process.env.DUMP;
const maybeDump = (route: string, html: string) => {
  if (DUMP && route.includes(DUMP)) console.log(`\n===== ${route} =====\n${html}\n`);
};

/** Guards against a silently blind scanner: the checks must fire on known-bad markup and stay quiet on known-good. */
function selfTest() {
  const probe = (html: string) => {
    const before = failures.length;
    genericChecks('/selftest', `<main>${'filler text '.repeat(10)}${html}</main>`, []);
    return failures.splice(before).length;
  };
  const cases: [string, string, boolean][] = [
    ['NaN in text', '<p>width NaN</p>', true],
    ['undefined in attribute', '<div class="vp-tone-undefined"></div>', true],
    ['[object Object]', '<p>[object Object]</p>', true],
    ['null null in prose', '<p>values null null</p>', true],
    ['NaN inside pre', '<pre><code>NaN undefined</code></pre>', false],
    ['undefined inside code panel', '<div><span class="cp-code"><span>undefined</span></span></div>', false],
    ['null null in an example label', '<span class="ex-input">1 2 null null 3</span>', false],
    ['suspense fallback marker', '<!--$!-->', true],
  ];
  for (const [name, html, bad] of cases) if ((probe(html) > 0) !== bad) {
    console.error(`smoke-ssr self-test failed: ${name} (${bad ? 'should be flagged' : 'should pass'})`);
    process.exit(2);
  }
}
selfTest();

/** Runs `fn` with console capture, applying the whitelist; returns the non-whitelisted messages. */
async function withCaptureAsync<T>(route: string, fn: () => Promise<T>): Promise<T> {
  captured = [];
  try {
    return await fn();
  } finally {
    endCapture(route);
  }
}
function withCapture<T>(route: string, fn: () => T): T {
  captured = [];
  try {
    return fn();
  } finally {
    endCapture(route);
  }
}
function endCapture(route: string) {
  {
    const msgs = captured ?? [];
    captured = null;
    for (const msg of msgs) {
      const wl = WHITELIST.find(([, re]) => re.test(msg));
      if (wl) {
        whitelisted.set(wl[0], (whitelisted.get(wl[0]) ?? 0) + 1);
        continue;
      }
      const k = kindOf(msg);
      const w = warningKinds.get(k) ?? { count: 0, example: `${route}: ${msg.slice(0, 300)}` };
      w.count++;
      warningKinds.set(k, w);
      fail(route, 'console', msg.slice(0, 400));
    }
  }
}

/* ------------------------------------------------------------------ load the app */

const mod: any = await vite.ssrLoadModule('/scripts/smoke/entry.tsx');
const { ALL_ENTRIES, ALL_PATTERNS, CONTENT, examplesFor, loadProblem, isAnimated, MANIFEST, renderRoute, renderRouteAsync } = mod;
console.log(`smoke-ssr: app loaded in ${((Date.now() - T0) / 1000).toFixed(1)}s`);

const problemCache = new Map<string, any>();
async function problemOf(slug: string) {
  let p = problemCache.get(slug);
  if (!p) {
    p = await loadProblem(slug);
    problemCache.set(slug, p);
    g.__SMOKE_PROBLEMS.set(slug, p);
  }
  return p;
}
const stepCounts = new Map<string, number>();
function stepCount(p: any, exIdx: number) {
  const k = `${p.slug}#${exIdx}`;
  let n = stepCounts.get(k);
  if (n === undefined) {
    n = p.buildSteps(p.examples[exIdx].input).length;
    stepCounts.set(k, n);
  }
  return n;
}
/** 1-based step numbers: first, middle, last (de-duplicated). */
const pickSteps = (n: number) => [...new Set([1, Math.max(1, Math.ceil(n / 2)), n])];

let planned = 0;
function tick(route: string) {
  renders++;
  routeSet.add(route.split('?')[0]);
  if (VERBOSE) console.log(`  render ${route}`);
  else if (renders % 250 === 0) console.log(`  ... ${renders}/${planned} renders, ${failures.length} failure(s), ${((Date.now() - T0) / 1000).toFixed(0)}s`);
}

/* ------------------------------------------------------------------ fixed pages */

interface PageSpec { url: string; expect?: RegExp; async?: boolean; thin?: boolean; why?: string }
const PAGES: PageSpec[] = [
  { url: '/', expect: /AlgoFlow|problems/i },
  { url: '/patterns', expect: /pattern/i },
  { url: '/cheatsheet', expect: /cheat/i },
  { url: '/cheatsheets', expect: /cheat/i },
  { url: '/cheatsheets/credits', expect: /credit|licen/i },
  { url: '/quiz', expect: /quiz/i },
  { url: '/edge-cases', expect: /edge/i },
  { url: '/this/page/does/not/exist', expect: /Page not found/ },
  { url: '/problem/no-such-problem', expect: /Problem not found/ },
  { url: '/patterns/no-such-pattern', expect: /Pattern not found/ },
  // imported viewers: content is fetched in effects and is lazy, so only the shell (or the lazy Suspense content) renders
  { url: '/cheatsheets/pattern-index', async: true, thin: true, why: 'lazy viewer, content streamed in by effects' },
  { url: '/cheatsheets/patterns-guide', async: true, thin: true, why: 'lazy viewer, content streamed in by effects' },
  { url: '/cheatsheets/the-only', async: true, thin: true, why: 'lazy landing page' },
];
const theOnly: string[] = await mod.theOnlySlugs();
for (const s of theOnly.slice(0, 2)) PAGES.push({ url: `/cheatsheets/the-only/${s}`, async: true, thin: true, why: 'guide HTML is loaded in an effect' });
{
  const fixed = new Set(['/', '/patterns', '/cheatsheet', '/cheatsheets', '/cheatsheets/credits', '/quiz', '/edge-cases', '/cheatsheets/pattern-index', '/cheatsheets/patterns-guide', '/cheatsheets/the-only']);
  const catalogSlugs = new Set((ALL_ENTRIES as any[]).map((e) => e.slug));
  const patSlugs = new Set((ALL_PATTERNS as any[]).map((p) => p.slug));
  const onlySlugs = new Set(theOnly);
  linkOk = (path) => {
    if (fixed.has(path)) return true;
    let m: RegExpExecArray | null;
    if ((m = /^\/problem\/([^/]+)$/.exec(path))) return catalogSlugs.has(decodeURIComponent(m[1]));
    if ((m = /^\/patterns\/([^/]+)$/.exec(path))) return patSlugs.has(decodeURIComponent(m[1]));
    if ((m = /^\/cheatsheets\/the-only\/([^/]+)$/.exec(path))) return onlySlugs.has(decodeURIComponent(m[1]));
    return false;
  };
}
// catalog entries without an animation render the "not built yet" page
for (const e of ALL_ENTRIES as any[]) if (!isAnimated(e.slug)) PAGES.push({ url: `/problem/${e.slug}`, expect: /hasn't been built yet/ });

/* ------------------------------------------------------------------ plan */

const wanted = (slug: string) => ONLY.length === 0 || ONLY.includes(slug);
const patternSlugs: string[] = (ALL_PATTERNS as any[]).map((p) => p.slug).filter(wanted);
const problemSlugs: string[] = Object.keys(MANIFEST).filter(wanted);
const pages = ONLY.length ? [] : PAGES;

// pre-load every problem once and plan the render count
for (const s of problemSlugs) await problemOf(s);
const patternTabs = new Map<string, { slug: string; declared: number }[]>();
for (const ps of patternSlugs) {
  const seen: string[] = [];
  const declared = examplesFor(ps) as { slug: string }[];
  for (const e of declared) {
    if (!seen.includes(e.slug)) seen.push(e.slug);
  }
  const tabs = seen.filter((s) => isAnimated(s));
  for (const s of tabs) await problemOf(s);
  if (CONTENT[ps] && tabs.length !== seen.length) fail(`/patterns/${ps}`, 'example-dropped', `examplesFor lists ${seen.length} example slug(s) but only ${tabs.length} are animated (the missing tabs silently disappear): ${seen.filter((s) => !isAnimated(s)).join(', ')}`);
  patternTabs.set(ps, tabs.map((s) => ({ slug: s, declared: seen.length })));
}
for (const ps of patternSlugs) {
  const tabs = patternTabs.get(ps)!;
  for (const [i, t] of tabs.entries()) {
    if (FAST && i > 0) break;
    planned += pickSteps(stepCount(problemCache.get(t.slug), 0)).length;
  }
}
for (const s of problemSlugs) {
  const p = problemCache.get(s);
  for (let i = 0; i < p.examples.length; i++) {
    if (FAST && i > 0) break;
    planned += pickSteps(stepCount(p, i)).length;
  }
}
planned += pages.length;
console.log(`smoke-ssr: ${pages.length} fixed pages, ${patternSlugs.length} patterns, ${problemSlugs.length} problems -> ${planned} renders${FAST ? ' (FAST)' : ''}`);

/* ------------------------------------------------------------------ fixed pages */

for (const pg of pages) {
  const route = pg.url;
  tick(route);
  let html = '';
  let errs: string[] = [];
  try {
    if (pg.async) {
      const r = await withCaptureAsync(route, () => renderRouteAsync(pg.url));
      html = r.html;
      errs = r.errors;
    } else {
      html = withCapture(route, () => renderRoute(pg.url));
    }
  } catch (e) {
    fail(route, 'throw', (e instanceof Error ? e.stack ?? e.message : String(e)).split('\n').slice(0, 4).join(' | '));
    continue;
  }
  genericChecks(route, html, errs, { thin: pg.thin });
  maybeDump(route, html);
  if (pg.expect && !pg.expect.test(textOf(scrub(html)))) fail(route, 'missing-text', `expected ${pg.expect}`);
}

/* ------------------------------------------------------------------ pattern pages */

for (const ps of patternSlugs) {
  const tabs = patternTabs.get(ps)!;
  if (!CONTENT[ps] || tabs.length === 0) {
    fail(`/patterns/${ps}`, 'no-animation', 'pattern has no CONTENT / animated example: page shows "Animation coming soon"');
    continue;
  }
  for (const [i, t] of tabs.entries()) {
    if (FAST && i > 0) break;
    const p = problemCache.get(t.slug);
    const n = stepCount(p, 0);
    for (const k of pickSteps(n)) {
      const route = `/patterns/${ps}?ex=${i + 1}&step=${k}`;
      tick(route);
      let html: string;
      try {
        html = withCapture(route, () => renderRoute(route));
      } catch (e) {
        fail(route, 'throw', (e instanceof Error ? e.stack ?? e.message : String(e)).split('\n').slice(0, 4).join(' | '));
        continue;
      }
      genericChecks(route, html, []);
      maybeDump(route, html);
      const flat = html.replace(/<!--[\s\S]*?-->/g, '');
      if (!/<h1[^>]*pp-hero-title/.test(flat)) fail(route, 'structure', 'hero <h1> missing');
      if (!flat.includes('class="pp-phases"') || count(flat, /class="pp-ph pp-tone-/g) < 1) fail(route, 'structure', 'phase-chip row missing or empty');
      if (!/class="pp-desc pp-tone-/.test(flat)) fail(route, 'structure', 'narration bar (pp-desc) missing');
      const stats = count(flat, /class="pp-stat[ "]/g);
      if (stats < 1 || stats !== p.varLabels.length) fail(route, 'structure', `stat boxes: ${stats} rendered vs ${p.varLabels.length} varLabels`);
      if (!flat.includes(`Step ${k} / ${n}`)) fail(route, 'step', `expected "Step ${k} / ${n}" (deep link ?step= not honoured)`);
      if (tabs.length > 1 && count(flat, /role="tab"/g) !== tabs.length) fail(route, 'structure', `expected ${tabs.length} example tabs`);
      if (tabs.length > 1 && !flat.includes(`id="pp-extab-${i}" aria-selected="true"`)) fail(route, 'structure', `example tab ${i + 1} is not the selected one`);
      if (k === n) {
        if (!flat.includes('class="pp-desc pp-tone-green"')) fail(route, 'structure', 'last step: narration bar is not in the done (green) tone');
        const hasDoneChip = flat.includes('>Done<') || !!p.phases;
        if (!hasDoneChip) fail(route, 'structure', 'last step: no Done chip');
      }
    }
  }
}

/* ------------------------------------------------------------------ problem pages */

for (const s of problemSlugs) {
  const p = problemCache.get(s);
  for (let i = 0; i < p.examples.length; i++) {
    if (FAST && i > 0) break;
    const n = stepCount(p, i);
    for (const k of pickSteps(n)) {
      const route = `/problem/${s}?ex=${i + 1}&step=${k}`;
      tick(route);
      g.__SMOKE_EX = i;
      g.__SMOKE_STEP = k - 1;
      let html: string;
      try {
        html = withCapture(route, () => renderRoute(`/problem/${s}`));
      } catch (e) {
        fail(route, 'throw', (e instanceof Error ? e.stack ?? e.message : String(e)).split('\n').slice(0, 4).join(' | '));
        continue;
      }
      genericChecks(route, html, []);
      maybeDump(route, html);
      const flat = html.replace(/<!--[\s\S]*?-->/g, '');
      if (!/<main[^>]*class="vp"/.test(flat)) fail(route, 'structure', 'player root (<main class="vp">) missing - page stuck on the loading card?');
      const ln = count(flat, 'class="cp-ln"');
      if (ln !== p.java.length) fail(route, 'structure', `code panel has ${ln} numbered lines, problem.java has ${p.java.length}`);
      if (count(flat, 'class="cp-line') !== p.java.length) fail(route, 'structure', 'code panel line count mismatch');
      if (!flat.includes('class="vp-phases"') || count(flat, /class="vp-ph vp-tone-/g) < 1) fail(route, 'structure', 'phase-chip row missing or empty');
      if (!/class="vp-narr vp-tone-/.test(flat)) fail(route, 'structure', 'narration bar (vp-narr) missing');
      const boxes = count(flat, /class="stbox[ "]/g);
      if (boxes !== p.varLabels.length || boxes < 1) fail(route, 'structure', `stat boxes: ${boxes} rendered vs ${p.varLabels.length} varLabels`);
      if (!flat.includes(`class="step-ctr">${k} / ${n}<`)) fail(route, 'step', `expected step counter "${k} / ${n}"`);
      const btns = [...flat.matchAll(/<button class="vp-ex( active)?"/g)];
      if (btns.length !== p.examples.length || btns.findIndex((b) => b[1]) !== i) fail(route, 'structure', `example button ${i + 1} is not the active one (${btns.length} buttons)`);
      const steps = p.buildSteps(p.examples[i].input);
      const hasResult = flat.includes('class="vp-result"');
      if (!!steps[k - 1].result !== hasResult) fail(route, 'structure', `result card ${hasResult ? 'shown on a step without result' : 'missing on a step with result'}`);
      if (k === n && !hasResult) fail(route, 'structure', 'last step: result (Done) card missing');
      if (k === n && !flat.includes('cp-line on done') && p.java.length > 0 && steps[k - 1].javaLines?.length) fail(route, 'structure', 'last step: active code line is not marked done');
    }
  }
}

/* ------------------------------------------------------------------ summary */

await vite.close();
console.error = orig.error;
console.warn = orig.warn;
const secs = (Date.now() - T0) / 1000;
const byKind = new Map<string, number>();
for (const f of failures) byKind.set(f.kind.split(':')[0], (byKind.get(f.kind.split(':')[0]) ?? 0) + 1);

console.log('');
if (failures.length) {
  const shown = new Map<string, number>();
  let printed = 0;
  for (const f of failures) {
    const key = `${f.kind}|${f.detail.replace(/\d+/g, 'N').slice(0, 80)}`;
    const c = (shown.get(key) ?? 0) + 1;
    shown.set(key, c);
    if (c > (VERBOSE ? 50 : 2)) continue;
    if (printed++ >= (VERBOSE ? 500 : 80)) break;
    console.log(`FAIL  ${f.route}  [${f.kind}]  ${f.detail}`);
  }
  if (failures.length > printed) console.log(`... ${failures.length - printed} more failure(s) not printed (rerun with VERBOSE=1 / ONLY=<slug>)`);
}
console.log('---- smoke-ssr summary ----');
console.log(`routes (distinct paths): ${routeSet.size}   renders: ${renders}   failures: ${failures.length}`);
if (byKind.size) console.log(`failures by kind: ${[...byKind].map(([k, v]) => `${k}=${v}`).join(', ')}`);
if (warningKinds.size) {
  console.log('console warnings/errors by kind:');
  for (const [k, v] of warningKinds) console.log(`  ${v.count} x ${k}\n      e.g. ${v.example}`);
}
if (whitelisted.size) console.log(`whitelisted console output: ${[...whitelisted].map(([k, v]) => `${k}=${v}`).join(', ')}`);
console.log(`took ${secs.toFixed(1)}s`);
console.log(failures.length ? 'SMOKE FAILED' : 'SMOKE PASSED');
process.exit(failures.length ? 1 : 0);
