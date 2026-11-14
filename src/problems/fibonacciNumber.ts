import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { recorder } from './stepKit.ts';

interface In { n: number }

function parse(raw: string): In {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 0 || n > 15) throw new Error('Enter a whole number from 0 to 15');
  return { n };
}

function build({ n }: In): Step[] {
  const dp: (number | null)[] = Array(n + 1).fill(null);
  const steps: Step[] = [];
  let target = -1;
  let sources: number[] = [];
  let done = false;
  let a: number | string = '—';
  let b: number | string = '—';

  const snap = () => ({
    cells: dp.map((v, i): Cell => {
      let state: CellState | undefined;
      if (i === target) state = done ? 'found' : 'active';
      else if (sources.includes(i)) state = 'compare';
      else if (v === null) state = 'dim';
      return { key: i, value: v === null ? '?' : v, state };
    }),
    pointers: target >= 0 ? [{ id: 'i', label: 'i', index: target, tone: 'blue' as const }] : [],
    vars: { i: target < 0 ? '—' : target, 'dp[i-1]': a, 'dp[i-2]': b },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', tag: 'DEFINE —', desc: `dp[i] is the i-th Fibonacci number: a table of ${n + 1} cells, F(0) = 0, F(1) = 1, and each later cell is the sum of the two before it.`,
    logic: 'Instead of recomputing the same values with recursion, store each one once in a table and reuse it.',
    java: [0, 2], py: [0, 3], algo: 0, note: `dp = new int[${n + 1}]`,
  });

  for (let i = 0; i <= Math.min(1, n); i++) {
    dp[i] = i;
    target = i;
    sources = [];
    done = true;
    say({
      title: `Base case dp[${i}] = ${i}`, tag: 'BASE:', desc: `dp[${i}] = ${i} by definition, so F(${i}) = ${i} is known without any addition.`,
      logic: 'The recurrence needs two known starting values.', tone: 'success', java: [1, 3], py: [1, 2, 3], algo: 1, note: `dp[${i}] = ${i}`,
    });
  }

  for (let i = 2; i <= n; i++) {
    a = dp[i - 1]!;
    b = dp[i - 2]!;
    target = i;
    sources = [i - 1, i - 2];
    done = false;
    say({
      title: `Compute dp[${i}]`, tag: 'COMPUTE:', desc: `read dp[${i - 1}] = ${a} and dp[${i - 2}] = ${b}; their sum ${a + b} is the next Fibonacci number.`,
      logic: 'Each Fibonacci number is the sum of the two before it.', java: [4, 5], py: [4, 5], algo: 2, note: `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${a} + ${b}`,
    });
    dp[i] = a + b;
    sources = [];
    done = true;
    say({
      title: `dp[${i}] = ${dp[i]}`, tag: 'STORE:', desc: `write F(${i}) = ${dp[i]} into dp[${i}] so the next cells can reuse it.`,
      logic: 'Stored for the next step to reuse.', tone: 'success', java: [5], py: [5], algo: 2, note: `dp[${i}] = ${dp[i]}`,
    });
  }

  a = '—';
  b = '—';
  target = n;
  sources = [];
  done = true;
  say({
    title: 'Done', tag: '✅ Done!', desc: `the table is full and F(${n}) = ${dp[n]} is the last cell, so that is the answer.`,
    logic: 'Only the last two values are ever read, so the table could be shrunk to two variables.', tone: 'success',
    java: [7], py: [6], algo: 3, note: `return dp[${n}] = ${dp[n]}`,
    result: { title: String(dp[n]), text: `Fibonacci number F(${n})` },
  });
  return steps;
}

export const fibonacciNumber: ProblemDef<In> = {
  slug: '509-fibonacci-number',
  id: '509', title: 'Fibonacci Number', difficulty: 'Easy', category: 'Dynamic Programming', tag: 'DP base',
  statement: 'The Fibonacci numbers start with F(0) = 0 and F(1) = 1, and F(n) = F(n−1) + F(n−2) for n > 1. Given n, return F(n).',
  constraints: '0 ≤ n ≤ 30 (animation input is limited to 0–15)',
  examples: [
    { label: 'n = 6', input: { n: 6 }, output: '8', answer: '8 (the sequence runs 0, 1, 1, 2, 3, 5, 8)' },
    { label: 'n = 2', input: { n: 2 }, output: '1' },
    { label: 'n = 12', input: { n: 12 }, output: '144' },
  ],
  inputPlaceholder: 'e.g. 8',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Computing', state: 'active' }, { label: 'Sources (previous two)', state: 'compare' }, { label: 'Done', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['i', 'dp[i-1]', 'dp[i-2]'],
  approach: {
    title: 'Fill a table from the bottom up',
    text: 'Naive recursion repeats the same sub-problems exponentially often. Store F(0) and F(1), then fill dp[i] = dp[i−1] + dp[i−2] left to right and return dp[n].',
  },
  java: [
    'public int fib(int n) {',
    '    if (n <= 1) return n;',
    '    int[] dp = new int[n + 1];',
    '    dp[0] = 0; dp[1] = 1;',
    '    for (int i = 2; i <= n; i++) {',
    '        dp[i] = dp[i - 1] + dp[i - 2];',
    '    }',
    '    return dp[n];',
    '}',
  ],
  python: [
    'def fib(n):',
    '    if n <= 1:',
    '        return n',
    '    dp = [0, 1] + [0] * (n - 1)',
    '    for i in range(2, n + 1):',
    '        dp[i] = dp[i - 1] + dp[i - 2]',
    '    return dp[n]',
  ],
  phases: [
    { icon: '🧱', label: 'Create table', tone: 'blue' },
    { icon: '🌱', label: 'Base cases', tone: 'cyan' },
    { icon: '➕', label: 'Fill dp[i] = dp[i−1] + dp[i−2]', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['F(0) = 0', 'F(1) = 1', 'F(n) = F(n−1) + F(n−2)'],
  algorithm: [
    'Create a table dp of size n + 1',
    'Set the base cases dp[0] = 0 and dp[1] = 1',
    'For i from 2 to n: dp[i] = dp[i−1] + dp[i−2]',
    'Done: return dp[n]',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n), or O(1) with two variables' }],
  why: 'The definition itself is the recurrence, and dp[i] depends only on smaller indexes, so filling left to right guarantees both inputs are ready. Each value is computed once, turning the exponential recursion tree into a linear scan.',
};
