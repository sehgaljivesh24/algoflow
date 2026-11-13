import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (nums.length < 2 || nums.some((n) => !Number.isInteger(n))) throw new Error('Use at least two whole numbers, e.g. 1 2 3 4');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  if (nums.some((n) => Math.abs(n) > 10)) throw new Error('Keep each number between -10 and 10 so products stay readable');
  return { nums };
}

const mul = (a: number, b: number) => a * b || 0; // avoids printing -0

function build({ nums }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  const res: (number | null)[] = nums.map(() => null);
  let prefix = 1;
  let suffix = 1;

  const scene = (cur: number, setIdx: number, done: boolean[]) => {
    const top: Cell[] = nums.map((value, i) => ({ key: `n${i}`, value, state: (i === cur ? 'active' : undefined) as CellState | undefined }));
    const bottom: Cell[] = res.map((value, i) => ({
      key: `r${i}`, value: value === null ? '·' : value,
      state: (i === setIdx ? 'found' : done[i] ? 'sorted' : 'dim') as CellState,
    }));
    return { kind: 'grid' as const, rows: [top, bottom], rowHeads: ['nums', 'answer'], colHeads: nums.map((_, i) => String(i)) };
  };
  const finished = (from: number, to: number) => nums.map((_, i) => i >= from && i <= to);
  const vars = (i: number | string, phase: string) => ({ i, prefix, suffix, phase });
  const aux = (hi?: 'left' | 'right') => [{
    title: 'Running products', kind: 'list' as const,
    items: hi === 'left' ? [`prefix = ${prefix} (product of nums[0..i])`]
      : hi === 'right' ? [`suffix = ${suffix} (product of nums[i..n−1])`]
        : [`prefix = ${prefix}`, `suffix = ${suffix}`],
    highlight: hi ? 0 : undefined,
  }];

  steps.push({
    title: 'Start', tag: 'SETUP —', desc: 'answer[i] must be the product of every number except nums[i], with no division. prefix = 1 and suffix = 1.',
    scene: scene(-1, -1, finished(1, 0)), aux: aux(), vars: vars('—', 'setup'),
    logic: 'Product except self = (product of everything to the left) × (product of everything to the right). Two sweeps can supply each half.', logicTone: 'info',
    javaLines: [1, 2, 3], pyLines: [1, 2, 3], algoStep: 0, note: 'res = new int[n], prefix = 1',
  });

  for (let i = 0; i < n; i++) {
    res[i] = prefix;
    const used = prefix;
    prefix = mul(prefix, nums[i]);
    steps.push({
      title: `Left sweep: answer[${i}] = ${used}`, tag: 'LEFT →',
      desc: `answer[${i}] = prefix = ${used} (everything left of ${i}); then prefix = ${used} × nums[${i}] (${nums[i]}) = ${prefix}.`,
      scene: scene(i, i, finished(0, i)), aux: aux('left'), vars: vars(i, 'left'),
      logic: 'Store the prefix first and update it afterwards, so index i never multiplies itself.', logicTone: 'info',
      javaLines: [5, 6], pyLines: [5, 6], algoStep: 1, note: `res[${i}] = ${used}; prefix = ${used} × ${nums[i]} = ${prefix}`,
    });
  }

  for (let i = n - 1; i >= 0; i--) {
    const before = res[i] as number;
    res[i] = mul(before, suffix);
    const used = suffix;
    suffix = mul(suffix, nums[i]);
    steps.push({
      title: `Right sweep: answer[${i}] = ${before} × ${used}`, tag: '← RIGHT',
      desc: `answer[${i}] = left ${before} × right ${used} = ${res[i]}; then suffix = ${used} × nums[${i}] (${nums[i]}) = ${suffix}.`,
      scene: scene(i, i, finished(0, n - 1)), aux: aux('right'), vars: vars(i, 'right'),
      logic: 'Walking right to left, suffix holds the product of everything to the right of i.', logicTone: 'info',
      javaLines: [10, 11], pyLines: [9, 10], algoStep: 2, note: `res[${i}] = ${before} × ${used} = ${res[i]}; suffix = ${suffix}`,
    });
  }

  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `answer = [${res.join(', ')}]: each entry is its left product times its right product.`,
    scene: scene(-1, -1, finished(0, n - 1)), aux: aux(), vars: vars('—', 'done'),
    logic: 'Each entry combined its left and right products, using two passes and no division — so zeros are handled naturally.', logicTone: 'success',
    javaLines: [13], pyLines: [11], algoStep: 3, note: `return [${res.join(', ')}]`,
    result: { title: `[${res.join(',')}]`, text: 'Product of all other elements, per index' },
  });
  return steps;
}

export const productOfArrayExceptSelf: ProblemDef<In> = {
  slug: '238-product-of-array-except-self',
  id: '238', title: 'Product of Array Except Self', difficulty: 'Medium', category: 'Arrays', tag: 'prefix product',
  statement: 'Return an array where each entry is the product of all the input numbers except the one at that position. Do it in O(n) time and without the division operator.',
  constraints: '2 ≤ n ≤ 10⁵; products fit in 32 bits (animation input: 2–12 numbers, each between -10 and 10)',
  examples: [
    { label: '[1,2,3,4]', input: { nums: [1, 2, 3, 4] }, output: '[24,12,8,6]' },
    { label: '[-1,1,0,-3,3]', input: { nums: [-1, 1, 0, -3, 3] }, output: '[0,0,9,0,0]' },
    { label: '[2,3,5]', input: { nums: [2, 3, 5] }, output: '[15,10,6]' },
  ],
  inputPlaceholder: 'e.g. 1 2 3 4',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current number', state: 'active' }, { label: 'Entry just written', state: 'found' }, { label: 'Entry already set', state: 'sorted' }, { label: 'Not filled yet', state: 'dim' }],
  varLabels: ['i', 'prefix', 'suffix', 'phase'],
  emphasis: ['product', 'except', 'division operator'],
  phases: [
    { icon: '🧱', label: 'Setup: prefix = suffix = 1', tone: 'blue' },
    { icon: '➡️', label: 'Left sweep: store prefix', tone: 'cyan' },
    { icon: '⬅️', label: 'Right sweep: × suffix', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Left products, then right products',
    text: 'First sweep left to right, writing into answer[i] the product of everything before i. Then sweep right to left, multiplying each entry by the product of everything after i.',
  },
  java: [
    'public int[] productExceptSelf(int[] nums) {',
    '    int n = nums.length;',
    '    int[] res = new int[n];',
    '    int prefix = 1;',
    '    for (int i = 0; i < n; i++) {',
    '        res[i] = prefix;',
    '        prefix *= nums[i];',
    '    }',
    '    int suffix = 1;',
    '    for (int i = n - 1; i >= 0; i--) {',
    '        res[i] *= suffix;',
    '        suffix *= nums[i];',
    '    }',
    '    return res;',
    '}',
  ],
  python: [
    'def product_except_self(nums):',
    '    n = len(nums)',
    '    res = [1] * n',
    '    prefix = 1',
    '    for i in range(n):',
    '        res[i] = prefix',
    '        prefix *= nums[i]',
    '    suffix = 1',
    '    for i in range(n - 1, -1, -1):',
    '        res[i] *= suffix',
    '        suffix *= nums[i]',
    '    return res',
  ],
  algorithm: [
    'Create the answer array and a running product (prefix) starting at 1',
    'Left to right: set answer[i] = prefix, then multiply prefix by nums[i]',
    'Right to left: multiply answer[i] by suffix, then multiply suffix by nums[i]',
    'Return the answer array',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1) extra (output excluded)' }],
  why: 'The product of all elements except index i splits cleanly into the product to its left and the product to its right. The first sweep leaves the left half in answer[i]; the second sweep multiplies in the right half. No division is needed, so a zero in the input causes no trouble.',
};
