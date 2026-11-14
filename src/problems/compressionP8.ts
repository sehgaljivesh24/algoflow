/** Pack p8 coordinate-compression problems: Rank Transform of an Array (#1331), Relative Ranks (#506), Maximum Overlap of Wide Intervals. */
import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { Rec, arr, idx, nums as parseNums, strs } from './p8Kit.ts';
import { plural } from './text.ts';

/* ------------------------------------------------------------------ #1331 Rank Transform */
interface NIn { nums: number[] }

function buildRank({ nums }: NIn): Step[] {
  const rec = new Rec();
  const n = nums.length;
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  const rank = new Map<number, number>();
  const out: (number | undefined)[] = Array(n).fill(undefined);
  const grid = (cur = -1, outHl = -1) => ({
    kind: 'grid' as const, variant: 'table' as const, rowHeads: ['arr', 'rank'], colHeads: idx(n),
    rows: [
      nums.map((v, i): Cell => ({ key: `a${i}`, value: v, state: i === cur ? 'compare' : undefined })),
      out.map((v, i): Cell => ({ key: `r${i}`, value: v === undefined ? '?' : v, state: v === undefined ? 'dim' : i === outHl ? 'found' : undefined })),
    ],
  });
  const aux = (showSorted: boolean) => [
    { title: 'distinct values, sorted', kind: 'list' as const, items: showSorted ? sorted.map(String) : [] },
    { title: 'rank map', kind: 'map' as const, items: [...rank.entries()].map(([v, r]) => `${v} → ${r}`) },
  ];
  const vars = (x: number | string, r: number | string) => ({ value: x, rank: r, distinct: showSortedCount() });
  let sortedKnown = false;
  const showSortedCount = () => (sortedKnown ? sorted.length : '—');
  rec.push({ t: 'Start', d: `Replace every value of ${arr(nums)} by its rank (1 = smallest distinct value, 2 = next, …): values may be huge, ranks stay in 1…k.`, scene: grid(), aux: aux(false), v: vars('—', '—'), why: 'Compression keeps only the relative order of values, which is all that rank-based logic needs, and maps a huge range to a small dense one.', j: [0], p: [0], a: 0, tag: 'READY —', note: `arr = ${arr(nums)}` });
  sortedKnown = true;
  rec.push({ t: 'Sort the distinct values', d: `Removing duplicates and sorting gives ${arr(sorted)}: ${sorted.length} distinct value${sorted.length === 1 ? '' : 's'}.`, scene: grid(), aux: aux(true), v: vars('—', '—'), why: 'The position of a value in this sorted list (plus one) is its rank. Equal values appear once, so they share a rank.', j: [1], p: [1], a: 0, tag: 'SORT —', note: `sorted = ${arr(sorted)}` });
  sorted.forEach((v, i) => {
    rank.set(v, i + 1);
    rec.push({ t: `rank[${v}] = ${i + 1}`, d: `${v} is number ${i + 1} in sorted order.`, scene: grid(), aux: aux(true), v: vars(v, i + 1), why: 'A hash map from value to rank makes each later lookup O(1) (a binary search over the sorted list works too).', j: [2, 3], p: [2, 3, 4], a: 1, tag: `RANK ${v} —`, note: `rank.put(${v}, ${i} + 1 = ${i + 1})` });
  });
  nums.forEach((v, i) => {
    out[i] = rank.get(v);
    rec.push({ t: `arr[${i}] = ${v} → rank ${out[i]}`, d: `${v} is looked up in the rank map: out[${i}] = ${out[i]}.`, scene: grid(i, i), aux: aux(true), v: vars(v, out[i]!), why: 'Equal values map to the same rank, and a smaller value always gets a smaller rank, so the order of the array is preserved.', tone: 'success', j: [4, 5], p: [5], a: 2, tag: `arr[${i}] —`, note: `out[${i}] = rank.get(${v}) = ${out[i]}` });
  });
  rec.push({ t: `Ranks: ${arr(out as number[])}`, d: `${plural(n, 'value')} compressed into ranks 1…${sorted.length}.`, scene: grid(), aux: aux(true), v: vars('—', '—'), why: 'Cost: sorting dominates, O(n log n).', tone: 'success', j: [6], p: [5], a: 3, tag: '✅ Done!', note: `return ${arr(out as number[])}`, result: { title: arr(out as number[]), text: `Rank transform: ${arr(out as number[])}` } });
  return rec.steps;
}

export const rankTransform: ProblemDef<NIn> = {
  slug: '1331-rank-transform-of-an-array', id: '1331', title: 'Rank Transform of an Array', difficulty: 'Easy', category: 'Arrays', tag: 'coordinate compression (dense ranks)',
  statement: 'Replace each element of an array by its rank: the smallest value gets rank 1, equal values share a rank, and each larger distinct value gets the next integer.',
  constraints: '0 ≤ n ≤ 10⁵, −10⁹ ≤ arr[i] ≤ 10⁹ (animation input: 1–10 values between −10⁹ and 10⁹)',
  examples: [
    { label: '[40,10,20,30]', input: { nums: [40, 10, 20, 30] }, output: '[4,1,2,3]' },
    { label: '[100,100,100]', input: { nums: [100, 100, 100] }, output: '[1,1,1]' },
    { label: '[37,12,28,9,100,56,80,5,12]', input: { nums: [37, 12, 28, 9, 100, 56, 80, 5, 12] }, output: '[5,3,4,2,8,6,7,1,3]' },
  ],
  inputPlaceholder: 'e.g. 40 10 20 30', parseInput: (raw) => ({ nums: parseNums(raw, { max: 10, lo: -1e9, hi: 1e9 }) }), buildSteps: buildRank, viz: 'cells', vizTitle: 'Values and their dense ranks',
  legend: [{ label: 'Element being ranked', state: 'compare' }, { label: 'Rank assigned', state: 'found' }, { label: 'Not ranked yet', state: 'dim' }],
  varLabels: ['value', 'rank', 'distinct'],
  emphasis: ['rank', 'equal values share a rank'],
  phases: [
    { icon: '🔀', label: 'Phase 1: Sort distinct values', tone: 'blue' },
    { icon: '🏷', label: 'Phase 2: Assign ranks', tone: 'cyan' },
    { icon: '🔁', label: 'Phase 3: Replace each element', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Sort the distinct values, number them', text: 'Sort the distinct values; the index in that list plus one is the rank. Store value → rank in a map and replace every array element by its rank. This is the basic coordinate-compression move.' },
  java: [
    'public int[] arrayRankTransform(int[] arr) {',
    '    int[] sorted = Arrays.stream(arr).distinct().sorted().toArray();',
    '    Map<Integer, Integer> rank = new HashMap<>();',
    '    for (int i = 0; i < sorted.length; i++) rank.put(sorted[i], i + 1);',
    '    int[] out = new int[arr.length];',
    '    for (int i = 0; i < arr.length; i++) out[i] = rank.get(arr[i]);',
    '    return out;',
    '}',
  ],
  python: [
    'def array_rank_transform(arr):',
    '    sorted_vals = sorted(set(arr))',
    '    rank = {}',
    '    for i, v in enumerate(sorted_vals):',
    '        rank[v] = i + 1',
    '    return [rank[x] for x in arr]',
  ],
  algorithm: ['Collect the distinct values and sort them', 'Give the i-th smallest the rank i + 1 (store it in a map)', 'Replace each array element by the rank of its value', 'Return the array of ranks'],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'rank(v) = 1 + the number of distinct values smaller than v. The map from value to rank is strictly increasing, so for any two elements x < y we get rank(x) < rank(y) and x = y gives equal ranks: order-based questions have the same answer on the ranks as on the original values.',
};

/* ------------------------------------------------------------------------ #506 Relative Ranks */
function parseRelative(raw: string): NIn {
  const nums = parseNums(raw, { max: 10, lo: 0, hi: 1e6, what: 'scores' });
  if (new Set(nums).size !== nums.length) throw new Error('All scores must be different');
  return { nums };
}
const MEDAL = ['Gold Medal', 'Silver Medal', 'Bronze Medal'];

function buildRelative({ nums }: NIn): Step[] {
  const rec = new Rec();
  const n = nums.length;
  const order = nums.map((_, i) => i).sort((a, b) => nums[b] - nums[a]);
  const out: (string | undefined)[] = Array(n).fill(undefined);
  const short = (s: string) => s.replace(' Medal', '');
  const grid = (cur = -1) => ({
    kind: 'grid' as const, variant: 'table' as const, rowHeads: ['score', 'place'], colHeads: idx(n),
    rows: [
      nums.map((v, i): Cell => ({ key: `s${i}`, value: v, state: i === cur ? 'compare' : undefined })),
      out.map((v, i): Cell => ({ key: `p${i}`, value: v === undefined ? '?' : short(v), state: v === undefined ? 'dim' : i === cur ? 'found' : undefined })),
    ],
  });
  let sortedKnown = false;
  const aux = () => [{ title: 'indexes by score, high → low', kind: 'list' as const, items: sortedKnown ? order.map((i) => `#${i}: ${nums[i]}`) : [] }];
  const vars = (r: number | string, i: number | string) => ({ rank: r, index: i });
  rec.push({ t: 'Start', d: `Hand out places by score: Gold, Silver, Bronze, then "4", "5", … The answer must stay in the original order, so we must remember where each score came from.`, scene: grid(), aux: aux(), v: vars('—', '—'), why: 'The place of a score is its position in descending order, and that position is the (compressed) rank. The original index travels with it so the answer lands in the right slot.', j: [0, 1], p: [0], a: 0, tag: 'READY —', note: `idx = ${arr(nums.map((_, i) => i))}` });
  sortedKnown = true;
  rec.push({ t: 'Sort the indexes by score, highest first', d: `Order of indexes: ${arr(order)} (scores ${arr(order.map((i) => nums[i]))}). Sorting indexes instead of values keeps the link to the original position.`, scene: grid(), aux: aux(), v: vars('—', '—'), why: 'Sorting an index array with the score as key gives both the rank (position in the sorted order) and the destination (the index itself).', j: [2, 3, 4], p: [1], a: 1, tag: 'SORT INDEXES —', note: `idx sorted by score desc = ${arr(order)}` });
  order.forEach((idxv, r) => {
    out[idxv] = r < 3 ? MEDAL[r] : String(r + 1);
    rec.push({ t: `Rank ${r + 1}: index ${idxv} (score ${nums[idxv]}) → ${out[idxv]}`, d: `The ${r + 1}${['st', 'nd', 'rd'][r] ?? 'th'} largest score is ${nums[idxv]}, located at index ${idxv}, so ans[${idxv}] = "${out[idxv]}".`, scene: grid(idxv), aux: aux(), v: vars(r + 1, idxv), why: 'Writing through the saved index puts each place back at its original position.', tone: 'success', j: [5, 6, 7, 8], p: [2, 3, 4, 5], a: 2, tag: `PLACE ${r + 1} —`, note: r < 3 ? `ans[${idxv}] = medal[${r}] = "${out[idxv]}"` : `ans[${idxv}] = String.valueOf(${r} + 1) = "${out[idxv]}"` });
  });
  const res = strs(out as string[]);
  rec.push({ t: `Places: ${res}`, d: 'Every score now holds its relative rank.', scene: grid(), aux: aux(), v: vars('—', '—'), why: 'O(n log n) for the sort, O(n) to fill the answer.', tone: 'success', j: [9], p: [6], a: 3, tag: '✅ Done!', note: `return ${res}`, result: { title: res, text: `Relative ranks: ${res}` } });
  return rec.steps;
}

export const relativeRanks: ProblemDef<NIn> = {
  slug: '506-relative-ranks', id: '506', title: 'Relative Ranks', difficulty: 'Easy', category: 'Arrays', tag: 'rank by sorting indexes',
  statement: 'Given distinct athlete scores, return their placements in the original order: "Gold Medal", "Silver Medal" and "Bronze Medal" for the top three, and the numeric place ("4", "5", …) for everyone else.',
  constraints: 'n ≤ 10⁴, 0 ≤ score[i] ≤ 10⁶, all scores distinct (animation input: 1–10 scores)',
  examples: [
    { label: '[5,4,3,2,1]', input: { nums: [5, 4, 3, 2, 1] }, output: '["Gold Medal","Silver Medal","Bronze Medal","4","5"]' },
    { label: '[10,3,8,9,4]', input: { nums: [10, 3, 8, 9, 4] }, output: '["Gold Medal","5","Bronze Medal","Silver Medal","4"]' },
    { label: '[7]', input: { nums: [7] }, output: '["Gold Medal"]' },
  ],
  inputPlaceholder: 'e.g. 10 3 8 9 4', parseInput: parseRelative, buildSteps: buildRelative, viz: 'cells', vizTitle: 'Scores and places',
  legend: [{ label: 'Score being placed', state: 'compare' }, { label: 'Place assigned', state: 'found' }, { label: 'Not placed yet', state: 'dim' }],
  varLabels: ['rank', 'index'],
  emphasis: ['placements', 'original order', 'Gold Medal'],
  phases: [
    { icon: '📌', label: 'Phase 1: Remember the indexes', tone: 'blue' },
    { icon: '🔀', label: 'Phase 2: Sort indexes by score', tone: 'cyan' },
    { icon: '🏅', label: 'Phase 3: Assign places', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Rank by sorting indexes', text: 'Sort the indexes of the array by score, descending. The position of an index in that order is its rank (a compressed coordinate); write the matching medal or number into ans[index] so the output keeps the original order.' },
  java: [
    'public String[] findRelativeRanks(int[] score) {',
    '    int n = score.length;',
    '    Integer[] idx = new Integer[n];',
    '    for (int i = 0; i < n; i++) idx[i] = i;',
    '    Arrays.sort(idx, (a, b) -> score[b] - score[a]);',
    '    String[] ans = new String[n];',
    '    String[] medal = {"Gold Medal", "Silver Medal", "Bronze Medal"};',
    '    for (int r = 0; r < n; r++)',
    '        ans[idx[r]] = r < 3 ? medal[r] : String.valueOf(r + 1);',
    '    return ans;',
    '}',
  ],
  python: [
    'def find_relative_ranks(score):',
    '    order = sorted(range(len(score)), key=lambda i: -score[i])',
    '    medal = ["Gold Medal", "Silver Medal", "Bronze Medal"]',
    '    ans = [""] * len(score)',
    '    for r, i in enumerate(order):',
    '        ans[i] = medal[r] if r < 3 else str(r + 1)',
    '    return ans',
  ],
  algorithm: ['Remember each score\'s original index', 'Sort the indexes by score, highest first', 'The r-th index in that order gets medal r (or the number r + 1)', 'Return the answers in original order'],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'In the sorted order the score at position r (0-based) has exactly r larger scores, so its place is r + 1. Because the sort carries the original index along, assigning ans[idx[r]] places every result back where its score came from.',
};

/* ------------------------------------------------- Maximum Overlap of Wide Intervals (sweep) */
interface IIn { iv: [number, number][] }

function parseIv(raw: string): IIn {
  const iv = raw.split(',').map((t) => t.trim()).filter(Boolean).map((t) => {
    const p = t.split(/[\s-]+/).filter(Boolean).map(Number);
    if (p.length !== 2 || p.some((x) => !Number.isInteger(x) || x < 0 || x > 1e9)) throw new Error('Each interval is "start end" (whole numbers 0…1000000000), separated by commas, e.g. 1 5, 3 1000000');
    if (p[0] > p[1]) throw new Error('Each interval needs start ≤ end');
    return [p[0], p[1]] as [number, number];
  });
  if (iv.length < 1 || iv.length > 6) throw new Error('Give between 1 and 6 intervals');
  return { iv };
}

function buildOverlap({ iv }: IIn): Step[] {
  const rec = new Rec();
  const pts = [...new Set(iv.flatMap(([a, b]) => [a, b + 1]))].sort((x, y) => x - y);
  const k = pts.length;
  const rank = new Map(pts.map((x, j) => [x, j]));
  const delta: number[] = Array(k).fill(0);
  const run: (number | undefined)[] = Array(k).fill(undefined);
  let phase: 'raw' | 'pts' = 'raw';
  let cur = 0;
  let best = 0;
  const grid = (hl = -1, tone: 'compare' | 'swap' = 'compare') => {
    if (phase === 'raw') {
      return { kind: 'grid' as const, variant: 'table' as const, rowHeads: ['start', 'end'], colHeads: iv.map((_, i) => `iv${i}`), rows: [iv.map(([a], i): Cell => ({ key: `a${i}`, value: a, state: i === hl ? tone : undefined })), iv.map(([, b], i): Cell => ({ key: `b${i}`, value: b, state: i === hl ? tone : undefined }))] };
    }
    return {
      kind: 'grid' as const, variant: 'table' as const, rowHeads: ['coordinate', 'delta', 'overlap'], colHeads: pts.map((_, j) => `r${j}`),
      rows: [
        pts.map((x, j): Cell => ({ key: `x${j}`, value: x, state: j === hl ? tone : undefined })),
        delta.map((d, j): Cell => ({ key: `d${j}`, value: d > 0 ? `+${d}` : d, state: j === hl ? tone : undefined })),
        run.map((v, j): Cell => ({ key: `o${j}`, value: v === undefined ? '?' : v, state: v === undefined ? 'dim' : j === hl ? 'found' : undefined })),
      ],
    };
  };
  const vars = (x: number | string) => ({ points: phase === 'raw' ? '—' : k, 'coordinate': x, overlap: cur, best });
  rec.push({ t: 'Start', d: `${iv.length} closed interval${iv.length > 1 ? 's' : ''} with coordinates up to ${Math.max(...iv.map(([, b]) => b)).toLocaleString('en-US')}. A difference array over the raw coordinates would be enormous, but only the endpoints matter.`, scene: grid(), v: vars('—'), why: 'The overlap count only changes at an interval start or just after an end, so every other coordinate can be ignored: compress to those points.', j: [0], p: [0], a: 0, tag: 'READY —', note: `${plural(iv.length, 'interval')}, largest end = ${Math.max(...iv.map(([, b]) => b)).toLocaleString('en-US')}` });
  phase = 'pts';
  rec.push({ t: `Compress: ${k} interesting coordinates`, d: `Collect each start a and each end + 1 (closed intervals stop counting right after b), sort and de-duplicate: ${pts.join(', ')}. They get ranks r0…r${k - 1}.`, scene: grid(), v: vars('—'), why: 'The sorted distinct points are the compressed axis; order is preserved so a sweep over ranks equals a sweep over coordinates.', j: [1, 2, 3, 4, 5], p: [1, 2], a: 1, tag: 'COMPRESS —', note: `pts = [${pts.join(', ')}] → ranks 0..${k - 1}` });
  iv.forEach(([a, b], i) => {
    delta[rank.get(a)!]++;
    delta[rank.get(b + 1)!]--;
    rec.push({ t: `Interval ${i} [${a}, ${b}]: +1 at r${rank.get(a)}, −1 at r${rank.get(b + 1)}`, d: `Mark the start (rank ${rank.get(a)}) with +1 and just past the end (rank ${rank.get(b + 1)}) with −1.`, scene: grid(rank.get(a)!, 'swap'), v: vars(a), why: 'A difference array records where coverage goes up or down; a running sum later turns it into the number of active intervals.', j: [6, 7], p: [3, 4, 5, 6], a: 2, tag: `INTERVAL ${i} —`, note: `delta[${rank.get(a)}]++; delta[${rank.get(b + 1)}]--` });
  });
  for (let j = 0; j < k; j++) {
    cur += delta[j];
    run[j] = cur;
    const better = cur > best;
    best = Math.max(best, cur);
    rec.push({ t: `Sweep r${j} (x = ${pts[j]}): overlap ${cur}`, d: `Running sum after adding ${delta[j] >= 0 ? '+' : ''}${delta[j]}: ${cur} interval${cur === 1 ? '' : 's'} cover x = ${pts[j]}${j + 1 < k ? ` up to ${pts[j + 1] - 1}` : ''}.${better ? ` New maximum ${best}.` : ''}`, scene: grid(j), v: vars(pts[j]), why: 'Between consecutive compressed points the count is constant, so checking one value per segment finds the global maximum.', tone: better ? 'success' : 'info', j: [8, 9], p: [7, 8, 9, 10], a: 3, tag: `SWEEP r${j} —`, note: `cur += ${delta[j]} → ${cur}; best = ${best}` });
  }
  rec.push({ t: `Maximum overlap = ${best}`, d: `Swept ${k} compressed points instead of ${(Math.max(...iv.map(([, b]) => b)) + 1).toLocaleString('en-US')} raw coordinates.`, scene: grid(), v: vars('—'), why: 'Work: O(n log n) to sort the 2n endpoints, O(n) for the sweep, independent of how large the coordinates are.', tone: 'success', j: [10], p: [11], a: 4, tag: '✅ Done!', note: `return ${best}`, result: { title: String(best), text: `At most ${best} interval${best === 1 ? '' : 's'} overlap at any point` } });
  return rec.steps;
}

export const maxOverlapWideIntervals: ProblemDef<IIn> = {
  slug: 'cp-maximum-overlap-of-wide-intervals', id: 'CP', title: 'Maximum Overlap of Wide Intervals', difficulty: 'Medium', category: 'Intervals', tag: 'compress endpoints + difference sweep',
  statement: 'Given closed intervals [start, end] whose coordinates can reach 10⁹, find the largest number of intervals that cover a common point. Do it without an array indexed by raw coordinates: compress the endpoints, build a difference array on the compressed axis and sweep.',
  constraints: 'n up to 10⁵ intervals, coordinates up to 10⁹ (animation input: 1–6 intervals, "start end" pairs separated by commas)',
  examples: [
    { label: '1 5, 3 1000000, 999999 2000000', input: { iv: [[1, 5], [3, 1000000], [999999, 2000000]] }, output: '2' },
    { label: '1 10, 2 3, 4 5, 6 7', input: { iv: [[1, 10], [2, 3], [4, 5], [6, 7]] }, output: '2' },
    { label: '5 5, 5 9, 1 5, 5 100000000', input: { iv: [[5, 5], [5, 9], [1, 5], [5, 100000000]] }, output: '4' },
  ],
  inputPlaceholder: 'e.g. 1 5, 3 1000000, 999999 2000000', parseInput: parseIv, buildSteps: buildOverlap, viz: 'cells', vizTitle: 'Compressed axis',
  legend: [{ label: 'Current compressed point', state: 'compare' }, { label: 'Delta being added', state: 'swap' }, { label: 'Overlap at the point', state: 'found' }, { label: 'Not swept yet', state: 'dim' }],
  varLabels: ['points', 'coordinate', 'overlap', 'best'],
  emphasis: ['closed intervals', 'largest number of intervals', 'compress the endpoints'],
  phases: [
    { icon: '📏', label: 'Phase 1: Coordinates too large', tone: 'blue' },
    { icon: '🗜', label: 'Phase 2: Compress endpoints', tone: 'cyan' },
    { icon: '±', label: 'Phase 3: +1 / −1 deltas', tone: 'orange' },
    { icon: '🧹', label: 'Phase 4: Sweep running sum', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Compress, then sweep', text: 'Coverage only changes at a start or at (end + 1). Gather those points, sort them, and give each a small rank. Add +1 / −1 at the ranks of each interval, then walk the ranks with a running sum; its maximum is the answer, whatever the size of the coordinates.' },
  java: [
    'public int maxOverlap(int[][] iv) {',
    '    TreeSet<Long> pts = new TreeSet<>();',
    '    for (int[] a : iv) { pts.add((long) a[0]); pts.add((long) a[1] + 1); }',
    '    Map<Long, Integer> rank = new HashMap<>();',
    '    int k = 0;',
    '    for (long x : pts) rank.put(x, k++);',
    '    int[] delta = new int[k];',
    '    for (int[] a : iv) { delta[rank.get((long) a[0])]++; delta[rank.get((long) a[1] + 1)]--; }',
    '    int cur = 0, best = 0;',
    '    for (int j = 0; j < k; j++) { cur += delta[j]; best = Math.max(best, cur); }',
    '    return best;',
    '}',
  ],
  python: [
    'def max_overlap(iv):',
    '    pts = sorted({x for a, b in iv for x in (a, b + 1)})',
    '    rank = {x: j for j, x in enumerate(pts)}',
    '    delta = [0] * len(pts)',
    '    for a, b in iv:',
    '        delta[rank[a]] += 1',
    '        delta[rank[b + 1]] -= 1',
    '    cur = best = 0',
    '    for d in delta:',
    '        cur += d',
    '        best = max(best, cur)',
    '    return best',
  ],
  algorithm: ['Raw coordinates are too large to index: keep only starts and end + 1', 'Sort the distinct points and give them ranks 0…k−1', 'Add +1 at the rank of each start and −1 at the rank of end + 1', 'Sweep the ranks with a running sum and keep the maximum', 'Return the maximum'],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'The function "number of intervals covering x" is piecewise constant and changes only at starts (+1) and at end + 1 (−1). The ranks keep these breakpoints in order, so a prefix sum over ranks equals that function on each segment, and the maximum over the 2n segments is the true maximum.',
};
