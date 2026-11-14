import type { Aux, CellState, EdgeState, GraphEdgeVM, Pointer, ProblemDef, Step } from '../engine/types';
import { tokens } from './graphKit.ts';

/** Undirected edges u-v with success probability p (0 < p ≤ 1, at most two decimals). */
interface In { n: number; start: number; end: number; edges: { u: number; v: number; p: number }[] }

function parse(raw: string): In {
  const toks = tokens(raw);
  const msg = 'Write n, start, end, then edges with a probability, e.g. 3 0 2 0-1:0.5 1-2:0.5 0-2:0.2';
  if (toks.length < 3 || toks.slice(0, 3).some((t) => !/^\d+$/.test(t))) throw new Error(msg);
  const [n, start, end] = toks.slice(0, 3).map(Number);
  if (n < 2 || n > 8) throw new Error('Use between 2 and 8 nodes');
  if (start >= n || end >= n) throw new Error(`start and end must be between 0 and ${n - 1}`);
  if (start === end) throw new Error('start and end must be different nodes');
  const edgeToks = toks.slice(3);
  if (edgeToks.length > 12) throw new Error('Use at most 12 edges');
  const edges = edgeToks.map((t) => {
    const m = /^(\d+)-(\d+):(0?\.\d{1,2}|1(?:\.0{1,2})?)$/.exec(t);
    if (!m) throw new Error(`"${t}" is not an edge. Write u-v:probability like 0-1:0.5 (probability above 0, at most 1, two decimals)`);
    const u = Number(m[1]);
    const v = Number(m[2]);
    const p = Number(m[3]);
    if (u >= n || v >= n) throw new Error(`Node numbers must be between 0 and ${n - 1} (saw "${t}")`);
    if (u === v) throw new Error('An edge cannot connect a node to itself');
    if (p <= 0) throw new Error('A probability must be greater than 0');
    return { u, v, p };
  });
  if (new Set(edges.map((e) => `${Math.min(e.u, e.v)}-${Math.max(e.u, e.v)}`)).size !== edges.length) throw new Error('Each pair of nodes may have only one edge');
  return { n, start, end, edges };
}

const fmt = (x: number) => String(Number(x.toFixed(4)));

function build({ n, start, end, edges }: In): Step[] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  edges.forEach((e, i) => { adj[e.u].push(i); adj[e.v].push(i); });
  const prob = new Array<number>(n).fill(0);
  const done = new Array<boolean>(n).fill(false);
  const parentEdge = new Array<number>(n).fill(-1);
  const examined: boolean[] = edges.map(() => false);
  const heap: [number, number][] = [];
  const steps: Step[] = [];
  let cur: number | null = null;
  let curEdge = -1;
  let pathEdges: number[] = [];
  let best: string = '—';

  const sortHeap = () => heap.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const scene = () => ({
    kind: 'graph' as const,
    nodes: Array.from({ length: n }, (_, id) => {
      const state: CellState | undefined = id === cur ? 'active' : done[id] ? 'found' : prob[id] > 0 ? 'compare' : undefined;
      return { id, state, tag: `p=${fmt(prob[id])}` };
    }),
    edges: edges.map((e, i): GraphEdgeVM => {
      const st: EdgeState = i === curEdge ? 'active' : pathEdges.includes(i) ? 'chosen' : examined[i] ? 'visited' : 'default';
      return { from: e.u, to: e.v, weight: String(e.p), state: st };
    }),
    pointers: [
      { id: 's', label: 'start', index: start, tone: 'green' },
      { id: 'e', label: 'end', index: end, tone: 'purple' },
    ] as Pointer[],
  });
  const aux = (): Aux[] => [
    {
      title: 'max-heap (probability, node) — best first; stale entries marked',
      kind: 'queue',
      items: heap.map(([p, v]) => `(${fmt(p)}, ${v})${p < prob[v] ? ' stale' : ''}`),
      bad: heap.flatMap(([p, v], i) => (p < prob[v] ? [i] : [])),
    },
    { title: 'best probability so far', kind: 'list', items: prob.map((p, i) => `${i}: ${fmt(p)}`) },
  ];
  const vars = () => ({ node: cur ?? '—', 'prob[node]': cur === null ? '—' : fmt(prob[cur]), answer: best });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `Find the most likely route from ${start} to ${end}. The chance of a route is the product of its edge probabilities. Set prob[${start}] = 1 and everything else 0.`,
    logic: 'Multiplying numbers ≤ 1 can only make a route less likely, the same way adding non-negative weights only makes a route longer. That is why Dijkstra works here.', logicTone: 'info',
    tag: 'INIT —', note: `prob[0..${n - 1}] = 0, start = ${start}, end = ${end}`,
    javaLines: [1, 2, 3, 4], pyLines: [1, 2, 3], algoStep: 0,
  });
  prob[start] = 1;
  heap.push([1, start]);
  push({
    title: `prob[${start}] = 1, push (1, ${start})`, desc: `The start ${start} is reached with certainty, probability 1. The max-heap hands out the most likely unfinished node first.`,
    logic: 'Dijkstra\'s greedy choice flips from "smallest distance" to "largest probability".', logicTone: 'info',
    tag: 'SEED', note: `prob[${start}] = 1, heap = [(1, ${start})]`,
    javaLines: [5, 6, 7], pyLines: [5, 6], algoStep: 0,
  });

  let reached = false;
  while (heap.length) {
    sortHeap();
    const [p, u] = heap.shift()!;
    curEdge = -1;
    if (p < prob[u]) {
      cur = null;
      push({
        title: `Skip stale entry (${fmt(p)}, ${u})`, desc: `prob[${u}] is already ${fmt(prob[u])}, which is better than ${fmt(p)}. This heap entry is outdated.`,
        logic: 'A node may be pushed again after a better route is found; only its best entry matters.', logicTone: 'warn',
        tag: 'SKIP', alert: `Stale entry (${fmt(p)}, ${u}): a better probability ${fmt(prob[u])} for node ${u} was already settled.`, note: `p = ${fmt(p)} < prob[${u}] = ${fmt(prob[u])} → continue`,
        javaLines: [12], pyLines: [12, 13], algoStep: 3,
      });
      continue;
    }
    cur = u;
    done[u] = true;
    push({
      title: `Pop node ${u} (probability ${fmt(p)})`, desc: `Node ${u} is the most likely unfinished node, so ${fmt(p)} is its final best probability.`,
      logic: 'Every other route to it must leave the finished region through an edge, and multiplying by a probability ≤ 1 cannot raise it.', logicTone: 'success',
      tag: 'POP', note: `poll → p = ${fmt(p)}, u = ${u}${u === end ? ' = end, stop' : ''}`,
      javaLines: [9, 10], pyLines: [7, 8, 9], algoStep: 1,
    });
    if (u === end) {
      reached = true;
      break;
    }
    for (const ei of adj[u]) {
      const e = edges[ei];
      const v = e.u === u ? e.v : e.u;
      const np = p * e.p;
      curEdge = ei;
      examined[ei] = true;
      if (np > prob[v]) {
        if (parentEdge[v] !== -1) examined[parentEdge[v]] = true;
        const old = prob[v];
        prob[v] = np;
        parentEdge[v] = ei;
        heap.push([np, v]);
        sortHeap();
        push({
          title: `Relax ${u} – ${v}: ${fmt(p)} × ${e.p} = ${fmt(np)} > ${fmt(old)}`, desc: `A more likely route to ${v} through ${u}: prob[${v}] becomes ${fmt(np)} and (${fmt(np)}, ${v}) joins the heap.`,
          logic: 'Relaxing asks: does going through u beat the best known route to v?', logicTone: 'success',
          tag: 'RELAX', note: `np = ${fmt(p)} × ${e.p} = ${fmt(np)} > ${fmt(old)} → prob[${v}] = ${fmt(np)}`,
          javaLines: [13, 14, 15, 16], pyLines: [14, 15, 16, 17], algoStep: 2,
        });
      } else {
        push({
          title: `Relax ${u} – ${v}: ${fmt(p)} × ${e.p} = ${fmt(np)} ≤ ${fmt(prob[v])}`, desc: `No improvement: prob[${v}] stays ${fmt(prob[v])}.`,
          logic: 'The known route to v is at least as likely, so this edge changes nothing.', logicTone: 'info',
          tag: 'RELAX', alert: `No improvement: ${fmt(np)} does not beat prob[${v}] = ${fmt(prob[v])}.`, note: `np = ${fmt(p)} × ${e.p} = ${fmt(np)} ≤ ${fmt(prob[v])} → unchanged`,
          javaLines: [13, 14, 15], pyLines: [14, 15], algoStep: 2,
        });
      }
      curEdge = -1;
    }
    cur = null;
  }

  // reconstruct the route
  const route: number[] = [];
  if (reached) {
    let x = end;
    while (x !== start) {
      const ei = parentEdge[x];
      pathEdges.push(ei);
      route.unshift(x);
      x = edges[ei].u === x ? edges[ei].v : edges[ei].u;
    }
    route.unshift(start);
  }
  pathEdges = [...pathEdges];
  const ans = reached ? prob[end] : 0;
  best = ans.toFixed(5);
  cur = null;
  curEdge = -1;
  steps.push({
    title: reached ? `Reached ${end}: ${best}` : `${end} is unreachable`,
    desc: reached ? `The best route is ${route.join(' → ')} with probability ${best}.` : `The heap is empty and ${end} was never reached, so the probability is 0.`,
    scene: scene(), aux: aux(), vars: vars(),
    logic: reached ? 'The first time the end node is popped its probability is final, so we can stop.' : 'No route exists, so the answer is 0.', logicTone: reached ? 'success' : 'warn',
    tag: '✅ Done!', note: reached ? `u == end → return ${best}` : 'heap empty → return 0.0',
    javaLines: reached ? [11] : [19], pyLines: reached ? [10, 11] : [18], algoStep: 4,
    result: { title: best, text: reached ? `Best route ${route.join(' → ')}` : 'No path between start and end' },
  });
  return steps;
}

const mk = (n: number, start: number, end: number, s: string): In => ({
  n, start, end,
  edges: s ? s.split(' ').map((t) => { const m = /^(\d+)-(\d+):(.+)$/.exec(t)!; return { u: +m[1], v: +m[2], p: +m[3] }; }) : [],
});

export const pathWithMaximumProbability: ProblemDef<In> = {
  slug: '1514-path-with-maximum-probability',
  id: '1514', title: 'Path with Maximum Probability', difficulty: 'Medium', category: 'Graph', tag: 'Dijkstra, max-heap',
  statement: 'An undirected graph has n nodes, and each edge carries the probability that a signal crosses it successfully. Given a start and an end node, return the largest probability of a successful trip, which is the product of the probabilities along the route. Return 0 if the nodes are not connected.',
  constraints: '2 ≤ n ≤ 10⁴, 0 ≤ p ≤ 1 (animation input: 2–8 nodes, ≤ 12 edges; write "n start end" then edges like 0-1:0.5)',
  examples: [
    { label: '3 0 2 | 0-1:0.5 1-2:0.5 0-2:0.2', input: mk(3, 0, 2, '0-1:0.5 1-2:0.5 0-2:0.2'), output: '0.25000' },
    { label: '3 0 2 | 0-1:0.5 0-2:0.3', input: mk(3, 0, 2, '0-1:0.5 0-2:0.3'), output: '0.30000' },
    { label: '5 0 4 | 0-1:0.9 1-2:0.8 2-4:0.5 0-3:0.6 3-4:0.7 1-3:0.9', input: mk(5, 0, 4, '0-1:0.9 1-2:0.8 2-4:0.5 0-3:0.6 3-4:0.7 1-3:0.9'), output: '0.56700' },
  ],
  inputPlaceholder: 'e.g. 3 0 2 0-1:0.5 1-2:0.5 0-2:0.2   (n, start, end, edges u-v:probability)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Just finalised', state: 'active' }, { label: 'Seen, not final', state: 'compare' }, { label: 'Final probability', state: 'found' }],
  varLabels: ['node', 'prob[node]', 'answer'],
  approach: {
    title: 'Dijkstra with a max-heap on products',
    text: 'Treat probability like distance, but maximise it. Keep the best known probability for every node (start = 1) and a max-heap of candidates. Pop the most likely node: its value is final, because every extension multiplies by a number ≤ 1. Relax each neighbour with prob × edge; if it beats the stored value, update and push. Stop when the end node is popped.',
  },
  java: [
    'public double maxProbability(int n, int[][] edges, double[] succProb, int start, int end) {',
    '    List<double[]>[] adj = new List[n];',
    '    for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();',
    '    for (int i = 0; i < edges.length; i++) { int a = edges[i][0], b = edges[i][1]; adj[a].add(new double[]{b, succProb[i]}); adj[b].add(new double[]{a, succProb[i]}); }',
    '    double[] prob = new double[n];',
    '    prob[start] = 1.0;',
    '    PriorityQueue<double[]> pq = new PriorityQueue<>((a, b) -> Double.compare(b[0], a[0]));',
    '    pq.add(new double[]{1.0, start});',
    '    while (!pq.isEmpty()) {',
    '        double[] top = pq.poll();',
    '        double p = top[0]; int u = (int) top[1];',
    '        if (u == end) return p;',
    '        if (p < prob[u]) continue;                // stale entry',
    '        for (double[] e : adj[u]) {',
    '            int v = (int) e[0];',
    '            double np = p * e[1];',
    '            if (np > prob[v]) { prob[v] = np; pq.add(new double[]{np, v}); }',
    '        }',
    '    }',
    '    return 0.0;',
    '}',
  ],
  python: [
    'def max_probability(n, edges, succ_prob, start, end):',
    '    adj = defaultdict(list)',
    '    for (a, b), p in zip(edges, succ_prob):',
    '        adj[a].append((b, p)); adj[b].append((a, p))',
    '    prob = [0.0] * n',
    '    prob[start] = 1.0',
    '    pq = [(-1.0, start)]                        # negate: heapq is a min-heap',
    '    while pq:',
    '        neg, u = heapq.heappop(pq)',
    '        p = -neg',
    '        if u == end:',
    '            return p',
    '        if p < prob[u]:',
    '            continue                            # stale entry',
    '        for v, w in adj[u]:',
    '            if p * w > prob[v]:',
    '                prob[v] = p * w',
    '                heapq.heappush(pq, (-prob[v], v))',
    '    return 0.0',
  ],
  phases: [
    { icon: '🚀', label: 'Init: prob[start] = 1', tone: 'blue' },
    { icon: '📤', label: 'Pop most likely', tone: 'cyan' },
    { icon: '✖', label: 'Relax: multiply', tone: 'green' },
    { icon: '⏭', label: 'Skip stale', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['probability', 'largest', 'product'],
  algorithm: [
    'Set prob[start] = 1 and every other probability to 0; push (1, start) into a max-heap',
    'Pop the most likely (p, u); stop as soon as u is the end node, otherwise keep going until the heap is empty',
    'For each neighbour v compute p × edge probability; if it beats prob[v], update it and push',
    'If the popped p is below prob[u], the entry is stale: skip it',
    'Answer is prob[end] (0 if it was never reached)',
  ],
  complexity: [{ label: 'Time', value: 'O(E log V)' }, { label: 'Space', value: 'O(V + E)' }],
  why: 'Take logarithms: maximising a product of probabilities is minimising a sum of −log p, and every −log p is ≥ 0. So this is exactly Dijkstra on non-negative weights, only written with multiplication and a max-heap. When a node is popped with the largest key, any other route to it must pass through a node that is no more likely and then multiply by a factor ≤ 1, so it cannot do better; the popped value is final.',
};
