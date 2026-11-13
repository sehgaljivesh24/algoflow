import type { Cell, CellState, GraphEdgeVM, GraphNodeVM, ProblemDef, Step, Tone } from '../engine/types.ts';
import { parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';
import { INF, fmtD, matrixRows } from './p5cKit.ts';

/** Directed weighted graph on nodes 0..n-1 (weights may be negative, but no negative cycle). */
interface In { n: number; edges: EdgeIn[] }

function runFW(n: number, edges: EdgeIn[]): number[][] {
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : INF)));
  edges.forEach((e) => { d[e.u][e.v] = Math.min(d[e.u][e.v], e.w!); });
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
  return d;
}

function parse(raw: string): In {
  const toks = tokens(raw);
  if (toks.length < 2 || !/^\d+$/.test(toks[0])) throw new Error('Write n, then weighted directed edges, e.g. 4 0>1:3 1>2:-2 2>3:2');
  const n = Number(toks[0]);
  if (n < 2 || n > 5) throw new Error('Use between 2 and 5 nodes');
  const edges = parseEdges(toks.slice(1).join(' '), { weighted: true, lo: 0, hi: n - 1, max: 12, example: '0>1:3 1>2:-2', allowNegativeWeight: true, allowEmpty: true });
  if (edges.some((e) => e.u === e.v)) throw new Error('An edge cannot connect a node to itself');
  if (new Set(edges.map((e) => `${e.u}>${e.v}`)).size !== edges.length) throw new Error('Each ordered pair u>v may appear only once');
  const d = runFW(n, edges);
  if (d.some((row, i) => row[i] < 0)) throw new Error('These edges contain a negative cycle, so shortest paths are not defined. Remove or raise one weight.');
  return { n, edges };
}

const fmtMatrix = (d: number[][]): string => `[${d.map((r) => `[${r.map(fmtD).join(',')}]`).join(',')}]`;

function build({ n, edges }: In): Step[] {
  const d = Array.from({ length: n }, () => new Array<number>(n).fill(INF));
  const steps: Step[] = [];
  let k = -1;
  let ci = -1;
  let cj = -1;
  let flash = false;
  let via: number | string = '—';
  let improved = 0;
  let done = false;

  const grid = () => {
    const rows = matrixRows(d, (i, j) => {
      let state: CellState | undefined;
      let tone: Tone | undefined;
      if (done) state = d[i][j] === INF ? 'dim' : 'found';
      else if (i === ci && j === cj) state = flash ? 'found' : 'active';
      else if (k >= 0 && ((i === ci && j === k) || (i === k && j === cj)) && ci >= 0) state = 'compare';
      if (!done && k >= 0 && (i === k || j === k)) tone = 'purple';
      return { state, tone };
    });
    return rows as Cell[][];
  };
  const scene = () => {
    const nodes: GraphNodeVM[] = Array.from({ length: n }, (_, id): GraphNodeVM => {
      const st: CellState | undefined = ci < 0 ? (id === k ? 'swap' : undefined) : id === k ? 'swap' : id === ci ? 'active' : id === cj ? 'compare' : undefined;
      return st ? { id, state: st } : { id };
    });
    const ge: GraphEdgeVM[] = edges.map((e) => ({ from: e.u, to: e.v, weight: e.w, directed: true, state: 'default' }));
    return {
      kind: 'split' as const,
      parts: [
        { kind: 'graph' as const, nodes, edges: ge },
        { kind: 'grid' as const, rows: grid(), rowHeads: Array.from({ length: n }, (_, i) => `${i}→`), colHeads: Array.from({ length: n }, (_, j) => `→${j}`), variant: 'table' as const },
      ],
    };
  };
  const vars = () => ({ k: k < 0 ? '—' : k, 'i → j': ci < 0 ? '—' : `${ci} → ${cj}`, 'via k': via, improvements: improved });
  const push = (s: Omit<Step, 'vars' | 'scene'>) => steps.push({ ...s, scene: scene(), vars: vars() });

  edges.forEach((e) => { d[e.u][e.v] = e.w!; });
  for (let i = 0; i < n; i++) d[i][i] = 0;
  push({
    title: 'Start', desc: `dist[i][j] holds the best known distance from i to j: 0 on the diagonal, the edge weight where an edge exists, and ∞ (no known route) everywhere else.`,
    logic: 'At this point only routes with zero intermediate stops are known. Each round will allow one more node to be used as a stop.', logicTone: 'info',
    tag: 'INIT —', note: `dist[i][i] = 0, ${edges.length} edge weights copied, the rest ∞`,
    javaLines: [1, 2, 3, 4, 5], pyLines: [1, 2, 3, 4], algoStep: 0,
  });

  for (k = 0; k < n; k++) {
    ci = cj = -1;
    flash = false;
    via = '—';
    push({
      title: `k = ${k}: allow node ${k} as a stop`, desc: `Row ${k} and column ${k} (purple) are the legs of every route that passes through node ${k}. For each other pair (i, j) we test whether i → ${k} → j beats the current dist[i][j].`,
      logic: 'Invariant: before this round dist[i][j] is the shortest distance using only stops from {0 … k−1}; after it, stops from {0 … k} are allowed.', logicTone: 'info',
      tag: `ROUND k=${k}`, note: `k = ${k}: stops allowed = {${Array.from({ length: k + 1 }, (_, x) => x).join(', ')}}`,
      javaLines: [6], pyLines: [5], algoStep: 1,
    });
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === k || j === k || i === j) continue;
        if (d[i][k] === INF || d[k][j] === INF) continue;
        ci = i; cj = j; flash = false;
        const cand = d[i][k] + d[k][j];
        via = cand;
        if (cand < d[i][j]) {
          const old = d[i][j];
          d[i][j] = cand;
          improved++;
          flash = true;
          push({
            title: `${i} → ${k} → ${j} = ${cand} < ${fmtD(old)}`, desc: `dist[${i}][${k}] + dist[${k}][${j}] = ${fmtD(d[i][k])} + ${fmtD(d[k][j])} = ${cand}, better than ${fmtD(old)}. dist[${i}][${j}] becomes ${cand}.`,
            logic: 'Going through the new stop is cheaper than anything allowed so far, so the cell is lowered.', logicTone: 'success',
            tag: 'IMPROVE', note: `${fmtD(d[i][k])} + ${fmtD(d[k][j])} = ${cand} < ${fmtD(old)} → dist[${i}][${j}] = ${cand}`,
            javaLines: [7, 8, 9, 10, 11], pyLines: [6, 7, 8, 9], algoStep: 3,
          });
        } else {
          push({
            title: `${i} → ${k} → ${j} = ${cand} ≥ ${fmtD(d[i][j])}`, desc: `dist[${i}][${k}] + dist[${k}][${j}] = ${cand} does not beat dist[${i}][${j}] = ${fmtD(d[i][j])}, so the cell stays.`,
            logic: 'A detour through the new stop only helps when it is strictly shorter than the best route known.', logicTone: 'info',
            tag: 'COMPARE', alert: `No improvement: the detour ${i}→${k}→${j} (${cand}) is not shorter than ${fmtD(d[i][j])}.`, note: `${fmtD(d[i][k])} + ${fmtD(d[k][j])} = ${cand} ≥ ${fmtD(d[i][j])} → keep`,
            javaLines: [7, 8, 9, 10], pyLines: [6, 7, 8], algoStep: 2,
          });
        }
      }
    }
  }
  ci = cj = -1;
  k = -1;
  done = true;
  via = '—';
  const finite = d.reduce((a, r) => a + r.filter((x) => x !== INF).length, 0) - n;
  steps.push({
    title: 'All pairs done',
    desc: `Every node has been allowed as a stop, so each cell holds the shortest distance between its two nodes (∞ means there is no route). ${finite} of ${n * (n - 1)} ordered pairs are reachable.`,
    scene: scene(), vars: vars(),
    logic: 'Any shortest path uses each node at most once; when its highest-numbered inner node was allowed, the cell was already correct for that path.', logicTone: 'success',
    tag: '✅ Done!', note: `all ${n} rounds finished, ${improved} improvements → return dist`,
    javaLines: [15], pyLines: [10], algoStep: 4,
    result: { title: fmtMatrix(d), text: 'Shortest distance between every ordered pair (rows = from, columns = to, ∞ = unreachable)' },
  });
  return steps;
}

const ex = (s: string): In => parse(s);

export const floydWarshallAllPairs: ProblemDef<In> = {
  slug: 'alg-floyd-warshall-all-pairs-shortest-paths',
  id: 'ALG', title: 'Floyd-Warshall All-Pairs Shortest Paths', difficulty: 'Medium', category: 'Graph', tag: 'intermediate-node DP',
  statement: 'Given a directed graph with weighted edges (weights may be negative, but there is no negative cycle), compute the shortest distance between every ordered pair of nodes. Do it with the Floyd-Warshall dynamic programme: allow the nodes one at a time as intermediate stops.',
  constraints: 'Animation input: 2–5 nodes numbered from 0, at most 12 edges written u>v:w, weights between −99 and 99 with no negative cycle.',
  examples: [
    { label: '4 | 0>1:5 0>3:10 1>2:3 2>3:1 3>0:2', input: ex('4 0>1:5 0>3:10 1>2:3 2>3:1 3>0:2'), output: '[[0,5,8,9],[6,0,3,4],[3,8,0,1],[2,7,10,0]]' },
    { label: 'negative edge', input: ex('4 0>1:3 1>2:-2 2>3:2 3>1:1 0>2:4'), output: '[[0,3,1,3],[∞,0,-2,0],[∞,3,0,2],[∞,1,-1,0]]' },
    { label: 'two islands', input: ex('5 0>1:2 1>2:2 3>4:1 4>3:1'), output: '[[0,2,4,∞,∞],[∞,0,2,∞,∞],[∞,∞,0,∞,∞],[∞,∞,∞,0,1],[∞,∞,∞,1,0]]' },
  ],
  inputPlaceholder: 'e.g. 4 0>1:5 0>3:10 1>2:3 2>3:1   (n, directed edges u>v:w)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [
    { label: 'Pair (i, j) being tested', state: 'active' },
    { label: 'Legs i→k and k→j', state: 'compare' },
    { label: 'Just improved / final', state: 'found' },
    { label: 'Intermediate node k', state: 'swap' },
  ],
  varLabels: ['k', 'i → j', 'via k', 'improvements'],
  vizTitle: 'Graph and the distance matrix dist[i][j]',
  approach: {
    title: 'Allow one more intermediate node per round',
    text: 'Start with dist[i][j] = edge weight (0 on the diagonal, ∞ if no edge). For k = 0, 1, …, n−1, ask for every pair (i, j): is it shorter to go i → k and then k → j than the best route found so far? If yes, lower dist[i][j]. After round k the table is correct for all paths whose inner nodes come from {0 … k}; after the last round it is correct for all paths.',
  },
  java: [
    'public int[][] floydWarshall(int n, int[][] edges) {',
    '    int INF = Integer.MAX_VALUE / 2;',
    '    int[][] dist = new int[n][n];',
    '    for (int[] row : dist) Arrays.fill(row, INF);',
    '    for (int i = 0; i < n; i++) dist[i][i] = 0;',
    '    for (int[] e : edges) dist[e[0]][e[1]] = e[2];',
    '    for (int k = 0; k < n; k++) {                         // allow node k as an intermediate stop',
    '        for (int i = 0; i < n; i++) {',
    '            for (int j = 0; j < n; j++) {',
    '                if (dist[i][k] == INF || dist[k][j] == INF) continue;   // no route through k',
    '                if (dist[i][k] + dist[k][j] < dist[i][j])',
    '                    dist[i][j] = dist[i][k] + dist[k][j];',
    '            }',
    '        }',
    '    }',
    '    return dist;',
    '}',
  ],
  python: [
    'def floyd_warshall(n, edges):',
    "    INF = float('inf')",
    '    dist = [[INF] * n for _ in range(n)]',
    '    for i in range(n): dist[i][i] = 0',
    '    for u, v, w in edges: dist[u][v] = w',
    '    for k in range(n):                                    # allow node k as an intermediate stop',
    '        for i in range(n):',
    '            for j in range(n):',
    '                if dist[i][k] + dist[k][j] < dist[i][j]:',
    '                    dist[i][j] = dist[i][k] + dist[k][j]',
    '    return dist',
  ],
  phases: [
    { icon: '🧮', label: 'Init dist[ ][ ]', tone: 'blue' },
    { icon: '🔁', label: 'Allow node k as a stop', tone: 'cyan' },
    { icon: '🔍', label: 'Compare i→k→j', tone: 'gold' },
    { icon: '⬇', label: 'Improve dist[i][j]', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['shortest distance', 'every ordered pair', 'intermediate'],
  algorithm: [
    'Initialise dist: 0 on the diagonal, the edge weight where an edge exists, ∞ elsewhere',
    'For each k in turn, allow node k as an intermediate stop',
    'For every pair (i, j) compare dist[i][j] with dist[i][k] + dist[k][j]',
    'If the route through k is shorter, store it in dist[i][j]',
    'After the last k, dist[i][j] is the shortest distance from i to j for every pair',
  ],
  complexity: [{ label: 'Time', value: 'O(V³)' }, { label: 'Space', value: 'O(V²)' }],
  why: 'Let D_k[i][j] be the shortest path from i to j using only nodes 0…k−1 as inner stops. A best path for k either avoids node k, giving D_{k−1}[i][j], or visits it once, splitting into i→k and k→j that both use only earlier stops, giving D_{k−1}[i][k] + D_{k−1}[k][j]. Taking the minimum is exactly the update. Because there is no negative cycle, a shortest path never repeats a node, so after n rounds every path is covered. Updating in place is safe since row k and column k do not change during round k.',
};
