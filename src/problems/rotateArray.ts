import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[]; k: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: numbers ; k — e.g. 1 2 3 4 5 6 7 ; 3');
  const nums = left.split(/[\s,]+/).filter(Boolean).map(Number);
  const k = Number(right.trim());
  if (!nums.length || nums.some((n) => !Number.isInteger(n))) throw new Error('Enter whole numbers, e.g. 1 2 3 4 5 6 7 ; 3');
  if (right.trim() === '' || !Number.isInteger(k) || k < 0 || k > 1000) throw new Error('k must be a whole number between 0 and 1000');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  return { nums, k };
}

function build({ nums, k: kRaw }: In): Step[] {
  const n = nums.length;
  const k = kRaw % n;
  const a = nums.map((value, id) => ({ id, value })); // id lets cells slide when swapped
  const steps: Step[] = [];

  const cells = (lo: number, hi: number, swapPair: number[] = []): Cell[] =>
    a.map((c, p) => {
      let state: CellState | undefined;
      if (swapPair.includes(p)) state = 'swap';
      else if (p >= lo && p <= hi) state = 'active';
      return { key: c.id, value: c.value, state };
    });
  const vars = (l: number | string, r: number | string) => ({ k, l, r });
  const list = () => `[${a.map((c) => c.value).join(', ')}]`;

  steps.push({
    title: 'Start', desc: kRaw === k ? `Rotate right by k = ${k}: the last ${k} element${k === 1 ? '' : 's'} move to the front.` : `Rotate right by ${kRaw}. Rotating by n changes nothing, so only k = ${kRaw} mod ${n} = ${k} matters.`,
    cells: cells(1, 0), pointers: [], vars: vars('—', '—'),
    logic: 'Moving every element one by one would take O(n·k). Three reversals do the whole job in O(n) with no extra array.', logicTone: 'info',
    javaLines: [0, 1, 2], pyLines: [0, 1, 2], algoStep: 0,
  });

  const reverse = (lo: number, hi: number, which: number, jLine: number, pLine: number, what: string) => {
    steps.push({
      title: what, desc: `Reverse positions ${lo}..${hi} by swapping pairs from both ends.`,
      cells: cells(lo, hi), pointers: [{ id: 'l', label: 'l', index: lo, tone: 'blue' }, { id: 'r', label: 'r', index: hi, tone: 'orange' }], vars: vars(lo, hi),
      logic: ['Reversing everything puts the last k elements at the front, but in backwards order, and the first n − k at the back, also backwards.', 'The front block is in the right place but reversed; reverse it to fix its order.', 'The back block is in the right place but reversed; reverse it too.'][which],
      logicTone: 'info', javaLines: [jLine], pyLines: [pLine], algoStep: which + 1,
    });
    let l = lo;
    let r = hi;
    while (l < r) {
      const t = a[l];
      a[l] = a[r];
      a[r] = t;
      steps.push({
        title: `Swap positions ${l} and ${r}`, desc: `${a[r].value} and ${a[l].value} trade places. Array is now ${list()}.`,
        cells: cells(lo, hi, [l, r]), pointers: [{ id: 'l', label: 'l', index: l, tone: 'blue' }, { id: 'r', label: 'r', index: r, tone: 'orange' }], vars: vars(l, r),
        logic: 'Swapping the outermost pair and moving inward reverses the block in place.', logicTone: 'success',
        javaLines: [9, 10], pyLines: [8, 9], algoStep: which + 1,
      });
      l++;
      r--;
    }
  };

  if (k === 0) {
    steps.push({
      title: 'k is a multiple of n: nothing to do', desc: 'Rotating by 0 positions leaves the array unchanged.',
      cells: cells(1, 0), pointers: [], vars: vars('—', '—'),
      logic: 'Reversing and re-reversing would cancel out; we can stop early.', logicTone: 'warn', javaLines: [2], pyLines: [2], algoStep: 0,
    });
  } else {
    reverse(0, n - 1, 0, 3, 3, 'Step 1: reverse the whole array');
    reverse(0, k - 1, 1, 4, 4, `Step 2: reverse the first k = ${k}`);
    if (k < n - 1) reverse(k, n - 1, 2, 5, 5, `Step 3: reverse the remaining ${n - k}`);
    else
      steps.push({
        title: 'Step 3: the remaining block has one element', desc: 'A single element is its own reverse.',
        cells: cells(k, n - 1), pointers: [], vars: vars(k, n - 1),
        logic: 'Nothing to swap.', logicTone: 'info', javaLines: [5], pyLines: [5], algoStep: 3,
      });
  }

  steps.push({
    title: 'Done', desc: `Rotated array: ${list()}.`,
    cells: a.map((c) => ({ key: c.id, value: c.value, state: 'found' as const })), pointers: [], vars: vars('—', '—'),
    logic: `Result: ${list()}`, logicTone: 'success', javaLines: [6], pyLines: [5], algoStep: 3,
    result: { title: list().replace(/, /g, ','), text: `Rotated right by ${kRaw}` },
  });
  return steps;
}

export const rotateArray: ProblemDef<In> = {
  slug: '189-rotate-array',
  id: '189', title: 'Rotate Array', difficulty: 'Medium', category: 'Arrays', tag: 'triple reverse',
  statement: 'Rotate nums to the right by k steps, in place. Each step moves the last element to the front. Try to use O(1) extra space.',
  constraints: '1 ≤ n ≤ 10⁵ · 0 ≤ k ≤ 10⁵ (animation input is limited to 12 numbers and k ≤ 1000)',
  examples: [
    { label: '[1,2,3,4,5,6,7], k=3', input: { nums: [1, 2, 3, 4, 5, 6, 7], k: 3 }, output: '[5,6,7,1,2,3,4]' },
    { label: '[-1,-100,3,99], k=2', input: { nums: [-1, -100, 3, 99], k: 2 }, output: '[3,99,-1,-100]' },
    { label: '[1,2,3], k=4', input: { nums: [1, 2, 3], k: 4 }, output: '[3,1,2]' },
  ],
  inputPlaceholder: 'nums ; k   e.g. 1 2 3 4 5 6 7 ; 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Block being reversed', state: 'active' }, { label: 'Pair just swapped', state: 'swap' }, { label: 'Final array', state: 'found' }],
  varLabels: ['k', 'l', 'r'],
  approach: {
    title: 'Reverse, reverse, reverse',
    text: 'Reverse the whole array, then reverse the first k elements, then reverse the rest. The first reversal brings the last k elements to the front (backwards); the next two reversals put each block back in order.',
  },
  java: [
    'public void rotate(int[] nums, int k) {',
    '    int n = nums.length;',
    '    k %= n;',
    '    reverse(nums, 0, n - 1);',
    '    reverse(nums, 0, k - 1);',
    '    reverse(nums, k, n - 1);',
    '}',
    'void reverse(int[] a, int l, int r) {',
    '    while (l < r) {',
    '        int t = a[l]; a[l] = a[r]; a[r] = t;',
    '        l++; r--;',
    '    }',
    '}',
  ],
  python: [
    'def rotate(nums, k):',
    '    n = len(nums)',
    '    k %= n',
    '    reverse(nums, 0, n - 1)',
    '    reverse(nums, 0, k - 1)',
    '    reverse(nums, k, n - 1)',
    'def reverse(a, l, r):',
    '    while l < r:',
    '        a[l], a[r] = a[r], a[l]',
    '        l, r = l + 1, r - 1',
  ],
  algorithm: [
    'Reduce k to k mod n',
    'Reverse the entire array',
    'Reverse the first k elements',
    'Reverse the remaining n − k elements',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Write the array as A B where A holds the first n − k elements and B the last k. Reversing the whole thing gives Bᴿ Aᴿ. Reversing the first k elements turns Bᴿ into B and reversing the rest turns Aᴿ into A, giving B A, which is exactly the right rotation. Each element is swapped at most twice, so it is linear time with no extra memory.',
};
