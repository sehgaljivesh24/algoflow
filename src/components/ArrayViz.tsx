import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import type { Cell, Pointer } from '../engine/types';
import { EmptyScene } from './viz/EmptyScene';

interface Props {
  cells: Cell[];
  pointers: Pointer[];
  bars?: boolean;
  showIndex?: boolean;
  /** Draw 'sorted' cells as solid green blocks (sorting problems); otherwise as a calm "done" tint. */
  sortedSolid?: boolean;
  /**
   * 'pattern' (pattern pages only): index numbers ABOVE the cells, pointers UNDER them as a coloured triangle + label
   * (single letters upper-cased, pointers sharing a cell merged into one purple `L=R`). Ignored for bars.
   */
  layout?: 'default' | 'pattern';
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** CSS class suffix for a cell state; shared by every renderer so one colour language runs through the page. */
export function stateClass(state: Cell['state'], sortedSolid = true): string {
  if (!state) return '';
  if (state === 'sorted') return sortedSolid ? 's-sorted' : 's-done';
  return `s-${state}`;
}

interface Placed {
  p: Pointer;
  row: 'top' | 'bottom';
  /** horizontal nudge in px so pointers that share a cell sit side by side */
  nudge: number;
}

/** Pointers that land on the same cell: the first goes above (▼), the next one below (▲), any more are nudged sideways. */
function placePointers(pointers: Pointer[]): Placed[] {
  const byIndex = new Map<number, Pointer[]>();
  for (const p of pointers) byIndex.set(p.index, [...(byIndex.get(p.index) ?? []), p]);
  const out: Placed[] = [];
  byIndex.forEach((group) => {
    const top = group.filter((_, i) => i !== 1);
    const bottom = group.filter((_, i) => i === 1);
    const spread = (list: Pointer[], row: 'top' | 'bottom') =>
      list.forEach((p, i) => out.push({ p, row, nudge: list.length > 1 ? (i - (list.length - 1) / 2) * 28 : 0 }));
    spread(top, 'top');
    spread(bottom, 'bottom');
  });
  return out;
}

interface Merged {
  id: string;
  label: string;
  index: number;
  tone: Pointer['tone'];
}

const pretty = (label: string) => (label.length === 1 ? label.toUpperCase() : label);

/** Pattern layout: one marker per occupied cell. Pointers on the same cell become `L=R` (purple); identical labels collapse to one. */
function mergePointers(pointers: Pointer[]): Merged[] {
  const byIndex = new Map<number, Pointer[]>();
  for (const p of pointers) byIndex.set(p.index, [...(byIndex.get(p.index) ?? []), p]);
  const out: Merged[] = [];
  byIndex.forEach((group, index) => {
    const labels = [...new Set(group.map((p) => pretty(p.label)))];
    out.push({
      id: group[0].id,
      label: labels.join('='),
      index,
      tone: labels.length > 1 ? 'purple' : group[group.length - 1].tone,
    });
  });
  return out;
}

const leftOf = (index: number, nudge: number) =>
  `calc(var(--av-cw) / 2 + ${index} * (var(--av-cw) + var(--av-gap)) + ${nudge}px)`;

/**
 * Renders an array as cells (or bars). Each cell has a stable `key`, so when two
 * cells swap places we FLIP-animate them from their old position to the new one
 * instead of just swapping the text. Pointer arrows are their own elements, so they
 * slide to the new cell with a spring instead of jumping.
 *
 * Every cell carries `data-cell-index` and `data-state` so overlays (e.g. a sliding-window
 * frame on the pattern pages) can find cells with querySelectorAll('[data-cell-index]').
 */
export function ArrayViz({ cells, pointers, bars = false, showIndex = true, sortedSolid = true, layout = 'default' }: Props) {
  const els = useRef(new Map<string | number, HTMLDivElement>());
  const lastLeft = useRef(new Map<string | number, number>());

  useLayoutEffect(() => {
    const next = new Map<string | number, number>();
    els.current.forEach((el, key) => {
      const left = el.getBoundingClientRect().left;
      const before = lastLeft.current.get(key);
      if (before !== undefined && Math.abs(before - left) > 0.5 && !prefersReducedMotion()) {
        const dx = before - left;
        if (el.dataset.state === 'swap') {
          // the two cells of a swap pass each other: one arcs over, the other under, with a little tilt
          const dir = dx > 0 ? -1 : 1;
          el.animate(
            [
              { transform: `translate(${dx}px, 0) rotate(0deg) scale(1)` },
              { transform: `translate(${dx / 2}px, ${dir * 16}px) rotate(${dir * 8}deg) scale(1.12)`, offset: 0.5 },
              { transform: 'translate(0, -4px) rotate(0deg) scale(1)' },
            ],
            { duration: 440, easing: 'cubic-bezier(.22,1,.36,1)' },
          );
        } else {
          el.animate([{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }], {
            duration: 420,
            easing: 'cubic-bezier(.22,1,.36,1)',
          });
        }
      }
      next.set(key, left);
    });
    lastLeft.current = next;
  });

  if (cells.length === 0) return <EmptyScene what={bars ? 'bar chart' : 'array'} />;
  const max = Math.max(1, ...cells.map((c) => Math.abs(Number(c.value)) || 0));
  const placed = placePointers(pointers.filter((p) => p.index >= 0 && p.index < cells.length));
  const n = cells.length;
  const style = {
    '--av-n': n,
    ...(bars ? { '--av-cw': '44px', '--av-gap': '8px' } : null),
  } as CSSProperties;

  const pat = layout === 'pattern' && !bars;
  const merged = pat ? mergePointers(pointers.filter((p) => p.index >= 0 && p.index < cells.length)) : [];
  const cellEl = (c: Cell, i: number) => {
    const barHeight = bars ? 36 + (Math.abs(Number(c.value)) / max) * 120 : undefined;
    return (
      <div
        key={c.key}
        ref={(el) => {
          if (el) els.current.set(c.key, el);
          else els.current.delete(c.key);
        }}
        className={`av-cell ${stateClass(c.state, sortedSolid)}${c.tone ? ` t-${c.tone}` : ''}`}
        data-cell-index={i}
        data-state={c.state ?? ''}
        data-tone={c.tone}
        style={barHeight ? { height: barHeight } : undefined}
      >
        {c.value}
      </div>
    );
  };

  if (pat) {
    return (
      <div className="av-root" style={style} role="img" aria-label={`Array of ${n} values`} data-array-viz data-dense={n > 10 ? '' : undefined}>
        <div className="av-scroll">
          <div className="av-inner pat" style={{ minWidth: `calc(${n} * var(--av-cw) + ${Math.max(0, n - 1)} * var(--av-gap))` }}>
            {showIndex && (
              <div className="av-idx-row top">
                {cells.map((c, i) => <div key={c.key} className="av-idx">{i}</div>)}
              </div>
            )}
            <div className="av-cell-row">{cells.map(cellEl)}</div>
            <div className="av-ptr-row under">
              {merged.map((m) => (
                <div key={m.id} className={`av-ptr ptr-${m.tone}${m.label.includes('=') ? ' merged' : ''}`} style={{ left: leftOf(m.index, 0) }}>
                  <span className="av-ptr-arr" aria-hidden>▲</span>
                  <span className="av-ptr-lbl">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ptr = ({ p, row, nudge }: Placed) => (
    <div key={p.id} className={`av-ptr ptr-${p.tone}`} style={{ left: leftOf(p.index, nudge) }}>
      {row === 'top' ? (
        <>
          <span className="av-ptr-lbl">{p.label}</span>
          <span className="av-ptr-arr" aria-hidden>▼</span>
        </>
      ) : (
        <>
          <span className="av-ptr-arr" aria-hidden>▲</span>
          <span className="av-ptr-lbl">{p.label}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="av-root" style={style} role="img" aria-label={`Array of ${n} values`} data-array-viz>
      <div className="av-scroll">
        <div className={`av-inner${bars ? ' bars' : ''}`} style={{ minWidth: `calc(${n} * var(--av-cw) + ${Math.max(0, n - 1)} * var(--av-gap))` }}>
          <div className="av-ptr-row top">{placed.filter((x) => x.row === 'top').map(ptr)}</div>
          <div className="av-cell-row">
            {cells.map(cellEl)}
          </div>
          {showIndex && (
            <div className="av-idx-row">
              {cells.map((c, i) => <div key={c.key} className="av-idx">[{i}]</div>)}
            </div>
          )}
          <div className="av-ptr-row bottom">{placed.filter((x) => x.row === 'bottom').map(ptr)}</div>
        </div>
      </div>
    </div>
  );
}
