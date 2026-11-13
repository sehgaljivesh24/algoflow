import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { Heap, emitter, parseInts } from './listheapKit.ts';
import type { HeapEvent } from './listheapKit.ts';

interface In { stones: number[] }

function build({ stones }: In): Step[] {
  const heap = new Heap<number>('max', (x, y) => x > y, (x) => x);
  heap.load(stones);
  let hot: Record<number, CellState> = {};
  let y: number | string = '—';
  let x: number | string = '—';
  let round = 0;
  const steps: Step[] = [];
  const emit = emitter(steps, () => ({ scene: heap.scene(hot), aux: [heap.aux('max-heap as array')], vars: { y, x, 'heap size': heap.size } }));
  const cb = (java: number[], py: number[], algo: number) => (e: HeapEvent) => { hot = e.hot; emit(e.title, e.desc, e.logic, e.tone, java, py, algo); };

  emit('Start', `Put all ${stones.length} stones into a max-heap, so the heaviest stone is always at the root.`,
    'Each round needs the two heaviest stones; a max-heap hands them over in O(log n).', 'info', [1, 2], [1, 2], 0);

  while (heap.size > 1) {
    round++;
    y = heap.pop(cb([4], [4], 1));
    hot = {};
    x = heap.pop(cb([5], [5], 1));
    hot = {};
    const diff = (y as number) - (x as number);
    emit(`Round ${round}: smash ${y} and ${x}`, diff === 0 ? `Equal weights: both stones are destroyed, nothing goes back.` : `The lighter stone (${x}) is destroyed and the heavier one shrinks to ${y} − ${x} = ${diff}.`,
      diff === 0 ? 'Equal stones cancel completely.' : 'Only the difference survives and returns to the pile.', diff === 0 ? 'warn' : 'info', [6], [6, 7], 2);
    if (diff !== 0) {
      heap.push(diff, cb([6], [7], 2));
      hot = {};
    }
  }

  const left = heap.size ? heap.peek() : 0;
  hot = heap.size ? { 0: 'found' } : {};
  emit('Done', heap.size ? `One stone is left: ${left}.` : 'No stones are left, so the answer is 0.', 'The loop runs while at least two stones remain.', 'success', [8], [8], 3,
    { title: String(left), text: heap.size ? 'Weight of the last stone' : 'No stone remains' });
  return steps;
}

export const lastStoneWeight: ProblemDef<In> = {
  slug: '1046-last-stone-weight',
  id: '1046', title: 'Last Stone Weight', difficulty: 'Easy', category: 'Heap', tag: 'max-heap',
  statement: 'Each turn, take the two heaviest stones with weights y ≥ x and smash them: if x == y both vanish, otherwise the stone of weight y − x remains. Return the weight of the last remaining stone (0 if none).',
  constraints: '1 ≤ stones.length ≤ 30, 1 ≤ weight ≤ 1000 (animation input: up to 8 stones, weights 1–99)',
  examples: [
    { label: '2 7 4 1 8 1', input: { stones: [2, 7, 4, 1, 8, 1] }, output: '1' },
    { label: '5', input: { stones: [5] }, output: '5' },
    { label: '3 3', input: { stones: [3, 3] }, output: '0' },
  ],
  inputPlaceholder: 'weights, e.g. 2 7 4 1 8 1',
  parseInput: (raw) => ({ stones: parseInts(raw, { max: 8, lo: 1, hi: 99, hint: '2 7 4 1 8 1' }) }),
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Being compared / moved', state: 'active' }, { label: 'Swapping', state: 'swap' }, { label: 'Settled / root', state: 'found' }],
  varLabels: ['y', 'x', 'heap size'],
  approach: {
    title: 'A max-heap gives the two heaviest',
    text: 'Keep the stones in a max-heap. Pop twice to get y ≥ x, push y − x back if it is non-zero, and repeat until at most one stone remains.',
  },
  java: [
    'public int lastStoneWeight(int[] stones) {',
    '    PriorityQueue<Integer> pq = new PriorityQueue<>(Collections.reverseOrder());',
    '    for (int s : stones) pq.offer(s);',
    '    while (pq.size() > 1) {',
    '        int y = pq.poll();',
    '        int x = pq.poll();',
    '        if (y != x) pq.offer(y - x);',
    '    }',
    '    return pq.isEmpty() ? 0 : pq.peek();',
    '}',
  ],
  python: [
    'def last_stone_weight(stones):',
    '    heap = [-s for s in stones]',
    '    heapq.heapify(heap)',
    '    while len(heap) > 1:',
    '        y = -heapq.heappop(heap)',
    '        x = -heapq.heappop(heap)',
    '        if y != x:',
    '            heapq.heappush(heap, -(y - x))',
    '    return -heap[0] if heap else 0',
  ],
  algorithm: [
    'Build a max-heap of all stones',
    'While at least two stones remain, pop the two heaviest (y ≥ x)',
    'If y ≠ x push y − x back into the heap',
    'Return the remaining stone, or 0 when the heap is empty',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Every round removes at least one stone, so there are fewer than n rounds, and each round costs a constant number of O(log n) heap operations. The heap is the right structure because the rule always asks for the current two maxima, and the value pushed back changes what the maxima are — sorting once would not stay correct.',
};
