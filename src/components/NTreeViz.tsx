import { useId } from 'react';
import type { CSSProperties } from 'react';
import type { NTreeNodeVM, NTreeScene, Tone } from '../engine/types';
import { clipDist, linkArc } from './linkCurve';

const NODE_CLASS: Record<string, string> = {
  active: 'vz-current', compare: 'vz-queued', swap: 'vz-visited', found: 'vz-result', sorted: 'vz-result', error: 'vz-rejected', dim: 'vz-dim',
};
const TONE_CLASS: Record<string, string> = {
  blue: 'vz-tone-blue', orange: 'vz-tone-orange', purple: 'vz-tone-purple', green: 'vz-tone-green', yellow: 'vz-tone-yellow', red: 'vz-tone-red',
};
const TONE_VAR: Record<string, string> = {
  blue: 'var(--blue)', orange: 'var(--orange)', purple: 'var(--purple)', green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)',
};
const TONES: Tone[] = ['blue', 'orange', 'purple', 'green', 'yellow', 'red'];

interface Pos { x: number; y: number }

/** n-ary tree / DAG: tidy layout (or fixed x/y), circles or boxes, optional edge labels, heavy edges and dashed link arrows. */
export function NTreeViz({ scene }: { scene: NTreeScene }) {
  // the page can hold several copies of this picture (height probe, split scenes): arrow markers need distinct ids
  const uid = useId().replace(/:/g, '');
  const byId = new Map<number, NTreeNodeVM>(scene.nodes.map((n) => [n.id, n]));
  const box = scene.shape === 'box';
  const anySub = scene.nodes.some((n) => n.sub);
  const anyTag = scene.nodes.some((n) => n.tag);
  const textLen = (n: NTreeNodeVM) => Math.max(String(n.label ?? n.id).length, (n.sub ?? '').length * 0.86);
  const bw = box ? Math.max(34, Math.max(...scene.nodes.map(textLen), 1) * 7.4 + 14) : 36;
  const bh = box ? (anySub ? 40 : 30) : 36;
  const hw = box ? bw / 2 : 18;
  const hh = box ? bh / 2 : 18;
  const DX = Math.max(box ? bw + 14 : 46, 46);
  const DY = bh + (anyTag ? 50 : 36);
  const top = (scene.pointers ?? []).length ? 42 : 24;

  const pos = new Map<number, Pos>();
  let width: number;
  let height: number;
  const fixed = scene.nodes.length > 0 && scene.nodes.every((n) => typeof n.x === 'number' && typeof n.y === 'number');
  if (fixed) {
    const xs = [...new Set(scene.nodes.map((n) => Math.round(n.x! * 1000)))].sort((a, b) => a - b);
    const ys = [...new Set(scene.nodes.map((n) => Math.round(n.y! * 1000)))].sort((a, b) => a - b);
    width = Math.max(300, 60 + Math.max(0, Math.max(xs.length, scene.cols ?? 0) - 1) * (DX * 0.9) + DX);
    height = top + 16 + hh * 2 + Math.max(0, ys.length - 1) * DY;
    for (const n of scene.nodes) pos.set(n.id, { x: 30 + DX / 2 + n.x! * (width - 60 - DX), y: top + hh + n.y! * (height - top - 16 - 2 * hh) });
  } else {
    let leaf = 0;
    let maxDepth = 0;
    const seen = new Set<number>();
    const walk = (id: number, depth: number): number => {
      const n = byId.get(id);
      if (!n) return leaf;
      if (seen.has(id)) return pos.get(id)?.x ?? leaf;
      seen.add(id);
      maxDepth = Math.max(maxDepth, depth);
      const kids = n.children.filter((c) => byId.has(c));
      let x: number;
      if (kids.length === 0) x = leaf++;
      else {
        const xs = kids.map((c) => walk(c, depth + 1));
        x = (Math.min(...xs) + Math.max(...xs)) / 2;
      }
      pos.set(id, { x, y: depth });
      return x;
    };
    walk(scene.root, 0);
    width = Math.max(300, 60 + DX + Math.max(0, leaf - 1) * DX);
    height = top + 16 + hh * 2 + maxDepth * DY;
    for (const [id, p] of pos) pos.set(id, { x: 30 + DX / 2 + p.x * DX, y: top + hh + p.y * DY });
  }
  if (anyTag) height += 12;

  const onPath = new Set<string>();
  const path = scene.path ?? [];
  for (let i = 1; i < path.length; i++) onPath.add(`${path[i - 1]}>${path[i]}`);
  const pathNodes = new Set(path);
  const tones = new Set<string>(['orange', ...(scene.extraEdges ?? []).map((e) => e.tone ?? 'orange')]);
  const tiers = new Map<number, number>();

  return (
    <div className="nt-wrap">
      <svg
        className="svg-viz nt"
        viewBox={`0 0 ${width} ${height}`}
        style={{ maxWidth: Math.round(width * 1.15), ['--nt-w' as string]: `${Math.round(width)}px` }}
        role="img"
        aria-label={`Tree with ${scene.nodes.length} nodes`}
      >
        <defs>
          {TONES.filter((t) => tones.has(t)).map((t) => (
            <marker key={t} id={`nt-xa-${uid}-${t}`} className={`nt-mk tone-${t}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0 0L10 5L0 10z" />
            </marker>
          ))}
        </defs>
        {scene.nodes.map((n) =>
          n.children.map((c) => {
            const a = pos.get(n.id);
            const b = pos.get(c);
            if (!a || !b || !byId.has(c)) return null;
            const child = byId.get(c)!;
            const hot = onPath.has(`${n.id}>${c}`);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const s0 = clipDist(ux, uy, hw, hh, !box);
            // leave room for the tag chip under the parent
            const sTag = n.tag && uy > 0.3 ? Math.min(len * 0.6, (hh + 21) / uy) : 0;
            const sA = Math.max(s0, sTag);
            const x1 = a.x + ux * sA;
            const y1 = a.y + uy * sA;
            const x2 = b.x - ux * s0;
            const y2 = b.y - uy * s0;
            const d = `M ${x1} ${y1} L ${x2} ${y2}`;
            const el = child.edgeLabel;
            const ew = el ? Math.max(16, el.length * 6.4 + 8) : 0;
            return (
              <g key={`${n.id}-${c}`} className={`nt-edge${hot ? ' hot' : ''}${child.heavy ? ' heavy' : ''}`}>
                <path d={d} style={{ d: `path("${d}")` } as CSSProperties} fill="none" className="nt-line" />
                {el && (
                  <g>
                    <rect x={(x1 + x2) / 2 - ew / 2} y={(y1 + y2) / 2 - 8} width={ew} height="16" rx="8" className="nt-ebox" />
                    <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 3.6} textAnchor="middle" className="nt-etext">{el}</text>
                  </g>
                )}
              </g>
            );
          }),
        )}
        {(scene.extraEdges ?? []).map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          const tone = e.tone ?? 'orange';
          const { d, mx, my } = linkArc(a, b, hw, hh, !box, b.x >= a.x ? 1 : -1, (i % 3) * 8);
          return (
            <g key={`x${i}-${e.from}-${e.to}`} className={`nt-xedge tone-${tone}`}>
              <path d={d} fill="none" markerEnd={`url(#nt-xa-${uid}-${tone})`} />
              {e.label && <text x={mx} y={my - 4} textAnchor="middle">{e.label}</text>}
            </g>
          );
        })}
        {scene.nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const st = n.state;
          const cls = (st && NODE_CLASS[st]) || (n.tone && TONE_CLASS[n.tone]) || (pathNodes.has(n.id) ? 'vz-on-path' : '');
          const label = String(n.label ?? n.id);
          const tw = n.tag ? Math.max(26, n.tag.length * 6.4 + 12) : 0;
          return (
            <g key={n.id} className={`nt-node${st === 'dim' ? ' vz-faded' : ''}`}>
              {box ? (
                <rect x={p.x - hw} y={p.y - hh} width={bw} height={bh} rx="9" className={`nt-shape ${cls}`} />
              ) : (
                <circle cx={p.x} cy={p.y} r={hw} className={`nt-shape ${cls}`} />
              )}
              <text x={p.x} y={p.y + (n.sub ? -1.5 : 4.5)} textAnchor="middle" className="nt-text" style={label.length > 3 && !box ? { fontSize: label.length > 4 ? 9 : 10.5 } : undefined}>{label}</text>
              {n.sub && <text x={p.x} y={p.y + 12} textAnchor="middle" className="nt-sub">{n.sub}</text>}
              {n.tag && (
                <g>
                  <rect x={p.x - tw / 2} y={p.y + hh + 4} width={tw} height="16" rx="5" className="gv-tagbox" />
                  <text x={p.x} y={p.y + hh + 15.5} textAnchor="middle" className="gv-tagtext">{n.tag}</text>
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
          const y = p.y - hh - 21;
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
