import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { Heap, emitter, heapExtra, parseOne, parts } from './listheapKit.ts';
import type { HeapEvent } from './listheapKit.ts';

interface In { points: [number, number][]; k: number }
interface Pt { x: number; y: number; d: number }

function parse(raw: string): In {
  const [a, b] = parts(raw, 2, 'points ; k — e.g. 1 3, -2 2, 5 8, 0 1 ; 2 (each point is "x y")');
  const items = a.split(',').map((s) => s.trim()).filter(Boolean);
  if (items.length < 1 || items.length > 8) throw new Error('Give 1–8 points separated by commas, e.g. 1 3, -2 2, 5 8');
  const points = items.map((s) => {
    const m = s.split(/\s+/);
    if (m.length !== 2 || !m.every((t) => /^-?\d+$/.test(t)) || m.some((t) => Math.abs(+t) > 9)) throw new Error(`Bad point "${s}". Write "x y" with whole numbers from −9 to 9`);
    return [+m[0], +m[1]] as [number, number];
  });
  return { points, k: parseOne(b, 1, points.length, 'k') };
}

function build({ points, k }: In): Step[] {
  const heap = new Heap<Pt>('max', (p, q) => p.d > q.d, (p) => p.d, (p) => `(${p.x},${p.y})`);
  let i = -1;
  let hot: Record<number, CellState> = {};
  let cur = '—';
  let dist: number | string = '—';
  const steps: Step[] = [];
  const emit = emitter(steps, () => ({
    scene: {
      kind: 'split' as const,
      stack: true,
      parts: [
        {
          kind: 'array' as const,
          cells: points.map(([x, y], j): Cell => ({ key: j, value: `(${x},${y})`, state: j === i ? 'active' : j < i ? 'sorted' : undefined })),
          pointers: i >= 0 && i < points.length ? [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }] : [],
        },
        heap.scene(hot),
      ],
    },
    aux: [
      { title: 'max-heap as array (dist² (x,y))', kind: 'list' as const, items: heap.a.map((p) => `${p.d} (${p.x},${p.y})`), highlight: heap.size ? 0 : undefined },
    ],
    vars: { point: cur, 'dist²': dist, 'heap size': `${heap.size}/${k}`, 'farthest kept': heap.size ? heap.peek().d : '—' },
  }));
  const cb = (java: number[], py: number[], algo: number) => (e: HeapEvent) => { hot = e.hot; emit(e.title, e.desc, e.logic, e.tone, java, py, algo, undefined, heapExtra(e)); };

  emit('Start', `Find the ${k} point${k === 1 ? '' : 's'} closest to the origin. We keep a max-heap of the ${k} closest seen so far, ordered by squared distance (no square root needed).`,
    'The root of a max-heap is the farthest of the k closest — exactly the one to throw away when a closer point shows up.', 'info', [1], [1], 0,
    undefined, { tag: 'INIT', note: `pq = max-heap by dist², k = ${k}` });

  for (i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    const p: Pt = { x, y, d: x * x + y * y };
    cur = `(${x},${y})`;
    dist = p.d;
    hot = {};
    emit(`Read (${x}, ${y})`, `Point ${i} is (${x}, ${y}): squared distance ${x}² + ${y}² = ${p.d}.`, 'Comparing squared distances gives the same order as comparing real distances, and avoids floating point.', 'info', [2, 3], [2, 3], 1,
      undefined, { tag: 'MEASURE', note: `${x}*${x} + ${y}*${y} = ${p.d}` });
    heap.push(p, cb([3], [4], 2));
    if (heap.size > k) {
      const far = heap.peek();
      hot = { 0: 'error' };
      emit(`Heap too big: drop (${far.x}, ${far.y})`, `${heap.size} points are in the heap but only ${k} are wanted. The root (${far.x}, ${far.y}), distance² ${far.d}, is the farthest of them.`, 'The farthest point can never be among the k closest.', 'warn', [4], [5], 2,
        undefined, { tag: 'EVICT', note: `size ${heap.size} > k = ${k}: poll() drops (${far.x},${far.y}) with dist² ${far.d}`, alert: `(${far.x}, ${far.y}) is the farthest (dist² ${far.d}) of ${heap.size} points and is evicted.` });
      heap.pop(cb([4], [6], 2));
    }
    hot = {};
  }

  const ans = [...heap.a].sort((p, q) => p.d - q.d || p.x - q.x || p.y - q.y);
  i = points.length;
  cur = '—';
  dist = '—';
  hot = {};
  emit('Done', `The heap now holds the ${k} closest point${k === 1 ? '' : 's'}: ${ans.map((p) => `(${p.x}, ${p.y})`).join(', ')}.`, 'Every point not in the heap was pushed out by something closer.', 'success', [6], [7], 3,
    { title: `[${ans.map((p) => `[${p.x},${p.y}]`).join(', ')}]`, text: ans.map((p) => `(${p.x},${p.y}) dist² ${p.d}`).join('; ') },
    { tag: '✅ Done!', note: `return ${ans.map((p) => `(${p.x},${p.y})`).join(', ')}` });
  return steps;
}

export const kClosestPoints: ProblemDef<In> = {
  slug: '973-k-closest-points-to-origin',
  id: '973', title: 'K Closest Points to Origin', difficulty: 'Medium', category: 'Heap', tag: 'max-heap of size k',
  statement: 'Given a list of points on a plane and an integer k, return the k points closest to the origin (0, 0) by Euclidean distance, in any order.',
  constraints: '1 ≤ k ≤ points.length ≤ 10⁴ (animation input: up to 8 points with coordinates −9..9; ties at the cut-off may be broken either way)',
  examples: [
    { label: '1 3, -2 2 ; k = 1', input: { points: [[1, 3], [-2, 2]], k: 1 }, output: '[[-2,2]]', answer: '[[-2,2]] (dist² 8 beats dist² 10)' },
    { label: '3 3, 5 -1, -2 4 ; k = 2', input: { points: [[3, 3], [5, -1], [-2, 4]], k: 2 }, output: '[[3,3],[-2,4]]' },
    { label: '1 3, -2 2, 5 8, 0 1 ; k = 2', input: { points: [[1, 3], [-2, 2], [5, 8], [0, 1]], k: 2 }, output: '[[0,1],[-2,2]]' },
  ],
  inputPlaceholder: 'points ; k — e.g. 1 3, -2 2, 5 8, 0 1 ; 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  emphasis: ['k points closest to the origin', 'Euclidean distance'],
  phases: [
    { icon: '🌱', label: 'Create max-heap', tone: 'blue' },
    { icon: '📏', label: 'Measure + push', tone: 'cyan' },
    { icon: '✂️', label: 'Trim to k', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Point being read', state: 'active' }, { label: 'Already read', state: 'sorted' }, { label: 'Swapping', state: 'swap' }, { label: 'Settled', state: 'found' }, { label: 'Farthest (dropped)', state: 'error' }],
  varLabels: ['point', 'dist²', 'heap size', 'farthest kept'],
  approach: {
    title: 'Max-heap of the k closest',
    text: 'Push each point into a max-heap keyed by squared distance. If the heap holds more than k points, pop the root, the farthest one. After all points, the heap contains the k closest.',
  },
  java: [
    'public int[][] kClosest(int[][] points, int k) {',
    '    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> dist(b) - dist(a));',
    '    for (int[] p : points) {',
    '        pq.offer(p);',
    '        if (pq.size() > k) pq.poll();',
    '    }',
    '    return pq.toArray(new int[0][]);',
    '}',
    'private int dist(int[] p) { return p[0] * p[0] + p[1] * p[1]; }',
  ],
  python: [
    'def k_closest(points, k):',
    '    heap = []',
    '    for x, y in points:',
    '        d = x * x + y * y',
    '        heapq.heappush(heap, (-d, x, y))',
    '        if len(heap) > k:',
    '            heapq.heappop(heap)',
    '    return [[x, y] for _, x, y in heap]',
  ],
  algorithm: [
    'Create an empty max-heap ordered by squared distance',
    'Compute each point’s squared distance and push it',
    'If the heap has more than k points, pop the farthest (the root)',
    'Return the points left in the heap',
  ],
  complexity: [{ label: 'Time', value: 'O(n log k)' }, { label: 'Space', value: 'O(k)' }],
  why: 'The heap always contains the k closest points among those read so far: a new point either is closer than the current farthest member (which gets evicted) or is itself the farthest and is removed straight away. Squared distances preserve the ordering of real distances because squaring is monotonic on non-negative numbers, so sqrt is unnecessary.',
};
