import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';

interface In { nums: number[]; k: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: 0/1 numbers ; k — e.g. 1 1 1 0 0 0 1 1 1 1 0 ; 2');
  const nums = left.split(/[\s,]+/).filter(Boolean).map(Number);
  const k = Number(right.trim());
  if (!nums.length || nums.some((n) => n !== 0 && n !== 1)) throw new Error('The array may only contain 0s and 1s');
  if (right.trim() === '' || !Number.isInteger(k) || k < 0 || k > nums.length) throw new Error(`k must be a whole number between 0 and ${nums.length}`);
  if (nums.length > 14) throw new Error('Use 14 numbers or fewer');
  return { nums, k };
}

function build({ nums, k }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let l = 0;
  let r = -1;
  let zeros = 0;
  let best = 0;
  let bestL = 0;
  let bestR = -1;

  const cells = (bad = -1): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (i === bad) state = 'error';
      else if (i >= l && i <= r) state = value === 0 ? 'compare' : 'active';
      else if (i >= bestL && i <= bestR) state = 'found';
      else if (i < l) state = 'dim';
      return { key: i, value, state };
    });
  const ptrs = () => {
    const p: { id: string; label: string; index: number; tone: 'blue' | 'orange' }[] = [];
    if (l < n) p.push({ id: 'l', label: 'l', index: l, tone: 'blue' });
    if (r >= 0) p.push({ id: 'r', label: 'r', index: r, tone: 'orange' });
    return p;
  };
  const vars = () => ({ l, r: r >= 0 ? r : '—', zeros, best });

  steps.push({
    title: 'Start', tag: 'READY —', desc: `We may flip at most k = ${k} zero${k === 1 ? '' : 's'}, so look for the longest window holding at most ${k} zero${k === 1 ? '' : 's'}.`,
    cells: cells(), pointers: ptrs(), vars: vars(),
    logic: 'Flipping zeros inside a window turns it into all 1s, so the answer is the longest window with at most k zeros.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, note: `l = 0, zeros = 0, best = 0, k = ${k}`,
  });

  for (r = 0; r < n; r++) {
    if (nums[r] === 0) zeros++;
    const over = zeros > k;
    steps.push({
      title: `Extend to include nums[${r}] = ${nums[r]}`, tag: 'EXPAND:',
      desc: nums[r] === 0
        ? `take in nums[${r}]=0 → zeros=${zeros}${over ? ` > k=${k}, window invalid` : ` ≤ k=${k}, still valid`}`
        : `take in nums[${r}]=1 → zeros stays ${zeros}, window [${l}..${r}] is valid`,
      cells: cells(over && nums[r] === 0 ? r : -1), pointers: ptrs(), vars: vars(),
      alert: over ? `zeros = ${zeros} is more than k = ${k}. Shrink from the left until the window has at most ${k}.` : undefined,
      logic: 'The right pointer always moves forward and adds one element to the window.', logicTone: over ? 'warn' : 'info',
      javaLines: [2, 3], pyLines: [2, 3, 4], algoStep: 1, note: `nums[${r}] = ${nums[r]}, zeros = ${zeros}`,
    });
    while (zeros > k) {
      const dropped = nums[l];
      if (dropped === 0) zeros--;
      l++;
      const still = zeros > k;
      steps.push({
        title: `Too many zeros: drop nums[${l - 1}] = ${dropped}`, tag: 'SHRINK:',
        desc: dropped === 0
          ? `drop nums[${l - 1}]=0 → l moves to ${l}, zeros falls to ${zeros}${still ? ` · still > k=${k}` : ` ✓ valid again`}`
          : `drop nums[${l - 1}]=1 → l moves to ${l}, zeros stays ${zeros} · keep shrinking`,
        cells: cells(), pointers: ptrs(), vars: vars(),
        alert: still ? `zeros = ${zeros} is still more than k = ${k}. Keep moving l right.` : undefined,
        logic: 'Shrink from the left until the window is valid again (at most k zeros).', logicTone: 'warn',
        javaLines: [4, 5, 6], pyLines: [5, 6, 7, 8], algoStep: 2, note: `l = ${l}, zeros = ${zeros}`,
      });
    }
    const len = r - l + 1;
    const improved = len > best;
    const old = best;
    if (improved) {
      best = len;
      bestL = l;
      bestR = r;
    }
    steps.push({
      title: `Window length ${len}`, tag: 'UPDATE:',
      desc: improved ? `len=${len} → 🏆 NEW BEST! best = ${best} (window [${l}..${r}])` : `len=${len} does not beat best=${old}, so best stays ${best}`,
      cells: cells(), pointers: ptrs(), vars: vars(),
      logic: improved ? 'Remember the longest valid window seen so far.' : 'Nothing to update.', logicTone: improved ? 'success' : 'info',
      javaLines: [8], pyLines: [9], algoStep: 3, note: `max(${old}, ${r} − ${l} + 1) = ${best}`,
    });
  }

  r = -1;
  l = n;
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `best = ${best}: flipping at most ${k} zero${k === 1 ? '' : 's'} gives a run of ${plural(best, 'one')} (window [${bestL}..${bestR}])`,
    cells: nums.map((value, i) => ({ key: i, value, state: i >= bestL && i <= bestR ? ('found' as const) : ('dim' as const) })), pointers: [], vars: { l: '—', r: '—', zeros, best },
    logic: `Best window: indexes ${bestL}..${bestR} (length ${best}).`, logicTone: 'success', javaLines: [10], pyLines: [10], algoStep: 4,
    note: `return ${best}`,
    result: { title: String(best), text: `Window ${bestL}..${bestR}` },
  });
  return steps;
}

export const maxConsecutiveOnesIII: ProblemDef<In> = {
  slug: '1004-max-consecutive-ones-iii',
  id: '1004', title: 'Max Consecutive Ones III', difficulty: 'Medium', category: 'Arrays', tag: 'variable sliding window',
  statement: 'Given a binary array nums and an integer k, return the maximum number of consecutive 1s you can get if you are allowed to flip at most k zeros into ones.',
  constraints: '1 ≤ n ≤ 10⁵ · nums[i] is 0 or 1 · 0 ≤ k ≤ n (animation input is limited to 14 numbers)',
  examples: [
    { label: '[1,1,1,0,0,0,1,1,1,1,0], k=2', input: { nums: [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], k: 2 }, output: '6' },
    { label: '[0,0,1,1,0,0,1,1,1,0,1,1,0,0], k=3', input: { nums: [0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0], k: 3 }, output: '10' },
    { label: '[1,0,0,1], k=0', input: { nums: [1, 0, 0, 1], k: 0 }, output: '1' },
  ],
  inputPlaceholder: 'nums ; k   e.g. 1 1 1 0 0 0 1 1 1 1 0 ; 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  emphasis: ['at most k zeros', 'flip', 'maximum number of consecutive 1s'],
  legend: [{ label: '1 in window', state: 'active' }, { label: '0 in window (would be flipped)', state: 'compare' }, { label: 'Zero that breaks the limit', state: 'error' }, { label: 'Best window', state: 'found' }, { label: 'Left behind', state: 'dim' }],
  varLabels: ['l', 'r', 'zeros', 'best'],
  phases: [
    { icon: '🪟', label: 'SETUP (empty window)', tone: 'blue' },
    { icon: '➡', label: 'EXPAND (r →)', tone: 'green' },
    { icon: '⬅', label: 'SHRINK (← l)', tone: 'orange' },
    { icon: '★', label: 'UPDATE best', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Longest window with at most k zeros',
    text: 'Grow the window by moving r. Count the zeros inside. When the count exceeds k, shrink from the left until it is back to k. The widest valid window seen is the answer.',
  },
  java: [
    'public int longestOnes(int[] nums, int k) {',
    '    int l = 0, zeros = 0, best = 0;',
    '    for (int r = 0; r < nums.length; r++) {',
    '        if (nums[r] == 0) zeros++;',
    '        while (zeros > k) {',
    '            if (nums[l] == 0) zeros--;',
    '            l++;',
    '        }',
    '        best = Math.max(best, r - l + 1);',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def longest_ones(nums, k):',
    '    l = zeros = best = 0',
    '    for r, x in enumerate(nums):',
    '        if x == 0:',
    '            zeros += 1',
    '        while zeros > k:',
    '            if nums[l] == 0:',
    '                zeros -= 1',
    '            l += 1',
    '        best = max(best, r - l + 1)',
    '    return best',
  ],
  algorithm: [
    'Start with an empty window and zeros = 0',
    'Expand: move r right; if nums[r] is 0, increase zeros',
    'Shrink: while zeros > k, move l right (decrease zeros when leaving a 0)',
    'Update: best = max(best, r − l + 1)',
    'Return best',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'A window with at most k zeros can be turned into all 1s, and any all-1s run reachable with k flips lies inside such a window. The left pointer only ever moves right, so l and r together make at most 2n moves. Shrinking just enough to restore validity keeps the window maximal for the current r.',
};
