import type { Step } from '../../src/engine/types.ts';
import type { CaseModule, OracleCase, State } from './types.ts';
import { num, rint, sceneOfKind, scenesOf, shown } from './util.ts';

/**
 * Batch d4: union-find / MST / shortest paths / flow / SCC / bipartite / LCA / HLD oracles.
 * Every oracle below is written from the textbook algorithm (the Java in problem.java is the spec); none imports a problem or kit.
 */

/* ------------------------------------------------------------------ helpers */
type R = () => number;
type E = { u: number; v: number; w: number };

/** Items of the aux panel whose title starts with `prefix` (empty when absent). */
export function auxItems(step: Step, prefix: string): string[] {
  return step.aux?.find((a) => a.title.startsWith(prefix))?.items ?? [];
}
/** "k→p" items -> parent numbers (offset subtracted from both sides; letters mapped through `letters`). */
function parentsOf(step: Step, prefix: string, off = 0): number[] {
  return auxItems(step, prefix).map((s) => Number(/→(\d+)/.exec(s)![1]) - off);
}
/** leading integer of a "x/y" var */
function lead(step: Step, key: string): number | null {
  const v = step.vars[key];
  if (v === undefined || v === '—') return null;
  return Number(String(v).split('/')[0]);
}
const shuffle = <T,>(r: R, a: T[]): T[] => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
/** Random simple undirected edges on nodes lo..lo+n-1, at most `max` of them; weights in [wlo, whi]. */
function randEdges(r: R, n: number, lo: number, max: number, wlo = 1, whi = 9, density = 0.5): E[] {
  const all: [number, number][] = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) all.push([a + lo, b + lo]);
  const m = Math.min(max, all.length, Math.max(0, Math.round(all.length * density * (0.4 + r()))));
  return shuffle(r, all).slice(0, m).map(([a, b]) => (r() < 0.5 ? { u: a, v: b, w: rint(r, wlo, whi) } : { u: b, v: a, w: rint(r, wlo, whi) }));
}
/** Random connected simple graph (spanning tree first, then extra edges), edges shuffled. */
function randConnected(r: R, n: number, lo: number, max: number, wlo = 1, whi = 9): E[] {
  const es: E[] = [];
  const seen = new Set<string>();
  const key = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;
  for (let i = 1; i < n; i++) { const p = rint(r, 0, i - 1); es.push({ u: p + lo, v: i + lo, w: rint(r, wlo, whi) }); seen.add(key(p, i)); }
  const extra = rint(r, 0, Math.max(0, Math.min(max - (n - 1), (n * (n - 1)) / 2 - (n - 1))));
  for (let t = 0; t < extra * 4 && es.length < max; t++) {
    const a = rint(r, 0, n - 1), b = rint(r, 0, n - 1);
    if (a === b || seen.has(key(a, b)) || es.length - (n - 1) >= extra) continue;
    seen.add(key(a, b)); es.push({ u: a + lo, v: b + lo, w: rint(r, wlo, whi) });
  }
  return shuffle(r, es).map((e) => (r() < 0.5 ? e : { u: e.v, v: e.u, w: e.w }));
}
/** Path-halving find on a plain parent array (independent re-implementation). */
function findHalving(p: number[], x: number): number {
  while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; }
  return x;
}

/* ------------------------------------------------------------------ 1135 Kruskal */
type KIn = { n: number; edges: E[] };
function kruskalSuffix(items: string[], t: string, s: string): string[] {
  return items.map((x) => (x.endsWith(t) ? 'T' : x.endsWith(s) ? 'S' : ''));
}
const c1135: OracleCase<KIn> = {
  slug: '1135-connecting-cities-with-minimum-cost',
  gen: (r) => {
    const n = rint(r, 2, 8);
    const es = randEdges(r, n, 1, 14, 1, r() < 0.4 ? 3 : 20, 0.3 + r() * 0.6);
    return { n, edges: es.length ? es : [{ u: 1, v: 2, w: 1 }] };
  },
  oracle: ({ n, edges: input }) => {
    const edges = input.map((e, i) => ({ e, i })).sort((a, b) => a.e.w - b.e.w || a.i - b.i).map((x) => x.e);
    const parent = Array.from({ length: n }, (_, i) => i);
    const marks: string[] = edges.map(() => '');
    let total = 0, used = 0, edge: string | null = null, ru: number | null = null, rv: number | null = null;
    const out: State[] = [];
    const snap = () => out.push({ parent: parent.map((x) => x + 1), cost: total, used, edge, ru, rv, marks: [...marks] });
    snap();
    let done = false;
    for (let i = 0; i < edges.length && !done; i++) {
      const { u, v, w } = edges[i];
      edge = `${u}-${v}`; ru = null; rv = null;
      snap();
      const a = findHalving(parent, u - 1), b = findHalving(parent, v - 1);
      ru = a + 1; rv = b + 1;
      if (a === b) { marks[i] = 'S'; snap(); continue; }
      parent[a] = b; total += w; used++; marks[i] = 'T';
      snap();
      if (used === n - 1) { done = true; edge = null; snap(); }
    }
    edge = null; ru = null; rv = null;
    snap();
    return out;
  },
  project: (s) => ({
    parent: parentsOf(s, 'parent[', 0), cost: num(s, 'cost'), used: lead(s, 'used'), edge: shown(s, 'edge'), ru: num(s, 'root(u)'), rv: num(s, 'root(v)'),
    marks: kruskalSuffix(auxItems(s, 'edges sorted'), ' ✓', ' ✗'),
  }),
  notes: 'scene colours / edge states not compared',
};

/* ------------------------------------------------------------------ 1319 */
type CIn = { n: number; cables: { u: number; v: number }[] };
const c1319: OracleCase<CIn> = {
  slug: '1319-number-of-operations-to-make-network-connected',
  gen: (r) => {
    const n = rint(r, 2, 8);
    const es = randEdges(r, n, 0, 12, 1, 1, 0.2 + r() * 0.8);
    return { n, cables: (es.length ? es : [{ u: 0, v: 1, w: 1 }]).map((e) => ({ u: e.u, v: e.v })) };
  },
  oracle: ({ n, cables }) => {
    const parent = Array.from({ length: n }, (_, i) => i);
    const marks: string[] = cables.map(() => '');
    let spare = 0, comps = n, answer: number | null = null, cable: string | null = null;
    const out: State[] = [];
    const snap = () => out.push({ parent: [...parent], spare, components: comps, answer, cable, marks: [...marks] });
    snap();
    if (cables.length < n - 1) { answer = -1; snap(); return out; }
    for (let i = 0; i < cables.length; i++) {
      const { u, v } = cables[i];
      cable = `${u}-${v}`;
      const a = findHalving(parent, u), b = findHalving(parent, v);
      if (a === b) { spare++; marks[i] = 'S'; } else { parent[a] = b; comps--; marks[i] = 'M'; }
      snap();
    }
    cable = null; answer = comps - 1; snap();
    return out;
  },
  project: (s) => ({
    parent: parentsOf(s, 'parent[', 0), spare: num(s, 'spare'), components: num(s, 'components'), answer: num(s, 'answer'), cable: shown(s, 'cable'),
    marks: auxItems(s, 'cables').map((x) => (x.endsWith(' merges') ? 'M' : x.endsWith(' spare') ? 'S' : '')),
  }),
};

/* ------------------------------------------------------------------ Prim (lazy heap) shared by 1168 and cp-prims */
type Ent = { w: number; v: number; ei: number };
function primOracle(n: number, edges: E[]): State[] {
  const inTree = new Array<boolean>(n).fill(false);
  const other = (ei: number, x: number) => (edges[ei].u === x ? edges[ei].v : edges[ei].u);
  // tie rule shown by the animation: smaller weight, then smaller node, then earlier input edge (java's PriorityQueue leaves ties unspecified)
  const less = (a: Ent, b: Ent) => a.w - b.w || a.v - b.v || a.ei - b.ei;
  const heap: Ent[] = [{ w: 0, v: 0, ei: -1 }];
  const mst: string[] = [];
  let total = 0, taken = 0, popped: string | null = null;
  const out: State[] = [];
  const heapStr = () => heap.map((h) => `(${h.w}, ${h.v}${h.ei >= 0 ? ` via ${other(h.ei, h.v)}` : ''})${h.ei >= 0 && inTree[h.v] ? ' stale' : ''}`);
  const snap = () => out.push({ heap: heapStr(), mst: mst.length ? [...mst] : ['none yet'], inTree: inTree.map((b, i) => `${i}: ${b ? 'yes' : 'no'}`), popped, total, taken });
  snap();
  while (heap.length && taken < n) {
    heap.sort(less);
    const top = heap.shift()!;
    popped = top.ei >= 0 ? `(${top.w}, ${top.v})` : '(0, 0)';
    if (inTree[top.v]) { snap(); continue; }
    snap();
    inTree[top.v] = true; total += top.w; taken++;
    if (top.ei >= 0) mst.push(`${other(top.ei, top.v)}–${top.v} (${top.w})`);
    for (let ei = 0; ei < edges.length; ei++) {
      if (edges[ei].u !== top.v && edges[ei].v !== top.v) continue;
      const to = other(ei, top.v);
      if (!inTree[to]) heap.push({ w: edges[ei].w, v: to, ei });
    }
    heap.sort(less);
    snap();
  }
  popped = null;
  snap();
  return out;
}
const primProject = (s: Step): State => ({
  heap: auxItems(s, 'priority queue'), mst: auxItems(s, 'MST edges'), inTree: auxItems(s, 'in the tree'),
  popped: shown(s, 'popped'), total: num(s, 'cost so far'), taken: lead(s, 'in tree'),
});
const primNotes = 'graph scene colours not compared; heap shown sorted by (weight, node, input edge index) — design choice for ties';
const c1168: OracleCase<{ wells: number[]; pipes: E[] }> = {
  slug: '1168-optimize-water-distribution-in-a-village',
  gen: (r) => {
    const n = rint(r, 2, 6);
    const pipes = randEdges(r, n, 1, 9, 1, r() < 0.4 ? 3 : 20, 0.3 + r() * 0.6);
    return { wells: Array.from({ length: n }, () => rint(r, 1, r() < 0.4 ? 3 : 20)), pipes };
  },
  oracle: ({ wells, pipes }) => primOracle(wells.length + 1, [...wells.map((c, i) => ({ u: 0, v: i + 1, w: c })), ...pipes]),
  project: primProject,
  notes: primNotes,
};
const cPrim: OracleCase<KIn> = {
  slug: 'cp-prims-mst-with-a-heap',
  gen: (r) => { const n = rint(r, 2, 8); return { n, edges: randConnected(r, n, 0, 14, 1, r() < 0.4 ? 3 : 20) }; },
  oracle: ({ n, edges }) => primOracle(n, edges),
  project: primProject,
  notes: primNotes,
};

/* ------------------------------------------------------------------ 1584 Prim O(n^2) on points */
type PIn = { pts: [number, number][] };
const c1584: OracleCase<PIn> = {
  slug: '1584-min-cost-to-connect-all-points',
  gen: (r) => {
    const n = rint(r, 2, 7);
    const set = new Set<string>(); const pts: [number, number][] = [];
    const span = r() < 0.5 ? 3 : 20;
    while (pts.length < n) { const p: [number, number] = [rint(r, -span, span), rint(r, -span, span)]; if (!set.has(p.join())) { set.add(p.join()); pts.push(p); } }
    return { pts };
  },
  oracle: ({ pts }) => {
    const n = pts.length, INF = Infinity;
    const d = (a: number, b: number) => Math.abs(pts[a][0] - pts[b][0]) + Math.abs(pts[a][1] - pts[b][1]);
    const minD = new Array<number>(n).fill(INF), inTree = new Array<boolean>(n).fill(false);
    const tree: string[] = [];
    const from = new Array<number>(n).fill(-1);
    minD[0] = 0;
    let total = 0, cur: number | null = null;
    const out: State[] = [];
    const snap = () => out.push({ minD: minD.map((x, i) => `${i}: ${inTree[i] ? '✓' : x === INF ? '∞' : x}`), tree: tree.length ? [...tree] : ['none yet'], node: cur, size: inTree.filter(Boolean).length, total });
    snap();
    for (let it = 0; it < n; it++) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!inTree[i] && (u === -1 || minD[i] < minD[u])) u = i; // first index wins ties
      cur = u; inTree[u] = true; total += minD[u];
      if (from[u] >= 0) tree.push(`${from[u]}–${u} (${minD[u]})`);
      snap();
      if (it === n - 1) break;
      for (let v = 0; v < n; v++) {
        if (inTree[v]) continue;
        const w = d(u, v);
        if (w < minD[v]) { minD[v] = w; from[v] = u; snap(); }
      }
      cur = null;
    }
    cur = null; snap();
    return out;
  },
  project: (s) => ({ minD: auxItems(s, 'cheapest link'), tree: auxItems(s, 'MST edges'), node: shown(s, 'node'), size: num(s, 'tree size'), total: num(s, 'total cost') }),
  notes: 'graph scene (probe edges, d= tags) not compared; ties pick the lowest index (strict <)',
};

/* ------------------------------------------------------------------ cp-max-spacing-k-clustering-kruskal */
type MIn = { n: number; k: number; edges: E[] };
const cMaxSpacing: OracleCase<MIn> = {
  slug: 'cp-max-spacing-k-clustering-kruskal',
  gen: (r) => { const n = rint(r, 3, 8); return { n, k: rint(r, 2, n), edges: randConnected(r, n, 1, 14, 1, r() < 0.4 ? 3 : 20) }; },
  oracle: ({ n, k, edges: input }) => {
    const edges = input.map((e, i) => ({ e, i })).sort((a, b) => a.e.w - b.e.w || a.i - b.i).map((x) => x.e);
    const parent = Array.from({ length: n }, (_, i) => i);
    const marks: string[] = edges.map(() => '');
    let clusters = n, spacing: number | null = null, edge: string | null = null, ru: number | null = null, rv: number | null = null;
    const out: State[] = [];
    const snap = () => out.push({ parent: parent.map((x) => x + 1), clusters, spacing, edge, ru, rv, marks: [...marks] });
    snap();
    let answered = false;
    for (let i = 0; i < edges.length && !answered; i++) {
      const { u, v, w } = edges[i];
      edge = `${u}-${v}`; ru = null; rv = null; snap();
      const a = findHalving(parent, u - 1), b = findHalving(parent, v - 1);
      ru = a + 1; rv = b + 1;
      if (a === b) { marks[i] = 'I'; snap(); continue; }
      if (clusters === k) { spacing = w; answered = true; snap(); break; }
      parent[a] = b; clusters--; marks[i] = 'M'; snap();
    }
    if (!answered) edge = null;
    snap();
    return out;
  },
  project: (s) => ({
    parent: parentsOf(s, 'parent[', 0), clusters: num(s, 'clusters'), spacing: num(s, 'spacing'), edge: shown(s, 'edge'), ru: num(s, 'root(u)'), rv: num(s, 'root(v)'),
    marks: auxItems(s, 'edges sorted').map((x) => (x.endsWith(' merge') ? 'M' : x.endsWith(' inside') ? 'I' : '')),
  }),
};

/* ------------------------------------------------------------------ 1489 */
function kruskalSet(n: number, edges: E[], order: number[], skip: number, force: number): { total: number; taken: number[] } {
  const p = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (p[x] === x ? x : (p[x] = find(p[x])));
  const taken: number[] = []; let total = 0;
  const join = (id: number) => { const a = find(edges[id].u), b = find(edges[id].v); if (a === b) return false; p[a] = b; total += edges[id].w; taken.push(id); return true; };
  if (force >= 0) join(force);
  for (const id of order) if (id !== skip) join(id);
  return { total: taken.length === n - 1 ? total : Infinity, taken };
}
const c1489: OracleCase<KIn> = {
  slug: '1489-find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree',
  gen: (r) => { const n = rint(r, 3, 6); return { n, edges: randConnected(r, n, 0, 9, 1, r() < 0.5 ? 2 : 6) }; },
  oracle: ({ n, edges }) => {
    const m = edges.length;
    const order = edges.map((_, i) => i).sort((a, b) => edges[a].w - edges[b].w || a - b);
    const verdict = edges.map(() => '?');
    const f = (x: number) => (x === Infinity ? '∞' : x);
    let base: number | string | null = null, edge: number | null = null, without: number | string | null = null, withE: number | string | null = null;
    let chosen: number[] = [];
    const out: State[] = [];
    const snap = () => out.push({ weight: base, edge, without, withE, verdict: [...verdict], chosen: [...chosen].sort((a, b) => a - b) });
    snap();
    // baseline Kruskal, one event per edge in weight order until n-1 taken
    const p = Array.from({ length: n }, (_, i) => i);
    let total = 0, used = 0;
    for (const id of order) {
      edge = id;
      const a = findHalving(p, edges[id].u), b = findHalving(p, edges[id].v);
      if (a !== b) { p[a] = b; total += edges[id].w; used++; chosen.push(id); }
      base = total; snap();
      if (used === n - 1) break;
    }
    const W = total;
    const crit: number[] = [], pseudo: number[] = [];
    for (let i = 0; i < m; i++) {
      edge = i; without = null; withE = null;
      const a = kruskalSet(n, edges, order, i, -1);
      without = f(a.total); chosen = a.taken; snap();
      if (a.total > W) { verdict[i] = 'critical'; crit.push(i); chosen = []; snap(); continue; }
      const b = kruskalSet(n, edges, order, -1, i);
      withE = f(b.total); chosen = b.taken;
      if (b.total === W) { verdict[i] = 'pseudo-critical'; pseudo.push(i); } else verdict[i] = 'in no MST';
      snap();
    }
    edge = null; without = null; withE = null; chosen = pseudo; snap();
    return out;
  },
  project: (s) => {
    const g = sceneOfKind(s, 'graph');
    return {
      weight: num(s, 'MST weight'), edge: shown(s, 'edge'), without: shown(s, 'without edge'), withE: shown(s, 'with edge'),
      verdict: auxItems(s, 'verdict').map((x) => x.replace(/^#\d+: /, '')),
      chosen: (g?.edges ?? []).flatMap((e, i) => (e.state === 'chosen' ? [i] : [])),
    };
  },
  notes: 'critical edges show chosen={} (banned edge red, rest dim); only the green (chosen) edge set is compared, not red/dim shades; node colours not compared',
};

/* ------------------------------------------------------------------ 684 Redundant Connection */
type EIn = { edges: { u: number; v: number }[] };
const c684: OracleCase<EIn> = {
  slug: '684-redundant-connection',
  gen: (r) => {
    const n = rint(r, 3, 9);
    // random tree on 1..n + one extra edge (no duplicates), shuffled, endpoints in random order
    const es: [number, number][] = []; const seen = new Set<string>();
    const key = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;
    for (let i = 2; i <= n; i++) { const p = rint(r, 1, i - 1); es.push([p, i]); seen.add(key(p, i)); }
    for (;;) { const a = rint(r, 1, n), b = rint(r, 1, n); if (a !== b && !seen.has(key(a, b))) { es.push([a, b]); break; } }
    return { edges: shuffle(r, es).map(([a, b]) => (r() < 0.5 ? { u: a, v: b } : { u: b, v: a })) };
  },
  oracle: ({ edges }) => {
    const n = edges.length;
    const p = Array.from({ length: n + 1 }, (_, i) => i);
    let edge: string | null = null, ra: number | null = null, rb: number | null = null, answer: string | null = null;
    const out: State[] = [];
    const snap = () => out.push({ parent: p.slice(1), edge, ru: ra, rv: rb, answer });
    snap();
    for (let i = 0; i < n; i++) {
      const { u, v } = edges[i];
      edge = `${u}-${v}`; ra = null; rb = null; snap();
      const a = findHalving(p, u), b = findHalving(p, v);
      ra = a; rb = b; snap();
      if (a === b) { answer = `[${u}, ${v}]`; snap(); break; }
      p[a] = b; snap();
    }
    edge = null; snap();
    return out;
  },
  project: (s) => ({ parent: parentsOf(s, 'parent[', 0), edge: shown(s, 'edge'), ru: num(s, 'root(u)'), rv: num(s, 'root(v)'), answer: shown(s, 'answer') }),
  notes: 'edge colours / node colours not compared',
};

/* ------------------------------------------------------------------ 547 Number of Provinces (DFS) */
type NIn = { n: number; edges: { u: number; v: number }[] };
const c547: OracleCase<NIn> = {
  slug: '547-number-of-provinces',
  gen: (r) => { const n = rint(r, 1, 9); const es = randEdges(r, n, 0, 14, 1, 1, r() * 0.7); return { n, edges: es.map((e) => ({ u: e.u, v: e.v })) }; },
  oracle: ({ n, edges }) => {
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (const e of edges) { adj[e.u].push(e.v); adj[e.v].push(e.u); }
    adj.forEach((l) => l.sort((a, b) => a - b)); // neighbours in ascending order (adjacency-matrix row order)
    const prov = new Array<number>(n).fill(-1), stack: number[] = [];
    let count = 0;
    const out: State[] = [];
    const snap = () => out.push({ provinces: count, visited: prov.map((p, i) => `${i}: ${p >= 0 ? 'P' + (p + 1) : '—'}`), stack: stack.map((u) => `dfs(${u})`) });
    snap();
    const dfs = (u: number) => {
      prov[u] = count - 1; stack.push(u); snap();
      for (const v of adj[u]) if (prov[v] < 0) dfs(v);
      stack.pop(); snap();
    };
    for (let i = 0; i < n; i++) if (prov[i] < 0) { count++; snap(); dfs(i); }
    snap();
    return out;
  },
  project: (s) => ({ provinces: num(s, 'provinces'), visited: auxItems(s, 'visited'), stack: auxItems(s, 'DFS call stack') }),
  notes: 'current-city highlight / edge colours not compared',
};

/* ------------------------------------------------------------------ 990 Equality equations */
type QIn = { eqs: { a: string; b: string; eq: boolean }[] };
const c990: OracleCase<QIn> = {
  slug: '990-satisfiability-of-equality-equations',
  gen: (r) => {
    const k = rint(r, 2, 6), m = rint(r, 1, 10);
    const L = 'abcdefgh'.slice(0, k);
    return { eqs: Array.from({ length: m }, () => { const a = rint(r, 0, k - 1); let b = rint(r, 0, k - 2); if (b >= a) b++; return { a: L[a], b: L[b], eq: r() < 0.6 }; }) };
  },
  oracle: ({ eqs }) => {
    const letters = [...new Set(eqs.flatMap((e) => [e.a, e.b]))].sort();
    const id = (c: string) => letters.indexOf(c);
    const parent = letters.map((_, i) => i);
    const marks = eqs.map(() => '');
    let equation: string | null = null, verdict: string | null = null;
    const txt = (e: QIn['eqs'][0]) => `${e.a}${e.eq ? '==' : '!='}${e.b}`;
    const out: State[] = [];
    let ra: string | null = null, rb: string | null = null;
    const snap = () => out.push({ parent: parent.map((p) => letters[p]), marks: [...marks], equation, ra, rb, verdict });
    snap();
    eqs.forEach((e, i) => {
      if (!e.eq) return;
      equation = txt(e);
      const x = findHalving(parent, id(e.a)), y = findHalving(parent, id(e.b));
      ra = letters[x]; rb = letters[y];
      if (x === y) marks[i] = 'S'; else { parent[x] = y; marks[i] = 'M'; }
      snap();
    });
    let bad = false;
    for (let i = 0; i < eqs.length && !bad; i++) {
      if (eqs[i].eq) continue;
      equation = txt(eqs[i]);
      const x = findHalving(parent, id(eqs[i].a)), y = findHalving(parent, id(eqs[i].b));
      ra = letters[x]; rb = letters[y];
      if (x === y) { bad = true; marks[i] = 'X'; verdict = 'false'; } else marks[i] = 'S';
      snap();
    }
    equation = null; if (!bad) verdict = 'true'; snap();
    return out;
  },
  project: (s) => ({
    parent: auxItems(s, 'parent[').map((x) => x.split('→')[1]),
    marks: auxItems(s, 'equations').map((x) => (x.endsWith('✓ merged') ? 'M' : x.endsWith('✗') ? 'X' : x.endsWith('✓') ? 'S' : '')),
    equation: shown(s, 'equation'), ra: shown(s, 'root(a)'), rb: shown(s, 'root(b)'), verdict: shown(s, 'verdict'),
  }),
};

/* ------------------------------------------------------------------ directed-graph generators */
/** Random directed edges (no self loops); `dups` allows repeated ordered pairs. */
function randDirected(r: R, n: number, lo: number, max: number, wlo: number, whi: number, density = 0.4, dups = false): E[] {
  const out: E[] = [];
  const seen = new Set<string>();
  const m = Math.min(max, Math.round(n * (n - 1) * density * (0.3 + r())));
  for (let t = 0; t < m * 3 && out.length < m; t++) {
    const a = rint(r, 0, n - 1), b = rint(r, 0, n - 1);
    if (a === b) continue;
    const k = `${a}>${b}`;
    if (!dups && seen.has(k)) continue;
    seen.add(k);
    out.push({ u: a + lo, v: b + lo, w: rint(r, wlo, whi) });
  }
  return out;
}
/** Random DAG edges (u < v after a random relabelling), no repeats. */
function randDag(r: R, n: number, max: number): E[] {
  const perm = shuffle(r, Array.from({ length: n }, (_, i) => i));
  const out: E[] = []; const seen = new Set<string>();
  const m = Math.min(max, Math.round((n * (n - 1)) / 2 * r() * 0.8));
  for (let t = 0; t < m * 3 && out.length < m; t++) {
    const a = rint(r, 0, n - 2), b = rint(r, a + 1, n - 1);
    const k = `${a}>${b}`; if (seen.has(k)) continue; seen.add(k);
    out.push({ u: perm[a], v: perm[b], w: 0 });
  }
  return shuffle(r, out);
}
const dd = (x: number) => (x === Infinity ? '∞' : String(x));
const letterTags = (s: Step, re: RegExp): (number | null)[] => (sceneOfKind(s, 'graph')?.nodes ?? []).map((n) => { const m = n.tag ? re.exec(n.tag) : null; return m ? Number(m[1]) : null; });

/* ------------------------------------------------------------------ 207 Course Schedule (DFS colours) */
type DIn = { n: number; edges: { u: number; v: number }[] };
const gDirIn = (r: R, n: number, dag: boolean): DIn => {
  const es = dag ? randDag(r, n, 14) : randDirected(r, n, 0, 14, 0, 0, 0.3, false);
  return { n, edges: es.map((e) => ({ u: e.u, v: e.v })) };
};
const c207: OracleCase<DIn> = {
  slug: '207-course-schedule',
  gen: (r) => gDirIn(r, rint(r, 1, 8), r() < 0.5),
  oracle: ({ n, edges }) => {
    const adj: number[][] = Array.from({ length: n }, () => []);
    edges.forEach((e) => adj[e.u].push(e.v)); // input order, like adj.get(p[1]).add(p[0])
    const color = new Array<number>(n).fill(0), stack: number[] = [];
    let cycle: number[] = [], result: string | null = null;
    const out: State[] = [];
    const snap = () => out.push({ color: [...color], stack: stack.map((u) => `dfs(${u})`), cycle: [...cycle], ok: result });
    snap();
    let cyc = false;
    const dfs = (u: number): boolean => {
      color[u] = 1; stack.push(u); snap();
      for (const v of adj[u]) {
        if (color[v] === 1) { cycle = stack.slice(stack.indexOf(v)).sort((a, b) => a - b); cyc = true; snap(); return true; }
        if (color[v] === 0 && dfs(v)) return true;
      }
      color[u] = 2; stack.pop(); snap();
      return false;
    };
    for (let i = 0; i < n && !cyc; i++) if (color[i] === 0) dfs(i);
    result = String(!cyc); snap();
    return out;
  },
  project: (s) => ({
    color: (sceneOfKind(s, 'graph')?.nodes ?? []).map((nd) => (nd.tag === 'on stack' ? 1 : nd.tag === 'done' ? 2 : 0)),
    stack: auxItems(s, 'recursion stack'),
    cycle: (sceneOfKind(s, 'graph')?.nodes ?? []).flatMap((nd) => (nd.state === 'error' ? [nd.id] : [])),
    ok: shown(s, 'can finish'),
  }),
  notes: 'edge colours not compared; colour read from the node tags (on stack / done)',
};

/* ------------------------------------------------------------------ 210 Course Schedule II (Kahn) */
const c210: OracleCase<DIn> = {
  slug: '210-course-schedule-ii',
  gen: (r) => gDirIn(r, rint(r, 1, 8), r() < 0.6),
  oracle: ({ n, edges }) => {
    const adj: number[][] = Array.from({ length: n }, () => []);
    const indeg = new Array<number>(n).fill(0);
    edges.forEach((e) => { adj[e.u].push(e.v); indeg[e.v]++; });
    const queue: number[] = [], order: number[] = [], taken = new Array<boolean>(n).fill(false);
    let bad: number[] = [];
    const out: State[] = [];
    const snap = () => out.push({ indeg: indeg.map((d, i) => (taken[i] ? null : d)), queue: queue.map(String), order: order.map(String), bad: [...bad] });
    snap();
    for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);
    snap();
    while (queue.length) {
      const u = queue.shift()!;
      order.push(u); snap();
      taken[u] = true;
      for (const v of adj[u]) { indeg[v]--; if (indeg[v] === 0) queue.push(v); snap(); }
    }
    if (order.length !== n) bad = Array.from({ length: n }, (_, i) => i).filter((i) => !order.includes(i));
    snap();
    return out;
  },
  project: (s) => ({
    indeg: letterTags(s, /^in=(\d+)$/), queue: auxItems(s, 'queue'), order: auxItems(s, 'order so far'),
    bad: (sceneOfKind(s, 'graph')?.nodes ?? []).flatMap((nd) => (nd.state === 'error' ? [nd.id] : [])),
  }),
  notes: 'edge colours not compared; a taken node drops its in= tag one step after it is dequeued (it is still shown as in=0 while being taken)',
};

/* ------------------------------------------------------------------ 269 Alien Dictionary */
type AIn = { words: string[] };
const c269: OracleCase<AIn> = {
  slug: '269-alien-dictionary',
  gen: (r) => {
    const alpha = 'abcdefghi'.slice(0, rint(r, 2, 6));
    const nw = rint(r, 1, 7);
    const mk = () => Array.from({ length: rint(r, 1, 5) }, () => alpha[rint(r, 0, alpha.length - 1)]).join('');
    let words = Array.from({ length: nw }, mk);
    if (r() < 0.6) { // sorted by a random alien order => mostly valid input
      const perm = shuffle(r, alpha.split(''));
      const rank = (c: string) => perm.indexOf(c);
      words.sort((a, b) => { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return rank(a[i]) - rank(b[i]); return a.length - b.length; });
      if (r() < 0.15) words = shuffle(r, words);
    }
    return { words };
  },
  oracle: ({ words }) => {
    const letters: string[] = [];
    for (const w of words) for (const c of w) if (!letters.includes(c)) letters.push(c);
    const n = letters.length, id = (c: string) => letters.indexOf(c);
    const adj: number[][] = Array.from({ length: n }, () => []); // discovery order of edges
    const indeg = new Array<number>(n).fill(0), edgeList: string[] = [];
    const queue: number[] = [], order: number[] = [], taken = new Array<boolean>(n).fill(false);
    let kahn = false, bad: number[] = [];
    const out: State[] = [];
    const snap = () => out.push({
      indeg: indeg.map((d, i) => (taken[i] ? null : d)), edges: [...edgeList],
      queue: kahn ? queue.map((q) => letters[q]) : [], order: kahn ? order.map((q) => letters[q]) : [], bad: bad.map((q) => letters[q]),
    });
    snap();
    for (let p = 0; p + 1 < words.length; p++) {
      const a = words[p], b = words[p + 1];
      if (a.length > b.length && a.startsWith(b)) { snap(); return out; }
      for (let j = 0; j < Math.min(a.length, b.length); j++) {
        if (a[j] !== b[j]) {
          const u = id(a[j]), v = id(b[j]);
          if (!adj[u].includes(v)) { adj[u].push(v); indeg[v]++; edgeList.push(`${a[j]}>${b[j]}`); snap(); }
          break;
        }
      }
    }
    kahn = true;
    for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);
    snap();
    while (queue.length) {
      const u = queue.shift()!;
      order.push(u); snap();
      taken[u] = true;
      for (const v of adj[u]) { indeg[v]--; if (indeg[v] === 0) queue.push(v); snap(); }
    }
    if (order.length !== n) bad = Array.from({ length: n }, (_, i) => i).filter((i) => !order.includes(i));
    snap();
    return out;
  },
  project: (s) => {
    const g = sceneOfKind(s, 'graph');
    const label = (i: number) => String(g!.nodes[i].label);
    return {
      indeg: letterTags(s, /^in=(\d+)$/), edges: (g?.edges ?? []).map((e) => `${label(e.from)}>${label(e.to)}`),
      queue: auxItems(s, 'queue'), order: auxItems(s, 'alphabet so far'),
      bad: (g?.nodes ?? []).flatMap((nd) => (nd.state === 'error' ? [String(nd.label)] : [])),
    };
  },
  notes: 'edge colours not compared. Letters are numbered by first appearance and edges released in the order they were discovered (the Java uses LinkedHashMap + HashSet whose neighbour order is unspecified) — any topological order is valid',
};

/* ------------------------------------------------------------------ 310 Minimum Height Trees (leaf peeling) */
const c310: OracleCase<{ n: number; edges: { u: number; v: number }[] }> = {
  slug: '310-minimum-height-trees',
  gen: (r) => {
    const n = rint(r, 1, 10);
    const perm = shuffle(r, Array.from({ length: n }, (_, i) => i));
    const es: { u: number; v: number }[] = [];
    for (let i = 1; i < n; i++) { const p = rint(r, r() < 0.5 ? 0 : Math.max(0, i - 2), i - 1); es.push(r() < 0.5 ? { u: perm[p], v: perm[i] } : { u: perm[i], v: perm[p] }); }
    return { n, edges: shuffle(r, es) };
  },
  oracle: ({ n, edges }) => {
    const adj: number[][] = Array.from({ length: n }, () => []);
    edges.forEach((e) => { adj[e.u].push(e.v); adj[e.v].push(e.u); });
    const deg = adj.map((l) => l.length), removedAt = new Array<number>(n).fill(0);
    let remaining = n, layer = 0, leaves: number[] = [], next: number[] = [];
    const out: State[] = [];
    const snap = () => out.push({ tag: deg.map((d, i) => (removedAt[i] > 0 ? `peeled ${removedAt[i]}` : `deg=${d}`)), leaves: leaves.map(String), next: next.map(String), layer, remaining });
    snap();
    if (n <= 2) { snap(); return out; }
    for (let i = 0; i < n; i++) if (deg[i] === 1) leaves.push(i);
    snap();
    while (remaining > 2) {
      layer++; snap();
      next = [];
      for (const leaf of leaves) {
        removedAt[leaf] = layer; remaining--;
        for (const p of adj[leaf]) {
          if (removedAt[p] > 0) continue;
          deg[p]--;
          if (deg[p] === 1) next.push(p);
          snap();
        }
      }
      leaves = next; next = [];
    }
    snap();
    return out;
  },
  project: (s) => ({
    tag: (sceneOfKind(s, 'graph')?.nodes ?? []).map((nd) => nd.tag ?? null),
    leaves: s.aux?.[0]?.items ?? [],
    next: auxItems(s, 'next leaves'), layer: num(s, 'layer'), remaining: num(s, 'remaining'),
  }),
  notes: 'node/edge colours not compared; leaves of the last layer are shown in the "next leaves" queue until the Done step',
};

/* ------------------------------------------------------------------ 743 Network Delay Time (Dijkstra, lazy PQ) */
type NDIn = { n: number; k: number; edges: E[] };
const c743: OracleCase<NDIn> = {
  slug: '743-network-delay-time',
  gen: (r) => { const n = rint(r, 2, 8); return { n, k: rint(r, 1, n), edges: randDirected(r, n, 1, 14, 0, r() < 0.4 ? 2 : 9, 0.2 + r() * 0.5, r() < 0.3) }; },
  oracle: ({ n, k, edges }) => {
    const dist = new Array<number>(n + 1).fill(Infinity);
    const pq: [number, number][] = [];
    let cur: number | null = null, best: number | null = null;
    const out: State[] = [];
    const snap = () => out.push({
      pq: pq.map(([d, v]) => `(${d}, ${v})${d > dist[v] ? ' stale' : ''}`), dist: dist.slice(1).map((d, i) => `${i + 1}: ${dd(d)}`), node: cur, answer: best,
    });
    snap();
    dist[k] = 0; pq.push([0, k]); snap();
    while (pq.length) {
      pq.sort((a, b) => a[0] - b[0] || a[1] - b[1]); // tie rule of the animation: smaller distance, then smaller node id
      const [d, u] = pq.shift()!;
      if (d > dist[u]) { cur = null; snap(); continue; }
      cur = u; snap();
      for (const e of edges) {
        if (e.u !== u) continue;
        const nd = d + e.w;
        if (nd < dist[e.v]) { dist[e.v] = nd; pq.push([nd, e.v]); pq.sort((a, b) => a[0] - b[0] || a[1] - b[1]); snap(); }
      }
      cur = null;
    }
    cur = null;
    const un = dist.slice(1).some((x) => x === Infinity);
    best = un ? -1 : Math.max(...dist.slice(1));
    snap();
    return out;
  },
  project: (s) => ({ pq: auxItems(s, 'priority queue'), dist: auxItems(s, 'dist['), node: shown(s, 'node'), answer: num(s, 'answer') }),
  notes: 'edge/node colours not compared; PQ ties broken by (distance, node) — the Java PriorityQueue leaves ties unspecified',
};

/* ------------------------------------------------------------------ 785 Is Graph Bipartite (BFS) */
type GIn2 = { n: number; edges: { u: number; v: number }[] };
const gUndirIn = (r: R, n: number, lo: number, max: number): GIn2 => ({ n, edges: randEdges(r, n, lo, max, 1, 1, 0.15 + r() * 0.7).map((e) => ({ u: e.u, v: e.v })) });
/** adjacency with neighbours ascending (what the animation draws; LeetCode's graph[u] lists are ascending too) */
function adjAsc(n: number, lo: number, edges: { u: number; v: number }[]): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  edges.forEach((e) => { adj[e.u - lo].push(e.v); adj[e.v - lo].push(e.u); });
  adj.forEach((l) => l.sort((a, b) => a - b));
  return adj;
}
const c785: OracleCase<GIn2> = {
  slug: '785-is-graph-bipartite',
  gen: (r) => gUndirIn(r, rint(r, 1, 9), 0, 14),
  oracle: ({ n, edges }) => {
    const adj = adjAsc(n, 0, edges);
    const color = new Array<number>(n).fill(0), queue: number[] = [];
    let verdict: string | null = null;
    const out: State[] = [];
    const snap = () => out.push({ queue: queue.map(String), colour: color.map((c, i) => `${i}: ${c === 1 ? 'A' : c === -1 ? 'B' : '·'}`), verdict });
    snap();
    for (let s0 = 0; s0 < n; s0++) {
      if (color[s0] !== 0) continue;
      color[s0] = 1; queue.push(s0); snap();
      while (queue.length) {
        const u = queue.shift()!; snap();
        for (const v of adj[u]) {
          if (color[v] === 0) { color[v] = -color[u]; queue.push(v); snap(); }
          else if (color[v] === color[u]) { verdict = 'false'; snap(); return out; }
        }
      }
    }
    verdict = 'true'; snap();
    return out;
  },
  project: (s) => ({ queue: auxItems(s, 'BFS queue'), colour: auxItems(s, 'colour['), verdict: shown(s, 'bipartite') }),
  notes: 'node/edge colours not compared; neighbours visited in ascending order',
};

/* ------------------------------------------------------------------ 886 Possible Bipartition (DFS) */
const c886: OracleCase<GIn2> = {
  slug: '886-possible-bipartition',
  gen: (r) => gUndirIn(r, rint(r, 1, 9), 1, 14),
  oracle: ({ n, edges }) => {
    const adj = adjAsc(n, 1, edges);
    const group = new Array<number>(n + 1).fill(0), calls: string[] = [];
    let verdict: string | null = null;
    const out: State[] = [];
    const snap = () => out.push({ calls: [...calls], group: group.slice(1).map((g, i) => `${i + 1}: ${g || '·'}`), verdict });
    snap();
    const assign = (p: number, g: number): boolean => {
      group[p] = g; calls.push(`assign(${p}, ${g})`); snap();
      for (const q of adj[p - 1]) {
        if (group[q] === g) { verdict = 'false'; snap(); return false; }
        if (group[q] === 0) { if (!assign(q, 3 - g)) return false; snap(); } // "Back at p" shows the popped stack
      }
      calls.pop(); // the pop itself is not a step: it shows in the next step ("Back at", "new cluster" or Done)
      return true;
    };
    for (let p = 1; p <= n; p++) {
      if (group[p] !== 0) continue;
      if (p > 1) snap(); // "Person p is not placed yet"
      if (!assign(p, 1)) return out;
    }
    verdict = 'true'; snap();
    return out;
  },
  project: (s) => ({ calls: auxItems(s, 'recursion stack'), group: auxItems(s, 'group['), verdict: shown(s, 'possible') }),
  notes: 'node/edge colours not compared; neighbours in ascending order; on a conflict the recursion stack is left as it was (no unwinding is shown)',
};

/* ------------------------------------------------------------------ 787 Cheapest Flights Within K Stops */
type FIn = { n: number; src: number; dst: number; k: number; edges: E[] };
const c787: OracleCase<FIn> = {
  slug: '787-cheapest-flights-within-k-stops',
  gen: (r) => {
    const n = rint(r, 2, 7); const src = rint(r, 0, n - 1); let dst = rint(r, 0, n - 2); if (dst >= src) dst++;
    return { n, src, dst, k: rint(r, 0, 4), edges: randDirected(r, n, 0, 12, 1, 9, 0.2 + r() * 0.5, r() < 0.3) };
  },
  oracle: ({ n, src, dst, k, edges }) => {
    const dist = new Array<number>(n).fill(Infinity); dist[src] = 0;
    let prev = [...dist], round = 0, table: string[] = [], answer: number | null = null;
    const out: State[] = [];
    const snap = () => out.push({ dist: dist.map((d, i) => `${i}: ${dd(d)}`), prev: prev.map((d, i) => `${i}: ${dd(d)}`), round, table: [...table], answer });
    snap();
    for (round = 1; round <= k + 1; round++) {
      prev = [...dist]; table = []; snap();
      for (const e of edges) {
        if (prev[e.u] === Infinity) continue;
        const cand = prev[e.u] + e.w;
        if (cand < dist[e.v]) { const old = dist[e.v]; dist[e.v] = cand; table.push(`${e.u}→${e.v} · ${e.w} · ${prev[e.u]}+${e.w}=${cand} · ${dd(old)} · ✓ update`); }
        else table.push(`${e.u}→${e.v} · ${e.w} · ${prev[e.u]}+${e.w}=${cand} · ${dd(dist[e.v])} · – no change`);
        snap();
      }
      snap();
    }
    round = k + 1;
    answer = dist[dst] === Infinity ? -1 : dist[dst];
    snap();
    return out;
  },
  project: (s) => ({ dist: auxItems(s, 'dist[ ]'), prev: auxItems(s, 'prev['), round: num(s, 'round'), table: auxItems(s, 'Edge relaxation'), answer: num(s, 'answer') }),
  notes: 'node/edge colours and path highlighting not compared',
};

/* ------------------------------------------------------------------ 1514 Path With Maximum Probability (max-heap Dijkstra) */
const fmtP = (x: number) => String(Number(x.toFixed(4)));
type PrIn = { n: number; start: number; end: number; edges: { u: number; v: number; p: number }[] };
const c1514: OracleCase<PrIn> = {
  slug: '1514-path-with-maximum-probability',
  gen: (r) => {
    const n = rint(r, 2, 8); const start = rint(r, 0, n - 1); let end = rint(r, 0, n - 2); if (end >= start) end++;
    const es = randEdges(r, n, 0, 12, 1, 1, 0.2 + r() * 0.6);
    return { n, start, end, edges: es.map((e) => ({ u: e.u, v: e.v, p: r() < 0.3 ? rint(r, 1, 4) / 4 : rint(r, 1, 100) / 100 })) };
  },
  oracle: ({ n, start, end, edges }) => {
    const prob = new Array<number>(n).fill(0);
    const heap: [number, number][] = [];
    let cur: number | null = null, best: string | null = null;
    const out: State[] = [];
    const snap = () => out.push({ heap: heap.map(([p, v]) => `(${fmtP(p)}, ${v})${p < prob[v] ? ' stale' : ''}`), prob: prob.map((p, i) => `${i}: ${fmtP(p)}`), node: cur, answer: best });
    const sortH = () => heap.sort((a, b) => b[0] - a[0] || a[1] - b[1]); // best probability first, then smaller node (Java tie order unspecified)
    snap();
    prob[start] = 1; heap.push([1, start]); snap();
    let reached = false;
    while (heap.length) {
      sortH();
      const [p, u] = heap.shift()!;
      if (p < prob[u]) { cur = null; snap(); continue; }
      cur = u; snap();
      if (u === end) { reached = true; break; }
      for (const e of edges) {
        if (e.u !== u && e.v !== u) continue;
        const v = e.u === u ? e.v : e.u;
        const np = p * e.p;
        if (np > prob[v]) { prob[v] = np; heap.push([np, v]); sortH(); snap(); }
      }
      cur = null;
    }
    cur = null;
    best = (reached ? prob[end] : 0).toFixed(5);
    snap();
    return out;
  },
  project: (s) => ({ heap: auxItems(s, 'max-heap'), prob: auxItems(s, 'best probability'), node: shown(s, 'node'), answer: shown(s, 'answer') }),
  notes: 'node/edge colours and the highlighted route not compared; ties in the max-heap broken by smaller node; probabilities compared as displayed (4 decimals)',
};

/* ------------------------------------------------------------------ 1631 Path With Minimum Effort */
const c1631: OracleCase<{ grid: number[][] }> = {
  slug: '1631-path-with-minimum-effort',
  gen: (r) => {
    let R = rint(r, 1, 4), C = rint(r, 1, 5); if (R * C < 2) C = 2;
    const hi = r() < 0.4 ? 3 : 30;
    return { grid: Array.from({ length: R }, () => Array.from({ length: C }, () => rint(r, 0, hi))) };
  },
  oracle: ({ grid }) => {
    const R = grid.length, C = grid[0].length, INF = Infinity;
    const effort = grid.map((row) => row.map(() => INF));
    const heap: [number, number, number][] = [];
    let cur: string | null = null, answer: number | null = null;
    const out: State[] = [];
    const snap = () => out.push({
      heap: heap.map(([e, r, c]) => `(${e}, ${r}, ${c})${e > effort[r][c] ? ' stale' : ''}`),
      effort: effort.flat().map((x) => (x === INF ? '∞' : String(x))), cell: cur, answer,
    });
    const sortH = () => heap.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    snap();
    effort[0][0] = 0; heap.push([0, 0, 0]); snap();
    let reached = false;
    while (heap.length) {
      sortH();
      const [e, r, c] = heap.shift()!;
      if (e > effort[r][c]) { cur = null; snap(); continue; }
      cur = `(${r}, ${c})`; snap();
      if (r === R - 1 && c === C - 1) { reached = true; break; }
      for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) { // up, right, down, left
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;
        const ne = Math.max(e, Math.abs(grid[nr][nc] - grid[r][c]));
        if (ne < effort[nr][nc]) { effort[nr][nc] = ne; heap.push([ne, nr, nc]); sortH(); snap(); }
      }
    }
    void reached;
    cur = null; answer = effort[R - 1][C - 1]; snap();
    return out;
  },
  project: (s) => {
    const grids = scenesOf(s).filter((x) => x.kind === 'grid') as { rows: { value: string | number }[][] }[];
    return { heap: auxItems(s, 'min-heap'), effort: (grids[1]?.rows ?? []).flat().map((c) => String(c.value)), cell: shown(s, 'cell'), answer: num(s, 'answer') };
  },
  notes: 'cell colours / route highlighting not compared; heap ties broken by (effort,row,col); directions up,right,down,left',
};

/* ------------------------------------------------------------------ 1334 Find the City (Floyd–Warshall + count) */
type TIn = { n: number; threshold: number; edges: E[] };
const c1334: OracleCase<TIn> = {
  slug: '1334-find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance',
  gen: (r) => { const n = rint(r, 2, 6); return { n, threshold: rint(r, 1, 12), edges: randEdges(r, n, 0, 10, 1, r() < 0.4 ? 3 : 9, r() * 0.9) }; },
  oracle: ({ n, threshold, edges }) => {
    const INF = Infinity;
    const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : INF)));
    edges.forEach((e) => { d[e.u][e.v] = e.w; d[e.v][e.u] = e.w; });
    let k: number | null = null, city: number | null = null, best: number | null = null, fewest: number | null = null;
    const counts: (number | null)[] = new Array(n).fill(null);
    const out: State[] = [];
    const snap = () => out.push({ mat: d.flat().map((x) => dd(x)), k, city, best, fewest, near: counts.map((c) => (c === null ? null : `${c} near`)) });
    snap();
    for (let kk = 0; kk < n; kk++) {
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (d[i][kk] + d[kk][j] < d[i][j]) d[i][j] = d[i][kk] + d[kk][j];
      k = kk; snap();
    }
    k = null; snap();
    let fewestN = n + 1;
    for (let i = 0; i < n; i++) {
      city = i;
      let c = 0;
      for (let j = 0; j < n; j++) if (i !== j && d[i][j] <= threshold) c++;
      counts[i] = c;
      if (c <= fewestN) { fewestN = c; best = i; fewest = c; } // ties go to the later city
      snap();
    }
    city = null; snap();
    return out;
  },
  project: (s) => {
    const grid = scenesOf(s).find((x) => x.kind === 'grid') as { rows: { value: string | number }[][] } | undefined;
    const g = scenesOf(s).find((x) => x.kind === 'graph');
    return {
      mat: (grid?.rows ?? []).flat().map((c) => String(c.value)), k: num(s, 'k'), city: num(s, 'city'), best: num(s, 'best city'), fewest: num(s, 'fewest'),
      near: ((g as { nodes: { tag?: string }[] } | undefined)?.nodes ?? []).map((nd) => nd.tag ?? null),
    };
  },
  notes: 'cell colours (changed cells, row highlighting) not compared',
};

/* ------------------------------------------------------------------ 1192 bridges / articulation points (Tarjan low-link) */
const nodeTags = (s: Step): (string | null)[] => (sceneOfKind(s, 'graph')?.nodes ?? []).map((nd) => nd.tag ?? null);
const genConnectedUndir = (r: R): GIn2 => { const n = rint(r, 2, 9); return { n, edges: randConnected(r, n, 0, 14).map((e) => ({ u: e.u, v: e.v })) }; };
const c1192: OracleCase<GIn2> = {
  slug: '1192-critical-connections-in-a-network',
  gen: genConnectedUndir,
  oracle: ({ n, edges }) => {
    const adj = adjAsc(n, 0, edges);
    const disc = new Array<number>(n).fill(-1), low = new Array<number>(n).fill(0);
    const stack: string[] = [], bridges: string[] = [];
    let timer = 0;
    const out: State[] = [];
    const snap = () => out.push({ tag: disc.map((d, i) => (d < 0 ? '–' : `${d}/${low[i]}`)), stack: [...stack], bridges: [...bridges] });
    snap();
    const dfs = (u: number, parent: number) => {
      disc[u] = low[u] = timer++; stack.push(`(${u}, ${parent === -1 ? 'none' : parent})`); snap();
      for (const v of adj[u]) {
        if (v === parent) continue;
        if (disc[v] === -1) {
          dfs(v, u);
          low[u] = Math.min(low[u], low[v]);
          snap();
          if (low[v] > disc[u]) { bridges.push(`${u}–${v}`); snap(); }
        } else { low[u] = Math.min(low[u], disc[v]); snap(); }
      }
      stack.pop(); // revealed by the next step
    };
    dfs(0, -1);
    snap();
    return out;
  },
  project: (s) => ({ tag: nodeTags(s), stack: auxItems(s, 'DFS call stack'), bridges: auxItems(s, 'bridges found') }),
  notes: 'node/edge colours not compared; neighbours in ascending order (the parent edge is skipped by node id, graphs have no parallel edges)',
};
const cArt: OracleCase<GIn2> = {
  slug: 'alg-articulation-points-cut-vertices',
  gen: (r) => gUndirIn(r, rint(r, 2, 9), 0, 14),
  oracle: ({ n, edges }) => {
    const adj = adjAsc(n, 0, edges);
    const disc = new Array<number>(n).fill(-1), low = new Array<number>(n).fill(0), cut = new Array<boolean>(n).fill(false);
    const stack: string[] = [];
    let timer = 0;
    const out: State[] = [];
    const snap = () => out.push({ tag: disc.map((d, i) => (d < 0 ? '–' : `${d}/${low[i]}`)), stack: [...stack], cuts: cut.flatMap((c, i) => (c ? [String(i)] : [])) });
    snap();
    const dfs = (u: number, parent: number) => {
      disc[u] = low[u] = timer++; stack.push(`(${u}, ${parent === -1 ? 'none' : parent})`); snap();
      let kids = 0;
      for (const v of adj[u]) {
        if (v === parent) continue;
        if (disc[v] === -1) {
          kids++;
          dfs(v, u);
          low[u] = Math.min(low[u], low[v]);
          if (parent !== -1 && low[v] >= disc[u]) cut[u] = true;
          snap();
        } else { low[u] = Math.min(low[u], disc[v]); snap(); }
      }
      if (parent === -1) { if (kids >= 2) cut[u] = true; snap(); }
      stack.pop();
    };
    for (let s0 = 0; s0 < n; s0++) {
      if (disc[s0] !== -1) continue;
      if (s0 > 0) snap(); // "new component" step shows the popped stack
      dfs(s0, -1);
    }
    snap();
    return out;
  },
  project: (s) => ({ tag: nodeTags(s), stack: auxItems(s, 'DFS call stack'), cuts: auxItems(s, 'articulation points') }),
  notes: 'node/edge colours not compared; children[node] var not projected (root rule is checked through the cut list)',
};

/* ------------------------------------------------------------------ SCC (Tarjan) */
const cScc: OracleCase<GIn2> = {
  slug: 'cp-strongly-connected-components-tarjan',
  gen: (r) => { const n = rint(r, 2, 8); return { n, edges: randDirected(r, n, 0, 14, 0, 0, 0.15 + r() * 0.35).map((e) => ({ u: e.u, v: e.v })) }; },
  oracle: ({ n, edges }) => {
    const adj: number[][] = Array.from({ length: n }, () => []);
    edges.forEach((e) => adj[e.u].push(e.v));
    adj.forEach((l) => l.sort((a, b) => a - b));
    const disc = new Array<number>(n).fill(-1), low = new Array<number>(n).fill(0), onStack = new Array<boolean>(n).fill(false), comp = new Array<number>(n).fill(-1);
    const stack: number[] = [], calls: string[] = [], sccs: number[][] = [];
    let timer = 0;
    const out: State[] = [];
    const snap = () => out.push({
      tag: disc.map((d, i) => (comp[i] >= 0 ? `SCC ${comp[i] + 1}` : d < 0 ? '–' : `${d}/${low[i]}`)),
      stack: stack.map(String), calls: [...calls], comps: sccs.map((c, i) => `${i + 1}: {${[...c].sort((a, b) => a - b).join(', ')}}`),
    });
    snap();
    const dfs = (u: number) => {
      disc[u] = low[u] = timer++; stack.push(u); onStack[u] = true; calls.push(String(u)); snap();
      for (const v of adj[u]) {
        if (disc[v] === -1) { dfs(v); low[u] = Math.min(low[u], low[v]); snap(); }
        else if (onStack[v]) { low[u] = Math.min(low[u], disc[v]); snap(); }
      }
      if (low[u] === disc[u]) {
        const members: number[] = []; let w: number;
        do { w = stack.pop()!; onStack[w] = false; comp[w] = sccs.length; members.push(w); } while (w !== u);
        sccs.push(members); snap();
      }
      calls.pop(); // shown by the next step
    };
    for (let s0 = 0; s0 < n; s0++) {
      if (disc[s0] !== -1) continue;
      if (s0 > 0) snap();
      dfs(s0);
    }
    snap();
    return out;
  },
  project: (s) => ({ tag: nodeTags(s), stack: auxItems(s, 'Tarjan stack'), calls: auxItems(s, 'DFS call stack'), comps: auxItems(s, 'components found') }),
  notes: 'node/edge colours not compared; successors visited in ascending order; the DFS call stack pops lag one step (revealed by the next step) as in the animation',
};

/* ------------------------------------------------------------------ Bellman-Ford with negative edges */
/** Distinct ordered-pair directed edges with weights in [wlo, whi]. */
const genBF = (r: R, n: number, max: number, wlo: number, whi: number): E[] => randDirected(r, n, 0, max, wlo, whi, 0.15 + r() * 0.5, false);
type BIn = { n: number; src: number; edges: E[] };
const cBF: OracleCase<BIn> = {
  slug: 'alg-bellman-ford-shortest-paths-negative-edges',
  gen: (r) => { const n = rint(r, 2, 8); return { n, src: rint(r, 0, n - 1), edges: genBF(r, n, 12, r() < 0.5 ? 0 : -4, 9) }; },
  oracle: ({ n, src, edges }) => {
    const dist = new Array<number>(n).fill(Infinity); dist[src] = 0;
    let round = 0, changes = 0, table: string[] = [];
    const out: State[] = [];
    const snap = () => out.push({ dist: dist.map((d, i) => `${i}: ${dd(d)}`), table: [...table], round, changes });
    snap();
    let settled = false;
    for (round = 1; round <= n - 1; round++) {
      changes = 0; table = []; snap();
      for (const e of edges) {
        if (dist[e.u] === Infinity) { table.push(`${e.u}→${e.v} · ${e.w} · ∞ · ${dd(dist[e.v])} · – skip (source unreached)`); snap(); continue; }
        const nd = dist[e.u] + e.w;
        if (nd < dist[e.v]) { table.push(`${e.u}→${e.v} · ${e.w} · ${dist[e.u]}+(${e.w})=${nd} · ${dd(dist[e.v])} · ✓ update`); dist[e.v] = nd; changes++; }
        else table.push(`${e.u}→${e.v} · ${e.w} · ${dist[e.u]}+(${e.w})=${nd} · ${dd(dist[e.v])} · – no change`);
        snap();
      }
      if (changes === 0) { settled = true; snap(); break; }
    }
    if (!settled) {
      round = n; changes = 0; table = []; snap();
      for (const e of edges) {
        if (dist[e.u] !== Infinity && dist[e.u] + e.w < dist[e.v]) { table.push(`${e.u}→${e.v} · ${e.w} · ${dist[e.u]}+(${e.w})=${dist[e.u] + e.w} · ${dd(dist[e.v])} · ✗ still improves`); snap(); break; }
        table.push(`${e.u}→${e.v} · ${e.w} · ${dist[e.u] === Infinity ? '∞' : `${dist[e.u]}+(${e.w})=${dist[e.u] + e.w}`} · ${dd(dist[e.v])} · – holds`); snap();
      }
    }
    snap();
    return out;
  },
  project: (s) => ({ dist: auxItems(s, 'dist['), table: auxItems(s, 'Edge relaxation'), round: num(s, 'round'), changes: num(s, 'updates this round') }),
  notes: 'node/edge colours not compared; edges relaxed in input order, in place, early stop when a round changes nothing; the final check round (n) is included',
};

/* ------------------------------------------------------------------ negative cycle (arbitrage) */
const cNegCycle: OracleCase<BIn> = {
  slug: 'cp-negative-cycle-detection-currency-arbitrage',
  gen: (r) => { const n = rint(r, 2, 8); return { n, src: 0, edges: genBF(r, n, 12, r() < 0.3 ? 0 : -5, 6) }; },
  oracle: ({ n, edges }) => {
    const dist = new Array<number>(n).fill(0), parent = new Array<number>(n).fill(-1);
    let round = 0, last = -1, table: string[] = [], walker: number | null = null, cycle: number[] = [], end = false;
    const out: State[] = [];
    const snap = () => out.push({
      dist: dist.map((d, i) => `${i}: ${d}`), parent: parent.map((p, i) => `${i}: ${p < 0 ? '—' : p}`), table: end ? [] : [...table], round, last: last < 0 ? null : last,
      walker, cycle: [...cycle].sort((a, b) => a - b),
    });
    snap();
    let hasCycle = false;
    for (round = 1; round <= n; round++) {
      last = -1; table = []; snap();
      let changes = 0;
      for (const e of edges) {
        const nd = dist[e.u] + e.w;
        if (nd < dist[e.v]) { table.push(`${e.u}→${e.v} · ${e.w} · ${dist[e.u]}+(${e.w})=${nd} · ${dist[e.v]} · ✓ update`); dist[e.v] = nd; parent[e.v] = e.u; changes++; last = e.v; }
        else table.push(`${e.u}→${e.v} · ${e.w} · ${dist[e.u]}+(${e.w})=${nd} · ${dist[e.v]} · – no change`);
        snap();
      }
      if (changes === 0) { snap(); break; }
      if (round === n) { hasCycle = true; round = n; break; } // (textbook: round n is the last one executed)
    }
    if (hasCycle) {
      snap(); // "a cycle exists"
      let x = last;
      for (let i = 0; i < n; i++) { walker = x; snap(); x = parent[x]; }
      walker = null;
      const cyc = [x];
      for (let y = parent[x]; y !== x; y = parent[y]) cyc.push(y);
      cycle = cyc; end = true;
    } else end = true;
    snap();
    return out;
  },
  project: (s) => ({
    dist: auxItems(s, 'dist['), parent: auxItems(s, 'parent['), table: auxItems(s, 'Edge relaxation'), round: num(s, 'round'), last: num(s, 'last updated'),
    walker: (() => { const i = (sceneOfKind(s, 'graph')?.nodes ?? []).findIndex((nd) => nd.state === 'swap'); return i < 0 ? null : i; })(),
    cycle: (sceneOfKind(s, 'graph')?.nodes ?? []).flatMap((nd) => (nd.state === 'error' ? [nd.id] : [])),
  }),
  notes: 'edge colours not compared; the cycle is compared as a node set (order/direction not compared)',
};

/* ------------------------------------------------------------------ Floyd–Warshall / transitive closure */
const matrixOf = (s: Step): (string | number)[] => {
  const g = scenesOf(s).find((x) => x.kind === 'grid') as { rows: { value: string | number }[][] } | undefined;
  return (g?.rows ?? []).flat().map((c) => c.value);
};
type FwIn = { n: number; edges: E[] };
function fwDist(n: number, edges: E[]): number[][] {
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
  edges.forEach((e) => { d[e.u][e.v] = Math.min(d[e.u][e.v], e.w); });
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
  return d;
}
const cFW: OracleCase<FwIn> = {
  slug: 'alg-floyd-warshall-all-pairs-shortest-paths',
  gen: (r) => {
    const n = rint(r, 2, 5);
    for (let t = 0; t < 30; t++) {
      const edges = randDirected(r, n, 0, 12, t < 25 && r() < 0.5 ? -3 : 0, 9, 0.2 + r() * 0.6);
      if (!fwDist(n, edges).some((row, i) => row[i] < 0)) return { n, edges };
    }
    return { n, edges: [] };
  },
  oracle: ({ n, edges }) => {
    const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
    edges.forEach((e) => { d[e.u][e.v] = e.w; });
    let k: number | null = null, improved = 0;
    const out: State[] = [];
    const snap = () => out.push({ mat: d.flat().map((x) => dd(x)), k, improved });
    snap();
    for (let kk = 0; kk < n; kk++) {
      k = kk; snap();
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if (d[i][kk] + d[kk][j] < d[i][j]) { d[i][j] = d[i][kk] + d[kk][j]; improved++; snap(); }
      }
    }
    k = null; snap();
    return out;
  },
  project: (s) => ({ mat: matrixOf(s).map(String), k: num(s, 'k'), improved: num(s, 'improvements') }),
  notes: 'cell colours (active/compare/found) and the i→j, via-k vars not compared; one state per improved cell',
};
const cTC: OracleCase<FwIn> = {
  slug: 'cp-transitive-closure-warshall-reachability',
  gen: (r) => { const n = rint(r, 2, 6); return { n, edges: randDirected(r, n, 0, 12, 0, 0, r() * 0.5) }; },
  oracle: ({ n, edges }) => {
    const reach = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j));
    edges.forEach((e) => { reach[e.u][e.v] = true; });
    let k: number | null = null, found = 0;
    const pairs = () => reach.reduce((a, row, i) => a + row.filter((x, j) => x && i !== j).length, 0);
    const out: State[] = [];
    const snap = () => out.push({ mat: reach.flat().map((x) => (x ? 1 : 0)), k, found, pairs: pairs() });
    snap();
    for (let kk = 0; kk < n; kk++) {
      k = kk; snap();
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (reach[i][kk] && reach[kk][j] && !reach[i][j]) { reach[i][j] = true; found++; snap(); }
    }
    k = null; snap();
    return out;
  },
  project: (s) => ({ mat: matrixOf(s).map(Number), k: num(s, 'k'), found: num(s, 'new pairs'), pairs: num(s, 'reachable pairs') }),
  notes: 'cell colours not compared',
};

/* ------------------------------------------------------------------ Edmonds–Karp family */
type FlowIn = { n: number; s: number; t: number; edges: { u: number; v: number; cap: number }[] };
/** Edmonds-Karp over arc pairs (arc 2i forward, 2i+1 backward, per-node adjacency in arc order, as the Java shows). */
function flowOracle(net: FlowIn, label: (i: number) => string, compact: boolean, tail?: (cap: number[], to: number[], reach: boolean[], last: State) => State[]): State[] {
  const { n, s, t, edges } = net;
  const to: number[] = [], cap: number[] = [], g: number[][] = Array.from({ length: n }, () => []);
  edges.forEach((e) => { g[e.u].push(to.length); to.push(e.v); cap.push(e.cap); g[e.v].push(to.length); to.push(e.u); cap.push(0); });
  let round = 0, flow = 0, bottleneck: number | null = null, path: string | null = null;
  const out: State[] = [];
  const snap = () => out.push({
    round, bottleneck, flow, path,
    residual: cap.flatMap((c, a) => (c > 0 ? [`${label(to[a ^ 1])} → ${label(to[a])}: ${c}${a & 1 ? '  (undo)' : ''}`] : [])),
  });
  snap();
  for (;;) {
    round++; bottleneck = null; path = null;
    const parent = new Array<number>(n).fill(-1), seen = new Array<boolean>(n).fill(false);
    seen[s] = true;
    const q = [s];
    for (let h = 0; h < q.length && parent[t] === -1; h++) {
      for (const a of g[q[h]]) if (cap[a] > 0 && !seen[to[a]]) { seen[to[a]] = true; parent[to[a]] = a; q.push(to[a]); }
    }
    if (parent[t] === -1) {
      snap(); // "BFS cannot reach the sink"
      if (tail) out.push(...tail(cap, to, seen, out[out.length - 1])); else snap();
      return out;
    }
    const arcs: number[] = [];
    for (let v = t; v !== s; v = to[parent[v] ^ 1]) arcs.unshift(parent[v]);
    const b = Math.min(...arcs.map((a) => cap[a]));
    const parts = [label(to[arcs[0] ^ 1])];
    arcs.forEach((a) => parts.push(label(to[a]) + (a & 1 ? '*' : '')));
    if (!compact) snap(); // BFS step
    bottleneck = b; path = parts.join(' → ');
    if (!compact) snap(); // path step
    for (const a of arcs) { cap[a] -= b; cap[a ^ 1] += b; }
    flow += b; snap();
  }
}
const flowProject = (s: Step): State => ({
  round: num(s, 'round'), bottleneck: num(s, 'bottleneck'), flow: num(s, 'flow so far'), path: shown(s, 'path'), residual: auxItems(s, 'residual capacities'),
});
const genFlow = (r: R, maxN: number, maxE: number): FlowIn => {
  const n = rint(r, 2, maxN); const s = rint(r, 0, n - 1); let t = rint(r, 0, n - 2); if (t >= s) t++;
  const es = randDirected(r, n, 0, maxE, 1, r() < 0.5 ? 3 : 9, 0.2 + r() * 0.5, false);
  return { n, s, t, edges: es.map((e) => ({ u: e.u, v: e.v, cap: e.w })) };
};
const cMaxFlow: OracleCase<FlowIn> = {
  slug: 'alg-max-flow-edmonds-karp',
  gen: (r) => genFlow(r, 8, 16),
  oracle: (net) => flowOracle(net, String, false),
  project: flowProject,
  notes: 'edge/node colours, BFS level tags and per-edge flow/capacity labels not compared (the residual list is); BFS scans each node\'s arcs in insertion order (forward arc of input edge i, then backward arcs)',
};
const cMinCut: OracleCase<FlowIn> = {
  slug: 'cp-minimum-cut-from-max-flow',
  gen: (r) => genFlow(r, 8, 14),
  oracle: (net) => flowOracle(net, String, true, (_cap, _to, seen, last) => {
    // after the last (failed) BFS: side S = nodes reachable in the final residual graph, then the cut edges
    const sideS = seen.flatMap((x, i) => (x ? [i] : []));
    const cut = net.edges.flatMap((e, i) => (seen[e.u] && !seen[e.v] ? [i] : []));
    return [{ ...last, sideS, cut: [] as number[] }, { ...last, sideS, cut }];
  }).map((st) => (st.sideS ? st : { ...st, sideS: [] as number[], cut: [] as number[] })),
  project: (s) => {
    const g = sceneOfKind(s, 'graph');
    return {
      ...flowProject(s),
      sideS: (g?.nodes ?? []).flatMap((nd) => (nd.tone === 'blue' ? [nd.id] : [])),
      cut: (g?.edges ?? []).flatMap((e, i) => (e.state === 'error' ? [i] : [])),
    };
  },
  notes: 'one step per augmenting round (compact mode); only node tone blue (side S) and red cut edges are compared besides the flow numbers/residual list; the cut capacity text is not parsed',
};
const cMatching: OracleCase<{ L: number; R: number; pairs: [number, number][] }> = {
  slug: 'cp-maximum-bipartite-matching-flow',
  gen: (r) => {
    const L = rint(r, 1, 4), Rr = rint(r, 1, 4);
    const all: [number, number][] = []; for (let l = 0; l < L; l++) for (let x = 0; x < Rr; x++) all.push([l, x]);
    return { L, R: Rr, pairs: shuffle(r, all).slice(0, Math.min(12, rint(r, 0, all.length))) };
  },
  oracle: ({ L, R, pairs }) => {
    const n = L + R + 2;
    const net: FlowIn = { n, s: 0, t: n - 1, edges: [
      ...Array.from({ length: L }, (_, l) => ({ u: 0, v: 1 + l, cap: 1 })),
      ...Array.from({ length: R }, (_, x) => ({ u: 1 + L + x, v: n - 1, cap: 1 })),
      ...pairs.map(([l, x]) => ({ u: 1 + l, v: 1 + L + x, cap: 1 })),
    ] };
    const name = (i: number) => (i === 0 ? 'S' : i <= L ? `L${i - 1}` : i <= L + R ? `R${i - L - 1}` : 'T');
    return flowOracle(net, name, false, (cap, _to, _seen, last) => {
      // flow on an edge = capacity of its backward arc; matched = pair edges (index >= L+R) carrying flow
      const matched = pairs.flatMap((_p, k) => (cap[2 * (L + R + k) + 1] === 1 ? [L + R + k] : []));
      return [{ ...last, matched }];
    }).map((st) => (st.matched ? st : { ...st, matched: [] as number[] }));
  },
  project: (s) => ({
    ...flowProject(s),
    matched: (sceneOfKind(s, 'graph')?.edges ?? []).flatMap((e, i) => (e.state === 'chosen' ? [i] : [])),
  }),
  notes: 'colours other than the final green matched edges not compared; edge order = source->left, right->sink, then the pairs (as in the Java wrapper)',
};

/* ------------------------------------------------------------------ 305 Number of Islands II */
const c305: OracleCase<{ m: number; n: number; pos: [number, number][] }> = {
  slug: '305-number-of-islands-ii',
  gen: (r) => {
    const m = rint(r, 1, 5), n = rint(r, 1, 5);
    const k = rint(r, 1, 8);
    return { m, n, pos: Array.from({ length: k }, () => [rint(r, 0, m - 1), rint(r, 0, n - 1)] as [number, number]) };
  },
  oracle: ({ m, n, pos }) => {
    const parent = new Array<number>(m * n).fill(-1);
    const out: number[] = [];
    let count = 0;
    const rootOf = (x: number) => { while (parent[x] !== x) x = parent[x]; return x; };
    const states: State[] = [];
    const snap = () => states.push({
      parent: parent.flatMap((p, i) => (p === -1 ? [] : [`${i}→${p}`])), out: out.map(String), islands: count,
      grid: parent.map((p, i) => (p === -1 ? '~' : rootOf(i))),
    });
    snap();
    for (const [r, c] of pos) {
      const id = r * n + c;
      if (parent[id] !== -1) { out.push(count); snap(); continue; }
      parent[id] = id; count++; snap();
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= m || cc < 0 || cc >= n || parent[rr * n + cc] === -1) continue;
        const a = findHalving(parent, id), b = findHalving(parent, rr * n + cc);
        if (a !== b) { parent[a] = b; count--; }
        snap();
      }
      out.push(count); snap();
    }
    snap();
    return states;
  },
  project: (s) => {
    const grid = scenesOf(s).find((x) => x.kind === 'grid') as { rows: { value: string | number }[][] } | undefined;
    return { parent: auxItems(s, 'parent['), out: auxItems(s, 'island count'), islands: num(s, 'islands'), grid: (grid?.rows ?? []).flat().map((c) => c.value) };
  },
  notes: 'cell highlight states not compared; the grid shows each land cell\'s current root (checked) — neighbours are processed in the order down, up, right, left; find uses path halving, union attaches root a under root b',
};

/* ------------------------------------------------------------------ Union-find by rank + path compression (Number of Provinces) */
const cUFProv: OracleCase<{ isConnected: number[][] }> = {
  slug: 'alg-union-find-number-of-provinces-union-by-rank-path-compression',
  gen: (r) => {
    const n = rint(r, 1, 7);
    const M = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
    const p = r() * 0.6;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (r() < p) { M[i][j] = 1; M[j][i] = 1; }
    return { isConnected: M };
  },
  oracle: ({ isConnected: M }) => {
    const n = M.length;
    const parent = Array.from({ length: n }, (_, i) => i), rank = new Array<number>(n).fill(0);
    const pairs: [number, number][] = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (M[i][j] === 1) pairs.push([i, j]);
    const status = pairs.map(() => '');
    let components = n, unions = 0, finds = 0, pair: string | null = null;
    const out: State[] = [];
    const snap = () => out.push({
      parent: parent.map((p, i) => `${i}→${p}`), rank: rank.map((x, i) => `${i}: ${x}`), components, unions, finds, pair, status: [...status],
    });
    snap();
    const find = (x: number): number => { // textbook recursive path compression, shown as: the climb, then the rewrite of the walked nodes
      finds++; snap();
      const chain = [x];
      while (parent[chain[chain.length - 1]] !== chain[chain.length - 1]) chain.push(parent[chain[chain.length - 1]]);
      const root = chain[chain.length - 1];
      for (const c of chain) parent[c] = root;
      snap();
      return root;
    };
    pairs.forEach(([i, j], k) => {
      pair = `(${i}, ${j})`; snap();
      const ra = find(i), rb = find(j);
      if (ra === rb) { status[k] = 'skip'; snap(); return; }
      if (rank[ra] < rank[rb]) parent[ra] = rb;
      else if (rank[ra] > rank[rb]) parent[rb] = ra;
      else { parent[rb] = ra; rank[ra]++; }
      components--; unions++; status[k] = '✓'; snap();
    });
    pair = null; snap();
    return out;
  },
  project: (s) => ({
    parent: auxItems(s, 'parent['), rank: auxItems(s, 'rank['), components: num(s, 'components'), unions: num(s, 'unions'), finds: num(s, 'finds'),
    pair: shown(s, 'pair'),
    status: auxItems(s, 'pairs with a 1').map((x) => (x.endsWith(' ✓') ? '✓' : x.endsWith(' skip') ? 'skip' : '')),
  }),
  notes: 'forest picture (positions, tones, rank tags) and matrix cell colours not compared; full path compression (every walked node re-pointed at the root)',
};

/* ------------------------------------------------------------------ Union-find with rollback */
type RbOp = { op: 'u' | 'q'; a: number; b: number } | { op: 'undo' };
const forestParent = (s: Step, n: number): number[] => {
  const p = Array.from({ length: n }, (_, i) => i);
  for (const e of sceneOfKind(s, 'graph')?.edges ?? []) p[e.from] = e.to;
  return p;
};
const cRollback: OracleCase<{ n: number; ops: RbOp[] }> = {
  slug: 'cp-union-find-with-rollback',
  gen: (r) => {
    const n = rint(r, 2, 7);
    const k = rint(r, 1, 12);
    const ops: RbOp[] = [];
    // track the number of effective unions (so that an "undo" is always legal)
    const p = Array.from({ length: n }, (_, i) => i);
    const sz = new Array<number>(n).fill(1);
    const hist: [number, number][] = [];
    const find = (x: number): number => (p[x] === x ? x : find(p[x]));
    for (let i = 0; i < k; i++) {
      const t = r();
      if (t < 0.2 && hist.length) { const [c, par] = hist.pop()!; p[c] = c; sz[par] -= sz[c]; ops.push({ op: 'undo' }); continue; }
      const a = rint(r, 0, n - 1), b = rint(r, 0, n - 1);
      if (t < 0.65) {
        ops.push({ op: 'u', a, b });
        let c = find(a), q = find(b);
        if (c !== q) { if (sz[c] > sz[q]) [c, q] = [q, c]; p[c] = q; sz[q] += sz[c]; hist.push([c, q]); }
      } else ops.push({ op: 'q', a, b });
    }
    if (!ops.some((o) => o.op === 'q')) ops.push({ op: 'q', a: 0, b: n - 1 });
    return { n, ops: ops.slice(0, 12) };
  },
  oracle: ({ n, ops }) => {
    const parent = Array.from({ length: n }, (_, i) => i), size = new Array<number>(n).fill(1);
    const hist: [number, number][] = [], answers: string[] = [];
    const root = (x: number) => { while (parent[x] !== x) x = parent[x]; return x; };
    const out: State[] = [];
    const snap = () => out.push({
      parent: [...parent], history: hist.map(([a, b]) => `${a}→${b}`), size: parent.flatMap((p, i) => (p === i ? [`${i}: ${size[i]}`] : [])), answers: [...answers],
    });
    snap();
    for (const o of ops) {
      if (o.op === 'undo') {
        const [a, b] = hist.pop()!;
        parent[a] = a; size[b] -= size[a]; snap();
        continue;
      }
      const A = root(o.a), B = root(o.b);
      if (o.op === 'q') { answers.push(String(A === B)); snap(); continue; }
      if (A === B) continue;
      let child = A, par = B;
      if (size[child] > size[par]) { child = B; par = A; }
      parent[child] = par; size[par] += size[child]; hist.push([child, par]); snap();
    }
    snap();
    return out;
  },
  project: (s, inp) => ({
    parent: forestParent(s, inp.n), history: auxItems(s, 'undo stack'), size: auxItems(s, 'size['), answers: auxItems(s, 'answers'),
  }),
  notes: 'forest picture positions/colours not compared; parent[] is read back from the drawn parent arrows; no path compression, smaller tree hung under larger (ties: first root under second)',
};

/* ------------------------------------------------------------------ Weighted union-find (ratios) */
type Fr = { n: number; d: number };
const gcdN = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcdN(b, a % b));
const fr = (n: number, d = 1): Fr => { const g = gcdN(n, d) || 1; return { n: n / g, d: d / g }; };
const fmulF = (a: Fr, b: Fr) => fr(a.n * b.n, a.d * b.d);
const fdivF = (a: Fr, b: Fr) => fr(a.n * b.d, a.d * b.n);
const fS = (a: Fr) => (a.d === 1 ? String(a.n) : `${a.n}/${a.d}`);
type WIn = { eqs: { a: string; b: string; k: number }[]; queries: { a: string; b: string }[] };
const cWeighted: OracleCase<WIn> = {
  slug: 'cp-weighted-union-find-ratios',
  gen: (r) => {
    const L = 'abcdefg'.slice(0, rint(r, 2, 7));
    const eqs: WIn['eqs'] = [];
    const consistent = (es: WIn['eqs']): boolean => {
      const val = new Map<string, Fr>();
      const names = [...new Set(es.flatMap((e) => [e.a, e.b]))];
      for (const s0 of names) {
        if (val.has(s0)) continue;
        val.set(s0, fr(1)); const q = [s0];
        for (let h = 0; h < q.length; h++) for (const e of es) {
          if (e.a === q[h] && !val.has(e.b)) { val.set(e.b, fdivF(val.get(q[h])!, fr(e.k))); q.push(e.b); }
          else if (e.b === q[h] && !val.has(e.a)) { val.set(e.a, fmulF(val.get(q[h])!, fr(e.k))); q.push(e.a); }
        }
      }
      return es.every((e) => { const x = fdivF(val.get(e.a)!, val.get(e.b)!); return x.n === e.k && x.d === 1; });
    };
    const want = rint(r, 1, 6);
    for (let t = 0; t < 40 && eqs.length < want; t++) {
      const a = L[rint(r, 0, L.length - 1)], b = L[rint(r, 0, L.length - 1)];
      if (a === b) continue;
      const e = { a, b, k: rint(r, 1, 9) };
      if (consistent([...eqs, e])) eqs.push(e);
    }
    if (!eqs.length) eqs.push({ a: 'a', b: 'b', k: 2 });
    const qL = r() < 0.2 ? L + 'xyz' : L;
    const queries = Array.from({ length: rint(r, 1, 5) }, () => ({ a: qL[rint(r, 0, qL.length - 1)], b: qL[rint(r, 0, qL.length - 1)] }));
    return { eqs, queries };
  },
  oracle: ({ eqs, queries }) => {
    const names = [...new Set(eqs.flatMap((e) => [e.a, e.b]))].sort();
    const id = (s: string) => names.indexOf(s);
    const parent = names.map((_, i) => i), w: Fr[] = names.map(() => fr(1));
    const answers: string[] = [];
    const out: State[] = [];
    const snap = () => out.push({ items: names.map((s, i) => (parent[i] === i ? `${s}: root` : `${s}: ${names[parent[i]]}  ×${fS(w[i])}`)), answers: [...answers] });
    snap();
    const find = (x: number): number => { // path compression: every node on the walked chain re-pointed at the root, weights multiplied
      const chain = [x];
      while (parent[chain[chain.length - 1]] !== chain[chain.length - 1]) chain.push(parent[chain[chain.length - 1]]);
      const root = chain[chain.length - 1];
      for (let i = chain.length - 3; i >= 0; i--) { w[chain[i]] = fmulF(w[chain[i]], w[chain[i + 1]]); parent[chain[i]] = root; }
      snap();
      return root;
    };
    for (const e of eqs) {
      const A = find(id(e.a)), B = find(id(e.b));
      if (A === B) continue;
      const nw = fdivF(fmulF(fr(e.k), w[id(e.b)]), w[id(e.a)]);
      parent[A] = B; w[A] = nw; snap();
    }
    for (const q of queries) {
      if (!names.includes(q.a) || !names.includes(q.b)) { answers.push('-1'); snap(); continue; }
      const A = find(id(q.a)), B = find(id(q.b));
      if (A !== B) { answers.push('-1'); snap(); continue; }
      const v = fdivF(w[id(q.a)], w[id(q.b)]);
      const x = v.n / v.d;
      answers.push(Number.isInteger(x) ? String(x) : String(Number(x.toFixed(5)))); snap();
    }
    snap();
    return out;
  },
  project: (s) => ({ items: auxItems(s, 'parent[x]'), answers: auxItems(s, 'answers') }),
  notes: 'forest picture not compared; ratios are exact fractions, printed answers use up to 5 decimals; equations are consistent by construction',
};

/* ------------------------------------------------------------------ Is graph a tree? (DFS) */
const cGfgTree: OracleCase<GIn2> = {
  slug: 'gfg-is-graph-a-tree',
  gen: (r) => {
    const n = rint(r, 1, 8);
    if (r() < 0.45 && n >= 2) { // a random tree, sometimes plus/minus an edge
      const es = randConnected(r, n, 0, n - 1);
      const t = es.map((e) => ({ u: e.u, v: e.v }));
      if (r() < 0.3 && t.length > 1) t.pop();
      return { n, edges: t };
    }
    return { n, edges: randEdges(r, n, 0, 12, 1, 1, r()).map((e) => ({ u: e.u, v: e.v })) };
  },
  oracle: ({ n, edges }) => {
    const adj = adjAsc(n, 0, edges);
    const seen = new Array<boolean>(n).fill(false), stack: string[] = [];
    let bad: number[] = [], missing: number[] = [], result: string | null = null;
    const out: State[] = [];
    const snap = () => out.push({
      seen: seen.flatMap((x, i) => (x ? [String(i)] : [])), stack: [...stack], visited: seen.filter(Boolean).length, isTree: result,
      err: [...new Set([...bad, ...missing])].sort((a, b) => a - b),
    });
    snap();
    let cyc = false;
    const dfs = (u: number, parent: number): boolean => {
      seen[u] = true; stack.push(`(${u}, ${parent === -1 ? 'none' : parent})`); snap();
      for (const v of adj[u]) {
        if (v === parent) continue;
        if (seen[v]) { bad = [u, v]; cyc = true; snap(); return true; }
        snap(); // "Walk u -> v" step (shows the stack popped by the previous child, if any)
        if (dfs(v, u)) return true;
      }
      stack.pop();
      return false;
    };
    dfs(0, -1);
    if (cyc) { result = 'false'; snap(); return out; }
    missing = seen.flatMap((x, i) => (x ? [] : [i]));
    result = String(missing.length === 0); snap();
    return out;
  },
  project: (s) => ({
    seen: auxItems(s, 'visited'), stack: auxItems(s, 'DFS call stack'), visited: num(s, 'visited'), isTree: shown(s, 'is tree'),
    err: (sceneOfKind(s, 'graph')?.nodes ?? []).flatMap((nd) => (nd.state === 'error' ? [nd.id] : [])),
  }),
  notes: 'edge colours not compared; DFS from node 0 visiting neighbours in ascending order; when a cycle is found the stack is not unwound (as shown)',
};

/* ------------------------------------------------------------------ Find an odd cycle (BFS 2-colouring + LCA climb) */
const cOdd: OracleCase<GIn2> = {
  slug: 'cp-find-an-odd-cycle',
  gen: (r) => gUndirIn(r, rint(r, 3, 9), 0, 14),
  oracle: ({ n, edges }) => {
    const adj = adjAsc(n, 0, edges);
    const color = new Array<number>(n).fill(-1), parent = new Array<number>(n).fill(-1), depth = new Array<number>(n).fill(0), queue: number[] = [];
    let cycle: number[] = [], found: string | null = null;
    const out: State[] = [];
    const snap = () => out.push({
      tag: color.map((c, i) => (c < 0 ? '–' : `${c === 0 ? 'A' : 'B'}, depth ${depth[i]}`)), queue: queue.map(String),
      parent: parent.map((p, i) => `${i}: ${color[i] < 0 ? '·' : p < 0 ? 'root' : p}`), cyc: [...cycle].sort((a, b) => a - b), len: cycle.length || null, found,
    });
    snap();
    for (let s0 = 0; s0 < n; s0++) {
      if (color[s0] !== -1) continue;
      color[s0] = 0; depth[s0] = 0; queue.push(s0); snap();
      while (queue.length) {
        const u = queue.shift()!; snap();
        for (const v of adj[u]) {
          if (color[v] === -1) { color[v] = 1 - color[u]; parent[v] = u; depth[v] = depth[u] + 1; queue.push(v); snap(); }
          else if (color[v] === color[u]) {
            let a = u, b = v; const left = [a], right = [b];
            while (a !== b) { a = parent[a]; b = parent[b]; if (a !== b) { left.push(a); right.push(b); } else left.push(a); }
            cycle = [...left, ...[...right].reverse()]; found = `length ${cycle.length}`; snap();
            return out;
          }
        }
      }
    }
    found = 'none'; snap();
    return out;
  },
  project: (s) => ({
    tag: nodeTags(s), queue: auxItems(s, 'BFS queue'), parent: auxItems(s, 'parent['),
    cyc: (sceneOfKind(s, 'graph')?.nodes ?? []).flatMap((nd) => (nd.state === 'error' ? [nd.id] : [])),
    len: num(s, 'cycle length'), found: shown(s, 'odd cycle'),
  }),
  notes: 'edge colours, climbing pointers/highlights not compared; the cycle is compared as a node set and its length; neighbours in ascending order',
};

/* ------------------------------------------------------------------ rooted-tree helpers (parent arrays, par[0] = -1, par[v] < v) */
type TIn2 = { par: number[]; queries: [number, number][] };
const genPar = (r: R): number[] => {
  const n = rint(r, 2, 11);
  const par = [-1];
  for (let v = 1; v < n; v++) par.push(r() < 0.4 ? v - 1 : rint(r, 0, v - 1));
  return par;
};
const genQueries = (r: R, n: number, k = 3): [number, number][] => Array.from({ length: rint(r, 1, k) }, () => [rint(r, 0, n - 1), rint(r, 0, n - 1)] as [number, number]);
const depthsOfPar = (par: number[]): number[] => { const d = par.map(() => 0); for (let v = 1; v < par.length; v++) d[v] = d[par[v]] + 1; return d; };
const bitLen2 = (x: number) => (x <= 0 ? 0 : 32 - Math.clz32(x));
/** Heavy-light decomposition straight from the Java in problem.java: sizes by descending id, heavy child = first child with the strictly largest size, pos by DFS (heavy child first). */
function hldJava(par: number[]) {
  const n = par.length;
  const ch: number[][] = par.map(() => []);
  par.forEach((p, v) => { if (p >= 0) ch[p].push(v); });
  const size = par.map(() => 1);
  for (let v = n - 1; v >= 1; v--) size[par[v]] += size[v];
  const heavy = par.map(() => -1);
  for (let v = 0; v < n; v++) for (const c of ch[v]) if (heavy[v] < 0 || size[c] > size[heavy[v]]) heavy[v] = c;
  const head = par.map(() => 0), pos = par.map(() => 0), order: number[] = [], chains: number[][] = [];
  const assign = (v: number, h: number, cid: number) => {
    head[v] = h; pos[v] = order.length; order.push(v); chains[cid].push(v);
    if (heavy[v] >= 0) assign(heavy[v], h, cid);
    for (const c of ch[v]) if (c !== heavy[v]) { chains.push([]); assign(c, c, chains.length - 1); } // a light child heads a new chain
  };
  chains.push([]);
  assign(0, 0, 0);
  return { ch, size, heavy, head, pos, order, chains };
}

/* ------------------------------------------------------------------ 1483 Kth ancestor (ancestor table is built step by step) */
const c1483: OracleCase<TIn2> = {
  slug: '1483-kth-ancestor-of-a-tree-node',
  gen: (r) => { const par = genPar(r); return { par, queries: Array.from({ length: rint(r, 1, 3) }, () => [rint(r, 0, par.length - 1), rint(r, 1, par.length)] as [number, number]) }; },
  oracle: ({ par, queries }) => {
    const n = par.length, LOG = bitLen2(n);
    const up: number[][] = [par.slice()];
    for (let j = 1; j < LOG; j++) up.push(up[j - 1].map((m) => (m < 0 ? -1 : up[j - 1][m])));
    const table: (string | number)[][] = Array.from({ length: LOG }, () => new Array<string | number>(n).fill('?'));
    const show = (x: number) => (x < 0 ? '–' : x);
    const answers: string[] = [];
    let vj: number | null = null, vq: string | null = null, vnode: number | null = null, vk: number | null = null;
    const out: State[] = [];
    const snap = () => out.push({ table: table.flat().map(String), j: vj, query: vq, node: vnode, k: vk, answers: [...answers], answer: answers.length ? answers[answers.length - 1] : null });
    snap();
    vj = 0; up[0].forEach((x, v) => { table[0][v] = show(x); }); snap();
    for (let j = 1; j < LOG; j++) {
      vj = j;
      let ex = -1;
      for (let v = n - 1; v >= 0; v--) if (up[j][v] >= 0) { ex = v; break; }
      if (ex >= 0) { table[j][ex] = show(up[j][ex]); snap(); } // the animation first shows one sample cell of the row
      up[j].forEach((x, v) => { table[j][v] = show(x); }); snap();
    }
    queries.forEach(([node, k], qi) => {
      vq = `${qi + 1} of ${queries.length}`; vnode = node; vk = k; vj = null; snap();
      let cur = node, dead = false;
      for (let j = 0; j < LOG; j++) {
        if (!((k >> j) & 1)) continue;
        vj = j;
        const nxt = up[j][cur];
        if (nxt < 0) { dead = true; snap(); break; }
        snap(); cur = nxt;
      }
      answers.push(String(dead ? -1 : cur)); snap();
    });
    vq = null; vnode = null; vk = null; vj = null; snap();
    return out;
  },
  project: (s) => {
    const grid = scenesOf(s).find((x) => x.kind === 'grid') as { rows: { value: string | number }[][] } | undefined;
    return {
      table: (grid?.rows ?? []).flat().map((c) => String(c.value)), j: num(s, 'level j'), query: shown(s, 'query'), node: num(s, 'node'), k: num(s, 'k'),
      answers: auxItems(s, 'answers so far'), answer: shown(s, 'answer'),
    };
  },
  notes: 'tree highlights / jump arrows not compared; the animation shows one sample cell of each row of the table (the highest node that has that ancestor) before the whole row — mirrored in the oracle as a presentation choice',
};

/* ------------------------------------------------------------------ LCA via binary lifting / distance between nodes */
function lcaOracle(dist: boolean) {
  return ({ par, queries }: TIn2): State[] => {
    const n = par.length, LOG = bitLen2(n), depth = depthsOfPar(par);
    const up: number[][] = [par.map((p) => (p < 0 ? 0 : p))]; // the root points to itself
    for (let j = 1; j < LOG; j++) up.push(up[j - 1].map((m) => up[j - 1][m]));
    const answers: string[] = [];
    let vq: string | null = null, vu: number | null = null, vv: number | null = null, vj: number | null = null;
    const out: State[] = [];
    const snap = () => out.push({ table: up.flat(), depth: [...depth], query: vq, u: vu, v: vv, j: vj, answers: [...answers], answer: answers.length ? answers[answers.length - 1] : null });
    snap();
    queries.forEach(([u0, v0], qi) => {
      vq = `${qi + 1} of ${queries.length}`; vu = u0; vv = v0; vj = null; snap();
      let u = u0, v = v0;
      if (depth[u] < depth[v]) [u, v] = [v, u];
      vu = u; vv = v; snap();
      const diff = depth[u] - depth[v];
      for (let j = 0; j < LOG; j++) if ((diff >> j) & 1) { vj = j; u = up[j][u]; vu = u; snap(); }
      let lca: number;
      if (u === v) lca = u;
      else {
        for (let j = LOG - 1; j >= 0; j--) {
          vj = j;
          if (up[j][u] !== up[j][v]) { u = up[j][u]; v = up[j][v]; vu = u; vv = v; }
          snap();
        }
        lca = up[0][u]; vu = u; vv = v; vj = null; snap();
      }
      answers.push(String(dist ? depth[u0] + depth[v0] - 2 * depth[lca] : lca)); snap();
    });
    snap();
    return out;
  };
}
const lcaProject = (answersTitle: string) => (s: Step): State => {
  const grid = scenesOf(s).find((x) => x.kind === 'grid') as { rows: { value: string | number }[][] } | undefined;
  const tree = scenesOf(s).find((x) => x.kind === 'ntree') as { nodes: { tag?: string }[] } | undefined;
  return {
    table: (grid?.rows ?? []).flat().map((c) => Number(c.value)), depth: (tree?.nodes ?? []).map((nd) => Number(/d=(\d+)/.exec(nd.tag ?? '')?.[1])),
    query: shown(s, 'query'), u: num(s, 'u'), v: num(s, 'v'), j: num(s, 'level j'), answers: auxItems(s, answersTitle), answer: shown(s, 'answer'),
  };
};
const genLcaIn = (r: R): TIn2 => { const par = genPar(r); return { par, queries: genQueries(r, par.length) }; };
const cLca: OracleCase<TIn2> = {
  slug: 'cp-lowest-common-ancestor-via-binary-lifting',
  gen: genLcaIn,
  oracle: lcaOracle(false),
  project: lcaProject('answers so far'),
  notes: 'tree highlights / jump arrows and cell highlight colours not compared; the lifting table (root points to itself) and node depths are compared on every step',
};
const cDist: OracleCase<TIn2> = {
  slug: 'cp-distance-between-two-nodes-in-a-tree',
  gen: genLcaIn,
  oracle: lcaOracle(true),
  project: lcaProject('distances so far'),
  notes: 'tree highlights / jump arrows not compared; distance = depth[u] + depth[v] - 2*depth[lca]',
};

/* ------------------------------------------------------------------ heavy-light decomposition (three animations) */
const cHldChains: OracleCase<{ par: number[] }> = {
  slug: 'cp-heavy-light-decomposition-chains',
  gen: (r) => ({ par: genPar(r) }),
  oracle: ({ par }) => {
    const n = par.length, h = hldJava(par);
    const size = par.map(() => 1), tags = par.map(() => 's=1');
    const decided: number[] = [], chainsText: string[] = [];
    let nextPos = 0;
    const out: State[] = [];
    const snap = () => out.push({ tags: [...tags], heavy: [...decided].sort((a, b) => a - b), chains: [...chainsText], nextPos });
    snap();
    for (let v = n - 1; v >= 1; v--) { const p = par[v]; size[p] += size[v]; tags[v] = `s=${size[v]}`; tags[p] = `s=${size[p]}`; snap(); }
    for (let v = 0; v < n; v++) if (h.ch[v].length) { decided.push(h.heavy[v]); snap(); }
    let upto = 0;
    for (const chain of h.chains) {
      nextPos = upto; snap();
      for (const v of chain) { tags[v] = `p=${upto}`; upto++; }
      nextPos = upto; chainsText.push(`(${chain.join('-')})`); snap();
    }
    snap();
    return out;
  },
  project: (s) => {
    const t = sceneOfKind(s, 'ntree');
    return {
      tags: (t?.nodes ?? []).map((nd) => nd.tag ?? null), heavy: (t?.nodes ?? []).flatMap((nd) => (nd.heavy ? [nd.id] : [])).sort((a, b) => a - b),
      chains: auxItems(s, 'chains found'), nextPos: num(s, 'next pos'),
    };
  },
  notes: 'node colours / position-row cell colours not compared (the chains list, sizes, positions and heavy edges are)',
};
const cHldLca: OracleCase<TIn2> = {
  slug: 'cp-lca-via-heavy-light-decomposition',
  gen: genLcaIn,
  oracle: ({ par, queries }) => {
    const h = hldJava(par), depth = depthsOfPar(par);
    const answers: string[] = [];
    let vq: string | null = null, vu: number | null = null, vv: number | null = null;
    const out: State[] = [];
    const snap = () => out.push({ query: vq, u: vu, v: vv, hu: vu === null ? null : h.head[vu], hv: vv === null ? null : h.head[vv], answers: [...answers] });
    snap();
    queries.forEach(([u0, v0], qi) => {
      vq = `${qi + 1} of ${queries.length}`; let u = u0, v = v0; vu = u; vv = v; snap();
      while (h.head[u] !== h.head[v]) {
        if (depth[h.head[u]] > depth[h.head[v]]) u = par[h.head[u]]; else v = par[h.head[v]];
        vu = u; vv = v; snap();
      }
      const lca = depth[u] < depth[v] ? u : v;
      answers.push(String(lca)); snap();
    });
    snap();
    return out;
  },
  project: (s) => ({ query: shown(s, 'query'), u: num(s, 'u'), v: num(s, 'v'), hu: num(s, 'head[u]'), hv: num(s, 'head[v]'), answers: auxItems(s, 'answers so far') }),
  notes: 'tree highlights / jump arrows not compared; the node with the deeper chain head climbs, ties move v (as in the Java)',
};
const cHldPath: OracleCase<{ par: number[]; vals: number[]; queries: [number, number][] }> = {
  slug: 'cp-hld-path-maximum-query',
  gen: (r) => { const par = genPar(r); return { par, vals: par.map(() => rint(r, -20, 20)), queries: genQueries(r, par.length) }; },
  oracle: ({ par, vals, queries }) => {
    const h = hldJava(par), depth = depthsOfPar(par);
    const rangeMax = (a: number, b: number) => Math.max(...h.order.slice(a, b + 1).map((v) => vals[v]));
    const answers: string[] = [];
    let vq: string | null = null, vu: number | null = null, vv: number | null = null, vbest: string | number | null = null;
    const out: State[] = [];
    const snap = () => out.push({ query: vq, u: vu, v: vv, best: vbest, answers: [...answers] });
    snap();
    queries.forEach(([u0, v0], qi) => {
      vq = `${qi + 1} of ${queries.length}`; vu = u0; vv = v0; vbest = '−∞'; snap();
      let u = u0, v = v0, best = -Infinity;
      while (h.head[u] !== h.head[v]) {
        if (depth[h.head[u]] < depth[h.head[v]]) [u, v] = [v, u];
        vu = u; vv = v; snap();
        best = Math.max(best, rangeMax(h.pos[h.head[u]], h.pos[u])); vbest = best; snap();
        u = par[h.head[u]]; // the hop step still shows the old u; the new u is shown with the next step
      }
      if (depth[u] > depth[v]) [u, v] = [v, u];
      vu = u; vv = v;
      best = Math.max(best, rangeMax(h.pos[u], h.pos[v])); vbest = best; snap();
      answers.push(String(best)); snap();
    });
    snap();
    return out;
  },
  project: (s) => ({ query: shown(s, 'query'), u: num(s, 'u'), v: num(s, 'v'), best: shown(s, 'best so far'), answers: auxItems(s, 'answers so far') }),
  notes: 'tree highlights, position-row range highlighting and jump arrows not compared; the node with the deeper chain head becomes u (swap only when strictly deeper, as in the Java)',
};

/* ------------------------------------------------------------------ cross-panel invariants (scene vs. aux panels) */
const gnodes = (s: Step) => sceneOfKind(s, 'graph')?.nodes ?? [];
/** node tag (after stripping `strip`) must equal the value in the aux list item "<id>: <value>" (list indexed from `base`). */
function tagVsList(auxPrefix: string, base: number, strip: RegExp): (s: Step) => string | null {
  return (s) => {
    const items = auxItems(s, auxPrefix);
    for (const nd of gnodes(s)) {
      const item = items[nd.id - base];
      if (item === undefined || nd.tag === undefined) continue;
      const want = item.slice(item.indexOf(': ') + 2), got = nd.tag.replace(strip, '');
      if (want !== got) return `node ${nd.id} tag "${nd.tag}" disagrees with the list entry "${item}"`;
    }
    return null;
  };
}
/** parent pointer tags ("→p" with an offset / letter names) must equal the parent list. */
function parentTags(auxPrefix: string, base: number): (s: Step) => string | null {
  const label = (p: number) => String(p);
  return (s) => {
    const items = auxItems(s, auxPrefix);
    const nodes = gnodes(s);
    for (let i = 0; i < nodes.length; i++) {
      const p = Number(/→(\d+)/.exec(items[i] ?? '')?.[1]);
      const wantTag = Number.isNaN(p) ? undefined : label(p);
      const isSelf = Number.isNaN(p) ? false : p === i + base;
      const got = nodes[i].tag;
      if (!isSelf && wantTag !== undefined && got !== `→${wantTag}`) return `node ${nodes[i].id}: tag ${JSON.stringify(got)} but parent list says "${items[i]}"`;
      if (isSelf && got !== undefined) return `node ${nodes[i].id} is a root but carries tag ${JSON.stringify(got)}`;
    }
    return null;
  };
}
c743.invariants = [(s) => tagVsList('dist[', 1, /^d=/)(s)];
cBF.invariants = [(s) => tagVsList('dist[', 0, /^d=/)(s)];
cNegCycle.invariants = [(s) => tagVsList('dist[', 0, /^d=/)(s)];
c787.invariants = [(s) => tagVsList('dist[ ]', 0, /^\$/)(s)];
c1514.invariants = [(s) => tagVsList('best probability', 0, /^p=/)(s)];
c1135.invariants = [(s) => parentTags('parent[', 1)(s)];
cMaxSpacing.invariants = [(s) => parentTags('parent[', 1)(s)];
c1319.invariants = [(s) => parentTags('parent[', 0)(s)];
/** Flow invariants: capacity, conservation, residual list == (cap - flow) forward arcs + flow backward arcs, 'flow so far' == net outflow of the source. */
function flowInvariant(s: Step, _i: number, _steps: Step[], net: FlowIn): string | null {
  const g = sceneOfKind(s, 'graph');
  if (!g) return null;
  const label = (id: number) => String(g.nodes[id].label);
  const flows: number[] = [];
  const items: string[] = [];
  const back: string[] = [];
  for (let i = 0; i < g.edges.length; i++) {
    const m = /^(\d+)\/(\d+)$/.exec(String(g.edges[i].weight));
    if (!m) return `edge ${i} has no flow/capacity label`;
    const f = Number(m[1]);
    if (Number(m[2]) !== net.edges[i].cap) return `edge ${i} capacity label ${m[2]} != ${net.edges[i].cap}`;
    if (f < 0 || f > net.edges[i].cap) return `edge ${i} flow ${f} outside [0, ${net.edges[i].cap}]`;
    flows.push(f);
  }
  // residual list in arc order: arc 2i forward (cap - f), arc 2i+1 backward (f)
  net.edges.forEach((e, i) => {
    if (net.edges[i].cap - flows[i] > 0) items.push(`${label(e.u)} → ${label(e.v)}: ${e.cap - flows[i]}`);
    if (flows[i] > 0) back.push(`${label(e.v)} → ${label(e.u)}: ${flows[i]}  (undo)`);
  });
  const want = net.edges.flatMap((e, i) => [
    ...(e.cap - flows[i] > 0 ? [`${label(e.u)} → ${label(e.v)}: ${e.cap - flows[i]}`] : []),
    ...(flows[i] > 0 ? [`${label(e.v)} → ${label(e.u)}: ${flows[i]}  (undo)`] : []),
  ]);
  const got = auxItems(s, 'residual capacities');
  if (JSON.stringify(want) !== JSON.stringify(got)) return `residual list ${JSON.stringify(got)} != cap-flow arcs ${JSON.stringify(want)}`;
  for (let v = 0; v < net.n; v++) {
    if (v === net.s || v === net.t) continue;
    const inn = net.edges.reduce((a, e, i) => a + (e.v === v ? flows[i] : 0), 0), outt = net.edges.reduce((a, e, i) => a + (e.u === v ? flows[i] : 0), 0);
    if (inn !== outt) return `flow is not conserved at node ${v} (in ${inn}, out ${outt})`;
  }
  const netOut = net.edges.reduce((a, e, i) => a + (e.u === net.s ? flows[i] : 0) - (e.v === net.s ? flows[i] : 0), 0);
  const shownFlow = num(s, 'flow so far');
  if (shownFlow !== null && shownFlow !== netOut) return `'flow so far' ${shownFlow} != net outflow of the source ${netOut}`;
  return null;
}
cMaxFlow.invariants = [flowInvariant];
cMinCut.invariants = [flowInvariant];
cMatching.invariants = [(s, i, st, inp) => {
  const { L, R, pairs } = inp as { L: number; R: number; pairs: [number, number][] };
  const n = L + R + 2;
  return flowInvariant(s, i, st, { n, s: 0, t: n - 1, edges: [
    ...Array.from({ length: L }, (_, l) => ({ u: 0, v: 1 + l, cap: 1 })),
    ...Array.from({ length: R }, (_, x) => ({ u: 1 + L + x, v: n - 1, cap: 1 })),
    ...pairs.map(([l, x]) => ({ u: 1 + l, v: 1 + L + x, cap: 1 })),
  ] });
}];

/** number of green ('chosen') edges drawn must equal a counter shown in a var. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chosenCount(expect: (s: Step, input: any) => number | null): (s: Step, i: number, st: Step[], input: any) => string | null {
  return (s, _i, _st, input) => {
    const want = expect(s, input);
    if (want === null) return null;
    const got = (sceneOfKind(s, 'graph')?.edges ?? []).filter((e) => e.state === 'chosen').length;
    return got === want ? null : `${got} green edges drawn but the counters say ${want}`;
  };
}
c1135.invariants = [...(c1135.invariants ?? []), chosenCount((s) => lead(s, 'used'))];
cMaxSpacing.invariants = [...(cMaxSpacing.invariants ?? []), chosenCount((s, inp: MIn) => { const c = num(s, 'clusters'); return c === null ? null : inp.n - c; })];
c1319.invariants = [...(c1319.invariants ?? []), chosenCount((s, inp: CIn) => { const c = num(s, 'components'); return c === null ? null : inp.n - c; })];
cPrim.invariants = [...(cPrim.invariants ?? []), chosenCount((s) => { const t = lead(s, 'in tree'); return t === null ? null : Math.max(0, t - 1); })];
c1168.invariants = [...(c1168.invariants ?? []), chosenCount((s) => { const t = lead(s, 'in tree'); return t === null ? null : Math.max(0, t - 1); })];

/** var "<key>" must equal list entry of the node named by var "<nodeKey>" (or both be unset). */
function varVsList(nodeKey: string, key: string, auxPrefix: string, base: number): (s: Step) => string | null {
  return (s) => {
    const node = num(s, nodeKey), v = shown(s, key);
    if (node === null) return v === null ? null : `${key} is set (${v}) while ${nodeKey} is not`;
    const item = auxItems(s, auxPrefix)[node - base];
    const want = item === undefined ? undefined : item.slice(item.indexOf(': ') + 2);
    return String(v) === want ? null : `${key} = ${v} but the list says ${item}`;
  };
}
c743.invariants = [...(c743.invariants ?? []), varVsList('node', 'dist[node]', 'dist[', 1)];
c1514.invariants = [...(c1514.invariants ?? []), varVsList('node', 'prob[node]', 'best probability', 0)];
c787.invariants = [...(c787.invariants ?? []), (s) => {
  const dst = Number((sceneOfKind(s, 'graph')?.pointers ?? []).find((p) => p.id === 'dst')?.index);
  const item = auxItems(s, 'dist[ ]')[dst];
  return String(shown(s, 'dist[dst]')) === item.slice(item.indexOf(': ') + 2) ? null : `dist[dst] var disagrees with ${item}`;
}];

/** On the last step the result panel's title must equal the answer derived from the oracle's final state. */
function resultIs<I>(c: OracleCase<I>, want: (last: State, input: I) => string): void {
  const inv = (step: Step, i: number, steps: Step[], input: I): string | null => {
    if (i !== steps.length - 1) return null;
    const last = c.oracle(input).slice(-1)[0];
    const w = want(last, input);
    return step.result?.title === w ? null : `result title ${JSON.stringify(step.result?.title)} != expected ${JSON.stringify(w)}`;
  };
  c.invariants = [...(c.invariants ?? []), inv as never];
}
const lst = (xs: unknown) => `[${(xs as string[]).join(', ')}]`;
resultIs(c1135, (l, { n }) => String((l.used as number) === n - 1 ? l.cost : -1));
resultIs(c1319, (l) => String(l.answer));
resultIs(c1168, (l, { wells }) => String((l.taken as number) === wells.length + 1 ? l.total : -1));
resultIs(cPrim, (l, { n }) => String((l.taken as number) === n ? l.total : -1));
resultIs(c1584, (l) => String(l.total));
resultIs(cMaxSpacing, (l) => String(l.spacing));
resultIs(c684, (l) => String(l.answer));
resultIs(c547, (l) => String(l.provinces));
resultIs(c990, (l) => String(l.verdict));
resultIs(c207, (l) => String(l.ok));
resultIs(c743, (l) => String(l.answer));
resultIs(c785, (l) => String(l.verdict));
resultIs(c886, (l) => String(l.verdict));
resultIs(c787, (l) => String(l.answer));
resultIs(c1631, (l) => String(l.answer));
resultIs(c1334, (l) => String(l.best));
resultIs(cUFProv, (l) => String(l.components));
resultIs(c305, (l) => lst(l.out));
resultIs(cRollback, (l) => lst(l.answers));
resultIs(cWeighted, (l) => lst(l.answers));
resultIs(cLca, (l) => lst(l.answers));
resultIs(cDist, (l) => lst(l.answers));
resultIs(cHldLca, (l) => lst(l.answers));
resultIs(cHldPath, (l) => lst(l.answers));
resultIs(c1483, (l) => lst(l.answers));
resultIs(cGfgTree, (l) => (l.isTree === 'true' ? 'Yes' : 'No'));
resultIs(cMaxFlow, (l) => String(l.flow));
resultIs(cFW, (l, { n }) => { const m = l.mat as string[]; return `[${Array.from({ length: n }, (_, i) => `[${m.slice(i * n, i * n + n).join(',')}]`).join(',')}]`; });
resultIs(cTC, (l) => String(l.pairs));
resultIs(cArt, (l) => `[${(l.cuts as string[]).join(',')}]`);
resultIs(cScc, (l) => {
  const sets = (l.comps as string[]).map((x) => x.replace(/^\d+: \{/, '').replace(/\}$/, '').split(', ').map(Number).sort((a, b) => a - b)).sort((a, b) => a[0] - b[0]);
  return `[${sets.map((c) => `[${c.join(',')}]`).join(',')}]`;
});
resultIs(c1489, (l) => {
  const v = l.verdict as string[];
  const ids = (name: string) => v.flatMap((x, i) => (x === name ? [i] : [])).join(',');
  return `[[${ids('critical')}],[${ids('pseudo-critical')}]]`;
});
resultIs(c1192, (l) => {
  const ps = (l.bridges as string[]).map((x) => x.split('–').map(Number) as [number, number]);
  ps.sort((a, b) => Math.min(a[0], a[1]) - Math.min(b[0], b[1]) || Math.max(a[0], a[1]) - Math.max(b[0], b[1]));
  return `[${ps.map(([a, b]) => `[${a},${b}]`).join(',')}]`;
});
resultIs(c310, (l) => lst((l.tag as string[]).flatMap((t, i) => (t.startsWith('peeled') ? [] : [String(i)]))));
resultIs(c269, (l, { words }) => {
  const n = new Set(words.join('')).size;
  const order = l.order as string[];
  return order.length === n ? `"${order.join('')}"` : '""';
});
resultIs(c210, (l, { n }) => ((l.order as string[]).length === n ? lst(l.order) : '[]'));
resultIs(cMinCut, (l, net) => String((l.cut as number[]).reduce((a, i) => a + net.edges[i].cap, 0)));
resultIs(cMatching, (l) => String((l.matched as number[]).length));
resultIs(cHldChains, (l) => (l.chains as string[]).join(' '));
/** Bellman-Ford end result vs. an independent Floyd–Warshall: a reachable negative cycle, else the exact distance vector. */
cBF.invariants = [...(cBF.invariants ?? []), (step, i, steps, { n, src, edges }) => {
  if (i !== steps.length - 1) return null;
  const d = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => (a === b ? 0 : Infinity)));
  edges.forEach((e) => { d[e.u][e.v] = Math.min(d[e.u][e.v], e.w); });
  for (let k = 0; k < n; k++) for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (d[a][k] + d[k][b] < d[a][b]) d[a][b] = d[a][k] + d[k][b];
  // after n rounds of FW with negative cycles d[x][x] < 0 for nodes on such a cycle; reachable from src means d[src][x] < Infinity
  const negReach = d.some((row, x) => row[x] < 0 && d[src][x] < Infinity);
  const want = negReach ? 'negative cycle' : `[${d[src].map(dd).join(', ')}]`;
  return step.result?.title === want ? null : `result ${JSON.stringify(step.result?.title)} != ${JSON.stringify(want)} (independent Floyd–Warshall)`;
}];
/** Arbitrage: cycle exists iff some d[x][x] < 0; when shown, the printed cycle must be a real cycle with a negative total. */
cNegCycle.invariants = [...(cNegCycle.invariants ?? []), (step, i, steps, { n, edges }) => {
  if (i !== steps.length - 1) return null;
  const d = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => (a === b ? 0 : Infinity)));
  edges.forEach((e) => { d[e.u][e.v] = Math.min(d[e.u][e.v], e.w); });
  for (let k = 0; k < n; k++) for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (d[a][k] + d[k][b] < d[a][b]) d[a][b] = d[a][k] + d[k][b];
  const has = d.some((row, x) => row[x] < 0);
  if (step.result?.title !== String(has)) return `result ${JSON.stringify(step.result?.title)} but a negative cycle ${has ? 'exists' : 'does not exist'}`;
  if (!has) return null;
  const m = /Negative cycle: ([\d → ]+) \(total (-?\d+)\)/.exec(step.result?.text ?? '');
  if (!m) return `cannot read the cycle from "${step.result?.text}"`;
  const path = m[1].split(' → ').map(Number);
  if (path[0] !== path[path.length - 1]) return 'cycle path does not close';
  let tot = 0;
  for (let t = 0; t + 1 < path.length; t++) {
    const e = edges.find((x) => x.u === path[t] && x.v === path[t + 1]);
    if (!e) return `cycle uses a missing edge ${path[t]}>${path[t + 1]}`;
    tot += e.w;
  }
  if (tot !== Number(m[2]) || tot >= 0) return `cycle total ${tot} != printed ${m[2]} or not negative`;
  return null;
}];
/** The printed odd cycle must be a simple cycle of odd length along real edges; "bipartite" iff the graph is 2-colourable. */
cOdd.invariants = [...(cOdd.invariants ?? []), (step, i, steps, { n, edges }) => {
  if (i !== steps.length - 1) return null;
  const adj = adjAsc(n, 0, edges);
  const col = new Array<number>(n).fill(-1); let bip = true;
  for (let s0 = 0; s0 < n; s0++) if (col[s0] < 0) { col[s0] = 0; const q = [s0]; for (let h = 0; h < q.length; h++) for (const v of adj[q[h]]) { if (col[v] < 0) { col[v] = 1 - col[q[h]]; q.push(v); } else if (col[v] === col[q[h]]) bip = false; } }
  const t = step.result?.title ?? '';
  if (bip) return t === 'bipartite' ? null : `graph is bipartite but result is ${t}`;
  const cyc = t.replace(/[\[\]]/g, '').split(',').map(Number);
  if (cyc.length % 2 === 0 || new Set(cyc).size !== cyc.length) return `printed cycle ${t} is not an odd simple cycle`;
  for (let k = 0; k < cyc.length; k++) { const a = cyc[k], b = cyc[(k + 1) % cyc.length]; if (!adj[a].includes(b)) return `printed cycle ${t} uses a non-edge ${a}-${b}`; }
  return null;
}];

export const cases: CaseModule['cases'] = [
  c1135, c1319, c1168, cPrim, c1584, cMaxSpacing, c1489, c684, c547, c990,
  c207, c210, c269, c310, c743, c785, c886, c787, c1514, c1631, c1334, c1192, cArt, cScc,
  cBF, cNegCycle, cFW, cTC, cMaxFlow, cMinCut, cMatching,
  c305, cUFProv, cRollback,
  cWeighted, cGfgTree, cOdd, c1483, cLca, cDist, cHldChains, cHldLca, cHldPath,
  // @@NEXT@@
];
