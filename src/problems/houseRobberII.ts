import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { parseInts, recorder } from './stepKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  return { nums: parseInts(raw, { what: 'house values', example: '2 3 2', minLen: 1, maxLen: 10, lo: 0, hi: 99 }) };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const dpA: (number | null)[] = Array(n).fill(null); // houses 0..n-2
  const dpB: (number | null)[] = Array(n).fill(null); // houses 1..n-1
  const steps: Step[] = [];
  let pass: 'A' | 'B' | '' = '';
  let target = -1;
  let src: number[] = [];
  let done = false;
  let rob: number | string = '—';
  let skip: number | string = '—';
  let bestA = -1;
  let bestB = -1;

  const lineCells = (dp: (number | null)[], lo: number, hi: number, tag: string, mine: boolean): Cell[] =>
    dp.map((v, i): Cell => {
      const key = `${tag}${i}`;
      if (i < lo || i > hi) return { key, value: '—', state: 'dim' };
      if (mine && i === target) return { key, value: v === null ? '?' : v, state: done ? 'found' : 'active' };
      if (mine && src.includes(i)) return { key, value: v === null ? '?' : v, state: 'compare' };
      return { key, value: v === null ? '?' : v, state: v === null ? 'dim' : undefined };
    });
  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: [
        nums.map((v, i): Cell => ({ key: `h${i}`, value: v, state: i === target && pass ? 'active' : undefined })),
        lineCells(dpA, 0, n - 2, 'a', pass === 'A'),
        lineCells(dpB, 1, n - 1, 'b', pass === 'B'),
      ],
      rowHeads: ['house', 'A: skip last', 'B: skip first'], colHeads: nums.map((_, i) => String(i)),
    },
    vars: { i: target < 0 ? '—' : target, 'rob it': rob, 'skip it': skip, 'best A': bestA < 0 ? '—' : bestA, 'best B': bestB < 0 ? '—' : bestB },
  });
  const say = recorder(steps, snap);

  say({
    title: 'The street is a circle', tag: 'SETUP',
    desc: `houses 0 and ${n - 1} are neighbours on the circle, so solve two straight streets (0..${n - 2} and 1..${n - 1}) and take the better one`,
    alert: n > 1 ? `Houses 0 (${nums[0]}) and ${n - 1} (${nums[n - 1]}) touch, so they cannot both be robbed.` : undefined,
    logic: 'Any valid plan leaves out house 0 or leaves out house n−1 (or both). Plan A drops the last house, plan B drops the first.',
    java: [0, 1, 2], py: [0, 1, 2, 3], algo: 0, note: `n = ${n}, houses = [${nums.join(', ')}]`,
  });

  if (n === 1) {
    target = 0;
    done = true;
    say({
      title: 'One house', tag: '✅ Done!', desc: `a single house has no neighbour, so rob it for ${nums[0]}`,
      logic: 'The circular rule only matters with two or more houses.', tone: 'success', java: [2], py: [2, 3], algo: 3, note: `n == 1 → return nums[0] = ${nums[0]}`,
      result: { title: String(nums[0]), text: 'Maximum amount you can rob' },
    });
    return steps;
  }

  const runLine = (which: 'A' | 'B', lo: number, hi: number) => {
    const dp = which === 'A' ? dpA : dpB;
    pass = which;
    for (let i = lo; i <= hi; i++) {
      const p1 = i - 1 >= lo ? dp[i - 1]! : 0;
      const p2 = i - 2 >= lo ? dp[i - 2]! : 0;
      rob = p2 + nums[i];
      skip = p1;
      target = i;
      src = [i - 1, i - 2].filter((k) => k >= lo);
      dp[i] = Math.max(rob, skip);
      done = true;
      say({
        title: `Plan ${which}: dp[${i}] = max(${skip}, ${rob}) = ${dp[i]}`, tag: `PLAN ${which}`,
        desc: `house ${i} (${nums[i]}): skip it → ${skip}, rob it → ${p2} + ${nums[i]} = ${rob}, so keep ${dp[i]}`,
        alert: Number(skip) > Number(rob) ? `Robbing house ${i} gives ${rob}, less than skipping (${skip}), so the house is passed over.` : undefined,
        logic: 'Same rob-or-skip rule as the straight street, but only inside this plan\'s range of houses.',
        java: [7, 8, 9], py: [6, 7, 8], algo: which === 'A' ? 1 : 2, note: `cur = max(prev1 = ${skip}, prev2 + ${nums[i]} = ${rob}) = ${dp[i]}`,
      });
    }
    const best = dp[hi]!;
    if (which === 'A') bestA = best; else bestB = best;
    src = [];
    target = hi;
    say({
      title: `Plan ${which} total = ${best}`, tag: `PLAN ${which}`, desc: `the last cell of plan ${which} (houses ${lo}..${hi}) holds its best haul: ${best}`,
      logic: 'Plan results are compared at the end.', tone: 'success', java: [11], py: [9], algo: which === 'A' ? 1 : 2, note: `robLine(${lo}, ${hi}) = ${best}`,
    });
  };
  runLine('A', 0, n - 2);
  if (n >= 2) {
    // n === 2: plan A is just house 0
    runLine('B', 1, n - 1);
  }

  pass = '';
  rob = '—';
  skip = '—';
  const ans = Math.max(bestA, bestB);
  target = -1;
  say({
    title: 'Done', tag: '✅ Done!', desc: `max(plan A, plan B) = max(${bestA}, ${bestB}) = ${ans}, the most you can rob`,
    logic: 'The better of the two straight streets is the best circular plan.', tone: 'success', java: [3], py: [3], note: `max(${bestA}, ${bestB}) = ${ans}`,
    algo: 3, result: { title: String(ans), text: 'Maximum amount you can rob (circular street)' },
  });
  return steps;
}

export const houseRobberII: ProblemDef<In> = {
  slug: '213-house-robber-ii',
  id: '213', title: 'House Robber II', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'circular DP',
  statement: 'The houses now form a circle, so the first and last houses are adjacent. You still cannot rob two adjacent houses. Return the maximum you can rob.',
  constraints: '1 ≤ nums.length ≤ 100, 0 ≤ nums[i] ≤ 1000 (animation input: ≤ 10 values, 0–99)',
  examples: [
    { label: '[2, 3, 2]', input: { nums: [2, 3, 2] }, output: '3' },
    { label: '[1, 2, 3, 1]', input: { nums: [1, 2, 3, 1] }, output: '4' },
    { label: '[4, 1, 2, 9, 3, 7]', input: { nums: [4, 1, 2, 9, 3, 7] }, output: '16' },
  ],
  inputPlaceholder: 'e.g. 2 3 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current house', state: 'active' }, { label: 'Sources (i−1, i−2)', state: 'compare' }, { label: 'Computed', state: 'found' }, { label: 'Not in this plan / not yet', state: 'dim' }],
  varLabels: ['i', 'rob it', 'skip it', 'best A', 'best B'],
  emphasis: ['first and last houses are adjacent', 'maximum you can rob'],
  phases: [
    { icon: '⭕', label: 'SETUP break the circle', tone: 'blue' },
    { icon: '🅰', label: 'PLAN A (skip last)', tone: 'cyan' },
    { icon: '🅱', label: 'PLAN B (skip first)', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Break the circle, solve two lines',
    text: 'Run the straight-street House Robber DP twice: once on houses 0..n−2 and once on 1..n−1. The answer is the larger of the two. (A single house is a special case.)',
  },
  java: [
    'public int rob(int[] nums) {',
    '    int n = nums.length;',
    '    if (n == 1) return nums[0];',
    '    return Math.max(robLine(nums, 0, n - 2), robLine(nums, 1, n - 1));',
    '}',
    'int robLine(int[] nums, int lo, int hi) {',
    '    int prev2 = 0, prev1 = 0;',
    '    for (int i = lo; i <= hi; i++) {',
    '        int cur = Math.max(prev1, prev2 + nums[i]);',
    '        prev2 = prev1; prev1 = cur;',
    '    }',
    '    return prev1;',
    '}',
  ],
  python: [
    'def rob(nums):',
    '    if len(nums) == 1:',
    '        return nums[0]',
    '    return max(rob_line(nums[:-1]), rob_line(nums[1:]))',
    '',
    'def rob_line(nums):',
    '    prev2 = prev1 = 0',
    '    for x in nums:',
    '        prev2, prev1 = prev1, max(prev1, prev2 + x)',
    '    return prev1',
  ],
  algorithm: [
    'Handle n = 1 directly; otherwise the first and last houses clash',
    'Plan A: best haul on houses 0..n−2 (rob-or-skip DP)',
    'Plan B: best haul on houses 1..n−1',
    'Return the larger of the two plans',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1) with rolling variables (the table is only for the picture)' }],
  why: 'In a valid circular plan the first and last houses are never both robbed, so the plan fits entirely inside houses 0..n−2 or entirely inside 1..n−1. Each of those is an ordinary straight street, solved optimally by the same recurrence, so the maximum of the two covers every legal plan.',
};
