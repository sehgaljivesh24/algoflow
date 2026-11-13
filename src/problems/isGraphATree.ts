import type { Aux, CellState, EdgeState, GraphEdgeVM, Pointer, ProblemDef, Step } from '../engine/types';
import { parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

/** Undirected graph on nodes 0..n-1. It is a tree when it is connected and has no cycle. */
interface In { n: number; edges: EdgeIn[] }

function parse(raw: string): In {
  const toks = tokens(raw);
  if (!toks.length || !/^\d+$/.test(toks[0])) throw new Error('Write n, then edges, e.g. 5 0-1 0-2 0-3 3-4');
  const n = Number(toks[0]);
  if (n < 1 || n > 8) throw new Error('Use between 1 and 8 nodes');
  const edges = parseEdges(toks.slice(1).join(' '), { lo: 0, hi: n - 1, max: 12, example: '0-1 0-2 0-3 3-4', allowEmpty: true });
  if (edges.some((e) => e.u === e.v)) throw new Error('An edge cannot connect a node to itself');
  const key = (e: EdgeIn) => `${Math.min(e.u, e.v)}-${Math.max(e.u, e.v)}`;
  if (new Set(edges.map(key)).size !== edges.length) throw new Error('Each pair of nodes may appear only once');
  return { n, edges };
}

function build({ n, edges }: In): Step[] {
  const adj: number[][] = Array.from({ length: n }, () => []); // edge indexes
  edges.forEach((e, i) => { adj[e.u].push(i); adj[e.v].push(i); });
  const other = (i: number, u: number) => (edges[i].u === u ? edges[i].v : edges[i].u);
  adj.forEach((l, u) => l.sort((a, b) => other(a, u) - other(b, u)));
  const seen = new Array<boolean>(n).fill(false);
  const eState: EdgeState[] = edges.map(() => 'default');
  const stack: string[] = [];
  const steps: Step[] = [];
  let cur: number | null = null;
  let bad: number[] = [];
  let missing: number[] = [];
  let result: string = '—';

  const scene = () => ({
    kind: 'graph' as const,
    nodes: Array.from({ length: n }, (_, id) => {
      const state: CellState | undefined = bad.includes(id) ? 'error' : missing.includes(id) ? 'error' : id === cur ? 'active' : seen[id] ? 'found' : undefined;
      return { id, state };
    }),
    edges: edges.map((e, i): GraphEdgeVM => ({ from: e.u, to: e.v, state: eState[i] })),
    pointers: cur === null ? [] : ([{ id: 'cur', label: 'cur', index: cur, tone: 'blue' }] as Pointer[]),
  });
  const aux = (): Aux[] => [
    { title: 'DFS call stack (node, parent)', kind: 'stack', items: [...stack] },
    { title: 'visited', kind: 'list', items: seen.map((s, i) => (s ? String(i) : '')).filter(Boolean) },
  ];
  const vars = () => ({ node: cur ?? '—', visited: seen.filter(Boolean).length, edges: edges.length, 'is tree': result });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${n} node${n === 1 ? '' : 's'} and ${edges.length} edge${edges.length === 1 ? '' : 's'}. A tree is connected AND has no cycle (so it has exactly n − 1 = ${n - 1} edges).`,
    logic: 'Two checks: (1) a DFS from node 0 must never meet an already-visited node other than the one it came from; (2) afterwards every node must be visited.', logicTone: 'info',
    tag: 'INIT —', note: `n = ${n}, edges = ${edges.length}, a tree needs ${n - 1}; seen[] = false`,
    javaLines: [1, 2], pyLines: [1], algoStep: 0,
  });

  let cyc = false;
  const dfs = (u: number, parent: number): boolean => {
    seen[u] = true;
    cur = u;
    stack.push(`(${u}, ${parent === -1 ? 'none' : parent})`);
    push({
      title: `Visit ${u}${parent === -1 ? ' (start)' : ` from ${parent}`}`, desc: `Mark ${u} visited. Its neighbours: ${adj[u].map((ei) => other(ei, u)).join(', ') || 'none'}.`,
      logic: 'Remember the parent: the edge back to it is the one we just walked along, not a cycle.', logicTone: 'info',
      tag: 'VISIT', note: `seen[${u}] = true, parent = ${parent === -1 ? 'none' : parent}`,
      javaLines: [8, 9], pyLines: [3, 4], algoStep: 1,
    });
    for (const ei of adj[u]) {
      const v = other(ei, u);
      cur = u;
      if (v === parent) continue;
      if (seen[v]) {
        eState[ei] = 'error';
        bad = [u, v];
        cyc = true;
        push({
          title: `${v} already visited: cycle`, desc: `Edge ${u}–${v} reaches a visited node that is not ${u}'s parent, so it closes a loop.`,
          logic: 'In a tree there is exactly one path between two nodes; reaching a visited node by a second route means a cycle.', logicTone: 'warn',
          tag: 'CYCLE', alert: `Edge ${u}–${v} reaches node ${v}, which is visited and is not ${u}'s parent: a cycle.`, note: `seen[${v}] = true and ${v} ≠ parent ${parent === -1 ? 'none' : parent} → return true`,
          javaLines: [12], pyLines: [7, 8], algoStep: 2,
        });
        return true;
      }
      eState[ei] = 'chosen';
      push({
        title: `Walk ${u} → ${v}`, desc: `${v} is new, so descend into it (remembering ${u} as its parent).`,
        logic: 'Edges walked so far form a tree.', logicTone: 'info',
        tag: 'WALK', note: `seen[${v}] = false → hasCycle(${v}, parent = ${u})`,
        javaLines: [13], pyLines: [7], algoStep: 1,
      });
      if (dfs(v, u)) return true;
    }
    stack.pop();
    cur = parent === -1 ? null : parent;
    return false;
  };
  dfs(0, -1);
  cur = null;

  if (cyc) {
    result = 'false';
    steps.push({
      title: 'Not a tree', desc: 'A cycle exists, so the graph cannot be a tree.',
      scene: scene(), aux: aux(), vars: vars(),
      logic: 'One cycle is enough to rule it out.', logicTone: 'warn',
      tag: '⚠ Not a tree!', alert: 'The DFS found a cycle, so the graph cannot be a tree.', note: 'hasCycle(0, -1) == true → return false',
      javaLines: [2], pyLines: [10, 11], algoStep: 3,
      result: { title: 'No', text: 'The graph has a cycle, so it is not a tree' },
    });
    return steps;
  }

  missing = seen.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
  const ok = missing.length === 0;
  result = String(ok);
  push({
    title: ok ? 'All nodes visited' : `${missing.length} node${missing.length === 1 ? '' : 's'} unreachable`,
    desc: ok ? `No cycle, and the DFS from 0 reached all ${n} nodes: connected.` : `No cycle, but ${missing.join(', ')} ${missing.length === 1 ? 'was' : 'were'} never reached (red): the graph is disconnected.`,
    logic: ok ? 'Connected and acyclic is exactly the definition of a tree.' : 'A tree must be connected, so unreachable nodes mean the answer is No.', logicTone: ok ? 'success' : 'warn',
    tag: ok ? '✅ Done!' : '⚠ Disconnected!', note: ok ? `visited ${n}/${n} nodes, no cycle → return true` : `visited ${n - missing.length}/${n} nodes → return false`,
    alert: ok ? undefined : `Node${missing.length === 1 ? '' : 's'} ${missing.join(', ')} never reached: the graph is disconnected.`,
    javaLines: [3, 4], pyLines: [12], algoStep: 3,
    result: { title: ok ? 'Yes' : 'No', text: ok ? 'The graph is a tree' : 'The graph is disconnected, so it is not a tree' },
  });
  return steps;
}

const mk = (n: number, s: string): In => ({ n, edges: s ? s.split(' ').map((t) => { const [u, v] = t.split('-').map(Number); return { u, v }; }) : [] });

export const isGraphATree: ProblemDef<In> = {
  slug: 'gfg-is-graph-a-tree',
  id: 'GFG', title: 'Is Graph a Tree?', difficulty: 'Medium', category: 'Graph', tag: 'DFS cycle + connected',
  statement: 'Given an undirected graph with n nodes and a list of edges, decide whether it is a tree: connected, with no cycles.',
  constraints: '1 ≤ n ≤ 10⁴ (animation input: 1–8 nodes, ≤ 12 edges; write "n" then edges like 0-1 0-2)',
  examples: [
    { label: '5 | 0-1 0-2 0-3 3-4', input: mk(5, '0-1 0-2 0-3 3-4'), output: 'Yes' },
    { label: '4 | 0-1 1-2 2-0 2-3', input: mk(4, '0-1 1-2 2-0 2-3'), output: 'No (cycle)' },
    { label: '5 | 0-1 1-2 3-4', input: mk(5, '0-1 1-2 3-4'), output: 'No (disconnected)' },
  ],
  inputPlaceholder: 'e.g. 5 0-1 0-2 0-3 3-4   (n, then edges)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Visiting', state: 'active' }, { label: 'Visited', state: 'found' }, { label: 'Cycle / unreachable', state: 'error' }],
  varLabels: ['node', 'visited', 'edges', 'is tree'],
  approach: {
    title: 'DFS: no cycle, and everything reached',
    text: 'Run a DFS from node 0, passing along the parent. Skip the edge back to the parent; if any other neighbour is already visited, there is a cycle. After the DFS, if some node was never visited the graph is disconnected. Only a graph that passes both checks is a tree.',
  },
  java: [
    'public boolean isTree(int n, List<List<Integer>> adj) {',
    '    boolean[] seen = new boolean[n];',
    '    if (hasCycle(adj, 0, -1, seen)) return false;',
    '    for (boolean s : seen)',
    '        if (!s) return false;              // not connected',
    '    return true;',
    '}',
    '',
    'private boolean hasCycle(List<List<Integer>> adj, int u, int parent, boolean[] seen) {',
    '    seen[u] = true;',
    '    for (int v : adj.get(u)) {',
    '        if (v == parent) continue;',
    '        if (seen[v]) return true;          // reached by a second route',
    '        if (hasCycle(adj, v, u, seen)) return true;',
    '    }',
    '    return false;',
    '}',
  ],
  python: [
    'def is_tree(n, adj):',
    '    seen = [False] * n',
    '    def has_cycle(u, parent):',
    '        seen[u] = True',
    '        for v in adj[u]:',
    '            if v == parent:',
    '                continue',
    '            if seen[v] or has_cycle(v, u):',
    '                return True',
    '        return False',
    '    if has_cycle(0, -1):',
    '        return False',
    '    return all(seen)',
  ],
  phases: [
    { icon: '🚀', label: 'Start at node 0', tone: 'blue' },
    { icon: '🧭', label: 'Visit and walk', tone: 'green' },
    { icon: '⚠', label: 'Cycle check', tone: 'orange' },
    { icon: '✅', label: 'Done: connected?', tone: 'green' },
  ],
  emphasis: ['tree', 'connected', 'no cycles'],
  algorithm: [
    'Start a DFS at node 0 with no parent',
    'Visit a node, then walk to each unvisited neighbour (remembering the parent)',
    'A visited neighbour that is not the parent means a cycle: answer No',
    'After the DFS, if any node is unvisited answer No; otherwise Yes',
  ],
  complexity: [{ label: 'Time', value: 'O(V + E)' }, { label: 'Space', value: 'O(V)' }],
  why: 'In an undirected graph a DFS meets an already-visited node (other than the parent) exactly when an edge closes a cycle. If no such edge exists the explored part is a tree, and if the DFS from node 0 also reaches every node then the whole graph is that tree. Connected plus acyclic is the definition of a tree, equivalent to being connected with n − 1 edges.',
};
