import type { ProblemDef, Step } from '../engine/types';
import { parseWeightedEdges, tokens } from './mstKit.ts';
import type { WEdge } from './mstKit.ts';
import { primSteps } from './primKit.ts';

/** Houses 1..n, wells[i] = cost to dig a well in house i, pipes u-v:cost. Add a virtual node 0 "water source" joined to house i by wells[i-1]; the answer is the MST of that graph. */
interface In { wells: number[]; pipes: WEdge[] }

function parse(raw: string): In {
  const [left, right = ''] = raw.split('|');
  const w = tokens(left);
  if (w.length < 2 || w.length > 6 || w.some((x) => !/^\d+$/.test(x))) throw new Error('Write the well costs of 2 to 6 houses, then | and the pipes, e.g. 1 2 2 | 1-2:1 2-3:1');
  const wells = w.map(Number);
  if (wells.some((x) => x < 1 || x > 99)) throw new Error('Well costs must be between 1 and 99');
  const pt = tokens(right);
  const pipes = pt.length ? parseWeightedEdges(pt, { lo: 1, hi: wells.length, max: 9, example: '1-2:1 2-3:1' }) : [];
  return { wells, pipes };
}

function graphOf({ wells, pipes }: In): { n: number; edges: WEdge[] } {
  return { n: wells.length + 1, edges: [...wells.map((c, i) => ({ u: 0, v: i + 1, w: c })), ...pipes] };
}

const build = (inp: In): Step[] => {
  const { n, edges } = graphOf(inp);
  return primSteps({
    n, edges, name: (i) => (i === 0 ? 'the water source' : `house ${i}`), label: (i) => (i === 0 ? 'W' : i),
    startDesc: `Digging a well in house i is the same as laying a pipe from a virtual water source W to house i, so we add node W with edges ${inp.wells.map((c, i) => `W-${i + 1}:${c}`).join(' ')}. Prim starts from W.`,
    startLogic: 'With the virtual source, "every house needs water" becomes "connect every node with the cheapest set of edges": a minimum spanning tree.',
    lines: {
      start: { java: [1, 2, 3, 4, 6, 7, 8, 9, 10], py: [1, 2, 3, 4, 5, 6, 7, 8] },
      pop: { java: [11, 12], py: [9, 10] },
      stale: { java: [13], py: [11, 12] },
      add: { java: [14, 15, 16, 17, 18], py: [13, 14, 15, 16, 17, 18] },
      done: { java: [20], py: [19] },
    },
    resultText: 'Minimum total cost to give every house water',
  });
};

const mk = (wells: string, pipes: string): In => ({
  wells: wells.split(' ').map(Number),
  pipes: pipes ? pipes.split(' ').map((t) => { const m = /^(\d+)-(\d+):(\d+)$/.exec(t)!; return { u: +m[1], v: +m[2], w: +m[3] }; }) : [],
});

export const optimizeWaterDistribution: ProblemDef<In> = {
  slug: '1168-optimize-water-distribution-in-a-village',
  id: '1168', title: 'Optimize Water Distribution in a Village', difficulty: 'Hard', category: 'Graph', tag: 'MST with a virtual node',
  statement: 'A village has n houses. Each house can either get its own well (digging in house i costs wells[i]) or be linked by a pipe to another house (each possible pipe has a cost). Return the minimum total cost so that every house has water.',
  constraints: '2 ≤ n ≤ 10⁴, costs ≥ 1 (animation input: 2–6 houses, ≤ 9 pipes, written "w1 w2 ... | u-v:cost ...")',
  examples: [
    { label: 'wells 1 2 2 | 1-2:1 2-3:1', input: mk('1 2 2', '1-2:1 2-3:1'), output: '3' },
    { label: 'wells 4 4 | 1-2:5', input: mk('4 4', '1-2:5'), output: '8' },
    { label: 'wells 6 3 5 4 | 1-2:2 2-3:1 3-4:2 1-4:4', input: mk('6 3 5 4', '1-2:2 2-3:1 3-4:2 1-4:4'), output: '8' },
  ],
  inputPlaceholder: 'e.g. 1 2 2 | 1-2:1 2-3:1   (well costs | pipes u-v:cost)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Node just added', state: 'active' }, { label: 'Has water (in the tree)', state: 'found' }, { label: 'Waiting in the heap', state: 'compare' }],
  varLabels: ['popped', 'cost so far', 'in tree'],
  approach: {
    title: 'A well is a pipe to a virtual node: then it is a plain MST',
    text: 'Add a virtual node 0 that stands for "the water supply". Connect it to house i with an edge of weight wells[i]. Now a well in a house is just that edge, and a pipe is an ordinary edge, so the cheapest way to give every house water is a minimum spanning tree of this graph. Run Prim from node 0 with a min-heap.',
  },
  java: [
    'public int minCostToSupplyWater(int n, int[] wells, int[][] pipes) {',
    '    List<int[]>[] adj = new List[n + 1];                // node 0 = virtual water source',
    '    for (int i = 0; i <= n; i++) adj[i] = new ArrayList<>();',
    '    for (int i = 1; i <= n; i++) {                      // a well = edge 0 - i',
    '        adj[0].add(new int[]{i, wells[i - 1]});  adj[i].add(new int[]{0, wells[i - 1]});',
    '    }',
    '    for (int[] p : pipes) { adj[p[0]].add(new int[]{p[1], p[2]}); adj[p[1]].add(new int[]{p[0], p[2]}); }',
    '    boolean[] done = new boolean[n + 1];',
    '    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[0] - b[0]);   // {cost, node}',
    '    heap.add(new int[]{0, 0});',
    '    int total = 0, taken = 0;',
    '    while (taken <= n) {',
    '        int[] top = heap.poll();',
    '        if (done[top[1]]) continue;                     // stale entry',
    '        done[top[1]] = true;',
    '        total += top[0];',
    '        taken++;',
    '        for (int[] e : adj[top[1]])',
    '            if (!done[e[0]]) heap.add(new int[]{e[1], e[0]});',
    '    }',
    '    return total;',
    '}',
  ],
  python: [
    'def min_cost_to_supply_water(n, wells, pipes):',
    '    adj = [[] for _ in range(n + 1)]          # node 0 = virtual water source',
    '    for i, cost in enumerate(wells, 1):        # a well = edge 0 - i',
    '        adj[0].append((i, cost)); adj[i].append((0, cost))',
    '    for u, v, cost in pipes:',
    '        adj[u].append((v, cost)); adj[v].append((u, cost))',
    '    done = [False] * (n + 1)',
    '    heap = [(0, 0)]                            # (cost, node)',
    '    total = taken = 0',
    '    while taken <= n:',
    '        cost, u = heapq.heappop(heap)',
    '        if done[u]:',
    '            continue                           # stale entry',
    '        done[u] = True',
    '        total += cost',
    '        taken += 1',
    '        for v, c in adj[u]:',
    '            if not done[v]:',
    '                heapq.heappush(heap, (c, v))',
    '    return total',
  ],
  phases: [
    { icon: '🚰', label: 'Init: virtual source', tone: 'blue' },
    { icon: '⛏', label: 'Pop cheapest', tone: 'cyan' },
    { icon: '⏭', label: 'Skip stale', tone: 'orange' },
    { icon: '🌿', label: 'Connect to water', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['well', 'pipe', 'minimum total cost'],
  algorithm: [
    'Add a virtual source node 0 with an edge of weight wells[i] to every house i, and push (0, 0) into a min-heap',
    'Pop the cheapest (cost, node) entry',
    'If that node already has water the entry is stale: skip it',
    'Otherwise connect the node, add its cost, and push its edges to nodes still without water',
    'When all n + 1 nodes are connected, the total is the answer',
  ],
  complexity: [{ label: 'Time', value: 'O((n + P) log (n + P))' }, { label: 'Space', value: 'O(n + P)' }],
  why: 'A valid water plan is a set of wells and pipes in which every house is joined to some well, and an optimal one never contains a cycle among houses. Linking each well to the virtual node turns every such plan into a connected subgraph spanning all n + 1 nodes, and every spanning tree back into a plan with the same cost. So the cheapest plan equals the minimum spanning tree of the augmented graph, which Prim computes by the cut property.',
};
