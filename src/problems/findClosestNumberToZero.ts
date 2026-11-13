import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n))) throw new Error('Enter whole numbers (negatives allowed), e.g. -4 -2 1 4 8');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  return { nums };
}

function build({ nums }: In): Step[] {
  const steps: Step[] = [];
  let bestIdx = 0;

  const cells = (cur: number): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (i === cur) state = 'active';
      else if (i === bestIdx && cur >= 0) state = 'found';
      else if (i < cur) state = 'dim';
      return { key: i, value, state };
    });
  const ptrs = (cur: number) => (cur >= 0 ? [{ id: 'i', label: 'i', index: cur, tone: 'blue' as const }] : []);
  const vars = (i: number | string) => ({ i, best: nums[bestIdx], '|best|': Math.abs(nums[bestIdx]) });

  steps.push({
    title: 'Start', desc: `Take nums[0] = ${nums[0]} as the closest so far (distance ${Math.abs(nums[0])}).`,
    cells: cells(0), pointers: ptrs(0), vars: vars(0),
    logic: 'Distance to zero is the absolute value. We keep one champion and challenge it with every other number.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  for (let i = 1; i < nums.length; i++) {
    const d = Math.abs(nums[i]);
    const bd = Math.abs(nums[bestIdx]);
    const closer = d < bd;
    const tie = d === bd && nums[i] > nums[bestIdx];
    const take = closer || tie;
    steps.push({
      title: `Challenge with ${nums[i]}`,
      desc: `|${nums[i]}| = ${d} vs |${nums[bestIdx]}| = ${bd}: ${closer ? 'closer to zero' : d === bd ? (tie ? 'same distance, but the positive value wins ties' : 'same distance, and the current best is not smaller') : 'farther away'}.`,
      cells: cells(i), pointers: ptrs(i), vars: vars(i),
      logic: take ? (closer ? 'A smaller absolute value always replaces the champion.' : 'On a tie the problem asks for the larger number, so the positive one wins.') : 'The champion stays.',
      logicTone: take ? 'success' : 'info', javaLines: [2, 3, 4], pyLines: [2, 3], algoStep: 1,
    });
    if (take) {
      bestIdx = i;
      steps.push({
        title: `New best: ${nums[i]}`, desc: `best = ${nums[i]}.`,
        cells: cells(i), pointers: ptrs(i), vars: vars(i),
        logic: 'The current number becomes the new closest value.', logicTone: 'success', javaLines: [5], pyLines: [4], algoStep: 2,
      });
    }
  }

  steps.push({
    title: 'Done', desc: `${nums[bestIdx]} is the closest number to zero.`,
    cells: nums.map((value, i) => ({ key: i, value, state: i === bestIdx ? ('found' as const) : ('dim' as const) })), pointers: [], vars: vars('—'),
    logic: `Answer: ${nums[bestIdx]}`, logicTone: 'success', javaLines: [7], pyLines: [5], algoStep: 3,
    result: { title: String(nums[bestIdx]), text: `Distance ${Math.abs(nums[bestIdx])} from zero` },
  });
  return steps;
}

export const findClosestNumberToZero: ProblemDef<In> = {
  slug: '2239-find-closest-number-to-zero',
  id: '2239', title: 'Find Closest Number to Zero', difficulty: 'Easy', category: 'Arrays', tag: 'basics',
  statement: 'Return the value in nums that is closest to 0. If two values are equally close (like −2 and 2), return the larger one.',
  constraints: '1 ≤ n ≤ 1000 · −10⁵ ≤ nums[i] ≤ 10⁵ (animation input is limited to 12 numbers)',
  examples: [
    { label: '[-4,-2,1,4,8]', input: { nums: [-4, -2, 1, 4, 8] }, output: '1' },
    { label: '[2,-1,1]', input: { nums: [2, -1, 1] }, output: '1' },
    { label: '[-3,3,-3]', input: { nums: [-3, 3, -3] }, output: '3' },
  ],
  inputPlaceholder: 'e.g. -4 -2 1 4 8',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Challenger', state: 'active' }, { label: 'Closest so far', state: 'found' }, { label: 'Checked', state: 'dim' }],
  varLabels: ['i', 'best', '|best|'],
  approach: {
    title: 'Keep a champion, break ties upward',
    text: 'Scan once. A number replaces the champion if its absolute value is smaller, or if it is equally far from zero but larger (i.e. the positive twin).',
  },
  java: [
    'public int findClosestNumber(int[] nums) {',
    '    int best = nums[0];',
    '    for (int i = 1; i < nums.length; i++) {',
    '        int x = nums[i];',
    '        if (Math.abs(x) < Math.abs(best) || (Math.abs(x) == Math.abs(best) && x > best))',
    '            best = x;',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def find_closest_number(nums):',
    '    best = nums[0]',
    '    for x in nums[1:]:',
    '        if abs(x) < abs(best) or (abs(x) == abs(best) and x > best):',
    '            best = x',
    '    return best',
  ],
  algorithm: [
    'Start with best = nums[0]',
    'For each other number x, compare |x| with |best|',
    'Replace best if x is closer, or equally close but larger',
    'Return best',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The ordering "smaller |x| first, then larger x" is a total order on the numbers, and the loop keeps the minimum under that order seen so far. After the last element it is the minimum overall, which is exactly what the problem asks for.',
};
