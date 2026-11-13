import type { AnyProblem } from '../../engine/types';

export interface ExampleTab {
  /** Light catalog metadata only — the animation code itself loads lazily (see src/problems/lazy.ts). */
  problem: Pick<AnyProblem, 'slug' | 'id' | 'title' | 'difficulty'>;
  /** What this example adds (empty when the pattern only has its flagship). */
  why: string;
}

/** "LC #239" for LeetCode ids, the bare label ("GFG", "Classic") otherwise. */
export function problemRef(p: Pick<AnyProblem, 'id'>): string {
  if (/^\d+$/.test(p.id)) return `LC #${p.id}`;
  if (p.id === 'CP') return 'Classic';
  if (p.id === 'ALG') return 'Algorithm';
  return p.id;
}

interface Props {
  tabs: ExampleTab[];
  active: number;
  onSelect: (i: number) => void;
}

/** Tab bar "Example 1 · title · LC #id · difficulty" plus the "what this example adds" callout. */
export function ExampleTabs({ tabs, active, onSelect }: Props) {
  const cur = tabs[active];
  return (
    <div className="pp-examples">
      {tabs.length > 1 && (
        <div className="pp-extabs" role="tablist" aria-label="Worked examples">
          {tabs.map((t, i) => (
            <button
              key={t.problem.slug}
              type="button"
              role="tab"
              id={`pp-extab-${i}`}
              aria-selected={i === active}
              aria-controls="pp-expanel"
              tabIndex={i === active ? 0 : -1}
              title={`${t.problem.title} (${problemRef(t.problem)})`}
              className={`pp-extab${i === active ? ' on' : ''}`}
              onClick={() => onSelect(i)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const n = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
                  onSelect(n);
                  requestAnimationFrame(() => document.getElementById(`pp-extab-${n}`)?.focus());
                }
              }}
            >
              <span className="pp-extab-n">Example {i + 1}</span>
              <span className="pp-extab-t">{t.problem.title}</span>
              <span className="pp-extab-meta">
                {problemRef(t.problem)} <span className={`pp-diff ${t.problem.difficulty.toLowerCase()}`}>{t.problem.difficulty}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {cur?.why && (
        <div className="pp-exwhy" role="note">
          <span className="pp-exwhy-label">What this example adds</span>
          {cur.why}
        </div>
      )}
    </div>
  );
}
