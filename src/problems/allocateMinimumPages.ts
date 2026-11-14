import type { ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { buildPartition, parsePartition, type PartIn } from './ssbPartition.ts';

function build(inp: PartIn): Step[] {
  const { nums, k } = inp;
  if (k > nums.length) {
    const vars = { lo: '—', mid: '—', hi: '—', 'students needed': '—', m: k };
    const cells = nums.map((value, i) => ({ key: i, value, state: 'error' as const }));
    return [
      {
        title: 'Start', tag: 'BOUND —', desc: `${plural(nums.length, 'book')} and ${plural(k, 'student')}: every student must get at least one book of the contiguous blocks.`,
        cells, pointers: [], vars, logic: 'Books are handed out in contiguous blocks and nobody may be left empty-handed.', logicTone: 'info',
        javaLines: [0], pyLines: [0], algoStep: 0, note: `n = ${nums.length}, m = ${k}`,
      },
      {
        title: 'Impossible', tag: 'REJECT:', desc: `${plural(k, 'student')} > ${plural(nums.length, 'book')}, so at least one student would get no book at all.`,
        cells, pointers: [], vars, logic: 'Return −1 immediately; no capacity can fix this.', logicTone: 'warn',
        alert: `m = ${k} is larger than the ${plural(nums.length, 'book')}: some student would be empty-handed, so the answer is −1.`,
        javaLines: [1], pyLines: [1, 2], algoStep: 0, note: `${k} > ${nums.length} → return −1`,
      },
      {
        title: 'Answer = −1', tag: '✅ Done!', desc: `no allocation exists with ${plural(k, 'student')} and only ${plural(nums.length, 'book')}, so the function returns −1.`,
        cells, pointers: [], vars, logic: 'The −1 sentinel tells the caller that the input is infeasible.', logicTone: 'success',
        javaLines: [1], pyLines: [2], algoStep: 4, note: 'return −1',
        result: { title: '-1', text: 'More students than books: allocation is impossible' },
      },
    ];
  }
  return buildPartition(inp, {
    itemName: 'pages', groupName: 'student', groupTag: 'S', capName: 'max pages', kName: 'm',
    startDesc: `Allocate ${plural(nums.length, 'book')} in order among ${plural(k, 'student')}, minimising the largest number of pages any student reads.`,
    resultText: (a) => `The busiest student reads at least ${a} pages, and ${a} is achievable`,
    java: { init: [2, 3], mid: [4, 5], check: [6, 13, 14], ok: [6], bad: [7], ret: [9] },
    py: { init: [3], mid: [4, 5], check: [6, 13, 14], ok: [6, 7], bad: [8, 9], ret: [10] },
    fiveStep: true,
  });
}

export const allocateMinimumPages: ProblemDef<PartIn> = {
  slug: 'gfg-allocate-minimum-pages', id: 'GFG', title: 'Allocate Minimum Pages', difficulty: 'Hard', category: 'Binary Search', tag: 'search on answer',
  statement: 'Books with given page counts must be allocated to m students. Each student gets a contiguous block of books (at least one), and every book goes to exactly one student. Minimise the maximum pages assigned to any student; return −1 if m is larger than the number of books.',
  constraints: '1 ≤ n, m ≤ 10⁵ · 1 ≤ pages[i] ≤ 10⁶ (animation input: at most 10 books of 1–99 pages, m ≤ 20)',
  examples: [
    { label: '[12,34,67,90], m=2', input: { nums: [12, 34, 67, 90], k: 2 }, output: '113' },
    { label: '[15,17,20], m=2', input: { nums: [15, 17, 20], k: 2 }, output: '32' },
    { label: '[10,20,30], m=4', input: { nums: [10, 20, 30], k: 4 }, output: '−1' },
  ],
  inputPlaceholder: 'e.g. 12 34 67 90 ; 2',
  parseInput: (raw) => parsePartition(raw, 'pages ; students — e.g. 12 34 67 90 ; 2', 1, 20, 'Students m', 'books'),
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Student block (colours)', state: 'active' }, { label: 'Overflow beyond m students', state: 'error' }, { label: 'Not yet allocated', state: 'dim' }],
  varLabels: ['lo', 'mid', 'hi', 'students needed', 'm'],
  approach: {
    title: 'Binary search the maximum pages per student',
    text: 'The answer is between the thickest single book and the total. For a candidate limit, give books to a student in order until the next one would exceed the limit, then move to the next student. If at most m students are needed the limit works.',
  },
  java: [
    'public int findPages(int[] arr, int m) {',
    '    if (m > arr.length) return -1;',
    '    int lo = 0, hi = 0;',
    '    for (int p : arr) { lo = Math.max(lo, p); hi += p; }',
    '    while (lo < hi) {',
    '        int mid = lo + (hi - lo) / 2;',
    '        if (studentsNeeded(arr, mid) <= m) hi = mid;',
    '        else lo = mid + 1;',
    '    }',
    '    return lo;',
    '}',
    'private int studentsNeeded(int[] arr, int maxPages) {',
    '    int students = 1, load = 0;',
    '    for (int p : arr) {',
    '        if (load + p > maxPages) { students++; load = 0; }',
    '        load += p;',
    '    }',
    '    return students;',
    '}',
  ],
  python: [
    'def find_pages(arr, m):',
    '    if m > len(arr):',
    '        return -1',
    '    lo, hi = max(arr), sum(arr)',
    '    while lo < hi:',
    '        mid = lo + (hi - lo) // 2',
    '        if students_needed(arr, mid) <= m:',
    '            hi = mid',
    '        else:',
    '            lo = mid + 1',
    '    return lo',
    'def students_needed(arr, max_pages):',
    '    students, load = 1, 0',
    '    for p in arr:',
    '        if load + p > max_pages:',
    '            students += 1',
    '            load = 0',
    '        load += p',
    '    return students',
  ],
  phases: [
    { icon: '📐', label: 'Bound the page limit', tone: 'blue' },
    { icon: '🎯', label: 'Guess mid', tone: 'cyan' },
    { icon: '📚', label: 'Allocate greedily (test)', tone: 'gold' },
    { icon: '✂️', label: 'Narrow the range', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['contiguous block', 'Minimise the maximum pages', 'return −1'],
  algorithm: [
    'If m > n return −1; otherwise lo = max(pages), hi = sum(pages)',
    'Pick mid as the candidate page limit',
    'Feasibility: allocate greedily; are at most m students needed?',
    'Feasible → hi = mid; otherwise lo = mid + 1',
    'When lo == hi, return lo',
  ],
  complexity: [{ label: 'Time', value: 'O(n log(sum))' }, { label: 'Space', value: 'O(1)' }],
  why: 'Raising the limit never increases the number of students needed, so feasibility is monotone. Greedy allocation is optimal for a fixed limit. When m ≤ n, using fewer than m students can always be turned into exactly m by splitting a block, without raising the maximum.',
};
