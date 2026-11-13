import type { CellState, EdgeState, GraphEdgeVM, ProblemDef, Step } from '../engine/types.ts';
import { find, gc, popcount, recorder } from './dpAdvKit.ts';

interface In { d: number[][] }

const java = [
  'public int tsp(int[][] d) {',
  '    int n = d.length, m = n - 1, full = (1 << m) - 1;     // city 0 is the start; bit j-1 stands for city j',
  '    int[][] dp = new int[1 << m][n];                        // dp[mask][j]: cheapest path 0 -> ... -> j visiting exactly mask',
  '    for (int[] row : dp) Arrays.fill(row, INF);',
  '    for (int j = 1; j < n; j++) dp[1 << (j - 1)][j] = d[0][j];   // go straight to j',
  '    for (int mask = 1; mask <= full; mask++) {',
  '        for (int j = 1; j < n; j++) {',
  '            if ((mask & (1 << (j - 1))) == 0) continue;     // j must be in mask',
  '            int prev = mask ^ (1 << (j - 1));               // the set visited before arriving at j',
  '            if (prev == 0) continue;',
  '            for (int i = 1; i < n; i++) {',
  '                if ((prev & (1 << (i - 1))) == 0) continue;',
  '                dp[mask][j] = Math.min(dp[mask][j], dp[prev][i] + d[i][j]);',
  '            }',
  '        }',
  '    }',
  '    int best = INF;',
  '    for (int j = 1; j < n; j++) best = Math.min(best, dp[full][j] + d[j][0]);   // close the loop',
  '    return best;',
  '}',
];
const python = [
  'def tsp(d):',
  '    n = len(d)',
  '    m = n - 1',
  '    full = (1 << m) - 1                              # city 0 is the start; bit j-1 stands for city j',
  '    dp = [[INF] * n for _ in range(1 << m)]          # dp[mask][j]: cheapest path 0 -> ... -> j visiting exactly mask',
  '    for j in range(1, n):',
  '        dp[1 << (j - 1)][j] = d[0][j]                # go straight to j',
  '    for mask in range(1, full + 1):',
  '        for j in range(1, n):',
  '            if not mask & (1 << (j - 1)):',
  '                continue                             # j must be in mask',
  '            prev = mask ^ (1 << (j - 1))             # the set visited before arriving at j',
  '            if prev == 0:',
  '                continue',
  '            for i in range(1, n):',
  '                if prev & (1 << (i - 1)):',
  '                    dp[mask][j] = min(dp[mask][j], dp[prev][i] + d[i][j])',
  '    return min(dp[full][j] + d[j][0] for j in range(1, n))   # close the loop',
];
const J = { def: find(java, 'int n = d.length', 'int[][] dp'), base: find(java, 'for (int j = 1; j < n; j++) dp[1'), cell: find(java, 'for (int mask', 'int prev', 'dp[mask][j] = Math.min'), close: find(java, 'int best = INF', 'for (int j = 1; j < n; j++) best'), ret: find(java, 'return best') };
const P = { def: find(python, 'n = len(d)', 'dp = [[INF]'), base: find(python, 'dp[1 << (j - 1)][j] = d[0][j]'), cell: find(python, 'for mask in', 'prev = mask', 'dp[mask][j] = min'), close: find(python, 'return min(dp[full]'), ret: find(python, 'return min(dp[full]') };

function build({ d }: In): Step[] {
  const n = d.length;
  const m = n - 1;
  const full = (1 << m) - 1;
  const INF = 1e9;
  const dp: number[][] = Array.from({ length: 1 << m }, () => Array(n).fill(INF));
  const par: number[][] = Array.from({ length: 1 << m }, () => Array(n).fill(-1));
  const steps: Step[] = [];
  let cm = -1;
  let cj = -1;
  let srcs: [number, number][] = [];
  let best: number | string = '—';
  let tour: number[] = [];
  let lineNotes: string[] = [];
  let curEdge: [number, number] | null = null;
  let finalTotal: number | string = '—';
  const names = (mask: number) => `{${Array.from({ length: m }, (_, i) => i + 1).filter((c) => mask & (1 << (c - 1))).join(',')}}`;

  const snap = () => {
    const edges: GraphEdgeVM[] = [];
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        let state: EdgeState = 'default';
        const inTour = tour.length > 1 && tour.some((c, idx) => { const nx = tour[(idx + 1) % tour.length]; return (c === a && nx === b) || (c === b && nx === a); });
        if (inTour) state = 'chosen';
        else if (curEdge && ((curEdge[0] === a && curEdge[1] === b) || (curEdge[0] === b && curEdge[1] === a))) state = 'active';
        edges.push({ from: a, to: b, weight: d[a][b], state });
      }
    }
    return {
      scene: {
        kind: 'split' as const,
        parts: [
          {
            kind: 'graph' as const, layout: 'circle' as const, edges,
            nodes: Array.from({ length: n }, (_, id) => {
              let state: CellState | undefined;
              if (id === 0) state = 'sorted';
              else if (id === cj) state = 'active';
              else if (cm >= 0 && cm & (1 << (id - 1))) state = 'found';
              return { id, label: id, state };
            }),
          },
          {
            kind: 'grid' as const, variant: 'table' as const,
            rows: Array.from({ length: full }, (_, r) => {
              const mask = r + 1;
              return Array.from({ length: m }, (_, c) => {
                const j = c + 1;
                if (!(mask & (1 << c))) return gc(`${mask},${j}`, '×', 'dim');
                const v = dp[mask][j];
                let s: CellState | undefined;
                if (mask === cm && j === cj) s = 'active';
                else if (srcs.some(([a, b]) => a === mask && b === j)) s = 'compare';
                else if (v >= INF) s = 'dim';
                return gc(`${mask},${j}`, v >= INF ? '?' : v, s);
              });
            }),
            rowHeads: Array.from({ length: full }, (_, r) => names(r + 1)), colHeads: Array.from({ length: m }, (_, c) => `end ${c + 1}`),
          },
        ],
      },
      aux: [{ title: 'candidates for the last hop', kind: 'list' as const, items: [...lineNotes] }],
      vars: { mask: cm < 0 ? '—' : names(cm), end: cj < 0 ? '—' : cj, best, tour: finalTotal },
    };
  };
  const say = recorder(steps, snap);

  say({
    title: 'State = (cities visited, last city)', desc: `City 0 is home. dp[mask][j] = cheapest route that leaves 0, visits exactly the cities in mask (cities 1..${m}) and stops at j. There are ${1 << m} masks × ${m} end cities instead of ${m}! orders.`,
    logic: 'To extend a route only two facts matter: which cities are used up and where we stand. How we got there no longer matters.',
    java: J.def, py: P.def, algo: 0, tag: 'STATE —', note: `${1 << m} masks × ${m} end cities instead of ${m}! orders`,
  });
  for (let j = 1; j < n; j++) {
    dp[1 << (j - 1)][j] = d[0][j];
    par[1 << (j - 1)][j] = 0;
  }
  say({
    title: 'Base: go straight from 0 to j', desc: `For single-city masks the route is just 0 → j: dp[{j}][j] = d[0][j]. These are the first cells of every column.`,
    logic: 'Every longer route is built by extending one of these.', tone: 'success', java: J.base, py: P.base, algo: 1,
    tag: 'BASE CASE —', note: `dp[{j}][j] = d[0][j] = ${Array.from({ length: m }, (_, i) => d[0][i + 1]).join(', ')}`,
  });

  for (let mask = 1; mask <= full; mask++) {
    if (popcount(mask) < 2) continue;
    for (let j = 1; j < n; j++) {
      if (!(mask & (1 << (j - 1)))) continue;
      const prev = mask ^ (1 << (j - 1));
      cm = mask;
      cj = j;
      srcs = [];
      lineNotes = [];
      let bestV = INF;
      let bestI = -1;
      for (let i = 1; i < n; i++) {
        if (!(prev & (1 << (i - 1)))) continue;
        const v = dp[prev][i] + d[i][j];
        srcs.push([prev, i]);
        lineNotes.push(`via ${i}: dp[${names(prev)}][${i}] + d[${i}][${j}] = ${dp[prev][i]} + ${d[i][j]} = ${v}`);
        if (v < bestV) {
          bestV = v;
          bestI = i;
        }
      }
      dp[mask][j] = bestV;
      par[mask][j] = bestI;
      best = bestV;
      curEdge = [bestI, j];
      say({
        title: `dp[${names(mask)}][${j}] = ${bestV}`, desc: `Arrive at ${j} having visited ${names(mask)}. The hop before was from some i in ${names(prev)}; the cheapest is via ${bestI}: ${dp[prev][bestI]} + ${d[bestI][j]} = ${bestV}.`,
        logic: 'The cost of the earlier part is already minimal for (prev, i), so only the last hop is a free choice.', java: J.cell, py: P.cell, algo: 2,
        tag: `END ${j} —`, note: `dp[${names(mask)}][${j}] = min over i of dp[${names(prev)}][i] + d[i][${j}] = ${bestV} (via ${bestI})`,
      });
    }
  }

  cm = full;
  cj = -1;
  srcs = [];
  curEdge = null;
  lineNotes = [];
  let bestJ = -1;
  let total = INF;
  for (let j = 1; j < n; j++) {
    const v = dp[full][j] + d[j][0];
    lineNotes.push(`end ${j}: dp[all][${j}] + d[${j}][0] = ${dp[full][j]} + ${d[j][0]} = ${v}`);
    srcs.push([full, j]);
    if (v < total) {
      total = v;
      bestJ = j;
    }
  }
  best = total;
  curEdge = [bestJ, 0];
  say({
    title: 'Close the loop', desc: `With all cities visited, the route still has to return to 0. The cheapest total is ${total}, ending at city ${bestJ}.`,
    logic: 'Add the way home to each full-mask cell and take the minimum.', tone: 'success', java: J.close, py: P.close, algo: 3,
    tag: 'CLOSE LOOP —', note: `min over j of dp[all][j] + d[j][0] = ${total} (end ${bestJ})`,
  });

  // reconstruct
  const order: number[] = [];
  let mk = full;
  let jj = bestJ;
  while (jj > 0) {
    order.push(jj);
    const p = par[mk][jj];
    mk ^= 1 << (jj - 1);
    jj = p;
  }
  order.reverse();
  tour = [0, ...order];
  curEdge = null;
  srcs = [];
  finalTotal = total;
  cj = -1;
  say({
    title: 'Done', tag: '✅ Done!', note: `tour ${[...tour, 0].join('→')} costs ${total}`, desc: `Following the stored predecessors backwards gives the tour ${[...tour, 0].join(' → ')} with total cost ${total}.`,
    logic: 'Remembering which i won each cell lets us rebuild the route by walking back from the best full-mask cell.', tone: 'success', java: J.ret, py: P.ret, algo: 3,
    result: { title: String(total), text: `Cheapest tour: ${[...tour, 0].join(' → ')}` },
  });
  return steps;
}

function parse(raw: string): In {
  const rows = raw.split(';').map((r) => r.trim().split(/[\s,]+/).filter(Boolean).map(Number));
  const n = rows.length;
  if (n < 3 || n > 6) throw new Error('Give 3 to 6 rows (one per city), separated by ";", e.g. 0 10 15; 10 0 35; 15 35 0');
  for (const r of rows) {
    if (r.length !== n || r.some((v) => !Number.isInteger(v))) throw new Error(`Each row needs exactly ${n} whole numbers (a square matrix)`);
  }
  for (let i = 0; i < n; i++) {
    if (rows[i][i] !== 0) throw new Error('The diagonal must be 0 (no cost to stay in a city)');
    for (let j = 0; j < n; j++) {
      if (rows[i][j] !== rows[j][i]) throw new Error('Distances must be symmetric: d[i][j] = d[j][i]');
      if (i !== j && (rows[i][j] < 1 || rows[i][j] > 99)) throw new Error('Distances between cities must be between 1 and 99');
    }
  }
  return { d: rows };
}

export const travellingSalesmanBitmask: ProblemDef<In> = {
  slug: 'cp-travelling-salesman-bitmask-dp',
  id: 'CP', title: 'Travelling Salesman (Bitmask DP)', difficulty: 'Hard', category: 'Dynamic Programming', tag: 'Held–Karp bitmask',
  statement: 'Given the pairwise distances between n cities, find the length of the shortest round trip that starts at city 0, visits every other city exactly once, and returns to city 0.',
  constraints: '3 ≤ n ≤ 16 for Held–Karp; distances positive and symmetric (animation input: 3–6 cities, distances 1–99)',
  examples: [
    { label: '4 cities', input: { d: [[0, 10, 15, 20], [10, 0, 35, 25], [15, 35, 0, 30], [20, 25, 30, 0]] }, output: '80' },
    { label: '3 cities', input: { d: [[0, 5, 9], [5, 0, 4], [9, 4, 0]] }, output: '18' },
    { label: '5 cities', input: { d: [[0, 3, 4, 2, 7], [3, 0, 4, 6, 3], [4, 4, 0, 5, 8], [2, 6, 5, 0, 6], [7, 3, 8, 6, 0]] }, output: '19' },
  ],
  inputPlaceholder: 'matrix rows separated by ;, e.g. 0 10 15; 10 0 35; 15 35 0',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Cell / city being solved', state: 'active' }, { label: 'Cells it extends / visited cities', state: 'compare' }, { label: 'Start city', state: 'sorted' }, { label: 'Not applicable', state: 'dim' }],
  varLabels: ['mask', 'end', 'best', 'tour'],
  emphasis: ['shortest round trip', 'every other city exactly once'],
  phases: [
    { icon: '🧮', label: 'State = (mask, last city)', tone: 'blue' },
    { icon: '🌱', label: 'Base: 0 → j', tone: 'blue' },
    { icon: '🧭', label: 'Cheapest last hop', tone: 'cyan' },
    { icon: '✅', label: 'Close the loop, rebuild tour', tone: 'green' },
  ],
  approach: {
    title: 'Held–Karp: best route per (visited set, last city)',
    text: 'dp[mask][j] is the cheapest path from city 0 that visits exactly the cities in mask and ends at j. It equals the minimum over i in mask∖{j} of dp[mask∖{j}][i] + d[i][j]. After filling the table, close the loop by adding d[j][0] to each full-mask entry.',
  },
  java, python,
  algorithm: [
    'Fix city 0 as the start; a bitmask over the other cities records who is visited',
    'Base: dp[{j}][j] = d[0][j]',
    'For each mask and end j: dp[mask][j] = min over i of dp[mask∖{j}][i] + d[i][j]',
    'Answer = min over j of dp[all][j] + d[j][0]; follow predecessors to print the tour',
  ],
  complexity: [{ label: 'Time', value: 'O(2ⁿ · n²)' }, { label: 'Space', value: 'O(2ⁿ · n)' }],
  why: 'Any prefix of an optimal tour that visits a set S and ends at j must itself be the cheapest such path: if a cheaper path through the same set ending at j existed, splicing it in would shorten the tour. So only (S, j) matters, not the order inside S. There are 2ⁿ⁻¹·(n−1) such pairs, each combined from at most n−1 predecessors, which beats the (n−1)! orderings of brute force.',
};
