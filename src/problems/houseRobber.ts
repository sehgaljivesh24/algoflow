import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { parseInts, recorder } from './stepKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  return { nums: parseInts(raw, { what: 'house values', example: '2 7 9 3 1', minLen: 1, maxLen: 12, lo: 0, hi: 99 }) };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const dp: (number | null)[] = Array(n).fill(null);
  const steps: Step[] = [];
  let target = -1;
  let src: number[] = [];
  let done = false;
  let rob: number | string = '—';
  let skip: number | string = '—';

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: [
        nums.map((v, i): Cell => ({ key: `h${i}`, value: v, state: i === target ? 'active' : undefined })),
        dp.map((v, i): Cell => ({
          key: `d${i}`, value: v === null ? '?' : v,
          state: i === target ? (done ? 'found' : 'active') : src.includes(i) ? 'compare' : v === null ? 'dim' : undefined,
        })),
      ],
      rowHeads: ['house', 'best'], colHeads: nums.map((_, i) => String(i)),
    },
    vars: { i: target < 0 ? '—' : target, 'rob it': rob, 'skip it': skip, 'dp[i]': target >= 0 && dp[target] !== null ? dp[target]! : '—' },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', tag: 'DEFINE —',
    desc: `dp[i] = the most money from houses 0..i with no two neighbours robbed. Street: [${nums.join(', ')}].`,
    logic: 'At house i you either skip it (keep dp[i−1]) or rob it, which forces you to have skipped i−1 (dp[i−2] + nums[i]).',
    java: [0, 1, 3], py: [0, 1, 4], algo: 0, note: `dp[0..${n - 1}] empty, answer = dp[${n - 1}]`,
  });

  if (n === 1) {
    dp[0] = nums[0];
    target = 0;
    done = true;
    say({
      title: 'One house', tag: '✅ Done!', desc: `Only one house: rob it for ${nums[0]}.`,
      logic: 'With a single house there is no neighbour to worry about.', tone: 'success', java: [2], py: [2, 3], algo: 4,
      note: `return nums[0] = ${nums[0]}`,
      result: { title: String(nums[0]), text: 'Maximum amount you can rob' },
    });
    return steps;
  }

  dp[0] = nums[0];
  target = 0;
  done = true;
  say({
    title: `Base case dp[0] = ${nums[0]}`, tag: 'BASE CASE —', desc: `One house: the best haul is to rob it, dp[0] = nums[0] = ${nums[0]}.`,
    logic: 'The first value needs no earlier information.', tone: 'success', java: [4], py: [5], algo: 1, note: `dp[0] = nums[0] = ${nums[0]}`,
  });
  dp[1] = Math.max(nums[0], nums[1]);
  target = 1;
  src = [0];
  say({
    title: `Base case dp[1] = max(${nums[0]}, ${nums[1]}) = ${dp[1]}`, tag: 'BASE CASE —',
    desc: `Two adjacent houses: rob only the richer one, dp[1] = max(${nums[0]}, ${nums[1]}) = ${dp[1]}.`,
    logic: 'Robbing both would trip the alarm.', tone: 'success', java: [5], py: [6], algo: 1, note: `dp[1] = max(${nums[0]}, ${nums[1]}) = ${dp[1]}`,
  });

  for (let i = 2; i < n; i++) {
    rob = dp[i - 2]! + nums[i];
    skip = dp[i - 1]!;
    target = i;
    src = [i - 1, i - 2];
    done = false;
    say({
      title: `Rob or skip house ${i}?`, tag: 'COMPARE —',
      desc: `Rob house ${i}: dp[${i - 2}] + nums[${i}] = ${dp[i - 2]} + ${nums[i]} = ${rob}. Skip it: dp[${i - 1}] = ${skip}.`,
      logic: 'Compare the best total with this house against the best total without it.', java: [6, 7], py: [7, 8], algo: 2,
      note: `rob ${rob} vs skip ${skip}`,
    });
    dp[i] = Math.max(rob, skip);
    done = true;
    say({
      title: `dp[${i}] = ${dp[i]}`, tag: rob > skip ? 'ROB IT —' : 'SKIP IT —',
      desc: rob > skip ? `Robbing house ${i} wins (${rob} > ${skip}), so dp[${i}] = ${dp[i]}.` : `Skipping house ${i} is at least as good (${skip} ≥ ${rob}), so dp[${i}] = ${dp[i]}.`,
      logic: 'Keep the larger of the two plans.', tone: 'success', java: [7], py: [8], algo: 3,
      note: `dp[${i}] = max(${skip}, ${rob}) = ${dp[i]}`,
    });
  }

  rob = '—';
  skip = '—';
  src = [];
  target = n - 1;
  done = true;
  say({
    title: 'Done', tag: '✅ Done!', desc: `The maximum you can rob is dp[${n - 1}] = ${dp[n - 1]}; the last cell accounts for every house.`,
    logic: 'The last cell already accounts for every house.', tone: 'success', java: [9], py: [9],
    algo: 4, note: `return dp[${n - 1}] = ${dp[n - 1]}`, result: { title: String(dp[n - 1]), text: 'Maximum amount you can rob' },
  });
  return steps;
}

export const houseRobber: ProblemDef<In> = {
  slug: '198-house-robber',
  id: '198', title: 'House Robber', difficulty: 'Medium', category: 'Dynamic Programming', tag: '1D DP',
  statement: 'Houses along a street hold nums[i] dollars each. Robbing two adjacent houses sets off an alarm. Find the maximum you can rob in one night.',
  constraints: '1 ≤ nums.length ≤ 100, 0 ≤ nums[i] ≤ 400 (animation input: ≤ 12 values, 0–99)',
  examples: [
    { label: '[1, 2, 3, 1]', input: { nums: [1, 2, 3, 1] }, output: '4' },
    { label: '[2, 7, 9, 3, 1]', input: { nums: [2, 7, 9, 3, 1] }, output: '12' },
    { label: '[5, 1, 1, 5]', input: { nums: [5, 1, 1, 5] }, output: '10' },
  ],
  inputPlaceholder: 'e.g. 2 7 9 3 1',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current house', state: 'active' }, { label: 'Sources (i−1, i−2)', state: 'compare' }, { label: 'Computed', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['i', 'rob it', 'skip it', 'dp[i]'],
  emphasis: ['adjacent houses', 'maximum'],
  phases: [
    { icon: '🧱', label: 'Define dp[i]', tone: 'blue' },
    { icon: '🌱', label: 'Base cases', tone: 'blue' },
    { icon: '⚖️', label: 'Rob vs skip', tone: 'cyan' },
    { icon: '💾', label: 'Keep the larger', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Rob it or skip it',
    text: 'dp[i] = max(dp[i−1], dp[i−2] + nums[i]). Seed dp[0] = nums[0] and dp[1] = max(nums[0], nums[1]); the answer is the last entry.',
  },
  java: [
    'public int rob(int[] nums) {',
    '    int n = nums.length;',
    '    if (n == 1) return nums[0];',
    '    int[] dp = new int[n];',
    '    dp[0] = nums[0];',
    '    dp[1] = Math.max(nums[0], nums[1]);',
    '    for (int i = 2; i < n; i++) {',
    '        dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i]);',
    '    }',
    '    return dp[n - 1];',
    '}',
  ],
  python: [
    'def rob(nums):',
    '    n = len(nums)',
    '    if n == 1:',
    '        return nums[0]',
    '    dp = [0] * n',
    '    dp[0] = nums[0]',
    '    dp[1] = max(nums[0], nums[1])',
    '    for i in range(2, n):',
    '        dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])',
    '    return dp[n - 1]',
  ],
  algorithm: [
    'dp[i] is the best haul using houses 0..i',
    'Base cases: dp[0] = nums[0], dp[1] = max(nums[0], nums[1])',
    'For each later house compare robbing it (dp[i−2] + nums[i]) with skipping it (dp[i−1])',
    'Store the larger value in dp[i]',
    'Return dp[n−1]',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n), or O(1) with two variables' }],
  why: 'An optimal plan for houses 0..i either leaves house i alone, in which case it is an optimal plan for 0..i−1, or robs it, in which case house i−1 is untouched and the rest is an optimal plan for 0..i−2. These two cases cover every possibility, and the table stores the best for each prefix.',
};
