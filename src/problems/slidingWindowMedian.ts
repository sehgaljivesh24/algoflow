import type { CellState, ProblemDef, Scene, SplitScene, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { Heap, parseInts } from './listheapKit.ts';
import { recorder } from './stepKit.ts';
import { leaf, semis } from './p4Kit.ts';

interface In { nums: number[]; k: number }

const FORMAT = 'numbers ; k — e.g. 1 3 -1 -3 5 3 6 7 ; 3';

function parse(raw: string): In {
  const p = semis(raw, 2, FORMAT);
  const nums = parseInts(p[0], { max: 10, lo: -50, hi: 50, hint: '1 3 -1 -3 5 3 6 7' });
  const k = Number(p[1].trim());
  if (!/^\d+$/.test(p[1].trim()) || k < 1 || k > Math.min(nums.length, 6)) throw new Error(`k must be a whole number from 1 to ${Math.min(nums.length, 6)}`);
  return { nums, k };
}

interface Item { v: number; i: number }

function build({ nums, k }: In): Step[] {
  const n = nums.length;
  const low = new Heap<Item>('max', (x, y) => x.v > y.v || (x.v === y.v && x.i < y.i), (x) => x.v, (x) => `#${x.i}`, false);
  const high = new Heap<Item>('min', (x, y) => x.v < y.v || (x.v === y.v && x.i < y.i), (x) => x.v, (x) => `#${x.i}`, false);
  const gone = new Set<number>();
  const inLow = new Set<number>();
  const noop = () => {};
  let lowN = 0;
  let highN = 0;
  let r = -1; // right end of the window
  let hotLow: Record<number, CellState> = {};
  let hotHigh: Record<number, CellState> = {};
  const medians: number[] = [];
  const steps: Step[] = [];

  const treeOf = (h: Heap<Item>, hot: Record<number, CellState>): Exclude<Scene, SplitScene> => {
    const states: Record<number, CellState> = { ...hot };
    h.a.forEach((x, idx) => { if (gone.has(x.i)) states[idx] = 'dim'; });
    return leaf(h.scene(states));
  };
  const say = recorder(steps, () => ({
    scene: {
      kind: 'split' as const,
      parts: [treeOf(low, hotLow), treeOf(high, hotHigh)],
    },
    aux: [
      { title: 'numbers (current window in brackets)', kind: 'list' as const, items: nums.map((v, i) => (i <= r && i >= r - k + 1 ? `[${v}]` : String(v))), highlight: r >= 0 ? r : undefined },
      { title: 'lower half (max-heap) — tree on the left', kind: 'list' as const, items: low.a.map((x) => `${x.v}${gone.has(x.i) ? '✗' : ''}`), bad: low.a.flatMap((x, q) => (gone.has(x.i) ? [q] : [])) },
      { title: 'upper half (min-heap) — tree on the right', kind: 'list' as const, items: high.a.map((x) => `${x.v}${gone.has(x.i) ? '✗' : ''}`), bad: high.a.flatMap((x, q) => (gone.has(x.i) ? [q] : [])) },
      { title: 'medians so far', kind: 'list' as const, items: medians.map(String) },
    ],
    vars: { 'low size': lowN, 'high size': highN, 'stale entries': [...low.a, ...high.a].filter((x) => gone.has(x.i)).length, median: medians.length ? medians[medians.length - 1] : '—' },
  }));
  const prune = (h: Heap<Item>) => { while (h.size && gone.has(h.peek().i)) h.pop(noop, true); };

  say({
    title: 'Start', desc: `Slide a window of ${k} across ${plural(n, 'number')} and report the median of every window. The lower half sits in a max-heap, the upper half in a min-heap.`,
    logic: 'The median lives at the heap roots, but a heap cannot delete an arbitrary item cheaply, so leaving items are only marked and discarded when they surface.', java: [1], py: [1, 2, 3], algo: 0,
    tag: 'INIT', note: `low = max-heap, high = min-heap, window k = ${k}`,
  });

  for (let i = 0; i < n; i++) {
    r = i;
    hotLow = {};
    hotHigh = {};
    if (i >= k) {
      const j = i - k;
      gone.add(j);
      if (inLow.has(j)) lowN--; else highN--;
      say({
        title: `${nums[j]} leaves the window`, desc: `Index ${j} slides out. It stays inside its heap (struck through, ✗) and is only counted out of the ${inLow.has(j) ? 'lower' : 'upper'} half's size.`,
        logic: 'Lazy deletion: mark now, remove later when the stale entry reaches the root.', tone: 'warn', java: [8, 9], py: [10, 11, 12], algo: 1,
        tag: 'LEAVE', note: `gone[${j}] = true; ${inLow.has(j) ? 'lowSize' : 'highSize'}-- → low=${lowN} high=${highN}`,
        alert: `${nums[j]} (index ${j}) left the window. It is only marked stale (✗); the heap still holds it.`,
      });
    }
    prune(low);
    const x = nums[i];
    if (lowN === 0 || x <= low.peek().v) {
      low.push({ v: x, i }, noop, true);
      inLow.add(i);
      lowN++;
      hotLow = { [low.a.findIndex((t) => t.i === i)]: 'active' };
      say({
        title: `${x} enters the lower half`, desc: lowN === 1 && highN === 0 ? `The lower half is empty, so ${x} goes there.` : `${x} ≤ the lower root, so it belongs to the lower half.`,
        logic: 'Everything in the lower half must stay ≤ everything in the upper half.', java: [11], py: [13, 14], algo: 2,
        tag: 'INSERT LOW', note: `lowSize == 0 || ${x} <= low root: low.add(${x}) → low=${lowN}`,
      });
    } else {
      high.push({ v: x, i }, noop, true);
      highN++;
      hotHigh = { [high.a.findIndex((t) => t.i === i)]: 'active' };
      say({
        title: `${x} enters the upper half`, desc: `${x} is larger than the lower root, so it joins the upper half.`,
        logic: 'Larger values go up, smaller values stay down.', java: [12], py: [15, 16], algo: 2,
        tag: 'INSERT HIGH', note: `${x} > low root: high.add(${x}) → high=${highN}`,
      });
    }
    hotLow = {};
    hotHigh = {};
    if (lowN > highN + 1) {
      prune(low);
      const t = low.pop(noop, true);
      inLow.delete(t.i);
      high.push(t, noop, true);
      lowN--; highN++;
      hotHigh = { [high.a.findIndex((q) => q.i === t.i)]: 'swap' };
      say({
        title: `Rebalance: ${t.v} moves up`, desc: `The lower half is too big (${lowN + 1} vs ${highN - 1}). Its largest live value ${t.v} is handed to the upper half.`,
        logic: 'Sizes must stay equal, or lower = upper + 1, so the median is always at a root.', tone: 'warn', java: [13], py: [17, 18, 19], algo: 3,
        tag: 'REBALANCE', note: `lowSize ${lowN + 1} > highSize ${highN - 1} + 1: move ${t.v} up`,
        alert: `Lower half has ${lowN + 1}, upper only ${highN - 1}: the unbalanced lower root ${t.v} moves up.`,
      });
    } else if (lowN < highN) {
      prune(high);
      const t = high.pop(noop, true);
      inLow.add(t.i);
      low.push(t, noop, true);
      lowN++; highN--;
      hotLow = { [low.a.findIndex((q) => q.i === t.i)]: 'swap' };
      say({
        title: `Rebalance: ${t.v} moves down`, desc: `The upper half is bigger than the lower, so its smallest live value ${t.v} moves to the lower half.`,
        logic: 'Sizes must stay equal, or lower = upper + 1, so the median is always at a root.', tone: 'warn', java: [14], py: [20, 21, 22], algo: 3,
        tag: 'REBALANCE', note: `lowSize ${lowN - 1} < highSize ${highN + 1}: move ${t.v} down`,
        alert: `Upper half is bigger (${highN + 1} vs ${lowN - 1}): its root ${t.v} moves down to the lower half.`,
      });
    }
    hotLow = {};
    hotHigh = {};
    if (i >= k - 1) {
      prune(low);
      if (k % 2 === 0) prune(high);
      const m = k % 2 === 1 ? low.peek().v : (low.peek().v + high.peek().v) / 2;
      medians.push(m);
      hotLow = { 0: 'found' };
      if (k % 2 === 0) hotHigh = { 0: 'found' };
      say({
        title: `Median of window ending at ${i} = ${m}`, desc: k % 2 === 1 ? `The window size ${k} is odd, so the median is the lower root: ${m}.` : `The window size ${k} is even: (${low.peek().v} + ${high.peek().v}) / 2 = ${m}.`,
        logic: 'Stale entries are discarded when they reach the top, so the roots are always live values.', tone: 'success', java: [16], py: [23, 24], algo: 4,
        tag: `MEDIAN #${medians.length}`, note: k % 2 === 1 ? `ans[${i - k + 1}] = low root = ${m}` : `ans[${i - k + 1}] = (${low.peek().v} + ${high.peek().v}) / 2 = ${m}`,
      });
    }
  }
  hotLow = {};
  hotHigh = {};
  say({
    title: 'Done', desc: `Medians of all ${plural(medians.length, 'window')}: ${medians.join(', ')}.`,
    logic: 'Each element is pushed once and popped at most once, so the whole slide costs O(n log k) amortised.', tone: 'success', java: [19], py: [25], algo: 5,
    result: { title: `[${medians.join(',')}]`, text: 'Median of every window' },
    tag: '✅ Done!', note: `return [${medians.join(', ')}]`,
  });
  return steps;
}

export const slidingWindowMedian: ProblemDef<In> = {
  slug: '480-sliding-window-median',
  id: '480', title: 'Sliding Window Median', difficulty: 'Hard', category: 'Heap', tag: 'two heaps + lazy delete',
  statement: 'Given an array and a window size k, the window slides one position at a time from left to right. Report the median of the numbers inside the window at every position (for an even k, the mean of the two middle values).',
  constraints: '1 ≤ k ≤ n ≤ 10⁵ (animation input: ≤ 10 numbers in −50..50, k ≤ 6; write numbers ; k)',
  examples: [
    { label: '1 3 -1 -3 5 3 6 7 ; 3', input: { nums: [1, 3, -1, -3, 5, 3, 6, 7], k: 3 }, output: '[1,-1,-1,3,5,6]', answer: '[1,-1,-1,3,5,6] (the median of each window of 3)' },
    { label: '4 2 12 11 -5 ; 2', input: { nums: [4, 2, 12, 11, -5], k: 2 }, output: '[3,7,11.5,3]' },
    { label: '5 5 5 1 ; 4', input: { nums: [5, 5, 5, 1], k: 4 }, output: '[5]' },
  ],
  inputPlaceholder: FORMAT,
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Inside the window / new entry', state: 'active' }, { label: 'Outside the window / stale entry', state: 'dim' }, { label: 'Moved between heaps', state: 'swap' }, { label: 'Median root', state: 'found' }],
  emphasis: ['median', 'window size k', 'slides one position'],
  phases: [
    { icon: '⚖️', label: 'Two heaps', tone: 'blue' },
    { icon: '🗑️', label: 'Lazy delete', tone: 'orange' },
    { icon: '➕', label: 'Insert newcomer', tone: 'cyan' },
    { icon: '🔄', label: 'Rebalance', tone: 'orange' },
    { icon: '🎯', label: 'Read median', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['low size', 'high size', 'stale entries', 'median'],
  approach: {
    title: 'Two heaps with lazy deletion',
    text: 'Keep the smaller half of the window in a max-heap and the larger half in a min-heap, with the lower half equal in size or one bigger. A number leaving the window is only marked as gone and counted out of its half; it is physically popped when it reaches a root. After inserting the new number into the correct half and rebalancing, the median is at the root(s).',
  },
  java: [
    'public double[] medianSlidingWindow(int[] nums, int k) {',
    '    PriorityQueue<int[]> low = new PriorityQueue<>((a, b) -> Integer.compare(b[0], a[0]));   // max-heap {value, index}',
    '    PriorityQueue<int[]> high = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));  // min-heap {value, index}',
    '    boolean[] gone = new boolean[nums.length], inLow = new boolean[nums.length];',
    '    int lowSize = 0, highSize = 0;',
    '    double[] ans = new double[nums.length - k + 1];',
    '    for (int i = 0; i < nums.length; i++) {',
    '        if (i >= k) {                                   // nums[i-k] leaves the window',
    '            gone[i - k] = true;',
    '            if (inLow[i - k]) lowSize--; else highSize--;',
    '        }',
    '        if (lowSize == 0 || nums[i] <= peek(low, gone)[0]) { low.add(new int[]{nums[i], i}); inLow[i] = true; lowSize++; }',
    '        else { high.add(new int[]{nums[i], i}); highSize++; }',
    '        if (lowSize > highSize + 1) { int[] t = pop(low, gone); high.add(t); inLow[t[1]] = false; lowSize--; highSize++; }',
    '        else if (lowSize < highSize) { int[] t = pop(high, gone); low.add(t); inLow[t[1]] = true; highSize--; lowSize++; }',
    '        if (i >= k - 1) {',
    '            ans[i - k + 1] = (k % 2 == 1) ? peek(low, gone)[0] : ((double) peek(low, gone)[0] + peek(high, gone)[0]) / 2;',
    '        }',
    '    }',
    '    return ans;',
    '}',
    '// peek / pop first discard entries whose gone[index] is true, then act on the top',
    'private int[] peek(PriorityQueue<int[]> h, boolean[] gone) { while (gone[h.peek()[1]]) h.poll(); return h.peek(); }',
    'private int[] pop(PriorityQueue<int[]> h, boolean[] gone) { peek(h, gone); return h.poll(); }',
  ],
  python: [
    'def median_sliding_window(nums, k):',
    '    low, high = [], []                  # low: max-heap of (-value, index); high: min-heap of (value, index)',
    '    gone, in_low = set(), set()',
    '    low_size = high_size = 0',
    '    ans = []',
    '    def top(h):                         # drop stale entries, then peek',
    '        while h[0][1] in gone: heapq.heappop(h)',
    '        return h[0]',
    '    for i, x in enumerate(nums):',
    '        if i >= k:',
    '            gone.add(i - k)             # lazy deletion: only mark it',
    '            if (i - k) in in_low: low_size -= 1',
    '            else: high_size -= 1',
    '        if low_size == 0 or x <= -top(low)[0]:',
    '            heapq.heappush(low, (-x, i)); in_low.add(i); low_size += 1',
    '        else:',
    '            heapq.heappush(high, (x, i)); high_size += 1',
    '        if low_size > high_size + 1:',
    '            v, j = top(low); heapq.heappop(low)',
    '            heapq.heappush(high, (-v, j)); in_low.discard(j); low_size -= 1; high_size += 1',
    '        elif low_size < high_size:',
    '            v, j = top(high); heapq.heappop(high)',
    '            heapq.heappush(low, (-v, j)); in_low.add(j); high_size -= 1; low_size += 1',
    '        if i >= k - 1:',
    '            ans.append(-top(low)[0] if k % 2 else (-top(low)[0] + top(high)[0]) / 2)',
    '    return ans',
  ],
  algorithm: [
    'Keep the lower half in a max-heap and the upper half in a min-heap',
    'When the window slides, mark the leaving element as gone (lazy delete) and update the half sizes',
    'Insert the entering element into the lower or upper half by comparing it with the lower root',
    'Rebalance so the lower half has the same size or one more',
    'Discard stale roots and read the median from the root(s)',
    'Each element was pushed once and popped at most once, so the whole slide costs O(n log k)',
  ],
  complexity: [{ label: 'Time', value: 'O(n log k) amortised' }, { label: 'Space', value: 'O(n)' }],
  why: 'The sizes are tracked with counters of live elements, so stale entries inside the heaps never distort the balance; they are removed only when they reach the root, which costs each element at most one pop in total. Because every live value of the lower half is ≤ every live value of the upper half and the sizes differ by at most one, the median of the window is always at the root of the lower heap (odd k) or the mean of the two roots (even k).',
};
