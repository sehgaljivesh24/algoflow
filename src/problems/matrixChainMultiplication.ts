import type { CellState, ProblemDef, Step, Tone } from '../engine/types.ts';
import { arr, find, gc, parseInts, recorder } from './dpAdvKit.ts';

interface In { dims: number[] }

const java = [
  'public int matrixChain(int[] d) {                  // matrix i has size d[i] x d[i+1]',
  '    int n = d.length - 1;',
  '    int[][] dp = new int[n][n];                    // dp[i][j]: fewest scalar multiplications for matrices i..j (0 when i == j)',
  '    for (int len = 2; len <= n; len++) {           // chain length, shortest first',
  '        for (int i = 0; i + len - 1 < n; i++) {',
  '            int j = i + len - 1;',
  '            dp[i][j] = Integer.MAX_VALUE;',
  '            for (int k = i; k < j; k++) {          // the last product is (i..k) x (k+1..j)',
  '                int cost = dp[i][k] + dp[k + 1][j] + d[i] * d[k + 1] * d[j + 1];',
  '                dp[i][j] = Math.min(dp[i][j], cost);',
  '            }',
  '        }',
  '    }',
  '    return dp[0][n - 1];',
  '}',
];
const python = [
  'def matrix_chain(d):                               # matrix i has size d[i] x d[i+1]',
  '    n = len(d) - 1',
  '    dp = [[0] * n for _ in range(n)]               # dp[i][j]: fewest scalar multiplications for matrices i..j',
  '    for length in range(2, n + 1):                 # chain length, shortest first',
  '        for i in range(n - length + 1):',
  '            j = i + length - 1',
  '            dp[i][j] = float("inf")',
  '            for k in range(i, j):                  # the last product is (i..k) x (k+1..j)',
  '                cost = dp[i][k] + dp[k + 1][j] + d[i] * d[k + 1] * d[j + 1]',
  '                dp[i][j] = min(dp[i][j], cost)',
  '    return dp[0][n - 1]',
];
const J = { def: find(java, 'int n = d.length', 'int[][] dp'), len: find(java, 'for (int len', 'for (int i = 0', 'int j = i + len', 'dp[i][j] = Integer.MAX_VALUE'), k: find(java, 'for (int k', 'int cost', 'dp[i][j] = Math.min'), ret: find(java, 'return dp[0][n - 1]') };
const P = { def: find(python, 'n = len(d) - 1', 'dp = [[0]'), len: find(python, 'for length', 'for i in', 'j = i + length', 'dp[i][j] = float'), k: find(python, 'for k in', 'cost =', 'dp[i][j] = min'), ret: find(python, 'return dp[0][n - 1]') };

function build({ dims }: In): Step[] {
  const n = dims.length - 1;
  const dp: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
  const split: number[][] = Array.from({ length: n }, () => Array(n).fill(-1));
  const steps: Step[] = [];
  let ci = -1;
  let cj = -1;
  let ck = -1;
  let done = false;
  let cand: number | string = '—';
  let cur: number | string = '—';
  let tries: string[] = [];
  let paren = '';
  const label = (i: number) => `A${i + 1}`;

  const snap = () => ({
    scene: {
      kind: 'split' as const,
      parts: [
        {
          kind: 'array' as const,
          cells: arr(Array.from({ length: n }, (_, i) => `${label(i)} ${dims[i]}×${dims[i + 1]}`),
            (i) => (ci >= 0 && ck >= 0 && i >= ci && i <= cj ? 'active' : undefined),
            (i) => (ci >= 0 && ck >= 0 && i >= ci && i <= ck ? ('blue' as Tone) : ci >= 0 && ck >= 0 && i > ck && i <= cj ? ('orange' as Tone) : undefined), 'm'),
          pointers: [],
        },
        {
          kind: 'grid' as const, variant: 'table' as const,
          rows: dp.map((row, i) => row.map((v, j) => {
            if (j < i) return gc(`${i},${j}`, '·', 'dim');
            let s: CellState | undefined;
            if (i === ci && j === cj) s = done ? 'found' : 'active';
            else if (ck >= 0 && ((i === ci && j === ck) || (i === ck + 1 && j === cj))) s = 'compare';
            else if (v === null) s = 'dim';
            return gc(`${i},${j}`, v === null ? '?' : v, s);
          })),
          rowHeads: Array.from({ length: n }, (_, i) => `from ${label(i)}`), colHeads: Array.from({ length: n }, (_, j) => `to ${label(j)}`),
        },
      ],
    },
    aux: [{ title: paren ? 'best parenthesisation' : ci >= 0 ? `splits of ${label(ci)}..${label(cj)}` : 'splits', kind: 'list' as const, items: paren ? [paren] : [...tries] }],
    vars: { i: ci < 0 ? '—' : ci, j: cj < 0 ? '—' : cj, k: ck < 0 ? '—' : ck, cost: cand, 'dp[i][j]': cur },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', desc: `${n} matrices: ${Array.from({ length: n }, (_, i) => `${label(i)} (${dims[i]}×${dims[i + 1]})`).join(', ')}. Multiplying a p×q by a q×r matrix costs p·q·r scalar multiplications. The order of bracketing changes the total, never the result. dp[i][j] = cheapest way to multiply A_i..A_j.`,
    logic: 'A single matrix costs nothing, so the diagonal is 0. Every longer chain ends with exactly one last product that splits it into a left and a right chain.',
    java: J.def, py: P.def, algo: 0, tag: 'DEFINE —', note: `dims = [${dims.join(', ')}], ${n} matrices, goal dp[0][${n - 1}]`,
  });
  for (let i = 0; i < n; i++) dp[i][i] = 0;
  say({
    title: 'Base: one matrix costs 0', desc: 'The diagonal is filled with 0; nothing is multiplied.',
    logic: 'Chains of length 1 are the foundation for all longer chains.', tone: 'success', java: J.def, py: P.def, algo: 1,
    tag: 'BASE CASE —', note: 'dp[i][i] = 0 for every single matrix',
  });

  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      ci = i;
      cj = j;
      done = false;
      tries = [];
      let best = Infinity;
      for (let k = i; k < j; k++) {
        ck = k;
        const mult = dims[i] * dims[k + 1] * dims[j + 1];
        const c = dp[i][k]! + dp[k + 1][j]! + mult;
        cand = c;
        const better = c < best;
        if (better) {
          best = c;
          split[i][j] = k;
        }
        dp[i][j] = best;
        cur = best;
        tries.push(`split after ${label(k)}: ${dp[i][k]} + ${dp[k + 1][j]} + ${dims[i]}×${dims[k + 1]}×${dims[j + 1]} = ${c}`);
        if (k === j - 1) done = true;
        say({
          title: `${label(i)}..${label(j)}, split after ${label(k)}`,
          desc: `(${label(i)}..${label(k)}) × (${label(k + 1)}..${label(j)}): left chain ${dp[i][k]} + right chain ${dp[k + 1][j]} + joining product ${dims[i]}×${dims[k + 1]}×${dims[j + 1]} = ${mult} → ${c}. ${better ? `New best: ${best}.` : `Best stays ${best}.`}`,
          logic: 'Each chain’s cost is already minimal, so only the last multiplication’s shape (outer dimensions of the two halves) is new information.', tone: better ? 'success' : 'info', java: J.k, py: P.k, algo: 2,
          tag: better ? `SPLIT k=${k} · BEST —` : `SPLIT k=${k} —`, note: `cost = ${dp[i][k]} + ${dp[k + 1][j]} + ${dims[i]}×${dims[k + 1]}×${dims[j + 1]} = ${c}; dp[${i}][${j}] = ${best}`,
        });
      }
    }
  }

  const render = (i: number, j: number): string => (i === j ? label(i) : `(${render(i, split[i][j])}${render(split[i][j] + 1, j)})`);
  paren = n === 1 ? label(0) : render(0, n - 1);
  ci = 0;
  cj = n - 1;
  ck = -1;
  done = true;
  cur = dp[0][n - 1]!;
  say({
    title: 'Done', tag: '✅ Done!', note: `return dp[0][${n - 1}] = ${dp[0][n - 1]}`, desc: `The cheapest order costs ${dp[0][n - 1]} scalar multiplications: ${paren}.`,
    logic: 'Remembering the winning split for every interval lets us rebuild the bracketing recursively.', tone: 'success', java: J.ret, py: P.ret, algo: 3,
    result: { title: String(dp[0][n - 1]), text: `Order ${paren}` },
  });
  return steps;
}

export const matrixChainMultiplication: ProblemDef<In> = {
  slug: 'gfg-matrix-chain-multiplication',
  id: 'GFG', title: 'Matrix Chain Multiplication', difficulty: 'Hard', category: 'Dynamic Programming', tag: 'interval DP · min over splits',
  statement: 'Matrix i has dimensions d[i] × d[i+1]. Multiplying a p×q matrix by a q×r matrix costs p·q·r scalar multiplications. Choose the bracketing of the chain that minimises the total cost and return that cost.',
  constraints: '2 ≤ d.length ≤ 100, 1 ≤ d[i] ≤ 500 (animation input: 3–7 dimensions, values 1–50)',
  examples: [
    { label: '40 20 30 10 30', input: { dims: [40, 20, 30, 10, 30] }, output: '26000' },
    { label: '10 30 5 60', input: { dims: [10, 30, 5, 60] }, output: '4500' },
    { label: '5 10 3 12 5 50', input: { dims: [5, 10, 3, 12, 5, 50] }, output: '1655' },
  ],
  inputPlaceholder: 'dimensions, e.g. 10 30 5 60',
  parseInput: (raw) => ({ dims: parseInts(raw, { what: 'the dimensions', example: '10 30 5 60', minLen: 3, maxLen: 7, lo: 1, hi: 50 }) }),
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Chain being solved', state: 'active' }, { label: 'Left and right sub-chains', state: 'compare' }, { label: 'Finished chain', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['i', 'j', 'k', 'cost', 'dp[i][j]'],
  emphasis: ['bracketing', 'minimises the total cost'],
  phases: [
    { icon: '🧱', label: 'Define dp[i][j]', tone: 'blue' },
    { icon: '🌱', label: 'Base: one matrix = 0', tone: 'blue' },
    { icon: '✂️', label: 'Try every split k', tone: 'cyan' },
    { icon: '✅', label: 'Done: rebuild brackets', tone: 'green' },
  ],
  approach: {
    title: 'Try every position for the last multiplication',
    text: 'For the chain i..j, the final product multiplies a left chain i..k by a right chain k+1..j. That product costs d[i]·d[k+1]·d[j+1], plus the best costs of the two chains. Take the cheapest k, filling the table by increasing chain length.',
  },
  java, python,
  algorithm: [
    'dp[i][i] = 0; dp[i][j] = cheapest cost to multiply matrices i..j',
    'Handle chains in increasing length',
    'For each split k: dp[i][k] + dp[k+1][j] + d[i]·d[k+1]·d[j+1]',
    'Keep the minimum (and its k); answer is dp[0][n−1]',
  ],
  complexity: [{ label: 'Time', value: 'O(n³)' }, { label: 'Space', value: 'O(n²)' }],
  why: 'Every bracketing has a last product that splits the chain into two contiguous halves, and the two halves are bracketed independently. If either half were not bracketed optimally, replacing it with a cheaper bracketing would lower the total without changing the other half or the last product (its cost depends only on the outer dimensions), so optimal solutions use optimal halves. Trying every split point and shorter chains first therefore finds the optimum.',
};
