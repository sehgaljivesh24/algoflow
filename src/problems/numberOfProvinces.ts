import type { Aux, CellState, EdgeState, GraphEdgeVM, ProblemDef, Step } from '../engine/types';
import { plural } from './text.ts';
import { TONES, parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

/** `n` cities 0..n-1 and friendships u-v (the same information as LeetCode's isConnected matrix). */
interface In { n: number; edges: EdgeIn[] }

function parse(raw: string): In {
  const toks = tokens(raw);
  if (!toks.length || !/^\d+$/.test(toks[0])) throw new Error('Start with the number of cities, then links, e.g. 6 0-1 1-2 3-4');
  const n = Number(toks[0]);
  if (n < 1 || n > 9) throw new Error('Use between 1 and 9 cities');
  const edges = parseEdges(toks.slice(1).join(' '), { lo: 0, hi: n - 1, max: 14, example: '0-1 1-2 3-4', allowEmpty: true });
  if (edges.some((e) => e.u === e.v)) throw new Error('A city is always connected to itself; leave out self-links');
  const key = (e: EdgeIn) => `${Math.min(e.u, e.v)}-${Math.max(e.u, e.v)}`;
  if (new Set(edges.map(key)).size !== edges.length) throw new Error('Each pair of cities may be linked only once');
  return { n, edges };
}

function build({ n, edges }: In): Step[] {
  const adj: number[][] = Array.from({ length: n }, () => []); // edge indexes, neighbours in ascending order
  edges.forEach((e, i) => { adj[e.u].push(i); adj[e.v].push(i); });
  const other = (ei: number, u: number) => (edges[ei].u === u ? edges[ei].v : edges[ei].u);
  adj.forEach((list, u) => list.sort((a, b) => other(a, u) - other(b, u)));
  const prov = new Array<number>(n).fill(-1); // province index per visited node
  const eState: EdgeState[] = edges.map(() => 'default');
  const stack: number[] = [];
  const steps: Step[] = [];
  let count = 0;
  let cur: number | null = null;
  let curEdge = -1;

  const scene = () => ({
    kind: 'graph' as const,
    nodes: Array.from({ length: n }, (_, id) => {
      const state: CellState | undefined = id === cur ? 'active' : stack.includes(id) ? 'compare' : undefined;
      return { id, state, tone: prov[id] >= 0 ? TONES[prov[id] % TONES.length] : undefined, tag: prov[id] >= 0 ? `P${prov[id] + 1}` : undefined };
    }),
    edges: edges.map((e, i): GraphEdgeVM => ({ from: e.u, to: e.v, state: i === curEdge ? 'active' : eState[i] })),
  });
  const aux = (): Aux[] => [
    { title: 'DFS call stack (top = last)', kind: 'stack', items: stack.map((u) => `dfs(${u})`) },
    { title: 'visited', kind: 'list', items: Array.from({ length: n }, (_, i) => `${i}: ${prov[i] >= 0 ? 'P' + (prov[i] + 1) : '—'}`) },
  ];
  const vars = () => ({ provinces: count, city: cur ?? '—', 'stack depth': stack.length });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    title: 'Start', desc: `${plural(n, 'city', 'cities')} and ${plural(edges.length, 'direct link')}. A province is a group of cities that are linked directly or through others.`,
    logic: 'Counting provinces means counting connected components: every DFS launched from an unvisited city explores exactly one whole component.', logicTone: 'info',
    tag: 'INIT —', note: `visited[0..${n - 1}] = false, provinces = 0`,
    javaLines: [1, 2, 3], pyLines: [1, 2, 8], algoStep: 0,
  });

  const dfs = (u: number) => {
    prov[u] = count - 1;
    stack.push(u);
    cur = u;
    push({
      title: `dfs(${u}): visit city ${u}`, desc: `City ${u} joins province ${count}. It is pushed on the call stack (depth ${stack.length}).`,
      logic: 'Marking visited on entry guarantees a city is never expanded twice, even in a cycle.', logicTone: 'success',
      tag: 'VISIT', note: `visited[${u}] = true, depth ${stack.length}`,
      javaLines: [13], pyLines: [4], algoStep: 3,
    });
    for (const ei of adj[u]) {
      const v = other(ei, u);
      curEdge = ei;
      cur = u;
      if (prov[v] >= 0) {
        if (eState[ei] === 'default') eState[ei] = 'visited';
        push({
          title: `${u} – ${v}: already visited`, desc: `City ${v} belongs to province ${prov[v] + 1} already, so there is nothing new to explore along this link.`,
          logic: 'The visited check is what stops the DFS from walking around cycles forever.', logicTone: 'info',
          tag: 'SKIP', alert: `City ${v} is already visited (province ${prov[v] + 1}): skipping it avoids walking around a cycle.`, note: `visited[${v}] = true → skip`,
          javaLines: [14, 15], pyLines: [5, 6], algoStep: 3,
        });
      } else {
        eState[ei] = 'chosen';
        push({
          title: `${u} – ${v}: go deeper`, desc: `City ${v} has not been seen, so recurse into it.`,
          logic: 'Follow every unexplored link; the recursion unwinds only when all of a city’s neighbours are handled.', logicTone: 'info',
          tag: 'GO DEEPER', note: `visited[${v}] = false → dfs(${v})`,
          javaLines: [15, 16], pyLines: [6, 7], algoStep: 3,
        });
        dfs(v);
        curEdge = -1;
        cur = u;
        push({
          title: `Back at city ${u}`, desc: `dfs(${v}) returned, so everything reachable through ${v} is in province ${count}. Continue with the next neighbour of ${u}.`,
          logic: 'Returning pops one frame; the parent resumes its neighbour loop where it stopped.', logicTone: 'info',
          tag: 'BACKTRACK', note: `dfs(${v}) returned → resume loop at city ${u}`,
          javaLines: [14], pyLines: [5], algoStep: 3,
        });
      }
    }
    curEdge = -1;
    stack.pop();
    cur = stack.length ? stack[stack.length - 1] : null;
    push({
      title: `dfs(${u}) finished`, desc: `All links of city ${u} are handled; its frame leaves the stack.`,
      logic: 'A finished city never needs another look.', logicTone: 'info',
      tag: 'RETURN', note: `dfs(${u}) done → stack depth ${stack.length}`,
      javaLines: [18], pyLines: [7], algoStep: 3,
    });
  };

  for (let i = 0; i < n; i++) {
    curEdge = -1;
    cur = i;
    if (prov[i] >= 0) {
      push({
        title: `City ${i}: already in province ${prov[i] + 1}`, desc: 'An earlier DFS reached this city, so it is not a new province.',
        logic: 'Only unvisited cities start a new search.', logicTone: 'info',
        tag: 'SCAN', note: `i = ${i}: visited[${i}] = true → skip`,
        javaLines: [4, 5], pyLines: [9, 10], algoStep: 1,
      });
      continue;
    }
    count++;
    push({
      title: `City ${i} is unvisited: province #${count}`, desc: `No earlier search reached city ${i}, so it starts a brand-new province. Count becomes ${count}; run dfs(${i}).`,
      logic: 'Cities in different components can never reach each other, so each new start is a new province.', logicTone: 'success',
      tag: 'NEW PROVINCE', note: `visited[${i}] = false → provinces = ${count}, dfs(${i})`,
      javaLines: [5, 6, 7], pyLines: [10, 11, 12], algoStep: 2,
    });
    dfs(i);
  }
  cur = null;
  steps.push({
    title: `${count} province${count === 1 ? '' : 's'}`, desc: `Every city is visited; the DFS was started ${count} time${count === 1 ? '' : 's'}.`,
    scene: scene(), aux: aux(), vars: vars(),
    logic: 'The number of DFS launches equals the number of connected components.', logicTone: 'success',
    tag: '✅ Done!', note: `return provinces = ${count}`,
    javaLines: [10], pyLines: [13], algoStep: 4,
    result: { title: String(count), text: `Number of provinces (connected groups of cities)` },
  });
  return steps;
}

const ex = (n: number, s: string): In => ({ n, edges: s ? s.split(' ').map((t) => ({ u: +t.split('-')[0], v: +t.split('-')[1] })) : [] });

export const numberOfProvinces: ProblemDef<In> = {
  slug: '547-number-of-provinces',
  id: '547', title: 'Number of Provinces', difficulty: 'Medium', category: 'Graph', tag: 'DFS components',
  statement: 'There are n cities. Some pairs are directly connected, and connectivity is transitive: if A links to B and B links to C, A and C are in the same province. Return the number of provinces, where a province is a maximal group of cities that are connected directly or indirectly.',
  constraints: '1 ≤ n ≤ 200 (animation input: up to 9 cities and 14 links; write n, then links like 0-1 1-2)',
  examples: [
    { label: '3 | 0-1', input: ex(3, '0-1'), output: '2' },
    { label: '6 | 0-1 1-2 3-4', input: ex(6, '0-1 1-2 3-4'), output: '3' },
    { label: '7 | 0-1 1-2 2-0 3-4 4-5 5-3 5-6', input: ex(7, '0-1 1-2 2-0 3-4 4-5 5-3 5-6'), output: '2' },
  ],
  inputPlaceholder: 'e.g. 6 0-1 1-2 3-4   (n cities, then links u-v)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current city', state: 'active' }, { label: 'On the call stack', state: 'compare' }],
  varLabels: ['provinces', 'city', 'stack depth'],
  vizTitle: 'Cities and links (colour = province)',
  approach: {
    title: 'DFS from every unvisited city',
    text: 'Walk through the cities in order. When a city has not been visited, a new province starts there: bump the counter and run a depth-first search that marks every city reachable from it. Cities reached by an earlier search are skipped. The counter at the end is the number of connected components.',
  },
  java: [
    'public int findCircleNum(int[][] isConnected) {',
    '    int n = isConnected.length;',
    '    boolean[] visited = new boolean[n];',
    '    int provinces = 0;',
    '    for (int i = 0; i < n; i++) {',
    '        if (!visited[i]) {                    // new, unexplored province',
    '            provinces++;',
    '            dfs(isConnected, visited, i);',
    '        }',
    '    }',
    '    return provinces;',
    '}',
    'private void dfs(int[][] g, boolean[] visited, int u) {',
    '    visited[u] = true;',
    '    for (int v = 0; v < g.length; v++) {',
    '        if (g[u][v] == 1 && !visited[v]) {',
    '            dfs(g, visited, v);',
    '        }',
    '    }',
    '}',
  ],
  python: [
    'def find_circle_num(is_connected):',
    '    n = len(is_connected)',
    '    visited = [False] * n',
    '    def dfs(u):',
    '        visited[u] = True',
    '        for v in range(n):',
    '            if is_connected[u][v] and not visited[v]:',
    '                dfs(v)',
    '    provinces = 0',
    '    for i in range(n):',
    '        if not visited[i]:                   # new, unexplored province',
    '            provinces += 1',
    '            dfs(i)',
    '    return provinces',
  ],
  phases: [
    { icon: '🚀', label: 'Init: visited[], count = 0', tone: 'blue' },
    { icon: '🔍', label: 'Scan the cities', tone: 'cyan' },
    { icon: '🏙', label: 'New province', tone: 'gold' },
    { icon: '🧭', label: 'DFS: go deep, back up', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['provinces', 'connected directly or indirectly', 'transitive'],
  algorithm: [
    'Keep a visited array and a province counter starting at 0',
    'Scan the cities; skip any that are already visited',
    'For an unvisited city, add 1 to the counter and run a DFS that marks everything reachable',
    'The DFS visits each unvisited neighbour recursively, then returns',
    'After the scan, the counter is the number of provinces',
  ],
  complexity: [{ label: 'Time', value: 'O(V + E) with adjacency lists (O(n²) on the matrix)' }, { label: 'Space', value: 'O(V) for visited + recursion' }],
  why: 'A DFS from city s visits exactly the cities connected to s, no more (it only follows links) and no fewer (it follows every unvisited link). So after the search the whole province is marked, and any city still unvisited is in a different province. Each province therefore triggers exactly one DFS start, and the counter equals the number of provinces.',
};
