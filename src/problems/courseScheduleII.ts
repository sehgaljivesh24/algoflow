import type { Aux, CellState, EdgeState, GraphEdgeVM, ProblemDef, Step } from '../engine/types';
import { parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

/** `n` courses numbered 0..n-1; edge u>v means "take u before v" (LeetCode's prerequisite [v, u]). */
interface In { n: number; edges: EdgeIn[] }

function parse(raw: string): In {
  const toks = tokens(raw);
  if (!toks.length || !/^\d+$/.test(toks[0])) throw new Error('Start with the number of courses, then prerequisite edges, e.g. 4 0>1 0>2 1>3 2>3');
  const n = Number(toks[0]);
  if (n < 1 || n > 8) throw new Error('Use between 1 and 8 courses');
  const edges = parseEdges(toks.slice(1).join(' '), { lo: 0, hi: n - 1, max: 14, example: '0>1 0>2 1>3', allowEmpty: true });
  if (edges.some((e) => e.u === e.v)) throw new Error('A course cannot be its own prerequisite');
  if (new Set(edges.map((e) => `${e.u}>${e.v}`)).size !== edges.length) throw new Error('Do not repeat an edge');
  return { n, edges };
}

function build({ n, edges }: In): Step[] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  const indeg = new Array<number>(n).fill(0);
  edges.forEach((e, i) => { adj[e.u].push(i); indeg[e.v]++; });
  const state: (CellState | undefined)[] = new Array(n).fill(undefined);
  const eState: EdgeState[] = edges.map(() => 'default');
  const queue: number[] = [];
  const order: number[] = [];
  const steps: Step[] = [];
  let cur: number | null = null;

  const scene = () => ({
    kind: 'graph' as const, layout: 'layered' as const,
    nodes: Array.from({ length: n }, (_, id) => ({ id, state: state[id], tag: state[id] === 'found' ? undefined : `in=${indeg[id]}` })),
    edges: edges.map((e, i): GraphEdgeVM => ({ from: e.u, to: e.v, directed: true, state: eState[i] })),
  });
  const aux = (): Aux[] => [
    { title: 'queue (in-degree 0)', kind: 'queue', items: queue.map(String) },
    { title: 'order so far', kind: 'list', items: order.map(String) },
  ];
  const vars = () => ({ course: cur ?? '—', 'in-degree': cur === null ? '—' : indeg[cur], 'queue size': queue.length, taken: order.length });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${n} courses, ${edges.length} prerequisites. Each node shows its in-degree: how many prerequisites are still unmet.`,
    logic: 'A course can be taken only when its in-degree is 0 — every prerequisite is already done.', logicTone: 'info',
    tag: 'INIT —', note: `indeg = [${indeg.join(', ')}] from ${edges.length} edges`,
    javaLines: [1, 2, 3, 4, 5, 6], pyLines: [1, 2, 3, 4, 5], algoStep: 0,
  });
  for (let i = 0; i < n; i++) if (indeg[i] === 0) { queue.push(i); state[i] = 'compare'; }
  push({
    title: queue.length ? `Queue the free courses: ${queue.join(', ')}` : 'No course has in-degree 0',
    desc: queue.length ? `Courses ${queue.join(', ')} have in-degree 0 and no prerequisites, so they can start right away.` : 'Every course waits for another one. Nothing can ever start.',
    logic: queue.length ? 'These are the sources of the graph; they go in the queue in numeric order.' : 'A graph with no source must contain a cycle.', logicTone: queue.length ? 'info' : 'warn',
    tag: 'SEED', note: `queue = [${queue.join(', ')}]`, alert: queue.length ? undefined : 'No course has in-degree 0: every course waits on another, so a cycle blocks everything.',
    javaLines: [8, 9, 10], pyLines: [6], algoStep: 1,
  });

  while (queue.length) {
    const u = queue.shift()!;
    cur = u;
    state[u] = 'active';
    order.push(u);
    push({
      title: `Take course ${u}`, desc: `Pop ${u} from the queue and append it to the order (${order.join(' → ')}).`,
      logic: 'Everything it depends on is already in the order, so placing it here is safe.', logicTone: 'success',
      tag: 'TAKE', note: `u = ${u}, order[${order.length - 1}] = ${u}`,
      javaLines: [13, 14, 15], pyLines: [8, 9, 10], algoStep: 2,
    });
    state[u] = 'found';
    for (const ei of adj[u]) {
      const v = edges[ei].v;
      indeg[v]--;
      eState[ei] = 'visited';
      const free = indeg[v] === 0;
      if (free) { queue.push(v); state[v] = 'compare'; }
      push({
        title: `Unlock ${u} → ${v}: in-degree ${indeg[v] + 1} → ${indeg[v]}`,
        desc: free ? `Course ${v} has no unmet prerequisites left, so it joins the queue.` : `Course ${v} still waits for ${indeg[v]} other course${indeg[v] === 1 ? '' : 's'}.`,
        logic: 'Finishing a course removes one prerequisite from each course that needed it.', logicTone: free ? 'success' : 'info',
        tag: 'UNLOCK', note: free ? `indeg[${v}] = ${indeg[v]} → queue.add(${v})` : `indeg[${v}] = ${indeg[v]} (still waiting)`,
        javaLines: [16, 17], pyLines: [11, 12, 13, 14], algoStep: 3,
      });
    }
    cur = null;
  }

  const ok = order.length === n;
  if (!ok) for (let i = 0; i < n; i++) if (state[i] === undefined) state[i] = 'error';
  push({
    title: ok ? 'Done: valid order' : 'Cycle detected',
    desc: ok ? `All ${n} courses were taken: ${order.join(' → ')}.` : `Only ${order.length} of ${n} courses could be taken; the red courses wait on each other in a cycle.`,
    logic: ok ? 'Taking every course proves no cycle exists.' : 'A cycle never reaches in-degree 0, so Kahn’s algorithm stalls. No valid order exists.', logicTone: ok ? 'success' : 'warn',
    tag: ok ? '✅ Done!' : '⚠ Stuck!', note: ok ? `order.length = ${n} → return [${order.join(', ')}]` : `count = ${order.length} < n = ${n} → return []`,
    alert: ok ? undefined : `Cycle: ${n - order.length} course${n - order.length === 1 ? '' : 's'} never reached in-degree 0, so no valid order exists.`,
    javaLines: [20], pyLines: [15], algoStep: 4,
    result: ok ? { title: `[${order.join(', ')}]`, text: 'A valid course order' } : { title: '[]', text: 'Impossible: the prerequisites contain a cycle' },
  });
  return steps;
}

const ex = (n: number, s: string): In => ({ n, edges: s ? s.split(' ').map((t) => ({ u: +t.split('>')[0], v: +t.split('>')[1] })) : [] });

export const courseScheduleII: ProblemDef<In> = {
  slug: '210-course-schedule-ii',
  id: '210', title: 'Course Schedule II', difficulty: 'Medium', category: 'Graph', tag: "Kahn's topological sort",
  statement: 'There are n courses numbered 0 to n-1 and a list of prerequisites. Return any order in which you can finish all the courses, or an empty array if the prerequisites form a cycle and it is impossible.',
  constraints: '1 ≤ n ≤ 2000 (animation input: up to 8 courses; write "n" followed by edges a>b meaning "take a before b")',
  examples: [
    { label: '4 | 0>1 0>2 1>3 2>3', input: ex(4, '0>1 0>2 1>3 2>3'), output: '[0, 1, 2, 3]' },
    { label: '4 | 0>1 1>2 2>1 2>3', input: ex(4, '0>1 1>2 2>1 2>3'), output: '[] (cycle 1 ⇄ 2)' },
    { label: '6 | 5>2 5>0 4>0 4>1 2>3 3>1', input: ex(6, '5>2 5>0 4>0 4>1 2>3 3>1'), output: '[4, 5, 2, 0, 3, 1]' },
  ],
  inputPlaceholder: 'e.g. 4 0>1 0>2 1>3 2>3   (n, then "a>b" = a before b)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Being taken', state: 'active' }, { label: 'In queue', state: 'compare' }, { label: 'In the order', state: 'found' }, { label: 'Stuck in a cycle', state: 'error' }],
  varLabels: ['course', 'in-degree', 'queue size', 'taken'],
  phases: [
    { icon: '🧮', label: 'Init: count in-degrees', tone: 'blue' },
    { icon: '🌱', label: 'Seed the queue', tone: 'cyan' },
    { icon: '📤', label: 'Take a course', tone: 'green' },
    { icon: '🔓', label: 'Unlock dependants', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['order', 'prerequisites', 'cycle'],
  approach: {
    title: "Kahn's algorithm: peel off courses with no prerequisites",
    text: 'Count each course’s incoming edges (in-degree). Queue every course at 0. Repeatedly take one from the queue, add it to the answer, and decrement the in-degree of the courses it unlocks, queueing any that reach 0. If the answer ends up with all n courses it is a valid order; otherwise a cycle blocked the rest.',
  },
  java: [
    'public int[] findOrder(int n, int[][] prerequisites) {',
    '    List<List<Integer>> adj = new ArrayList<>();',
    '    int[] indeg = new int[n];',
    '    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());',
    '    for (int[] p : prerequisites) {',
    '        adj.get(p[1]).add(p[0]);          // p[1] before p[0]',
    '        indeg[p[0]]++;',
    '    }',
    '    Deque<Integer> queue = new ArrayDeque<>();',
    '    for (int i = 0; i < n; i++)',
    '        if (indeg[i] == 0) queue.add(i);',
    '    int[] order = new int[n];',
    '    int count = 0;',
    '    while (!queue.isEmpty()) {',
    '        int u = queue.poll();',
    '        order[count++] = u;',
    '        for (int v : adj.get(u)) {',
    '            if (--indeg[v] == 0) queue.add(v);',
    '        }',
    '    }',
    '    return count == n ? order : new int[0];',
    '}',
  ],
  python: [
    'def find_order(n, prerequisites):',
    '    adj = [[] for _ in range(n)]',
    '    indeg = [0] * n',
    '    for a, b in prerequisites:          # b before a',
    '        adj[b].append(a)',
    '        indeg[a] += 1',
    '    queue = deque(i for i in range(n) if indeg[i] == 0)',
    '    order = []',
    '    while queue:',
    '        u = queue.popleft()',
    '        order.append(u)',
    '        for v in adj[u]:',
    '            indeg[v] -= 1',
    '            if indeg[v] == 0:',
    '                queue.append(v)',
    '    return order if len(order) == n else []',
  ],
  algorithm: [
    'Build adjacency lists and count the in-degree of every course',
    'Put every course with in-degree 0 into the queue',
    'Pop a course and append it to the order',
    'Decrement the in-degree of each course it unlocks; queue those that hit 0',
    'If the order holds all n courses return it, otherwise return [] (cycle)',
  ],
  complexity: [{ label: 'Time', value: 'O(V + E)' }, { label: 'Space', value: 'O(V + E)' }],
  why: 'A course enters the queue only after all of its prerequisites have been placed, so every prerequisite precedes it in the order. If a cycle exists, no course on it can ever reach in-degree 0 (each waits for another on the cycle), so fewer than n courses are emitted — which is exactly how impossibility is detected.',
};
