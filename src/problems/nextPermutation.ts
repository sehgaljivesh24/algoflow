import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n) || n < 0)) throw new Error('Enter non-negative whole numbers, e.g. 1 3 5 4 2');
  if (nums.length > 10) throw new Error('Use 10 numbers or fewer');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const a = nums.map((value, k) => ({ k, value })); // k = identity so cells slide when swapped
  const steps: Step[] = [];
  let pivot = n - 2;

  const cells = (st: Record<number, CellState>, tailFrom: number): Cell[] =>
    a.map((c, p) => ({ key: c.k, value: c.value, state: st[p] ?? (p >= tailFrom ? 'found' : undefined) }));
  const vars = (i: number | string, j: number | string) => ({ i, j });
  const ptr = (id: string, label: string, index: number, tone: 'blue' | 'orange' | 'purple') => ({ id, label, index, tone });

  steps.push({
    title: 'Start', desc: `Current order: [${nums.join(', ')}]. We want the next larger arrangement in dictionary order, changing as little as possible.`,
    cells: cells({}, n), pointers: [], vars: vars('—', '—'),
    logic: 'To make the number just a bit bigger we must change the right end, not the left. Find the rightmost place where a digit can still grow.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0,
    tag: 'START', note: `i = nums.length − 2 = ${n - 2}, scan leftwards for a rising pair`,
  });

  // 1) find pivot
  for (;;) {
    if (pivot < 0) {
      steps.push({
        title: 'No pivot: the whole array is descending', desc: 'Every element is ≥ the one after it, so this is the largest permutation. The "next" one wraps around to the smallest: reverse everything.',
        cells: cells({}, 0), pointers: [], vars: vars('none', '—'),
        logic: 'A fully descending sequence has no larger arrangement. Reversing gives the ascending (smallest) one.', logicTone: 'warn',
        javaLines: [8], pyLines: [9], algoStep: 3,
        tag: 'NO PIVOT', alert: 'No pivot: the array is fully descending, so it is already the largest permutation.',
        note: 'i = −1 → reverse(nums, 0, n−1) wraps to the smallest',
      });
      break;
    }
    if (a[pivot].value >= a[pivot + 1].value) {
      steps.push({
        title: `${a[pivot].value} ≥ ${a[pivot + 1].value}: keep scanning left`, desc: `nums[${pivot}] is not smaller than nums[${pivot + 1}], so the tail from index ${pivot} is still non-increasing.`,
        cells: cells({ [pivot]: 'active', [pivot + 1]: 'compare' }, pivot + 1), pointers: [ptr('i', 'i', pivot, 'purple')], vars: vars(pivot, '—'),
        logic: 'A non-increasing tail is already the largest arrangement of its numbers, so nothing inside it can grow.', logicTone: 'info',
        javaLines: [2], pyLines: [2, 3], algoStep: 0,
        tag: 'SCAN', note: `${a[pivot].value} >= ${a[pivot + 1].value} → i-- (i = ${pivot - 1})`,
      });
      pivot--;
    } else {
      steps.push({
        title: `Pivot found at index ${pivot}`, desc: `nums[${pivot}] = ${a[pivot].value} < nums[${pivot + 1}] = ${a[pivot + 1].value}. This is the rightmost digit that can be increased.`,
        cells: cells({ [pivot]: 'active' }, pivot + 1), pointers: [ptr('i', 'i', pivot, 'purple')], vars: vars(pivot, '—'),
        logic: 'Everything right of the pivot is non-increasing. To grow the pivot minimally, swap it with the smallest tail value that is bigger than it.', logicTone: 'success',
        javaLines: [3], pyLines: [4], algoStep: 0,
        tag: 'PIVOT', note: `nums[${pivot}] = ${a[pivot].value} < nums[${pivot + 1}] = ${a[pivot + 1].value} → pivot i = ${pivot}`,
      });
      break;
    }
  }

  // 2) find successor and swap
  let swapped = -1;
  if (pivot >= 0) {
    let j = n - 1;
    for (;;) {
      if (a[j].value <= a[pivot].value) {
        steps.push({
          title: `${a[j].value} ≤ ${a[pivot].value}: not bigger, move left`, desc: `nums[${j}] is not larger than the pivot ${a[pivot].value}.`,
          cells: cells({ [pivot]: 'active', [j]: 'compare' }, pivot + 1), pointers: [ptr('i', 'i', pivot, 'purple'), ptr('j', 'j', j, 'orange')], vars: vars(pivot, j),
          logic: 'Scan the tail from the right: the first value larger than the pivot is the smallest such value, because the tail is non-increasing.', logicTone: 'info',
          javaLines: [5], pyLines: [6, 7], algoStep: 1,
          tag: 'SUCCESSOR', note: `nums[${j}] = ${a[j].value} <= nums[${pivot}] = ${a[pivot].value} → j-- (j = ${j - 1})`,
        });
        j--;
      } else {
        steps.push({
          title: `${a[j].value} > ${a[pivot].value}: successor found`, desc: `nums[${j}] = ${a[j].value} is the smallest tail value bigger than the pivot.`,
          cells: cells({ [pivot]: 'active', [j]: 'compare' }, pivot + 1), pointers: [ptr('i', 'i', pivot, 'purple'), ptr('j', 'j', j, 'orange')], vars: vars(pivot, j),
          logic: 'Swapping pivot and successor makes the number bigger by the smallest possible amount at that position.', logicTone: 'success',
          javaLines: [5], pyLines: [6], algoStep: 1,
          tag: 'SUCCESSOR', note: `nums[${j}] = ${a[j].value} > nums[${pivot}] = ${a[pivot].value} → j = ${j}`,
        });
        swapped = j;
        break;
      }
    }
    const t = a[pivot];
    a[pivot] = a[swapped];
    a[swapped] = t;
    steps.push({
      title: `Swap nums[${pivot}] and nums[${swapped}]`, desc: `${a[swapped].value} and ${a[pivot].value} trade places. The tail after the pivot is still non-increasing.`,
      cells: cells({ [pivot]: 'swap', [swapped]: 'swap' }, pivot + 1), pointers: [ptr('i', 'i', pivot, 'purple'), ptr('j', 'j', swapped, 'orange')], vars: vars(pivot, swapped),
      logic: 'The prefix up to the pivot is now final. What remains is to make the tail as small as possible.', logicTone: 'success',
      javaLines: [6], pyLines: [8], algoStep: 2,
      tag: 'SWAP', note: `swap(nums, ${pivot}, ${swapped}) → [${a.map((c) => c.value).join(', ')}]`,
    });
  }

  // 3) reverse the tail
  let lo = pivot + 1;
  let hi = n - 1;
  while (lo < hi) {
    const t = a[lo];
    a[lo] = a[hi];
    a[hi] = t;
    steps.push({
      title: `Reverse the tail: swap ${a[hi].value} and ${a[lo].value}`, desc: `Swap positions ${lo} and ${hi}.`,
      cells: cells({ [lo]: 'swap', [hi]: 'swap' }, pivot + 1), pointers: [ptr('i', 'lo', lo, 'blue'), ptr('j', 'hi', hi, 'orange')], vars: vars(pivot >= 0 ? pivot : 'none', '—'),
      logic: 'The tail is non-increasing; reversing it turns it into the smallest (ascending) arrangement.', logicTone: 'info',
      javaLines: [8], pyLines: [9], algoStep: 3,
      tag: 'REVERSE TAIL', note: `swap(nums[${lo}], nums[${hi}]) → [${a.map((c) => c.value).join(', ')}]`,
    });
    lo++;
    hi--;
  }

  const out = a.map((c) => c.value);
  steps.push({
    title: 'Done', desc: `Next permutation: [${out.join(', ')}].`,
    cells: a.map((c) => ({ key: c.k, value: c.value, state: 'found' as const })), pointers: [], vars: vars(pivot >= 0 ? pivot : 'none', '—'),
    logic: `Result: [${out.join(', ')}]`, logicTone: 'success', javaLines: [9], pyLines: [9], algoStep: 4,
    tag: '✅ Done!', note: `nums = [${out.join(', ')}]`,
    result: { title: `[${out.join(', ')}]`, text: 'The next lexicographic permutation' },
  });
  return steps;
}

export const nextPermutation: ProblemDef<In> = {
  slug: '31-next-permutation',
  id: '31', title: 'Next Permutation', difficulty: 'Medium', category: 'Arrays', tag: 'pivot + swap + reverse',
  statement: 'Rearrange nums into the next lexicographically greater permutation. If no greater permutation exists (the array is in descending order), rearrange it into the lowest possible order (ascending). The change must be done in place with constant extra memory.',
  constraints: '1 ≤ n ≤ 100 · 0 ≤ nums[i] ≤ 100 (animation input is limited to 10 numbers; duplicates are allowed)',
  examples: [
    { label: '[1,2,3]', input: { nums: [1, 2, 3] }, output: '[1,3,2]' },
    { label: '[3,2,1]', input: { nums: [3, 2, 1] }, output: '[1,2,3]' },
    { label: '[1,3,5,4,2]', input: { nums: [1, 3, 5, 4, 2] }, output: '[1,4,2,3,5]' },
    { label: '[1,5,1]', input: { nums: [1, 5, 1] }, output: '[5,1,1]' },
  ],
  inputPlaceholder: 'e.g. 1 3 5 4 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  emphasis: ['next lexicographically greater permutation', 'in place', 'constant extra memory'],
  phases: [
    { icon: '🔍', label: 'Find pivot', tone: 'blue' },
    { icon: '🎯', label: 'Find successor', tone: 'cyan' },
    { icon: '🔁', label: 'Swap', tone: 'orange' },
    { icon: '↔️', label: 'Reverse tail', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Pivot (i)', state: 'active' }, { label: 'Candidate / successor', state: 'compare' }, { label: 'Swapping', state: 'swap' }, { label: 'Non-increasing tail', state: 'found' }],
  varLabels: ['i', 'j'],
  approach: {
    title: 'Pivot, swap, reverse',
    text: 'Scan from the right for the first position i where nums[i] < nums[i + 1]; that digit can still grow. Swap it with the smallest larger value in the tail (found from the right), then reverse the tail so it becomes as small as possible. If there is no such i, just reverse the whole array.',
  },
  java: [
    'public void nextPermutation(int[] nums) {',
    '    int i = nums.length - 2;',
    '    while (i >= 0 && nums[i] >= nums[i + 1]) i--;',
    '    if (i >= 0) {',
    '        int j = nums.length - 1;',
    '        while (nums[j] <= nums[i]) j--;',
    '        swap(nums, i, j);',
    '    }',
    '    reverse(nums, i + 1, nums.length - 1);',
    '}',
  ],
  python: [
    'def next_permutation(nums):',
    '    i = len(nums) - 2',
    '    while i >= 0 and nums[i] >= nums[i + 1]:',
    '        i -= 1',
    '    if i >= 0:',
    '        j = len(nums) - 1',
    '        while nums[j] <= nums[i]:',
    '            j -= 1',
    '        nums[i], nums[j] = nums[j], nums[i]',
    '    nums[i + 1:] = reversed(nums[i + 1:])',
  ],
  algorithm: [
    'Scan from the right for the pivot: the first i with nums[i] < nums[i + 1]',
    'Scan from the right again for j: the first value larger than nums[i]',
    'Swap nums[i] and nums[j]',
    'Reverse everything after position i (or the whole array if there was no pivot)',
    'The array now holds the next permutation',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The suffix after the pivot is non-increasing, i.e. already the largest arrangement of its values, so the next permutation must change the pivot or something to its left; the pivot is the rightmost digit that can grow. Swapping it with the smallest larger tail value raises the prefix by the least possible amount, and the tail is still non-increasing, so reversing it gives its smallest arrangement. With no pivot the array is the maximum permutation and wraps to the minimum.',
};
