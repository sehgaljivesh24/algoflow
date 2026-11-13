/**
 * Parity / sanitization / licensing checks for the imported "Complete DSA Patterns Reference Guide".
 * Run: node scripts/check-cs-patterns-guide.mts
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ALL_ENTRIES } from '../src/data/catalog.ts';
import { PROBLEMS } from '../src/problems/registry.ts';
import { animatedByNumber, chipSlugFor } from '../src/pages/cheatsheets/patterns-guide/chips.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'src/content/cheatsheets/patterns-guide');
let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  if (!cond) {
    failed++;
    console.error(`FAIL ${name}${extra ? ' :: ' + extra : ''}`);
  }
};
const read = (p: string) => fs.readFileSync(p, 'utf8');
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

// ---- files ----
const htmlFiles = fs.readdirSync(DIR).filter((f) => /^\d\d-.*\.html$/.test(f)).sort();
ok('7 html fragments', htmlFiles.length === 7, htmlFiles.join(','));
for (const f of ['meta.json', 'NOTICE.md', 'LICENSE.txt', 'original.scoped.css']) ok(`${f} exists`, fs.existsSync(path.join(DIR, f)));
const html = htmlFiles.map((f) => read(path.join(DIR, f))).join('\n');

// ---- parity with the original (numbers measured on the live source: see importer parity report) ----
const EXPECT = { tables: 3, rows: 63, patternRows: 50, complexityRows: 10, problemLinks: 92, plainSpans: 8, h2: 5, h3: 8, ul: 5, li: 20, tips: 2 };
const got = {
  tables: count(html, /<table\b/g),
  rows: count(html, /<tr\b/g),
  patternRows: count(html, /<td class="pattern-number">/g),
  complexityRows: count(read(path.join(DIR, '04-complexity.html')), /<tr\b/g) - 1, // minus the header row
  problemLinks: count(html, /<a [^>]*class="problem-link"[^>]*>/g),
  plainSpans: count(html, /<span class="problem-link">/g),
  h2: count(html, /<h2\b/g),
  h3: count(html, /<h3\b/g),
  ul: count(html, /<ul\b/g),
  li: count(html, /<li\b/g),
  tips: count(html, /class="tips-section"/g),
};
for (const k of Object.keys(EXPECT) as (keyof typeof EXPECT)[]) ok(`parity ${k}`, got[k] === EXPECT[k], `${got[k]} vs ${EXPECT[k]}`);

// compare against the downloaded source when the importer's scratch copy is around
const scratch = path.join(process.env.CS_IMPORT_DIR || path.join(os.tmpdir(), 'cs-import-patterns-guide'), 'index.html');
if (fs.existsSync(scratch)) {
  const src = read(scratch);
  ok('source: same table count', count(src, /<table\b/g) === got.tables);
  ok('source: same row count', count(src, /<tr\b/g) === got.rows);
  ok('source: same link count', count(src, /<a [^>]*class="problem-link"/g) === got.problemLinks);
  const srcLinks = [...src.matchAll(/<a href="([^"]+)" class="problem-link">([^<]*)<\/a>/g)].map((m) => `${m[1]}|${m[2].replace(/&amp;/g, '&')}`);
  const myLinks = [...html.matchAll(/<a href="([^"]+)" class="problem-link">([^<]*)<\/a>/g)].map((m) => `${m[1]}|${m[2].replace(/&amp;/g, '&')}`);
  ok('source: every link has identical href and text, in order', JSON.stringify(srcLinks) === JSON.stringify(myLinks), `${srcLinks.length} vs ${myLinks.length}`);
} else {
  console.log('(source copy not in scratch folder; skipped the direct source comparison)');
}

// ---- links ----
const links = [...html.matchAll(/<a href="([^"]+)" class="problem-link">([^<]*)<\/a>/g)].map((m) => ({ href: m[1], text: m[2].replace(/&amp;/g, '&') }));
ok('all example links are leetcode.com/problems URLs', links.every((l) => /^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/.test(l.href)));
ok('every link text starts with its number', links.every((l) => /^\d+\. \S/.test(l.text)));
const otherHrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => !h.startsWith('https://leetcode.com/problems/'));
ok('only one other link (author profile)', otherHrefs.length === 1 && otherHrefs[0] === 'https://www.linkedin.com/in/shrinath-torangi/', otherHrefs.join(','));

// ---- meta.json ----
const meta = JSON.parse(read(path.join(DIR, 'meta.json')));
ok('meta id/route', meta.id === 'patterns-guide' && meta.route === '/cheatsheets/patterns-guide');
ok('meta license/copyright', meta.license === 'MIT' && meta.copyright === 'Copyright (c) 2025 K A R M A ☯️');
ok('meta urls', meta.sourceUrl === 'https://thetorangi.github.io/DSA-cheat-sheet/' && meta.repoUrl === 'https://github.com/thetorangi/DSA-cheat-sheet');
ok('meta retrieved date', /^\d{4}-\d{2}-\d{2}$/.test(meta.retrieved));
ok('meta title/description', typeof meta.title === 'string' && meta.title.length > 5 && typeof meta.description === 'string' && meta.description.length > 20);
ok('meta tables', meta.tables === 3, String(meta.tables));
ok('meta problemLinks', meta.problemLinks === links.length, `${meta.problemLinks} vs ${links.length}`);
ok('meta 2 groups', Array.isArray(meta.groups) && meta.groups.length === 2);
const nos: number[] = (meta.groups ?? []).flatMap((g: { patterns: { no: number }[] }) => g.patterns.map((p) => p.no));
ok('meta lists patterns 1..50 in order', nos.length === 50 && nos.every((n, i) => n === i + 1), nos.join(','));
const names: string[] = (meta.groups ?? []).flatMap((g: { patterns: { name: string }[] }) => g.patterns.map((p) => p.name));
const htmlNames = [...html.matchAll(/<td class="pattern-name">([^<]*)<\/td>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
ok('meta names match the table', JSON.stringify(names) === JSON.stringify(htmlNames));
ok('group sizes 31 + 19', meta.groups?.[0]?.patterns?.length === 31 && meta.groups?.[1]?.patterns?.length === 19);

// ---- sanitization ----
const bad = [/<script/i, /<\/script/i, /<iframe/i, /<object/i, /<embed/i, /<link\b/i, /<style\b/i, /<img\b/i, /<button\b/i, /\son[a-z]+\s*=/i, /javascript:/i, /src\s*=\s*["']?https?:/i];
for (const re of bad) ok(`html free of ${re}`, !re.test(html));
const css = read(path.join(DIR, 'original.scoped.css'));
ok('scoped css has no @import/url()', !/@import|url\(/i.test(css));
const ownCss = read(path.join(ROOT, 'src/styles-cs-patterns-guide.css'));
ok('own css has no @import/url(http', !/@import|url\(/i.test(ownCss));

// ---- CSS scoping: every selector lives under .cs-pg ----
const selectorsOf = (text: string) => {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: string[] = [];
  for (const m of stripped.matchAll(/([^{}@;]+)\{/g)) {
    if (/^\s*(media|supports)\b/.test(m[1])) continue; // at-rule preludes (the "@" is excluded from the match)
    out.push(...m[1].split(',').map((s) => s.trim()).filter(Boolean));
  }
  return out.filter((s) => !/^\d+%$|^(from|to)$/.test(s));
};
for (const s of selectorsOf(css)) ok(`original css selector scoped: ${s}`, s === '.cs-pg' || s.startsWith('.cs-pg ') || s.startsWith('.cs-pg:'));
for (const s of selectorsOf(ownCss)) ok(`own css selector scoped: ${s}`, /\.cs-pg\b/.test(s));

// ---- licensing ----
const lic = read(path.join(DIR, 'LICENSE.txt'));
ok('LICENSE is the MIT text with the copyright line', lic.startsWith('MIT License') && lic.includes('Copyright (c) 2025 K A R M A ☯️') && lic.includes('Permission is hereby granted, free of charge'));
const notice = read(path.join(DIR, 'NOTICE.md'));
for (const frag of ['https://thetorangi.github.io/DSA-cheat-sheet/', 'https://github.com/thetorangi/DSA-cheat-sheet', 'MIT License', 'Copyright (c) 2025 K A R M A ☯️', 'Retrieved:', 'What we changed', 'Third-party assets']) {
  ok(`NOTICE mentions ${frag}`, notice.includes(frag));
}

// ---- page component: lazy content, attribution, no third-party requests ----
const wrapper = read(path.join(ROOT, 'src/pages/cheatsheets/PatternsGuidePage.tsx'));
ok('page wrapper lazy-loads the viewer (no static css/content in the main bundle)', /lazy\(\(\) => import\('\.\/patterns-guide\/PatternsGuideViewer'\)\)/.test(wrapper) && !/\.css|import\.meta\.glob/.test(wrapper));
const page = read(path.join(ROOT, 'src/pages/cheatsheets/patterns-guide/PatternsGuideViewer.tsx'));
ok('page loads fragments lazily via import.meta.glob', /import\.meta\.glob[^)]*patterns-guide\/\*\.html/.test(page) && !/from ['"][^'"]*\.html/.test(page));
ok('page has attribution + credits link + back link', page.includes('MIT License') && page.includes('/cheatsheets/credits') && page.includes('to="/cheatsheets"'));
ok('page PDF button uses window.print()', page.includes('window.print()'));
ok('page uses the shared chip matcher', page.includes('chipSlugFor') && page.includes('/problem/'));
ok('page makes no CDN calls', !/cdn|unpkg|jsdelivr|googleapis|cdnjs/i.test(page + ownCss));

// ---- value-add chips ----
const matches = links.filter((l) => chipSlugFor(l.text) !== null);
const bySlug = new Map(ALL_ENTRIES.map((e) => [e.slug, e]));
let independent = 0;
for (const l of links) {
  const n = /^(\d+)\./.exec(l.text)![1];
  const hit = ALL_ENTRIES.find((e) => e.id === n && PROBLEMS.has(e.slug));
  if (hit) independent++;
  const slug = chipSlugFor(l.text);
  ok(`chip decision for "${l.text}" agrees with catalog+registry`, (slug !== null) === !!hit);
  if (slug) {
    ok(`chip slug ${slug} is animated`, PROBLEMS.has(slug));
    ok(`chip slug ${slug} is a catalog entry with id ${n}`, bySlug.get(slug)?.id === n);
  }
}
ok('chip count equals number of matching links', matches.length === independent, `${matches.length} vs ${independent}`);
ok('some chips exist', matches.length > 0);
ok('animatedByNumber only maps animated problems', [...animatedByNumber().values()].every((s) => PROBLEMS.has(s)));

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log(
  `patterns-guide OK: ${got.tables} tables, ${got.rows} rows (${got.patternRows} patterns 1-50 + ${got.complexityRows} complexity), ` +
    `${got.problemLinks} problem links (+${got.plainSpans} plain items), ${got.li} list items; ${matches.length} of ${links.length} links get a "▶ viz" chip (${new Set(matches.map((l) => chipSlugFor(l.text))).size} distinct problems).`,
);
