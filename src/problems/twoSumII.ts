import type { Aux, Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { numbers: number[]; target: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: sorted numbers ; target — e.g. 2 7 11 15 ; 9');
  const numbers = left.split(/[\s,]+/).filter(Boolean).map(Number);
  const target = Number(right.trim());
  if (numbers.length < 2 || numbers.some((n) => !Number.isInteger(n)) || right.trim() === '' || !Number.isInteger(target)) {
    throw new Error('Use at least two whole numbers and a whole-number target, e.g. 2 7 11 15 ; 9');
  }
  if (numbers.some((v, i) => i > 0 && numbers[i - 1] > v)) throw new Error('The numbers must be sorted in non-decreasing order');
  if (numbers.length > 12) throw new Error('Use 12 numbers or fewer');
  let pairs = 0;
  for (let i = 0; i < numbers.length; i++) for (let j = i + 1; j < numbers.length; j++) if (numbers[i] + numbers[j] === target) pairs++;
  if (pairs !== 1) throw new Error(pairs === 0 ? 'No two numbers add up to the target (the problem guarantees exactly one pair)' : 'More than one pair adds up to the target (the problem guarantees exactly one)');
  return { numbers, target };
}

/** 1 setup + (compare + move) per discarded end + compare + found + done. */
function build({ numbers, target }: In): Step[] {
  const n = numbers.length;
  const steps: Step[] = [];
  let l = 0;
  let r = n - 1;

  // `gone` = the index that was just discarded (drawn orange); everything outside [l, r] stays dim
  const cells = (found = false, gone = -1): Cell[] =>
    numbers.map((value, i) => {
      let state: CellState | undefined;
      if (i === gone) state = 'swap';
      else if (i === l || i === r) state = found ? 'found' : 'active';
      else if (i < l || i > r) state = 'dim';
      return { key: i, value, state };
    });
  const ptrs = () => [{ id: 'l', label: 'L', index: l, tone: 'blue' as const }, { id: 'r', label: 'R', index: r, tone: 'orange' as const }];
  const vars = (sum: number | string) => ({ L: l, R: r, sum, target });
  /** Pointer cards (index + value) and the running sum compared with the target. */
  const cards = (sum: number | null): Aux[] => {
    const items = [
      `L · index ${l} (position ${l + 1}) · value ${numbers[l]}`,
      `R · index ${r} (position ${r + 1}) · value ${numbers[r]}`,
      sum === null ? `sum = ? vs target ${target}` : `sum = ${numbers[l]} + ${numbers[r]} = ${sum} vs target ${target}`,
    ];
    return [{ title: 'POINTER CARDS · RUNNING SUM', kind: 'list', items, bad: sum !== null && sum !== target ? [2] : undefined }];
  };

  steps.push({
    title: 'Start', tag: 'SETUP —',
    desc: `Array is sorted, target = ${target}. L starts on the smallest value (${numbers[0]}), R on the largest (${numbers[n - 1]}).`,
    cells: cells(), pointers: ptrs(), aux: cards(null), vars: vars('—'),
    logic: 'Because the array is sorted we do not need a hash map: the two ends tell us whether the sum should go up or down.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, note: `L = 0, R = ${n - 1}`,
  });

  for (;;) {
    const sum = numbers[l] + numbers[r];
    const cmp = sum === target ? '=' : sum < target ? '<' : '>';
    steps.push({
      title: `Compare ${numbers[l]} + ${numbers[r]}`, tag: 'COMPARE:',
      desc: `numbers[${l}] + numbers[${r}] = ${numbers[l]} + ${numbers[r]} = ${sum} ${cmp} ${target}${sum === target ? ' — a match!' : sum < target ? ' — too small' : ' — too big'}`,
      cells: cells(), pointers: ptrs(), aux: cards(sum), vars: vars(sum),
      logic: sum === target ? 'The sum hits the target exactly.' : sum < target ? 'The sum is below the target, so it has to grow.' : 'The sum is above the target, so it has to shrink.',
      logicTone: sum === target ? 'success' : 'info', javaLines: [2, 3], pyLines: [2, 3], algoStep: 0,
      note: `sum = ${sum} ${cmp} target ${target}`,
    });
    if (sum === target) {
      steps.push({
        title: 'Found', tag: 'FOUND —',
        desc: `${numbers[l]} + ${numbers[r]} = ${target} at indexes ${l} and ${r}; positions are 1-based, so the answer is [${l + 1}, ${r + 1}].`,
        cells: cells(true), pointers: ptrs(), aux: cards(sum), vars: vars(sum),
        logic: 'Exactly one pair exists, and neither pointer ever skipped past it.', logicTone: 'success', javaLines: [4], pyLines: [4, 5], algoStep: 3,
        note: `return [${l} + 1, ${r} + 1] = [${l + 1}, ${r + 1}]`,
      });
      steps.push({
        title: 'Done', tag: '✅ Done!',
        desc: `Answer [${l + 1}, ${r + 1}]: ${numbers[l]} + ${numbers[r]} = ${target}, found in one pass with O(1) extra memory.`,
        cells: cells(true), pointers: ptrs(), aux: cards(sum), vars: vars(sum),
        logic: `Return [${l + 1}, ${r + 1}].`, logicTone: 'success', javaLines: [4], pyLines: [4, 5], algoStep: 4,
        note: `[${l + 1}, ${r + 1}]`,
        result: { title: `[${l + 1}, ${r + 1}]`, text: `${numbers[l]} + ${numbers[r]} = ${target}` },
      });
      break;
    }
    const small = sum < target;
    const gone = small ? l : r;
    const goneV = numbers[gone];
    const partnerV = small ? numbers[r] : numbers[l];
    if (small) l++;
    else r--;
    steps.push({
      title: small ? `Move L right: drop ${goneV}` : `Move R left: drop ${goneV}`, tag: small ? 'MOVE L →' : '← MOVE R',
      desc: small
        ? `${sum} < ${target}: ${goneV} falls short even with the largest value ${partnerV}, so L moves to index ${l} (${numbers[l]}).`
        : `${sum} > ${target}: ${goneV} overshoots even with the smallest value ${partnerV}, so R moves to index ${r} (${numbers[r]}).`,
      cells: cells(false, gone), pointers: ptrs(), aux: cards(null), vars: vars(sum),
      alert: small
        ? `Sum ${sum} is too small: ${goneV} cannot reach ${target} with any number to its right, so it is discarded.`
        : `Sum ${sum} is too big: ${goneV} overshoots ${target} with any number to its left, so it is discarded.`,
      logic: small
        ? `Even paired with the largest remaining number, ${goneV} falls short, so it cannot be part of the answer. Discard it.`
        : `Even paired with the smallest remaining number, ${goneV} overshoots, so it cannot be part of the answer. Discard it.`,
      logicTone: 'warn', javaLines: small ? [5] : [6], pyLines: small ? [6, 7] : [8, 9], algoStep: small ? 1 : 2,
      note: small ? `L++ → ${l} (value ${numbers[l]})` : `R-- → ${r} (value ${numbers[r]})`,
    });
  }
  return steps;
}

export const twoSumII: ProblemDef<In> = {
  slug: '167-two-sum-ii',
  id: '167', title: 'Two Sum II', difficulty: 'Medium', category: 'Arrays', tag: 'two pointers',
  statement: 'Given a 1-indexed array of integers sorted in non-decreasing order, find two numbers that add up to target and return their 1-based indexes [index1, index2] with index1 < index2. Exactly one solution exists, and you may not use the same element twice. Use only constant extra space.',
  constraints: '2 ≤ n ≤ 3·10⁴ · numbers sorted non-decreasing · exactly one solution (animation input is limited to 12 numbers)',
  emphasis: ['sorted in non-decreasing order', 'add up to target', 'constant extra space', 'exactly one solution'],
  examples: [
    { label: '[1,4,5,6,7,8], 10', input: { numbers: [1, 4, 5, 6, 7, 8], target: 10 }, output: '[2, 4]', answer: '[2, 4] (4 + 6 = 10, 1-based positions)' },
    { label: '[2,7,11,15], 9', input: { numbers: [2, 7, 11, 15], target: 9 }, output: '[1, 2]' },
    { label: '[1,3,4,6,8,11], 10', input: { numbers: [1, 3, 4, 6, 8, 11], target: 10 }, output: '[3, 4]' },
    { label: '[1,3,4,5,7,10,11], 9', input: { numbers: [1, 3, 4, 5, 7, 10, 11], target: 9 }, output: '[3, 4]' },
  ],
  inputPlaceholder: 'sorted numbers ; target   e.g. 2 7 11 15 ; 9',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Pointers L and R', state: 'active' }, { label: 'Just discarded', state: 'swap' }, { label: 'Answer pair', state: 'found' }, { label: 'Out of range', state: 'dim' }],
  varLabels: ['L', 'R', 'sum', 'target'],
  phases: [
    { icon: '🔍', label: 'Compare sum with target', tone: 'cyan' },
    { icon: '➡️', label: 'Move L right', tone: 'blue' },
    { icon: '⬅️', label: 'Move R left', tone: 'orange' },
    { icon: '🎯', label: 'Found', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Squeeze from both ends',
    text: 'Start with the smallest and largest numbers. If their sum is too small, the smallest can never reach the target, so move l right. If it is too big, the largest can never work, so move r left. The sorted order makes every move safe.',
  },
  java: [
    'public int[] twoSum(int[] numbers, int target) {',
    '    int l = 0, r = numbers.length - 1;',
    '    while (l < r) {',
    '        int sum = numbers[l] + numbers[r];',
    '        if (sum == target) return new int[]{l + 1, r + 1};',
    '        if (sum < target) l++;',
    '        else r--;',
    '    }',
    '    return new int[]{};',
    '}',
  ],
  python: [
    'def two_sum(numbers, target):',
    '    l, r = 0, len(numbers) - 1',
    '    while l < r:',
    '        s = numbers[l] + numbers[r]',
    '        if s == target:',
    '            return [l + 1, r + 1]',
    '        if s < target:',
    '            l += 1',
    '        else:',
    '            r -= 1',
    '    return []',
  ],
  algorithm: [
    'Place l at the first index and r at the last, then compare numbers[l] + numbers[r] with the target',
    'If the sum is below the target, move l right',
    'If the sum is above the target, move r left',
    'If the sum equals the target, the pair is found',
    'Return [l + 1, r + 1]',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Claim: the answer pair always stays inside [l, r]. If sum < target, then numbers[l] + numbers[x] ≤ numbers[l] + numbers[r] < target for every x ≤ r, so numbers[l] has no partner and l can move. The symmetric argument justifies moving r. Each step shrinks the window by one, so we finish in at most n − 1 steps without extra memory.',
};
