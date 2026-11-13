import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { parseInts, recorder } from './stepKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  return { nums: parseInts(raw, { what: 'numbers', example: '5 -3 5', minLen: 1, maxLen: 10, lo: -20, hi: 20 }) };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let i = -1;
  let total = 0;
  let curMax = 0;
  let curMin = 0;
  let best = nums[0];
  let worst = nums[0];
  let bs = 0, be = 0, ws = 0, we = 0;
  let curMaxStart = 0, curMinStart = 0;
  let finalWrap: boolean | null = null;

  const snap = () => ({
    cells: nums.map((v, k): Cell => {
      let state: Cell['state'];
      if (finalWrap === true) state = k < ws || k > we ? 'found' : 'error';
      else if (finalWrap === false) state = k >= bs && k <= be ? 'found' : undefined;
      else if (k === i) state = 'active';
      else if (i >= 0 && k <= i && k >= bs && k <= be) state = 'found';
      else if (i >= 0 && k <= i && k >= ws && k <= we) state = 'error';
      else if (k > i) state = 'dim';
      return { key: k, value: v, state };
    }),
    pointers: i >= 0 && i < n ? [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }] : [],
    vars: { x: i >= 0 && i < n ? nums[i] : '—', 'curMax / best': i >= 0 ? `${curMax} / ${best}` : '—', 'curMin / worst': i >= 0 ? `${curMin} / ${worst}` : '—', total },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Two ways a best slice can sit', tag: 'SETUP —', desc: 'On a circle the best slice either stays inside the array (an ordinary Kadane answer) or wraps around the end. A wrapping slice is everything EXCEPT one middle slice, so its sum is total − (the worst middle slice).',
    logic: 'One pass can find both extremes: Kadane for the maximum slice and the mirrored Kadane for the minimum slice.', java: [0, 1, 2], py: [0, 1, 2], algo: 0,
    note: 'answer = max(best slice, total − worst slice)',
  });

  for (let x = 0; x < n; x++) {
    i = x;
    const v = nums[x];
    total += v;
    // max run
    if (x === 0 || curMax < 0) { curMax = v; curMaxStart = x; } else curMax += v;
    if (x === 0 || curMax > best) { best = curMax; bs = curMaxStart; be = x; }
    // min run
    if (x === 0 || curMin > 0) { curMin = v; curMinStart = x; } else curMin += v;
    if (x === 0 || curMin < worst) { worst = curMin; ws = curMinStart; we = x; }
    say({
      title: `i = ${x}: x = ${v}`, tag: 'KADANE ×2 —', desc: `x = ${v}: running max slice ends here with ${curMax} (best ${best}, green), running min slice with ${curMin} (worst ${worst}, red). Total so far ${total}.`,
      logic: 'Each extreme either extends its previous slice or restarts at x, whichever is better for that direction.', tone: 'info', java: [4, 5, 6], py: [4, 5, 6], algo: 1,
      note: `curMax = ${curMax}, curMin = ${curMin}, total = ${total}`,
    });
  }

  i = -1;
  const wrapVal = total - worst;
  const allNeg = best < 0;
  finalWrap = !allNeg && wrapVal > best;
  say({
    title: 'Compare the two shapes', tag: 'COMPARE —', note: allNeg ? `best ${best} < 0 → answer = ${best}` : `max(${best}, ${total} − ${worst} = ${wrapVal}) = ${Math.max(best, wrapVal)}`, desc: allNeg
      ? `Every number is negative, so the best slice is just the largest single number ${best}. (total − worst would be 0, an empty slice, which is not allowed.)`
      : `Inside slice: ${best}. Wrapping slice: total − worst = ${total} − ${worst} = ${wrapVal}. ${wrapVal > best ? 'The wrapping slice is larger.' : 'The ordinary slice is at least as large.'}`,
    logic: allNeg ? 'Removing the worst slice would remove everything, leaving an illegal empty slice.' : 'Removing the minimum middle slice keeps the largest possible head+tail.', tone: 'success', java: [7, 8], py: [7, 8], algo: 2,
  });
  const ans = allNeg ? best : Math.max(best, wrapVal);
  say({
    title: 'Done', tag: '✅ Done!', note: `return ${ans}`, desc: `Maximum circular subarray sum = ${ans}${finalWrap ? ` (wrapping slice: total ${total} − worst ${worst})` : ` (the ordinary slice at indexes ${bs}..${be})`}.`,
    logic: 'The answer is the better of the non-wrapping and the wrapping slice.', tone: 'success', java: [9], py: [9], algo: 3, result: { title: String(ans), text: 'Maximum circular slice sum' },
  });
  return steps;
}

export const maximumSumCircularSubarray: ProblemDef<In> = {
  slug: '918-maximum-sum-circular-subarray',
  id: '918', title: 'Maximum Sum Circular Subarray', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'max + min Kadane',
  statement: 'The array is circular: the last element is followed by the first. Return the largest sum of a non-empty subarray (a contiguous piece that may wrap around the end).',
  constraints: '1 ≤ n ≤ 3·10⁴ (animation input: ≤ 10 numbers between −20 and 20)',
  examples: [
    { label: '1 -2 3 -2', input: { nums: [1, -2, 3, -2] }, output: '3' },
    { label: '5 -3 5', input: { nums: [5, -3, 5] }, output: '10' },
    { label: '-3 -2 -3', input: { nums: [-3, -2, -3] }, output: '-2' },
  ],
  inputPlaceholder: 'numbers, e.g. 5 -3 5',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizCaption: 'green = best non-wrapping slice, red = worst slice',
  legend: [{ label: 'Current element', state: 'active' }, { label: 'Best slice so far / wrapping part', state: 'found' }, { label: 'Worst slice (the part cut out)', state: 'error' }, { label: 'Not seen yet', state: 'dim' }],
  varLabels: ['x', 'curMax / best', 'curMin / worst', 'total'],
  emphasis: ['circular', 'wrap around', 'largest sum'],
  phases: [
    { icon: '🔄', label: 'Two shapes: inside or wrapping', tone: 'blue' },
    { icon: '📈', label: 'Kadane max + min in one pass', tone: 'cyan' },
    { icon: '⚖️', label: 'Compare best vs total − worst', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Max slice vs total minus min slice',
    text: 'Run Kadane twice in one pass: curMax/best for the maximum slice and curMin/worst for the minimum slice, and add up total. The answer is max(best, total − worst), except when best < 0 (all numbers negative) where it is just best.',
  },
  java: [
    'public int maxSubarraySumCircular(int[] nums) {',
    '    int total = 0, curMax = 0, curMin = 0;',
    '    int best = nums[0], worst = nums[0];',
    '    for (int x : nums) {',
    '        total += x;',
    '        curMax = Math.max(curMax + x, x);  best = Math.max(best, curMax);    // normal Kadane',
    '        curMin = Math.min(curMin + x, x);  worst = Math.min(worst, curMin);  // Kadane for the minimum',
    '    }',
    '    if (best < 0) return best;                       // all negative: a wrap would take nothing',
    '    return Math.max(best, total - worst);            // inside slice vs everything minus the worst slice',
    '}',
  ],
  python: [
    'def max_subarray_sum_circular(nums):',
    '    total = cur_max = cur_min = 0',
    '    best = worst = nums[0]',
    '    for x in nums:',
    '        total += x',
    '        cur_max = max(cur_max + x, x); best = max(best, cur_max)    # normal Kadane',
    '        cur_min = min(cur_min + x, x); worst = min(worst, cur_min)  # Kadane for the minimum',
    '    if best < 0:',
    '        return best                                  # all negative: a wrap would take nothing',
    '    return max(best, total - worst)                  # inside slice vs everything minus the worst slice',
  ],
  algorithm: [
    'A circular slice is either an ordinary slice or total minus an ordinary middle slice',
    'One pass: Kadane for the largest slice, mirrored Kadane for the smallest, and the total',
    'If every number is negative the answer is the largest single number',
    'Otherwise return max(best, total − worst)',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'A subarray of the circle either does not cross the end of the array (then it is an ordinary subarray) or it does; the elements it leaves out then form one contiguous middle slice, so its sum is total minus that slice, and it is largest when the removed slice is the smallest. Both extremes come from the same Kadane argument with max and min swapped. If all values are negative the minimum slice is the whole array, which would leave an empty selection, so that case is handled separately.',
};
