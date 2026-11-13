import type { CellState, Pointer, ProblemDef, Step } from '../engine/types.ts';
import { parseInts, recorder } from './stepKit.ts';
import { find } from './treeKit.ts';
import { ptr } from './ssbShared.ts';
import { treeOverArray, twoPass, type RecTree } from './recTreeKit.ts';

interface In { nums: number[] }

const java = [
  'public int maxSubArray(int[] nums) {',
  '    return solve(nums, 0, nums.length - 1);',
  '}',
  'private int solve(int[] nums, int lo, int hi) {',
  '    if (lo == hi) return nums[lo];                    // one element: it is the answer',
  '    int mid = lo + (hi - lo) / 2;',
  '    int left = solve(nums, lo, mid);                  // best fully inside the left half',
  '    int right = solve(nums, mid + 1, hi);             // best fully inside the right half',
  '    int sum = 0, bestL = Integer.MIN_VALUE;           // best sum that ends at mid',
  '    for (int i = mid; i >= lo; i--) {',
  '        sum += nums[i];',
  '        bestL = Math.max(bestL, sum);',
  '    }',
  '    sum = 0;',
  '    int bestR = Integer.MIN_VALUE;                    // best sum that starts at mid + 1',
  '    for (int j = mid + 1; j <= hi; j++) {',
  '        sum += nums[j];',
  '        bestR = Math.max(bestR, sum);',
  '    }',
  '    return Math.max(Math.max(left, right), bestL + bestR);   // crossing the middle',
  '}',
];
const python = [
  'def max_sub_array(nums):',
  '    def solve(lo, hi):',
  '        if lo == hi:',
  '            return nums[lo]                           # one element',
  '        mid = (lo + hi) // 2',
  '        left = solve(lo, mid)                         # best fully inside the left half',
  '        right = solve(mid + 1, hi)                    # best fully inside the right half',
  '        total, best_l = 0, float("-inf")              # best sum that ends at mid',
  '        for i in range(mid, lo - 1, -1):',
  '            total += nums[i]',
  '            best_l = max(best_l, total)',
  '        total, best_r = 0, float("-inf")              # best sum that starts at mid + 1',
  '        for j in range(mid + 1, hi + 1):',
  '            total += nums[j]',
  '            best_r = max(best_r, total)',
  '        return max(left, right, best_l + best_r)      # crossing the middle',
  '    return solve(0, len(nums) - 1)',
];
const J = {
  start: find(java, 'return solve(nums, 0'),
  base: find(java, 'if (lo == hi)'),
  split: find(java, 'int mid = lo'),
  left: find(java, 'int left = solve'),
  right: find(java, 'int right = solve'),
  scanL: find(java, 'int sum = 0, bestL', 'for (int i = mid', 'sum += nums[i]', 'bestL = Math.max'),
  scanR: find(java, 'int bestR', 'for (int j = mid', 'sum += nums[j]', 'bestR = Math.max'),
  combine: find(java, 'return Math.max(Math.max'),
};
const P = {
  start: find(python, 'return solve(0'),
  base: find(python, 'if lo == hi', 'return nums[lo]'),
  split: find(python, 'mid = (lo + hi)'),
  left: find(python, 'left = solve'),
  right: find(python, 'right = solve'),
  scanL: find(python, 'total, best_l', 'for i in range', 'total += nums[i]', 'best_l = max'),
  scanR: find(python, 'total, best_r', 'for j in range', 'total += nums[j]', 'best_r = max'),
  combine: find(python, 'return max(left, right'),
};

function run({ nums }: In, tree: RecTree): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  const stack: string[] = [];
  const returned: string[] = [];
  let lo0 = 0;
  let hi0 = n - 1;
  let marks: Record<number, CellState> = {};
  let ptrs: Pointer[] = [];
  const v: Record<string, string | number> = { lo: 0, hi: n - 1, mid: '—', left: '—', right: '—', cross: '—' };

  const say = recorder(steps, () => ({
    scene: treeOverArray(
      tree.scene(),
      nums.map((value, i) => ({ key: i, value, state: marks[i] ?? (i < lo0 || i > hi0 ? ('dim' as const) : undefined) })),
      ptrs.map((p) => ({ ...p })),
    ),
    aux: [
      { title: 'recursion stack', kind: 'stack' as const, items: [...stack] },
      { title: 'returned answers', kind: 'list' as const, items: [...returned], highlight: returned.length - 1 },
    ],
    vars: { ...v },
  }));
  const range = (a: number, b: number): Record<number, CellState> => Object.fromEntries(Array.from({ length: b - a + 1 }, (_, k) => [a + k, 'active' as const]));

  say({
    title: 'Start', desc: `Find the maximum subarray sum of ${JSON.stringify(nums)} by splitting the array in half.`,
    logic: 'The best subarray lies entirely in the left half, entirely in the right half, or crosses the middle. The first two are smaller copies of the same problem.',
    java: J.start, py: P.start, algo: 0,
    tag: 'INIT', note: `solve(nums, 0, ${n - 1}) on ${JSON.stringify(nums)}`,
  });

  const solve = (lo: number, hi: number): number => {
    lo0 = lo; hi0 = hi;
    v.lo = lo; v.hi = hi; v.mid = '—'; v.left = '—'; v.right = '—'; v.cross = '—';
    stack.push(`solve(${lo}, ${hi})`);
    const node = tree.enter(`${lo}..${hi}`, { call: `solve(${lo}, ${hi})` });
    if (lo === hi) {
      marks = { [lo]: 'found' };
      ptrs = [ptr('i', 'lo = hi', lo, 'blue')];
      returned.push(`[${lo}..${hi}] → ${nums[lo]}`);
      tree.relabel(node, { sub: `→ ${nums[lo]}` });
      say({
        title: `Base case [${lo}..${hi}]`, desc: `A single element: the best subarray is just nums[${lo}] = ${nums[lo]}.`,
        logic: 'With one element there is nothing to split. Subarrays must be non-empty, so the element itself is the answer.', tone: 'success',
        java: J.base, py: P.base, algo: 0,
        tag: 'BASE CASE', note: `lo == hi (${lo} == ${hi}): return nums[${lo}] = ${nums[lo]}`,
      });
      stack.pop();
      tree.leave();
      marks = {}; ptrs = [];
      return nums[lo];
    }
    const mid = lo + Math.floor((hi - lo) / 2);
    v.mid = mid;
    marks = range(lo, mid);
    ptrs = [ptr('lo', 'lo', lo, 'green'), ptr('mid', 'mid', mid, 'purple'), ptr('hi', 'hi', hi, 'orange')];
    say({
      title: `Split [${lo}..${hi}] at mid = ${mid}`, desc: `Left half [${lo}..${mid}] (blue), right half [${mid + 1}..${hi}]. Solve each half first.`,
      logic: 'Each half is strictly smaller, so the recursion reaches single elements after about log₂ n splits.',
      java: J.split, py: P.split, algo: 0,
      tag: 'SPLIT', note: `mid = ${lo} + (${hi} - ${lo}) / 2 = ${mid}`,
    });
    marks = {}; ptrs = [];
    const left = solve(lo, mid);
    const right = solve(mid + 1, hi);
    lo0 = lo; hi0 = hi;
    v.lo = lo; v.hi = hi; v.mid = mid; v.left = left; v.right = right; v.cross = '—';
    // best sum ending at mid, going left
    let sum = 0, bestL = -Infinity, bestLi = mid;
    say({
      title: `Halves solved: left = ${left}, right = ${right}`, desc: `Now the third case: the best subarray that crosses the middle must include both nums[${mid}] and nums[${mid + 1}].`,
      logic: 'A crossing subarray is a suffix of the left half glued to a prefix of the right half, and the two parts can be optimised independently.',
      java: [...J.left, ...J.right], py: [...P.left, ...P.right], algo: 1,
      tag: 'HALVES DONE', note: `left = ${left}, right = ${right}; now the crossing case`,
    });
    for (let i = mid; i >= lo; i--) {
      sum += nums[i];
      if (sum > bestL) { bestL = sum; bestLi = i; }
      marks = range(i, mid);
      marks[bestLi] = 'found';
      ptrs = [ptr('i', 'i', i, 'blue')];
      v.cross = `L ${bestL}`;
      say({
        title: `Extend left to ${i}: sum = ${sum}`, desc: `Running sum of nums[${i}..${mid}] is ${sum}; best suffix so far = ${bestL} (starts at ${bestLi}).`,
        logic: 'Walk from the middle outwards and remember the largest sum seen; a longer suffix is not always better.',
        java: J.scanL, py: P.scanL, algo: 2,
        tag: 'SCAN LEFT', note: `sum += nums[${i}] → ${sum}; bestL = ${bestL}`,
      });
    }
    sum = 0;
    let bestR = -Infinity, bestRj = mid + 1;
    for (let j = mid + 1; j <= hi; j++) {
      sum += nums[j];
      if (sum > bestR) { bestR = sum; bestRj = j; }
      marks = { ...range(mid + 1, j), [bestRj]: 'found' };
      for (let k = bestLi; k <= mid; k++) marks[k] = 'found';
      ptrs = [ptr('j', 'j', j, 'orange')];
      v.cross = `L ${bestL} + R ${bestR}`;
      say({
        title: `Extend right to ${j}: sum = ${sum}`, desc: `Running sum of nums[${mid + 1}..${j}] is ${sum}; best prefix so far = ${bestR} (ends at ${bestRj}).`,
        logic: 'Same idea on the right side, starting from mid + 1 and walking outwards.',
        java: J.scanR, py: P.scanR, algo: 2,
        tag: 'SCAN RIGHT', note: `sum += nums[${j}] → ${sum}; bestR = ${bestR}`,
      });
    }
    const cross = bestL + bestR;
    const best = Math.max(left, right, cross);
    marks = {};
    for (let k = bestLi; k <= bestRj; k++) marks[k] = 'found';
    ptrs = [];
    v.cross = cross;
    returned.splice(returned.length - 2, 2);
    returned.push(`[${lo}..${hi}] → ${best}`);
    tree.relabel(node, { sub: `→ ${best}` });
    say({
      title: `Combine [${lo}..${hi}] → ${best}`, desc: `crossing = ${bestL} + ${bestR} = ${cross}. best = max(left ${left}, right ${right}, crossing ${cross}) = ${best}.`,
      logic: 'Every non-empty subarray inside [lo, hi] falls into exactly one of the three cases, so the maximum of the three is the answer.', tone: 'success',
      java: J.combine, py: P.combine, algo: 3,
      tag: 'COMBINE', note: `max(${left}, ${right}, ${bestL} + ${bestR}) = ${best}`,
    });
    stack.pop();
    tree.leave();
    marks = {};
    return best;
  };

  const best = solve(0, n - 1);
  lo0 = 0; hi0 = n - 1; marks = {}; ptrs = [];
  say({
    title: 'Done', desc: `The maximum subarray sum is ${best}.`,
    logic: 'Same answer as Kadane’s algorithm, but via recursion: T(n) = 2T(n/2) + O(n).', tone: 'success',
    java: J.combine, py: P.combine, algo: 4, result: { title: String(best), text: 'Maximum subarray sum' },
    tag: '✅ Done!', note: `return ${best}`,
  });
  return steps;
}

const build = (input: In): Step[] => twoPass((t) => run(input, t));

export const maxSubarrayDC: ProblemDef<In> = {
  slug: 'alg-maximum-subarray-divide-and-conquer',
  id: 'ALG', title: 'Maximum Subarray (Divide and Conquer)', difficulty: 'Medium', category: 'Divide and Conquer', tag: 'split, solve halves, cross the middle',
  statement: 'Find the largest sum of a non-empty contiguous subarray, but solve it by divide and conquer: split the array at the middle, solve both halves recursively, and handle the subarrays that cross the middle with two outward scans.',
  constraints: '1 ≤ n ≤ 10⁵ in general (animation input is limited to 10 numbers between −99 and 99).',
  examples: [
    { label: '[-2,1,-3,4,-1,2,1,-5,4]', input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }, output: '6', answer: '6 (the subarray [4, -1, 2, 1])' },
    { label: '[5,-4,3,-2,6]', input: { nums: [5, -4, 3, -2, 6] }, output: '8' },
    { label: '[-3,-1,-4]', input: { nums: [-3, -1, -4] }, output: '-1' },
  ],
  inputPlaceholder: 'e.g. -2 1 -3 4 -1 2 1 -5 4',
  parseInput: (raw) => ({ nums: parseInts(raw, { what: 'numbers', example: '-2 1 -3 4 -1 2 1 -5 4', minLen: 1, maxLen: 10 }) }),
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Left half / running scan', state: 'active' }, { label: 'Best part so far / answer', state: 'found' }, { label: 'Outside the current range', state: 'dim' }],
  emphasis: ['largest sum', 'divide and conquer', 'cross the middle'],
  phases: [
    { icon: '✂️', label: 'Split / base case', tone: 'blue' },
    { icon: '🔁', label: 'Solve both halves', tone: 'cyan' },
    { icon: '🌉', label: 'Cross the middle', tone: 'orange' },
    { icon: '🧮', label: 'Combine', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['lo', 'hi', 'mid', 'left', 'right', 'cross'],
  approach: {
    title: 'Left, right, or crossing',
    text: 'Split at mid. The best subarray is either inside the left half, inside the right half, or crosses mid. Recursion handles the first two; the crossing one is the best suffix of the left half plus the best prefix of the right half, found with two linear scans outward from the middle.',
  },
  java, python,
  algorithm: [
    'Split the range at mid (a one-element range just returns that element)',
    'Recursively solve the left half and the right half',
    'Scan left from mid for the best suffix sum and right from mid + 1 for the best prefix sum',
    'Return the maximum of left, right and (best suffix + best prefix)',
    'When the top-level call returns, that value is the maximum subarray sum',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(log n) recursion' }],
  why: 'Any non-empty subarray of [lo, hi] either lies wholly on one side of mid or contains both nums[mid] and nums[mid + 1]. In the crossing case its left part is a suffix of the left half and its right part a prefix of the right half, and maximising each independently maximises the sum. Each level of the recursion does O(n) scanning in total and there are log₂ n levels, giving O(n log n) (Kadane’s algorithm does the same job in O(n) but does not generalise to problems where the combine step is richer).',
};
