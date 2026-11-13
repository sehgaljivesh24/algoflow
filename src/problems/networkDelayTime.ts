import type { Aux, CellState, EdgeState, GraphEdgeVM, ProblemDef, Step } from '../engine/types';
import { parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

/** Nodes 1..n, directed weighted edges u>v:w, signal starts at k. */
interface In { n: number; k: number; edges: EdgeIn[] }

function parse(raw: string): In {
  const toks = tokens(raw);
  if (toks.length < 3 || !/^\d+$/.test(toks[0]) || !/^\d+$/.test(toks[1])) {
    throw new Error('Write n, then the start node k, then weighted edges, e.g. 4 2 2>1:1 2>3:1 3>4:1');
  }
  const n = Number(toks[0]);
  const k = Number(toks[1]);
  if (n < 2 || n > 8) throw new Error('Use between 2 and 8 nodes');
  if (k < 1 || k > n) throw new Error(`The start node k must be between 1 and ${n}`);
  const edges = parseEdges(toks.slice(2).join(' '), { weighted: true, lo: 1, hi: n, max: 14, example: '2>1:1 2>3:1' });
  if (edges.some((e) => e.u === e.v)) throw new Error('An edge cannot connect a node to itself');
  return { n, k, edges };
}

const INF = Infinity;

function build({ n, k, edges }: In): Step[] {
  const adj: number[][] = Array.from({ length: n + 1 }, () => []);
  edges.forEach((e, i) => adj[e.u].push(i));
  const dist = new Array<number>(n + 1).fill(INF);
  const done = new Array<boolean>(n + 1).fill(false);
  const parentEdge = new Array<number>(n + 1).fill(-1);
  const examined: boolean[] = edges.map(() => false);
  const pq: [number, number][] = [];
  const steps: Step[] = [];
  let cur: number | null = null;
  let curEdge = -1;
  let best: number | string = '—';

  const dd = (x: number) => (x === INF ? '∞' : String(x));
  const sortPq = () => pq.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const scene = () => ({
    kind: 'graph' as const,
    nodes: Array.from({ length: n }, (_, k0) => {
      const id = k0 + 1;
      const state: CellState | undefined = id === cur ? 'active' : done[id] ? 'found' : dist[id] < INF ? 'compare' : undefined;
      return { id, state, tag: `d=${dd(dist[id])}` };
    }),
    edges: edges.map((e, i): GraphEdgeVM => {
      const st: EdgeState = i === curEdge ? 'active' : parentEdge[e.v] === i ? 'chosen' : examined[i] ? 'visited' : 'default';
      return { from: e.u, to: e.v, weight: e.w, directed: true, state: st };
    }),
  });
  const aux = (): Aux[] => [
    {
      title: 'priority queue (dist, node) — smallest first; stale entries marked',
      kind: 'queue',
      items: pq.map(([d, v]) => `(${d}, ${v})${d > dist[v] ? ' stale' : ''}`),
      bad: pq.flatMap(([d, v], i) => (d > dist[v] ? [i] : [])),
    },
    { title: 'dist[ ]', kind: 'list', items: Array.from({ length: n }, (_, i) => `${i + 1}: ${dd(dist[i + 1])}`) },
  ];
  const vars = () => ({ node: cur ?? '—', 'dist[node]': cur === null ? '—' : dd(dist[cur]), answer: best });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `Signal starts at node ${k}. Every distance is unknown (∞) except dist[${k}] = 0.`,
    logic: 'We want the time until the LAST node hears the signal, so we need the shortest travel time to every node.', logicTone: 'info',
    tag: 'INIT —', note: `dist[1..${n}] = ∞, signal starts at k = ${k}`,
    javaLines: [1, 2, 3, 4, 5], pyLines: [1, 2, 3, 4], algoStep: 0,
  });
  dist[k] = 0;
  pq.push([0, k]);
  push({
    title: `dist[${k}] = 0, push (0, ${k})`, desc: `The source ${k} is reachable at time 0, so (0, ${k}) enters the priority queue.`,
    logic: 'The queue always hands us the closest node whose distance is not final yet.', logicTone: 'info',
    tag: 'SEED', note: `dist[${k}] = 0, pq = [(0, ${k})]`,
    javaLines: [6, 7, 8], pyLines: [5, 6], algoStep: 0,
  });

  while (pq.length) {
    sortPq();
    const [d, u] = pq.shift()!;
    curEdge = -1;
    if (d > dist[u]) {
      cur = null;
      push({
        title: `Skip stale entry (${d}, ${u})`, desc: `dist[${u}] is already ${dist[u]}, which is better than ${d}. This queue entry is outdated.`,
        logic: 'A node can be pushed several times when a shorter route is found later; only the first (smallest) pop counts.', logicTone: 'warn',
        tag: 'SKIP', alert: `Stale entry (${d}, ${u}): node ${u} was already finalised at ${dist[u]}, so ${d} is outdated.`, note: `d = ${d} > dist[${u}] = ${dist[u]} → continue`,
        javaLines: [10, 11, 12], pyLines: [8, 9, 10], algoStep: 3,
      });
      continue;
    }
    cur = u;
    done[u] = true;
    push({
      title: `Pop node ${u} (distance ${d})`, desc: `Node ${u} is the closest unfinished node, so dist[${u}] = ${d} is final.`,
      logic: 'All edge weights are ≥ 0, so no later path can reach this node faster.', logicTone: 'success',
      tag: 'POP', note: `poll → d = ${d}, u = ${u}; dist[${u}] = ${d} is final`,
      javaLines: [10, 11], pyLines: [8], algoStep: 1,
    });
    for (const ei of adj[u]) {
      const e = edges[ei];
      const nd = d + e.w!;
      curEdge = ei;
      examined[ei] = true;
      const better = nd < dist[e.v];
      if (better) {
        if (parentEdge[e.v] !== -1) examined[parentEdge[e.v]] = true;
        const old = dist[e.v];
        dist[e.v] = nd;
        parentEdge[e.v] = ei;
        pq.push([nd, e.v]);
        sortPq();
        push({
          title: `Relax ${u} → ${e.v}: ${d} + ${e.w} = ${nd} < ${dd(old)}`, desc: `A shorter route to ${e.v} through ${u}: dist[${e.v}] becomes ${nd} and (${nd}, ${e.v}) joins the queue.`,
          logic: 'Relaxing an edge means checking whether going through u improves the best known time to v.', logicTone: 'success',
          tag: 'RELAX', note: `${d} + ${e.w} = ${nd} < ${dd(old)} → dist[${e.v}] = ${nd}, push (${nd}, ${e.v})`,
          javaLines: [13, 14, 15, 16, 17], pyLines: [11, 12, 13, 14], algoStep: 2,
        });
      } else {
        push({
          title: `Relax ${u} → ${e.v}: ${d} + ${e.w} = ${nd} ≥ ${dd(dist[e.v])}`, desc: `No improvement: dist[${e.v}] stays ${dd(dist[e.v])}.`,
          logic: 'The known route to v is at least as good, so this edge changes nothing.', logicTone: 'info',
          tag: 'RELAX', alert: `No relaxation: ${nd} is not better than dist[${e.v}] = ${dd(dist[e.v])}.`, note: `${d} + ${e.w} = ${nd} ≥ ${dd(dist[e.v])} → dist[${e.v}] unchanged`,
          javaLines: [13, 14, 15], pyLines: [11, 12], algoStep: 2,
        });
      }
      curEdge = -1;
    }
    cur = null;
  }

  const unreachable = [];
  for (let i = 1; i <= n; i++) if (dist[i] === INF) unreachable.push(i);
  const ans = unreachable.length ? -1 : Math.max(...dist.slice(1));
  best = ans;
  const far = unreachable.length ? 0 : dist.indexOf(ans, 1);
  steps.push({
    title: unreachable.length ? `Node${unreachable.length > 1 ? 's' : ''} ${unreachable.join(', ')} unreachable` : `Farthest node is ${far}`,
    desc: unreachable.length ? 'The signal never reaches every node, so the answer is −1.' : `The last node to receive the signal is ${far}, at time ${ans}.`,
    scene: {
      ...scene(),
      nodes: scene().nodes.map((v) => ({ ...v, state: dist[v.id] === INF ? ('error' as const) : v.id === far ? ('swap' as const) : ('found' as const) })),
    },
    aux: aux(), vars: vars(),
    logic: 'The network delay is the largest shortest-path distance, because every node must receive the signal.', logicTone: unreachable.length ? 'warn' : 'success',
    tag: '✅ Done!', note: unreachable.length ? `dist[${unreachable[0]}] = ∞ → return -1` : `max(dist) = ${ans} → return ${ans}`,
    javaLines: [21, 22, 23, 24, 26], pyLines: [15, 16], algoStep: 4,
    result: { title: String(ans), text: unreachable.length ? 'Some node can never be reached' : 'Time for all nodes to receive the signal' },
  });
  return steps;
}

const mk = (n: number, k: number, s: string): In => ({
  n, k,
  edges: s.split(' ').map((t) => { const m = /^(\d+)>(\d+):(\d+)$/.exec(t)!; return { u: +m[1], v: +m[2], w: +m[3] }; }),
});

export const networkDelayTime: ProblemDef<In> = {
  slug: '743-network-delay-time',
  id: '743', title: 'Network Delay Time', difficulty: 'Medium', category: 'Graph', tag: 'Dijkstra',
  statement: 'A network has n nodes labelled 1 to n and directed edges u→v that take w time units to cross. A signal is sent from node k. Return how long it takes for every node to receive it, or -1 if some node can never be reached.',
  constraints: '1 ≤ k ≤ n ≤ 100, 0 ≤ w ≤ 100 (animation input: 2–8 nodes, ≤ 14 edges; write "n k" then edges like 2>1:1)',
  examples: [
    { label: '4 2 | 2>1:1 2>3:1 3>4:1', input: mk(4, 2, '2>1:1 2>3:1 3>4:1'), output: '2' },
    { label: '5 1 | 1>2:4 1>3:1 3>2:2 2>4:1 3>4:5 4>5:3', input: mk(5, 1, '1>2:4 1>3:1 3>2:2 2>4:1 3>4:5 4>5:3'), output: '7' },
    { label: '3 1 | 1>2:1', input: mk(3, 1, '1>2:1'), output: '-1' },
  ],
  inputPlaceholder: 'e.g. 4 2 2>1:1 2>3:1 3>4:1   (n, start k, edges u>v:w)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Just finalised', state: 'active' }, { label: 'Seen, not final', state: 'compare' }, { label: 'Final distance', state: 'found' }, { label: 'Unreachable', state: 'error' }],
  varLabels: ['node', 'dist[node]', 'answer'],
  approach: {
    title: 'Dijkstra: always expand the closest unfinished node',
    text: 'Keep the best known distance to each node and a min-priority-queue of candidates. Pop the closest node (its distance is now final because weights are non-negative), then relax each outgoing edge: if going through this node is shorter, update the neighbour and push it. The answer is the largest final distance.',
  },
  java: [
    'public int networkDelayTime(int[][] times, int n, int k) {',
    '    List<int[]>[] adj = new List[n + 1];',
    '    for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();',
    '    for (int[] t : times) adj[t[0]].add(new int[]{t[1], t[2]});',
    '    int[] dist = new int[n + 1];',
    '    Arrays.fill(dist, Integer.MAX_VALUE);',
    '    dist[k] = 0;',
    '    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);',
    '    pq.add(new int[]{0, k});',
    '    while (!pq.isEmpty()) {',
    '        int[] top = pq.poll();',
    '        int d = top[0], u = top[1];',
    '        if (d > dist[u]) continue;            // stale entry',
    '        for (int[] e : adj[u]) {',
    '            int v = e[0], nd = d + e[1];',
    '            if (nd < dist[v]) {               // relax',
    '                dist[v] = nd;',
    '                pq.add(new int[]{nd, v});',
    '            }',
    '        }',
    '    }',
    '    int ans = 0;',
    '    for (int i = 1; i <= n; i++) {',
    '        if (dist[i] == Integer.MAX_VALUE) return -1;',
    '        ans = Math.max(ans, dist[i]);',
    '    }',
    '    return ans;',
    '}',
  ],
  python: [
    'def network_delay_time(times, n, k):',
    '    adj = defaultdict(list)',
    '    for u, v, w in times:',
    '        adj[u].append((v, w))',
    "    dist = {i: float('inf') for i in range(1, n + 1)}",
    '    dist[k] = 0',
    '    pq = [(0, k)]',
    '    while pq:',
    '        d, u = heapq.heappop(pq)',
    '        if d > dist[u]:',
    '            continue                      # stale entry',
    '        for v, w in adj[u]:',
    '            if d + w < dist[v]:           # relax',
    '                dist[v] = d + w',
    '                heapq.heappush(pq, (d + w, v))',
    '    ans = max(dist.values())',
    "    return -1 if ans == float('inf') else ans",
  ],
  phases: [
    { icon: '🚀', label: 'Init: dist = ∞, push source', tone: 'blue' },
    { icon: '📤', label: 'Pop min', tone: 'cyan' },
    { icon: '🔁', label: 'Relax edge', tone: 'green' },
    { icon: '⏭', label: 'Skip stale', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['directed', 'every node', '-1'],
  algorithm: [
    'Set dist[k] = 0 and every other distance to ∞; push (0, k) into a min-heap',
    'Pop the smallest (d, u): that distance is final, and the loop runs until the heap is empty',
    'Relax every edge u→v: if d + w < dist[v], update it and push (d + w, v)',
    'If the popped d is larger than dist[u], the entry is stale: skip it',
    'Answer is the largest distance, or −1 if any node is still ∞',
  ],
  complexity: [{ label: 'Time', value: 'O(E log V)' }, { label: 'Space', value: 'O(V + E)' }],
  why: 'When a node is popped with the smallest key in the heap, any other route to it must leave the finished region through an edge to a node at least as far away, and weights are never negative, so it cannot beat the popped distance. That makes each popped distance final. The signal reaches everything exactly when all distances are finite, and the last arrival is the maximum.',
};
