import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n))) throw new Error('Enter whole numbers, e.g. 1 2 1');
  if (nums.length > 8) throw new Error('Use 8 numbers or fewer (the answer has twice as many)');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const ans: (number | null)[] = Array(2 * n).fill(null);
  const steps: Step[] = [];

  const cells = (hot: number[] = []): Cell[] =>
    ans.map((v, i) => ({ key: i, value: v === null ? '·' : v, state: hot.includes(i) ? 'active' : v === null ? 'dim' : 'sorted' }));
  const aux = () => [{ title: 'nums (source)', kind: 'list' as const, items: nums.map(String) }];
  const vars = (i: number | string) => ({ n, i });

  steps.push({
    title: 'Start', desc: `nums has n = ${plural(n, 'number')}, so ans needs 2n = ${plural(2 * n, 'slot')}.`,
    cells: cells(), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'The answer is nums followed by nums again: slot i and slot i + n always hold the same value.', logicTone: 'info',
    javaLines: [1, 2], pyLines: [1, 2], algoStep: 0, tag: 'READY —', note: `n = ${n}, ans = new int[${2 * n}]`,
  });

  for (let i = 0; i < n; i++) {
    const ptrs = [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }, { id: 'in', label: 'i+n', index: i + n, tone: 'orange' as const }];
    ans[i] = nums[i];
    steps.push({
      title: `Write ans[${i}] = ${nums[i]}`, tag: 'WRITE FIRST',
      desc: `nums[${i}] = ${nums[i]} is copied into the first half, so ans[${i}] = ${nums[i]}`,
      cells: cells([i]), pointers: ptrs, aux: aux(), vars: vars(i),
      logic: 'Slot i of the answer repeats nums[i] exactly.', logicTone: 'info',
      javaLines: [4], pyLines: [4], algoStep: 1, note: `ans[${i}] = nums[${i}] = ${nums[i]}`,
    });
    ans[i + n] = nums[i];
    steps.push({
      title: `Write ans[${i} + ${n}] = ${nums[i]}`, tag: 'WRITE SECOND',
      desc: `the same ${nums[i]} is copied into the second half, so ans[${i} + ${n}] = ans[${i + n}] = ${nums[i]}`,
      cells: cells([i + n]), pointers: ptrs, aux: aux(), vars: vars(i),
      logic: 'One read of nums[i] fills both halves, so a single loop of n iterations builds the whole answer.', logicTone: 'info',
      javaLines: [5], pyLines: [5], algoStep: 2, note: `ans[${i} + ${n}] = nums[${i}] = ${nums[i]}`,
    });
  }

  const out = ans.map(Number);
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `all ${2 * n} slots are filled, so the answer is [${out.join(', ')}]`,
    cells: out.map((v, i) => ({ key: i, value: v, state: 'found' as const })), pointers: [], aux: aux(), vars: vars('—'),
    logic: `Result: [${out.join(', ')}]`, logicTone: 'success', javaLines: [7], pyLines: [6], algoStep: 3, note: `return ans = [${out.join(', ')}]`,
    result: { title: `[${out.join(', ')}]`, text: 'nums concatenated with itself' },
  });
  return steps;
}

export const concatenationOfArray: ProblemDef<In> = {
  slug: '1929-concatenation-of-array',
  id: '1929', title: 'Concatenation of Array', difficulty: 'Easy', category: 'Arrays', tag: 'basics',
  statement: 'Given an integer array nums of length n, build an array ans of length 2n where ans[i] = nums[i] and ans[i + n] = nums[i] for every 0 ≤ i < n. In other words, nums written twice in a row.',
  constraints: '1 ≤ n ≤ 1000 · 1 ≤ nums[i] ≤ 1000 (animation input is limited to 8 numbers)',
  examples: [
    { label: '[1,2,1]', input: { nums: [1, 2, 1] }, output: '[1,2,1,1,2,1]' },
    { label: '[1,3,2,1]', input: { nums: [1, 3, 2, 1] }, output: '[1,3,2,1,1,3,2,1]' },
    { label: '[7]', input: { nums: [7] }, output: '[7,7]' },
  ],
  inputPlaceholder: 'e.g. 1 3 2 1',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Being written', state: 'active' }, { label: 'Filled', state: 'sorted' }, { label: 'Empty slot', state: 'dim' }, { label: 'Final answer', state: 'found' }],
  varLabels: ['n', 'i'],
  emphasis: ['length 2n', 'nums written twice'],
  phases: [
    { icon: '🧺', label: 'SETUP ans (2n slots)', tone: 'blue' },
    { icon: '✍', label: 'WRITE ans[i]', tone: 'cyan' },
    { icon: '📑', label: 'WRITE ans[i + n]', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Write each value into both halves',
    text: 'Allocate an array of size 2n. For every index i, copy nums[i] into ans[i] and again into ans[i + n]. One pass, no tricks.',
  },
  java: [
    'public int[] getConcatenation(int[] nums) {',
    '    int n = nums.length;',
    '    int[] ans = new int[2 * n];',
    '    for (int i = 0; i < n; i++) {',
    '        ans[i] = nums[i];',
    '        ans[i + n] = nums[i];',
    '    }',
    '    return ans;',
    '}',
  ],
  python: [
    'def get_concatenation(nums):',
    '    n = len(nums)',
    '    ans = [0] * (2 * n)',
    '    for i in range(n):',
    '        ans[i] = nums[i]',
    '        ans[i + n] = nums[i]',
    '    return ans',
  ],
  algorithm: [
    'Let n = len(nums) and create ans with 2n slots',
    'For each i, set ans[i] = nums[i]',
    'Then set ans[i + n] = nums[i]',
    'Return ans',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n) for the output' }],
  why: 'Index i and index i + n are different slots for every i in [0, n), so no write overwrites another. Together the two writes cover all 2n slots exactly once, and each slot gets the value the definition demands.',
};
