import { Fragment, useMemo, useState } from 'react';
import { ALL_ENTRIES, CATALOG, type CatalogEntry } from '../data/catalog';
import { matchesPriority, PRIORITY_LABEL, type PriorityFilter } from '../data/priorities';
import { STATUS_LABEL, STATUS_ORDER, useProgress } from '../data/storage';
import type { Status } from '../engine/types';
import { isAnimated } from '../problems/lazy';
import { useStoredSet } from '../components/shell/localState';
import { ProblemCard } from '../components/shell/ProblemCard';
import { TOPIC_META, topicTitle } from '../components/shell/topicMeta';

type Diff = 'All' | 'Easy' | 'Medium' | 'Hard';
type StatusFilter = 'all' | Status;

const PRIORITY_BUTTONS: { id: PriorityFilter; label: string; cls: string }[] = [
  { id: 'all', label: 'All', cls: 'active-all' },
  { id: 'p1', label: '🔴 P1 Only', cls: 'active-p1' },
  { id: 'p1p2', label: '🔴🟡 P1 + P2', cls: 'active-p2' },
  { id: 'p3', label: '⚫ P3 Only', cls: 'active-p3' },
];

const groupLabel = (g: string) => g.replace(/\s*\/\s*/g, ' · ');

/** Split a topic's entries into consecutive runs that share a sub-group. */
function runs(entries: CatalogEntry[]) {
  const out: { group?: string; items: CatalogEntry[] }[] = [];
  for (const e of entries) {
    const last = out[out.length - 1];
    if (last && last.group === e.group) last.items.push(e);
    else out.push({ group: e.group, items: [e] });
  }
  return out;
}

export function Library() {
  const progress = useProgress();
  const saved = useStoredSet('algoflow.bookmarks');
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<PriorityFilter>('all');
  const [diff, setDiff] = useState<Diff>('All');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [animatedOnly, setAnimatedOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);

  const q = query.trim().toLowerCase();
  const matches = (e: CatalogEntry) =>
    matchesPriority(e.slug, priority) &&
    (diff === 'All' || e.difficulty === diff) &&
    (status === 'all' || progress.get(e.slug) === status) &&
    (!animatedOnly || isAnimated(e.slug)) &&
    (!savedOnly || saved.has(e.slug)) &&
    (!q || `${e.id} ${e.title} ${e.tag} ${e.category} ${e.group ?? ''}`.toLowerCase().includes(q));

  const sections = useMemo(
    () => CATALOG.map((c) => ({ ...c, shown: c.entries.filter(matches) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, priority, diff, status, animatedOnly, savedOnly, progress.get, saved.items],
  );
  const anyShown = sections.some((s) => s.shown.length);
  const filtered = priority !== 'all' || diff !== 'All' || status !== 'all' || animatedOnly || savedOnly || !!q;

  return (
    <main className="main lib-main">
      <section className="sequence-banner" aria-labelledby="seq-title">
        <h2 id="seq-title">📋 Recommended Learning Sequence</h2>
        <div className="seq-steps">
          {CATALOG.map((c, i) => (
            <Fragment key={c.id}>
              <a className="seq-step" href={`#${c.id}`}>{i + 1}. {topicTitle(c.name)}</a>
              {i < CATALOG.length - 1 && <span className="seq-arrow" aria-hidden>→</span>}
            </Fragment>
          ))}
        </div>
      </section>

      <section className="priority-legend" aria-label="Priority legend">
        <span>Priority:</span>
        {(['p1', 'p2', 'p3'] as const).map((p) => (
          <div key={p} className="legend-item">
            <span className={`legend-dot ${p}`} aria-hidden />
            <strong className={`legend-name ${p}`}>{PRIORITY_LABEL[p].name}</strong>
            <span className="legend-hint">{PRIORITY_LABEL[p].hint}</span>
          </div>
        ))}
      </section>

      <div className="filter-bar" role="group" aria-label="Filters">
        <label className="search-wrap">
          <span aria-hidden>🔍</span>
          <input
            type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search problem name or number…" aria-label="Search problems"
          />
        </label>
        {PRIORITY_BUTTONS.map((b) => (
          <button
            key={b.id} type="button" onClick={() => setPriority(b.id)} aria-pressed={priority === b.id}
            className={`filter-btn${priority === b.id ? ` ${b.cls}` : ''}`}
          >
            {b.label}
          </button>
        ))}
        <label className="filter-status-wrap">
          <span className="filter-status-label">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Filter by problem status">
            <option value="all">All</option>
            {STATUS_ORDER.filter((s) => s !== 'todo').map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
      </div>

      <div className="filter-bar filter-extras" role="group" aria-label="More filters">
        <span className="filter-extras-label">Also filter by</span>
        {(['Easy', 'Medium', 'Hard'] as const).map((d) => (
          <button
            key={d} type="button" onClick={() => setDiff(diff === d ? 'All' : d)} aria-pressed={diff === d}
            className={`filter-btn${diff === d ? ` active-${d.toLowerCase()}` : ''}`}
          >
            {d}
          </button>
        ))}
        <button
          type="button" onClick={() => setAnimatedOnly((v) => !v)} aria-pressed={animatedOnly}
          className={`filter-btn${animatedOnly ? ' active-viz' : ''}`}
        >
          ▶ Animated only
        </button>
        <button
          type="button" onClick={() => setSavedOnly((v) => !v)} aria-pressed={savedOnly}
          className={`filter-btn${savedOnly ? ' active-saved' : ''}`}
        >
          ★ Saved{saved.size ? ` (${saved.size})` : ''}
        </button>
        {filtered && (
          <button
            type="button" className="filter-clear"
            onClick={() => { setQuery(''); setPriority('all'); setDiff('All'); setStatus('all'); setAnimatedOnly(false); setSavedOnly(false); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {!anyShown && <p className="muted center empty-note">No problems match those filters.</p>}

      {sections.filter((c) => c.shown.length).map((c) => {
        const meta = TOPIC_META[c.name];
        const groups = [...new Set(c.entries.map((e) => e.group).filter((g): g is string => !!g))];
        const subtitle = groups.length ? groups.map(groupLabel).join(' · ') : meta?.subtitle;
        const total = c.entries.length;
        return (
          <section key={c.id} id={c.id} className="topic">
            <div className="topic-header">
              <span className="topic-icon" aria-hidden>{meta?.icon ?? '📁'}</span>
              <div>
                <h2 className="topic-title">{topicTitle(c.name)}</h2>
                {subtitle && <div className="topic-subtitle">{subtitle}</div>}
              </div>
              <span className="topic-count">
                {c.shown.length === total ? total : `${c.shown.length} of ${total}`} problems
              </span>
            </div>
            {runs(c.shown).map((r, i) => (
              <div key={`${r.group ?? 'all'}-${i}`} className="subtopic">
                {r.group && <h3 className="subtopic-label">{groupLabel(r.group)}</h3>}
                <div className="problem-grid">
                  {r.items.map((e) => (
                    <ProblemCard
                      key={e.slug} entry={e} live={isAnimated(e.slug)} status={progress.get(e.slug)}
                      bookmarked={saved.has(e.slug)} onBookmark={() => saved.toggle(e.slug)}
                      onStatus={(s) => progress.set(e.slug, s)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })}
      <p className="lib-foot muted small">{ALL_ENTRIES.length} problems in total. Your progress and bookmarks stay in this browser.</p>
    </main>
  );
}
