import type { Cell, CellState, ProblemDef, Step } from '../engine/types';

interface In { n: number }

function parse(raw: string): In {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 1 || n > 12) throw new Error('Enter a whole number from 1 to 12');
  return { n };
}

/** 1 define + 2 base cases + one step per stair from 3 up to n + 1 done (n = 6 → 8 steps). */
function build({ n }: In): Step[] {
  const dp: (number | null)[] = Array(n + 1).fill(null);
  dp[0] = 0;
  const steps: Step[] = [];

  const cells = (target?: number, sources: number[] = [], done = false): Cell[] =>
    dp.map((v, i) => {
      let state: CellState | undefined;
      if (i === target) state = done ? 'found' : 'active';
      else if (sources.includes(i)) state = 'compare';
      else if (v === null) state = 'dim';
      return { key: i, value: v === null ? '?' : v, state };
    });
  const vars = (i: number | string, a: number | string, b: number | string, cur: number | string) => ({ i, 'dp[i-2]': b, 'dp[i-1]': a, 'dp[i]': cur });
  const ptr = (i: number) => [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }];

  steps.push({
    title: 'Define the table', tag: 'DEFINE —',
    desc: `dp[i] = number of distinct ways to climb i stairs with 1 or 2 steps at a time. The goal is dp[${n}].`,
    cells: cells(), pointers: [], vars: vars('—', '—', '—', '—'),
    logic: 'To stand on stair i you came from stair i−1 (one step) or stair i−2 (two steps).', logicTone: 'info',
    javaLines: [0, 1, 2], pyLines: [0, 1, 2, 3], algoStep: 0, note: `dp[0..${n}] allocated, nothing known yet`,
  });

  for (let i = 1; i <= Math.min(2, n); i++) {
    dp[i] = i;
    steps.push({
      title: `Base case dp[${i}] = ${i}`, tag: 'BASE CASE —',
      desc: i === 1 ? 'dp[1] = 1: one stair has a single way, (1).' : 'dp[2] = 2: two stairs can be climbed as 1+1 or as 2.',
      cells: cells(i, [], true), pointers: ptr(i), vars: vars(i, '—', '—', i),
      logic: 'The first two values are known directly; every later value is built from them.', logicTone: 'success',
      javaLines: [3], pyLines: [3], algoStep: 1, note: `dp[${i}] = ${i}`,
    });
  }

  for (let i = 3; i <= n; i++) {
    const a = dp[i - 1]!;
    const b = dp[i - 2]!;
    dp[i] = a + b;
    steps.push({
      title: `Compute dp[${i}] = ${dp[i]}`, tag: 'RECURRENCE —',
      desc: `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${a} + ${b} = ${dp[i]}: ${a} ways end with a 1-step, ${b} end with a 2-step.`,
      cells: cells(i, [i - 1, i - 2]), pointers: ptr(i), vars: vars(i, a, b, dp[i]!),
      aux: [{ title: `LAST MOVE INTO STAIR ${i}`, kind: 'list', items: [`1 step from stair ${i - 1}: ${a} ways`, `2 steps from stair ${i - 2}: ${b} ways`, `total: ${dp[i]} ways`], highlight: 2 }],
      logic: `The two possible last moves lead to disjoint sets of paths, so the counts add: ${a} + ${b}. This is the Fibonacci sequence in disguise.`, logicTone: 'info',
      javaLines: [5, 4], pyLines: [5, 4], algoStep: 2, note: `i=${i}: ${a} + ${b} = ${dp[i]}`,
    });
  }

  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `dp[${n}] = ${dp[n]} → there are ${dp[n]} distinct ways to climb ${n} stair${n === 1 ? '' : 's'}.`,
    cells: cells(n, [], true), pointers: ptr(n), vars: vars(n, dp[n - 1] ?? '—', dp[n - 2] ?? '—', dp[n]!),
    logic: `${dp[n]} distinct ways to reach the top. Only the last two values were ever needed, so two variables can replace the table.`, logicTone: 'success',
    javaLines: [7], pyLines: [6], algoStep: 3, note: `return dp[${n}] = ${dp[n]}`,
    result: { title: String(dp[n]), text: `Ways to climb ${n} stair${n === 1 ? '' : 's'}` },
  });
  return steps;
}

export const climbingStairs: ProblemDef<In> = {
  slug: '70-climbing-stairs',
  id: '70', title: 'Climbing Stairs', difficulty: 'Easy', category: 'Dynamic Programming', tag: '1D DP',
  statement: 'You are climbing a staircase with n steps. Each time you may climb 1 or 2 steps. In how many distinct ways can you reach the top?',
  emphasis: ['distinct ways', '1 or 2 steps'],
  constraints: '1 ≤ n ≤ 45 (animation input is limited to 1–12)',
  examples: [
    { label: 'n = 6', input: { n: 6 }, output: '13', answer: '13 ways (dp = 1, 2, 3, 5, 8, 13)' },
    { label: 'n = 2', input: { n: 2 }, output: '2' },
    { label: 'n = 10', input: { n: 10 }, output: '89' },
  ],
  inputPlaceholder: 'e.g. 7',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Computing dp[i]', state: 'active' }, { label: 'Sources dp[i−1], dp[i−2]', state: 'compare' }, { label: 'Done', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['i', 'dp[i-2]', 'dp[i-1]', 'dp[i]'],
  phases: [
    { icon: '🧱', label: 'Define dp[i]', tone: 'blue' },
    { icon: '🌱', label: 'Base cases', tone: 'blue' },
    { icon: '🔁', label: 'Recurrence dp[i−1] + dp[i−2]', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Build up from smaller staircases',
    text: 'The last move was either a 1-step from stair i−1 or a 2-step from stair i−2, so dp[i] = dp[i−1] + dp[i−2]. Fill the table left to right.',
  },
  java: [
    'public int climbStairs(int n) {',
    '    if (n <= 2) return n;',
    '    int[] dp = new int[n + 1];',
    '    dp[1] = 1; dp[2] = 2;',
    '    for (int i = 3; i <= n; i++) {',
    '        dp[i] = dp[i - 1] + dp[i - 2];',
    '    }',
    '    return dp[n];',
    '}',
  ],
  python: [
    'def climb_stairs(n):',
    '    if n <= 2:',
    '        return n',
    '    dp = [0, 1, 2] + [0] * (n - 2)',
    '    for i in range(3, n + 1):',
    '        dp[i] = dp[i - 1] + dp[i - 2]',
    '    return dp[n]',
  ],
  algorithm: [
    'Define dp[i] as the number of ways to reach stair i',
    'Base cases: dp[1] = 1, dp[2] = 2',
    'For i ≥ 3: dp[i] = dp[i−1] + dp[i−2]',
    'Return dp[n]',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n), or O(1) with two variables' }],
  why: 'Every path to stair i ends with exactly one last move, and the two possible last moves lead to disjoint sets of paths, so the counts simply add. Only the previous two values are ever needed, so the table can shrink to two variables.',
};
