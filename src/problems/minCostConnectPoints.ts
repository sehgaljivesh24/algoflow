import type { Aux, CellState, GraphEdgeVM, ProblemDef, Step } from '../engine/types';

interface In { pts: [number, number][] }

function parse(raw: string): In {
  const toks = raw.split(/[\s;]+/).filter(Boolean);
  const pts = toks.map((t) => {
    const m = /^\(?(-?\d+),(-?\d+)\)?$/.exec(t);
    if (!m) throw new Error(`"${t}" is not a point. Write points as x,y separated by spaces, e.g. 0,0 2,2 3,10`);
    return [Number(m[1]), Number(m[2])] as [number, number];
  });
  if (pts.length < 2) throw new Error('Give at least 2 points');
  if (pts.length > 7) throw new Error('Use 7 points or fewer');
  if (pts.some(([x, y]) => Math.abs(x) > 50 || Math.abs(y) > 50)) throw new Error('Keep coordinates between -50 and 50');
  if (new Set(pts.map((p) => p.join(','))).size !== pts.length) throw new Error('All points must be different');
  return { pts };
}

const INF = Infinity;

function build({ pts }: In): Step[] {
  const n = pts.length;
  const dist = (a: number, b: number) => Math.abs(pts[a][0] - pts[b][0]) + Math.abs(pts[a][1] - pts[b][1]);
  // lay the nodes out where the points really are
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const sx = Math.max(1, Math.max(...xs) - Math.min(...xs));
  const sy = Math.max(1, Math.max(...ys) - Math.min(...ys));
  const pos = pts.map(([x, y]) => ({
    x: Math.max(...xs) === Math.min(...xs) ? 0.5 : (x - Math.min(...xs)) / sx,
    y: Math.max(...ys) === Math.min(...ys) ? 0.5 : 1 - (y - Math.min(...ys)) / sy,
  }));

  const minD = new Array<number>(n).fill(INF);
  const from = new Array<number>(n).fill(-1);
  const inTree = new Array<boolean>(n).fill(false);
  const treeEdges: [number, number, number][] = [];
  const steps: Step[] = [];
  let total = 0;
  let cur: number | null = null;
  let probe: [number, number] | null = null; // edge being compared right now
  minD[0] = 0;

  const dd = (x: number) => (x === INF ? '∞' : String(x));
  const scene = () => {
    const edges: GraphEdgeVM[] = treeEdges.map(([a, b, w]) => ({ from: a, to: b, weight: w, state: 'chosen' }));
    for (let v = 0; v < n; v++) {
      if (!inTree[v] && from[v] >= 0) {
        const isProbe = probe && probe[1] === v && probe[0] === from[v];
        edges.push({ from: from[v], to: v, weight: minD[v], state: isProbe ? 'active' : 'visited' });
      }
    }
    if (probe && from[probe[1]] !== probe[0]) edges.push({ from: probe[0], to: probe[1], weight: dist(probe[0], probe[1]), state: 'dim' });
    return {
      kind: 'graph' as const,
      nodes: pts.map((_, id) => {
        const state: CellState | undefined = id === cur ? 'active' : inTree[id] ? 'found' : probe && probe[1] === id ? 'compare' : undefined;
        return { id, state, tag: inTree[id] ? undefined : `d=${dd(minD[id])}`, x: pos[id].x, y: pos[id].y };
      }),
      edges,
    };
  };
  const aux = (): Aux[] => [
    { title: 'points (index: x,y)', kind: 'list', items: pts.map((p, i) => `${i}: ${p[0]},${p[1]}`) },
    { title: 'cheapest link into the tree, minD[ ]', kind: 'list', items: minD.map((d, i) => `${i}: ${inTree[i] ? '✓' : dd(d)}`) },
    { title: 'MST edges added', kind: 'list', items: treeEdges.length ? treeEdges.map(([a, b, w]) => `${a}–${b} (${w})`) : ['none yet'], highlight: treeEdges.length && cur !== null && probe === null ? treeEdges.length - 1 : undefined },
  ];
  const vars = () => ({ node: cur ?? '—', 'tree size': inTree.filter(Boolean).length, 'total cost': total });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${n} points; the cost of linking two is their Manhattan distance |x₁−x₂| + |y₁−y₂|. Nodes sit where the points are. minD[ ] is the cheapest known link from each point into the tree.`,
    logic: 'We grow one tree, always adding the cheapest point that is not yet connected to it.', logicTone: 'info',
    tag: 'INIT —', note: `minD[0] = 0, minD[1..${n - 1}] = ∞, inTree = none`,
    javaLines: [1, 2, 3, 4, 5], pyLines: [1, 2, 3, 4], algoStep: 0,
  });

  for (let it = 0; it < n; it++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!inTree[i] && (u === -1 || minD[i] < minD[u])) u = i;
    cur = u;
    inTree[u] = true;
    total += minD[u];
    if (from[u] >= 0) treeEdges.push([from[u], u, minD[u]]);
    push({
      title: it === 0 ? `Start the tree at point ${u}` : `Add point ${u} via ${from[u]}–${u} (cost ${minD[u]})`,
      desc: it === 0 ? 'Any point can be the root; we use point 0.' : `Point ${u} has the cheapest link into the tree (${minD[u]}), so that edge joins the tree. Total = ${total}.`,
      logic: it === 0 ? 'The tree starts as a single point with cost 0.' : 'The cheapest edge crossing between the tree and the rest can always be part of a minimum spanning tree.', logicTone: 'success',
      tag: 'ADD', note: it === 0 ? `u = 0, total += 0 → ${total}` : `u = ${u} via ${from[u]}, total += ${minD[u]} → ${total}`,
      javaLines: [7, 8, 9, 10, 11], pyLines: [6, 7, 8], algoStep: 1,
    });
    if (it === n - 1) break;
    for (let v = 0; v < n; v++) {
      if (inTree[v]) continue;
      const d = dist(u, v);
      probe = [u, v];
      const better = d < minD[v];
      if (better) { minD[v] = d; from[v] = u; }
      push({
        title: better ? `Cheaper link to ${v}: ${u}–${v} costs ${d}` : `Link ${u}–${v} costs ${d}, not better than ${dd(minD[v])}`,
        desc: better ? `${d} < old minD[${v}], so minD[${v}] = ${d} (via ${u}).` : `minD[${v}] already ${dd(minD[v])} via ${from[v]}; keep it.`,
        logic: 'Each outside point remembers only its single cheapest connection to the tree.', logicTone: better ? 'success' : 'info',
        tag: 'UPDATE', alert: better ? undefined : `Keep minD[${v}] = ${dd(minD[v])}: the new link ${u}–${v} (${d}) is not cheaper.`,
        note: better ? `d = ${d} < old → minD[${v}] = ${d}` : `d = ${d} ≥ minD[${v}] = ${dd(minD[v])} → keep`,
        javaLines: [12, 13, 14, 15], pyLines: [9, 10, 11, 12], algoStep: 2,
      });
    }
    probe = null;
    cur = null;
  }

  cur = null;
  probe = null;
  steps.push({
    title: 'Done', desc: `All ${n} points are connected. Minimum total cost = ${total}.`,
    scene: scene(), aux: aux(), vars: vars(),
    logic: 'n points need exactly n−1 edges; Prim never added an edge that closes a cycle because it only links outside points.', logicTone: 'success',
    tag: '✅ Done!', note: `${n - 1} edges, total = ${total}`,
    javaLines: [18], pyLines: [13], algoStep: 3,
    result: { title: String(total), text: 'Minimum cost to connect all points' },
  });
  return steps;
}

const P = (s: string): [number, number][] => s.split(' ').map((t) => t.split(',').map(Number) as [number, number]);

export const minCostConnectPoints: ProblemDef<In> = {
  slug: '1584-min-cost-to-connect-all-points',
  id: '1584', title: 'Min Cost to Connect All Points', difficulty: 'Medium', category: 'Graph', tag: "Prim's MST",
  statement: 'You are given points on a 2-D plane. The cost of connecting two points is the Manhattan distance between them. Return the minimum total cost to connect all points so that exactly one simple path exists between every pair.',
  constraints: '1 ≤ points ≤ 1000, distinct points (animation input: 2–7 points written as x,y separated by spaces)',
  examples: [
    { label: '0,0 2,2 3,10 5,2 7,0', input: { pts: P('0,0 2,2 3,10 5,2 7,0') }, output: '20' },
    { label: '3,12 -2,5 -4,1', input: { pts: P('3,12 -2,5 -4,1') }, output: '18' },
    { label: '0,0 1,1 1,0 -1,1', input: { pts: P('0,0 1,1 1,0 -1,1') }, output: '4' },
  ],
  inputPlaceholder: 'e.g. 0,0 2,2 3,10 5,2 7,0',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Just added', state: 'active' }, { label: 'In the tree', state: 'found' }, { label: 'Being compared', state: 'compare' }],
  varLabels: ['node', 'tree size', 'total cost'],
  approach: {
    title: 'Prim: grow the tree one cheapest point at a time',
    text: 'Start from point 0. Every outside point stores minD, the cheapest edge connecting it to the tree. Repeatedly add the outside point with the smallest minD to the tree, pay that cost, then check whether the new point offers cheaper links to the remaining points.',
  },
  java: [
    'public int minCostConnectPoints(int[][] p) {',
    '    int n = p.length, total = 0;',
    '    int[] minD = new int[n];',
    '    boolean[] inTree = new boolean[n];',
    '    Arrays.fill(minD, Integer.MAX_VALUE);',
    '    minD[0] = 0;',
    '    for (int it = 0; it < n; it++) {',
    '        int u = -1;',
    '        for (int i = 0; i < n; i++)',
    '            if (!inTree[i] && (u == -1 || minD[i] < minD[u])) u = i;',
    '        inTree[u] = true;',
    '        total += minD[u];',
    '        for (int v = 0; v < n; v++) {',
    '            if (inTree[v]) continue;',
    '            int d = Math.abs(p[u][0] - p[v][0]) + Math.abs(p[u][1] - p[v][1]);',
    '            if (d < minD[v]) minD[v] = d;',
    '        }',
    '    }',
    '    return total;',
    '}',
  ],
  python: [
    'def min_cost_connect_points(p):',
    '    n, total = len(p), 0',
    "    min_d = [float('inf')] * n",
    '    in_tree = [False] * n',
    '    min_d[0] = 0',
    '    for _ in range(n):',
    '        u = min((i for i in range(n) if not in_tree[i]), key=lambda i: min_d[i])',
    '        in_tree[u] = True',
    '        total += min_d[u]',
    '        for v in range(n):',
    '            if not in_tree[v]:',
    '                d = abs(p[u][0] - p[v][0]) + abs(p[u][1] - p[v][1])',
    '                min_d[v] = min(min_d[v], d)',
    '    return total',
  ],
  phases: [
    { icon: '🚀', label: 'Init: minD[0] = 0', tone: 'blue' },
    { icon: '🌿', label: 'Add cheapest point', tone: 'green' },
    { icon: '🔎', label: 'Update minD[ ]', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['Manhattan distance', 'minimum total cost', 'connect all points'],
  algorithm: [
    'Set minD[0] = 0 and every other minD to ∞; nothing is in the tree yet',
    'Pick the outside point u with the smallest minD, add it, and add minD[u] to the total',
    'For every outside point v, set minD[v] = min(minD[v], dist(u, v))',
    'Repeat until all points are in the tree; the total is the answer',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Cut property: for any split of the points into "tree" and "rest", the cheapest edge crossing the split belongs to some minimum spanning tree. Prim picks exactly that edge each round, so by induction the tree built so far always extends to an optimal one. With a dense (complete) graph, the O(n²) array version beats a heap.',
};
