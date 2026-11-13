import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n))) throw new Error('Use whole numbers separated by spaces, e.g. 100 4 200 1 3 2');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  return { nums };
}

function build({ nums }: In): Step[] {
  const steps: Step[] = [];
  const set = new Set(nums);
  const firstAt = new Map<number, number>();
  nums.forEach((v, i) => { if (!firstAt.has(v)) firstAt.set(v, i); });
  const done = new Set<number>(); // values already examined by the main loop
  const counted = new Set<number>(); // values already covered by a measured run
  let best = 0;
  let bestStart: number | null = null;

  const cells = (cur: number, run: number[] = [], final = false): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (final) {
        state = bestStart !== null && value >= bestStart && value < bestStart + best ? 'found' : 'dim';
      } else if (i === cur) state = 'active';
      else if (run.includes(value)) state = 'compare';
      else if (counted.has(value)) state = 'sorted';
      return { key: i, value, state };
    });
  const aux = (hl?: number) => [{ title: 'set of numbers', kind: 'map' as const, items: [...set].map(String), highlight: hl }];
  const vars = (x: number | string, len: number | string) => ({ x, len, best });
  const ptr = (i: number) => [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }];
  const hlOf = (v: number) => [...set].indexOf(v);

  steps.push({
    title: 'Put every number in a set', tag: 'SETUP —', desc: `${nums.length} number${nums.length === 1 ? '' : 's'} go into a set (${set.size} distinct): "is v present?" now costs O(1).`,
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—', '—'),
    logic: 'Sorting would cost O(n log n). With a set we can instead walk each consecutive run exactly once, starting from its smallest value.', logicTone: 'info',
    javaLines: [1, 2, 3], pyLines: [1, 2], algoStep: 0, note: `set = {${[...set].join(', ')}}, best = 0`,
  });

  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    if (done.has(x)) {
      steps.push({
        title: `${x} was already handled`, tag: 'DUPLICATE —', desc: `nums[${i}] = ${x} repeats the value at index ${firstAt.get(x)}, which was already processed → skip`,
        cells: cells(i), pointers: ptr(i), aux: aux(hlOf(x)), vars: vars(x, '—'),
        alert: `${x} appeared before: a duplicate adds nothing to a run.`,
        logic: 'Duplicates add nothing to a run of distinct consecutive values.', logicTone: 'info', javaLines: [4], pyLines: [3], algoStep: 1,
        note: `${x} already examined`,
      });
      continue;
    }
    done.add(x);
    if (set.has(x - 1)) {
      steps.push({
        title: `${x} is not a run start`, tag: 'SKIP —', desc: `x = ${x}: ${x - 1} is in the set → ${x} is mid-run, it will be counted from its start`,
        cells: cells(i), pointers: ptr(i), aux: aux(hlOf(x - 1)), vars: vars(x, '—'),
        alert: `${x - 1} exists, so ${x} is not the start of a run. Skip it.`,
        logic: 'Only the smallest value of a run is allowed to count it. This is why the total work stays O(n).', logicTone: 'warn', javaLines: [5], pyLines: [4, 5], algoStep: 1,
        note: `set.contains(${x - 1}) = true → continue`,
      });
      continue;
    }
    let len = 1;
    const run = [x];
    steps.push({
      title: `${x} starts a run`, tag: 'START —', desc: `x = ${x}: ${x - 1} is not in the set → ${x} is the smallest value of its run, count upward`,
      cells: cells(i, run), pointers: ptr(i), aux: aux(hlOf(x)), vars: vars(x, 1),
      logic: 'No predecessor in the set means a new run begins here.', logicTone: 'success', javaLines: [5, 6], pyLines: [4, 6], algoStep: 1,
      note: `set.contains(${x - 1}) = false, len = 1`,
    });
    while (set.has(x + len)) {
      run.push(x + len);
      len++;
      steps.push({
        title: `${x + len - 1} is present`, tag: 'EXTEND —', desc: `${x + len - 1} is in the set → run ${x}..${x + len - 1}, len = ${len}`,
        cells: cells(i, run), pointers: ptr(firstAt.get(x + len - 1)!), aux: aux(hlOf(x + len - 1)), vars: vars(x, len),
        logic: 'Each extension is a single O(1) set lookup.', logicTone: 'info', javaLines: [7], pyLines: [7, 8], algoStep: 2,
        note: `set.contains(${x + len - 1}) = true → len = ${len}`,
      });
    }
    for (const v of run) counted.add(v);
    const old = best;
    if (len > best) { best = len; bestStart = x; }
    steps.push({
      title: `Run ends at ${x + len - 1}`, tag: len > old ? 'NEW BEST —' : 'RUN ENDS —',
      desc: len > old ? `${x + len} is missing → run ${x}..${x + len - 1} has length ${len} 🏆 best = ${best}` : `${x + len} is missing → run length ${len} does not beat best = ${best}`,
      cells: cells(i, run), pointers: ptr(i), aux: aux(), vars: vars(x, len),
      logic: len === best ? 'This is the longest run found so far.' : 'Not longer than the best run, so the best stays.', logicTone: len > old ? 'success' : 'info',
      javaLines: [8], pyLines: [9], algoStep: 3, note: `best = max(${old}, ${len}) = ${best}`,
    });
  }

  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `Longest consecutive run has length ${best}${bestStart !== null ? `: ${bestStart}..${bestStart + best - 1}` : ''}.`,
    cells: cells(-1, [], true), pointers: [], aux: aux(), vars: vars('—', '—'),
    logic: 'Every run was measured once, from its smallest element.', logicTone: 'success', javaLines: [10], pyLines: [10], algoStep: 4, note: `return ${best}`,
    result: { title: String(best), text: bestStart !== null ? `Run ${bestStart}..${bestStart + best - 1}` : 'No numbers' },
  });
  return steps;
}

export const longestConsecutiveSequence: ProblemDef<In> = {
  slug: '128-longest-consecutive-sequence',
  id: '128', title: 'Longest Consecutive Sequence', difficulty: 'Medium', category: 'Arrays', tag: 'hash set',
  statement: 'Given an unsorted array of integers, return the length of the longest run of consecutive values (like 3, 4, 5, 6). The elements need not be adjacent in the array. Solve it in O(n) time.',
  constraints: '0 ≤ n ≤ 10⁵ (animation input: 1–12 numbers)',
  examples: [
    { label: '[100,4,200,1,3,2]', input: { nums: [100, 4, 200, 1, 3, 2] }, output: '4' },
    { label: '[0,3,7,2,5,8,4,6,0,1]', input: { nums: [0, 3, 7, 2, 5, 8, 4, 6, 0, 1] }, output: '9' },
    { label: '[9,1,4,7,3,-1,0,5,8,-1,6]', input: { nums: [9, 1, 4, 7, 3, -1, 0, 5, 8, -1, 6] }, output: '7' },
  ],
  inputPlaceholder: 'e.g. 100 4 200 1 3 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current start', state: 'active' }, { label: 'In the current run', state: 'compare' }, { label: 'Already handled', state: 'sorted' }, { label: 'Longest run', state: 'found' }],
  varLabels: ['x', 'len', 'best'],
  emphasis: ['longest run', 'consecutive', 'O(n)'],
  phases: [
    { icon: '🗂️', label: 'Setup: fill the set', tone: 'blue' },
    { icon: '🔍', label: 'Check: is x a run start?', tone: 'cyan' },
    { icon: '📏', label: 'Extend: x+1, x+2, …', tone: 'green' },
    { icon: '🏆', label: 'Record: best = max(best, len)', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Only start counting at the beginning of a run',
    text: 'Store all numbers in a set. For each number x, if x − 1 is in the set then x is mid-run and we skip it. Otherwise x begins a run, so count x + 1, x + 2, … while they exist.',
  },
  java: [
    'public int longestConsecutive(int[] nums) {',
    '    Set<Integer> set = new HashSet<>();',
    '    for (int x : nums) set.add(x);',
    '    int best = 0;',
    '    for (int x : set) {',
    '        if (set.contains(x - 1)) continue;',
    '        int len = 1;',
    '        while (set.contains(x + len)) len++;',
    '        best = Math.max(best, len);',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def longest_consecutive(nums):',
    '    s = set(nums)',
    '    best = 0',
    '    for x in s:',
    '        if x - 1 in s:',
    '            continue',
    '        length = 1',
    '        while x + length in s:',
    '            length += 1',
    '        best = max(best, length)',
    '    return best',
  ],
  algorithm: [
    'Insert every number into a hash set',
    'For each number x, skip it if x − 1 is also in the set',
    'Otherwise x starts a run: extend while x + len is in the set',
    'When the run ends, keep the larger of best and len',
    'Return best',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'The inner while loop only runs from run starts, and every value belongs to exactly one run, so across the whole algorithm each value is stepped over at most once by the while loop and once by the for loop: O(n). Skipping non-starts is what prevents the O(n²) blow-up of re-counting the same run from every member.',
};
