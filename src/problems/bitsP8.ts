/** Pack p8 bit-manipulation problems: XOR Queries of a Subarray (#1310), Total Hamming Distance (#477), Largest Combination With AND > 0 (#2275). */
import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { bitHeads, bitRow } from './ssbShared.ts';
import { Rec, arr, idx, nums as parseNums, parts } from './p8Kit.ts';

/* ------------------------------------------------------------ #1310 XOR Queries of a Subarray */
interface QIn { arr: number[]; queries: [number, number][] }

function parseQ(raw: string): QIn {
  const [a, q] = parts(raw, 2, 'values ; queries, e.g. 1 3 4 8 ; 0 1, 1 2, 3 3');
  const values = parseNums(a, { max: 8, lo: 1, hi: 31, what: 'values' });
  const queries = q.split(',').map((t) => t.trim()).filter(Boolean).map((t) => {
    const p = t.split(/\s+/).map(Number);
    if (p.length !== 2 || p.some((x) => !Number.isInteger(x))) throw new Error('Each query is two indexes "l r", separated by commas');
    if (p[0] < 0 || p[1] < p[0] || p[1] >= values.length) throw new Error(`Each query needs 0 ≤ l ≤ r < ${values.length}`);
    return [p[0], p[1]] as [number, number];
  });
  if (queries.length < 1 || queries.length > 4) throw new Error('Give between 1 and 4 queries');
  return { arr: values, queries };
}

function buildQ({ arr: a, queries }: QIn): Step[] {
  const n = a.length;
  const rec = new Rec();
  const pre: number[] = [0];
  const answers: number[] = [];
  const table = (filled: number, marks: Record<number, 'compare' | 'found'> = {}, arrHl = -1) => {
    const top: Cell[] = [{ key: 'a0', value: '·', state: 'dim' }, ...a.map((v, i) => ({ key: `a${i + 1}`, value: v, state: i + 1 === arrHl ? ('swap' as const) : undefined }))];
    const bot: Cell[] = Array.from({ length: n + 1 }, (_, j) => ({ key: `p${j}`, value: j < filled ? pre[j] : '?', state: j < filled ? marks[j] : ('dim' as const) }));
    return { kind: 'grid' as const, variant: 'table' as const, rows: [top, bot], rowHeads: ['arr[j-1]', 'prefix[j]'], colHeads: idx(n + 1) };
  };
  const auxA = () => [{ title: 'answers', kind: 'list' as const, items: answers.map(String) }];
  const vars = (j: number | string, q: number | string, l: number | string, r: number | string) => ({ j, 'prefix[j]': typeof j === 'number' ? pre[j] ?? '—' : '—', query: q, l, r });
  rec.push({ t: 'Start', d: `Answering ${queries.length} range-XOR ${queries.length === 1 ? 'query' : 'queries'} over ${arr(a)}. A prefix XOR array makes every query a single XOR.`, scene: table(1), aux: auxA(), v: vars(0, '—', '—', '—'), why: 'XOR is its own inverse, so prefix[r+1] ^ prefix[l] cancels everything before l and leaves only arr[l..r].', j: [1, 2], p: [1], a: 0, tag: 'READY —', note: 'prefix[0] = 0' });
  for (let j = 1; j <= n; j++) {
    pre.push(pre[j - 1] ^ a[j - 1]);
    rec.push({ t: `prefix[${j}] = prefix[${j - 1}] ^ arr[${j - 1}]`, d: `${pre[j - 1]} ^ ${a[j - 1]} = ${pre[j]} (${pre[j - 1].toString(2).padStart(5, '0')} ^ ${a[j - 1].toString(2).padStart(5, '0')} = ${pre[j].toString(2).padStart(5, '0')})`, scene: table(j + 1, { [j]: 'found', [j - 1]: 'compare' }, j), aux: auxA(), v: vars(j, '—', '—', '—'), why: 'Each prefix entry extends the previous one by one element, so the whole table costs O(n).', j: [3], p: [2, 3], a: 1, tag: 'BUILD —', note: `prefix[${j}] = ${pre[j - 1]} ^ ${a[j - 1]} = ${pre[j]}` });
  }
  queries.forEach(([l, r], q) => {
    const ans = pre[r + 1] ^ pre[l];
    answers.push(ans);
    rec.push({ t: `Query ${q}: [${l}, ${r}]`, d: `prefix[${r + 1}] ^ prefix[${l}] = ${pre[r + 1]} ^ ${pre[l]} = ${ans}. Elements before index ${l} appear in both prefixes and cancel.`, scene: table(n + 1, { [r + 1]: 'found', [l]: 'compare' }), aux: auxA(), v: vars('—', q, l, r), why: 'A value XOR-ed twice vanishes, so the shared prefix drops out and only the queried slice is left.', tone: 'success', j: [5, 6, 7], p: [5, 6], a: 2, tag: `QUERY [${l}, ${r}] —`, note: `ans[${q}] = prefix[${r + 1}] ^ prefix[${l}] = ${pre[r + 1]} ^ ${pre[l]} = ${ans}` });
  });
  rec.push({ t: `Answers: ${arr(answers)}`, d: `Every query was answered in O(1) after one linear pass: ${arr(answers)}.`, scene: table(n + 1), aux: auxA(), v: vars('—', '—', '—', '—'), why: 'Preprocessing costs O(n); each query afterwards costs O(1).', tone: 'success', j: [9], p: [7], a: 3, result: { title: arr(answers), text: `Query answers: ${arr(answers)}` }, tag: '✅ Done!', note: `return ${arr(answers)}` });
  return rec.steps;
}

export const xorQueriesOfASubarray: ProblemDef<QIn> = {
  slug: '1310-xor-queries-of-a-subarray', id: '1310', title: 'XOR Queries of a Subarray', difficulty: 'Medium', category: 'Bit Manipulation', tag: 'prefix XOR',
  statement: 'Given an array of positive integers and a list of queries [l, r], return for every query the XOR of arr[l], arr[l+1], …, arr[r].',
  constraints: '1 ≤ arr.length, queries.length ≤ 3·10⁴ (animation input: at most 8 values between 1 and 31 and 4 queries)',
  examples: [
    { label: '[1,3,4,8] with 4 queries', input: { arr: [1, 3, 4, 8], queries: [[0, 1], [1, 2], [0, 3], [3, 3]] }, output: '[2,7,14,8]' },
    { label: '[4,8,2,10]', input: { arr: [4, 8, 2, 10], queries: [[2, 3], [1, 3], [0, 0], [0, 3]] }, output: '[8,0,4,4]' },
    { label: 'single query', input: { arr: [5, 9, 12, 7, 3], queries: [[1, 3]] }, output: '[2]' },
  ],
  inputPlaceholder: 'e.g. 1 3 4 8 ; 0 1, 1 2, 0 3, 3 3',
  parseInput: parseQ, buildSteps: buildQ, viz: 'cells', vizTitle: 'Prefix XOR table',
  legend: [{ label: 'Prefix at the right end of the query', state: 'found' }, { label: 'Prefix at the left end (to cancel)', state: 'compare' }, { label: 'Element being folded in', state: 'swap' }, { label: 'Not computed yet', state: 'dim' }],
  varLabels: ['j', 'prefix[j]', 'query', 'l', 'r'],
  emphasis: ['XOR', 'queries'],
  phases: [
    { icon: '🏁', label: 'Phase 1: Start prefix[0] = 0', tone: 'blue' },
    { icon: '🔨', label: 'Phase 2: Build prefix XOR', tone: 'cyan' },
    { icon: '❓', label: 'Phase 3: Answer queries', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Prefix XOR', text: 'Just as prefix sums turn range sums into a subtraction, prefix XORs turn range XORs into one XOR: prefix[r+1] ^ prefix[l]. Build the array once, answer each query instantly.' },
  java: [
    'public int[] xorQueries(int[] arr, int[][] queries) {',
    '    int n = arr.length;',
    '    int[] prefix = new int[n + 1];',
    '    for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] ^ arr[i];',
    '    int[] ans = new int[queries.length];',
    '    for (int q = 0; q < queries.length; q++) {',
    '        int l = queries[q][0], r = queries[q][1];',
    '        ans[q] = prefix[r + 1] ^ prefix[l];',
    '    }',
    '    return ans;',
    '}',
  ],
  python: [
    'def xor_queries(arr, queries):',
    '    prefix = [0]',
    '    for x in arr:',
    '        prefix.append(prefix[-1] ^ x)',
    '    ans = []',
    '    for l, r in queries:',
    '        ans.append(prefix[r + 1] ^ prefix[l])',
    '    return ans',
  ],
  algorithm: ['Start with prefix[0] = 0', 'Extend: prefix[i+1] = prefix[i] ^ arr[i]', 'For a query [l, r] answer prefix[r+1] ^ prefix[l]', 'Return the answers'],
  complexity: [{ label: 'Time', value: 'O(n + q)' }, { label: 'Space', value: 'O(n)' }],
  why: 'prefix[k] is arr[0] ^ … ^ arr[k-1]. XOR-ing prefix[r+1] with prefix[l] contains every element before l twice (which cancels, since x ^ x = 0) and every element in [l, r] exactly once.',
};

/* ------------------------------------------------- shared grid for the bit-column problems */
const W = 6;

function columnGrid(values: number[], hl: number, ones: (number | undefined)[], foot: { head: string; cells: (number | undefined)[] }[], width = W) {
  const rows: Cell[][] = values.map((v) => bitRow(v, width, undefined, (c) => (c === width - 1 - hl ? 'compare' : undefined)));
  const rowHeads = values.map(String);
  const mk = (cells: (number | undefined)[], tone: 'found' | 'active') => cells.map((x, c) => ({ key: c, value: x === undefined ? '·' : x, state: x === undefined ? ('dim' as const) : c === width - 1 - hl ? tone : undefined }));
  rows.push(mk(ones.slice().reverse(), 'found'));
  rowHeads.push('ones');
  for (const f of foot) {
    rows.push(mk(f.cells.slice().reverse(), 'active'));
    rowHeads.push(f.head);
  }
  return { kind: 'grid' as const, variant: 'table' as const, rows, rowHeads, colHeads: bitHeads(width) };
}

/* ----------------------------------------------------------------- #477 Total Hamming Distance */
interface NIn { nums: number[] }
const W4 = 4;

function parse477(raw: string): NIn { return { nums: parseNums(raw, { min: 2, max: 6, lo: 0, hi: 15 }) }; }

function build477({ nums }: NIn): Step[] {
  const n = nums.length;
  const rec = new Rec();
  const ones: (number | undefined)[] = Array(W4).fill(undefined);
  const pairs: (number | undefined)[] = Array(W4).fill(undefined);
  let total = 0;
  const g = (hl: number) => columnGrid(nums, hl, ones, [{ head: 'ones×zeros', cells: pairs }], W4);
  const vars = (bit: number | string, o: number | string, p: number | string) => ({ bit, ones: o, zeros: typeof o === 'number' ? n - o : '—', 'pairs': p, total });
  rec.push({ t: 'Start', d: `Sum the Hamming distance over all ${(n * (n - 1)) / 2} pairs of ${n} numbers. Instead of comparing pairs, look at one bit column at a time.`, scene: g(-1), v: vars('—', '—', '—'), why: 'In one column a pair differs exactly when one number has a 1 and the other a 0, so the column contributes ones × zeros.', j: [0, 1], p: [0, 1], a: 0, tag: 'READY —', note: `total = 0, n = ${n}` });
  for (let b = 0; b < W4; b++) {
    const o = nums.filter((x) => (x >> b) & 1).length;
    ones[b] = o;
    rec.push({ t: `Bit ${b}: count the ones`, d: `${o} of the ${n} numbers have bit ${b} set, so ${n - o} have it clear.`, scene: g(b), v: vars(b, o, '—'), why: 'Columns are independent, so each one is counted on its own in O(n).', j: [3, 4], p: [3], a: 1, tag: `BIT ${b} — COUNT`, note: `ones = ${o}, zeros = ${n - o}` });
    pairs[b] = o * (n - o);
    total += pairs[b]!;
    rec.push({ t: `Bit ${b}: ${o} × ${n - o} = ${pairs[b]} differing pairs`, d: `Every 1 pairs with every 0 here (${o} × ${n - o}): total is now ${total}.`, scene: g(b), v: vars(b, o, pairs[b]!), why: 'Each differing pair is counted once per column in which it differs, which is precisely what Hamming distance sums.', tone: 'success', j: [5], p: [4], a: 2, tag: `BIT ${b} — PAIRS`, note: `total += ${o} * ${n - o} → ${total}` });
  }
  rec.push({ t: `Total Hamming distance = ${total}`, d: `All ${W4} columns added up: total = ${total}.`, scene: g(-1), v: vars('—', '—', '—'), why: 'O(32·n) instead of O(n²) pair comparisons.', tone: 'success', j: [7], p: [5], a: 3, tag: '✅ Done!', note: `return ${total}`, result: { title: String(total), text: `Sum of pairwise Hamming distances: ${total}` } });
  return rec.steps;
}

export const totalHammingDistance: ProblemDef<NIn> = {
  slug: '477-total-hamming-distance', id: '477', title: 'Total Hamming Distance', difficulty: 'Medium', category: 'Bit Manipulation', tag: 'count ones per bit column',
  statement: 'The Hamming distance of two integers is the number of bit positions where they differ. Return the sum of the Hamming distances over all pairs of numbers in the array.',
  constraints: '1 ≤ n ≤ 10⁴, 0 ≤ nums[i] ≤ 10⁹ (animation input: 2–6 values between 0 and 15, shown as 4 bits)',
  examples: [
    { label: '[4,14,2]', input: { nums: [4, 14, 2] }, output: '6' },
    { label: '[5,5,5]', input: { nums: [5, 5, 5] }, output: '0' },
    { label: '[1,7,8,12]', input: { nums: [1, 7, 8, 12] }, output: '15' },
  ],
  inputPlaceholder: 'e.g. 4 14 2', parseInput: parse477, buildSteps: build477, viz: 'cells', vizTitle: 'Bit columns',
  legend: [{ label: 'Bit column being counted', state: 'compare' }, { label: 'Ones in the column', state: 'found' }, { label: 'Pairs that differ in the column', state: 'active' }, { label: 'Not counted yet', state: 'dim' }],
  varLabels: ['bit', 'ones', 'zeros', 'pairs', 'total'],
  emphasis: ['Hamming distance', 'sum', 'all pairs'],
  phases: [
    { icon: '🧱', label: 'Phase 1: One column at a time', tone: 'blue' },
    { icon: '🔢', label: 'Phase 2: Count ones', tone: 'cyan' },
    { icon: '✖', label: 'Phase 3: ones × zeros', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Count per column, not per pair', text: 'Comparing every pair is O(n²). Rotate the view: in each bit column, a pair differs exactly when one number has a 1 and the other a 0, so the column adds ones × zeros. Sum over the columns.' },
  java: [
    'public int totalHammingDistance(int[] nums) {',
    '    int total = 0, n = nums.length;',
    '    for (int bit = 0; bit < 32; bit++) {',
    '        int ones = 0;',
    '        for (int x : nums) ones += (x >> bit) & 1;',
    '        total += ones * (n - ones);',
    '    }',
    '    return total;',
    '}',
  ],
  python: [
    'def total_hamming_distance(nums):',
    '    total, n = 0, len(nums)',
    '    for bit in range(32):',
    '        ones = sum((x >> bit) & 1 for x in nums)',
    '        total += ones * (n - ones)',
    '    return total',
  ],
  algorithm: ['Treat every bit position as an independent column', 'Count the numbers with a 1 in the column', 'Add ones × zeros (the pairs that differ here)', 'Return the total over all columns'],
  complexity: [{ label: 'Time', value: 'O(32·n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Hamming distance of a pair is a sum over bit positions of [bits differ]. Swapping the order of summation (columns outside, pairs inside) leaves the total unchanged, and within one column the number of differing pairs is exactly ones × zeros.',
};

/* ----------------------------------------------------- #2275 Largest Combination With AND > 0 */
function parse2275(raw: string): NIn { return { nums: parseNums(raw, { min: 1, max: 8, lo: 1, hi: 63 }) }; }

function build2275({ nums }: NIn): Step[] {
  const rec = new Rec();
  const ones: (number | undefined)[] = Array(W).fill(undefined);
  let best = 0;
  let bestBit = -1;
  const g = (hl: number) => columnGrid(nums, hl, ones, []);
  const vars = (bit: number | string, o: number | string) => ({ bit, ones: o, best, 'best bit': bestBit < 0 ? '—' : bestBit });
  rec.push({ t: 'Start', d: 'Find the biggest group of numbers whose bitwise AND is non-zero. A group has a non-zero AND exactly when all its members share at least one set bit.', scene: g(-1), v: vars('—', '—'), why: 'So the answer is the largest number of values that all have a 1 in the same column.', j: [0, 1], p: [0, 1], a: 0, tag: 'READY —', note: 'best = 0' });
  for (let b = 0; b < W; b++) {
    const o = nums.filter((x) => (x >> b) & 1).length;
    ones[b] = o;
    const better = o > best;
    const oldBest = best;
    if (better) { best = o; bestBit = b; }
    rec.push({ t: `Bit ${b}: ${o} number${o === 1 ? '' : 's'} have it set`, d: better ? `${o} numbers have a 1 in column ${b} → 🏆 NEW BEST! best = ${best}.` : `${o} numbers in column ${b} do not beat best = ${best}.`, scene: g(b), v: vars(b, o), why: 'Any subset of the numbers that have bit b set keeps bit b alive in their AND, so the whole column is a valid group.', tone: better ? 'success' : 'info', j: [3, 4, 5], p: [3, 4], a: 1, tag: `BIT ${b} —`, note: `best = max(${oldBest}, ${o}) = ${best}` });
  }
  rec.push({ t: `Answer: ${best}`, d: `Bit ${bestBit} is shared by the most numbers (${best}).`, scene: g(bestBit), v: vars('—', '—'), why: 'No bigger group can exist: its AND would need a common set bit, and no column has more ones.', tone: 'success', j: [7], p: [5], a: 3, tag: '✅ Done!', note: `return ${best}`, result: { title: String(best), text: `Largest combination with AND > 0 has size ${best}` } });
  return rec.steps;
}

export const largestCombinationAndPositive: ProblemDef<NIn> = {
  slug: '2275-largest-combination-with-bitwise-and-greater-than-zero', id: '2275', title: 'Largest Combination With Bitwise AND Greater Than Zero', difficulty: 'Medium', category: 'Bit Manipulation', tag: 'max ones per bit column',
  statement: 'Choose any subset of the candidate numbers so that the bitwise AND of the chosen numbers is greater than zero. Return the size of the largest such subset.',
  constraints: '1 ≤ candidates.length ≤ 10⁵, 1 ≤ candidates[i] ≤ 10⁷ (animation input: at most 8 values between 1 and 63, shown as 6 bits)',
  examples: [
    { label: '[16,17,7,62,12,24,14]', input: { nums: [16, 17, 7, 62, 12, 24, 14] }, output: '4' },
    { label: '[8,8]', input: { nums: [8, 8] }, output: '2' },
    { label: '[1,2,4]', input: { nums: [1, 2, 4] }, output: '1' },
  ],
  inputPlaceholder: 'e.g. 16 17 7 62 12 24 14', parseInput: parse2275, buildSteps: build2275, viz: 'cells', vizTitle: 'Bit columns',
  legend: [{ label: 'Bit column being counted', state: 'compare' }, { label: 'Ones in the column', state: 'found' }, { label: 'Not counted yet', state: 'dim' }],
  varLabels: ['bit', 'ones', 'best', 'best bit'],
  emphasis: ['bitwise AND', 'greater than zero', 'largest'],
  phases: [
    { icon: '💡', label: 'Phase 1: AND > 0 means a shared bit', tone: 'blue' },
    { icon: '🔢', label: 'Phase 2: Count ones per column', tone: 'cyan' },
    { icon: '★', label: 'Phase 3: Keep the largest', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'The AND survives only where everyone has a 1', text: 'The AND of a subset is non-zero iff some bit is set in every member. So fix a bit, take every number with that bit set, and the largest such group over all bits is the answer.' },
  java: [
    'public int largestCombination(int[] candidates) {',
    '    int best = 0;',
    '    for (int bit = 0; bit < 24; bit++) {',
    '        int ones = 0;',
    '        for (int c : candidates) ones += (c >> bit) & 1;',
    '        best = Math.max(best, ones);',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def largest_combination(candidates):',
    '    best = 0',
    '    for bit in range(24):',
    '        ones = sum((c >> bit) & 1 for c in candidates)',
    '        best = max(best, ones)',
    '    return best',
  ],
  algorithm: ['A subset has AND > 0 iff all of it shares a set bit', 'For every bit column count the numbers with a 1', 'Keep the largest count', 'Return it'],
  complexity: [{ label: 'Time', value: 'O(24·n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'If a subset has AND > 0, pick a bit set in the AND: every member has it, so the subset is contained in that bit\'s column. Conversely a whole column always has AND > 0. Hence the optimum equals the maximum column count.',
};
