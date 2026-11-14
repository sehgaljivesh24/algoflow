import type { Cell, CellState, ProblemDef, Step } from '../engine/types';
import { plural, verb } from './text.ts';

interface In { nums: number[]; target: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: sorted numbers ; target — e.g. 1 3 5 7 9 ; 7');
  const nums = left.split(/[\s,]+/).filter(Boolean).map(Number);
  const target = Number(right.trim());
  if (!nums.length || nums.some((n) => !Number.isInteger(n)) || !Number.isInteger(target)) {
    throw new Error('Use whole numbers, e.g. 1 3 5 7 9 ; 7');
  }
  if (nums.length > 16) throw new Error('Use 16 numbers or fewer');
  for (let i = 1; i < nums.length; i++) if (nums[i] < nums[i - 1]) throw new Error('Numbers must be sorted ascending');
  return { nums, target };
}

/** Per round: MID, COMPARE, DISCARD (or FOUND). Init and the final step bracket the rounds. */
function build({ nums, target }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let lo = 0;
  let hi = n - 1;
  let iter = 0;

  // Surviving window = active, discarded cells = dim, the probed middle = compare / found.
  const cells = (lo: number, hi: number, mid?: number, found?: boolean): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined = i < lo || i > hi ? 'dim' : 'active';
      if (i === mid) state = found ? 'found' : 'compare';
      return { key: i, value, state };
    });
  const ptrs = (lo: number, hi: number, mid?: number) => [
    ...(lo >= 0 && lo < n ? [{ id: 'lo', label: 'lo', index: lo, tone: 'blue' as const }] : []),
    ...(mid !== undefined ? [{ id: 'mid', label: 'mid', index: mid, tone: 'orange' as const }] : []),
    ...(hi >= 0 && hi < n ? [{ id: 'hi', label: 'hi', index: hi, tone: 'purple' as const }] : []),
  ];
  const vars = (lo: number | string, mid: number | string, hi: number | string) => ({ lo, mid, hi, iterations: iter });
  /** The compare box: what sits at mid, the target, and the verdict once known. */
  const box = (items: string[], highlight?: number): Step['aux'] => [{ title: 'Compare box — nums[mid] vs target', kind: 'list', items, highlight }];

  steps.push({
    title: 'Start', tag: 'INIT —',
    desc: `lo = 0, hi = ${n - 1}: all ${plural(n, 'cell')} ${verb(n, 'is a candidate', 'are candidates')} while we hunt for ${target}.`,
    cells: cells(0, n - 1), pointers: ptrs(0, n - 1), vars: vars(0, '—', n - 1),
    aux: box([`target = ${target}`, `window = [0..${n - 1}]`, `size = ${n}`]),
    logic: 'The whole array is the search window. Each comparison will discard half of it.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0, note: `lo = 0, hi = ${n} − 1 = ${n - 1}`,
  });

  while (lo <= hi) {
    iter++;
    const mid = lo + Math.floor((hi - lo) / 2);
    const v = nums[mid];
    steps.push({
      title: `Pick the middle: mid = ${mid}`, tag: `ROUND ${iter} · MID —`,
      desc: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}, so we probe nums[${mid}] = ${v}.`,
      cells: cells(lo, hi, mid), pointers: ptrs(lo, hi, mid), vars: vars(lo, mid, hi),
      aux: box([`nums[${mid}] = ${v}`, `target = ${target}`, `window = [${lo}..${hi}]`]),
      logic: 'Writing it as lo + (hi − lo) / 2 avoids integer overflow for very large indexes.', logicTone: 'info',
      javaLines: [3], pyLines: [3], algoStep: 1, note: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}`,
    });
    const verdict = v === target ? `${v} == ${target}` : v < target ? `${v} < ${target}` : `${v} > ${target}`;
    steps.push({
      title: v === target ? 'Equal' : v < target ? 'Too small' : 'Too big', tag: 'COMPARE —',
      desc: v === target ? `nums[${mid}] = ${v} equals the target ${target}: the search is over.` : v < target ? `nums[${mid}] = ${v} is smaller than ${target}, so the target can only be to the right.` : `nums[${mid}] = ${v} is bigger than ${target}, so the target can only be to the left.`,
      cells: cells(lo, hi, mid), pointers: ptrs(lo, hi, mid), vars: vars(lo, mid, hi),
      aux: box([`nums[${mid}] = ${v}`, `target = ${target}`, `${verdict} → ${v === target ? 'hit' : v < target ? 'go right' : 'go left'}`], 2),
      logic: v === target ? 'A hit ends the loop immediately.' : 'One comparison is enough to decide which half cannot contain the target.', logicTone: v === target ? 'success' : 'info',
      javaLines: [4], pyLines: [4], algoStep: 2, note: v === target ? `${v} == ${target} ✓` : `${v} == ${target}? no · ${verdict}`,
    });
    if (v === target) {
      steps.push({
        title: 'Found it!', tag: '✅ Found!',
        desc: `nums[${mid}] = ${v} equals the target. Return index ${mid} after ${iter} round${iter === 1 ? '' : 's'}.`,
        cells: cells(lo, hi, mid, true), pointers: ptrs(lo, hi, mid), vars: vars(lo, mid, hi),
        aux: box([`nums[${mid}] = ${v}`, `target = ${target}`, `index = ${mid}`], 2),
        logic: `Return index ${mid}.`, logicTone: 'success', javaLines: [4], pyLines: [4, 5], algoStep: 4,
        note: `return ${mid}`,
        result: { title: `Index ${mid}`, text: `Found ${target} after ${iter} iteration${iter === 1 ? '' : 's'}` },
      });
      return steps;
    }
    const goRight = v < target;
    const oldLo = lo;
    const oldHi = hi;
    if (goRight) lo = mid + 1;
    else hi = mid - 1;
    const gone = goRight ? `[${oldLo}..${mid}]` : `[${mid}..${oldHi}]`;
    steps.push({
      title: goRight ? 'Discard the left half' : 'Discard the right half', tag: 'DISCARD —',
      desc: goRight ? `${gone} is too small to hold ${target}: lo = ${mid} + 1 = ${lo}. Window is now [${lo}..${hi}].` : `${gone} is too big to hold ${target}: hi = ${mid} − 1 = ${hi}. Window is now [${lo}..${hi}].`,
      cells: cells(lo, hi), pointers: ptrs(lo, hi), vars: vars(lo, mid, hi),
      aux: box([`nums[${mid}] = ${v}`, `target = ${target}`, `window = ${lo <= hi ? `[${lo}..${hi}]` : 'empty'}`], 2),
      logic: 'Half of the window is discarded without looking at it.', logicTone: 'warn',
      javaLines: goRight ? [5] : [6], pyLines: goRight ? [6, 7] : [8, 9], algoStep: 3,
      note: goRight ? `lo = ${mid} + 1 = ${lo}` : `hi = ${mid} − 1 = ${hi}`,
    });
  }

  steps.push({
    title: 'Not found', tag: 'NOT FOUND —',
    desc: `lo = ${lo} passed hi = ${hi}: the window is empty after ${iter} round${iter === 1 ? '' : 's'}, so ${target} is not here.`,
    cells: nums.map((value, i) => ({ key: i, value, state: 'dim' as const })), pointers: [], vars: vars(lo, '—', hi),
    aux: box([`target = ${target}`, `window = empty`, `lo = ${lo} > hi = ${hi}`], 1),
    alert: `Window is empty (lo = ${lo} > hi = ${hi}): ${target} is not in the array.`,
    logic: `${target} is not in the array. Return −1.`, logicTone: 'warn', javaLines: [8], pyLines: [10], algoStep: 4,
    note: `${lo} <= ${hi} is false → return −1`,
    result: { title: '−1', text: `${target} is not present` },
  });
  return steps;
}

export const binarySearch: ProblemDef<In> = {
  slug: '704-binary-search',
  id: '704', title: 'Binary Search', difficulty: 'Easy', category: 'Binary Search', tag: 'classic binary search',
  statement:
    'Given a sorted array of distinct integers and a target, return the index of the target, or −1 if it is not present. Your algorithm must run in O(log n).',
  constraints: '1 ≤ n ≤ 10⁴ · array sorted ascending (animation input is limited to 16 numbers)',
  examples: [
    { label: '[−1,0,3,5,9,12], 9', input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 }, output: '4', answer: '4 (nums[4] = 9, found in 2 rounds)' },
    { label: '[−1,0,3,5,9,12], 2', input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 }, output: '−1' },
    { label: '[1,3,5,7,9,11,13,15], 13', input: { nums: [1, 3, 5, 7, 9, 11, 13, 15], target: 13 }, output: '6' },
  ],
  inputPlaceholder: 'e.g. 1 3 5 7 9 ; 7',
  parseInput: parse,
  buildSteps: build,
  viz: 'cells',
  legend: [{ label: 'Search window', state: 'active' }, { label: 'Middle (probe)', state: 'compare' }, { label: 'Found', state: 'found' }, { label: 'Discarded', state: 'dim' }],
  varLabels: ['lo', 'mid', 'hi', 'iterations'],
  approach: {
    title: 'Halve the search window every step',
    text: 'Keep a window [lo, hi]. Look at the middle: if it is the target you are done; if it is too small throw away the left half, otherwise throw away the right half.',
  },
  java: [
    'public int search(int[] nums, int target) {',
    '    int lo = 0, hi = nums.length - 1;',
    '    while (lo <= hi) {',
    '        int mid = lo + (hi - lo) / 2;',
    '        if (nums[mid] == target) return mid;',
    '        if (nums[mid] < target) lo = mid + 1;',
    '        else hi = mid - 1;',
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
    '        if nums[mid] < target:',
    '            lo = mid + 1',
    '        else:',
    '            hi = mid - 1',
    '    return -1',
  ],
  algorithm: [
    'Set lo = 0 and hi = n − 1',
    'While lo ≤ hi, take mid = lo + (hi − lo) / 2',
    'Compare nums[mid] with the target',
    'Smaller → lo = mid + 1; bigger → hi = mid − 1 (the other half is discarded)',
    'Equal → return mid; window empty → return −1',
  ],
  phases: [
    { icon: '🎬', label: 'Init (lo, hi)', tone: 'blue' },
    { icon: '📍', label: 'Compute mid', tone: 'cyan' },
    { icon: '⚖️', label: 'Compare', tone: 'gold' },
    { icon: '✂️', label: 'Discard half', tone: 'orange' },
    { icon: '✅', label: 'Found / Done', tone: 'green' },
  ],
  emphasis: ['sorted', 'index of the target', 'O(log n)'],
  complexity: [{ label: 'Time', value: 'O(log n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The answer, if it exists, is always inside [lo, hi]. Each comparison removes at least half of the window, so at most log₂(n) + 1 comparisons are needed.',
};
