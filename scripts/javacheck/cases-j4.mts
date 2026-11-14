import type { Step } from '../../src/engine/types.ts';
import type { JavaCaseModule } from './types.ts';
import { ALL_PROBLEMS } from '../../src/problems/registry.ts';

/**
 * J4: graph algorithms (union-find, MST, shortest paths, flow, SCC, bipartite, LCA, HLD) and bits / math / sorting / string-matching problems.
 * `main` builds Java literals from the input and calls the displayed code; `expected` comes from the animation's final vars or an independent TS reference.
 */
type E = { u: number; v: number; w: number };
type Case = JavaCaseModule['cases'][number];
const last = (steps: Step[]) => steps[steps.length - 1];
const ia = (a: number[]) => `{${a.join(', ')}}`;
const im = (m: number[][]) => `{${m.map(ia).join(', ')}}`;
const jstr = (s: string) => JSON.stringify(s);
const sa = (a: string[]) => `{${a.map(jstr).join(', ')}}`;
const lit = (x: number) => (Number.isInteger(x) ? `${x}.0` : String(x));
const triples = (es: E[], off = 0) => im(es.map((e) => [e.u + off, e.v + off, e.w]));
const pairs = (es: { u: number; v: number }[]) => im(es.map((e) => [e.u, e.v]));
const fmtList = (a: (number | string)[]) => `[${a.join(', ')}]`;
const num = (x: unknown) => Number(x);

/** union-find helpers (independent reference) */
function ufFind(p: number[], x: number): number { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; }

export const cases: Case[] = [];
const add = (...c: Case[]) => { cases.push(...c); };

/* ============================== chunk 1 ============================== */
type KIn = { n: number; edges: E[] };
add(
  {
    slug: '1135-connecting-cities-with-minimum-cost',
    main: ({ n, edges }: KIn) => `            int[][] c = ${triples(edges)};\n            System.out.println(new Solution().minimumCost(${n}, c));`,
    expected: ({ n, edges }: KIn) => {
      const o = edges.map((e, i) => ({ e, i })).sort((a, b) => a.e.w - b.e.w || a.i - b.i);
      const p = Array.from({ length: n + 1 }, (_, i) => i); let tot = 0, used = 0;
      for (const { e } of o) { const a = ufFind(p, e.u), b = ufFind(p, e.v); if (a !== b) { p[a] = b; tot += e.w; used++; } }
      return String(used === n - 1 ? tot : -1);
    },
  },
  {
    slug: '1168-optimize-water-distribution-in-a-village',
    main: ({ wells, pipes }: { wells: number[]; pipes: E[] }) => `            int[] w = ${ia(wells)};\n            int[][] p = ${triples(pipes)};\n            System.out.println(new Solution().minCostToSupplyWater(${wells.length}, w, p));`,
    expected: (_i, steps) => String(last(steps).vars['cost so far']),
  },
  {
    slug: '1192-critical-connections-in-a-network',
    extra: 'class H { static String pairs(List<List<Integer>> r) { List<int[]> l = new ArrayList<>(); for (List<Integer> p : r) l.add(new int[]{Math.min(p.get(0), p.get(1)), Math.max(p.get(0), p.get(1))}); l.sort((a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]); StringBuilder sb = new StringBuilder("["); for (int i = 0; i < l.size(); i++) { if (i > 0) sb.append(", "); sb.append("[" + l.get(i)[0] + ", " + l.get(i)[1] + "]"); } return sb.append("]").toString(); } }',
    main: ({ n, edges }: { n: number; edges: { u: number; v: number }[] }) =>
      `            List<List<Integer>> c = new ArrayList<>();\n${edges.map((e) => `            c.add(List.of(${e.u}, ${e.v}));`).join('\n')}\n            System.out.println(H.pairs(new Solution().criticalConnections(${n}, c)));`,
    expected: ({ n, edges }: { n: number; edges: { u: number; v: number }[] }) => {
      const comps = (skip: number) => { const p = Array.from({ length: n }, (_, i) => i); edges.forEach((e, i) => { if (i !== skip) p[ufFind(p, e.u)] = ufFind(p, e.v); }); return new Set(p.map((_, i) => ufFind(p, i))).size; };
      const base = comps(-1);
      const br = edges.flatMap((e, i) => (comps(i) > base ? [[Math.min(e.u, e.v), Math.max(e.u, e.v)]] : []));
      br.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      return `[${br.map((b) => `[${b[0]}, ${b[1]}]`).join(', ')}]`;
    },
  },
  {
    slug: '1319-number-of-operations-to-make-network-connected',
    main: ({ n, cables }: { n: number; cables: { u: number; v: number }[] }) => `            int[][] c = ${pairs(cables)};\n            System.out.println(new Solution().makeConnected(${n}, c));`,
    expected: (_i, steps) => String(last(steps).vars.answer),
  },
  {
    slug: '1334-find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance',
    main: ({ n, threshold, edges }: { n: number; threshold: number; edges: E[] }) => `            int[][] e = ${triples(edges)};\n            System.out.println(new Solution().findTheCity(${n}, e, ${threshold}));`,
    expected: (_i, steps) => String(last(steps).vars['best city']),
  },
  {
    slug: '1483-kth-ancestor-of-a-tree-node',
    noWrap: true,
    main: ({ par, queries }: { par: number[]; queries: number[][] }) =>
      `            TreeAncestor t = new TreeAncestor(${par.length}, new int[]${ia(par)});\n            int[][] q = ${im(queries)};\n            StringBuilder sb = new StringBuilder();\n            for (int[] x : q) sb.append(t.getKthAncestor(x[0], x[1])).append(' ');\n            System.out.println(sb.toString().trim());`,
    expected: ({ par, queries }: { par: number[]; queries: number[][] }) =>
      queries.map(([node, k]) => { let v = node; for (let i = 0; i < k && v >= 0; i++) v = par[v]; return v; }).join(' '),
  },
  {
    slug: '1489-find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree',
    main: ({ n, edges }: KIn) =>
      `            int[][] e = ${triples(edges)};\n            List<List<Integer>> r = new Solution().findCriticalAndPseudoCriticalEdges(${n}, e);\n            List<Integer> a = new ArrayList<>(r.get(0)), b = new ArrayList<>(r.get(1));\n            Collections.sort(a); Collections.sort(b);\n            System.out.println(a + " " + b);`,
    expected: ({ n, edges }: KIn) => {
      const order = edges.map((_, i) => i).sort((a, b) => edges[a].w - edges[b].w || a - b);
      const mst = (skip: number, force: number) => {
        const p = Array.from({ length: n }, (_, i) => i); let tot = 0, used = 0;
        const join = (i: number) => { const a = ufFind(p, edges[i].u), b = ufFind(p, edges[i].v); if (a !== b) { p[a] = b; tot += edges[i].w; used++; } };
        if (force >= 0) join(force);
        for (const i of order) if (i !== skip) join(i);
        return used === n - 1 ? tot : Infinity;
      };
      const best = mst(-1, -1); const crit: number[] = [], pseudo: number[] = [];
      edges.forEach((_, i) => { if (mst(i, -1) > best) crit.push(i); else if (mst(-1, i) === best) pseudo.push(i); });
      return `${fmtList(crit)} ${fmtList(pseudo)}`;
    },
  },
  {
    slug: '1514-path-with-maximum-probability',
    main: ({ n, start, end, edges }: { n: number; start: number; end: number; edges: { u: number; v: number; p: number }[] }) =>
      `            int[][] e = ${pairs(edges)};\n            double[] sp = {${edges.map((x) => lit(x.p)).join(', ')}};\n            System.out.println(String.format(Locale.US, "%.5f", new Solution().maxProbability(${n}, e, sp, ${start}, ${end})));`,
    expected: (_i, steps) => String(last(steps).vars.answer),
  },
);
/* ============================== chunk 2 ============================== */
type DE = { u: number; v: number };
type GIn = { n: number; edges: DE[] };
/** Java statements building `List<Integer>[] name` (size `size`) from undirected edges */
const adjArr = (name: string, size: number, edges: DE[], directed = false) =>
  `            List<Integer>[] ${name} = new List[${size}];\n            for (int i = 0; i < ${size}; i++) ${name}[i] = new ArrayList<>();\n` +
  edges.map((e) => `            ${name}[${e.u}].add(${e.v});${directed ? '' : ` ${name}[${e.v}].add(${e.u});`}`).join('\n');
/** adjacency rows (ascending) of an undirected graph on 0..n-1 */
const adjRows = (n: number, edges: DE[], lo = 0): number[][] => {
  const a: number[][] = Array.from({ length: n }, () => []);
  edges.forEach((e) => { a[e.u - lo].push(e.v); a[e.v - lo].push(e.u); });
  return a.map((l) => l.sort((x, y) => x - y));
};
const INFD = 'class H { static String d(int[] a) { if (a == null) return "NEG"; StringBuilder sb = new StringBuilder(); for (int x : a) sb.append(x >= Integer.MAX_VALUE / 2 ? "INF" : String.valueOf(x)).append(\' \'); return sb.toString().trim(); }\n  static String m(int[][] a) { StringBuilder sb = new StringBuilder(); for (int[] r : a) sb.append(d(r)).append(\'|\'); return sb.toString(); } }';
const numStr = (x: number) => (x === Infinity ? 'INF' : String(x));

add(
  {
    slug: '1584-min-cost-to-connect-all-points',
    main: ({ pts }: { pts: number[][] }) => `            int[][] p = ${im(pts)};\n            System.out.println(new Solution().minCostConnectPoints(p));`,
    expected: (_i, steps) => String(last(steps).vars['total cost']),
  },
  {
    slug: '1631-path-with-minimum-effort',
    main: ({ grid }: { grid: number[][] }) => `            int[][] h = ${im(grid)};\n            System.out.println(new Solution().minimumEffortPath(h));`,
    expected: (_i, steps) => String(last(steps).vars.answer),
  },
  {
    slug: '207-course-schedule',
    main: ({ n, edges }: GIn) => `            int[][] pre = ${im(edges.map((e) => [e.v, e.u]))};\n            System.out.println(new Solution().canFinish(${n}, pre));`,
    expected: (_i, steps) => String(last(steps).vars['can finish']),
  },
  {
    slug: '210-course-schedule-ii',
    main: ({ n, edges }: GIn) => `            int[][] pre = ${im(edges.map((e) => [e.v, e.u]))};\n            System.out.println(Arrays.toString(new Solution().findOrder(${n}, pre)));`,
    expected: ({ n, edges }: GIn) => {
      const adj: number[][] = Array.from({ length: n }, () => []); const indeg = new Array<number>(n).fill(0);
      edges.forEach((e) => { adj[e.u].push(e.v); indeg[e.v]++; });
      const q: number[] = []; for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
      const order: number[] = [];
      while (q.length) { const u = q.shift()!; order.push(u); for (const v of adj[u]) if (--indeg[v] === 0) q.push(v); }
      return fmtList(order.length === n ? order : []);
    },
  },
  {
    slug: '269-alien-dictionary',
    // HashSet iteration order is unspecified, so several alphabets can be valid: check validity, not equality
    extra: `class H { static String chk(String[] w, String r) {
        Set<Character> letters = new LinkedHashSet<>(); for (String s : w) for (char c : s.toCharArray()) letters.add(c);
        if (r.isEmpty()) return "EMPTY";
        Map<Character, Integer> pos = new HashMap<>();
        for (int i = 0; i < r.length(); i++) if (pos.put(r.charAt(i), i) != null) return "BAD dup " + r;
        if (!pos.keySet().equals(letters)) return "BAD letters " + r;
        for (int i = 0; i + 1 < w.length; i++) {
            String a = w[i], b = w[i + 1];
            if (a.length() > b.length() && a.startsWith(b)) return "BAD prefix case " + r;
            for (int j = 0; j < Math.min(a.length(), b.length()); j++)
                if (a.charAt(j) != b.charAt(j)) { if (pos.get(a.charAt(j)) > pos.get(b.charAt(j))) return "BAD order " + r; break; }
        }
        return "OK"; } }`,
    main: ({ words }: { words: string[] }) => `            String[] w = ${sa(words)};\n            System.out.println(H.chk(w, new Solution().alienOrder(w)));`,
    expected: ({ words }: { words: string[] }) => {
      const letters = [...new Set(words.join('').split(''))];
      const adj = new Map<string, Set<string>>(), indeg = new Map<string, number>();
      letters.forEach((c) => { adj.set(c, new Set()); indeg.set(c, 0); });
      for (let i = 0; i + 1 < words.length; i++) {
        const a = words[i], b = words[i + 1];
        if (a.length > b.length && a.startsWith(b)) return 'EMPTY';
        for (let j = 0; j < Math.min(a.length, b.length); j++) if (a[j] !== b[j]) { if (!adj.get(a[j])!.has(b[j])) { adj.get(a[j])!.add(b[j]); indeg.set(b[j], indeg.get(b[j])! + 1); } break; }
      }
      const q = letters.filter((c) => indeg.get(c) === 0); let cnt = 0;
      while (q.length) { const c = q.shift()!; cnt++; for (const d of adj.get(c)!) { indeg.set(d, indeg.get(d)! - 1); if (indeg.get(d) === 0) q.push(d); } }
      return cnt === letters.length ? 'OK' : 'EMPTY';
    },
    notes: 'validity check (all letters once, every adjacent-word constraint) because HashSet neighbour order makes several alphabets valid; the animation and TS reference only decide solvable vs "".',
  },
  {
    slug: '305-number-of-islands-ii',
    main: ({ m, n, pos }: { m: number; n: number; pos: number[][] }) => `            int[][] p = ${im(pos)};\n            System.out.println(new Solution().numIslands2(${m}, ${n}, p));`,
    expected: (_i, steps) => String(last(steps).vars.output),
  },
  {
    slug: '310-minimum-height-trees',
    main: ({ n, edges }: GIn) => `            int[][] e = ${pairs(edges)};\n            List<Integer> r = new ArrayList<>(new Solution().findMinHeightTrees(${n}, e));\n            Collections.sort(r);\n            System.out.println(r);`,
    expected: ({ n, edges }: GIn) => {
      const adj = adjRows(n, edges); const hs: number[] = [];
      for (let r = 0; r < n; r++) { const d = new Array<number>(n).fill(-1); d[r] = 0; const q = [r]; let h = 0; while (q.length) { const u = q.shift()!; h = Math.max(h, d[u]); for (const v of adj[u]) if (d[v] < 0) { d[v] = d[u] + 1; q.push(v); } } hs.push(h); }
      const mn = Math.min(...hs); return fmtList(hs.flatMap((h, i) => (h === mn ? [i] : [])));
    },
  },
  {
    slug: '547-number-of-provinces',
    main: ({ n, edges }: GIn) => {
      const m = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
      edges.forEach((e) => { m[e.u][e.v] = 1; m[e.v][e.u] = 1; });
      return `            int[][] g = ${im(m)};\n            System.out.println(new Solution().findCircleNum(g));`;
    },
    expected: (_i, steps) => String(last(steps).vars.provinces),
  },
  {
    slug: '684-redundant-connection',
    main: ({ edges }: { edges: DE[] }) => `            int[][] e = ${pairs(edges)};\n            System.out.println(Arrays.toString(new Solution().findRedundantConnection(e)));`,
    expected: (_i, steps) => String(last(steps).vars.answer),
  },
  {
    slug: '743-network-delay-time',
    main: ({ n, k, edges }: { n: number; k: number; edges: E[] }) => `            int[][] t = ${triples(edges)};\n            System.out.println(new Solution().networkDelayTime(t, ${n}, ${k}));`,
    expected: (_i, steps) => String(last(steps).vars.answer),
  },
  {
    slug: '785-is-graph-bipartite',
    main: ({ n, edges }: GIn) => `            int[][] g = ${im(adjRows(n, edges))};\n            System.out.println(new Solution().isBipartite(g));`,
    expected: (_i, steps) => String(last(steps).vars.bipartite),
  },
  {
    slug: '787-cheapest-flights-within-k-stops',
    main: ({ n, src, dst, k, edges }: { n: number; src: number; dst: number; k: number; edges: E[] }) => `            int[][] f = ${triples(edges)};\n            System.out.println(new Solution().findCheapestPrice(${n}, f, ${src}, ${dst}, ${k}));`,
    expected: (_i, steps) => String(last(steps).vars.answer),
  },
  {
    slug: '886-possible-bipartition',
    main: ({ n, edges }: GIn) => `            int[][] d = ${pairs(edges)};\n            System.out.println(new Solution().possibleBipartition(${n}, d));`,
    expected: (_i, steps) => String(last(steps).vars.possible),
  },
  {
    slug: '990-satisfiability-of-equality-equations',
    main: ({ eqs }: { eqs: { a: string; b: string; eq: boolean }[] }) => `            String[] q = ${sa(eqs.map((e) => `${e.a}${e.eq ? '==' : '!='}${e.b}`))};\n            System.out.println(new Solution().equationsPossible(q));`,
    expected: (_i, steps) => String(last(steps).vars.verdict),
  },
  {
    slug: 'alg-articulation-points-cut-vertices',
    main: ({ n, edges }: GIn) => `${adjArr('adj', n, edges)}\n            System.out.println(new Solution().articulationPoints(${n}, adj));`,
    expected: ({ n, edges }: GIn) => {
      const comps = (skip: number) => { const p = Array.from({ length: n }, (_, i) => i); edges.forEach((e) => { if (e.u !== skip && e.v !== skip) p[ufFind(p, e.u)] = ufFind(p, e.v); }); return new Set(p.flatMap((_, i) => (i === skip ? [] : [ufFind(p, i)]))).size; };
      const base = comps(-1);
      return fmtList(Array.from({ length: n }, (_, v) => v).filter((v) => comps(v) > base));
    },
  },
  {
    slug: 'alg-bellman-ford-shortest-paths-negative-edges',
    extra: INFD,
    main: ({ n, src, edges }: { n: number; src: number; edges: E[] }) => `            int[][] e = ${triples(edges)};\n            System.out.println(H.d(new Solution().bellmanFord(${n}, e, ${src})));`,
    expected: ({ n, src, edges }: { n: number; src: number; edges: E[] }) => {
      const d = new Array<number>(n).fill(Infinity); d[src] = 0;
      for (let r = 1; r <= n - 1; r++) { let ch = false; for (const e of edges) if (d[e.u] !== Infinity && d[e.u] + e.w < d[e.v]) { d[e.v] = d[e.u] + e.w; ch = true; } if (!ch) break; }
      for (const e of edges) if (d[e.u] !== Infinity && d[e.u] + e.w < d[e.v]) return 'NEG';
      return d.map(numStr).join(' ');
    },
  },
  {
    slug: 'alg-floyd-warshall-all-pairs-shortest-paths',
    extra: INFD,
    main: ({ n, edges }: { n: number; edges: E[] }) => `            int[][] e = ${triples(edges)};\n            System.out.println(H.m(new Solution().floydWarshall(${n}, e)));`,
    expected: ({ n, edges }: { n: number; edges: E[] }) => {
      const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
      edges.forEach((e) => { d[e.u][e.v] = e.w; });
      for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
      return d.map((r) => r.map(numStr).join(' ') + '|').join('');
    },
  },
  {
    slug: 'alg-max-flow-edmonds-karp',
    main: ({ n, s, t, edges }: { n: number; s: number; t: number; edges: { u: number; v: number; cap: number }[] }) => `            int[][] e = ${im(edges.map((x) => [x.u, x.v, x.cap]))};\n            System.out.println(new Solution().maxFlow(${n}, e, ${s}, ${t}));`,
    expected: (_i, steps) => String(last(steps).vars['flow so far']),
  },
);
/* ============================== chunk 3 ============================== */
const adjW = (name: string, n: number, edges: E[], directed = false) =>
  `            List<int[]>[] ${name} = new List[${n}];\n            for (int i = 0; i < ${n}; i++) ${name}[i] = new ArrayList<>();\n` +
  edges.map((e) => `            ${name}[${e.u}].add(new int[]{${e.v}, ${e.w}});${directed ? '' : ` ${name}[${e.v}].add(new int[]{${e.u}, ${e.w}});`}`).join('\n');
/** transitive closure of a directed graph (reference) */
const closure = (n: number, edges: DE[]) => {
  const r = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j));
  edges.forEach((e) => { r[e.u][e.v] = true; });
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (r[i][k] && r[k][j]) r[i][j] = true;
  return r;
};
const FLOWH = `class H { static String cut(List<int[]> c) { List<String> l = new ArrayList<>(); int tot = 0; for (int[] e : c) { l.add(e[0] + ">" + e[1] + ":" + e[2]); tot += e[2]; } Collections.sort(l); return l + " total=" + tot; }
  static String scc(List<List<Integer>> r) { List<List<Integer>> c = new ArrayList<>(); for (List<Integer> x : r) { List<Integer> y = new ArrayList<>(x); Collections.sort(y); c.add(y); } c.sort((a, b) -> a.get(0) - b.get(0)); return c.toString(); }
  static String b(boolean[][] a) { StringBuilder sb = new StringBuilder(); for (boolean[] r : a) { for (boolean x : r) sb.append(x ? 1 : 0); sb.append('|'); } return sb.toString(); }
  static String arb(int[][] e, List<Integer> res) {
    if (res.isEmpty()) return "NONE";
    int k = res.size(), sum = 0; if (new HashSet<>(res).size() != k) return "BAD dup " + res;
    for (int i = 0; i < k; i++) { int a = res.get(i), b = res.get((i + 1) % k), best = Integer.MAX_VALUE; for (int[] x : e) if (x[0] == a && x[1] == b) best = Math.min(best, x[2]); if (best == Integer.MAX_VALUE) return "BAD no edge " + res; sum += best; }
    return sum < 0 ? "CYCLE" : "BAD nonneg " + res; } }`;
/** max flow (reference): capacity matrix, BFS augmenting paths; returns residual-reachable set from s */
function flowRef(n: number, s: number, t: number, edges: { u: number; v: number; cap: number }[]) {
  const c = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  edges.forEach((e) => { c[e.u][e.v] += e.cap; });
  let flow = 0;
  const bfs = () => { const par = new Array<number>(n).fill(-1); par[s] = s; const q = [s]; for (let h = 0; h < q.length; h++) for (let v = 0; v < n; v++) if (par[v] < 0 && c[q[h]][v] > 0) { par[v] = q[h]; q.push(v); } return par; };
  for (;;) { const par = bfs(); if (par[t] < 0) break; let b = Infinity; for (let v = t; v !== s; v = par[v]) b = Math.min(b, c[par[v]][v]); for (let v = t; v !== s; v = par[v]) { c[par[v]][v] -= b; c[v][par[v]] += b; } flow += b; }
  const par = bfs();
  return { flow, side: par.map((p) => p >= 0) };
}
type FlowIn = { n: number; s: number; t: number; edges: { u: number; v: number; cap: number }[] };

add(
  {
    slug: 'alg-union-find-number-of-provinces-union-by-rank-path-compression',
    main: ({ isConnected }: { isConnected: number[][] }) => `            int[][] g = ${im(isConnected)};\n            System.out.println(new Solution().findCircleNum(g));`,
    expected: (_i, steps) => String(last(steps).vars.components),
  },
  {
    slug: 'cp-max-spacing-k-clustering-kruskal',
    main: ({ n, k, edges }: { n: number; k: number; edges: E[] }) => `            int[][] e = ${triples(edges)};\n            System.out.println(new Solution().maxSpacing(${n}, ${k}, e));`,
    expected: (_i, steps) => { const s = last(steps).vars.spacing; return s === undefined || s === '—' ? '-1' : String(s); },
  },
  {
    slug: 'cp-prims-mst-with-a-heap',
    main: ({ n, edges }: KIn) => `${adjW('adj', n, edges)}\n            System.out.println(new Solution().primMST(${n}, adj));`,
    expected: (_i, steps) => { const v = last(steps).vars; const [a, b] = String(v['in tree']).split('/').map(Number); return String(a === b ? v['cost so far'] : -1); },
  },
  {
    slug: 'cp-strongly-connected-components-tarjan',
    extra: FLOWH,
    main: ({ n, edges }: GIn) => `${adjArr('adj', n, edges, true)}\n            System.out.println(H.scc(new Solution().stronglyConnected(${n}, adj)));`,
    expected: ({ n, edges }: GIn) => {
      const r = closure(n, edges); const seen = new Array<boolean>(n).fill(false); const comps: number[][] = [];
      for (let i = 0; i < n; i++) if (!seen[i]) { const c = []; for (let j = 0; j < n; j++) if (r[i][j] && r[j][i]) { seen[j] = true; c.push(j); } comps.push(c); }
      comps.sort((a, b) => a[0] - b[0]);
      return `[${comps.map(fmtList).join(', ')}]`;
    },
  },
  {
    slug: 'cp-transitive-closure-warshall-reachability',
    extra: FLOWH,
    main: ({ n, edges }: GIn) => `            int[][] e = ${pairs(edges)};\n            System.out.println(H.b(new Solution().transitiveClosure(${n}, e)));`,
    expected: ({ n, edges }: GIn) => closure(n, edges).map((r) => r.map((x) => (x ? 1 : 0)).join('') + '|').join(''),
  },
  {
    slug: 'cp-negative-cycle-detection-currency-arbitrage',
    extra: FLOWH,
    main: ({ n, edges }: { n: number; edges: E[] }) => `            int[][] e = ${triples(edges)};\n            System.out.println(H.arb(e, new Solution().findArbitrage(${n}, e)));`,
    expected: ({ n, edges }: { n: number; edges: E[] }) => {
      const d = new Array<number>(n).fill(0); let upd = false;
      for (let r = 1; r <= n; r++) { upd = false; for (const e of edges) if (d[e.u] + e.w < d[e.v]) { d[e.v] = d[e.u] + e.w; upd = true; } if (!upd) break; }
      return upd ? 'CYCLE' : 'NONE';
    },
    notes: 'the cycle returned is validated (consecutive nodes joined by edges, total weight < 0) instead of compared node-for-node',
  },
  {
    slug: 'cp-minimum-cut-from-max-flow',
    extra: FLOWH,
    main: ({ n, s, t, edges }: FlowIn) => `            int[][] e = ${im(edges.map((x) => [x.u, x.v, x.cap]))};\n            System.out.println(H.cut(Solution.minCut(${n}, e, ${s}, ${t})));`,
    expected: ({ n, s, t, edges }: FlowIn) => {
      const { side } = flowRef(n, s, t, edges);
      const cut = edges.filter((e) => side[e.u] && !side[e.v]);
      return `[${cut.map((e) => `${e.u}>${e.v}:${e.cap}`).sort().join(', ')}] total=${cut.reduce((a, e) => a + e.cap, 0)}`;
    },
  },
  {
    slug: 'cp-maximum-bipartite-matching-flow',
    main: ({ L, R, pairs: p }: { L: number; R: number; pairs: number[][] }) => `            int[][] p = ${im(p)};\n            System.out.println(new Solution().maxMatching(${L}, ${R}, p));`,
    expected: (_i, steps) => String(last(steps).vars['flow so far']),
  },
);
/* ============================== chunk 4 ============================== */
const javaOf = (slug: string) => (ALL_PROBLEMS.find((p) => p.slug === slug)!.java as string[]).join('\n');
type TIn = { par: number[]; queries: number[][] };
const depthsOf = (par: number[]) => { const d = new Array<number>(par.length).fill(0); for (let v = 1; v < par.length; v++) d[v] = d[par[v]] + 1; return d; };
/** heavy-light decomposition reference: heavy child = first child with the strictly largest subtree; chains numbered in DFS order */
function hldRef(par: number[]) {
  const n = par.length, ch: number[][] = Array.from({ length: n }, () => []);
  for (let v = 1; v < n; v++) ch[par[v]].push(v);
  const size = new Array<number>(n).fill(1); for (let v = n - 1; v >= 1; v--) size[par[v]] += size[v];
  const heavy = new Array<number>(n).fill(-1);
  for (let v = 0; v < n; v++) for (const c of ch[v]) if (heavy[v] < 0 || size[c] > size[heavy[v]]) heavy[v] = c;
  const head = new Array<number>(n).fill(0), pos = new Array<number>(n).fill(0); let cur = 0;
  const assign = (v: number, h: number) => { head[v] = h; pos[v] = cur++; if (heavy[v] >= 0) assign(heavy[v], h); for (const c of ch[v]) if (c !== heavy[v]) assign(c, c); };
  assign(0, 0);
  return { head, pos };
}
/** Java statements that build the tree, run the DISPLAYED HLD class (cp-heavy-light-decomposition-chains) and leave `h`, `par`, `n`, `depth` in scope */
const hldBuild = (par: number[]) =>
  `            int[] par = ${ia(par)};\n            int n = par.length;\n            List<Integer>[] ch = new List[n];\n            for (int i = 0; i < n; i++) ch[i] = new ArrayList<>();\n            for (int v = 1; v < n; v++) ch[par[v]].add(v);\n` +
  `            HLD h = new HLD(); h.parent = par; h.size = new int[n]; h.heavy = new int[n]; h.head = new int[n]; h.pos = new int[n];\n            h.decompose(n, ch);\n` +
  `            int[] depth = new int[n]; for (int v = 1; v < n; v++) depth[v] = depth[par[v]] + 1;`;
const lcaRef = (par: number[], u: number, v: number) => { const d = depthsOf(par); while (u !== v) { if (d[u] < d[v]) [u, v] = [v, u]; u = par[u]; } return u; };
const GEN_H = `class H { static String odd(List<Integer>[] adj, List<Integer> c) {
    if (c.isEmpty()) return "NONE";
    int k = c.size(); if (k < 3 || k % 2 == 0 || new HashSet<>(c).size() != k) return "BAD shape " + c;
    for (int i = 0; i < k; i++) if (!adj[c.get(i)].contains(c.get((i + 1) % k))) return "BAD non-edge " + c;
    return "ODD"; } }`;
const qLoop = (call: string) => `            StringBuilder sb = new StringBuilder();\n            for (int[] x : q) sb.append(${call}).append(' ');\n            System.out.println(sb.toString().trim());`;

add(
  {
    slug: 'cp-union-find-with-rollback',
    noWrap: true,
    main: ({ n, ops }: { n: number; ops: { op: string; a?: number; b?: number }[] }) =>
      `            RollbackDSU d = new RollbackDSU(${n});\n            List<Boolean> ans = new ArrayList<>();\n` +
      ops.map((o) => (o.op === 'u' ? `            d.union(${o.a}, ${o.b});` : o.op === 'q' ? `            ans.add(d.connected(${o.a}, ${o.b}));` : '            d.rollback();')).join('\n') +
      '\n            System.out.println(ans);',
    expected: (_i, steps) => String(last(steps).vars.answers),
  },
  {
    slug: 'cp-weighted-union-find-ratios',
    noWrap: true,
    main: ({ eqs, queries }: { eqs: { a: string; b: string; k: number }[]; queries: { a: string; b: string }[] }) => {
      const val = new Map<string, number>(); const adj = new Map<string, [string, number][]>();
      const addE = (x: string, y: string, k: number) => { if (!adj.has(x)) adj.set(x, []); adj.get(x)!.push([y, k]); };
      eqs.forEach((e) => { addE(e.a, e.b, e.k); addE(e.b, e.a, 1 / e.k); });   // a/b = k  =>  val(a) = k * val(b)
      for (const s of adj.keys()) if (!val.has(s)) { val.set(s, 1); const st = [s]; while (st.length) { const x = st.pop()!; for (const [y, k] of adj.get(x)!) if (!val.has(y)) { val.set(y, val.get(x)! / k); st.push(y); } } }
      const comp = new Map<string, string>(); for (const s of adj.keys()) if (!comp.has(s)) { comp.set(s, s); const st = [s]; while (st.length) { const x = st.pop()!; for (const [y] of adj.get(x)!) if (!comp.has(y)) { comp.set(y, s); st.push(y); } } }
      const exp = queries.map((q) => (!adj.has(q.a) || !adj.has(q.b) || comp.get(q.a) !== comp.get(q.b) ? -1 : val.get(q.a)! / val.get(q.b)!));
      return `            RatioUnionFind d = new RatioUnionFind();\n${eqs.map((e) => `            d.union(${jstr(e.a)}, ${jstr(e.b)}, ${lit(e.k)});`).join('\n')}\n` +
        `            String[][] qs = {${queries.map((q) => `{${jstr(q.a)}, ${jstr(q.b)}}`).join(', ')}};\n            double[] exp = {${exp.map((x) => lit(x)).join(', ')}};\n            StringBuilder bad = new StringBuilder();\n` +
        `            for (int i = 0; i < qs.length; i++) { double r = d.query(qs[i][0], qs[i][1]); if (Math.abs(r - exp[i]) > 1e-9 * Math.max(1, Math.abs(exp[i]))) bad.append(i + ": got " + r + " want " + exp[i] + "; "); }\n            System.out.println(bad.length() == 0 ? "OK" : bad.toString());`;
    },
    expected: () => 'OK',
    notes: 'reference ratios (BFS over the equation graph) are computed in the harness and compared with a 1e-9 relative tolerance inside Java',
  },
  {
    slug: 'gfg-is-graph-a-tree',
    main: ({ n, edges }: GIn) => `            List<List<Integer>> adj = new ArrayList<>();\n            for (int i = 0; i < ${n}; i++) adj.add(new ArrayList<>());\n${edges.map((e) => `            adj.get(${e.u}).add(${e.v}); adj.get(${e.v}).add(${e.u});`).join('\n')}\n            System.out.println(new Solution().isTree(${n}, adj));`,
    expected: (_i, steps) => String(last(steps).vars['is tree']),
  },
  {
    slug: 'cp-find-an-odd-cycle',
    extra: GEN_H,
    main: ({ n, edges }: GIn) => `${adjArr('adj', n, edges)}\n            System.out.println(H.odd(adj, new Solution().findOddCycle(${n}, adj)));`,
    expected: ({ n, edges }: GIn) => {
      const adj = adjRows(n, edges); const col = new Array<number>(n).fill(-1); let bip = true;
      for (let s = 0; s < n; s++) if (col[s] < 0) { col[s] = 0; const q = [s]; for (let h = 0; h < q.length; h++) for (const v of adj[q[h]]) { if (col[v] < 0) { col[v] = 1 - col[q[h]]; q.push(v); } else if (col[v] === col[q[h]]) bip = false; } }
      return bip ? 'NONE' : 'ODD';
    },
    notes: 'the returned cycle is validated (odd length, simple, every consecutive pair an edge); presence of an odd cycle compared with an independent bipartiteness test',
  },
  {
    slug: 'cp-lowest-common-ancestor-via-binary-lifting',
    noWrap: true,
    main: ({ par, queries }: TIn) => `            LcaLifting t = new LcaLifting(${par.length}, new int[]${ia(par)});\n            int[][] q = ${im(queries)};\n${qLoop('t.lca(x[0], x[1])')}`,
    expected: ({ par, queries }: TIn) => queries.map(([u, v]) => lcaRef(par, u, v)).join(' '),
  },
  {
    slug: 'cp-distance-between-two-nodes-in-a-tree',
    noWrap: true,
    main: ({ par, queries }: TIn) => `            LcaLifting t = new LcaLifting(${par.length}, new int[]${ia(par)});\n            int[][] q = ${im(queries)};\n${qLoop('t.distance(x[0], x[1])')}`,
    expected: ({ par, queries }: TIn) => { const d = depthsOf(par); return queries.map(([u, v]) => d[u] + d[v] - 2 * d[lcaRef(par, u, v)]).join(' '); },
  },
  {
    slug: 'cp-heavy-light-decomposition-chains',
    noWrap: true,
    main: ({ par }: { par: number[] }) => `${hldBuild(par)}\n            System.out.println("head=" + Arrays.toString(h.head) + " pos=" + Arrays.toString(h.pos));`,
    expected: ({ par }: { par: number[] }) => { const { head, pos } = hldRef(par); return `head=${fmtList(head)} pos=${fmtList(pos)}`; },
  },
  {
    slug: 'cp-lca-via-heavy-light-decomposition',
    get extra() { return javaOf('cp-heavy-light-decomposition-chains'); },
    main: ({ par, queries }: TIn) => `${hldBuild(par)}\n            Solution s = new Solution(); s.parent = par; s.depth = depth; s.head = h.head;\n            int[][] q = ${im(queries)};\n${qLoop('s.lca(x[0], x[1])')}`,
    expected: ({ par, queries }: TIn) => queries.map(([u, v]) => lcaRef(par, u, v)).join(' '),
    notes: 'head[] comes from the displayed HLD class of cp-heavy-light-decomposition-chains; the three fields (parent, depth, head) the snippet reads were added as a declaration line at the end of the snippet',
  },
  {
    slug: 'cp-hld-path-maximum-query',
    get extra() { return javaOf('cp-heavy-light-decomposition-chains'); },
    main: ({ par, vals, queries }: TIn & { vals: number[] }) =>
      `${hldBuild(par)}\n            int[] vals = ${ia(vals)};\n            Solution s = new Solution(); s.parent = par; s.depth = depth; s.head = h.head; s.pos = h.pos; s.base = new int[n];\n            for (int v = 0; v < n; v++) s.base[h.pos[v]] = vals[v];\n            int[][] q = ${im(queries)};\n${qLoop('s.pathMax(x[0], x[1])')}`,
    expected: ({ par, vals, queries }: TIn & { vals: number[] }) => queries.map(([u0, v0]) => {
      const d = depthsOf(par); let u = u0, v = v0, best = vals[u]; best = Math.max(best, vals[v]);
      while (u !== v) { if (d[u] < d[v]) [u, v] = [v, u]; best = Math.max(best, vals[u]); u = par[u]; }
      return Math.max(best, vals[u]);
    }).join(' '),
  },
);
/* ============================== chunk 5: bits / math / strings ============================== */
const popcount = (x: number) => { let c = 0; for (let i = 0; i < 32; i++) if ((x >>> i) & 1) c++; return c; };

add(
  {
    slug: '1044-longest-duplicate-substring',
    main: ({ s }: { s: string }) => `            String s = ${jstr(s)};\n            String r = new Solution().longestDupSubstring(s);\n            System.out.println(r.length() + (r.isEmpty() || s.indexOf(r) != s.lastIndexOf(r) ? "" : " INVALID"));`,
    expected: ({ s }: { s: string }) => {
      for (let L = s.length - 1; L >= 1; L--) for (let i = 0; i + L <= s.length; i++) if (s.indexOf(s.slice(i, i + L), i + 1) >= 0) return String(L);
      return '0';
    },
    notes: 'compares the LENGTH of the returned substring and checks that it really occurs twice (several duplicates of maximal length can exist)',
  },
  {
    slug: '1310-xor-queries-of-a-subarray',
    main: ({ arr, queries }: { arr: number[]; queries: number[][] }) => `            int[] a = ${ia(arr)};\n            int[][] q = ${im(queries)};\n            System.out.println(Arrays.toString(new Solution().xorQueries(a, q)));`,
    expected: ({ arr, queries }: { arr: number[]; queries: number[][] }) => fmtList(queries.map(([l, r]) => { let x = 0; for (let i = l; i <= r; i++) x ^= arr[i]; return x; })),
  },
  {
    slug: '1331-rank-transform-of-an-array',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ia(nums)};\n            System.out.println(Arrays.toString(new Solution().arrayRankTransform(a)));`,
    expected: ({ nums }: { nums: number[] }) => { const d = [...new Set(nums)].sort((a, b) => a - b); return fmtList(nums.map((x) => d.indexOf(x) + 1)); },
  },
  {
    slug: '136-single-number',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ia(nums)};\n            System.out.println(new Solution().singleNumber(a));`,
    expected: ({ nums }: { nums: number[] }) => { const c = new Map<number, number>(); nums.forEach((x) => c.set(x, (c.get(x) ?? 0) + 1)); return String([...c.entries()].find(([, k]) => k === 1)![0]); },
  },
  {
    slug: '137-single-number-ii',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ia(nums)};\n            System.out.println(new Solution().singleNumber(a));`,
    expected: ({ nums }: { nums: number[] }) => { const c = new Map<number, number>(); nums.forEach((x) => c.set(x, (c.get(x) ?? 0) + 1)); return String([...c.entries()].find(([, k]) => k === 1)![0]); },
  },
  {
    slug: '1392-longest-happy-prefix',
    main: ({ s }: { s: string }) => `            System.out.println("<" + new Solution().longestPrefix(${jstr(s)}) + ">");`,
    expected: ({ s }: { s: string }) => { for (let k = s.length - 1; k > 0; k--) if (s.slice(0, k) === s.slice(s.length - k)) return `<${s.slice(0, k)}>`; return '<>'; },
  },
  {
    slug: '164-maximum-gap',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ia(nums)};\n            System.out.println(new Solution().maximumGap(a));`,
    expected: ({ nums }: { nums: number[] }) => { const s = [...nums].sort((a, b) => a - b); let g = 0; for (let i = 1; i < s.length; i++) g = Math.max(g, s[i] - s[i - 1]); return String(g); },
  },
  {
    slug: '1755-closest-subsequence-sum',
    main: ({ nums, goal }: { nums: number[]; goal: number }) => `            int[] a = ${ia(nums)};\n            System.out.println(new Solution().minAbsDifference(a, ${goal}));`,
    expected: ({ nums, goal }: { nums: number[]; goal: number }) => {
      let best = Infinity;
      for (let m = 0; m < 1 << nums.length; m++) { let s = 0; nums.forEach((x, i) => { if ((m >> i) & 1) s += x; }); best = Math.min(best, Math.abs(s - goal)); }
      return String(best);
    },
  },
  {
    slug: '187-repeated-dna-sequences',
    main: ({ s, L }: { s: string; L: number }) => `            System.out.println(new Solution().findRepeatedDnaSequences(${jstr(s)}, ${L}));`,
    expected: ({ s, L }: { s: string; L: number }) => {
      const seen = new Set<string>(), added: string[] = [];
      for (let i = L - 1; i < s.length; i++) { const w = s.slice(i - L + 1, i + 1); if (seen.has(w)) { if (!added.includes(w)) added.push(w); } else seen.add(w); }
      return fmtList(added);
    },
  },
  {
    slug: '191-number-of-1-bits',
    main: ({ n }: { n: number }) => `            System.out.println(new Solution().hammingWeight(${n}));`,
    expected: ({ n }: { n: number }) => String(popcount(n)),
  },
  {
    slug: '2035-partition-array-into-two-arrays-to-minimize-sum-difference',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ia(nums)};\n            System.out.println(new Solution().minimumDifference(a));`,
    expected: ({ nums }: { nums: number[] }) => {
      const n = nums.length / 2, tot = nums.reduce((a, b) => a + b, 0); let best = Infinity;
      for (let m = 0; m < 1 << nums.length; m++) { if (popcount(m) !== n) continue; let s = 0; nums.forEach((x, i) => { if ((m >> i) & 1) s += x; }); best = Math.min(best, Math.abs(tot - 2 * s)); }
      return String(best);
    },
  },
  {
    slug: '204-count-primes',
    main: ({ n }: { n: number }) => `            System.out.println(new Solution().countPrimes(${n}));`,
    expected: ({ n }: { n: number }) => { let c = 0; for (let i = 2; i < n; i++) { let p = true; for (let d = 2; d * d <= i; d++) if (i % d === 0) { p = false; break; } if (p) c++; } return String(c); },
  },
  {
    slug: '214-shortest-palindrome',
    main: ({ s }: { s: string }) => `            System.out.println(new Solution().shortestPalindrome(${jstr(s)}));`,
    expected: ({ s }: { s: string }) => {
      let p = s.length; while (p > 0 && s.slice(0, p) !== [...s.slice(0, p)].reverse().join('')) p--;
      return [...s.slice(p)].reverse().join('') + s;
    },
  },
  {
    slug: '2223-sum-of-scores-of-built-strings',
    main: ({ s }: { s: string }) => `            System.out.println(new Solution().sumScores(${jstr(s)}));`,
    expected: ({ s }: { s: string }) => { let t = 0; for (let i = 0; i < s.length; i++) { let k = 0; while (i + k < s.length && s[k] === s[i + k]) k++; t += k; } return String(t); },
  },
  {
    slug: '2275-largest-combination-with-bitwise-and-greater-than-zero',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ia(nums)};\n            System.out.println(new Solution().largestCombination(a));`,
    expected: ({ nums }: { nums: number[] }) => {
      // brute force over subsets: largest subset whose AND is non-zero
      let best = 0;
      if (nums.length <= 14) { for (let m = 1; m < 1 << nums.length; m++) { let a = -1, c = 0; nums.forEach((x, i) => { if ((m >> i) & 1) { a &= x; c++; } }); if (a > 0) best = Math.max(best, c); } return String(best); }
      for (let b = 0; b < 24; b++) best = Math.max(best, nums.filter((x) => (x >> b) & 1).length);
      return String(best);
    },
  },
  {
    slug: '231-power-of-two',
    main: ({ n }: { n: number }) => `            System.out.println(new Solution().isPowerOfTwo(${n}));`,
    expected: ({ n }: { n: number }) => String(Array.from({ length: 31 }, (_, k) => 2 ** k).includes(n)),
  },
  {
    slug: '260-single-number-iii',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ia(nums)};\n            int[] r = new Solution().singleNumber(a);\n            Arrays.sort(r);\n            System.out.println(Arrays.toString(r));`,
    expected: ({ nums }: { nums: number[] }) => { const c = new Map<number, number>(); nums.forEach((x) => c.set(x, (c.get(x) ?? 0) + 1)); return fmtList([...c.entries()].filter(([, k]) => k === 1).map(([x]) => x).sort((a, b) => a - b)); },
    notes: 'the two answers are sorted before printing (the displayed code returns them in bucket order)',
  },
  {
    slug: '28-find-the-index-of-the-first-occurrence-in-a-string',
    main: ({ text, pat }: { text: string; pat: string }) => `            System.out.println(new Solution().strStr(${jstr(text)}, ${jstr(pat)}));`,
    expected: ({ text, pat }: { text: string; pat: string }) => String(text.indexOf(pat)),
  },
  {
    slug: '338-counting-bits',
    main: ({ n }: { n: number }) => `            System.out.println(Arrays.toString(new Solution().countBits(${n})));`,
    expected: ({ n }: { n: number }) => fmtList(Array.from({ length: n + 1 }, (_, i) => popcount(i))),
  },
  {
    slug: '382-linked-list-random-node',
    noWrap: true,
    extra: 'class ListNode { int val; ListNode next; ListNode(int v) { val = v; } }',
    main: ({ vals, seed }: { vals: number[]; seed: number }) =>
      `            ListNode dummy = new ListNode(0), cur = dummy;\n            int[] vals = ${ia(vals)};\n            for (int v : vals) { cur.next = new ListNode(v); cur = cur.next; }\n            Solution s = new Solution(dummy.next);\n            java.lang.reflect.Field f = Solution.class.getDeclaredField("rand"); f.setAccessible(true); f.set(s, new Random(${seed}));\n` +
      `            int N = 20000; Map<Integer, Integer> cnt = new HashMap<>(), exp = new HashMap<>();\n            for (int i = 0; i < N; i++) cnt.merge(s.getRandom(), 1, Integer::sum);\n            for (int v : vals) exp.merge(v, 1, Integer::sum);\n            String res = exp.keySet().containsAll(cnt.keySet()) ? "OK" : "INVALID value";\n` +
      `            for (Map.Entry<Integer, Integer> e : exp.entrySet()) { double p = e.getValue() / (double) vals.length, mean = N * p, sd = Math.sqrt(N * p * (1 - p)); int got = cnt.getOrDefault(e.getKey(), 0); if (Math.abs(got - mean) > 6 * sd + 5) res = "BIASED " + e.getKey() + ": " + got + " vs " + mean; }\n            System.out.println(res);`,
    expected: () => 'OK',
    notes: 'randomness: the private Random is replaced by a seeded one through reflection, then 20000 draws must return only list values with frequencies within 6 sigma of count(value)/n (duplicates weigh by count)',
  },
  {
    slug: '398-random-pick-index',
    noWrap: true,
    main: ({ nums, target, seed }: { nums: number[]; target: number; seed: number }) =>
      `            int[] nums = ${ia(nums)};\n            Solution s = new Solution(nums);\n            java.lang.reflect.Field f = Solution.class.getDeclaredField("rand"); f.setAccessible(true); f.set(s, new Random(${seed}));\n` +
      `            int N = 20000; Map<Integer, Integer> cnt = new HashMap<>();\n            for (int i = 0; i < N; i++) cnt.merge(s.pick(${target}), 1, Integer::sum);\n            List<Integer> idx = new ArrayList<>(); for (int i = 0; i < nums.length; i++) if (nums[i] == ${target}) idx.add(i);\n` +
      `            String res = "OK";\n            if (idx.isEmpty()) { if (cnt.size() != 1 || !cnt.containsKey(-1)) res = "expected only -1: " + cnt; }\n            else { if (!idx.containsAll(cnt.keySet())) res = "INVALID index " + cnt; double p = 1.0 / idx.size(), mean = N * p, sd = Math.sqrt(N * p * (1 - p)); for (int i : idx) if (Math.abs(cnt.getOrDefault(i, 0) - mean) > 6 * sd + 5) res = "BIASED " + i + ": " + cnt.getOrDefault(i, 0) + " vs " + mean; }\n            System.out.println(res);`,
    expected: () => 'OK',
    notes: 'randomness: the private Random is replaced by a seeded one through reflection; 20000 draws must return only matching indices, each close to uniform (6 sigma)',
  },
);
/* ============================== chunk 6 ============================== */
const gcdN = (a: number, b: number): number => (b === 0 ? a : gcdN(b, a % b));
const allIdx = (text: string, pat: string) => { const r: number[] = []; for (let i = 0; i + pat.length <= text.length; i++) if (text.startsWith(pat, i)) r.push(i); return r; };
const isPal = (t: string) => t === [...t].reverse().join('');
/** Shadows java.util.Random inside the problem's package so the displayed `new Random()` becomes deterministic (seeds drawn from a seeded master). */
const SEEDED_RANDOM = 'class Random extends java.util.Random { static java.util.Random master = new java.util.Random(1); Random() { super(master.nextLong()); } }';

add(
  {
    slug: '454-4sum-ii',
    main: ({ a, b, c, d }: { a: number[]; b: number[]; c: number[]; d: number[] }) => `            int[] A = ${ia(a)}, B = ${ia(b)}, C = ${ia(c)}, D = ${ia(d)};\n            System.out.println(new Solution().fourSumCount(A, B, C, D));`,
    expected: ({ a, b, c, d }: { a: number[]; b: number[]; c: number[]; d: number[] }) => { let n = 0; for (const w of a) for (const x of b) for (const y of c) for (const z of d) if (w + x + y + z === 0) n++; return String(n); },
  },
  {
    slug: '459-repeated-substring-pattern',
    main: ({ s }: { s: string }) => `            System.out.println(new Solution().repeatedSubstringPattern(${jstr(s)}));`,
    expected: ({ s }: { s: string }) => String(s.length > 1 && (s + s).indexOf(s, 1) < s.length),
  },
  {
    slug: '477-total-hamming-distance',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ia(nums)};\n            System.out.println(new Solution().totalHammingDistance(a));`,
    expected: ({ nums }: { nums: number[] }) => { let t = 0; for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) t += popcount(nums[i] ^ nums[j]); return String(t); },
  },
  {
    slug: '50-pow-x-n',
    main: ({ x, n }: { x: number; n: number }) => {
      const e = Math.pow(x, n);
      return `            double r = new Solution().myPow(${lit(x)}, ${n}), e = ${lit(e)};\n            System.out.println(Math.abs(r - e) <= 1e-9 * Math.max(1, Math.abs(e)) ? "OK" : r + " vs " + e);`;
    },
    expected: () => 'OK',
    notes: 'doubles compared with a 1e-9 relative tolerance against Math.pow computed in the harness',
  },
  {
    slug: '506-relative-ranks',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ia(nums)};\n            System.out.println(Arrays.toString(new Solution().findRelativeRanks(a)));`,
    expected: ({ nums }: { nums: number[] }) => {
      const d = [...nums].sort((a, b) => b - a);
      return fmtList(nums.map((x) => { const r = d.indexOf(x); return r === 0 ? 'Gold Medal' : r === 1 ? 'Silver Medal' : r === 2 ? 'Bronze Medal' : String(r + 1); }));
    },
  },
  {
    slug: '912-counting-sort',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ia(nums)};\n            System.out.println(Arrays.toString(new Solution().countingSort(a)));`,
    expected: ({ nums }: { nums: number[] }) => fmtList([...nums].sort((a, b) => a - b)),
  },
  {
    slug: '912-radix-sort',
    main: ({ nums }: { nums: number[] }) => `            int[] a = ${ia(nums)};\n            System.out.println(Arrays.toString(new Solution().radixSort(a)));`,
    expected: ({ nums }: { nums: number[] }) => fmtList([...nums].sort((a, b) => a - b)),
  },
  {
    slug: 'alg-all-periods-of-a-string',
    main: ({ s }: { s: string }) => `            System.out.println(new Solution().periods(${jstr(s)}));`,
    expected: ({ s }: { s: string }) => { const r: number[] = []; for (let p = 1; p <= s.length; p++) { let ok = true; for (let i = 0; i + p < s.length; i++) if (s[i] !== s[i + p]) { ok = false; break; } if (ok) r.push(p); } return fmtList(r); },
  },
  {
    slug: 'alg-euclids-gcd-and-lcm',
    main: ({ a, b }: { a: number; b: number }) => `            System.out.println(Solution.gcd(${a}, ${b}) + " " + Solution.lcm(${a}, ${b}));`,
    expected: ({ a, b }: { a: number; b: number }) => { const g = gcdN(a, b); return `${g} ${(a / g) * b}`; },
  },
  {
    slug: 'alg-manachers-algorithm',
    main: ({ s }: { s: string }) => `            System.out.println("<" + new Solution().longestPalindrome(${jstr(s)}) + ">");`,
    expected: ({ s }: { s: string }) => {
      let best = '';
      for (let i = 0; i < s.length; i++) for (let j = i + 1; j <= s.length; j++) { const t = s.slice(i, j); if (t.length > best.length && isPal(t)) best = t; }
      return `<${best}>`;
    },
    notes: 'ties between equally long palindromes: the displayed code keeps the leftmost one, which the brute-force reference (first strictly longer) also gives',
  },
  {
    slug: 'alg-rabin-karp-substring-search',
    main: ({ text, pat }: { text: string; pat: string }) => `            System.out.println(Solution.rabinKarp(${jstr(text)}, ${jstr(pat)}));`,
    expected: ({ text, pat }: { text: string; pat: string }) => fmtList(allIdx(text, pat)),
  },
  {
    slug: 'alg-reservoir-sampling-k-items',
    extra: SEEDED_RANDOM,
    main: ({ stream, k, seed }: { stream: number[]; k: number; seed: number }) =>
      `            Random.master = new java.util.Random(${seed});\n            int[] vals = ${ia(stream)}; int k = ${k}, n = vals.length, N = 20000;\n            Map<Integer, Integer> cnt = new HashMap<>(), has = new HashMap<>();\n            for (int v : vals) has.merge(v, 1, Integer::sum);\n            String res = "OK";\n` +
      `            for (int t = 0; t < N; t++) {\n                List<Integer> l = new ArrayList<>(); for (int v : vals) l.add(v);\n                int[] r = new Solution().sample(l.iterator(), k);\n                if (r.length != k) { res = "bad length " + r.length; break; }\n                Map<Integer, Integer> loc = new HashMap<>();\n                for (int v : r) { cnt.merge(v, 1, Integer::sum); if (loc.merge(v, 1, Integer::sum) > has.getOrDefault(v, 0)) res = "value used more often than in the stream: " + v; }\n            }\n` +
      `            for (Map.Entry<Integer, Integer> e : has.entrySet()) { double p = (double) k * e.getValue() / n, mean = N * p, sd = Math.sqrt(N * p); int got = cnt.getOrDefault(e.getKey(), 0); if (Math.abs(got - mean) > 6 * sd + 5) res = "BIASED " + e.getKey() + ": " + got + " vs " + mean; }\n            System.out.println(res);`,
    expected: () => 'OK',
    notes: 'randomness: java.util.Random is shadowed by a seeded subclass in the test package; 20000 samples must have length k, use only stream values, and keep every value with frequency k*count/n within 6 sigma',
  },
  {
    slug: 'alg-z-algorithm-pattern-search',
    main: ({ text, pat }: { text: string; pat: string }) => `            System.out.println(new Solution().search(${jstr(text)}, ${jstr(pat)}));`,
    expected: ({ text, pat }: { text: string; pat: string }) => fmtList(allIdx(text, pat)),
  },
  {
    slug: 'cp-maximum-overlap-of-wide-intervals',
    main: ({ iv }: { iv: number[][] }) => `            int[][] a = ${im(iv)};\n            System.out.println(new Solution().maxOverlap(a));`,
    expected: ({ iv }: { iv: number[][] }) => String(Math.max(0, ...iv.map(([s]) => iv.filter(([l, r]) => l <= s && s <= r).length))),
  },
  {
    slug: 'cp-palindromic-substrings-via-manacher',
    main: ({ s }: { s: string }) => `            System.out.println(new Solution().countSubstrings(${jstr(s)}));`,
    expected: ({ s }: { s: string }) => { let c = 0; for (let i = 0; i < s.length; i++) for (let j = i + 1; j <= s.length; j++) if (isPal(s.slice(i, j))) c++; return String(c); },
  },
);

