import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { isSortedAsc, parseNums, parseParts } from './ssbShared.ts';

interface In { a: number[]; b: number[] }

function parse(raw: string): In {
  const [x, y] = parseParts(raw, 2, 'first sorted array ; second sorted array — e.g. 1 3 ; 2');
  const a = parseNums(x, { minLen: 0, maxLen: 8, lo: -99, hi: 99 });
  const b = parseNums(y, { minLen: 0, maxLen: 8, lo: -99, hi: 99 });
  if (a.length + b.length === 0) throw new Error('At least one of the arrays must be non-empty');
  if (!isSortedAsc(a) || !isSortedAsc(b)) throw new Error('Both arrays must be sorted ascending');
  return { a, b };
}

const NEG = '−∞';
const POS = '+∞';

function build({ a, b }: In): Step[] {
  const swapped = a.length > b.length;
  const A = swapped ? b : a;
  const B = swapped ? a : b;
  const m = A.length;
  const n = B.length;
  const half = Math.floor((m + n + 1) / 2);
  const width = Math.max(m, n);
  const steps: Step[] = [];
  let lo = 0;
  let hi = m;
  let iter = 0;

  const grid = (i?: number, j?: number, good = false) => {
    const row = (arr: number[], cut: number | undefined, tag: string): Cell[] =>
      Array.from({ length: width }, (_, c) => {
        if (c >= arr.length) return { key: `${tag}${c}`, value: '', state: 'dim' as const };
        let state: CellState | undefined;
        if (cut !== undefined) {
          if (c < cut) state = good ? 'found' : 'active';
          if (c === cut - 1 || c === cut) state = 'compare';
        }
        return { key: `${tag}${c}`, value: arr[c], state };
      });
    return {
      kind: 'grid' as const, rows: [row(A, i, 'a'), row(B, j, 'b')],
      rowHeads: [swapped ? 'A (2nd input)' : 'A', swapped ? 'B (1st input)' : 'B'], colHeads: Array.from({ length: width }, (_, c) => String(c)),
    };
  };
  const vars = (i: number | string, j: number | string) => ({ lo, i, j, hi, half });
  const fmt = (v: number) => (v === -Infinity ? NEG : v === Infinity ? POS : String(v));

  steps.push({
    title: 'Start: partition both arrays', desc: `A = [${A.join(', ')}], B = [${B.join(', ')}]${swapped ? ' (the shorter array is called A, so the inputs were swapped)' : ''}. The median splits the ${m + n} numbers into a left half of ${half} and a right half.`,
    scene: grid(), vars: vars('—', '—'),
    logic: 'Instead of merging, search for a cut i in A and a cut j = half − i in B so that every number on the left is ≤ every number on the right. Binary search runs over the shorter array only.', logicTone: 'info',
    javaLines: [0, 1, 2, 3], pyLines: [0, 1, 2, 3, 4, 5], algoStep: 0,
  });

  while (lo <= hi) {
    iter++;
    const i = Math.floor((lo + hi) / 2);
    const j = half - i;
    const l1 = i > 0 ? A[i - 1] : -Infinity;
    const r1 = i < m ? A[i] : Infinity;
    const l2 = j > 0 ? B[j - 1] : -Infinity;
    const r2 = j < n ? B[j] : Infinity;
    steps.push({
      title: `Cut A after ${i} elements, B after ${j}`, desc: `i = ${i}, j = half − i = ${j}. Border values: L1 = ${fmt(l1)}, R1 = ${fmt(r1)}, L2 = ${fmt(l2)}, R2 = ${fmt(r2)}.`,
      scene: grid(i, j), vars: vars(i, j),
      aux: [{ title: 'Border values', kind: 'map', items: [`L1 → ${fmt(l1)}`, `R1 → ${fmt(r1)}`, `L2 → ${fmt(l2)}`, `R2 → ${fmt(r2)}`] }],
      logic: 'Blue cells are the left half. Yellow cells are the four values next to the cuts. A missing neighbour counts as −∞ or +∞.', logicTone: 'info',
      javaLines: [5, 6, 7], pyLines: [7, 8, 9, 10, 11, 12], algoStep: 1,
    });
    const ok = l1 <= r2 && l2 <= r1;
    if (ok) {
      const leftMax = Math.max(l1, l2);
      const med = (m + n) % 2 === 1 ? leftMax : (leftMax + Math.min(r1, r2)) / 2;
      steps.push({
        title: 'Valid cut', desc: `L1 = ${fmt(l1)} ≤ R2 = ${fmt(r2)} and L2 = ${fmt(l2)} ≤ R1 = ${fmt(r1)}: everything on the left is ≤ everything on the right.`,
        scene: grid(i, j, true), vars: vars(i, j),
        aux: [{ title: 'Border values', kind: 'map', items: [`L1 → ${fmt(l1)}`, `R1 → ${fmt(r1)}`, `L2 → ${fmt(l2)}`, `R2 → ${fmt(r2)}`] }],
        logic: (m + n) % 2 === 1 ? `Odd total: the median is the largest value on the left, max(L1, L2) = ${leftMax}.` : `Even total: median = (max(L1, L2) + min(R1, R2)) / 2 = (${leftMax} + ${Math.min(r1, r2)}) / 2 = ${med}.`, logicTone: 'success',
        javaLines: [8, 9, 10, 11], pyLines: [13, 14, 15, 16, 17], algoStep: 3,
        result: { title: String(med), text: `Median = ${med} (found after ${iter} cut${iter === 1 ? '' : 's'})` },
      });
      return steps;
    }
    const tooBig = l1 > r2;
    if (tooBig) hi = i - 1;
    else lo = i + 1;
    steps.push({
      title: tooBig ? 'Cut in A is too far right: hi = i − 1' : 'Cut in A is too far left: lo = i + 1',
      desc: tooBig ? `L1 = ${fmt(l1)} > R2 = ${fmt(r2)}: A contributes too many large numbers to the left half. Move the cut left.` : `L2 = ${fmt(l2)} > R1 = ${fmt(r1)}: A contributes too few numbers to the left half. Move the cut right.`,
      scene: grid(i, j), vars: vars(i, j),
      aux: [{ title: 'Border values', kind: 'map', items: [`L1 → ${fmt(l1)}`, `R1 → ${fmt(r1)}`, `L2 → ${fmt(l2)}`, `R2 → ${fmt(r2)}`], highlight: tooBig ? 0 : 2 }],
      logic: 'Binary search on i: the condition L1 ≤ R2 becomes false only when i is too big, and L2 ≤ R1 only when i is too small.', logicTone: 'warn',
      javaLines: tooBig ? [12] : [13], pyLines: tooBig ? [18, 19] : [20, 21], algoStep: 2,
    });
  }
  throw new Error('unreachable: inputs were validated as sorted');
}

export const medianOfTwoSortedArrays: ProblemDef<In> = {
  slug: '4-median-of-two-sorted-arrays', id: '4', title: 'Median of Two Sorted Arrays', difficulty: 'Hard', category: 'Binary Search', tag: 'binary search on partition',
  statement: 'Given two sorted arrays, return the median of all their elements combined, in O(log(min(m, n))) time. For an even total, the median is the average of the two middle values.',
  constraints: '0 ≤ m, n ≤ 1000 · 1 ≤ m + n (animation input: up to 8 numbers per array, values −99..99)',
  examples: [
    { label: '[1,3] and [2]', input: { a: [1, 3], b: [2] }, output: '2' },
    { label: '[1,2] and [3,4]', input: { a: [1, 2], b: [3, 4] }, output: '2.5' },
    { label: '[1,3,8,9,15] and [7,11,18,19,21,25]', input: { a: [1, 3, 8, 9, 15], b: [7, 11, 18, 19, 21, 25] }, output: '11' },
  ],
  inputPlaceholder: 'e.g. 1 3 ; 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Left half (before the cut)', state: 'active' }, { label: 'Cut borders L1 R1 L2 R2', state: 'compare' }, { label: 'Valid left half', state: 'found' }, { label: 'Padding', state: 'dim' }],
  varLabels: ['lo', 'i', 'j', 'hi', 'half'],
  approach: {
    title: 'Binary search for the right cut, never merge',
    text: 'Cut the shorter array A at position i and the other array B at j = half − i so the left side holds exactly half the numbers. The cut is right when max(left) ≤ min(right), which only needs the four border values. Adjust i with binary search until that holds.',
  },
  java: [
    'public double findMedianSortedArrays(int[] A, int[] B) {',
    '    if (A.length > B.length) return findMedianSortedArrays(B, A);',
    '    int m = A.length, n = B.length, half = (m + n + 1) / 2;',
    '    int lo = 0, hi = m;',
    '    while (lo <= hi) {',
    '        int i = (lo + hi) / 2, j = half - i;',
    '        int l1 = i > 0 ? A[i - 1] : Integer.MIN_VALUE, r1 = i < m ? A[i] : Integer.MAX_VALUE;',
    '        int l2 = j > 0 ? B[j - 1] : Integer.MIN_VALUE, r2 = j < n ? B[j] : Integer.MAX_VALUE;',
    '        if (l1 <= r2 && l2 <= r1) {',
    '            int left = Math.max(l1, l2);',
    '            if ((m + n) % 2 == 1) return left;',
    '            return (left + (double) Math.min(r1, r2)) / 2.0;',
    '        } else if (l1 > r2) hi = i - 1;',
    '        else lo = i + 1;',
    '    }',
    '    throw new IllegalStateException();',
    '}',
  ],
  python: [
    'def find_median(A, B):',
    '    if len(A) > len(B):',
    '        A, B = B, A',
    '    m, n = len(A), len(B)',
    '    half = (m + n + 1) // 2',
    '    lo, hi = 0, m',
    '    while lo <= hi:',
    '        i = (lo + hi) // 2',
    '        j = half - i',
    "        l1 = A[i - 1] if i > 0 else float('-inf')",
    "        r1 = A[i] if i < m else float('inf')",
    "        l2 = B[j - 1] if j > 0 else float('-inf')",
    "        r2 = B[j] if j < n else float('inf')",
    '        if l1 <= r2 and l2 <= r1:',
    '            left = max(l1, l2)',
    '            if (m + n) % 2 == 1:',
    '                return left',
    '            return (left + min(r1, r2)) / 2',
    '        elif l1 > r2:',
    '            hi = i - 1',
    '        else:',
    '            lo = i + 1',
  ],
  algorithm: [
    'Make A the shorter array; half = (m + n + 1) / 2; search i in [0, m]',
    'Cut A at i and B at j = half − i; read the borders L1, R1, L2, R2',
    'L1 > R2 → hi = i − 1; L2 > R1 → lo = i + 1',
    'Valid cut: odd total → max(L1, L2); even → (max(L1, L2) + min(R1, R2)) / 2',
  ],
  complexity: [{ label: 'Time', value: 'O(log(min(m, n)))' }, { label: 'Space', value: 'O(1)' }],
  why: 'A valid cut puts exactly half of all numbers on the left and has max(left) ≤ min(right); since each array is already sorted, only L1 ≤ R2 and L2 ≤ R1 need checking. Moving i right pushes L1 up and R2 down, so the two conditions fail on opposite sides of the correct i, which makes the search monotone. Searching the shorter array keeps j = half − i inside [0, n].',
};
