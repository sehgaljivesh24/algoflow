import { useEffect, useMemo, useRef, useState } from 'react';
import { CodeSnippet } from '../components/CodePanel';
import { CHEATSHEET, TOTAL_CARDS, type CardTag, type CheatCard, type CheatTopic } from '../data/cheatsheet';

const TAG_CLASS: Record<CardTag, string> = {
  'must know': 'cs-tag-must',
  'very common': 'cs-tag-common',
  gotcha: 'cs-tag-gotcha',
};

const topicDomId = (id: string) => `cs-${id}`;

function matches(card: CheatCard, words: string[]): boolean {
  if (words.length === 0) return true;
  const hay = `${card.title}\n${card.tag ?? ''}\n${card.text}\n${card.pitfall ?? ''}\n${card.code}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

function Card({ card }: { card: CheatCard }) {
  return (
    <article className="cs-card" id={`card-${card.id}`}>
      <header className="cs-card-head">
        <h3 className="cs-card-title">{card.title}</h3>
        {card.tag && <span className={`badge cs-tag ${TAG_CLASS[card.tag]}`}>{card.tag}</span>}
      </header>
      <p className="cs-card-text">{card.text}</p>
      <CodeSnippet code={card.code} />
      {card.pitfall && (
        <p className="cs-pitfall">
          <strong>Watch out: </strong>
          {card.pitfall}
        </p>
      )}
    </article>
  );
}

function Topic({ topic, index, cards, open, forced, onToggle }: {
  topic: CheatTopic;
  index: number;
  cards: CheatCard[];
  open: boolean;
  forced: boolean;
  onToggle: () => void;
}) {
  const panelId = `${topicDomId(topic.id)}-panel`;
  const shown = open || forced;
  return (
    <section id={topicDomId(topic.id)} className="cs-topic" aria-labelledby={`${topicDomId(topic.id)}-h`}>
      <h2 className="cs-topic-h" id={`${topicDomId(topic.id)}-h`}>
        <button type="button" className="cs-topic-btn" aria-expanded={shown} aria-controls={panelId} onClick={onToggle} disabled={forced}>
          <span className="cs-chevron" aria-hidden>{shown ? '▾' : '▸'}</span>
          <span className="cs-topic-num">{index + 1}</span>
          <span className="cs-topic-name">{topic.title}</span>
          <span className="cs-topic-count">{cards.length === topic.cards.length ? topic.cards.length : `${cards.length} / ${topic.cards.length}`}</span>
        </button>
      </h2>
      {shown && (
        <div id={panelId} className="cs-panel">
          <p className="muted small cs-blurb">{topic.blurb}</p>
          <div className="cs-cards">
            {cards.map((c) => <Card key={c.id} card={c} />)}
          </div>
        </div>
      )}
    </section>
  );
}

export function Cheatsheet() {
  const [query, setQuery] = useState('');
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const [active, setActive] = useState(CHEATSHEET[0].id);
  const searchRef = useRef<HTMLInputElement>(null);

  const words = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const searching = words.length > 0;

  const visible = useMemo(
    () => CHEATSHEET.map((t) => ({ topic: t, cards: t.cards.filter((c) => matches(c, words)) })),
    [words],
  );
  const hits = visible.reduce((n, v) => n + v.cards.length, 0);

  const jumpTo = (id: string, smooth = true) => {
    setClosed((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setActive(id);
    // wait one frame so a just-opened panel is laid out before scrolling
    window.setTimeout(() => {
      const el = document.getElementById(topicDomId(id));
      if (!el) return;
      const calm = !smooth || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const offset = window.innerWidth <= 900 ? 112 : 76; // sticky header (+ jump strip on phones)
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: calm ? 'auto' : 'smooth' });
    }, 30);
  };

  // honour #topic in the URL on load and when it changes
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (CHEATSHEET.some((t) => t.id === id)) jumpTo(id, false);
    };
    go();
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, []);

  // highlight the topic currently under the header
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      let current = visible[0]?.topic.id;
      for (const v of visible) {
        const el = document.getElementById(topicDomId(v.topic.id));
        if (el && el.getBoundingClientRect().top <= 140) current = v.topic.id;
      }
      if (current) setActive(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [visible]);

  // "/" focuses the search box
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === '/' && !(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggle = (id: string) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const onNavClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    try { history.replaceState(null, '', `#${id}`); } catch { /* ignore */ }
    jumpTo(id);
  };

  return (
    <main className="page cs-page">
      <section className="hero">
        <h1>Java code tricks</h1>
        <p className="muted">A quick reference for coding interviews: the library calls, idioms and small routines you reach for every day. Snippets assume <code>import java.util.*;</code> at the top of the file.</p>
        <div className="stats">
          <span><strong>{CHEATSHEET.length}</strong> topics</span>
          <span><strong>{TOTAL_CARDS}</strong> cards</span>
        </div>
      </section>

      <div className="cs-tools">
        <label className="search-wrap cs-search">
          <span aria-hidden>🔍</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }}
            placeholder='Search titles, text and code (press "/" to focus)'
            aria-label="Search the cheatsheet"
          />
          {query && <button type="button" className="chip-btn" onClick={() => setQuery('')}>Clear</button>}
        </label>
        <div className="cs-bulk">
          <button type="button" className="chip-btn" onClick={() => setClosed(new Set())}>Expand all</button>
          <button type="button" className="chip-btn" onClick={() => setClosed(new Set(CHEATSHEET.map((t) => t.id)))}>Collapse all</button>
        </div>
        <span className="muted small cs-status" role="status" aria-live="polite">
          {searching ? `${hits} of ${TOTAL_CARDS} cards match` : `${TOTAL_CARDS} cards`}
        </span>
      </div>

      <div className="cs-layout">
        <nav className="cs-nav" aria-label="Cheatsheet topics">
          <ol className="cs-nav-list">
            {visible.map(({ topic, cards }, i) => (
              <li key={topic.id} className={cards.length === 0 ? 'cs-dim' : ''}>
                <a
                  href={`#${topic.id}`}
                  className={active === topic.id ? 'on' : ''}
                  aria-current={active === topic.id ? 'location' : undefined}
                  onClick={(e) => onNavClick(e, topic.id)}
                >
                  <span className="cs-nav-num">{i + 1}</span>
                  <span className="cs-nav-name">{topic.title}</span>
                  <span className="count">{cards.length}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="cs-main">
          {hits === 0 && (
            <div className="card pad cs-empty">
              No cards match <strong>{query}</strong>. Try a shorter term such as <button type="button" className="chip-btn" onClick={() => setQuery('map')}>map</button> or <button type="button" className="chip-btn" onClick={() => setQuery('sort')}>sort</button>.
            </div>
          )}
          {visible.map(({ topic, cards }) => {
            if (cards.length === 0) return null;
            const index = CHEATSHEET.findIndex((t) => t.id === topic.id);
            return (
              <Topic
                key={topic.id}
                topic={topic}
                index={index}
                cards={cards}
                open={!closed.has(topic.id)}
                forced={searching}
                onToggle={() => toggle(topic.id)}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}
