import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BRAND } from '../config';
import { CodePanel, useCodeLang } from '../components/CodePanel';
import { ControlBar } from '../components/ControlBar';
import { Emph } from '../components/pattern/Emph';
import { alertText, execLine, formatInput, narrationTone, phaseChips, tagText } from '../components/pattern/stepView';
import { AuxPanels, SceneView, sceneTitle } from '../components/SceneView';
import { Icon, approachIconName, sceneIcon } from '../components/viz/icons';
import { Rich } from '../components/viz/Rich';
import { ALL_ENTRIES } from '../data/catalog';
import { problemAccent } from '../data/problemAccent';
import { STATUS_LABEL, STATUS_ORDER, useNote, useProgress, useTheme } from '../data/storage';
import { useStepPlayer } from '../engine/useStepPlayer';
import type { AnyProblem, CellState, Status, Step } from '../engine/types';
import { isAnimated } from '../problems/lazy';
import { useProblem } from '../problems/useProblem';

export function ProblemPage() {
  const { slug = '' } = useParams();
  if (!isAnimated(slug)) return <NotAnimated slug={slug} />;
  // key = slug so switching problems fully resets loader and player state.
  return <LoadedPlayer key={slug} slug={slug} />;
}

/** Parts of the visualization card that keep their tallest height while stepping (see the layout effect in Player). */
const STEADY_PARTS = ['.vp-stage', '.aux-row', '.vp-narr', '.vp-exec'];

/** Fetches the problem's animation code (a separate chunk) before showing the lesson UI. */
function LoadedPlayer({ slug }: { slug: string }) {
  const state = useProblem(slug);
  if (state.status === 'ready') return <Player problem={state.problem} />;
  const entry = ALL_ENTRIES.find((e) => e.slug === slug);
  return (
    <main className="page narrow">
      <p className="crumbs"><Link to="/">Library</Link></p>
      <h1>{entry ? entry.title : 'Loading…'}</h1>
      <div className="card pad" role="status" aria-live="polite">
        {state.status === 'loading'
          ? <p className="muted">Loading animation…</p>
          : <p>Could not load this animation ({state.message}). Check your connection and reload the page.</p>}
      </div>
    </main>
  );
}

function NotAnimated({ slug }: { slug: string }) {
  const entry = ALL_ENTRIES.find((e) => e.slug === slug);
  return (
    <main className="page narrow">
      <p className="crumbs"><Link to="/">Library</Link></p>
      <h1>{entry ? `${entry.id !== 'GFG' && entry.id !== 'IB' ? `#${entry.id} ` : ''}${entry.title}` : 'Problem not found'}</h1>
      <div className="card pad">
        {entry ? (
          <>
            <p>This animation hasn't been built yet. It's on the list — <span className="muted">{entry.category} · {entry.tag}</span>.</p>
            <p className="muted">Animated problems are marked with ▶ in the library.</p>
          </>
        ) : (
          <p>No problem with that address exists.</p>
        )}
        <Link className="btn primary" to="/">← Back to library</Link>
      </div>
    </main>
  );
}

/** Where "Practice now" sends the learner: LeetCode's search for numbered problems, a site search for the others. */
function practiceUrl(problem: AnyProblem): string {
  if (problem.id === 'GFG') return `https://www.google.com/search?q=${encodeURIComponent(`GeeksforGeeks ${problem.title}`)}`;
  if (problem.id === 'IB') return `https://www.google.com/search?q=${encodeURIComponent(`InterviewBit ${problem.title}`)}`;
  return `https://leetcode.com/problemset/?search=${encodeURIComponent(problem.id)}`;
}

/**
 * The full lesson UI for one problem. `embedded` drops the page chrome (header, article, notes button)
 * so another page can show just the live animation.
 */
export function Player({ problem, embedded = false }: { problem: AnyProblem; embedded?: boolean }) {
  const Root = embedded ? 'div' : 'main';
  const [exIdx, setExIdx] = useState<number | null>(0);
  const [input, setInput] = useState(problem.examples[0].input);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');

  const steps = useMemo(() => problem.buildSteps(input), [problem, input]);
  const p = useStepPlayer(steps);
  const step = p.step;

  // Deep link: /problem/<slug>?step=7 opens the animation paused at that step (1-based).
  useEffect(() => {
    if (embedded) return;
    const n = Number(new URLSearchParams(window.location.search).get('step'));
    if (Number.isInteger(n) && n > 1) p.seek(n - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCustom = () => {
    try {
      setInput(problem.parseInput(custom));
      setExIdx(null);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid input');
    }
  };

  // Keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, button')) return;
      if (e.key === ' ') { e.preventDefault(); p.toggle(); }
      else if (e.key === 'ArrowRight') p.next();
      else if (e.key === 'ArrowLeft') p.prev();
      else if (e.key.toLowerCase() === 'r') p.reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [p]);

  const stepTone = step.result ? 'done' : step.logicTone === 'success' ? 'found' : '';
  const sceneKind = step.scene?.kind;
  const sc = step.scene;
  const hasGraph = sc?.kind === 'graph' || (sc?.kind === 'split' && sc.parts.some((x) => x.kind === 'graph'));
  const caption = problem.vizCaption ?? (!sceneKind || sceneKind === 'array' ? 'Current state' : '');

  /* pattern-page detail: accent of the family, phase chips, alert banner, tagged narration, executed line with live values */
  const [lang, setLang] = useCodeLang();
  const accent = useMemo(() => problemAccent(problem.slug, problem.category, problem.tag), [problem]);
  const final = !!step.result;
  const before = steps[Math.max(0, p.index - 1)];
  const { chips, active: activeChip } = phaseChips(problem, step, p.index, final, true);
  const tone = narrationTone(step, problem.phases, final, p.index);
  const hasAlert = useMemo(() => steps.some((s) => s.alert), [steps]);
  const hasAux = useMemo(() => steps.some((s) => s.aux && s.aux.length > 0), [steps]);
  const banner = alertText(step);

  /* Keep the content below the picture from jumping while stepping: the picture, the side panels, the narration and the
     code line never get shorter than the tallest state seen so far (grow-only, reset for a new example or a new width). */
  const vizRef = useRef<HTMLElement>(null);
  const steady = useRef<{ steps: Step[]; max: Record<string, number>; width: number }>({ steps, max: {}, width: 0 });
  /* Before the first paint of each step list (and when the width changes) every step's picture is rendered once, invisibly,
     to find the tallest one, so the picture area does not grow while it plays. */
  const [probed, setProbed] = useState<Step[] | null>(null);
  const probing = probed !== steps;
  const probeRef = useRef<HTMLDivElement>(null);
  const probeAuxRef = useRef<HTMLDivElement>(null);
  const probeSteps = useMemo(() => {
    if (steps.length <= 80) return steps;
    return Array.from({ length: 80 }, (_, i) => steps[Math.round((i * (steps.length - 1)) / 79)]);
  }, [steps]);
  useLayoutEffect(() => {
    const root = vizRef.current;
    if (!root) return;
    const s = steady.current;
    const width = root.clientWidth;
    const fresh = s.steps !== steps || (s.width !== 0 && Math.abs(s.width - width) > 2);
    if (fresh) { s.steps = steps; s.max = {}; if (!probeRef.current) setProbed(null); }
    s.width = width;
    const probe = probeRef.current;
    if (probe) {
      const stage = probe.parentElement as HTMLElement;
      const cs = getComputedStyle(stage);
      let h = 0;
      for (const c of Array.from(probe.children) as HTMLElement[]) h = Math.max(h, c.offsetHeight);
      s.max['.vp-stage'] = h + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const auxProbe = probeAuxRef.current;
      if (auxProbe) {
        let ah = 0;
        for (const c of Array.from(auxProbe.children) as HTMLElement[]) ah = Math.max(ah, c.offsetHeight);
        s.max['.aux-row'] = ah;
      }
      setProbed(steps);
    }
    for (const sel of STEADY_PARTS) {
      const el = root.querySelector<HTMLElement>(`:scope > ${sel}`);
      if (!el) continue;
      el.style.minHeight = '';
      const h = el.offsetHeight;
      if (h > (s.max[sel] ?? 0)) s.max[sel] = h;
      // the final picture is released so it is not followed by a blank band
      el.style.minHeight = sel === '.vp-stage' && final ? '' : `${s.max[sel] ?? 0}px`;
    }
  });
  const hint = execLine(problem, step, before, p.index, lang);
  const readable = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? formatInput(v) : null);
  const inputLine = readable(input) ? formatInput(input, true) : null;
  const words = useMemo(
    () => (problem.examples[0].input && typeof problem.examples[0].input === 'object' && !Array.isArray(problem.examples[0].input) ? Object.keys(problem.examples[0].input as object) : []),
    [problem],
  );

  return (
    <Root className={`vp${embedded ? ' embedded' : ''}`} style={{ '--vp-accent': `var(--${accent})` } as CSSProperties}>
      {!embedded && <Header problem={problem} />}

      <div className="vp-top">
        <section className="card vp-problem" aria-labelledby="vp-problem-h">
          <h2 className="card-title" id="vp-problem-h">Problem{embedded ? ` · ${problem.title}` : ''}</h2>
          <p className="q-stmt">
            {problem.statement.includes('`')
              ? <Rich text={problem.statement} />
              : <Emph text={problem.statement} terms={problem.emphasis ?? []} words={words} wholeWords />}
          </p>
          {problem.examples.map((ex, i) => (
            <div className="q-example" key={ex.label + i}>
              <div className="q-ex-label">Example {i + 1}</div>
              <div className="q-io"><span className="q-label">Input:</span><code>{readable(ex.input) ?? ex.label}</code></div>
              <div className="q-io"><span className="q-label">Output:</span><code>{ex.answer ?? ex.output}</code></div>
            </div>
          ))}
          <p className="q-constraints"><strong>Constraints:</strong> {problem.constraints}</p>
        </section>

        <section className="card vp-try" aria-labelledby="vp-try-h">
          <h2 className="card-title" id="vp-try-h">Try examples</h2>
          <div className="ex-row">
            {problem.examples.map((ex, i) => (
              <button
                key={ex.label + i}
                className={`vp-ex${exIdx === i ? ' active' : ''}`}
                onClick={() => { setInput(ex.input); setExIdx(i); setError(''); }}
              >
                <span className="ex-input">{ex.label}</span><span className="ex-arrow">→</span><span className="ex-output">{ex.output}</span>
              </button>
            ))}
          </div>
          <form className="vp-custom" onSubmit={(e) => { e.preventDefault(); runCustom(); }}>
            <label htmlFor="custom-input" className="vp-custom-label">Custom:</label>
            <input id="custom-input" className="vp-custom-input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={problem.inputPlaceholder} autoComplete="off" spellCheck={false} />
            <button className="vp-run" type="submit">▶ Run</button>
            {error && <span className="vp-err" role="alert">⚠ {error}</span>}
          </form>
        </section>
      </div>

      <div className="vp-body">
        <div className="vp-left">
          <ControlBar
            index={p.index} total={p.total} playing={p.playing} speed={p.speed}
            onSpeed={p.setSpeed} onPrev={p.prev} onNext={p.next} onToggle={p.toggle} onReset={p.reset} onSeek={p.seek}
          />

          <div className={`vp-appr-wrap${p.index === 0 ? '' : ' hidden'}`} aria-hidden={p.index !== 0}>
            <div className="vp-appr-clip">
              <div className="vp-appr">
                <span className="vp-appr-icon"><Icon name={approachIconName(problem.category, problem.tag)} size={44} /></span>
                <div>
                  <div className="vp-appr-label">Approach</div>
                  <div className="vp-appr-title">{problem.approach.title}</div>
                  <div className="vp-appr-text"><Rich text={problem.approach.text} /></div>
                </div>
              </div>
            </div>
          </div>

          <section className="card vp-viz" aria-label="Visualization" ref={vizRef}>
            <h2 className="card-title vp-viz-title">
              <span className="vp-viz-icon"><Icon name={sceneIcon(sceneKind, problem.viz === 'bars')} /></span>
              {problem.vizTitle ?? sceneTitle(step, problem.viz === 'bars')}
            </h2>
            <div className="vp-phases" aria-label="Phases">
              {chips.map((c, i) => (
                <div
                  key={i}
                  className={`vp-ph vp-tone-${c.tone}${i === activeChip ? ' on' : ''}`}
                  title={problem.phases ? c.label : problem.algorithm[i] ?? c.label}
                  aria-current={i === activeChip ? 'step' : undefined}
                >
                  {c.icon && <span className={c.num ? 'vp-ph-num' : 'vp-ph-ic'} aria-hidden>{c.icon}</span>}
                  <span className="vp-ph-txt">{c.label}</span>
                </div>
              ))}
            </div>
            {/* graph scenes draw their own node-colour legend */}
            {!hasGraph && problem.legend.length > 0 && (
              <div className="vp-legend" aria-label="Colour legend">
                {problem.legend.map((l: { label: string; state: CellState }) => (
                  <span key={l.label} className={`vp-leg lgd-${l.state}`}><i className="vp-leg-dot" aria-hidden />{l.label}</span>
                ))}
              </div>
            )}
            {hasAlert && (
              <div className="vp-alert-slot">
                {banner && <div className={`vp-alert${banner.startsWith('✅') ? ' ok' : ''}`} role="alert">{banner}</div>}
              </div>
            )}
            {caption && <div className="vp-caption">{caption}</div>}
            {inputLine && <div className="vp-inputline">{inputLine}</div>}
            <div className="vp-stage">
              <SceneView step={step} bars={problem.viz === 'bars'} legend={problem.legend} />
              {probing && (
                <div className="vp-probe" ref={probeRef} aria-hidden="true">
                  {probeSteps.map((s, i) => <div key={i}><SceneView step={s} bars={problem.viz === 'bars'} legend={problem.legend} /></div>)}
                </div>
              )}
              {probing && hasAux && (
                <div className="vp-probe" ref={probeAuxRef} aria-hidden="true">
                  {probeSteps.map((s, i) => <div key={i}><AuxPanels aux={s.aux} tone={s.logicTone} /></div>)}
                </div>
              )}
            </div>
            <AuxPanels aux={step.aux} tone={step.logicTone} />
            {hasAux && !step.aux?.length && <div className="aux-row" aria-hidden />}

            <div className={`vp-narr vp-tone-${tone}`} aria-live="polite" aria-atomic="true">
              <div className="vp-narr-text">
                {step.tag ? (
                  <>
                    <strong className="vp-narr-tag">{tagText(step)}</strong> <Rich text={step.desc} />
                  </>
                ) : (
                  <>
                    <strong className={`step-title ${stepTone}`}>{step.title}</strong>
                    <span className="step-desc"><Rich text={step.desc} /></span>
                  </>
                )}
              </div>
              <span className="step-ctr">{p.index + 1} / {p.total}</span>
            </div>
            {hint && <div className="vp-exec" title={`Line being executed (${lang === 'java' ? 'Java' : 'Python'}) with the live values`}><code>{hint}</code></div>}
          </section>

          {step.result && (
            <div className="vp-result" role="status" key={p.index}>
              <span className="vp-result-icon" aria-hidden>🎉</span>
              <div><div className="vp-result-h">{step.result.title}</div><div className="vp-result-p">{step.result.text}</div></div>
            </div>
          )}

          <VarsCard labels={problem.varLabels} vars={step.vars} />

          <section className="card vp-logic-card" aria-label="Step logic">
            <h2 className="card-title"><span aria-hidden>💡</span> Step logic</h2>
            <div className={`logic-box ${step.logicTone}`} aria-live="polite"><Rich text={step.logic} /></div>
          </section>

        </div>

        <div className="vp-right">
          <CodePanel
            title={problem.title}
            java={problem.java} python={problem.python}
            javaActive={step.javaLines} pyActive={step.pyLines}
            done={!!step.result}
            lang={lang} onLang={setLang}
          />

          <section className="card vp-algo">
            <h2 className="card-title">Algorithm</h2>
            <ol className="algo-list">
              {problem.algorithm.map((a: string, i: number) => (
                <li key={a} className={`al${i === step.algoStep ? ' on' : ''}`} aria-current={i === step.algoStep ? 'step' : undefined}>
                  <span className="al-num">{i + 1}</span>
                  <span className="al-txt"><Rich text={a} /></span>
                </li>
              ))}
            </ol>
            <div className="cplx-row">
              {problem.complexity.map((c: { label: string; value: string }) => (
                <div key={c.label} className="vp-cplx">
                  <div className="cplx-l">{c.label}</div>
                  <div className={`cplx-v ${/space|memory/i.test(c.label) ? 'space-c' : 'time-c'}`}>{c.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="card vp-why">
            <h2 className="card-title">Why it works</h2>
            <p className="why-p"><Rich text={problem.why} /></p>
          </section>
        </div>
      </div>

      {!embedded && <Article problem={problem} />}
      {!embedded && <NotesButton slug={problem.slug} />}
    </Root>
  );
}

/* ------------------------------------------------------------------ header */

function Header({ problem }: { problem: AnyProblem }) {
  const progress = useProgress();
  const [theme, toggleTheme] = useTheme();
  const status = progress.get(problem.slug);
  const label = problem.id === 'GFG' || problem.id === 'IB' ? problem.id : `LC #${problem.id}`;
  return (
    <header className="vp-header">
      <nav className="vp-crumbs" aria-label="Breadcrumb">
        <Link to="/">{BRAND}</Link><span aria-hidden>/</span><Link to="/">Animated problems</Link>
      </nav>
      <div className="vp-title-row">
        <h1 className="vp-title">{problem.title}</h1>
        <span className="lc-badge">{label}</span>
        <span className={`diff-badge-v ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
        <span className="tag-badge">{problem.tag}</span>
      </div>
      <div className="vp-head-right">
        <a className="vp-practice" href={practiceUrl(problem)} target="_blank" rel="noopener noreferrer">Practice now</a>
        <label className="vp-status">
          <span>Status</span>
          <select value={status} onChange={(e) => progress.set(problem.slug, e.target.value as Status)} aria-label="Progress status">
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <button className="vp-theme" onClick={toggleTheme} aria-label="Toggle colour theme" title="Toggle light / dark">
          <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
        </button>
      </div>
    </header>
  );
}

/* --------------------------------------------------------------- variables */

/** Variables grid: a box flashes green when its value changed since the previous step. */
function VarsCard({ labels, vars }: { labels: string[]; vars: Step['vars'] }) {
  const [memo, setMemo] = useState<{ vars: Step['vars']; changed: Set<string> }>({ vars, changed: new Set() });
  let changed = memo.changed;
  if (memo.vars !== vars) {
    changed = new Set(labels.filter((k) => String(memo.vars[k]) !== String(vars[k])));
    setMemo({ vars, changed });
  }
  return (
    <section className="card vp-vars" aria-label="Variables">
      <h2 className="card-title">Variables</h2>
      <div className="state-grid">
        {labels.map((k) => (
          // the value is part of the key so a changed box re-mounts and replays its flash
          <div className={`stbox${changed.has(k) ? ' flash' : ''}`} key={`${k}:${vars[k]}`}>
            <div className="st-lbl">{k}</div>
            <div className="st-val">{vars[k] ?? '—'}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- article */

function Article({ problem }: { problem: AnyProblem }) {
  const source = problem.id === 'GFG' ? 'GeeksforGeeks' : problem.id === 'IB' ? 'InterviewBit' : `LeetCode ${problem.id}`;
  const related = useMemo(
    () => ALL_ENTRIES.filter((e) => e.category === problem.category && e.slug !== problem.slug && isAnimated(e.slug)).slice(0, 9),
    [problem],
  );
  return (
    <article className="vx">
      <h2>How to solve {problem.title}</h2>
      <p className="vx-meta">
        {source} · {problem.difficulty} · {problem.category} · Pattern: <strong>{problem.tag}</strong>
      </p>

      <p><Rich text={problem.statement} /></p>

      {problem.naive && (
        <>
          <h3>Why the obvious approach is slow</h3>
          <p><Rich text={problem.naive} /></p>
        </>
      )}

      <h3>The key idea</h3>
      <p><strong>{problem.approach.title}.</strong> <Rich text={problem.approach.text} /></p>

      <h3>Step by step</h3>
      <ol className="vx-steps">
        {problem.algorithm.map((a: string) => <li key={a}><Rich text={a} /></li>)}
      </ol>

      <h3>Why it works</h3>
      <p><Rich text={problem.why} /></p>

      <h3>Remember</h3>
      <p>
        {problem.complexity.map((c: { label: string; value: string }, i: number) => (
          <span key={c.label}>{i > 0 && ' · '}{c.label}: <strong className="mono">{c.value}</strong></span>
        ))}
      </p>

      {related.length > 0 && (
        <>
          <h3>More {problem.category} problems</h3>
          <ul className="vx-links">
            {related.map((e) => (
              <li key={e.slug}>
                <Link to={`/problem/${e.slug}`}>{e.title}</Link>
                <span>{e.id === 'GFG' || e.id === 'IB' ? e.id : `#${e.id}`} · {e.difficulty} · {e.tag}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

/* ------------------------------------------------------------- notes button */

function NotesButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useNote(slug);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!open) return;
    area.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <div className="vp-notes">
      {open && (
        <div className="vp-notes-panel" role="dialog" aria-label="My notes">
          <div className="vp-notes-head">
            <strong>My notes</strong>
            <button className="vp-notes-x" onClick={() => setOpen(false)} aria-label="Close notes">✕</button>
          </div>
          <textarea ref={area} rows={7} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Private notes — saved in this browser." aria-label="Notes for this problem" />
        </div>
      )}
      <button className="vp-fab" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close notes' : 'Open my notes'} title="My notes">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" />
        </svg>
      </button>
    </div>
  );
}
