import type { Cell, CellState, ProblemDef, Step } from '../engine/types';
import { plural } from './text.ts';

interface In { nums: number[] }

function parseNums(raw: string, max = 12): number[] {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n))) throw new Error('Enter whole numbers, e.g. 5 2 9 1');
  if (nums.length > max) throw new Error(`Use ${max} numbers or fewer so the animation stays readable`);
  return nums;
}

function build({ nums }: In): Step[] {
  const arr = [...nums];
  const keys = arr.map((_, i) => i);
  const n = arr.length;
  const steps: Step[] = [];
  let compares = 0;
  let swaps = 0;

  /** sortedFrom: indexes >= this are locked in place. */
  const cells = (sortedFrom: number, mark?: Record<number, CellState>): Cell[] =>
    arr.map((value, i) => ({ key: keys[i], value, state: mark?.[i] ?? (i >= sortedFrom ? 'sorted' : undefined) }));
  const vars = (i: number | string, j: number | string) => ({ 'pass i': i, j, compares, swaps });

  steps.push({
    title: 'Bubble Sort', tag: 'START —',
    desc: `n = ${n}: each pass compares neighbours and lets the largest unsorted value bubble to the right.`,
    cells: cells(n), pointers: [], vars: vars('—', '—'),
    logic: 'Compare neighbours and swap them when they are out of order. After each pass the biggest remaining value is in its final place.',
    logicTone: 'info', javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, note: `n = ${n}, compares = 0, swaps = 0`,
  });

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    steps.push({
      title: `Pass ${i + 1} begins`, tag: 'PASS:',
      desc: `pass ${i + 1}: sweep j from 0 to ${n - 2 - i}, comparing adjacent pairs; the last ${i} value${i === 1 ? ' is' : 's are'} already locked.`,
      cells: cells(n - i), pointers: [], vars: vars(i, '—'),
      logic: `The last ${i} element${i === 1 ? ' is' : 's are'} already locked in.`,
      logicTone: 'info', javaLines: [2, 3], pyLines: [2, 3], algoStep: 0, note: `i = ${i}, swapped = false, j runs 0..${n - 2 - i}`,
    });

    for (let j = 0; j < n - 1 - i; j++) {
      compares++;
      const need = arr[j] > arr[j + 1];
      steps.push({
        title: `Compare nums[${j}] and nums[${j + 1}]`, tag: 'COMPARE:',
        desc: need ? `nums[${j}] = ${arr[j]} > nums[${j + 1}] = ${arr[j + 1]}: out of order, so swap.` : `nums[${j}] = ${arr[j]} ≤ nums[${j + 1}] = ${arr[j + 1]}: already in order.`,
        cells: cells(n - i, { [j]: 'compare', [j + 1]: 'compare' }),
        pointers: [
          { id: 'j', label: 'j', index: j, tone: 'blue' },
          { id: 'j1', label: 'j+1', index: j + 1, tone: 'orange' },
        ],
        vars: vars(i, j),
        alert: need ? `Out of order: ${arr[j]} sits left of the smaller ${arr[j + 1]}.` : undefined,
        logic: need ? `${arr[j]} is bigger than ${arr[j + 1]}, so it has to move right.` : 'Nothing to do — move on to the next pair.',
        logicTone: need ? 'warn' : 'info', javaLines: [4, 5], pyLines: [4, 5], algoStep: 1,
        note: `${arr[j]} > ${arr[j + 1]} → ${need}`,
      });
      if (need) {
        const left = arr[j];
        const right = arr[j + 1];
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        [keys[j], keys[j + 1]] = [keys[j + 1], keys[j]];
        swaps++;
        swapped = true;
        steps.push({
          title: 'Swapped', tag: 'SWAP:',
          desc: `swap nums[${j}] and nums[${j + 1}]: ${left} moves one step to the right and ${right} one step to the left (swap #${swaps}).`,
          cells: cells(n - i, { [j]: 'swap', [j + 1]: 'swap' }),
          pointers: [
            { id: 'j', label: 'j', index: j, tone: 'blue' },
            { id: 'j1', label: 'j+1', index: j + 1, tone: 'orange' },
          ],
          vars: vars(i, j), logic: 'Swap done. The larger value keeps travelling right.', logicTone: 'success',
          javaLines: [6, 7, 8, 9], pyLines: [6, 7], algoStep: 2, note: `nums[${j}] = ${right}, nums[${j + 1}] = ${left}`,
        });
      }
    }

    steps.push({
      title: `Pass ${i + 1} complete`, tag: swapped ? 'LOCK:' : 'EARLY EXIT:',
      desc: swapped ? `pass ${i + 1} ends: ${arr[n - i - 1]} reached its final position ${n - i - 1}.` : `pass ${i + 1} made no swaps, so the array is already sorted and we stop early.`,
      cells: cells(swapped ? n - i - 1 : 0), pointers: [], vars: vars(i, '—'),
      logic: swapped ? `The sorted block at the right is now ${i + 1} long.` : 'Early exit: a pass with zero swaps means we are done.',
      logicTone: 'success', javaLines: [12], pyLines: [8, 9], algoStep: 3,
      note: swapped ? `nums[${n - i - 1}] = ${arr[n - i - 1]} is final` : 'swapped == false → break',
    });
    if (!swapped) break;
  }

  steps.push({
    title: 'Done', tag: '✅ Done!',
    desc: `the array is sorted after ${swaps} swap${swaps === 1 ? '' : 's'} and ${compares} comparison${compares === 1 ? '' : 's'}: [${arr.join(', ')}].`,
    cells: cells(0), pointers: [], vars: vars('—', '—'), note: `${plural(compares, 'compare')}, ${plural(swaps, 'swap')}`,
    logic: `Final array: [${arr.join(', ')}]`, logicTone: 'success', javaLines: [0, 14], pyLines: [0], algoStep: 4,
    result: { title: 'Sorted', text: `[${arr.join(', ')}] · ${plural(compares, 'comparison')} · ${plural(swaps, 'swap')}` },
  });
  return steps;
}

export const bubbleSort: ProblemDef<In> = {
  slug: '912-bubble-sort',
  id: '912', title: 'Bubble Sort', difficulty: 'Easy', category: 'Sorting', tag: 'adjacent swaps',
  statement:
    'Sort an array of integers in ascending order using bubble sort: repeatedly compare adjacent elements and swap them if they are in the wrong order. Each full pass moves the largest remaining element to the end.',
  constraints: '1 ≤ n ≤ 5·10⁴ · −5·10⁴ ≤ nums[i] ≤ 5·10⁴ (animation input is limited to 12 numbers)',
  examples: [
    { label: '[5,2,9,1,5,6]', input: { nums: [5, 2, 9, 1, 5, 6] }, output: '[1,2,5,5,6,9]' },
    { label: '[5,1,4,2,8]', input: { nums: [5, 1, 4, 2, 8] }, output: '[1,2,4,5,8]' },
    { label: '[1,2,3,4]', input: { nums: [1, 2, 3, 4] }, output: '[1,2,3,4]' },
  ],
  inputPlaceholder: 'e.g. 5 2 9 1 5 6',
  parseInput: (raw) => ({ nums: parseNums(raw) }),
  buildSteps: build,
  viz: 'cells',
  legend: [{ label: 'Comparing', state: 'compare' }, { label: 'Swapping', state: 'swap' }, { label: 'Sorted', state: 'sorted' }],
  varLabels: ['pass i', 'j', 'compares', 'swaps'],
  approach: {
    title: 'Adjacent swaps, largest bubbles to the end',
    text: 'Walk left to right comparing nums[j] and nums[j+1]; swap if out of order. After pass i the i largest values are in place. Stop early if a pass makes no swap.',
  },
  java: [
    'public void bubbleSort(int[] nums) {',
    '    int n = nums.length;',
    '    for (int i = 0; i < n - 1; i++) {',
    '        boolean swapped = false;',
    '        for (int j = 0; j < n - 1 - i; j++) {',
    '            if (nums[j] > nums[j + 1]) {',
    '                int tmp = nums[j];',
    '                nums[j] = nums[j + 1];',
    '                nums[j + 1] = tmp;',
    '                swapped = true;',
    '            }',
    '        }',
    '        if (!swapped) break;',
    '    }',
    '}',
  ],
  python: [
    'def bubble_sort(nums):',
    '    n = len(nums)',
    '    for i in range(n - 1):',
    '        swapped = False',
    '        for j in range(n - 1 - i):',
    '            if nums[j] > nums[j + 1]:',
    '                nums[j], nums[j + 1] = nums[j + 1], nums[j]',
    '                swapped = True',
    '        if not swapped:',
    '            break',
  ],
  phases: [
    { icon: '🔁', label: 'Start a pass', tone: 'blue' },
    { icon: '🔍', label: 'Compare neighbours', tone: 'cyan' },
    { icon: '🔄', label: 'Swap', tone: 'orange' },
    { icon: '🔒', label: 'Lock largest / early exit', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['bubble sort', 'adjacent elements', 'wrong order'],
  algorithm: [
    'For each pass i from 0 to n−2',
    'For j from 0 to n−2−i, compare nums[j] and nums[j+1]',
    'If nums[j] > nums[j+1], swap them',
    'After the pass the largest value is locked; if the pass made zero swaps, stop early',
    'Done: the array is sorted',
  ],
  complexity: [
    { label: 'Best', value: 'O(n)' }, { label: 'Average / Worst', value: 'O(n²)' }, { label: 'Space', value: 'O(1)' },
  ],
  why: 'Invariant: after pass i, the last i elements are the i largest values in sorted order. The swapped flag turns the best case (already sorted) into one linear pass.',
};
