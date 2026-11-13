/**
 * Parity, sanitisation and licensing checks for the imported DSA Pattern Index
 * (source: https://roxoi.github.io/dsa-cheatsheet/, MIT, Copyright (c) 2026 roxoi).
 * Run: node scripts/check-cs-pattern-index.mts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src/content/cheatsheets/pattern-index');
const FONTS = path.join(ROOT, 'public/fonts/cheatsheets/pattern-index');
const CSS = path.join(ROOT, 'src/styles-cs-pattern-index.css');

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  if (!cond) {
    failed++;
    console.error(`FAIL ${name}${extra ? ' :: ' + extra : ''}`);
  }
};
const read = (f: string) => fs.readFileSync(f, 'utf8');
const count = (s: string, re: RegExp) => (s.match(re) || []).length;

// ---- what the source page contains (numbers counted from https://roxoi.github.io/dsa-cheatsheet/) ----
const SECTION_IDS = [
  'operator-precedence', 'sorting', 'arrays', 'binary-search', 'strings', 'linked-list', 'recursion', 'bit-manipulation',
  'stacks-queues', 'sliding-window', 'heaps', 'greedy', 'binary-trees', 'bst', 'graphs', 'dp', 'tries', 'strings-advanced',
  'segment-trees', 'math-theory', 'advanced-dp', 'advanced-union-find', 'tree-patterns', 'master-index',
];
const SOURCE = { sections: 24, h2: 24, h3: 73, h4: 267, tables: 43, rows: 378, th: 92, td: 732, pre: 267, copyButtons: 267, navLinks: 24, br: 13, sup: 3, strong: 4, em: 7 };

// ---- manifest ----
const metaPath = path.join(CONTENT, 'meta.json');
ok('meta.json exists', fs.existsSync(metaPath));
const meta = JSON.parse(read(metaPath));
ok('meta: id', meta.id === 'pattern-index');
ok('meta: title/description', typeof meta.title === 'string' && meta.title.length > 0 && typeof meta.description === 'string' && meta.description.length > 20);
ok('meta: sourceUrl', meta.sourceUrl === 'https://roxoi.github.io/dsa-cheatsheet/');
ok('meta: repoUrl', meta.repoUrl === 'https://github.com/roxoi/dsa-cheatsheet');
ok('meta: license', meta.license === 'MIT');
ok('meta: copyright', meta.copyright === 'Copyright (c) 2026 roxoi');
ok('meta: retrieved date', /^\d{4}-\d{2}-\d{2}$/.test(meta.retrieved));
ok('meta: route', meta.route === '/cheatsheets/pattern-index');
ok('meta: 24 sections', Array.isArray(meta.sections) && meta.sections.length === SOURCE.sections, String(meta.sections?.length));
ok('meta: section ids and order', JSON.stringify(meta.sections.map((s: { id: string }) => s.id)) === JSON.stringify(SECTION_IDS));
ok('meta: 24 sections, each with id/number/title/codeBlocks/tables', meta.sections.every((s: Record<string, unknown>) => typeof s.id === 'string' && typeof s.number === 'string' && typeof s.title === 'string' && Number.isInteger(s.codeBlocks) && Number.isInteger(s.tables)));
ok('meta: numbers 00..22 then infinity', meta.sections.slice(0, 23).every((s: { number: string }, i: number) => s.number === String(i).padStart(2, '0')) && meta.sections[23].number === '\u221e');
ok('meta: divider before segment-trees only', meta.sections.filter((s: { divider: string | null }) => s.divider).map((s: { id: string }) => s.id).join() === 'segment-trees');
ok('meta: every section has estHeight', meta.sections.every((s: { estHeight: number }) => s.estHeight > 100));

// ---- fragments ----
const total = { h2: 0, h3: 0, h4: 0, tables: 0, rows: 0, th: 0, td: 0, pre: 0, copy: 0, br: 0, sup: 0, strong: 0, em: 0, hljsSpans: 0 };
let anyBytes = 0;
for (const s of meta.sections) {
  const f = path.join(CONTENT, `${s.id}.html`);
  ok(`section file exists: ${s.id}.html`, fs.existsSync(f));
  if (!fs.existsSync(f)) continue;
  const html = read(f);
  anyBytes += html.length;
  ok(`${s.id}: not empty`, html.length > 500);
  const h2 = count(html, /<h2[\s>]/g);
  const tables = count(html, /<table[\s>]/g);
  const pre = count(html, /<pre[\s>]/g);
  ok(`${s.id}: exactly one h2 and a topic-head`, h2 === 1 && html.includes('class="topic-head"'));
  ok(`${s.id}: heading matches manifest`, html.includes(`<span class="topic-num">${s.number}</span>`));
  ok(`${s.id}: tables match manifest`, tables === s.tables, `${tables} vs ${s.tables}`);
  ok(`${s.id}: code blocks match manifest`, pre === s.codeBlocks, `${pre} vs ${s.codeBlocks}`);
  ok(`${s.id}: every table is wrapped in .table-scroll`, count(html, /<div class="table-scroll"><table/g) === tables);
  ok(`${s.id}: every code block has a copy button`, count(html, /<button class="copy-btn" type="button" aria-label="Copy code">copy<\/button>/g) === pre);
  ok(`${s.id}: code blocks are pre-highlighted C++`, count(html, /<pre><code class="hljs language-cpp">/g) === pre);
  total.h2 += h2;
  total.h3 += count(html, /<h3[\s>]/g);
  total.h4 += count(html, /<h4[\s>]/g);
  total.tables += tables;
  total.rows += count(html, /<tr[\s>]/g);
  total.th += count(html, /<th[\s>]/g);
  total.td += count(html, /<td[\s>]/g);
  total.pre += pre;
  total.copy += count(html, /class="copy-btn"/g);
  total.br += count(html, /<br\s*\/?>/g);
  total.sup += count(html, /<sup[\s>]/g);
  total.strong += count(html, /<strong[\s>]/g);
  total.em += count(html, /<em[\s>]/g);
  total.hljsSpans += count(html, /<span class="hljs-/g);
}
ok('parity: sections', meta.sections.length === SOURCE.sections);
ok('parity: h2', total.h2 === SOURCE.h2, String(total.h2));
ok('parity: h3 (block labels)', total.h3 === SOURCE.h3, String(total.h3));
ok('parity: h4 (example titles)', total.h4 === SOURCE.h4, String(total.h4));
ok('parity: 43 tables', total.tables === SOURCE.tables, String(total.tables));
ok('parity: table rows', total.rows === SOURCE.rows, String(total.rows));
ok('parity: th cells', total.th === SOURCE.th, String(total.th));
ok('parity: td cells', total.td === SOURCE.td, String(total.td));
ok('parity: 267 <pre> blocks', total.pre === SOURCE.pre, String(total.pre));
ok('parity: copy buttons', total.copy === SOURCE.copyButtons, String(total.copy));
ok('parity: br / sup / strong / em', total.br === SOURCE.br && total.sup === SOURCE.sup && total.strong === SOURCE.strong && total.em === SOURCE.em, JSON.stringify(total));
ok('manifest totals equal fragment totals', meta.sections.reduce((a: number, s: { tables: number }) => a + s.tables, 0) === total.tables && meta.sections.reduce((a: number, s: { codeBlocks: number }) => a + s.codeBlocks, 0) === total.pre);
ok('highlight.js spans present', total.hljsSpans > 5000, String(total.hljsSpans));
ok('content is substantial', anyBytes > 500_000, String(anyBytes));

// hero
const heroPath = path.join(CONTENT, 'hero.html');
ok('hero.html exists', fs.existsSync(heroPath));
const hero = read(heroPath);
ok('hero: heading and meta line', hero.includes('Twenty-two advanced patterns, one unified filing system for recognizing any problem.') && hero.includes('class="meta"'));

// ---- sanitisation (every fragment is rendered with dangerouslySetInnerHTML) ----
const fragFiles = [...meta.sections.map((s: { id: string }) => `${s.id}.html`), 'hero.html'];
const BAD_TAG = /<\s*(script|style|link|iframe|frame|object|embed|applet|noscript|template|form|base|meta|img|picture|source|video|audio|svg|canvas|input|textarea|select)\b/i;
for (const f of fragFiles) {
  const html = read(path.join(CONTENT, f));
  ok(`${f}: no script/style/link/iframe/object/embed/img tags`, !BAD_TAG.test(html));
  ok(`${f}: no inline event handlers`, !/<[a-z][^<>]*\son[a-z]+\s*=/i.test(html));
  ok(`${f}: no javascript:/data:/vbscript: urls`, !/(javascript|vbscript|data)\s*:/i.test(html.replace(/&lt;[^]*?&gt;/g, '')) || !/(href|src)\s*=\s*["']\s*(javascript|vbscript|data):/i.test(html));
  ok(`${f}: no src/srcset/poster/action attributes`, !/<[a-z][^<>]*\s(src|srcset|poster|action|formaction|srcdoc)\s*=/i.test(html));
  const hrefs = [...html.matchAll(/<a\b[^<>]*\shref\s*=\s*"([^"]*)"/gi)].map((m) => m[1]);
  ok(`${f}: links are in-page anchors or http(s)`, hrefs.every((h) => h.startsWith('#') || /^https?:\/\//.test(h)));
  ok(`${f}: no inline style attributes with url()`, !/style\s*=\s*"[^"]*url\(/i.test(html));
  ok(`${f}: no external asset URLs`, !/(src|srcset|poster|data|href)\s*=\s*"https?:\/\/[^"]*\.(png|jpe?g|gif|svg|webp|css|js|woff2?|ttf)\b/i.test(html));
}

// ---- stylesheet ----
ok('css exists', fs.existsSync(CSS));
const css = read(CSS);
ok('css: no @import', !/@import/i.test(css));
ok('css: no remote urls', !/url\(\s*['"]?(https?:)?\/\//i.test(css));
const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].replace(/['"]/g, ''));
ok('css: has @font-face rules with local font urls', urls.length >= 20 && urls.every((u) => u.startsWith('/fonts/cheatsheets/pattern-index/')), String(urls.length));
for (const u of new Set(urls)) ok(`font file exists: ${u}`, fs.existsSync(path.join(FONTS, path.basename(u))));
ok('css: font licenses shipped next to the fonts', fs.existsSync(path.join(FONTS, 'OFL-Newsreader.txt')) && fs.existsSync(path.join(FONTS, 'OFL-IBMPlexMono.txt')));
// every rule selector must be scoped under .cs-pi (or be html:has(.cs-pi) for document-level behaviour)
{
  const stripped = css.replace(/\/\*[^]*?\*\//g, '');
  let depth = 0;
  let buf = '';
  const stack: string[] = [];
  let unscoped = 0;
  let rules = 0;
  for (const ch of stripped) {
    if (ch === '{') {
      const head = buf.trim();
      buf = '';
      const parent = stack[stack.length - 1] || '';
      stack.push(head);
      depth++;
      if (head.startsWith('@')) continue;
      if (parent.startsWith('@font-face')) continue;
      rules++;
      for (const sel of head.split(',')) {
        const s = sel.trim();
        if (!(s.startsWith('.cs-pi') || s.startsWith('html:has(.cs-pi)') || s.startsWith('body:has(.cs-pi)'))) {
          unscoped++;
          console.error('  unscoped selector:', s);
        }
      }
    } else if (ch === '}') {
      stack.pop();
      depth--;
      buf = '';
    } else if (ch === ';') buf = '';
    else buf += ch;
  }
  ok('css: brace balance', depth === 0);
  ok('css: has many rules', rules > 100, String(rules));
  ok('css: every selector is scoped under .cs-pi', unscoped === 0, String(unscoped));
}
ok('css: original look tokens kept', css.includes('--bg: #030303') && css.includes('--pine: #4FA88C') && css.includes("'Newsreader'") && css.includes("'IBM Plex Mono'") && css.includes('.hljs-keyword'));

// ---- licensing ----
const notice = read(path.join(CONTENT, 'NOTICE.md'));
const license = read(path.join(CONTENT, 'LICENSE.txt'));
ok('LICENSE.txt: MIT text verbatim', license.startsWith('MIT License') && license.includes('Copyright (c) 2026 roxoi') && license.includes('Permission is hereby granted, free of charge') && license.includes('THE SOFTWARE IS PROVIDED "AS IS"'));
ok('NOTICE: source + repo + license + copyright', notice.includes('https://roxoi.github.io/dsa-cheatsheet/') && notice.includes('https://github.com/roxoi/dsa-cheatsheet') && notice.includes('MIT License') && notice.includes('Copyright (c) 2026 roxoi'));
ok('NOTICE: retrieved date matches manifest', notice.includes(`Retrieved: ${meta.retrieved}`));
ok('NOTICE: changes listed', /What we changed/i.test(notice) && /scoped/i.test(notice) && /self-hosted/i.test(notice) && /sanitised/i.test(notice));
ok('NOTICE: third-party assets named with copyright lines', /Newsreader/.test(notice) && /IBM Plex Mono/.test(notice) && /highlight\.js/.test(notice) && /OFL|Open Font License/.test(notice) && /BSD-3-Clause/.test(notice) && /Copyright 2020 The Newsreader Project Authors/.test(notice) && /IBM Corp/.test(notice) && /Ivan Sagalaev/.test(notice));
for (const f of ['OFL-Newsreader.txt', 'OFL-IBMPlexMono.txt', 'highlightjs-LICENSE.txt']) ok(`third-party/${f} exists`, fs.existsSync(path.join(CONTENT, 'third-party', f)));

// ---- bundle hygiene: the feature must stay out of the main bundle ----
const page = read(path.join(ROOT, 'src/pages/cheatsheets/PatternIndexPage.tsx'));
ok('page: viewer is lazy-loaded', /lazy\(\(\)\s*=>\s*import\('\.\/pattern-index\/PatternIndexViewer'\)\)/.test(page));
ok('page: no static import of css/content/viewer', !/^import .*(styles-cs-pattern-index|content\/cheatsheets|PatternIndexViewer)/m.test(page));
const contentTs = read(path.join(ROOT, 'src/pages/cheatsheets/pattern-index/content.ts'));
ok('content.ts: loads through lazy import.meta.glob', /import\.meta\.glob<string>\('\/src\/content\/cheatsheets\/pattern-index\/\*\.html', \{ query: '\?raw', import: 'default' \}\)/.test(contentTs) && !/eager\s*:\s*true/.test(contentTs));
const srcFiles: string[] = [];
(function walk(dir: string) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(e.name)) srcFiles.push(p);
  }
})(path.join(ROOT, 'src'));
for (const f of srcFiles) {
  const t = read(f);
  if (/^import\s[^;]*['"][^'"]*content\/cheatsheets\/pattern-index\/[^'"]*\.(html|json)(\?raw)?['"]/m.test(t)) ok(`no static import of pattern-index content in ${path.relative(ROOT, f)}`, false);
  if (!f.includes('pattern-index') && /styles-cs-pattern-index/.test(t)) ok(`styles-cs-pattern-index imported outside the viewer: ${path.relative(ROOT, f)}`, false);
}
const viewer = read(path.join(ROOT, 'src/pages/cheatsheets/pattern-index/PatternIndexViewer.tsx'));
ok('viewer: imports the stylesheet itself', viewer.includes("import '../../../styles-cs-pattern-index.css'"));
ok('viewer: copy buttons use event delegation', /onClick=\{onMainClick\}/.test(viewer) && /closest\?\.\('button\.copy-btn'\)/.test(viewer));
ok('viewer: attribution footer and links', /Content .*roxoi/.test(viewer) && viewer.includes('MIT License') && viewer.includes('/cheatsheets/credits') && viewer.includes('AlgoFlow') && viewer.includes('meta.sourceUrl'));

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log(`pattern-index OK: ${meta.sections.length} sections, ${total.tables} tables, ${total.rows} rows, ${total.pre} code blocks (${total.hljsSpans} highlighted spans), ${(anyBytes / 1024).toFixed(0)} KiB of HTML, ${urls.length} font faces`);
