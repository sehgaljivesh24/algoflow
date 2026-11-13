import type { ProblemDef, Step } from '../engine/types.ts';
import { parseNums, ptr, windowCells } from './ssbShared.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = parseNums(raw, { maxLen: 12, lo: 0, hi: 99, what: 'heights' });
  for (let i = 1; i < nums.length; i++) if (nums[i] === nums[i - 1]) throw new Error('Neighbouring values must differ (no two equal side by side)');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let lo = 0;
  let hi = n - 1;
  let iter = 0;
  const ptrs = (mid?: number) => [
    ptr('lo', 'lo', lo, 'blue'),
    ...(mid !== undefined ? [ptr('mid', 'mid', mid, 'orange')] : []),
    ...(hi !== mid ? [ptr('hi', 'hi', hi, 'purple')] : []),
  ];
  const vars = (mid: number | string) => ({ lo, mid, hi, iterations: iter });
  const box = (items: string[], highlight?: number): Step['aux'] => [{ title: 'Compare box — slope at mid', kind: 'list', items, highlight }];

  steps.push({
    title: 'Start', tag: 'INIT —', desc: `lo = 0, hi = ${n - 1}. Find any index bigger than both neighbours (outside the array counts as −∞), n = ${n}.`,
    cells: windowCells(nums, lo, hi), pointers: ptrs(), vars: vars('—'), aux: box([`window = [${lo}..${hi}]`, 'goal = any local maximum']),
    logic: 'A peak always exists. We do not need the highest one — any local maximum is accepted.', logicTone: 'info', javaLines: [1], pyLines: [1], algoStep: 0,
    note: `lo = 0, hi = ${n} − 1 = ${n - 1}`,
  });

  while (lo < hi) {
    iter++;
    const mid = lo + Math.floor((hi - lo) / 2);
    const up = nums[mid] < nums[mid + 1];
    steps.push({
      title: `Probe mid = ${mid}`, tag: `ROUND ${iter} · MID —`, desc: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}: look at nums[${mid}] = ${nums[mid]} and its right neighbour nums[${mid + 1}] = ${nums[mid + 1]}.`,
      cells: windowCells(nums, lo, hi, { [mid]: 'compare', [mid + 1]: 'compare' }), pointers: ptrs(mid), vars: vars(mid),
      aux: box([`nums[${mid}] = ${nums[mid]}`, `nums[${mid + 1}] = ${nums[mid + 1]}`, 'slope = ?']),
      logic: 'We only need to know which way the ground tilts at mid.', logicTone: 'info', javaLines: [3], pyLines: [3], algoStep: 1,
      note: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}`,
    });
    steps.push({
      title: `Compare nums[${mid}] with nums[${mid + 1}]`, tag: up ? 'SLOPE UP —' : 'SLOPE DOWN —',
      desc: `${nums[mid]} ${up ? '<' : '>'} ${nums[mid + 1]}: the slope goes ${up ? 'up' : 'down'}, so a peak is ${up ? `to the right of ${mid}` : `at ${mid} or to its left`}.`,
      cells: windowCells(nums, lo, hi, { [mid]: 'compare', [mid + 1]: 'compare' }), pointers: ptrs(mid), vars: vars(mid),
      aux: box([`nums[${mid}] = ${nums[mid]}`, `nums[${mid + 1}] = ${nums[mid + 1]}`, `${nums[mid]} ${up ? '<' : '>'} ${nums[mid + 1]} → ${up ? 'uphill, go right' : 'downhill, go left'}`], 2),
      logic: up ? 'Going uphill to the right: a peak must exist to the right of mid (the array eventually ends in −∞).' : 'Going downhill to the right: mid itself or something to its left is a peak.', logicTone: 'info',
      javaLines: [4], pyLines: [4], algoStep: 2, note: `${nums[mid]} < ${nums[mid + 1]}? ${up ? 'yes → climb right' : 'no → keep mid'}`,
    });
    if (up) lo = mid + 1;
    else hi = mid;
    steps.push({
      title: up ? 'Climb right: lo = mid + 1' : 'Keep mid: hi = mid', tag: up ? 'DISCARD LEFT —' : 'DISCARD RIGHT —',
      desc: up ? `lo = ${mid} + 1 = ${lo}. Everything up to ${mid} is left behind; a peak lies in [${lo}..${hi}].` : `hi = ${mid}. Everything after ${mid} is dropped but mid stays a candidate; a peak lies in [${lo}..${hi}].`,
      cells: windowCells(nums, lo, hi), pointers: ptrs(), vars: vars(mid),
      aux: box([`window = [${lo}..${hi}]`, `${hi - lo + 1} candidate${hi === lo ? '' : 's'} left`]),
      logic: 'The window shrinks but always contains a peak.', logicTone: 'warn',
      javaLines: up ? [4] : [5], pyLines: up ? [5] : [6, 7], algoStep: 3, note: up ? `lo = mid + 1 = ${lo}` : `hi = mid = ${hi}`,
    });
  }

  steps.push({
    title: `Peak at index ${lo}`, tag: '✅ Peak!', desc: `lo == hi == ${lo}: nums[${lo}] = ${nums[lo]} is a local maximum.`,
    cells: windowCells(nums, lo, hi, { [lo]: 'found' }), pointers: [ptr('p', 'peak', lo, 'green')], vars: vars('—'),
    aux: box([`peak index = ${lo}`, `nums[${lo}] = ${nums[lo]}`], 1),
    logic: 'Both neighbours are smaller (or off the edge).', logicTone: 'success', javaLines: [7], pyLines: [8], algoStep: 4,
    note: `lo == hi → return ${lo}`,
    result: { title: String(lo), text: `nums[${lo}] = ${nums[lo]} is a peak` },
  });
  return steps;
}

export const findPeakElement: ProblemDef<In> = {
  slug: '162-find-peak-element', id: '162', title: 'Find Peak Element', difficulty: 'Medium', category: 'Binary Search', tag: 'binary search',
  statement: 'A peak is an element strictly greater than its neighbours (the ends see −∞ outside the array). Given an array where neighbouring values are never equal, return the index of any peak in O(log n).',
  constraints: '1 ≤ n ≤ 1000 · nums[i] ≠ nums[i+1] (animation values are limited to 0–99, at most 12 of them)',
  examples: [
    { label: '[1,2,3,1]', input: { nums: [1, 2, 3, 1] }, output: '2' },
    { label: '[1,2,1,3,5,6,4]', input: { nums: [1, 2, 1, 3, 5, 6, 4] }, output: '5 (1 also valid)' },
    { label: '[5,4,3,2]', input: { nums: [5, 4, 3, 2] }, output: '0' },
  ],
  inputPlaceholder: 'e.g. 1 2 1 3 5 6 4',
  parseInput: parse, buildSteps: build, viz: 'bars',
  legend: [{ label: 'Comparing mid and mid+1', state: 'compare' }, { label: 'Peak', state: 'found' }, { label: 'Discarded', state: 'dim' }],
  varLabels: ['lo', 'mid', 'hi', 'iterations'],
  approach: {
    title: 'Always walk uphill',
    text: 'Compare nums[mid] with nums[mid + 1]. If the next one is higher, a peak exists on the right; otherwise one exists at mid or on the left. Keep the half that is guaranteed to hold a peak.',
  },
  java: [
    'public int findPeakElement(int[] nums) {',
    '    int lo = 0, hi = nums.length - 1;',
    '    while (lo < hi) {',
    '        int mid = lo + (hi - lo) / 2;',
    '        if (nums[mid] < nums[mid + 1]) lo = mid + 1;',
    '        else hi = mid;',
    '    }',
    '    return lo;',
    '}',
  ],
  python: [
    'def find_peak_element(nums):',
    '    lo, hi = 0, len(nums) - 1',
    '    while lo < hi:',
    '        mid = lo + (hi - lo) // 2',
    '        if nums[mid] < nums[mid + 1]:',
    '            lo = mid + 1',
    '        else:',
    '            hi = mid',
    '    return lo',
  ],
  algorithm: [
    'Set lo = 0, hi = n − 1',
    'While lo < hi, compare nums[mid] with nums[mid + 1]',
    'Rising → lo = mid + 1; falling → hi = mid',
    'Discard the other side and repeat',
    'When lo == hi, that index is a peak',
  ],
  phases: [
    { icon: '🎬', label: 'Init (lo, hi)', tone: 'blue' },
    { icon: '📍', label: 'Probe mid', tone: 'cyan' },
    { icon: '⛰️', label: 'Read the slope', tone: 'gold' },
    { icon: '✂️', label: 'Discard a side', tone: 'orange' },
    { icon: '✅', label: 'Peak found', tone: 'green' },
  ],
  emphasis: ['peak', 'strictly greater', 'O(log n)'],
  complexity: [{ label: 'Time', value: 'O(log n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Invariant: [lo, hi] always contains a peak. If nums[mid] < nums[mid+1], the sequence rises from mid and cannot rise forever, so a peak sits to the right. Otherwise nums[mid] > nums[mid+1] and, walking left from mid, either mid is a peak or the values keep rising until a peak is hit.',
};
