import type { ProblemDef, Step } from '../engine/types.ts';
import { CORE, FlowRun, flowCoords, flowJava, flowPython, parseFlowNet } from './p5cKit.ts';
import type { FlowLines, FlowNet } from './p5cKit.ts';

type In = FlowNet;

function parse(raw: string): In {
  const net = parseFlowNet(raw, { maxN: 8, maxEdges: 14 });
  if (build(net).length > 400) throw new Error('That network needs more than 400 animation steps. Try smaller capacities or fewer edges.');
  return net;
}

const J_BASE = 1; // one line above the Java core: the static field declaration
const J_EXTRA = J_BASE + flowJava(true).length;
const sh = (l: { j: number[]; p: number[]; a: number }) => ({ j: l.j.map((x) => x + J_BASE), p: l.p, a: l.a });
const LINES: FlowLines = { start: sh(CORE.start), bfs: sh(CORE.bfs), none: sh(CORE.none), found: sh(CORE.found), push: sh(CORE.push) };
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const P_EXTRA = flowPython(true).length;

function build(net: In): Step[] {
  const run = new FlowRun(net, { label: (i) => String(i), coords: flowCoords(net.n, net.s, net.t, net.edges), terminals: true, lines: LINES });
  run.pushStart();
  while (run.augment(true)) { /* one step per augmenting round */ }
  // The last BFS (no path) explored everything reachable from s in the residual graph: that is side S.
  const inS = run.level!.map((l) => l >= 0);
  const sNodes = inS.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
  const tNodes = inS.map((b, i) => (b ? -1 : i)).filter((i) => i >= 0);
  run.level = null;
  run.nodeOverride = (i) => ({ tone: inS[i] ? 'blue' : 'orange' });
  run.push({
    title: `Residual BFS from ${net.s} reaches S = {${sNodes.join(', ')}}`,
    desc: `Max flow is ${run.flow}. Searching the final residual graph from ${net.s} reaches the blue nodes S = {${sNodes.join(', ')}}; the orange nodes {${tNodes.join(', ')}} (including the sink ${net.t}) are cut off.`,
    logic: 'Nothing leaving S has spare capacity (otherwise BFS would have gone on), so S and its complement are a natural dividing line.', logicTone: 'info',
    javaLines: [...range(J_EXTRA + 2, J_EXTRA + 13)], pyLines: range(P_EXTRA + 2, P_EXTRA + 9), algoStep: 4,
    tag: 'SIDE S', note: `side = {${sNodes.join(', ')}} reachable from ${net.s} in the residual graph`,
  });
  const cut = net.edges.map((_e, i) => i).filter((i) => inS[net.edges[i].u] && !inS[net.edges[i].v]);
  const cutSet = new Set(cut);
  const cap = cut.reduce((a, i) => a + net.edges[i].cap, 0);
  run.edgeOverride = (i) => (cutSet.has(i) ? 'error' : inS[net.edges[i].v] && !inS[net.edges[i].u] ? 'dim' : undefined);
  const names = cut.map((i) => `${net.edges[i].u}>${net.edges[i].v} (${net.edges[i].cap})`);
  run.push({
    title: cut.length ? `Cut edges: ${names.join(', ')}` : 'No edge crosses from S to the rest',
    desc: cut.length
      ? `The edges that go from S to the other side are drawn in red: ${names.join(', ')}. Each is full (flow = capacity). Edges coming back into S carry no flow (faded).`
      : `The sink is unreachable even before any flow, so nothing needs to be cut: the cut is empty and has capacity 0.`,
    logic: 'Forward edges across the cut must all be saturated and backward edges empty, because any spare room would have extended the BFS.', logicTone: 'info',
    javaLines: [J_EXTRA + 14, J_EXTRA + 15, J_EXTRA + 16], pyLines: [P_EXTRA + 10], algoStep: 5,
    tag: 'CUT EDGES', note: cut.length ? `side[u] && !side[v] → ${names.join(', ')}` : 'no edge leaves side S',
  });
  run.push({
    title: `Minimum cut capacity = ${cap} = maximum flow ${run.flow}`,
    desc: `Adding up the capacities of the cut edges gives ${cap}, exactly the flow we pushed. Cutting those edges disconnects ${net.s} from ${net.t}, and no cheaper cut exists.`,
    logic: 'Max-flow min-cut theorem: every flow is at most the capacity of every cut, and here one flow and one cut meet, so both are optimal.', logicTone: 'success',
    tag: '✅ Done!', note: `cut capacity ${cap} = max flow ${run.flow}`,
    javaLines: [J_EXTRA + 1, J_EXTRA + 17], pyLines: [P_EXTRA + 1, P_EXTRA + 10], algoStep: 5,
    result: { title: String(cap), text: cut.length ? `Cut edges: ${cut.map((i) => `${net.edges[i].u}>${net.edges[i].v}`).join(' ')}` : 'No edges need cutting' },
  });
  return run.steps;
}

const ex = (s: string): In => parseFlowNet(s, { maxN: 8, maxEdges: 14 });

const EXTRA_J = [
  'static List<int[]> minCut(int n, int[][] edges, int s, int t) {',
  '    maxFlow(n, edges, s, t);                              // leaves the final residual capacities in cap[]',
  '    boolean[] side = new boolean[n];',
  '    Deque<Integer> queue = new ArrayDeque<>(List.of(s));',
  '    side[s] = true;',
  '    while (!queue.isEmpty()) {                            // residual BFS: what can the source still reach?',
  '        int u = queue.poll();',
  '        for (int a : g[u]) {',
  '            if (cap[a] > 0 && !side[to[a]]) {',
  '                side[to[a]] = true;',
  '                queue.add(to[a]);',
  '            }',
  '        }',
  '    }',
  '    List<int[]> cut = new ArrayList<>();',
  '    for (int[] e : edges)',
  '        if (side[e[0]] && !side[e[1]]) cut.add(e);        // edges leaving the reachable side',
  '    return cut;',
  '}',
];

export const minimumCutFromMaxFlow: ProblemDef<In> = {
  slug: 'cp-minimum-cut-from-max-flow',
  id: 'CP', title: 'Minimum Cut from Max Flow', difficulty: 'Hard', category: 'Graph', tag: 'max-flow min-cut',
  statement: 'In a directed network with capacities, a cut is a set of edges whose removal leaves no path from source s to sink t. Find a cut of minimum total capacity and list its edges. Compute a maximum flow first; then the nodes still reachable from s in the final residual graph give the cut.',
  constraints: 'Animation input: 2–8 nodes numbered from 0, at most 14 edges, capacities 1–99, s ≠ t. Write "n s t" then edges like 0>1:3.',
  examples: [
    { label: '4 0 3 | 0>1:3 0>2:2 1>3:2 2>3:3', input: ex('4 0 3 0>1:3 0>2:2 1>3:2 2>3:3'), output: '4' },
    { label: 'bottleneck in the middle', input: ex('6 0 5 0>1:5 0>2:5 1>3:6 2>3:6 3>4:3 4>5:7'), output: '3' },
    { label: 'sink unreachable', input: ex('4 0 3 0>1:2 1>2:2 3>2:4'), output: '0' },
  ],
  inputPlaceholder: 'e.g. 4 0 3 0>1:3 0>2:2 1>3:2 2>3:3   (n, source, sink, edges u>v:capacity)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [
    { label: 'On the augmenting path', state: 'active' },
    { label: 'Reached by BFS', state: 'compare' },
  ],
  varLabels: ['round', 'bottleneck', 'flow so far', 'path'],
  vizTitle: 'Flow network (flow / capacity)',
  approach: {
    title: 'Max flow first, then read the cut off the residual graph',
    text: 'Run Edmonds-Karp until BFS can no longer reach the sink. At that moment, the nodes BFS can still reach form the source side S. Every original edge from S to the rest is full and every edge coming back is empty, so those forward edges are a minimum cut, and their capacities add up to the maximum flow.',
  },
  java: [
    'static List<Integer>[] g; static int[] to, cap;           // shared residual graph',
    ...flowJava(true),
    ...EXTRA_J,
  ],
  python: [
    ...flowPython(true),
    'def min_cut(n, edges, s, t):',
    '    flow, g, to, cap = max_flow(n, edges, s, t)         # cap now holds residual capacities',
    '    side = [False] * n; side[s] = True',
    '    queue = deque([s])',
    '    while queue:                                         # residual BFS: what can the source still reach?',
    '        u = queue.popleft()',
    '        for a in g[u]:',
    '            if cap[a] > 0 and not side[to[a]]:',
    '                side[to[a]] = True',
    '                queue.append(to[a])',
    '    return [(u, v) for u, v, c in edges if side[u] and not side[v]]   # edges leaving the reachable side',
  ],
  phases: [
    { icon: '🚰', label: 'Init: zero flow', tone: 'blue' },
    { icon: '🔎', label: 'BFS residual path', tone: 'cyan' },
    { icon: '📏', label: 'Find the bottleneck', tone: 'gold' },
    { icon: '⬆', label: 'Push + undo arcs', tone: 'green' },
    { icon: '🔵', label: 'Residual BFS: side S', tone: 'cyan' },
    { icon: '✂', label: 'Cut edges, Done', tone: 'orange' },
  ],
  emphasis: ['cut', 'minimum total capacity', 'residual'],
  algorithm: [
    'Start with zero flow and the residual graph (forward + backward arcs)',
    'BFS in the residual graph for an augmenting path from source to sink',
    'Find the bottleneck (smallest spare capacity) along that path',
    'Push it: shrink the forward arcs, grow the backward arcs; repeat until the sink is unreachable',
    'Run one more residual BFS from the source: the nodes it reaches form the side S',
    'The original edges leading from S to the other side are the minimum cut; their capacities sum to the max flow',
  ],
  complexity: [{ label: 'Time', value: 'O(V · E²)' }, { label: 'Space', value: 'O(V + E)' }],
  why: 'After the last augmentation, an edge from S to outside with spare capacity would let BFS leave S, and an edge from outside into S with flow on it would give a backward arc that does the same. So all S-to-outside edges are full and all inbound edges are empty. The net flow across the cut therefore equals its capacity; since any flow is bounded by any cut, this cut cannot be beaten.',
};
