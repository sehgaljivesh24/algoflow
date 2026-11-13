import type { Aux, Cell, CellState, ProblemDef, Step } from '../engine/types';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n))) throw new Error('Enter whole numbers in sorted order, e.g. 0 0 1 1 1 2 2 3');
  for (let i = 1; i < nums.length; i++) if (nums[i] < nums[i - 1]) throw new Error('Numbers must be sorted ascending');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  return { nums };
}

function build({ nums }: In): Step[] {
  const a = [...nums];
  const n = a.length;
  const steps: Step[] = [];
  let slow = 0;

  // writeAt = the cell that was just overwritten (orange), pending = the slot slow just moved to (not yet written)
  const cells = (fast: number, opts: { cut?: number; writeAt?: number; pending?: number } = {}): Cell[] =>
    a.map((value, i) => {
      let state: CellState | undefined;
      if (opts.cut !== undefined && i >= opts.cut) state = 'dim';
      else if (i === opts.writeAt) state = 'swap';
      else if (i === opts.pending) state = 'active';
      else if (i === fast) state = 'compare';
      else if (i <= slow) state = 'sorted';
      return { key: i, value, state };
    });
  const ptrs = (fast: number | null) => [
    { id: 'slow', label: 'slow', index: slow, tone: 'green' as const },
    ...(fast !== null && fast < n ? [{ id: 'fast', label: 'fast', index: fast, tone: 'orange' as const }] : []),
  ];
  const vars = (fast: number | string) => ({ slow, fast, unique: slow + 1 });
  /** The invariant box: what is guaranteed about the prefix at this very moment. */
  const inv = (upto = slow): Aux[] => [{
    title: 'INVARIANT',
    kind: 'list',
    items: [`nums[0..${upto}] = [${a.slice(0, upto + 1).join(', ')}] — each value once, in order`, `unique so far = ${upto + 1}`],
  }];

  steps.push({
    title: 'Start', tag: 'SETUP —',
    desc: `Sorted array of ${n} number${n === 1 ? '' : 's'}: equal values sit side by side. We keep the first of every run and compact the array in place.`,
    cells: a.map((value, i) => ({ key: i, value })), pointers: [], vars: vars('—'),
    logic: 'The array is sorted, so duplicates sit next to each other: one comparison with the last kept value is enough to spot a duplicate.', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0, note: `n = ${n}, nums[0] = ${a[0]} is always kept`,
  });
  steps.push({
    title: 'slow = 0: the writer', tag: 'SLOW —',
    desc: `slow = 0 marks the last kept value (${a[0]}). Everything up to slow is already final; the next kept value goes to slow + 1.`,
    cells: cells(-1), pointers: ptrs(null), aux: inv(), vars: vars('—'),
    logic: 'slow only moves when a new value is written. It is the boundary of the cleaned prefix.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0, note: 'slow = 0',
  });
  if (n > 1) {
    steps.push({
      title: 'fast = 1: the reader', tag: 'FAST —',
      desc: `fast starts at index 1 and reads every element once, comparing it with nums[slow] = ${a[slow]}.`,
      cells: cells(1), pointers: ptrs(1), aux: inv(), vars: vars(1),
      logic: 'fast always runs ahead of or level with slow, so it never reads a cell that was already overwritten.', logicTone: 'info',
      javaLines: [2], pyLines: [2], algoStep: 0, note: 'fast = 1',
    });
  }

  for (let fast = 1; fast < n; fast++) {
    const diff = a[fast] !== a[slow];
    steps.push({
      title: `Compare nums[${fast}] with nums[${slow}]`, tag: diff ? 'FOUND NEW —' : 'DUPLICATE —',
      desc: diff
        ? `nums[${fast}] = ${a[fast]} ≠ nums[${slow}] = ${a[slow]}: a new unique value, it must be kept.`
        : `nums[${fast}] = ${a[fast]} = nums[${slow}] = ${a[slow]}: a duplicate, skip it and advance fast.`,
      cells: cells(fast), pointers: ptrs(fast), aux: inv(), vars: vars(fast),
      alert: diff ? undefined : `${a[fast]} is a duplicate of the last kept value, so it is skipped and never written.`,
      logic: diff ? 'It belongs right after the unique prefix.' : 'Nothing to do — just advance fast.', logicTone: diff ? 'success' : 'warn', javaLines: [3], pyLines: [3], algoStep: 1,
      note: `${a[fast]} ${diff ? '≠' : '='} ${a[slow]} → ${diff ? 'new value' : 'duplicate, skip'}`,
    });
    if (diff) {
      const old = a[slow + 1];
      slow++;
      steps.push({
        title: `slow advances to ${slow}`, tag: 'ADVANCE —',
        desc: `slow++ → ${slow}. Slot ${slow} (currently ${old}) is the next free place for ${a[fast]}.`,
        cells: cells(fast, { pending: slow }), pointers: ptrs(fast), aux: inv(slow - 1), vars: vars(fast),
        logic: 'The prefix is about to grow by one; the slot is overwritten in the next step.', logicTone: 'info', javaLines: [4], pyLines: [4], algoStep: 2,
        note: `slow = ${slow}`,
      });
      a[slow] = a[fast];
      steps.push({
        title: `Write ${a[slow]} at index ${slow}`, tag: 'WRITE —',
        desc: `nums[${slow}] = nums[${fast}] = ${a[slow]}${slow === fast ? ' (same cell, nothing moves)' : ''}. Unique prefix is now ${slow + 1} long.`,
        cells: cells(fast, { writeAt: slow }), pointers: ptrs(fast), aux: inv(), vars: vars(fast),
        logic: 'The unique prefix grew by one.', logicTone: 'success', javaLines: [5], pyLines: [5], algoStep: 2,
        note: `nums[${slow}] = ${a[slow]}, unique = ${slow + 1}`,
      });
    }
  }

  steps.push({
    title: 'Done', tag: '✅ Done!',
    desc: `fast reached the end: ${slow + 1} unique value${slow === 0 ? '' : 's'} [${a.slice(0, slow + 1).join(', ')}] fill the first ${slow + 1} cells; the rest are leftovers.`,
    cells: cells(n, { cut: slow + 1 }), pointers: [{ id: 'slow', label: 'slow', index: slow, tone: 'green' }], aux: inv(), vars: vars('—'),
    logic: `Return slow + 1 = ${slow + 1}. Cells after that are leftovers and don't matter.`, logicTone: 'success', javaLines: [8], pyLines: [6],
    algoStep: 3, note: `return slow + 1 = ${slow + 1}`, result: { title: String(slow + 1), text: `[${a.slice(0, slow + 1).join(', ')}]` },
  });
  return steps;
}

export const removeDuplicates: ProblemDef<In> = {
  slug: '26-remove-duplicates-from-sorted-array',
  id: '26', title: 'Remove Duplicates from Sorted Array', difficulty: 'Easy', category: 'Arrays', tag: 'two pointers',
  statement: 'Given a sorted array, remove duplicates in place so each value appears once. Return the number of unique values k; the first k cells must hold them in order.',
  constraints: '1 ≤ n ≤ 3·10⁴, sorted ascending (animation input is limited to 12 numbers)',
  emphasis: ['in place', 'once', 'first k cells'],
  examples: [
    { label: '[0,0,1,1,2,3,3]', input: { nums: [0, 0, 1, 1, 2, 3, 3] }, output: '4', answer: '4, with the first 4 cells = [0, 1, 2, 3]' },
    { label: '[0,0,1,1,1,2,2,3,3,4]', input: { nums: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4] }, output: '5' },
    { label: '[1,1,2]', input: { nums: [1, 1, 2] }, output: '2' },
    { label: '[1,2,3]', input: { nums: [1, 2, 3] }, output: '3' },
  ],
  inputPlaceholder: 'e.g. 0 0 1 1 1 2 2 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Unique prefix (done)', state: 'sorted' }, { label: 'fast reading', state: 'compare' }, { label: 'Slot / just written', state: 'swap' }, { label: 'Leftover', state: 'dim' }],
  varLabels: ['slow', 'fast', 'unique'],
  phases: [
    { icon: '🏁', label: 'Setup: slow and fast', tone: 'blue' },
    { icon: '🔍', label: 'Scan: compare fast with slow', tone: 'cyan' },
    { icon: '✍️', label: 'Write: advance slow, copy', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Slow writes, fast reads',
    text: 'fast scans every element. Whenever it finds a value different from nums[slow], advance slow and copy the value there. Everything up to slow is the cleaned array.',
  },
  java: [
    'public int removeDuplicates(int[] nums) {',
    '    int slow = 0;',
    '    for (int fast = 1; fast < nums.length; fast++) {',
    '        if (nums[fast] != nums[slow]) {',
    '            slow++;',
    '            nums[slow] = nums[fast];',
    '        }',
    '    }',
    '    return slow + 1;',
    '}',
  ],
  python: [
    'def remove_duplicates(nums):',
    '    slow = 0',
    '    for fast in range(1, len(nums)):',
    '        if nums[fast] != nums[slow]:',
    '            slow += 1',
    '            nums[slow] = nums[fast]',
    '    return slow + 1',
  ],
  algorithm: [
    'Set slow = 0 and scan with fast from 1',
    'If nums[fast] differs from nums[slow], it is new',
    'Advance slow and copy nums[fast] into nums[slow]',
    'Return slow + 1',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'In a sorted array equal values are adjacent, so comparing with the last kept value is enough to detect a duplicate. slow never passes fast, so no unread value is overwritten.',
};
