import type { Aux, Cell, CellState, Pointer, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[]; l?: number; r?: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  const nums = left.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n))) throw new Error('Enter whole numbers, e.g. 3 1 4 1 5 9 ; 1 3');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  if (right === undefined || !right.trim()) return { nums };
  const q = right.split(/[\s,]+/).filter(Boolean).map(Number);
  if (q.length !== 2 || q.some((x) => !Number.isInteger(x))) throw new Error('After the semicolon give two indexes: l r, e.g. 1 3');
  const [l, r] = q;
  if (l < 0 || r >= nums.length || l > r) throw new Error(`Need 0 ≤ l ≤ r ≤ ${nums.length - 1}`);
  return { nums, l, r };
}

/**
 * 1 setup + n build steps + 2 query steps + 1 done (n = 6 gives 10 steps).
 * The picture is two rows: the input nums[] on top and the prefix array (one slot longer) below it.
 */
function build({ nums, l: ql, r: qr }: In): Step[] {
  const n = nums.length;
  const l = ql ?? Math.min(1, n - 1);
  const r = qr ?? Math.min(3, n - 1);
  const steps: Step[] = [];
  const prefix: (number | null)[] = [0, ...nums.map(() => null)];
  const fmt = (a: number[]) => `[${a.join(', ')}]`;

  type Mark = { cur?: number; prev?: number; enter?: number; window?: [number, number] };
  const numCells = (m: Mark, upTo: number): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (m.window && i >= m.window[0] && i <= m.window[1]) state = 'active';
      else if (i === m.cur) state = 'active';
      else if (i < upTo) state = 'sorted';
      return { key: `n${i}`, value, state };
    });
  const prefCells = (m: { just?: number; prev?: number; a?: number; b?: number; allDone?: boolean }): Cell[] =>
    prefix.map((v, i) => {
      let state: CellState | undefined;
      if (m.a === i) state = 'compare';
      else if (m.b === i) state = 'swap';
      else if (i === m.just) state = 'found';
      else if (i === m.prev) state = 'compare';
      else if (v !== null) state = m.allDone ? 'found' : 'sorted';
      return { key: `p${i}`, value: v === null ? '·' : v, state };
    });
  const scene = (top: Cell[], topPtrs: Pointer[], bottom: Cell[], botPtrs: Pointer[]) => ({
    kind: 'split' as const, stack: true,
    parts: [
      { kind: 'array' as const, cells: top, pointers: topPtrs },
      { kind: 'array' as const, cells: bottom, pointers: botPtrs },
    ],
  });
  const vars = (i: number | string, p: number | string, q: number | string) => ({ i, prefix: p, 'sum(l,r)': q });

  steps.push({
    title: 'Start', tag: 'SETUP —',
    desc: `prefix is one slot longer than nums (${n + 1} slots) and prefix[0] = 0: the empty prefix sums to nothing.`,
    scene: scene(numCells({}, 0), [], prefCells({ just: 0 }), []),
    vars: vars('—', 0, '—'),
    logic: 'The extra leading zero is what makes sum(l..r) = prefix[r+1] − prefix[l] work even when l = 0.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0, note: 'prefix[0] = 0',
  });

  for (let i = 0; i < n; i++) {
    const before = prefix[i] as number;
    const after = before + nums[i];
    prefix[i + 1] = after;
    steps.push({
      title: `Build prefix[${i + 1}]`, tag: 'BUILDING —',
      desc: `prefix[${i + 1}] = prefix[${i}] (${before}) + nums[${i}] (${nums[i]}) = ${after}`,
      scene: scene(
        numCells({ cur: i }, i),
        [{ id: 'i', label: 'i', index: i, tone: 'blue' }],
        prefCells({ just: i + 1, prev: i }),
        [{ id: 'w', label: `i+1`, index: i + 1, tone: 'orange' }],
      ),
      vars: vars(i, after, '—'),
      logic: i === n - 1 ? 'The last slot holds the total of the whole array.' : 'Each slot is the previous total plus one new number: one addition per index.', logicTone: 'info',
      javaLines: [3], pyLines: [3], algoStep: 1, note: `${before} + ${nums[i]} = ${after}`,
    });
  }

  const hi = prefix[r + 1] as number;
  const lo = prefix[l] as number;
  const direct = nums.slice(l, r + 1);
  steps.push({
    title: `Query sum(${l}, ${r})`, tag: 'QUERY —',
    desc: `sum(${l}, ${r}) needs only two stored totals: prefix[${r + 1}] = ${hi} and prefix[${l}] = ${lo}.`,
    scene: scene(
      numCells({ window: [l, r] }, 0),
      [{ id: 'l', label: 'L', index: l, tone: 'blue' }, { id: 'r', label: 'R', index: r, tone: 'orange' }],
      prefCells({ a: r + 1, b: l, allDone: true }),
      [{ id: 'pb', label: `L=${l}`, index: l, tone: 'blue' }, { id: 'pa', label: `R+1=${r + 1}`, index: r + 1, tone: 'orange' }],
    ),
    aux: [{ title: 'Range sum', kind: 'list', items: [`prefix[${r + 1}] = ${hi}`, `prefix[${l}] = ${lo}`] } as Aux],
    vars: vars('—', hi, '?'),
    logic: 'Everything up to r, minus everything before l, leaves exactly nums[l..r].', logicTone: 'info',
    javaLines: [9, 10], pyLines: [6, 7], algoStep: 2, note: `prefix[${r + 1}] = ${hi}, prefix[${l}] = ${lo}`,
  });
  const total = hi - lo;
  steps.push({
    title: `sum(${l}, ${r}) = ${total}`, tag: 'QUERY —',
    desc: `prefix[${r + 1}] − prefix[${l}] = ${hi} − ${lo} = ${total}, the same as ${direct.join(' + ')} added by hand.`,
    scene: scene(
      numCells({ window: [l, r] }, 0).map((c, k) => (k >= l && k <= r ? { ...c, state: 'found' as const } : c)),
      [{ id: 'l', label: 'L', index: l, tone: 'blue' }, { id: 'r', label: 'R', index: r, tone: 'orange' }],
      prefCells({ a: r + 1, b: l, allDone: true }),
      [{ id: 'pb', label: `L=${l}`, index: l, tone: 'blue' }, { id: 'pa', label: `R+1=${r + 1}`, index: r + 1, tone: 'orange' }],
    ),
    aux: [{ title: 'Range sum', kind: 'list', items: [`${hi} − ${lo} = ${total}`, `check: ${direct.join(' + ')} = ${direct.reduce((a, b) => a + b, 0)}`] } as Aux],
    vars: vars('—', hi, total),
    logic: 'Two lookups and one subtraction: O(1) per query, no matter how long the range is.', logicTone: 'success',
    javaLines: [10], pyLines: [7], algoStep: 2, note: `${hi} − ${lo} = ${total}`,
  });

  const run = prefix.slice(1) as number[];
  steps.push({
    title: 'Done', tag: '✅ Done!',
    desc: `running sums = ${fmt(run)}; the prefix array also answers sum(${l}, ${r}) = ${total} in O(1).`,
    scene: scene(
      nums.map((value, i) => ({ key: `n${i}`, value, state: 'sorted' as CellState })),
      [],
      prefCells({ allDone: true }),
      [],
    ),
    vars: vars('—', run[n - 1], total),
    logic: `LC 1480 returns prefix[1..n]; the same array answers every later range query.`, logicTone: 'success',
    javaLines: [5], pyLines: [5], algoStep: 3, note: `prefix[1..${n}] = ${fmt(run)}`,
    result: { title: `[${run.join(', ')}]`, text: `Running (prefix) sums; sum(${l}, ${r}) = ${total}` },
  });
  return steps;
}

export const runningSum: ProblemDef<In> = {
  slug: '1480-running-sum-of-1d-array',
  id: '1480', title: 'Running Sum of 1D Array', difficulty: 'Easy', category: 'Arrays', tag: 'prefix sum',
  statement: 'Return an array where entry i is the sum of nums[0] through nums[i]: a prefix-sum array. The animation then reuses it to answer a range query, sum(l, r) = prefix[r + 1] − prefix[l], with two lookups.',
  emphasis: ['prefix-sum', 'running sum', 'range query', 'sum(l, r)'],
  constraints: '1 ≤ n ≤ 1000 · −10⁶ ≤ nums[i] ≤ 10⁶ (animation input is limited to 12 numbers)',
  examples: [
    { label: '[3,1,4,1,5,9], sum(1,3)', input: { nums: [3, 1, 4, 1, 5, 9], l: 1, r: 3 }, output: '[3,4,8,9,14,23]', answer: '[3,4,8,9,14,23] and sum(1, 3) = 1 + 4 + 1 = 6' },
    { label: '[1,2,3,4]', input: { nums: [1, 2, 3, 4] }, output: '[1,3,6,10]' },
    { label: '[1,1,1,1,1]', input: { nums: [1, 1, 1, 1, 1] }, output: '[1,2,3,4,5]' },
    { label: '[3,1,2,10,1]', input: { nums: [3, 1, 2, 10, 1] }, output: '[3,4,6,16,17]' },
  ],
  inputPlaceholder: 'e.g. 3 1 4 1 5 9 ; 1 3  (numbers ; l r, the query is optional)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'nums[] on top, prefix[] below',
  legend: [
    { label: 'nums[i] being added / range', state: 'active' },
    { label: 'prefix[r+1] / previous total', state: 'compare' },
    { label: 'prefix[l] (subtracted)', state: 'swap' },
    { label: 'Stored total', state: 'sorted' },
    { label: 'Just stored / answer', state: 'found' },
  ],
  varLabels: ['i', 'prefix', 'sum(l,r)'],
  phases: [
    { icon: '0️⃣', label: 'Setup: prefix[0] = 0', tone: 'blue' },
    { icon: '🔨', label: 'Build: prefix[i+1] = prefix[i] + nums[i]', tone: 'cyan' },
    { icon: '🔎', label: 'Query: prefix[r+1] − prefix[l]', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Each total builds on the last',
    text: 'prefix[i + 1] = prefix[i] + nums[i]. One addition per index builds the whole table, and any range sum afterwards is one subtraction of two stored totals.',
  },
  java: [
    'public int[] runningSum(int[] nums) {',
    '    int[] prefix = new int[nums.length + 1];   // prefix[0] = 0',
    '    for (int i = 0; i < nums.length; i++) {',
    '        prefix[i + 1] = prefix[i] + nums[i];',
    '    }',
    '    return Arrays.copyOfRange(prefix, 1, prefix.length);',
    '}',
    '',
    '// afterwards every range sum costs O(1)',
    'static int rangeSum(int[] prefix, int l, int r) {',
    '    return prefix[r + 1] - prefix[l];',
    '}',
  ],
  python: [
    'def running_sum(nums):',
    '    prefix = [0] * (len(nums) + 1)   # prefix[0] = 0',
    '    for i, x in enumerate(nums):',
    '        prefix[i + 1] = prefix[i] + x',
    '    return prefix[1:]',
    '',
    'def range_sum(prefix, l, r):',
    '    return prefix[r + 1] - prefix[l]',
  ],
  algorithm: [
    'Create prefix with one extra slot and set prefix[0] = 0',
    'For each i, store prefix[i + 1] = prefix[i] + nums[i]',
    'To answer sum(l, r), subtract prefix[l] from prefix[r + 1]',
    'Return the running sums prefix[1..n]',
  ],
  complexity: [{ label: 'Time', value: 'O(n) build, O(1) per query' }, { label: 'Space', value: 'O(n)' }],
  why: 'Induction: prefix[0] = 0 is the empty sum. If prefix[i] = nums[0] + … + nums[i − 1], then adding nums[i] gives the next total. A range then falls out by subtraction: prefix[r + 1] holds everything up to r, prefix[l] everything before l, and the difference is exactly nums[l..r].',
};
