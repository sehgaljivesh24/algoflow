import type { Aux, ProblemDef, Step } from '../engine/types';
import { Dsu, isConnected, mstScene, parseWeightedEdges, tokens } from './mstKit.ts';
import type { EdgeMark, WEdge } from './mstKit.ts';

/** n points 1..n joined by weighted "distance" edges; split them into k clusters so the closest pair of different clusters is as far apart as possible. */
interface In { n: number; k: number; edges: WEdge[] }

function parse(raw: string): In {
  const t = tokens(raw);
  if (t.length < 3 || !/^\d+$/.test(t[0]) || !/^\d+$/.test(t[1])) throw new Error('Write n, then k, then distances like 5 2 1-2:3 2-3:4 3-4:9 4-5:2');
  const n = Number(t[0]);
  const k = Number(t[1]);
  if (n < 3 || n > 8) throw new Error('Use between 3 and 8 points');
  if (k < 2 || k > n) throw new Error(`k must be between 2 and ${n}`);
  const edges = parseWeightedEdges(t.slice(2), { lo: 1, hi: n, max: 14, example: '1-2:3 2-3:4' });
  if (!isConnected(n, edges.map((e) => ({ u: e.u - 1, v: e.v - 1 })))) throw new Error('Every point must be reachable from every other (the distance graph must be connected)');
  return { n, k, edges };
}

function build({ n, k, edges: input }: In): Step[] {
  const edges = input.map((e, i) => ({ e, i })).sort((a, b) => a.e.w - b.e.w || a.i - b.i).map((x) => x.e);
  const dsu = new Dsu(n);
  const marks: EdgeMark[] = edges.map(() => 'todo');
  const steps: Step[] = [];
  let cur = -1;
  let clusters = n;
  let spacing: number | string = '—';
  let ra: number | string = '—';
  let rb: number | string = '—';
  let hot: number[] = [];
  let hotState: 'active' | 'error' | 'found' = 'active';

  const aux = (): Aux[] => [
    { title: 'edges sorted by distance', kind: 'queue', items: edges.map((e, i) => `${e.u}-${e.v} (${e.w})${marks[i] === 'take' ? ' merge' : marks[i] === 'skip' || marks[i] === 'bad' ? ' inside' : ''}`), highlight: cur >= 0 ? cur : undefined, bad: marks.flatMap((m, i) => (m === 'skip' && i === cur ? [i] : [])) },
    { title: 'parent[ ]', kind: 'list', items: Array.from({ length: n }, (_, j) => `${j + 1}→${dsu.parent[j] + 1}`) },
  ];
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) =>
    steps.push({
      ...s,
      scene: mstScene({ n, base: 1, edges, marks, dsu, hot, hotState }),
      aux: aux(),
      vars: { edge: cur >= 0 ? `${edges[cur].u}-${edges[cur].v}` : '—', 'root(u)': ra, 'root(v)': rb, clusters, spacing },
    });

  push({
    title: 'Start with one cluster per point', desc: `${n} points, so ${n} clusters. We want exactly ${k}. Sort the distances; merging the closest pair of clusters repeatedly is Kruskal with an early stop.`,
    logic: 'To keep different clusters far apart we should glue together the closest points first, and stop once only k clusters remain.', logicTone: 'info',
    tag: 'SORT', note: `clusters = ${n}, target k = ${k}, distances ascending: ${edges.map((e) => e.w).join(', ')}`,
    javaLines: [1, 2, 3, 4], pyLines: [1, 2, 3], algoStep: 0,
  });

  let answered = false;
  for (let i = 0; i < edges.length && !answered; i++) {
    const { u, v, w } = edges[i];
    cur = i; ra = '—'; rb = '—'; hot = [u, v]; hotState = 'active';
    marks[i] = 'cur';
    push({
      title: `Look at ${u}-${v} (distance ${w})`, desc: `Closest remaining pair: ${u} and ${v} at distance ${w}. There are ${clusters} clusters and we want ${k}.`,
      logic: 'Edges are processed in increasing distance, exactly like Kruskal.', logicTone: 'info',
      tag: 'LOOK', note: `edge (${u}, ${v}), d = ${w}, clusters = ${clusters} vs k = ${k}`,
      javaLines: [5, 6], pyLines: [4, 5], algoStep: 1,
    });
    const a = dsu.find(u - 1) + 1;
    const b = dsu.find(v - 1) + 1;
    ra = a; rb = b;
    if (a === b) {
      marks[i] = 'skip';
      push({
        title: `${u} and ${v} already share a cluster`, desc: `Both have leader ${a}, so this edge lies inside a cluster and does not matter for the spacing.`,
        logic: 'Spacing only looks at pairs in DIFFERENT clusters; an inside edge is ignored.', logicTone: 'info',
        tag: 'SKIP', alert: `Edge ${u}-${v} lies inside cluster ${a}: it cannot be the spacing.`, note: `find(${u}) = find(${v}) = ${a} → continue`,
        javaLines: [7], pyLines: [6, 7], algoStep: 2,
      });
      continue;
    }
    if (clusters === k) {
      spacing = w;
      answered = true;
      hotState = 'found';
      push({
        title: `Spacing found: ${w}`, desc: `We are down to ${k} clusters and this is the cheapest edge between two different ones (${u}-${v}, distance ${w}). That distance is the best possible spacing.`,
        logic: 'Every cheaper edge was inside a cluster. Any other way to cut into k clusters would put some edge of weight ≤ this one across two clusters.', logicTone: 'success',
        tag: 'SPACING', note: `clusters == k == ${k} and ${a} ≠ ${b} → return ${w}`,
        javaLines: [8], pyLines: [8, 9], algoStep: 4,
      });
      break;
    }
    dsu.parent[a - 1] = b - 1;
    clusters--;
    marks[i] = 'take';
    push({
      title: `Merge clusters of ${u} and ${v}`, desc: `Different leaders (${a}, ${b}), and we still have more than ${k} clusters, so merge them. Clusters left: ${clusters}.`,
      logic: 'Merging the closest pair is the cheapest way to lose a cluster, and it never wastes a large gap.', logicTone: 'success',
      tag: 'MERGE', note: `parent[${a}] = ${b}, clusters = ${clusters} (target ${k})`,
      javaLines: [9, 10], pyLines: [10, 11], algoStep: 3,
    });
  }

  cur = -1;
  const sel = marks.findIndex((m) => m === 'cur');
  steps.push({
    title: `Maximum spacing = ${spacing}`, desc: `The ${k} clusters are shown in colour (singletons have none). The closest pair from different clusters is ${sel >= 0 ? `${edges[sel].u}-${edges[sel].v}` : '—'}, distance ${spacing}.`,
    scene: mstScene({ n, base: 1, edges, marks, dsu, hot: sel >= 0 ? [edges[sel].u, edges[sel].v] : [], hotState: 'found' }),
    aux: aux(),
    vars: { edge: sel >= 0 ? `${edges[sel].u}-${edges[sel].v}` : '—', 'root(u)': ra, 'root(v)': rb, clusters, spacing },
    logic: 'Max spacing equals the weight of the first Kruskal edge that would merge two of the final k clusters.', logicTone: 'success',
    tag: '✅ Done!', note: `${k} clusters → return spacing = ${spacing}`,
    javaLines: [8], pyLines: [8, 9], algoStep: 4,
    result: { title: String(spacing), text: `Maximum spacing of a ${k}-clustering` },
  });
  return steps;
}

const mk = (n: number, k: number, s: string): In => ({ n, k, edges: s.split(' ').map((t) => { const m = /^(\d+)-(\d+):(\d+)$/.exec(t)!; return { u: +m[1], v: +m[2], w: +m[3] }; }) });

export const maxSpacingKClustering: ProblemDef<In> = {
  slug: 'cp-max-spacing-k-clustering-kruskal',
  id: 'CP', title: 'Max Spacing K-Clustering (Kruskal)', difficulty: 'Medium', category: 'Graph', tag: 'Kruskal stopped early',
  statement: 'You are given n points and the distance between some pairs of them (the graph is connected). Split the points into exactly k non-empty clusters so that the smallest distance between two points in different clusters (the spacing) is as large as possible, and return that spacing.',
  constraints: '2 ≤ k ≤ n (animation input: 3–8 points, ≤ 14 distances, written "n k u-v:d ...")',
  examples: [
    { label: '5 points, k=2', input: mk(5, 2, '1-2:3 2-3:4 3-4:9 4-5:2 1-5:12'), output: '9' },
    { label: '6 points, k=3', input: mk(6, 3, '1-2:1 2-3:2 3-4:6 4-5:3 5-6:4 1-6:10 2-5:8'), output: '4' },
    { label: '4 points, k=4', input: mk(4, 4, '1-2:5 2-3:2 3-4:7 1-4:9'), output: '2' },
  ],
  inputPlaceholder: 'e.g. 5 2 1-2:3 2-3:4 3-4:9 4-5:2   (n, k, then u-v:distance)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Edge being looked at', state: 'active' }, { label: 'Merged (in a cluster)', state: 'found' }, { label: 'Spacing edge', state: 'found' }],
  varLabels: ['edge', 'root(u)', 'root(v)', 'clusters', 'spacing'],
  approach: {
    title: 'Run Kruskal until only k groups are left',
    text: 'Sort the distances and merge groups with union-find, cheapest first, exactly like Kruskal. Each merge reduces the cluster count by one. When k clusters remain, stop merging: the next edge whose ends lie in different clusters is the smallest gap between clusters, and that is the spacing.',
  },
  java: [
    'public int maxSpacing(int n, int k, int[][] edges) {',
    '    Arrays.sort(edges, (a, b) -> a[2] - b[2]);   // closest pairs first',
    '    int[] parent = new int[n + 1];',
    '    for (int i = 1; i <= n; i++) parent[i] = i;',
    '    int clusters = n;',
    '    for (int[] e : edges) {',
    '        int a = find(parent, e[0]), b = find(parent, e[1]);',
    '        if (a == b) continue;                 // inside one cluster',
    '        if (clusters == k) return e[2];       // cheapest link between two clusters',
    '        parent[a] = b;                        // merge the two closest clusters',
    '        clusters--;',
    '    }',
    '    return -1;',
    '}',
    '',
    'private int find(int[] parent, int x) {',
    '    while (parent[x] != x) {',
    '        parent[x] = parent[parent[x]];',
    '        x = parent[x];',
    '    }',
    '    return x;',
    '}',
  ],
  python: [
    'def max_spacing(n, k, edges):',
    '    edges.sort(key=lambda e: e[2])             # closest pairs first',
    '    parent = list(range(n + 1))',
    '    clusters = n',
    '    for u, v, d in edges:',
    '        a, b = find(parent, u), find(parent, v)',
    '        if a == b:',
    '            continue                          # inside one cluster',
    '        if clusters == k:',
    '            return d                          # cheapest link between two clusters',
    '        parent[a] = b                         # merge the two closest clusters',
    '        clusters -= 1',
    '    return -1',
    '',
    'def find(parent, x):',
    '    while parent[x] != x:',
    '        parent[x] = parent[parent[x]]',
    '        x = parent[x]',
    '    return x',
  ],
  phases: [
    { icon: '📑', label: 'Sort distances', tone: 'blue' },
    { icon: '🔍', label: 'Next closest pair', tone: 'cyan' },
    { icon: '⏭', label: 'Skip: inside cluster', tone: 'orange' },
    { icon: '🔗', label: 'Merge clusters', tone: 'green' },
    { icon: '✅', label: 'Done: spacing', tone: 'green' },
  ],
  emphasis: ['k non-empty clusters', 'spacing', 'as large as possible'],
  algorithm: [
    'Sort the distances ascending; every point is its own cluster (n clusters)',
    'Take the next edge and find the cluster leaders of both ends',
    'Same leader: the edge is inside a cluster, ignore it',
    'Different leaders and more than k clusters: merge them and count one fewer cluster',
    'Different leaders and exactly k clusters: this distance is the maximum spacing',
  ],
  complexity: [{ label: 'Time', value: 'O(E log E)' }, { label: 'Space', value: 'O(V)' }],
  why: 'After n − k merges the clusters are the components of the n − k cheapest tree edges. Any other split into k clusters has to separate two points that Kruskal had already joined by edges no heavier than the spacing edge, so at least one edge of weight no greater than that spacing crosses between two of its clusters. Hence no k-clustering beats the weight of the first Kruskal edge that crosses between our k clusters.',
};
