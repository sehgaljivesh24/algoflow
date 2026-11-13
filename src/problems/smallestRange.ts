import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { Heap } from './listheapKit.ts';
import { recorder } from './stepKit.ts';
import { leaf } from './p4Kit.ts';

interface In { lists: number[][] }

function parse(raw: string): In {
  const lists = raw.split('/').map((p) => p.trim()).filter(Boolean).map((p) => p.split(/[\s,]+/).filter(Boolean).map(Number));
  const e = 'Write 2–4 sorted lists separated by "/", e.g. 4 10 15 24 26 / 0 9 12 20 / 5 18 22 30';
  if (lists.length < 2 || lists.length > 4 || lists.some((l) => !l.length || l.some((x) => !Number.isInteger(x)))) throw new Error(e);
  if (lists.some((l) => l.length > 6) || lists.reduce((s, l) => s + l.length, 0) > 14) throw new Error('Use at most 6 numbers per list and 14 in total');
  if (lists.some((l) => l.some((x) => x < 0 || x > 99))) throw new Error('Keep every value between 0 and 99');
  if (lists.some((l) => l.some((x, i) => i > 0 && x < l[i - 1]))) throw new Error('Every list must be sorted in non-decreasing order');
  return { lists };
}

interface Item { v: number; l: number; j: number }

function build({ lists }: In): Step[] {
  const K = lists.length;
  const W = Math.max(...lists.map((l) => l.length));
  const heap = new Heap<Item>('min', (x, y) => x.v < y.v || (x.v === y.v && x.l < y.l), (x) => x.v, (x) => `L${x.l}`, false);
  const noop = () => {};
  const used = new Set<string>();
  let cur: Item | null = null;
  let curMax = -1;
  let best: [number, number] = [0, 0];
  let hot: Record<number, 'found'> = {};
  const steps: Step[] = [];

  const rows = (): Cell[][] =>
    lists.map((l, li) => Array.from({ length: W }, (_, j): Cell => {
      if (j >= l.length) return { key: `${li},${j}`, value: '', state: 'dim' };
      const key = `${li},${j}`;
      const inHeap = heap.a.some((x) => x.l === li && x.j === j);
      return { key, value: l[j], state: cur && cur.l === li && cur.j === j ? 'found' : used.has(key) ? 'sorted' : inHeap ? 'active' : undefined };
    }));
  const say = recorder(steps, () => ({
    scene: {
      kind: 'split' as const,
      parts: [
        { kind: 'grid' as const, rows: rows(), rowHeads: lists.map((_, i) => `L${i}`), colHeads: Array.from({ length: W }, (_, j) => String(j)) },
        leaf(heap.scene(hot)),
      ],
    },
    aux: [heap.aux('min-heap: one front value per list'), { title: 'best range so far', kind: 'list' as const, items: curMax >= 0 ? [`[${best[0]}, ${best[1]}]`] : [] }],
    vars: { 'heap min': heap.size ? heap.peek().v : '—', 'current max': curMax >= 0 ? curMax : '—', best: curMax >= 0 ? `[${best[0]},${best[1]}]` : '—' },
  }));

  say({
    title: 'Start', desc: `${K} sorted lists. Find the narrowest range [a, b] that contains at least one number from every list.`,
    logic: 'A window that covers all lists must hold one front-runner from each list; the heap root is its left edge and a tracked maximum is its right edge.', java: [1], py: [1, 2], algo: 0,
    tag: 'INIT', note: `${K} lists: every range needs one number from each`,
  });
  lists.forEach((l, li) => { heap.push({ v: l[0], l: li, j: 0 }, noop, true); curMax = Math.max(curMax, l[0]); });
  best = [heap.peek().v, curMax];
  say({
    title: 'Seed one front value from each list', desc: `The heap holds ${heap.size} fronts. The window is [${heap.peek().v}, ${curMax}] and is the best so far.`,
    logic: 'This is the only window of fronts at the start; every later window slides the smallest front forward.', java: [3, 4, 5, 6, 7], py: [1, 2, 3, 4], algo: 1,
    tag: 'SEED', note: `fronts [${lists.map((l) => l[0]).join(', ')}]: min = ${heap.peek().v}, max = ${curMax}`,
  });

  for (;;) {
    hot = { 0: 'found' };
    const top = heap.peek();
    const size = curMax - top.v;
    const better = size < best[1] - best[0];
    if (better) best = [top.v, curMax];
    say({
      title: `Window [${top.v}, ${curMax}]`, desc: better ? `Width ${size} beats the previous best, so the best range becomes [${top.v}, ${curMax}].` : `Width ${size} is not narrower than the best (${best[1] - best[0]}); keep [${best[0]}, ${best[1]}].`,
      logic: 'The root is the smallest of the current fronts, so it is the left edge of the narrowest window that still has a representative of every list.', tone: better ? 'success' : 'info', java: [9, 10], py: [6, 7, 8], algo: 2,
      tag: better ? 'NEW BEST' : 'CHECK', note: better ? `${curMax} - ${top.v} = ${size} < previous: best = [${top.v}, ${curMax}]` : `${curMax} - ${top.v} = ${size} ≥ ${best[1] - best[0]}: keep [${best[0]}, ${best[1]}]`,
      alert: better ? undefined : `Window [${top.v}, ${curMax}] (width ${size}) is not narrower than the best (${best[1] - best[0]}).`,
    });
    heap.pop(noop, true);
    used.add(`${top.l},${top.j}`);
    cur = top;
    hot = {};
    if (top.j + 1 === lists[top.l].length) {
      say({
        title: `List L${top.l} is exhausted`, desc: `${top.v} was the last number of L${top.l}. Any window to the right would miss that list entirely, so the search ends.`,
        logic: 'Once any list has no more candidates, no remaining window can cover every list.', tone: 'warn', java: [11], py: [9, 10], algo: 3,
        tag: 'STOP', note: `cur[2] + 1 == ${lists[top.l].length}: break`,
        alert: `List L${top.l} is exhausted: no later window can cover every list. Search ends.`,
      });
      break;
    }
    const nxt = lists[top.l][top.j + 1];
    heap.push({ v: nxt, l: top.l, j: top.j + 1 }, noop, true);
    const prevMax = curMax;
    curMax = Math.max(curMax, nxt);
    say({
      title: `Advance L${top.l} to ${nxt}`, desc: `Push ${nxt} (next value of L${top.l}). The window's right edge is now ${curMax}.`,
      logic: 'Moving the smallest front forward is the only way to make the left edge larger; the max only ever grows.', java: [12, 13, 14], py: [11, 12, 13], algo: 3,
      tag: 'ADVANCE', note: `pq.add(${nxt}) from L${top.l}; max = max(${prevMax}, ${nxt}) = ${curMax}`,
    });
  }

  cur = null;
  hot = {};
  say({
    title: 'Done', desc: `The narrowest range covering every list is [${best[0]}, ${best[1]}].`,
    logic: `Every window examined had the form [heap min, running max]; the narrowest one was [${best[0]}, ${best[1]}].`, tone: 'success', java: [16], py: [14], algo: 4,
    result: { title: `[${best[0]},${best[1]}]`, text: 'Smallest range covering all lists' },
    tag: '✅ Done!', note: `return [${best[0]}, ${best[1]}]`,
  });
  return steps;
}

export const smallestRange: ProblemDef<In> = {
  slug: '632-smallest-range-covering-elements-from-k-lists',
  id: '632', title: 'Smallest Range Covering Elements from K Lists', difficulty: 'Hard', category: 'Heap', tag: 'k-way merge + running max',
  statement: 'Given k lists sorted in non-decreasing order, find the smallest range [a, b] that includes at least one number from each list. A range [a, b] is smaller than [c, d] if b − a < d − c, or a < c when the widths are equal.',
  constraints: '1 ≤ k ≤ 3500, total numbers ≤ 10⁵ (animation input: 2–4 lists, ≤ 14 numbers, values 0..99; write lists separated by "/")',
  examples: [
    { label: '4 10 15 24 26 / 0 9 12 20 / 5 18 22 30', input: { lists: [[4, 10, 15, 24, 26], [0, 9, 12, 20], [5, 18, 22, 30]] }, output: '[20,24]', answer: '[20,24] (24 from L0, 20 from L1, 22 from L2 all fall inside, width 4)' },
    { label: '1 2 3 / 1 2 3 / 1 2 3', input: { lists: [[1, 2, 3], [1, 2, 3], [1, 2, 3]] }, output: '[1,1]' },
    { label: '1 5 / 2 9 / 8', input: { lists: [[1, 5], [2, 9], [8]] }, output: '[5,9]' },
  ],
  inputPlaceholder: 'sorted lists separated by "/", e.g. 4 10 15 24 26 / 0 9 12 20 / 5 18 22 30',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Front of a list (in the heap)', state: 'active' }, { label: 'Passed over', state: 'sorted' }, { label: 'Window left edge (just popped)', state: 'found' }],
  emphasis: ['smallest range', 'at least one number from each list'],
  phases: [
    { icon: '📚', label: 'Read lists', tone: 'blue' },
    { icon: '🌱', label: 'Seed fronts', tone: 'cyan' },
    { icon: '📏', label: 'Check window', tone: 'gold' },
    { icon: '➡️', label: 'Advance min list', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['heap min', 'current max', 'best'],
  approach: {
    title: 'Min-heap of fronts plus a running maximum',
    text: 'Start with the first value of every list in a min-heap and remember the largest of them. That pair is a window covering all lists. To find a narrower one, the smallest front must move forward: pop it and push the next value of its list, updating the running maximum. Record the best window each time. Stop when a list runs out.',
  },
  java: [
    'public int[] smallestRange(List<List<Integer>> nums) {',
    '    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);   // {value, list, index}',
    '    int max = Integer.MIN_VALUE;',
    '    for (int i = 0; i < nums.size(); i++) {',
    '        pq.add(new int[]{nums.get(i).get(0), i, 0});',
    '        max = Math.max(max, nums.get(i).get(0));',
    '    }',
    '    int[] best = {pq.peek()[0], max};',
    '    while (true) {',
    '        int[] cur = pq.poll();                              // smallest front value',
    '        if (max - cur[0] < best[1] - best[0]) best = new int[]{cur[0], max};',
    '        if (cur[2] + 1 == nums.get(cur[1]).size()) break;   // a list ran out: stop',
    '        int nxt = nums.get(cur[1]).get(cur[2] + 1);',
    '        pq.add(new int[]{nxt, cur[1], cur[2] + 1});',
    '        max = Math.max(max, nxt);',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def smallest_range(nums):',
    '    heap = [(lst[0], i, 0) for i, lst in enumerate(nums)]',
    '    heapq.heapify(heap)',
    '    cur_max = max(lst[0] for lst in nums)',
    '    best = (heap[0][0], cur_max)',
    '    while True:',
    '        value, i, j = heapq.heappop(heap)              # smallest front value',
    '        if cur_max - value < best[1] - best[0]:',
    '            best = (value, cur_max)',
    '        if j + 1 == len(nums[i]):                      # a list ran out: stop',
    '            break',
    '        nxt = nums[i][j + 1]',
    '        heapq.heappush(heap, (nxt, i, j + 1))',
    '        cur_max = max(cur_max, nxt)',
    '    return list(best)',
  ],
  algorithm: [
    'Read the sorted lists; each needs a representative inside the range',
    'Push the first value of every list into a min-heap and track the maximum',
    'Pop the minimum: [min, max] is a candidate range, keep the narrowest',
    'Push the next value from the popped list and update the maximum; stop when a list is exhausted',
    'The narrowest window recorded along the way is the answer',
  ],
  complexity: [{ label: 'Time', value: 'O(N log k)' }, { label: 'Space', value: 'O(k)' }],
  why: 'Every range that covers all lists is determined by its left end a, which is some value v; the best range starting at v takes the smallest element ≥ v of each list, and the largest of those is exactly the running maximum at the moment v is the heap minimum. Scanning the left end upward through the merged order therefore visits an optimal range, and the scan stops correctly when a list has nothing ≥ the next left end.',
};
