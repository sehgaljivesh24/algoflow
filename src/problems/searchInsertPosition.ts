import type { Cell, CellState, Pointer, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { isSortedAsc, parseInt1, parseNums, parseParts, ptr } from './ssbShared.ts';

interface In { nums: number[]; target: number }

function parse(raw: string): In {
  const [a, b] = parseParts(raw, 2, 'sorted distinct numbers ; target — e.g. 1 3 5 6 ; 5');
  const nums = parseNums(a, { maxLen: 16 });
  if (!isSortedAsc(nums, true)) throw new Error('Numbers must be sorted ascending with no duplicates');
  return { nums, target: parseInt1(b, -1000, 1000, 'Target') };
}

function build({ nums, target }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let lo = 0;
  let hi = n - 1;
  let iter = 0;
  const ptrs = (mid?: number): Pointer[] => [
    ...(lo >= 0 && lo < n ? [ptr('lo', 'lo', lo, 'blue')] : []),
    ...(mid !== undefined ? [ptr('mid', 'mid', mid, 'orange')] : []),
    ...(hi >= 0 && hi < n ? [ptr('hi', 'hi', hi, 'purple')] : []),
  ];
  // insertAt = lo: the candidate boundary (everything left of it is smaller than the target).
  const vars = (mid: number | string) => ({ lo, mid, hi, iterations: iter, insertAt: lo });
  const cellsOf = (marks: Record<number, CellState> = {}) => nums.map((value, i): Cell => ({ key: i, value, state: marks[i] ?? (i < lo || i > hi ? 'dim' : 'active') }));
  const box = (items: string[], highlight?: number): Step['aux'] => [{ title: 'Compare box — nums[mid] vs target', kind: 'list', items, highlight }];
  const win = () => (lo <= hi ? `[${lo}..${hi}]` : 'empty');

  steps.push({
    title: 'Start', tag: 'INIT —', desc: `lo = 0, hi = ${n - 1}. Look for ${target}, or the index where it would slot in to keep ${plural(n, 'number')} sorted.`,
    cells: cellsOf(), pointers: ptrs(), vars: vars('—'),
    aux: box([`target = ${target}`, `window = ${win()}`, `insertAt = ${lo}`]),
    logic: 'If the target is present we return its index; otherwise we need the index where it would be inserted to keep the order.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0, note: `lo = 0, hi = ${n - 1}`,
  });

  while (lo <= hi) {
    iter++;
    const mid = lo + Math.floor((hi - lo) / 2);
    const v = nums[mid];
    steps.push({
      title: `Look at the middle: mid = ${mid}`, tag: `ROUND ${iter} · MID —`, desc: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}, so we read nums[${mid}] = ${v}.`,
      cells: cellsOf({ [mid]: 'compare' }), pointers: ptrs(mid), vars: vars(mid),
      aux: box([`nums[${mid}] = ${v}`, `target = ${target}`, `insertAt = ${lo}`]),
      logic: 'The middle element tells us which half can still hold the insertion point.', logicTone: 'info',
      javaLines: [3], pyLines: [3], algoStep: 1, note: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}`,
    });
    const verdict = v === target ? `${v} == ${target}` : v < target ? `${v} < ${target}` : `${v} > ${target}`;
    steps.push({
      title: v === target ? 'Equal' : v < target ? 'Too small' : 'Too big', tag: 'COMPARE —',
      desc: v === target ? `nums[${mid}] = ${v} equals ${target}: it is already in the array.` : v < target ? `${v} < ${target}: ${target} belongs after index ${mid}.` : `${v} > ${target}: ${target} belongs at index ${mid} or before.`,
      cells: cellsOf({ [mid]: 'compare' }), pointers: ptrs(mid), vars: vars(mid),
      aux: box([`nums[${mid}] = ${v}`, `target = ${target}`, `${verdict} → ${v === target ? 'hit' : v < target ? 'go right' : 'go left'}`], 2),
      logic: v === target ? 'An existing element is its own insert position.' : 'One comparison decides which half cannot hold the insertion point.', logicTone: v === target ? 'success' : 'info',
      javaLines: [4], pyLines: [4], algoStep: 2, note: v === target ? `${v} == ${target} ✓` : `${v} == ${target}? no · ${verdict}`,
    });
    if (v === target) {
      steps.push({
        title: 'Found it!', tag: '✅ Found!', desc: `nums[${mid}] = ${target}, so the target is already there. Insert position = ${mid}.`,
        cells: cellsOf({ [mid]: 'found' }), pointers: ptrs(mid), vars: vars(mid),
        aux: box([`nums[${mid}] = ${v}`, `target = ${target}`, `index = ${mid}`], 2),
        logic: `An existing element is its own "insert position": return ${mid}.`, logicTone: 'success', javaLines: [4], pyLines: [4, 5], algoStep: 4,
        note: `return ${mid}`,
        result: { title: String(mid), text: `${target} is at index ${mid}` },
      });
      return steps;
    }
    const right = v < target;
    if (right) lo = mid + 1;
    else hi = mid - 1;
    steps.push({
      title: right ? 'Too small: go right' : 'Too big: go left', tag: 'DISCARD —',
      desc: right ? `${v} < ${target}, so indexes up to ${mid} are all too small: lo = ${mid} + 1 = ${lo}. Window ${win()}.` : `${v} > ${target}, so indexes from ${mid} on are all too big: hi = ${mid} − 1 = ${hi}. Window ${win()}.`,
      cells: cellsOf(), pointers: ptrs(), vars: vars(mid),
      aux: box([`nums[${mid}] = ${v}`, `target = ${target}`, `insertAt = ${lo}`], 2),
      logic: 'Half of the candidates are discarded.', logicTone: 'warn',
      javaLines: right ? [5] : [6], pyLines: right ? [6, 7] : [8, 9], algoStep: 3,
      note: right ? `lo = ${mid} + 1 = ${lo}` : `hi = ${mid} − 1 = ${hi}`,
    });
  }

  const at = Math.min(lo, n - 1);
  steps.push({
    title: `Window empty — insert at ${lo}`, tag: '✅ Done!',
    desc: `lo = ${lo} passed hi = ${hi}. Indexes before ${lo} hold smaller values, so ${target} slots in at ${lo}${lo === n ? ' (past the end)' : ''}.`,
    cells: nums.map((value, i): Cell => ({ key: i, value, state: i === at ? 'found' : 'dim' })), pointers: [ptr('ins', lo === n ? 'insert after' : 'insert here', at, 'green')], vars: vars('—'),
    aux: box([`target = ${target}`, `window = empty`, `insertAt = lo = ${lo}`], 2),
    logic: `Everything left of index ${lo} is smaller than ${target}, everything from ${lo} on is bigger, so ${target} goes at index ${lo}.`, logicTone: 'success',
    javaLines: [8], pyLines: [10], algoStep: 4, note: `return lo = ${lo}`,
    result: { title: String(lo), text: `Insert ${target} at index ${lo}` },
  });
  return steps;
}

export const searchInsertPosition: ProblemDef<In> = {
  slug: '35-search-insert-position', id: '35', title: 'Search Insert Position', difficulty: 'Easy', category: 'Binary Search', tag: 'binary search',
  statement: 'Given a sorted array of distinct integers and a target, return the index of the target if it is present. If not, return the index where it would be inserted to keep the array sorted. It must run in O(log n).',
  constraints: '1 ≤ n ≤ 10⁴ · strictly ascending (animation input is limited to 16 numbers)',
  examples: [
    { label: '[1,3,5,6], 5', input: { nums: [1, 3, 5, 6], target: 5 }, output: '2' },
    { label: '[1,3,5,6], 2', input: { nums: [1, 3, 5, 6], target: 2 }, output: '1' },
    { label: '[1,3,5,6], 7', input: { nums: [1, 3, 5, 6], target: 7 }, output: '4' },
    { label: '[1,3,5,6,8,9], 0', input: { nums: [1, 3, 5, 6, 8, 9], target: 0 }, output: '0' },
  ],
  inputPlaceholder: 'e.g. 1 3 5 6 ; 5',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Search window', state: 'active' }, { label: 'Middle (probe)', state: 'compare' }, { label: 'Answer', state: 'found' }, { label: 'Discarded', state: 'dim' }],
  varLabels: ['lo', 'mid', 'hi', 'insertAt', 'iterations'],
  approach: {
    title: 'Binary search, and keep lo as the answer',
    text: 'Run a normal binary search. When the target is missing, the loop ends with lo sitting on the first element that is larger than the target, which is exactly the insertion index.',
  },
  java: [
    'public int searchInsert(int[] nums, int target) {',
    '    int lo = 0, hi = nums.length - 1;',
    '    while (lo <= hi) {',
    '        int mid = lo + (hi - lo) / 2;',
    '        if (nums[mid] == target) return mid;',
    '        if (nums[mid] < target) lo = mid + 1;',
    '        else hi = mid - 1;',
    '    }',
    '    return lo;',
    '}',
  ],
  python: [
    'def search_insert(nums, target):',
    '    lo, hi = 0, len(nums) - 1',
    '    while lo <= hi:',
    '        mid = lo + (hi - lo) // 2',
    '        if nums[mid] == target:',
    '            return mid',
    '        if nums[mid] < target:',
    '            lo = mid + 1',
    '        else:',
    '            hi = mid - 1',
    '    return lo',
  ],
  algorithm: [
    'Set lo = 0 and hi = n − 1',
    'While lo ≤ hi, look at mid = lo + (hi − lo) / 2',
    'Compare nums[mid] with the target',
    'Smaller → lo = mid + 1; bigger → hi = mid − 1 (lo tracks the insertion index)',
    'Equal → return mid; window empty → return lo (the insertion index)',
  ],
  phases: [
    { icon: '🎬', label: 'Init (lo, hi)', tone: 'blue' },
    { icon: '📍', label: 'Compute mid', tone: 'cyan' },
    { icon: '⚖️', label: 'Compare', tone: 'gold' },
    { icon: '✂️', label: 'Discard half', tone: 'orange' },
    { icon: '✅', label: 'Insert here / Done', tone: 'green' },
  ],
  emphasis: ['sorted', 'target is present', 'would be inserted', 'O(log n)'],
  complexity: [{ label: 'Time', value: 'O(log n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Invariant: every index below lo holds a value smaller than the target and every index above hi holds a bigger one. When the window closes, lo = hi + 1 sits exactly between the two groups, so inserting there keeps the order.',
};
