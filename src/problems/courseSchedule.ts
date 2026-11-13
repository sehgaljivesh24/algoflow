import type { Aux, CellState, EdgeState, GraphEdgeVM, ProblemDef, Step } from '../engine/types';
import { parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

/** `n` courses numbered 0..n-1; edge u>v means "take u before v" (LeetCode's prerequisite [v, u]). */
interface In { n: number; edges: EdgeIn[] }

function parse(raw: string): In {
  const toks = tokens(raw);
  if (!toks.length || !/^\d+$/.test(toks[0])) throw new Error('Start with the number of courses, then prerequisite edges, e.g. 4 0>1 1>2 2>3');
  const n = Number(toks[0]);
  if (n < 1 || n > 8) throw new Error('Use between 1 and 8 courses');
  const edges = parseEdges(toks.slice(1).join(' '), { lo: 0, hi: n - 1, max: 14, example: '0>1 1>2 2>3', allowEmpty: true });
  if (edges.some((e) => e.u === e.v)) throw new Error('A course cannot be its own prerequisite');
  if (new Set(edges.map((e) => `${e.u}>${e.v}`)).size !== edges.length) throw new Error('Do not repeat an edge');
  return { n, edges };
}

function build({ n, edges }: In): Step[] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  edges.forEach((e, i) => adj[e.u].push(i));
  const color = new Array<0 | 1 | 2>(n).fill(0); // 0 new, 1 on the stack, 2 finished
  const eState: EdgeState[] = edges.map(() => 'default');
  const stack: number[] = [];
  const steps: Step[] = [];
  let cur: number | null = null;
  let cycleNodes: number[] = [];
  let result: string = '—';

  const scene = () => ({
    kind: 'graph' as const, layout: 'layered' as const,
    nodes: Array.from({ length: n }, (_, id) => {
      const state: CellState | undefined = cycleNodes.includes(id) ? 'error' : id === cur ? 'active' : color[id] === 1 ? 'compare' : color[id] === 2 ? 'found' : undefined;
      return { id, state, tag: color[id] === 1 ? 'on stack' : color[id] === 2 ? 'done' : undefined };
    }),
    edges: edges.map((e, i): GraphEdgeVM => ({ from: e.u, to: e.v, directed: true, state: eState[i] })),
  });
  const aux = (): Aux[] => [{ title: 'recursion stack (current DFS path)', kind: 'stack', items: stack.map((u) => `dfs(${u})`) }];
  const vars = () => ({ course: cur ?? '—', 'on stack': stack.length, 'can finish': result });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${n} courses, ${edges.length} prerequisites. All finished only if the prerequisite graph has no cycle.`,
    logic: 'A cycle (A needs B needs A…) can never be satisfied. DFS finds one when it meets a node that is still on the current path.', logicTone: 'info',
    tag: 'INIT —', note: `state[0..${n - 1}] = 0 (new), ${edges.length} edges`,
    javaLines: [1, 2, 3, 4], pyLines: [1, 2, 3, 4], algoStep: 0,
  });

  let cyc = false;
  const dfs = (u: number): boolean => {
    color[u] = 1;
    stack.push(u);
    cur = u;
    push({
      title: `Enter course ${u}`, desc: `Mark ${u} as on the current path (yellow) and look at the courses it unlocks.`,
      logic: '"On the stack" means we are still exploring beneath this course.', logicTone: 'info',
      tag: 'ENTER', note: `state[${u}] = 1 (on path), stack = [${stack.join(', ')}]`,
      javaLines: [11], pyLines: [6], algoStep: 1,
    });
    for (const ei of adj[u]) {
      const v = edges[ei].v;
      cur = u;
      if (color[v] === 1) {
        eState[ei] = 'error';
        cycleNodes = stack.slice(stack.indexOf(v));
        cyc = true;
        push({
          title: `Back edge ${u} → ${v}: cycle!`, desc: `${v} is already on the current path, so ${v} → … → ${u} → ${v} is a loop (red).`,
          logic: 'An edge to a node still on the stack closes a cycle; the courses on it wait for each other forever.', logicTone: 'warn',
          tag: 'CYCLE', alert: `Back edge ${u}→${v}: course ${v} is still on the current path, so the prerequisites loop.`, note: `state[${v}] == 1 → return true (cycle)`,
          javaLines: [13], pyLines: [8, 9], algoStep: 2,
        });
        return true;
      }
      if (color[v] === 2) {
        eState[ei] = 'visited';
        push({
          title: `${v} already finished`, desc: `Everything below ${v} was explored without finding a cycle, so edge ${u} → ${v} is safe.`,
          logic: 'Finished nodes are known cycle-free; skipping them keeps the search linear.', logicTone: 'info',
          tag: 'SKIP', alert: `Course ${v} is already finished, so edge ${u}→${v} cannot be on a cycle.`, note: `state[${v}] == 2 → skip`,
          javaLines: [14], pyLines: [10], algoStep: 2,
        });
        continue;
      }
      eState[ei] = 'active';
      push({
        title: `Explore ${u} → ${v}`, desc: `${v} has not been visited: go deeper.`,
        logic: 'Follow the edge and repeat the same check from the new course.', logicTone: 'info',
        tag: 'EXPLORE', note: `state[${v}] == 0 → hasCycle(${v})`,
        javaLines: [14], pyLines: [10, 11], algoStep: 2,
      });
      if (dfs(v)) return true;
      eState[ei] = 'visited';
    }
    color[u] = 2;
    stack.pop();
    cur = u;
    push({
      title: `Finish course ${u}`, desc: `No cycle below ${u}: mark it finished (green) and pop it off the path.`,
      logic: 'A course whose whole subtree is clean cannot be part of any cycle.', logicTone: 'success',
      tag: 'FINISH', note: `state[${u}] = 2 (done), stack = [${stack.join(', ')}]`,
      javaLines: [16, 17], pyLines: [12, 13], algoStep: 3,
    });
    cur = stack.length ? stack[stack.length - 1] : null;
    return false;
  };

  for (let i = 0; i < n && !cyc; i++) {
    if (color[i] === 0) {
      if (i > 0 || color.some((c) => c !== 0)) {
        cur = i;
        push({
          title: `Start a new DFS at ${i}`, desc: `Course ${i} was not reached from earlier starts, so begin there.`,
          logic: 'The graph may be disconnected; every course needs to be checked.', logicTone: 'info',
          tag: 'NEW START', note: `i = ${i}, state[${i}] == 0 → hasCycle(${i})`,
          javaLines: [5, 6], pyLines: [14], algoStep: 1,
        });
      }
      dfs(i);
    }
  }

  const ok = !cyc;
  result = String(ok);
  cur = null;
  steps.push({
    title: ok ? 'No cycle: can finish' : 'Cycle found: cannot finish', desc: ok ? 'Every course was explored without meeting a node on its own path.' : 'The prerequisites contain a cycle, so some courses can never be started.',
    scene: scene(), aux: aux(), vars: vars(),
    logic: ok ? 'Acyclic prerequisites always admit a valid order.' : 'A cycle makes a valid order impossible.', logicTone: ok ? 'success' : 'warn',
    tag: ok ? '✅ Done!' : '⚠ Cycle!', note: ok ? 'no back edge found → return true' : 'back edge found → return false',
    alert: ok ? undefined : 'The prerequisites contain a cycle: some courses can never be started.',
    javaLines: ok ? [7] : [6], pyLines: [14], algoStep: 4,
    result: { title: String(ok), text: ok ? 'All courses can be finished' : 'Impossible: prerequisites contain a cycle' },
  });
  return steps;
}

const ex = (n: number, s: string): In => ({ n, edges: s ? s.split(' ').map((t) => ({ u: +t.split('>')[0], v: +t.split('>')[1] })) : [] });

export const courseSchedule: ProblemDef<In> = {
  slug: '207-course-schedule',
  id: '207', title: 'Course Schedule', difficulty: 'Medium', category: 'Graph', tag: 'cycle detection DFS',
  statement: 'There are n courses numbered 0 to n-1 and a list of prerequisite pairs. Return true if it is possible to finish every course, that is, if the prerequisites contain no cycle.',
  constraints: '1 ≤ n ≤ 2000 (animation input: up to 8 courses; write "n" followed by edges a>b meaning "take a before b")',
  examples: [
    { label: '4 | 0>1 1>2 2>3', input: ex(4, '0>1 1>2 2>3'), output: 'true' },
    { label: '3 | 0>1 1>2 2>0', input: ex(3, '0>1 1>2 2>0'), output: 'false' },
    { label: '5 | 0>1 0>2 1>3 2>3 3>4', input: ex(5, '0>1 0>2 1>3 2>3 3>4'), output: 'true' },
  ],
  inputPlaceholder: 'e.g. 4 0>1 1>2 2>3   (n, then "a>b" = a before b)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current course', state: 'active' }, { label: 'On the DFS path', state: 'compare' }, { label: 'Finished, no cycle', state: 'found' }, { label: 'On a cycle', state: 'error' }],
  varLabels: ['course', 'on stack', 'can finish'],
  approach: {
    title: 'DFS with three colours',
    text: 'Colour each course: unvisited, on the current DFS path, or finished. From each unvisited course run a DFS. If an edge leads to a course that is still on the current path, there is a cycle and the answer is false. When a course’s neighbours are all done, mark it finished.',
  },
  java: [
    'public boolean canFinish(int n, int[][] prerequisites) {',
    '    List<List<Integer>> adj = new ArrayList<>();',
    '    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());',
    '    for (int[] p : prerequisites) adj.get(p[1]).add(p[0]);',
    '    int[] state = new int[n];          // 0 new, 1 on stack, 2 done',
    '    for (int i = 0; i < n; i++)',
    '        if (state[i] == 0 && hasCycle(adj, state, i)) return false;',
    '    return true;',
    '}',
    '',
    'private boolean hasCycle(List<List<Integer>> adj, int[] state, int u) {',
    '    state[u] = 1;',
    '    for (int v : adj.get(u)) {',
    '        if (state[v] == 1) return true;                   // back edge',
    '        if (state[v] == 0 && hasCycle(adj, state, v)) return true;',
    '    }',
    '    state[u] = 2;',
    '    return false;',
    '}',
  ],
  python: [
    'def can_finish(n, prerequisites):',
    '    adj = [[] for _ in range(n)]',
    '    for a, b in prerequisites:',
    '        adj[b].append(a)',
    '    state = [0] * n                   # 0 new, 1 on stack, 2 done',
    '    def has_cycle(u):',
    '        state[u] = 1',
    '        for v in adj[u]:',
    '            if state[v] == 1:',
    '                return True           # back edge',
    '            if state[v] == 0 and has_cycle(v):',
    '                return True',
    '        state[u] = 2',
    '        return False',
    '    return not any(state[i] == 0 and has_cycle(i) for i in range(n))',
  ],
  algorithm: [
    'Build adjacency lists (prerequisite → course) and mark every course unvisited',
    'Start a DFS from each unvisited course; mark the current course "on the path"',
    'For each neighbour: on the path → cycle (return false); unvisited → recurse; finished → skip',
    'When all neighbours are handled mark the course finished',
    'If no back edge was found return true, otherwise return false',
  ],
  phases: [
    { icon: '🏗', label: 'Init: build graph', tone: 'blue' },
    { icon: '🚪', label: 'Enter: on the path', tone: 'cyan' },
    { icon: '🧭', label: 'Check neighbours', tone: 'green' },
    { icon: '🏁', label: 'Finish: mark done', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['cycle', 'prerequisites', 'finish every course'],
  complexity: [{ label: 'Time', value: 'O(V + E)' }, { label: 'Space', value: 'O(V + E)' }],
  why: 'In a DFS, an edge to a node that is still on the current path (a back edge) closes a loop, and every cycle contains such an edge, so reporting it is both sound and complete. Finished nodes can be skipped because everything reachable from them was already explored without a back edge. Each node and edge is touched once.',
};
