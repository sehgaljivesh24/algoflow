import type { Cell, Pointer, ProblemDef, Step } from '../engine/types.ts';
import { parseNums, ptr } from './ssbShared.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = parseNums(raw, { maxLen: 12, lo: 0, hi: 12, what: 'numbers' });
  const n = nums.length;
  if (nums.some((v) => v > n)) throw new Error(`With ${n} numbers, every value must be between 0 and ${n}`);
  if (new Set(nums).size !== n) throw new Error('Values must be distinct (each of 0..n appears at most once)');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  const order = nums.map((_, i) => i).sort((a, b) => nums[a] - nums[b]);
  const sorted = order.map((k) => nums[k]);
  const keyCells = (vals: number[], keys: number[], lo: number, hi: number, marks: Record<number, 'compare' | 'found'> = {}): Cell[] =>
    vals.map((value, i) => ({ key: keys[i], value, state: marks[i] ?? (i < lo || i > hi ? 'dim' : undefined) }));
  let lo = 0;
  let hi = n - 1;
  let iter = 0;
  const vars = (mid: number | string, v: number | string) => ({ lo, mid, hi, 'nums[mid]': v, iterations: iter });
  const ptrs = (mid?: number): Pointer[] => [
    ...(lo < n ? [ptr('lo', 'lo', lo, 'blue')] : []),
    ...(mid !== undefined ? [ptr('mid', 'mid', mid, 'orange')] : []),
    ...(hi >= 0 ? [ptr('hi', 'hi', hi, 'purple')] : []),
  ];

  steps.push({
    title: 'Start', tag: 'START —', desc: `${n} distinct numbers taken from 0..${n}: exactly one value of 0..${n} is missing, and the array is in scrambled order.`,
    cells: nums.map((value, i) => ({ key: i, value })), pointers: [], vars: vars('—', '—'),
    logic: 'If the numbers were sorted, every value before the gap would sit at its own index. That pattern is something binary search can exploit.', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0, note: `n = ${n}, values from 0..${n}`,
  });
  steps.push({
    title: 'Sort the array', tag: 'SORT:', desc: `sorted: [${sorted.join(', ')}]; now nums[i] == i until the gap, and nums[i] == i + 1 after it.`,
    cells: keyCells(sorted, order, 0, n - 1), pointers: [], vars: vars('—', '—'),
    logic: 'Sorting costs O(n log n); the XOR / sum tricks avoid it, but this version shows the binary-search idea.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0, note: `Arrays.sort → [${sorted.join(', ')}]`,
  });

  while (lo <= hi) {
    iter++;
    const mid = lo + Math.floor((hi - lo) / 2);
    const big = sorted[mid] > mid;
    steps.push({
      title: `Compare nums[${mid}] with its index ${mid}`, tag: 'COMPARE:', desc: `mid = ${mid}: nums[${mid}] = ${sorted[mid]} ${big ? '>' : '=='} index ${mid}, so ${big ? 'the value is ahead of its index' : 'the value sits exactly at its index'}.`,
      cells: keyCells(sorted, order, lo, hi, { [mid]: 'compare' }), pointers: ptrs(mid), vars: vars(mid, sorted[mid]),
      logic: big ? 'The value is ahead of its index, so the gap is at mid or somewhere to its left.' : 'The value matches its index, so nothing is missing up to mid: the gap is to the right.', logicTone: 'info',
      javaLines: [3, 4], pyLines: [3, 4], algoStep: 1, note: `nums[${mid}] = ${sorted[mid]} ${big ? '>' : '=='} ${mid}`,
    });
    if (big) hi = mid - 1;
    else lo = mid + 1;
    steps.push({
      title: big ? 'Gap is at mid or left: hi = mid − 1' : 'Gap is to the right: lo = mid + 1', tag: big ? 'SHRINK ←' : 'SHRINK →',
      desc: big ? `the gap is at ${mid} or left of it: hi = ${mid} − 1 = ${hi}, so the window is [${lo}, ${hi}].` : `indexes up to ${mid} are all in place: lo = ${mid} + 1 = ${lo}, so the window is [${lo}, ${hi}].`,
      cells: keyCells(sorted, order, lo, hi), pointers: ptrs(), vars: vars(mid, sorted[mid]),
      logic: 'We are binary searching for the first index where value ≠ index.', logicTone: 'warn',
      javaLines: big ? [5] : [6], pyLines: big ? [5, 6] : [7, 8], algoStep: 2, note: big ? `hi = ${mid} − 1 = ${hi}` : `lo = ${mid} + 1 = ${lo}`,
    });
  }

  const at = Math.min(lo, n - 1);
  steps.push({
    title: 'Window closed', tag: 'CLOSED:', desc: `lo = ${lo} is now greater than hi = ${hi}, so the search ends and lo marks the first index where value ≠ index${lo === n ? ' (none, so the gap is after the end)' : ''}.`,
    cells: keyCells(sorted, order, 0, n - 1, { [at]: 'compare' }), pointers: ptrs(), vars: vars('—', '—'),
    logic: 'lo is the first index whose value is ahead of the index (or n when no index qualifies).', logicTone: 'info',
    javaLines: [3, 8], pyLines: [3, 9], algoStep: 3, note: `${lo} ≤ ${hi} is false → return lo`,
  });
  steps.push({
    title: `Missing number = ${lo}`, tag: '✅ Done!', desc: `values 0..${lo - 1} sit at their own indexes, so ${lo} is the number that is absent from the array.`,
    cells: keyCells(sorted, order, 0, n - 1, { [at]: 'found' }), pointers: [ptr('ans', lo === n ? `${lo} (after end)` : `missing ${lo}`, at, 'green')], vars: vars('—', '—'),
    logic: `All indexes below ${lo} satisfy nums[i] = i, so values 0..${lo - 1} are present and ${lo} is not.`, logicTone: 'success',
    javaLines: [8], pyLines: [9], algoStep: 4, note: `return ${lo}`,
    result: { title: String(lo), text: `${lo} is the missing number` },
  });
  return steps;
}

export const missingNumber: ProblemDef<In> = {
  slug: '268-missing-number', id: '268', title: 'Missing Number', difficulty: 'Easy', category: 'Binary Search', tag: 'math / XOR',
  statement: 'An array holds n distinct numbers taken from the range 0..n. Return the one number in that range that is missing. This animation sorts the array and then binary searches for the first index whose value is not equal to the index.',
  constraints: '1 ≤ n ≤ 10⁴ · distinct values in [0, n] (animation input is limited to 12 numbers)',
  examples: [
    { label: '[3,0,1]', input: { nums: [3, 0, 1] }, output: '2' },
    { label: '[0,1]', input: { nums: [0, 1] }, output: '2' },
    { label: '[9,6,4,2,3,5,7,0,1]', input: { nums: [9, 6, 4, 2, 3, 5, 7, 0, 1] }, output: '8' },
  ],
  inputPlaceholder: 'e.g. 3 0 1',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Middle', state: 'compare' }, { label: 'Answer', state: 'found' }, { label: 'Discarded', state: 'dim' }],
  varLabels: ['lo', 'mid', 'hi', 'nums[mid]', 'iterations'],
  approach: {
    title: 'After sorting, value = index until the gap',
    text: 'Sort the numbers. Before the missing value, nums[i] == i; from the gap onward, nums[i] == i + 1. Binary search for the first index where nums[i] > i.',
  },
  java: [
    'public int missingNumber(int[] nums) {',
    '    Arrays.sort(nums);',
    '    int lo = 0, hi = nums.length - 1;',
    '    while (lo <= hi) {',
    '        int mid = lo + (hi - lo) / 2;',
    '        if (nums[mid] > mid) hi = mid - 1;',
    '        else lo = mid + 1;',
    '    }',
    '    return lo;',
    '}',
  ],
  python: [
    'def missing_number(nums):',
    '    nums.sort()',
    '    lo, hi = 0, len(nums) - 1',
    '    while lo <= hi:',
    '        mid = lo + (hi - lo) // 2',
    '        if nums[mid] > mid:',
    '            hi = mid - 1',
    '        else:',
    '            lo = mid + 1',
    '    return lo',
  ],
  phases: [
    { icon: '🔃', label: 'Sort the array', tone: 'blue' },
    { icon: '🔍', label: 'Compare nums[mid] with mid', tone: 'cyan' },
    { icon: '✂️', label: 'Shrink the window', tone: 'orange' },
    { icon: '🔒', label: 'Window closes', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['n distinct numbers', 'range 0..n', 'missing'],
  algorithm: [
    'Sort the array',
    'Take mid and compare nums[mid] with mid',
    'nums[mid] > mid → hi = mid − 1; otherwise lo = mid + 1',
    'When lo passes hi the window closes',
    'Done: lo is the missing number',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n) for the sort, O(log n) search' }, { label: 'Space', value: 'O(1)' }],
  why: 'In sorted order, the predicate "nums[i] > i" is false for all indexes before the gap and true for all indexes from the gap on, so it is monotone and binary search finds its first true index. That index equals the missing value (or n if no index qualifies).',
};
