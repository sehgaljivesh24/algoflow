/** Helpers shared by the three heavy-light-decomposition animations (chains, path maximum, LCA). */
import type { Cell, CellState, Scene, Tone } from '../../engine/types.ts';
import { MAX_N, TONES, childrenOf, depthsOf, hldOf, parList, parseParents, parsePairs, splitParts } from './kitE.ts';
import type { Hld } from './kitE.ts';

export { hldOf, depthsOf, childrenOf, TONES };
export type { Hld };

export const chainTone = (h: Hld, v: number): Tone => TONES[h.chainId[v] % TONES.length];

/** Tones for a set of nodes: one colour per chain. */
export function toneMap(h: Hld, nodes: Iterable<number>): Record<number, Tone> {
  const out: Record<number, Tone> = {};
  for (const v of nodes) out[v] = chainTone(h, v);
  return out;
}

/** Child ids whose edge from the parent is a heavy edge. */
export const heavyChildren = (h: Hld): Set<number> => new Set(h.heavy.filter((c) => c >= 0));

/** The positions array drawn as a one-row table (colour = chain): cell i = the node (or its value) at position i; positions >= upto are still empty. */
export function posRow(h: Hld, upto: number, valueOf: (v: number) => string | number, stateOf: (pos: number) => CellState | undefined = () => undefined): Scene {
  const cells: Cell[] = h.order.map((v, i) => {
    const c: Cell = { key: i, value: i < upto ? valueOf(v) : '?' };
    const st = i < upto ? stateOf(i) : 'dim';
    if (st) c.state = st;
    else if (i < upto) c.tone = chainTone(h, v); // in a table a state colour would lose against the tone, so use one or the other
    return c;
  });
  return { kind: 'grid', variant: 'table', rows: [cells], rowHeads: ['node'], colHeads: h.order.map((_, i) => String(i)) };
}

export const countLight = (h: Hld, par: number[], v: number): number => {
  let c = 0;
  for (let x = v; par[x] >= 0; x = par[x]) if (h.heavy[par[x]] !== x) c++;
  return c;
};

/** "tree | queries" (queries optional via `needQueries`). Returns the parents and the pairs. */
export function parseTreeQueries(raw: string, usage: string, example: string): { par: number[]; queries: [number, number][] } {
  const [t, q] = splitParts(raw, 2, usage);
  const par = parseParents(t);
  const n = par.length;
  const queries = parsePairs(q, {
    max: 3, example,
    check: (u, v, tok) => { if (u >= n || v >= n) throw new Error(`In "${tok}" both nodes must be between 0 and ${n - 1}`); },
  });
  return { par, queries };
}

/** Walk-up reference for the maximum value on a path. */
export function refPathMax(par: number[], vals: number[], u: number, v: number): number {
  const d = depthsOf(par);
  let best = -Infinity;
  while (u !== v) {
    if (d[u] < d[v]) [u, v] = [v, u];
    best = Math.max(best, vals[u]);
    u = par[u];
  }
  return Math.max(best, vals[u]);
}

export { MAX_N, parList, parseParents, parsePairs, splitParts };
