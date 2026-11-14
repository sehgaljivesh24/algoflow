import type { Aux, CellState, EdgeState, GraphEdgeVM, ProblemDef, Step } from '../engine/types';
import { plural, verb } from './text.ts';
import { parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

/** A tree with nodes 0..n-1 and n-1 undirected edges. */
interface In { n: number; edges: EdgeIn[] }

function parse(raw: string): In {
  const toks = tokens(raw);
  if (!toks.length || !/^\d+$/.test(toks[0])) throw new Error('Start with the number of nodes, then the tree edges, e.g. 6 0-3 1-3 2-3 4-3 5-4');
  const n = Number(toks[0]);
  if (n < 1 || n > 10) throw new Error('Use between 1 and 10 nodes');
  const edges = parseEdges(toks.slice(1).join(' '), { lo: 0, hi: n - 1, max: 12, example: '0-3 1-3 2-3', allowEmpty: true });
  if (edges.length !== n - 1) throw new Error(`A tree with ${n} node${n === 1 ? '' : 's'} has exactly ${n - 1} edge${n === 2 ? '' : 's'} (you gave ${edges.length})`);
  const p = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (p[x] === x ? x : (p[x] = find(p[x])));
  for (const e of edges) {
    if (e.u === e.v) throw new Error('An edge cannot connect a node to itself');
    if (find(e.u) === find(e.v)) throw new Error('These edges contain a cycle, so it is not a tree');
    p[find(e.u)] = find(e.v);
  }
  return { n, edges };
}

function build({ n, edges }: In): Step[] {
  const adj: number[][] = Array.from({ length: n }, () => []); // edge indexes
  edges.forEach((e, i) => { adj[e.u].push(i); adj[e.v].push(i); });
  const other = (ei: number, u: number) => (edges[ei].u === u ? edges[ei].v : edges[ei].u);
  const deg = adj.map((l) => l.length);
  const removedAt = new Array<number>(n).fill(0); // layer number the node was peeled in, 0 = still in the tree
  const eState: EdgeState[] = edges.map(() => 'default');
  const steps: Step[] = [];
  let remaining = n;
  let layer = 0;
  let leaves: number[] = [];
  let next: number[] = [];
  let cur: number | null = null;
  let final = false;

  const scene = () => ({
    kind: 'graph' as const, layout: 'layered' as const,
    nodes: Array.from({ length: n }, (_, id) => {
      const gone = removedAt[id] > 0;
      const state: CellState | undefined = id === cur ? 'active' : gone ? 'dim' : final ? 'found' : leaves.includes(id) ? 'compare' : undefined;
      return { id, state, tag: gone ? `peeled ${removedAt[id]}` : `deg=${deg[id]}` };
    }),
    edges: edges.map((e, i): GraphEdgeVM => ({ from: e.u, to: e.v, state: eState[i] })),
  });
  const aux = (): Aux[] => [
    { title: layer ? `current leaves (layer ${layer})` : 'leaves', kind: 'queue', items: leaves.map(String) },
    { title: 'next leaves', kind: 'queue', items: next.map(String) },
  ];
  const vars = () => ({ layer, remaining, leaf: cur ?? '—' });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `A tree of ${n} node${n === 1 ? '' : 's'}. Each node shows its degree (number of neighbours).`,
    logic: 'The best roots sit in the middle of the longest paths. Cutting away leaves, layer by layer, walks inward to that middle.', logicTone: 'info',
    tag: 'INIT —', note: `deg = [${deg.join(', ')}], n = ${n}`,
    javaLines: [2, 3, 4, 5], pyLines: [3, 4, 5], algoStep: 0,
  });

  if (n <= 2) {
    final = true;
    steps.push({
      title: n === 1 ? 'A single node' : 'Two nodes', desc: n === 1 ? 'With one node the only root is that node.' : 'With two nodes both have height 1 whichever is the root, so both are answers.',
      scene: scene(), aux: aux(), vars: vars(),
      logic: 'Trees with at most two nodes need no peeling.', logicTone: 'success',
      tag: '✅ Done!', note: `n = ${n} ≤ 2 → return ${n === 1 ? '[0]' : '[0, 1]'}`,
      javaLines: [1, 2], pyLines: [1, 2],
      algoStep: 4,
      result: { title: `[${Array.from({ length: n }, (_, i) => i).join(', ')}]`, text: 'Roots that give the minimum height' },
    });
    return steps;
  }

  for (let i = 0; i < n; i++) if (deg[i] === 1) leaves.push(i);
  push({
    title: `Leaves: ${leaves.join(', ')}`, desc: 'Nodes of degree 1 are the outer ends of the tree. They can never be a good root.',
    logic: 'A leaf as root makes the tree as tall as possible along its single branch.', logicTone: 'info',
    tag: 'LEAVES', note: `deg[i] == 1 for i in [${leaves.join(', ')}]`,
    javaLines: [6, 7], pyLines: [6], algoStep: 1,
  });

  while (remaining > 2) {
    layer++;
    push({
      title: `Layer ${layer}: peel ${leaves.length} leaf${leaves.length === 1 ? '' : 'ves'}`, desc: `${remaining} nodes remain, still more than 2. Remove all current leaves (${leaves.join(', ')}) together.`,
      logic: 'Peeling a whole layer at once keeps every branch shrinking at the same pace, so the middle stays put.', logicTone: 'info',
      tag: 'PEEL', note: `remaining = ${remaining} > 2 → remove ${leaves.length}, leaves ${remaining - leaves.length} left`,
      javaLines: [9, 10], pyLines: [8, 9], algoStep: 2,
    });
    next = [];
    for (const leaf of leaves) {
      cur = leaf;
      removedAt[leaf] = layer;
      remaining--;
      for (const ei of adj[leaf]) {
        const p = other(ei, leaf);
        if (removedAt[p] > 0) continue;
        eState[ei] = 'dim';
        deg[p]--;
        const becomes = deg[p] === 1;
        if (becomes) next.push(p);
        push({
          title: `Remove leaf ${leaf}: deg[${p}] ${deg[p] + 1} → ${deg[p]}`,
          desc: becomes ? `Node ${p} is now a leaf too, so it will be peeled in the next layer.` : `Node ${p} still has ${deg[p]} neighbours.`,
          logic: 'Removing a leaf lowers its only neighbour’s degree; a degree of 1 means that neighbour has become an outer node.', logicTone: becomes ? 'success' : 'info',
          tag: 'REMOVE', note: becomes ? `deg[${p}] = 1 → next.add(${p})` : `deg[${p}] = ${deg[p]}, not a leaf yet`,
          javaLines: [12, 13, 14], pyLines: [11, 12, 13, 14, 15], algoStep: 3,
        });
      }
    }
    cur = null;
    leaves = next;
    next = [];
  }

  final = true;
  const roots: number[] = [];
  for (let i = 0; i < n; i++) if (removedAt[i] === 0) roots.push(i);
  steps.push({
    title: `Roots: ${roots.join(', ')}`, desc: `Only ${plural(remaining, 'node')} ${verb(remaining, 'remains', 'remain')}, so no more peeling is needed. ${roots.length === 1 ? 'The centre of the tree' : 'The two centres of the tree'} give${roots.length === 1 ? 's' : ''} the minimum height.`,
    scene: scene(), aux: aux(), vars: vars(),
    logic: 'The middle of a longest path is the best root; a tree has one centre or two adjacent ones.', logicTone: 'success',
    tag: '✅ Done!', note: `remaining = ${remaining} → return [${roots.join(', ')}]`,
    javaLines: [17], pyLines: [17],
    algoStep: 4,
    result: { title: `[${roots.join(', ')}]`, text: 'Roots that give minimum-height trees' },
  });
  return steps;
}

const ex = (n: number, s: string): In => ({ n, edges: s ? s.split(' ').map((t) => ({ u: +t.split('-')[0], v: +t.split('-')[1] })) : [] });

export const minimumHeightTrees: ProblemDef<In> = {
  slug: '310-minimum-height-trees',
  id: '310', title: 'Minimum Height Trees', difficulty: 'Medium', category: 'Graph', tag: 'peel leaves',
  statement: 'A tree is an undirected connected graph without cycles. Any node can be chosen as the root. Among all rooted trees, those with the smallest height are the minimum height trees. Return the labels of all roots that produce one.',
  constraints: '1 ≤ n ≤ 2·10⁴, edges form a tree (animation input: up to 10 nodes; write n, then edges like 0-3 1-3)',
  examples: [
    { label: '4 | 1-0 1-2 1-3', input: ex(4, '1-0 1-2 1-3'), output: '[1]' },
    { label: '6 | 3-0 3-1 3-2 3-4 5-4', input: ex(6, '3-0 3-1 3-2 3-4 5-4'), output: '[3, 4]' },
    { label: '7 | 0-1 1-2 2-3 3-4 4-5 5-6', input: ex(7, '0-1 1-2 2-3 3-4 4-5 5-6'), output: '[3]' },
  ],
  inputPlaceholder: 'e.g. 6 3-0 3-1 3-2 3-4 5-4   (n nodes, then n-1 tree edges)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Leaf being removed', state: 'active' }, { label: 'Leaf in this layer', state: 'compare' }, { label: 'Already peeled', state: 'dim' }, { label: 'Centre (answer)', state: 'found' }],
  varLabels: ['layer', 'remaining', 'leaf'],
  phases: [
    { icon: '🧮', label: 'Init: degrees', tone: 'blue' },
    { icon: '🍃', label: 'Collect leaves', tone: 'cyan' },
    { icon: '✂', label: 'Peel a layer', tone: 'orange' },
    { icon: '📉', label: 'Lower neighbour degree', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['minimum height', 'root', 'labels'],
  vizTitle: 'Tree (peel from the outside in)',
  approach: {
    title: 'Peel leaves layer by layer',
    text: 'Compute every node’s degree. All nodes of degree 1 are leaves. While more than two nodes remain, remove all current leaves at once, reduce the degree of their neighbours, and treat neighbours that dropped to degree 1 as the next layer of leaves. The one or two nodes left at the end are the centres of the tree and the best roots.',
  },
  java: [
    'public List<Integer> findMinHeightTrees(int n, int[][] edges) {',
    '    if (n <= 2) return n == 1 ? List.of(0) : List.of(0, 1);',
    '    List<List<Integer>> adj = new ArrayList<>();',
    '    int[] deg = new int[n];',
    '    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());',
    '    for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); deg[e[0]]++; deg[e[1]]++; }',
    '    List<Integer> leaves = new ArrayList<>();',
    '    for (int i = 0; i < n; i++) if (deg[i] == 1) leaves.add(i);',
    '    int remaining = n;',
    '    while (remaining > 2) {                      // peel one layer',
    '        remaining -= leaves.size();',
    '        List<Integer> next = new ArrayList<>();',
    '        for (int leaf : leaves)',
    '            for (int p : adj.get(leaf))',
    '                if (--deg[p] == 1) next.add(p);   // p became a leaf',
    '        leaves = next;',
    '    }',
    '    return leaves;                               // the centre(s)',
    '}',
  ],
  python: [
    'def find_min_height_trees(n, edges):',
    '    if n <= 2:',
    '        return list(range(n))',
    '    adj = [set() for _ in range(n)]',
    '    for a, b in edges:',
    '        adj[a].add(b); adj[b].add(a)',
    '    leaves = [i for i in range(n) if len(adj[i]) == 1]',
    '    remaining = n',
    '    while remaining > 2:                        # peel one layer',
    '        remaining -= len(leaves)',
    '        nxt = []',
    '        for leaf in leaves:',
    '            p = adj[leaf].pop()',
    '            adj[p].remove(leaf)',
    '            if len(adj[p]) == 1:',
    '                nxt.append(p)                   # p became a leaf',
    '        leaves = nxt',
    '    return leaves',
  ],
  algorithm: [
    'Build adjacency lists and the degree of every node (return all nodes if n ≤ 2)',
    'Collect all nodes of degree 1: the first layer of leaves',
    'While more than 2 nodes remain, remove every current leaf at once',
    'Lower the degree of each removed leaf’s neighbour; a neighbour at degree 1 joins the next layer',
    'The 1 or 2 nodes left are the roots of minimum-height trees',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'The height of a tree rooted at r is the distance from r to the farthest node, so a good root is as close as possible to both ends of the longest path. Peeling every leaf shortens every longest path by exactly 2 (one from each end) and keeps its middle, so the centre never changes. Repeating until at most two nodes are left ends at the middle of a longest path: one node if its length is even, two if it is odd.',
};
