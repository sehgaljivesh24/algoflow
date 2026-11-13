import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CodeSnippet } from '../components/CodePanel';
import { EDGE_CARD_COUNT, EDGE_TOPICS, type EdgeCard, type EdgeTopic } from '../data/edgeCases';

type View = 'side' | 'tabs';
const VIEW_KEY = 'algoflow.edge.view';
const topicDomId = (id: string) => `edge-${id}`;

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'tabs' ? 'tabs' : 'side';
  } catch {
    return 'side';
  }
}

const haystack = (t: EdgeTopic, c: EdgeCard) =>
  `${t.title} ${c.title} ${c.wrong} ${c.rule} ${c.buggy} ${c.fixed}`.toLowerCase();

function Pane({ kind, code }: { kind: 'bug' | 'fix'; code: string }) {
  return (
    <div className={`edge-pane ${kind}`}>
      <div className="edge-pane-head">
        <span className={`edge-badge ${kind}`}>{kind === 'bug' ? 'Bug' : 'Fix'}</span>
        <span className="muted small">{kind === 'bug' ? 'Looks right, fails on the edge' : 'Handles the edge'}</span>
      </div>
      <CodeSnippet code={code} />
    </div>
  );
}

function CardView({ card, view, n }: { card: EdgeCard; view: View; n: number }) {
  const [tab, setTab] = useState<'bug' | 'fix'>('bug');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const next = e.key === 'ArrowLeft' || e.key === 'Home' ? 'bug' : 'fix';
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <article className="card pad edge-card" id={`card-${card.id}`}>
      <header className="edge-card-head">
        <span className="edge-num" aria-hidden="true">{n}</span>
        <h3>{card.title}</h3>
      </header>
      <p className="edge-wrong"><strong>What goes wrong. </strong>{card.wrong}</p>

      {view === 'side' ? (
        <div className="edge-pair">
          <Pane kind="bug" code={card.buggy} />
          <Pane kind="fix" code={card.fixed} />
        </div>
      ) : (
        <div className="edge-tabbed">
          <div className="edge-tabs" role="tablist" aria-label={`${card.title}: buggy or fixed code`} onKeyDown={onTabKey}>
            {(['bug', 'fix'] as const).map((k) => (
              <button
                key={k}
                ref={(el) => { tabRefs.current[k] = el; }}
                role="tab"
                id={`tab-${card.id}-${k}`}
                aria-selected={tab === k}
                aria-controls={`panel-${card.id}`}
                tabIndex={tab === k ? 0 : -1}
                className={`edge-tab ${k}${tab === k ? ' on' : ''}`}
                onClick={() => setTab(k)}
              >
                {k === 'bug' ? 'Bug' : 'Fix'}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${card.id}`} aria-labelledby={`tab-${card.id}-${tab}`}>
            <Pane kind={tab} code={tab === 'bug' ? card.buggy : card.fixed} />
          </div>
        </div>
      )}

      <p className="edge-rule"><span className="edge-rule-label">Rule of thumb</span>{card.rule}</p>
    </article>
  );
}

export function EdgeCases() {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>(readView);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [active, setActive] = useState(EDGE_TOPICS[0].id);
  const searchRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const terms = q.split(/\s+/).filter(Boolean);
    return EDGE_TOPICS.map((t) => ({
      topic: t,
      cards: terms.length ? t.cards.filter((c) => { const h = haystack(t, c); return terms.every((w) => h.includes(w)); }) : t.cards,
    })).filter((x) => x.cards.length > 0);
  }, [q]);
  const shownCards = filtered.reduce((n, x) => n + x.cards.length, 0);
  const searching = q.length > 0;

  const pickView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const toggle = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const jump = (id: string) => {
    setCollapsed((s) => {
      if (!s.has(id)) return s;
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    setActive(id);
    // wait for the topic body to expand before scrolling
    requestAnimationFrame(() => {
      const el = document.getElementById(topicDomId(id));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.querySelector<HTMLElement>('button.edge-topic-toggle')?.focus({ preventScroll: true });
      }
    });
  };

  // highlight the topic currently under the top of the viewport
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      let cur = '';
      for (const { topic } of filtered) {
        const el = document.getElementById(topicDomId(topic.id));
        if (el && el.getBoundingClientRect().top <= 150) cur = topic.id;
      }
      if (!cur && filtered.length) cur = filtered[0].topic.id;
      if (cur) setActive(cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [filtered]);

  // "/" focuses the search box
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  let counter = 0;
  const allOpen = collapsed.size === 0;

  return (
    <main className="page edge-page">
      <section className="hero">
        <h1>Edge cases</h1>
        <p className="muted">The bugs that quietly fail interviews. Each card shows code that looks right, the input that breaks it, and the fix.</p>
        <div className="stats">
          <span><strong>{EDGE_TOPICS.length}</strong> topics</span>
          <span><strong>{EDGE_CARD_COUNT}</strong> cards</span>
          <span>Java</span>
        </div>
      </section>

      <div className="card pad edge-toolbar">
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics, bugs, code…  ( / )"
          aria-label="Search edge cases"
        />
        <div className="seg" role="group" aria-label="Code layout">
          <button className={view === 'side' ? 'on' : ''} aria-pressed={view === 'side'} onClick={() => pickView('side')}>Side by side</button>
          <button className={view === 'tabs' ? 'on' : ''} aria-pressed={view === 'tabs'} onClick={() => pickView('tabs')}>Tabs</button>
        </div>
        <button
          className="chip-btn"
          onClick={() => setCollapsed(allOpen ? new Set(EDGE_TOPICS.map((t) => t.id)) : new Set())}
          disabled={searching}
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
        <span className="muted small edge-count" role="status" aria-live="polite">
          {searching ? `${shownCards} of ${EDGE_CARD_COUNT} cards` : `${EDGE_CARD_COUNT} cards`}
        </span>
      </div>

      <div className="edge-layout">
        <nav className="card edge-nav" aria-label="Topics">
          <div className="card-title edge-nav-title">Topics</div>
          <ol>
            {EDGE_TOPICS.map((t, i) => {
              const hit = filtered.find((x) => x.topic.id === t.id);
              return (
                <li key={t.id}>
                  <a
                    href={`#${topicDomId(t.id)}`}
                    className={`${active === t.id ? 'on' : ''}${hit ? '' : ' off'}`}
                    aria-current={active === t.id ? 'true' : undefined}
                    aria-disabled={hit ? undefined : true}
                    onClick={(e) => {
                      e.preventDefault();
                      if (hit) jump(t.id);
                    }}
                  >
                    <span className="edge-nav-i">{i + 1}</span>
                    <span className="edge-nav-t">{t.title}</span>
                    <span className="edge-nav-n">{searching ? (hit ? hit.cards.length : 0) : t.cards.length}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="edge-main">
          {filtered.length === 0 && (
            <div className="card pad edge-empty">
              <strong>No cards match “{query}”.</strong>
              <p className="muted">Try a broader word such as “null”, “overflow”, “loop” or “stack”.</p>
              <button className="btn" onClick={() => setQuery('')}>Clear search</button>
            </div>
          )}
          {filtered.map(({ topic, cards }) => {
            const open = searching || !collapsed.has(topic.id);
            const idx = EDGE_TOPICS.findIndex((t) => t.id === topic.id) + 1;
            return (
              <section key={topic.id} id={topicDomId(topic.id)} className="edge-topic" aria-labelledby={`${topicDomId(topic.id)}-h`}>
                <h2 id={`${topicDomId(topic.id)}-h`} className="edge-topic-head">
                  <button
                    className="edge-topic-toggle"
                    aria-expanded={open}
                    aria-controls={`${topicDomId(topic.id)}-body`}
                    onClick={() => !searching && toggle(topic.id)}
                  >
                    <span className="edge-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
                    <span className="edge-topic-num">{idx}</span>
                    <span className="edge-topic-title">{topic.title}</span>
                    <span className="badge">{cards.length} {cards.length === 1 ? 'card' : 'cards'}</span>
                  </button>
                </h2>
                <div id={`${topicDomId(topic.id)}-body`} hidden={!open} className="edge-topic-body">
                  <p className="muted edge-blurb">{topic.blurb}</p>
                  {cards.map((c) => (
                    <CardView key={c.id} card={c} view={view} n={++counter} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
