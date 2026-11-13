import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles-cs-hub.css';

/* ------------------------------------------------------------------ */
/* Collections and manifests (read tolerantly: the importers may lag)  */
/* ------------------------------------------------------------------ */

export type CollectionId = 'pattern-index' | 'patterns-guide' | 'the-only';

export interface CollectionInfo {
  id: CollectionId;
  title: string;
  icon: string;
  route: string;
  sourceUrl: string;
  repoUrl: string;
  holder: string;
  blurb: string;
}

/** Static facts about each upstream collection (used while a manifest is missing, and for the order). */
export const COLLECTIONS: CollectionInfo[] = [
  {
    id: 'pattern-index',
    title: 'DSA Pattern Recognition',
    icon: '🧭',
    route: '/cheatsheets/pattern-index',
    sourceUrl: 'https://roxoi.github.io/dsa-cheatsheet/',
    repoUrl: 'https://github.com/roxoi/dsa-cheatsheet',
    holder: 'roxoi',
    blurb:
      'A dark, editorial field manual: for every topic from sorting to advanced DP, a table of clue → technique plus runnable C++ snippets. Built for spotting which pattern a problem is hiding.',
  },
  {
    id: 'patterns-guide',
    title: 'Complete DSA Patterns Reference',
    icon: '🧩',
    route: '/cheatsheets/patterns-guide',
    sourceUrl: 'https://thetorangi.github.io/DSA-cheat-sheet/',
    repoUrl: 'https://github.com/thetorangi/DSA-cheat-sheet',
    holder: 'K A R M A ☯️',
    blurb:
      'Fifty named patterns in two tables (core and advanced) with the key idea and LeetCode examples for each, plus a complexity quick reference, a pattern selection guide and a study plan.',
  },
  {
    id: 'the-only',
    title: 'The Only Cheatsheets',
    icon: '📚',
    route: '/cheatsheets/the-only',
    sourceUrl: 'https://malharchauhan7.github.io/the-only-cheatsheets/',
    repoUrl: 'https://github.com/malharchauhan7/the-only-cheatsheets',
    holder: 'Malhar',
    blurb:
      'A library of long-form Markdown guides: web development, DSA, databases, system design, Git and aptitude. Written as interview-prep notes you can read top to bottom or dip into.',
  },
];

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

const RAW_METAS = import.meta.glob('/src/content/cheatsheets/*/meta.json', { eager: true, import: 'default' }) as Record<string, unknown>;

/** The manifest of a collection, or undefined while it has not been imported yet. */
export function metaOf(id: CollectionId): Json | undefined {
  const hit = Object.entries(RAW_METAS).find(([p]) => p.includes(`/cheatsheets/${id}/meta.json`));
  return hit && isObj(hit[1]) ? hit[1] : undefined;
}

export interface IndexItem { key: string; label: string; to: { pathname: string; hash?: string }; tag?: string }
export interface IndexGroup { title: string; items: IndexItem[] }

interface Digest {
  stats: string[];
  groups: IndexGroup[];
  count: number;
}

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

function digestPatternIndex(m: Json, route: string): Digest {
  const sections = asArr(m.sections).filter(isObj);
  const code = sections.reduce((n, s) => n + num(s.codeBlocks), 0);
  const tables = sections.reduce((n, s) => n + num(s.tables), 0);
  return {
    stats: [plural(sections.length, 'section'), plural(code, 'code block'), plural(tables, 'table')],
    count: sections.length,
    groups: [{
      title: 'Sections',
      items: sections.map((s) => ({
        key: str(s.id),
        label: str(s.title, str(s.id)),
        tag: str(s.number) || undefined,
        to: { pathname: route, hash: `#${str(s.id)}` },
      })),
    }],
  };
}

function digestPatternsGuide(m: Json, route: string): Digest {
  const groups = asArr(m.groups).filter(isObj);
  const patterns = groups.map((g) => asArr(g.patterns).filter(isObj));
  const total = patterns.reduce((n, p) => n + p.length, 0);
  const tables = isObj(m) && Array.isArray(m.tables) ? m.tables.length : num(m.tables);
  const stats = [plural(total, 'pattern')];
  if (tables) stats.push(`${tables} reference ${tables === 1 ? 'table' : 'tables'}`);
  return {
    stats,
    count: total,
    groups: groups.map((g, i) => ({
      title: str(g.title, `Group ${i + 1}`),
      items: patterns[i].map((p) => ({
        key: `${str(g.title)}-${str(p.no)}-${str(p.name)}`,
        label: str(p.name),
        tag: str(p.no) || (typeof p.no === 'number' ? String(p.no) : undefined),
        to: { pathname: route },
      })),
    })),
  };
}

function digestTheOnly(m: Json, route: string): Digest {
  const cats = asArr(m.categories).filter(isObj);
  const guides = cats.map((c) => asArr(c.guides).filter(isObj));
  const total = guides.reduce((n, g) => n + g.length, 0);
  return {
    stats: [`${plural(total, 'guide')} in ${plural(cats.length, 'category', 'categories')}`],
    count: total,
    groups: cats.map((c, i) => ({
      title: str(c.title, `Category ${i + 1}`),
      items: guides[i].map((g) => ({
        key: str(g.slug),
        label: str(g.title, str(g.slug)),
        tag: num(g.words) ? `${Math.max(1, Math.round(num(g.words) / 200))} min` : undefined,
        to: { pathname: `${route}/${str(g.slug)}` },
      })),
    })),
  };
}

export function digestOf(info: CollectionInfo): Digest | undefined {
  const m = metaOf(info.id);
  if (!m) return undefined;
  const route = str(m.route, info.route);
  if (info.id === 'pattern-index') return digestPatternIndex(m, route);
  if (info.id === 'patterns-guide') return digestPatternsGuide(m, route);
  return digestTheOnly(m, route);
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function CollectionCard({ info, digest }: { info: CollectionInfo; digest?: Digest }) {
  const m = metaOf(info.id);
  const route = str(m?.route, info.route);
  const title = str(m?.title, info.title);
  const sourceUrl = str(m?.sourceUrl, info.sourceUrl);
  const ready = !!digest && digest.count > 0;
  return (
    <article className={`csh-card csh-acc-${info.id}${ready ? '' : ' pending'}`} id={`card-${info.id}`}>
      <header className="csh-card-head">
        <span className="csh-card-icon" aria-hidden>{info.icon}</span>
        <h2 className="csh-card-title">{title}</h2>
        <span className="csh-badge csh-badge-mit" title={`Licensed under the MIT License, © ${info.holder}`}>MIT</span>
      </header>
      <p className="csh-card-desc">{info.blurb}</p>
      {ready ? (
        <ul className="csh-stats" aria-label="Contents">
          {digest.stats.map((s) => <li key={s}>{s}</li>)}
        </ul>
      ) : (
        <p className="csh-pending-note" role="status">Importing… not available yet.</p>
      )}
      <div className="csh-card-foot">
        {ready ? (
          <Link to={route} className="csh-open">Open <span aria-hidden>→</span></Link>
        ) : (
          <span className="csh-open disabled" aria-disabled="true">Open</span>
        )}
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="csh-link">Source ↗</a>
        <Link to={`/cheatsheets/credits#${info.id}`} className="csh-link">License</Link>
      </div>
      <p className="csh-holder">© {info.holder}</p>
    </article>
  );
}

function matches(words: string[], ...hay: string[]): boolean {
  if (words.length === 0) return true;
  const text = hay.join(' ').toLowerCase();
  return words.every((w) => text.includes(w));
}

export function CheatsheetsHub() {
  const [query, setQuery] = useState('');
  const words = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const digests = useMemo(() => COLLECTIONS.map((c) => ({ info: c, digest: digestOf(c) })), []);

  const panels = digests.map(({ info, digest }) => {
    const title = str(metaOf(info.id)?.title, info.title);
    const collectionHit = matches(words, title, info.id);
    const groups = (digest?.groups ?? [])
      .map((g) => {
        const groupHit = collectionHit || matches(words, g.title);
        return { ...g, items: g.items.filter((it) => groupHit || matches(words, it.label, it.tag ?? '', g.title)) };
      })
      .filter((g) => g.items.length > 0);
    return { info, title, digest, groups };
  });
  const totalHits = panels.reduce((n, p) => n + p.groups.reduce((m, g) => m + g.items.length, 0), 0);
  const anyReady = digests.some((d) => d.digest);

  return (
    <main className="main csh">
      <div className="csh-wrap">
        <header className="csh-hero">
          <h1 className="csh-h1"><span aria-hidden>📑</span> Cheatsheets</h1>
          <p className="csh-intro">
            Three open-source DSA and interview-prep cheatsheets, brought into AlgoFlow. Each keeps its original look and
            content and opens as its own reader; everything is bundled with the site, so nothing is fetched from elsewhere.
            All three are MIT-licensed and credited on the <Link to="/cheatsheets/credits">credits page</Link>.
          </p>
        </header>

        <section className="csh-grid" aria-label="Collections">
          {digests.map(({ info, digest }) => <CollectionCard key={info.id} info={info} digest={digest} />)}
        </section>

        <p className="csh-own">
          Looking for AlgoFlow's own notes? <Link to="/cheatsheet">Code Tricks</Link> and <Link to="/edge-cases">Edge Cases</Link>{' '}
          are written by us and are not part of these imported collections.
        </p>

        <section className="csh-index" aria-labelledby="csh-index-h">
          <div className="csh-index-head">
            <div>
              <h2 id="csh-index-h" className="csh-index-title">Index</h2>
              <p className="csh-index-sub">Every section, pattern and guide, with a direct link.</p>
            </div>
            <label className="csh-search">
              <span aria-hidden>🔍</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter sections, patterns and guides…"
                aria-label="Filter the cheatsheet index"
              />
              {query && <button type="button" className="csh-clear" onClick={() => setQuery('')} aria-label="Clear filter">✕</button>}
            </label>
          </div>
          <p className="csh-count muted small" role="status" aria-live="polite">
            {anyReady ? (words.length ? `${plural(totalHits, 'match', 'matches')}` : `${plural(totalHits, 'entry', 'entries')} across ${plural(digests.filter((d) => d.digest).length, 'collection')}`) : 'Importing the collections…'}
          </p>

          {panels.map(({ info, title, digest, groups }) => {
            if (words.length > 0 && groups.length === 0) return null;
            return (
              <section key={info.id} className={`csh-panel csh-acc-${info.id}`} aria-labelledby={`csh-p-${info.id}`}>
                <div className="csh-panel-head">
                  <span aria-hidden>{info.icon}</span>
                  <h3 id={`csh-p-${info.id}`} className="csh-panel-title">{title}</h3>
                  <Link to={str(metaOf(info.id)?.route, info.route)} className="csh-panel-open">Open →</Link>
                </div>
                {!digest ? (
                  <p className="csh-pending-note">Importing… not available yet.</p>
                ) : (
                  groups.map((g) => (
                    <div key={g.title} className="csh-group">
                      {(digest.groups.length > 1 || info.id !== 'pattern-index') && (
                        <h4 className="csh-group-title">{g.title} <span className="csh-group-count">{g.items.length}</span></h4>
                      )}
                      <ul className={`csh-list${info.id === 'patterns-guide' ? ' chips' : ''}`}>
                        {g.items.map((it) => (
                          <li key={it.key}>
                            <Link to={it.to} className="csh-item">
                              {it.tag && <span className="csh-item-tag">{it.tag}</span>}
                              <span className="csh-item-label">{it.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </section>
            );
          })}
          {anyReady && words.length > 0 && totalHits === 0 && (
            <p className="csh-empty">Nothing matches “{query}”. Try a shorter word, such as “graph”, “window” or “sql”.</p>
          )}
        </section>
      </div>
    </main>
  );
}
