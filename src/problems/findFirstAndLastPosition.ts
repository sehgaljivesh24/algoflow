import type { CellState, Pointer, ProblemDef, Step } from '../engine/types.ts';
import { isSortedAsc, parseInt1, parseNums, parseParts, ptr, windowCells } from './ssbShared.ts';

interface In { nums: number[]; target: number }

function parse(raw: string): In {
  const [a, b] = parseParts(raw, 2, 'sorted numbers ; target — e.g. 5 7 7 8 8 10 ; 8');
  const nums = parseNums(a, { maxLen: 16 });
  if (!isSortedAsc(nums)) throw new Error('Numbers must be sorted ascending (duplicates are fine)');
  return { nums, target: parseInt1(b, -1000, 1000, 'Target') };
}

function build({ nums, target }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let first = -1;
  let last = -1;
  let iter = 0;

  const run = (leftMost: boolean) => {
    let lo = 0;
    let hi = n - 1;
    let ans = -1;
    const ptrs = (mid?: number): Pointer[] => [
      ...(lo < n ? [ptr('lo', 'lo', lo, 'blue')] : []),
      ...(mid !== undefined ? [ptr('mid', 'mid', mid, 'orange')] : []),
      ...(hi >= 0 ? [ptr('hi', 'hi', hi, 'purple')] : []),
    ];
    const cellsOf = (marks: Record<number, CellState> = {}) =>
      windowCells(nums, lo, hi, { ...(ans >= 0 ? { [ans]: 'found' as const } : {}), ...marks }).map((c) => (c.state ? c : { ...c, state: 'active' as const }));
    const vars = (mid: number | string) => ({ search: leftMost ? 'leftmost' : 'rightmost', lo, mid, hi, candidate: ans >= 0 ? ans : '—', first, last });
    const box = (items: string[], highlight?: number): Step['aux'] => [{ title: `Compare box — ${leftMost ? 'leftmost' : 'rightmost'} search`, kind: 'list', items, highlight }];
    const kind = leftMost ? 'leftmost' : 'rightmost';
    const cand = () => `candidate = ${ans >= 0 ? ans : 'none yet'}`;
    const algoStep = leftMost ? 0 : 2;

    steps.push({
      title: leftMost ? 'Search 1: leftmost occurrence' : 'Search 2: rightmost occurrence',
      tag: leftMost ? 'SEARCH 1 · LEFTMOST —' : 'SEARCH 2 · RIGHTMOST —',
      desc: leftMost ? `Binary search the whole array [0..${n - 1}] for the first index holding ${target}.` : `first = ${first} is known. Now search [0..${n - 1}] again for the last index holding ${target}.`,
      cells: cellsOf(), pointers: ptrs(), vars: vars('—'),
      aux: box([`target = ${target}`, cand(), `bias = keep going ${leftMost ? 'left' : 'right'} after a hit`]),
      logic: leftMost ? 'When we hit the target we remember the index, then keep searching to the LEFT in case it appears earlier.' : 'This time, after a hit we keep searching to the RIGHT to find a later copy.', logicTone: 'info',
      javaLines: leftMost ? [1, 7] : [3, 7], pyLines: leftMost ? [1, 7] : [4, 7], algoStep,
      note: leftMost ? `first = find(nums, ${target}, true)` : `last = find(nums, ${target}, false)`,
    });
    while (lo <= hi) {
      iter++;
      const mid = lo + Math.floor((hi - lo) / 2);
      const v = nums[mid];
      steps.push({
        title: `mid = ${mid}`, tag: `${kind.toUpperCase()} · MID —`, desc: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}: nums[${mid}] = ${v} is compared with the target ${target}.`,
        cells: cellsOf({ [mid]: 'compare' }), pointers: ptrs(mid), vars: vars(mid),
        aux: box([`nums[${mid}] = ${v}`, `target = ${target}`, cand()]),
        logic: 'Take the middle of the current window.', logicTone: 'info', javaLines: [9], pyLines: [9], algoStep,
        note: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}`,
      });
      if (v < target) {
        lo = mid + 1;
        steps.push({
          title: 'Too small: lo = mid + 1', tag: 'TOO SMALL —', desc: `${v} < ${target}: discard the left half including mid, lo = ${mid} + 1 = ${lo}.`,
          cells: cellsOf(), pointers: ptrs(), vars: vars(mid),
          aux: box([`nums[${mid}] = ${v}`, `${v} < ${target} → go right`, cand()], 1),
          logic: 'The target can only be to the right.', logicTone: 'warn',
          javaLines: [10], pyLines: [10, 11], algoStep, note: `${v} < ${target} → lo = ${mid} + 1 = ${lo}`,
        });
      } else if (v > target) {
        hi = mid - 1;
        steps.push({
          title: 'Too big: hi = mid − 1', tag: 'TOO BIG —', desc: `${v} > ${target}: discard the right half including mid, hi = ${mid} − 1 = ${hi}.`,
          cells: cellsOf(), pointers: ptrs(), vars: vars(mid),
          aux: box([`nums[${mid}] = ${v}`, `${v} > ${target} → go left`, cand()], 1),
          logic: 'The target can only be to the left.', logicTone: 'warn',
          javaLines: [11], pyLines: [12, 13], algoStep, note: `${v} > ${target} → hi = ${mid} − 1 = ${hi}`,
        });
      } else {
        ans = mid;
        if (leftMost) { hi = mid - 1; first = ans; } else { lo = mid + 1; last = ans; }
        steps.push({
          title: `Hit at ${mid}: remember it, keep going ${leftMost ? 'left' : 'right'}`, tag: 'HIT —',
          desc: `nums[${mid}] = ${v} == ${target}: ans = ${mid}. ${leftMost ? `hi = ${mid} − 1 = ${hi}` : `lo = ${mid} + 1 = ${lo}`} to look for a ${leftMost ? 'smaller' : 'larger'} index with the same value.`,
          cells: cellsOf(), pointers: ptrs(), vars: vars(mid),
          aux: box([`nums[${mid}] = ${v}`, `${v} == ${target} → hit`, cand()], 2),
          logic: 'A hit is only a candidate: another copy may sit further out in the direction we are biasing towards.', logicTone: 'success',
          javaLines: [13, 14], pyLines: leftMost ? [15, 16, 17] : [15, 18, 19], algoStep,
          note: `ans = ${mid}; ${leftMost ? `hi = ${hi}` : `lo = ${lo}`}`,
        });
      }
    }
    if (leftMost) first = ans; else last = ans;
    return ans;
  };

  const f = run(true);
  if (f === -1) {
    steps.push({
      title: 'Not found', tag: 'NOT FOUND —', desc: `The leftmost search ended with no hit after ${iter} comparison${iter === 1 ? '' : 's'}: ${target} does not occur, so the answer is [−1, −1].`,
      cells: nums.map((value, i) => ({ key: i, value, state: 'dim' as const })), pointers: [], vars: { search: 'done', lo: '—', mid: '—', hi: '—', candidate: '—', first, last },
      aux: [{ title: 'Compare box — result', kind: 'list', items: [`target = ${target}`, 'candidate = none', 'first = −1'], highlight: 1 }],
      alert: `No hit: ${target} is not in the array, so there is no first or last position.`,
      logic: 'No hit means there is no first or last position.', logicTone: 'warn', javaLines: [2], pyLines: [2, 3], algoStep: 1,
      note: 'first == −1 → return [−1, −1]',
      result: { title: '[-1, -1]', text: `${target} is not in the array` },
    });
    return steps;
  }
  const l = run(false);
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `first = ${f}, last = ${l}: ${target} occupies indexes ${f}..${l} (${l - f + 1} cop${l === f ? 'y' : 'ies'}).`,
    cells: nums.map((value, i) => ({ key: i, value, state: i >= f && i <= l ? ('found' as const) : ('dim' as const) })), pointers: [ptr('f', 'first', f, 'green'), ...(l !== f ? [ptr('l', 'last', l, 'green')] : [])],
    vars: { search: 'done', lo: '—', mid: '—', hi: '—', candidate: '—', first: f, last: l },
    aux: [{ title: 'Compare box — result', kind: 'list', items: [`target = ${target}`, `first = ${f}`, `last = ${l}`], highlight: 2 }],
    note: `return [${f}, ${l}]`,
    logic: 'Two O(log n) searches, one biased left and one biased right, give the full range.', logicTone: 'success', javaLines: [4], pyLines: [5], algoStep: 3,
    result: { title: `[${f}, ${l}]`, text: `${target} occurs at indexes ${f} to ${l} (${iter} comparisons in total)` },
  });
  return steps;
}

export const findFirstAndLastPosition: ProblemDef<In> = {
  slug: '34-find-first-and-last-position', id: '34', title: 'Find First and Last Position', difficulty: 'Medium', category: 'Binary Search', tag: 'binary search x2',
  statement: 'Given a sorted array that may contain duplicates, return the first and last index of a target value, or [−1, −1] if it does not occur. The runtime must be O(log n).',
  constraints: '0 ≤ n ≤ 10⁵ · non-decreasing (animation input is limited to 16 numbers, at least 1)',
  examples: [
    { label: '[5,7,7,8,8,10], 8', input: { nums: [5, 7, 7, 8, 8, 10], target: 8 }, output: '[3,4]' },
    { label: '[5,7,7,8,8,10], 6', input: { nums: [5, 7, 7, 8, 8, 10], target: 6 }, output: '[-1,-1]' },
    { label: '[2,2,2,2,2,3], 2', input: { nums: [2, 2, 2, 2, 2, 3], target: 2 }, output: '[0,4]' },
  ],
  inputPlaceholder: 'e.g. 5 7 7 8 8 10 ; 8',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Search window', state: 'active' }, { label: 'Middle (probe)', state: 'compare' }, { label: 'Best hit so far / range', state: 'found' }, { label: 'Discarded', state: 'dim' }],
  varLabels: ['search', 'lo', 'mid', 'hi', 'candidate', 'first', 'last'],
  phases: [
    { icon: '⬅️', label: 'Search 1: leftmost', tone: 'blue' },
    { icon: '❓', label: 'Any hit?', tone: 'orange' },
    { icon: '➡️', label: 'Search 2: rightmost', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['sorted', 'duplicates', 'first and last index', 'O(log n)'],
  approach: {
    title: 'Binary search twice, biased in opposite directions',
    text: 'A normal binary search stops at any copy of the target. Instead, when you hit it, record the index and keep shrinking the window toward the left (for the first copy) or toward the right (for the last copy).',
  },
  java: [
    'public int[] searchRange(int[] nums, int target) {',
    '    int first = find(nums, target, true);',
    '    if (first == -1) return new int[]{-1, -1};',
    '    int last = find(nums, target, false);',
    '    return new int[]{first, last};',
    '}',
    'private int find(int[] nums, int target, boolean leftMost) {',
    '    int lo = 0, hi = nums.length - 1, ans = -1;',
    '    while (lo <= hi) {',
    '        int mid = lo + (hi - lo) / 2;',
    '        if (nums[mid] < target) lo = mid + 1;',
    '        else if (nums[mid] > target) hi = mid - 1;',
    '        else {',
    '            ans = mid;',
    '            if (leftMost) hi = mid - 1; else lo = mid + 1;',
    '        }',
    '    }',
    '    return ans;',
    '}',
  ],
  python: [
    'def search_range(nums, target):',
    '    first = find(nums, target, True)',
    '    if first == -1:',
    '        return [-1, -1]',
    '    last = find(nums, target, False)',
    '    return [first, last]',
    'def find(nums, target, left_most):',
    '    lo, hi, ans = 0, len(nums) - 1, -1',
    '    while lo <= hi:',
    '        mid = lo + (hi - lo) // 2',
    '        if nums[mid] < target:',
    '            lo = mid + 1',
    '        elif nums[mid] > target:',
    '            hi = mid - 1',
    '        else:',
    '            ans = mid',
    '            if left_most:',
    '                hi = mid - 1',
    '            else:',
    '                lo = mid + 1',
    '    return ans',
  ],
  algorithm: [
    'Binary search for the leftmost index: on a hit, save it and set hi = mid − 1',
    'If nothing was found, return [−1, −1]',
    'Binary search for the rightmost index: on a hit, save it and set lo = mid + 1',
    'Return [first, last]',
  ],
  complexity: [{ label: 'Time', value: 'O(log n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Saving a hit and continuing in one direction keeps the invariant "the best answer so far is in ans, and any better answer lies inside [lo, hi]". When the window is empty, ans is the extreme occurrence on that side.',
};
