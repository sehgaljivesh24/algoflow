import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ALL_PATTERNS, CONTENT } from '../data/patterns';
import { QUIZ_LENGTH, QUIZ_QUESTIONS, type QuizQuestion } from '../data/quiz';

/* ───────────────────────── persistence ───────────────────────── */

const STORE_KEY = 'algoflow.quiz.attempts';

interface Attempt {
  score: number;
  total: number;
  secs: number;
  at: number;
}

function loadAttempts(): Attempt[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    return data.filter(
      (a): a is Attempt =>
        !!a && typeof a.score === 'number' && typeof a.total === 'number' && typeof a.secs === 'number' && typeof a.at === 'number' && a.total > 0,
    );
  } catch {
    return [];
  }
}

function saveAttempts(list: Attempt[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: stats just won't persist */
  }
}

/* ───────────────────────── helpers ───────────────────────── */

interface Run {
  qs: QuizQuestion[];
  answers: (number | null)[];
  hints: boolean[];
  idx: number;
  startedAt: number;
}

const patternTitle = (slug: string) => ALL_PATTERNS.find((p) => p.slug === slug)?.title ?? slug;

function PatternRef({ slug }: { slug: string }) {
  const title = patternTitle(slug);
  return CONTENT[slug] ? <Link to={`/patterns/${slug}`}>{title}</Link> : <span>{title}</span>;
}

function pickQuestions(n: number): QuizQuestion[] {
  const pool = [...QUIZ_QUESTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

const fmtTime = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const newRun = (qs: QuizQuestion[], startedAt = Date.now()): Run => ({
  qs,
  answers: qs.map(() => null),
  hints: qs.map(() => false),
  idx: 0,
  startedAt,
});

/** Deterministic runs used by ?demo= (for screenshots). Never recorded in the stats. */
function demoRun(kind: string): { run: Run; secs?: number } | null {
  if (kind !== 'results' && kind !== 'question') return null;
  const qs = QUIZ_QUESTIONS.filter((_, i) => i % 9 === 0).slice(0, QUIZ_LENGTH);
  const run = newRun(qs, Date.now() - 83_000);
  if (kind === 'question') {
    run.idx = 2;
    run.answers[0] = qs[0].answer;
    run.answers[1] = qs[1].answer;
    run.answers[2] = (qs[2].answer + 1) % 4;
    run.hints[2] = true;
    return { run };
  }
  run.answers = qs.map((q, i) => (i === 2 || i === 5 || i === 8 ? (q.answer + 1) % 4 : q.answer));
  run.hints[2] = true;
  run.hints[5] = true;
  run.idx = qs.length - 1;
  return { run, secs: 247 };
}

/* ───────────────────────── page ───────────────────────── */

type Phase = 'intro' | 'run' | 'results';

export function Quiz() {
  const [params] = useSearchParams();
  const demo = useMemo(() => demoRun(params.get('demo') ?? ''), [params]);
  const demoKind = demo ? params.get('demo') : null;

  const [attempts, setAttempts] = useState<Attempt[]>(loadAttempts);
  const [phase, setPhase] = useState<Phase>(demoKind === 'results' ? 'results' : demoKind === 'question' ? 'run' : 'intro');
  const [run, setRun] = useState<Run>(() => demo?.run ?? newRun([]));
  const [secs, setSecs] = useState(demo?.secs ?? 0);
  const [now, setNow] = useState(() => Date.now());

  const start = () => {
    setRun(newRun(pickQuestions(QUIZ_LENGTH)));
    setNow(Date.now());
    setPhase('run');
  };

  const finish = useCallback(
    (r: Run) => {
      const elapsed = Math.max(1, Math.round((Date.now() - r.startedAt) / 1000));
      const score = r.qs.reduce((s, q, i) => s + (r.answers[i] === q.answer ? 1 : 0), 0);
      setSecs(elapsed);
      setPhase('results');
      if (demoKind) return;
      const next = [...attempts, { score, total: r.qs.length, secs: elapsed, at: Date.now() }].slice(-100);
      setAttempts(next);
      saveAttempts(next);
    },
    [attempts, demoKind],
  );

  // timer
  useEffect(() => {
    if (phase !== 'run') return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [phase]);

  if (phase === 'intro') return <Intro attempts={attempts} onStart={start} />;
  if (phase === 'results') return <Results run={run} secs={secs} onAgain={start} onHome={() => setPhase('intro')} demo={!!demoKind} />;
  return (
    <Question
      run={run}
      setRun={setRun}
      elapsed={Math.max(0, Math.floor((now - run.startedAt) / 1000))}
      onFinish={finish}
      onQuit={() => setPhase('intro')}
    />
  );
}

/* ───────────────────────── intro ───────────────────────── */

function Intro({ attempts, onStart }: { attempts: Attempt[]; onStart: () => void }) {
  const count = attempts.length;
  const avg = count ? (attempts.reduce((s, a) => s + (a.score / a.total) * 10, 0) / count).toFixed(1) : null;
  const best = count ? attempts.reduce((b, a) => ((a.score / a.total > b.score / b.total) ? a : b)) : null;
  const last = count ? attempts[count - 1] : null;

  return (
    <main className="page narrow quiz">
      <section className="hero">
        <h1>Pattern quiz</h1>
        <p className="muted">
          Ten random scenarios from the question bank. For each one, name the pattern that solves it. Hints are free, and the
          review at the end shows which questions used one.
        </p>
      </section>

      <section className="quiz-stats" aria-label="Your quiz stats">
        <Stat label="Attempts" value={String(count)} />
        <Stat label="Average score" value={avg ? `${avg} / 10` : '—'} />
        <Stat label="Best" value={best ? `${best.score}/${best.total}` : '—'} />
        <Stat label="Last attempt" value={last ? `${last.score}/${last.total}` : '—'} sub={last ? `${fmtDate(last.at)} · ${fmtTime(last.secs)}` : undefined} />
      </section>

      <section className="card pad quiz-how">
        <h2 className="card-title">How it works</h2>
        <ul className="bullets">
          <li>{QUIZ_LENGTH} questions drawn at random from {QUIZ_QUESTIONS.length}, covering all {ALL_PATTERNS.length} patterns.</li>
          <li>Press <kbd>1</kbd> to <kbd>4</kbd> to choose an answer, <kbd>H</kbd> for a hint and <kbd>Enter</kbd> for the next question.</li>
          <li>The explanation appears right after you answer. The timer runs for the whole quiz.</li>
        </ul>
        <button className="btn primary quiz-start" onClick={onStart} autoFocus>Start quiz</button>
      </section>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="quiz-stat card pad">
      <div className="var-label">{label}</div>
      <div className="quiz-stat-value">{value}</div>
      {sub && <div className="small muted">{sub}</div>}
    </div>
  );
}

/* ───────────────────────── question ───────────────────────── */

function Question({
  run,
  setRun,
  elapsed,
  onFinish,
  onQuit,
}: {
  run: Run;
  setRun: (fn: (r: Run) => Run) => void;
  elapsed: number;
  onFinish: (r: Run) => void;
  onQuit: () => void;
}) {
  const q = run.qs[run.idx];
  const picked = run.answers[run.idx];
  const revealed = picked !== null;
  const hintOn = run.hints[run.idx];
  const last = run.idx === run.qs.length - 1;
  const nextRef = useRef<HTMLButtonElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);

  const choose = useCallback(
    (i: number) =>
      setRun((r) => (r.answers[r.idx] !== null ? r : { ...r, answers: r.answers.map((a, k) => (k === r.idx ? i : a)) })),
    [setRun],
  );
  const showHint = useCallback(() => setRun((r) => ({ ...r, hints: r.hints.map((h, k) => (k === r.idx ? true : h)) })), [setRun]);
  const next = useCallback(() => {
    if (last) onFinish(run);
    else setRun((r) => ({ ...r, idx: r.idx + 1 }));
  }, [last, onFinish, run, setRun]);

  // a new question: move focus to its heading so keyboard and screen-reader users start there
  useEffect(() => {
    headRef.current?.focus({ preventScroll: true });
  }, [run.idx]);
  // after answering, put focus on "Next" so Enter continues
  useEffect(() => {
    if (revealed) nextRef.current?.focus({ preventScroll: true });
  }, [revealed, run.idx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key >= '1' && e.key <= '4' && !revealed) {
        e.preventDefault();
        choose(Number(e.key) - 1);
      } else if ((e.key === 'h' || e.key === 'H') && !hintOn && !revealed) {
        showHint();
      } else if (e.key === 'Enter' && revealed && !t?.closest('button, a')) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, showHint, next, revealed, hintOn]);

  const answered = run.answers.filter((a) => a !== null).length;
  const correct = picked === q.answer;

  return (
    <main className="page narrow quiz">
      <div className="quiz-top">
        <span className="quiz-count">Question <strong>{run.idx + 1}</strong> of {run.qs.length}</span>
        <span className={`badge diff-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
        <span className="quiz-timer mono" role="timer" aria-label={`Elapsed time ${fmtTime(elapsed)}`}>⏱ {fmtTime(elapsed)}</span>
        <button className="chip-btn" onClick={onQuit}>Quit</button>
      </div>
      <div
        className="quiz-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={run.qs.length}
        aria-valuenow={answered}
        aria-label="Quiz progress"
      >
        <span style={{ width: `${(answered / run.qs.length) * 100}%` }} />
      </div>

      <section className="card pad quiz-card">
        <h2 className="quiz-question" tabIndex={-1} ref={headRef}>{q.question}</h2>

        <div className="quiz-options" role="group" aria-label="Answer options">
          {q.options.map((opt, i) => {
            let cls = 'quiz-option';
            if (revealed) {
              if (i === q.answer) cls += ' right';
              else if (i === picked) cls += ' wrong';
              else cls += ' dim';
            }
            return (
              <button
                key={opt}
                className={cls}
                onClick={() => choose(i)}
                aria-disabled={revealed}
                aria-pressed={picked === i}
              >
                <kbd>{i + 1}</kbd>
                <span>{opt}</span>
                {revealed && i === q.answer && <span className="quiz-mark" aria-label="correct answer">✓</span>}
                {revealed && i === picked && i !== q.answer && <span className="quiz-mark" aria-label="your answer, incorrect">✗</span>}
              </button>
            );
          })}
        </div>

        {!revealed && (
          <div className="quiz-hintrow">
            {hintOn ? (
              <p className="quiz-hint"><strong>Hint.</strong> {q.hint}</p>
            ) : (
              <button className="chip-btn" onClick={showHint}>Show hint <kbd>H</kbd></button>
            )}
          </div>
        )}

        <div role="status" aria-live="polite">
          {revealed && (
            <div className={`quiz-feedback ${correct ? 'good' : 'bad'}`}>
              <div className="quiz-verdict">{correct ? 'Correct' : 'Not quite'}</div>
              <p>{q.explanation}</p>
              <p className="small muted">Pattern: <PatternRef slug={q.pattern} />{hintOn ? ' · hint used' : ''}</p>
            </div>
          )}
        </div>

        {revealed && (
          <div className="quiz-actions">
            <button className="btn primary" onClick={next} ref={nextRef}>
              {last ? 'See results' : 'Next question'} <kbd>Enter</kbd>
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

/* ───────────────────────── results ───────────────────────── */

function Results({ run, secs, onAgain, onHome, demo }: { run: Run; secs: number; onAgain: () => void; onHome: () => void; demo: boolean }) {
  const total = run.qs.length;
  const score = run.qs.reduce((s, q, i) => s + (run.answers[i] === q.answer ? 1 : 0), 0);
  const pct = Math.round((score / total) * 100);
  const hintsUsed = run.hints.filter(Boolean).length;
  const missed = [...new Set(run.qs.filter((q, i) => run.answers[i] !== q.answer).map((q) => q.pattern))];
  const verdict = pct === 100 ? 'Flawless.' : pct >= 80 ? 'Strong pattern sense.' : pct >= 50 ? 'Getting there.' : 'Time to revisit the patterns.';

  return (
    <main className="page narrow quiz">
      <section className="card pad quiz-score">
        <div className={`quiz-ring${pct >= 70 ? ' good' : pct >= 40 ? ' mid' : ' low'}`} style={{ ['--pct' as string]: `${pct}%` }}>
          <div><strong>{score}</strong><span>/{total}</span></div>
        </div>
        <div className="quiz-score-text">
          <h1>{verdict}</h1>
          <p className="muted">{pct}% correct · time {fmtTime(secs)} · {hintsUsed} hint{hintsUsed === 1 ? '' : 's'} used{demo ? ' · demo data, not saved' : ''}</p>
          <div className="quiz-actions">
            <button className="btn primary" onClick={onAgain} autoFocus>Try again</button>
            <button className="btn" onClick={onHome}>Back to overview</button>
          </div>
        </div>
      </section>

      {missed.length > 0 && (
        <section className="card pad">
          <h2 className="card-title">Patterns to revisit</h2>
          <ul className="quiz-revisit">
            {missed.map((slug) => <li key={slug}><PatternRef slug={slug} /></li>)}
          </ul>
        </section>
      )}

      <h2 className="section-title">Review</h2>
      <ol className="quiz-review">
        {run.qs.map((q, i) => {
          const a = run.answers[i];
          const ok = a === q.answer;
          return (
            <li key={q.id} className={`card pad quiz-item ${ok ? 'good' : 'bad'}`}>
              <div className="quiz-item-head">
                <span className="quiz-item-mark" aria-label={ok ? 'correct' : 'incorrect'}>{ok ? '✓' : '✗'}</span>
                <span className="quiz-item-q">{i + 1}. {q.question}</span>
              </div>
              {!ok && a !== null && <p className="small"><span className="muted">Your answer:</span> <span className="quiz-wrong-text">{q.options[a]}</span></p>}
              <p className="small"><span className="muted">Correct answer:</span> <strong>{q.options[q.answer]}</strong></p>
              <p className="small quiz-explain">{q.explanation}</p>
              <p className="small muted">Pattern: <PatternRef slug={q.pattern} />{run.hints[i] ? ' · hint used' : ''}</p>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
