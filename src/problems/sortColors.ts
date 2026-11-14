import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => n !== 0 && n !== 1 && n !== 2)) throw new Error('Use only 0, 1 and 2, e.g. 2 0 2 1 1 0');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const a = nums.map((value, id) => ({ id, value })); // id lets cells slide when swapped
  const steps: Step[] = [];
  let low = 0;
  let mid = 0;
  let high = n - 1;

  const cells = (swapped: number[] = []): Cell[] =>
    a.map((c, p) => {
      let state: CellState | undefined;
      if (swapped.includes(p)) state = 'swap';
      else if (p < low || p > high) state = 'sorted';
      else if (p < mid) state = 'found';
      else if (p === mid) state = 'active';
      return { key: c.id, value: c.value, state };
    });
  const ptrs = () => {
    const p: { id: string; label: string; index: number; tone: 'blue' | 'orange' | 'purple' }[] = [];
    if (low < n) p.push({ id: 'low', label: 'low', index: low, tone: 'blue' });
    if (mid < n && mid <= high) p.push({ id: 'mid', label: 'mid', index: mid, tone: 'orange' });
    if (high >= 0) p.push({ id: 'high', label: 'high', index: high, tone: 'purple' });
    return p;
  };
  const vars = () => ({ low, mid, high });

  steps.push({
    title: 'Start', tag: 'SETUP —',
    desc: `low = 0, mid = 0, high = ${n - 1}. Zones: 0s before low, 1s from low to mid−1, 2s after high; mid..high is still unknown.`,
    cells: cells(), pointers: ptrs(), vars: vars(),
    logic: 'This is the Dutch national flag idea: partition the array into three groups in one pass by keeping three pointers.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, note: `low = 0, mid = 0, high = ${n - 1}`,
  });

  while (mid <= high) {
    const v = a[mid].value;
    const at = mid;
    if (v === 0) {
      const lowV = a[low].value;
      const t = a[low];
      a[low] = a[mid];
      a[mid] = t;
      const sw = [low, mid];
      const wasLow = low;
      low++;
      mid++;
      steps.push({
        title: 'mid sees 0: send it to the front', tag: 'SEE 0 —',
        desc: `nums[${at}] = 0: swap with nums[${wasLow}] (${lowV}), so low → ${low} and mid → ${mid}. The swapped-in ${lowV} is already known, so mid moves on.`,
        cells: cells(sw), pointers: ptrs(), vars: vars(),
        logic: 'Everything between low and mid is a 1, so the element swapped into mid is a 1 and needs no further inspection.', logicTone: 'success',
        javaLines: [3, 4], pyLines: [3, 4, 5, 6], algoStep: 1,
        note: `swap(nums, ${wasLow}, ${at}) → low = ${low}, mid = ${mid}`,
      });
    } else if (v === 1) {
      mid++;
      steps.push({
        title: 'mid sees 1: leave it', tag: 'SEE 1 —',
        desc: `nums[${at}] = 1 is already in the middle zone, so only mid advances to ${mid}.`,
        cells: cells(), pointers: ptrs(), vars: vars(),
        logic: 'The 1-zone grows by one cell.', logicTone: 'info', javaLines: [5, 6], pyLines: [7, 8], algoStep: 2,
        note: `1 stays → mid = ${mid}`,
      });
    } else {
      const highV = a[high].value;
      const t = a[mid];
      a[mid] = a[high];
      a[high] = t;
      const sw = [mid, high];
      const wasHigh = high;
      high--;
      steps.push({
        title: 'mid sees 2: send it to the back', tag: 'SEE 2 —',
        desc: `nums[${at}] = 2: swap with nums[${wasHigh}] (${highV}), so high → ${high}. mid stays at ${mid}: the ${highV} that arrived is still unchecked.`,
        cells: cells(sw), pointers: ptrs(), vars: vars(),
        alert: `Do not advance mid: the value swapped in from index ${wasHigh} (${highV}) has not been inspected yet.`,
        logic: 'Only high shrinks. We must look at the swapped-in value before moving mid.', logicTone: 'warn',
        javaLines: [7, 8], pyLines: [9, 10, 11], algoStep: 3,
        note: `swap(nums, ${at}, ${wasHigh}) → high = ${high}, mid stays ${mid}`,
      });
    }
  }

  const out = a.map((c) => c.value);
  steps.push({
    title: 'Done', tag: '✅ Done!',
    desc: `mid (${mid}) passed high (${high}): every element sits in its zone, [${out.join(', ')}].`,
    cells: a.map((c) => ({ key: c.id, value: c.value, state: 'found' as const })), pointers: [], vars: vars(),
    logic: `Result: [${out.join(', ')}]`, logicTone: 'success', javaLines: [10], pyLines: [11], algoStep: 4,
    note: `mid ${mid} > high ${high}, loop ends`,
    result: { title: `[${out.join(',')}]`, text: 'Sorted: 0s, then 1s, then 2s' },
  });
  return steps;
}

export const sortColors: ProblemDef<In> = {
  slug: '75-sort-colors',
  id: '75', title: 'Sort Colors', difficulty: 'Medium', category: 'Arrays', tag: 'Dutch national flag',
  statement: 'nums contains only 0 (red), 1 (white) and 2 (blue). Sort it in place so that all 0s come first, then 1s, then 2s, without using a library sort. One pass with constant extra space is possible.',
  constraints: '1 ≤ n ≤ 300 · nums[i] ∈ {0, 1, 2} (animation input is limited to 12 numbers)',
  examples: [
    { label: '[2,0,2,1,1,0]', input: { nums: [2, 0, 2, 1, 1, 0] }, output: '[0,0,1,1,2,2]' },
    { label: '[2,0,1]', input: { nums: [2, 0, 1] }, output: '[0,1,2]' },
    { label: '[1,2,0,0,2,1,2,1]', input: { nums: [1, 2, 0, 0, 2, 1, 2, 1] }, output: '[0,0,1,1,1,2,2,2]' },
  ],
  inputPlaceholder: 'values 0, 1, 2 — e.g. 2 0 2 1 1 0',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'mid (being inspected)', state: 'active' }, { label: 'Just swapped', state: 'swap' }, { label: 'Zone of 1s', state: 'found' }, { label: 'Zone of 0s / 2s', state: 'sorted' }],
  varLabels: ['low', 'mid', 'high'],
  emphasis: ['in place', '0 (red), 1 (white) and 2 (blue)', 'constant extra space'],
  phases: [
    { icon: '🏁', label: 'Setup: three pointers', tone: 'blue' },
    { icon: '🔴', label: '0 → swap to front', tone: 'green' },
    { icon: '⚪', label: '1 → stay, mid++', tone: 'cyan' },
    { icon: '🔵', label: '2 → swap to back', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Three pointers, three zones',
    text: 'Keep low (end of the 0 zone), mid (the element under inspection) and high (start of the 2 zone). A 0 swaps to low, a 1 stays, a 2 swaps to high. Repeat until mid passes high.',
  },
  java: [
    'public void sortColors(int[] nums) {',
    '    int low = 0, mid = 0, high = nums.length - 1;',
    '    while (mid <= high) {',
    '        if (nums[mid] == 0) {',
    '            int t = nums[low]; nums[low++] = nums[mid]; nums[mid++] = t;',
    '        } else if (nums[mid] == 1) {',
    '            mid++;',
    '        } else {',
    '            int t = nums[mid]; nums[mid] = nums[high]; nums[high--] = t;',
    '        }',
    '    }',
    '}',
  ],
  python: [
    'def sort_colors(nums):',
    '    low, mid, high = 0, 0, len(nums) - 1',
    '    while mid <= high:',
    '        if nums[mid] == 0:',
    '            nums[low], nums[mid] = nums[mid], nums[low]',
    '            low += 1',
    '            mid += 1',
    '        elif nums[mid] == 1:',
    '            mid += 1',
    '        else:',
    '            nums[mid], nums[high] = nums[high], nums[mid]',
    '            high -= 1',
  ],
  algorithm: [
    'Set low = mid = 0 and high = n − 1',
    'If nums[mid] is 0: swap with low, advance low and mid',
    'If nums[mid] is 1: advance mid',
    'If nums[mid] is 2: swap with high and decrease high (do not advance mid)',
    'Stop when mid passes high: every element sits in its zone',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Invariant: indexes < low hold 0s, low..mid−1 hold 1s, and indexes > high hold 2s. Each branch keeps it true. A 0 swapped from the 1-zone boundary extends the 0s (the displaced value is a 1, or mid itself), a 1 extends the 1s, and a 2 is thrown into the 2-zone. mid is not advanced after a 2-swap because the arriving value is unknown. Every step moves mid up or high down, so there are at most n steps.',
};
