import type { Aux, CellState, EdgeState, GraphEdgeVM, Pointer, ProblemDef, Step } from '../engine/types';
import { parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

/** Nodes 0..n-1, undirected edges, is there a path source -> destination? */
interface In { n: number; source: number; destination: number; edges: EdgeIn[] }

function parse(raw: string): In {
  const toks = tokens(raw);
  if (toks.length < 3 || toks.slice(0, 3).some((t) => !/^\d+$/.test(t))) throw new Error('Write n, source, destination, then edges, e.g. 6 0 5 0-1 0-2 3-5 5-4 4-3');
  const [n, source, destination] = toks.slice(0, 3).map(Number);
  if (n < 2 || n > 8) throw new Error('Use between 2 and 8 nodes');
  if (source >= n || destination >= n) throw new Error(`source and destination must be between 0 and ${n - 1}`);
  const edges = parseEdges(toks.slice(3).join(' '), { lo: 0, hi: n - 1, max: 12, example: '0-1 0-2 3-5', allowEmpty: true });
  if (edges.some((e) => e.u === e.v)) throw new Error('An edge cannot connect a node to itself');
  const key = (e: EdgeIn) => `${Math.min(e.u, e.v)}-${Math.max(e.u, e.v)}`;
  if (new Set(edges.map(key)).size !== edges.length) throw new Error('Each pair of nodes may appear only once');
  return { n, source, destination, edges };
}

function build({ n, source, destination, edges }: In): Step[] {
  const adj: number[][] = Array.from({ length: n }, () => []); // edge indexes
  edges.forEach((e, i) => { adj[e.u].push(i); adj[e.v].push(i); });
  // neighbours stay in edge-list order, exactly like the Java adjacency lists (adj.get(u).add(v) per edge)
  const other = (i: number, u: number) => (edges[i].u === u ? edges[i].v : edges[i].u);
  const seen = new Array<boolean>(n).fill(false);
  const dist = new Array<number>(n).fill(0);
  const queue: number[] = [];
  const eState: EdgeState[] = edges.map(() => 'default');
  const steps: Step[] = [];
  let cur: number | null = null;
  let pathNodes: number[] = [];
  let result: string = '—';

  const scene = () => {
    const nodes = Array.from({ length: n }, (_, id) => {
      const state: CellState | undefined = pathNodes.includes(id) ? 'found' : id === cur ? 'active' : queue.includes(id) ? 'compare' : seen[id] ? 'swap' : undefined;
      return { id, state };
    });
    const ge = edges.map((e, i): GraphEdgeVM => ({ from: e.u, to: e.v, state: eState[i] }));
    const pointers: Pointer[] = [
      { id: 'src', label: 'src', index: source, tone: 'green' },
      { id: 'dst', label: 'dst', index: destination, tone: 'purple' },
    ];
    return { kind: 'graph' as const, nodes, edges: ge, pointers };
  };
  const aux = (): Aux[] => [
    { title: 'queue (BFS frontier)', kind: 'queue', items: queue.map(String) },
    { title: 'seen', kind: 'list', items: seen.map((s, i) => (s ? String(i) : '')).filter(Boolean) },
  ];
  const vars = () => ({ node: cur ?? '—', level: cur === null ? '—' : dist[cur], visited: seen.filter(Boolean).length, 'queue size': queue.length, answer: result });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });
  const q = () => `[${queue.join(', ')}]`;

  push({
    title: 'Start', tag: '🔍 SETUP —', desc: `Is there a route from ${source} to ${destination}? The ${edges.length} edges work in both directions, so each is listed under both ends.`,
    note: `adj built from ${edges.length} edges`,
    logic: 'Explore outward from the source, level by level (BFS). If we ever reach the destination there is a path; if the frontier dries up first, there is none.', logicTone: 'info',
    javaLines: [1], pyLines: [1, 2, 3, 4], algoStep: 0,
  });
  seen[source] = true;
  dist[source] = 0;
  queue.push(source);
  push({
    title: `Queue the source ${source}`, tag: '📥 ENQUEUE —', desc: `Mark ${source} as seen and put it in the queue: q = ${q()}, level 0.`,
    note: `queue.add(${source}); seen[${source}] = true`,
    logic: 'Marking nodes as seen when they are queued guarantees each node is processed once.', logicTone: 'info',
    javaLines: [9, 10], pyLines: [5, 6], algoStep: 1,
  });

  let found = false;
  while (queue.length) {
    const u = queue.shift()!;
    cur = u;
    if (u === destination) {
      found = true;
      pathNodes = [u];
      push({
        title: `Pop ${u}: it is the destination`, tag: '🎯 FOUND —', desc: `Popped ${u}, which is the destination ${destination}: a route from ${source} exists, ${dist[u]} edge${dist[u] === 1 ? '' : 's'} long.`,
        note: `u = ${u}; u == destination → return true`,
        logic: 'Reaching the target proves a path exists; no need to look further.', logicTone: 'success',
        javaLines: [13], pyLines: [9, 10], algoStep: 3,
      });
      break;
    }
    push({
      title: `Pop ${u}`, tag: '⚙️ POP —', desc: `Pop ${u} (level ${dist[u]}). It is not ${destination}; check its ${adj[u].length} neighbour${adj[u].length === 1 ? '' : 's'}.`,
      note: `u = ${u}; q = ${q()}`,
      logic: 'Everything still in the queue is waiting to be explored.', logicTone: 'info',
      javaLines: [12], pyLines: [8], algoStep: 2,
    });
    for (const ei of adj[u]) {
      const v = other(ei, u);
      if (seen[v]) {
        eState[ei] = eState[ei] === 'default' ? 'dim' : eState[ei];
        push({
          title: `${v} already seen`, tag: '⏭ SKIP —', desc: `Edge ${u}–${v} leads to ${v}, which is already seen, so it is not queued again.`,
          note: `seen[${v}] is true → skip`,
          alert: `${v} was already visited or queued: skipped, so a cycle cannot loop forever.`,
          logic: 'Skipping seen nodes prevents infinite loops in graphs with cycles.', logicTone: 'info',
          javaLines: [15], pyLines: [12], algoStep: 2,
        });
      } else {
        seen[v] = true;
        dist[v] = dist[u] + 1;
        queue.push(v);
        eState[ei] = 'chosen';
        push({
          title: `Discover ${v} via ${u}–${v}`, tag: '📥 ENQUEUE —', desc: `${v} is new: mark it seen (level ${dist[v]}) and add it to the back of the queue: q = ${q()}.`,
          note: `seen[${v}] = true; queue.add(${v}) → q.size = ${queue.length}`,
          logic: 'New nodes join the back of the queue, so closer nodes are explored first.', logicTone: 'success',
          javaLines: [16, 17], pyLines: [12, 13, 14], algoStep: 2,
        });
      }
    }
    cur = null;
  }

  cur = found ? destination : null;
  result = String(found);
  steps.push({
    title: found ? 'Path exists' : 'No path', tag: found ? '✅ Done!' : '🚫 No path —',
    desc: found ? `${destination} is reachable from ${source}. Answer: true.` : `The queue is empty and ${destination} was never reached: ${source} and ${destination} are in different components. Answer: false.`,
    note: found ? 'return true' : 'queue empty → return false',
    alert: found ? undefined : `Queue exhausted after visiting ${seen.filter(Boolean).length} nodes: ${destination} lies in another component.`,
    scene: scene(), aux: aux(), vars: vars(),
    logic: found ? 'Return true.' : 'BFS explores the entire component of the source; the destination is not in it.', logicTone: found ? 'success' : 'warn',
    javaLines: found ? [13] : [21], pyLines: found ? [10] : [15], algoStep: 4,
    result: { title: String(found), text: found ? 'A path exists' : 'No path exists' },
  });
  return steps;
}

const mk = (n: number, source: number, destination: number, s: string): In => ({
  n, source, destination,
  edges: s ? s.split(' ').map((t) => { const [u, v] = t.split('-').map(Number); return { u, v }; }) : [],
});

export const validPath: ProblemDef<In> = {
  slug: '1971-find-if-path-exists-in-graph',
  id: '1971', title: 'Find if Path Exists in Graph', difficulty: 'Easy', category: 'Graph', tag: 'union-find / BFS',
  statement: 'There are n nodes numbered 0 to n-1 joined by bidirectional edges. Given a source and a destination node, return true if a path connects them.',
  constraints: '1 ≤ n ≤ 2·10⁵ (animation input: 2–8 nodes, ≤ 12 edges; write "n source destination" then edges like 0-1 0-2)',
  examples: [
    { label: '3 0 2 | 0-1 1-2 2-0', input: mk(3, 0, 2, '0-1 1-2 2-0'), output: 'true' },
    { label: '6 0 5 | 0-1 0-2 3-5 5-4 4-3', input: mk(6, 0, 5, '0-1 0-2 3-5 5-4 4-3'), output: 'false' },
    { label: '7 0 6 | 0-1 1-2 2-3 3-4 1-5 5-6', input: mk(7, 0, 6, '0-1 1-2 2-3 3-4 1-5 5-6'), output: 'true' },
  ],
  inputPlaceholder: 'e.g. 6 0 5 0-1 0-2 3-5 5-4 4-3   (n, source, destination, edges)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Being visited', state: 'active' }, { label: 'In queue', state: 'compare' }, { label: 'Done', state: 'swap' }, { label: 'Path found', state: 'found' }],
  varLabels: ['node', 'level', 'visited', 'queue size', 'answer'],
  emphasis: ['bidirectional', 'path'],
  phases: [
    { icon: '🔍', label: 'Build graph', tone: 'blue' },
    { icon: '📥', label: 'Enqueue source', tone: 'blue' },
    { icon: '⚙️', label: 'Pop and expand', tone: 'cyan' },
    { icon: '🎯', label: 'Destination?', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'BFS from the source',
    text: 'Build adjacency lists, then run a breadth-first search from the source with a seen set. Return true as soon as the destination comes off the queue; return false if the queue empties first. (Union-find, which merges the two ends of every edge into one group, answers the same question.)',
  },
  java: [
    'public boolean validPath(int n, int[][] edges, int source, int destination) {',
    '    List<List<Integer>> adj = new ArrayList<>();',
    '    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());',
    '    for (int[] e : edges) {',
    '        adj.get(e[0]).add(e[1]);',
    '        adj.get(e[1]).add(e[0]);',
    '    }',
    '    boolean[] seen = new boolean[n];',
    '    Deque<Integer> queue = new ArrayDeque<>();',
    '    queue.add(source);',
    '    seen[source] = true;',
    '    while (!queue.isEmpty()) {',
    '        int u = queue.poll();',
    '        if (u == destination) return true;',
    '        for (int v : adj.get(u)) {',
    '            if (!seen[v]) {',
    '                seen[v] = true;',
    '                queue.add(v);',
    '            }',
    '        }',
    '    }',
    '    return false;',
    '}',
  ],
  python: [
    'def valid_path(n, edges, source, destination):',
    '    adj = [[] for _ in range(n)]',
    '    for a, b in edges:',
    '        adj[a].append(b)',
    '        adj[b].append(a)',
    '    seen = {source}',
    '    queue = deque([source])',
    '    while queue:',
    '        u = queue.popleft()',
    '        if u == destination:',
    '            return True',
    '        for v in adj[u]:',
    '            if v not in seen:',
    '                seen.add(v)',
    '                queue.append(v)',
    '    return False',
  ],
  algorithm: [
    'Build an adjacency list; edges go both ways',
    'Put the source in the queue and mark it seen',
    'Pop a node and add every unseen neighbour to the queue, skipping seen ones',
    'If the destination is popped return true',
    'If the queue empties first return false',
  ],
  complexity: [{ label: 'Time', value: 'O(V + E)' }, { label: 'Space', value: 'O(V + E)' }],
  why: 'BFS visits exactly the nodes connected to the source: every node it queues is joined to an already-visited node by an edge, and every neighbour of a visited node gets queued. So the destination is dequeued if and only if some path leads to it. The seen set makes each node and edge handled once.',
};
