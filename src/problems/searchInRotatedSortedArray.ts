import type { CellState, Pointer, ProblemDef, Step } from '../engine/types.ts';
import { parseInt1, parseNums, parseParts, ptr, windowCells } from './ssbShared.ts';
import { isRotation } from './findMinimumInRotatedSortedArray.ts';

interface In { nums: number[]; target: number }

function parse(raw: string): In {
  const [a, b] = parseParts(raw, 2, 'rotated sorted numbers ; target — e.g. 4 5 6 7 0 1 2 ; 0');
  const nums = parseNums(a, { maxLen: 14, lo: -99, hi: 999 });
  if (new Set(nums).size !== nums.length) throw new Error('Values must be distinct');
  if (!isRotation(nums)) throw new Error('The array must be an ascending sorted array rotated some number of steps, e.g. 4 5 6 7 0 1 2');
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
  const box = (items: string[], highlight?: number): Step['aux'] => [{ title: 'Compare box — what mid tells us', kind: 'list', items, highlight }];
  const win = () => (lo <= hi ? `[${lo}..${hi}]` : 'empty');

  steps.push({
    title: 'Start', tag: 'INIT —', desc: `lo = 0, hi = ${n - 1}. Hunt for ${target} in a rotated sorted array of ${n}: the order restarts somewhere, but one side of any split stays sorted.`,
    cells: windowCells(nums, lo, hi), pointers: ptrs(), vars: vars('—'), aux: box([`target = ${target}`, `window = ${win()}`]),
    logic: 'After any split at mid, at least one half is still perfectly sorted. We find that half, check if the target falls inside it, and keep or discard it.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0, note: `lo = 0, hi = ${n} − 1 = ${n - 1}`,
  });

  while (lo <= hi) {
    iter++;
    const mid = lo + Math.floor((hi - lo) / 2);
    const v = nums[mid];
    steps.push({
      title: `mid = ${mid}`, tag: `ROUND ${iter} · MID —`,
      desc: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}: nums[${mid}] = ${v} ${v === target ? `equals the target ${target}.` : `is not ${target}.`}`,
      cells: windowCells(nums, lo, hi, { [mid]: v === target ? 'found' : 'compare' }), pointers: ptrs(mid), vars: vars(mid),
      aux: box([`nums[${mid}] = ${v}`, `target = ${target}`, v === target ? `${v} == ${target} → hit` : `${v} != ${target} → keep looking`], 2),
      logic: v === target ? `Return ${mid}.` : 'Not a hit; decide which half to keep.', logicTone: v === target ? 'success' : 'info', javaLines: [3, 4], pyLines: [3, 4, 5], algoStep: 1,
      note: `nums[${mid}] = ${v} ${v === target ? '==' : '!='} ${target}`,
    });
    if (v === target) {
      steps.push({
        title: 'Found it!', tag: '✅ Found!', desc: `nums[${mid}] = ${v} is the target. Return index ${mid} after ${iter} round${iter === 1 ? '' : 's'}.`,
        cells: windowCells(nums, lo, hi, { [mid]: 'found' }), pointers: ptrs(mid), vars: vars(mid),
        aux: box([`nums[${mid}] = ${v}`, `target = ${target}`, `index = ${mid}`], 2),
        logic: `Return ${mid}.`, logicTone: 'success', javaLines: [4], pyLines: [4, 5], algoStep: 4, note: `return ${mid}`,
        result: { title: String(mid), text: `Found ${target} at index ${mid}` },
      });
      return steps;
    }
    const leftSorted = nums[lo] <= v;
    const marks: Record<number, CellState> = {};
    for (let i = leftSorted ? lo : mid; i <= (leftSorted ? mid : hi); i++) marks[i] = 'active';
    marks[mid] = 'compare';
    steps.push({
      title: leftSorted ? 'Left half [lo..mid] is sorted' : 'Right half [mid..hi] is sorted', tag: 'WHICH HALF IS SORTED —',
      desc: leftSorted ? `nums[lo] = ${nums[lo]} ≤ nums[mid] = ${v}, so indexes ${lo}..${mid} are in ascending order.` : `nums[lo] = ${nums[lo]} > nums[mid] = ${v}, so the pivot is on the left and indexes ${mid}..${hi} are ascending.`,
      cells: windowCells(nums, lo, hi, marks), pointers: ptrs(mid), vars: vars(mid),
      aux: box([`nums[lo] = ${nums[lo]}`, `nums[mid] = ${v}`, leftSorted ? `${nums[lo]} ≤ ${v} → left sorted` : `${nums[lo]} > ${v} → right sorted`], 2),
      logic: 'Highlighted cells show the half whose order we can trust.', logicTone: 'info', javaLines: leftSorted ? [5] : [8], pyLines: leftSorted ? [6] : [11], algoStep: 2,
      note: leftSorted ? `${nums[lo]} <= ${v} → left half sorted` : `${nums[lo]} <= ${v}? no → right half sorted`,
    });
    const inside = leftSorted ? nums[lo] <= target && target < v : v < target && target <= nums[hi];
    const goLeft = leftSorted ? inside : !inside;
    const range = leftSorted ? `${nums[lo]} ≤ ${target} < ${v}` : `${v} < ${target} ≤ ${nums[hi]}`;
    if (goLeft) hi = mid - 1;
    else lo = mid + 1;
    steps.push({
      title: inside ? 'Target is inside the sorted half' : 'Target is outside the sorted half', tag: inside ? 'INSIDE → KEEP SORTED HALF —' : 'OUTSIDE → DISCARD IT —',
      desc: `${range} is ${inside ? 'true' : 'false'}, so ${inside ? 'keep' : 'discard'} the sorted half: ${goLeft ? `hi = ${mid} − 1 = ${hi}` : `lo = ${mid} + 1 = ${lo}`}. Window ${win()}.`,
      cells: windowCells(nums, lo, hi), pointers: ptrs(), vars: vars(mid),
      aux: box([`target = ${target}`, `${range}? ${inside ? 'yes' : 'no'}`, `window = ${win()}`], 1),
      logic: inside ? `${target} lies within the sorted range, so it can only be in that half.` : `${target} is not within the sorted range, so it must be in the other half.`, logicTone: 'warn',
      javaLines: leftSorted ? (goLeft ? [6] : [7]) : (goLeft ? [10] : [9]), pyLines: leftSorted ? (goLeft ? [7, 8] : [9, 10]) : (goLeft ? [14, 15] : [12, 13]), algoStep: 3,
      note: goLeft ? `hi = mid − 1 = ${hi}` : `lo = mid + 1 = ${lo}`,
    });
  }

  steps.push({
    title: 'Not found', tag: 'NOT FOUND —', desc: `lo = ${lo} passed hi = ${hi}: the window is empty after ${iter} round${iter === 1 ? '' : 's'}, so ${target} is not in the array.`,
    cells: nums.map((value, i) => ({ key: i, value, state: 'dim' as const })), pointers: [], vars: vars('—'),
    aux: box([`target = ${target}`, 'window = empty'], 1), alert: `Window is empty: ${target} is not in the array.`,
    logic: 'Return −1.', logicTone: 'warn', javaLines: [13], pyLines: [16], algoStep: 4, note: 'loop ends → return −1',
    result: { title: '-1', text: `${target} is not present` },
  });
  return steps;
}

export const searchInRotatedSortedArray: ProblemDef<In> = {
  slug: '33-search-in-rotated-sorted-array', id: '33', title: 'Search in Rotated Sorted Array', difficulty: 'Medium', category: 'Binary Search', tag: 'binary search',
  statement: 'An ascending array of distinct integers was rotated at an unknown pivot, e.g. [0,1,2,4,5,6,7] → [4,5,6,7,0,1,2]. Return the index of a target in it, or −1 if it is absent, in O(log n).',
  constraints: '1 ≤ n ≤ 5000 · distinct values (animation input is limited to 14 numbers)',
  examples: [
    { label: '[4,5,6,7,0,1,2], 0', input: { nums: [4, 5, 6, 7, 0, 1, 2], target: 0 }, output: '4' },
    { label: '[4,5,6,7,0,1,2], 3', input: { nums: [4, 5, 6, 7, 0, 1, 2], target: 3 }, output: '−1' },
    { label: '[6,7,8,1,2,3,4,5], 8', input: { nums: [6, 7, 8, 1, 2, 3, 4, 5], target: 8 }, output: '2' },
  ],
  inputPlaceholder: 'e.g. 4 5 6 7 0 1 2 ; 0',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Middle', state: 'compare' }, { label: 'Sorted half', state: 'active' }, { label: 'Found', state: 'found' }, { label: 'Discarded', state: 'dim' }],
  varLabels: ['lo', 'mid', 'hi', 'iterations'],
  approach: {
    title: 'One half is always sorted',
    text: 'At every mid, either [lo..mid] or [mid..hi] is in ascending order. Test whether the target falls inside that sorted half using plain comparisons; if so keep it, otherwise keep the other half.',
  },
  java: [
    'public int search(int[] nums, int target) {',
    '    int lo = 0, hi = nums.length - 1;',
    '    while (lo <= hi) {',
    '        int mid = lo + (hi - lo) / 2;',
    '        if (nums[mid] == target) return mid;',
    '        if (nums[lo] <= nums[mid]) {            // left half sorted',
    '            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;',
    '            else lo = mid + 1;',
    '        } else {                                 // right half sorted',
    '            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;',
    '            else hi = mid - 1;',
    '        }',
    '    }',
    '    return -1;',
    '}',
  ],
  python: [
    'def search(nums, target):',
    '    lo, hi = 0, len(nums) - 1',
    '    while lo <= hi:',
    '        mid = lo + (hi - lo) // 2',
    '        if nums[mid] == target:',
    '            return mid',
    '        if nums[lo] <= nums[mid]:',
    '            if nums[lo] <= target < nums[mid]:',
    '                hi = mid - 1',
    '            else:',
    '                lo = mid + 1',
    '        else:',
    '            if nums[mid] < target <= nums[hi]:',
    '                lo = mid + 1',
    '            else:',
    '                hi = mid - 1',
    '    return -1',
  ],
  algorithm: [
    'Set lo = 0, hi = n − 1',
    'Take mid; if nums[mid] is the target return mid',
    'Find the sorted half: nums[lo] ≤ nums[mid] means the left half',
    'If the target is inside that half keep it, otherwise keep the other half',
    'Found → return mid; window empty → return −1',
  ],
  phases: [
    { icon: '🎬', label: 'Init (lo, hi)', tone: 'blue' },
    { icon: '📍', label: 'Probe mid', tone: 'cyan' },
    { icon: '🔎', label: 'Which half is sorted?', tone: 'gold' },
    { icon: '✂️', label: 'Keep / discard', tone: 'orange' },
    { icon: '✅', label: 'Found / Done', tone: 'green' },
  ],
  emphasis: ['rotated', 'index of a target', 'O(log n)'],
  complexity: [{ label: 'Time', value: 'O(log n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The pivot can only be in one of the two halves, so the other half contains no wrap-around and is monotone; range checks on a monotone half are reliable. If the target is not inside it, it can only be in the half with the pivot. The target, if present, is always inside [lo, hi].',
};
