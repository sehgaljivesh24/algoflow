import type { Aux, CellState, EdgeState, GraphEdgeVM, Pointer, ProblemDef, Step } from '../engine/types';
import { adjacency, mkEdges, parseGraph } from './p5dKit.ts';
import type { GIn } from './p5dKit.ts';

/** Undirected graph on nodes 0..n-1 (may be disconnected). Find every articulation point (cut vertex). */
function parse(raw: string): GIn {
  return parseGraph(raw, { base: 0, minN: 2, maxN: 9, maxE: 14, example: '5 0-1 1-2 2-0 1-3 3-4' });
}

function build({ n, edges }: GIn): Step[] {
  const adj = adjacency(n, edges, 0);
  const disc = new Array<number>(n).fill(-1);
  const low = new Array<number>(n).fill(0);
  const kids = new Array<number>(n).fill(0);
  const cut = new Array<boolean>(n).fill(false);
  const done = new Array<boolean>(n).fill(false);
  const eState: EdgeState[] = edges.map(() => 'default');
  const stack: string[] = [];
  const steps: Step[] = [];
  let cur: number | null = null;
  let timer = 0;

  const cuts = () => cut.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
  const scene = () => ({
    kind: 'graph' as const,
    nodes: Array.from({ length: n }, (_, id) => {
      const state: CellState | undefined = cut[id] ? 'error' : id === cur ? 'active' : done[id] ? 'found' : disc[id] >= 0 ? 'compare' : undefined;
      return { id, state, tag: disc[id] < 0 ? '–' : `${disc[id]}/${low[id]}` };
    }),
    edges: edges.map((e, i): GraphEdgeVM => ({ from: e.u, to: e.v, state: eState[i] })),
    pointers: cur === null ? [] : ([{ id: 'cur', label: 'u', index: cur, tone: 'blue' }] as Pointer[]),
  });
  const aux = (): Aux[] => [
    { title: 'DFS call stack (node, parent)', kind: 'stack', items: [...stack] },
    { title: 'articulation points so far', kind: 'list', items: cuts().map(String) },
  ];
  const vars = () => ({ node: cur ?? '—', 'disc[node]': cur === null ? '—' : disc[cur], 'low[node]': cur === null ? '—' : low[cur], 'children[node]': cur === null ? '—' : kids[cur] });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${n} nodes, ${edges.length} edges. An articulation point is a node whose removal (with its edges) leaves the rest of its component in pieces. Each node shows "disc/low".`,
    logic: 'Same disc/low bookkeeping as for bridges, but the test is about vertices: can the subtree below a child escape without going through u?', logicTone: 'info',
    tag: 'INIT —', note: `disc[0..${n - 1}] = −1, cut[] = false, timer = 0`,
    javaLines: [3, 4, 5], pyLines: [1, 2, 3, 4], algoStep: 0,
  });

  const dfs = (u: number, parent: number): void => {
    disc[u] = low[u] = timer++;
    cur = u;
    stack.push(`(${u}, ${parent === -1 ? 'none' : parent})`);
    push({
      title: `Discover ${u}: disc = low = ${disc[u]}${parent === -1 ? ' (DFS root)' : ''}`, desc: `Node ${u} is reached at time ${disc[u]}${parent === -1 ? ' and is the root of this DFS tree' : ` from ${parent}`}.`,
      logic: parent === -1 ? 'The root needs its own rule: it has no ancestors, so low-link cannot say anything about it.' : 'low starts at disc and shrinks when a way back to an earlier node is found.', logicTone: 'info',
      tag: 'DISCOVER', note: `disc[${u}] = low[${u}] = ${disc[u]}${parent === -1 ? ', root' : `, parent = ${parent}`}`,
      javaLines: [14, 15], pyLines: [6, 7], algoStep: 0,
    });
    for (const { to: v, ei } of adj[u]) {
      cur = u;
      if (v === parent) continue;
      if (disc[v] === -1) {
        kids[u]++;
        eState[ei] = 'active';
        push({
          title: `Tree edge ${u} → ${v} (child #${kids[u]} of ${u})`, desc: `${v} is new: descend into it. ${u} now has ${kids[u]} DFS child${kids[u] === 1 ? '' : 'ren'}.`,
          logic: 'The children counter matters only for the root of the DFS tree.', logicTone: 'info',
          tag: 'TREE EDGE', note: `children[${u}] = ${kids[u]}, dfs(${v}, parent = ${u})`,
          javaLines: [19, 20], pyLines: [12, 13], algoStep: 1,
        });
        dfs(v, u);
        cur = u;
        const old = low[u];
        low[u] = Math.min(low[u], low[v]);
        eState[ei] = 'visited';
        if (parent !== -1 && low[v] >= disc[u]) {
          cut[u] = true;
          push({
            title: `low[${v}] = ${low[v]} ≥ disc[${u}] = ${disc[u]}: ${u} is a cut vertex`, desc: `The subtree of ${v} cannot climb above ${u} (best it reaches is disc ${low[v]}). Remove ${u} and that subtree is cut off from ${u}'s ancestors.`,
            logic: 'For a non-root u, one child with low[child] ≥ disc[u] is enough. Note ≥, not >: reaching u itself still goes through u.', logicTone: 'warn',
            tag: 'CUT VERTEX', alert: `Node ${u} is an articulation point: the subtree of ${v} cannot climb above it.`, note: `low[${v}] = ${low[v]} ≥ disc[${u}] = ${disc[u]} → cut[${u}] = true`,
            javaLines: [21, 22], pyLines: [14, 15, 16], algoStep: 3,
          });
        } else {
          push({
            title: `Back in ${u}: low[${u}] = min(${old}, ${low[v]}) = ${low[u]}`,
            desc: parent === -1 ? `${u} is the DFS root, so only the child count decides (checked at the end).` : `low[${v}] = ${low[v]} < disc[${u}] = ${disc[u]}: ${v}'s subtree has a way around ${u}, so this child does not make ${u} a cut vertex.`,
            logic: 'The subtree can reach a node discovered before u without passing through u.', logicTone: 'success',
            tag: 'RETURN', note: parent === -1 ? `low[${u}] = min(${old}, ${low[v]}) = ${low[u]}; root: only children count` : `low[${u}] = min(${old}, ${low[v]}) = ${low[u]}; ${low[v]} < disc[${u}] = ${disc[u]} → not cut`,
            javaLines: [21, 22], pyLines: [14, 15, 16], algoStep: 3,
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
            ? `${v} is a descendant that already used this edge as its back edge; disc[${v}] = ${disc[v]} cannot lower low[${u}] = ${old}.`
            : lower ? `${v} was discovered at ${disc[v]}, before ${u}'s current low (${old}); ${u} can reach it, so low[${u}] = ${low[u]}.` : `disc[${v}] = ${disc[v]} does not beat low[${u}] = ${old}; nothing changes.`,
          logic: 'A visited non-parent neighbour gives a back edge; only its discovery time is used.', logicTone: lower ? 'success' : 'info',
          tag: 'BACK EDGE', note: `disc[${v}] = ${disc[v]}, low[${u}] = min(${old}, ${disc[v]}) = ${low[u]}`,
          javaLines: [23, 24], pyLines: [17, 18], algoStep: 2,
        });
        eState[ei] = 'visited';
      }
    }
    if (parent === -1) {
      if (kids[u] >= 2) {
        cut[u] = true;
        push({
          title: `Root ${u} has ${kids[u]} DFS children: cut vertex`, desc: `Each child's subtree is reachable only through the root (a DFS would otherwise have walked between them). Removing ${u} separates them.`,
          logic: 'A DFS root is an articulation point exactly when it has two or more DFS-tree children.', logicTone: 'warn',
          tag: 'ROOT RULE', alert: `Root ${u} has ${kids[u]} DFS children, so removing it separates their subtrees.`, note: `children = ${kids[u]} ≥ 2 → cut[${u}] = true`,
          javaLines: [27], pyLines: [19, 20], algoStep: 4,
        });
      } else {
        push({
          title: `Root ${u} has ${kids[u]} DFS child${kids[u] === 1 ? '' : 'ren'}: not a cut vertex`, desc: kids[u] ? `Everything else in this component hangs below one child, so removing the root leaves it connected.` : `${u} has no neighbours in this component, so there is nothing to disconnect.`,
          logic: 'With at most one child, the rest of the tree stays in one piece without the root.', logicTone: 'success',
          tag: 'ROOT RULE', note: `children = ${kids[u]} < 2 → root is not a cut vertex`,
          javaLines: [27], pyLines: [19, 20], algoStep: 4,
        });
      }
    }
    stack.pop();
    done[u] = true;
    cur = parent === -1 ? null : parent;
  };
  for (let s = 0; s < n; s++) {
    if (disc[s] !== -1) continue;
    if (s > 0) {
      cur = null;
      push({
        title: `Node ${s} not reached yet: new component`, desc: `The graph is disconnected; start a fresh DFS at ${s}.`,
        logic: 'Articulation points are computed per connected component.', logicTone: 'info',
        tag: 'NEW DFS', note: `disc[${s}] == −1 → dfs(${s}, −1)`,
        javaLines: [6, 7], pyLines: [21, 22, 23], algoStep: 0,
      });
    }
    dfs(s, -1);
  }
  cur = null;
  const ans = cuts();
  push({
    title: ans.length ? `Articulation point${ans.length === 1 ? '' : 's'}: ${ans.join(', ')}` : 'No articulation points',
    desc: ans.length ? `Removing any of ${ans.join(', ')} (red) disconnects part of the graph.` : 'No single node removal disconnects any component.',
    logic: 'Every node was tested once: roots by child count, other nodes by the low[child] ≥ disc[u] rule.', logicTone: ans.length ? 'warn' : 'success',
    tag: '✅ Done!', note: `return [${ans.join(', ')}]`,
    javaLines: [8, 9, 10], pyLines: [24], algoStep: 5,
    result: { title: `[${ans.join(',')}]`, text: ans.length ? 'Nodes whose removal disconnects the graph' : 'The graph has no cut vertex' },
  });
  return steps;
}

const mk = (n: number, s: string): GIn => ({ n, edges: mkEdges(s) });

export const articulationPoints: ProblemDef<GIn> = {
  slug: 'alg-articulation-points-cut-vertices',
  id: 'ALG', title: 'Articulation Points (Cut Vertices)', difficulty: 'Hard', category: 'Graph', tag: 'Tarjan low-link',
  statement: 'Given an undirected graph, list every articulation point: a node whose removal, together with its edges, increases the number of connected components.',
  constraints: 'Classic algorithm demo (animation input: 2–9 nodes, ≤ 14 edges, may be disconnected; write "n" then edges like 0-1 1-2)',
  examples: [
    { label: '5 | 0-1 1-2 2-0 1-3 3-4', input: mk(5, '0-1 1-2 2-0 1-3 3-4'), output: '[1,3]' },
    { label: '6 | 0-1 0-2 0-3 1-2 3-4 3-5', input: mk(6, '0-1 0-2 0-3 1-2 3-4 3-5'), output: '[0,3]' },
    { label: '5 | 0-1 1-2 2-3 3-4 4-0', input: mk(5, '0-1 1-2 2-3 3-4 4-0'), output: '[]' },
  ],
  inputPlaceholder: 'e.g. 5 0-1 1-2 2-0 1-3 3-4   (n, then edges)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current node u', state: 'active' }, { label: 'On the DFS path', state: 'compare' }, { label: 'Finished', state: 'found' }, { label: 'Articulation point', state: 'error' }],
  varLabels: ['node', 'disc[node]', 'low[node]', 'children[node]'],
  approach: {
    title: 'Low-link DFS, with a separate rule for the root',
    text: 'Compute disc and low exactly as for bridges. A non-root node u is an articulation point if some DFS child v has low[v] ≥ disc[u]: that child\'s subtree cannot reach anything above u. The DFS root has no ancestors, so it is an articulation point only if it has at least two DFS children. Run the DFS from every unvisited node to cover disconnected graphs.',
  },
  java: [
    'private int timer = 0;',
    '',
    'public List<Integer> articulationPoints(int n, List<Integer>[] adj) {',
    '    int[] disc = new int[n], low = new int[n];',
    '    boolean[] cut = new boolean[n];',
    '    Arrays.fill(disc, -1);',
    '    for (int s = 0; s < n; s++)',
    '        if (disc[s] == -1) dfs(s, -1, adj, disc, low, cut);',
    '    List<Integer> res = new ArrayList<>();',
    '    for (int i = 0; i < n; i++) if (cut[i]) res.add(i);',
    '    return res;',
    '}',
    '',
    'private void dfs(int u, int parent, List<Integer>[] adj, int[] disc, int[] low, boolean[] cut) {',
    '    disc[u] = low[u] = timer++;',
    '    int children = 0;',
    '    for (int v : adj[u]) {',
    '        if (v == parent) continue;',
    '        if (disc[v] == -1) {',
    '            children++;',
    '            dfs(v, u, adj, disc, low, cut);',
    '            low[u] = Math.min(low[u], low[v]);',
    '            if (parent != -1 && low[v] >= disc[u]) cut[u] = true;   // v cannot climb above u',
    '        } else {',
    '            low[u] = Math.min(low[u], disc[v]);',
    '        }',
    '    }',
    '    if (parent == -1 && children >= 2) cut[u] = true;                 // root rule',
    '}',
  ],
  python: [
    'def articulation_points(n, adj):',
    '    disc = [-1] * n',
    '    low = [0] * n',
    '    cut = set()',
    '    timer = [0]',
    '    def dfs(u, parent):',
    '        disc[u] = low[u] = timer[0]; timer[0] += 1',
    '        children = 0',
    '        for v in adj[u]:',
    '            if v == parent:',
    '                continue',
    '            if disc[v] == -1:',
    '                children += 1',
    '                dfs(v, u)',
    '                low[u] = min(low[u], low[v])',
    '                if parent != -1 and low[v] >= disc[u]:',
    '                    cut.add(u)                  # v cannot climb above u',
    '            else:',
    '                low[u] = min(low[u], disc[v])',
    '        if parent == -1 and children >= 2:',
    '            cut.add(u)                          # root rule',
    '    for s in range(n):',
    '        if disc[s] == -1:',
    '            dfs(s, -1)',
    '    return sorted(cut)',
  ],
  phases: [
    { icon: '🔦', label: 'Discover: disc = low', tone: 'blue' },
    { icon: '🌳', label: 'Tree edge, count children', tone: 'cyan' },
    { icon: '↩', label: 'Back edge: lower low', tone: 'gold' },
    { icon: '🔴', label: 'Child returns: cut test', tone: 'orange' },
    { icon: '👑', label: 'Root rule', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['articulation point', 'removal', 'connected components'],
  algorithm: [
    'Run a DFS from every unvisited node; set disc = low = discovery time',
    'Visit unvisited neighbours as tree edges, counting the children of u',
    'A visited non-parent neighbour is a back edge: low[u] = min(low[u], disc[v])',
    'After a child v returns: low[u] = min(low[u], low[v]); if u is not the root and low[v] ≥ disc[u], mark u',
    'If u is the DFS root and has two or more children, mark u',
    'Return the marked nodes in increasing order',
  ],
  complexity: [{ label: 'Time', value: 'O(V + E)' }, { label: 'Space', value: 'O(V)' }],
  why: 'In a DFS tree of an undirected graph every non-tree edge joins a node to one of its ancestors. So the subtree of a child v can only leave itself through a back edge to a proper ancestor of v. If low[v] < disc[u] some such edge skips past u; if low[v] ≥ disc[u] every escape lands on u itself, and deleting u strands the subtree. A root has no ancestors at all: its children\'s subtrees are never linked to each other, so with two or more of them the root is a separator, with one it is not.',
};
