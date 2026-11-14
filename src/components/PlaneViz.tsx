import { useId } from 'react';
import type { EdgeState, PlaneScene } from '../engine/types';

const NODE_CLASS: Record<string, string> = {
  active: 'vz-current', compare: 'vz-queued', swap: 'vz-visited', found: 'vz-result', sorted: 'vz-result', error: 'vz-rejected', dim: 'vz-dim',
};
const TONE_CLASS: Record<string, string> = {
  blue: 'vz-tone-blue', orange: 'vz-tone-orange', purple: 'vz-tone-purple', green: 'vz-tone-green', yellow: 'vz-tone-yellow', red: 'vz-tone-red',
};
const TONE_VAR: Record<string, string> = {
  blue: 'var(--blue)', orange: 'var(--orange)', purple: 'var(--purple)', green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)',
};
const SEG_STATES: EdgeState[] = ['default', 'active', 'visited', 'chosen', 'dim', 'error'];
const POLY_CLASS: Record<string, string> = { active: 'st-active', error: 'st-error', found: 'st-chosen', compare: 'st-visited' };

/** 2-D coordinate plane: points, segments, a tinted polygon outline and a sweep line. Uniform scale so geometry is not distorted. */
export function PlaneViz({ scene }: { scene: PlaneScene }) {
  // the page can hold several copies of this picture (height probe): arrow markers need distinct ids
  const uid = useId().replace(/:/g, '');
  const pts = scene.points;
  if (pts.length === 0) {
    return (
      <div className="pl-wrap">
        <svg className="svg-viz pl" viewBox="0 0 380 120" role="img" aria-label="Empty plane"><text x="190" y="64" textAnchor="middle" className="iv-tick">no points</text></svg>
      </div>
    );
  }
  const byId = new Map(pts.map((p) => [p.id, p]));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const pad = (lo: number, hi: number) => Math.max(1, (hi - lo) * 0.08);
  const minX = Math.floor(Math.min(...xs) - pad(Math.min(...xs), Math.max(...xs)));
  const maxX = Math.ceil(Math.max(...xs) + pad(Math.min(...xs), Math.max(...xs)));
  const minY = Math.floor(Math.min(...ys) - pad(Math.min(...ys), Math.max(...ys)));
  const maxY = Math.ceil(Math.max(...ys) + pad(Math.min(...ys), Math.max(...ys)));
  const rx = Math.max(1, maxX - minX);
  const ry = Math.max(1, maxY - minY);
  const M = 30; // outer margin (room for tick labels)
  const s = Math.min(50, 560 / rx, 330 / ry);
  const W = rx * s + 2 * M;
  const H = ry * s + 2 * M + 8;
  const px = (x: number) => M + (x - minX) * s;
  const py = (y: number) => M + (maxY - y) * s;
  const showGrid = scene.grid !== false;
  const step = Math.max(rx, ry) > 24 ? 5 : Math.max(rx, ry) > 12 ? 2 : 1;
  const gx: number[] = [];
  for (let v = Math.ceil(minX / step) * step; v <= maxX; v += step) gx.push(v);
  const gy: number[] = [];
  for (let v = Math.ceil(minY / step) * step; v <= maxY; v += step) gy.push(v);

  const stateOrder: Record<EdgeState, number> = { dim: 0, default: 1, visited: 2, chosen: 3, active: 4, error: 5 };
  const segs = (scene.segments ?? []).map((e, i) => ({ e, i })).sort((a, b) => stateOrder[a.e.state ?? 'default'] - stateOrder[b.e.state ?? 'default'] || a.i - b.i);
  const poly = scene.polygon;
  const polyPts = (poly?.ids ?? []).map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  const polyD = polyPts.length >= 2 ? polyPts.map((p, i) => `${i ? 'L' : 'M'} ${px(p.x)} ${py(p.y)}`).join(' ') + (poly?.closed === false ? '' : ' Z') : '';
  const sweep = scene.sweep;
  const tiers = new Map<number, number>();
  const markers = new Set(segs.filter((x) => x.e.arrow).map((x) => x.e.state ?? 'default'));

  return (
    <div className="pl-wrap">
      <svg className="svg-viz pl" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: Math.round(W * 1.1) }} role="img" aria-label={`Plane with ${pts.length} points`}>
        <defs>
          {SEG_STATES.filter((st) => markers.has(st)).map((st) => (
            <marker key={st} id={`pl-arr-${uid}-${st}`} className={`gv-mk st-${st}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0 0L10 5L0 10z" />
            </marker>
          ))}
        </defs>
        <rect x={M} y={M} width={rx * s} height={ry * s} className="pl-frame" />
        {showGrid && gx.map((v) => (
          <g key={`gx${v}`}>
            <line x1={px(v)} y1={M} x2={px(v)} y2={M + ry * s} className="pl-grid" />
            <text x={px(v)} y={M + ry * s + 14} textAnchor="middle" className="iv-tick">{v}</text>
          </g>
        ))}
        {showGrid && gy.map((v) => (
          <g key={`gy${v}`}>
            <line x1={M} y1={py(v)} x2={M + rx * s} y2={py(v)} className="pl-grid" />
            <text x={M - 6} y={py(v) + 3.5} textAnchor="end" className="iv-tick">{v}</text>
          </g>
        ))}
        {polyD && <path d={polyD} className={`pl-poly ${POLY_CLASS[poly?.state ?? ''] ?? 'st-chosen'}`} fill={poly?.closed === false ? 'none' : undefined} />}
        {sweep && (
          (sweep.axis ?? 'x') === 'x' ? (
            <g className="pl-sweep" style={{ transform: `translate(${px(sweep.at)}px, 0px)` }}>
              <line x1="0" y1={M - 6} x2="0" y2={M + ry * s + 6} />
              {sweep.label && <text x="4" y={M - 9}>{sweep.label}</text>}
            </g>
          ) : (
            <g className="pl-sweep" style={{ transform: `translate(0px, ${py(sweep.at)}px)` }}>
              <line x1={M - 6} y1="0" x2={M + rx * s + 6} y2="0" />
              {sweep.label && <text x={M + rx * s - 2} y="-5" textAnchor="end">{sweep.label}</text>}
            </g>
          )
        )}
        {segs.map(({ e, i }) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          const st = e.state ?? 'default';
          const dx = px(b.x) - px(a.x);
          const dy = py(b.y) - py(a.y);
          const len = Math.hypot(dx, dy) || 1;
          const trim = e.arrow ? 9 : 0;
          const x2 = px(b.x) - (dx / len) * trim;
          const y2 = py(b.y) - (dy / len) * trim;
          const mx = (px(a.x) + px(b.x)) / 2;
          const my = (py(a.y) + py(b.y)) / 2;
          const w = e.label ? Math.max(16, e.label.length * 6.4 + 8) : 0;
          return (
            <g key={i} className={`gv-edge st-${st}`}>
              <line x1={px(a.x)} y1={py(a.y)} x2={x2} y2={y2} className="gv-line" markerEnd={e.arrow ? `url(#pl-arr-${uid}-${st})` : undefined} />
              {e.label && (
                <g>
                  <rect x={mx - w / 2} y={my - 8} width={w} height="16" rx="8" className="gv-wbox" />
                  <text x={mx} y={my + 3.6} textAnchor="middle" className="gv-wtext">{e.label}</text>
                </g>
              )}
            </g>
          );
        })}
        {pts.map((p) => {
          const cls = (p.state && NODE_CLASS[p.state]) || (p.tone && TONE_CLASS[p.tone]) || '';
          return (
            <g key={p.id} className={`pl-pt${p.state === 'dim' ? ' vz-faded' : ''}`}>
              <circle cx={px(p.x)} cy={py(p.y)} r="7" className={`pl-dot ${cls}`} />
              <text x={px(p.x) + 10} y={py(p.y) - 8} className="pl-name">{p.label ?? p.id}</text>
            </g>
          );
        })}
        {(scene.pointers ?? []).map((q) => {
          const pt = pts[q.index];
          if (!pt) return null;
          const t = tiers.get(q.index) ?? 0;
          tiers.set(q.index, t + 1);
          const tone = TONE_VAR[q.tone] ?? 'var(--blue)';
          const cw = Math.max(32, q.label.length * 6.6 + 14);
          const x = px(pt.x);
          const y = py(pt.y) - 24 - t * 22;
          return (
            <g key={q.id} className="gv-ptr" style={{ transform: `translate(${x}px, ${y}px)` }}>
              <rect x={-cw / 2} y="-10" width={cw} height="18" rx="6" className="gv-ptrbox" style={{ stroke: tone }} />
              <text x="0" y="3.5" textAnchor="middle" className="gv-ptrtext" style={{ fill: tone }}>{q.label}</text>
              <path d="M -4 9 L 4 9 L 0 15 z" style={{ fill: tone }} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
