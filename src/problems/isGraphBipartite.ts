import type { Aux, CellState, EdgeState, GraphEdgeVM, Pointer, ProblemDef, Step, Tone } from '../engine/types';
import { adjacency, mkEdges, parseGraph } from './p5dKit.ts';
import type { GIn } from './p5dKit.ts';

/** Undirected graph on nodes 0..n-1 (may be disconnected). Can the nodes be split into two sides with no edge inside a side? */
function parse(raw: string): GIn {
  return parseGraph(raw, { base: 0, minN: 1, maxN: 9, maxE: 14, example: '4 0-1 1-2 2-3 3-0' });
}

const SIDE_TONE: Record<number, Tone> = { 1: 'blue', [-1]: 'orange' };
const SIDE_NAME: Record<number, string> = { 1: 'A', [-1]: 'B' };

function build({ n, edges }: GIn): Step[] {
  const adj = adjacency(n, edges, 0);
  const color = new Array<number>(n).fill(0);
  const eState: EdgeState[] = edges.map(() => 'default');
  const queue: number[] = [];
  const steps: Step[] = [];
  let cur: number | null = null;
  let bad: number[] = [];
  let verdict = '—';

  const scene = () => ({
    kind: 'graph' as const,
    nodes: Array.from({ length: n }, (_, id) => {
      const state: CellState | undefined = bad.includes(id) ? 'error' : id === cur ? 'active' : undefined;
      return { id, state, tone: color[id] ? SIDE_TONE[color[id]] : undefined, tag: color[id] ? `side ${SIDE_NAME[color[id]]}` : '–' };
    }),
    edges: edges.map((e, i): GraphEdgeVM => ({ from: e.u, to: e.v, state: eState[i] })),
    pointers: cur === null ? [] : ([{ id: 'cur', label: 'u', index: cur, tone: 'purple' }] as Pointer[]),
  });
  const aux = (): Aux[] => [
    { title: 'BFS queue (front on the left)', kind: 'queue', items: queue.map(String) },
    { title: 'colour[ ] (A = blue, B = orange)', kind: 'list', items: color.map((c, i) => `${i}: ${c ? SIDE_NAME[c] : '·'}`) },
  ];
  const vars = () => ({ node: cur ?? '—', colour: cur === null ? '—' : SIDE_NAME[color[cur]], coloured: color.filter(Boolean).length, bipartite: verdict });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${n} node${n === 1 ? '' : 's'}, ${edges.length} edge${edges.length === 1 ? '' : 's'}. Try to give every node side A (blue) or B (orange) so every edge joins different sides.`,
    logic: 'If a node is on side A, all its neighbours are forced onto side B, and theirs back onto A. The graph is bipartite exactly if this forcing never contradicts itself.', logicTone: 'info',
    tag: 'INIT —', note: `color[0..${n - 1}] = 0 (uncoloured)`,
    javaLines: [1, 2], pyLines: [1, 2], algoStep: 0,
  });

  for (let s = 0; s < n; s++) {
    if (color[s] !== 0) continue;
    color[s] = 1;
    queue.push(s);
    cur = s;
    push({
      title: s === 0 ? `Colour start node ${s} with A` : `Node ${s} is in a new component: colour it A`, desc: `${s === 0 ? 'Begin a BFS at' : 'The earlier BFS did not reach'} node ${s}. Colour it A (blue) and queue it.`,
      logic: 'Each connected component is coloured independently, so the first node of a fresh component may take either side.', logicTone: 'info',
      tag: 'START', note: `color[${s}] = 1, queue = [${s}]`,
      javaLines: [3, 4, 5, 6, 7], pyLines: [3, 4, 6, 7], algoStep: 1,
    });
    while (queue.length) {
      const u = queue.shift()!;
      cur = u;
      push({
        title: `Dequeue ${u} (side ${SIDE_NAME[color[u]]})`, desc: `Look at the neighbours of ${u}: ${adj[u].map((x) => x.to).join(', ') || 'none'}.`,
        logic: 'A node is processed after it was coloured, so its colour is already decided.', logicTone: 'info',
        tag: 'DEQUEUE', note: `u = ${u}, color[${u}] = ${color[u]}, neighbours = [${adj[u].map((x) => x.to).join(', ')}]`,
        javaLines: [9, 10], pyLines: [9, 10], algoStep: 2,
      });
      for (const { to: v, ei } of adj[u]) {
        eState[ei] = 'active';
        if (color[v] === 0) {
          color[v] = -color[u];
          queue.push(v);
          push({
            title: `${v} is uncoloured: side ${SIDE_NAME[color[v]]}`, desc: `${v} is a neighbour of ${u} (side ${SIDE_NAME[color[u]]}), so it must take the other side, ${SIDE_NAME[color[v]]}. Queue it.`,
            logic: 'Neighbours of an A node have no choice: they can only be B.', logicTone: 'info',
            tag: 'COLOUR', note: `color[${v}] = −color[${u}] = ${color[v]}, queue.add(${v})`,
            javaLines: [11, 12, 13], pyLines: [11, 12, 13], algoStep: 3,
          });
          eState[ei] = 'visited';
        } else if (color[v] === color[u]) {
          eState[ei] = 'error';
          bad = [u, v];
          verdict = 'false';
          push({
            title: `Conflict: ${u} and ${v} are both side ${SIDE_NAME[color[u]]}`, desc: `Edge ${u}–${v} joins two nodes on the same side. ${u} forces ${v} onto the other side, but earlier choices put ${v} here.`,
            logic: 'A same-side edge closes an odd-length cycle, and an odd cycle can never be 2-coloured. One conflict settles the answer.', logicTone: 'warn',
            tag: 'CONFLICT', alert: `Edge ${u}–${v} joins two side-${SIDE_NAME[color[u]]} nodes: an odd cycle, so no 2-colouring exists.`, note: `color[${v}] == color[${u}] == ${color[u]} → return false`,
            javaLines: [14, 15], pyLines: [14, 15], algoStep: 4,
          });
          cur = null;
          steps.push({
            title: 'Not bipartite', desc: `The conflict on ${bad[0]}–${bad[1]} shows an odd cycle exists, so no valid split of the nodes exists.`,
            scene: scene(), aux: aux(), vars: vars(),
            logic: 'Return false as soon as one edge joins two nodes of the same colour.', logicTone: 'warn',
            tag: '⚠ Odd cycle!', note: 'return false', alert: 'An odd cycle exists, so the graph is not bipartite.',
            javaLines: [15], pyLines: [15], algoStep: 5,
            result: { title: 'false', text: 'The graph contains an odd cycle, so it is not bipartite' },
          });
          return steps;
        } else {
          push({
            title: `${v} already has side ${SIDE_NAME[color[v]]}: consistent`, desc: `Edge ${u}–${v} joins side ${SIDE_NAME[color[u]]} to side ${SIDE_NAME[color[v]]}, as required.`,
            logic: 'An already-coloured neighbour must have the opposite colour; here it does.', logicTone: 'success',
            tag: 'CHECK', note: `color[${v}] = ${color[v]} ≠ color[${u}] = ${color[u]} → ok`,
            javaLines: [14], pyLines: [14], algoStep: 3,
          });
          eState[ei] = 'visited';
        }
      }
      eState.forEach((st, i) => { if (st === 'active') eState[i] = 'visited'; });
    }
    cur = null;
  }
  verdict = 'true';
  const sideA = color.map((c, i) => (c === 1 ? i : -1)).filter((i) => i >= 0);
  const sideB = color.map((c, i) => (c === -1 ? i : -1)).filter((i) => i >= 0);
  push({
    title: 'Every node coloured without conflict', desc: `Side A (blue): {${sideA.join(', ')}}, side B (orange): {${sideB.join(', ')}}. Every edge crosses between the sides.`,
    logic: 'All edges were checked from both ends and every one joins opposite colours, so this is a valid 2-colouring.', logicTone: 'success',
    tag: '✅ Done!', note: `no conflict → return true; |A| = ${sideA.length}, |B| = ${sideB.length}`,
    javaLines: [20], pyLines: [16], algoStep: 5,
    result: { title: 'true', text: `Bipartite: A = {${sideA.join(', ')}}, B = {${sideB.join(', ')}}` },
  });
  return steps;
}

const mk = (n: number, s: string): GIn => ({ n, edges: mkEdges(s) });

export const isGraphBipartite: ProblemDef<GIn> = {
  slug: '785-is-graph-bipartite',
  id: '785', title: 'Is Graph Bipartite?', difficulty: 'Medium', category: 'Graph', tag: 'BFS 2-colouring',
  statement: 'An undirected graph is bipartite if its nodes can be split into two sets so that every edge connects a node in one set to a node in the other. Given the graph (possibly disconnected), decide whether it is bipartite.',
  constraints: '1 ≤ n ≤ 100, no self-loops or repeated edges (animation input: 1–9 nodes, ≤ 14 edges; write "n" then edges like 0-1 1-2)',
  examples: [
    { label: '4 | 0-1 1-2 2-3 3-0', input: mk(4, '0-1 1-2 2-3 3-0'), output: 'true' },
    { label: '4 | 0-1 1-2 2-0 2-3', input: mk(4, '0-1 1-2 2-0 2-3'), output: 'false' },
    { label: '7 | 0-1 1-2 3-4 4-5 5-6 6-3', input: mk(7, '0-1 1-2 3-4 4-5 5-6 6-3'), output: 'true' },
  ],
  inputPlaceholder: 'e.g. 4 0-1 1-2 2-3 3-0   (n, then edges)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Node being expanded', state: 'active' }, { label: 'Conflict', state: 'error' }],
  varLabels: ['node', 'colour', 'coloured', 'bipartite'],
  approach: {
    title: 'BFS two-colouring',
    text: 'Colour a start node A and push it on a queue. For every neighbour of the node you dequeue: if it is uncoloured give it the opposite colour and enqueue it; if it already has the same colour as the current node, two adjacent nodes share a side and the answer is false. Start a fresh BFS from every node that is still uncoloured so disconnected graphs are covered.',
  },
  java: [
    'public boolean isBipartite(int[][] graph) {',
    '    int n = graph.length;',
    '    int[] color = new int[n];                    // 0 = uncoloured, 1 / -1 = the two sides',
    '    for (int s = 0; s < n; s++) {',
    '        if (color[s] != 0) continue;',
    '        color[s] = 1;',
    '        Queue<Integer> q = new ArrayDeque<>();',
    '        q.add(s);',
    '        while (!q.isEmpty()) {',
    '            int u = q.poll();',
    '            for (int v : graph[u]) {',
    '                if (color[v] == 0) {',
    '                    color[v] = -color[u];',
    '                    q.add(v);',
    '                } else if (color[v] == color[u]) {',
    '                    return false;                // same side: odd cycle',
    '                }',
    '            }',
    '        }',
    '    }',
    '    return true;',
    '}',
  ],
  python: [
    'def is_bipartite(graph):',
    '    n = len(graph)',
    '    color = [0] * n                              # 0 = uncoloured, 1 / -1 = the two sides',
    '    for s in range(n):',
    '        if color[s] != 0:',
    '            continue',
    '        color[s] = 1',
    '        q = deque([s])',
    '        while q:',
    '            u = q.popleft()',
    '            for v in graph[u]:',
    '                if color[v] == 0:',
    '                    color[v] = -color[u]',
    '                    q.append(v)',
    '                elif color[v] == color[u]:',
    '                    return False                 # same side: odd cycle',
    '    return True',
  ],
  algorithm: [
    'Give every node colour 0 (unset); loop over all nodes so every component is visited',
    'Colour an unset start node 1 and put it on a queue',
    'Dequeue u and look at each neighbour v',
    'Unset neighbour: colour it opposite to u and enqueue; coloured neighbour with the opposite colour: fine',
    'A neighbour with the same colour as u means an odd cycle: return false',
    'Return the verdict: true if every component finished without a conflict, false after the first one',
  ],
  phases: [
    { icon: '🧮', label: 'Init: all uncoloured', tone: 'blue' },
    { icon: '🎯', label: 'Colour a start node', tone: 'cyan' },
    { icon: '📤', label: 'Dequeue u', tone: 'cyan' },
    { icon: '🎨', label: 'Colour / check neighbour', tone: 'green' },
    { icon: '⚠', label: 'Conflict', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['bipartite', 'two sets', 'every edge'],
  complexity: [{ label: 'Time', value: 'O(V + E)' }, { label: 'Space', value: 'O(V)' }],
  why: 'Along any path the colours must alternate, so the colour of a node is forced by its distance parity from the start of its component. A conflict means two nodes at the same distance parity are adjacent, which closes a cycle of odd length, and no 2-colouring of an odd cycle exists. If BFS finishes without conflict, the colouring it built is itself a valid split. Each node is queued once and each edge examined twice.',
};
