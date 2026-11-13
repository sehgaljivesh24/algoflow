import type { Aux, GraphEdgeVM, GraphNodeVM, ProblemDef, Step } from '../engine/types';
import { TONES, parseEdges } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

interface In { edges: EdgeIn[] }

function parse(raw: string): In {
  const edges = parseEdges(raw, { lo: 1, hi: 9, max: 9, example: '1-2 1-3 2-3' });
  const n = edges.length;
  if (edges.some((e) => e.u === e.v)) throw new Error('An edge cannot connect a node to itself');
  if (edges.some((e) => e.u > n || e.v > n)) throw new Error(`With ${n} edges the nodes must be numbered 1 to ${n}`);
  const key = (e: EdgeIn) => `${Math.min(e.u, e.v)}-${Math.max(e.u, e.v)}`;
  if (new Set(edges.map(key)).size !== n) throw new Error('Each pair of nodes may appear only once');
  // n nodes + n edges + connected  =>  exactly one cycle
  const p = Array.from({ length: n + 1 }, (_, i) => i);
  const find = (x: number): number => (p[x] === x ? x : (p[x] = find(p[x])));
  for (const e of edges) p[find(e.u)] = find(e.v);
  if (new Set(Array.from({ length: n }, (_, i) => find(i + 1))).size !== 1) {
    throw new Error(`The graph must be connected: nodes 1 to ${n} joined by ${n} edges (a tree plus one extra edge)`);
  }
  return { edges };
}

function build({ edges }: In): Step[] {
  const n = edges.length;
  const parent = Array.from({ length: n + 1 }, (_, i) => i);
  const steps: Step[] = [];
  const done: boolean[] = edges.map(() => false);
  let cur = -1;
  let rejected = -1;
  let hot: number | null = null; // parent entry that just changed
  let ra: number | string = '—';
  let rb: number | string = '—';
  let answer = '—';

  const rootOf = (x: number) => { while (parent[x] !== x) x = parent[x]; return x; };
  const minMember = (r: number) => { for (let i = 1; i <= n; i++) if (rootOf(i) === r) return i; return r; };
  const size = (r: number) => { let c = 0; for (let i = 1; i <= n; i++) if (rootOf(i) === r) c++; return c; };

  const scene = (focus: number[] = [], focusState: 'active' | 'error' = 'active') => {
    const nodes: GraphNodeVM[] = Array.from({ length: n }, (_, k) => {
      const id = k + 1;
      const r = rootOf(id);
      const tone = size(r) > 1 ? TONES[(minMember(r) - 1) % TONES.length] : undefined;
      return { id, tone, state: focus.includes(id) ? focusState : undefined, tag: parent[id] !== id ? `→${parent[id]}` : undefined };
    });
    const ge: GraphEdgeVM[] = edges.map((e, i) => ({
      from: e.u, to: e.v,
      state: i === rejected ? 'error' : i === cur ? 'active' : done[i] ? 'chosen' : 'dim',
    }));
    return { kind: 'graph' as const, nodes, edges: ge };
  };
  const aux = (): Aux[] => [{
    title: 'parent[ ]  (each node points toward its group leader)',
    kind: 'list', items: Array.from({ length: n }, (_, k) => `${k + 1}→${parent[k + 1]}`),
    highlight: hot === null ? undefined : hot - 1,
  }];
  const vars = () => ({ edge: cur >= 0 ? `${edges[cur].u}-${edges[cur].v}` : '—', 'root(u)': ra, 'root(v)': rb, answer });
  const push = (s: Omit<Step, 'vars' | 'aux'>) => steps.push({ ...s, aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${n} nodes, ${n} edges. Every node begins as its own group (parent[i] = i). All edges are faded: none has been added yet.`,
    scene: scene(),
    logic: 'A tree on n nodes has n−1 edges. This graph has n, so exactly one edge closes a cycle — we must find it.', logicTone: 'info',
    tag: 'INIT —', note: `parent[i] = i for i = 1..${n}, ${n} groups`,
    javaLines: [1, 2, 3], pyLines: [1, 2], algoStep: 0,
  });

  for (let i = 0; i < n; i++) {
    const { u, v } = edges[i];
    cur = i; hot = null; ra = '—'; rb = '—';
    push({
      title: `Look at edge ${u}-${v}`, desc: `Edge ${i + 1} of ${n}: does ${u} already reach ${v} through the edges added so far?`,
      scene: scene([u, v]),
      logic: 'Two nodes are already connected exactly when they have the same group leader (root).', logicTone: 'info',
      tag: 'EDGE', note: `edge ${i + 1}/${n} = (${u}, ${v})`,
      javaLines: [4], pyLines: [3], algoStep: 1,
    });
    const pathOf = (x: number) => { const out = [x]; while (parent[x] !== x) { x = parent[x]; out.push(x); } return out; };
    const pu = pathOf(u);
    const pv = pathOf(v);
    const find = (x: number): number => {
      while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
      return x;
    };
    const a = find(u);
    const b = find(v);
    ra = a; rb = b;
    const hops = pu.length + pv.length - 2;
    push({
      title: `find(${u}) = ${a}, find(${v}) = ${b}`,
      desc: `Climb parents: ${pu.join(' → ')} for ${u}, and ${pv.join(' → ')} for ${v}${hops > 1 ? '; path halving shortens the chains as we go' : ''}. Leaders ${a} and ${b}${a === b ? ' are equal.' : ' differ.'}`,
      scene: scene([u, v]),
      logic: a === b ? 'Same leader on both sides: they were already connected.' : 'Different leaders: the two nodes live in separate groups.', logicTone: a === b ? 'warn' : 'info',
      tag: 'FIND', note: `find(${u}) = ${a}, find(${v}) = ${b} → ${a === b ? 'same group' : 'different groups'}`,
      javaLines: [5, 13, 14, 15, 16, 18], pyLines: [4, 10, 11, 12, 13, 14], algoStep: 1,
    });
    if (a === b) {
      rejected = i;
      answer = `[${u}, ${v}]`;
      push({
        title: `Cycle! ${u}-${v} is redundant`, desc: `${u} and ${v} already share leader ${a}, so adding ${u}-${v} would close a loop. This is the redundant edge.`,
        scene: scene([u, v], 'error'),
        logic: 'The first edge whose endpoints are already connected is the one that creates the cycle.', logicTone: 'warn',
        tag: 'CYCLE', alert: `Edge ${u}-${v} joins two nodes that already share leader ${a}: it closes a cycle.`, note: `find(${u}) == find(${v}) == ${a} → candidate [${u}, ${v}]`,
        javaLines: [6], pyLines: [5, 6], algoStep: 3,
      });
      break;
    }
    parent[a] = b;
    hot = a;
    done[i] = true;
    cur = i;
    push({
      title: `Union: parent[${a}] = ${b}`, desc: `Different groups, so keep edge ${u}-${v} and hang leader ${a} under leader ${b}. The two groups become one colour.`,
      scene: scene([u, v]),
      logic: 'Merging groups never creates a cycle; it only connects two components.', logicTone: 'success',
      tag: 'UNION', note: `parent[${a}] = ${b}, ${edges.length - done.filter(Boolean).length} edges left`,
      javaLines: [7], pyLines: [7], algoStep: 2,
    });
    cur = -1;
  }

  cur = -1;
  push({
    title: 'Done', desc: `The redundant edge is ${answer}.`,
    scene: scene(),
    logic: `Remove ${answer} and the remaining ${n - 1} edges form a tree.`, logicTone: 'success',
    tag: '✅ Done!', note: `return ${answer}`,
    javaLines: [6], pyLines: [6], algoStep: 4,
    result: { title: answer, text: 'Redundant edge' },
  });
  return steps;
}

export const redundantConnection: ProblemDef<In> = {
  slug: '684-redundant-connection',
  id: '684', title: 'Redundant Connection', difficulty: 'Medium', category: 'Graph', tag: 'union-find',
  statement: 'A tree with n nodes (numbered 1 to n) had one extra edge added, leaving n edges. Return the edge that can be removed so the graph becomes a tree again. If several qualify, return the one that appears last in the input.',
  constraints: '3 ≤ n ≤ 1000, no repeated edges (animation input is limited to 9 nodes and edges, written like 1-2 1-3 2-3)',
  examples: [
    { label: '1-2 1-3 2-3', input: { edges: [{ u: 1, v: 2 }, { u: 1, v: 3 }, { u: 2, v: 3 }] }, output: '[2, 3]' },
    { label: '1-2 2-3 3-4 1-4 1-5', input: { edges: [[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]].map(([u, v]) => ({ u, v })) }, output: '[1, 4]' },
    { label: '1-2 2-3 3-1 3-4 5-4 5-6 6-7 7-8 8-9', input: { edges: [[1, 2], [2, 3], [3, 1], [3, 4], [5, 4], [5, 6], [6, 7], [7, 8], [8, 9]].map(([u, v]) => ({ u, v })) }, output: '[3, 1]' },
  ],
  inputPlaceholder: 'e.g. 1-2 1-3 2-3   (n nodes, n edges)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Edge / nodes being checked', state: 'active' }, { label: 'Cycle found', state: 'error' }],  varLabels: ['edge', 'root(u)', 'root(v)', 'answer'],
  approach: {
    title: 'Union-find: first edge that joins a group to itself',
    text: 'Keep a parent array where every group has a leader. For each edge, find the leaders of both endpoints. Different leaders: merge the groups. Same leader: the endpoints are already connected, so this edge closes a cycle and is the answer.',
  },
  java: [
    'public int[] findRedundantConnection(int[][] edges) {',
    '    int n = edges.length;',
    '    int[] parent = new int[n + 1];',
    '    for (int i = 1; i <= n; i++) parent[i] = i;',
    '    for (int[] e : edges) {',
    '        int a = find(parent, e[0]), b = find(parent, e[1]);',
    '        if (a == b) return e;          // already connected -> cycle',
    '        parent[a] = b;                 // union',
    '    }',
    '    return new int[0];',
    '}',
    '',
    '// follow parents up to the group leader (path halving)',
    'private int find(int[] parent, int x) {',
    '    while (parent[x] != x) {',
    '        parent[x] = parent[parent[x]];',
    '        x = parent[x];',
    '    }',
    '    return x;',
    '}',
  ],
  python: [
    'def find_redundant_connection(edges):',
    '    n = len(edges)',
    '    parent = list(range(n + 1))',
    '    for u, v in edges:',
    '        a, b = find(parent, u), find(parent, v)',
    '        if a == b:',
    '            return [u, v]          # already connected -> cycle',
    '        parent[a] = b              # union',
    '    return []',
    '',
    'def find(parent, x):',
    '    while parent[x] != x:',
    '        parent[x] = parent[parent[x]]   # path halving',
    '        x = parent[x]',
    '    return x',
  ],
  phases: [
    { icon: '🌱', label: 'Init: every node alone', tone: 'blue' },
    { icon: '🔍', label: 'Find both leaders', tone: 'cyan' },
    { icon: '🔗', label: 'Union (different leaders)', tone: 'green' },
    { icon: '⚠', label: 'Cycle (same leader)', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['redundant', 'extra edge', 'last'],
  algorithm: [
    'Start with every node as its own group: parent[i] = i',
    'For the next edge (u, v) compute find(u) and find(v)',
    'Different leaders: union the groups (parent[a] = b) and continue',
    'Equal leaders: this edge closes a cycle, so remember it',
    'Return the edge that closed the cycle',
  ],
  complexity: [{ label: 'Time', value: 'O(n · α(n)) ≈ O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Union-find keeps one leader per connected group, built only from edges accepted so far. An edge whose endpoints share a leader is connected by a path of earlier edges, so adding it forms a cycle. The graph has exactly one cycle, so the first such edge is the unique edge on that cycle that arrives last — and removing it leaves a tree.',
};
