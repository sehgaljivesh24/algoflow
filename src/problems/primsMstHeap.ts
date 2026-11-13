import type { ProblemDef, Step } from '../engine/types';
import { isConnected, parseWeightedEdges, tokens } from './mstKit.ts';
import type { WEdge } from './mstKit.ts';
import { primSteps } from './primKit.ts';

/** Connected weighted undirected graph on nodes 0..n-1; Prim from node 0 with a lazy min-heap. */
interface In { n: number; edges: WEdge[] }

function parse(raw: string): In {
  const t = tokens(raw);
  if (t.length < 2 || !/^\d+$/.test(t[0])) throw new Error('Write n, then weighted edges like 5 0-1:2 0-3:6 1-2:3 1-3:8 1-4:5 2-4:7 3-4:9');
  const n = Number(t[0]);
  if (n < 2 || n > 8) throw new Error('Use between 2 and 8 nodes');
  const edges = parseWeightedEdges(t.slice(1), { lo: 0, hi: n - 1, max: 14, example: '0-1:2 1-2:3' });
  if (!isConnected(n, edges)) throw new Error('The graph must be connected so that a spanning tree exists');
  return { n, edges };
}

const build = ({ n, edges }: In): Step[] =>
  primSteps({
    n, edges, name: (i) => `node ${i}`,
    startDesc: 'Node 0 is the root. Put (0, 0) in the min-heap: reaching the start costs nothing. Nothing is in the tree yet.',
    startLogic: 'Prim grows one tree. The heap always holds the candidate edges that leave the tree, cheapest on top.',
    lines: {
      start: { java: [1, 2, 3, 4], py: [1, 2, 3] },
      pop: { java: [5, 6, 7], py: [4, 5] },
      stale: { java: [8], py: [6, 7] },
      add: { java: [9, 10, 11, 12, 13], py: [8, 9, 10, 11, 12, 13] },
      done: { java: [16], py: [14] },
    },
    resultText: 'Total weight of the minimum spanning tree',
  });

const mk = (n: number, s: string): In => ({ n, edges: s.split(' ').map((t) => { const m = /^(\d+)-(\d+):(\d+)$/.exec(t)!; return { u: +m[1], v: +m[2], w: +m[3] }; }) });

export const primsMstHeap: ProblemDef<In> = {
  slug: 'cp-prims-mst-with-a-heap',
  id: 'CP', title: "Prim's MST with a Heap", difficulty: 'Medium', category: 'Graph', tag: "Prim's, lazy heap",
  statement: 'Given a connected, undirected, weighted graph, find the total weight of a minimum spanning tree using Prim\'s algorithm: start from node 0, repeatedly pull the cheapest edge that leaves the tree from a min-heap, and add the node it reaches.',
  constraints: 'Connected graph, positive weights (animation input: 2–8 nodes, ≤ 14 edges, written "n u-v:w ...")',
  examples: [
    { label: '5 nodes, 7 edges', input: mk(5, '0-1:2 0-3:6 1-2:3 1-3:8 1-4:5 2-4:7 3-4:9'), output: '16' },
    { label: '4 nodes, a square with a diagonal', input: mk(4, '0-1:1 1-2:4 2-3:2 0-3:5 0-2:3'), output: '6' },
    { label: '6 nodes, two cheap clusters', input: mk(6, '0-1:1 1-2:1 0-2:2 3-4:1 4-5:1 3-5:2 2-3:6 0-5:7'), output: '10' },
  ],
  inputPlaceholder: 'e.g. 5 0-1:2 0-3:6 1-2:3 1-3:8 1-4:5   (n, then u-v:w)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Node just added', state: 'active' }, { label: 'In the tree', state: 'found' }, { label: 'Waiting in the heap', state: 'compare' }],
  varLabels: ['popped', 'cost so far', 'in tree'],
  approach: {
    title: 'Prim with a lazy priority queue',
    text: 'Keep a min-heap of (weight, node) candidates and a visited flag per node. Pop the smallest entry; if its node is already in the tree, ignore it (stale). Otherwise add the node, pay the weight and push the edges from that node to nodes still outside. Stop when every node is in the tree.',
  },
  java: [
    'public int primMST(int n, List<int[]>[] adj) {        // adj[u] = list of {v, weight}',
    '    boolean[] inTree = new boolean[n];',
    '    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[0] - b[0]);   // {weight, node}',
    '    heap.add(new int[]{0, 0});                         // start at node 0 for free',
    '    int total = 0, taken = 0;',
    '    while (!heap.isEmpty() && taken < n) {',
    '        int[] top = heap.poll();',
    '        int w = top[0], u = top[1];',
    '        if (inTree[u]) continue;                       // stale: u joined earlier',
    '        inTree[u] = true;',
    '        total += w;',
    '        taken++;',
    '        for (int[] e : adj[u]) {',
    '            if (!inTree[e[0]]) heap.add(new int[]{e[1], e[0]});',
    '        }',
    '    }',
    '    return taken == n ? total : -1;',
    '}',
  ],
  python: [
    'def prim_mst(n, adj):                      # adj[u] = [(v, weight), ...]',
    '    in_tree = [False] * n',
    '    heap = [(0, 0)]                         # (weight, node): start at 0 for free',
    '    total = taken = 0',
    '    while heap and taken < n:',
    '        w, u = heapq.heappop(heap)',
    '        if in_tree[u]:',
    '            continue                        # stale: u joined earlier',
    '        in_tree[u] = True',
    '        total += w',
    '        taken += 1',
    '        for v, wt in adj[u]:',
    '            if not in_tree[v]:',
    '                heapq.heappush(heap, (wt, v))',
    '    return total if taken == n else -1',
  ],
  phases: [
    { icon: '🚀', label: 'Init: push (0, 0)', tone: 'blue' },
    { icon: '⛏', label: 'Pop min', tone: 'cyan' },
    { icon: '⏭', label: 'Skip stale', tone: 'orange' },
    { icon: '🌿', label: 'Add to MST', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['minimum spanning tree', 'total weight', 'cheapest edge'],
  algorithm: [
    'Push (0, node 0) into a min-heap; nothing is in the tree yet',
    'Pop the cheapest (weight, node) entry',
    'If the node is already in the tree the entry is stale: skip it',
    'Otherwise add the node, add the weight to the total, and push its edges that lead outside the tree',
    'Stop when every node is in the tree; the total is the MST weight',
  ],
  complexity: [{ label: 'Time', value: 'O(E log E)' }, { label: 'Space', value: 'O(E)' }],
  why: 'At every moment the tree and the remaining nodes form a cut. The cheapest edge crossing that cut can always be extended to a minimum spanning tree (swap it in for a heavier crossing edge of any optimal tree). The heap top is exactly that edge, once stale entries are skipped, so each popped fresh entry is a safe choice and n of them build an optimal tree.',
};
