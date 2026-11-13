import type { Aux, CellState, EdgeState, GraphEdgeVM, Pointer, ProblemDef, Step, Tone } from '../engine/types';
import { adjacency, mkEdges, parseGraph } from './p5dKit.ts';
import type { GIn } from './p5dKit.ts';

/** Undirected graph on nodes 0..n-1. Return an odd-length cycle, or report that the graph is bipartite. */
function parse(raw: string): GIn {
  return parseGraph(raw, { base: 0, minN: 3, maxN: 9, maxE: 14, example: '6 0-1 1-2 2-3 3-4 4-0 4-5' });
}

const SIDE_TONE: Record<number, Tone> = { 0: 'blue', 1: 'orange' };
const SIDE_NAME = ['A', 'B'];

function build({ n, edges }: GIn): Step[] {
  const adj = adjacency(n, edges, 0);
  const color = new Array<number>(n).fill(-1);
  const parent = new Array<number>(n).fill(-1);
  const parentEdge = new Array<number>(n).fill(-1);
  const depth = new Array<number>(n).fill(0);
  const eState: EdgeState[] = edges.map(() => 'default');
  const queue: number[] = [];
  const steps: Step[] = [];
  let cur: number | null = null;
  let hi: number[] = []; // nodes highlighted while climbing
  let cycle: number[] = [];
  let ptrs: Pointer[] = [];
  let found = '—';

  const scene = () => ({
    kind: 'graph' as const,
    nodes: Array.from({ length: n }, (_, id) => {
      const state: CellState | undefined = cycle.includes(id) ? 'error' : hi.includes(id) ? 'swap' : id === cur ? 'active' : undefined;
      return { id, state, tone: color[id] >= 0 ? SIDE_TONE[color[id]] : undefined, tag: color[id] >= 0 ? `${SIDE_NAME[color[id]]}, depth ${depth[id]}` : '–' };
    }),
    edges: edges.map((e, i): GraphEdgeVM => ({ from: e.u, to: e.v, state: eState[i] })),
    pointers: ptrs.length ? ptrs.map((p) => ({ ...p })) : cur === null ? [] : ([{ id: 'cur', label: 'u', index: cur, tone: 'purple' }] as Pointer[]),
  });
  const aux = (): Aux[] => [
    { title: 'BFS queue (front on the left)', kind: 'queue', items: queue.map(String) },
    { title: 'parent[ ]', kind: 'list', items: parent.map((p, i) => `${i}: ${color[i] < 0 ? '·' : p < 0 ? 'root' : p}`) },
  ];
  const vars = () => ({ node: cur ?? '—', colour: cur === null || color[cur] < 0 ? '—' : SIDE_NAME[color[cur]], 'cycle length': cycle.length || '—', 'odd cycle': found });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${n} nodes, ${edges.length} edges. Two-colour the graph with BFS; if that fails, the failing edge plus the BFS tree paths above it will contain an odd cycle.`,
    logic: 'A graph has an odd cycle exactly when it is not bipartite, so a colouring conflict is a certificate we can turn into an explicit cycle.', logicTone: 'info',
    tag: 'INIT —', note: `color[0..${n - 1}] = −1, parent[] = −1`,
    javaLines: [1, 2], pyLines: [1, 2], algoStep: 0,
  });

  for (let s = 0; s < n; s++) {
    if (color[s] !== -1) continue;
    color[s] = 0;
    depth[s] = 0;
    queue.push(s);
    cur = s;
    push({
      title: s === 0 ? `Colour start node ${s} with A` : `Node ${s} starts a new component: colour A`, desc: `Node ${s} is the root of a BFS tree: colour A, depth 0, no parent.`,
      logic: 'Depth parity and colour always agree: even depth is A, odd depth is B.', logicTone: 'info',
      tag: 'START', note: `color[${s}] = 0, parent[${s}] = −1, queue = [${s}]`,
      javaLines: [3, 4, 5, 6], pyLines: [3, 4, 6, 7], algoStep: 1,
    });
    while (queue.length) {
      const u = queue.shift()!;
      cur = u;
      push({
        title: `Dequeue ${u} (${SIDE_NAME[color[u]]}, depth ${depth[u]})`, desc: `Examine the neighbours of ${u}: ${adj[u].map((x) => x.to).join(', ')}.`,
        logic: 'BFS finishes depth d before depth d + 1, so adjacent nodes are never more than one level apart.', logicTone: 'info',
        tag: 'DEQUEUE', note: `u = ${u}, color = ${SIDE_NAME[color[u]]}, depth = ${depth[u]}`,
        javaLines: [7, 8], pyLines: [8, 9], algoStep: 2,
      });
      for (const { to: v, ei } of adj[u]) {
        eState[ei] = 'active';
        if (color[v] === -1) {
          color[v] = 1 - color[u];
          parent[v] = u;
          parentEdge[v] = ei;
          depth[v] = depth[u] + 1;
          queue.push(v);
          push({
            title: `${v} gets ${SIDE_NAME[color[v]]}, parent ${u}`, desc: `${v} is new: opposite colour ${SIDE_NAME[color[v]]}, depth ${depth[v]}, and we remember ${u} as its parent.`,
            logic: 'Parent pointers form the BFS tree; they are what lets us rebuild a cycle later.', logicTone: 'info',
            tag: 'COLOUR', note: `color[${v}] = 1 − color[${u}] = ${color[v]}, parent[${v}] = ${u}`,
            javaLines: [10, 11, 12], pyLines: [11, 12, 13, 14], algoStep: 2,
          });
          eState[ei] = 'chosen';
        } else if (color[v] === color[u]) {
          eState[ei] = 'error';
          cur = u;
          push({
            title: `Conflict edge ${u} – ${v}: both ${SIDE_NAME[color[u]]}`, desc: `${u} and ${v} are adjacent but have the same colour, hence the same depth (${depth[u]}). Now find where their BFS-tree paths meet.`,
            logic: 'The two tree paths up to a common ancestor, plus this edge, make a closed walk of length 2k + 1: odd.', logicTone: 'warn',
            tag: 'CONFLICT', alert: `Edge ${u}–${v} joins two ${SIDE_NAME[color[u]]} nodes at depth ${depth[u]}: an odd cycle passes through it.`, note: `color[${v}] == color[${u}] → cycleThrough(${u}, ${v})`,
            javaLines: [13, 14], pyLines: [15, 16], algoStep: 3,
          });
          let a = u;
          let b = v;
          const left = [a];
          const right = [b];
          ptrs = [{ id: 'a', label: 'a', index: a, tone: 'blue' }, { id: 'b', label: 'b', index: b, tone: 'green' }];
          hi = [a, b];
          cur = null;
          push({
            title: `Climb from ${a} and ${b}`, desc: `Start two walkers, a at ${a} and b at ${b}. They are at the same depth, so step both to their parents until they land on the same node.`,
            logic: 'Equal depths mean we can climb in lockstep; the first shared node is the lowest common ancestor.', logicTone: 'info',
            tag: 'CLIMB', note: `a = ${a}, b = ${b}, depth ${depth[a]} both`,
            javaLines: [22, 23, 24], pyLines: [19, 20, 21], algoStep: 4,
          });
          while (a !== b) {
            eState[parentEdge[a]] = 'chosen';
            eState[parentEdge[b]] = 'chosen';
            a = parent[a];
            b = parent[b];
            if (a !== b) { left.push(a); right.push(b); } else left.push(a);
            hi = [...left, ...right];
            ptrs = [{ id: 'a', label: 'a', index: a, tone: 'blue' }, { id: 'b', label: 'b', index: b, tone: 'green' }];
            push({
              title: a === b ? `Both walkers meet at ${a}` : `Step up: a = ${a}, b = ${b}`, desc: a === b ? `They share ${a}, the lowest common ancestor of ${u} and ${v}.` : `Parents of the previous nodes: a moves to ${a}, b to ${b}. Not equal yet, climb again.`,
              logic: a === b ? 'The meeting node closes the loop.' : 'Both walkers are always at the same depth, so they arrive together.', logicTone: 'info',
              tag: 'CLIMB', note: a === b ? `a == b == ${a} → lowest common ancestor` : `a = parent = ${a}, b = parent = ${b}, still different`,
              javaLines: [24, 25, 26], pyLines: [21, 22, 23, 24], algoStep: 4,
            });
          }
          cycle = [...left, ...[...right].reverse()];
          ptrs = [];
          hi = [];
          found = `length ${cycle.length}`;
          // mark every cycle edge
          cycle.forEach((x, i) => {
            const y = cycle[(i + 1) % cycle.length];
            const idx = edges.findIndex((e) => (e.u === x && e.v === y) || (e.u === y && e.v === x));
            if (idx >= 0) eState[idx] = 'error';
          });
          steps.push({
            title: `Odd cycle of length ${cycle.length}`, desc: `The cycle is ${cycle.join(' → ')} → ${cycle[0]}: up from ${u} to ${a}, down to ${v}, and back across the conflict edge. ${cycle.length} edges, an odd number.`,
            scene: scene(), aux: aux(), vars: vars(),
            logic: 'Left path + right path reversed + conflict edge is a simple cycle (the tree paths only meet at the ancestor), and its length is 2k + 1.', logicTone: 'warn',
            tag: '✅ Done!', alert: `Odd cycle found: ${cycle.length} edges, so the graph cannot be 2-coloured.`, note: `left + [${a}] + reversed right → [${cycle.join(', ')}]`,
            javaLines: [28, 29, 30, 31], pyLines: [25], algoStep: 5,
            result: { title: `[${cycle.join(',')}]`, text: `Odd cycle of length ${cycle.length}, so the graph is not bipartite` },
          });
          return steps;
        } else {
          push({
            title: `${v} already ${SIDE_NAME[color[v]]}: consistent`, desc: `Edge ${u}–${v} joins different colours, as it should.`,
            logic: 'No contradiction on this edge.', logicTone: 'success',
            tag: 'CHECK', note: `color[${v}] = ${SIDE_NAME[color[v]]} ≠ color[${u}] = ${SIDE_NAME[color[u]]} → ok`,
            javaLines: [13], pyLines: [15], algoStep: 2,
          });
          eState[ei] = eState[ei] === 'active' ? 'visited' : eState[ei];
        }
      }
      eState.forEach((st, i) => { if (st === 'active') eState[i] = 'visited'; });
    }
    cur = null;
  }
  found = 'none';
  steps.push({
    title: 'No conflict anywhere', desc: 'Every edge joins an A node to a B node, so the colouring is valid and the graph has no odd cycle.',
    scene: scene(), aux: aux(), vars: vars(),
    logic: 'Bipartite graphs contain only even cycles, so there is nothing to report.', logicTone: 'success',
    tag: '✅ Done!', note: 'no conflict edge → return [] (bipartite)',
    javaLines: [19], pyLines: [17], algoStep: 5,
    result: { title: 'bipartite', text: 'No odd cycle: the graph is 2-colourable' },
  });
  return steps;
}

const mk = (n: number, s: string): GIn => ({ n, edges: mkEdges(s) });

export const findAnOddCycle: ProblemDef<GIn> = {
  slug: 'cp-find-an-odd-cycle',
  id: 'CP', title: 'Find an Odd Cycle', difficulty: 'Medium', category: 'Graph', tag: 'colouring conflict witness',
  statement: 'Given an undirected graph, either report that it is bipartite, or return a concrete cycle with an odd number of edges that proves it is not.',
  constraints: 'Classic demo (animation input: 3–9 nodes, ≤ 14 edges; write "n" then edges like 0-1 1-2). Any valid odd cycle is acceptable; the animation reports the one its BFS finds.',
  examples: [
    { label: '6 | 0-1 1-2 2-3 3-4 4-0 4-5', input: mk(6, '0-1 1-2 2-3 3-4 4-0 4-5'), output: '[2,1,0,4,3]' },
    { label: '6 | 0-1 0-2 1-3 2-4 3-5 4-5 3-4', input: mk(6, '0-1 0-2 1-3 2-4 3-5 4-5 3-4'), output: '[3,1,0,2,4]' },
    { label: '6 | 0-1 1-2 2-3 3-4 4-5 5-0', input: mk(6, '0-1 1-2 2-3 3-4 4-5 5-0'), output: 'bipartite' },
  ],
  inputPlaceholder: 'e.g. 6 0-1 1-2 2-3 3-4 4-0 4-5   (n, then edges)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Node being expanded', state: 'active' }, { label: 'Walker climbing the BFS tree', state: 'swap' }, { label: 'Odd cycle / conflict', state: 'error' }],
  varLabels: ['node', 'colour', 'cycle length', 'odd cycle'],
  approach: {
    title: 'BFS colouring, then rebuild the cycle from parent pointers',
    text: 'Colour the graph with BFS and remember every node\'s parent and depth. The first edge u–v whose ends share a colour has equal depths. Move two walkers up the parent pointers in lockstep until they meet at the lowest common ancestor; the two climbed paths plus the conflict edge form a simple cycle of length 2k + 1. If BFS ends with no conflict, the graph is bipartite.',
  },
  java: [
    'public List<Integer> findOddCycle(int n, List<Integer>[] adj) {',
    '    int[] color = new int[n], parent = new int[n];',
    '    Arrays.fill(color, -1);',
    '    for (int s = 0; s < n; s++) {',
    '        if (color[s] != -1) continue;',
    '        color[s] = 0; parent[s] = -1;',
    '        Queue<Integer> q = new ArrayDeque<>(List.of(s));',
    '        while (!q.isEmpty()) {',
    '            int u = q.poll();',
    '            for (int v : adj[u]) {',
    '                if (color[v] == -1) {',
    '                    color[v] = 1 - color[u]; parent[v] = u;',
    '                    q.add(v);',
    '                } else if (color[v] == color[u]) {',
    '                    return cycleThrough(u, v, parent);   // conflict edge found',
    '                }',
    '            }',
    '        }',
    '    }',
    '    return List.of();                                  // bipartite: no odd cycle',
    '}',
    '',
    'private List<Integer> cycleThrough(int u, int v, int[] parent) {',
    '    List<Integer> left = new ArrayList<>(), right = new ArrayList<>();',
    '    while (u != v) {                                   // BFS depths of u and v are equal',
    '        left.add(u); right.add(v);',
    '        u = parent[u]; v = parent[v];',
    '    }',
    '    left.add(u);                                       // u == v == meeting node',
    '    Collections.reverse(right);',
    '    left.addAll(right);',
    '    return left;',
    '}',
  ],
  python: [
    'def find_odd_cycle(n, adj):',
    '    color = [-1] * n',
    '    parent = [-1] * n',
    '    for s in range(n):',
    '        if color[s] != -1:',
    '            continue',
    '        color[s] = 0',
    '        q = deque([s])',
    '        while q:',
    '            u = q.popleft()',
    '            for v in adj[u]:',
    '                if color[v] == -1:',
    '                    color[v] = 1 - color[u]',
    '                    parent[v] = u',
    '                    q.append(v)',
    '                elif color[v] == color[u]:',
    '                    return cycle_through(u, v, parent)   # conflict edge found',
    '    return []                                          # bipartite: no odd cycle',
    '',
    'def cycle_through(u, v, parent):',
    '    left, right = [], []',
    '    while u != v:                                      # BFS depths are equal',
    '        left.append(u)',
    '        right.append(v)',
    '        u, v = parent[u], parent[v]',
    '    return left + [u] + right[::-1]',
  ],
  phases: [
    { icon: '🧮', label: 'Init: uncoloured', tone: 'blue' },
    { icon: '🎯', label: 'Colour a start node', tone: 'cyan' },
    { icon: '🎨', label: 'Dequeue and colour', tone: 'green' },
    { icon: '⚠', label: 'Conflict edge', tone: 'orange' },
    { icon: '🧗', label: 'Climb to the ancestor', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['odd number of edges', 'bipartite', 'cycle'],
  algorithm: [
    'Mark all nodes uncoloured; loop over every node so every component is searched',
    'Colour an uncoloured start node A and enqueue it',
    'Dequeue u; uncoloured neighbours get the opposite colour, a parent pointer, and join the queue',
    'A neighbour with the same colour as u is a conflict edge u–v',
    'Walk u and v up their parent pointers in lockstep until they are the same node',
    'The two climbed paths plus the conflict edge are the odd cycle; with no conflict, report bipartite',
  ],
  complexity: [{ label: 'Time', value: 'O(V + E)' }, { label: 'Space', value: 'O(V)' }],
  why: 'In BFS, colour equals depth parity, and the depths of two adjacent nodes differ by at most one. So an edge between same-coloured nodes joins two nodes of exactly the same depth d. Their tree paths to the lowest common ancestor at depth d − k each have k edges; the two paths share only the ancestor, so with the conflict edge they form a simple cycle of 2k + 1 edges, which is odd. If BFS finds no such edge, the colouring is valid and every cycle is even.',
};
