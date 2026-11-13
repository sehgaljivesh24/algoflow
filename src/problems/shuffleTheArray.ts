import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[]; n: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  const nums = left.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.length % 2 || nums.some((x) => !Number.isInteger(x))) throw new Error('Enter an even count of whole numbers, e.g. 2 5 1 3 4 7 ; 3');
  const n = right === undefined || !right.trim() ? nums.length / 2 : Number(right.trim());
  if (n !== nums.length / 2) throw new Error(`n must be half the array length (${nums.length / 2})`);
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer (n up to 6)');
  return { nums, n };
}

function build({ nums, n }: In): Step[] {
  const steps: Step[] = [];
  const out: number[] = [];
  const order: number[] = []; // source indexes in output order

  const cells = (i: number, finished = false): Cell[] => {
    const list = finished ? order : nums.map((_, k) => k);
    return list.map((k) => {
      let state: CellState | undefined;
      if (finished) state = 'found';
      else if (i >= 0 && (k === i || k === i + n)) state = 'active';
      else if (k < i || (k >= n && k < n + i)) state = 'dim';
      return { key: k, value: nums[k], state };
    });
  };
  const aux = () => [{ title: 'ans (built left to right)', kind: 'list' as const, items: out.map(String) }];
  const vars = (i: number | string) => ({ n, i, 'ans size': out.length });

  steps.push({
    title: 'Start', desc: `The first half is x₁..xₙ (indexes 0..${n - 1}), the second half is y₁..yₙ (indexes ${n}..${2 * n - 1}).`,
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'We want x₁, y₁, x₂, y₂, … so we alternate between the two halves.', logicTone: 'info', javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  for (let i = 0; i < n; i++) {
    out.push(nums[i], nums[i + n]);
    order.push(i, i + n);
    steps.push({
      title: `Take pair ${i + 1}: ${nums[i]} then ${nums[i + n]}`, desc: `nums[${i}] = ${nums[i]} (from the first half) and nums[${i} + ${n}] = ${nums[i + n]} (from the second half) go next into ans.`,
      cells: cells(i), pointers: [{ id: 'i', label: 'i', index: i, tone: 'blue' }, { id: 'j', label: 'i+n', index: i + n, tone: 'orange' }],
      aux: aux(), vars: vars(i),
      logic: 'Pairing index i with index i + n interleaves the halves in one pass.', logicTone: 'info', javaLines: [2, 3, 4], pyLines: [2, 3, 4], algoStep: 1,
    });
  }

  steps.push({
    title: 'Done', desc: 'The cells slid into their interleaved positions.',
    cells: cells(-1, true), pointers: [], aux: aux(), vars: vars('—'),
    logic: `Result: [${out.join(', ')}]`, logicTone: 'success', javaLines: [6], pyLines: [5], algoStep: 2,
    result: { title: `[${out.join(', ')}]`, text: 'The two halves interleaved' },
  });
  return steps;
}

export const shuffleTheArray: ProblemDef<In> = {
  slug: '1470-shuffle-the-array',
  id: '1470', title: 'Shuffle the Array', difficulty: 'Easy', category: 'Arrays', tag: 'basics',
  statement: 'nums has 2n elements laid out as [x₁, …, xₙ, y₁, …, yₙ]. Return [x₁, y₁, x₂, y₂, …, xₙ, yₙ]: the two halves interleaved.',
  constraints: '1 ≤ n ≤ 500 · nums.length = 2n · 1 ≤ nums[i] ≤ 1000 (animation input is limited to 12 numbers)',
  examples: [
    { label: '[2,5,1,3,4,7], n=3', input: { nums: [2, 5, 1, 3, 4, 7], n: 3 }, output: '[2,3,5,4,1,7]' },
    { label: '[1,2,3,4,4,3,2,1], n=4', input: { nums: [1, 2, 3, 4, 4, 3, 2, 1], n: 4 }, output: '[1,4,2,3,3,2,4,1]' },
    { label: '[1,1,2,2], n=2', input: { nums: [1, 1, 2, 2], n: 2 }, output: '[1,2,1,2]' },
  ],
  inputPlaceholder: 'nums ; n   e.g. 2 5 1 3 4 7 ; 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Pair being taken', state: 'active' }, { label: 'Already placed', state: 'dim' }, { label: 'Final answer', state: 'found' }],
  varLabels: ['n', 'i', 'ans size'],
  approach: {
    title: 'Walk both halves together',
    text: 'Index i in the first half and index i + n in the second half belong side by side in the answer. Loop i from 0 to n − 1 and append both.',
  },
  java: [
    'public int[] shuffle(int[] nums, int n) {',
    '    int[] ans = new int[2 * n];',
    '    for (int i = 0; i < n; i++) {',
    '        ans[2 * i] = nums[i];',
    '        ans[2 * i + 1] = nums[i + n];',
    '    }',
    '    return ans;',
    '}',
  ],
  python: [
    'def shuffle(nums, n):',
    '    ans = []',
    '    for i in range(n):',
    '        ans.append(nums[i])',
    '        ans.append(nums[i + n])',
    '    return ans',
  ],
  algorithm: [
    'Prepare an empty answer of size 2n',
    'For each i in 0..n−1, place nums[i] then nums[i + n]',
    'Return the answer',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n) for the output' }],
  why: "The answer's even slots 2i receive exactly the first half in order and its odd slots 2i + 1 receive exactly the second half in order, which is the definition of the interleave. Each input element is read once.",
};
