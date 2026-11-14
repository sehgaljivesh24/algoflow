import type { Cell, CellState, GraphEdgeVM, GraphNodeVM, ProblemDef, Step, Tone } from '../engine/types.ts';
import { plural } from './text.ts';
import { parseEdges, tokens } from './graphKit.ts';
import type { EdgeIn } from './graphKit.ts';
import { INF, fmtD, matrixRows } from './p5cKit.ts';

/** Undirected weighted graph on nodes 0..n-1 plus a distance threshold. */
interface In { n: number; threshold: number; edges: EdgeIn[] }

function parse(raw: string): In {
  const toks = tokens(raw);
  const usage = 'Write n, the distance threshold, then weighted edges, e.g. 4 4 0-1:3 1-2:1 1-3:4 2-3:1';
  if (toks.length < 3 || !/^\d+$/.test(toks[0]) || !/^\d+$/.test(toks[1])) throw new Error(usage);
  const n = Number(toks[0]);
  const threshold = Number(toks[1]);
  if (n < 2 || n > 6) throw new Error('Use between 2 and 6 cities');
  if (threshold < 1 || threshold > 99) throw new Error('The distance threshold must be between 1 and 99');
  const edges = parseEdges(toks.slice(2).join(' '), { weighted: true, lo: 0, hi: n - 1, max: 10, example: '0-1:3 1-2:1', allowEmpty: true });
  if (edges.some((e) => e.u === e.v)) throw new Error('A road cannot connect a city to itself');
  if (edges.some((e) => e.w! < 1)) throw new Error('Road lengths must be at least 1');
  const key = (e: EdgeIn) => `${Math.min(e.u, e.v)}-${Math.max(e.u, e.v)}`;
  if (new Set(edges.map(key)).size !== edges.length) throw new Error('Each pair of cities may have only one road');
  return { n, threshold, edges };
}

function build({ n, threshold, edges }: In): Step[] {
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : INF)));
  edges.forEach((e) => { d[e.u][e.v] = e.w!; d[e.v][e.u] = e.w!; });
  const steps: Step[] = [];
  let k = -1;
  let cur = -1;
  let changed = new Set<string>();
  let phase: 'fw' | 'count' | 'done' = 'fw';
  const counts: (number | null)[] = new Array<number | null>(n).fill(null);
  let best: number | string = '—';
  let fewest: number | string = '—';

  const scene = () => {
    const rows = matrixRows(d, (i, j): { state?: CellState; tone?: Tone } => {
      if (phase === 'fw') return { state: changed.has(`${i},${j}`) ? 'found' : undefined, tone: k >= 0 && (i === k || j === k) ? 'purple' : undefined };
      if (phase === 'count') {
        if (i === cur) return i === j ? { state: 'dim' } : { state: d[i][j] <= threshold ? 'found' : 'error' };
        return { state: 'dim' };
      }
      return i === best ? (i === j ? { state: 'dim' } : { state: d[i][j] <= threshold ? 'found' : 'error' }) : { state: 'dim' };
    }) as Cell[][];
    const nodes: GraphNodeVM[] = Array.from({ length: n }, (_, id): GraphNodeVM => {
      const node: GraphNodeVM = { id };
      if (phase === 'fw' && id === k) node.state = 'swap';
      if (phase === 'count' && id === cur) node.state = 'active';
      if (phase === 'done' && id === best) node.state = 'found';
      if (counts[id] !== null) node.tag = `${counts[id]} near`;
      return node;
    });
    const ge: GraphEdgeVM[] = edges.map((e) => ({ from: e.u, to: e.v, weight: e.w }));
    return {
      kind: 'split' as const,
      parts: [
        { kind: 'graph' as const, nodes, edges: ge },
        { kind: 'grid' as const, rows, rowHeads: Array.from({ length: n }, (_, i) => `${i}`), colHeads: Array.from({ length: n }, (_, j) => `${j}`), variant: 'table' as const },
      ],
    };
  };
  const vars = () => ({ k: k < 0 ? '—' : k, city: cur < 0 ? '—' : cur, 'best city': best, fewest });
  const push = (s: Omit<Step, 'vars' | 'scene'>) => steps.push({ ...s, scene: scene(), vars: vars() });

  push({
    title: 'Start', desc: `Roads are two-way. dist[i][j] begins as the direct road length (0 on the diagonal, ∞ when there is no direct road). The threshold is ${threshold}.`,
    logic: 'To count how many cities each city can reach within the threshold we need real shortest distances between ALL pairs, not just direct roads.', logicTone: 'info',
    tag: 'INIT —', note: `${plural(edges.length, 'road')} copied both ways, threshold = ${threshold}`,
    javaLines: [1, 2, 3, 4, 5], pyLines: [1, 2, 3, 4], algoStep: 0,
  });

  for (k = 0; k < n; k++) {
    changed = new Set();
    const notes: string[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cand = d[i][k] + d[k][j];
        if (cand < d[i][j]) {
          if (i < j) notes.push(`${i}↔${j}: ${fmtD(d[i][j])} → ${cand}`);
          d[i][j] = cand;
          changed.add(`${i},${j}`);
        }
      }
    }
    push({
      title: `k = ${k}: routes through city ${k}`,
      desc: notes.length ? `Allowing city ${k} as a stop shortens ${notes.length} pair${notes.length === 1 ? '' : 's'} (green): ${notes.join(', ')}.` : `Allowing city ${k} as a stop shortens nothing this round.`,
      logic: 'Each round tries i → k → j for every pair. After round k, distances are right for all routes whose stops come from cities 0…k.', logicTone: notes.length ? 'success' : 'info',
      tag: `ROUND k=${k}`, note: notes.length ? `${notes.length} shorter: ${notes.slice(0, 2).join(', ')}${notes.length > 2 ? ', …' : ''}` : `via ${k}: no pair improves`,
      alert: notes.length ? undefined : `No pair improves by going through city ${k}.`,
      javaLines: [6, 7, 8, 9], pyLines: [5, 6, 7, 8], algoStep: 1,
    });
  }
  k = -1;
  changed = new Set();
  phase = 'count';
  push({
    title: 'All distances ready', desc: 'The matrix now holds the shortest distance between every pair of cities. Next: for each city count the others within distance ' + threshold + '.',
    logic: 'Floyd-Warshall is only the preparation; the problem itself is a count over each row.', logicTone: 'info',
    tag: 'READY', note: `dist complete; bestCity = -1, fewest = n + 1 = ${n + 1}`,
    javaLines: [10], pyLines: [9], algoStep: 2,
  });
  let bestCity = -1;
  let fewestN = n + 1;
  for (let i = 0; i < n; i++) {
    cur = i;
    let c = 0;
    for (let j = 0; j < n; j++) if (i !== j && d[i][j] <= threshold) c++;
    counts[i] = c;
    const prevText = fewestN > n ? '∞' : String(fewestN);
    const take = c <= fewestN;
    if (take) { fewestN = c; bestCity = i; best = i; fewest = c; }
    push({
      title: `City ${i} reaches ${c} within ${threshold}`,
      desc: `In row ${i}, ${c} other cit${c === 1 ? 'y has' : 'ies have'} distance ≤ ${threshold} (green); the rest are too far (red).` + (take ? ` That is no more than the fewest so far (${prevText}), so city ${i} becomes the best candidate (ties go to the larger number).` : ` That is more than the current fewest (${prevText}), so the candidate stays city ${bestCity}.`),
      logic: 'We want the city with the fewest neighbours in range; using ≤ when comparing makes a tie move to the later (larger-numbered) city, as the problem requires.', logicTone: take ? 'success' : 'info',
      tag: 'COUNT', note: `reachable = ${c} ${take ? '≤' : '>'} fewest = ${prevText} → ${take ? `bestCity = ${i}` : `keep bestCity = ${bestCity}`}`,
      javaLines: take ? [11, 12, 13, 14, 15, 16, 17] : [11, 12, 13, 14, 15], pyLines: take ? [10, 11, 12, 13] : [10, 11, 12], algoStep: 3,
    });
  }
  cur = -1;
  phase = 'done';
  steps.push({
    title: `Answer: city ${bestCity}`,
    desc: `City ${bestCity} can reach only ${fewestN} other cit${fewestN === 1 ? 'y' : 'ies'} within ${threshold}, the fewest (largest number on ties).`,
    scene: scene(), vars: vars(),
    logic: 'Scanning cities in increasing order with ≤ keeps the last city that attains the minimum count.', logicTone: 'success',
    tag: '✅ Done!', note: `return bestCity = ${bestCity} (fewest = ${fewestN})`,
    javaLines: [20], pyLines: [14], algoStep: 4,
    result: { title: String(bestCity), text: `City ${bestCity} has the fewest neighbours (${fewestN}) within distance ${threshold}` },
  });
  return steps;
}

const ex = (s: string): In => parse(s);

export const findTheCityThreshold: ProblemDef<In> = {
  slug: '1334-find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance',
  id: '1334', title: 'Find the City With the Smallest Number of Neighbors at a Threshold Distance', difficulty: 'Medium', category: 'Graph', tag: 'Floyd-Warshall',
  statement: 'There are n cities joined by two-way roads of given lengths. For each city count how many other cities can be reached with a total distance of at most the threshold. Return the city with the fewest such neighbours; if several cities tie, return the one with the largest number.',
  constraints: 'Animation input: 2–6 cities numbered from 0, at most 10 roads written u-v:length (length ≥ 1), threshold 1–99.',
  examples: [
    { label: '4 4 | 0-1:3 1-2:1 1-3:4 2-3:1', input: ex('4 4 0-1:3 1-2:1 1-3:4 2-3:1'), output: '3' },
    { label: '5 2 | LeetCode sample 2', input: ex('5 2 0-1:2 0-4:8 1-2:3 1-4:2 2-3:1 3-4:1'), output: '0' },
    { label: '5 2 | tie goes to the larger city', input: ex('5 2 0-1:1 1-2:1 3-4:1'), output: '4' },
  ],
  inputPlaceholder: 'e.g. 4 4 0-1:3 1-2:1 1-3:4 2-3:1   (n, threshold, roads u-v:length)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [
    { label: 'City being counted', state: 'active' },
    { label: 'Within threshold / improved this round', state: 'found' },
    { label: 'Intermediate city k', state: 'swap' },
    { label: 'Too far', state: 'error' },
  ],
  varLabels: ['k', 'city', 'best city', 'fewest'],
  vizTitle: 'Road map and the all-pairs distance matrix',
  approach: {
    title: 'Floyd-Warshall, then count each row',
    text: 'Build the table of direct road lengths and run Floyd-Warshall to turn it into shortest distances between every pair. Then for each city count the entries in its row that are at most the threshold (not counting itself) and keep the city with the smallest count, preferring the larger number on ties.',
  },
  java: [
    'public int findTheCity(int n, int[][] edges, int distanceThreshold) {',
    '    int INF = Integer.MAX_VALUE / 2;',
    '    int[][] dist = new int[n][n];',
    '    for (int[] row : dist) Arrays.fill(row, INF);',
    '    for (int i = 0; i < n; i++) dist[i][i] = 0;',
    '    for (int[] e : edges) dist[e[0]][e[1]] = dist[e[1]][e[0]] = e[2];',
    '    for (int k = 0; k < n; k++)                              // allow city k as a stop',
    '        for (int i = 0; i < n; i++)',
    '            for (int j = 0; j < n; j++)',
    '                dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j]);',
    '    int bestCity = -1, fewest = n + 1;',
    '    for (int i = 0; i < n; i++) {',
    '        int reachable = 0;',
    '        for (int j = 0; j < n; j++)',
    '            if (i != j && dist[i][j] <= distanceThreshold) reachable++;',
    '        if (reachable <= fewest) {                           // <= so ties pick the larger index',
    '            fewest = reachable;',
    '            bestCity = i;',
    '        }',
    '    }',
    '    return bestCity;',
    '}',
  ],
  python: [
    'def find_the_city(n, edges, threshold):',
    "    INF = float('inf')",
    '    dist = [[INF] * n for _ in range(n)]',
    '    for i in range(n): dist[i][i] = 0',
    '    for u, v, w in edges: dist[u][v] = dist[v][u] = w',
    '    for k in range(n):                                       # allow city k as a stop',
    '        for i in range(n):',
    '            for j in range(n):',
    '                dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])',
    '    best_city, fewest = -1, n + 1',
    '    for i in range(n):',
    '        reachable = sum(1 for j in range(n) if i != j and dist[i][j] <= threshold)',
    '        if reachable <= fewest:                              # <= so ties pick the larger index',
    '            fewest, best_city = reachable, i',
    '    return best_city',
  ],
  phases: [
    { icon: '🧮', label: 'Init dist[ ][ ]', tone: 'blue' },
    { icon: '🔁', label: 'Floyd-Warshall rounds', tone: 'cyan' },
    { icon: '📋', label: 'Matrix ready', tone: 'gold' },
    { icon: '🔢', label: 'Count each row', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['fewest', 'threshold', 'largest number'],
  algorithm: [
    'Fill dist with 0 on the diagonal, the road lengths in both directions, and ∞ elsewhere',
    'Run Floyd-Warshall: for each k, relax dist[i][j] with dist[i][k] + dist[k][j]',
    'Prepare to scan the cities with the fewest-so-far counter',
    'For each city count the other cities with dist ≤ threshold; keep it if the count is ≤ the fewest so far',
    'Return the last city that achieved the smallest count',
  ],
  complexity: [{ label: 'Time', value: 'O(n³)' }, { label: 'Space', value: 'O(n²)' }],
  why: 'The question needs the shortest distance for every pair of cities, which is exactly what Floyd-Warshall computes: after allowing city k as a stop, every distance is optimal among routes using stops 0…k. With n this small, O(n³) is the simplest correct choice and beats running Dijkstra from each city only in code size. Counting entries per row is then trivial, and comparing with ≤ implements the "largest index wins ties" rule.',
};
