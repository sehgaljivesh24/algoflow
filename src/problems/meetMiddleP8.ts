/** Pack p8 meet-in-the-middle problems: Closest Subsequence Sum (#1755), Partition Array Into Two Arrays to Minimize Sum Difference (#2035), 4Sum II (#454). */
import type { Aux, Cell, ProblemDef, Scene, Step } from '../engine/types.ts';
import { Rec, arr, idx, int, nums as parseNums, parts, ptr } from './p8Kit.ts';

const subsets = (a: number[]) => {
  const out: { mask: number; sum: number; label: string }[] = [];
  for (let m = 0; m < 1 << a.length; m++) {
    const picked = a.filter((_, b) => (m >> b) & 1);
    out.push({ mask: m, sum: picked.reduce((x, y) => x + y, 0), label: `{${picked.join(',')}} = ${picked.reduce((x, y) => x + y, 0)}` });
  }
  return out;
};

/** Two sorted arrays side by side with a pointer each; `hot` highlights the pair under comparison. */
function twoLists(L: number[], R: number[], i: number, j: number, st: 'compare' | 'found' | 'dim' = 'compare'): Scene {
  const mk = (a: number[], at: number, tag: string): Cell[] => a.map((v, k) => ({ key: `${tag}${k}`, value: v, state: k === at ? (st === 'dim' ? undefined : st) : undefined }));
  return {
    kind: 'split',
    stack: true,
    parts: [
      { kind: 'array', cells: mk(L, i, 'l'), pointers: i >= 0 && i < L.length ? [ptr('i', 'i', i, 'blue')] : [] },
      { kind: 'array', cells: mk(R, j, 'r'), pointers: j >= 0 && j < R.length ? [ptr('j', 'j', j, 'orange')] : [] },
    ],
  };
}

/* -------------------------------------------------------------------- #1755 Closest Subsequence Sum */
interface CIn { nums: number[]; goal: number }

function parseClosest(raw: string): CIn {
  const [a, g] = parts(raw, 2, 'numbers ; goal, e.g. 5 -7 3 5 ; 6');
  return { nums: parseNums(a, { max: 8, lo: -20, hi: 20 }), goal: int(g, -50, 50, 'The goal') };
}

function buildClosest({ nums, goal }: CIn): Step[] {
  const rec = new Rec();
  const h = Math.floor(nums.length / 2);
  const left = nums.slice(0, h);
  const right = nums.slice(h);
  const lsub = subsets(left);
  const rsub = subsets(right);
  const L = lsub.map((s) => s.sum).sort((a, b) => a - b);
  const R = rsub.map((s) => s.sum).sort((a, b) => a - b);
  let best = Infinity;
  const vars = (i: number | string, j: number | string, s: number | string) => ({ i, j, sum: s, best: best === Infinity ? '—' : best });
  const halves = (): Scene => ({ kind: 'array', cells: nums.map((v, k) => ({ key: k, value: v })), pointers: [] });
  const auxL = (): Aux[] => [{ title: `left subsets (${lsub.length})`, kind: 'list', items: lsub.map((s) => s.label) }];
  const auxR = (): Aux[] => [{ title: `right subsets (${rsub.length})`, kind: 'list', items: rsub.map((s) => s.label) }];
  rec.push({ t: 'Start: split into two halves', d: `${nums.length} numbers: left half ${arr(left)} and right half ${arr(right)}. Trying all 2^${nums.length} = ${1 << nums.length} subsets is too many in general, but each half alone has only 2^${left.length} and 2^${right.length}.`, scene: halves(), v: vars('—', '—', '—'), why: 'Any subsequence is a subset of the left half plus a subset of the right half, so the combined problem splits into two small enumerations plus one merge.', j: [1], p: [1], a: 0, tag: 'SPLIT —', note: `h = ${nums.length} / 2 = ${h}; left = ${arr(left)}, right = ${arr(right)}` });
  rec.push({ t: `Enumerate the left half: ${L.length} subset sums`, d: `Each of the ${left.length} elements is in or out: sorted sums ${arr(L)}.`, scene: twoLists(L, [], -1, -1), aux: auxL(), v: vars('—', '—', '—'), why: 'Each element is either in or out, so a half of size k has 2^k sums; sorting them costs O(2^k · k).', j: [2, 3], p: [2], a: 1, tag: 'LEFT SUMS —', note: `L = ${arr(L)}  (2^${left.length} = ${L.length} sums)` });
  rec.push({ t: `Enumerate the right half: ${R.length} subset sums`, d: `Same for the right half: sorted sums ${arr(R)}. Now pick one from each list closest to ${goal}.`, scene: twoLists(L, R, -1, -1), aux: auxR(), v: vars('—', '—', '—'), why: 'Same for the right half. Now we need a pair (one sum from each list) whose total is closest to the goal.', j: [2, 3], p: [3], a: 1, tag: 'RIGHT SUMS —', note: `R = ${arr(R)}  (2^${right.length} = ${R.length} sums)` });
  let i = 0;
  let j = R.length - 1;
  while (i < L.length && j >= 0) {
    const s = L[i] + R[j];
    const diff = Math.abs(s - goal);
    const improved = diff < best;
    best = Math.min(best, diff);
    const dir = s < goal ? 'move i right (need a bigger sum)' : s > goal ? 'move j left (need a smaller sum)' : 'exact hit';
    rec.push({ t: `L[${i}] + R[${j}] = ${L[i]} + ${R[j]} = ${s}`, d: `|${s} − ${goal}| = ${diff}${improved ? ': new best.' : '.'} ${s < goal ? 'Too small:' : s > goal ? 'Too large:' : ''} ${dir}.`, scene: twoLists(L, R, i, j, s === goal ? 'found' : 'compare'), v: vars(i, j, s), why: s < goal ? 'L ascending: only a larger L[i] can help with this R[j], and a smaller R[j] would make it worse.' : s > goal ? 'R descending: no larger L[i] can help with this R[j], and any smaller R[j] is the only way to reduce the sum.' : 'The sum equals the goal exactly, so the distance 0 cannot be beaten.', tone: improved ? 'success' : 'info', j: [7, 8, s < goal ? 9 : s > goal ? 10 : 11], p: [7, 8, s < goal ? 9 : s > goal ? 11 : 13], a: 2, tag: `i=${i}, j=${j} —`, note: `s = ${L[i]} + ${R[j]} = ${s}; best = ${best}` });
    if (s === goal) break;
    if (s < goal) i++; else j--;
  }
  rec.push({ t: `Closest distance = ${best}`, d: `The two pointers met after at most ${L.length + R.length} steps, instead of comparing ${L.length * R.length} pairs.`, scene: twoLists(L, R, -1, -1), v: vars('—', '—', '—'), why: 'Each step discards a whole row or column of the pair table that cannot beat the current pointers, so the merge is O(2^(n/2)) after sorting.', tone: 'success', j: [13], p: [15], a: 3, tag: '✅ Done!', note: `return ${best}`, result: { title: String(best), text: `Smallest |subsequence sum − ${goal}| is ${best}` } });
  return rec.steps;
}

export const closestSubsequenceSum: ProblemDef<CIn> = {
  slug: '1755-closest-subsequence-sum', id: '1755', title: 'Closest Subsequence Sum', difficulty: 'Hard', category: 'Arrays', tag: 'meet in the middle + two pointers',
  statement: 'Given an integer array and a goal, choose a subsequence (possibly empty) so that the absolute difference between its sum and the goal is as small as possible, and return that difference.',
  constraints: '1 ≤ n ≤ 40 in the original (so 2^n is too big but 2^20 is fine); animation input: 1–8 values in [−20, 20], goal in [−50, 50]',
  examples: [
    { label: '[5,-7,3,5,8] ; 20', input: { nums: [5, -7, 3, 5, 8], goal: 20 }, output: '1' },
    { label: '[5,-7,3,5] ; 6', input: { nums: [5, -7, 3, 5], goal: 6 }, output: '0' },
    { label: '[7,-9,15,-2] ; -5', input: { nums: [7, -9, 15, -2], goal: -5 }, output: '1' },
    { label: '[1,2,3] ; -7', input: { nums: [1, 2, 3], goal: -7 }, output: '7' },
  ],
  inputPlaceholder: 'numbers ; goal   e.g. 5 -7 3 5 ; 6', parseInput: parseClosest, buildSteps: buildClosest, viz: 'cells', vizTitle: 'Left sums | right sums',
  legend: [{ label: 'Pair under comparison', state: 'compare' }, { label: 'Exact hit', state: 'found' }],
  varLabels: ['i', 'j', 'sum', 'best'],
  emphasis: ['subsequence', 'absolute difference', 'as small as possible'],
  phases: [
    { icon: '✂', label: 'Phase 1: Split into halves', tone: 'blue' },
    { icon: '📋', label: 'Phase 2: Enumerate + sort sums', tone: 'cyan' },
    { icon: '👉', label: 'Phase 3: Two-pointer merge', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Halve the exponent', text: 'Split the array in two. List every subset sum of each half (2^(n/2) each) and sort them. Now find one value from each list whose total is closest to the goal: walk i up the left list and j down the right list, moving whichever pointer fixes the error.' },
  java: [
    'public int minAbsDifference(int[] nums, int goal) {',
    '    int h = nums.length / 2;',
    '    int[] L = sums(nums, 0, h), R = sums(nums, h, nums.length);',
    '    Arrays.sort(L); Arrays.sort(R);',
    '    int best = Integer.MAX_VALUE;',
    '    int i = 0, j = R.length - 1;',
    '    while (i < L.length && j >= 0) {',
    '        int s = L[i] + R[j];',
    '        best = Math.min(best, Math.abs(s - goal));',
    '        if (s < goal) i++;',
    '        else if (s > goal) j--;',
    '        else return 0;',
    '    }',
    '    return best;',
    '}',
    '// all 2^k subset sums of nums[lo..hi)',
    'static int[] sums(int[] a, int lo, int hi) {',
    '    int k = hi - lo;',
    '    int[] out = new int[1 << k];',
    '    for (int mask = 0; mask < (1 << k); mask++)',
    '        for (int b = 0; b < k; b++)',
    '            if ((mask >> b & 1) == 1) out[mask] += a[lo + b];',
    '    return out;',
    '}',
  ],
  python: [
    'def min_abs_difference(nums, goal):',
    '    h = len(nums) // 2',
    '    L = sorted(subset_sums(nums[:h]))',
    '    R = sorted(subset_sums(nums[h:]))',
    "    best = float('inf')",
    '    i, j = 0, len(R) - 1',
    '    while i < len(L) and j >= 0:',
    '        s = L[i] + R[j]',
    '        best = min(best, abs(s - goal))',
    '        if s < goal:',
    '            i += 1',
    '        elif s > goal:',
    '            j -= 1',
    '        else:',
    '            return 0',
    '    return best',
    '',
    'def subset_sums(a):',
    '    sums = [0]',
    '    for x in a:',
    '        sums += [s + x for s in sums]',
    '    return sums',
  ],
  algorithm: ['Split the array into a left and a right half', 'List and sort all subset sums of each half (2^(n/2) each)', 'Two pointers (i at the smallest left sum, j at the largest right sum): below the goal move i right, above move j left; track the best distance', 'Return the best distance'],
  complexity: [{ label: 'Time', value: 'O(2^(n/2) · n)' }, { label: 'Space', value: 'O(2^(n/2))' }],
  why: 'Every subsequence splits uniquely into a left subset and a right subset, so the best total is the best pair (x ∈ L, y ∈ R). With both lists sorted, if L[i] + R[j] < goal then pairing L[i] with any smaller R value is worse, so L[i] is exhausted and i can advance; symmetrically j can retreat when the sum is too large. Every pair that could be optimal is therefore visited or dominated.',
};

/* -------------------------------------------------- #2035 Partition Array Into Two Arrays */
interface PIn { nums: number[] }

function parsePartition(raw: string): PIn {
  const nums = parseNums(raw, { min: 2, max: 8, lo: -15, hi: 15 });
  if (nums.length % 2 !== 0) throw new Error('Enter an even number of values (2n values, n ≤ 4): the array is split into two arrays of n values each');
  return { nums };
}

function buildPartition({ nums }: PIn): Step[] {
  const rec = new Rec();
  const n = nums.length / 2;
  const total = nums.reduce((a, b) => a + b, 0);
  const A = nums.slice(0, n);
  const B = nums.slice(n);
  const bySize = (a: number[]) => Array.from({ length: a.length + 1 }, (_, k) => subsets(a).filter((s) => bitCount(s.mask) === k).map((s) => s.sum).sort((x, y) => x - y));
  const L = bySize(A);
  const R = bySize(B);
  let best = Infinity;
  const vars = (k: number | string, i: number | string, j: number | string, s: number | string) => ({ k, i, j, sum: s, best: best === Infinity ? '—' : best });
  const auxB = (): Aux[] => [{ title: 'closest to half so far', kind: 'list', items: best === Infinity ? [] : [`|total − 2·sum| = ${best}`] }];
  rec.push({ t: 'Start', d: `Split ${arr(nums)} (sum ${total}) into two arrays of ${n} with sums as close as possible: left half ${arr(A)}, right half ${arr(B)}, C(${2 * n}, ${n}) = ${choose(2 * n, n)} splits.`, scene: { kind: 'array', cells: nums.map((v, k) => ({ key: k, value: v })), pointers: [] }, aux: auxB(), v: vars('—', '—', '—', '—'), why: 'The first array\'s sum is S, the second is total − S, so the difference is |total − 2S|: we want S as close to total / 2 as possible, using exactly n elements.', j: [1], p: [1], a: 0, tag: 'SPLIT —', note: `n = ${n}, total = ${total}, left = ${arr(A)}, right = ${arr(B)}` });
  rec.push({ t: 'Group subset sums by size', d: `Sums of all k-element subsets of each half: left ${A.length}-element halves give ${L.map((x, k) => `k=${k}: ${arr(x)}`).join('; ')}.`, scene: twoLists(L[0], R[n], -1, -1), v: vars('—', '—', '—', '—'), why: 'The first array must contain exactly n elements: if it takes k from the left half it must take n − k from the right half, so only matching sizes are paired.', j: [2], p: [2], a: 0, tag: 'GROUP BY SIZE —', note: `L[0..${n}] and R[0..${n}] = sums of the k-element subsets` });
  for (let k = 0; k <= n; k++) {
    const a = L[k];
    const b = R[n - k];
    rec.push({ t: `k = ${k}: ${k} from the left, ${n - k} from the right`, d: `Left sums (${k} elements): ${arr(a)}. Right sums (${n - k} elements): ${arr(b)}. Two pointers search for a + b closest to ${total / 2}.`, scene: twoLists(a, b, 0, b.length - 1), aux: auxB(), v: vars(k, 0, b.length - 1, '—'), why: 'Within one k the two lists are sorted, so the same two-pointer merge as before applies.', j: [4, 5, 6, 7], p: [4, 5, 6], a: 1, tag: `k = ${k} —`, note: `a = L[${k}], b = R[${n - k}]; i = 0, j = ${b.length - 1}` });
    let i = 0;
    let j = b.length - 1;
    while (i < a.length && j >= 0) {
      const s = a[i] + b[j];
      const diff = Math.abs(total - 2 * s);
      const improved = diff < best;
      best = Math.min(best, diff);
      rec.push({ t: `k=${k}: ${a[i]} + ${b[j]} = ${s}`, d: `Difference of the two arrays would be |${total} − 2·${s}| = ${diff}${improved ? ' (new best)' : ''}. ${2 * s < total ? '2·sum < total: take a larger left value, i++.' : 'sum is not below half: take a smaller right value, j−−.'}`, scene: twoLists(a, b, i, j), aux: auxB(), v: vars(k, i, j, s), why: 'If 2s < total the first array is too light, so a bigger left value is needed; otherwise it is too heavy and a smaller right value is needed.', tone: improved ? 'success' : 'info', j: [8, 9, 10, 11], p: [7, 8, 9, 10, 12, 13], a: 2, tag: `k=${k} PAIR —`, note: `s = ${a[i]} + ${b[j]} = ${s}; |${total} - 2*${s}| = ${diff}; best = ${best}` });
      if (2 * s < total) i++; else j--;
    }
  }
  rec.push({ t: `Minimum difference = ${best}`, d: `All ${n + 1} size groups merged.`, scene: twoLists(L[0], R[n], -1, -1), aux: auxB(), v: vars('—', '—', '—', '—'), why: 'Total cost: enumerating 2^n subsets per half (instead of C(2n, n) full splits) and a linear merge per size.', tone: 'success', j: [14], p: [14], a: 3, tag: '✅ Done!', note: `return ${best}`, result: { title: String(best), text: `Smallest possible difference of the two sums: ${best}` } });
  return rec.steps;
}
const bitCount = (x: number) => x.toString(2).split('1').length - 1;
const choose = (a: number, b: number) => { let r = 1; for (let i = 1; i <= b; i++) r = (r * (a - b + i)) / i; return Math.round(r); };

export const minimizeSumDifference: ProblemDef<PIn> = {
  slug: '2035-partition-array-into-two-arrays-to-minimize-sum-difference', id: '2035', title: 'Partition Array Into Two Arrays to Minimize Sum Difference', difficulty: 'Hard', category: 'Arrays', tag: 'meet in the middle by subset size',
  statement: 'An array has 2n integers. Partition it into two arrays of length n each so that the absolute difference of their sums is as small as possible, and return that difference.',
  constraints: '1 ≤ n ≤ 15 in the original; animation input: 2–8 values (n ≤ 4) between −15 and 15',
  examples: [
    { label: '[3,9,7,3]', input: { nums: [3, 9, 7, 3] }, output: '2' },
    { label: '[-12,12]', input: { nums: [-12, 12] }, output: '24' },
    { label: '[2,-1,0,4,-2,-9]', input: { nums: [2, -1, 0, 4, -2, -9] }, output: '0' },
  ],
  inputPlaceholder: 'e.g. 3 9 7 3  (an even number of values)', parseInput: parsePartition, buildSteps: buildPartition, viz: 'cells', vizTitle: 'Left sums of size k | right sums of size n − k',
  legend: [{ label: 'Pair under comparison', state: 'compare' }],
  varLabels: ['k', 'i', 'j', 'sum', 'best'],
  emphasis: ['2n integers', 'two arrays of length n', 'as small as possible'],
  phases: [
    { icon: '✂', label: 'Phase 1: Split + group by size', tone: 'blue' },
    { icon: '🔢', label: 'Phase 2: Pair k with n − k', tone: 'cyan' },
    { icon: '👉', label: 'Phase 3: Two pointers to total / 2', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Pair subsets from two halves, by size', text: 'The first array takes some k elements of the left half and exactly n − k of the right half. For each k, list the sums of the k-element left subsets and (n − k)-element right subsets, sort them, and use two pointers to find a pair whose total is closest to half of the grand total.' },
  java: [
    'public int minimumDifference(int[] nums) {',
    '    int n = nums.length / 2, total = Arrays.stream(nums).sum();',
    '    List<Integer>[] L = bySize(nums, 0, n), R = bySize(nums, n, 2 * n);   // sums of the k-element subsets',
    '    int best = Integer.MAX_VALUE;',
    '    for (int k = 0; k <= n; k++) {',
    '        List<Integer> a = L[k], b = R[n - k];',
    '        Collections.sort(a); Collections.sort(b);',
    '        int i = 0, j = b.size() - 1;',
    '        while (i < a.size() && j >= 0) {',
    '            int s = a.get(i) + b.get(j);',
    '            best = Math.min(best, Math.abs(total - 2 * s));',
    '            if (2 * s < total) i++; else j--;',
    '        }',
    '    }',
    '    return best;',
    '}',
    '// by[k] = sums of all k-element subsets of nums[lo..hi)',
    'static List<Integer>[] bySize(int[] a, int lo, int hi) {',
    '    int k = hi - lo;',
    '    List<Integer>[] by = new List[k + 1];',
    '    for (int c = 0; c <= k; c++) by[c] = new ArrayList<>();',
    '    for (int mask = 0; mask < (1 << k); mask++) {',
    '        int sum = 0;',
    '        for (int b = 0; b < k; b++)',
    '            if ((mask >> b & 1) == 1) sum += a[lo + b];',
    '        by[Integer.bitCount(mask)].add(sum);',
    '    }',
    '    return by;',
    '}',
  ],
  python: [
    'def minimum_difference(nums):',
    '    n, total = len(nums) // 2, sum(nums)',
    '    L, R = by_size(nums[:n]), by_size(nums[n:])   # by_size(a)[k] = sums of the k-element subsets',
    "    best = float('inf')",
    '    for k in range(n + 1):',
    '        a, b = sorted(L[k]), sorted(R[n - k])',
    '        i, j = 0, len(b) - 1',
    '        while i < len(a) and j >= 0:',
    '            s = a[i] + b[j]',
    '            best = min(best, abs(total - 2 * s))',
    '            if 2 * s < total:',
    '                i += 1',
    '            else:',
    '                j -= 1',
    '    return best',
    '',
    'def by_size(a):                                   # by_size(a)[k] = sums of all k-element subsets of a',
    '    k = len(a)',
    '    by = [[] for _ in range(k + 1)]',
    '    for mask in range(1 << k):',
    "        by[bin(mask).count('1')].append(sum(a[b] for b in range(k) if mask >> b & 1))",
    '    return by',
  ],
  algorithm: ['Split into two halves of n elements; group each half\'s subset sums by subset size', 'For k = 0…n pair k-element left sums with (n − k)-element right sums', 'Sort both lists and run two pointers aiming at total / 2', 'Track the smallest |total − 2·sum|'],
  complexity: [{ label: 'Time', value: 'O(2^n · n)' }, { label: 'Space', value: 'O(2^n)' }],
  why: 'A valid first array is exactly: k elements of the left half plus n − k of the right half, for some k. Its sum is a + b with a from the size-k left sums and b from the size-(n − k) right sums, and the difference is |total − 2(a + b)|. For each k the two-pointer argument from the previous example finds the pair closest to total / 2, and taking the best over k covers every valid partition.',
};

/* ------------------------------------------------------------------------------ #454 4Sum II */
interface FIn { a: number[]; b: number[]; c: number[]; d: number[] }

function parseFour(raw: string): FIn {
  const ps = parts(raw, 4, 'four lists separated by semicolons, e.g. 1 2 ; -2 -1 ; -1 2 ; 0 2');
  const [a, b, c, d] = ps.map((p) => parseNums(p, { max: 4, lo: -5, hi: 5, what: 'values' }));
  if (new Set([a.length, b.length, c.length, d.length]).size !== 1) throw new Error('All four lists must have the same length');
  return { a, b, c, d };
}

function buildFour({ a, b, c, d }: FIn): Step[] {
  const rec = new Rec();
  const n = a.length;
  const ab = new Map<number, number>();
  let count = 0;
  const hl = { a: -1, b: -1, c: -1, d: -1 };
  const grid = () => ({
    kind: 'grid' as const, variant: 'table' as const, rowHeads: ['A', 'B', 'C', 'D'], colHeads: idx(n),
    rows: ([['a', a], ['b', b], ['c', c], ['d', d]] as const).map(([key, v]) => v.map((x, i): Cell => ({ key: `${key}${i}`, value: x, state: hl[key] === i ? 'compare' : undefined, tone: key < 'c' ? ('blue' as const) : ('orange' as const) }))),
  });
  const aux = (): Aux[] => [{ title: 'A+B sums → how many pairs', kind: 'map', items: [...ab.entries()].sort((x, y) => x[0] - y[0]).map(([k, v]) => `${k} → ${v}`) }];
  const vars = (s: number | string, need: number | string) => ({ sum: s, 'need (−(c+d))': need, count });
  rec.push({ t: 'Start: two halves A+B and C+D', d: `Count quadruples (i, j, k, l) with A[i] + B[j] + C[k] + D[l] = 0. Brute force tries ${n ** 4}; meeting in the middle tries ${n * n} + ${n * n}.`, scene: grid(), aux: aux(), v: vars('—', '—'), why: 'a + b + c + d = 0 is the same as a + b = −(c + d): each side involves only two lists, so each side has n² possibilities instead of n⁴ together.', j: [0], p: [0], a: 0, tag: 'REWRITE —', note: `a + b = −(c + d): ${n * n} sums on each side` });
  a.forEach((x, i) => {
    hl.a = i;
    for (let j = 0; j < n; j++) ab.set(x + b[j], (ab.get(x + b[j]) ?? 0) + 1);
    rec.push({ t: `Add A[${i}] + every B: ${b.map((y) => x + y).join(', ')}`, d: `A[${i}] = ${x} is paired with each B value; each sum is counted in the map.`, scene: grid(), aux: aux(), v: vars(x, '—'), why: 'The map remembers how many (a, b) pairs make each sum.', j: [2, 3], p: [1], a: 1, tag: `A[${i}] = ${x} —`, note: `ab.merge(${x} + b, 1) for b in B → sums ${b.map((y) => x + y).join(', ')}` });
  });
  hl.a = -1;
  c.forEach((x, i) => {
    for (let j = 0; j < n; j++) {
      const need = -(x + d[j]);
      const found = ab.get(need) ?? 0;
      count += found;
      hl.c = i;
      hl.d = j;
      rec.push({ t: `C[${i}] + D[${j}] = ${x + d[j]}: need A+B = ${need}`, d: found ? `${found} pair${found > 1 ? 's' : ''} of A+B equal ${need}, so ${found} quadruple${found > 1 ? 's' : ''} found. Count = ${count}.` : `No pair of A+B equals ${need}. Count stays ${count}.`, scene: grid(), aux: aux(), v: vars(x + d[j], need), why: 'Each (c, d) pair finds all matching (a, b) pairs in O(1) through the map.', tone: found ? 'success' : 'info', j: [5, 6], p: [3, 4, 5], a: 2, tag: `C[${i}] + D[${j}] —`, note: `count += ab.getOrDefault(${need}, 0) = ${found} → count = ${count}` });
    }
  });
  hl.c = hl.d = -1;
  rec.push({ t: `Number of quadruples = ${count}`, d: `${n * n} lookups against ${n * n} stored sums.`, scene: grid(), aux: aux(), v: vars('—', '—'), why: 'O(n²) time and space instead of O(n⁴).', tone: 'success', j: [7], p: [6], a: 3, tag: '✅ Done!', note: `return ${count}`, result: { title: String(count), text: `${count} quadruple${count === 1 ? '' : 's'} sum to zero` } });
  return rec.steps;
}

export const fourSumII: ProblemDef<FIn> = {
  slug: '454-4sum-ii', id: '454', title: '4Sum II', difficulty: 'Medium', category: 'Arrays', tag: 'meet in the middle + hash map',
  statement: 'Given four integer arrays A, B, C, D of the same length, count the tuples (i, j, k, l) such that A[i] + B[j] + C[k] + D[l] = 0.',
  constraints: 'n ≤ 200 in the original (animation input: four lists of 1–4 values between −5 and 5, separated by semicolons)',
  examples: [
    { label: '[1,2] [-2,-1] [-1,2] [0,2]', input: { a: [1, 2], b: [-2, -1], c: [-1, 2], d: [0, 2] }, output: '2' },
    { label: '[0] [0] [0] [0]', input: { a: [0], b: [0], c: [0], d: [0] }, output: '1' },
    { label: 'four lists of 3', input: { a: [-1, 0, 1], b: [-1, 0, 1], c: [1, 0, 2], d: [-2, 0, 1] }, output: '15' },
  ],
  inputPlaceholder: 'A ; B ; C ; D   e.g. 1 2 ; -2 -1 ; -1 2 ; 0 2', parseInput: parseFour, buildSteps: buildFour, viz: 'cells', vizTitle: 'The four arrays',
  legend: [{ label: 'Element being combined', state: 'compare' }],
  varLabels: ['sum', 'need (−(c+d))', 'count'],
  emphasis: ['four integer arrays', 'count the tuples'],
  phases: [
    { icon: '✏', label: 'Phase 1: Rewrite a + b = −(c + d)', tone: 'blue' },
    { icon: '🗺', label: 'Phase 2: Count sums a + b', tone: 'cyan' },
    { icon: '🔎', label: 'Phase 3: Look up −(c + d)', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Meet in the middle with a map', text: 'Rewrite a + b + c + d = 0 as a + b = −(c + d). Count every sum a + b in a hash map, then for every pair (c, d) add the number of stored pairs equal to −(c + d). Two n² passes replace n⁴.' },
  java: [
    'public int fourSumCount(int[] A, int[] B, int[] C, int[] D) {',
    '    Map<Integer, Integer> ab = new HashMap<>();',
    '    for (int a : A)',
    '        for (int b : B) ab.merge(a + b, 1, Integer::sum);',
    '    int count = 0;',
    '    for (int c : C)',
    '        for (int d : D) count += ab.getOrDefault(-(c + d), 0);',
    '    return count;',
    '}',
  ],
  python: [
    'def four_sum_count(A, B, C, D):',
    '    ab = Counter(a + b for a in A for b in B)',
    '    count = 0',
    '    for c in C:',
    '        for d in D:',
    '            count += ab[-(c + d)]',
    '    return count',
  ],
  algorithm: ['Rewrite the condition as a + b = −(c + d)', 'Count all n² sums a + b in a hash map', 'For every (c, d) look up −(c + d) and add its count', 'Return the total'],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(n²)' }],
  why: 'A quadruple is zero-sum exactly when its (a, b) half sums to the negative of its (c, d) half. The map stores, for every value s, how many (a, b) pairs sum to s, so each (c, d) pair contributes precisely the number of completing (a, b) pairs; summing over all (c, d) counts every quadruple once.',
};
