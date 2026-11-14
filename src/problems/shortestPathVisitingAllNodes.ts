import type { CellState, EdgeState, ProblemDef, Step } from '../engine/types.ts';
import { plural, verb } from './text.ts';
import { bin, find, gc, recorder, splitParts } from './dpAdvKit.ts';

interface In { n: number; edges: [number, number][] }

const java = [
  'public int shortestPathLength(int[][] graph) {',
  '    int n = graph.length, full = (1 << n) - 1;',
  '    boolean[][] seen = new boolean[1 << n][n];        // seen[mask][node]: visited set + where we stand',
  '    Deque<int[]> queue = new ArrayDeque<>();           // entries {mask, node, dist}',
  '    for (int i = 0; i < n; i++) {',
  '        seen[1 << i][i] = true;',
  '        queue.add(new int[]{1 << i, i, 0});            // start at any node',
  '    }',
  '    while (!queue.isEmpty()) {',
  '        int[] cur = queue.poll();',
  '        int mask = cur[0], node = cur[1], dist = cur[2];',
  '        if (mask == full) return dist;                 // first time all nodes are visited',
  '        for (int next : graph[node]) {',
  '            int nextMask = mask | (1 << next);',
  '            if (seen[nextMask][next]) continue;',
  '            seen[nextMask][next] = true;',
  '            queue.add(new int[]{nextMask, next, dist + 1});',
  '        }',
  '    }',
  '    return -1;',
  '}',
];
const python = [
  'def shortest_path_length(graph):',
  '    n = len(graph)',
  '    full = (1 << n) - 1',
  '    seen = {(1 << i, i) for i in range(n)}              # (visited mask, current node)',
  '    queue = deque((1 << i, i, 0) for i in range(n))     # start at any node',
  '    while queue:',
  '        mask, node, dist = queue.popleft()',
  '        if mask == full:',
  '            return dist                                 # first time all nodes are visited',
  '        for nxt in graph[node]:',
  '            next_mask = mask | (1 << nxt)',
  '            if (next_mask, nxt) in seen:',
  '                continue',
  '            seen.add((next_mask, nxt))',
  '            queue.append((next_mask, nxt, dist + 1))',
  '    return -1',
];
const J = { init: find(java, 'boolean[][] seen', 'seen[1 << i][i] = true', 'queue.add(new int[]{1 << i'), pop: find(java, 'int[] cur = queue.poll()', 'int mask = cur[0]'), full: find(java, 'if (mask == full)'), nb: find(java, 'for (int next', 'int nextMask', 'if (seen[nextMask]'), push: find(java, 'seen[nextMask][next] = true', 'queue.add(new int[]{nextMask') };
const P = { init: find(python, 'seen = {', 'queue = deque'), pop: find(python, 'mask, node, dist = queue.popleft()'), full: find(python, 'if mask == full', 'return dist'), nb: find(python, 'for nxt in', 'next_mask =', 'if (next_mask, nxt) in seen'), push: find(python, 'seen.add', 'queue.append') };

function build({ n, edges }: In): Step[] {
  const full = (1 << n) - 1;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  adj.forEach((l) => l.sort((x, y) => x - y));
  const dist: (number | null)[][] = Array.from({ length: 1 << n }, () => Array(n).fill(null));
  const queue: [number, number, number][] = [];
  const steps: Step[] = [];
  let curS: [number, number, number] | null = null;
  let fresh: [number, number][] = [];
  let finished = false;
  let pops = 0;

  const snap = () => ({
    scene: {
      kind: 'split' as const,
      parts: [
        {
          kind: 'graph' as const, layout: 'circle' as const,
          nodes: Array.from({ length: n }, (_, id) => {
            let state: CellState | undefined;
            if (curS && curS[1] === id) state = 'active';
            else if (curS && curS[0] & (1 << id)) state = 'found';
            return { id, label: id, state };
          }),
          edges: edges.map(([a, b]): { from: number; to: number; state: EdgeState } => {
            const hot = curS && !finished && ((curS[1] === a && fresh.some(([m2, v]) => v === b && m2 >= 0)) || (curS[1] === b && fresh.some(([, v]) => v === a)));
            return { from: a, to: b, state: hot ? 'active' : 'default' };
          }),
        },
        {
          kind: 'grid' as const, variant: 'table' as const,
          rows: Array.from({ length: (1 << n) - 1 }, (_, r) => {
            const mask = r + 1;
            return Array.from({ length: n }, (_, v) => {
              if (!(mask & (1 << v))) return gc(`${mask},${v}`, '×', 'dim');
              const d = dist[mask][v];
              let s: CellState | undefined;
              if (curS && curS[0] === mask && curS[1] === v) s = finished ? 'found' : 'active';
              else if (fresh.some(([m2, v2]) => m2 === mask && v2 === v)) s = 'compare';
              else if (d === null) s = 'dim';
              return gc(`${mask},${v}`, d === null ? '·' : d, s);
            });
          }),
          rowHeads: Array.from({ length: (1 << n) - 1 }, (_, r) => bin(r + 1, n)), colHeads: Array.from({ length: n }, (_, v) => `at ${v}`),
        },
      ],
    },
    aux: [{ title: `BFS queue (${queue.length}), front first`, kind: 'queue' as const, items: queue.slice(0, 8).map(([m, v, d]) => `(${bin(m, n)}, ${v}, d${d})`).concat(queue.length > 8 ? ['…'] : []) }],
    vars: { mask: curS ? bin(curS[0], n) : '—', node: curS ? curS[1] : '—', dist: curS ? curS[2] : '—', popped: pops },
  });
  const say = recorder(steps, snap);

  say({
    title: 'State = (visited set, current node)', desc: `Nodes may be revisited, so a node alone is not a state. A state is a bitmask of nodes seen so far plus the node we stand on: ${plural(1 << n, 'mask')} × ${plural(n, 'node')}. Each walking step is one move, so BFS finds the fewest steps to the mask of all ${plural(n, 'node')} (${bin(full, n)}).`,
    logic: 'The bitmask is what makes the problem finite: revisiting a node with the SAME visited set is useless, so each (mask, node) pair is explored once.',
    java: J.init, py: P.init, algo: 0, tag: 'STATE —', note: `${plural(1 << n, 'mask')} × ${plural(n, 'node')}, target mask = ${bin(full, n)}`,
  });
  for (let i = 0; i < n; i++) {
    dist[1 << i][i] = 0;
    queue.push([1 << i, i, 0]);
  }
  say({
    title: `Seed with every start node`, desc: `The walk may begin anywhere, so all ${plural(n, 'state')} (only node i visited, standing on i) ${verb(n, 'enters', 'enter')} the queue at distance 0.`,
    logic: 'A multi-source BFS: shortest over every possible starting node at once.', tone: 'info', java: J.init, py: P.init, algo: 1,
    tag: 'SEED —', note: `queue = ${plural(n, 'state')}, dist = 0 each`,
  });

  let answer = -1;
  while (queue.length) {
    const [mask, node, d] = queue.shift()!;
    pops++;
    curS = [mask, node, d];
    fresh = [];
    if (mask === full) {
      finished = true;
      answer = d;
      say({
        title: `Popped (${bin(mask, n)}, node ${node}) — all visited`, desc: `Every node is in the visited set after ${d} step${d === 1 ? '' : 's'}. BFS pops states in order of distance, so ${d} is the minimum.`,
        logic: 'The first state popped with a full mask is optimal because BFS never reaches a farther state before a nearer one.', tone: 'success', java: J.full, py: P.full, algo: 3,
        tag: '✅ Done!', note: `mask ${bin(mask, n)} == full ${bin(full, n)} → return ${d}`,
        result: { title: String(d), text: 'Fewest edges in a walk visiting every node' },
      });
      break;
    }
    const notes: string[] = [];
    for (const nx of adj[node]) {
      const nm = mask | (1 << nx);
      if (dist[nm][nx] !== null) {
        notes.push(`${nx}: already seen`);
        continue;
      }
      dist[nm][nx] = d + 1;
      queue.push([nm, nx, d + 1]);
      fresh.push([nm, nx]);
      notes.push(`${nx}: new (${bin(nm, n)}, d${d + 1})`);
    }
    say({
      title: `Pop (${bin(mask, n)}, node ${node}), dist ${d}`, desc: `Standing on ${node} with visited ${bin(mask, n)}. Neighbours: ${notes.join('; ') || 'none'}.`,
      logic: 'Each unseen (mask, neighbour) pair is stamped with distance + 1 and queued; seen pairs are skipped.', tone: fresh.length ? 'info' : 'warn', java: [...J.pop, ...J.nb, ...(fresh.length ? J.push : [])], py: [...P.pop, ...P.nb, ...(fresh.length ? P.push : [])], algo: 2,
      tag: `POP d${d} —`, note: `(${bin(mask, n)}, ${node}): ${fresh.length} new of ${adj[node].length} neighbour state${adj[node].length === 1 ? '' : 's'}, queue = ${queue.length}`,
    });
  }
  void answer;
  return steps;
}

const parseEdges = (raw: string): In => {
  const [a, b] = splitParts(raw, 2, 'n ; edges — e.g. 4 ; 0-1 0-2 0-3   (use "none" for no edges)');
  const n = Number(a);
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error('The number of nodes must be a whole number from 1 to 5');
  const edges: [number, number][] = [];
  if (!/^(none|-)$/i.test(b)) {
    for (const tok of b.split(/[\s,]+/).filter(Boolean)) {
      const m = /^(\d+)-(\d+)$/.exec(tok);
      if (!m) throw new Error(`Write each edge as a-b, e.g. 0-1 (got "${tok}")`);
      const x = Number(m[1]);
      const y = Number(m[2]);
      if (x >= n || y >= n || x === y) throw new Error(`Edge ${tok} must join two different nodes between 0 and ${n - 1}`);
      if (!edges.some(([p, q]) => (p === x && q === y) || (p === y && q === x))) edges.push([x, y]);
    }
  }
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const u = stack.pop()!;
    for (const [p, q] of edges) {
      const w = p === u ? q : q === u ? p : -1;
      if (w >= 0 && !seen.has(w)) {
        seen.add(w);
        stack.push(w);
      }
    }
  }
  if (seen.size !== n) throw new Error('The graph must be connected so that one walk can visit every node');
  return { n, edges };
};

export const shortestPathVisitingAllNodes: ProblemDef<In> = {
  slug: '847-shortest-path-visiting-all-nodes',
  id: '847', title: 'Shortest Path Visiting All Nodes', difficulty: 'Hard', category: 'Dynamic Programming', tag: 'bitmask BFS',
  statement: 'Given a connected undirected graph with n nodes, find the length of the shortest walk (counted in edges) that visits every node. The walk may start and end anywhere and may reuse nodes and edges.',
  constraints: '1 ≤ n ≤ 12 (animation input: n ≤ 5)',
  examples: [
    { label: 'star: 0 is the hub', input: { n: 4, edges: [[0, 1], [0, 2], [0, 3]] }, output: '4' },
    { label: 'path 0-1-2-3', input: { n: 4, edges: [[0, 1], [1, 2], [2, 3]] }, output: '3' },
    { label: 'triangle plus tail', input: { n: 4, edges: [[0, 1], [1, 2], [0, 2], [2, 3]] }, output: '3' },
  ],
  inputPlaceholder: 'n ; edges, e.g. 4 ; 0-1 0-2 0-3',
  parseInput: (raw) => {
    const inp = parseEdges(raw);
    if (build(inp).length > 400) throw new Error('That graph needs more than 400 animation steps. Try fewer nodes.');
    return inp;
  },
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'State being expanded', state: 'active' }, { label: 'Newly queued state / visited node', state: 'compare' }, { label: 'Goal state', state: 'found' }, { label: 'Not reached', state: 'dim' }],
  varLabels: ['mask', 'node', 'dist', 'popped'],
  emphasis: ['shortest walk', 'visits every node', 'reuse nodes and edges'],
  phases: [
    { icon: '🧮', label: 'State = (mask, node)', tone: 'blue' },
    { icon: '🌱', label: 'Seed every start node', tone: 'blue' },
    { icon: '📤', label: 'Pop a state, check the full mask', tone: 'cyan' },
    { icon: '✅', label: 'Full mask: done', tone: 'green' },
  ],
  approach: {
    title: 'BFS over (visited-set bitmask, current node)',
    text: 'A state is the set of nodes seen so far (a bitmask) plus the node you are on. From a state, moving along an edge adds the neighbour to the set. Start from every node at once and run BFS; the first state whose mask is all ones gives the shortest walk.',
  },
  java, python,
  algorithm: [
    'State = (mask of visited nodes, current node); n·2ⁿ states',
    'Seed the queue with (1<<i, i, 0) for every i',
    'Pop a state; if mask is full, return its distance',
    'Push each unseen (mask | 1<<next, next) with distance + 1',
  ],
  complexity: [{ label: 'Time', value: 'O(2ⁿ · n²)' }, { label: 'Space', value: 'O(2ⁿ · n)' }],
  why: 'The future of a walk depends only on which nodes have been seen and where it stands, so (mask, node) is a complete state; walking longer inside the same state never helps. Every move costs one edge, so BFS visits states in non-decreasing distance order, and the first full-mask state it pops is at the minimum distance. The bitmask turns an apparently exponential search over walks into 2ⁿ·n states.',
};
