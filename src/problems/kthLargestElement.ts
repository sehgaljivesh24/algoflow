import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { ordinal, plural } from './text.ts';
import { Heap, emitter, heapExtra, parseInts, parseOne, parts } from './listheapKit.ts';
import type { HeapEvent } from './listheapKit.ts';

interface In { nums: number[]; k: number }

function parse(raw: string): In {
  const [a, b] = parts(raw, 2, 'numbers ; k — e.g. 3 2 1 5 6 4 ; 2');
  const nums = parseInts(a, { max: 10, hint: '3 2 1 5 6 4 ; 2' });
  return { nums, k: parseOne(b, 1, nums.length, 'k') };
}

function build({ nums, k }: In): Step[] {
  const heap = new Heap<number>('min', (x, y) => x < y, (x) => x);
  let hot: Record<number, CellState> = {};
  let i = -1;
  let x: number | string = '—';
  let answer: number | string = '—';
  const skipped = new Set<number>();
  const steps: Step[] = [];
  const ord = `${k}${k === 1 ? 'st' : k === 2 ? 'nd' : k === 3 ? 'rd' : 'th'}`;
  const emit = emitter(steps, () => ({
    scene: {
      kind: 'split' as const,
      stack: true,
      parts: [
        {
          kind: 'array' as const,
          cells: nums.map((v, j): Cell => ({ key: j, value: v, state: j === i ? 'active' : skipped.has(j) ? 'dim' : undefined })),
          pointers: i >= 0 && i < nums.length ? [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }] : [],
        },
        heap.scene(hot),
      ],
    },
    aux: [heap.aux(`min-heap of the top ${k} so far (array form)`)],
    vars: { x, 'heap size': `${heap.size}/${k}`, 'cut-off (root)': heap.size ? heap.peek() : '—', answer },
  }));
  const cb = (java: number[], py: number[], algo: number) => (e: HeapEvent) => { hot = e.hot; emit(e.title, e.desc, e.logic, e.tone, java, py, algo, undefined, heapExtra(e)); };

  emit('Start', `Find the ${ord} largest value. We keep a min-heap that holds only the ${k} largest numbers seen so far.`,
    `The smallest of the top ${k} (the heap root) is exactly the ${ord} largest, and it is the one that gets evicted when something bigger arrives.`, 'info', [1], [1], 0,
    undefined, { tag: 'INIT', note: `pq = empty min-heap, k = ${k}` });

  for (i = 0; i < nums.length; i++) {
    x = nums[i];
    hot = {};
    if (heap.size < k) {
      emit(`Read ${x}: heap not full`, `The heap has ${heap.size} of ${plural(k, 'slot')} used, so ${x} goes straight in.`, 'Until k numbers are collected, every number is a candidate.', 'info', [3], [3], 1,
        undefined, { tag: 'FILL', note: `size ${heap.size} < k = ${k}: offer(${x})` });
      heap.push(nums[i], cb([3], [4], 1));
    } else if (nums[i] > heap.peek()) {
      const root = heap.peek();
      hot = { 0: 'error' };
      emit(`Read ${x}: ${x} > root ${root}`, `${x} beats the cut-off ${root}, so ${root} is no longer among the ${k} largest and is evicted.`, 'The new number displaces the current k-th largest.', 'warn', [4], [5], 2,
        undefined, { tag: 'EVICT', note: `${x} > peek() = ${root}: poll() then offer(${x})`, alert: `Root ${root} is evicted: ${x} is bigger, so ${root} cannot be in the top ${k}.` });
      heap.pop(cb([5], [6], 2));
      hot = {};
      heap.push(nums[i], cb([6], [6], 2));
    } else {
      hot = { 0: 'compare' };
      skipped.add(i);
      emit(`Read ${x}: ${x} ≤ root ${heap.peek()}`, `${x} is not larger than the cut-off ${heap.peek()}, so it cannot be in the top ${k}. It is skipped.`, 'Small numbers never enter the heap, which keeps its size at k.', 'info', [4], [5], 2,
        undefined, { tag: 'SKIP', note: `${x} ≤ peek() = ${heap.peek()}: ignore`, alert: `${x} is rejected: it does not beat the cut-off ${heap.peek()}.` });
    }
    hot = {};
  }

  i = nums.length;
  x = '—';
  hot = { 0: 'found' };
  const ans = heap.peek();
  answer = ans;
  emit('Done', `All numbers are read. The root ${ans} is the smallest of the ${k} largest, i.e. the ${ord} largest. Heap: ${[...heap.a].sort((p, q) => q - p).join(', ')}.`, `The heap contains the ${k} largest values: ${[...heap.a].sort((p, q) => q - p).join(', ')}.`, 'success', [9], [7], 3,
    { title: String(ans), text: `The ${ordinal(k)} largest element` }, { tag: '✅ Done!', note: `return peek() = ${ans}` });
  return steps;
}

export const kthLargestElement: ProblemDef<In> = {
  slug: '215-kth-largest-element-in-an-array',
  id: '215', title: 'Kth Largest Element in an Array', difficulty: 'Medium', category: 'Heap', tag: 'min-heap of size k',
  statement: 'Given an integer array and k, return the k-th largest element in sorted order (counting duplicates), without necessarily sorting the whole array.',
  constraints: '1 ≤ k ≤ nums.length ≤ 10⁵ (animation input: up to 10 numbers, values −99..99)',
  examples: [
    { label: '3 2 1 5 6 4, k = 2', input: { nums: [3, 2, 1, 5, 6, 4], k: 2 }, output: '5', answer: '5 (the heap {5, 6} keeps the 2 largest; its root 5 is the 2nd largest)' },
    { label: '3 2 3 1 2 4 5 5 6, k = 4', input: { nums: [3, 2, 3, 1, 2, 4, 5, 5, 6], k: 4 }, output: '4' },
    { label: '7, k = 1', input: { nums: [7], k: 1 }, output: '7' },
  ],
  inputPlaceholder: 'numbers ; k — e.g. 3 2 1 5 6 4 ; 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  emphasis: ['k-th largest', 'sorted order'],
  phases: [
    { icon: '🌱', label: 'Create heap', tone: 'blue' },
    { icon: '📥', label: 'Fill to k', tone: 'cyan' },
    { icon: '⚔️', label: 'Compare with root', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Number being read', state: 'active' }, { label: 'Sifting (swap)', state: 'swap' }, { label: 'Settled / answer', state: 'found' }, { label: 'Cut-off being compared', state: 'compare' }, { label: 'Evicted root', state: 'error' }, { label: 'Skipped number', state: 'dim' }],
  varLabels: ['x', 'heap size', 'cut-off (root)', 'answer'],
  approach: {
    title: 'A small min-heap of the k biggest',
    text: 'Keep a min-heap capped at size k. While it has room, add the number. Once full, a number only matters if it beats the root (the smallest of the top k): then the root is removed and the number is added. At the end the root is the k-th largest.',
  },
  java: [
    'public int findKthLargest(int[] nums, int k) {',
    '    PriorityQueue<Integer> pq = new PriorityQueue<>();',
    '    for (int x : nums) {',
    '        if (pq.size() < k) pq.offer(x);',
    '        else if (x > pq.peek()) {',
    '            pq.poll();',
    '            pq.offer(x);',
    '        }',
    '    }',
    '    return pq.peek();',
    '}',
  ],
  python: [
    'def find_kth_largest(nums, k):',
    '    heap = []',
    '    for x in nums:',
    '        if len(heap) < k:',
    '            heapq.heappush(heap, x)',
    '        elif x > heap[0]:',
    '            heapq.heapreplace(heap, x)',
    '    return heap[0]',
  ],
  algorithm: [
    'Create an empty min-heap that will hold the k largest values',
    'While the heap has fewer than k items, push the number',
    'Once full, a number only matters if it beats the root: pop the root and push it, otherwise skip it',
    'After the last number, the root is the k-th largest',
  ],
  complexity: [{ label: 'Time', value: 'O(n log k)' }, { label: 'Space', value: 'O(k)' }],
  why: 'Invariant: after each number the heap holds the k largest values seen so far. A number not larger than the root cannot belong to them, and one that is larger must replace the current smallest member. The root is therefore the smallest of the top k — the k-th largest. Heap operations cost O(log k) rather than O(log n), and no full sort is needed.',
};
