import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { parseInts, recorder } from './stepKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  return { nums: parseInts(raw, { what: 'numbers', example: '10 9 2 5 3 7 101 18', minLen: 1, maxLen: 10, lo: -99, hi: 99 }) };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const tails: number[] = [];
  const steps: Step[] = [];
  let at = -1;
  let lo = -1;
  let hi = -1;
  let mid = -1;
  let placed = -1;

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: [
        nums.map((v, i): Cell => ({ key: `n${i}`, value: v, state: i === at ? 'active' : i < at ? 'sorted' : undefined })),
        Array.from({ length: n }, (_, j): Cell => {
          const key = `t${j}`;
          const value = j < tails.length ? tails[j] : '·';
          if (j === placed) return { key, value, state: 'found' };
          if (j === mid) return { key, value, state: 'active' };
          if (lo >= 0 && j >= lo && j < hi && j < tails.length) return { key, value, state: 'compare' };
          return { key, value, state: j < tails.length ? undefined : 'dim' };
        }),
      ],
      rowHeads: ['nums', 'tails'], colHeads: nums.map((_, i) => String(i)),
    },
    aux: [{ title: `tails (length = ${tails.length})`, kind: 'list' as const, items: tails.map(String) }],
    vars: { i: at < 0 ? '—' : at, x: at < 0 ? '—' : nums[at], lo: lo < 0 ? '—' : lo, hi: hi < 0 ? '—' : hi, 'LIS length': tails.length },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define tails', tag: 'DEFINE —', desc: 'tails[k] = the smallest possible last value of an increasing subsequence of length k + 1. We keep it sorted and update it with one binary search per number.',
    logic: 'A smaller tail is always better: it is easier to extend. The number of filled slots is the LIS length so far.',
    java: [0, 1, 2], py: [0, 1], algo: 0, note: `tails = [] (empty), LIS length = 0`,
  });

  for (let i = 0; i < n; i++) {
    const x = nums[i];
    at = i;
    lo = 0;
    hi = tails.length;
    mid = -1;
    placed = -1;
    say({
      title: `Place ${x}`, tag: 'NEXT NUMBER —', desc: tails.length ? `x = nums[${i}] = ${x}. Binary search the first tail that is ≥ ${x} within slots 0..${tails.length - 1} of [${tails.join(', ')}].` : `x = nums[${i}] = ${x}. tails is empty, so ${x} starts length 1.`,
      logic: 'We need the first position whose tail is not smaller than x: x can replace it, or extend the list if none exists.', java: [3, 4], py: [2, 3], algo: 1,
      note: `x = ${x}, search range [0, ${tails.length})`,
    });
    while (lo < hi) {
      const m = Math.floor((lo + hi) / 2);
      mid = m;
      const less = tails[m] < x;
      const nlo = less ? m + 1 : lo;
      const nhi = less ? hi : m;
      const oldLo = lo;
      const oldHi = hi;
      say({
        title: `mid = ${m}: tails[${m}] = ${tails[m]} ${less ? '<' : '≥'} ${x}`, tag: 'BINARY SEARCH —',
        desc: less ? `mid = ${m}: ${tails[m]} is smaller than ${x}, so ${x} must go to the right: lo = ${nlo}.` : `mid = ${m}: ${tails[m]} is not smaller than ${x}, so the spot is here or to the left: hi = ${nhi}.`,
        logic: `Searching slots ${oldLo}..${oldHi - 1}; the tails are sorted, so each probe halves the range.`, java: [5, 6, 7], py: [4, 5, 6, 7, 8, 9], algo: 2,
        note: `mid = (${oldLo} + ${oldHi}) / 2 = ${m}; tails[${m}] ${less ? '<' : '≥'} ${x} → ${less ? `lo = ${nlo}` : `hi = ${nhi}`}`,
      });
      lo = nlo;
      hi = nhi;
    }
    const pos = lo;
    const extend = pos === tails.length;
    const old = extend ? 0 : tails[pos];
    if (extend) tails.push(x);
    else tails[pos] = x;
    placed = pos;
    mid = -1;
    say({
      title: extend ? `Append ${x}: length becomes ${tails.length}` : `Replace tails[${pos}] with ${x}`, tag: extend ? 'EXTEND —' : 'REPLACE —',
      desc: extend ? `${x} is larger than every tail, so it extends the longest subsequence: LIS length = ${tails.length}.` : `Slot ${pos} held ${old}; ${x} is not larger, so a length-${pos + 1} subsequence can now end at ${x}, which is no worse.`,
      logic: extend ? 'Nothing to replace: the longest increasing subsequence just grew by one.' : 'A smaller tail keeps the length but makes future extensions easier.',
      tone: extend ? 'success' : 'info', java: [9, 10], py: [10, 11, 12, 13], algo: 3,
      note: extend ? `tails[${pos}] = ${x}, size ${pos} → ${tails.length}` : `tails[${pos}]: ${old} → ${x}, size stays ${tails.length}`,
    });
    placed = -1;
  }

  at = -1;
  lo = -1;
  hi = -1;
  say({
    title: 'Done', tag: '✅ Done!', note: `return tails.size = ${tails.length}`, desc: `The tails array has ${tails.length} slot${tails.length === 1 ? '' : 's'}, so the longest increasing subsequence has length ${tails.length}.`,
    logic: 'Note: tails holds the best end values per length, not necessarily one real subsequence, but its size is exactly the LIS length.', tone: 'success',
    java: [12], py: [14], algo: 4, result: { title: String(tails.length), text: 'Length of the longest strictly increasing subsequence' },
  });
  return steps;
}

export const longestIncreasingSubsequence: ProblemDef<In> = {
  slug: '300-longest-increasing-subsequence',
  id: '300', title: 'Longest Increasing Subsequence', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'patience sort O(n log n)',
  statement: 'Given an integer array, return the length of the longest strictly increasing subsequence (elements need not be adjacent, but keep their order).',
  constraints: '1 ≤ nums.length ≤ 2500 (animation input: ≤ 10 values between −99 and 99)',
  emphasis: ['longest strictly increasing subsequence', 'need not be adjacent'],
  phases: [
    { icon: '🧱', label: 'Define tails[]', tone: 'blue' },
    { icon: '🔢', label: 'Take next number', tone: 'cyan' },
    { icon: '🔍', label: 'Binary search first tail ≥ x', tone: 'cyan' },
    { icon: '✍️', label: 'Append or replace', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  examples: [
    { label: '[10, 9, 2, 5, 3, 7, 101, 18]', input: { nums: [10, 9, 2, 5, 3, 7, 101, 18] }, output: '4' },
    { label: '[0, 1, 0, 3, 2, 3]', input: { nums: [0, 1, 0, 3, 2, 3] }, output: '4' },
    { label: '[7, 7, 7, 7]', input: { nums: [7, 7, 7, 7] }, output: '1' },
  ],
  inputPlaceholder: 'e.g. 10 9 2 5 3 7 101 18',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Number being placed / probe (mid)', state: 'active' }, { label: 'Search range', state: 'compare' }, { label: 'Slot just written', state: 'found' }, { label: 'Already processed', state: 'sorted' }, { label: 'Unused slot', state: 'dim' }],
  varLabels: ['i', 'x', 'lo', 'hi', 'LIS length'],
  approach: {
    title: 'Keep the smallest tail for every length',
    text: 'Maintain a sorted array tails where tails[k] is the smallest end of any increasing subsequence of length k+1. For each number, binary-search its first slot with tail ≥ x and overwrite it (or append if none). The final size of tails is the answer.',
  },
  java: [
    'public int lengthOfLIS(int[] nums) {',
    '    int[] tails = new int[nums.length];',
    '    int len = 0;',
    '    for (int x : nums) {',
    '        int lo = 0, hi = len;',
    '        while (lo < hi) {',
    '            int mid = (lo + hi) / 2;',
    '            if (tails[mid] < x) lo = mid + 1; else hi = mid;',
    '        }',
    '        tails[lo] = x;',
    '        if (lo == len) len++;',
    '    }',
    '    return len;',
    '}',
  ],
  python: [
    'def length_of_lis(nums):',
    '    tails = []',
    '    for x in nums:',
    '        lo, hi = 0, len(tails)',
    '        while lo < hi:',
    '            mid = (lo + hi) // 2',
    '            if tails[mid] < x:',
    '                lo = mid + 1',
    '            else:',
    '                hi = mid',
    '        if lo == len(tails):',
    '            tails.append(x)',
    '        else:',
    '            tails[lo] = x',
    '    return len(tails)',
  ],
  algorithm: [
    'Start with an empty tails array (smallest end value per length)',
    'For each x, binary-search the first slot whose tail is ≥ x',
    'Narrow lo/hi with the midpoint comparison tails[mid] < x',
    'Overwrite that slot with x, or append x if the search ran off the end',
    'Return the number of slots in tails',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Claim: tails stays strictly increasing, and tails[k] is the minimum last value over all increasing subsequences of length k+1. Replacing the first tail ≥ x with x can only lower an end value without changing any length, and appending happens exactly when x extends the longest one. Since lengths never shrink, the count of slots is the LIS length.',
};
