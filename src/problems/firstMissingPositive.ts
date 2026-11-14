import type { Cell, CellState, Pointer, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n))) throw new Error('Use whole numbers (negatives allowed), e.g. 3 4 -1 1');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  // each element keeps its original index as a stable key so swaps slide
  const arr = nums.map((v, id) => ({ id, v }));
  const cells = (cur: number, a?: number, b?: number, ans?: number, scanned = false): Cell[] =>
    arr.map(({ id, v }, i) => {
      let state: CellState | undefined;
      if (ans === i) state = 'found';
      else if (i === a || i === b) state = 'swap';
      else if (i === cur) state = 'active';
      else if (v === i + 1) state = 'sorted';
      else if (scanned && i < cur) state = 'sorted';
      else if (v < 1 || v > n) state = 'dim';
      return { key: id, value: v, state };
    });
  const ptr = (i: number, tone: 'blue' | 'orange' = 'blue', j?: number) => {
    const pts: Pointer[] = [{ id: 'i', label: 'i', index: i, tone }];
    if (j !== undefined && j !== i) pts.push({ id: 'j', label: 'j', index: j, tone: 'green' });
    return pts;
  };
  const aux = () => [
    { title: 'Placed (value v at slot v − 1)', kind: 'list' as const, items: arr.filter(({ v }, i) => v === i + 1).map(({ v }) => String(v)) },
    { title: 'Ignored (outside 1..n)', kind: 'list' as const, items: arr.filter(({ v }) => v < 1 || v > n).map(({ v }) => String(v)) },
  ];
  const vars = (i: number | string, ans: number | string = '—') => ({ i, n, answer: ans });

  steps.push({
    title: 'Start', tag: 'START —', desc: `n = ${n}, so the answer lies in 1..${n + 1}. Value v belongs at index v − 1; values outside 1..${n} are ignored.`,
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'The answer can only be 1..n+1, so the array itself can act as a table: value v belongs at index v − 1. Values outside 1..n are irrelevant (dimmed).', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0, note: `n = ${n} → answer in 1..${n + 1}`,
  });

  for (let i = 0; i < n; i++) {
    while (true) {
      const x = arr[i].v;
      if (x < 1 || x > n) {
        steps.push({
          title: `nums[${i}] = ${x} is out of range`, tag: 'SKIP:', desc: `nums[${i}] = ${x} is not in 1..${n}, so it has no home slot. Leave it and move on to i = ${i + 1}`,
          cells: cells(i), pointers: ptr(i), aux: aux(), vars: vars(i),
          logic: 'Only values 1..n can ever matter for the answer.', logicTone: 'warn', javaLines: [3], pyLines: [3], algoStep: 1,
          note: `${x} ∉ [1, ${n}] → skip`, alert: `${x} is outside 1..${n}: it has no home slot and cannot change the answer, so it is ignored.`,
        });
        break;
      }
      const j = x - 1;
      if (arr[j].v === x) {
        steps.push({
          title: j === i ? `${x} is already home` : `${x} already sits at index ${j}`, tag: j === i ? 'HOME:' : 'DUPLICATE:',
          desc: j === i ? `nums[${i}] = ${x} already sits in its own slot ${j}, so move on to i = ${i + 1}` : `Slot ${j} already holds ${x}, so the copy at index ${i} is a duplicate. Move on to i = ${i + 1}`,
          cells: cells(i), pointers: ptr(i, 'blue', j), aux: aux(), vars: vars(i),
          logic: 'A value already in its slot (or duplicated there) needs no more work. This check also prevents an infinite swap loop.', logicTone: j === i ? 'info' : 'warn',
          javaLines: [3], pyLines: [3], algoStep: 1,
          note: j === i ? `nums[${j}] == ${x} (i = j) → home` : `nums[${j}] == ${x} → duplicate, skip`,
          alert: j === i ? undefined : `Duplicate: slot ${j} already holds ${x}, so the extra ${x} at index ${i} is left alone.`,
        });
        break;
      }
      const other = arr[j].v;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      steps.push({
        title: `Swap ${x} into index ${j}`, tag: 'SWAP:', desc: `${x} belongs at index ${x} − 1 = ${j}. Swap nums[${i}] with nums[${j}] (${other}); nums[${i}] is now ${arr[i].v}`,
        cells: cells(i, i, j), pointers: ptr(i, 'blue', j), aux: aux(), vars: vars(i),
        logic: 'Each swap sends one value to its final slot for good, so there are at most n swaps overall.', logicTone: 'success',
        javaLines: [5], pyLines: [5], algoStep: 1, note: `j = ${x} − 1 = ${j}; ${x} ≠ ${other} → swap`,
      });
    }
  }

  steps.push({
    title: 'Placement done', tag: 'SCAN —', desc: `Every value in 1..${n} that exists now sits at index value − 1. Scan for the first slot that disagrees`,
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'The first index i where nums[i] ≠ i + 1 reveals that i + 1 never appeared.', logicTone: 'info',
    javaLines: [8], pyLines: [6], algoStep: 2, note: 'for i = 0 .. n − 1: nums[i] ≠ i + 1 ?',
  });

  let ans = n + 1;
  for (let i = 0; i < n; i++) {
    if (arr[i].v !== i + 1) { ans = i + 1; break; }
    steps.push({
      title: `Slot ${i} holds ${i + 1}`, tag: 'SCAN:', desc: `nums[${i}] = ${i + 1}, exactly what it should be, so ${i + 1} is present`,
      cells: cells(i, undefined, undefined, undefined, true), pointers: ptr(i, 'orange'), aux: aux(), vars: vars(i),
      logic: 'Matches, keep scanning.', logicTone: 'info', javaLines: [9], pyLines: [7], algoStep: 2, note: `nums[${i}] = ${i + 1} == ${i + 1} → present`,
    });
  }
  const at = ans - 1;
  steps.push({
    title: ans <= n ? `Slot ${at} is wrong` : 'Every slot matches', tag: '✅ Done!',
    desc: ans <= n ? `nums[${at}] = ${arr[at].v}, not ${ans}, so ${ans} is the smallest missing positive` : `1..${n} are all present, so the answer is n + 1 = ${n + 1}`,
    cells: cells(-1, undefined, undefined, ans <= n ? at : undefined), pointers: ans <= n ? ptr(at, 'orange') : [], aux: aux(), vars: vars(ans <= n ? at : '—', ans),
    note: ans <= n ? `nums[${at}] = ${arr[at].v} ≠ ${ans} → return ${ans}` : `no mismatch → return n + 1 = ${ans}`,
    logic: ans <= n ? `Return ${ans}.` : `Return n + 1 = ${ans}.`, logicTone: 'success',
    javaLines: ans <= n ? [9] : [10], pyLines: ans <= n ? [7, 8] : [9], algoStep: 3,
    result: { title: String(ans), text: `Smallest missing positive integer is ${ans}` },
  });
  return steps;
}

export const firstMissingPositive: ProblemDef<In> = {
  slug: '41-first-missing-positive',
  id: '41', title: 'First Missing Positive', difficulty: 'Hard', category: 'Arrays', tag: 'index marking',
  statement: 'Given an unsorted integer array, return the smallest positive integer that does not appear in it. The intended solution runs in linear time and uses only constant extra space.',
  constraints: '1 ≤ n ≤ 10⁵, values fit in 32 bits (animation input is limited to 12 numbers)',
  examples: [
    { label: '[1,2,0]', input: { nums: [1, 2, 0] }, output: '3' },
    { label: '[3,4,-1,1]', input: { nums: [3, 4, -1, 1] }, output: '2' },
    { label: '[7,8,9,11,12]', input: { nums: [7, 8, 9, 11, 12] }, output: '1' },
  ],
  inputPlaceholder: 'e.g. 3 4 -1 1',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current', state: 'active' }, { label: 'Being swapped', state: 'swap' }, { label: 'In its home slot', state: 'sorted' }, { label: 'Out of range', state: 'dim' }, { label: 'Missing slot', state: 'found' }],
  varLabels: ['i', 'n', 'answer'],
  emphasis: ['smallest positive integer', 'linear time', 'constant extra space'],
  phases: [
    { icon: '🏁', label: 'Start: answer in 1..n+1', tone: 'blue' },
    { icon: '🔄', label: 'Place: swap v into slot v − 1', tone: 'cyan' },
    { icon: '🔎', label: 'Scan: first nums[i] ≠ i + 1', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Use the array as its own hash table',
    text: 'The answer is at most n + 1, so put every value v in 1..n at index v − 1 by swapping. Afterwards the first index whose value is not index + 1 gives the answer.',
  },
  java: [
    'public int firstMissingPositive(int[] nums) {',
    '    int n = nums.length;',
    '    for (int i = 0; i < n; i++) {',
    '        while (nums[i] > 0 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) {',
    '            int j = nums[i] - 1;',
    '            int t = nums[i]; nums[i] = nums[j]; nums[j] = t;',
    '        }',
    '    }',
    '    for (int i = 0; i < n; i++)',
    '        if (nums[i] != i + 1) return i + 1;',
    '    return n + 1;',
    '}',
  ],
  python: [
    'def first_missing_positive(nums):',
    '    n = len(nums)',
    '    for i in range(n):',
    '        while 0 < nums[i] <= n and nums[nums[i] - 1] != nums[i]:',
    '            j = nums[i] - 1',
    '            nums[i], nums[j] = nums[j], nums[i]',
    '    for i in range(n):',
    '        if nums[i] != i + 1:',
    '            return i + 1',
    '    return n + 1',
  ],
  algorithm: [
    'Note the answer lies in 1..n+1, so values outside 1..n can be ignored',
    'For each index, swap nums[i] into slot nums[i] − 1 until it is home, out of range, or a duplicate',
    'Scan from the left for the first index i with nums[i] ≠ i + 1',
    'Return i + 1, or n + 1 if every slot matched',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Among n slots, at most n distinct values from 1..n can be stored, so the answer is at most n + 1. Every swap places one value permanently in its slot, bounding the total swaps by n even though a while loop sits inside a for loop. The duplicate check (nums[j] != nums[i]) is what stops endless swapping.',
};
