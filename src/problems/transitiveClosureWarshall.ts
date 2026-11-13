import type { Cell, CellState, GraphEdgeVM, GraphNodeVM, ProblemDef, Step, Tone } from '../engine/types.ts';
import { parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';

/** Directed unweighted graph on nodes 0..n-1. */
interface In { n: number; edges: EdgeIn[] }

function parse(raw: string): In {
  const toks = tokens(raw);
  if (toks.length < 2 || !/^\d+$/.test(toks[0])) throw new Error('Write n, then directed edges, e.g. 4 0>1 1>2 2>3');
  const n = Number(toks[0]);
  if (n < 2 || n > 6) throw new Error('Use between 2 and 6 nodes');
  const edges = parseEdges(toks.slice(1).join(' '), { lo: 0, hi: n - 1, max: 12, example: '0>1 1>2', allowEmpty: true });
  if (edges.some((e) => e.u === e.v)) throw new Error('An edge cannot connect a node to itself');
  if (new Set(edges.map((e) => `${e.u}>${e.v}`)).size !== edges.length) throw new Error('Each ordered pair u>v may appear only once');
  return { n, edges };
}

function build({ n, edges }: In): Step[] {
  const reach = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j));
  edges.forEach((e) => { reach[e.u][e.v] = true; });
  const steps: Step[] = [];
  let k = -1;
  let ci = -1;
  let cj = -1;
  let flash = false;
  let done = false;
  let found = 0;
  const pairs = () => reach.reduce((a, r, i) => a + r.filter((x, j) => x && i !== j).length, 0);

  const scene = () => {
    const rows: Cell[][] = reach.map((row, i) => row.map((v, j): Cell => {
      let state: CellState | undefined;
      let tone: Tone | undefined;
      if (done) state = v ? 'found' : 'dim';
      else if (i === ci && j === cj) state = flash ? 'found' : 'active';
      else if (ci >= 0 && ((i === ci && j === k) || (i === k && j === cj))) state = 'compare';
      if (!done && k >= 0 && (i === k || j === k)) tone = 'purple';
      const c: Cell = { key: `${i},${j}`, value: v ? 1 : 0 };
      if (state) c.state = state;
      if (tone) c.tone = tone;
      return c;
    }));
    const nodes: GraphNodeVM[] = Array.from({ length: n }, (_, id): GraphNodeVM => {
      const st: CellState | undefined = id === k ? 'swap' : ci >= 0 && id === ci ? 'active' : ci >= 0 && id === cj ? 'compare' : undefined;
      return st ? { id, state: st } : { id };
    });
    const ge: GraphEdgeVM[] = edges.map((e) => ({ from: e.u, to: e.v, directed: true }));
    return {
      kind: 'split' as const,
      parts: [
        { kind: 'graph' as const, nodes, edges: ge },
        { kind: 'grid' as const, rows, rowHeads: Array.from({ length: n }, (_, i) => `${i}→`), colHeads: Array.from({ length: n }, (_, j) => `→${j}`), variant: 'table' as const },
      ],
    };
  };
  const vars = () => ({ k: k < 0 ? '—' : k, 'i → j': ci < 0 ? '—' : `${ci} → ${cj}`, 'new pairs': found, 'reachable pairs': pairs() });
  const push = (s: Omit<Step, 'vars' | 'scene'>) => steps.push({ ...s, scene: scene(), vars: vars() });

  push({
    title: 'Start', desc: 'reach[i][j] = 1 means "i can get to j". Initially a node reaches itself and its direct successors (the edges).',
    logic: 'Only walks with zero intermediate stops are known so far. Each round allows one more node as a stop.', logicTone: 'info',
    tag: 'INIT —', note: `reach[i][i] = 1 and ${edges.length} edges set; ${pairs()} pairs reachable`,
    javaLines: [1, 2, 3], pyLines: [1, 2], algoStep: 0,
  });

  for (k = 0; k < n; k++) {
    ci = cj = -1;
    flash = false;
    push({
      title: `k = ${k}: allow node ${k} as a stop`, desc: `Whoever can reach ${k} (column ${k}) now also reaches everything ${k} can reach (row ${k}). Rows and columns of ${k} are purple.`,
      logic: 'Invariant: after round k, reach[i][j] is 1 exactly when some path i → j uses only nodes 0…k as stops.', logicTone: 'info',
      tag: `ROUND k=${k}`, note: `k = ${k}: stops allowed = {${Array.from({ length: k + 1 }, (_, x) => x).join(', ')}}, ${pairs()} pairs so far`,
      javaLines: [4], pyLines: [3], algoStep: 1,
    });
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === k || j === k || i === j) continue;
        if (!reach[i][k] || !reach[k][j] || reach[i][j]) continue;
        ci = i; cj = j; flash = true;
        reach[i][j] = true;
        found++;
        push({
          title: `${i} → ${k} → ${j}: ${i} now reaches ${j}`, desc: `reach[${i}][${k}] and reach[${k}][${j}] are both 1, so ${i} can get to ${j} through ${k}. The cell turns 1.`,
          logic: 'Reachability is transitive: a route to the stop and a route on from it make a route.', logicTone: 'success',
          tag: 'CLOSE', note: `reach[${i}][${k}] && reach[${k}][${j}] → reach[${i}][${j}] = 1 (pairs = ${pairs()})`,
          javaLines: [5, 6, 7, 8], pyLines: [4, 5, 6, 7], algoStep: 2,
        });
      }
    }
  }
  ci = cj = -1;
  k = -1;
  done = true;
  const total = pairs();
  steps.push({
    title: 'Closure complete', desc: `Every node has been used as a stop. ${total} of ${n * (n - 1)} ordered pairs (i, j) with i ≠ j are connected.`,
    scene: scene(), vars: vars(),
    logic: 'Any path that exists passes through its intermediate nodes in some order; when the largest-numbered of them was allowed, the two halves were already marked, so the whole path got marked.', logicTone: 'success',
    tag: '✅ Done!', note: `all ${n} rounds done → ${total} reachable pairs (i ≠ j)`,
    javaLines: [9], pyLines: [8], algoStep: 3,
    result: { title: String(total), text: `${total} reachable ordered pairs (excluding i → i)` },
  });
  return steps;
}

const ex = (s: string): In => parse(s);

export const transitiveClosureWarshall: ProblemDef<In> = {
  slug: 'cp-transitive-closure-warshall-reachability',
  id: 'CP', title: 'Transitive Closure (Warshall Reachability)', difficulty: 'Medium', category: 'Graph', tag: 'boolean Floyd-Warshall',
  statement: 'Given a directed graph, build its transitive closure: a table reach[i][j] that is true exactly when there is a path from i to j. Report how many ordered pairs (i, j) with i ≠ j are connected. Use Warshall\'s algorithm, the Boolean version of Floyd-Warshall.',
  constraints: 'Animation input: 2–6 nodes numbered from 0, at most 12 directed edges written u>v.',
  examples: [
    { label: '4 | 0>1 1>2 2>3 (a chain)', input: ex('4 0>1 1>2 2>3'), output: '6' },
    { label: '5 | 0>1 1>2 2>0 3>4 (cycle + island)', input: ex('5 0>1 1>2 2>0 3>4'), output: '7' },
    { label: '5 | 0>2 1>2 2>3 3>4', input: ex('5 0>2 1>2 2>3 3>4'), output: '9' },
  ],
  inputPlaceholder: 'e.g. 4 0>1 1>2 2>3   (n, directed edges u>v)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [
    { label: 'Pair (i, j) being updated', state: 'active' },
    { label: 'Legs i→k and k→j', state: 'compare' },
    { label: 'Newly reachable / final', state: 'found' },
    { label: 'Intermediate node k', state: 'swap' },
  ],
  varLabels: ['k', 'i → j', 'new pairs', 'reachable pairs'],
  vizTitle: 'Graph and the reachability matrix',
  approach: {
    title: 'Warshall: OR together "reach k" and "k reaches"',
    text: 'Start with reach[i][i] = true and reach[u][v] = true for each edge. For each node k in turn, set reach[i][j] to true whenever reach[i][k] and reach[k][j] are both true. After allowing every node as a stop, reach holds the full transitive closure.',
  },
  java: [
    'public boolean[][] transitiveClosure(int n, int[][] edges) {',
    '    boolean[][] reach = new boolean[n][n];',
    '    for (int i = 0; i < n; i++) reach[i][i] = true;',
    '    for (int[] e : edges) reach[e[0]][e[1]] = true;',
    '    for (int k = 0; k < n; k++)                              // allow node k as a stop',
    '        for (int i = 0; i < n; i++)',
    '            for (int j = 0; j < n; j++)',
    '                if (reach[i][k] && reach[k][j])',
    '                    reach[i][j] = true;',
    '    return reach;',
    '}',
  ],
  python: [
    'def transitive_closure(n, edges):',
    '    reach = [[i == j for j in range(n)] for i in range(n)]',
    '    for u, v in edges: reach[u][v] = True',
    '    for k in range(n):                                       # allow node k as a stop',
    '        for i in range(n):',
    '            for j in range(n):',
    '                if reach[i][k] and reach[k][j]:',
    '                    reach[i][j] = True',
    '    return reach',
  ],
  phases: [
    { icon: '🧮', label: 'Init reach[ ][ ]', tone: 'blue' },
    { icon: '🔁', label: 'Allow node k as a stop', tone: 'cyan' },
    { icon: '🔗', label: 'Close i→k→j', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['transitive closure', 'path from i to j', 'reach'],
  algorithm: [
    'Set reach[i][i] = true and reach[u][v] = true for every edge',
    'For each node k, allow it as an intermediate stop',
    'For every pair (i, j): if reach[i][k] and reach[k][j], set reach[i][j] = true',
    'After the last k, reach[i][j] is true exactly when a path from i to j exists',
  ],
  complexity: [{ label: 'Time', value: 'O(V³)' }, { label: 'Space', value: 'O(V²)' }],
  why: 'After round k, reach[i][j] is true exactly when a path from i to j exists using only nodes 0…k as inner stops: a path that uses k splits at k into two shorter pieces whose stops are all earlier, and both pieces were already recorded. In-place updates are safe because row k and column k never change during round k. With all nodes allowed, every real path is recorded and nothing else is.',
};
