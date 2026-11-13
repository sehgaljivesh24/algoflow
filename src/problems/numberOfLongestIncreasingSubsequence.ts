import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { capSteps, heads, parseInts, recorder } from './stepKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  return capSteps(build, { nums: parseInts(raw, { what: 'numbers', example: '1 3 5 4 7', minLen: 1, maxLen: 8, lo: -20, hi: 20 }) });
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const len: (number | null)[] = Array(n).fill(null);
  const cnt: (number | null)[] = Array(n).fill(null);
  const steps: Step[] = [];
  let i = -1;
  let j = -1;
  let winners: number[] = [];
  let best: number | string = '—';

  const snap = () => {
    const col = (r: number, c: number): Cell['state'] | undefined => {
      if (winners.includes(c) && r > 0) return 'found';
      if (c === i) return 'active';
      if (c === j) return 'compare';
      return undefined;
    };
    const row = (r: number, vals: (number | null)[]): Cell[] => vals.map((v, c) => ({ key: `${r},${c}`, value: v === null ? '?' : v, state: col(r, c) ?? (v === null ? 'dim' : undefined) }));
    return {
      scene: {
        kind: 'grid' as const,
        variant: 'table' as const,
        rows: [nums.map((v, c): Cell => ({ key: `n${c}`, value: v, state: winners.includes(c) ? undefined : c === i ? 'active' : c === j ? 'compare' : undefined })), row(1, len), row(2, cnt)],
        rowHeads: ['nums', 'len (LIS ending here)', 'cnt (how many)'],
        colHeads: heads(n),
      },
      vars: { i: i < 0 ? '—' : i, j: j < 0 ? '—' : j, 'len[j]+1': i >= 0 && j >= 0 ? len[j]! + 1 : '—', best },
    };
  };
  const say = recorder(steps, snap);

  say({
    title: 'Two numbers per position', tag: 'DEFINE —', desc: 'For each index i keep len[i] = length of the longest increasing subsequence ending at nums[i], and cnt[i] = how many different subsequences achieve that length.',
    logic: 'Knowing only the length is not enough to count: when two predecessors give the same best length their counts must be added.', java: [0, 1, 2], py: [0, 1, 2], algo: 0,
    note: `len[0..${n - 1}] and cnt[0..${n - 1}] start empty`,
  });

  let result = 0;
  let bestLen = 0;
  for (let x = 0; x < n; x++) {
    i = x;
    j = -1;
    len[x] = 1;
    cnt[x] = 1;
    say({
      title: `Start at i = ${x} (value ${nums[x]})`, tag: 'START i —', desc: `nums[${x}] = ${nums[x]} alone is an increasing subsequence: len[${x}] = 1, cnt[${x}] = 1. Now look at earlier smaller values.`,
      logic: 'Initial guess: nothing before it helps yet.', java: [3, 4], py: [3], algo: 1, note: `len[${x}] = 1, cnt[${x}] = 1`,
    });
    for (let y = 0; y < x; y++) {
      if (nums[y] >= nums[x]) continue;
      j = y;
      const cand = len[y]! + 1;
      let said: string;
      let eq: string;
      let kind: string;
      let tone: 'info' | 'success' = 'info';
      if (cand > len[x]!) {
        eq = `${cand} > ${len[x]} → len[${x}] = ${cand}, cnt[${x}] = cnt[${y}] = ${cnt[y]}`;
        len[x] = cand;
        cnt[x] = cnt[y]!;
        said = `A longer chain (${cand}) than before: set len[${x}] = ${cand} and cnt[${x}] = cnt[${y}] = ${cnt[y]}.`;
        tone = 'success';
        kind = 'LONGER —';
      } else if (cand === len[x]) {
        eq = `${cand} = ${len[x]} → cnt[${x}] = ${cnt[x]} + ${cnt[y]} = ${cnt[x]! + cnt[y]!}`;
        cnt[x]! += cnt[y]!;
        said = `Same length ${cand} as the best so far: add the ways, cnt[${x}] = ${cnt[x]}.`;
        tone = 'success';
        kind = 'TIE: ADD —';
      } else {
        eq = `${cand} < ${len[x]} → ignore`;
        said = `Chain length ${cand} is shorter than the current ${len[x]}: ignore.`;
        kind = 'SHORTER —';
      }
      say({
        title: `${nums[y]} < ${nums[x]}: via j = ${y}`, tag: kind, desc: `${nums[y]} < ${nums[x]} (j = ${y}). ${said}`,
        logic: 'Extend every chain that ends at a smaller earlier value; keep only the longest, and count ties.', tone, java: [5, 6, 7, 8], py: [4, 5, 6, 7, 8, 9], algo: 2,
        note: `len[${y}] + 1 = ${cand}: ${eq}`,
      });
    }
    j = -1;
    if (len[x]! > bestLen) {
      bestLen = len[x]!;
      result = cnt[x]!;
    } else if (len[x] === bestLen) result += cnt[x]!;
    best = bestLen;
    say({
      title: `Position ${x}: len ${len[x]}, cnt ${cnt[x]}`, tag: 'TRACK BEST —', desc: `Position ${x} ends ${cnt[x]} chain${cnt[x] === 1 ? '' : 's'} of length ${len[x]}. Longest overall so far: ${bestLen}, reached ${result} time${result === 1 ? '' : 's'}.`,
      logic: 'Track the global best length and how many chains reach it.', tone: 'success', java: [11, 12], py: [10, 11, 12, 13], algo: 3,
      note: `best length = ${bestLen}, ways = ${result}`,
    });
  }

  i = -1;
  winners = nums.map((_, c) => c).filter((c) => len[c] === bestLen);
  say({
    title: 'Done', tag: '✅ Done!', note: `return ${result} (chains of length ${bestLen})`, desc: `The longest increasing subsequence has length ${bestLen}. Adding cnt over every index with len = ${bestLen} gives ${result} such subsequence${result === 1 ? '' : 's'}.`,
    logic: 'Each longest subsequence ends at exactly one index, so summing counts over those end positions counts each once.', tone: 'success', java: [14], py: [14], algo: 4,
    result: { title: String(result), text: `Longest length ${bestLen}` },
  });
  return steps;
}

export const numberOfLongestIncreasingSubsequence: ProblemDef<In> = {
  slug: '673-number-of-longest-increasing-subsequence',
  id: '673', title: 'Number of Longest Increasing Subsequence', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'LIS DP with counts',
  statement: 'Return how many different subsequences of the array are strictly increasing and have the maximum possible length.',
  constraints: '1 ≤ nums.length ≤ 2000 (animation input: ≤ 8 numbers between −20 and 20)',
  examples: [
    { label: '1 3 5 4 7', input: { nums: [1, 3, 5, 4, 7] }, output: '2' },
    { label: '2 2 2 2 2', input: { nums: [2, 2, 2, 2, 2] }, output: '5' },
    { label: '1 2 4 3 5 4 7 2', input: { nums: [1, 2, 4, 3, 5, 4, 7, 2] }, output: '3' },
  ],
  inputPlaceholder: 'numbers, e.g. 1 3 5 4 7',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizCaption: 'len and cnt for every index (O(n²) LIS DP)',
  emphasis: ['how many different subsequences', 'strictly increasing', 'maximum possible length'],
  phases: [
    { icon: '🧱', label: 'Define len[] and cnt[]', tone: 'blue' },
    { icon: '🌱', label: 'Start at i: len = cnt = 1', tone: 'blue' },
    { icon: '🔗', label: 'Extend from smaller j', tone: 'cyan' },
    { icon: '🏆', label: 'Track best length & ways', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Index i being computed', state: 'active' }, { label: 'Earlier smaller value j', state: 'compare' }, { label: 'Ends a longest subsequence', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['i', 'j', 'len[j]+1', 'best'],
  approach: {
    title: 'Length and count per ending position',
    text: 'For each i start with len = 1, cnt = 1. For every j < i with nums[j] < nums[i]: if len[j] + 1 > len[i] then len[i] = len[j] + 1 and cnt[i] = cnt[j]; if it equals len[i], add cnt[j]. Finally sum cnt[i] over all i with len[i] equal to the maximum.',
  },
  java: [
    'public int findNumberOfLIS(int[] nums) {',
    '    int n = nums.length, best = 0, result = 0;',
    '    int[] len = new int[n], cnt = new int[n];          // LIS length / number of LISs ending at i',
    '    for (int i = 0; i < n; i++) {',
    '        len[i] = cnt[i] = 1;',
    '        for (int j = 0; j < i; j++) {',
    '            if (nums[j] < nums[i]) {',
    '                if (len[j] + 1 > len[i]) { len[i] = len[j] + 1; cnt[i] = cnt[j]; }   // strictly longer: replace',
    '                else if (len[j] + 1 == len[i]) cnt[i] += cnt[j];                     // tie: add the ways',
    '            }',
    '        }',
    '        if (len[i] > best) { best = len[i]; result = cnt[i]; }',
    '        else if (len[i] == best) result += cnt[i];',
    '    }',
    '    return result;',
    '}',
  ],
  python: [
    'def find_number_of_lis(nums):',
    '    n = len(nums); best = result = 0',
    '    length = [1] * n; count = [1] * n          # LIS length / number of LISs ending at i',
    '    for i in range(n):',
    '        for j in range(i):',
    '            if nums[j] < nums[i]:',
    '                if length[j] + 1 > length[i]:',
    '                    length[i], count[i] = length[j] + 1, count[j]      # strictly longer: replace',
    '                elif length[j] + 1 == length[i]:',
    '                    count[i] += count[j]                              # tie: add the ways',
    '        if length[i] > best:',
    '            best, result = length[i], count[i]',
    '        elif length[i] == best:',
    '            result += count[i]',
    '    return result',
  ],
  algorithm: [
    'len[i] = longest increasing run ending at i; cnt[i] = how many such runs',
    'Start every position with len = 1, cnt = 1',
    'For each smaller earlier j: longer chain replaces (copy cnt), equal chain adds cnt',
    'Track the global best length and sum the counts that reach it',
    'Return that sum',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Every longest increasing subsequence ending at i has a unique second-to-last element j with nums[j] < nums[i] and a prefix that is itself a longest chain ending at j (otherwise it could be lengthened). Hence the chains of maximal length ending at i are exactly the chains of maximal length at those j that give len[j] + 1 = len[i], extended by nums[i], and their number is the sum of cnt[j] over such j. Each overall longest subsequence is counted once, at its last index.',
};
