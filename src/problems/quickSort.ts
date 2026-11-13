import type { Cell, CellState, Pointer, ProblemDef, Step } from '../engine/types.ts';
import { parseNums, ptr } from './ssbShared.ts';
import { treeOverArray, twoPass, type RecTree } from './recTreeKit.ts';

interface In { nums: number[] }

type Raw = Omit<Step, 'scene' | 'cells' | 'pointers'> & { cells: Cell[]; pointers: Pointer[]; plain?: boolean };

function run({ nums }: In, tree: RecTree): Step[] {
  const arr = [...nums];
  const keys = arr.map((_, i) => i);
  const n = arr.length;
  const steps: Step[] = [];
  const done = new Set<number>();
  const stack: string[] = [];
  let compares = 0;
  let swaps = 0;
  /** Every step is drawn as the recursion tree of ranges above the array (the final step is the plain sorted array). */
  const emit = ({ cells: cs, pointers: ps, plain, ...rest }: Raw): void => {
    steps.push(plain ? { ...rest, cells: cs, pointers: ps } : { ...rest, scene: treeOverArray(tree.scene(), cs, ps) });
  };

  /** [lo, hi] is the range being partitioned; indexes lo..small-1 are known to be < pivot. */
  const cells = (lo: number, hi: number, small: number, mark: Record<number, CellState> = {}): Cell[] =>
    arr.map((value, i) => {
      let state: CellState | undefined = mark[i];
      if (!state) {
        if (done.has(i)) state = 'sorted';
        else if (i < lo || i > hi) state = 'dim';
        else if (i >= lo && i < small) state = 'active';
      }
      return { key: keys[i], value, state };
    });
  const aux = () => [{ title: 'Ranges being sorted (recursion stack)', kind: 'stack' as const, items: [...stack] }];
  const vars = (lo: number | string, hi: number | string, i: number | string, j: number | string, pivot: number | string) => ({ lo, hi, i, j, pivot, compares, swaps });
  const swap = (a: number, b: number) => {
    [arr[a], arr[b]] = [arr[b], arr[a]];
    [keys[a], keys[b]] = [keys[b], keys[a]];
  };

  emit({
    title: 'Quick Sort', tag: 'INIT', desc: `n = ${n}. Pick a pivot, partition the range around it, then sort the two sides recursively.`,
    note: `quickSort(nums, 0, ${n - 1}) on [${arr.join(', ')}]`,
    cells: cells(0, n - 1, 0), pointers: [], vars: vars(0, n - 1, '—', '—', '—'), aux: aux(),
    logic: 'After partitioning, the pivot sits in its final sorted position, smaller values on its left, larger on its right.', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0,
  });

  const sort = (lo: number, hi: number) => {
    if (lo > hi) return;
    stack.push(`sort(${lo}..${hi})`);
    if (lo === hi) {
      done.add(lo);
      tree.leaf(`${lo}`, 'found', { call: `sort(${lo}..${hi})` });
      emit({
        title: `Range ${lo}..${hi} has one element`, tag: 'BASE CASE', desc: `Range ${lo}..${hi} holds only nums[${lo}] = ${arr[lo]}, which is trivially in its final place.`,
        note: `lo >= hi (${lo} >= ${hi}): return`,
        cells: cells(lo, hi, lo), pointers: [], vars: vars(lo, hi, '—', '—', '—'), aux: aux(),
        logic: 'Base case: a range of size 0 or 1 is already sorted.', logicTone: 'success', javaLines: [1], pyLines: [1, 2], algoStep: 3,
      });
      stack.pop();
      return;
    }
    const pivot = arr[hi];
    let i = lo;
    tree.enter(`${lo}..${hi}`, { sub: `p=${pivot}`, call: `sort(${lo}..${hi}) pivot ${pivot}` });
    emit({
      title: `Partition ${lo}..${hi}: pivot = ${pivot}`, tag: 'PIVOT', desc: `The last element of the range, nums[${hi}] = ${pivot}, is the pivot. i = ${lo} marks where the next smaller value goes.`,
      note: `pivot = nums[${hi}] = ${pivot}; i = ${lo}`,
      cells: cells(lo, hi, lo, { [hi]: 'swap' }), pointers: [ptr('i', 'i', i, 'blue')], vars: vars(lo, hi, i, '—', pivot), aux: aux(),
      logic: 'Everything in blue (left of i) will be smaller than the pivot.', logicTone: 'info', javaLines: [7, 8], pyLines: [7, 8], algoStep: 0,
    });
    for (let j = lo; j < hi; j++) {
      compares++;
      const small = arr[j] < pivot;
      emit({
        title: `Compare nums[${j}] = ${arr[j]} with pivot ${pivot}`, tag: 'COMPARE', desc: small ? `${arr[j]} < ${pivot}: it belongs on the left side.` : `${arr[j]} ≥ ${pivot}: it stays on the right side, so j just advances.`,
        note: small ? `nums[${j}] = ${arr[j]} < ${pivot}: swap into slot i = ${i}` : `nums[${j}] = ${arr[j]} >= ${pivot}: leave it`,
        cells: cells(lo, hi, i, { [hi]: 'swap', [j]: 'compare' }), pointers: [ptr('i', 'i', i, 'blue'), ptr('j', 'j', j, 'orange')], vars: vars(lo, hi, i, j, pivot), aux: aux(),
        logic: small ? 'Swap it into the next free slot of the "smaller" zone.' : 'Nothing to move; j just advances.', logicTone: small ? 'info' : 'warn',
        javaLines: [10], pyLines: [10], algoStep: 1,
      });
      if (small) {
        const same = i === j;
        if (!same) { swap(i, j); swaps++; }
        i++;
        emit({
          title: same ? `Already in place: i = ${i}` : `Swap nums[${i - 1}] and nums[${j}]`, tag: same ? 'IN PLACE' : 'SWAP',
          desc: same ? `nums[${j}] is already at the edge of the smaller zone; i moves to ${i}.` : `${arr[i - 1]} moves into the smaller zone and the larger value moves right. i = ${i}.`,
          note: same ? `i == j: no swap, i = ${i}` : `swap(nums, ${i - 1}, ${j}) → [${arr.slice(lo, hi + 1).join(', ')}], i = ${i}`,
          cells: cells(lo, hi, i, { [hi]: 'swap', [j]: 'compare', [i - 1]: same ? 'active' : 'swap' }), pointers: [ptr('i', 'i', Math.min(i, hi), 'blue'), ptr('j', 'j', j, 'orange')], vars: vars(lo, hi, i, j, pivot), aux: aux(),
          logic: 'The smaller zone [lo, i) grew by one.', logicTone: 'success', javaLines: same ? [12] : [11, 12], pyLines: [11, 12], algoStep: 1,
        });
      }
    }
    swap(i, hi);
    if (i !== hi) swaps++;
    done.add(i);
    emit({
      title: `Place the pivot at index ${i}`, tag: 'PLACE PIVOT', desc: `Swap the pivot ${pivot} into index ${i}. Left part: ${i - lo} value(s) < ${pivot}; right part: ${hi - i} value(s) ≥ ${pivot}.`,
      note: `swap(nums, ${i}, ${hi}) → pivot ${pivot} at index ${i}: [${arr.slice(lo, hi + 1).join(', ')}]`,
      cells: cells(lo, hi, i, {}), pointers: [], vars: vars(lo, hi, i, '—', pivot), aux: aux(),
      logic: `${pivot} is now in its final sorted position (green).`, logicTone: 'success', javaLines: [15], pyLines: [13, 14], algoStep: 2,
    });
    sort(lo, i - 1);
    sort(i + 1, hi);
    stack.pop();
    tree.leave();
  };
  sort(0, n - 1);

  emit({
    title: 'Done', tag: '✅ Done!', desc: `Sorted [${arr.join(', ')}] with ${swaps} swap${swaps === 1 ? '' : 's'} and ${compares} comparison${compares === 1 ? '' : 's'}.`,
    note: `return nums = [${arr.join(', ')}]`, plain: true,
    cells: cells(0, n - 1, 0), pointers: [], vars: vars('—', '—', '—', '—', '—'), aux: aux(),
    logic: `Final array: [${arr.join(', ')}]`, logicTone: 'success', javaLines: [4], pyLines: [5], algoStep: 4,
    result: { title: `[${arr.join(', ')}]`, text: `${compares} comparisons · ${swaps} swaps` },
  });
  return steps;
}

const build = (input: In): Step[] => twoPass((t) => run(input, t));

export const quickSort: ProblemDef<In> = {
  slug: '912-quick-sort', id: '912', title: 'Quick Sort', difficulty: 'Medium', category: 'Sorting', tag: 'partition, divide & conquer',
  statement: 'Sort an array with quick sort: choose a pivot, rearrange so smaller values come before it and larger values after, then recursively sort the two sides. This version uses Lomuto partitioning with the last element as the pivot.',
  constraints: '1 ≤ n ≤ 5·10⁴ · −5·10⁴ ≤ nums[i] ≤ 5·10⁴ (animation input is limited to 12 numbers)',
  examples: [
    { label: '[5,2,9,1,5,6]', input: { nums: [5, 2, 9, 1, 5, 6] }, output: '[1,2,5,5,6,9]', answer: '[1,2,5,5,6,9] (every pivot ends in its final position)' },
    { label: '[3,7,8,5,2,1,9,5,4]', input: { nums: [3, 7, 8, 5, 2, 1, 9, 5, 4] }, output: '[1,2,3,4,5,5,7,8,9]' },
    { label: '[4,3,2,1]', input: { nums: [4, 3, 2, 1] }, output: '[1,2,3,4]' },
  ],
  inputPlaceholder: 'e.g. 5 2 9 1 5 6',
  parseInput: (raw) => ({ nums: parseNums(raw, { maxLen: 12, lo: -9999, hi: 9999 }) }), buildSteps: build, viz: 'cells',
  emphasis: ['quick sort', 'pivot', 'Lomuto partitioning'],
  phases: [
    { icon: '🎯', label: 'Pick pivot', tone: 'blue' },
    { icon: '🔍', label: 'Scan and swap', tone: 'cyan' },
    { icon: '📍', label: 'Place pivot', tone: 'gold' },
    { icon: '🔁', label: 'Recurse / base case', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Pivot / current call', state: 'swap' }, { label: 'Smaller than pivot', state: 'active' }, { label: 'Comparing / open call', state: 'compare' }, { label: 'Final position', state: 'sorted' }, { label: 'Outside range / not reached', state: 'dim' }],
  varLabels: ['lo', 'hi', 'i', 'j', 'pivot', 'compares', 'swaps'],
  approach: {
    title: 'Partition around a pivot, then recurse',
    text: 'Pick the last element as the pivot. Sweep j across the range and swap every value smaller than the pivot to the front (index i). Finally swap the pivot into index i; it is now exactly where it belongs. Sort the left and right parts the same way.',
  },
  java: [
    'void quickSort(int[] nums, int lo, int hi) {',
    '    if (lo >= hi) return;',
    '    int p = partition(nums, lo, hi);',
    '    quickSort(nums, lo, p - 1);',
    '    quickSort(nums, p + 1, hi);',
    '}',
    'int partition(int[] nums, int lo, int hi) {',
    '    int pivot = nums[hi];',
    '    int i = lo;',
    '    for (int j = lo; j < hi; j++) {',
    '        if (nums[j] < pivot) {',
    '            swap(nums, i, j);',
    '            i++;',
    '        }',
    '    }',
    '    swap(nums, i, hi);',
    '    return i;',
    '}',
  ],
  python: [
    'def quick_sort(nums, lo, hi):',
    '    if lo >= hi:',
    '        return',
    '    p = partition(nums, lo, hi)',
    '    quick_sort(nums, lo, p - 1)',
    '    quick_sort(nums, p + 1, hi)',
    'def partition(nums, lo, hi):',
    '    pivot = nums[hi]',
    '    i = lo',
    '    for j in range(lo, hi):',
    '        if nums[j] < pivot:',
    '            nums[i], nums[j] = nums[j], nums[i]',
    '            i += 1',
    '    nums[i], nums[hi] = nums[hi], nums[i]',
    '    return i',
  ],
  algorithm: [
    'Choose the last element of the range as the pivot',
    'Scan j across the range; swap each value < pivot into position i and advance i',
    'Swap the pivot into index i: it is in its final place',
    'Recursively sort the left part and the right part; ranges of size 0 or 1 are already sorted',
    'When every range is placed, the array is sorted',
  ],
  complexity: [{ label: 'Best / Average', value: 'O(n log n)' }, { label: 'Worst', value: 'O(n²)' }, { label: 'Space', value: 'O(log n) recursion' }],
  why: 'Partition invariant: during the sweep, nums[lo..i−1] < pivot and nums[i..j−1] ≥ pivot. After placing the pivot at i, every element on its left is smaller and every element on its right is at least as big, so the pivot never has to move again and the two sides are independent subproblems. A sorted input with a last-element pivot gives the O(n²) worst case.',
};
