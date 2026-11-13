import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { parseInts, recorder } from './stepKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  return { nums: parseInts(raw, { what: 'numbers', example: '2 3 -2 4', minLen: 1, maxLen: 10, lo: -9, hi: 9 }) };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const mx: (number | null)[] = Array(n).fill(null);
  const mn: (number | null)[] = Array(n).fill(null);
  const steps: Step[] = [];
  let at = -1;
  let fresh = false;
  let bestIdx = -1;
  let best: number | string = '—';
  let a: number | string = '—';
  let b: number | string = '—';

  const row = (arr: (number | null)[], tag: string): Cell[] =>
    arr.map((v, i): Cell => ({
      key: `${tag}${i}`, value: v === null ? '?' : v,
      state: i === at ? (fresh ? 'found' : 'active') : i === at - 1 && !fresh ? 'compare' : v === null ? 'dim' : undefined,
    }));
  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: [
        nums.map((v, i): Cell => ({ key: `n${i}`, value: v, state: i === at ? 'active' : i === bestIdx ? 'found' : undefined })),
        row(mx, 'x'),
        row(mn, 'm'),
      ],
      rowHeads: ['nums', 'max ending here', 'min ending here'], colHeads: nums.map((_, i) => String(i)),
    },
    vars: { i: at < 0 ? '—' : at, 'cur×max': a, 'cur×min': b, best },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Why track a minimum too?', tag: 'SETUP —', desc: 'For each index keep the largest AND the smallest product of a subarray ending there: a negative number can flip the smallest into the largest.',
    logic: 'Multiplying by a negative reverses order: the most negative product becomes the biggest positive one. So the minimum must travel along with the maximum.',
    java: [0, 1], py: [0, 1], algo: 0, note: 'track curMax and curMin',
  });

  mx[0] = nums[0];
  mn[0] = nums[0];
  at = 0;
  fresh = true;
  best = nums[0];
  bestIdx = 0;
  say({
    title: `Start with nums[0] = ${nums[0]}`, tag: 'START —', desc: `The only subarray ending at index 0 is [${nums[0]}], so curMax = curMin = best = ${nums[0]}.`,
    logic: 'Base case: both running extremes start at the first number.', tone: 'info', java: [1], py: [1], algo: 0, note: `curMax = curMin = best = ${nums[0]}`,
  });

  for (let i = 1; i < n; i++) {
    const x = nums[i];
    const pa = mx[i - 1]! * x;
    const pb = mn[i - 1]! * x;
    at = i;
    fresh = false;
    a = pa;
    b = pb;
    say({
      title: `Three candidates at nums[${i}] = ${x}`, tag: 'CANDIDATES —',
      desc: `x = ${x}; fresh start ${x}, max run ${mx[i - 1]} × ${x} = ${pa}, min run ${mn[i - 1]} × ${x} = ${pb}`,
      logic: x < 0 ? 'x is negative, so the old minimum may now give the largest product.' : x === 0 ? 'A zero wipes out every product; the run restarts from the next number.' : 'x is positive, so the old maximum is still the best to extend.',
      java: [3], py: [3], algo: 1, note: `a = ${mx[i - 1]} × ${x} = ${pa}, b = ${mn[i - 1]} × ${x} = ${pb}`,
      alert: x === 0 ? 'A zero kills every product: both extremes collapse to 0 and the run restarts after it.' : undefined,
    });
    mx[i] = Math.max(x, pa, pb);
    mn[i] = Math.min(x, pa, pb);
    fresh = true;
    say({
      title: `max = ${mx[i]}, min = ${mn[i]}`, tag: 'UPDATE —',
      desc: `curMax = max(${x}, ${pa}, ${pb}) = ${mx[i]}; curMin = min(${x}, ${pa}, ${pb}) = ${mn[i]}${x < 0 ? ' · the sign flip swapped the roles' : ''}`,
      logic: 'Both extremes are updated from the OLD values, never from each other.', tone: 'info', java: [4, 5], py: [4, 5], algo: 2,
      note: `curMax = ${mx[i]}, curMin = ${mn[i]}`,
    });
    const oldBest = best as number;
    const improved = mx[i]! > oldBest;
    if (improved) {
      best = mx[i]!;
      bestIdx = i;
    }
    say({
      title: improved ? `New best ${best}` : `best stays ${best}`, tag: improved ? 'NEW BEST —' : 'BEST —',
      desc: improved ? `curMax ${mx[i]} > ${oldBest} 🏆 best = ${best}` : `curMax ${mx[i]} does not beat best = ${best}`,
      logic: 'best keeps the largest curMax seen at any index.', tone: improved ? 'success' : 'info', java: [6], py: [6], algo: 3,
      note: `best = max(${oldBest}, ${mx[i]}) = ${best}`,
    });
  }

  a = '—';
  b = '—';
  at = -1;
  say({
    title: 'Done', tag: '✅ Done!', desc: `The largest product of any contiguous subarray is ${best}.`, note: `return ${best}`,
    logic: 'The answer is the maximum of the "max ending here" row.', tone: 'success', java: [8], py: [7],
    algo: 4, result: { title: String(best), text: 'Maximum product of a contiguous subarray' },
  });
  return steps;
}

export const maxProductSubarray: ProblemDef<In> = {
  slug: '152-maximum-product-subarray',
  id: '152', title: 'Maximum Product Subarray', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'min/max DP',
  statement: 'Given an integer array, find a non-empty contiguous subarray whose product is as large as possible, and return that product.',
  constraints: '1 ≤ nums.length ≤ 2·10⁴ (animation input: ≤ 10 values between −9 and 9)',
  examples: [
    { label: '[2, 3, -2, 4]', input: { nums: [2, 3, -2, 4] }, output: '6' },
    { label: '[-2, 0, -1]', input: { nums: [-2, 0, -1] }, output: '0' },
    { label: '[-2, 3, -4]', input: { nums: [-2, 3, -4] }, output: '24' },
  ],
  inputPlaceholder: 'e.g. 2 3 -2 4',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current index', state: 'active' }, { label: 'Previous column (source)', state: 'compare' }, { label: 'Computed / best product ends here', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['i', 'cur×max', 'cur×min', 'best'],
  emphasis: ['contiguous subarray', 'product'],
  phases: [
    { icon: '🏁', label: 'Setup: curMax = curMin = nums[0]', tone: 'blue' },
    { icon: '✖️', label: 'Candidates: x, x·max, x·min', tone: 'cyan' },
    { icon: '🔁', label: 'Update: curMax / curMin', tone: 'orange' },
    { icon: '★', label: 'Best: best = max(best, curMax)', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Carry both the biggest and the smallest product',
    text: 'At every index the best product ending there is the max of {x, x·curMax, x·curMin}; the smallest is the min of the same three. Update best with the new curMax.',
  },
  java: [
    'public int maxProduct(int[] nums) {',
    '    int curMax = nums[0], curMin = nums[0], best = nums[0];',
    '    for (int i = 1; i < nums.length; i++) {',
    '        int a = curMax * nums[i], b = curMin * nums[i];',
    '        curMax = Math.max(nums[i], Math.max(a, b));',
    '        curMin = Math.min(nums[i], Math.min(a, b));',
    '        best = Math.max(best, curMax);',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def max_product(nums):',
    '    cur_max = cur_min = best = nums[0]',
    '    for x in nums[1:]:',
    '        a, b = cur_max * x, cur_min * x',
    '        cur_max = max(x, a, b)',
    '        cur_min = min(x, a, b)',
    '        best = max(best, cur_max)',
    '    return best',
  ],
  algorithm: [
    'Start with curMax = curMin = best = nums[0]',
    'For each x compute the two products x·curMax and x·curMin',
    'curMax = largest of {x, a, b}; curMin = smallest of {x, a, b}',
    'Update best = max(best, curMax)',
    'Return best',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1) (the rows are only for the picture)' }],
  why: 'A subarray ending at i is either just nums[i] or an extension of one ending at i−1. The extended product is largest when the earlier product is the largest (if nums[i] ≥ 0) or the smallest (if nums[i] < 0), so tracking both extremes is enough. Zeros are handled by the "just x" candidate, which restarts the run.',
};
