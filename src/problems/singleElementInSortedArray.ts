import type { ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { emitter } from './listheapKit.ts';
import { parseNums, ptr, windowCells } from './ssbShared.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = parseNums(raw, { maxLen: 11, lo: 0, hi: 99, what: 'numbers' });
  if (nums.length % 2 === 0) throw new Error('Use an odd number of values: every value appears twice except one');
  for (let i = 1; i < nums.length; i++) if (nums[i] < nums[i - 1]) throw new Error('The values must be sorted in non-decreasing order');
  const count = new Map<number, number>();
  nums.forEach((v) => count.set(v, (count.get(v) ?? 0) + 1));
  const singles = [...count.values()].filter((c) => c === 1).length;
  if (singles !== 1 || [...count.values()].some((c) => c > 2)) throw new Error('Exactly one value must appear once; every other value must appear exactly twice, e.g. 1 1 2 3 3 4 4');
  return { nums };
}

function build({ nums }: In): Step[] {
  const steps: Step[] = [];
  let lo = 0;
  let hi = nums.length - 1;
  let mid: number | null = null;
  let cmp = false;
  let iter = 0;
  let box: string[] = [];
  let boxHl: number | undefined;
  const emit = emitter(steps, () => ({
    cells: windowCells(nums, lo, hi, mid !== null && cmp ? { [mid]: 'compare', [mid + 1]: 'compare' } : {}),
    pointers: [
      ptr('lo', 'lo', lo, 'blue'),
      ...(mid !== null ? [ptr('mid', 'mid', mid, 'orange')] : []),
      ...(hi !== mid ? [ptr('hi', 'hi', hi, 'purple')] : []),
    ],
    aux: [{ title: 'Compare box — pair at mid', kind: 'list' as const, items: box, highlight: boxHl }],
    vars: { lo, mid: mid ?? '—', hi, 'mid parity': mid === null ? '—' : mid % 2 === 0 ? 'even' : 'odd', iterations: iter },
  }));
  const show = (items: string[], hl?: number) => { box = items; boxHl = hl; };

  show([`window = [${lo}..${hi}]`, 'rule: pairs start on even indexes until the single value']);
  emit('Start', `Every value appears twice except one, and the array is sorted. Find the single value in O(log n). The array has ${plural(nums.length, 'entry', 'entries')}.`,
    'Before the single element pairs start on even indexes (0,1) (2,3) …; after it they start on odd indexes. That parity flip is what we search for.', 'info', [1], [1], 0,
    undefined, { tag: 'INIT —', note: `lo = 0, hi = ${nums.length} − 1 = ${hi}` });

  while (lo < hi) {
    iter++;
    cmp = false;
    mid = lo + Math.floor((hi - lo) / 2);
    show([`mid = ${mid} (${mid % 2 === 0 ? 'even' : 'odd'})`, `window = [${lo}..${hi}]`]);
    emit(`Probe the middle: mid = ${mid}`, `Window [${lo}..${hi}]: mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}, which is ${mid % 2 === 0 ? 'even' : 'odd'}.`,
      'The window always starts and ends on an even index, because the single value sits at an even index of every window we keep.', 'info', [3], [3], 1,
      undefined, { tag: `ROUND ${iter} · MID —`, note: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}` });
    if (mid % 2 === 1) {
      mid--;
      show([`mid was odd → mid = ${mid} (even)`, `pair = (${mid}, ${mid + 1})`]);
      emit(`Align mid to even: mid = ${mid}`, `Odd index: step one to the left so mid points at the start of a would-be pair (${mid}, ${mid + 1}).`,
        'Checking a pair from its first slot keeps the test uniform: is nums[mid] == nums[mid+1]?', 'info', [4], [4, 5], 1,
        undefined, { tag: 'ALIGN TO EVEN —', note: `mid % 2 == 1 → mid = ${mid}` });
    }
    cmp = true;
    const same = nums[mid] === nums[mid + 1];
    show([`nums[${mid}] = ${nums[mid]}`, `nums[${mid + 1}] = ${nums[mid + 1]}`, `${nums[mid]} ${same ? '==' : '!='} ${nums[mid + 1]} → pair ${same ? 'intact, go right' : 'broken, go left'}`], 2);
    emit(`Compare nums[${mid}] and nums[${mid + 1}]`, `${nums[mid]} ${same ? '==' : '≠'} ${nums[mid + 1]}: the pair at even index ${mid} is ${same ? 'intact' : 'broken'}.`,
      same ? 'An intact pair starting at an even index means the left part is undisturbed, so the single value lies to the right.' : 'A broken pair at an even index means the single value is at mid or somewhere to its left.', 'info', [5], [6], 2,
      undefined, { tag: same ? 'PAIR INTACT —' : 'PAIR BROKEN —', note: `${nums[mid]} == ${nums[mid + 1]}? ${same ? 'yes' : 'no'}` });
    if (same) lo = mid + 2;
    else hi = mid;
    cmp = false;
    show([`window = [${lo}..${hi}]`, same ? `lo = ${mid} + 2 = ${lo}` : `hi = mid = ${hi}`]);
    emit(same ? `Pair intact: lo = ${lo}` : `Pair broken: hi = ${hi}`, same ? `Discard the pair (${mid}, ${mid + 1}) and everything left of it: lo = ${lo}. Window [${lo}..${hi}].` : `The single value is at index ${hi} or before: hi = ${hi}. Window [${lo}..${hi}].`,
      'The window shrinks but keeps an odd length and the single value inside.', 'warn', same ? [5] : [6], same ? [7] : [8, 9], 3,
      undefined, { tag: same ? 'DISCARD LEFT —' : 'DISCARD RIGHT —', note: same ? `lo = mid + 2 = ${lo}` : `hi = mid = ${hi}` });
  }

  mid = null;
  show([`index = ${lo}`, `single value = ${nums[lo]}`], 1);
  emit(`Single value: ${nums[lo]}`, `lo == hi == ${lo}: nums[${lo}] = ${nums[lo]} has no partner, so it is the single value.`,
    'One index left, and the invariant says the single value is inside the window.', 'success', [8], [10], 4,
    { title: String(nums[lo]), text: `nums[${lo}] = ${nums[lo]} appears once` }, { tag: '✅ Found!', note: `return nums[${lo}] = ${nums[lo]}` });
  steps[steps.length - 1].cells = windowCells(nums, lo, hi, { [lo]: 'found' });
  return steps;
}

export const singleElementInSortedArray: ProblemDef<In> = {
  slug: '540-single-element-in-a-sorted-array',
  id: '540', title: 'Single Element in a Sorted Array', difficulty: 'Medium', category: 'Binary Search', tag: 'binary search on pair parity',
  statement: 'A sorted array contains integers where every value appears exactly twice, except for one value that appears once. Find that value in O(log n) time and O(1) extra space.',
  constraints: '1 ≤ n ≤ 10⁵, n is odd (animation: up to 11 values between 0 and 99)',
  examples: [
    { label: '1 1 2 3 3 4 4 8 8', input: { nums: [1, 1, 2, 3, 3, 4, 4, 8, 8] }, output: '2' },
    { label: '3 3 7 7 10 11 11', input: { nums: [3, 3, 7, 7, 10, 11, 11] }, output: '10' },
    { label: '5 6 6', input: { nums: [5, 6, 6] }, output: '5' },
  ],
  inputPlaceholder: 'e.g. 1 1 2 3 3 4 4 8 8',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Pair being compared', state: 'compare' }, { label: 'Single value', state: 'found' }, { label: 'Discarded', state: 'dim' }],
  varLabels: ['lo', 'mid', 'hi', 'mid parity', 'iterations'],
  approach: {
    title: 'Search on where the pairs change alignment',
    text: 'Left of the single value every pair occupies indexes (even, odd). To its right pairs occupy (odd, even). Take mid, move it to an even index, and test nums[mid] == nums[mid+1]: equal means the lone value is further right, different means it is at mid or to the left.',
  },
  java: [
    'public int singleNonDuplicate(int[] nums) {',
    '    int lo = 0, hi = nums.length - 1;',
    '    while (lo < hi) {',
    '        int mid = lo + (hi - lo) / 2;',
    '        if (mid % 2 == 1) mid--;',
    '        if (nums[mid] == nums[mid + 1]) lo = mid + 2;',
    '        else hi = mid;',
    '    }',
    '    return nums[lo];',
    '}',
  ],
  python: [
    'def single_non_duplicate(nums):',
    '    lo, hi = 0, len(nums) - 1',
    '    while lo < hi:',
    '        mid = lo + (hi - lo) // 2',
    '        if mid % 2 == 1:',
    '            mid -= 1',
    '        if nums[mid] == nums[mid + 1]:',
    '            lo = mid + 2',
    '        else:',
    '            hi = mid',
    '    return nums[lo]',
  ],
  algorithm: [
    'Set lo = 0 and hi = n − 1 (both even indexes)',
    'Pick mid and, if it is odd, move it one step left so it is even',
    'Compare nums[mid] with nums[mid + 1]',
    'Equal → lo = mid + 2; different → hi = mid',
    'When lo == hi, nums[lo] is the single value',
  ],
  phases: [
    { icon: '🎬', label: 'Init (lo, hi)', tone: 'blue' },
    { icon: '📍', label: 'Probe & align mid', tone: 'cyan' },
    { icon: '👯', label: 'Check the pair', tone: 'gold' },
    { icon: '✂️', label: 'Discard a side', tone: 'orange' },
    { icon: '✅', label: 'Single found', tone: 'green' },
  ],
  emphasis: ['sorted', 'exactly twice', 'one value that appears once', 'O(log n)'],
  complexity: [{ label: 'Time', value: 'O(log n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Removing the single value from the array leaves pairs only, so before it every pair starts on an even index and after it every pair starts on an odd index. The test "is the pair that starts at even index mid intact?" is true exactly when mid is left of the single value, which is a monotone yes/no condition. Binary search finds the flip, and keeping lo and hi even keeps every window odd-sized and valid.',
};
