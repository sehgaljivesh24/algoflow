import type { CaseModule, State } from './types.ts';
import { num, ptr, rarr, rint } from './util.ts';

/**
 * MODEL CASE — Fixed Sliding Window (LC 643). Copy this file's shape for your own problems.
 * The oracle below is written from the algorithm's definition and does not import the problem file.
 */
type In = { nums: number[]; k: number };

function oracle({ nums, k }: In): State[] {
  const out: State[] = [];
  out.push({ l: null, r: null, windowSum: 0, maxSum: null }); // before anything is read
  let sum = 0;
  let best = -Infinity;
  let bestL = 0;
  for (let i = 0; i < nums.length; i++) {
    sum += nums[i];
    if (i >= k) sum -= nums[i - k];
    if (i >= k - 1) {
      if (sum > best) { best = sum; bestL = i - k + 1; }
      out.push({ l: i - k + 1, r: i, windowSum: sum, maxSum: best });
    } else {
      out.push({ l: 0, r: i, windowSum: sum, maxSum: null }); // still building the first window
    }
  }
  out.push({ l: bestL, r: bestL + k - 1, windowSum: best, maxSum: best }); // Done: the best window is framed
  return out;
}

export const cases: CaseModule['cases'] = [
  {
    slug: '643-maximum-average-subarray-i',
    gen: (r): In => {
      const n = rint(r, 3, 9);
      return { nums: rarr(r, n, -9, 9), k: rint(r, 1, n) };
    },
    oracle,
    project: (step) => ({ l: ptr(step, 'l'), r: ptr(step, 'r'), windowSum: num(step, 'windowSum'), maxSum: num(step, 'maxSum') }),
    invariants: [
      (step, _i, _steps, { nums }) => {
        // the windowSum shown must equal the sum of the cells the window pointers frame (when both pointers exist)
        const l = ptr(step, 'l'), r = ptr(step, 'r'), ws = num(step, 'windowSum');
        if (l === null || r === null || ws === null) return null;
        const s = nums.slice(l, r + 1).reduce((a, b) => a + b, 0);
        return s === ws ? null : `windowSum ${ws} != sum(nums[${l}..${r}]) = ${s}`;
      },
    ],
  },
];
