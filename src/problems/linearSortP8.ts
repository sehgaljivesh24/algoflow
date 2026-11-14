/** Pack p8 linear-time sorting problems: Counting Sort, Radix Sort (LSD), Maximum Gap (#164, bucket idea). */
import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { Rec, arr, nums as parseNums, ptr, range } from './p8Kit.ts';

interface NIn { nums: number[] }

/* ------------------------------------------------------------------------ Counting Sort */
function parseCounting(raw: string): NIn {
  const nums = parseNums(raw, { min: 2, max: 12, lo: -20, hi: 20 });
  if (Math.max(...nums) - Math.min(...nums) + 1 > 12) throw new Error('Counting sort draws one slot per value: keep max - min within 11 (at most 12 slots)');
  return { nums };
}

function buildCounting({ nums }: NIn): Step[] {
  const n = nums.length;
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const k = hi - lo + 1;
  const rec = new Rec();
  const count: number[] = Array(k).fill(0);
  const out: (number | undefined)[] = Array(n).fill(undefined);
  let w = 0;
  const scene = (cur: number, slot: number, outHl: number[] = [], bump = false) => ({
    kind: 'split' as const,
    stack: true,
    parts: [
      { kind: 'array' as const, cells: nums.map((v, i): Cell => ({ key: i, value: v, state: i === cur ? 'compare' : cur >= 0 && i < cur ? 'dim' : undefined })), pointers: cur >= 0 ? [ptr('i', 'i', cur, 'blue')] : [] },
      { kind: 'grid' as const, variant: 'table' as const, rows: [count.map((c, s): Cell => ({ key: s, value: c, state: s === slot ? (bump ? 'swap' : 'compare') : undefined }))], rowHeads: ['count'], colHeads: range(lo, hi).map(String) },
      { kind: 'array' as const, cells: out.map((v, i): Cell => ({ key: `o${i}`, value: v === undefined ? '·' : v, state: v === undefined ? 'dim' : outHl.includes(i) ? 'found' : 'sorted' })), pointers: [] },
    ],
  });
  const vars = (i: number | string, v: number | string) => ({ i, x: v, slot: typeof v === 'number' ? v - lo : '—', written: w });
  rec.push({ t: 'Start', d: `Values range from ${lo} to ${hi}, so ${k} count slots are enough. Left: input, middle: count[], right: sorted output.`, scene: scene(-1, -1), v: vars('—', '—'), why: 'When the value range k is small, we can sort by counting instead of comparing: no comparison is ever made.', j: [0, 1, 2], p: [0, 1, 2], a: 0, tag: 'READY —', note: `min = ${lo}, max = ${hi} → count = new int[${k}]` });
  nums.forEach((x, i) => {
    count[x - lo]++;
    rec.push({ t: `Count ${x}`, d: `nums[${i}] = ${x} → slot ${x} − ${lo} = ${x - lo}: count[${x - lo}] becomes ${count[x - lo]}.`, scene: scene(i, x - lo, [], true), v: vars(i, x), why: 'Each value increments its own slot, so after the pass count[v] is exactly how often v occurs.', j: [3], p: [3, 4], a: 1, tag: `COUNT ${x} —`, note: `count[${x} - ${lo}]++ → count[${x - lo}] = ${count[x - lo]}` });
  });
  range(0, k - 1).forEach((s) => {
    if (count[s] === 0) return;
    const wrote: number[] = [];
    for (let c = 0; c < count[s]; c++) { out[w] = s + lo; wrote.push(w); w++; }
    rec.push({ t: `Write ${count[s]} × ${s + lo}`, d: `Slot ${s + lo} holds ${count[s]}, so write ${s + lo} ${count[s]} time${count[s] === 1 ? '' : 's'} into the output.`, scene: scene(-1, s, wrote), v: vars('—', s + lo), why: 'Walking the slots in increasing order emits values in increasing order, so the output is sorted by construction.', tone: 'success', j: [5, 6], p: [6, 7], a: 2, tag: `WRITE ${s + lo} —`, note: `count[${s}] = ${count[s]} → nums[${w - count[s]}..${w - 1}] = ${s + lo}` });
  });
  const sorted = out as number[];
  rec.push({ t: `Sorted: ${arr(sorted)}`, d: `All ${n} values written in ${2 * n + k} basic operations (${n} counts + ${k} slots scanned + ${n} writes).`, scene: scene(-1, -1), v: vars('—', '—'), why: 'Total work is n (counting) + k (scanning slots) + n (writing): linear when k is O(n).', tone: 'success', j: [8], p: [8], a: 3, tag: '✅ Done!', note: `return nums = ${arr(sorted)}`, result: { title: arr(sorted), text: `Sorted array: ${arr(sorted)}` } });
  return rec.steps;
}

export const countingSort: ProblemDef<NIn> = {
  slug: '912-counting-sort', id: '912', title: 'Counting Sort', difficulty: 'Medium', category: 'Sorting', tag: 'count, no comparisons',
  statement: 'Sort an array of integers drawn from a small known range without comparing elements: count how often each value occurs, then write the values back in increasing order.',
  constraints: 'Range k = max − min + 1 should be O(n) (animation input: 2–12 values between −20 and 20 with max − min ≤ 11)',
  examples: [
    { label: '[4,2,2,8,3,3,1]', input: { nums: [4, 2, 2, 8, 3, 3, 1] }, output: '[1,2,2,3,3,4,8]' },
    { label: '[5,1,4,1,5,5]', input: { nums: [5, 1, 4, 1, 5, 5] }, output: '[1,1,4,5,5,5]' },
    { label: 'negatives [−3,2,−3,0,1]', input: { nums: [-3, 2, -3, 0, 1] }, output: '[-3,-3,0,1,2]' },
  ],
  inputPlaceholder: 'e.g. 4 2 2 8 3 3 1', parseInput: parseCounting, buildSteps: buildCounting, viz: 'cells', vizTitle: 'Input, count array and output',
  legend: [{ label: 'Element being counted / slot', state: 'compare' }, { label: 'Slot just incremented', state: 'swap' }, { label: 'Just written to output', state: 'found' }, { label: 'Output so far', state: 'sorted' }, { label: 'Counted already / empty', state: 'dim' }],
  varLabels: ['i', 'x', 'slot', 'written'],
  emphasis: ['small known range', 'without comparing elements', 'count how often each value occurs'],
  phases: [
    { icon: '📐', label: 'Phase 1: Range → count[]', tone: 'blue' },
    { icon: '🔢', label: 'Phase 2: Count each value', tone: 'cyan' },
    { icon: '✍', label: 'Phase 3: Write back in order', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Replace comparisons by indexing', text: 'Make an array with one slot per possible value. One pass over the input adds 1 to the slot of each value. A second pass walks the slots from smallest to largest and writes each value as many times as its slot says.' },
  java: [
    'public int[] countingSort(int[] nums) {',
    '    int min = Arrays.stream(nums).min().getAsInt(), max = Arrays.stream(nums).max().getAsInt();',
    '    int[] count = new int[max - min + 1];',
    '    for (int x : nums) count[x - min]++;',
    '    int k = 0;',
    '    for (int v = 0; v < count.length; v++) {',
    '        while (count[v]-- > 0) nums[k++] = v + min;',
    '    }',
    '    return nums;',
    '}',
  ],
  python: [
    'def counting_sort(nums):',
    '    lo, hi = min(nums), max(nums)',
    '    count = [0] * (hi - lo + 1)',
    '    for x in nums:',
    '        count[x - lo] += 1',
    '    out = []',
    '    for v, c in enumerate(count):',
    '        out.extend([v + lo] * c)',
    '    return out',
  ],
  algorithm: ['Find min and max; allocate one counter per value in between', 'One pass: count[x − min]++ for every element', 'Walk the counters in order, writing each value count times', 'The output is sorted'],
  complexity: [{ label: 'Time', value: 'O(n + k)' }, { label: 'Space', value: 'O(k)' }],
  why: 'After the counting pass, count[s] equals the number of elements equal to s + min. The writing pass visits slots in increasing order and emits exactly count[s] copies of each, so the output has the right multiset in non-decreasing order. The Ω(n log n) bound applies to comparison sorts only; indexing by value sidesteps it when k is small.',
};

/* ------------------------------------------------------------------------- Radix Sort */
function parseRadix(raw: string): NIn { return { nums: parseNums(raw, { min: 2, max: 10, lo: 0, hi: 999 }) }; }

function buildRadix({ nums }: NIn): Step[] {
  const rec = new Rec();
  let order = nums.map((v, i) => ({ id: i, v }));
  const max = Math.max(...nums);
  let exp = 1;
  let buckets: number[][] = Array.from({ length: 10 }, () => []);
  const cells = (list: { id: number; v: number }[], cur = -1, done = false): Cell[] => list.map((e, i) => ({ key: e.id, value: e.v, state: i === cur ? 'compare' : done ? 'sorted' : cur >= 0 && i < cur ? 'dim' : undefined }));
  const aux = (hl = -1) => [{ title: 'buckets by digit', kind: 'map' as const, items: buckets.map((b, d) => `${d} → ${b.length ? b.join(', ') : '·'}`), highlight: hl >= 0 ? hl : undefined }];
  const vars = (digit: number | string) => ({ exp, digit });
  rec.push({ t: 'Start', d: `Sort ${arr(nums)} digit by digit, least significant first. Each pass is a stable bucket distribution on one digit.`, cells: cells(order), pointers: [], aux: aux(), v: vars('—'), why: 'Sorting by the lowest digit first and keeping every pass stable means later (more significant) digits override earlier ones only when they differ.', j: [0, 1], p: [0], a: 0, tag: 'READY —', note: `max = ${max} → ${String(max).length} pass${String(max).length === 1 ? '' : 'es'}` });
  let pass = 0;
  while (Math.floor(max / exp) > 0) {
    pass++;
    buckets = Array.from({ length: 10 }, () => []);
    order.forEach((e, i) => {
      const d = Math.floor(e.v / exp) % 10;
      buckets[d].push(e.v);
      rec.push({ t: `Pass ${pass} (digit of ${exp}s): ${e.v} → bucket ${d}`, d: `(${e.v} ÷ ${exp}) mod 10 = ${d}. It joins the end of bucket ${d}, behind equal digits seen earlier (stability).`, cells: cells(order, i), pointers: [ptr('i', `digit ${d}`, i, 'orange')], aux: aux(d), v: vars(d), why: 'Appending to the end of a bucket keeps elements with the same digit in their previous relative order.', j: [5], p: [4, 5], a: 1, tag: `PASS ${pass} — BUCKET`, note: `(${e.v} / ${exp}) % 10 = ${d} → bucket[${d}]` });
    });
    const next: { id: number; v: number }[] = [];
    for (const b of buckets) for (const v of b) next.push(order.find((e) => e.v === v && !next.includes(e))!);
    order = next;
    rec.push({ t: `Pass ${pass}: collect the buckets 0 → 9`, d: `Reading the buckets in order gives ${arr(order.map((e) => e.v))}: sorted by the ${exp}s digit.`, cells: cells(order), pointers: [], aux: aux(), v: vars('—'), why: `After this pass the array is sorted by the last ${pass} digit${pass > 1 ? 's' : ''}, and equal low digits keep the order of the previous pass.`, tone: 'success', j: [6, 7, 8], p: [6, 7], a: 2, tag: `PASS ${pass} — COLLECT`, note: `nums = ${arr(order.map((e) => e.v))}` });
    exp *= 10;
  }
  const sorted = order.map((e) => e.v);
  rec.push({ t: `Sorted: ${arr(sorted)}`, d: `${pass} pass${pass === 1 ? '' : 'es'}, one per digit of the largest number (${max}).`, cells: cells(order, -1, true), pointers: [], aux: aux(), v: vars('—'), why: 'The number of passes is the digit count d of the maximum, so the total cost is O(d · (n + 10)).', tone: 'success', j: [10], p: [8], a: 3, tag: '✅ Done!', note: `return nums = ${arr(sorted)}`, result: { title: arr(sorted), text: `Sorted array: ${arr(sorted)}` } });
  return rec.steps;
}

export const radixSort: ProblemDef<NIn> = {
  slug: '912-radix-sort', id: '912', title: 'Radix Sort', difficulty: 'Medium', category: 'Sorting', tag: 'digit buckets, LSD',
  statement: 'Sort non-negative integers without comparing them: distribute the numbers into ten buckets by their lowest digit, collect the buckets in order, then repeat for the tens digit, the hundreds digit and so on.',
  constraints: 'n elements with at most d digits each (animation input: 2–10 values between 0 and 999)',
  examples: [
    { label: '[170,45,75,90,802,24,2,66]', input: { nums: [170, 45, 75, 90, 802, 24, 2, 66] }, output: '[2,24,45,66,75,90,170,802]' },
    { label: '[329,457,657,839,436,720,355]', input: { nums: [329, 457, 657, 839, 436, 720, 355] }, output: '[329,355,436,457,657,720,839]' },
    { label: '[5,3,9,1]', input: { nums: [5, 3, 9, 1] }, output: '[1,3,5,9]' },
  ],
  inputPlaceholder: 'e.g. 170 45 75 90 802 24 2 66', parseInput: parseRadix, buildSteps: buildRadix, viz: 'cells', vizTitle: 'Array and digit buckets',
  legend: [{ label: 'Element being bucketed', state: 'compare' }, { label: 'Already bucketed in this pass', state: 'dim' }, { label: 'Final sorted order', state: 'sorted' }],
  varLabels: ['exp', 'digit'],
  emphasis: ['without comparing them', 'ten buckets', 'lowest digit'],
  phases: [
    { icon: '🔎', label: 'Phase 1: Find max → digit count', tone: 'blue' },
    { icon: '🪣', label: 'Phase 2: Distribute by digit', tone: 'cyan' },
    { icon: '📥', label: 'Phase 3: Collect buckets 0 → 9', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Least-significant digit first, stable passes', text: 'Do one stable bucket pass per decimal digit, from the ones digit up to the largest number\'s top digit. Stability is the whole trick: when two numbers tie on the current digit, their order from the previous (lower-digit) pass is preserved.' },
  java: [
    'public int[] radixSort(int[] nums) {',
    '    int max = Arrays.stream(nums).max().getAsInt();',
    '    for (int exp = 1; max / exp > 0; exp *= 10) {',
    '        List<List<Integer>> bucket = new ArrayList<>();',
    '        for (int d = 0; d < 10; d++) bucket.add(new ArrayList<>());',
    '        for (int x : nums) bucket.get((x / exp) % 10).add(x);',
    '        int k = 0;',
    '        for (List<Integer> b : bucket)',
    '            for (int x : b) nums[k++] = x;',
    '    }',
    '    return nums;',
    '}',
  ],
  python: [
    'def radix_sort(nums):',
    '    exp = 1',
    '    while max(nums) // exp > 0:',
    '        bucket = [[] for _ in range(10)]',
    '        for x in nums:',
    '            bucket[(x // exp) % 10].append(x)',
    '        nums = [x for b in bucket for x in b]',
    '        exp *= 10',
    '    return nums',
  ],
  algorithm: ['Find the largest number to know how many digits to process', 'Distribute every number into the bucket of its current digit (append to keep stability)', 'Collect the buckets 0 → 9 back into the array', 'Move to the next digit; stop after the top digit'],
  complexity: [{ label: 'Time', value: 'O(d · (n + 10))' }, { label: 'Space', value: 'O(n)' }],
  why: 'Claim: after pass t the array is sorted by its lowest t digits. Pass t+1 orders by digit t+1; numbers whose digit t+1 differ are placed correctly, and numbers that tie keep their previous order (stability), which was sorted by the lower t digits. Induction finishes the proof once every digit has been processed.',
};

/* ------------------------------------------------------------------- #164 Maximum Gap */
function parseGap(raw: string): NIn { return { nums: parseNums(raw, { min: 2, max: 10, lo: 0, hi: 99 }) }; }

function buildGap({ nums }: NIn): Step[] {
  const n = nums.length;
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const rec = new Rec();
  const vars = (b: number | string, best: number, prev: number | string) => ({ size: size || '—', bucket: b, prev, best });
  let size = 0;
  if (lo === hi) {
    rec.push({ t: 'All numbers are equal', d: `min = max = ${lo}, so every adjacent difference in sorted order is 0.`, cells: nums.map((v, i) => ({ key: i, value: v, state: 'found' })), pointers: [], v: vars('—', 0, '—'), why: 'The bucket formula divides by (max − min), so this case is answered directly.', tone: 'success', j: [3], p: [3], a: 0, tag: 'EDGE —', note: `lo == hi == ${lo} → return 0` });
    rec.push({ t: 'Answer: 0', d: 'Nothing to bucket.', cells: nums.map((v, i) => ({ key: i, value: v, state: 'found' })), pointers: [], v: vars('—', 0, '—'), why: 'Equal values are never separated by a gap.', tone: 'success', j: [3], p: [3], a: 3, tag: '✅ Done!', note: 'return 0', result: { title: '0', text: 'Maximum gap is 0' } });
    return rec.steps;
  }
  size = Math.ceil((hi - lo) / (n - 1));
  const B = Math.floor((hi - lo) / size) + 1;
  const bmin: (number | undefined)[] = Array(B).fill(undefined);
  const bmax: (number | undefined)[] = Array(B).fill(undefined);
  const heads = range(0, B - 1).map((b) => `[${lo + b * size}–${lo + (b + 1) * size - 1}]`);
  const inCells = (cur: number, done = 0, hl: number[] = []): Cell[] => nums.map((v, i) => ({ key: i, value: v, state: i === cur ? 'compare' : hl.includes(v) ? 'found' : i < done ? 'sorted' : undefined }));
  const scene = (cur: number, done: number, hlB = -1, hlMax = -1) => ({
    kind: 'split' as const,
    stack: true,
    parts: [
      { kind: 'array' as const, cells: inCells(cur, done), pointers: cur >= 0 ? [ptr('i', 'i', cur, 'blue')] : [] },
      {
        kind: 'grid' as const, variant: 'table' as const, colHeads: heads, rowHeads: ['min', 'max'],
        rows: [bmin, bmax].map((r, ri): Cell[] => r.map((v, b) => ({ key: `${ri}${b}`, value: v === undefined ? '·' : v, state: b === hlB ? (ri === 0 ? 'found' : 'compare') : b === hlMax && ri === 1 ? 'swap' : v === undefined ? 'dim' : undefined }))),
      },
    ],
  });
  rec.push({ t: 'Start', d: `n = ${n}, min = ${lo}, max = ${hi}. The largest gap is at least ⌈(${hi} − ${lo}) / ${n - 1}⌉ = ${size}.`, scene: scene(-1, 0), v: vars('—', 0, '—'), why: 'If n numbers are spread over [min, max], the average gap is (max − min)/(n − 1), so the biggest gap is at least that large.', j: [1, 2, 3, 4], p: [1, 2, 3, 4], a: 0, tag: 'READY —', note: `size = ceil((${hi} - ${lo}) / ${n - 1}) = ${size}` });
  rec.push({ t: `Use ${B} buckets of width ${size}`, d: `Bucket b covers [${lo} + b·${size}, ${lo} + (b+1)·${size} − 1]. Two numbers in the same bucket differ by less than ${size}, so they can never be the maximum gap.`, scene: scene(-1, 0), v: vars('—', 0, '—'), why: 'Within-bucket differences are < width ≤ answer, therefore we only need to keep each bucket\'s min and max.', j: [5, 6, 7], p: [5, 6, 7], a: 1, tag: 'BUCKETS —', note: `buckets = (${hi} - ${lo}) / ${size} + 1 = ${B}` });
  nums.forEach((x, i) => {
    const b = Math.floor((x - lo) / size);
    bmin[b] = bmin[b] === undefined ? x : Math.min(bmin[b]!, x);
    bmax[b] = bmax[b] === undefined ? x : Math.max(bmax[b]!, x);
    rec.push({ t: `${x} → bucket ${b}`, d: `(${x} − ${lo}) ÷ ${size} = ${b}. Bucket ${b} now has min ${bmin[b]} and max ${bmax[b]}.`, scene: scene(i, i, b), v: vars(b, 0, '—'), why: 'Only two numbers per bucket are ever needed, so memory stays O(n) and no sorting is done inside buckets.', j: [8, 9, 10, 11], p: [8, 9, 10, 11], a: 1, tag: `PLACE ${x} —`, note: `b = (${x} - ${lo}) / ${size} = ${b}; bmin = ${bmin[b]}, bmax = ${bmax[b]}` });
  });
  let best = 0;
  let prev = lo;
  let prevB = -1;
  const gaps: string[] = [];
  for (let b = 0; b < B; b++) {
    if (bmin[b] === undefined) {
      rec.push({ t: `Bucket ${b} is empty`, d: 'Nothing here: the gap simply continues into the next non-empty bucket.', scene: scene(-1, n, b), aux: [{ title: 'gaps', kind: 'list', items: gaps }], v: vars(b, best, prev), why: 'Empty buckets are where big gaps hide; skipping them lets the next bucket measure the full distance from the previous max.', j: [15], p: [14], a: 2, tag: `BUCKET ${b} — EMPTY`, note: `bmax[${b}] < 0 → continue (prev stays ${prev})`, alert: `Bucket ${b} is empty: the gap stretches over it, so prev stays ${prev}.` });
      continue;
    }
    const gap = bmin[b]! - prev;
    gaps.push(`${prev} → ${bmin[b]} = ${gap}`);
    const better = gap > best;
    const oldBest = best;
    best = Math.max(best, gap);
    rec.push({ t: `Bucket ${b}: min ${bmin[b]} − previous max ${prev} = ${gap}`, d: better ? `${bmin[b]} − ${prev} = ${gap} → 🏆 NEW LARGEST GAP: ${best}.` : `${bmin[b]} − ${prev} = ${gap} does not beat ${best}.`, scene: scene(-1, n, b, prevB), aux: [{ title: 'gaps', kind: 'list', items: gaps }], v: vars(b, best, prev), why: 'The gap between consecutive sorted numbers that straddle a bucket boundary is min of this bucket minus max of the previous non-empty bucket.', tone: better ? 'success' : 'info', j: [16, 17], p: [15, 16], a: 2, tag: `BUCKET ${b} —`, note: `best = max(${oldBest}, ${bmin[b]} - ${prev}) = ${best}` });
    prev = bmax[b]!;
    prevB = b;
  }
  rec.push({ t: `Maximum gap = ${best}`, d: 'Compared only bucket boundaries, in linear time.', scene: scene(-1, n), aux: [{ title: 'gaps', kind: 'list', items: gaps }], v: vars('—', best, prev), why: 'Total work: one pass to bucket plus one pass over the buckets, with no comparison sort.', tone: 'success', j: [19], p: [17], a: 3, tag: '✅ Done!', note: `return ${best}`, result: { title: String(best), text: `Maximum gap in sorted order: ${best}` } });
  return rec.steps;
}

export const maximumGap: ProblemDef<NIn> = {
  slug: '164-maximum-gap', id: '164', title: 'Maximum Gap', difficulty: 'Medium', category: 'Sorting', tag: 'bucket sort, pigeonhole',
  statement: 'Given an unsorted array, return the largest difference between two successive elements in its sorted form, or 0 if the array has fewer than two elements. Aim for linear time and space without a comparison sort.',
  constraints: '1 ≤ n ≤ 10⁵, 0 ≤ nums[i] ≤ 10⁹ (animation input: 2–10 values between 0 and 99)',
  examples: [
    { label: '[3,6,9,1]', input: { nums: [3, 6, 9, 1] }, output: '3' },
    { label: '[10,2]', input: { nums: [10, 2] }, output: '8' },
    { label: '[18,3,41,11,27,5,90,64]', input: { nums: [18, 3, 41, 11, 27, 5, 90, 64] }, output: '26' },
  ],
  inputPlaceholder: 'e.g. 3 6 9 1', parseInput: parseGap, buildSteps: buildGap, viz: 'cells', vizTitle: 'Input and buckets (min / max per bucket)',
  legend: [{ label: 'Element being placed', state: 'compare' }, { label: 'Bucket min / current bucket', state: 'found' }, { label: 'Previous bucket max', state: 'swap' }, { label: 'Placed already', state: 'sorted' }, { label: 'Empty bucket', state: 'dim' }],
  varLabels: ['size', 'bucket', 'prev', 'best'],
  emphasis: ['largest difference', 'successive elements', 'linear time'],
  phases: [
    { icon: '📐', label: 'Phase 1: Pigeonhole bucket size', tone: 'blue' },
    { icon: '🪣', label: 'Phase 2: Fill buckets (min / max)', tone: 'cyan' },
    { icon: '📏', label: 'Phase 3: Scan bucket boundaries', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Pigeonhole buckets', text: 'The biggest gap is at least ⌈(max − min)/(n − 1)⌉. Use buckets of exactly that width; two numbers in one bucket are closer than that, so the answer always spans a bucket boundary. Keep only each bucket\'s min and max, then scan buckets in order measuring min − previous max.' },
  java: [
    'public int maximumGap(int[] nums) {',
    '    int n = nums.length;',
    '    int lo = Arrays.stream(nums).min().getAsInt();',
    '    int hi = Arrays.stream(nums).max().getAsInt();',
    '    if (lo == hi) return 0;',
    '    int size = (hi - lo + n - 2) / (n - 1);',
    '    int buckets = (hi - lo) / size + 1;',
    '    int[] bmin = new int[buckets], bmax = new int[buckets];',
    '    Arrays.fill(bmin, Integer.MAX_VALUE); Arrays.fill(bmax, -1);',
    '    for (int x : nums) {',
    '        int b = (x - lo) / size;',
    '        bmin[b] = Math.min(bmin[b], x);',
    '        bmax[b] = Math.max(bmax[b], x);',
    '    }',
    '    int best = 0, prev = lo;',
    '    for (int b = 0; b < buckets; b++) {',
    '        if (bmax[b] < 0) continue;',
    '        best = Math.max(best, bmin[b] - prev);',
    '        prev = bmax[b];',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def maximum_gap(nums):',
    '    n = len(nums)',
    '    lo, hi = min(nums), max(nums)',
    '    if lo == hi: return 0',
    '    size = -(-(hi - lo) // (n - 1))',
    '    buckets = (hi - lo) // size + 1',
    '    bmin = [None] * buckets',
    '    bmax = [None] * buckets',
    '    for x in nums:',
    '        b = (x - lo) // size',
    '        bmin[b] = x if bmin[b] is None else min(bmin[b], x)',
    '        bmax[b] = x if bmax[b] is None else max(bmax[b], x)',
    '    best, prev = 0, lo',
    '    for b in range(buckets):',
    '        if bmin[b] is None: continue',
    '        best = max(best, bmin[b] - prev)',
    '        prev = bmax[b]',
    '    return best',
  ],
  algorithm: ['Find min and max; the answer is at least ⌈(max − min)/(n − 1)⌉', 'Create buckets of that width, remembering only min and max of each', 'Drop every number into its bucket', 'Scan the buckets in order: gap = bucket min − previous max; keep the largest'],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'n numbers span max − min, which leaves n − 1 gaps summing to max − min, so the largest gap g ≥ ⌈(max − min)/(n − 1)⌉ = size. Two numbers in the same bucket differ by at most size − 1 < g, so they are never the maximising pair. Hence the answer is realised between the max of one non-empty bucket and the min of the next non-empty bucket.',
};
