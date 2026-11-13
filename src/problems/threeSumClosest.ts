import type { Aux, Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { parseNumsAndK, ptr } from './pack1Kit.ts';

interface In { nums: number[]; target: number }

function parse(raw: string): In {
  const { nums, k } = parseNumsAndK(raw, { example: '-1 2 1 -4 | 1', what: 'the numbers', minLen: 3, lo: -20, hi: 20, kName: 'target', kMin: -100, kMax: () => 100 });
  return { nums, target: k };
}

function build({ nums, target }: In): Step[] {
  const n = nums.length;
  const order = nums.map((_, k) => k).sort((a, b) => nums[a] - nums[b] || a - b);
  const s = order.map((k) => nums[k]);
  const steps: Step[] = [];
  let i = -1;
  let l = -1;
  let r = -1;
  let best = s[0] + s[1] + s[2];
  let bt: number[] = [0, 1, 2];

  const cells = (finalView = false): Cell[] =>
    s.map((value, p) => {
      let state: CellState | undefined;
      if (finalView) state = bt.includes(p) ? 'found' : 'dim';
      else if (p === i) state = 'active';
      else if (p === l || p === r) state = 'compare';
      else if (bt.includes(p) && i >= 0) state = 'found';
      else if (i >= 0 && p < i) state = 'dim';
      return { key: order[p], value, state };
    });
  const ptrs = () => (i < 0 ? [] : [ptr('i', 'i', i, 'purple'), ptr('l', 'l', l, 'blue'), ptr('r', 'r', r, 'orange')]);
  const vars = (sum: number | string = '—') => ({ i: i >= 0 ? i : '—', l: l >= 0 ? l : '—', r: r >= 0 ? r : '—', sum, target, best });
  const bestBox = (): Aux[] => [{
    title: 'CLOSEST SO FAR',
    kind: 'list',
    items: [`best = ${bt.map((p) => s[p]).join(' + ')} = ${best}`, `distance = |${best} − ${target}| = ${Math.abs(best - target)}`],
    highlight: undefined,
  }];
  const add = (title: string, desc: string, logic: string, tone: 'info' | 'warn' | 'success', jl: number[], pl: number[], algo: number, sum?: number, x: Partial<Step> = {}) =>
    steps.push({ title, desc, cells: cells(), pointers: ptrs(), aux: bestBox(), vars: vars(sum), logic, logicTone: tone, javaLines: jl, pyLines: pl, algoStep: algo, ...x });

  steps.push({
    title: 'Start', tag: 'SETUP —', desc: `Find three numbers whose sum is as close as possible to the target ${target}. Return that sum, not the numbers.`,
    cells: nums.map((value, k) => ({ key: k, value })), pointers: [], vars: vars(), logic: 'Brute force tries all triples: O(n³). Sorting plus two pointers makes each fixed number cost only O(n).', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, note: `target = ${target}`,
  });
  add('Sort, and start with the first three as the best guess', `Sorted: [${s.join(', ')}]. Initial best sum = ${s[0]} + ${s[1]} + ${s[2]} = ${best}.`,
    'Any triple is a valid first guess; it only needs to be improved on.', 'info', [1, 2], [1, 2], 0, undefined,
    { tag: 'SORT —', note: `best = ${s[0]} + ${s[1]} + ${s[2]} = ${best}` });

  let done = false;
  for (i = 0; i < n - 2 && !done; i++) {
    l = i + 1;
    r = n - 1;
    add(`Fix nums[${i}] = ${s[i]}`, `i = ${i} (${s[i]}): sweep l = ${l} and r = ${r} over the numbers to its right.`,
      'With i fixed this is a sorted two-sum-like sweep that costs O(n).', 'info', [3, 4], [3, 4], 1, undefined,
      { tag: 'FIX —', note: `i = ${i}, l = ${l}, r = ${r}` });
    while (l < r) {
      const sum = s[i] + s[l] + s[r];
      const diff = Math.abs(sum - target);
      const prevBest = best;
      const improved = diff < Math.abs(best - target);
      if (improved) { best = sum; bt = [i, l, r]; }
      const exact = sum === target;
      const move = exact ? 'It is exactly the target, so we can stop.' : sum < target ? `Too small: l moves from ${l} to ${l + 1}.` : `Too big: r moves from ${r} to ${r - 1}.`;
      add(`${s[i]} + ${s[l]} + ${s[r]} = ${sum}${exact ? ' = target' : sum < target ? ' < target' : ' > target'}`,
        `${s[i]} + ${s[l]} + ${s[r]} = ${sum}, distance |${sum} − ${target}| = ${diff}. ${improved ? `Closer than ${prevBest}: 🏆 best = ${best}.` : `Not closer than best ${best}.`} ${move}`,
        sum < target ? 'Moving r left can only make the sum smaller, so while the sum is below the target only l can help.' : 'Moving l right can only make the sum bigger, so while the sum is above the target only r can help.',
        improved ? 'success' : 'info', exact ? [6, 7, 8] : sum < target ? [6, 7, 9] : [6, 7, 10], exact ? [6, 7, 8, 9, 10] : sum < target ? [6, 7, 11, 12] : [6, 7, 11, 13, 14], 2, sum,
        { tag: exact ? 'EXACT —' : improved ? 'NEW BEST —' : 'SCAN —', note: `|${sum} − ${target}| = ${diff} ${improved ? `< ${Math.abs(prevBest - target)} → best = ${best}` : `≥ ${Math.abs(best - target)}, best stays ${best}`}` });
      if (exact) { done = true; break; }
      if (sum < target) l++; else r--;
    }
  }
  i = -1;
  l = -1;
  r = -1;

  const text = String(best);
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `The closest sum is ${best} (${bt.map((p) => s[p]).join(' + ')}), distance ${Math.abs(best - target)} from ${target}.`,
    cells: cells(true), pointers: [], aux: bestBox(), vars: vars(best), logic: 'n anchors times one two-pointer sweep each: O(n²) after sorting.', logicTone: 'success', javaLines: [13], pyLines: [15], algoStep: 3,
    note: `return ${best}`,
    result: { title: text, text: `Closest sum to ${target}` },
  });
  return steps;
}

export const threeSumClosest: ProblemDef<In> = {
  slug: '16-3sum-closest',
  id: '16', title: '3Sum Closest', difficulty: 'Medium', category: 'Arrays', tag: 'sort + two pointers, closest value',
  statement: 'Given an array of integers and a target, choose three numbers whose sum is closest to the target and return that sum. (If two sums are equally close the animation reports the first one it meets.)',
  constraints: '3 ≤ n ≤ 500, −1000 ≤ nums[i] ≤ 1000 (animation input: 3 to 12 numbers from −20 to 20)',
  examples: [
    { label: '-1 2 1 -4 | target 1', input: { nums: [-1, 2, 1, -4], target: 1 }, output: '2' },
    { label: '0 0 0 | target 1', input: { nums: [0, 0, 0], target: 1 }, output: '0' },
    { label: '1 1 1 0 | target -100', input: { nums: [1, 1, 1, 0], target: -100 }, output: '2' },
  ],
  inputPlaceholder: 'numbers | target, e.g. -1 2 1 -4 | 1',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Fixed number i', state: 'active' }, { label: 'l and r', state: 'compare' }, { label: 'Best triple so far', state: 'found' }, { label: 'Already fixed (skipped)', state: 'dim' }],
  varLabels: ['i', 'l', 'r', 'sum', 'target', 'best'],
  emphasis: ['closest', 'three numbers'],
  phases: [
    { icon: '🔀', label: 'Sort + first guess', tone: 'blue' },
    { icon: '📌', label: 'Fix nums[i]', tone: 'cyan' },
    { icon: '🔎', label: 'Compare sum, move l or r', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: '3Sum, but keep the closest instead of collecting exact hits',
    text: 'Sort. For each anchor i, sweep l from the left and r from the right. Compute the sum, remember it if it is closer to the target than the best so far, then move l when the sum is too small or r when it is too big. An exact hit ends the search immediately.',
  },
  java: [
    'public int threeSumClosest(int[] nums, int target) {',
    '    Arrays.sort(nums);',
    '    int best = nums[0] + nums[1] + nums[2];',
    '    for (int i = 0; i < nums.length - 2; i++) {',
    '        int l = i + 1, r = nums.length - 1;',
    '        while (l < r) {',
    '            int sum = nums[i] + nums[l] + nums[r];',
    '            if (Math.abs(sum - target) < Math.abs(best - target)) best = sum;',
    '            if (sum == target) return sum;',
    '            if (sum < target) l++;',
    '            else r--;',
    '        }',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def three_sum_closest(nums, target):',
    '    nums.sort()',
    '    best = nums[0] + nums[1] + nums[2]',
    '    for i in range(len(nums) - 2):',
    '        l, r = i + 1, len(nums) - 1',
    '        while l < r:',
    '            s = nums[i] + nums[l] + nums[r]',
    '            if abs(s - target) < abs(best - target):',
    '                best = s',
    '            if s == target:',
    '                return s',
    '            if s < target:',
    '                l += 1',
    '            else:',
    '                r -= 1',
    '    return best',
  ],
  algorithm: [
    'Sort the array and take the first three numbers as the initial best sum',
    'Fix nums[i] and put l just after it, r at the end',
    'Compute the sum; if it is closer to the target than best, replace best (stop on an exact hit); move l right if the sum is below the target, otherwise r left',
    'After the last anchor, return best',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(1)' }],
  why: 'For a fixed i and sorted data, if the sum is below the target then every pair that keeps l and uses a smaller r is even smaller (and farther), so r can be skipped forever; the mirror argument covers a sum above the target. Each sweep therefore visits O(n) pairs while still considering every sum that could be the closest one.',
};
