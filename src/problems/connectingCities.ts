import type { Aux, ProblemDef, Step } from '../engine/types';
import { Dsu, mstScene, parseWeightedEdges, tokens } from './mstKit.ts';
import type { EdgeMark, WEdge } from './mstKit.ts';

/** Cities 1..n, connections u-v:cost. Kruskal: sort by cost, keep an edge unless it joins a group to itself. */
interface In { n: number; edges: WEdge[] }

function parse(raw: string): In {
  const t = tokens(raw);
  if (t.length < 2 || !/^\d+$/.test(t[0])) throw new Error('Write n, then connections like 4 1-2:5 1-3:6 2-3:1 2-4:3');
  const n = Number(t[0]);
  if (n < 2 || n > 8) throw new Error('Use between 2 and 8 cities');
  return { n, edges: parseWeightedEdges(t.slice(1), { lo: 1, hi: n, max: 14, example: '1-2:5 2-3:1' }) };
}

function build({ n, edges: input }: In): Step[] {
  const edges = input.map((e, i) => ({ e, i })).sort((a, b) => a.e.w - b.e.w || a.i - b.i).map((x) => x.e);
  const dsu = new Dsu(n);
  const marks: EdgeMark[] = edges.map(() => 'todo');
  const steps: Step[] = [];
  let cur = -1;
  let total = 0;
  let used = 0;
  let ra: number | string = '—';
  let rb: number | string = '—';
  let hot: number[] = [];
  let hotState: 'active' | 'error' = 'active';

  const aux = (): Aux[] => [
    { title: 'edges sorted by cost', kind: 'queue', items: edges.map((e, i) => `${e.u}-${e.v} (${e.w})${marks[i] === 'take' ? ' ✓' : marks[i] === 'skip' || marks[i] === 'bad' ? ' ✗' : ''}`), highlight: cur >= 0 ? cur : undefined, bad: marks.flatMap((m, i) => (m === 'bad' ? [i] : [])) },
    { title: 'parent[ ]', kind: 'list', items: Array.from({ length: n }, (_, k) => `${k + 1}→${dsu.parent[k] + 1}`) },
  ];
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) =>
    steps.push({
      ...s,
      scene: mstScene({ n, base: 1, edges, marks, dsu, hot, hotState }),
      aux: aux(),
      vars: { edge: cur >= 0 ? `${edges[cur].u}-${edges[cur].v}` : '—', 'root(u)': ra, 'root(v)': rb, cost: total, used: `${used}/${n - 1}` },
    });

  push({
    title: 'Sort the connections', desc: `${edges.length} possible links between ${n} cities. Sort them from cheapest to most expensive; every city starts in its own group.`,
    logic: 'Trying cheap links first is safe: the cheapest link that does not form a loop always belongs to some cheapest network.', logicTone: 'info',
    tag: 'SORT', note: `costs ascending: ${edges.map((e) => e.w).join(', ')}; ${n} groups`,
    javaLines: [1, 2, 3, 4], pyLines: [1, 2, 3], algoStep: 0,
  });

  let done = false;
  for (let i = 0; i < edges.length && !done; i++) {
    const { u, v, w } = edges[i];
    cur = i; ra = '—'; rb = '—'; hot = [u, v]; hotState = 'active';
    marks[i] = 'cur';
    push({
      title: `Consider ${u}-${v} (cost ${w})`, desc: `Next cheapest link: cities ${u} and ${v} for ${w}. Are they already in the same group?`,
      logic: 'Two cities are already connected exactly when their group leaders match.', logicTone: 'info',
      tag: 'CONSIDER', note: `edge ${i + 1}/${edges.length} = (${u}, ${v}), cost ${w}`,
      javaLines: [5], pyLines: [4], algoStep: 1,
    });
    const a = dsu.find(u - 1) + 1;
    const b = dsu.find(v - 1) + 1;
    ra = a; rb = b;
    if (a === b) {
      marks[i] = 'bad'; hotState = 'error';
      push({
        title: `Skip ${u}-${v}: same group`, desc: `find(${u}) = find(${v}) = ${a}. The two cities are already linked through cheaper edges, so paying ${w} would only create a loop.`,
        logic: 'An edge inside a group closes a cycle; a spanning tree never needs one.', logicTone: 'warn',
        tag: 'SKIP', alert: `Rejected ${u}-${v}: both cities are already in group ${a}, so it would close a cycle.`, note: `find(${u}) = find(${v}) = ${a} → continue`,
        javaLines: [6, 7], pyLines: [5, 6, 7], algoStep: 2,
      });
      marks[i] = 'skip';
      continue;
    }
    dsu.parent[a - 1] = b - 1;
    total += w; used++;
    marks[i] = 'take';
    push({
      title: `Take ${u}-${v}: cost ${total}`, desc: `Leaders ${a} and ${b} differ, so link the groups (parent[${a}] = ${b}) and pay ${w}. Total so far ${total}; ${used} of ${n - 1} links chosen.`,
      logic: 'Joining two different groups can never create a cycle and shrinks the number of groups by one.', logicTone: 'success',
      tag: 'KEEP', note: `parent[${a}] = ${b}, total += ${w} → ${total}, used = ${used}/${n - 1}`,
      javaLines: [8, 9, 10], pyLines: [8, 9, 10, 11, 12], algoStep: 3,
    });
    if (used === n - 1) {
      done = true;
      cur = -1; hot = [];
      push({
        title: 'Spanning tree complete', desc: `${n - 1} links join all ${n} cities, so the remaining (more expensive) connections are not needed.`,
        logic: 'A tree on n nodes has exactly n − 1 edges: no further edge can help.', logicTone: 'success',
        tag: 'COMPLETE', note: `used == n − 1 = ${n - 1} → return ${total}`,
        javaLines: [10], pyLines: [11, 12], algoStep: 3,
      });
    }
  }

  cur = -1; hot = [];
  const ans = used === n - 1 ? total : -1;
  steps.push({
    title: ans === -1 ? 'Some cities cannot be reached' : `Minimum cost ${ans}`,
    desc: ans === -1 ? `Only ${used} links were possible, fewer than n − 1 = ${n - 1}. The cities fall into ${dsu.components()} separate groups, so the answer is −1.` : `The chosen links connect every city for a total of ${ans}.`,
    scene: mstScene({ n, base: 1, edges, marks, dsu }),
    aux: aux(),
    vars: { edge: '—', 'root(u)': '—', 'root(v)': '—', cost: total, used: `${used}/${n - 1}` },
    logic: ans === -1 ? 'If the edges run out before the tree has n − 1 edges, the graph is disconnected.' : 'Greedy choice plus union-find gives the cheapest way to connect everything.', logicTone: ans === -1 ? 'warn' : 'success',
    tag: ans === -1 ? '⚠ Not connected!' : '✅ Done!', note: ans === -1 ? `used = ${used} < n − 1 = ${n - 1} → return -1` : `return total = ${ans}`,
    alert: ans === -1 ? `Edges ran out after ${used} kept links: the cities form ${dsu.components()} separate groups.` : undefined,
    javaLines: ans === -1 ? [12] : [10], pyLines: ans === -1 ? [13] : [12], algoStep: 4,
    result: { title: String(ans), text: ans === -1 ? 'The cities cannot all be connected' : 'Minimum cost to connect all cities' },
  });
  return steps;
}

const mk = (n: number, s: string): In => ({ n, edges: s.split(' ').map((t) => { const m = /^(\d+)-(\d+):(\d+)$/.exec(t)!; return { u: +m[1], v: +m[2], w: +m[3] }; }) });

export const connectingCities: ProblemDef<In> = {
  slug: '1135-connecting-cities-with-minimum-cost',
  id: '1135', title: 'Connecting Cities With Minimum Cost', difficulty: 'Medium', category: 'Graph', tag: "Kruskal's MST",
  statement: 'There are n cities numbered 1 to n and a list of possible roads, each with a building cost. Return the minimum total cost to connect all the cities (every city reachable from every other), or -1 if that is impossible.',
  constraints: '1 ≤ n ≤ 10⁴, 1 ≤ cost ≤ 10⁵ (animation input: 2–8 cities, ≤ 14 connections, written "n u-v:cost ...")',
  examples: [
    { label: '3 cities | 1-2:5 1-3:6 2-3:1', input: mk(3, '1-2:5 1-3:6 2-3:1'), output: '6' },
    { label: '4 cities | 1-2:3 3-4:4', input: mk(4, '1-2:3 3-4:4'), output: '-1' },
    { label: '6 cities | 1-2:4 1-3:3 2-3:2 2-4:7 3-5:5 4-5:1 4-6:6 5-6:8', input: mk(6, '1-2:4 1-3:3 2-3:2 2-4:7 3-5:5 4-5:1 4-6:6 5-6:8'), output: '17' },
  ],
  inputPlaceholder: 'e.g. 3 1-2:5 1-3:6 2-3:1   (n, then u-v:cost)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Edge being considered', state: 'active' }, { label: 'Edge kept (in the tree)', state: 'found' }, { label: 'Rejected: would form a cycle', state: 'error' }],
  varLabels: ['edge', 'root(u)', 'root(v)', 'cost', 'used'],
  approach: {
    title: "Kruskal: cheapest edge first, skip anything that closes a loop",
    text: 'Sort all connections by cost. Walk through them in order with a union-find over the cities. If the two ends are already in the same group, skip the edge; otherwise keep it, pay its cost and merge the groups. Stop after n − 1 kept edges. If the edges run out sooner, some cities are unreachable.',
  },
  java: [
    'public int minimumCost(int n, int[][] connections) {',
    '    Arrays.sort(connections, (a, b) -> a[2] - b[2]);   // cheapest first',
    '    int[] parent = new int[n + 1];',
    '    for (int i = 1; i <= n; i++) parent[i] = i;',
    '    int total = 0, used = 0;',
    '    for (int[] c : connections) {',
    '        int a = find(parent, c[0]), b = find(parent, c[1]);',
    '        if (a == b) continue;              // would close a cycle',
    '        parent[a] = b;                     // join the two groups',
    '        total += c[2];',
    '        if (++used == n - 1) return total; // spanning tree complete',
    '    }',
    '    return -1;                             // cities cannot all be linked',
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
    'def minimum_cost(n, connections):',
    '    connections.sort(key=lambda c: c[2])      # cheapest first',
    '    parent = list(range(n + 1))',
    '    total = used = 0',
    '    for u, v, cost in connections:',
    '        a, b = find(parent, u), find(parent, v)',
    '        if a == b:',
    '            continue                         # would close a cycle',
    '        parent[a] = b                        # join the two groups',
    '        total += cost',
    '        used += 1',
    '        if used == n - 1:',
    '            return total',
    '    return -1',
    '',
    'def find(parent, x):',
    '    while parent[x] != x:',
    '        parent[x] = parent[parent[x]]',
    '        x = parent[x]',
    '    return x',
  ],
  phases: [
    { icon: '📑', label: 'Sort edges by cost', tone: 'blue' },
    { icon: '🔍', label: 'Next cheapest edge', tone: 'cyan' },
    { icon: '⛔', label: 'Skip: same group', tone: 'orange' },
    { icon: '🌿', label: 'Keep: merge groups', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['minimum total cost', 'connect all the cities', '-1'],
  algorithm: [
    'Sort the connections by cost and make every city its own group',
    'Take the next cheapest connection (u, v) and find the leaders of u and v',
    'Same leader: skip it, it would close a cycle',
    'Different leaders: keep it, add its cost and merge the two groups',
    'After n − 1 kept edges return the total; if edges run out first return −1',
  ],
  complexity: [{ label: 'Time', value: 'O(E log E)' }, { label: 'Space', value: 'O(V)' }],
  why: 'Take the cheapest edge e that joins two different groups. Any minimum network that omits e must contain some path between its ends; that path crosses from one of the two groups to the rest through a link at least as expensive as e, and swapping it for e does not raise the cost. So e is safe to keep, and repeating the argument group by group builds a cheapest spanning tree. The edges run out before n − 1 are kept only when the cities are not all connected.',
};
