import { useState } from 'react';
import type { ListNodeVM, Pointer } from '../../engine/types';
import { stateClass } from '../ArrayViz';
import { EmptyScene } from './EmptyScene';

/**
 * Linked list as rounded two-compartment boxes `[ value | › ]`, one per node in fixed visual order.
 * - forward links are arrows between neighbours; they flash green when a link is (re)pointed
 * - links that go backwards / skip ahead are drawn as arcs under the row
 * - a `next === null` link ends in a dashed `null` chip
 * - named pointers are separate badge elements (`curr ↓`) that slide from node to node with a spring
 */

const NODE_W = 78;
const NODE_H = 46;
const CONN = 46;
const PITCH = NODE_W + CONN;
const PAD = 8;
const NULL_W = 52;
const BADGE_ROW = 30;
const ARC_BASE = 34;

const TONE_CLASS: Record<string, string> = {
  blue: 'blue', orange: 'orange', green: 'green', purple: 'purple', yellow: 'yellow', red: 'red',
};

function Arrow({ className, style }: { className: string; style: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width={CONN} height="20" viewBox={`0 0 ${CONN} 20`} aria-hidden>
      <path d={`M3 10 H${CONN - 7}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d={`M${CONN - 13} 3.5 L${CONN - 4} 10 L${CONN - 13} 16.5`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ListViz({ nodes, pointers, sortedSolid = false }: { nodes: ListNodeVM[]; pointers: Pointer[]; sortedSolid?: boolean }) {
  // which links were re-pointed since the previous picture (derived state: computed once per new `nodes`)
  const [memo, setMemo] = useState<{ nodes: ListNodeVM[]; prev: Map<number, number | null>; changed: Set<number> }>({
    nodes, prev: new Map(), changed: new Set(),
  });
  let { prev, changed } = memo;
  if (memo.nodes !== nodes) {
    const before = new Map(memo.nodes.map((n) => [n.key, n.next] as const));
    const ch = new Set<number>();
    nodes.forEach((n) => {
      if (before.has(n.key) && before.get(n.key) !== n.next) ch.add(n.key);
    });
    prev = before;
    changed = ch;
    setMemo({ nodes, prev: before, changed: ch });
  }

  const n = nodes.length;
  if (n === 0) return <EmptyScene what="list" hint="head = null" />;
  const posOf = new Map(nodes.map((nd, i) => [nd.key, i] as const));
  const x = (i: number) => PAD + i * PITCH;
  const mid = (i: number) => x(i) + NODE_W / 2;

  // pointer badges: stack the ones that share a node
  const rank = new Map<number, number>();
  const placed = pointers
    .filter((p) => p.index >= 0 && p.index < n)
    .map((p) => {
      const r = rank.get(p.index) ?? 0;
      rank.set(p.index, r + 1);
      return { p, r };
    });
  const maxStack = Math.max(1, ...rank.values());
  const badgeH = 52 + (maxStack - 1) * BADGE_ROW;

  const lastNull = n > 0 && nodes[n - 1].next === null;
  const width = PAD * 2 + n * NODE_W + (n - 1) * CONN + (lastNull ? CONN + NULL_W : 0);

  // links that are not simple "next neighbour" arrows
  interface Arc { i: number; t: number; depth: number }
  const arcs: Arc[] = [];
  nodes.forEach((nd, i) => {
    if (nd.next === null) return;
    const t = posOf.get(nd.next);
    if (t === undefined || t === i + 1) return;
    arcs.push({ i, t, depth: ARC_BASE + Math.min(36, Math.abs(i - t) * 9) });
  });
  const below = arcs.length ? Math.max(40, ...arcs.map((a) => a.depth + 14)) : 14;
  const height = badgeH + NODE_H + below;

  return (
    <div className="ll-wrap" role="img" aria-label="Linked list">
      <div className="ll-stage" style={{ width, height }}>
        <div className="ll-badges" style={{ height: badgeH }}>
          {placed.map(({ p, r }) => (
            <div
              key={p.id}
              className={`ll-badge ll-badge-${TONE_CLASS[p.tone] ?? 'blue'}`}
              style={{ left: mid(p.index), bottom: 4 + r * BADGE_ROW }}
            >
              {p.label}
              <span className="ll-badge-down" aria-hidden>↓</span>
            </div>
          ))}
        </div>

        {nodes.map((nd, i) => {
          const isChanged = changed.has(nd.key);
          const forward = nd.next !== null && posOf.get(nd.next) === i + 1;
          const wasForward = prev.get(nd.key) !== undefined && prev.get(nd.key) === nodes[i + 1]?.key;
          const showBroken = isChanged && !forward && wasForward && i < n - 1 && nd.next !== null;
          return (
            <div key={nd.key}>
              <div
                className={`ll-box ${stateClass(nd.state, sortedSolid)}`}
                style={{ left: x(i), top: badgeH, width: NODE_W, height: NODE_H }}
                data-node-index={i}
                data-state={nd.state ?? ''}
              >
                <span className="ll-val">{nd.value}</span>
                <span className="ll-sep" />
                <span className="ll-ptrpart" aria-hidden>›</span>
              </div>
              {forward && (
                <Arrow
                  className={`ll-conn${isChanged ? ' new-link' : ''}`}
                  style={{ left: x(i) + NODE_W, top: badgeH + NODE_H / 2 - 10 }}
                />
              )}
              {showBroken && <span className="ll-conn broken" style={{ left: x(i) + NODE_W, top: badgeH + NODE_H / 2 - 10, width: CONN }} aria-hidden>✕</span>}
              {i < n - 1 && nd.next === null && (
                <span className={`ll-conn ll-slotnull${isChanged ? ' new-link' : ''}`} style={{ left: x(i) + NODE_W + 4, top: badgeH + NODE_H / 2 - 10, width: CONN - 8 }}>null</span>
              )}
              {i === n - 1 && nd.next === null && (
                <>
                  <Arrow className={`ll-conn muted${isChanged ? ' new-link' : ''}`} style={{ left: x(i) + NODE_W, top: badgeH + NODE_H / 2 - 10 }} />
                  <span className="ll-null" style={{ left: x(i) + NODE_W + CONN, top: badgeH, width: NULL_W, height: NODE_H }}>null</span>
                </>
              )}
            </div>
          );
        })}

        <svg className="ll-under" width={width} height={below + 8} style={{ top: badgeH + NODE_H - 2 }} aria-hidden>
          {arcs.map((a) => {
            const key = nodes[a.i].key;
            const x1 = x(a.i) + NODE_W - 14;
            const x2 = a.t === a.i ? x(a.t) + 14 : mid(a.t);
            const y = 3;
            const d = a.t === a.i
              ? `M ${x1} ${y} C ${x1 + 26} ${y + a.depth + 6}, ${x2 - 26} ${y + a.depth + 6}, ${x2} ${y + 3}`
              : `M ${x1} ${y} C ${x1} ${y + a.depth * 1.35}, ${x2} ${y + a.depth * 1.35}, ${x2} ${y + 4}`;
            const hy = y + 4;
            return (
              <g key={`a${key}`} className={`ll-arc${changed.has(key) ? ' new-link' : ''}`}>
                <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d={`M ${x2 - 5} ${hy + 8} L ${x2} ${hy - 1} L ${x2 + 5} ${hy + 8}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
