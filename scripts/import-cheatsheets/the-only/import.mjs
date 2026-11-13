/**
 * Importer for "The Only Cheatsheets" (https://malharchauhan7.github.io/the-only-cheatsheets/,
 * repo malharchauhan7/the-only-cheatsheets, MIT, "Copyright (c) 2025 Malhar").
 *
 *   node scripts/import-cheatsheets/the-only/import.mjs [--refresh]
 *
 * Dependencies are installed in a scratch folder outside the project (see README.md). Output is committed:
 *   src/content/cheatsheets/the-only/*  and  public/fonts/cheatsheets/the-only/*
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const SCRATCH = process.env.CS_IMPORT_DIR || path.join(os.tmpdir(), 'cs-import-the-only');
const REFRESH = process.argv.includes('--refresh');

const OUT = path.join(ROOT, 'src/content/cheatsheets/the-only');
const PUB = path.join(ROOT, 'public/fonts/cheatsheets/the-only');
const PUB_URL = '/fonts/cheatsheets/the-only';

const REPO = 'malharchauhan7/the-only-cheatsheets';
const REPO_URL = `https://github.com/${REPO}`;
const RAW = `https://raw.githubusercontent.com/${REPO}/main/`;
const SITE = 'https://malharchauhan7.github.io/the-only-cheatsheets/';
const ROUTE = '/cheatsheets/the-only';
const COPYRIGHT = 'Copyright (c) 2025 Malhar';

// ---------------------------------------------------------------------------------------------- scratch + deps
if (!fs.existsSync(path.join(SCRATCH, 'node_modules'))) {
  console.error(`Scratch folder ${SCRATCH} has no node_modules. See scripts/import-cheatsheets/the-only/README.md.`);
  process.exit(2);
}
fs.copyFileSync(path.join(HERE, 'deps.template.mjs'), path.join(SCRATCH, 'deps.mjs'));
const { Marked, markedSmartypants, hljs, cheerio, fromMarkdown, gfm, gfmFromMarkdown, visit } = await import(
  pathToFileURL(path.join(SCRATCH, 'deps.mjs')).href
);
const hljsVersion = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'node_modules/highlight.js/package.json'), 'utf8')).version;

const CACHE = path.join(SCRATCH, 'raw');
async function download(url, rel) {
  const file = path.join(CACHE, rel);
  if (!REFRESH && fs.existsSync(file)) return fs.readFileSync(file);
  const r = await fetch(url, { headers: { 'User-Agent': 'algoflow-cheatsheet-importer' } });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  return buf;
}
const text = async (url, rel) => (await download(url, rel)).toString('utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');

// ---------------------------------------------------------------------------------------------- small helpers
const writeFile = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
};
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
const decodeEntities = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stripEmoji = (s) => s.replace(/[^\p{L}\p{N}&\s/.+#-]/gu, '').replace(/\s+/g, ' ').trim();

/** kramdown (GFM input, as GitHub Pages uses) heading ids: downcase, drop everything but word chars/hyphen/space/tab, spaces -> '-'. */
function kramdownId(plain) {
  return plain.toLowerCase().replace(/[^\p{Alphabetic}\p{M}\p{Nd}\p{Pc}\- \t]/gu, '').replace(/[ \t]/g, '-');
}

// ---------------------------------------------------------------------------------------------- the guide list (from the README)
const readme = await text(RAW + 'README.md', 'repo/README.md');
const contributing = await text(RAW + 'CONTRIBUTING.md', 'repo/CONTRIBUTING.md');
void contributing;

function parseCategories(md) {
  const start = md.indexOf('## Available Cheatsheets');
  const end = md.indexOf('\n## Features');
  const lines = md.slice(start, end).split('\n');
  const cats = [];
  let h3 = '';
  let cur = null;
  for (const line of lines) {
    let m;
    if ((m = /^### (.+)$/.exec(line))) {
      h3 = stripEmoji(m[1]);
      cur = { title: h3, guides: [] };
      cats.push(cur);
    } else if ((m = /^#### (.+)$/.exec(line))) {
      cur = { title: `${h3} — ${stripEmoji(m[1])}`, guides: [] };
      cats.push(cur);
    } else if ((m = /^- \[\*\*(.+?)\*\*\]\(\/([^)]+?)\.md\)(?: - (.+))?$/.exec(line))) {
      const sourcePath = m[2] + '.md';
      cur.guides.push({ slug: path.posix.basename(m[2]), title: m[1], sourcePath, description: (m[3] || '').trim() });
    } else if ((m = /^  - (.+)$/.exec(line)) && cur?.guides.length) {
      const g = cur.guides[cur.guides.length - 1];
      g.description = g.description ? `${g.description}; ${m[1]}` : m[1];
    }
  }
  return cats.filter((c) => c.guides.length);
}
const categories = parseCategories(readme);
const allGuides = categories.flatMap((c) => c.guides.map((g) => ({ ...g, category: c.title })));
if (allGuides.length !== 18) throw new Error(`expected 18 guides in README, found ${allGuides.length}`);

// ---------------------------------------------------------------------------------------------- Markdown -> HTML
// marked expands leading tabs to four spaces everywhere, which would alter tab-indented code (Makefile recipes).
// Inside fenced blocks we hide leading tabs behind a private-use sentinel and put the tabs back in the code renderer.
const TAB = String.fromCharCode(0xe000);
function protectFenceTabs(md) {
  let fence = null;
  const NL = String.fromCharCode(10);
  return md
    .split(NL)
    .map((line) => {
      const m = /^ *(`{3,}|~{3,})(.*)$/.exec(line);
      if (fence) {
        if (m && m[1][0] === fence[0] && m[1].length >= fence.length && m[2].trim() === '') fence = null;
        else return line.replace(/^\t+/, (t) => TAB.repeat(t.length));
      } else if (m && !(m[1][0] === '`' && m[2].includes('`'))) fence = m[1];
      return line;
    })
    .join(NL);
}

const LANG_ALIAS = {
  jsx: 'javascript', js: 'javascript', mjs: 'javascript', tsx: 'typescript', ts: 'typescript', vue: 'xml', html: 'xml',
  xml: 'xml', toml: 'ini', sh: 'bash', shell: 'bash', zsh: 'bash', yml: 'yaml', py: 'python', ps1: 'powershell',
  docker: 'dockerfile', md: 'markdown', gql: 'graphql', proto: 'protobuf',
};
function highlight(code, lang) {
  const name = LANG_ALIAS[lang] || lang;
  if (name && hljs.getLanguage(name)) {
    return { html: hljs.highlight(code, { language: name, ignoreIllegals: true }).value, lang: name, highlighted: true };
  }
  return { html: escapeHtml(code), lang: lang || 'plaintext', highlighted: false };
}

const stats = { removedImages: [], removedTags: {}, removedAttrs: {}, unhighlighted: {}, highlighted: {} };

function makeMarked() {
  const used = new Map();
  const marked = new Marked({ gfm: true, breaks: false });
  marked.use(markedSmartypants());
  marked.use({
    renderer: {
      heading(text, level) {
        const plain = cheerio.load(`<div>${text}</div>`, null, false)('div').text();
        let base = kramdownId(plain) || 'section';
        let id = base;
        if (used.has(base)) {
          const n = used.get(base);
          id = `${base}-${n}`;
          used.set(base, n + 1);
        } else used.set(base, 1);
        // a generated "x-1" could collide with a literal heading "x-1"; keep unique
        while (id !== base && used.has(id)) id += '_';
        if (id !== base) used.set(id, 1);
        return `<h${level} id="${id}">${text}</h${level}>\n`;
      },
      code(code, infostring) {
        const lang = ((infostring || '').trim().split(/\s+/)[0] || '').toLowerCase().replace(/[^a-z0-9_+#.-]/g, '');
        const h = highlight(code.replaceAll(TAB, String.fromCharCode(9)), lang);
        const k = lang || 'plaintext';
        (h.highlighted ? stats.highlighted : stats.unhighlighted)[k] = (h.highlighted ? stats.highlighted : stats.unhighlighted)[k] + 1 || 1;
        const cls = (lang || 'plaintext').replace(/[^a-z0-9_-]/g, '_');
        return `<div class="language-${cls} highlighter-rouge"><div class="highlight"><pre class="highlight"><code>${h.html}\n</code></pre></div></div>\n`;
      },
      table(header, body) {
        return `<div class="table-wrap"><table>\n<thead>\n${header}</thead>\n${body ? `<tbody>${body}</tbody>\n` : ''}</table></div>\n`;
      },
    },
  });
  return marked;
}

// ---------------------------------------------------------------------------------------------- sanitizer
const BAD_TAGS = 'script,style,iframe,frame,frameset,object,embed,applet,link,meta,base,form,svg,math,noscript,template,textarea,select,button';
function bump(o, k) {
  o[k] = (o[k] || 0) + 1;
}
function sanitize($, { allowLocalImgPrefix = PUB_URL } = {}) {
  $(BAD_TAGS).each((_, el) => {
    bump(stats.removedTags, el.tagName);
    $(el).remove();
  });
  $('input').each((_, el) => {
    const t = ($(el).attr('type') || '').toLowerCase();
    if (t !== 'checkbox') {
      bump(stats.removedTags, 'input');
      $(el).remove();
    } else {
      for (const a of Object.keys(el.attribs)) if (!['type', 'checked', 'disabled'].includes(a)) $(el).removeAttr(a);
      $(el).attr('disabled', '');
    }
  });
  $('img').each((_, el) => {
    const src = ($(el).attr('src') || '').trim();
    if (!src.startsWith(allowLocalImgPrefix + '/')) {
      stats.removedImages.push(src);
      $(el).remove();
    }
  });
  $('*').each((_, el) => {
    for (const [name, value] of Object.entries(el.attribs || {})) {
      const n = name.toLowerCase();
      if (n.startsWith('on') || n === 'style' || n === 'srcdoc' || n === 'formaction' || n === 'srcset') {
        bump(stats.removedAttrs, n);
        $(el).removeAttr(name);
      } else if (['href', 'src', 'xlink:href', 'action', 'poster', 'data'].includes(n)) {
        const v = value.replace(/[\u0000- \u007f-\u009f]+/g, '').toLowerCase();
        if (/^(javascript|data|vbscript|file):/.test(v)) {
          bump(stats.removedAttrs, `${n}:${v.split(':')[0]}`);
          $(el).removeAttr(name);
        }
      }
    }
  });
}

/** Decorate: external links open in a new tab; keep everything else untouched. */
function decorateLinks($) {
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (/^https?:\/\//i.test(href)) {
      $(el).attr('target', '_blank');
      $(el).attr('rel', 'noopener noreferrer');
    }
  });
}

// ---------------------------------------------------------------------------------------------- counting (two independent engines)
const mdParse = (md) => fromMarkdown(md, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });

function countFromMarkdown(md) {
  const tree = mdParse(md);
  const c = { headings: 0, tables: 0, tableRows: 0, codeBlocks: 0, listItems: 0, links: 0, images: 0, blockquotes: 0, rules: 0, inlineCode: 0, htmlNodes: 0 };
  const codes = [];
  const textParts = [];
  const htmlBits = [];
  visit(tree, (n) => {
    switch (n.type) {
      case 'heading': c.headings++; break;
      case 'table': c.tables++; break;
      case 'tableRow': c.tableRows++; break;
      case 'code': c.codeBlocks++; codes.push(n.value); break;
      case 'listItem': c.listItems++; break;
      case 'link': case 'linkReference': c.links++; break;
      case 'image': case 'imageReference': c.images++; break;
      case 'blockquote': c.blockquotes++; break;
      case 'thematicBreak': c.rules++; break;
      case 'inlineCode': c.inlineCode++; textParts.push(n.value); break;
      case 'html': c.htmlNodes++; htmlBits.push(n.value); break;
      case 'text': textParts.push(n.value); break;
      default:
    }
    if (n.type === 'code') textParts.push(n.value);
  });
  return { counts: c, codes, text: textParts.join(''), html: htmlBits.join('\n') };
}

function countFromHtml(html) {
  const $ = cheerio.load(`<div id="root">${html}</div>`, null, false);
  const c = {
    headings: $('h1,h2,h3,h4,h5,h6').length,
    tables: $('table').length,
    tableRows: $('tr').length,
    codeBlocks: $('pre').length,
    listItems: $('li').length,
    links: $('a[href]').length,
    images: $('img').length,
    blockquotes: $('blockquote').length,
    rules: $('hr').length,
    inlineCode: $('code').filter((_, el) => !$(el).closest('pre').length).length,
  };
  const codes = $('pre').map((_, el) => $(el).text().replace(/\n$/, '')).get();
  const ids = $('[id]').map((_, el) => $(el).attr('id')).get();
  const inpage = $('a[href^="#"]').map((_, el) => $(el).attr('href')).get();
  $('pre').remove();
  const plain = $('#root').text();
  return { counts: c, codes, ids, inpage, text: plain, words: plain.split(/\s+/).filter(Boolean).length };
}

const squash = (s) => s.replace(/\s+/g, '');

// ---------------------------------------------------------------------------------------------- build guides
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.html')) fs.unlinkSync(path.join(OUT, f)); // idempotent: drop stale fragments

const pdfLink = (g) => `${REPO_URL}/raw/main/downloads/pdfs/${g.sourcePath.replace(/\.md$/, '.pdf')}`;
const parity = {};
const problems = [];
const metaGuides = new Map();

for (const g of allGuides) {
  const md = await text(RAW + g.sourcePath, 'repo/' + g.sourcePath);
  const marked = makeMarked();
  if (md.includes(TAB)) throw new Error(`${g.slug}: source contains U+E000`);
  const html0 = marked.parse(protectFenceTabs(md));
  if (html0.includes(TAB)) throw new Error(`${g.slug}: tab sentinel leaked into the output`);
  const $ = cheerio.load(`<div id="root">${html0}</div>`, null, false);
  sanitize($);
  decorateLinks($);
  // The original "Download PDF" link points at a Google-Drive short link (gdurl.com); ship the upstream file instead.
  let pdfReplaced = 0;
  $('a[href*="gdurl.com"]').each((_, el) => {
    if (/download pdf/i.test($(el).text())) {
      $(el).attr('href', pdfLink(g));
      pdfReplaced++;
    }
  });
  const html = $('#root').html().trim() + '\n';
  writeFile(path.join(OUT, `${g.slug}.html`), html);

  const src = countFromMarkdown(md);
  const out = countFromHtml(html);
  const row = { source: src.counts, output: out.counts };
  const bad = [];
  for (const k of Object.keys(out.counts)) {
    let expect = src.counts[k];
    if (k === 'links') expect = src.counts.links; // marked and micromark both autolink bare URLs
    if (expect !== out.counts[k]) bad.push(`${k}: source ${expect} vs html ${out.counts[k]}`);
  }
  // code text must survive highlighting byte for byte
  if (src.codes.length === out.codes.length) {
    src.codes.forEach((c, i) => {
      const a = c.replace(/\n+$/, '');
      const b = out.codes[i];
      if (a !== b) {
        let k = 0;
        while (k < a.length && a[k] === b[k]) k++;
        bad.push(`code block ${i + 1} text differs at ${k}: ${JSON.stringify(a.slice(k, k + 30))} vs ${JSON.stringify(b.slice(k, k + 30))}`);
      }
    });
  }
  // everything outside code: same visible text (whitespace-insensitive)
  if (src.counts.htmlNodes === 0) {
    // smart punctuation (curly quotes, dashes, ellipsis) is applied by the converter: ignore those characters.
    const strip = (t) => [...squash(t).replace(/[-–—'"‘’“”.…]/g, '')].sort().join('');
    const srcProse = strip(src.text);
    const outAll = strip(out.text + out.codes.join(''));
    if (srcProse !== outAll) bad.push(`visible text differs (source ${srcProse.length} chars vs html ${outAll.length})`);
  }
  if (src.counts.htmlNodes) row.note = `${src.counts.htmlNodes} raw HTML node(s) in Markdown (sanitized)`;
  if (g.slug && pdfReplaced !== 1) bad.push(`expected one Download PDF link, replaced ${pdfReplaced}`);
  // in-page links must hit an id
  const idset = new Set(out.ids);
  const dead = [...new Set(out.inpage)].filter((h) => !idset.has(decodeURIComponent(h.slice(1))));
  row.deadAnchors = dead;
  row.words = out.words;
  parity[g.slug] = row;
  if (bad.length) problems.push(`${g.slug}: ${bad.join('; ')}`);
  metaGuides.set(g.slug, { slug: g.slug, title: g.title, sourcePath: g.sourcePath, words: out.words, description: g.description });
  g.h1 = $('h1').first().text().trim() || g.title;
}

// ---------------------------------------------------------------------------------------------- landing page (README.md)
{
  const marked = makeMarked();
  const firstH2 = readme.indexOf('\n## ');
  const top = readme.slice(0, firstH2);
  const rest = readme.slice(firstH2 + 1);
  const [h1Line, ...topRest] = top.split('\n');
  const topHtml = topRest.join('\n').trim();
  const h1Html = marked.parse(h1Line).replace(/src="\/assets\/dotdot\.png"/, `src="${PUB_URL}/img/dotdot.png"`);
  // the original top block is raw HTML kept verbatim by kramdown (no Markdown inside); do the same.
  const t$ = cheerio.load(`<div id="root">${topHtml}</div>`, null, false);
  // dynamic README badges: the shields.io star badge becomes a static, local-looking one; the komarev visitor counter is dropped.
  t$('img').each((_, el) => {
    const src = t$(el).attr('src') || '';
    if (/shields\.io/.test(src)) t$(el.parent).addClass('cs-badge-stars').text('Stars');
    else if (/komarev\.com/.test(src)) stats.removedImages.push(src + ' (visitor counter, dropped)');
    else stats.removedImages.push(src);
    if (!/shields\.io/.test(src)) t$(el).remove();
  });
  // strip the (now empty) paragraphs of the original markup but keep structure
  const topClean = t$('#root').html();
  let restHtml = marked.parse(rest);
  const all = `<div id="root">${h1Html}\n${topClean}\n${restHtml}</div>`;
  const $ = cheerio.load(all, null, false);
  // sanitize everything except our own generated local image
  $('a.cs-badge-stars img').remove();
  sanitize($);
  const slugs = new Set(allGuides.map((g) => g.slug));
  let rewritten = 0;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    let m;
    if ((m = /^\/([^/]+)\/([^/]+)\.md$/.exec(href)) && slugs.has(m[2])) {
      $(el).attr('href', `${ROUTE}/${m[2]}`);
      rewritten++;
    } else if (href === 'CONTRIBUTING.md') $(el).attr('href', `${REPO_URL}/blob/main/CONTRIBUTING.md`);
    else if (href === 'LICENSE') $(el).attr('href', `${REPO_URL}/blob/main/LICENSE`);
    else if (href === '#dotdot-the-only-cheatsheets') $(el).attr('href', '#-the-only-cheatsheets'); // README back-to-top anchor, which kramdown's id for the h1 never matched
  });
  decorateLinks($);
  // README "Git \& GitHub" shows a stray backslash in kramdown; Markdown semantics drop it (kept here as plain "&").
  const html = $('#root').html().trim() + '\n';
  writeFile(path.join(OUT, 'landing.html'), html);

  const src = countFromMarkdown(readme);
  const out = countFromHtml(html);
  const htmlLinks = cheerio.load(`<div>${src.html}</div>`, null, false)('a[href]').length;
  const exp = { ...src.counts };
  exp.links += htmlLinks;
  exp.images = src.counts.images; // the owl image in the h1 (local copy); the two badge <img> in raw HTML are replaced/dropped
  const bad = [];
  for (const k of ['headings', 'listItems', 'links', 'images', 'rules', 'codeBlocks', 'tables']) {
    if (exp[k] !== out.counts[k]) bad.push(`${k}: source ${exp[k]} vs html ${out.counts[k]}`);
  }
  const idset = new Set(out.ids);
  const dead = [...new Set(out.inpage)].filter((h) => !idset.has(decodeURIComponent(h.slice(1))));
  if (dead.length) bad.push(`dead anchors: ${dead.join(', ')}`);
  if (rewritten !== 18) bad.push(`rewrote ${rewritten} guide links, expected 18`);
  parity.landing = { source: exp, output: out.counts, deadAnchors: dead, guideLinks: rewritten };
  if (bad.length) problems.push(`landing: ${bad.join('; ')}`);
}

// ---------------------------------------------------------------------------------------------- static assets
fs.mkdirSync(path.join(PUB, 'img'), { recursive: true });
const copyAsset = async (url, rel, dest) => writeFile(path.join(PUB, dest), await download(url, rel));
await copyAsset(SITE + 'assets/images/header-bg.jpg', 'site/assets/images/header-bg.jpg', 'img/header-bg.jpg');
await copyAsset(SITE + 'assets/images/body-bg.jpg', 'site/assets/images/body-bg.jpg', 'img/body-bg.jpg');
await copyAsset(SITE + 'assets/images/sidebar-bg.jpg', 'site/assets/images/sidebar-bg.jpg', 'img/sidebar-bg.jpg');
await copyAsset(SITE + 'assets/images/github-button.png', 'site/assets/images/github-button.png', 'img/github-button.png');
await copyAsset(SITE + 'assets/images/download-button.png', 'site/assets/images/download-button.png', 'img/download-button.png');
await copyAsset(RAW + 'assets/dotdot.png', 'repo/assets/dotdot.png', 'img/dotdot.png');
const FONT_BASE = 'https://fonts.gstatic.com/s/architectsdaughter/v20/KtkxAKiDZI_td1Lkx62xHZHDtgO_Y-bvTY';
await copyAsset(FONT_BASE + 'lg4w.woff2', 'fonts/architects-daughter-latin.woff2', 'architects-daughter-latin.woff2');
await copyAsset(FONT_BASE + 'dg4_zg.woff2', 'fonts/architects-daughter-latin-ext.woff2', 'architects-daughter-latin-ext.woff2');

const ofl = await text('https://raw.githubusercontent.com/google/fonts/main/ofl/architectsdaughter/OFL.txt', 'lic/OFL-architectsdaughter.txt');
const theme = await text('https://raw.githubusercontent.com/pages-themes/architect/master/LICENSE', 'lic/architect-LICENSE');
const normalize = await text('https://raw.githubusercontent.com/necolas/normalize.css/3.0.2/LICENSE.md', 'lic/normalize-LICENSE.md');
const hljsLic = await text('https://raw.githubusercontent.com/highlightjs/highlight.js/main/LICENSE', 'lic/highlightjs-LICENSE');
const mit = (await download(RAW + 'LICENSE', 'repo/LICENSE')).toString('utf8').replace(/^﻿/, '');
writeFile(path.join(OUT, 'LICENSE.txt'), mit);
writeFile(path.join(OUT, 'third-party/OFL-ArchitectsDaughter.txt'), ofl);
writeFile(path.join(OUT, 'third-party/Architect-theme-CC0.txt'), theme);
writeFile(path.join(OUT, 'third-party/normalize.css-MIT.txt'), normalize);
writeFile(path.join(OUT, 'third-party/highlight.js-BSD-3-Clause.txt'), hljsLic);
writeFile(path.join(PUB, 'OFL-ArchitectsDaughter.txt'), ofl);

// ---------------------------------------------------------------------------------------------- meta, notice
const prev = fs.existsSync(path.join(OUT, 'meta.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'meta.json'), 'utf8')) : null;
const retrieved = !REFRESH && prev?.retrieved ? prev.retrieved : new Date().toISOString().slice(0, 10);
const meta = {
  id: 'the-only',
  title: 'The Only Cheatsheets',
  description: 'A collection of 18 development cheatsheets and guides: core development, frontend and backend web development, DSA, DBMS and SQL, system design, Git and GitHub, aptitude.',
  sourceUrl: SITE,
  repoUrl: REPO_URL,
  license: 'MIT',
  copyright: COPYRIGHT,
  retrieved,
  route: ROUTE,
  categories: categories.map((c) => ({
    title: c.title,
    guides: c.guides.map((g) => {
      const m = metaGuides.get(g.slug);
      return { slug: m.slug, title: m.title, sourcePath: m.sourcePath, words: m.words, description: m.description };
    }),
  })),
};
writeFile(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
writeFile(path.join(OUT, 'parity.json'), JSON.stringify({ generated: retrieved, engine: { source: 'mdast (micromark + GFM)', output: 'cheerio over generated HTML' }, parity }, null, 2) + '\n');

const notice = `# The Only Cheatsheets — import notice

- **Source:** ${SITE}
- **Repository:** ${REPO_URL}
- **License:** MIT License (full text in \`LICENSE.txt\`, copied verbatim from the repository)
- **Copyright:** ${COPYRIGHT}
- **Retrieved:** ${retrieved}

## What was imported

The site is a Jekyll site (GitHub "Architect" theme) rendering Markdown. The Markdown sources of the landing page
(\`README.md\`) and of the 18 guides (${allGuides.map((g) => '`' + g.sourcePath + '`').join(', ')}) were fetched from
\`${RAW}\` and converted into the HTML fragments in this folder. Nothing under \`downloads/\` (PDF/PNG/HTML exports) was
copied; the "Download PDF" links point to the upstream files on GitHub instead.

## What we changed

- Converted the Markdown to HTML fragments with a GitHub-flavoured Markdown engine (\`marked\`), with heading ids
  generated the way the original Jekyll/kramdown site generates them so every in-page Table of Contents link works.
- Pre-highlighted fenced code at import time with highlight.js ${hljsVersion} (the original used Jekyll's Rouge) and
  mapped the token colours to the original theme's code colours; no highlighter runs in the browser.
- Sanitized the output (no scripts, inline event handlers, \`javascript:\` URLs, iframes/objects/embeds, remote images or
  stylesheets). The README's two dynamic badge images (shields.io stars, komarev visitor counter) were not fetched: the
  stars badge is a static local look-alike without a count and the visitor counter was dropped.
- "Download PDF" links (Google-Drive short links) were replaced by links to the upstream PDF file on GitHub.
- Landing-page links to \`/<dir>/<guide>.md\` were rewritten to AlgoFlow's \`${ROUTE}/<slug>\` routes; \`CONTRIBUTING.md\` and
  \`LICENSE\` links point at the upstream repository.
- Task-list items (\`- [ ]\`) are rendered as disabled checkboxes (kramdown shows the literal brackets).
- Scoped the theme's CSS under \`.cs-to\`, self-hosted the font, added copy buttons, a guide navigation menu and the
  "back to AlgoFlow" link and attribution footer, and made tables scroll sideways on narrow screens.
- Static images used by the theme (header, body and sidebar backgrounds, GitHub and download button graphics) and the
  README's owl image were downloaded once and are served locally from \`public/fonts/cheatsheets/the-only/img/\`.

## Third-party assets

- **Architects Daughter** (font, two woff2 subsets served from \`public/fonts/cheatsheets/the-only/\`) — SIL Open Font
  License 1.1, Copyright (c) 2010, Kimberly Geswein (kimberlygeswein.com). License: \`third-party/OFL-ArchitectsDaughter.txt\`.
- **GitHub "Architect" Jekyll theme** (pages-themes/architect — layout, colours and the five background/button images) —
  CC0 1.0 Universal. License: \`third-party/Architect-theme-CC0.txt\`.
- **normalize.css v3.0.2** (included in the theme's stylesheet; the relevant rules were carried into our scoped CSS) — MIT,
  Copyright (c) Nicolas Gallagher and Jonathan Neal. License: \`third-party/normalize.css-MIT.txt\`.
- **highlight.js ${hljsVersion}** (used only at import time to pre-highlight code) — BSD-3-Clause, Copyright (c) 2006,
  Ivan Sagalaev. License: \`third-party/highlight.js-BSD-3-Clause.txt\`.
`;
writeFile(path.join(OUT, 'NOTICE.md'), notice);

// ---------------------------------------------------------------------------------------------- report
console.log(`\nthe-only import (${retrieved}) — ${allGuides.length} guides, ${categories.length} categories`);
console.log('guide'.padEnd(30), 'head  tbl rows code  li  link  words  dead');
for (const g of allGuides) {
  const p = parity[g.slug];
  const s = p.source;
  const o = p.output;
  const eq = (a, b) => (a === b ? String(a) : `${a}!=${b}`);
  console.log(
    g.slug.padEnd(30),
    eq(s.headings, o.headings).padStart(4),
    eq(s.tables, o.tables).padStart(4),
    eq(s.tableRows, o.tableRows).padStart(4),
    eq(s.codeBlocks, o.codeBlocks).padStart(5),
    eq(s.listItems, o.listItems).padStart(5),
    eq(s.links, o.links).padStart(5),
    String(p.words).padStart(6),
    String(p.deadAnchors.length).padStart(4),
  );
}
const L = parity.landing;
console.log('landing'.padEnd(30), `headings ${L.source.headings}/${L.output.headings}, li ${L.source.listItems}/${L.output.listItems}, links ${L.source.links}/${L.output.links}`);
const totals = (side) => allGuides.reduce((a, g) => { for (const [k, v] of Object.entries(parity[g.slug][side])) a[k] = (a[k] || 0) + v; return a; }, {});
console.log('totals source:', JSON.stringify(totals('source')));
console.log('totals output:', JSON.stringify(totals('output')));
console.log('highlighted languages:', JSON.stringify(stats.highlighted));
console.log('left unhighlighted (no/unknown language):', JSON.stringify(stats.unhighlighted));
console.log('removed images:', stats.removedImages.length ? stats.removedImages.join(', ') : 'none');
console.log('removed tags:', JSON.stringify(stats.removedTags), 'removed attrs:', JSON.stringify(stats.removedAttrs));
const dead = allGuides.filter((g) => parity[g.slug].deadAnchors.length);
if (dead.length) {
  console.log('dead in-page anchors (in the source Markdown):');
  for (const g of dead) console.log('  ', g.slug, parity[g.slug].deadAnchors.slice(0, 8).join(' '), parity[g.slug].deadAnchors.length > 8 ? '...' : '');
}
if (problems.length) {
  console.error('\nPARITY PROBLEMS:\n' + problems.map((p) => ' - ' + p).join('\n'));
  process.exit(1);
}
console.log('\nparity OK');
