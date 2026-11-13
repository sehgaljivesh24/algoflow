import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../styles-cs-hub.css';
import { COLLECTIONS, metaOf, type CollectionInfo } from './CheatsheetsHub';

/* ------------------------------------------------------------------ */
/* Lazy file loading (NOTICE.md / LICENSE.txt belong to the importers) */
/* ------------------------------------------------------------------ */

const NOTICES = import.meta.glob('/src/content/cheatsheets/*/NOTICE.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const LICENSES = import.meta.glob('/src/content/cheatsheets/*/LICENSE.txt', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

type Loaded = { state: 'loading' } | { state: 'missing' } | { state: 'ready'; text: string };

function useFile(files: Record<string, () => Promise<string>>, id: string, name: string): Loaded {
  const [res, setRes] = useState<Loaded>({ state: 'loading' });
  useEffect(() => {
    let alive = true;
    const key = Object.keys(files).find((k) => k === `/src/content/cheatsheets/${id}/${name}`);
    if (!key) {
      setRes({ state: 'missing' });
      return;
    }
    files[key]()
      .then((text) => alive && setRes(text.trim() ? { state: 'ready', text } : { state: 'missing' }))
      .catch(() => alive && setRes({ state: 'missing' }));
    return () => { alive = false; };
  }, [files, id, name]);
  return res;
}

/* ------------------------------------------------------------------ */
/* A tiny Markdown renderer: headings, paragraphs, lists, tables,      */
/* quotes, rules, fenced code, links, bold, italic, inline code.       */
/* Produces React elements only (no HTML injection).                   */
/* ------------------------------------------------------------------ */

const SAFE_URL = /^(https?:\/\/|mailto:|\/|#)/i;

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`)|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(https?:\/\/[^\s<>)]+[^\s<>).,;:!?])/g;
  let last = 0;
  let n = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${n++}`;
    if (m[1]) out.push(<code key={key}>{m[1].slice(1, -1)}</code>);
    else if (m[2] !== undefined) {
      const href = m[3];
      out.push(
        SAFE_URL.test(href) ? (
          <a key={key} href={href} {...(/^https?:/i.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{inline(m[2], key)}</a>
        ) : (
          <Fragment key={key}>{m[2]}</Fragment>
        ),
      );
    } else if (m[4]) out.push(<strong key={key}>{inline(m[4].slice(2, -2), key)}</strong>);
    else if (m[5]) out.push(<em key={key}>{inline(m[5].slice(1, -1), key)}</em>);
    else if (m[6]) out.push(<a key={key} href={m[6]} target="_blank" rel="noopener noreferrer">{m[6]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const splitRow = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const isTableSep = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line) && line.includes('|');
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

function Markdown({ source, baseLevel = 3 }: { source: string; baseLevel?: number }) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;
  const key = () => `b${k++}`;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = line.match(/^\s*(```|~~~)/);
    if (fence) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) buf.push(lines[i++]);
      i++;
      blocks.push(<pre key={key()} className="csh-pre"><code>{buf.join('\n')}</code></pre>);
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) {
      const level = Math.min(6, baseLevel + h[1].length - 1);
      const Tag = `h${level}` as 'h3';
      const kk = key();
      blocks.push(<Tag key={kk} className="csh-md-h">{inline(h[2], kk)}</Tag>);
      i++;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { blocks.push(<hr key={key()} className="csh-hr" />); i++; continue; }

    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(splitRow(lines[i++]));
      const kk = key();
      blocks.push(
        <div key={kk} className="csh-table-wrap">
          <table className="csh-table">
            <thead><tr>{head.map((c, ci) => <th key={ci}>{inline(c, `${kk}h${ci}`)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c, `${kk}r${ri}c${ci}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      const kk = key();
      blocks.push(<blockquote key={kk} className="csh-quote">{inline(buf.join(' '), kk)}</blockquote>);
      continue;
    }

    const li = line.match(LIST_RE);
    if (li) {
      const ordered = /\d/.test(li[2]);
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST_RE);
        if (m) { items.push(m[3]); i++; }
        else if (lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1] += ` ${lines[i].trim()}`; i++; }
        else break;
      }
      const kk = key();
      const children = items.map((t, ti) => <li key={ti}>{inline(t, `${kk}i${ti}`)}</li>);
      blocks.push(ordered ? <ol key={kk} className="csh-md-list">{children}</ol> : <ul key={kk} className="csh-md-list">{children}</ul>);
      continue;
    }

    const buf: string[] = [];
    while (
      i < lines.length && lines[i].trim() && !/^\s*(```|~~~|#{1,6}\s|>)/.test(lines[i]) && !LIST_RE.test(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1]))
    ) buf.push(lines[i++].trim());
    const kk = key();
    blocks.push(<p key={kk} className="csh-md-p">{inline(buf.join(' '), kk)}</p>);
  }
  return <div className="csh-md">{blocks}</div>;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const str = (v: unknown, d = ''): string => (typeof v === 'string' && v ? v : d);

function Facts({ info }: { info: CollectionInfo }) {
  const m = metaOf(info.id);
  const rows: [string, ReactNode][] = [
    ['Source', <a key="s" href={str(m?.sourceUrl, info.sourceUrl)} target="_blank" rel="noopener noreferrer">{str(m?.sourceUrl, info.sourceUrl)}</a>],
    ['Repository', <a key="r" href={str(m?.repoUrl, info.repoUrl)} target="_blank" rel="noopener noreferrer">{str(m?.repoUrl, info.repoUrl)}</a>],
    ['Copyright', str(m?.copyright, `Copyright (c) ${info.holder}`)],
    ['License', 'MIT License'],
  ];
  if (m?.retrieved) rows.push(['Retrieved', str(m.retrieved)]);
  rows.push(['Shown in AlgoFlow at', <Link key="a" to={str(m?.route, info.route)}>{str(m?.route, info.route)}</Link>]);
  return (
    <dl className="csh-facts">
      {rows.map(([k, v]) => (
        <Fragment key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

function Missing({ what }: { what: string }) {
  return <p className="csh-pending-note" role="status">{what} is not available yet (the import has not finished).</p>;
}

function CreditsSection({ info }: { info: CollectionInfo }) {
  const notice = useFile(NOTICES, info.id, 'NOTICE.md');
  const license = useFile(LICENSES, info.id, 'LICENSE.txt');
  const title = str(metaOf(info.id)?.title, info.title);
  return (
    <section id={info.id} className={`csh-credit csh-acc-${info.id}`} aria-labelledby={`csh-c-${info.id}`}>
      <header className="csh-credit-head">
        <span aria-hidden className="csh-card-icon">{info.icon}</span>
        <h2 id={`csh-c-${info.id}`} className="csh-card-title">{title}</h2>
        <span className="csh-badge csh-badge-mit">MIT</span>
      </header>
      <Facts info={info} />

      <h3 className="csh-sub">Notice: what we changed, and third-party assets</h3>
      {notice.state === 'loading' && <p className="csh-pending-note">Loading…</p>}
      {notice.state === 'missing' && <Missing what="The notice" />}
      {notice.state === 'ready' && <Markdown source={notice.text} baseLevel={4} />}

      <h3 className="csh-sub">License text</h3>
      {license.state === 'loading' && <p className="csh-pending-note">Loading…</p>}
      {license.state === 'missing' && <Missing what="The license text" />}
      {license.state === 'ready' && <pre className="csh-license">{license.text.replace(/\s+$/, '')}</pre>}
    </section>
  );
}

export function CreditsPage() {
  const { hash } = useLocation();
  // scroll to #<collection> once the page has rendered (and again if the hash changes)
  useEffect(() => {
    if (!hash) return;
    const t = window.setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' }), 60);
    return () => window.clearTimeout(t);
  }, [hash]);

  return (
    <main className="main csh">
      <div className="csh-wrap csh-wrap-narrow">
        <nav className="csh-crumb" aria-label="Breadcrumb"><Link to="/cheatsheets">Cheatsheets</Link> <span aria-hidden>/</span> Credits</nav>
        <header className="csh-hero">
          <h1 className="csh-h1"><span aria-hidden>⚖️</span> Credits and licenses</h1>
          <p className="csh-intro">
            The three cheatsheet collections under <Link to="/cheatsheets">Cheatsheets</Link> are the work of their authors and are used
            under the MIT License. Their copyright notices and license texts are reproduced below, unchanged. AlgoFlow's own pages
            (animations, patterns, Code Tricks, Edge Cases) are separate work and are not covered by these licenses.
          </p>
          <nav className="csh-jump" aria-label="Collections">
            {COLLECTIONS.map((c) => <a key={c.id} className="csh-chip" href={`#${c.id}`}>{c.icon} {c.title}</a>)}
          </nav>
        </header>
        {COLLECTIONS.map((c) => <CreditsSection key={c.id} info={c} />)}
        <p className="csh-own">The same notices are collected in <code>THIRD_PARTY_NOTICES.md</code> at the root of the project.</p>
      </div>
    </main>
  );
}
