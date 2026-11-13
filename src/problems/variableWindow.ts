import type { Cell, CellState, ProblemDef, Step } from '../engine/types';

interface In { nums: number[]; target: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: numbers ; target — e.g. 2 3 1 2 4 3 ; 7');
  const nums = left.split(/[\s,]+/).filter(Boolean).map(Number);
  const target = Number(right.trim());
  if (!nums.length || nums.some((n) => !Number.isInteger(n) || n < 1) || !Number.isInteger(target) || target < 1) {
    throw new Error('Use positive whole numbers, e.g. 2 3 1 2 4 3 ; 7');
  }
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  return { nums, target };
}

function build({ nums, target }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let l = 0;
  let sum = 0;
  let best = Infinity;
  let bestL = -1;
  let bestR = -1;

  // enter = the cell just added on the right (R), leave = the cell just dropped on the left (L)
  const cells = (lo: number, hi: number, enter = -1, leave = -1, final = false): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (final) state = i >= bestL && i <= bestR && bestL >= 0 ? 'found' : 'dim';
      else if (i === enter) state = 'compare';
      else if (i === leave) state = 'swap';
      else if (i >= lo && i <= hi) state = 'active';
      else if (i < lo) state = 'dim';
      return { key: i, value, state };
    });
  // pointer labels are the indexes; l can step one past r (an empty window) and even past the last index, so keep its chip on screen.
  const ptrs = (r: number) => [
    { id: 'l', label: String(l), index: Math.min(l, n - 1), tone: 'blue' as const },
    { id: 'r', label: String(r), index: r, tone: 'green' as const },
  ];
  const vars = (r: number | string) => ({ L: l, R: r, sum, best: best === Infinity ? '∞' : best });

  steps.push({
    title: 'Start', tag: 'READY —', desc: `Look for the shortest run of nums whose sum reaches ${target}. The window is empty: L = 0, sum = 0, best = ∞.`,
    cells: cells(0, -1), pointers: [], vars: vars('—'),
    logic: 'All numbers are positive, so growing the window always raises the sum and shrinking it always lowers it. That is what makes two pointers work.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1, 2], algoStep: 0, note: `target = ${target}, sum = 0, best = ∞`,
  });

  for (let r = 0; r < n; r++) {
    const before = sum;
    sum += nums[r];
    const ready = sum >= target;
    steps.push({
      title: `Expand: add nums[${r}] = ${nums[r]}`, tag: 'EXPAND:',
      desc: `take in nums[${r}]=${nums[r]} → sum = ${before} + ${nums[r]} = ${sum} ${ready ? `≥ ${target}, shrink next` : `< ${target}, keep growing`}`,
      cells: cells(l, r, r), pointers: ptrs(r), vars: vars(r),
      logic: 'The right edge moves forward every step.', logicTone: 'info', javaLines: [2, 3], pyLines: [3, 4], algoStep: 0,
      note: `sum += nums[${r}] → ${before} + ${nums[r]} = ${sum}`,
    });
    while (sum >= target) {
      const len = r - l + 1;
      const old = best;
      const improved = len < best;
      if (improved) {
        best = len;
        bestL = l;
        bestR = r;
      }
      steps.push({
        title: `Valid window, length ${len}`, tag: 'UPDATE best:',
        desc: improved
          ? `window [${l}..${r}] sums to ${sum} ≥ ${target}, len=${len} → 🏆 NEW BEST! best = ${best}`
          : `window [${l}..${r}] sums to ${sum} ≥ ${target}, len=${len} → best = min(${old}, ${len}) = ${best}`,
        cells: cells(l, r), pointers: ptrs(r), vars: vars(r),
        logic: 'Record it, then try to make it shorter by dropping the left edge.', logicTone: improved ? 'success' : 'info', javaLines: [4, 5], pyLines: [5, 6], algoStep: 2,
        note: `best = min(${old === Infinity ? '∞' : old}, ${r} − ${l} + 1) = ${best}`,
      });
      const out = nums[l];
      const prev = sum;
      sum -= out;
      l++;
      const still = sum >= target;
      steps.push({
        title: `Shrink: drop nums[${l - 1}] = ${out}`, tag: 'SHRINK:',
        desc: `drop nums[${l - 1}]=${out} → sum = ${prev} − ${out} = ${sum}, L moves to ${l} ${still ? `· still ≥ ${target}, shrink again` : `· below ${target}, expand again`}`,
        cells: cells(l, r, -1, l - 1), pointers: ptrs(r), vars: vars(r),
        logic: still ? 'Still big enough, so keep shrinking.' : 'Too small now — go back to expanding.', logicTone: 'warn',
        javaLines: [6], pyLines: [7, 8], algoStep: 1,
        note: `sum -= nums[${l - 1}] → ${prev} − ${out} = ${sum}; l = ${l}`,
      });
    }
  }

  const found = best !== Infinity;
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: found ? `shortest valid window has length ${best}: indexes ${bestL}..${bestR} = [${nums.slice(bestL, bestR + 1).join(', ')}]` : `no window ever reached ${target}, so the answer is 0`,
    cells: cells(0, -1, -1, -1, true), pointers: found ? [{ id: 'l', label: String(bestL), index: bestL, tone: 'blue' as const }, { id: 'r', label: String(bestR), index: bestR, tone: 'green' as const }] : [], vars: { L: found ? bestL : '—', R: found ? bestR : '—', sum: found ? nums.slice(bestL, bestR + 1).reduce((a, b) => a + b, 0) : sum, best: found ? best : 0 },
    alert: found ? undefined : `Even the whole array sums to ${sum} < ${target}: no valid subarray.`,
    logic: found ? 'Highlighted cells are the shortest valid window found.' : 'Return 0.', logicTone: found ? 'success' : 'warn',
    javaLines: [9], pyLines: [9], algoStep: 3, note: found ? `return ${best}` : 'best = ∞ → return 0',
    result: { title: String(found ? best : 0), text: found ? `Window [${bestL}..${bestR}]` : 'No valid subarray' },
  });
  return steps;
}

export const variableWindow: ProblemDef<In> = {
  slug: '209-minimum-size-subarray-sum',
  id: '209', title: 'Minimum Size Subarray Sum', difficulty: 'Medium', category: 'Arrays', tag: 'variable sliding window',
  statement: 'Given an array of positive integers and a target, return the minimal length of a contiguous subarray whose sum is at least target, or 0 if none exists. Expand the right edge until the sum reaches the target, then shrink from the left while it still does.',
  emphasis: ['minimal length', 'contiguous subarray', 'at least target'],
  constraints: '1 ≤ n ≤ 10⁵, nums[i] ≥ 1 (animation input is limited to 12 numbers)',
  examples: [
    { label: '[2,3,1,2,4,3], 7', input: { nums: [2, 3, 1, 2, 4, 3], target: 7 }, output: '2', answer: '2 (subarray [4, 3], indices 4–5)' },
    { label: '[1,4,4], 4', input: { nums: [1, 4, 4], target: 4 }, output: '1' },
    { label: '[1,1,1,1,1], 11', input: { nums: [1, 1, 1, 1, 1], target: 11 }, output: '0' },
  ],
  inputPlaceholder: 'e.g. 2 3 1 2 4 3 ; 7',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'R entering (expand)', state: 'compare' }, { label: 'L leaving (shrink)', state: 'swap' }, { label: 'Window contents', state: 'active' }, { label: 'Best window', state: 'found' }, { label: 'Outside', state: 'dim' }],
  varLabels: ['L', 'R', 'sum', 'best'],
  phases: [
    { icon: '➡', label: 'EXPAND (R →)', tone: 'green' },
    { icon: '⬅', label: 'SHRINK (← L)', tone: 'orange' },
    { icon: '★', label: 'UPDATE best', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Grow the right edge, shrink the left',
    text: 'Add numbers on the right until the sum reaches the target. Then drop numbers from the left for as long as the sum stays big enough, recording the shortest window you see.',
  },
  java: [
    'public int minSubArrayLen(int target, int[] nums) {',
    '    int l = 0, sum = 0, best = Integer.MAX_VALUE;',
    '    for (int r = 0; r < nums.length; r++) {',
    '        sum += nums[r];',
    '        while (sum >= target) {',
    '            best = Math.min(best, r - l + 1);',
    '            sum -= nums[l++];',
    '        }',
    '    }',
    '    return best == Integer.MAX_VALUE ? 0 : best;',
    '}',
  ],
  python: [
    'def min_sub_array_len(target, nums):',
    '    l = total = 0',
    "    best = float('inf')",
    '    for r, x in enumerate(nums):',
    '        total += x',
    '        while total >= target:',
    '            best = min(best, r - l + 1)',
    '            total -= nums[l]',
    '            l += 1',
    "    return 0 if best == float('inf') else best",
  ],
  algorithm: [
    'Expand: move r right, adding nums[r] to the sum',
    'Shrink: while sum ≥ target, drop nums[l] and move l right',
    'Update: while sum ≥ target, best = min(best, r − l + 1)',
    'Return the shortest recorded length (0 if none)',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Both pointers only move forward, and each moves at most n times, so the work is O(n) even though there is a loop inside a loop. Positivity guarantees that dropping the left edge can only reduce the sum.',
};
