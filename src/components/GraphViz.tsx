import type { CellState, EdgeState, GraphEdgeVM, GraphScene } from '../engine/types';
import { layoutGraph } from './graphLayout';
import type { P } from './graphLayout';

const R = 20;
/** The drawing is shown at about its natural size (like a diagram) instead of stretching to the card width. */
const SCALE = 1.12;

/** Node colour roles (CSS classes in styles-visuals.css); cell states map onto the unvisited / current / queued / visited / result vocabulary. */
const NODE_CLASS: Record<string, string> = {
  active: 'vz-current', compare: 'vz-queued', swap: 'vz-visited', found: 'vz-result', sorted: 'vz-result', error: 'vz-rejected', dim: 'vz-dim',
};
const TONE_CLASS: Record<string, string> = {
  blue: 'vz-tone-blue', orange: 'vz-tone-orange', purple: 'vz-tone-purple', green: 'vz-tone-green', yellow: 'vz-tone-yellow', red: 'vz-tone-red',
};
const TONE_VAR: Record<string, string> = {
  blue: 'var(--blue)', orange: 'var(--orange)', purple: 'var(--purple)', green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)',
};
const EDGE_STATES: EdgeState[] = ['default', 'active', 'visited', 'chosen', 'dim', 'error'];

const LEGEND: { cls: string; label: string }[] = [
  { cls: 'vz-unvisited', label: 'Unvisited' },
  { cls: 'vz-current', label: 'Current (blinking)' },
  { cls: 'vz-queued', label: 'Queued / pending' },
  { cls: 'vz-visited', label: 'Visited' },
  { cls: 'vz-result', label: 'Done / result' },
  { cls: 'vz-rejected', label: 'Rejected / cycle' },
];

function edgeGeometry(e: GraphEdgeVM, a: P, b: P, offset: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const ctrl = { x: mid.x + nx * 2 * offset, y: mid.y + ny * 2 * offset };
  // direction at each end (towards the control point when curved)
  const t0 = offset === 0 ? { x: ux, y: uy } : norm(ctrl.x - a.x, ctrl.y - a.y);
  const t1 = offset === 0 ? { x: ux, y: uy } : norm(b.x - ctrl.x, b.y - ctrl.y);
  const s = { x: a.x + t0.x * R, y: a.y + t0.y * R };
  const gap = R + (e.directed ? 3 : 0);
  const t = { x: b.x - t1.x * gap, y: b.y - t1.y * gap };
  // point along the drawn edge, t in 0..1 (used to slide weight pills apart)
  const at = (u: number): P =>
    offset === 0
      ? { x: s.x + (t.x - s.x) * u, y: s.y + (t.y - s.y) * u }
      : {
          x: (1 - u) * (1 - u) * s.x + 2 * (1 - u) * u * ctrl.x + u * u * t.x,
          y: (1 - u) * (1 - u) * s.y + 2 * (1 - u) * u * ctrl.y + u * u * t.y,
        };
  const d = offset === 0 ? `M ${s.x} ${s.y} L ${t.x} ${t.y}` : `M ${s.x} ${s.y} Q ${ctrl.x} ${ctrl.y} ${t.x} ${t.y}`;
  return { d, at };
}
const norm = (x: number, y: number) => {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
};

export function GraphViz({ scene }: { scene: GraphScene }) {
  if (scene.nodes.length === 0) {
    return (
      <div className="gv-wrap">
        <svg className="svg-viz gv" viewBox="0 0 380 120" role="img" aria-label="Empty graph">
          <text x="190" y="64" textAnchor="middle" className="iv-tick">empty</text>
        </svg>
      </div>
    );
  }
  const pos = layoutGraph(scene.nodes, scene.edges, scene.layout);

  // group edges by unordered pair so parallel / opposite edges fan out as arcs
  const groups = new Map<string, number[]>();
  scene.edges.forEach((e, i) => {
    const key = e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`;
    groups.set(key, [...(groups.get(key) ?? []), i]);
  });

  const stateOrder: Record<EdgeState, number> = { dim: 0, default: 1, visited: 2, chosen: 3, active: 4, error: 5 };
  const edgeIdx = scene.edges.map((_, i) => i).sort((i, j) => stateOrder[scene.edges[i].state ?? 'default'] - stateOrder[scene.edges[j].state ?? 'default'] || i - j);

  // fit the view box to the drawing; the padding does not depend on the step so the picture never shifts between steps
  const pts = [...pos.values()];
  const minX = Math.min(...pts.map((p) => p.x)) - R - 34;
  const maxX = Math.max(...pts.map((p) => p.x)) + R + 34;
  const minY = Math.min(...pts.map((p) => p.y)) - R - 44;
  const maxY = Math.max(...pts.map((p) => p.y)) + R + 30;
  const vw = Math.max(380, maxX - minX);
  const vh = Math.max(190, maxY - minY);
  const vx = (minX + maxX) / 2 - vw / 2;
  const vy = (minY + maxY) / 2 - vh / 2;

  // geometry for every edge, then weight positions chosen greedily so labels never sit on top of each other
  const geo = scene.edges.map((e, i) => {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) return null;
    const g = groups.get(e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`)!;
    const k = g.indexOf(i);
    // sign makes opposite-direction edges bow to opposite sides of the line
    const sign = e.from < e.to ? 1 : -1;
    const offset = (g.length === 1 ? 0 : (k - (g.length - 1) / 2) * 30) * sign;
    return edgeGeometry(e, a, b, offset);
  });
  const placed: P[] = [];
  const labelAt = scene.edges.map((e, i) => {
    const gm = geo[i];
    if (!gm || e.weight === undefined) return null;
    const choices = [0.5, 0.36, 0.64, 0.26, 0.74];
    let best = gm.at(0.5);
    for (const u of choices) {
      const p = gm.at(u);
      if (placed.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > 28)) { best = p; break; }
    }
    placed.push(best);
    return best;
  });

  const tiers = new Map<number, number>();
  const nodeCount = scene.nodes.length;
  const edgeCount = scene.edges.length;
  return (
    <div className="gv-wrap">
      <svg
        className="svg-viz gv"
        viewBox={`${vx} ${vy} ${vw} ${vh}`}
        style={{ maxWidth: Math.round(vw * SCALE) }}
        role="img"
        aria-label={`Graph with ${nodeCount} nodes and ${edgeCount} edges`}
      >
        <defs>
          {EDGE_STATES.map((s) => (
            <marker key={s} id={`gv-arr-${s}`} className={`gv-mk st-${s}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0 0L10 5L0 10z" />
            </marker>
          ))}
        </defs>
        {edgeIdx.map((i) => {
          const e = scene.edges[i];
          const gm = geo[i];
          if (!gm) return null;
          const { d } = gm;
          const label = labelAt[i] ?? { x: 0, y: 0 };
          const st = e.state ?? 'default';
          const w = e.weight === undefined ? '' : String(e.weight);
          const bw = Math.max(16, w.length * 6.6 + 8);
          return (
            <g key={i} className={`gv-edge st-${st}`}>
              <path d={d} fill="none" className="gv-line" markerEnd={e.directed ? `url(#gv-arr-${st})` : undefined} />
              {w && (
                <g>
                  <rect x={label.x - bw / 2} y={label.y - 8} width={bw} height="16" rx="8" className="gv-wbox" />
                  <text x={label.x} y={label.y + 3.6} textAnchor="middle" className="gv-wtext">{w}</text>
                </g>
              )}
            </g>
          );
        })}
        {scene.nodes.map((v) => {
          const p = pos.get(v.id);
          if (!p) return null;
          const st: CellState | undefined = v.state;
          const label = String(v.label ?? v.id);
          const tw = v.tag ? Math.max(26, v.tag.length * 6.4 + 12) : 0;
          const cls = (st && NODE_CLASS[st]) || (v.tone && TONE_CLASS[v.tone]) || '';
          return (
            <g key={v.id} className={`gv-node${st === 'dim' ? ' vz-faded' : ''}`}>
              <circle cx={p.x} cy={p.y} r={R} className={`gv-circle ${cls}`} />
              <text x={p.x} y={p.y + (label.length > 3 ? 4 : 4.5)} textAnchor="middle" className="gv-ntext" style={label.length > 2 ? { fontSize: label.length === 3 ? 11.5 : label.length === 4 ? 10 : 8.5 } : undefined}>{label}</text>
              {v.tag && (
                <g>
                  <rect x={p.x - tw / 2} y={p.y + R + 4} width={tw} height="16" rx="5" className="gv-tagbox" />
                  <text x={p.x} y={p.y + R + 15.5} textAnchor="middle" className="gv-tagtext">{v.tag}</text>
                </g>
              )}
            </g>
          );
        })}
        {(scene.pointers ?? []).map((q) => {
          const node = scene.nodes[q.index];
          const p = node && pos.get(node.id);
          if (!p) return null;
          const t = tiers.get(q.index) ?? 0;
          tiers.set(q.index, t + 1);
          const sharing = (scene.pointers ?? []).filter((o) => o.index === q.index).length;
          const tone = TONE_VAR[q.tone] ?? 'var(--blue)';
          const cw = Math.max(32, q.label.length * 6.6 + 14);
          const x = p.x + (t - (sharing - 1) / 2) * (cw + 5);
          const y = p.y - R - 21;
          // the group keeps its identity from step to step, so the CSS transition slides it to the new node
          return (
            <g key={q.id} className="gv-ptr" style={{ transform: `translate(${x}px, ${y}px)` }}>
              <rect x={-cw / 2} y="-10" width={cw} height="18" rx="6" className="gv-ptrbox" style={{ stroke: tone }} />
              <text x="0" y="3.5" textAnchor="middle" className="gv-ptrtext" style={{ fill: tone }}>{q.label}</text>
              <path d={`M -4 9 L 4 9 L 0 15 z`} style={{ fill: tone }} />
            </g>
          );
        })}
      </svg>
      <div className="gv-legend" role="list" aria-label="Node colours">
        {LEGEND.map((it) => (
          <span key={it.cls} className="gv-legend-item" role="listitem">
            <span className={`gv-legend-dot ${it.cls}`} aria-hidden="true" />
            {it.label}
          </span>
        ))}
      </div>
    </div>
  );
}
