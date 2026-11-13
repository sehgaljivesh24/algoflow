import type { Aux, CellState, EdgeState, GraphEdgeVM, Pointer, ProblemDef, Step } from '../engine/types';
import { adjacency, fmtPairs, mkEdges, parseGraph } from './p5dKit.ts';
import type { GIn } from './p5dKit.ts';

/** Connected undirected network on servers 0..n-1; find every bridge (an edge whose removal disconnects it). */
function parse(raw: string): GIn {
  return parseGraph(raw, { base: 0, minN: 2, maxN: 9, maxE: 14, example: '4 0-1 1-2 2-0 1-3', connected: true });
}

function build({ n, edges }: GIn): Step[] {
  const adj = adjacency(n, edges, 0);
  const disc = new Array<number>(n).fill(-1);
  const low = new Array<number>(n).fill(0);
  const eState: EdgeState[] = edges.map(() => 'default');
  const done = new Array<boolean>(n).fill(false);
  const stack: string[] = [];
  const bridges: [number, number][] = [];
  const steps: Step[] = [];
  let cur: number | null = null;
  let timer = 0;

  const tag = (i: number) => (disc[i] < 0 ? '–' : `${disc[i]}/${low[i]}`);
  const scene = () => ({
    kind: 'graph' as const,
    nodes: Array.from({ length: n }, (_, id) => {
      const state: CellState | undefined = id === cur ? 'active' : done[id] ? 'found' : disc[id] >= 0 ? 'compare' : undefined;
      return { id, state, tag: tag(id) };
    }),
    edges: edges.map((e, i): GraphEdgeVM => ({ from: e.u, to: e.v, state: eState[i] })),
    pointers: cur === null ? [] : ([{ id: 'cur', label: 'u', index: cur, tone: 'blue' }] as Pointer[]),
  });
  const aux = (): Aux[] => [
    { title: 'DFS call stack (node, parent)', kind: 'stack', items: [...stack] },
    { title: 'bridges found', kind: 'list', items: bridges.map(([a, b]) => `${a}–${b}`) },
  ];
  const vars = () => ({ node: cur ?? '—', 'disc[node]': cur === null ? '—' : disc[cur], 'low[node]': cur === null ? '—' : low[cur], bridges: bridges.length });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${n} servers, ${edges.length} cables. A cable is critical (a bridge) if removing it splits the network. Each node will carry "disc/low" under it.`,
    logic: 'disc is the time a node is first reached; low is the earliest disc reachable from its subtree using at most one back edge.', logicTone: 'info',
    tag: 'INIT —', note: `disc[0..${n - 1}] = −1, timer = 0, dfs(0, −1)`,
    javaLines: [4, 5, 6, 7], pyLines: [1, 2, 3, 4, 5, 6, 7], algoStep: 0,
  });

  const dfs = (u: number, parent: number): void => {
    disc[u] = low[u] = timer++;
    cur = u;
    stack.push(`(${u}, ${parent === -1 ? 'none' : parent})`);
    push({
      title: `Discover ${u}: disc = low = ${disc[u]}`, desc: `Node ${u} is reached at time ${disc[u]}. For now the earliest node it can get back to is itself, so low = ${low[u]}.`,
      logic: 'low starts equal to disc and can only shrink when we find a way back to an earlier node.', logicTone: 'info',
      tag: 'DISCOVER', note: `disc[${u}] = low[${u}] = ${disc[u]}`,
      javaLines: [12], pyLines: [9], algoStep: 0,
    });
    for (const { to: v, ei } of adj[u]) {
      cur = u;
      if (v === parent) continue; // the edge we arrived by is not a way around itself
      if (disc[v] === -1) {
        eState[ei] = 'active';
        push({
          title: `Tree edge ${u} → ${v}`, desc: `${v} has not been discovered, so walk down to it and recurse.`,
          logic: 'Tree edges form the DFS tree; every other edge will turn out to be a back edge to an ancestor.', logicTone: 'info',
          tag: 'TREE EDGE', note: `disc[${v}] == −1 → dfs(${v}, parent = ${u})`,
          javaLines: [15, 16], pyLines: [13, 14], algoStep: 1,
        });
        dfs(v, u);
        cur = u;
        const old = low[u];
        low[u] = Math.min(low[u], low[v]);
        const isBridge = low[v] > disc[u];
        push({
          title: `Back in ${u}: low[${u}] = min(${old}, low[${v}]=${low[v]}) = ${low[u]}`, desc: `The child ${v} is finished. ${u} inherits whatever earlier node ${v}'s subtree can reach.`,
          logic: 'If a descendant can climb to an ancestor of u, then u is not cut off from it either.', logicTone: 'info',
          tag: 'RETURN', note: `low[${u}] = min(${old}, ${low[v]}) = ${low[u]}`,
          javaLines: [17], pyLines: [15], algoStep: 3,
        });
        if (isBridge) {
          bridges.push([u, v]);
          eState[ei] = 'error';
          push({
            title: `low[${v}] = ${low[v]} > disc[${u}] = ${disc[u]}: bridge ${u}–${v}`, desc: `Nothing in ${v}'s subtree can reach ${u} or anything discovered before it except through this very cable. Remove it and the network splits.`,
            logic: 'low[child] > disc[parent] means the subtree has no back edge that skips the tree edge, so the edge is a bridge.', logicTone: 'warn',
            tag: 'BRIDGE', alert: `Bridge ${u}–${v}: the subtree of ${v} cannot reach ${u} or above by any other edge.`, note: `low[${v}] = ${low[v]} > disc[${u}] = ${disc[u]} → bridges.add([${u}, ${v}])`,
            javaLines: [18], pyLines: [16, 17], algoStep: 4,
          });
        } else {
          eState[ei] = 'visited';
          push({
            title: `low[${v}] = ${low[v]} ≤ disc[${u}] = ${disc[u]}: not a bridge`, desc: `${v}'s subtree has a back edge reaching ${u} or higher, so edge ${u}–${v} lies on a cycle.`,
            logic: 'An edge on a cycle can be removed without disconnecting anything.', logicTone: 'success',
            tag: 'CHECK', note: `low[${v}] = ${low[v]} ≤ disc[${u}] = ${disc[u]} → on a cycle, keep`,
            javaLines: [18], pyLines: [16], algoStep: 4,
          });
        }
      } else {
        eState[ei] = 'active';
        const old = low[u];
        const lower = disc[v] < low[u];
        low[u] = Math.min(low[u], disc[v]);
        push({
          title: lower ? `Back edge ${u} – ${v}: low[${u}] = ${low[u]}` : `Edge ${u} – ${v} to an already-seen node`,
          desc: disc[v] > disc[u]
            ? `${v} is a descendant that already used this edge as its own back edge, so disc[${v}] = ${disc[v]} cannot lower low[${u}] = ${old}.`
            : lower
              ? `${v} was discovered at time ${disc[v]}, earlier than ${u}'s current low (${old}). ${u} can reach back to it, so low[${u}] drops to ${low[u]}.`
              : `${v} was discovered at time ${disc[v]}, which does not beat low[${u}] = ${old}. Nothing changes.`,
          logic: 'A visited non-parent neighbour is reached by a back edge; only its discovery time matters, not its low.', logicTone: lower ? 'success' : 'info',
          tag: 'BACK EDGE', note: `disc[${v}] = ${disc[v]}, low[${u}] = min(${old}, ${disc[v]}) = ${low[u]}`,
          javaLines: [19, 20], pyLines: [17, 18, 19], algoStep: 2,
        });
        eState[ei] = 'visited';
      }
    }
    stack.pop();
    done[u] = true;
    cur = parent === -1 ? null : parent;
  };
  dfs(0, -1);
  cur = null;
  const ans = [...bridges].sort((a, b) => Math.min(a[0], a[1]) - Math.min(b[0], b[1]) || Math.max(a[0], a[1]) - Math.max(b[0], b[1]));
  push({
    title: ans.length ? `${ans.length} bridge${ans.length === 1 ? '' : 's'}` : 'No bridges',
    desc: ans.length ? `Critical connections: ${ans.map(([a, b]) => `${a}–${b}`).join(', ')} (red).` : 'Every cable lies on a cycle, so no single failure splits the network.',
    logic: 'Every edge was classified once: a tree edge is a bridge exactly when low[child] > disc[parent]; back edges are never bridges.', logicTone: ans.length ? 'warn' : 'success',
    tag: '✅ Done!', note: `return bridges = ${fmtPairs(ans)}`,
    javaLines: [8], pyLines: [20, 21], algoStep: 5,
    result: { title: fmtPairs(ans), text: ans.length ? 'Cables whose failure disconnects the network' : 'The network has no critical connection' },
  });
  return steps;
}

const mk = (n: number, s: string): GIn => ({ n, edges: mkEdges(s) });

export const criticalConnections: ProblemDef<GIn> = {
  slug: '1192-critical-connections-in-a-network',
  id: '1192', title: 'Critical Connections in a Network', difficulty: 'Hard', category: 'Graph', tag: 'Tarjan bridges',
  statement: 'n servers are joined by undirected cables so that every server can reach every other. A cable is critical if removing it would leave some servers unable to reach each other. Return all critical cables.',
  constraints: '2 ≤ n ≤ 10⁵, no repeated cables (animation input: 2–9 servers, ≤ 14 cables, connected; write "n" then edges like 0-1 1-2)',
  examples: [
    { label: '4 | 0-1 1-2 2-0 1-3', input: mk(4, '0-1 1-2 2-0 1-3'), output: '[[1,3]]' },
    { label: '6 | 0-1 1-2 2-0 1-3 3-4 4-5 5-3', input: mk(6, '0-1 1-2 2-0 1-3 3-4 4-5 5-3'), output: '[[1,3]]' },
    { label: '5 | 0-1 1-2 2-3 3-4', input: mk(5, '0-1 1-2 2-3 3-4'), output: '[[0,1],[1,2],[2,3],[3,4]]' },
  ],
  inputPlaceholder: 'e.g. 4 0-1 1-2 2-0 1-3   (n, then edges; network must be connected)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current node u', state: 'active' }, { label: 'On the DFS path', state: 'compare' }, { label: 'Finished', state: 'found' }],
  varLabels: ['node', 'disc[node]', 'low[node]', 'bridges'],
  approach: {
    title: 'Tarjan low-link DFS',
    text: 'Run one DFS and stamp every node with its discovery time disc. low[u] is the smallest disc reachable from u\'s subtree using at most one back edge. After a child v returns, set low[u] = min(low[u], low[v]); a back edge to an already-seen non-parent node w sets low[u] = min(low[u], disc[w]). The tree edge u–v is a bridge exactly when low[v] > disc[u]: the subtree below v cannot get around the edge.',
  },
  java: [
    'private int timer = 0;',
    'private List<List<Integer>> bridges = new ArrayList<>();',
    '',
    'public List<List<Integer>> criticalConnections(int n, List<List<Integer>> connections) {',
    '    List<Integer>[] adj = buildAdjacency(n, connections);',
    '    int[] disc = new int[n], low = new int[n];',
    '    Arrays.fill(disc, -1);',
    '    dfs(0, -1, adj, disc, low);',
    '    return bridges;',
    '}',
    '',
    'private void dfs(int u, int parent, List<Integer>[] adj, int[] disc, int[] low) {',
    '    disc[u] = low[u] = timer++;',
    '    for (int v : adj[u]) {',
    '        if (v == parent) continue;',
    '        if (disc[v] == -1) {                          // tree edge',
    '            dfs(v, u, adj, disc, low);',
    '            low[u] = Math.min(low[u], low[v]);',
    '            if (low[v] > disc[u]) bridges.add(List.of(u, v));   // no way around',
    '        } else {',
    '            low[u] = Math.min(low[u], disc[v]);       // back edge',
    '        }',
    '    }',
    '}',
  ],
  python: [
    'def critical_connections(n, connections):',
    '    adj = [[] for _ in range(n)]',
    '    for a, b in connections:',
    '        adj[a].append(b); adj[b].append(a)',
    '    disc = [-1] * n',
    '    low = [0] * n',
    '    bridges = []',
    '    timer = [0]',
    '    def dfs(u, parent):',
    '        disc[u] = low[u] = timer[0]; timer[0] += 1',
    '        for v in adj[u]:',
    '            if v == parent:',
    '                continue',
    '            if disc[v] == -1:                  # tree edge',
    '                dfs(v, u)',
    '                low[u] = min(low[u], low[v])',
    '                if low[v] > disc[u]:           # no way around',
    '                    bridges.append([u, v])',
    '            else:                              # back edge',
    '                low[u] = min(low[u], disc[v])',
    '    dfs(0, -1)',
    '    return bridges',
  ],
  phases: [
    { icon: '🔦', label: 'Discover: disc = low', tone: 'blue' },
    { icon: '🌳', label: 'Tree edge: recurse', tone: 'cyan' },
    { icon: '↩', label: 'Back edge: lower low', tone: 'gold' },
    { icon: '⬆', label: 'Child returns', tone: 'green' },
    { icon: '🔴', label: 'Bridge test', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['critical', 'removing', 'critical cables'],
  algorithm: [
    'Start a DFS at node 0; give each node disc = low = its discovery time',
    'Walk each unvisited neighbour as a tree edge and recurse into it',
    'A visited neighbour other than the parent is a back edge: low[u] = min(low[u], disc[v])',
    'When the child v returns, low[u] = min(low[u], low[v])',
    'If low[v] > disc[u], the edge u–v is a bridge; otherwise it lies on a cycle',
    'Return all bridges found',
  ],
  complexity: [{ label: 'Time', value: 'O(V + E)' }, { label: 'Space', value: 'O(V + E)' }],
  why: 'If low[v] ≤ disc[u], some node in v\'s subtree has an edge back to u or an ancestor of u, so the tree edge u–v sits on a cycle and removing it changes nothing. If low[v] > disc[u], every edge leaving v\'s subtree besides u–v stays inside it, since back edges only go to ancestors and all of them are below u. Then u–v is the only link and its removal disconnects the subtree. DFS visits each edge a constant number of times, so one pass finds every bridge.',
};
