import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { nums1: number[]; nums2: number[] }

function sortedAsc(a: number[]) {
  return a.every((v, i) => i === 0 || a[i - 1] <= v);
}

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: nums1 ; nums2 — e.g. 1 2 3 ; 2 5 6');
  const nums1 = left.split(/[\s,]+/).filter(Boolean).map(Number);
  const nums2 = right.split(/[\s,]+/).filter(Boolean).map(Number);
  if (nums1.length + nums2.length === 0) throw new Error('Enter at least one number');
  if ([...nums1, ...nums2].some((n) => !Number.isInteger(n))) throw new Error('Use whole numbers only');
  if (!sortedAsc(nums1) || !sortedAsc(nums2)) throw new Error('Both arrays must be sorted in non-decreasing order');
  if (nums1.length + nums2.length > 10) throw new Error('Use 10 numbers in total or fewer');
  return { nums1, nums2 };
}

function build({ nums1: real, nums2 }: In): Step[] {
  const m = real.length;
  const n = nums2.length;
  const a = [...real, ...Array(n).fill(0)]; // nums1 with m + n slots
  const steps: Step[] = [];
  let i = m - 1;
  let j = n - 1;
  let k = m + n - 1;

  const cells = (cmpI: number, slot: number): Cell[] =>
    a.map((value, idx) => {
      let state: CellState | undefined;
      if (idx > k && idx !== slot) state = 'sorted';
      else if (idx === slot) state = 'active';
      else if (idx === cmpI) state = 'compare';
      else if (idx > i) state = 'dim';
      return { key: idx, value: idx > i && idx <= k ? '·' : value, state };
    });
  const ptrs = (withI = true) => {
    const p: { id: string; label: string; index: number; tone: 'blue' | 'orange' }[] = [];
    if (withI && i >= 0) p.push({ id: 'i', label: 'i', index: i, tone: 'blue' });
    if (k >= 0) p.push({ id: 'k', label: 'k', index: k, tone: 'orange' });
    return p;
  };
  const aux = () => [{ title: 'nums2 (read from the back)', kind: 'list' as const, items: nums2.map(String), highlight: j >= 0 ? j : undefined }];
  const vars = () => ({ i, j, k });

  steps.push({
    title: 'Start', tag: 'SETUP —',
    desc: `nums1 has ${m} real value${m === 1 ? '' : 's'} and ${n} empty slot${n === 1 ? '' : 's'} at the back. i = ${i}, j = ${j}, k = ${k}: fill from the back so nothing is overwritten.`,
    cells: a.map((value, idx) => ({ key: idx, value: idx >= m ? '·' : value, state: idx >= m ? ('dim' as const) : undefined })), pointers: ptrs(), aux: aux(), vars: vars(),
    logic: 'The largest values belong at the end. Writing there is safe because those slots are empty, whereas writing at the front would clobber unread numbers.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, note: `i = ${i}, j = ${j}, k = ${k}`,
  });

  while (j >= 0) {
    const useA = i >= 0 && a[i] > nums2[j];
    const picked = useA ? a[i] : nums2[j];
    steps.push({
      title: i < 0 ? 'nums1 is used up' : `Compare nums1[${i}] = ${a[i]} with nums2[${j}] = ${nums2[j]}`, tag: 'COMPARE:',
      desc: i < 0
        ? `nums1 has no values left (i = ${i}), so nums2[${j}] = ${nums2[j]} goes to slot ${k}.`
        : `${a[i]} ${useA ? '>' : '≤'} ${nums2[j]}, so ${picked} is the larger tail and goes to slot ${k}.`,
      cells: cells(i, k), pointers: ptrs(), aux: aux(), vars: vars(),
      logic: 'Whichever tail value is larger must be the largest of everything still unplaced.', logicTone: 'info', javaLines: [2, 3], pyLines: [2, 3], algoStep: 1,
      note: i < 0 ? `i < 0 → take nums2[${j}] = ${nums2[j]}` : `nums1[${i}] = ${a[i]} ${useA ? '>' : '≤'} nums2[${j}] = ${nums2[j]}`,
    });
    const slot = k;
    const from = useA ? `nums1[${i}]` : `nums2[${j}]`;
    if (useA) {
      a[k--] = a[i--];
    } else {
      a[k--] = nums2[j--];
    }
    steps.push({
      title: `Place ${picked} in slot ${slot}`, tag: 'PLACE —',
      desc: `nums1[${slot}] = ${from} = ${picked}; slot ${slot} is final. ${useA ? `i → ${i}` : `j → ${j}`}, k → ${k}.`,
      cells: cells(-1, -1).map((c, idx) => (idx === slot ? { ...c, state: 'found' as const } : c)), pointers: ptrs(), aux: aux(), vars: vars(),
      logic: useA ? 'Took from nums1: it is shifted right into its final spot.' : 'Took from nums2: copied into its final spot.', logicTone: 'success',
      javaLines: useA ? [4] : [5, 6], pyLines: useA ? [4, 5, 9] : [7, 8, 9], algoStep: 2,
      note: `nums1[${slot}] = ${picked}; ${useA ? 'i' : 'j'}-- and k-- → k = ${k}`,
    });
  }

  steps.push({
    title: 'Done', tag: '✅ Done!',
    desc: j < 0 && i >= 0
      ? `nums2 is exhausted; the remaining ${i + 1} value${i === 0 ? '' : 's'} of nums1 already sit in place. Result [${a.join(', ')}].`
      : `Both arrays are merged into [${a.join(', ')}].`,
    cells: a.map((value, idx) => ({ key: idx, value, state: 'found' as const })), pointers: [], aux: aux(), vars: vars(),
    logic: `Result: [${a.join(', ')}]`, logicTone: 'success', javaLines: [7, 8], pyLines: [9], algoStep: 3,
    note: `j = ${j} < 0, loop ends`,
    result: { title: `[${a.join(', ')}]`, text: 'nums1 now holds the merged sorted values' },
  });
  return steps;
}

export const mergeSortedArray: ProblemDef<In> = {
  slug: '88-merge-sorted-array',
  id: '88', title: 'Merge Sorted Array', difficulty: 'Easy', category: 'Arrays', tag: 'two pointers',
  statement: 'nums1 holds m sorted values followed by n empty slots; nums2 holds n sorted values. Merge nums2 into nums1 in place so that nums1 ends up sorted. (Enter only the real values of nums1.)',
  constraints: 'nums1.length = m + n · both arrays sorted non-decreasing · 0 ≤ m, n ≤ 200 (animation input is limited to 10 numbers in total)',
  examples: [
    { label: '[1,2,3] + [2,5,6]', input: { nums1: [1, 2, 3], nums2: [2, 5, 6] }, output: '[1,2,2,3,5,6]' },
    { label: '[4,5,6] + [1,2,3]', input: { nums1: [4, 5, 6], nums2: [1, 2, 3] }, output: '[1,2,3,4,5,6]' },
    { label: '[1] + []', input: { nums1: [1], nums2: [] }, output: '[1]' },
    { label: '[] + [1]', input: { nums1: [], nums2: [1] }, output: '[1]' },
  ],
  inputPlaceholder: 'nums1 ; nums2   e.g. 1 2 3 ; 2 5 6',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Slot being filled', state: 'active' }, { label: 'Candidate from nums1', state: 'compare' }, { label: 'Final slot', state: 'sorted' }, { label: 'Free slot', state: 'dim' }],
  varLabels: ['i', 'j', 'k'],
  emphasis: ['in place', 'sorted', 'empty slots'],
  phases: [
    { icon: '🏁', label: 'Setup: i, j, k at the tails', tone: 'blue' },
    { icon: '⚖️', label: 'Compare the two tails', tone: 'cyan' },
    { icon: '📥', label: 'Place larger at k', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Merge from the back',
    text: 'Both arrays are sorted, so the biggest unplaced value is one of the two tails. Compare the tails, put the larger one in the last free slot of nums1, and step that pointer left. Filling from the back never overwrites a value we still need.',
  },
  java: [
    'public void merge(int[] nums1, int m, int[] nums2, int n) {',
    '    int i = m - 1, j = n - 1, k = m + n - 1;',
    '    while (j >= 0) {',
    '        if (i >= 0 && nums1[i] > nums2[j])',
    '            nums1[k--] = nums1[i--];',
    '        else',
    '            nums1[k--] = nums2[j--];',
    '    }',
    '}',
  ],
  python: [
    'def merge(nums1, m, nums2, n):',
    '    i, j, k = m - 1, n - 1, m + n - 1',
    '    while j >= 0:',
    '        if i >= 0 and nums1[i] > nums2[j]:',
    '            nums1[k] = nums1[i]',
    '            i -= 1',
    '        else:',
    '            nums1[k] = nums2[j]',
    '            j -= 1',
    '        k -= 1',
  ],
  algorithm: [
    'Set i, j, k to the last real value of nums1, the last of nums2, and the last slot',
    'Compare nums1[i] and nums2[j]',
    'Write the larger into slot k and move that pointer and k left',
    'Stop when nums2 is used up; nums1\'s leftovers are already in place',
  ],
  complexity: [{ label: 'Time', value: 'O(m + n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The write pointer k is always at or ahead of i (k = i + j + 1 and j ≥ 0 inside the loop), so a write never lands on an unread nums1 value. Each step places the largest remaining value in its final slot. Once nums2 is empty, what is left of nums1 is already sorted and already in its correct place.',
};
