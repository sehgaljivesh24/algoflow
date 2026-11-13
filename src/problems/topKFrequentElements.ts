import type { Cell, CellState, ProblemDef, Scene, Step } from '../engine/types.ts';
import { Heap, emitter, heapExtra, parseInts, parseOne, parts } from './listheapKit.ts';
import type { HeapEvent } from './listheapKit.ts';

interface In { nums: number[]; k: number }
interface Item { n: number; f: number }

function parse(raw: string): In {
  const [a, b] = parts(raw, 2, 'numbers ; k — e.g. 1 1 1 2 2 3 ; 2');
  const nums = parseInts(a, { max: 10, hint: '1 1 1 2 2 3 ; 2' });
  return { nums, k: parseOne(b, 1, new Set(nums).size, 'k (at most the number of distinct values)') };
}

function build({ nums, k }: In): Step[] {
  const freq = new Map<number, number>();
  const heap = new Heap<Item>('min', (x, y) => x.f < y.f, (x) => x.n, (x) => `×${x.f}`);
  let i = -1;
  let phase: 'count' | 'heap' = 'count';
  let hot: Record<number, CellState> = {};
  let cur: Item | undefined;
  let entries: Item[] = [];
  let ei = -1;
  const steps: Step[] = [];
  const emit = emitter(steps, () => {
    const cells: Cell[] = nums.map((v, j) => ({ key: j, value: v, state: j === i ? 'active' : j < i ? 'sorted' : undefined }));
    const scene: Scene | undefined = phase === 'heap'
      ? {
          kind: 'split',
          stack: true,
          parts: [
            {
              kind: 'array',
              cells: entries.map((e, j): Cell => ({ key: `e${j}`, value: `${e.n}×${e.f}`, state: j === ei ? 'active' : j < ei ? 'sorted' : undefined })),
              pointers: ei >= 0 && ei < entries.length ? [{ id: 'e', label: 'entry', index: ei, tone: 'blue' as const }] : [],
            },
            heap.scene(hot),
          ],
        }
      : undefined;
    return {
      ...(scene ? { scene } : { cells, pointers: i >= 0 && i < nums.length ? [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }] : [] }),
      aux: [
        { title: 'frequency map (num → count)', kind: 'map' as const, items: [...freq].map(([n, f]) => `${n} → ${f}`), highlight: cur ? [...freq.keys()].indexOf(cur.n) : undefined },
        ...(phase === 'heap' ? [heap.aux(`min-heap by frequency (size ≤ ${k})`)] : []),
      ],
      vars: { num: cur ? cur.n : '—', freq: cur ? cur.f : '—', 'heap size': `${heap.size}/${k}`, 'root freq': heap.size ? heap.peek().f : '—' },
    };
  });
  const cb = (java: number[], py: number[], algo: number) => (e: HeapEvent) => { hot = e.hot; emit(e.title, e.desc, e.logic, e.tone, java, py, algo, undefined, heapExtra(e)); };

  emit('Start', `Find the ${k} most frequent value${k === 1 ? '' : 's'}. First count every value, then keep only the top ${k} by count.`, 'Counting is O(n); selecting the top k with a small heap avoids sorting every distinct value.', 'info', [1], [1], 0,
    undefined, { tag: 'INIT', note: `freq = {}, k = ${k}` });

  for (i = 0; i < nums.length; i++) {
    freq.set(nums[i], (freq.get(nums[i]) ?? 0) + 1);
    cur = { n: nums[i], f: freq.get(nums[i])! };
    emit(`Count ${nums[i]}`, `Read nums[${i}] = ${nums[i]}: it has now been seen ${cur.f} time${cur.f === 1 ? '' : 's'}.`, 'A hash map turns the array into value → frequency pairs in one pass.', 'info', [2], [1], 0,
      undefined, { tag: 'COUNT', note: `freq[${nums[i]}] = ${cur.f}` });
  }
  i = nums.length;
  cur = undefined;
  phase = 'heap';
  entries = [...freq].map(([n, f]) => ({ n, f }));
  emit('Counting done', `${freq.size} distinct value${freq.size === 1 ? '' : 's'}. Feed the (value, count) pairs into a min-heap ordered by count, keeping at most ${k}.`, 'The heap root is always the least frequent of the survivors, i.e. the first one to drop out.', 'info', [3], [2, 3], 1,
    undefined, { tag: 'HEAP', note: `pq = min-heap by count; ${freq.size} entries to offer` });

  for (ei = 0; ei < entries.length; ei++) {
    cur = entries[ei];
    hot = {};
    heap.push(cur, cb([5], [4], 2));
    if (heap.size > k) {
      const drop = heap.peek();
      hot = { 0: 'error' };
      emit(`Heap too big: drop ${drop.n}`, `The heap holds ${heap.size} > ${k} pairs. The root (value ${drop.n}, count ${drop.f}) is the least frequent, so it is removed.`, 'Whatever is at the root can no longer be among the k most frequent.', 'warn', [6], [5, 6], 2,
        undefined, { tag: 'EVICT', note: `size ${heap.size} > k = ${k}: poll() removes ${drop.n} (×${drop.f})`, alert: `Value ${drop.n} (×${drop.f}) is the least frequent of ${heap.size} and is evicted.` });
      heap.pop(cb([6], [6], 2));
      hot = {};
    }
  }

  const answer = [...heap.a].sort((p, q) => q.f - p.f || p.n - q.n);
  cur = undefined;
  ei = entries.length;
  hot = {};
  emit('Done', `The heap holds the ${k} most frequent value${k === 1 ? '' : 's'}: ${answer.map((a) => `${a.n} (×${a.f})`).join(', ')}.`, 'Read them out of the heap in any order.', 'success', [8, 9, 10], [7], 3,
    { title: `[${answer.map((a) => a.n).join(', ')}]`, text: answer.map((a) => `${a.n} appears ${a.f}×`).join('; ') },
    { tag: '✅ Done!', note: `return [${answer.map((a) => a.n).join(', ')}]` });
  return steps;
}

export const topKFrequentElements: ProblemDef<In> = {
  slug: '347-top-k-frequent-elements',
  id: '347', title: 'Top K Frequent Elements', difficulty: 'Medium', category: 'Heap', tag: 'heap + frequency map',
  statement: 'Given an integer array and k, return the k values that occur most often, in any order. The answer is guaranteed to be unique when the input comes from the problem tests.',
  constraints: '1 ≤ k ≤ number of distinct values ≤ n ≤ 10⁵ (animation input: up to 10 numbers; ties at the cut-off may be broken either way)',
  examples: [
    { label: '1 1 1 2 2 3, k = 2', input: { nums: [1, 1, 1, 2, 2, 3], k: 2 }, output: '[1, 2]', answer: '[1, 2] (1 appears 3 times, 2 appears twice, 3 only once)' },
    { label: '4, k = 1', input: { nums: [4], k: 1 }, output: '[4]' },
    { label: '5 3 5 3 5 8 8 8 8, k = 2', input: { nums: [5, 3, 5, 3, 5, 8, 8, 8, 8], k: 2 }, output: '[8, 5]' },
  ],
  inputPlaceholder: 'numbers ; k — e.g. 1 1 1 2 2 3 ; 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  emphasis: ['k values that occur most often', 'most often'],
  phases: [
    { icon: '🔢', label: 'Count frequencies', tone: 'blue' },
    { icon: '🏔️', label: 'Create heap', tone: 'cyan' },
    { icon: '⚖️', label: 'Push, trim to k', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Current element', state: 'active' }, { label: 'Counted / offered', state: 'sorted' }, { label: 'Swapping in heap', state: 'swap' }, { label: 'Dropped (least frequent)', state: 'error' }, { label: 'Settled', state: 'found' }],
  varLabels: ['num', 'freq', 'heap size', 'root freq'],
  approach: {
    title: 'Count, then keep the top k in a min-heap',
    text: 'Build a frequency map. Push each (value, count) pair into a min-heap keyed by count; whenever the heap grows beyond k, pop the root — the least frequent pair. What remains are the k most frequent values.',
  },
  java: [
    'public int[] topKFrequent(int[] nums, int k) {',
    '    Map<Integer, Integer> freq = new HashMap<>();',
    '    for (int x : nums) freq.merge(x, 1, Integer::sum);',
    '    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);',
    '    for (var e : freq.entrySet()) {',
    '        pq.offer(new int[]{e.getKey(), e.getValue()});',
    '        if (pq.size() > k) pq.poll();',
    '    }',
    '    int[] res = new int[k];',
    '    for (int i = 0; i < k; i++) res[i] = pq.poll()[0];',
    '    return res;',
    '}',
  ],
  python: [
    'def top_k_frequent(nums, k):',
    '    freq = Counter(nums)',
    '    heap = []',
    '    for num, f in freq.items():',
    '        heapq.heappush(heap, (f, num))',
    '        if len(heap) > k:',
    '            heapq.heappop(heap)',
    '    return [num for f, num in heap]',
  ],
  algorithm: [
    'Count how often each value occurs with a hash map',
    'Create a min-heap ordered by frequency',
    'Push every (value, count) pair; if the heap exceeds k, pop the root',
    'The values left in the heap are the k most frequent',
  ],
  complexity: [{ label: 'Time', value: 'O(n log k)' }, { label: 'Space', value: 'O(n)' }],
  why: 'After processing any prefix of the distinct values the heap holds the k most frequent of them: a newcomer either belongs in the top k (and the least frequent member, at the root, is evicted) or is itself the least frequent and is the one removed. The heap never exceeds k + 1 items, so each push and pop costs O(log k) instead of the O(log d) of sorting all d distinct values.',
};
