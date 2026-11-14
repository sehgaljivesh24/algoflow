import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { fmtArr, ptr } from './pack1Kit.ts';
import { parseInts } from './stepKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = parseInts(raw, { what: 'the numbers', example: '3 5 2 1 4', minLen: 1, maxLen: 12, lo: 1, hi: 12 });
  const sorted = [...nums].sort((a, b) => a - b);
  if (sorted.some((v, i) => v !== i + 1)) throw new Error(`Enter every number from 1 to ${nums.length} exactly once (a shuffled permutation), e.g. 3 5 2 1 4`);
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const a = [...nums];
  const steps: Step[] = [];
  let swaps = 0;

  // keys are the values themselves (all distinct), so swapped cells slide to their new slots
  const cells = (cur: number, hot: number[] = [], done = false): Cell[] =>
    a.map((value, p) => {
      let state: CellState | undefined;
      if (hot.includes(p)) state = 'swap';
      else if (value === p + 1 && !(p === cur && !done)) state = 'sorted';
      else if (p === cur && !done) state = 'active';
      return { key: value, value, state };
    });
  const home = () => a.filter((v, p) => v === p + 1);
  const away = () => a.filter((v, p) => v !== p + 1);
  const aux = () => [
    { title: 'In place (value v at slot v − 1)', kind: 'list' as const, items: home().map(String) },
    { title: 'Still misplaced', kind: 'list' as const, items: away().map(String), bad: away().map((_, k) => k) },
  ];
  const vars = (i: number | string, j: number | string) => ({ i, 'target slot': j, swaps, 'in place': home().length });
  const add = (title: string, tag: string, desc: string, note: string, logic: string, tone: 'info' | 'warn' | 'success', cur: number, hot: number[], jl: number[], pl: number[], algo: number, j: number | string = '—') => {
    const pts = cur >= 0 && cur < n ? [ptr('i', 'i', cur, 'blue')] : [];
    if (typeof j === 'number' && j !== cur) pts.push(ptr('j', 'j', j, 'orange'));
    steps.push({ title, tag, desc, note, cells: cells(cur, hot), pointers: pts, aux: aux(), vars: vars(cur >= 0 ? cur : '—', j), logic, logicTone: tone, javaLines: jl, pyLines: pl, algoStep: algo });
  };

  add('Start', 'START —', `n = ${n}, array = ${fmtArr(a)}. Value v belongs at index v − 1, so no two values are ever compared. ${home().length} already home.`,
    'i = 0, nothing placed yet',
    'Because the values are exactly 1..n, each number knows its own destination. Cyclic sort sends every number straight home.', 'info', -1, [], [1], [1], 0);

  let i = 0;
  while (i < n) {
    const v = a[i];
    const j = v - 1;
    if (a[i] !== a[j]) {
      [a[i], a[j]] = [a[j], a[i]];
      swaps++;
      add(`${v} belongs at index ${j}: swap nums[${i}] and nums[${j}]`, 'SWAP:',
        `nums[${i}] = ${v} belongs at index ${v} − 1 = ${j}. Swap with nums[${j}]; slot ${i} now holds ${a[i]}, so i stays`,
        `j = ${v} − 1 = ${j}; nums[${i}] ≠ nums[${j}] → swap #${swaps}`,
        'Each swap fixes at least one number forever. There can be at most n − 1 swaps in total.', 'warn', i, [i, j], [5], [5], 1, j);
    } else {
      add(j === i ? `${v} is already home at index ${i}` : `${v} already sits at index ${j}`, 'ADVANCE:',
        `nums[${i}] = ${v} belongs at index ${j} and slot ${j} already holds ${v}, so i moves from ${i} to ${i + 1}`,
        `j = ${v} − 1 = ${j}; nums[${i}] == nums[${j}] → i = ${i + 1}`,
        'When the target slot already holds the right value, there is nothing to swap; advance i.', 'success', i, [], [7], [7], 2, j);
      i++;
    }
  }

  const text = fmtArr(a);
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `i reached n = ${n}: every value is home after ${swaps} swap${swaps === 1 ? '' : 's'} (at most n − 1 = ${n - 1}). Array = ${text}`,
    note: `sorted: ${text}, swaps = ${swaps}`,
    cells: cells(-1, [], true).map((c) => ({ ...c, state: 'sorted' as CellState })), pointers: [], aux: aux(), vars: vars('—', '—'),
    logic: 'O(n) time, O(1) space: no comparisons between elements were needed.', logicTone: 'success', javaLines: [10], pyLines: [8], algoStep: 3,
    result: { title: text, text: `Sorted with ${plural(swaps, 'swap')}` },
  });
  return steps;
}

export const cyclicSort: ProblemDef<In> = {
  slug: 'cp-cyclic-sort',
  id: 'CP', title: 'Cyclic Sort', difficulty: 'Easy', category: 'Sorting', tag: 'cyclic sort (values 1..n)',
  statement: 'You are given a permutation of the numbers 1..n. Sort it in place in O(n) time and O(1) extra space, without comparing elements to each other: use the fact that value v belongs at index v − 1.',
  emphasis: ['permutation', 'in place', 'O(n) time', 'O(1) extra space', 'index v − 1'],
  constraints: 'The array contains each of 1..n exactly once (animation input: n ≤ 12)',
  examples: [
    { label: '3 5 2 1 4', input: { nums: [3, 5, 2, 1, 4] }, output: '[1,2,3,4,5]' },
    { label: '2 1 3', input: { nums: [2, 1, 3] }, output: '[1,2,3]' },
    { label: '4 3 2 1', input: { nums: [4, 3, 2, 1] }, output: '[1,2,3,4]' },
  ],
  inputPlaceholder: 'a permutation of 1..n, e.g. 3 5 2 1 4',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Index i being placed', state: 'active' }, { label: 'Being swapped home', state: 'swap' }, { label: 'In its home slot', state: 'sorted' }],
  varLabels: ['i', 'target slot', 'swaps', 'in place'],
  phases: [
    { icon: '🏁', label: 'Start: i = 0', tone: 'blue' },
    { icon: '🔄', label: 'Swap: v → slot v − 1 (stay on i)', tone: 'orange' },
    { icon: '➡️', label: 'Already home: advance i', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Send every number to its own slot',
    text: 'Look at nums[i]. Its home is index nums[i] − 1. If that slot does not already hold the same value, swap the two and look at index i again (a new number just arrived). Otherwise the number is in place, so move to i + 1.',
  },
  java: [
    'public void cyclicSort(int[] nums) {',
    '    int i = 0;',
    '    while (i < nums.length) {',
    '        int j = nums[i] - 1;                 // home slot of nums[i]',
    '        if (nums[i] != nums[j]) {',
    '            int t = nums[i]; nums[i] = nums[j]; nums[j] = t;   // send it home, re-check slot i',
    '        } else {',
    '            i++;                             // already home: advance',
    '        }',
    '    }',
    '}',
  ],
  python: [
    'def cyclic_sort(nums):',
    '    i = 0',
    '    while i < len(nums):',
    '        j = nums[i] - 1',
    '        if nums[i] != nums[j]:',
    '            nums[i], nums[j] = nums[j], nums[i]',
    '        else:',
    '            i += 1',
    '    return nums',
  ],
  algorithm: [
    'Start at i = 0; value v belongs at index v − 1',
    'Home slot j = nums[i] − 1: if nums[j] is not already nums[i], swap them and stay on i',
    'Otherwise nums[i] is home: advance i',
    'When i reaches n the array is sorted',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Every swap puts one value into its final slot and that value is never moved again, so there are at most n − 1 swaps. The pointer i advances only n times, so the total work is at most 2n steps, even though the swap happens inside a loop that does not advance i.',
};
