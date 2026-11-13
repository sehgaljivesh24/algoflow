/**
 * Checks the imported "The Only Cheatsheets" collection (run: node scripts/check-cs-the-only.mts).
 * Re-counts the generated HTML with plain regexes (an engine independent of the importer's cheerio/mdast pair) and
 * compares against the Markdown-AST counts recorded in parity.json; also checks sanitization, licensing files,
 * anchors, links, scoped CSS and that no third-party network request is made by the viewer.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'src/content/cheatsheets/the-only');
const PUB = path.join(ROOT, 'public/fonts/cheatsheets/the-only');
const fails: string[] = [];
let checks = 0;
function ok(cond: unknown, msg: string) {
  checks++;
  if (!cond) fails.push(msg);
}
const read = (f: string) => fs.readFileSync(f, 'utf8');
const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

// ---------- manifest
const meta = JSON.parse(read(path.join(DIR, 'meta.json')));
ok(meta.id === 'the-only', 'meta.id');
for (const k of ['title', 'description', 'sourceUrl', 'repoUrl', 'license', 'copyright', 'retrieved', 'route']) ok(typeof meta[k] === 'string' && meta[k], `meta.${k}`);
ok(meta.license === 'MIT' && meta.copyright === 'Copyright (c) 2025 Malhar', 'meta license/copyright');
ok(meta.route === '/cheatsheets/the-only', 'meta.route');
ok(/^\d{4}-\d\d-\d\d$/.test(meta.retrieved), 'meta.retrieved format');
ok(Array.isArray(meta.categories) && meta.categories.length >= 7, 'meta.categories');
const guides: { slug: string; title: string; sourcePath: string; words: number }[] = meta.categories.flatMap((c: { guides: never[] }) => c.guides);
ok(guides.length === 18, `18 guides (found ${guides.length})`);
ok(new Set(guides.map((g) => g.slug)).size === 18, 'unique slugs');
for (const g of guides) {
  ok(typeof g.title === 'string' && g.title && g.sourcePath.endsWith('.md') && g.words > 100, `guide meta ${g.slug}`);
  ok(path.posix.basename(g.sourcePath, '.md') === g.slug, `slug matches source name ${g.slug}`);
}
const htmlFiles = fs.readdirSync(DIR).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, '')).sort();
ok(JSON.stringify(htmlFiles) === JSON.stringify([...guides.map((g) => g.slug), 'landing'].sort()), `html files = guides + landing (${htmlFiles.join(',')})`);

// ---------- licensing
const lic = read(path.join(DIR, 'LICENSE.txt'));
ok(/^MIT License/.test(lic) && lic.includes('Copyright (c) 2025 Malhar'), 'LICENSE.txt holder');
ok(lic.includes('Permission is hereby granted, free of charge') && lic.includes('THE SOFTWARE IS PROVIDED "AS IS"') && lic.includes('copies or substantial portions of the Software'), 'LICENSE.txt full MIT text');
const notice = read(path.join(DIR, 'NOTICE.md'));
for (const s of ['https://malharchauhan7.github.io/the-only-cheatsheets/', 'https://github.com/malharchauhan7/the-only-cheatsheets', 'MIT License', 'Copyright (c) 2025 Malhar', meta.retrieved, 'Architects Daughter', 'Kimberly Geswein', 'highlight.js', 'Ivan Sagalaev', 'normalize.css', 'CC0'])
  ok(notice.includes(s), `NOTICE.md mentions ${s}`);
for (const f of ['OFL-ArchitectsDaughter.txt', 'highlight.js-BSD-3-Clause.txt', 'normalize.css-MIT.txt', 'Architect-theme-CC0.txt']) ok(fs.existsSync(path.join(DIR, 'third-party', f)), `third-party/${f}`);
ok(read(path.join(DIR, 'third-party/OFL-ArchitectsDaughter.txt')).includes('SIL OPEN FONT LICENSE'), 'OFL text');
ok(read(path.join(DIR, 'third-party/highlight.js-BSD-3-Clause.txt')).includes('Redistribution and use'), 'BSD text');

// ---------- assets
for (const f of ['architects-daughter-latin.woff2', 'architects-daughter-latin-ext.woff2', 'OFL-ArchitectsDaughter.txt', 'img/header-bg.jpg', 'img/body-bg.jpg', 'img/sidebar-bg.jpg', 'img/github-button.png', 'img/download-button.png', 'img/dotdot.png'])
  ok(fs.existsSync(path.join(PUB, f)) && fs.statSync(path.join(PUB, f)).size > 500, `public asset ${f}`);
ok(!fs.existsSync(path.join(DIR, '..', 'the-only', 'downloads')), 'no downloads/ folder imported');
const tooBig = fs.readdirSync(DIR).filter((f) => fs.statSync(path.join(DIR, f)).size > 400_000);
ok(tooBig.length === 0, `no oversized fragments (${tooBig.join(',')})`);

// ---------- per-guide: counts, sanitization, anchors
const parity = JSON.parse(read(path.join(DIR, 'parity.json'))).parity;
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
const FORBIDDEN: [string, RegExp][] = [
  ['<script', /<script\b/i],
  ['<iframe/object/embed', /<(iframe|object|embed|applet|frame|link|meta|base|form|style|svg)\b/i],
  ['inline on* handler', /<[a-z][^>]*\son[a-z]+\s*=/i],
  ['javascript: url', /(href|src)\s*=\s*["']?\s*(javascript|vbscript|data):/i],
  ['style attribute', /<[a-z][^>]*\sstyle\s*=/i],
  ['srcdoc', /<[a-z][^>]*\ssrcdoc\s*=/i],
];
const KNOWN_DEAD: Record<string, string[]> = { javascript: ['#modules'], 'data-structure-algorithms': ['#common-patterns'] };
for (const name of htmlFiles) {
  const html = read(path.join(DIR, `${name}.html`));
  for (const [label, re] of FORBIDDEN) ok(!re.test(html), `${name}: contains ${label}`);
  // images must be local
  for (const m of html.matchAll(/<img\b[^>]*\ssrc\s*=\s*"([^"]*)"/gi)) ok(m[1].startsWith('/fonts/cheatsheets/the-only/'), `${name}: remote image ${m[1]}`);
  ok(count(html, /<img\b/gi) <= 1, `${name}: unexpected images`);
  // second, independent count (regex over generated HTML) versus the Markdown AST numbers
  const out = {
    headings: count(html, /<h[1-6][\s>]/g),
    tables: count(html, /<table[\s>]/g),
    tableRows: count(html, /<tr[\s>]/g),
    codeBlocks: count(html, /<pre[\s>]/g),
    listItems: count(html, /<li[\s>]/g),
    links: count(html, /<a\s[^>]*href=/g),
    rules: count(html, /<hr[\s/>]/g),
  };
  const exp = parity[name].source;
  for (const k of Object.keys(out) as (keyof typeof out)[]) ok(out[k] === exp[k], `${name}: ${k} html ${out[k]} vs markdown ${exp[k]}`);
  ok(count(html, /highlighter-rouge/g) === out.codeBlocks, `${name}: every code block wrapped`);
  // ids unique, anchors resolve
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  ok(new Set(ids).size === ids.length, `${name}: duplicate ids`);
  const idset = new Set(ids);
  const dead = [...new Set([...html.matchAll(/href="(#[^"]*)"/g)].map((m) => m[1]))].filter((h) => !idset.has(decode(h.slice(1))));
  ok(JSON.stringify(dead) === JSON.stringify(KNOWN_DEAD[name] ?? []), `${name}: dead in-page anchors ${dead.join(' ')}`);
  if (name !== 'landing') {
    ok(/^<h1 id="[^"]+">/.test(html), `${name}: starts with h1`);
    ok(html.includes('github.com/malharchauhan7/the-only-cheatsheets/raw/main/downloads/pdfs/') && !html.includes('gdurl.com'), `${name}: Download PDF link points to the upstream file`);
  }
}
// highlighting really happened (a real language block has token spans); tabs in the Makefile block survived
const dev = read(path.join(DIR, 'developer-guide-framework.html'));
ok(dev.includes('\t@echo'), 'Makefile tabs preserved');
ok(count(read(path.join(DIR, 'dsa-patterns.html')), /<span class="hljs-/g) > 500, 'dsa-patterns highlighted');
ok(count(read(path.join(DIR, 'sql-postgresql-cheatsheet.html')), /hljs-keyword/g) > 200, 'sql highlighted');
ok(!htmlFiles.some((n) => //.test(read(path.join(DIR, `${n}.html`)))), 'no tab sentinel leaked');

// ---------- landing
const landing = read(path.join(DIR, 'landing.html'));
for (const s of ['Quick Navigation', 'Available Cheatsheets', 'Core Development Guide', 'Web Development', 'Frontend', 'Backend', 'Data Structures and Algorithms', 'Database Management System', 'System Design', 'Git &amp; GitHub', 'Aptitude guide', 'Features', 'How to Use', 'Contributing', 'License']) ok(landing.includes(s), `landing has "${s}"`);
const guideLinks = [...landing.matchAll(/href="(\/cheatsheets\/the-only\/[^"]+)"/g)].map((m) => m[1].split('/').pop());
ok(guideLinks.length === 18 && guides.every((g) => guideLinks.includes(g.slug)), `landing links to all 18 guides (${guideLinks.length})`);
ok(!/href="(?!https?:)[^"]*\.md"/.test(landing), 'landing has no .md links');
ok(landing.includes('cs-badge-stars') && !landing.includes('komarev.com') && !landing.includes('shields.io'), 'landing badges are local');
const lp = parity.landing;
ok(lp.output.headings === lp.source.headings && lp.output.listItems === lp.source.listItems && lp.output.links === lp.source.links, 'landing parity');

// ---------- CSS: scoped, self-hosted, no third-party requests
const css = read(path.join(ROOT, 'src/styles-cs-the-only.css')).replace(/\/\*[\s\S]*?\*\//g, '');
ok(!/@import/.test(css) && !/https?:\/\//.test(css.replace(/xmlns='http:\/\/www\.w3\.org\/2000\/svg'/g, '')), 'CSS has no remote urls/imports');
ok(!/googleapis|gstatic/.test(css), 'CSS: no Google Fonts');
const unscoped: string[] = [];
for (const m of css.matchAll(/([^{}]+)\{/g)) {
  const sel = m[1].trim();
  if (sel.startsWith('@')) continue;
  for (const part of sel.split(',')) if (!part.trim().startsWith('.cs-to')) unscoped.push(part.trim());
}
// font-face descriptors live inside @font-face blocks and have no selector text before '{'
ok(unscoped.length === 0, `unscoped selectors: ${unscoped.slice(0, 5).join(' | ')}`);
for (const m of css.matchAll(/url\(([^)]+)\)/g)) {
  const u = m[1].replace(/^["']|["']$/g, '');
  if (u.startsWith('data:')) continue;
  ok(u.startsWith('/fonts/cheatsheets/the-only/') && fs.existsSync(path.join(ROOT, 'public', u)), `CSS asset ${u} exists`);
}
const tsxFiles = ['src/pages/cheatsheets/TheOnlyIndexPage.tsx', 'src/pages/cheatsheets/TheOnlyPage.tsx', ...fs.readdirSync(path.join(ROOT, 'src/pages/cheatsheets/the-only')).map((f) => `src/pages/cheatsheets/the-only/${f}`)];
for (const f of tsxFiles) {
  const src = read(path.join(ROOT, f));
  ok(!/\bfetch\(|XMLHttpRequest|googleapis|<script|<img\b|<iframe/.test(src), `${f}: no runtime network/embeds`);
}
const frame = read(path.join(ROOT, 'src/pages/cheatsheets/the-only/Frame.tsx'));
ok(frame.includes('Content &copy; Malhar') && frame.includes('MIT License') && frame.includes('/cheatsheets/credits'), 'attribution footer present');
ok(frame.includes('to="/cheatsheets"'), 'back to AlgoFlow link');
ok(read(path.join(ROOT, 'src/pages/cheatsheets/TheOnlyPage.tsx')).includes('lazy('), 'guide page loads lazily');

console.log(`check-cs-the-only: ${checks} checks, ${fails.length} failed`);
if (fails.length) {
  for (const f of fails) console.log('  FAIL ' + f);
  process.exit(1);
}
console.log('check-cs-the-only: OK');
