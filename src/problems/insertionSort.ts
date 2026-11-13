import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { parseNums, ptr } from './ssbShared.ts';

interface In { nums: number[] }

function build({ nums }: In): Step[] {
  const arr = [...nums];
  const keys = arr.map((_, i) => i);
  const n = arr.length;
  const steps: Step[] = [];
  let compares = 0;
  let shifts = 0;

  /** prefix = number of leading cells already in the sorted prefix */
  const cells = (prefix: number, mark: Record<number, CellState> = {}): Cell[] =>
    arr.map((value, i) => ({ key: keys[i], value, state: mark[i] ?? (i < prefix ? 'found' : undefined) }));
  const vars = (i: number | string, j: number | string, key: number | string) => ({ i, j, key, compares, shifts });

  steps.push({
    title: 'Insertion Sort', desc: `n = ${n}. The first element alone is a sorted prefix; each later element is inserted into it.`,
    cells: cells(1), pointers: [], vars: vars('—', '—', '—'),
    logic: 'Like sorting playing cards in your hand: keep the left part sorted and slide each new card left until it fits.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let kpos = i;
    let j = i - 1;
    steps.push({
      title: `Pick key = nums[${i}] = ${key}`, desc: `Insert ${key} into the sorted prefix nums[0..${i - 1}].`,
      cells: cells(i, { [i]: 'swap' }), pointers: [ptr('key', 'key', i, 'orange'), ...(j >= 0 ? [ptr('j', 'j', j, 'blue')] : [])], vars: vars(i, j, key),
      logic: 'The key is lifted out; larger prefix values will shift right to make room.', logicTone: 'info',
      javaLines: [1, 2, 3], pyLines: [1, 2, 3], algoStep: 1,
    });
    while (j >= 0) {
      compares++;
      const bigger = arr[j] > key;
      steps.push({
        title: `Compare nums[${j}] = ${arr[j]} with key ${key}`, desc: bigger ? `${arr[j]} > ${key}: shift it right.` : `${arr[j]} ≤ ${key}: the key belongs right after index ${j}.`,
        cells: cells(i, { [j]: 'compare', [kpos]: 'swap' }), pointers: [ptr('j', 'j', j, 'blue'), ptr('key', 'key', kpos, 'orange')], vars: vars(i, j, key),
        logic: bigger ? 'A larger value must end up to the right of the key.' : 'Everything further left is ≤ this value, so the search ends.', logicTone: bigger ? 'warn' : 'info',
        javaLines: [4], pyLines: [4], algoStep: 2,
      });
      if (!bigger) break;
      [arr[j], arr[kpos]] = [arr[kpos], arr[j]];
      [keys[j], keys[kpos]] = [keys[kpos], keys[j]];
      kpos = j;
      shifts++;
      steps.push({
        title: 'Shift right', desc: `${arr[j + 1]} moved one slot to the right; the gap for the key is now at index ${j}.`,
        cells: cells(i, { [j]: 'swap', [j + 1]: 'compare' }), pointers: [ptr('key', 'key', kpos, 'orange')], vars: vars(i, j, key),
        logic: 'On screen the key slides left while the larger value slides right (in code it is a single assignment per shift).', logicTone: 'success',
        javaLines: [5, 6], pyLines: [5, 6], algoStep: 2,
      });
      j--;
    }
    steps.push({
      title: `Insert ${key} at index ${kpos}`, desc: `nums[0..${i}] is now sorted: [${arr.slice(0, i + 1).join(', ')}].`,
      cells: cells(i + 1, { [kpos]: 'sorted' }), pointers: [], vars: vars(i, kpos - 1, key),
      logic: `The sorted prefix grew to ${i + 1} elements.`, logicTone: 'success', javaLines: [8], pyLines: [7], algoStep: 3,
    });
  }

  steps.push({
    title: 'Done', desc: `Sorted with ${shifts} shift${shifts === 1 ? '' : 's'} and ${compares} comparison${compares === 1 ? '' : 's'}.`,
    cells: cells(n), pointers: [], vars: vars('—', '—', '—'),
    logic: `Final array: [${arr.join(', ')}]`, logicTone: 'success', javaLines: [0, 10], pyLines: [0], algoStep: 3,
    result: { title: `[${arr.join(', ')}]`, text: `${compares} comparisons · ${shifts} shifts` },
  });
  return steps;
}

export const insertionSort: ProblemDef<In> = {
  slug: '912-insertion-sort', id: '912', title: 'Insertion Sort', difficulty: 'Easy', category: 'Sorting', tag: 'shift and insert',
  statement: 'Sort an array in ascending order with insertion sort: grow a sorted prefix one element at a time by sliding each new element left until it sits after the last value that is not greater than it.',
  constraints: '1 ≤ n ≤ 5·10⁴ · −5·10⁴ ≤ nums[i] ≤ 5·10⁴ (animation input is limited to 12 numbers)',
  examples: [
    { label: '[5,2,9,1,5,6]', input: { nums: [5, 2, 9, 1, 5, 6] }, output: '[1,2,5,5,6,9]' },
    { label: '[4,3,2,1]', input: { nums: [4, 3, 2, 1] }, output: '[1,2,3,4]' },
    { label: '[1,2,3,4]', input: { nums: [1, 2, 3, 4] }, output: '[1,2,3,4]' },
  ],
  inputPlaceholder: 'e.g. 5 2 9 1 5 6',
  parseInput: (raw) => ({ nums: parseNums(raw, { maxLen: 12, lo: -9999, hi: 9999 }) }), buildSteps: build, viz: 'cells',
  legend: [{ label: 'Sorted prefix', state: 'found' }, { label: 'Key being inserted', state: 'swap' }, { label: 'Comparing', state: 'compare' }, { label: 'Just inserted', state: 'sorted' }],
  varLabels: ['i', 'j', 'key', 'compares', 'shifts'],
  approach: {
    title: 'Grow a sorted prefix by insertion',
    text: 'Take the next element as the key. Walk left through the sorted prefix, shifting every larger value one slot right, and drop the key into the gap. Cheap on nearly sorted data.',
  },
  java: [
    'public void insertionSort(int[] nums) {',
    '    for (int i = 1; i < nums.length; i++) {',
    '        int key = nums[i];',
    '        int j = i - 1;',
    '        while (j >= 0 && nums[j] > key) {',
    '            nums[j + 1] = nums[j];',
    '            j--;',
    '        }',
    '        nums[j + 1] = key;',
    '    }',
    '}',
  ],
  python: [
    'def insertion_sort(nums):',
    '    for i in range(1, len(nums)):',
    '        key = nums[i]',
    '        j = i - 1',
    '        while j >= 0 and nums[j] > key:',
    '            nums[j + 1] = nums[j]',
    '            j -= 1',
    '        nums[j + 1] = key',
  ],
  algorithm: [
    'Treat nums[0..0] as the sorted prefix',
    'For i = 1..n−1, lift out key = nums[i]',
    'While the element to the left is larger than key, shift it right',
    'Place key in the gap; the prefix is now one longer',
  ],
  complexity: [{ label: 'Best', value: 'O(n)' }, { label: 'Average / Worst', value: 'O(n²)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Invariant: before iteration i, nums[0..i−1] holds the original first i elements in sorted order. Shifting all larger elements right and inserting the key keeps the prefix sorted. Using ">" (not "≥") never moves equal elements past each other, so the sort is stable.',
};
