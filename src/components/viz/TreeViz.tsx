import { useId } from 'react';
import type { CellState, Scene, TreeNodeVM } from '../../engine/types';
import { stateClass } from '../ArrayViz';
import { EmptyScene } from './EmptyScene';

const LIT: CellState[] = ['active', 'found', 'swap', 'compare', 'sorted'];

/** Binary tree: circles (colour follows the node state, recoloured over 0.4s) joined by edges that light up purple along the active path. */
export function TreeViz({ scene, sortedSolid = false }: { scene: Extract<Scene, { kind: 'tree' }>; sortedSolid?: boolean }) {
  // two trees on one page (heap halves, split scenes) must not share the arrow marker id
  const arrowId = `tv-xarrow-${useId().replace(/:/g, '')}`;
  const byId = new Map<number, TreeNodeVM>(scene.nodes.map((n) => [n.id, n]));
  const pos = new Map<number, { x: number; y: number }>();
  let order = 0;
  let maxDepth = 0;
  const walk = (id: number | null, depth: number) => {
    if (id === null || !byId.has(id)) return;
    const n = byId.get(id)!;
    walk(n.left, depth + 1);
    pos.set(id, { x: order++, y: depth });
    maxDepth = Math.max(maxDepth, depth);
    walk(n.right, depth + 1);
  };
  walk(scene.root, 0);
  if (order === 0) return <EmptyScene what="tree" hint="root = null" />;

  const DX = 54;
  const DY = 66;
  const px = (x: number) => 40 + x * DX;
  const py = (y: number) => 36 + y * DY;
  const width = Math.max(260, 80 + Math.max(0, order - 1) * DX);
  const height = 72 + maxDepth * DY;
  // Small trees keep their natural node size (scale 1 for a single node, easing up to ~1.4x at 7 nodes);
  // from 8 nodes on the picture fills the card width as before.
  const maxScale = order >= 8 ? undefined : 1 + (0.4 * (order - 1)) / 6;
  const lit = (id: number) => {
    const s = scene.states[id];
    return !!s && LIT.includes(s);
  };

  return (
    <div className="tv-wrap">
      <svg className="svg-viz tv" style={{ minWidth: Math.min(width, 520), ...(maxScale ? { maxWidth: Math.round(width * maxScale) } : null) }} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Binary tree">
        <defs>
          <marker id={arrowId}viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" className="tv-xarrow" />
          </marker>
        </defs>
        {scene.nodes.map((n) =>
          [n.left, n.right].map((c) => {
            const a = pos.get(n.id);
            const b = c === null ? undefined : pos.get(c);
            if (!a || !b || c === null) return null;
            const hot = lit(n.id) && lit(c);
            return <line key={`${n.id}-${c}`} className={`tv-edge${hot ? ' hot' : ''}`} x1={px(a.x)} y1={py(a.y)} x2={px(b.x)} y2={py(b.y)} />;
          }),
        )}
        {(scene.extraEdges ?? []).map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          const x1 = px(a.x), y1 = py(a.y), x2 = px(b.x), y2 = py(b.y);
          const bend = 38 + Math.min(60, Math.abs(x2 - x1) / 4);
          const cx = (x1 + x2) / 2 + (x2 >= x1 ? bend : -bend), cy = (y1 + y2) / 2;
          return (
            <g key={`x${i}-${e.from}-${e.to}`} className="tv-xedge">
              <path d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} fill="none" markerEnd={`url(#${arrowId})`} />
              {e.label && <text x={cx} y={cy - 4} textAnchor="middle">{e.label}</text>}
            </g>
          );
        })}
        {scene.nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const st = scene.states[n.id];
          const label = scene.labels[n.id];
          const lw = label ? Math.max(26, label.length * 8 + 12) : 0;
          return (
            <g key={n.id} className={`tv-node ${stateClass(st, sortedSolid)}`} data-state={st ?? ''}>
              <circle className="tv-circle" cx={px(p.x)} cy={py(p.y)} r="20" />
              <text className="tv-text" x={px(p.x)} y={py(p.y) + 5} textAnchor="middle">{n.value}</text>
              {label && (
                <g className="tv-label">
                  <rect x={px(p.x) + 14} y={py(p.y) - 36} width={lw} height="18" rx="5" />
                  <text x={px(p.x) + 14 + lw / 2} y={py(p.y) - 23} textAnchor="middle">{label}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
