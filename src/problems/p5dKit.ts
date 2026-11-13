import { parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

/** Shared helpers for the bridges / articulation / SCC / bipartite problems of pack p5 (sub-group d). */

export interface GIn { n: number; edges: EdgeIn[] }

/** Parses "n" followed by edges. Nodes are base..base+n-1. Rejects self-loops and repeated pairs. */
export function parseGraph(
  raw: string,
  o: { base: 0 | 1; minN?: number; maxN: number; maxE: number; example: string; directed?: boolean; connected?: boolean },
): GIn {
  const toks = tokens(raw);
  if (!toks.length || !/^\d+$/.test(toks[0])) throw new Error(`Write n (number of nodes), then edges, e.g. ${o.example}`);
  const n = Number(toks[0]);
  const minN = o.minN ?? 1;
  if (n < minN || n > o.maxN) throw new Error(`Use between ${minN} and ${o.maxN} nodes`);
  const hi = o.base + n - 1;
  const edges = parseEdges(toks.slice(1).join(' '), { lo: o.base, hi, max: o.maxE, example: o.example.split(' ').slice(1, 3).join(' '), allowEmpty: true });
  if (edges.some((e) => e.u === e.v)) throw new Error('An edge cannot connect a node to itself');
  const key = (e: EdgeIn) => (o.directed ? `${e.u}>${e.v}` : `${Math.min(e.u, e.v)}-${Math.max(e.u, e.v)}`);
  if (new Set(edges.map(key)).size !== edges.length) throw new Error('Each pair of nodes may appear only once');
  if (o.connected) {
    if (!edges.length && n > 1) throw new Error('The network must be connected: add edges');
    const p = Array.from({ length: n }, (_, i) => i);
    const f = (x: number): number => (p[x] === x ? x : (p[x] = f(p[x])));
    edges.forEach((e) => { p[f(e.u - o.base)] = f(e.v - o.base); });
    if (new Set(p.map((_, i) => f(i))).size > 1) throw new Error('The network must be connected (every node reachable from every other)');
  }
  return { n, edges };
}

/** Example helper: "0-1 1-2" -> edges. */
export const mkEdges = (s: string): EdgeIn[] => (s.trim() ? s.trim().split(/\s+/).map((t) => { const [u, v] = t.split(/[->]+/).map(Number); return { u, v }; }) : []);

/** Neighbour list entry: neighbour id and index of the connecting edge. */
export interface Nb { to: number; ei: number }

/** Adjacency lists indexed by (node - base); neighbours sorted ascending. `directed` adds only u -> v. */
export function adjacency(n: number, edges: EdgeIn[], base: number, directed = false): Nb[][] {
  const adj: Nb[][] = Array.from({ length: n }, () => []);
  edges.forEach((e, i) => {
    adj[e.u - base].push({ to: e.v, ei: i });
    if (!directed) adj[e.v - base].push({ to: e.u, ei: i });
  });
  adj.forEach((l) => l.sort((a, b) => a.to - b.to || a.ei - b.ei));
  return adj;
}

export const fmtPairs = (ps: [number, number][]): string => `[${ps.map(([a, b]) => `[${a},${b}]`).join(',')}]`;
