import type { ProblemDef, Step } from '../engine/types.ts';
import { CORE, CORE_RETURN, FlowRun, flowCoords, flowJava, flowPython, parseFlowNet } from './p5cKit.ts';
import type { FlowNet } from './p5cKit.ts';

/** Directed network: nodes 0..n-1, a source s, a sink t, edges u>v:capacity. */
type In = FlowNet;

function parse(raw: string): In {
  const net = parseFlowNet(raw, { maxN: 8, maxEdges: 16 });
  if (build(net).length > 400) throw new Error('That network needs more than 400 animation steps. Try smaller capacities or fewer edges.');
  return net;
}

function build(net: In): Step[] {
  const run = new FlowRun(net, {
    label: (i) => String(i),
    coords: flowCoords(net.n, net.s, net.t, net.edges),
    terminals: true,
    lines: CORE,
  });
  run.pushStart();
  while (run.augment(false)) { /* each call pushes its own steps */ }
  // closing: the last BFS could not reach the sink
  const reachable = run.level!.map((l, i) => (l >= 0 ? i : -1)).filter((i) => i >= 0);
  run.push({
    title: 'No augmenting path: the flow is maximum',
    desc: `The residual graph has no route from ${net.s} to ${net.t}. The search stopped inside {${reachable.join(', ')}}, and every edge leaving that set is full. The maximum flow is ${run.flow}.`,
    logic: 'When the last BFS gets stuck, the edges leaving the reachable set form a cut whose capacity equals the flow we pushed. No flow can beat a cut, so this flow is maximum.',
    logicTone: 'success', javaLines: [...CORE.none.j, ...CORE_RETURN.j], pyLines: [...CORE.none.p, ...CORE_RETURN.p], algoStep: 4,
    tag: '✅ Done!', note: `parentArc[t] == −1 → return flow = ${run.flow}`,
    result: { title: String(run.flow), text: `Maximum flow from ${net.s} to ${net.t}` },
  });
  return run.steps;
}

const ex = (s: string): In => parseFlowNet(s, { maxN: 8, maxEdges: 16 });

export const maxFlowEdmondsKarp: ProblemDef<In> = {
  slug: 'alg-max-flow-edmonds-karp',
  id: 'ALG', title: 'Max Flow (Edmonds-Karp)', difficulty: 'Hard', category: 'Graph', tag: 'BFS augmenting paths',
  statement: 'A directed network has a source s, a sink t and edges u→v that can carry at most cap units. Send as much as possible from s to t: no edge may carry more than its capacity, and every other node must pass on exactly what it receives. Find the largest possible total flow, by repeatedly finding shortest augmenting paths with BFS.',
  constraints: 'Animation input: 2–8 nodes numbered from 0, at most 16 edges, capacities 1–99, s ≠ t. Write "n s t" then edges like 0>1:3 (a pair u>v can appear once; u>v and v>u together are fine).',
  examples: [
    { label: '4 0 3 | 0>1:3 0>2:2 1>3:2 2>3:3', input: ex('4 0 3 0>1:3 0>2:2 1>3:2 2>3:3'), output: '4' },
    { label: 'CLRS network (6 nodes)', input: ex('6 0 5 0>1:16 0>2:13 1>2:10 2>1:4 1>3:12 3>2:9 2>4:14 4>3:7 3>5:20 4>5:4'), output: '23' },
    { label: 'needs an undo (6 nodes)', input: ex('6 0 5 1>4:3 2>4:4 0>2:2 0>1:4 4>5:2 2>3:4 4>3:1 3>5:3'), output: '5' },
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
    title: 'Edmonds-Karp: augment along shortest residual paths',
    text: 'Keep the current flow and a residual graph: each edge has spare room forward and, for every unit already sent, one unit of undo room backward. Use BFS to find the shortest path from source to sink that has room on every arc, push the smallest spare capacity (the bottleneck) along it, and repeat. When BFS can no longer reach the sink, the flow is maximum.',
  },
  java: flowJava(false),
  python: flowPython(false),
  phases: [
    { icon: '🚰', label: 'Init: zero flow', tone: 'blue' },
    { icon: '🔎', label: 'BFS residual path', tone: 'cyan' },
    { icon: '📏', label: 'Find the bottleneck', tone: 'gold' },
    { icon: '⬆', label: 'Push + undo arcs', tone: 'green' },
    { icon: '✅', label: 'Done: max flow', tone: 'green' },
  ],
  emphasis: ['maximum', 'capacity', 'source', 'sink'],
  algorithm: [
    'Start with zero flow; give every edge a forward arc (capacity) and a backward arc (capacity 0)',
    'BFS from the source over arcs that still have spare capacity',
    'If the sink was reached, the bottleneck is the smallest spare capacity along the path',
    'Subtract the bottleneck from every forward arc on the path and add it to the matching backward arcs',
    'Stop when BFS cannot reach the sink; the flow pushed so far is the maximum flow',
  ],
  complexity: [{ label: 'Time', value: 'O(V · E²)' }, { label: 'Space', value: 'O(V + E)' }],
  why: 'Every push keeps the flow legal, so we never overshoot. If the final BFS cannot reach the sink, let S be the nodes it did reach: every edge leaving S is full and every edge entering S carries nothing, so the flow equals the capacity of the cut (S, rest). No flow can exceed any cut, hence this one is maximum. Choosing shortest paths means the shortest-path length never decreases, which gives at most V·E rounds.',
};

