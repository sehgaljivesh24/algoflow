import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../../../styles-cs-pattern-index.css';
import { loadFragment, loadMeta } from './content';
import type { PatternIndexMeta, SectionMeta } from './content';
import { applyFilter, copyCodeFrom } from './behaviour';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Viewer for the imported "DSA Pattern Recognition - Cheat-Sheet" (roxoi/dsa-cheatsheet, MIT).
 * Markup and class names are the original's; behaviour is re-implemented here.
 */
export default function PatternIndexViewer() {
  const [meta, setMeta] = useState<PatternIndexMeta | null>(null);
  const [heroHtml, setHeroHtml] = useState('');
  const [loaded, setLoaded] = useState<Record<string, string>>({});
  const [active, setActive] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;
  const inflight = useRef(new Map<string, Promise<void>>());
  const userScrolled = useRef(false);
  const handledHash = useRef<string | null>(null);
  const queryRef = useRef(query);
  queryRef.current = query;

  // ---- title + manifest ----
  useEffect(() => {
    const prev = document.title;
    document.title = 'DSA Pattern Recognition — Cheat-Sheet';
    return () => {
      document.title = prev;
    };
  }, []);

  useEffect(() => {
    let dead = false;
    loadMeta()
      .then(async (m) => {
        const hero = await loadFragment(m.hero.file);
        if (dead) return;
        setHeroHtml(hero);
        setMeta(m);
      })
      .catch((e) => !dead && setError(String(e.message || e)));
    return () => {
      dead = true;
    };
  }, []);

  const sections = meta?.sections;
  const groups = useMemo(() => {
    const out: { wrapper: 'code' | null; sections: SectionMeta[] }[] = [];
    for (const s of sections || []) {
      const last = out[out.length - 1];
      if (last && last.wrapper === s.wrapper && s.wrapper) last.sections.push(s);
      else out.push({ wrapper: s.wrapper, sections: [s] });
    }
    return out;
  }, [sections]);
  const indexOf = useMemo(() => new Map((sections || []).map((s, i) => [s.id, i])), [sections]);

  // ---- lazy section loading ----
  /** Load the given section ids (in one batch, one render). */
  const ensure = useCallback(
    async (ids: string[], sync = false) => {
      if (!sections) return;
      const need = ids.filter((id) => loadedRef.current[id] === undefined);
      if (!need.length) return;
      const jobs = need.map((id) => {
        let job = inflight.current.get(id);
        if (!job) {
          const s = sections.find((x) => x.id === id);
          if (!s) return Promise.resolve();
          job = loadFragment(s.file)
            .then((html) => {
              loadedRef.current = { ...loadedRef.current, [id]: html };
            })
            .finally(() => inflight.current.delete(id));
          inflight.current.set(id, job);
        }
        return job;
      });
      await Promise.all(jobs);
      const snapshot = loadedRef.current;
      if (sync) flushSync(() => setLoaded(snapshot));
      else setLoaded(snapshot);
    },
    [sections],
  );

  const ensureThrough = useCallback(
    (id: string, sync = false) => {
      const idx = indexOf.get(id);
      if (idx === undefined || !sections) return Promise.resolve();
      return ensure(
        sections.slice(0, idx + 1).map((s) => s.id),
        sync,
      );
    },
    [ensure, indexOf, sections],
  );

  // ---- navigation to a section (nav click, in-page link, #hash) ----
  const goTo = useCallback(
    async (id: string, behavior: ScrollBehavior) => {
      if (!indexOf.has(id)) return;
      await ensureThrough(id, true);
      let el = document.getElementById(id);
      if (!el) return;
      if (el.classList.contains('hidden')) {
        // the filter hides this section: clear it, like jumping to a section from a fresh page
        flushSync(() => setQuery(''));
        queryRef.current = '';
        if (mainRef.current) applyFilter(mainRef.current, '');
        el = document.getElementById(id);
        if (!el) return;
      }
      el.scrollIntoView({ behavior, block: 'start' });
      if (behavior === 'auto') {
        // fonts finishing late reflow the page: re-align once, unless the reader already moved
        const target = el;
        document.fonts?.ready.then(() => {
          if (!userScrolled.current && target.isConnected) target.scrollIntoView({ block: 'start' });
        });
      }
    },
    [ensureThrough, indexOf],
  );

  // initial content: through the deep-link target (or the first two sections)
  useEffect(() => {
    if (!sections) return;
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (id && indexOf.has(id)) return; // the hash effect below loads what it needs
    void ensure(sections.slice(0, 2).map((s) => s.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  // #hash: on mount and whenever it changes (back/forward, manual edit, our own navigate)
  useEffect(() => {
    if (!meta) return;
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!id) {
      handledHash.current = '';
      return;
    }
    if (handledHash.current === location.hash) return;
    const first = handledHash.current === null;
    handledHash.current = location.hash;
    void goTo(id, first ? 'auto' : 'smooth');
  }, [location.hash, meta, goTo]);

  useEffect(() => {
    const mark = () => {
      userScrolled.current = true;
    };
    const opts = { passive: true } as AddEventListenerOptions;
    window.addEventListener('wheel', mark, opts);
    window.addEventListener('touchstart', mark, opts);
    window.addEventListener('keydown', mark);
    return () => {
      window.removeEventListener('wheel', mark);
      window.removeEventListener('touchstart', mark);
      window.removeEventListener('keydown', mark);
    };
  }, []);

  // sections near the viewport load on demand (observer, with a scroll fallback); the rest trickle in right after mount
  useEffect(() => {
    if (!sections || !mainRef.current) return;
    const main = mainRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const ids = entries.filter((e) => e.isIntersecting).map((e) => e.target.id);
        if (ids.length) void ensure(ids);
      },
      { rootMargin: '1800px 0px' },
    );
    main.querySelectorAll('section.topic').forEach((el) => io.observe(el));

    // fallback for browsers/situations where observer callbacks are late: look at the geometry on scroll/resize
    let raf = 0;
    const scan = () => {
      raf = 0;
      const ids: string[] = [];
      main.querySelectorAll<HTMLElement>('section.topic[data-loaded="0"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom > -1800 && r.top < window.innerHeight + 1800) ids.push(el.id);
      });
      if (ids.length) void ensure(ids);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(scan);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    let stopped = false;
    let timer = 0;
    const trickle = () => {
      if (stopped) return;
      const rest = sections.filter((s) => loadedRef.current[s.id] === undefined).map((s) => s.id);
      if (!rest.length) return;
      void ensure(rest.slice(0, 2)).then(
        () => {
          timer = window.setTimeout(trickle, 150);
        },
        () => {
          timer = window.setTimeout(trickle, 2000); // a failed chunk is retried later
        },
      );
    };
    timer = window.setTimeout(trickle, 500);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      io.disconnect();
    };
  }, [sections, ensure]);

  // ---- scroll-spy (same observer settings as the original) ----
  useEffect(() => {
    if (!sections || !mainRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-10% 0px -75% 0px', threshold: 0 },
    );
    mainRef.current.querySelectorAll('section.topic').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  // ---- filter: hides non-matching topics and table rows, like the original ----
  useEffect(() => {
    if (!sections) return;
    const q = norm(query);
    if (q && sections.some((s) => loadedRef.current[s.id] === undefined)) void ensure(sections.map((s) => s.id));
    if (mainRef.current) applyFilter(mainRef.current, q);
  }, [query, loaded, sections, ensure]);

  // ---- copy buttons: one delegated handler for every code block ----
  const copyTimers = useRef(new Set<number>());
  useEffect(() => {
    const timers = copyTimers.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
    };
  }, []);

  const onMainClick = (e: ReactMouseEvent<HTMLElement>) => {
    const target = e.target as Element;
    const btn = target.closest?.('button.copy-btn') as HTMLButtonElement | null;
    if (btn) {
      copyCodeFrom(btn, copyTimers.current);
      return;
    }
    const a = target.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
    if (a) {
      const id = decodeURIComponent((a.getAttribute('href') || '').slice(1));
      if (indexOf.has(id)) {
        e.preventDefault();
        jump(id);
      }
    }
  };

  const jump = (id: string) => {
    const hash = `#${id}`;
    handledHash.current = hash;
    if (location.hash !== hash) navigate({ hash });
    void goTo(id, 'smooth');
  };

  const onNavClick = (e: ReactMouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setOpen(false);
    jump(id);
  };

  if (error) {
    return (
      <div className="cs-pi">
        <main style={{ padding: 40 }}>
          <p>Could not load the DSA Pattern Index content: {error}</p>
        </main>
      </div>
    );
  }
  if (!meta) return <div className="cs-pi" aria-busy="true" />;

  return (
    <div className="cs-pi">
      <div className="wrap">
        <aside className={`sidebar${open ? ' open' : ''}`} id="sidebar">
          <div className="sidebar-top">
            <div>
              <div className="brand">Field Manual</div>
              <h1 className="brand-title">DSA Pattern Index</h1>
            </div>
            <button
              type="button"
              className="menu-toggle"
              id="menuToggle"
              aria-label="Toggle navigation menu"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? 'close' : 'menu'}
            </button>
          </div>
          <input
            type="text"
            className="search-box"
            id="searchBox"
            placeholder={'Filter patterns…'}
            aria-label="Filter patterns"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <nav>
            {meta.sections.map((s) => (
              <Fragment key={s.id}>
                {s.divider && <div className="nav-divider">{s.divider}</div>}
                <a
                  href={`#${s.id}`}
                  className={`nav-link${active === s.id ? ' active' : ''}`}
                  data-id={s.id}
                  onClick={(e) => onNavClick(e, s.id)}
                >
                  <span className="nav-num">{s.navNumber}</span>
                  {s.navTitle}
                </a>
              </Fragment>
            ))}
          </nav>
          <div className="sidebar-foot">
            <Link to="/cheatsheets">{'←'} AlgoFlow</Link>
          </div>
        </aside>

        <main ref={mainRef} onClick={onMainClick}>
          <div className="hero" dangerouslySetInnerHTML={{ __html: heroHtml }} />
          {groups.map((g, gi) => {
            const items = g.sections.map((s) => {
              const html = loaded[s.id];
              return html === undefined ? (
                <section key={s.id} className="topic" id={s.id} data-loaded="0" style={{ minHeight: s.estHeight }} />
              ) : (
                <section key={s.id} className="topic" id={s.id} data-loaded="1" dangerouslySetInnerHTML={{ __html: html }} />
              );
            });
            // the original page nests most sections inside one stray <code> element; keep that rendering
            return g.wrapper === 'code' ? <code key={gi}>{items}</code> : <Fragment key={gi}>{items}</Fragment>;
          })}
          <footer className="cs-attrib">
            <p>
              Content {'©'} roxoi {'—'} MIT License {'—'} Source:{' '}
              <a href={meta.sourceUrl} target="_blank" rel="noopener noreferrer">
                {meta.sourceUrl.replace(/^https?:\/\//, '')}
              </a>
            </p>
            <p>
              <Link to="/cheatsheets/credits">Credits &amp; licenses</Link> {'·'} <Link to="/cheatsheets">{'←'} AlgoFlow</Link>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
