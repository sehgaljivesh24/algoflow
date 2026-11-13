import type { CellState, EdgeState, GraphEdgeVM, GraphNodeVM, GraphScene, Tone } from '../engine/types';
import { TONES, tokens } from './graphKit.ts';

/** Small union-find used by the pack-p5 spanning-tree / union-find animations (ids 0..n-1, path halving, union by attaching root a under root b). */
export class Dsu {
  parent: number[];
  n: number;
  constructor(n: number) {
    this.n = n;
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  /** Root without compressing (for drawing). */
  root(x: number): number {
    while (this.parent[x] !== x) x = this.parent[x];
    return x;
  }
  /** Chain of parents from x to its root, inclusive. */
  path(x: number): number[] {
    const out = [x];
    while (this.parent[x] !== x) { x = this.parent[x]; out.push(x); }
    return out;
  }
  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    this.parent[ra] = rb;
    return true;
  }
  size(r: number): number {
    let c = 0;
    for (let i = 0; i < this.n; i++) if (this.root(i) === r) c++;
    return c;
  }
  components(): number {
    let c = 0;
    for (let i = 0; i < this.n; i++) if (this.parent[i] === i) c++;
    return c;
  }
  /** Colour shared by every member of a group of 2+ nodes; singletons stay uncoloured. */
  tone(x: number): Tone | undefined {
    const r = this.root(x);
    if (this.size(r) < 2) return undefined;
    let m = r;
    for (let i = 0; i < this.n; i++) if (this.root(i) === r) { m = i; break; }
    return TONES[m % TONES.length];
  }
}

export interface WEdge { u: number; v: number; w: number }

/** True when the n nodes are joined by the given edges. */
export function isConnected(n: number, edges: { u: number; v: number }[]): boolean {
  const d = new Dsu(n);
  edges.forEach((e) => d.union(e.u, e.v));
  return d.components() === 1;
}

/** Parses "u-v:w" tokens (nodes lo..hi, weights 1..99) into edges, rejecting loops and repeated pairs. */
export function parseWeightedEdges(toks: string[], o: { lo: number; hi: number; max: number; example: string }): WEdge[] {
  if (!toks.length) throw new Error(`Enter weighted edges like ${o.example}`);
  if (toks.length > o.max) throw new Error(`Use at most ${o.max} edges`);
  const seen = new Set<string>();
  return toks.map((t) => {
    const m = /^(\d+)-(\d+):(\d+)$/.exec(t);
    if (!m) throw new Error(`"${t}" is not a weighted edge. Write edges like ${o.example}`);
    const u = Number(m[1]);
    const v = Number(m[2]);
    const w = Number(m[3]);
    if (u < o.lo || u > o.hi || v < o.lo || v > o.hi) throw new Error(`Node numbers must be between ${o.lo} and ${o.hi} (saw "${t}")`);
    if (u === v) throw new Error('An edge cannot connect a node to itself');
    if (w < 1 || w > 99) throw new Error('Edge weights must be between 1 and 99');
    const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
    if (seen.has(key)) throw new Error(`The pair ${key} appears twice; keep one edge per pair`);
    seen.add(key);
    return { u, v, w };
  });
}

export { tokens };

/** Edge status codes for `mstScene`: todo, being looked at, taken into the tree, skipped earlier, rejected right now, faded. */
export type EdgeMark = 'todo' | 'cur' | 'take' | 'skip' | 'bad' | 'dim';
const MARK: Record<EdgeMark, EdgeState> = { todo: 'default', cur: 'active', take: 'chosen', skip: 'visited', bad: 'error', dim: 'dim' };

/**
 * Graph scene for the spanning-tree problems. Nodes get ids base..base+n-1 and are coloured by union-find group;
 * `tag` shows the parent pointer (→p) when a node has been attached.
 */
export function mstScene(o: {
  n: number; base: number; edges: WEdge[]; marks: EdgeMark[]; dsu?: Dsu; hot?: number[]; hotState?: CellState;
  tags?: (string | undefined)[]; states?: (CellState | undefined)[]; labels?: (string | number | undefined)[];
  weightText?: (e: WEdge, i: number) => string | number;
}): GraphScene {
  const { n, base, edges, marks, dsu, hot = [], hotState = 'active' } = o;
  const nodes: GraphNodeVM[] = Array.from({ length: n }, (_, k) => ({
    id: base + k,
    label: o.labels?.[k],
    state: o.states?.[k] ?? (hot.includes(base + k) ? hotState : undefined),
    tone: dsu ? dsu.tone(k) : undefined,
    tag: o.tags ? o.tags[k] : dsu && dsu.parent[k] !== k ? `→${base + dsu.parent[k]}` : undefined,
  }));
  const ge: GraphEdgeVM[] = edges.map((e, i) => ({
    from: e.u, to: e.v, weight: o.weightText ? o.weightText(e, i) : e.w, state: MARK[marks[i]],
  }));
  return { kind: 'graph', nodes, edges: ge };
}
