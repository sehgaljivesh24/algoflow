/**
 * SEO check.   Run:  node scripts/check-seo.mts
 *
 * 1. metaFor() for EVERY route (static pages, cheatsheet guides, all patterns, all problems): title <= 60, description <= 160,
 *    both unique, no "undefined" / "NaN", canonical present and equal to the route, unknown routes are noindex.
 * 2. public/og-default.png exists, is a 1200x630 PNG and stays under 200 KB.
 * 3. If a build exists (dist/sitemap.xml): dist/<route>/index.html exists for every route with the matching <title>, description,
 *    canonical and og tags, loads the same absolute /assets/... files as dist/index.html, and sitemap.xml lists every indexable route.
 *    (Without a build this part is skipped; set SEO_REQUIRE_DIST=1 to make a missing build a failure.)
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ALL_PROBLEMS } from '../src/problems/registry.ts';
import { ALL_ENTRIES } from '../src/data/catalog.ts';
import { ALL_PATTERNS } from '../src/data/patterns.ts';
import { DESCRIPTION_MAX, PATTERN_INDEX_COPY, TITLE_MAX, allRoutes, metaFor } from '../src/seo/meta.ts';

const root = resolve(import.meta.dirname, '..');
let failures = 0;
const fail = (msg: string) => {
  failures++;
  if (failures <= 80) console.log(`FAIL  ${msg}`);
};
const ok = (cond: unknown, msg: string) => { if (!cond) fail(msg); };

const statements = new Map<string, string>(ALL_PROBLEMS.map((p) => [p.slug, p.statement]));
const opts = { statementOf: (slug: string) => statements.get(slug) };
const routes = allRoutes();

/* ---------- 1. metaFor ---------- */
ok(new Set(routes).size === routes.length, 'allRoutes() has duplicates');
ok(routes.filter((r) => r.startsWith('/patterns/')).length === ALL_PATTERNS.length, 'every pattern has a route');
ok(routes.filter((r) => r.startsWith('/problem/')).length === ALL_ENTRIES.length, 'every catalog problem has a route');
ok(routes.includes('/') && routes.includes('/patterns') && routes.includes('/quiz') && routes.includes('/edge-cases') && routes.includes('/cheatsheet') && routes.includes('/cheatsheets'), 'static routes listed');

const titles = new Map<string, string[]>();
const descs = new Map<string, string[]>();
for (const r of routes) {
  const m = metaFor(r, '', opts);
  ok(!m.noindex, `${r}: a real route must be indexable`);
  ok(m.title.length > 0 && m.title.length <= TITLE_MAX, `${r}: title ${m.title.length} chars (max ${TITLE_MAX}): ${m.title}`);
  ok(m.description.length >= 50 && m.description.length <= DESCRIPTION_MAX, `${r}: description ${m.description.length} chars (50..${DESCRIPTION_MAX}): ${m.description}`);
  ok(!/undefined|NaN|\[object/.test(`${m.title} ${m.description} ${m.canonical}`), `${r}: undefined/NaN in meta`);
  ok(m.canonical === r, `${r}: canonical is ${m.canonical}`);
  ok(m.image.startsWith('/') && m.ogType.length > 0, `${r}: image / ogType`);
  (titles.get(m.title) ?? titles.set(m.title, []).get(m.title)!).push(r);
  (descs.get(m.description) ?? descs.set(m.description, []).get(m.description)!).push(r);
  // query strings (?step=3) never change anything
  const q = metaFor(r, '?step=3', opts);
  ok(q.title === m.title && q.canonical === m.canonical, `${r}: query string changed the meta`);
}
for (const [t, rs] of titles) if (rs.length > 1) fail(`duplicate title "${t}": ${rs.join(', ')}`);
for (const [d, rs] of descs) if (rs.length > 1) fail(`duplicate description "${d.slice(0, 60)}...": ${rs.join(', ')}`);
for (const bad of ['/nope', '/patterns/not-a-pattern', '/problem/not-a-problem', '/cheatsheets/the-only/not-a-guide', '/a/b/c']) {
  const m = metaFor(bad);
  ok(m.noindex === true && m.title.length <= TITLE_MAX && m.description.length <= DESCRIPTION_MAX, `${bad}: unknown route must be noindex`);
}
ok(metaFor('/patterns/kadane/').canonical === '/patterns/kadane', 'trailing slash is normalised');
console.log(`metaFor: ${routes.length} routes, ${titles.size} distinct titles, ${descs.size} distinct descriptions`);

{
  // src/seo/meta.ts keeps a copy of the pattern-index manifest text (it must not import that json): keep them equal
  const manifest = JSON.parse(readFileSync(join(root, 'src', 'content', 'cheatsheets', 'pattern-index', 'meta.json'), 'utf8'));
  ok(manifest.title === PATTERN_INDEX_COPY.title && manifest.description === PATTERN_INDEX_COPY.description,
    'PATTERN_INDEX_COPY in src/seo/meta.ts differs from pattern-index/meta.json - update the copy');
}

/* ---------- 2. share image ---------- */
{
  const img = join(root, 'public', 'og-default.png');
  if (!existsSync(img)) fail('public/og-default.png is missing');
  else {
    const buf = readFileSync(img);
    ok(buf.length < 200 * 1024, `og-default.png is ${Math.round(buf.length / 1024)} KB (max 200)`);
    ok(buf.subarray(1, 4).toString() === 'PNG', 'og-default.png is not a PNG');
    ok(buf.readUInt32BE(16) === 1200 && buf.readUInt32BE(20) === 630, `og-default.png is ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}, expected 1200x630`);
  }
  ok(existsSync(join(root, 'public', 'favicon.svg')), 'public/favicon.svg is missing');
}

/* ---------- 3. built output ---------- */
const dist = join(root, 'dist');
const sitemapPath = join(dist, 'sitemap.xml');
if (!existsSync(sitemapPath)) {
  if (process.env.SEO_REQUIRE_DIST) fail('dist/sitemap.xml is missing (run npm run build first)');
  else console.log('dist: no SEO build found, skipping built-output checks (npm run build, then re-run)');
} else {
  const unescapeHtml = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const assetsOf = (html: string) => [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]).sort().join('\n');
  const attr = (html: string, re: RegExp) => { const m = re.exec(html); return m ? unescapeHtml(m[1]) : undefined; };

  const base = readFileSync(join(dist, 'index.html'), 'utf8');
  const baseAssets = assetsOf(base);
  ok(baseAssets.length > 0, 'dist/index.html references no /assets/ files');
  ok(!/(?:src|href)="\.\/?assets\//.test(base), 'dist/index.html uses relative asset paths');
  const canonHome = attr(base, /<link rel="canonical" href="([^"]*)"/);
  const site = (canonHome ?? '').replace(/\/$/, '');
  ok(/^https?:\/\/[^/]+/.test(site), `dist/index.html canonical is not absolute: ${canonHome}`);

  const sitemap = readFileSync(sitemapPath, 'utf8');
  const locs = new Set([...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => unescapeHtml(m[1])));
  const robots = readFileSync(join(dist, 'robots.txt'), 'utf8');
  ok(robots.includes(`Sitemap: ${site}/sitemap.xml`) && /Allow: \//.test(robots), 'robots.txt lacks Allow / Sitemap line');
  ok(locs.size === routes.length, `sitemap lists ${locs.size} urls, expected ${routes.length}`);

  let checked = 0;
  for (const r of routes) {
    const m = metaFor(r, '', opts);
    const url = `${site}${r}`;
    ok(locs.has(url), `sitemap.xml does not list ${url}`);
    const file = r === '/' ? join(dist, 'index.html') : join(dist, ...r.split('/').filter(Boolean), 'index.html');
    if (!existsSync(file)) { fail(`${r}: ${file} is missing`); continue; }
    const html = readFileSync(file, 'utf8');
    checked++;
    ok(attr(html, /<title>([^<]*)<\/title>/) === m.title, `${r}: <title> differs`);
    ok(attr(html, /<meta name="description" content="([^"]*)"/) === m.description, `${r}: description differs`);
    ok(attr(html, /<link rel="canonical" href="([^"]*)"/) === url, `${r}: canonical differs`);
    ok(attr(html, /<meta property="og:title" content="([^"]*)"/) === m.title, `${r}: og:title differs`);
    ok(attr(html, /<meta property="og:url" content="([^"]*)"/) === url, `${r}: og:url differs`);
    ok(attr(html, /<meta property="og:image" content="([^"]*)"/) === `${site}${m.image}`, `${r}: og:image differs`);
    ok((html.match(/<title>/g) ?? []).length === 1 && (html.match(/name="description"/g) ?? []).length === 1, `${r}: duplicated title/description tags`);
    ok(assetsOf(html) === baseAssets, `${r}: loads different /assets files than dist/index.html`);
  }
  for (const a of baseAssets.split('\n')) ok(existsSync(join(dist, a)), `asset ${a} referenced but missing in dist`);
  console.log(`dist: ${checked} route pages checked against site ${site}`);
}

if (failures) {
  console.log(`\nSEO CHECK FAILED (${failures} problem${failures === 1 ? '' : 's'})`);
  process.exit(1);
}
console.log('SEO CHECK PASSED');
