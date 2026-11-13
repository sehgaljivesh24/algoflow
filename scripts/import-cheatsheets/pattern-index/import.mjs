/**
 * Importer for https://roxoi.github.io/dsa-cheatsheet/ (repo roxoi/dsa-cheatsheet, MIT, "Copyright (c) 2026 roxoi").
 * Idempotent. Dependencies live OUTSIDE the project (see README.md). Usage:
 *   node scripts/import-cheatsheets/pattern-index/import.mjs [--offline] [--date YYYY-MM-DD]
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const DEPS = process.env.CS_IMPORT_DEPS || path.join(os.tmpdir(), 'cs-import-pattern-index');
const CACHE = path.join(DEPS, 'cache');
const require = createRequire(path.join(DEPS, 'x.js'));
let cheerio, hljs, cpp, postcss, selectorParser;
try {
  cheerio = require('cheerio');
  hljs = require('highlight.js/lib/core');
  cpp = require('highlight.js/lib/languages/cpp');
  postcss = require('postcss');
  selectorParser = require('postcss-selector-parser');
} catch (e) {
  console.error(`Missing dependencies in ${DEPS}. Run: cd "${DEPS}" && npm install cheerio highlight.js@11.9.0 postcss postcss-selector-parser`);
  throw e;
}
hljs.registerLanguage('cpp', cpp);
const HLJS_VERSION = require('highlight.js/package.json').version;

const args = process.argv.slice(2);
const OFFLINE = args.includes('--offline');
const dateArg = args.includes('--date') ? args[args.indexOf('--date') + 1] : null;

const SOURCE_URL = 'https://roxoi.github.io/dsa-cheatsheet/';
const REPO_URL = 'https://github.com/roxoi/dsa-cheatsheet';
const RAW = 'https://raw.githubusercontent.com/roxoi/dsa-cheatsheet/main/';
const COPYRIGHT = 'Copyright (c) 2026 roxoi';
const SCOPE = '.cs-pi';
const UA = 'AlgoFlow-cheatsheet-importer/1.0';

const OUT_CONTENT = path.join(ROOT, 'src/content/cheatsheets/pattern-index');
const OUT_FONTS = path.join(ROOT, 'public/fonts/cheatsheets/pattern-index');
const OUT_CSS = path.join(ROOT, 'src/styles-cs-pattern-index.css');
const FONT_URL_PREFIX = '/fonts/cheatsheets/pattern-index/';

fs.mkdirSync(CACHE, { recursive: true });

// ---------------------------------------------------------------- download helpers
async function fetchCached(url, name, { binary = false, headers = {} } = {}) {
  const file = path.join(CACHE, name);
  if (fs.existsSync(file) && (OFFLINE || process.env.CS_USE_CACHE)) return file;
  if (OFFLINE) throw new Error(`--offline but ${name} is not cached`);
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      return file;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`download failed: ${url}: ${lastErr}`);
}
const readText = (f) => fs.readFileSync(f, 'utf8');
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const norm = (s) => s.replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- 1. fetch everything
const htmlFile = await fetchCached(RAW + 'index.html', 'index.html');
const licenseFile = await fetchCached(RAW + 'LICENSE', 'LICENSE');
const sourceHtml = readText(htmlFile);
const sourceSha = sha256(fs.readFileSync(htmlFile));

const $ = cheerio.load(sourceHtml);

// Google Fonts stylesheet that the original links (same family/weights as in its <link>)
const gfHref = $('link[href*="fonts.googleapis.com/css2"]').attr('href');
if (!gfHref) throw new Error('could not find the Google Fonts link in the source');
const fontsCssFile = await fetchCached(gfHref.replace(/&amp;/g, '&'), 'fonts.css', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' } });
const fontsCss = readText(fontsCssFile);

// font + library license texts (from their own repositories / packages)
const licNewsreader = readText(await fetchCached('https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/OFL.txt', 'OFL-Newsreader.txt'));
const licPlex = readText(await fetchCached('https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/OFL.txt', 'OFL-IBMPlexMono.txt'));
const licHljs = readText(path.join(DEPS, 'node_modules/highlight.js/LICENSE'));
const firstCopyright = (txt) => (txt.split(/\r?\n/).find((l) => /^\s*copyright/i.test(l)) || '').trim();
const cpNewsreader = firstCopyright(licNewsreader);
const cpPlex = firstCopyright(licPlex);
const cpHljs = firstCopyright(licHljs);
if (!cpNewsreader || !cpPlex || !cpHljs) throw new Error('could not read third-party copyright lines');

// ---------------------------------------------------------------- 2. fonts (self-hosted)
fs.mkdirSync(OUT_FONTS, { recursive: true });
const faceRe = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
const fontFaces = [];
const fontFiles = new Map(); // remote url -> local name
for (const m of fontsCss.matchAll(faceRe)) {
  const subset = m[1];
  const body = m[2];
  const get = (prop) => (body.match(new RegExp(prop + '\\s*:\\s*([^;]+);')) || [])[1]?.trim();
  const family = get('font-family').replace(/['"]/g, '');
  const style = get('font-style');
  const weight = get('font-weight');
  const range = get('unicode-range');
  const remote = body.match(/url\(([^)]+)\)/)[1].replace(/['"]/g, '');
  const local = `${family.toLowerCase().replace(/\s+/g, '-')}-${style}-${weight}-${subset}.woff2`;
  if (!fontFiles.has(remote)) fontFiles.set(remote, local); // several weights can share one (variable) file
  fontFaces.push({ family, style, weight, range, local: fontFiles.get(remote), subset });
}
if (fontFaces.length < 20) throw new Error('unexpectedly few @font-face blocks: ' + fontFaces.length);
let fontBytes = 0;
for (const [remote, local] of fontFiles) {
  const f = await fetchCached(remote, 'font-' + local, { binary: true });
  fs.copyFileSync(f, path.join(OUT_FONTS, local));
  fontBytes += fs.statSync(f).size;
}
fs.writeFileSync(path.join(OUT_FONTS, 'OFL-Newsreader.txt'), licNewsreader);
fs.writeFileSync(path.join(OUT_FONTS, 'OFL-IBMPlexMono.txt'), licPlex);

// ---------------------------------------------------------------- 3. CSS: scope under .cs-pi
const origCss = $('head style').first().text();
if (!origCss.includes('--sidebar-w')) throw new Error('did not find the original <style> block');

function scopeOne(sel) {
  const s = sel.trim();
  if (/^:root\b/.test(s)) return [s.replace(/^:root/, SCOPE)];
  if (/^body\b/.test(s)) return [s.replace(/^body/, SCOPE)];
  if (/^html\b/.test(s)) return [s.replace(/^html/, `html:has(${SCOPE})`)];
  if (s === '*') return [SCOPE, `${SCOPE} *`];
  if (s.startsWith('::-webkit-scrollbar')) return [`html:has(${SCOPE})${s}`, `${SCOPE} ${s}`];
  return [`${SCOPE} ${s}`];
}
function scopeSelectors(selStr) {
  const out = [];
  selectorParser((root) => {
    root.each((one) => {
      for (const r of scopeOne(one.toString())) out.push(r);
    });
  }).processSync(selStr);
  return out.join(', ');
}
const root = postcss.parse(origCss);
root.walkRules((rule) => {
  if (rule.parent && rule.parent.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
  rule.selector = scopeSelectors(rule.selector);
});
const scopedCss = root.toString().replace(/^\n+/, '').replace(/^ {8}/gm, '');
// every top-level selector must now be scoped
{
  let bad = 0;
  postcss.parse(scopedCss).walkRules((r) => {
    for (const s of r.selectors) if (!s.startsWith(SCOPE) && !s.startsWith(`html:has(${SCOPE})`)) { bad++; console.error('UNSCOPED selector:', s); }
  });
  if (bad) throw new Error('unscoped selectors left in CSS');
}

const fontFaceCss = fontFaces
  .map((f) => `/* ${f.family} ${f.style} ${f.weight} - ${f.subset} */\n@font-face {\n  font-family: '${f.family}';\n  font-style: ${f.style};\n  font-weight: ${f.weight};\n  font-display: swap;\n  src: url(${FONT_URL_PREFIX}${f.local}) format('woff2');\n  unicode-range: ${f.range};\n}`)
  .join('\n');
const extraCss = readText(path.join(HERE, 'extra.css'));
const cssHeader = `/*
 * DSA Pattern Index viewer styles.
 * Generated by scripts/import-cheatsheets/pattern-index/import.mjs - do not edit by hand (edit extra.css and re-run).
 * Derived from the stylesheet of ${SOURCE_URL} (${REPO_URL}),
 * MIT License, ${COPYRIGHT}. See src/content/cheatsheets/pattern-index/NOTICE.md and LICENSE.txt.
 * Changes: every selector is scoped under ${SCOPE} (:root/html/body/* mapped onto the wrapper), fonts are self-hosted.
 * Fonts: Newsreader and IBM Plex Mono, SIL Open Font License 1.1 (see public/fonts/cheatsheets/pattern-index/).
 */
`;
fs.writeFileSync(OUT_CSS, `${cssHeader}\n${fontFaceCss}\n\n/* ================= original stylesheet, scoped ================= */\n${scopedCss}\n\n${extraCss}`);

// ---------------------------------------------------------------- 4. content: sections
// 4a. navigation (labels differ slightly from the section headings)
const nav = [];
let pendingDivider = null;
$('aside.sidebar nav').children().each((_, el) => {
  const $el = $(el);
  if ($el.hasClass('nav-divider')) { pendingDivider = norm($el.text()); return; }
  if ($el.hasClass('nav-link')) {
    nav.push({ id: $el.attr('data-id'), navNumber: norm($el.find('.nav-num').text()), navTitle: norm($el.clone().children('.nav-num').remove().end().text()), divider: pendingDivider });
    pendingDivider = null;
  }
});

// 4b. sanitising + transforming one parsed section
const stats = { scripts: 0, handlers: 0, badUrls: 0, media: 0, styleAttrs: 0, copyButtons: 0, highlighted: 0, wrappedTables: 0 };
const BANNED = 'script, style, link, iframe, frame, frameset, object, embed, applet, noscript, template, form, base, meta, img, picture, source, video, audio, track, svg, canvas, input, textarea, select';

function sanitize($root, $$) {
  $root.find(BANNED).each((_, el) => {
    if (/^(img|picture|source|video|audio|track|svg|canvas)$/i.test(el.tagName)) stats.media++;
    if (el.tagName.toLowerCase() === 'script') stats.scripts++;
    $$(el).remove();
  });
  $root.find('*').addBack().each((_, el) => {
    for (const name of Object.keys(el.attribs || {})) {
      const val = el.attribs[name];
      if (/^on/i.test(name)) { delete el.attribs[name]; stats.handlers++; continue; }
      if (name === 'style') {
        if (/url\s*\(|expression|javascript:/i.test(val)) { delete el.attribs[name]; stats.styleAttrs++; }
        continue;
      }
      if (['href', 'src', 'xlink:href', 'action', 'formaction', 'srcset', 'poster', 'data', 'srcdoc'].includes(name)) {
        const v = val.trim().toLowerCase();
        const internal = v.startsWith('#');
        const externalLink = el.tagName.toLowerCase() === 'a' && name === 'href' && /^https?:\/\//.test(v);
        if (!(internal || externalLink)) { delete el.attribs[name]; stats.badUrls++; }
        if (externalLink) { el.attribs.rel = 'noopener noreferrer'; el.attribs.target = '_blank'; }
      }
    }
  });
}

function processSection($sec, $$) {
  sanitize($sec, $$);
  // copy buttons: keep the markup, drop the inline handler (the viewer uses event delegation)
  $sec.find('button.copy-btn').each((_, el) => {
    el.attribs = { class: 'copy-btn', type: 'button', 'aria-label': 'Copy code' };
    $$(el).text('copy');
    stats.copyButtons++;
  });
  // pre-highlight C++ exactly like hljs.highlightAll() would in the browser
  $sec.find('pre code').each((_, el) => {
    const $c = $$(el);
    const code = $c.text();
    const lang = /language-(\w+)/.exec($c.attr('class') || '')?.[1] || 'cpp';
    const res = hljs.highlight(code, { language: lang === 'cpp' ? 'cpp' : 'cpp', ignoreIllegals: true });
    $c.html(res.value);
    $c.attr('class', `hljs language-${lang}`);
    stats.highlighted++;
  });
  // the original script wraps each table in a div.table-scroll at load time; bake it in
  $sec.find('table').each((_, el) => {
    $$(el).wrap('<div class="table-scroll"></div>');
    stats.wrappedTables++;
  });
}

// estimated rendered height (px, desktop) used by the viewer as a placeholder until the section loads
function estimateHeight($$, $sec) {
  let h = 190; // header + intro + padding
  h += $sec.find('h3.block-label').length * 62;
  $sec.find('table').each((_, t) => { h += 44 + $$(t).find('tbody tr').length * 46; });
  $sec.find('div.example').each((_, ex) => {
    const lines = ($$(ex).find('pre code').text().match(/\n/g) || []).length + 1;
    h += 74 + lines * 21.6 + 36 + ($$(ex).find('.ex-note').length ? 30 : 0);
  });
  return Math.round(h);
}

// measured heights of the original at 1400px width (section-heights.json); heuristic estimate when an id is missing
const MEASURED = JSON.parse(readText(path.join(HERE, 'section-heights.json')));
const topicEls = $('main section.topic').toArray();
const sectionsMeta = [];
const srcCounts = { sections: 0, h2: 0, h3: 0, h4: 0, p: 0, tables: 0, tr: 0, th: 0, td: 0, pre: 0, br: 0, em: 0, strong: 0, sup: 0, codeInline: 0, links: 0 };
const srcText = {};
fs.mkdirSync(OUT_CONTENT, { recursive: true });
// remove stale fragments from earlier runs
for (const f of fs.readdirSync(OUT_CONTENT)) if (f.endsWith('.html')) fs.unlinkSync(path.join(OUT_CONTENT, f));

for (const el of topicEls) {
  const $sec = $(el);
  const id = $sec.attr('id');
  // source-side counts BEFORE any transformation
  srcCounts.sections++;
  srcCounts.h2 += $sec.find('h2').length;
  srcCounts.h3 += $sec.find('h3').length;
  srcCounts.h4 += $sec.find('h4').length;
  srcCounts.p += $sec.find('p').length;
  srcCounts.tables += $sec.find('table').length;
  srcCounts.tr += $sec.find('tr').length;
  srcCounts.th += $sec.find('th').length;
  srcCounts.td += $sec.find('td').length;
  srcCounts.pre += $sec.find('pre').length;
  srcCounts.br += $sec.find('br').length;
  srcCounts.em += $sec.find('em').length;
  srcCounts.strong += $sec.find('strong').length;
  srcCounts.sup += $sec.find('sup').length;
  srcCounts.codeInline += $sec.find('code').not('pre code').length;
  srcCounts.links += $sec.find('a').length;
  srcText[id] = norm($sec.clone().find('button.copy-btn').remove().end().text());

  const navEntry = nav.find((n) => n.id === id);
  if (!navEntry) throw new Error('section without nav link: ' + id);
  const number = norm($sec.find('.topic-num').first().text());
  const title = norm($sec.find('h2').first().text());
  // The original markup has an unclosed <code> (operator-precedence section), so a browser nests sections 01..23 inside
  // one <code> element (which is why most of that page is set in the monospace font). Keep that look: record the wrapper.
  const parentTag = el.parent.name;
  if (parentTag !== 'main' && parentTag !== 'code') throw new Error('unexpected section parent: ' + parentTag);
  const codeBlocks = $sec.find('pre').length;
  const tables = $sec.find('table').length;

  processSection($sec, $);
  const html = $sec.html().replace(/^\s*\n/, '').replace(/\s+$/, '') + '\n';
  const file = `${id}.html`;
  fs.writeFileSync(path.join(OUT_CONTENT, file), html);
  const rowCount = $sec.find('tbody tr').length;
  sectionsMeta.push({ id, number, title, wrapper: parentTag === 'main' ? null : parentTag, navTitle: navEntry.navTitle, navNumber: navEntry.navNumber, divider: navEntry.divider, codeBlocks, tables, rows: rowCount, file, bytes: Buffer.byteLength(html), estHeight: MEASURED[id] ?? estimateHeight($, $sec) });
}
if (nav.length !== topicEls.length || nav.some((n, i) => n.id !== topicEls[i].attribs.id)) throw new Error('nav links and sections are not in the same order');

// 4c. hero
const $hero = $('main .hero').first();
srcText.hero = norm($hero.text());
sanitize($hero, $);
const heroHtml = $hero.html().replace(/^\s*\n/, '').replace(/\s+$/, '') + '\n';
fs.writeFileSync(path.join(OUT_CONTENT, 'hero.html'), heroHtml);
const heroTitle = norm($hero.find('h1').text());

// ---------------------------------------------------------------- 5. manifest, notice, license
const metaPath = path.join(OUT_CONTENT, 'meta.json');
let retrieved = dateArg || new Date().toISOString().slice(0, 10);
if (!dateArg && fs.existsSync(metaPath)) {
  try {
    const old = JSON.parse(readText(metaPath));
    if (old.sourceSha256 === sourceSha && old.retrieved) retrieved = old.retrieved; // unchanged source: keep the date
  } catch { /* ignore */ }
}
const meta = {
  id: 'pattern-index',
  title: 'DSA Pattern Index',
  description: 'DSA pattern recognition cheat-sheet: 24 topics of clue-to-technique tables and worked C++ examples, from sorting and arrays to segment trees and tree rerooting.',
  sourceUrl: SOURCE_URL,
  repoUrl: REPO_URL,
  license: 'MIT',
  copyright: COPYRIGHT,
  retrieved,
  route: '/cheatsheets/pattern-index',
  pageTitle: norm($('title').text()),
  sourceSha256: sourceSha,
  hero: { title: heroTitle, file: 'hero.html' },
  sections: sectionsMeta,
};
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
fs.writeFileSync(path.join(OUT_CONTENT, 'LICENSE.txt'), fs.readFileSync(licenseFile));
const tp = path.join(OUT_CONTENT, 'third-party');
fs.mkdirSync(tp, { recursive: true });
fs.writeFileSync(path.join(tp, 'OFL-Newsreader.txt'), licNewsreader);
fs.writeFileSync(path.join(tp, 'OFL-IBMPlexMono.txt'), licPlex);
fs.writeFileSync(path.join(tp, 'highlightjs-LICENSE.txt'), licHljs);

const notice = `# Notice - DSA Pattern Index

This folder holds an imported copy of the cheat-sheet **"DSA Pattern Recognition - Cheat-Sheet"**.

- Source: ${SOURCE_URL}
- Repository: ${REPO_URL}
- License: **MIT License** (full text in \`LICENSE.txt\`, copied verbatim from the repository's \`LICENSE\`)
- Copyright: **${COPYRIGHT}**
- Retrieved: ${retrieved}  (index.html sha256 \`${sourceSha.slice(0, 16)}...\`)

## What we changed
The content and look of the original page were kept; only the packaging changed:
- split the single HTML page into one HTML fragment per section (${sectionsMeta.length} sections + the hero), loaded lazily by the viewer;
- sanitised the markup (no scripts, no inline event handlers, no external assets) and removed the inline \`onclick\` of the copy buttons (the viewer attaches its own handler);
- pre-highlighted the C++ code blocks at import time with highlight.js ${HLJS_VERSION} (the original highlights them in the browser with the same library and language, version 11.9.0), so no script or CDN is needed;
- scoped the original stylesheet under \`.cs-pi\` (\`:root\`, \`html\`, \`body\`, \`*\` rules were mapped onto that wrapper) and added a few small rules (table scroll wrapper, "back to AlgoFlow" link, attribution footer);
- self-hosted the fonts instead of loading them from Google Fonts;
- kept a quirk of the original markup: it contains an unclosed \`<code>\` element in the first section, so browsers (and our viewer) nest sections 01-23 inside one \`<code>\` element, which is why most of the page is set in the monospace font;
- re-implemented the page's behaviour (copy buttons, filter box, active-section highlighting, mobile menu, smooth anchor scrolling) in React/TypeScript.

## Third-party assets
| Asset | License | Copyright line (from the asset's own license file) |
|---|---|---|
| Newsreader (font, woff2 files in \`public/fonts/cheatsheets/pattern-index/\`) | SIL Open Font License 1.1 (\`third-party/OFL-Newsreader.txt\`) | ${cpNewsreader} |
| IBM Plex Mono (font, woff2 files in \`public/fonts/cheatsheets/pattern-index/\`) | SIL Open Font License 1.1 (\`third-party/OFL-IBMPlexMono.txt\`) | ${cpPlex} |
| highlight.js ${HLJS_VERSION} (used at import time only; its generated \`hljs-*\` class names appear in the HTML) | BSD-3-Clause (\`third-party/highlightjs-LICENSE.txt\`) | ${cpHljs} |

Re-run the importer with \`node scripts/import-cheatsheets/pattern-index/import.mjs\` (see the README next to it).
`;
fs.writeFileSync(path.join(OUT_CONTENT, 'NOTICE.md'), notice);

// ---------------------------------------------------------------- 6. parity report (source vs written output)
const out$ = (html) => cheerio.load(`<div id="r">${html}</div>`)('#r');
const outCounts = { sections: 0, h2: 0, h3: 0, h4: 0, p: 0, tables: 0, tr: 0, th: 0, td: 0, pre: 0, br: 0, em: 0, strong: 0, sup: 0, codeInline: 0, links: 0 };
const mismatchText = [];
let totalBytes = 0, copyButtons = 0, hljsSpans = 0;
for (const s of sectionsMeta) {
  const html = readText(path.join(OUT_CONTENT, s.file));
  totalBytes += Buffer.byteLength(html);
  const $r = out$(html);
  outCounts.sections++;
  for (const k of ['h2', 'h3', 'h4', 'p', 'table', 'tr', 'th', 'td', 'pre', 'br', 'em', 'strong', 'sup']) outCounts[k === 'table' ? 'tables' : k] += $r.find(k).length;
  outCounts.codeInline += $r.find('code').not('pre code').length;
  outCounts.links += $r.find('a').length;
  copyButtons += $r.find('button.copy-btn').length;
  hljsSpans += $r.find('span[class^="hljs-"]').length;
  const t = norm($r.clone().find('button.copy-btn').remove().end().text());
  if (t !== srcText[s.id]) mismatchText.push(s.id);
}
const heroOut = norm(out$(readText(path.join(OUT_CONTENT, 'hero.html'))).text());
if (heroOut !== srcText.hero.replace(/^\s+/, '')) mismatchText.push('hero');

const lines = [];
lines.push('DSA Pattern Index import - parity report');
lines.push(`source: ${SOURCE_URL}  (sha256 ${sourceSha.slice(0, 16)}...)  retrieved ${retrieved}`);
lines.push('');
lines.push('metric                source   imported');
for (const k of Object.keys(srcCounts)) {
  const flag = srcCounts[k] === outCounts[k] ? '' : '   <-- MISMATCH';
  lines.push(`${k.padEnd(20)} ${String(srcCounts[k]).padStart(7)} ${String(outCounts[k]).padStart(10)}${flag}`);
}
const navLinks = $('aside.sidebar .nav-link').length;
lines.push(`${'nav links'.padEnd(20)} ${String(navLinks).padStart(7)} ${String(nav.length).padStart(10)}${navLinks === nav.length ? '' : '   <-- MISMATCH'}`);
const srcCopy = $('main button.copy-btn').length;
lines.push(`${'copy buttons'.padEnd(20)} ${String(srcCopy).padStart(7)} ${String(copyButtons).padStart(10)}${srcCopy === copyButtons ? '' : '   <-- MISMATCH'}`);
lines.push(`${'sections text equal'.padEnd(20)} ${String(topicEls.length).padStart(7)} ${String(topicEls.length - mismatchText.filter((x) => x !== 'hero').length).padStart(10)}${mismatchText.length ? '   <-- MISMATCH: ' + mismatchText.join(', ') : ''}`);
lines.push('');
lines.push(`highlighted code blocks: ${stats.highlighted}  (hljs spans: ${hljsSpans})`);
lines.push(`sanitiser removed: scripts=${stats.scripts} inline handlers=${stats.handlers} bad urls=${stats.badUrls} media=${stats.media} style attrs=${stats.styleAttrs}`);
lines.push(`tables wrapped in .table-scroll: ${stats.wrappedTables}`);
lines.push(`fonts: ${fontFiles.size} woff2 files, ${(fontBytes / 1024).toFixed(0)} KiB;  content: ${sectionsMeta.length} fragments, ${(totalBytes / 1024).toFixed(0)} KiB`);
lines.push('');
lines.push('section             num  tables  rows  code  est.height');
for (const s of sectionsMeta) lines.push(`${s.id.padEnd(20)}${s.number.padStart(3)} ${String(s.tables).padStart(7)} ${String(s.rows).padStart(5)} ${String(s.codeBlocks).padStart(5)} ${String(s.estHeight).padStart(10)}`);
const report = lines.join('\n') + '\n';
console.log(report);
fs.writeFileSync(path.join(HERE, 'parity-report.txt'), report);
const failed = Object.keys(srcCounts).some((k) => srcCounts[k] !== outCounts[k]) || mismatchText.length || navLinks !== nav.length || srcCopy !== copyButtons;
if (failed) { console.error('PARITY FAILED'); process.exit(1); }
console.log('parity OK');
