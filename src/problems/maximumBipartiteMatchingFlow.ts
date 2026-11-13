import type { ProblemDef, Step } from '../engine/types.ts';
import { CORE, CORE_RETURN, FlowRun, flowJava, flowPython, layeredCoords } from './p5cKit.ts';
import type { FlowLines, FlowNet } from './p5cKit.ts';
import { tokens } from './graphKit.ts';

/** Left nodes 0..L-1, right nodes 0..R-1, pairs [l, r]. */
interface In { L: number; R: number; pairs: [number, number][] }

function parse(raw: string): In {
  const toks = tokens(raw);
  const usage = 'Write the number of left nodes, the number of right nodes, then pairs l-r, e.g. 3 3 0-0 0-1 1-0 2-1 2-2';
  if (toks.length < 3 || !/^\d+$/.test(toks[0]) || !/^\d+$/.test(toks[1])) throw new Error(usage);
  const L = Number(toks[0]);
  const R = Number(toks[1]);
  if (L < 1 || L > 4 || R < 1 || R > 4) throw new Error('Use between 1 and 4 nodes on each side');
  const rest = toks.slice(2);
  if (rest.length > 12) throw new Error('Use at most 12 pairs');
  const pairs = rest.map((t): [number, number] => {
    const m = /^(\d+)-(\d+)$/.exec(t);
    if (!m) throw new Error(`"${t}" is not a pair. Write left-right pairs like 0-1`);
    const l = Number(m[1]);
    const r = Number(m[2]);
    if (l >= L) throw new Error(`Left node numbers go from 0 to ${L - 1} (saw "${t}")`);
    if (r >= R) throw new Error(`Right node numbers go from 0 to ${R - 1} (saw "${t}")`);
    return [l, r];
  });
  if (new Set(pairs.map((p) => p.join('-'))).size !== pairs.length) throw new Error('Each pair may be written only once');
  return { L, R, pairs };
}

const nodeName = (L: number, R: number, i: number): string => (i === 0 ? 'S' : i <= L ? `L${i - 1}` : i <= L + R ? `R${i - L - 1}` : 'T');

/** Edge order mirrors the Java wrapper: source -> left, right -> sink, then the pairs. */
export function matchingNet({ L, R, pairs }: In): FlowNet {
  const n = L + R + 2;
  const edges = [
    ...Array.from({ length: L }, (_, l) => ({ u: 0, v: 1 + l, cap: 1 })),
    ...Array.from({ length: R }, (_, r) => ({ u: 1 + L + r, v: n - 1, cap: 1 })),
    ...pairs.map(([l, r]) => ({ u: 1 + l, v: 1 + L + r, cap: 1 })),
  ];
  return { n, s: 0, t: n - 1, edges };
}

const W_J = 9; // wrapper lines above the shared Java core
const W_P = 6;
const sh = (l: { j: number[]; p: number[]; a: number }) => ({ j: l.j.map((x) => x + W_J), p: l.p.map((x) => x + W_P), a: l.a });
const LINES: FlowLines = {
  start: { j: [0, 1, 2, 3, 4, 5, 6, 7], p: [0, 1, 2, 3, 4, 5], a: 0 },
  bfs: sh(CORE.bfs), none: sh(CORE.none), found: sh(CORE.found), push: sh(CORE.push),
};

function build(inp: In): Step[] {
  const { L, R } = inp;
  const net = matchingNet(inp);
  const layer = Array.from({ length: net.n }, (_, i) => (i === 0 ? 0 : i <= L ? 1 : i <= L + R ? 2 : 3));
  const run = new FlowRun(net, { label: (i) => nodeName(L, R, i), coords: layeredCoords(layer), terminals: false, lines: LINES, unit: 'match' });
  run.pushStart(' Source S feeds every left node with capacity 1, every right node feeds sink T with capacity 1, and each allowed pair is an edge of capacity 1.');
  while (run.augment(false)) { /* each round pushes its own steps */ }
  const pairIdx = net.edges.map((_e, i) => i).filter((i) => i >= L + R);
  const matched = pairIdx.filter((i) => run.R.flowOn(i) === 1);
  const matchedSet = new Set(matched);
  const text = matched.map((i) => `${nodeName(L, R, net.edges[i].u)}–${nodeName(L, R, net.edges[i].v)}`).join(', ');
  run.level = null;
  const used = new Set<number>();
  matched.forEach((i) => { used.add(net.edges[i].u); used.add(net.edges[i].v); });
  run.edgeOverride = (i) => (matchedSet.has(i) ? 'chosen' : i < L + R ? undefined : 'dim');
  run.nodeOverride = (i) => (used.has(i) ? { state: 'found' } : undefined);
  run.push({
    title: `No augmenting path: maximum matching is ${matched.length}`,
    desc: `The last BFS cannot get from S to T. The ${matched.length} pair${matched.length === 1 ? '' : 's'} that carry flow are the matching${text ? `: ${text}` : ''}.`,
    logic: 'Every unit of flow goes S → left → right → T through one pair, and capacity 1 on the outer edges means each node is used at most once. So the flow value is exactly the matching size.',
    logicTone: 'success', javaLines: [...LINES.none.j, W_J + CORE_RETURN.j[0]], pyLines: [...LINES.none.p, W_P + CORE_RETURN.p[0]], algoStep: 4,
    tag: '✅ Done!', note: `parentArc[T] == −1 → matching size = flow = ${matched.length}`,
    result: { title: String(matched.length), text: text ? `Matched pairs: ${text}` : 'No pair can be matched' },
  });
  return run.steps;
}

const ex = (s: string): In => parse(s);

export const maximumBipartiteMatchingFlow: ProblemDef<In> = {
  slug: 'cp-maximum-bipartite-matching-flow',
  id: 'CP', title: 'Maximum Bipartite Matching (Flow)', difficulty: 'Medium', category: 'Graph', tag: 'matching as max flow',
  statement: 'There are L nodes on the left (workers), R nodes on the right (jobs) and a list of allowed left-right pairs. A matching uses each node at most once. Find the largest possible matching by turning it into a maximum-flow problem: add a source feeding every left node, a sink fed by every right node, give every edge capacity 1, and run augmenting paths.',
  constraints: 'Animation input: 1–4 nodes per side, at most 12 pairs written as l-r (left numbers 0..L-1, right numbers 0..R-1).',
  examples: [
    { label: '3 3 | 0-0 0-1 1-0 2-1 2-2', input: ex('3 3 0-0 0-1 1-0 2-1 2-2'), output: '3' },
    { label: '2 2 | 0-0 0-1 1-0 (needs a reroute)', input: ex('2 2 0-0 0-1 1-0'), output: '2' },
    { label: '3 3 | 0-0 1-0 2-0 2-1 (L1 starves)', input: ex('3 3 0-0 1-0 2-0 2-1'), output: '2' },
  ],
  inputPlaceholder: 'e.g. 3 3 0-0 0-1 1-0 2-1 2-2   (left count, right count, pairs l-r)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [
    { label: 'On the augmenting path', state: 'active' },
    { label: 'Reached by BFS', state: 'compare' },
    { label: 'Matched node', state: 'found' },
  ],
  varLabels: ['round', 'bottleneck', 'flow so far', 'path'],
  vizTitle: 'Flow network for the matching (flow / capacity)',
  approach: {
    title: 'Matching = maximum flow with unit capacities',
    text: 'Build a network: S → every left node, every left-right pair, every right node → T, all with capacity 1. An integer flow of value k picks k pairs that share no node, so the largest flow is the largest matching. Run BFS augmenting paths; a path that goes backwards through a pair edge un-matches a node and re-routes it to a free partner.',
  },
  java: [
    'public int maxMatching(int left, int right, int[][] pairs) {',
    '    int n = left + right + 2, s = 0, t = n - 1;',
    '    int[][] edges = new int[left + right + pairs.length][];',
    '    int k = 0;',
    '    for (int l = 0; l < left; l++) edges[k++] = new int[]{s, 1 + l, 1};               // source -> left',
    '    for (int r = 0; r < right; r++) edges[k++] = new int[]{1 + left + r, t, 1};       // right -> sink',
    '    for (int[] p : pairs) edges[k++] = new int[]{1 + p[0], 1 + left + p[1], 1};       // allowed pairs',
    '    return maxFlow(n, edges, s, t);                                                   // flow value = matching size',
    '}',
    ...flowJava(false),
  ],
  python: [
    'def max_matching(left, right, pairs):',
    '    n = left + right + 2; s, t = 0, n - 1',
    '    edges = [(s, 1 + l, 1) for l in range(left)]                  # source -> left',
    '    edges += [(1 + left + r, t, 1) for r in range(right)]         # right -> sink',
    '    edges += [(1 + l, 1 + left + r, 1) for l, r in pairs]         # allowed pairs',
    '    return max_flow(n, edges, s, t)                               # flow value = matching size',
    ...flowPython(false),
  ],
  phases: [
    { icon: '🧱', label: 'Build the unit network', tone: 'blue' },
    { icon: '🔎', label: 'BFS for a free path', tone: 'cyan' },
    { icon: '🤝', label: 'Path found: new match', tone: 'gold' },
    { icon: '🔁', label: 'Push, re-route matches', tone: 'green' },
    { icon: '✅', label: 'Done: matching', tone: 'green' },
  ],
  emphasis: ['matching', 'bipartite', 'maximum number of pairs'],
  algorithm: [
    'Build the network: source → each left node, each allowed pair, each right node → sink, every capacity 1',
    'BFS from the source over arcs that still have room',
    'If the sink is reached, push 1 unit along the path (a backward hop re-routes an earlier match)',
    'Update forward and backward arcs, then repeat the BFS',
    'When the sink is unreachable, the pairs that carry flow form a maximum matching',
  ],
  complexity: [{ label: 'Time', value: 'O(V · E)' }, { label: 'Space', value: 'O(V + E)' }],
  why: 'A flow of value k with unit capacities leaves S through k left nodes, passes through k pairs and enters T through k right nodes; each node has capacity 1 so no node repeats. Conversely, k disjoint pairs give a flow of value k. So the maximum flow equals the maximum matching, and the flow algorithm is correct because it stops only when no augmenting path remains, i.e. when a cut equal to the flow exists.',
};
