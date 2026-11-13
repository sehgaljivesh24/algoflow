/**
 * Whole-feature check for the imported cheatsheet collections.   Run:  node scripts/check-cs-all.mts
 *  - sanitisation of every *.html under src/content/cheatsheets (no scripts, handlers, external fetches, unscoped CSS)
 *  - manifests (meta.json), NOTICE.md and LICENSE.txt of every collection
 *  - content parity with the sources (pattern-index 24/267/43, patterns-guide 50/3, the-only 18 guides)
 *  - fonts under public/fonts/cheatsheets <= 400 KB each
 *  - no CDN imports / hosts in src/pages and src/styles-cs-*.css
 *  - package.json and package-lock.json identical to the pre-task backup
 * Exits non-zero on any failure.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const content = join(root, 'src', 'content', 'cheatsheets');
const BACKUP = 'c:\\Users\\jivsehgal\\Downloads\\D - Animator - backup (before cheatsheets)';

let failures = 0;
let warnings = 0;
const fail = (msg: string) => { failures++; console.log(`FAIL  ${msg}`); };
const warn = (msg: string) => { warnings++; console.log(`WARN  ${msg}`); };
const ok = (cond: unknown, msg: string) => { if (!cond) fail(msg); };
const rel = (p: string) => relative(root, p).replace(/\\/g, '/');

function walk(dir: string, filter: (p: string) => boolean, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* CSS scoping                                                         */
/* ------------------------------------------------------------------ */

const BARE = /(^|[\s>+~(,])(body|html|:root|\*)(?![\w-])/;
/** `:root[data-theme='light'] .cs-pi …` is a scoped selector; strip the attribute-qualified root prefix first. */
const stripRootPrefix = (sel: string) => sel.replace(/^(:root|html|body)(\[[^\]]*\]|:[\w-]+(\([^)]*\))?)+\s+/, '');

/** Returns the offending selectors of a stylesheet (selectors that would leak outside a `.cs-` wrapper). */
function unscopedSelectors(cssRaw: string): string[] {
  const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, '');
  const bad: string[] = [];
  let i = 0;
  let start = 0;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '{') {
      const prelude = css.slice(start, i).trim();
      if (prelude && !prelude.startsWith('@') && !/^(from|to|\d+(\.\d+)?%)(\s*,\s*(from|to|\d+(\.\d+)?%))*$/i.test(prelude)) {
        for (const raw of prelude.split(',')) {
          const sel = raw.trim();
          if (!sel) continue;
          // html:has(.cs-x) only matches while the viewer's wrapper is on the page, so it cannot leak
          if (/^(html|body|:root)(\[[^\]]*\])*:has\(\s*\.cs-/.test(sel)) continue;
          const core = stripRootPrefix(sel);
          if (BARE.test(` ${core}`) && !core.startsWith('.cs-')) bad.push(sel);
          else if (BARE.test(` ${sel}`) && !sel.includes('.cs-')) bad.push(sel);
        }
      }
      start = i + 1;
    } else if (ch === '}' || ch === ';') {
      start = i + 1;
    }
    i++;
  }
  return bad;
}

/* ------------------------------------------------------------------ */
/* HTML sanitisation                                                   */
/* ------------------------------------------------------------------ */

const TAG_RE = /<([a-zA-Z][^\s/>]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const ATTR_RE = /([^\s=/>"']+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;
const decode = (s: string) => s.replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);?/g, (_, d) => String.fromCharCode(Number(d))).replace(/&(colon|tab|newline);/gi, (_, n) => ({ colon: ':', tab: '\t', newline: '\n' } as Record<string, string>)[n.toLowerCase()]);
const EXTERNAL = /^\s*(https?:)?\/\//i;

function checkHtml(file: string) {
  const html = readFileSync(file, 'utf8');
  const name = rel(file);
  const at = (msg: string) => fail(`${name}: ${msg}`);

  if (/<script/i.test(html)) at('contains <script');
  if (/<(iframe|object|embed)\b/i.test(html)) at('contains <iframe>/<object>/<embed>');

  for (const tm of html.matchAll(TAG_RE)) {
    const tag = tm[1].toLowerCase();
    for (const am of tm[2].matchAll(ATTR_RE)) {
      const attr = am[1].toLowerCase();
      const val = decode((am[2] ?? '').replace(/^["']|["']$/g, '')).replace(/[\u0000-\u0020]+/g, '');
      if (/^on[a-z]+$/.test(attr)) at(`inline handler ${attr}= on <${tag}>`);
      if (/^javascript:/i.test(val) || /^(vbscript|data:text\/html)/i.test(val)) at(`dangerous URL in ${attr}= on <${tag}>: ${val.slice(0, 40)}`);
      if (tag === 'link' && attr === 'href' && (EXTERNAL.test(val) || /^https?:/i.test(val))) at(`<link href="${val.slice(0, 60)}"> is an external resource`);
      if (tag === 'img' && attr === 'src' && /^https?:/i.test(val)) at(`<img src="${val.slice(0, 60)}"> points to an external URL`);
      if (attr === 'src' && tag !== 'img' && (EXTERNAL.test(val) || /^https?:/i.test(val))) at(`<${tag} src="${val.slice(0, 60)}"> is an external resource`);
      if (attr === 'srcset' && /https?:\/\//i.test(val)) at(`<${tag} srcset> points to an external URL`);
      if (attr === 'style' && /(@import|url\(\s*['"]?\s*(https?:)?\/\/)/i.test(val)) at(`inline style on <${tag}> fetches an external resource`);
    }
  }

  for (const sm of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    const css = sm[1];
    if (/@import/i.test(css)) at('<style> uses @import');
    if (/url\(\s*['"]?\s*(https?:)?\/\//i.test(css)) at('<style> references an external url()');
    for (const sel of unscopedSelectors(css)) at(`<style> has an unscoped selector "${sel.slice(0, 80)}" (wrap it in a .cs- class)`);
  }
}

const htmlFiles = walk(content, (p) => p.endsWith('.html'));
htmlFiles.forEach(checkHtml);

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

type Json = Record<string, any>;
const HOLDERS: Record<string, { name: string; year: string; line: RegExp }> = {
  'pattern-index': { name: 'roxoi', year: '2026', line: /Copyright \(c\) 2026 roxoi/i },
  'patterns-guide': { name: 'K A R M A', year: '2025', line: /Copyright \(c\) 2025 K A R M A/i },
  'the-only': { name: 'Malhar', year: '2025', line: /Copyright \(c\) 2025 Malhar/i },
};
const asArr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const sum = (xs: any[], f: (x: any) => unknown) => xs.reduce((n, x) => n + (Number(f(x)) || 0), 0);

for (const [id, h] of Object.entries(HOLDERS)) {
  const dir = join(content, id);
  if (!existsSync(dir)) { fail(`${id}: folder src/content/cheatsheets/${id}/ is missing (importer has not run)`); continue; }

  // manifest
  let meta: Json | undefined;
  const metaPath = join(dir, 'meta.json');
  if (!existsSync(metaPath)) fail(`${id}: meta.json is missing`);
  else {
    try { meta = JSON.parse(readFileSync(metaPath, 'utf8')); } catch (e) { fail(`${id}: meta.json is not valid JSON (${(e as Error).message})`); }
  }
  if (meta) {
    ok(meta.id === id, `${id}: meta.id must be "${id}", got ${JSON.stringify(meta.id)}`);
    for (const f of ['title', 'description', 'sourceUrl', 'repoUrl', 'copyright', 'retrieved', 'route']) {
      ok(typeof meta[f] === 'string' && meta[f].trim(), `${id}: meta.${f} is missing or empty`);
    }
    ok(meta.license === 'MIT', `${id}: meta.license must be "MIT", got ${JSON.stringify(meta.license)}`);
    ok(/^https?:\/\//.test(meta.sourceUrl ?? ''), `${id}: meta.sourceUrl must be an http(s) URL`);
    ok(/^https?:\/\//.test(meta.repoUrl ?? ''), `${id}: meta.repoUrl must be an http(s) URL`);
    ok(/^\d{4}-\d{2}-\d{2}$/.test(meta.retrieved ?? ''), `${id}: meta.retrieved must be YYYY-MM-DD`);
    ok(typeof meta.route === 'string' && meta.route.startsWith('/cheatsheets/'), `${id}: meta.route must start with /cheatsheets/`);
    ok(typeof meta.copyright === 'string' && meta.copyright.includes(h.name) && meta.copyright.includes(h.year), `${id}: meta.copyright should name "${h.name}" and ${h.year}`);

    // parity
    if (id === 'pattern-index') {
      const s = asArr(meta.sections);
      ok(s.length === 24, `${id}: expected 24 sections, manifest has ${s.length}`);
      const code = sum(s, (x) => x.codeBlocks);
      const tables = sum(s, (x) => x.tables);
      ok(code === 267, `${id}: expected 267 code blocks, manifest has ${code}`);
      ok(tables === 43, `${id}: expected 43 tables, manifest has ${tables}`);
      for (const x of s) ok(x && typeof x.id === 'string' && x.id && typeof x.title === 'string', `${id}: a section entry lacks id/title`);
      // independent cross-check on the shipped HTML (advisory: markup details are the importer's choice)
      const files = walk(dir, (p) => p.endsWith('.html'));
      if (files.length) {
        const all = files.map((f) => readFileSync(f, 'utf8')).join('\n');
        const t = (all.match(/<table\b/gi) ?? []).length;
        const p = (all.match(/<pre\b/gi) ?? []).length;
        if (t !== 43) warn(`${id}: HTML contains ${t} <table>, manifest says 43`);
        if (p !== 267) warn(`${id}: HTML contains ${p} <pre>, manifest says 267 code blocks`);
      }
    } else if (id === 'patterns-guide') {
      const g = asArr(meta.groups);
      const n = sum(g, (x) => asArr(x.patterns).length);
      ok(n === 50, `${id}: expected 50 patterns across groups, manifest has ${n}`);
      const t = Array.isArray(meta.tables) ? meta.tables.length : Number(meta.tables);
      ok(t === 3, `${id}: expected 3 tables, manifest has ${JSON.stringify(meta.tables)}`);
      const files = walk(dir, (p) => p.endsWith('.html'));
      if (files.length) {
        const tc = (files.map((f) => readFileSync(f, 'utf8')).join('\n').match(/<table\b/gi) ?? []).length;
        if (tc !== 3) warn(`${id}: HTML contains ${tc} <table>, manifest says 3`);
      }
    } else {
      const c = asArr(meta.categories);
      const guides = c.flatMap((x) => asArr(x.guides));
      ok(guides.length === 18, `${id}: expected 18 guides in categories, manifest has ${guides.length}`);
      const slugs = new Set(guides.map((x) => x.slug));
      ok(slugs.size === guides.length, `${id}: duplicate guide slugs`);
      for (const x of guides) ok(typeof x.slug === 'string' && x.slug && typeof x.title === 'string', `${id}: a guide lacks slug/title`);
    }
  }

  // notice + license
  const noticePath = join(dir, 'NOTICE.md');
  if (!existsSync(noticePath)) fail(`${id}: NOTICE.md is missing`);
  else {
    const n = readFileSync(noticePath, 'utf8');
    ok(n.trim().length > 0, `${id}: NOTICE.md is empty`);
    ok(n.includes(h.name), `${id}: NOTICE.md does not name the copyright holder "${h.name}"`);
    ok(n.includes(h.year), `${id}: NOTICE.md does not mention ${h.year}`);
    ok(/MIT/.test(n), `${id}: NOTICE.md does not mention the MIT License`);
  }
  const licPath = join(dir, 'LICENSE.txt');
  if (!existsSync(licPath)) fail(`${id}: LICENSE.txt is missing`);
  else {
    const l = readFileSync(licPath, 'utf8').replace(/^\uFEFF/, '');
    ok(/^\s*MIT License/.test(l), `${id}: LICENSE.txt must start with "MIT License"`);
    ok(h.line.test(l), `${id}: LICENSE.txt lacks the copyright line "Copyright (c) ${h.year} ${h.name}…"`);
    ok(/Permission is hereby granted, free of charge/.test(l), `${id}: LICENSE.txt lacks the MIT permission text`);
  }
}

// unexpected folders are fine, but flag stray collections without a manifest
if (existsSync(content)) {
  for (const name of readdirSync(content)) {
    const p = join(content, name);
    if (statSync(p).isDirectory() && !(name in HOLDERS)) warn(`unknown collection folder src/content/cheatsheets/${name}/ (not covered by the hub)`);
  }
}

/* ------------------------------------------------------------------ */
/* Fonts                                                               */
/* ------------------------------------------------------------------ */

for (const f of walk(join(root, 'public', 'fonts', 'cheatsheets'), () => true)) {
  const kb = statSync(f).size / 1024;
  ok(kb <= 400, `${rel(f)} is ${kb.toFixed(0)} KB (> 400 KB limit)`);
}

/* ------------------------------------------------------------------ */
/* No CDNs, no third-party requests in our own sources                 */
/* ------------------------------------------------------------------ */

const CDN_HOSTS = /(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|code\.jquery\.com|cdn\.tailwindcss\.com|stackpath\.bootstrapcdn\.com|ajax\.googleapis\.com)/i;
const IMPORT_URL = /(\bfrom\s*|\bimport\s*\(?\s*|@import\s+(url\()?\s*)['"]?(https?:)?\/\//;
const sources = [
  ...walk(join(root, 'src', 'pages'), (p) => /\.(tsx?|mts|css)$/.test(p)),
  ...walk(join(root, 'src'), (p) => /styles-cs-[\w-]+\.css$/.test(p)),
];
for (const f of new Set(sources)) {
  const text = readFileSync(f, 'utf8');
  // comments may legitimately name a CDN (e.g. "highlight.js was loaded from cdnjs"); only code counts
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok(!IMPORT_URL.test(code), `${rel(f)} imports from a URL (CDN) — bundle or self-host instead`);
  const m = code.match(CDN_HOSTS);
  ok(!m, `${rel(f)} mentions the CDN host ${m?.[0]} — the pages must make no third-party requests`);
  if (f.endsWith('.css') && /styles-cs-/.test(f) && !/styles-cs-hub\.css$/.test(f)) {
    for (const sel of unscopedSelectors(text)) fail(`${rel(f)}: unscoped selector "${sel.slice(0, 80)}" (wrap it in the collection's .cs- class)`);
    if (/url\(\s*['"]?\s*https?:\/\//i.test(text)) fail(`${rel(f)}: url() points to an external host`);
  }
}

/* ------------------------------------------------------------------ */
/* package.json / package-lock.json untouched                          */
/* ------------------------------------------------------------------ */

const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
if (!existsSync(BACKUP)) warn(`backup folder not found, cannot compare package files: ${BACKUP}`);
else {
  for (const f of ['package.json', 'package-lock.json']) {
    const a = join(root, f);
    const b = join(BACKUP, f);
    if (!existsSync(b)) warn(`${f} not in the backup`);
    else ok(existsSync(a) && sha(a) === sha(b), `${f} differs from the backup (it must not be modified)`);
  }
}

/* ------------------------------------------------------------------ */

console.log(`\nchecked ${htmlFiles.length} HTML file(s), ${Object.keys(HOLDERS).length} collections`);
if (warnings) console.log(`${warnings} warning(s)`);
if (failures) {
  console.log(`${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('check-cs-all OK');
