import type { CellState, Pointer, ProblemDef, Step } from '../engine/types.ts';
import { parseInt1, parseNums, parseParts, ptr, windowCells } from './ssbShared.ts';
import { isRotation } from './findMinimumInRotatedSortedArray.ts';

interface In { nums: number[]; target: number }

function parse(raw: string): In {
  const [a, b] = parseParts(raw, 2, 'rotated sorted numbers (duplicates allowed) ; target — e.g. 2 5 6 0 0 1 2 ; 0');
  const nums = parseNums(a, { maxLen: 14, lo: -99, hi: 999 });
  if (!isRotation(nums)) throw new Error('The array must be an ascending (non-decreasing) sorted array rotated some number of steps, e.g. 2 5 6 0 0 1 2');
  return { nums, target: parseInt1(b, -99, 999, 'Target') };
}

function build({ nums, target }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let lo = 0;
  let hi = n - 1;
  let iter = 0;
  const ptrs = (mid?: number): Pointer[] => [
    ...(lo < n ? [ptr('lo', 'lo', lo, 'blue')] : []),
    ...(mid !== undefined ? [ptr('mid', 'mid', mid, 'orange')] : []),
    ...(hi >= 0 ? [ptr('hi', 'hi', hi, 'purple')] : []),
  ];
  const vars = (mid: number | string) => ({ lo, mid, hi, iterations: iter });

  steps.push({
    title: 'Start', desc: `Is ${target} in this rotated array of ${n} (duplicates allowed)?`,
    cells: windowCells(nums, lo, hi), pointers: ptrs(), vars: vars('—'),
    logic: 'Duplicates can hide which half is sorted: when nums[lo] = nums[mid] = nums[hi] we cannot tell. In that case we peel off both ends.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  while (lo <= hi) {
    iter++;
    const mid = lo + Math.floor((hi - lo) / 2);
    const hit = nums[mid] === target;
    steps.push({
      title: `mid = ${mid}`, desc: `nums[${mid}] = ${nums[mid]}${hit ? ` equals the target ${target}.` : ` is not ${target}.`}`,
      cells: windowCells(nums, lo, hi, { [mid]: hit ? 'found' : 'compare' }), pointers: ptrs(mid), vars: vars(mid),
      logic: hit ? 'Return true.' : 'Not a hit; work out which half can be trusted.', logicTone: hit ? 'success' : 'info', javaLines: [3, 4], pyLines: [3, 4, 5], algoStep: 1,
    });
    if (hit) {
      steps[steps.length - 1].result = { title: 'true', text: `${target} is in the array (index ${mid})` };
      return steps;
    }
    if (nums[lo] === nums[mid] && nums[mid] === nums[hi]) {
      const l0 = lo;
      const h0 = hi;
      lo++;
      hi--;
      steps.push({
        title: 'Ambiguous: lo, mid, hi all equal', desc: `nums[${l0}] = nums[${mid}] = nums[${h0}] = ${nums[mid]}. We cannot tell which half is sorted, so drop both ends: lo = ${lo}, hi = ${hi}.`,
        cells: windowCells(nums, lo, hi), pointers: ptrs(), vars: vars(mid),
        logic: 'nums[mid] is not the target and equals both ends, so neither end can be the target either. Dropping them is safe, but this is why the worst case is O(n).', logicTone: 'warn',
        javaLines: [5, 6], pyLines: [6, 7, 8], algoStep: 2,
      });
      continue;
    }
    const leftSorted = nums[lo] <= nums[mid];
    const marks: Record<number, CellState> = {};
    for (let i = leftSorted ? lo : mid; i <= (leftSorted ? mid : hi); i++) marks[i] = 'active';
    marks[mid] = 'compare';
    steps.push({
      title: leftSorted ? 'Left half [lo..mid] is sorted' : 'Right half [mid..hi] is sorted',
      desc: leftSorted ? `nums[lo] = ${nums[lo]} ≤ nums[mid] = ${nums[mid]}.` : `nums[lo] = ${nums[lo]} > nums[mid] = ${nums[mid]}, so the right half is ascending.`,
      cells: windowCells(nums, lo, hi, marks), pointers: ptrs(mid), vars: vars(mid),
      logic: 'Blue cells show the half whose order we can trust.', logicTone: 'info', javaLines: leftSorted ? [7] : [10], pyLines: leftSorted ? [9] : [14], algoStep: 2,
    });
    const inside = leftSorted ? nums[lo] <= target && target < nums[mid] : nums[mid] < target && target <= nums[hi];
    const goLeft = leftSorted ? inside : !inside;
    if (goLeft) hi = mid - 1;
    else lo = mid + 1;
    steps.push({
      title: inside ? 'Target is inside the sorted half' : 'Target is outside the sorted half',
      desc: `${inside ? 'Keep' : 'Discard'} the sorted half → ${goLeft ? `hi = ${mid - 1}` : `lo = ${mid + 1}`}.`,
      cells: windowCells(nums, lo, hi), pointers: ptrs(), vars: vars(mid),
      logic: inside ? 'A range check on a sorted half is reliable.' : 'So the target can only be in the other half.', logicTone: 'warn',
      javaLines: leftSorted ? (goLeft ? [8] : [9]) : (goLeft ? [12] : [11]), pyLines: leftSorted ? (goLeft ? [10, 11] : [12, 13]) : (goLeft ? [17, 18] : [15, 16]), algoStep: 3,
    });
  }

  steps.push({
    title: 'Not found', desc: `The window is empty, so ${target} is not in the array.`,
    cells: nums.map((value, i) => ({ key: i, value, state: 'dim' as const })), pointers: [], vars: vars('—'),
    logic: 'Return false.', logicTone: 'warn', javaLines: [15], pyLines: [19], algoStep: 3,
    result: { title: 'false', text: `${target} is not present` },
  });
  return steps;
}

export const searchInRotatedSortedArrayIi: ProblemDef<In> = {
  slug: '81-search-in-rotated-sorted-array-ii', id: '81', title: 'Search in Rotated Sorted Array II', difficulty: 'Medium', category: 'Binary Search', tag: 'binary search + duplicates',
  statement: 'A non-decreasing array (duplicates allowed) was rotated at an unknown pivot. Return true if the target is present, otherwise false. Duplicates can make the sorted half ambiguous, so the worst case degrades to O(n).',
  constraints: '1 ≤ n ≤ 5000 · values may repeat (animation input is limited to 14 numbers)',
  examples: [
    { label: '[2,5,6,0,0,1,2], 0', input: { nums: [2, 5, 6, 0, 0, 1, 2], target: 0 }, output: 'true' },
    { label: '[2,5,6,0,0,1,2], 3', input: { nums: [2, 5, 6, 0, 0, 1, 2], target: 3 }, output: 'false' },
    { label: '[1,0,1,1,1], 0', input: { nums: [1, 0, 1, 1, 1], target: 0 }, output: 'true' },
  ],
  inputPlaceholder: 'e.g. 2 5 6 0 0 1 2 ; 0',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Middle', state: 'compare' }, { label: 'Sorted half', state: 'active' }, { label: 'Found', state: 'found' }, { label: 'Discarded', state: 'dim' }],
  varLabels: ['lo', 'mid', 'hi', 'iterations'],
  approach: {
    title: 'Same idea as before, plus a tie-breaker for duplicates',
    text: 'Use the "one half is sorted" test from the distinct version. The only new case is nums[lo] == nums[mid] == nums[hi], where the sorted half cannot be identified; shrink the window by one from both ends and try again.',
  },
  java: [
    'public boolean search(int[] nums, int target) {',
    '    int lo = 0, hi = nums.length - 1;',
    '    while (lo <= hi) {',
    '        int mid = lo + (hi - lo) / 2;',
    '        if (nums[mid] == target) return true;',
    '        if (nums[lo] == nums[mid] && nums[mid] == nums[hi]) {',
    '            lo++; hi--;',
    '        } else if (nums[lo] <= nums[mid]) {',
    '            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;',
    '            else lo = mid + 1;',
    '        } else {',
    '            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;',
    '            else hi = mid - 1;',
    '        }',
    '    }',
    '    return false;',
    '}',
  ],
  python: [
    'def search(nums, target):',
    '    lo, hi = 0, len(nums) - 1',
    '    while lo <= hi:',
    '        mid = lo + (hi - lo) // 2',
    '        if nums[mid] == target:',
    '            return True',
    '        if nums[lo] == nums[mid] == nums[hi]:',
    '            lo += 1',
    '            hi -= 1',
    '        elif nums[lo] <= nums[mid]:',
    '            if nums[lo] <= target < nums[mid]:',
    '                hi = mid - 1',
    '            else:',
    '                lo = mid + 1',
    '        else:',
    '            if nums[mid] < target <= nums[hi]:',
    '                lo = mid + 1',
    '            else:',
    '                hi = mid - 1',
    '    return False',
  ],
  algorithm: [
    'Set lo = 0, hi = n − 1',
    'Take mid; if nums[mid] is the target return true',
    'If lo, mid and hi are equal shrink both ends; otherwise find the sorted half',
    'Keep the sorted half if the target is inside it, otherwise keep the other half',
  ],
  complexity: [{ label: 'Time', value: 'O(log n) typical, O(n) worst case' }, { label: 'Space', value: 'O(1)' }],
  why: 'With distinct values one half is always provably sorted. With duplicates, nums[lo] = nums[mid] = nums[hi] says nothing about where the pivot is, e.g. [1,1,1,0,1]. Since mid was already ruled out and equals both ends, dropping lo and hi loses nothing; all other cases keep the original argument.',
};
