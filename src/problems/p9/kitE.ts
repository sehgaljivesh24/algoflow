/**
 * Shared helpers for the rooted-tree animations of pack p9 fragment e (binary lifting, heavy-light decomposition):
 * parsing "0 0 1 1 2 | 3:4 ..." style inputs, ancestor tables, heavy-light decomposition and ntree / grid scene builders.
 */
import type { Cell, CellState, NTreeScene, Pointer, Tone } from '../../engine/types.ts';

export const TONES: Tone[] = ['blue', 'orange', 'purple', 'green', 'yellow', 'red'];
export const MAX_N = 11;

/* ------------------------------------------------------------------ parsing */

/** Parent list of nodes 1..n-1 (node 0 is the root): "0 0 1 1 2". Returns par with par[0] = -1. */
export function parseParents(part: string, example = '0 0 1 1 2'): number[] {
  const body = part.replace(/^\s*(parents?|par)\s*:/i, '').trim();
  const toks = body.split(/[\s,]+/).filter(Boolean);
  if (toks.length < 1) throw new Error(`Write the parent of nodes 1, 2, 3, ... (node 0 is the root), e.g. ${example}`);
  const nums = toks.map(Number);
  if (nums.some((x) => !Number.isInteger(x))) throw new Error(`Parents must be whole numbers, e.g. ${example}`);
  if (nums.length + 1 > MAX_N) throw new Error(`Use at most ${MAX_N} nodes (${MAX_N - 1} parents)`);
  nums.forEach((p, k) => {
    if (p < 0 || p > k) throw new Error(`The parent of node ${k + 1} must be a node numbered 0 to ${k} (saw ${p}); every parent is listed before its child`);
  });
  return [-1, ...nums];
}

/** Splits "tree | rest | more" into trimmed parts (at least `min` parts). */
export function splitParts(raw: string, min: number, usage: string): string[] {
  const parts = raw.split('|').map((s) => s.trim());
  if (parts.length < min || parts.some((p, i) => i < min && !p)) throw new Error(`Use this format: ${usage}`);
  return parts;
}

/** Parses "a:b c:d" (separator ':' or '-') into pairs of whole numbers; `check` validates each pair. */
export function parsePairs(part: string, o: { max: number; example: string; check: (a: number, b: number, tok: string) => void; sep?: RegExp }): [number, number][] {
  const toks = part.split(/[\s,;]+/).filter(Boolean);
  if (!toks.length) throw new Error(`Add at least one query, e.g. ${o.example}`);
  if (toks.length > o.max) throw new Error(`Use at most ${o.max} queries`);
  return toks.map((t) => {
    const m = (o.sep ?? /^(\d+)[:-](\d+)$/).exec(t);
    if (!m) throw new Error(`"${t}" is not a query. Write queries like ${o.example}`);
    const a = Number(m[1]);
    const b = Number(m[2]);
    o.check(a, b, t);
    return [a, b];
  });
}

export const parList = (par: number[]): string => par.slice(1).join(' ');

/* ------------------------------------------------------------------ tree maths */

export function childrenOf(par: number[]): number[][] {
  const ch: number[][] = par.map(() => []);
  par.forEach((p, v) => { if (p >= 0) ch[p].push(v); });
  return ch;
}

export function depthsOf(par: number[]): number[] {
  const d = par.map(() => 0);
  for (let v = 1; v < par.length; v++) d[v] = d[par[v]] + 1;
  return d;
}

export const bitLen = (x: number): number => (x <= 0 ? 0 : 32 - Math.clz32(x));

/** up[j][v] = the 2^j-th ancestor of v, or -1 when it does not exist. */
export function liftTable(par: number[], log: number, rootSelf = false): number[][] {
  const n = par.length;
  const up: number[][] = [par.map((p) => (p < 0 && rootSelf ? 0 : p))];
  for (let j = 1; j < log; j++) {
    const prev = up[j - 1];
    up.push(prev.map((m) => (m < 0 ? -1 : prev[m])));
  }
  void n;
  return up;
}

export interface Hld {
  size: number[];
  heavy: number[]; // heavy child or -1
  head: number[];
  pos: number[];
  chainId: number[];
  chains: number[][];
  order: number[]; // nodes in position order
}

/** Heavy child = child with the largest subtree (ties: smaller id). Positions: DFS, heavy child first. */
export function hldOf(par: number[]): Hld {
  const n = par.length;
  const ch = childrenOf(par);
  const size = par.map(() => 1);
  for (let v = n - 1; v >= 1; v--) size[par[v]] += size[v];
  const heavy = par.map(() => -1);
  for (let v = 0; v < n; v++) {
    for (const c of ch[v]) if (heavy[v] < 0 || size[c] > size[heavy[v]]) heavy[v] = c;
  }
  const head = par.map(() => 0);
  const pos = par.map(() => 0);
  const chainId = par.map(() => 0);
  const chains: number[][] = [];
  const order: number[] = [];
  const dfs = (v: number, h: number, cid: number) => {
    head[v] = h;
    chainId[v] = cid;
    pos[v] = order.length;
    order.push(v);
    chains[cid].push(v);
    if (heavy[v] >= 0) dfs(heavy[v], h, cid);
    for (const c of ch[v]) {
      if (c === heavy[v]) continue;
      chains.push([]);
      dfs(c, c, chains.length - 1);
    }
  };
  chains.push([]);
  dfs(0, 0, 0);
  return { size, heavy, head, pos, chainId, chains, order };
}

/* ------------------------------------------------------------------ scenes */

export interface NtOpts {
  par: number[];
  states?: Record<number, CellState>;
  tones?: Record<number, Tone | undefined>;
  tags?: Record<number, string>;
  subs?: Record<number, string>;
  labels?: Record<number, string | number>;
  /** edge from the parent drawn thick for these child ids */
  heavy?: Set<number> | boolean[];
  path?: number[];
  extra?: { from: number; to: number; label?: string; tone?: Tone }[];
  pointers?: { id: string; label: string; node: number; tone: Tone }[];
  box?: boolean;
}

export function ntScene(o: NtOpts): NTreeScene {
  const ch = childrenOf(o.par);
  const isHeavy = (v: number) => (o.heavy instanceof Set ? o.heavy.has(v) : Array.isArray(o.heavy) ? !!o.heavy[v] : false);
  const pointers: Pointer[] = (o.pointers ?? []).map((p) => ({ id: p.id, label: p.label, index: p.node, tone: p.tone }));
  return {
    kind: 'ntree',
    root: 0,
    shape: o.box ? 'box' : 'circle',
    nodes: o.par.map((_, v) => ({
      id: v,
      label: o.labels?.[v] ?? v,
      sub: o.subs?.[v],
      tag: o.tags?.[v],
      children: ch[v],
      state: o.states?.[v],
      tone: o.tones?.[v],
      heavy: isHeavy(v) || undefined,
    })),
    path: o.path ? [...o.path] : undefined,
    extraEdges: o.extra ? o.extra.map((e) => ({ ...e })) : undefined,
    pointers: pointers.length ? pointers : undefined,
  };
}

/** Table of the ancestor table up[j][v]: rows are levels (2^j), columns are nodes. null = not computed yet. */
export function liftGrid(table: (number | null)[][], hot: Record<string, CellState> = {}): { kind: 'grid'; variant: 'table'; rows: Cell[][]; rowHeads: string[]; colHeads: string[] } {
  const n = table[0]?.length ?? 0;
  return {
    kind: 'grid',
    variant: 'table',
    rowHeads: table.map((_, j) => `2^${j}`),
    colHeads: Array.from({ length: n }, (_, v) => String(v)),
    rows: table.map((row, j) => row.map((x, v): Cell => {
      const st = hot[`${j},${v}`];
      return { key: `${j},${v}`, value: x === null ? '?' : x < 0 ? '–' : x, state: st ?? (x === null ? 'dim' : undefined) };
    })),
  };
}

export const rangeStr = (a: number[]): string => `[${a.join(', ')}]`;

/** Tiny deterministic PRNG for example data / fuzz. */
export function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ LCA via lifting (event stream) */

export type LcaEv =
  | { t: 'order'; u: number; v: number; swapped: boolean; diff: number }
  | { t: 'lift'; j: number; from: number; to: number }
  | { t: 'same'; node: number }
  | { t: 'cmp'; j: number; a: number; b: number; jump: boolean; u: number; v: number }
  | { t: 'final'; u: number; v: number; lca: number };

/** The binary-lifting LCA as a list of events (the animations turn them into steps). `up` must have the root pointing at itself. */
export function lcaEvents(up: number[][], depth: number[], u0: number, v0: number): { events: LcaEv[]; lca: number } {
  const events: LcaEv[] = [];
  let u = u0;
  let v = v0;
  const swapped = depth[u] < depth[v];
  if (swapped) [u, v] = [v, u];
  const diff = depth[u] - depth[v];
  events.push({ t: 'order', u, v, swapped, diff });
  for (let j = 0; j < up.length; j++) {
    if ((diff >> j) & 1) {
      const to = up[j][u];
      events.push({ t: 'lift', j, from: u, to });
      u = to;
    }
  }
  if (u === v) {
    events.push({ t: 'same', node: u });
    return { events, lca: u };
  }
  for (let j = up.length - 1; j >= 0; j--) {
    const a = up[j][u];
    const b = up[j][v];
    const jump = a !== b;
    events.push({ t: 'cmp', j, a, b, jump, u, v });
    if (jump) { u = a; v = b; }
  }
  const lca = up[0][u];
  events.push({ t: 'final', u, v, lca });
  return { events, lca };
}
