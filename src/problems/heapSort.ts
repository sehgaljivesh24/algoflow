import type { Cell, CellState, Pointer, ProblemDef, Step } from '../engine/types.ts';
import { parseNums, ptr } from './ssbShared.ts';

interface In { nums: number[] }

function build({ nums }: In): Step[] {
  const arr = [...nums];
  const keys = arr.map((_, i) => i);
  const n = arr.length;
  const steps: Step[] = [];
  let compares = 0;
  let swaps = 0;
  let size = n;
  let phase = 'build heap';

  const cells = (mark: Record<number, CellState> = {}): Cell[] =>
    arr.map((value, i) => ({ key: keys[i], value, state: mark[i] ?? (i >= size ? 'sorted' : undefined) }));
  const vars = (i: number | string) => ({ phase, i, 'heap size': size, compares, swaps });
  const swap = (a: number, b: number) => {
    [arr[a], arr[b]] = [arr[b], arr[a]];
    [keys[a], keys[b]] = [keys[b], keys[a]];
    swaps++;
  };
  const val = (idx: number) => (idx < size ? String(arr[idx]) : '—');

  const siftDown = (start: number, algoCmp: number, algoSwap: number) => {
    let i = start;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let big = i;
      if (l < size) { compares++; if (arr[l] > arr[big]) big = l; }
      if (r < size) { compares++; if (arr[r] > arr[big]) big = r; }
      const marks: Record<number, CellState> = { [i]: 'compare' };
      const pts: Pointer[] = [ptr('i', 'parent', i, 'blue')];
      if (l < size) { marks[l] = 'compare'; pts.push(ptr('l', 'L', l, 'orange')); }
      if (r < size) { marks[r] = 'compare'; pts.push(ptr('r', 'R', r, 'purple')); }
      const auxMap = [{ title: 'Parent and children', kind: 'map' as const, items: [`parent[${i}] → ${arr[i]}`, `left[${l}] → ${val(l)}`, `right[${r}] → ${val(r)}`] }];
      if (big === i) {
        steps.push({
          title: l >= size ? `Index ${i} has no children in the heap` : `Parent ${arr[i]} is ≥ its children`, desc: l >= size ? `Children ${l} and ${r} are outside the heap (size ${size}), so ${arr[i]} stays.` : `${arr[i]} is at least as large as ${val(l)} and ${val(r)}: the max-heap rule holds here.`,
          cells: cells(marks), pointers: pts, aux: auxMap, vars: vars(i),
          logic: 'Nothing to swap, so this sift-down is finished.', logicTone: 'success', javaLines: [10, 11, 12, 13], pyLines: [9, 10, 12, 14, 15], algoStep: algoCmp,
        });
        return;
      }
      steps.push({
        title: `Largest of parent and children is ${arr[big]}`, desc: `Compare parent ${arr[i]} with children ${val(l)} and ${val(r)}: the biggest is ${arr[big]} (index ${big}), so the parent must trade places with it.`,
        cells: cells({ ...marks, [big]: 'swap' }), pointers: pts, aux: auxMap, vars: vars(i),
        logic: 'In a max-heap every parent is ≥ both children.', logicTone: 'warn', javaLines: [10, 11, 12], pyLines: [9, 10, 11, 12, 13], algoStep: algoCmp,
      });
      swap(i, big);
      steps.push({
        title: `Swap indexes ${i} and ${big}`, desc: `${arr[i]} moved up; ${arr[big]} moved down to index ${big}. Keep sifting from index ${big}.`,
        cells: cells({ [i]: 'swap', [big]: 'swap' }), pointers: [ptr('i', 'parent', big, 'blue')], vars: vars(big),
        logic: 'The displaced value may still be smaller than its new children, so continue down.', logicTone: 'success', javaLines: [14, 15], pyLines: [16, 17], algoStep: algoSwap,
      });
      i = big;
    }
  };

  steps.push({
    title: 'Heap Sort', desc: `n = ${n}. Treat the array as a binary tree: the children of index i are 2i+1 and 2i+2. First rearrange it into a max-heap.`,
    cells: cells(), pointers: [], vars: vars('—'),
    logic: 'In a max-heap every parent is ≥ its children, so the largest value is always at index 0.', logicTone: 'info', javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    steps.push({
      title: `Heapify: sift down index ${i}`, desc: `Index ${i} is a parent (children ${2 * i + 1}${2 * i + 2 < n ? ` and ${2 * i + 2}` : ''}). Make the subtree rooted here a max-heap.`,
      cells: cells({ [i]: 'compare' }), pointers: [ptr('i', 'parent', i, 'blue')], vars: vars(i),
      logic: 'Working from the last parent back to the root guarantees both child subtrees are already heaps.', logicTone: 'info', javaLines: [2], pyLines: [2, 3], algoStep: 0,
    });
    siftDown(i, 0, 0);
  }
  steps.push({
    title: 'Max-heap built', desc: `The largest value ${arr[0]} is now at index 0.`,
    cells: cells({ 0: 'found' }), pointers: [], vars: vars('—'),
    logic: 'Now repeatedly move the maximum to the end and repair the heap.', logicTone: 'success', javaLines: [3], pyLines: [4], algoStep: 1,
  });

  phase = 'extract max';
  for (let end = n - 1; end > 0; end--) {
    swap(0, end);
    size = end;
    steps.push({
      title: `Move the max ${arr[end]} to index ${end}`, desc: `Swap the root with the last heap element; ${arr[end]} is now in its final place and the heap shrinks to ${size}.`,
      cells: cells({ 0: 'swap' }), pointers: [ptr('i', 'root', 0, 'blue')], vars: vars(0),
      logic: 'The sorted region (green) grows from the right.', logicTone: 'success', javaLines: [3, 4], pyLines: [4, 5], algoStep: 2,
    });
    siftDown(0, 3, 3);
  }
  size = 0;

  steps.push({
    title: 'Done', desc: `Sorted with ${swaps} swap${swaps === 1 ? '' : 's'} and ${compares} comparison${compares === 1 ? '' : 's'}.`,
    cells: cells(), pointers: [], vars: vars('—'),
    logic: `Final array: [${arr.join(', ')}]`, logicTone: 'success', javaLines: [0], pyLines: [0], algoStep: 3,
    result: { title: `[${arr.join(', ')}]`, text: `${compares} comparisons · ${swaps} swaps` },
  });
  return steps;
}

export const heapSort: ProblemDef<In> = {
  slug: '912-heap-sort', id: '912', title: 'Heap Sort', difficulty: 'Medium', category: 'Sorting', tag: 'binary heap',
  statement: 'Sort an array with heap sort: turn the array into a max-heap, then repeatedly swap the maximum (index 0) with the last element of the heap, shrink the heap, and sift the new root down to restore the heap.',
  constraints: '1 ≤ n ≤ 5·10⁴ · −5·10⁴ ≤ nums[i] ≤ 5·10⁴ (animation input is limited to 12 numbers)',
  examples: [
    { label: '[5,2,9,1,5,6]', input: { nums: [5, 2, 9, 1, 5, 6] }, output: '[1,2,5,5,6,9]' },
    { label: '[4,10,3,5,1]', input: { nums: [4, 10, 3, 5, 1] }, output: '[1,3,4,5,10]' },
    { label: '[1,2,3,4,5,6]', input: { nums: [1, 2, 3, 4, 5, 6] }, output: '[1,2,3,4,5,6]' },
  ],
  inputPlaceholder: 'e.g. 5 2 9 1 5 6',
  parseInput: (raw) => ({ nums: parseNums(raw, { maxLen: 12, lo: -9999, hi: 9999 }) }), buildSteps: build, viz: 'cells',
  legend: [{ label: 'Parent / children being compared', state: 'compare' }, { label: 'Largest / swapping', state: 'swap' }, { label: 'Heap root', state: 'found' }, { label: 'Sorted (final place)', state: 'sorted' }],
  varLabels: ['phase', 'i', 'heap size', 'compares', 'swaps'],
  approach: {
    title: 'Build a max-heap, then peel off the maximum',
    text: 'Phase 1 sifts every parent down so the array obeys the max-heap rule (parent ≥ children, children of i at 2i+1 and 2i+2). Phase 2 repeatedly swaps the root with the last heap slot, shrinks the heap, and sifts the new root down.',
  },
  java: [
    'void heapSort(int[] nums) {',
    '    int n = nums.length;',
    '    for (int i = n / 2 - 1; i >= 0; i--) siftDown(nums, i, n);',
    '    for (int end = n - 1; end > 0; end--) {',
    '        swap(nums, 0, end);',
    '        siftDown(nums, 0, end);',
    '    }',
    '}',
    'void siftDown(int[] nums, int i, int size) {',
    '    while (true) {',
    '        int l = 2 * i + 1, r = l + 1, big = i;',
    '        if (l < size && nums[l] > nums[big]) big = l;',
    '        if (r < size && nums[r] > nums[big]) big = r;',
    '        if (big == i) return;',
    '        swap(nums, i, big);',
    '        i = big;',
    '    }',
    '}',
  ],
  python: [
    'def heap_sort(nums):',
    '    n = len(nums)',
    '    for i in range(n // 2 - 1, -1, -1):',
    '        sift_down(nums, i, n)',
    '    for end in range(n - 1, 0, -1):',
    '        nums[0], nums[end] = nums[end], nums[0]',
    '        sift_down(nums, 0, end)',
    'def sift_down(nums, i, size):',
    '    while True:',
    '        l, r, big = 2 * i + 1, 2 * i + 2, i',
    '        if l < size and nums[l] > nums[big]:',
    '            big = l',
    '        if r < size and nums[r] > nums[big]:',
    '            big = r',
    '        if big == i:',
    '            return',
    '        nums[i], nums[big] = nums[big], nums[i]',
    '        i = big',
  ],
  algorithm: [
    'Build a max-heap: sift down every parent from index n/2 − 1 back to 0',
    'The root (index 0) now holds the largest value',
    'Swap the root with the last heap element: it is in its final place; shrink the heap',
    'Sift the new root down to restore the heap; repeat until the heap is empty',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Heap invariant: every parent is ≥ its children, so index 0 is the maximum of the heap. Swapping it to the end of the heap puts it in its final sorted position, and the only broken spot is the new root, which sifts down along one root-to-leaf path in O(log n). Building the heap bottom-up costs O(n), and n extractions cost O(n log n).',
};
