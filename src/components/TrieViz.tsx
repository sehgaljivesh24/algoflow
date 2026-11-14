import { useId } from 'react';
import type { CSSProperties } from 'react';
import type { TrieNodeVM, TrieScene } from '../engine/types';
import { linkArc } from './linkCurve';

const DX = 46;
const DY = 60;
const R = 17;

/** Node colour roles (CSS classes in styles-visuals.css). */
const NODE_CLASS: Record<string, string> = {
  active: 'vz-current', compare: 'vz-queued', swap: 'vz-visited', found: 'vz-result', sorted: 'vz-result', error: 'vz-rejected', dim: 'vz-dim',
};

const LINK_TONE: Record<string, string> = { active: 'blue', found: 'green', error: 'red', dim: 'dim' };
const LINK_TONES = ['orange', 'blue', 'green', 'red', 'dim'];

export function TrieViz({ scene }: { scene: TrieScene }) {
  // the page can hold several copies of this picture (height probe, split scenes): arrow markers need distinct ids
  const uid = useId().replace(/:/g, '');
  const byId = new Map<number, TrieNodeVM>(scene.nodes.map((n) => [n.id, n]));
  const pos = new Map<number, { x: number; y: number }>();
  let leaf = 0;
  let maxDepth = 0;
  const seen = new Set<number>();
  // tidy layout: leaves take consecutive columns, a parent sits above the middle of its children
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

  const hasLabels = scene.nodes.some((n) => n.label);
  const px = (x: number) => (links.length ? 70 : 40) + x * DX;
  const py = (y: number) => 30 + y * DY;
  const links = scene.links ?? [];
  const below = scene.labelPos === 'below';
  const width = Math.max(300, 80 + Math.max(0, leaf - 1) * DX + (hasLabels && !below ? 50 : 0) + (links.length ? 60 : 0));
  const height = 62 + maxDepth * DY + (links.length ? 14 : 0) + (hasLabels && below ? 20 : 0);
  const onPath = new Set<string>();
  const path = scene.path ?? [];
  for (let i = 1; i < path.length; i++) onPath.add(`${path[i - 1]}>${path[i]}`);
  const pathNodes = new Set(path);
  const ends = scene.nodes.filter((n) => n.end).length;

  return (
    <div className="tr-wrap">
      <svg
        className="svg-viz tr"
        viewBox={`0 0 ${width} ${height}`}
        style={{ maxWidth: Math.round(width * 1.15) }}
        role="img"
        aria-label={`Trie with ${scene.nodes.length - 1} letters and ${ends} words`}
      >
        <defs>
          {LINK_TONES.map((tn) => (
            <marker key={tn} id={`tr-xa-${uid}-${tn}`} className={`nt-mk tone-${tn}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0 0L10 5L0 10z" />
            </marker>
          ))}
        </defs>
        {scene.nodes.map((n) =>
          n.children.map((c) => {
            const a = pos.get(n.id);
            const b = pos.get(c);
            if (!a || !b || !byId.has(c)) return null;
            const hot = onPath.has(`${n.id}>${c}`);
            const x1 = px(a.x);
            const y1 = py(a.y);
            const x2 = px(b.x);
            const y2 = py(b.y);
            const len = Math.hypot(x2 - x1, y2 - y1) || 1;
            const ux = (x2 - x1) / len;
            const uy = (y2 - y1) / len;
            const d = `M ${x1 + ux * R} ${y1 + uy * R} L ${x2 - ux * R} ${y2 - uy * R}`;
            const word = byId.get(c)!.char;
            // multi-letter edge text, or a single letter when the circle shows `text` (e.g. an automaton state id)
            const ew = word.length > 1 ? word.length * 6.6 + 10 : word && byId.get(c)!.text ? 18 : 0;
            return (
              <g key={`${n.id}-${c}`}>
                <path d={d} style={{ d: `path("${d}")` } as CSSProperties} fill="none" className={`tr-edge${hot ? ' hot' : ''}`} />
                {ew > 0 && (
                  <g>
                    <rect x={(x1 + x2) / 2 - ew / 2} y={(y1 + y2) / 2 - 8} width={ew} height="16" rx="8" className={`gv-wbox tr-ebox${hot ? ' hot' : ''}`} />
                    <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 3.6} textAnchor="middle" className="gv-wtext tr-etext">{word}</text>
                  </g>
                )}
              </g>
            );
          }),
        )}
        {links.map((l, i) => {
          const a = pos.get(l.from);
          const b = pos.get(l.to);
          if (!a || !b) return null;
          const A = { x: px(a.x), y: py(a.y) };
          const B = { x: px(b.x), y: py(b.y) };
          const tn = (l.state && LINK_TONE[l.state]) || 'orange';
          const { d, mx, my } = linkArc(A, B, R, R, true, B.x >= A.x ? 1 : -1, (i % 3) * 8);
          return (
            <g key={`l${i}-${l.from}-${l.to}`} className={`tr-link tone-${tn}`}>
              <path d={d} fill="none" markerEnd={`url(#tr-xa-${uid}-${tn})`} />
              {l.label && <text x={mx} y={my - 4} textAnchor="middle">{l.label}</text>}
            </g>
          );
        })}
        {scene.nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const st = n.state;
          const isRoot = n.id === scene.root;
          const cls = (st && NODE_CLASS[st]) || (pathNodes.has(n.id) ? 'vz-on-path' : '');
          const cx = px(p.x);
          const cy = py(p.y);
          const lw = n.label ? Math.max(24, n.label.length * 6.6 + 10) : 0;
          return (
            <g key={n.id} className={`tr-node${st === 'dim' ? ' vz-faded' : ''}`} style={{ transform: `translate(${cx}px, ${cy}px)` }}>
              <g className="tr-pop">
                {n.end && <circle r={R + 4} className="tr-endring" />}
                <circle r={R} className={`tr-circle ${cls}`} />
                <text x="0" y={isRoot && !n.text ? 3 : 4.5} textAnchor="middle" className={isRoot && !n.text ? 'tr-root' : 'tr-ch'}>{n.text ?? (isRoot ? 'root' : n.char.length > 1 ? '' : n.char)}</text>
                {n.label && (
                  <g>
                    <rect x={below ? -lw / 2 : R + 6} y={below ? R + 5 : -8} width={lw} height="16" rx="5" className="gv-tagbox" />
                    <text x={below ? 0 : R + 6 + lw / 2} y={below ? R + 16.5 : 3.5} textAnchor="middle" className="gv-tagtext">{n.label}</text>
                  </g>
                )}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
