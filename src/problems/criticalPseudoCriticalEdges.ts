import type { Aux, ProblemDef, Step } from '../engine/types';
import { Dsu, isConnected, mstScene, parseWeightedEdges, tokens } from './mstKit.ts';
import type { EdgeMark, WEdge } from './mstKit.ts';

/** n nodes 0..n-1 and weighted edges (indexed in input order). Classify edges against the minimum spanning trees of the graph. */
interface In { n: number; edges: WEdge[] }

function parse(raw: string): In {
  const t = tokens(raw);
  if (t.length < 2 || !/^\d+$/.test(t[0])) throw new Error('Write n, then edges like 5 0-1:1 1-2:1 2-3:2 0-3:2 0-4:3');
  const n = Number(t[0]);
  if (n < 3 || n > 6) throw new Error('Use between 3 and 6 nodes');
  const edges = parseWeightedEdges(t.slice(1), { lo: 0, hi: n - 1, max: 9, example: '0-1:1 1-2:1' });
  if (!isConnected(n, edges)) throw new Error('The graph must be connected');
  return { n, edges };
}

const INF = Number.MAX_SAFE_INTEGER;

/** Kruskal over `order` with an optional banned and an optional forced edge. */
function kruskal(n: number, edges: WEdge[], order: number[], skip: number, force: number) {
  const d = new Dsu(n);
  const taken: number[] = [];
  let total = 0;
  if (force >= 0) { d.union(edges[force].u, edges[force].v); total += edges[force].w; taken.push(force); }
  for (const id of order) {
    if (id === skip) continue;
    if (d.union(edges[id].u, edges[id].v)) { total += edges[id].w; taken.push(id); }
  }
  return { total: taken.length === n - 1 ? total : INF, taken };
}

function build({ n, edges }: In): Step[] {
  const m = edges.length;
  const order = edges.map((_, i) => i).sort((a, b) => edges[a].w - edges[b].w || a - b);
  const marks: EdgeMark[] = edges.map(() => 'todo');
  const steps: Step[] = [];
  const crit: number[] = [];
  const pseudo: number[] = [];
  const verdict: string[] = edges.map(() => '?');
  let base: number | string = '—';
  let edge: number | string = '—';
  let without: number | string = '—';
  let withE: number | string = '—';
  let dsu: Dsu | undefined;
  const fmt = (x: number) => (x === INF ? '∞' : String(x));

  const aux = (): Aux[] => [
    { title: 'edges by weight (id: u-v w)', kind: 'queue', items: order.map((i) => `#${i}: ${edges[i].u}-${edges[i].v} w${edges[i].w}`) },
    { title: 'verdict per edge', kind: 'list', items: edges.map((_, i) => `#${i}: ${verdict[i]}`) },
  ];
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>, hot: number[] = []) =>
    steps.push({
      ...s,
      scene: mstScene({
        n, base: 0, edges, marks, dsu, hot, hotState: 'active',
        tags: Array.from({ length: n }, () => undefined),
        weightText: (e, i) => `#${i}·${e.w}`,
      }),
      aux: aux(),
      vars: { 'MST weight': base, edge, 'without edge': without, 'with edge': withE },
    });

  push({
    title: 'Sort the edges', desc: `${m} edges, ids #0 to #${m - 1} in input order. First find the weight of one ordinary minimum spanning tree; then test every edge by banning it and by forcing it.`,
    logic: 'An edge is critical if every MST needs it, pseudo-critical if some MST uses it but others do not. Both questions can be answered with Kruskal re-runs.', logicTone: 'info',
    tag: 'SORT', note: `${m} edges, order by weight: #${order.join(' #')}`,
    javaLines: [1, 2, 3, 4], pyLines: [1, 2], algoStep: 0,
  });

  // baseline MST, one step per edge in weight order
  dsu = new Dsu(n);
  let total = 0;
  let used = 0;
  for (const id of order) {
    const e = edges[id];
    edge = id;
    const took = dsu.union(e.u, e.v);
    if (took) { total += e.w; used++; }
    marks[id] = took ? 'take' : 'skip';
    base = total;
    push({
      title: took ? `Baseline: take #${id} (${e.u}-${e.v}, ${e.w})` : `Baseline: skip #${id} (${e.u}-${e.v}, ${e.w})`,
      desc: took ? `The ends were in different groups, so #${id} joins the tree. Weight so far ${total}.` : `${e.u} and ${e.v} are already connected, so #${id} would close a cycle and is skipped.`,
      logic: 'This is plain Kruskal; its total is the minimum spanning tree weight we compare everything against.', logicTone: took ? 'success' : 'info',
      tag: 'BASELINE', note: took ? `#${id} joins two groups → W = ${total}` : `#${id}: same group → skip, W stays ${total}`,
      javaLines: [5, 25, 27, 28, 29], pyLines: [3, 19, 22, 23, 24, 25, 26], algoStep: 0,
    }, [e.u, e.v]);
    if (used === n - 1) break;
  }
  const W = total;
  edge = '—';
  dsu = undefined;
  marks.fill('todo');

  for (let i = 0; i < m; i++) {
    edge = i; without = '—'; withE = '—';
    marks.fill('skip');
    const a = kruskal(n, edges, order, i, -1);
    marks.fill('dim');
    a.taken.forEach((id) => { marks[id] = 'take'; });
    marks[i] = 'bad';
    without = fmt(a.total);
    const isCritical = a.total > W;
    push({
      title: `Ban #${i}: MST weight ${fmt(a.total)}${a.total === INF ? ' (disconnected)' : ''}`,
      desc: `Run Kruskal while ignoring #${i} (${edges[i].u}-${edges[i].v}, weight ${edges[i].w}). ${a.total === INF ? 'The remaining edges cannot connect every node.' : `The best tree without it weighs ${a.total}, against ${W} with it allowed.`}`,
      logic: isCritical ? 'Removing the edge makes every spanning tree heavier (or impossible), so every minimum tree must contain it: critical.' : 'The tree is no worse without this edge, so it is not required by every MST.', logicTone: isCritical ? 'warn' : 'info',
      tag: 'BAN', note: `without = ${fmt(a.total)} ${isCritical ? '>' : '≤'} W = ${W} → ${isCritical ? 'critical' : 'not required'}`,
      alert: isCritical ? `Banning #${i} ${a.total === INF ? 'disconnects the graph' : `raises the MST from ${W} to ${a.total}`}.` : undefined,
      javaLines: [7, 8, 9, 26, 27, 28, 29], pyLines: [5, 6, 20, 21, 22, 23, 24, 25, 26], algoStep: 1,
    }, [edges[i].u, edges[i].v]);
    if (isCritical) {
      crit.push(i); verdict[i] = 'critical';
      marks.fill('dim');
      marks[i] = 'bad';
      push({
        title: `#${i} is critical`, desc: `Without #${i} the best tree costs ${fmt(a.total)} > ${W}, so #${i} sits in every minimum spanning tree.`,
        logic: 'Critical edges are exactly the ones whose removal raises the minimum cost (bridges of the graph included).', logicTone: 'warn',
        tag: 'CRITICAL', note: `critical.add(${i}), critical = [${crit.join(', ')}]`,
        javaLines: [9], pyLines: [6, 7], algoStep: 2,
      }, [edges[i].u, edges[i].v]);
      continue;
    }
    const b = kruskal(n, edges, order, -1, i);
    marks.fill('dim');
    b.taken.forEach((id) => { marks[id] = 'take'; });
    withE = fmt(b.total);
    const ok = b.total === W;
    if (ok) { pseudo.push(i); verdict[i] = 'pseudo-critical'; } else verdict[i] = 'in no MST';
    push({
      title: `Force #${i}: MST weight ${fmt(b.total)}`,
      desc: `Start with #${i} already in the tree, then run Kruskal. The result weighs ${b.total}${ok ? `, which equals the minimum ${W}` : `, which is more than the minimum ${W}`}.`,
      logic: ok ? 'A minimum tree exists that contains this edge, yet one without it exists too: pseudo-critical.' : 'Forcing the edge makes the tree heavier, so no minimum tree uses it at all.', logicTone: ok ? 'success' : 'info',
      tag: 'FORCE', note: `with = ${fmt(b.total)} ${ok ? '==' : '>'} W = ${W} → ${ok ? 'pseudo-critical' : 'in no MST'}`,
      alert: ok ? undefined : `Forcing #${i} gives ${fmt(b.total)} > ${W}: no minimum tree uses it.`,
      javaLines: [10, 21, 22, 23, 25, 27, 28, 29], pyLines: [8, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26], algoStep: 3,
    }, [edges[i].u, edges[i].v]);
  }

  edge = '—'; without = '—'; withE = '—';
  edges.forEach((_, i) => { marks[i] = verdict[i] === 'critical' ? 'bad' : verdict[i] === 'pseudo-critical' ? 'take' : 'dim'; });
  const ans = `[[${crit.join(',')}],[${pseudo.join(',')}]]`;
  steps.push({
    title: 'Classification complete', desc: `Critical edges (red): ${crit.length ? crit.map((i) => `#${i}`).join(', ') : 'none'}. Pseudo-critical edges (green): ${pseudo.length ? pseudo.map((i) => `#${i}`).join(', ') : 'none'}. Faded edges appear in no minimum tree.`,
    scene: mstScene({ n, base: 0, edges, marks, tags: Array.from({ length: n }, () => undefined), weightText: (e, i) => `#${i}·${e.w}` }),
    aux: aux(),
    vars: { 'MST weight': W, edge, 'without edge': without, 'with edge': withE },
    logic: 'Critical = in every MST. Pseudo-critical = in some but not all. Everything else is in none.', logicTone: 'success',
    tag: '✅ Done!', note: `critical = [${crit.join(', ')}], pseudo = [${pseudo.join(', ')}]`,
    javaLines: [13], pyLines: [10], algoStep: 4,
    result: { title: ans, text: 'Critical edge ids, then pseudo-critical edge ids' },
  });
  return steps;
}

const mk = (n: number, s: string): In => ({ n, edges: s.split(' ').map((t) => { const m = /^(\d+)-(\d+):(\d+)$/.exec(t)!; return { u: +m[1], v: +m[2], w: +m[3] }; }) });

export const criticalPseudoCriticalEdges: ProblemDef<In> = {
  slug: '1489-find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree',
  id: '1489', title: 'Find Critical and Pseudo-Critical Edges in Minimum Spanning Tree', difficulty: 'Hard', category: 'Graph', tag: 'Kruskal with forced / banned edges',
  statement: 'Given a connected weighted undirected graph, an edge is critical if deleting it increases the minimum spanning tree cost (it is in every MST), and pseudo-critical if it appears in some MST but not all. Return the ids (input positions) of the critical edges and of the pseudo-critical edges.',
  constraints: '2 ≤ n ≤ 100, up to 200 edges (animation input: 3–6 nodes, ≤ 9 edges, written "n u-v:w ...")',
  examples: [
    { label: '5 nodes, 7 edges', input: mk(5, '0-1:1 1-2:1 2-3:2 0-3:2 0-4:3 3-4:3 1-4:6'), output: '[[0,1],[2,3,4,5]]' },
    { label: '4 nodes, all weight 1', input: mk(4, '0-1:1 1-2:1 2-3:1 0-3:1'), output: '[[],[0,1,2,3]]' },
    { label: '5 nodes, a heavy chord', input: mk(5, '0-1:1 1-2:2 2-3:3 3-4:2 0-4:5 1-3:9'), output: '[[0,1,2,3],[]]' },
  ],
  inputPlaceholder: 'e.g. 5 0-1:1 1-2:1 2-3:2 0-3:2 0-4:3   (n, then u-v:w)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Edge in the current tree / pseudo-critical', state: 'found' }, { label: 'Banned edge / critical', state: 'error' }, { label: 'Node of the edge under test', state: 'active' }],
  varLabels: ['MST weight', 'edge', 'without edge', 'with edge'],
  approach: {
    title: 'Re-run Kruskal with each edge banned, then forced',
    text: 'Compute the plain MST weight W. For each edge, run Kruskal ignoring it: if the result is heavier than W (or the graph falls apart) the edge is critical. Otherwise run Kruskal with that edge forced into the tree first: if the weight is still W, some minimum tree uses the edge, so it is pseudo-critical. Anything else is in no minimum tree.',
  },
  java: [
    'public List<List<Integer>> findCriticalAndPseudoCriticalEdges(int n, int[][] edges) {',
    '    int m = edges.length;',
    '    Integer[] order = new Integer[m];                      // edge ids sorted by weight',
    '    for (int i = 0; i < m; i++) order[i] = i;',
    '    Arrays.sort(order, (a, b) -> edges[a][2] - edges[b][2]);',
    '    int best = mst(n, edges, order, -1, -1);              // plain MST weight',
    '    List<Integer> critical = new ArrayList<>(), pseudo = new ArrayList<>();',
    '    for (int i = 0; i < m; i++) {',
    '        int without = mst(n, edges, order, i, -1);        // ban edge i',
    '        if (without > best) critical.add(i);              // MST gets worse (or breaks)',
    '        else if (mst(n, edges, order, -1, i) == best)     // force edge i',
    '            pseudo.add(i);                                // some MST uses it',
    '    }',
    '    return List.of(critical, pseudo);',
    '}',
    '',
    '// Kruskal; skip = banned edge id, force = edge taken first. MAX_VALUE if disconnected.',
    'private int mst(int n, int[][] edges, Integer[] order, int skip, int force) {',
    '    int[] parent = new int[n];',
    '    for (int i = 0; i < n; i++) parent[i] = i;',
    '    int total = 0, used = 0;',
    '    if (force >= 0) {',
    '        parent[find(parent, edges[force][0])] = find(parent, edges[force][1]);',
    '        total += edges[force][2]; used++;',
    '    }',
    '    for (int id : order) {',
    '        if (id == skip) continue;',
    '        int a = find(parent, edges[id][0]), b = find(parent, edges[id][1]);',
    '        if (a == b) continue;',
    '        parent[a] = b; total += edges[id][2]; used++;',
    '    }',
    '    return used == n - 1 ? total : Integer.MAX_VALUE;',
    '}',
    '',
    'private int find(int[] parent, int x) {',
    '    while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }',
    '    return x;',
    '}',
  ],
  python: [
    'def find_critical_and_pseudo(n, edges):',
    '    m = len(edges)',
    '    order = sorted(range(m), key=lambda i: edges[i][2])',
    '    best = mst(n, edges, order)                       # plain MST weight',
    '    critical, pseudo = [], []',
    '    for i in range(m):',
    '        if mst(n, edges, order, skip=i) > best:       # ban edge i',
    '            critical.append(i)',
    '        elif mst(n, edges, order, force=i) == best:   # force edge i',
    '            pseudo.append(i)',
    '    return [critical, pseudo]',
    '',
    'def mst(n, edges, order, skip=-1, force=-1):',
    '    parent = list(range(n))',
    '    total = used = 0',
    '    if force >= 0:',
    '        u, v, w = edges[force]',
    '        parent[find(parent, u)] = find(parent, v)',
    '        total, used = w, 1',
    '    for i in order:',
    '        if i == skip:',
    '            continue',
    '        u, v, w = edges[i]',
    '        a, b = find(parent, u), find(parent, v)',
    '        if a != b:',
    '            parent[a] = b',
    '            total += w',
    '            used += 1',
    "    return total if used == n - 1 else float('inf')",
    '',
    'def find(parent, x):',
    '    while parent[x] != x:',
    '        parent[x] = parent[parent[x]]',
    '        x = parent[x]',
    '    return x',
  ],
  phases: [
    { icon: '📑', label: 'Baseline MST weight W', tone: 'blue' },
    { icon: '🚫', label: 'Ban edge i, re-run', tone: 'cyan' },
    { icon: '🔴', label: 'Critical (in every MST)', tone: 'orange' },
    { icon: '📌', label: 'Force edge i, re-run', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['critical', 'pseudo-critical', 'minimum spanning tree'],
  algorithm: [
    'Sort edge ids by weight and compute the plain MST weight W with Kruskal',
    'For every edge i, run Kruskal while ignoring edge i',
    'If that result is larger than W (or the graph is disconnected), edge i is critical',
    'Otherwise run Kruskal with edge i forced first; if the result equals W, edge i is pseudo-critical',
    'Return the critical ids and the pseudo-critical ids',
  ],
  complexity: [{ label: 'Time', value: 'O(E² · α(V))' }, { label: 'Space', value: 'O(V + E)' }],
  why: 'Banning an edge and re-running Kruskal gives the cheapest tree that avoids it, so the answer exceeds W exactly when every minimum tree uses the edge. Forcing an edge and filling the rest greedily gives the cheapest tree that contains it (Kruskal after a forced start still adds only safe edges), so it equals W exactly when some minimum tree contains the edge. The two tests partition the edges into critical, pseudo-critical and never used.',
};
