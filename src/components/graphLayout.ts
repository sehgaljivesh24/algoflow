import type { GraphEdgeVM, GraphNodeVM } from '../engine/types';

export const GRAPH_W = 560;
export const GRAPH_H = 290;
export const GRAPH_PAD_X = 52;
export const GRAPH_PAD_Y = 50;
const W = GRAPH_W;
const H = GRAPH_H;
const PAD_X = GRAPH_PAD_X;
const PAD_Y = GRAPH_PAD_Y;

export type P = { x: number; y: number };

/** Deterministic automatic layout (circle, or left-to-right layers). Positions are in SVG units. */
export function layoutGraph(nodes: GraphNodeVM[], edges: GraphEdgeVM[], layout: 'circle' | 'layered' = 'circle'): Map<number, P> {
  const out = new Map<number, P>();
  const n = nodes.length;
  if (n === 0) return out;
  if (nodes.every((v) => typeof v.x === 'number' && typeof v.y === 'number')) {
    for (const v of nodes) out.set(v.id, { x: PAD_X + v.x! * (W - 2 * PAD_X), y: PAD_Y + v.y! * (H - 2 * PAD_Y) });
    return out;
  }
  if (layout === 'layered' && n > 1) {
    const ids = nodes.map((v) => v.id);
    const layerOf = new Map<number, number>();
    const directed = edges.length > 0 && edges.every((e) => e.directed);
    // Longest-path layering when the graph is a DAG; otherwise BFS depth over the undirected graph.
    let dag = false;
    if (directed) {
      const indeg = new Map(ids.map((i) => [i, 0]));
      for (const e of edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
      const queue = ids.filter((i) => indeg.get(i) === 0);
      for (const i of queue) layerOf.set(i, 0);
      let seen = 0;
      for (let h = 0; h < queue.length; h++) {
        const u = queue[h];
        seen++;
        for (const e of edges) {
          if (e.from !== u) continue;
          layerOf.set(e.to, Math.max(layerOf.get(e.to) ?? 0, (layerOf.get(u) ?? 0) + 1));
          indeg.set(e.to, indeg.get(e.to)! - 1);
          if (indeg.get(e.to) === 0) queue.push(e.to);
        }
      }
      dag = seen === n;
    }
    if (!dag) {
      layerOf.clear();
      for (const start of ids) {
        if (layerOf.has(start)) continue;
        layerOf.set(start, 0);
        const q = [start];
        for (let h = 0; h < q.length; h++) {
          const u = q[h];
          const nb = edges.flatMap((e) => (e.from === u ? [e.to] : e.to === u ? [e.from] : [])).sort((a, b) => a - b);
          for (const w of nb) if (!layerOf.has(w)) { layerOf.set(w, layerOf.get(u)! + 1); q.push(w); }
        }
      }
    }
    const L = Math.max(...layerOf.values()) + 1;
    const layers: number[][] = Array.from({ length: L }, () => []);
    for (const i of ids) layers[layerOf.get(i)!].push(i);
    // one barycentre sweep to cut crossings
    const rank = new Map<number, number>();
    layers[0].forEach((i, k) => rank.set(i, k));
    for (let l = 1; l < L; l++) {
      const bary = (i: number) => {
        const nb = edges.flatMap((e) => (e.to === i ? [e.from] : e.from === i ? [e.to] : [])).filter((w) => layerOf.get(w) === l - 1);
        return nb.length ? nb.reduce((s, w) => s + rank.get(w)!, 0) / nb.length : 1e6;
      };
      layers[l].sort((a, b) => bary(a) - bary(b) || a - b);
      layers[l].forEach((i, k) => rank.set(i, k));
    }
    layers.forEach((col, l) => {
      col.forEach((i, k) => {
        out.set(i, {
          x: L === 1 ? W / 2 : PAD_X + (l / (L - 1)) * (W - 2 * PAD_X),
          y: PAD_Y + ((k + 1) / (col.length + 1)) * (H - 2 * PAD_Y),
        });
      });
    });
    return out;
  }
  // circle
  const rx = n <= 2 ? 90 : Math.min(W / 2 - PAD_X, 70 + n * 22);
  const ry = n <= 2 ? 0 : Math.min(H / 2 - PAD_Y, 40 + n * 12);
  nodes.forEach((v, k) => {
    if (n === 1) { out.set(v.id, { x: W / 2, y: H / 2 }); return; }
    const a = -Math.PI / 2 + (2 * Math.PI * k) / n;
    out.set(v.id, { x: W / 2 + rx * Math.cos(a), y: H / 2 + ry * Math.sin(a) });
  });
  return out;
}


/** The automatic layout expressed as fixed 0..1 coordinates, so several scenes can share exactly the same node positions. */
export function fixedCoords(nodes: GraphNodeVM[], edges: GraphEdgeVM[], layout: 'circle' | 'layered' = 'circle'): Map<number, P> {
  const out = new Map<number, P>();
  for (const [id, p] of layoutGraph(nodes, edges, layout)) {
    out.set(id, { x: Math.min(1, Math.max(0, (p.x - PAD_X) / (W - 2 * PAD_X))), y: Math.min(1, Math.max(0, (p.y - PAD_Y) / (H - 2 * PAD_Y))) });
  }
  return out;
}
