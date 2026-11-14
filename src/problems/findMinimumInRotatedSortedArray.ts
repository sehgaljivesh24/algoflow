import type { ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { parseNums, ptr, windowCells } from './ssbShared.ts';

interface In { nums: number[] }

export const isRotation = (a: number[]) => a.filter((v, i) => v > a[(i + 1) % a.length]).length <= 1;

function parse(raw: string): In {
  const nums = parseNums(raw, { maxLen: 14, lo: -99, hi: 999 });
  if (new Set(nums).size !== nums.length) throw new Error('Values must be distinct');
  if (!isRotation(nums)) throw new Error('The array must be an ascending sorted array rotated some number of steps, e.g. 4 5 6 7 0 1 2');
  return { nums };
}

const idx = (a: number, b: number) => (a === b ? `index ${a} is` : `indexes ${a}..${b} are`);

function build({ nums }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let lo = 0;
  let hi = n - 1;
  let iter = 0;
  const ptrs = (mid?: number) => [ptr('lo', 'lo', lo, 'blue'), ...(mid !== undefined ? [ptr('mid', 'mid', mid, 'orange')] : []), ptr('hi', 'hi', hi, 'purple')];
  const vars = (mid: number | string) => ({ lo, mid, hi, iterations: iter });

  steps.push({
    title: 'Start', desc: `A sorted array was rotated; find its minimum (the "pivot") in O(log n). n = ${n}.`,
    cells: windowCells(nums, lo, hi), pointers: ptrs(), vars: vars('—'),
    logic: 'The minimum is the one place where the order wraps around from big back to small.', logicTone: 'info', javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
    tag: 'READY —', note: `lo = 0, hi = ${n - 1}, window = all ${plural(n, 'number')}`,
  });

  while (lo < hi) {
    iter++;
    const mid = lo + Math.floor((hi - lo) / 2);
    const right = nums[mid] > nums[hi];
    steps.push({
      title: `Pick mid = ${mid}`, tag: 'MID', desc: `window [${lo}..${hi}] has mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}, holding ${nums[mid]}`,
      cells: windowCells(nums, lo, hi, { [mid]: 'compare' }), pointers: ptrs(mid), vars: vars(mid),
      logic: 'The middle element splits the window; comparing it with the right end tells us which side holds the wrap-around.', logicTone: 'info',
      javaLines: [2, 3], pyLines: [2, 3], algoStep: 1, note: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}`,
    });
    steps.push({
      title: `Compare nums[${mid}] with nums[${hi}]`, tag: 'COMPARE', desc: `nums[${mid}]=${nums[mid]} ${right ? '>' : '<'} nums[${hi}]=${nums[hi]}, so mid is ${right ? 'in the first (bigger) run' : 'in the same run as hi'}`,
      cells: windowCells(nums, lo, hi, { [mid]: 'compare', [hi]: 'active' }), pointers: ptrs(mid), vars: vars(mid),
      logic: right ? 'mid is bigger than the right end, so the wrap-around (the minimum) must lie strictly to the right of mid.' : 'mid is smaller than the right end, so [mid..hi] is sorted and the minimum is at mid or to its left.', logicTone: 'info',
      javaLines: [4], pyLines: [4], algoStep: 2, note: `nums[mid] > nums[hi] → ${nums[mid]} > ${nums[hi]} is ${right}`,
    });
    const oldLo = lo;
    const oldHi = hi;
    if (right) lo = mid + 1;
    else hi = mid;
    steps.push({
      title: right ? 'Minimum is right of mid: lo = mid + 1' : 'Minimum is at mid or left: hi = mid',
      tag: right ? 'MOVE LO' : 'MOVE HI',
      desc: right ? `lo = mid + 1 = ${lo}: the window is now [${lo}..${hi}] and ${idx(oldLo, mid)} discarded` : `hi = mid = ${hi}: the window is now [${lo}..${hi}] and ${idx(mid + 1, oldHi)} discarded`,
      cells: windowCells(nums, lo, hi), pointers: ptrs(), vars: vars(mid),
      alert: right ? `${idx(oldLo, mid)} discarded: the minimum cannot be there.` : `${idx(mid + 1, oldHi)} discarded: bigger than nums[${mid}].`,
      logic: right ? 'mid cannot be the minimum, so it is discarded too.' : 'mid might be the minimum, so we keep it.', logicTone: 'warn',
      javaLines: right ? [4] : [5], pyLines: right ? [5] : [6, 7], algoStep: 3,
      note: right ? `lo = mid + 1 = ${lo}` : `hi = mid = ${hi}`,
    });
  }

  steps.push({
    title: `Minimum = ${nums[lo]}`, tag: '✅ Done!', desc: `lo = hi = ${lo}: the window is a single cell, so the minimum is ${nums[lo]} at index ${lo}`,
    cells: windowCells(nums, lo, hi, { [lo]: 'found' }), pointers: [ptr('min', 'min', lo, 'green')], vars: vars('—'),
    logic: `Everything to the left of index ${lo} is bigger than nums[${lo}], so it is the smallest value.`, logicTone: 'success', javaLines: [7], pyLines: [8], algoStep: 4,
    note: `return nums[${lo}] = ${nums[lo]}`,
    result: { title: String(nums[lo]), text: `Minimum is ${nums[lo]} at index ${lo}` },
  });
  return steps;
}

export const findMinimumInRotatedSortedArray: ProblemDef<In> = {
  slug: '153-find-minimum-in-rotated-sorted-array', id: '153', title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium', category: 'Binary Search', tag: 'binary search',
  statement: 'A strictly ascending array of distinct numbers has been rotated an unknown number of positions (for example [0,1,2,4,5,6,7] became [4,5,6,7,0,1,2]). Return its minimum element in O(log n).',
  constraints: '1 ≤ n ≤ 5000 · all values distinct (animation input is limited to 14 numbers)',
  examples: [
    { label: '[3,4,5,1,2]', input: { nums: [3, 4, 5, 1, 2] }, output: '1' },
    { label: '[4,5,6,7,0,1,2]', input: { nums: [4, 5, 6, 7, 0, 1, 2] }, output: '0' },
    { label: '[11,13,15,17]', input: { nums: [11, 13, 15, 17] }, output: '11' },
  ],
  inputPlaceholder: 'e.g. 4 5 6 7 0 1 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Middle', state: 'compare' }, { label: 'Right end (hi)', state: 'active' }, { label: 'Minimum', state: 'found' }, { label: 'Discarded', state: 'dim' }],
  varLabels: ['lo', 'mid', 'hi', 'iterations'],
  emphasis: ['rotated', 'minimum element', 'O(log n)'],
  phases: [
    { icon: '🎯', label: 'SETUP lo, hi', tone: 'blue' },
    { icon: '📍', label: 'PICK mid', tone: 'cyan' },
    { icon: '⚖', label: 'COMPARE mid vs hi', tone: 'gold' },
    { icon: '✂', label: 'DISCARD half', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Compare mid against the right end',
    text: 'If nums[mid] > nums[hi] the pivot is to the right of mid. Otherwise the right part is sorted, so the minimum is at mid or further left. Shrink toward the pivot.',
  },
  java: [
    'public int findMin(int[] nums) {',
    '    int lo = 0, hi = nums.length - 1;',
    '    while (lo < hi) {',
    '        int mid = lo + (hi - lo) / 2;',
    '        if (nums[mid] > nums[hi]) lo = mid + 1;',
    '        else hi = mid;',
    '    }',
    '    return nums[lo];',
    '}',
  ],
  python: [
    'def find_min(nums):',
    '    lo, hi = 0, len(nums) - 1',
    '    while lo < hi:',
    '        mid = lo + (hi - lo) // 2',
    '        if nums[mid] > nums[hi]:',
    '            lo = mid + 1',
    '        else:',
    '            hi = mid',
    '    return nums[lo]',
  ],
  algorithm: [
    'Set lo = 0, hi = n − 1',
    'While lo < hi, pick mid = lo + (hi − lo) / 2',
    'Compare nums[mid] with nums[hi]',
    'nums[mid] > nums[hi] → lo = mid + 1; otherwise hi = mid',
    'Return nums[lo]',
  ],
  complexity: [{ label: 'Time', value: 'O(log n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The array is two ascending runs, the second one entirely smaller than the first. If nums[mid] > nums[hi], mid is in the first run and the minimum starts the second run, to its right. If nums[mid] < nums[hi], mid and hi are in the same run, so the minimum is at or before mid. The minimum stays inside [lo, hi] throughout.',
};
