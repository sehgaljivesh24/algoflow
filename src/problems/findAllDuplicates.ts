import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { fmtArr, ptr } from './pack1Kit.ts';
import { parseInts } from './stepKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = parseInts(raw, { what: 'the numbers', example: '4 3 2 7 8 2 3 1', minLen: 1, maxLen: 12, lo: 1, hi: 12 });
  const n = nums.length;
  if (nums.some((v) => v > n)) throw new Error(`Every number must be between 1 and ${n} (the array length)`);
  const cnt = new Map<number, number>();
  for (const v of nums) cnt.set(v, (cnt.get(v) ?? 0) + 1);
  if ([...cnt.values()].some((c) => c > 2)) throw new Error('Each number may appear at most twice');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const a = nums.map((v, id) => ({ id, v }));
  const steps: Step[] = [];
  const dups: number[] = [];
  const parked = new Set<number>(); // item ids of surplus copies left in the wrong slot
  let phase: 1 | 2 = 1;

  const cells = (cur: number, hot: number[] = []): Cell[] =>
    a.map(({ id, v }, p) => {
      let state: CellState | undefined;
      if (hot.includes(p)) state = phase === 1 ? 'swap' : 'found';
      else if (phase === 2 && dups.includes(v) && v !== p + 1) state = 'found';
      else if (p === cur) state = 'active';
      else if (v === p + 1) state = 'sorted';
      else if (parked.has(id)) state = 'dim';
      return { key: id, value: v, state };
    });
  const aux = () => [
    { title: 'Parked surplus copies', kind: 'list' as const, items: a.filter(({ id }) => parked.has(id)).map(({ v }) => String(v)) },
    { title: 'Duplicates found', kind: 'list' as const, items: dups.map(String) },
  ];
  const vars = (i: number | string) => ({ i, phase: phase === 1 ? 'place' : 'scan', found: dups.length });
  const add = (title: string, tag: string, desc: string, note: string, logic: string, tone: 'info' | 'warn' | 'success', cur: number, hot: number[], jl: number[], pl: number[], algo: number, alert?: string, j?: number) => {
    const pts = cur >= 0 && cur < n ? [ptr('i', 'i', cur, phase === 1 ? 'blue' : 'orange')] : [];
    if (j !== undefined && j !== cur) pts.push(ptr('j', 'j', j, 'green'));
    steps.push({ title, tag, desc, note, alert, cells: cells(cur, hot), pointers: pts, aux: aux(), vars: vars(cur >= 0 ? cur : '—'), logic, logicTone: tone, javaLines: jl, pyLines: pl, algoStep: algo });
  };

  add('Start', 'START —', `n = ${n}, array = ${fmtArr(a.map((x) => x.v))}: each value is in 1..${n} and appears once or twice. Find the values that appear twice.`,
    'i = 0, res = []',
    'Values 1..n are valid indexes (minus one), so the array can be its own hash table: send each value to slot v − 1. A value that finds its slot already taken by the same value is a duplicate, and its extra copy is left behind in the wrong slot.', 'info', -1, [], [1], [1], 0);

  let i = 0;
  while (i < n) {
    const v = a[i].v;
    const j = v - 1;
    if (a[i].v !== a[j].v) {
      const other = a[j].v;
      [a[i], a[j]] = [a[j], a[i]];
      add(`${v} belongs at index ${j}: swap nums[${i}] and nums[${j}]`, 'SWAP:', `${v} belongs at index ${v} − 1 = ${j}; swap with ${other} so ${v} lands home. Slot ${i} now holds ${a[i].v}, still unchecked`,
        `j = ${v} − 1 = ${j}; ${v} ≠ ${other} → swap`,
        'A swap always finalises one value, so the placement phase does at most n swaps.', 'warn', i, [i, j], [4], [5], 1, undefined, j);
    } else if (j === i) {
      add(`${v} is already home at index ${i}`, 'HOME:', `nums[${i}] = ${v} already sits in its own slot ${j}, so i moves from ${i} to ${i + 1}`,
        `j = ${v} − 1 = ${j} = i → i = ${i + 1}`,
        'Already in place; advance.', 'info', i, [], [5], [7], 2, undefined, j);
      i++;
    } else {
      parked.add(a[i].id);
      add(`Slot ${j} already holds ${v}: the copy at ${i} is a duplicate`, 'DUPLICATE:',
        `Slot ${j} already holds ${v}, so the second ${v} at index ${i} has no home. It stays parked and i moves to ${i + 1}`,
        `j = ${v} − 1 = ${j}; nums[${j}] == ${v} → surplus copy, i = ${i + 1}`,
        'The second copy is the one left out of place, and that is how we recognise duplicates later.', 'success', i, [], [5], [7], 2,
        `Duplicate: slot ${j} already holds ${v}, so the extra ${v} at index ${i} cannot be placed.`, j);
      i++;
    }
  }

  phase = 2;
  add('Placement done: scan for misplaced values', 'SCAN —', 'Every value with a free slot is home. A slot k holding something other than k + 1 holds a surplus copy',
    'for k = 0 .. n − 1: nums[k] ≠ k + 1 ?',
    'After placement, nums[k] ≠ k + 1 means the true value k + 1 was missing, and nums[k] is the extra copy of some duplicate.', 'info', -1, [], [7], [8], 3);
  for (let k = 0; k < n; k++) {
    if (a[k].v !== k + 1) {
      dups.push(a[k].v);
      add(`nums[${k}] = ${a[k].v} ≠ ${k + 1}: ${a[k].v} is a duplicate`, 'FOUND:', `Slot ${k} should hold ${k + 1} but holds a second copy of ${a[k].v}, so ${a[k].v} is added to the result`,
        `nums[${k}] = ${a[k].v} ≠ ${k + 1} → res = ${fmtArr(dups)}`,
        'Record it.', 'success', k, [k], [9], [8], 3, `nums[${k}] = ${a[k].v} ≠ ${k + 1}: ${a[k].v} is the duplicate.`);
    } else {
      add(`nums[${k}] = ${k + 1}: correct`, 'SCAN:', `Slot ${k} holds ${k + 1}, exactly what it should, so nothing is reported`, `nums[${k}] = ${k + 1} == ${k + 1} → skip`,
        'Nothing to report here.', 'info', k, [], [9], [8], 3);
    }
  }

  const res = [...dups].sort((x, y) => x - y);
  steps.push({
    title: 'Done', tag: '✅ Done!', note: `return ${fmtArr(res)}`,
    desc: res.length ? `Values that appear twice: ${fmtArr(res)}. Two passes over ${n} numbers, no extra array` : `No value appears twice in these ${n} numbers`, cells: cells(-1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'Two linear passes, no extra array: O(n) time, O(1) space.', logicTone: 'success', javaLines: [10], pyLines: [8], algoStep: 4,
    result: { title: fmtArr(res), text: res.length ? 'Duplicated values' : 'No duplicates' },
  });
  return steps;
}

export const findAllDuplicates: ProblemDef<In> = {
  slug: '442-find-all-duplicates-in-an-array',
  id: '442', title: 'Find All Duplicates in an Array', difficulty: 'Medium', category: 'Arrays', tag: 'cyclic sort, duplicates',
  statement: 'Given an array of n integers in the range 1..n where every value appears once or twice, return all values that appear twice. Use O(n) time and no extra space beyond the output.',
  constraints: 'n = nums.length, 1 ≤ nums[i] ≤ n, each value appears once or twice (animation input: n ≤ 12)',
  examples: [
    { label: '4 3 2 7 8 2 3 1', input: { nums: [4, 3, 2, 7, 8, 2, 3, 1] }, output: '[2,3]' },
    { label: '1 1 2', input: { nums: [1, 1, 2] }, output: '[1]' },
    { label: '1', input: { nums: [1] }, output: '[]' },
  ],
  inputPlaceholder: 'values in 1..n, each at most twice, e.g. 4 3 2 7 8 2 3 1',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Index i', state: 'active' }, { label: 'Being swapped home', state: 'swap' }, { label: 'In its home slot', state: 'sorted' }, { label: 'Surplus copy left behind', state: 'dim' }, { label: 'Reported duplicate', state: 'found' }],
  emphasis: ['appear twice', 'O(n) time', 'no extra space'],
  phases: [
    { icon: '🏁', label: 'Start: value v → slot v − 1', tone: 'blue' },
    { icon: '🔄', label: 'Place: swap v into slot v − 1', tone: 'cyan' },
    { icon: '♊', label: 'Slot taken: surplus copy, advance i', tone: 'orange' },
    { icon: '🔎', label: 'Scan: nums[k] ≠ k + 1 → duplicate', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['i', 'phase', 'found'],
  approach: {
    title: 'Cyclic placement, then read off the strays',
    text: 'Run cyclic sort: swap nums[i] into slot nums[i] − 1 unless that slot already holds the same value (then it is a surplus copy and i moves on). Afterwards, every slot k with nums[k] ≠ k + 1 contains a surplus copy, and that value is a duplicate.',
  },
  java: [
    'public List<Integer> findDuplicates(int[] nums) {',
    '    int i = 0;',
    '    while (i < nums.length) {',
    '        int j = nums[i] - 1;',
    '        if (nums[i] != nums[j]) swap(nums, i, j);',
    '        else i++;',
    '    }',
    '    List<Integer> res = new ArrayList<>();',
    '    for (int k = 0; k < nums.length; k++)',
    '        if (nums[k] != k + 1) res.add(nums[k]);',
    '    return res;',
    '}',
  ],
  python: [
    'def find_duplicates(nums):',
    '    i = 0',
    '    while i < len(nums):',
    '        j = nums[i] - 1',
    '        if nums[i] != nums[j]:',
    '            nums[i], nums[j] = nums[j], nums[i]',
    '        else:',
    '            i += 1',
    '    return [x for k, x in enumerate(nums) if x != k + 1]',
  ],
  algorithm: [
    'Treat value v as an instruction to go to index v − 1',
    'If the target slot holds a different value, swap and re-check index i',
    'If the target slot already holds the same value, this copy is surplus: advance i',
    'Scan: every k with nums[k] ≠ k + 1 holds a duplicate; collect those values',
    'Return the collected values',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1) besides the output' }],
  why: 'In the end each value that appears once is in its slot, and a value that appears twice has one copy in its slot and the other copy parked in the slot of a value that is missing. Since exactly one wrong slot exists per duplicate, the misplaced entries are precisely the duplicated values. Every swap finalises a value, so the placement is linear.',
};
