import type { ProblemDef, Step } from '../engine/types.ts';
import { capSteps, recorder } from './stepKit.ts';
import { rowCells } from './dpCoreKit.ts';

interface In { n: number }

function parse(raw: string): In {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 1 || n > 24) throw new Error('Enter a whole number n from 1 to 24, e.g. 13');
  return capSteps(build, { n });
}

function build({ n }: In): Step[] {
  const INF = n + 1;
  const dp: (number | null)[] = Array(n + 1).fill(null);
  const parent: number[] = Array(n + 1).fill(0);
  const squares: number[] = [];
  for (let s = 1; s * s <= n; s++) squares.push(s * s);
  const steps: Step[] = [];
  let i = -1;
  let from = -1;
  let sq: number | string = '—';
  let cand: number | string = '—';
  let done = false;
  let chain: number[] = [];

  const snap = () => ({
    cells: rowCells('i', dp.map((v) => (v === INF ? '∞' : v)), (k) => (chain.includes(k) && done && k !== i ? 'found' : k === i ? (done ? 'found' : 'active') : k === from ? 'compare' : undefined)),
    pointers: [
      ...(i >= 0 ? [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }] : []),
      ...(from >= 0 ? [{ id: 'f', label: `i−${sq}`, index: from, tone: 'orange' as const }] : []),
    ],
    aux: [{ title: 'perfect squares ≤ n (the "coins")', kind: 'list' as const, items: squares.map(String), highlight: typeof sq === 'number' ? squares.indexOf(sq) : undefined }],
    vars: { i: i < 0 ? '—' : i, square: sq, 'dp[i-sq]+1': cand, 'dp[i]': i < 0 || dp[i] === null ? '—' : dp[i] === INF ? '∞' : dp[i]! },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Squares are the coins', desc: `dp[i] = the fewest perfect squares that add up to i. The usable "coins" are ${squares.join(', ')} — each can be used any number of times.`,
    logic: 'This is an unbounded knapsack whose item list is implicit: every square not larger than n.', java: [0, 1], py: [0, 1], algo: 0,
    tag: 'DEFINE —', note: `squares ≤ ${n}: ${squares.join(', ')}; target dp[${n}]`,
  });

  dp[0] = 0;
  i = 0;
  done = true;
  say({
    title: 'Base case dp[0] = 0', desc: 'Zero squares are needed to make 0, so dp[0] = 0.', logic: 'Every chain of subtractions ends here.', tone: 'success', java: [3], py: [2], algo: 1,
    tag: 'BASE CASE —', note: 'dp[0] = 0',
  });

  for (let x = 1; x <= n; x++) {
    dp[x] = INF;
    i = x;
    done = false;
    for (let s = 1; s * s <= x; s++) {
      sq = s * s;
      from = x - s * s;
      const prev = dp[from]!;
      cand = prev + 1;
      const better = prev + 1 < dp[x]!;
      const was = dp[x]!;
      if (better) {
        dp[x] = prev + 1;
        parent[x] = s * s;
      }
      done = s * s + 2 * s + 1 > x;
      say({
        title: `i = ${x}, try ${sq}`, desc: `dp[${from}] + 1 = ${prev} + 1 = ${prev + 1}. ${better ? `Better than before: dp[${x}] = ${dp[x]}.` : `Not better than the current ${dp[x]}.`}${done ? ` That was the last square that fits, so dp[${x}] = ${dp[x]} is final.` : ''}`,
        logic: 'Try every square as the last piece and keep the smallest count.', tone: better ? 'success' : 'info', java: [5, 6], py: [5, 6], algo: 2,
        tag: better ? `BEST SQUARE ${sq} —` : `TRY ${sq} —`, note: `dp[${x}] = min(${was >= INF ? '∞' : was}, dp[${from}] + 1 = ${prev + 1}) = ${dp[x]}`,
      });
    }
    from = -1;
    sq = '—';
    cand = '—';
  }

  i = n;
  from = -1;
  sq = '—';
  cand = '—';
  done = true;
  const parts: number[] = [];
  let r = n;
  while (r > 0) {
    parts.push(parent[r]);
    r -= parent[r];
  }
  chain = [];
  r = n;
  while (r > 0) {
    chain.push(r);
    r -= parent[r];
  }
  say({
    title: 'Done', tag: '✅ Done!', note: `return dp[${n}] = ${dp[n]}`, desc: `${n} = ${parts.join(' + ')} uses ${dp[n]} perfect square${dp[n] === 1 ? '' : 's'}.`,
    logic: 'Following the best last square back to 0 recovers one optimal decomposition.', tone: 'success', java: [9], py: [8], algo: 3,
    result: { title: String(dp[n]), text: `${n} = ${parts.join(' + ')}` },
  });
  return steps;
}

export const perfectSquares: ProblemDef<In> = {
  slug: '279-perfect-squares',
  id: '279', title: 'Perfect Squares', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'unbounded knapsack (squares as coins)',
  statement: 'Given a positive integer n, return the fewest perfect squares (1, 4, 9, 16, …) whose sum is exactly n. A square may be used repeatedly.',
  constraints: '1 ≤ n ≤ 10⁴ (animation input: 1 ≤ n ≤ 24)',
  examples: [
    { label: 'n = 12', input: { n: 12 }, output: '3' },
    { label: 'n = 13', input: { n: 13 }, output: '2' },
    { label: 'n = 23', input: { n: 23 }, output: '4' },
  ],
  inputPlaceholder: 'a number n, e.g. 13',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizCaption: 'dp[i] — fewest squares summing to i',
  legend: [{ label: 'Value being solved', state: 'active' }, { label: 'i − square (sub-problem)', state: 'compare' }, { label: 'Final value / answer chain', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['i', 'square', 'dp[i-sq]+1', 'dp[i]'],
  emphasis: ['fewest perfect squares', 'used repeatedly'],
  phases: [
    { icon: '🟦', label: 'Squares are the coins', tone: 'blue' },
    { icon: '🌱', label: 'Base dp[0] = 0', tone: 'blue' },
    { icon: '➕', label: 'Try every square as last piece', tone: 'cyan' },
    { icon: '✅', label: 'Done: rebuild the sum', tone: 'green' },
  ],
  approach: {
    title: 'Coin change where the coins are the squares',
    text: 'dp[0] = 0. For each i from 1 to n, try every square s·s ≤ i as the last piece: dp[i] = min(dp[i], dp[i − s·s] + 1). The answer is dp[n]; remembering the best last square lets you print the actual sum.',
  },
  java: [
    'public int numSquares(int n) {',
    '    int[] dp = new int[n + 1];',
    '    Arrays.fill(dp, Integer.MAX_VALUE);',
    '    dp[0] = 0;',
    '    for (int i = 1; i <= n; i++) {',
    '        for (int s = 1; s * s <= i; s++) {',
    '            dp[i] = Math.min(dp[i], dp[i - s * s] + 1);',
    '        }',
    '    }',
    '    return dp[n];',
    '}',
  ],
  python: [
    'def num_squares(n):',
    '    dp = [float("inf")] * (n + 1)',
    '    dp[0] = 0',
    '    for i in range(1, n + 1):',
    '        s = 1',
    '        while s * s <= i:',
    '            dp[i] = min(dp[i], dp[i - s * s] + 1)',
    '            s += 1',
    '    return dp[n]',
  ],
  algorithm: [
    'dp[i] = fewest squares that sum to i; the squares ≤ n are the available coins',
    'Base case: dp[0] = 0',
    'For each i and each square s² ≤ i: dp[i] = min(dp[i], dp[i − s²] + 1)',
    'Return dp[n]',
  ],
  complexity: [{ label: 'Time', value: 'O(n √n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'In an optimal decomposition of i, remove any one square s²: what remains is a decomposition of i − s² and it must itself be optimal (otherwise replace it by a shorter one and improve i). So dp[i] is 1 plus the best dp[i − s²] over all squares, and every smaller index is already final because we fill left to right. Lagrange\'s four-square theorem guarantees the answer never exceeds 4.',
};
