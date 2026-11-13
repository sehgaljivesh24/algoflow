import type { Aux, CellState, EdgeState, GraphEdgeVM, Pointer, ProblemDef, Step, Tone } from '../engine/types';
import { adjacency, mkEdges, parseGraph } from './p5dKit.ts';
import type { GIn } from './p5dKit.ts';

/** Directed graph on nodes 0..n-1; find the strongly connected components with Tarjan's algorithm. */
function parse(raw: string): GIn {
  return parseGraph(raw, { base: 0, minN: 2, maxN: 8, maxE: 14, example: '5 0>1 1>2 2>0 2>3 3>4', directed: true });
}

const SCC_TONES: Tone[] = ['purple', 'green', 'yellow', 'blue', 'orange', 'red'];

function build({ n, edges }: GIn): Step[] {
  const adj = adjacency(n, edges, 0, true);
  const disc = new Array<number>(n).fill(-1);
  const low = new Array<number>(n).fill(0);
  const onStack = new Array<boolean>(n).fill(false);
  const comp = new Array<number>(n).fill(-1);
  const eState: EdgeState[] = edges.map(() => 'default');
  const stack: number[] = [];
  const calls: string[] = [];
  const sccs: number[][] = [];
  const steps: Step[] = [];
  let cur: number | null = null;
  let timer = 0;

  const scene = () => ({
    kind: 'graph' as const,
    nodes: Array.from({ length: n }, (_, id) => {
      const state: CellState | undefined = id === cur ? 'active' : onStack[id] ? 'compare' : undefined;
      const tone = comp[id] >= 0 ? SCC_TONES[comp[id] % SCC_TONES.length] : undefined;
      const tag = comp[id] >= 0 ? `SCC ${comp[id] + 1}` : disc[id] < 0 ? '–' : `${disc[id]}/${low[id]}`;
      return { id, state, tone, tag };
    }),
    edges: edges.map((e, i): GraphEdgeVM => ({ from: e.u, to: e.v, directed: true, state: eState[i] })),
    pointers: cur === null ? [] : ([{ id: 'cur', label: 'u', index: cur, tone: 'blue' }] as Pointer[]),
  });
  const aux = (): Aux[] => [
    { title: 'Tarjan stack (top on the right)', kind: 'stack', items: stack.map(String) },
    { title: 'DFS call stack', kind: 'stack', items: [...calls] },
    { title: 'components found', kind: 'list', items: sccs.map((c, i) => `${i + 1}: {${[...c].sort((a, b) => a - b).join(', ')}}`) },
  ];
  const vars = () => ({ node: cur ?? '—', 'disc[node]': cur === null ? '—' : disc[cur], 'low[node]': cur === null ? '—' : low[cur], components: sccs.length });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${n} nodes, ${edges.length} directed edges. A strongly connected component (SCC) is a maximal set of nodes that can all reach each other. Each node shows "disc/low".`,
    logic: 'Tarjan finds all SCCs in one DFS: nodes that are still on the stack when we get back to their DFS root form that root\'s component.', logicTone: 'info',
    tag: 'INIT —', note: `disc[0..${n - 1}] = −1, stack = [], timer = 0`,
    javaLines: [3, 4, 5, 6, 7], pyLines: [1, 2, 3, 4, 5, 6], algoStep: 0,
  });

  const dfs = (u: number): void => {
    disc[u] = low[u] = timer++;
    stack.push(u);
    onStack[u] = true;
    calls.push(String(u));
    cur = u;
    push({
      title: `Discover ${u}: disc = low = ${disc[u]}, push on stack`, desc: `Node ${u} gets timestamp ${disc[u]} and joins the Tarjan stack (orange ring: still open).`,
      logic: 'The stack holds every node whose component has not been decided yet.', logicTone: 'info',
      tag: 'DISCOVER', note: `disc[${u}] = low[${u}] = ${disc[u]}, stack = [${stack.join(', ')}]`,
      javaLines: [14, 15], pyLines: [7, 8, 9], algoStep: 1,
    });
    for (const { to: v, ei } of adj[u]) {
      cur = u;
      eState[ei] = 'active';
      if (disc[v] === -1) {
        push({
          title: `Edge ${u} → ${v}: ${v} is new`, desc: `Recurse into ${v}.`,
          logic: 'An unvisited successor becomes a child in the DFS tree.', logicTone: 'info',
          tag: 'TREE EDGE', note: `disc[${v}] == −1 → dfs(${v})`,
          javaLines: [17, 18], pyLines: [11, 12], algoStep: 2,
        });
        dfs(v);
        cur = u;
        const old = low[u];
        low[u] = Math.min(low[u], low[v]);
        push({
          title: `Back in ${u}: low[${u}] = min(${old}, low[${v}]=${low[v]}) = ${low[u]}`, desc: low[u] < old ? `${v}'s subtree can reach an earlier open node, so ${u} can too.` : `${v}'s subtree reaches nothing earlier than what ${u} already reaches.`,
          logic: 'low[u] is the smallest discovery time reachable from u through its subtree and one edge to a node still on the stack.', logicTone: low[u] < old ? 'success' : 'info',
          tag: 'RETURN', note: `low[${u}] = min(${old}, ${low[v]}) = ${low[u]}`,
          javaLines: [19], pyLines: [13], algoStep: 3,
        });
        eState[ei] = 'visited';
      } else if (onStack[v]) {
        const old = low[u];
        low[u] = Math.min(low[u], disc[v]);
        push({
          title: `Edge ${u} → ${v}: ${v} is on the stack`, desc: low[u] < old ? `${v} is an open node discovered at ${disc[v]}. ${u} can get back to it, so low[${u}] = ${low[u]}.` : `${v} is open, but disc[${v}] = ${disc[v]} is not lower than low[${u}] = ${old}.`,
          logic: 'A node on the stack lies in the same unfinished component, so an edge to it is a way back.', logicTone: low[u] < old ? 'success' : 'info',
          tag: 'ON STACK', note: `onStack[${v}] → low[${u}] = min(${old}, disc[${v}] = ${disc[v]}) = ${low[u]}`,
          javaLines: [20, 21], pyLines: [14, 15], algoStep: 3,
        });
        eState[ei] = 'visited';
      } else {
        eState[ei] = 'dim';
        push({
          title: `Edge ${u} → ${v}: ${v} is already in SCC ${comp[v] + 1}`, desc: `${v}'s component is finished, and it cannot lead back to ${u} (otherwise they would be one component). Ignore this edge.`,
          logic: 'Edges into a completed component never merge anything.', logicTone: 'info',
          tag: 'IGNORE', alert: `Edge ${u}→${v} is ignored: ${v} already belongs to the finished SCC ${comp[v] + 1}.`, note: `disc[${v}] set and onStack[${v}] = false → skip`,
          javaLines: [20], pyLines: [14], algoStep: 3,
        });
      }
    }
    if (low[u] === disc[u]) {
      const members: number[] = [];
      let w: number;
      do {
        w = stack.pop()!;
        onStack[w] = false;
        comp[w] = sccs.length;
        members.push(w);
      } while (w !== u);
      sccs.push(members);
      push({
        title: `low[${u}] = disc[${u}] = ${disc[u]}: ${u} is a root, pop SCC ${sccs.length}`, desc: `Pop the stack down to ${u}: {${[...members].sort((a, b) => a - b).join(', ')}} can all reach each other and nothing else on the stack can.`,
        logic: 'If a node cannot reach anything earlier than itself, everything above it on the stack is mutually reachable with it.', logicTone: 'success',
        tag: 'POP SCC', note: `low[${u}] == disc[${u}] = ${disc[u]} → comp = {${[...members].sort((a, b) => a - b).join(', ')}}`,
        javaLines: [24, 25, 26, 27, 28], pyLines: [16, 17, 18, 19, 20, 21], algoStep: 4,
      });
    }
    calls.pop();
    cur = calls.length ? Number(calls[calls.length - 1]) : null;
  };
  for (let s = 0; s < n; s++) {
    if (disc[s] !== -1) continue;
    if (s > 0) {
      cur = null;
      push({
        title: `Node ${s} not discovered: start a new DFS`, desc: `Some nodes are not reachable from the earlier roots. Restart from ${s}.`,
        logic: 'The outer loop makes sure every node gets visited.', logicTone: 'info',
        tag: 'NEW DFS', note: `disc[${s}] == −1 → dfs(${s})`,
        javaLines: [8, 9], pyLines: [22, 23, 24], algoStep: 0,
      });
    }
    dfs(s);
  }
  cur = null;
  const norm = sccs.map((c) => [...c].sort((a, b) => a - b)).sort((a, b) => a[0] - b[0]);
  push({
    title: `${sccs.length} strongly connected component${sccs.length === 1 ? '' : 's'}`, desc: `Components: ${norm.map((c) => `{${c.join(', ')}}`).join(', ')}.`,
    logic: 'Every node was popped exactly once, so the components partition the nodes.', logicTone: 'success',
    tag: '✅ Done!', note: `return ${sccs.length} component${sccs.length === 1 ? '' : 's'}: ${norm.map((c) => `{${c.join(',')}}`).join(' ')}`,
    javaLines: [10], pyLines: [25], algoStep: 5,
    result: { title: `[${norm.map((c) => `[${c.join(',')}]`).join(',')}]`, text: `${sccs.length} strongly connected component${sccs.length === 1 ? '' : 's'}` },
  });
  return steps;
}

const mk = (n: number, s: string): GIn => ({ n, edges: mkEdges(s) });

export const stronglyConnectedComponents: ProblemDef<GIn> = {
  slug: 'cp-strongly-connected-components-tarjan',
  id: 'CP', title: 'Strongly Connected Components (Tarjan)', difficulty: 'Hard', category: 'Graph', tag: 'low-link + stack',
  statement: 'Given a directed graph, split its nodes into strongly connected components: maximal groups in which every node can reach every other node by following edge directions.',
  constraints: 'Classic algorithm demo (animation input: 2–8 nodes, ≤ 14 directed edges; write "n" then edges like 0>1 1>2)',
  examples: [
    { label: '5 | 0>1 1>2 2>0 2>3 3>4', input: mk(5, '0>1 1>2 2>0 2>3 3>4'), output: '[[0,1,2],[3],[4]]' },
    { label: '6 | 0>1 1>0 1>2 2>3 3>4 4>2 4>5', input: mk(6, '0>1 1>0 1>2 2>3 3>4 4>2 4>5'), output: '[[0,1],[2,3,4],[5]]' },
    { label: '4 | 0>1 1>2 2>3 3>0', input: mk(4, '0>1 1>2 2>3 3>0'), output: '[[0,1,2,3]]' },
  ],
  inputPlaceholder: 'e.g. 5 0>1 1>2 2>0 2>3 3>4   (n, then directed edges u>v)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current node u', state: 'active' }, { label: 'On the Tarjan stack', state: 'compare' }],
  varLabels: ['node', 'disc[node]', 'low[node]', 'components'],
  approach: {
    title: 'Tarjan: low-link plus an explicit stack',
    text: 'Run a DFS that stamps each node with disc and low and pushes it on a stack. Edges to unvisited nodes recurse and then pull up low[child]; edges to nodes still on the stack pull up disc[target]; edges to nodes whose component is already finished are ignored. When a node ends with low == disc it is the root of a component: pop the stack down to it and that whole group is one SCC.',
  },
  java: [
    'private int timer = 0;',
    '',
    'public List<List<Integer>> stronglyConnected(int n, List<Integer>[] adj) {',
    '    int[] disc = new int[n], low = new int[n];',
    '    boolean[] onStack = new boolean[n];',
    '    Deque<Integer> stack = new ArrayDeque<>();',
    '    List<List<Integer>> sccs = new ArrayList<>();',
    '    Arrays.fill(disc, -1);',
    '    for (int s = 0; s < n; s++)',
    '        if (disc[s] == -1) dfs(s, adj, disc, low, onStack, stack, sccs);',
    '    return sccs;',
    '}',
    '',
    'private void dfs(int u, List<Integer>[] adj, int[] disc, int[] low, boolean[] onStack, Deque<Integer> stack, List<List<Integer>> sccs) {',
    '    disc[u] = low[u] = timer++;',
    '    stack.push(u); onStack[u] = true;',
    '    for (int v : adj[u]) {',
    '        if (disc[v] == -1) {',
    '            dfs(v, adj, disc, low, onStack, stack, sccs);',
    '            low[u] = Math.min(low[u], low[v]);',
    '        } else if (onStack[v]) {',
    '            low[u] = Math.min(low[u], disc[v]);',
    '        }',
    '    }',
    '    if (low[u] == disc[u]) {                       // u is the root of an SCC',
    '        List<Integer> comp = new ArrayList<>();',
    '        int w;',
    '        do { w = stack.pop(); onStack[w] = false; comp.add(w); } while (w != u);',
    '        sccs.add(comp);',
    '    }',
    '}',
  ],
  python: [
    'def strongly_connected(n, adj):',
    '    disc = [-1] * n',
    '    low = [0] * n',
    '    on_stack = [False] * n',
    '    stack, sccs = [], []',
    '    timer = [0]',
    '    def dfs(u):',
    '        disc[u] = low[u] = timer[0]; timer[0] += 1',
    '        stack.append(u)',
    '        on_stack[u] = True',
    '        for v in adj[u]:',
    '            if disc[v] == -1:',
    '                dfs(v)',
    '                low[u] = min(low[u], low[v])',
    '            elif on_stack[v]:',
    '                low[u] = min(low[u], disc[v])',
    '        if low[u] == disc[u]:                  # u is the root of an SCC',
    '            comp = []',
    '            while True:',
    '                w = stack.pop(); on_stack[w] = False; comp.append(w)',
    '                if w == u: break',
    '            sccs.append(comp)',
    '    for s in range(n):',
    '        if disc[s] == -1:',
    '            dfs(s)',
    '    return sccs',
  ],
  phases: [
    { icon: '🚀', label: 'Start a DFS', tone: 'blue' },
    { icon: '🔦', label: 'Discover: push on stack', tone: 'cyan' },
    { icon: '🧭', label: 'Follow an edge', tone: 'green' },
    { icon: '⬇', label: 'Update low', tone: 'gold' },
    { icon: '📦', label: 'Pop an SCC', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['strongly connected components', 'every node can reach every other'],
  algorithm: [
    'Start a DFS from every unvisited node; set disc = low = timestamp',
    'Push the node on the Tarjan stack and mark it open',
    'Unvisited successor: recurse. Open successor (on the stack): note it as a way back',
    'low[u] = min(low[u], low[child]) after a recursive call, or min(low[u], disc[v]) for an open successor',
    'If low[u] == disc[u], pop the stack down to u: those nodes are one SCC',
    'Return all components',
  ],
  complexity: [{ label: 'Time', value: 'O(V + E)' }, { label: 'Space', value: 'O(V)' }],
  why: 'While u is being explored, every node above it on the stack was reached from u. If none of them (and nothing reachable from them) can get back below u\'s own timestamp, then u cannot reach anything earlier either, so they can all reach u (they are in its DFS subtree and were not yet claimed) and u can reach them: one component, and a maximal one since nothing earlier is reachable. If low[u] < disc[u], u reaches an open ancestor, so u belongs to that ancestor\'s component and stays on the stack for it. Each node is pushed and popped once.',
};
