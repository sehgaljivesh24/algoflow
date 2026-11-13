import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { at, heads, inList, parseInts, recorder } from './stepKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = parseInts(raw, { what: 'numbers', example: '1 5 11 5', minLen: 1, maxLen: 6, lo: 1, hi: 24 });
  if (nums.reduce((a, b) => a + b, 0) > 24) throw new Error('Keep the total sum at most 24 so the table stays readable');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const total = nums.reduce((a, b) => a + b, 0);
  const odd = total % 2 !== 0;
  const target = odd ? 0 : total / 2;
  const dp: (boolean | null)[][] = Array.from({ length: n + 1 }, () => Array(target + 1).fill(null));
  const steps: Step[] = [];
  let cur: [number, number] | null = null;
  let src: [number, number][] = [];
  let done = false;
  let skip: string = '—';
  let take: string = '—';
  let showTable = !odd;

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: showTable
        ? dp.map((row, r) => row.map((v, c): Cell => ({
          key: `${r},${c}`, value: v === null ? '?' : v ? 'T' : 'F',
          state: at(cur, r, c) ? (done ? 'found' : 'active') : inList(src, r, c) ? 'compare' : v === null ? 'dim' : undefined,
          tone: v ? 'green' : undefined,
        })))
        : [nums.map((v, i): Cell => ({ key: `n${i}`, value: v, state: 'active' }))],
      rowHeads: showTable ? ['no items', ...nums.map((x) => `+${x}`)] : undefined,
      colHeads: showTable ? heads(target + 1) : nums.map((_, i) => String(i)),
    },
    vars: { item: cur && cur[0] > 0 ? nums[cur[0] - 1] : '—', sum: cur ? cur[1] : '—', skip, take },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Total and target', tag: 'TARGET —', desc: `The numbers sum to ${total}. We need two groups with equal sums, so each must be ${odd ? `${total} / 2 — impossible for an odd total` : total / 2}.`,
    logic: 'Splitting into two equal halves is the same question as: does some subset add up to exactly half the total?',
    java: [0, 1, 2, 3], py: [0, 1, 2, 3, 4], algo: 0, note: odd ? `${total} % 2 = 1 → odd` : `target = ${total} / 2 = ${total / 2}`,
  });

  if (odd) {
    say({
      title: 'Odd total: impossible', tag: '❌ Impossible!', note: `${total} % 2 = 1 → return false`, alert: `Total ${total} is odd: two equal whole-number halves cannot exist.`,
      desc: `${total} is odd, so it cannot be split into two equal whole-number halves.`,
      logic: 'Check the parity first: it settles the answer without any table.', tone: 'warn', java: [2], py: [2, 3], algo: 0,
      result: { title: 'false', text: `Total ${total} is odd` },
    });
    return steps;
  }

  dp[0][0] = true;
  for (let s = 1; s <= target; s++) dp[0][s] = false;
  cur = [0, 0];
  done = true;
  say({
    title: 'Base row', tag: 'BASE ROW —', desc: 'dp[i][s] = true if some subset of the first i numbers sums to exactly s. With no numbers only sum 0 is possible: dp[0][0] = T, the rest F.',
    logic: 'The empty subset makes sum 0; nothing else is reachable yet.', tone: 'success', java: [4, 5], py: [5, 6], algo: 1, note: 'dp[0][0] = true, dp[0][s>0] = false',
  });

  for (let i = 1; i <= n; i++) {
    const x = nums[i - 1];
    for (let s = 0; s <= target; s++) {
      cur = [i, s];
      done = false;
      const skipV = dp[i - 1][s]!;
      const canTake = s >= x;
      const takeV = canTake ? dp[i - 1][s - x]! : false;
      src = [[i - 1, s], ...(canTake ? [[i - 1, s - x] as [number, number]] : [])];
      skip = skipV ? 'T' : 'F';
      take = canTake ? (takeV ? 'T' : 'F') : 'n/a';
      dp[i][s] = skipV || takeV;
      done = true;
      say({
        title: `Item ${x}, sum ${s}: ${dp[i][s] ? 'T' : 'F'}`, tag: dp[i][s] ? 'REACHABLE —' : 'NOT REACHABLE —',
        desc: `Skip ${x}: dp[${i - 1}][${s}] = ${skip}. Take ${x}: ${canTake ? `dp[${i - 1}][${s - x}] = ${take}` : `needs sum ≥ ${x}`}. ${dp[i][s] ? 'At least one works → T.' : 'Neither works → F.'}`,
        logic: 'A sum s is reachable with the first i numbers if it was reachable without number i, or s − nums[i] was.', tone: dp[i][s] ? 'success' : 'info',
        java: [6, 7, 8, 9], py: [7, 8, 9, 10, 11], algo: 2,
        note: `dp[${i}][${s}] = ${skip} OR ${canTake ? take : 'n/a'} = ${dp[i][s] ? 'T' : 'F'}`,
      });
    }
  }

  cur = [n, target];
  src = [];
  skip = take = '—';
  done = true;
  const ok = dp[n][target]!;
  say({
    title: 'Done', tag: ok ? '✅ Done!' : '❌ No split!', note: `return dp[${n}][${target}] = ${ok}`, desc: ok ? `Sum ${target} is reachable, so the numbers can be split into two equal halves.` : `Sum ${target} is not reachable, so no equal split exists.`,
    logic: 'Read the bottom-right cell: can all the numbers together reach exactly half the total?', tone: ok ? 'success' : 'warn', java: [12], py: [12],
    algo: 3, result: { title: String(ok), text: ok ? `A subset sums to ${target}` : `No subset sums to ${target}` },
  });
  return steps;
}

export const partitionEqualSubsetSum: ProblemDef<In> = {
  slug: '416-partition-equal-subset-sum',
  id: '416', title: 'Partition Equal Subset Sum', difficulty: 'Medium', category: 'Dynamic Programming', tag: '0/1 knapsack',
  statement: 'Given an array of positive integers, decide whether it can be split into two subsets whose sums are equal.',
  constraints: '1 ≤ nums.length ≤ 200, 1 ≤ nums[i] ≤ 100 (animation input: ≤ 6 numbers with a total of at most 24)',
  examples: [
    { label: '[1, 5, 11, 5]', input: { nums: [1, 5, 11, 5] }, output: 'true' },
    { label: '[1, 2, 3, 5]', input: { nums: [1, 2, 3, 5] }, output: 'false' },
    { label: '[3, 3, 3, 4, 5]', input: { nums: [3, 3, 3, 4, 5] }, output: 'true' },
  ],
  inputPlaceholder: 'e.g. 1 5 11 5',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Computing', state: 'active' }, { label: 'Skip / take sources', state: 'compare' }, { label: 'Computed', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['item', 'sum', 'skip', 'take'],
  emphasis: ['two subsets', 'sums are equal'],
  phases: [
    { icon: '🎯', label: 'Target = total / 2', tone: 'blue' },
    { icon: '🌱', label: 'Base row: only sum 0', tone: 'blue' },
    { icon: '🎒', label: 'Skip OR take', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Subset sum to half the total',
    text: 'If the total is odd, the answer is false. Otherwise target = total / 2. dp[i][s] is true when the first i numbers can reach sum s: dp[i][s] = dp[i−1][s] OR dp[i−1][s − nums[i−1]]. Check dp[n][target].',
  },
  java: [
    'public boolean canPartition(int[] nums) {',
    '    int sum = Arrays.stream(nums).sum();',
    '    if (sum % 2 != 0) return false;',
    '    int target = sum / 2, n = nums.length;',
    '    boolean[][] dp = new boolean[n + 1][target + 1];',
    '    dp[0][0] = true;',
    '    for (int i = 1; i <= n; i++) {',
    '        for (int s = 0; s <= target; s++) {',
    '            dp[i][s] = dp[i - 1][s];                          // skip nums[i-1]',
    '            if (s >= nums[i - 1]) dp[i][s] |= dp[i - 1][s - nums[i - 1]];   // take it',
    '        }',
    '    }',
    '    return dp[n][target];',
    '}',
  ],
  python: [
    'def can_partition(nums):',
    '    total = sum(nums)',
    '    if total % 2:',
    '        return False',
    '    target, n = total // 2, len(nums)',
    '    dp = [[False] * (target + 1) for _ in range(n + 1)]',
    '    dp[0][0] = True',
    '    for i in range(1, n + 1):',
    '        for s in range(target + 1):',
    '            dp[i][s] = dp[i - 1][s]  # skip',
    '            if s >= nums[i - 1] and dp[i - 1][s - nums[i - 1]]:',
    '                dp[i][s] = True  # take',
    '    return dp[n][target]',
  ],
  algorithm: [
    'Add up the numbers; an odd total means false',
    'Create dp[i][s] with dp[0][0] = true (target = total / 2)',
    'For each number and each sum: skip it, or take it if s ≥ number',
    'Return dp[n][target]',
  ],
  complexity: [{ label: 'Time', value: 'O(n · target)' }, { label: 'Space', value: 'O(n · target), or O(target) with one row' }],
  why: 'Two equal halves exist exactly when some subset sums to half the total. Each number is either left out of a subset or put in it, so a sum is reachable with the first i numbers if it was reachable with i−1 numbers (skip) or s minus the new number was (take). This enumerates all 2ⁿ subsets implicitly in O(n · target) time.',
};
