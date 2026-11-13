import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n))) throw new Error('Use whole numbers separated by spaces, e.g. 1 2 3 1');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  return { nums };
}

function build({ nums }: In): Step[] {
  const steps: Step[] = [];
  const seen: number[] = [];
  const cells = (cur: number, dup?: [number, number]): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (dup && (i === dup[0] || i === dup[1])) state = 'found';
      else if (i === cur) state = 'active';
      else if (i < cur) state = 'sorted';
      return { key: i, value, state };
    });
  const aux = (highlight?: number) => [{ title: 'seen (hash set)', kind: 'map' as const, items: seen.map(String), highlight }];

  steps.push({
    title: 'Start', desc: 'Decide whether any value appears at least twice.',
    cells: cells(-1), pointers: [], aux: aux(), vars: { i: '—', x: '—', seen: 0 },
    logic: 'Comparing every pair is O(n²). A hash set remembers what we have passed and answers "seen before?" in O(1).', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    const at = seen.indexOf(x);
    steps.push({
      title: `Check nums[${i}] = ${x}`, desc: `Is ${x} already in the set?`,
      cells: cells(i), pointers: [{ id: 'i', label: 'i', index: i, tone: 'blue' }], aux: aux(), vars: { i, x, seen: seen.length },
      logic: 'Look the value up before inserting it, otherwise every value would "find itself".', logicTone: 'info',
      javaLines: [2, 3], pyLines: [2, 3], algoStep: 1,
    });
    if (at >= 0) {
      const first = nums.indexOf(x);
      steps.push({
        title: 'Duplicate found!', desc: `${x} is already in the set (first seen at index ${first}), and it appears again at index ${i}.`,
        cells: cells(i, [first, i]), pointers: [{ id: 'i', label: 'i', index: i, tone: 'green' }], aux: aux(at), vars: { i, x, seen: seen.length },
        logic: 'One repeated value is enough, so we can stop immediately.', logicTone: 'success',
        javaLines: [4], pyLines: [4], algoStep: 2,
        result: { title: 'true', text: `${x} appears at indexes ${first} and ${i}` },
      });
      return steps;
    }
    seen.push(x);
    steps.push({
      title: `${x} is new`, desc: `Add ${x} to the set.`,
      cells: cells(i), pointers: [{ id: 'i', label: 'i', index: i, tone: 'blue' }], aux: aux(seen.length - 1), vars: { i, x, seen: seen.length },
      logic: 'Not seen before, so remember it for later elements.', logicTone: 'warn',
      javaLines: [5], pyLines: [5], algoStep: 3,
    });
  }

  steps.push({
    title: 'All distinct', desc: 'We reached the end without meeting a repeated value.',
    cells: cells(nums.length), pointers: [], aux: aux(), vars: { i: '—', x: '—', seen: seen.length },
    logic: 'Every value was new when we met it, so all values are distinct.', logicTone: 'warn',
    javaLines: [7], pyLines: [6], algoStep: 3,
    result: { title: 'false', text: 'All elements are distinct' },
  });
  return steps;
}

export const containsDuplicate: ProblemDef<In> = {
  slug: '217-contains-duplicate',
  id: '217', title: 'Contains Duplicate', difficulty: 'Easy', category: 'Arrays', tag: 'hash set',
  statement: 'Given an integer array, return true if some value appears at least twice, and false if every element is distinct.',
  constraints: '1 ≤ n ≤ 10⁵ (animation input is limited to 12 numbers)',
  examples: [
    { label: '[1,2,3,1]', input: { nums: [1, 2, 3, 1] }, output: 'true' },
    { label: '[1,2,3,4]', input: { nums: [1, 2, 3, 4] }, output: 'false' },
    { label: '[3,1,4,1,5,9,2,6]', input: { nums: [3, 1, 4, 1, 5, 9, 2, 6] }, output: 'true' },
  ],
  inputPlaceholder: 'e.g. 1 2 3 1',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current', state: 'active' }, { label: 'Already seen', state: 'sorted' }, { label: 'Duplicate pair', state: 'found' }],
  varLabels: ['i', 'x', 'seen'],
  approach: {
    title: 'Remember what you have met',
    text: 'Scan left to right with a hash set. If the current value is already in the set it is a repeat; otherwise add it and move on.',
  },
  java: [
    'public boolean containsDuplicate(int[] nums) {',
    '    Set<Integer> seen = new HashSet<>();',
    '    for (int x : nums) {',
    '        if (seen.contains(x))',
    '            return true;',
    '        seen.add(x);',
    '    }',
    '    return false;',
    '}',
  ],
  python: [
    'def contains_duplicate(nums):',
    '    seen = set()',
    '    for x in nums:',
    '        if x in seen:',
    '            return True',
    '        seen.add(x)',
    '    return False',
  ],
  algorithm: [
    'Create an empty hash set',
    'For each value x, check whether x is already in the set',
    'If it is, return true immediately',
    'Otherwise add x and continue; return false after the last element',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'If a repeat exists, the second occurrence is looked up after the first was inserted, so the set always catches it. If no repeat exists, no lookup ever succeeds. Sorting would give O(n log n) with O(1) extra space; the set trades memory for speed.',
};
