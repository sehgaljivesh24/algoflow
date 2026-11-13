import { useCallback, useEffect, useMemo, type ComponentProps } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Emph } from '../components/pattern/Emph';
import { ExampleTabs, problemRef, type ExampleTab } from '../components/pattern/ExampleTabs';
import { PatternAnimation } from '../components/pattern/PatternAnimation';
import { PatternTemplate } from '../components/pattern/PatternTemplate';
import { PracticeList } from '../components/pattern/PracticeList';
import { familyMeta } from '../components/shell/familyMeta';
import { BRAND } from '../config';
import { useTheme } from '../data/storage';
import { ALL_PATTERNS, CONTENT, examplesFor } from '../data/patterns';
import { PATTERN_META, type PatternMeta } from '../data/patternMeta';
import { accentFor } from '../data/patternAccent';
import { ALL_ENTRIES } from '../data/catalog';
import { isAnimated } from '../problems/lazy';
import { useProblem } from '../problems/useProblem';

const ENTRY_BY_SLUG = new Map(ALL_ENTRIES.map((e) => [e.slug, e]));

/** Loads the example's animation code (a separate chunk) and shows the live animation; tabs stay usable meanwhile. */
function LazyAnimation({ slug, ...rest }: { slug: string } & Omit<ComponentProps<typeof PatternAnimation>, 'problem'>) {
  const state = useProblem(slug);
  if (state.status === 'ready') return <PatternAnimation problem={state.problem} {...rest} />;
  return (
    <section
      className="pp-card pp-anim"
      id="pp-expanel"
      role={rest.panelLabelledBy ? 'tabpanel' : undefined}
      aria-labelledby={rest.panelLabelledBy ?? 'pp-anim-title'}
      aria-busy={state.status === 'loading'}
    >
      <header className="pp-anim-head">
        <h2 className="pp-anim-top" id="pp-anim-title">{rest.heading}</h2>
        {rest.tabs}
        <p className="muted" role="status" aria-live="polite">
          {state.status === 'loading' ? 'Loading animation…' : `Could not load this animation (${state.message}). Reload the page to try again.`}
        </p>
      </header>
    </section>
  );
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName));

export function PatternPage() {
  const { slug = '' } = useParams();
  const [theme, toggleTheme] = useTheme();
  const [params, setParams] = useSearchParams();
  const card = ALL_PATTERNS.find((p) => p.slug === slug);
  const content = CONTENT[slug];

  // worked examples: every entry whose problem is animated (a pattern without pack examples has just its flagship)
  const tabs = useMemo<ExampleTab[]>(() => {
    const out: ExampleTab[] = [];
    for (const e of examplesFor(slug)) {
      const problem = ENTRY_BY_SLUG.get(e.slug);
      if (problem && isAnimated(e.slug) && !out.some((t) => t.problem.slug === e.slug)) out.push({ problem, why: e.why });
    }
    return out;
  }, [slug]);

  const exParam = Number(params.get('ex'));
  const active = Number.isFinite(exParam) && exParam >= 1 ? Math.min(Math.floor(exParam), tabs.length || 1) - 1 : 0;
  const select = useCallback(
    (i: number) => {
      if (i < 0 || i >= tabs.length || i === active) return;
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('ex', String(i + 1));
          next.delete('step'); // a new example always starts at step 1
          return next;
        },
        { replace: true },
      );
    },
    [tabs.length, active, setParams],
  );

  // [ and ] (or Alt+1..9) switch examples; ← / → step the animation (handled in PatternAnimation)
  useEffect(() => {
    if (tabs.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || isTyping(e.target)) return;
      if (e.altKey && /^[1-9]$/.test(e.key)) {
        select(Number(e.key) - 1);
        e.preventDefault();
      } else if (!e.altKey && e.key === ']') select(Math.min(active + 1, tabs.length - 1));
      else if (!e.altKey && e.key === '[') select(Math.max(active - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tabs.length, active, select]);

  if (!card) {
    return (
      <div className="pp-root">
        <header className="pp-header">
          <Link className="pp-back" to="/patterns">← Patterns</Link>
        </header>
        <main className="pp-body">
          <section className="pp-card pp-soon">
            <h1 className="pp-soon-title">Pattern not found</h1>
            <p>There is no pattern called “{slug}”.</p>
          </section>
        </main>
      </div>
    );
  }

  const [time, space] = card.complexity.split(' / ');
  // new patterns may lack a PATTERN_META entry: derive a sensible icon / label / copy from the card and its family
  const stored: Partial<PatternMeta> = PATTERN_META[slug] ?? {};
  const meta: PatternMeta = {
    icon: stored.icon || familyMeta(card.group).icon,
    label: stored.label || card.tags[0] || card.group,
    desc: stored.desc || content?.summary || '',
    useNote: stored.useNote || content?.tip || '',
    complexityNote:
      stored.complexityNote || `Time ${time}${space ? `, extra space ${space}` : ''}. See the template below for where the cost comes from.`,
    highlight: stored.highlight ?? [],
  };
  const hl = meta.highlight;
  const windowed = slug.startsWith('sliding-window');
  const searchRange = slug.startsWith('binary-search');
  const current = tabs[active];

  return (
    <div className="pp-root">
      <header className="pp-header">
        <Link className="pp-back" to="/patterns">← Patterns</Link>
        <nav className="pp-crumbs" aria-label="Breadcrumb">
          <Link to="/">{BRAND}</Link> → <span>{card.group}</span> → <em aria-current="page">{card.title}</em>
        </nav>
        <div className="pp-header-right">
          <button type="button" className="pp-theme" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
          <span className="pp-tag">{meta.icon} {meta.label}</span>
        </div>
      </header>

      <main className="pp-body">
        <section className="pp-hero" aria-labelledby="pp-title">
          <div className="pp-hero-top">
            <span className="pp-hero-icon" aria-hidden>{meta.icon}</span>
            <div>
              <h1 className="pp-hero-title" id="pp-title"><Emph text={card.title} terms={hl} as="em" /></h1>
              {meta.desc && <p className="pp-hero-desc">{meta.desc}</p>}
            </div>
          </div>
          <div className="pp-hero-meta">
            {card.tags.map((t) => <span key={t} className="pp-hero-tag">{t}</span>)}
            <span className="pp-cx-pill">Time <strong>{time}</strong></span>
            {space && <span className="pp-cx-pill">Space <strong>{space}</strong></span>}
          </div>
        </section>

        {content && current ? (
          <>
            <div className="pp-info-row">
              <section className="pp-card pp-info" aria-labelledby="pp-use-title">
                <h2 className="pp-label" id="pp-use-title">📋 When to use</h2>
                <ul className="pp-use-list">
                  {content.whenToUse.map((w) => <li key={w}><span><Emph text={w} terms={hl} /></span></li>)}
                </ul>
                {meta.useNote && <div className="pp-use-note"><span aria-hidden>💡 </span>{meta.useNote}</div>}
              </section>
              <section className="pp-card pp-info" aria-labelledby="pp-cx-title">
                <h2 className="pp-label" id="pp-cx-title">⚡ Complexity</h2>
                <div className={`pp-cx-grid${space ? '' : ' single'}`}>
                  <div className="pp-cx-card time"><div className="pp-cx-lbl">Time</div><div className="pp-cx-val">{time}</div></div>
                  {space && <div className="pp-cx-card space"><div className="pp-cx-lbl">Space</div><div className="pp-cx-val">{space}</div></div>}
                </div>
                {meta.complexityNote && <p className="pp-cx-note">{meta.complexityNote}</p>}
              </section>
            </div>

            <LazyAnimation
              key={current.problem.slug}
              slug={current.problem.slug}
              heading={`Live animation · ${card.title} · ${problemRef(current.problem)}`}
              windowed={windowed}
              searchRange={searchRange}
              accent={accentFor(slug, card.group)}
              fixedWindow={slug === 'sliding-window-fixed' || slug === 'sliding-window-max'}
              tabs={<ExampleTabs tabs={tabs} active={active} onSelect={select} />}
              panelLabelledBy={tabs.length > 1 ? `pp-extab-${active}` : undefined}
            />

            {content.template && <PatternTemplate code={content.template} />}
            <PracticeList items={content.practice} />
          </>
        ) : (
          <section className="pp-card pp-soon" aria-live="polite">
            <h2 className="pp-anim-top">Live animation</h2>
            <p className="pp-soon-title">Animation coming soon</p>
            <p className="pp-soon-text">The walkthrough, template and practice list for this pattern are still being written.</p>
            <Link className="pp-btn primary" to="/patterns">← Back to all patterns</Link>
          </section>
        )}
      </main>
    </div>
  );
}
