import type { Cell, CellState, ProblemDef, Step } from '../engine/types';

interface In { nums: number[]; k: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: numbers ; k — e.g. 2 1 5 1 3 2 ; 3');
  const nums = left.split(/[\s,]+/).filter(Boolean).map(Number);
  const k = Number(right.trim());
  if (!nums.length || nums.some((n) => !Number.isInteger(n)) || !Number.isInteger(k)) throw new Error('Use whole numbers, e.g. 2 1 5 1 3 2 ; 3');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  if (k < 1 || k > nums.length) throw new Error(`k must be between 1 and ${nums.length}`);
  return { nums, k };
}

/** 1 start + k build steps + (n - k) slide steps + 1 done. */
function build({ nums, k }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  const cells = (lo: number, hi: number, enter?: number, leave?: number, best = false): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (i === enter) state = 'compare';
      else if (i === leave) state = 'swap';
      else if (i >= lo && i <= hi) state = best ? 'found' : 'active';
      return { key: i, value, state };
    });
  const ptrs = (lo: number, hi: number) => [
    { id: 'l', label: 'L', index: lo, tone: 'blue' as const },
    { id: 'r', label: 'R', index: hi, tone: 'orange' as const },
  ];
  let sum = 0;
  let best = -Infinity;
  let bestL = 0;
  const vars = (window: string) => ({ window, windowSum: sum, maxSum: best === -Infinity ? '—' : best, k });

  steps.push({
    title: 'Start', tag: 'START —', desc: `windowSum = 0 and maxSum is not set yet. The first complete window needs ${k} number${k === 1 ? '' : 's'}.`,
    cells: cells(0, -1), pointers: [], vars: vars('—'),
    logic: 'Recomputing every window from scratch costs O(n·k). Instead we keep one running sum and slide it.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0, note: 'nothing added yet',
  });

  // Phase 1: build the first window one number at a time
  for (let i = 0; i < k; i++) {
    sum += nums[i];
    const complete = i === k - 1;
    if (complete) { best = sum; bestL = 0; }
    steps.push({
      title: `Build: add nums[${i}]`, tag: 'BUILDING —',
      desc: `add nums[${i}] = ${nums[i]} → windowSum = ${sum}${complete ? ` , maxSum = ${best} ✦` : ''}`,
      cells: cells(0, i, i), pointers: ptrs(0, i), vars: vars(`[0..${i}]`),
      logic: complete ? 'The first window is complete: its sum is the best so far.' : 'This one pass is the only time we add k numbers one by one.', logicTone: 'info',
      javaLines: complete ? [2, 3] : [2], pyLines: complete ? [1, 2] : [1],
      algoStep: 0, note: complete ? `running sum = ${sum}, first full window → maxSum = ${best}` : `running sum = ${sum}`,
    });
  }

  // Phase 2: slide - one number enters on the right, one leaves on the left, then compare with the best
  for (let i = k; i < n; i++) {
    const out = nums[i - k];
    const prev = sum;
    sum += nums[i] - out;
    const improved = sum > best;
    if (improved) { best = sum; bestL = i - k + 1; }
    steps.push({
      title: improved ? `Slide: add ${nums[i]}, drop ${out} - new maximum` : `Slide: add ${nums[i]}, drop ${out}`,
      tag: 'SLIDING —',
      desc: `+nums[${i}](${nums[i]}) −nums[${i - k}](${out}) → windowSum = ${sum}${improved ? ` 🏆 NEW MAX! maxSum = ${best}` : `  maxSum = ${best}`}`,
      cells: cells(i - k + 1, i, i, i - k), pointers: ptrs(i - k + 1, i), vars: vars(`[${i - k + 1}..${i}]`),
      logic: improved ? 'One number in, one out: O(1). The new sum beats the best, so it is recorded.' : 'One number in, one out: O(1). The sum does not beat the best, so maxSum stays.',
      logicTone: improved ? 'success' : 'info', javaLines: [5, 6], pyLines: [4, 5], algoStep: 1,
      note: `i=${i}: ${prev} + ${nums[i]} − ${out} = ${sum}${improved ? ` → new max` : ` · max stays ${best}`}`,
    });
  }

  const bestR = bestL + k - 1;
  sum = best; // the closing picture shows the best window and its sum
  steps.push({
    title: 'Done', tag: '✅ Done!',
    desc: `maxSum = ${best} (best window [${bestL}..${bestR}] = [${nums.slice(bestL, bestR + 1).join(', ')}]), so the largest average is ${best} / ${k} = ${(best / k).toFixed(2)}`,
    cells: cells(bestL, bestR, undefined, undefined, true), pointers: ptrs(bestL, bestR), vars: vars(`[${bestL}..${bestR}]`),
    logic: 'Divide by k only once, at the very end.', logicTone: 'success', javaLines: [8], pyLines: [6], algoStep: 2,
    note: `${best} / ${k} = ${(best / k).toFixed(2)}`,
    result: { title: (best / k).toFixed(2), text: `Max window sum ${best} over k = ${k}` },
  });
  return steps;
}

export const fixedWindow: ProblemDef<In> = {
  slug: '643-maximum-average-subarray-i',
  id: '643', title: 'Maximum Average Subarray I', difficulty: 'Easy', category: 'Arrays', tag: 'fixed sliding window',
  statement: 'Given an integer array nums and an integer k, find the contiguous subarray of length k with the largest average. The animation tracks the largest sum of k consecutive numbers; dividing by k at the end gives the average.',
  emphasis: ['length k', 'largest average', 'largest sum'],
  constraints: '1 ≤ k ≤ n ≤ 10⁵ (animation input is limited to 12 numbers)',
  examples: [
    { label: '[2,1,5,1,3,2], k=3', input: { nums: [2, 1, 5, 1, 3, 2], k: 3 }, output: '3.00', answer: 'window [5, 1, 3] → sum = 9, average = 3.00' },
    { label: '[1,12,−5,−6,50,3], k=4', input: { nums: [1, 12, -5, -6, 50, 3], k: 4 }, output: '12.75' },
    { label: '[5], k=1', input: { nums: [5], k: 1 }, output: '5.00' },
  ],
  inputPlaceholder: 'e.g. 2 1 5 1 3 2 ; 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'In window', state: 'active' }, { label: 'Entering (R)', state: 'compare' }, { label: 'Leaving', state: 'swap' }, { label: 'Best window', state: 'found' }],
  varLabels: ['windowSum', 'maxSum', 'window'],
  phases: [
    { icon: '🔨', label: 'Phase 1: Build (i = 0 → k−1)', tone: 'blue' },
    { icon: '🪟', label: 'Phase 2: Slide (i = k → n−1)', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Slide, don’t recompute',
    text: 'Sum the first k numbers once. Then move the window one step at a time: add the number that enters on the right, subtract the one that leaves on the left.',
  },
  java: [
    'public double findMaxAverage(int[] nums, int k) {',
    '    int windowSum = 0;',
    '    for (int i = 0; i < k; i++) windowSum += nums[i];',
    '    int maxSum = windowSum;',
    '    for (int i = k; i < nums.length; i++) {',
    '        windowSum += nums[i] - nums[i - k];',
    '        maxSum = Math.max(maxSum, windowSum);',
    '    }',
    '    return (double) maxSum / k;',
    '}',
  ],
  python: [
    'def find_max_average(nums, k):',
    '    window = sum(nums[:k])',
    '    best = window',
    '    for i in range(k, len(nums)):',
    '        window += nums[i] - nums[i - k]',
    '        best = max(best, window)',
    '    return best / k',
  ],
  algorithm: [
    'Build: add nums[0..k−1] into windowSum; the first full window sets maxSum',
    'Slide: add nums[i], subtract nums[i − k], keep the larger sum in maxSum',
    'Return maxSum / k',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Neighbouring windows share k − 1 numbers, so their sums differ by exactly one addition and one subtraction. Each element enters and leaves the window once, giving O(n).',
};
