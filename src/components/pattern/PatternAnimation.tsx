import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import type { AnyProblem, Aux, Pointer, Step } from '../../engine/types';
import type { Accent } from '../../data/patternAccent';
import { SceneView } from '../SceneView';
import { Emph } from './Emph';
import { alertText as alertOf, execLine, formatInput, narrationTone, phaseChips, tagText as tagOf } from './stepView';

const SPEEDS = [
  { name: 'Slow', ms: 1500 },
  { name: 'Normal', ms: 900 },
  { name: 'Fast', ms: 450 },
  { name: 'Turbo', ms: 180 },
];

/** 'window' = a sliding window (l / r pointers or the highlighted run of cells); 'search' = the lo..hi range of a binary search. */
export type FrameKind = 'window' | 'search';

const PAIRS: Record<FrameKind, [string, string][]> = {
  window: [['l', 'r'], ['left', 'right']],
  search: [['lo', 'hi'], ['low', 'high']],
};

/** Inclusive [l, r] of the framed range in this step, or null when no range is on screen. */
function windowRange(step: Step, kind: FrameKind): [number, number] | null {
  const ptrs: Pointer[] = step.scene?.kind === 'array' ? step.scene.pointers : step.pointers ?? [];
  const cells = step.scene?.kind === 'array' ? step.scene.cells : step.cells ?? [];
  const named = (name: string) => ptrs.find((p) => p.id.toLowerCase() === name || p.label.toLowerCase() === name);
  for (const [a, b] of PAIRS[kind]) {
    const l = named(a);
    const r = named(b);
    if (l && r && l.index <= r.index) return [l.index, r.index];
  }
  if (kind === 'search') return null;
  const on = cells.map((c, i) => (c.state === 'active' || c.state === 'compare' || c.state === 'found' ? i : -1)).filter((i) => i >= 0);
  if (on.length === 0) return null;
  const lo = on[0];
  const hi = on[on.length - 1];
  return hi - lo + 1 === on.length ? [lo, hi] : null;
}

const RECORD_KEY = /(max|best|ans|result|longest|shortest|min)/i;

/** `'p' ×2` -> bold key and a small count. */
function chipContent(item: string): ReactNode {
  const m = /^(.*?)\s*(×\s*\d+)$/.exec(item);
  return m && m[1] ? <><b>{m[1]}</b> <small>{m[2].replace(/\s+/g, '')}</small></> : item;
}

function AuxRow({ aux }: { aux?: Aux[] }) {
  if (!aux?.length) return null;
  return (
    <div className="pp-aux-row">
      {aux.map((a) => (
        <div key={a.title} className="pp-aux">
          <div className="pp-aux-title">{a.title}</div>
          {a.items.length === 0 ? (
            <div className="pp-aux-empty">empty</div>
          ) : (
            <div className={`pp-aux-items ${a.kind}`}>
              {a.items.map((it, i) => (
                <span key={i} className={`pp-aux-chip${a.highlight === i ? ' hl' : ''}${a.bad?.includes(i) ? ' bad' : ''}`}>{chipContent(it)}</span>
              ))}
              {(a.kind === 'stack' || a.kind === 'queue') && <span className="pp-aux-end">{a.kind === 'stack' ? '← top' : '← back'}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface Props {
  problem: AnyProblem;
  /** Header text: "Live animation · <pattern> · LC #<id>". */
  heading: string;
  /** Show the sliding-window overlay and the window colour language (window patterns only). */
  windowed: boolean;
  /** "k=" label style: fixed windows show k=<n>, variable ones len <n>. */
  fixedWindow: boolean;
  /** Frame the lo..hi range of a binary search (no window colours). */
  searchRange?: boolean;
  /** Accent colour of the animation card (default cyan). */
  accent?: Accent;
  /** Example selector (tab bar + callout), rendered between the heading and the problem box. */
  tabs?: ReactNode;
  /** Id of the element that labels this panel when the example tabs are present. */
  panelLabelledBy?: string;
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || !!t.closest('[role="tab"]'));

export function PatternAnimation({ problem, heading, windowed, fixedWindow, searchRange = false, accent = 'cyan', tabs, panelLabelledBy }: Props) {
  const example = problem.examples[0];
  const steps = useMemo(() => problem.buildSteps(example.input), [problem, example]);
  const last = steps.length - 1;
  const framed = windowed || searchRange;
  const kind: FrameKind = windowed ? 'window' : 'search';

  const [params] = useSearchParams();
  const [cur, setCur] = useState(() => {
    const n = Number(params.get('step'));
    return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n) - 1, last) : 0;
  });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setCur((c) => Math.min(c + 1, last)), SPEEDS[speed].ms);
    return () => window.clearInterval(id);
  }, [playing, speed, last]);
  useEffect(() => {
    if (playing && cur >= last) setPlaying(false);
  }, [playing, cur, last]);

  const toggle = useCallback(() => {
    if (!playing && cur >= last) setCur(0);
    setPlaying((p) => !p);
  }, [playing, cur, last]);
  const next = () => setCur((c) => Math.min(c + 1, last));
  const prev = () => {
    setPlaying(false);
    setCur((c) => Math.max(c - 1, 0));
  };
  const reset = () => {
    setPlaying(false);
    setCur(0);
  };

  // ← / → step through the animation (unless the user is typing or moving between example tabs)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isTyping(e.target)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCur((c) => Math.min(c + 1, last));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlaying(false);
        setCur((c) => Math.max(c - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [last]);

  const step = steps[cur];
  const before = steps[Math.max(0, cur - 1)];
  const final = !!step.result;
  // On the last step the best window found so far stays framed (in gold), like the reference.
  const bestRange = useMemo(() => {
    if (!windowed) return null;
    const key = problem.varLabels.find((k) => RECORD_KEY.test(k));
    if (!key) return null;
    for (let i = steps.length - 2; i > 0; i--) {
      if (String(steps[i].vars[key]) !== String(steps[i - 1].vars[key])) return windowRange(steps[i], 'window');
    }
    return null;
  }, [windowed, problem, steps]);
  const rng = framed ? windowRange(step, kind) ?? (final && windowed ? bestRange : null) : null;
  const lo = rng ? rng[0] : -1;
  const hi = rng ? rng[1] : -1;
  const hasAlert = useMemo(() => steps.some((s) => s.alert), [steps]);

  /* ---- window frame: measured from the rendered cells ---- */
  const innerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const shown = useRef(false);
  const frameTone = final && windowed ? 'best' : step.alert ? 'warn' : '';
  const place = useCallback(() => {
    const inner = innerRef.current;
    const ov = overlayRef.current;
    if (!inner || !ov) return;
    // keep the picture from jumping in height while it plays
    const h = inner.offsetHeight;
    const min = parseFloat(inner.style.minHeight || '0');
    if (h > min) inner.style.minHeight = `${h}px`;
    let nodes = inner.querySelectorAll<HTMLElement>('[data-cell-index]');
    if (nodes.length === 0) nodes = inner.querySelectorAll<HTMLElement>('.viz-box');
    const a = lo >= 0 ? nodes[lo] : undefined;
    const b = hi >= 0 ? nodes[hi] : undefined;
    if (!a || !b) {
      ov.classList.remove('visible');
      shown.current = false;
      return;
    }
    const base = inner.getBoundingClientRect();
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const PAD = 5;
    const jump = !shown.current;
    if (jump) ov.classList.add('jump');
    ov.style.transform = `translateX(${ra.left - base.left - PAD}px)`;
    ov.style.width = `${rb.right - ra.left + PAD * 2}px`;
    ov.style.top = `${ra.top - base.top - PAD}px`;
    ov.style.height = `${ra.height + PAD * 2}px`;
    ov.classList.add('visible');
    ov.classList.toggle('best', frameTone === 'best');
    ov.classList.toggle('warn', frameTone === 'warn');
    if (jump) {
      void ov.offsetWidth;
      ov.classList.remove('jump');
    }
    shown.current = true;
  }, [lo, hi, frameTone]);
  useLayoutEffect(() => {
    place();
  }, [place, cur]);
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => place());
    ro.observe(inner);
    return () => ro.disconnect();
  }, [place]);

  /* ---- derived text ---- */
  /* Live values on the code line: an authored `note`, otherwise the variables that changed on this step (up to 3). */
  const hint = execLine(problem, step, before, cur);
  const tone = narrationTone(step, problem.phases, final, cur);
  const inputText = formatInput(example.input) ?? example.label;
  const caption = problem.vizCaption ?? formatInput(example.input, true) ?? example.label;
  const kv = (example.input as { k?: unknown } | null)?.k;
  const label = lo >= 0 ? (windowed ? (fixedWindow ? `k=${typeof kv === 'number' ? kv : hi - lo + 1}` : `len ${hi - lo + 1}`) : `${lo}..${hi}`) : '';
  const words = useMemo(
    () => (example.input && typeof example.input === 'object' && !Array.isArray(example.input) ? Object.keys(example.input as object) : []),
    [example],
  );

  /* ---- phase chips: `phases` when given (index = algoStep), otherwise one chip per algorithm step plus Done ---- */
  const { chips, active: activeChip } = phaseChips(problem, step, cur, final);

  const tagText = tagOf(step);
  const alertText = alertOf(step);

  return (
    <section
      className={`pp-card pp-anim${windowed ? ' pp-window' : ''}`}
      id="pp-expanel"
      style={{ '--pp-accent': `var(--${accent})` } as CSSProperties}
      role={panelLabelledBy ? 'tabpanel' : undefined}
      aria-labelledby={panelLabelledBy ?? 'pp-anim-title'}
    >
      <header className="pp-anim-head">
        <h2 className="pp-anim-top" id="pp-anim-title">{heading}</h2>
        {tabs}
        <div className="pp-problem">
          <div className="pp-q-row">
            <span className="pp-q-label">Problem</span>
            <Link className="pp-full" to={`/problem/${problem.slug}`}>Open the full visualizer →</Link>
          </div>
          <Emph text={problem.statement} terms={problem.emphasis ?? []} words={words} />
          <div className="pp-io">
            <strong>Input:</strong> {inputText} <span className="pp-dot">·</span> <strong>Answer:</strong> {example.answer ?? example.output}
          </div>
        </div>
      </header>

      <div className="pp-ctrl" role="group" aria-label="Animation controls">
        <button type="button" className="pp-btn primary" onClick={toggle}>{playing ? '⏸ Pause' : '▶ Play'}</button>
        <button type="button" className="pp-btn" onClick={prev} disabled={cur === 0}>◀ Prev</button>
        <button type="button" className="pp-btn" onClick={next} disabled={cur >= last}>Next ▶</button>
        <button type="button" className="pp-btn" onClick={reset}>⟲ Reset</button>
        <select className="pp-speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Speed">
          {SPEEDS.map((s, i) => <option key={s.name} value={i}>{s.name}</option>)}
        </select>
        <span className="pp-stepinfo">Step {cur + 1} / {steps.length}</span>
      </div>
      <div className="pp-prog" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={cur + 1} aria-label="Animation progress">
        <div className="pp-prog-fill" style={{ width: `${last > 0 ? (cur / last) * 100 : 0}%` }} />
      </div>

      <div className="pp-phases" aria-label="Phases">
        {chips.map((c, i) => (
          <div
            key={i}
            className={`pp-ph pp-tone-${c.tone}${i === activeChip ? ' on' : ''}`}
            title={c.label}
            aria-current={i === activeChip ? 'step' : undefined}
          >
            {c.icon && <span className="pp-ph-ic" aria-hidden>{c.icon}</span>}
            {c.label}
          </div>
        ))}
      </div>

      {problem.legend.length > 0 && (
        <div className="pp-legend" aria-label="Colour legend">
          {problem.legend.map((l) => (
            <span key={l.label} className={`pp-leg ld-${l.state}`}><i className="pp-leg-dot" aria-hidden />{l.label}</span>
          ))}
        </div>
      )}

      {hasAlert && (
        <div className="pp-alert-slot">
          {alertText && <div className={`pp-alert${alertText.startsWith('✅') ? ' ok' : ''}`} role="alert">{alertText}</div>}
        </div>
      )}

      <div className="pp-caption">{caption}</div>

      <div className={`pp-picture${framed ? ' framed' : ''}`}>
        <div className="pp-picture-inner" ref={innerRef}>
          <SceneView step={step} bars={problem.viz === 'bars'} layout="pattern" />
          {framed && (
            <div className="pp-overlay" ref={overlayRef} aria-hidden="true">
              <span className="pp-overlay-label">{label}</span>
            </div>
          )}
        </div>
      </div>
      <div className="pp-stats">
        {problem.varLabels.map((k: string) => {
          const v = step.vars[k];
          const changed = cur > 0 && String(v) !== String(before.vars[k]);
          const record = changed && RECORD_KEY.test(k);
          return (
            <div key={record ? `${k}-${cur}` : k} className={`pp-stat${record ? ' record' : ''}${k === 'window' ? ' accent' : ''}`}>
              {k} = <span className="pp-stat-val">{v ?? '—'}</span>
            </div>
          );
        })}
      </div>

      <AuxRow aux={step.aux} />

      <div className={`pp-desc pp-tone-${tone}`} aria-live="polite" aria-atomic="true">
        {step.tag ? (
          <>
            <strong className="pp-desc-tag">{tagText}</strong> {step.desc}
          </>
        ) : (
          <>
            <strong>{step.title}</strong>
            {step.desc ? <> — {step.desc}</> : null}
            {final && step.result && <span className="pp-result"> {step.result.title}: {step.result.text}</span>}
          </>
        )}
      </div>
      {hint && <div className="pp-hint"><code>{hint}</code></div>}
    </section>
  );
}
