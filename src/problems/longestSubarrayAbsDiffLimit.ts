import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { fmtArr, parseNumsAndK, ptr } from './pack1Kit.ts';

interface In { nums: number[]; limit: number }

function parse(raw: string): In {
  const { nums, k } = parseNumsAndK(raw, { example: '8 2 4 7 | 4', what: 'the numbers', lo: 0, hi: 99, kName: 'limit', kMin: 0, kMax: () => 99 });
  return { nums, limit: k };
}

/** One step per event: expand (push into both deques), shrink (one step per l move while max − min > limit), update (record the length). */
function build({ nums, limit }: In): Step[] {
  const maxQ: number[] = []; // values, non-increasing front to back
  const minQ: number[] = []; // values, non-decreasing front to back
  let l = 0;
  let best = 0;
  let bestL = 0;
  const steps: Step[] = [];

  const spreadNow = () => (maxQ.length ? maxQ[0] - minQ[0] : 0);
  const cells = (r: number, enter = -1, enterBad = false, gone = -1, showBest = false): Cell[] =>
    nums.map((value, i) => {
      let state: CellState | undefined;
      if (showBest) state = best > 0 && i >= bestL && i < bestL + best ? 'found' : 'dim';
      else if (i === gone) state = 'swap';
      else if (i === enter) state = enterBad ? 'error' : 'compare';
      else if (r >= 0 && i >= l && i <= r) state = 'active';
      else if (i < l) state = 'dim';
      return { key: i, value, state };
    });
  /** Both deques; while the spread is over the limit the two fronts (the window max and min) are flagged. */
  const aux = (over = false, mx: number[] = maxQ, mn: number[] = minQ) => [
    { title: 'max deque (front = window max)', kind: 'queue' as const, items: mx.map(String), highlight: mx.length ? 0 : undefined, bad: over && mx.length ? [0] : [] },
    { title: 'min deque (front = window min)', kind: 'queue' as const, items: mn.map(String), highlight: mn.length ? 0 : undefined, bad: over && mn.length ? [0] : [] },
  ];
  const spreadText = () => (maxQ.length ? `${maxQ[0]} − ${minQ[0]} = ${spreadNow()} ${spreadNow() > limit ? '>' : '≤'} ${limit}` : '—');
  const vars = (r: number | string) => ({ L: l, R: r, max: maxQ.length ? maxQ[0] : '—', min: minQ.length ? minQ[0] : '—', 'max − min': maxQ.length ? spreadNow() : '—', best });
  const pts = (r: number) => (r >= 0 ? [ptr('l', String(l), Math.min(l, nums.length - 1), 'blue'), ptr('r', String(r), r, 'green')] : []);

  steps.push({
    title: 'Start', tag: 'READY —', desc: `Find the longest run where the biggest and smallest value differ by at most limit = ${limit}. Both deques are empty.`,
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'The window is valid while max − min ≤ limit. Dropping numbers can only shrink that spread, so a two-pointer window works, as long as we can read the window max and min in O(1). Two monotonic deques do that.', logicTone: 'info',
    javaLines: [1, 2], pyLines: [1, 2], algoStep: 0, note: `limit = ${limit}, L = 0, best = 0`,
  });

  for (let r = 0; r < nums.length; r++) {
    const x = nums[r];
    const popMax: number[] = [];
    const popMin: number[] = [];
    while (maxQ.length && maxQ[maxQ.length - 1] < x) popMax.push(maxQ.pop()!);
    maxQ.push(x);
    while (minQ.length && minQ[minQ.length - 1] > x) popMin.push(minQ.pop()!);
    minQ.push(x);
    const over = spreadNow() > limit;
    steps.push({
      title: `Add nums[${r}] = ${x}`, tag: 'EXPAND:',
      desc: `take in nums[${r}]=${x} → max deque ${popMax.length ? `pops [${popMax.join(', ')}]` : 'pops nothing'}, min deque ${popMin.length ? `pops [${popMin.join(', ')}]` : 'pops nothing'}; max ${maxQ[0]}, min ${minQ[0]}`,
      cells: cells(r, r, over), pointers: pts(r), aux: aux(over), vars: vars(r),
      alert: over ? `Spread ${spreadNow()} is above the limit ${limit}. Move L right until it fits.` : undefined,
      logic: 'A smaller number in front of a bigger one can never be the window max again (and the mirror argument holds for the min deque), so each deque only keeps useful candidates.', logicTone: over ? 'warn' : 'info',
      javaLines: [4, 5, 6, 7], pyLines: [4, 5, 6, 7, 8, 9], algoStep: 0,
      note: `${maxQ[0]} − ${minQ[0]} = ${spreadNow()} ${over ? '>' : '≤'} ${limit}`,
    });

    while (maxQ[0] - minQ[0] > limit) {
      const out = nums[l];
      const spread = maxQ[0] - minQ[0];
      const dropMax = maxQ[0] === out;
      const dropMin = minQ[0] === out;
      if (dropMax) maxQ.shift();
      if (dropMin) minQ.shift();
      l++;
      const still = maxQ[0] - minQ[0] > limit;
      steps.push({
        title: `Spread ${spread} > ${limit}: drop nums[${l - 1}] = ${out}`, tag: 'SHRINK:',
        desc: `drop nums[${l - 1}]=${out} → ${dropMax || dropMin ? `pops it from the ${dropMax && dropMin ? 'max and min deques' : dropMax ? 'max deque' : 'min deque'}` : 'deques unchanged'}; L moves to ${l}, spread ${maxQ[0] - minQ[0]} ${still ? `> ${limit}, still too wide` : `≤ ${limit} ✓`}`,
        cells: cells(r, -1, false, l - 1), pointers: pts(r), aux: aux(still), vars: vars(r),
        alert: still ? `Spread ${maxQ[0] - minQ[0]} still exceeds ${limit}. Keep shrinking.` : undefined,
        logic: 'Too wide: move l forward. Only an expiring number that equals a deque front must leave that deque.', logicTone: 'warn',
        javaLines: [8, 9, 10, 11], pyLines: [10, 11, 12, 13], algoStep: 1,
        note: `${spreadText()}; l = ${l}`,
      });
    }

    const len = r - l + 1;
    const improved = len > best;
    const old = best;
    if (improved) { best = len; bestL = l; }
    steps.push({
      title: `Window [${l}..${r}] is valid, length ${len}`, tag: 'UPDATE best:',
      desc: improved ? `window [${l}..${r}] has spread ${spreadNow()} ≤ ${limit}, len=${len} → 🏆 NEW BEST! best = ${best}` : `window [${l}..${r}] has spread ${spreadNow()} ≤ ${limit}, len=${len} → best = max(${old}, ${len}) = ${best}`,
      cells: cells(r), pointers: pts(r), aux: aux(), vars: vars(r),
      logic: `max − min = ${maxQ[0]} − ${minQ[0]} = ${maxQ[0] - minQ[0]} ≤ ${limit}.`, logicTone: improved ? 'success' : 'info', javaLines: [13], pyLines: [14], algoStep: 2,
      note: `best = max(${old}, ${r} − ${l} + 1) = ${best}`,
    });
  }

  const sub = nums.slice(bestL, bestL + best);
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `longest valid run has length ${best}: indexes ${bestL}..${bestL + best - 1} = ${fmtArr(sub)} (max ${Math.max(...sub)} − min ${Math.min(...sub)} ≤ ${limit})`,
    cells: cells(-1, -1, false, -1, true), pointers: [ptr('l', String(bestL), bestL, 'blue'), ptr('r', String(bestL + best - 1), bestL + best - 1, 'green')],
    aux: aux(false, [], []), vars: { L: bestL, R: bestL + best - 1, max: Math.max(...sub), min: Math.min(...sub), 'max − min': Math.max(...sub) - Math.min(...sub), best },
    logic: 'Both pointers only moved forward, so the work is linear.', logicTone: 'success', javaLines: [15], pyLines: [15], algoStep: 3, note: `return ${best}`,
    result: { title: String(best), text: `Longest subarray with max − min ≤ ${limit}: ${fmtArr(nums.slice(bestL, bestL + best))}` },
  });
  return steps;
}

export const longestSubarrayAbsDiffLimit: ProblemDef<In> = {
  slug: '1438-longest-continuous-subarray-with-abs-diff-limit',
  id: '1438', title: 'Longest Continuous Subarray With Abs Diff ≤ Limit', difficulty: 'Medium', category: 'Arrays', tag: 'sliding window + two monotonic deques',
  statement: 'Given an array of integers and a limit, return the length of the longest contiguous subarray in which the absolute difference between any two elements (equivalently, max − min) is at most limit. Two monotonic deques report the window max and min in O(1).',
  emphasis: ['longest contiguous subarray', 'max − min', 'at most limit', 'monotonic deques'],
  constraints: '1 ≤ n ≤ 10⁵, 1 ≤ nums[i] ≤ 10⁹, 0 ≤ limit ≤ 10⁹ (animation input is limited to 12 numbers from 0 to 99)',
  examples: [
    { label: '8 2 4 7 | limit 4', input: { nums: [8, 2, 4, 7], limit: 4 }, output: '2', answer: '2 (e.g. [2, 4] or [4, 7]: max − min ≤ 4)' },
    { label: '10 1 2 4 7 2 | limit 5', input: { nums: [10, 1, 2, 4, 7, 2], limit: 5 }, output: '4' },
    { label: '4 2 2 2 4 4 2 2 | limit 0', input: { nums: [4, 2, 2, 2, 4, 4, 2, 2], limit: 0 }, output: '3' },
  ],
  inputPlaceholder: 'numbers | limit, e.g. 8 2 4 7 | 4',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'R entering (expand)', state: 'compare' }, { label: 'L leaving (shrink)', state: 'swap' }, { label: 'Window contents', state: 'active' }, { label: 'Spread over limit', state: 'error' }, { label: 'Best window', state: 'found' }, { label: 'Outside', state: 'dim' }],
  varLabels: ['L', 'R', 'max', 'min', 'max − min', 'best'],
  phases: [
    { icon: '➡', label: 'EXPAND (R →, update deques)', tone: 'green' },
    { icon: '⬅', label: 'SHRINK (← L, spread too wide)', tone: 'orange' },
    { icon: '★', label: 'UPDATE best', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Variable window, but max and min come from deques',
    text: 'Expand r one number at a time. A decreasing deque tracks the window maximum, an increasing deque tracks the minimum. While max − min exceeds the limit, advance l (popping a deque front only when it is the number leaving). After each expansion the window is valid, so record its length.',
  },
  java: [
    'public int longestSubarray(int[] nums, int limit) {',
    '    Deque<Integer> maxQ = new ArrayDeque<>(), minQ = new ArrayDeque<>();',
    '    int l = 0, best = 0;',
    '    for (int r = 0; r < nums.length; r++) {',
    '        while (!maxQ.isEmpty() && maxQ.peekLast() < nums[r]) maxQ.pollLast();',
    '        maxQ.addLast(nums[r]);',
    '        while (!minQ.isEmpty() && minQ.peekLast() > nums[r]) minQ.pollLast();',
    '        minQ.addLast(nums[r]);',
    '        while (maxQ.peekFirst() - minQ.peekFirst() > limit) {',
    '            if (maxQ.peekFirst() == nums[l]) maxQ.pollFirst();',
    '            if (minQ.peekFirst() == nums[l]) minQ.pollFirst();',
    '            l++;',
    '        }',
    '        best = Math.max(best, r - l + 1);',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def longest_subarray(nums, limit):',
    '    max_q, min_q = deque(), deque()',
    '    l = best = 0',
    '    for r, x in enumerate(nums):',
    '        while max_q and max_q[-1] < x:',
    '            max_q.pop()',
    '        max_q.append(x)',
    '        while min_q and min_q[-1] > x:',
    '            min_q.pop()',
    '        min_q.append(x)',
    '        while max_q[0] - min_q[0] > limit:',
    '            if max_q[0] == nums[l]: max_q.popleft()',
    '            if min_q[0] == nums[l]: min_q.popleft()',
    '            l += 1',
    '        best = max(best, r - l + 1)',
    '    return best',
  ],
  algorithm: [
    'Expand: move r right; pop worse candidates off the back of both deques, then push nums[r]',
    'Shrink: while max − min > limit, pop a deque front if it equals nums[l], then l++',
    'Update: the window is valid now, record r − l + 1 and keep the best',
    'Return best',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Validity is monotone: removing numbers from a window never increases max − min, so l never has to move back. The deques give the window extremes in O(1) and every number enters and leaves each deque at most once, so the whole scan is O(n) instead of O(n²) recomputing the extremes.',
};
