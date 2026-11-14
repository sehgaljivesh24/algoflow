import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { Heap, emitter, parseInts } from './listheapKit.ts';
import type { HeapEvent } from './listheapKit.ts';

interface In { nums: number[] }

function build({ nums }: In): Step[] {
  const low = new Heap<number>('max', (x, y) => x > y, (x) => x, undefined, false);
  const high = new Heap<number>('min', (x, y) => x < y, (x) => x, undefined, false);
  low.rootLabel = 'max';
  high.rootLabel = 'min';
  let hotLow: Record<number, CellState> = {};
  let hotHigh: Record<number, CellState> = {};
  let adding: number | string = '—';
  let median: number | string = '—';
  const medians: number[] = [];
  const steps: Step[] = [];
  const emit = emitter(steps, () => {
    const diff = low.size - high.size;
    const okBalance = diff === 0 || diff === 1;
    return {
      scene: { kind: 'split' as const, parts: [low.scene(hotLow), high.scene(hotHigh)] },
      aux: [
        { title: 'balance rule', kind: 'list' as const, items: [`lower half ${low.size}`, `upper half ${high.size}`, `${low.size} − ${high.size} = ${diff} ${okBalance ? '✓' : '✗ must be 0 or 1'}`], bad: okBalance ? [] : [2] },
        low.aux('lower half: max-heap array (root = its largest)', low.size ? 0 : undefined),
        high.aux('upper half: min-heap array (root = its smallest)', high.size ? 0 : undefined),
        { title: 'medians so far', kind: 'list' as const, items: medians.map(String) },
      ],
      vars: { adding, 'low size': low.size, 'high size': high.size, median },
    };
  });
  const cb = (h: Heap<number>, name: string, java: number[], py: number[], algo: number) => (e: HeapEvent) => {
    hotLow = h === low ? e.hot : {};
    hotHigh = h === high ? e.hot : {};
    emit(`${name === 'lower half' ? 'Low' : 'High'}: ${e.title}`, `(${name}) ${e.desc}`, e.logic, e.tone, java, py, algo, undefined,
      { tag: `${name === 'lower half' ? 'LOW' : 'HIGH'} · ${e.tag ?? ''}`.replace(/ · $/, ''), note: e.note });
  };

  emit('Start', 'Split the numbers seen so far into a lower half (max-heap, root = its largest) and an upper half (min-heap, root = its smallest). The median always sits at the roots.',
    'Invariant: every number in the lower half ≤ every number in the upper half, and the lower half has the same size or one more.', 'info', [1, 2], [2], 0,
    undefined, { tag: 'INIT', note: 'low = max-heap, high = min-heap, both empty' });

  for (const x of nums) {
    adding = x;
    hotLow = {};
    hotHigh = {};
    emit(`addNum(${x})`, `Number ${x} arrives. It goes through the lower half first, then the lower half's largest element is handed to the upper half.`,
      'Pushing through the lower half guarantees the largest of the lower values moves up, keeping the halves correctly ordered.', 'info', [3], [3], 1,
      undefined, { tag: 'ADD NUM', note: `addNum(${x}): low=${low.size} high=${high.size}` });
    low.push(x, cb(low, 'lower half', [4], [4], 1));
    const moved = low.pop(cb(low, 'lower half', [5], [5], 1));
    high.push(moved, cb(high, 'upper half', [5], [5], 1));
    hotLow = {};
    hotHigh = {};
    if (high.size > low.size) {
      emit('Sizes are unbalanced', `The upper half has ${plural(high.size, 'number')} but the lower half only ${low.size}. The lower half must be equal or one larger, so move ${high.peek()} back down.`,
        'The size rule is what keeps the median at the roots.', 'warn', [6], [6], 2,
        undefined, { tag: 'REBALANCE', note: `high.size ${high.size} > low.size ${low.size}: move ${high.peek()} back`, alert: `Unbalanced: upper half ${high.size} > lower half ${low.size}. Move the upper root ${high.peek()} to the lower half.` });
      const back = high.pop(cb(high, 'upper half', [6], [6], 2));
      low.push(back, cb(low, 'lower half', [6], [7], 2));
    } else {
      emit('Sizes are balanced', `Lower half ${low.size}, upper half ${high.size}: the difference is ${low.size - high.size}, which is allowed. Nothing moves back.`,
        'The size rule holds without a fix-up.', 'info', [6], [6], 2,
        undefined, { tag: 'BALANCED', note: `high.size ${high.size} ≤ low.size ${low.size}: keep` });
    }
    hotHigh = {};
    hotLow = low.size ? { 0: 'found' } : {};
    const m = low.size > high.size ? low.peek() : (low.peek() + high.peek()) / 2;
    medians.push(m);
    median = m;
    emit(`findMedian() = ${m}`, low.size > high.size ? `The halves differ in size, so the median is the lower root: ${m}.` : `Both halves have ${plural(low.size, 'number')}: median = (${low.peek()} + ${high.peek()}) / 2 = ${m}.`,
      'The middle of the sorted data is always at the heap roots — no sorting needed.', 'success', low.size > high.size ? [9] : [10], low.size > high.size ? [9, 10] : [11], 3,
      undefined, { tag: 'MEDIAN', note: low.size > high.size ? `low.peek() = ${m}` : `(${low.peek()} + ${high.peek()}) / 2.0 = ${m}` });
  }

  hotLow = {};
  hotHigh = {};
  emit('Done', `Medians after each number: ${medians.join(', ')}.`, 'Each addNum cost O(log n); each findMedian was O(1).', 'success', [10], [11], 4,
    { title: String(medians[medians.length - 1]), text: `Medians after each add: ${medians.join(', ')}` }, { tag: '✅ Done!', note: `medians = ${medians.join(', ')}` });
  return steps;
}

export const findMedianFromDataStream: ProblemDef<In> = {
  slug: '295-find-median-from-data-stream',
  id: '295', title: 'Find Median from Data Stream', difficulty: 'Hard', category: 'Heap', tag: 'two heaps',
  statement: 'Design a structure that receives numbers one at a time (addNum) and can report the median of all numbers so far at any moment (findMedian). The median of an even count is the mean of the two middle values.',
  constraints: 'up to 5 × 10⁴ calls (animation input: up to 8 numbers, values −99..99; the median is reported after every number)',
  examples: [
    { label: '5 15 1 3', input: { nums: [5, 15, 1, 3] }, output: '5, 10, 5, 4', answer: '5, 10, 5, 4 (the median after each of the 4 numbers)' },
    { label: '2 3 4', input: { nums: [2, 3, 4] }, output: '2, 2.5, 3' },
    { label: '7 7 7 1', input: { nums: [7, 7, 7, 1] }, output: '7, 7, 7, 7' },
  ],
  inputPlaceholder: 'numbers in arrival order, e.g. 5 15 1 3',
  parseInput: (raw) => ({ nums: parseInts(raw, { max: 8, hint: '5 15 1 3' }) }),
  buildSteps: build, viz: 'cells',
  emphasis: ['median', 'addNum', 'findMedian'],
  phases: [
    { icon: '⚖️', label: 'Two empty heaps', tone: 'blue' },
    { icon: '➕', label: 'Add via lower half', tone: 'cyan' },
    { icon: '🔄', label: 'Rebalance sizes', tone: 'orange' },
    { icon: '🎯', label: 'Read median', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'New / moving', state: 'active' }, { label: 'Swapping', state: 'swap' }, { label: 'Settled / median root', state: 'found' }],
  varLabels: ['adding', 'low size', 'high size', 'median'],
  approach: {
    title: 'Two heaps around the middle',
    text: 'Keep the smaller half in a max-heap and the larger half in a min-heap, with the lower half never smaller than the upper. A new number goes into the lower heap, its maximum is handed to the upper heap, and if the upper heap got bigger one number is handed back. The median is read from the roots.',
  },
  java: [
    'class MedianFinder {',
    '    PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder());',
    '    PriorityQueue<Integer> high = new PriorityQueue<>();',
    '    public void addNum(int num) {',
    '        low.offer(num);',
    '        high.offer(low.poll());',
    '        if (high.size() > low.size()) low.offer(high.poll());',
    '    }',
    '    public double findMedian() {',
    '        if (low.size() > high.size()) return low.peek();',
    '        return (low.peek() + high.peek()) / 2.0;',
    '    }',
    '}',
  ],
  python: [
    'class MedianFinder:',
    '    def __init__(self):',
    '        self.low, self.high = [], []   # low holds negatives (max-heap)',
    '    def add_num(self, num):',
    '        heapq.heappush(self.low, -num)',
    '        heapq.heappush(self.high, -heapq.heappop(self.low))',
    '        if len(self.high) > len(self.low):',
    '            heapq.heappush(self.low, -heapq.heappop(self.high))',
    '    def find_median(self):',
    '        if len(self.low) > len(self.high):',
    '            return -self.low[0]',
    '        return (-self.low[0] + self.high[0]) / 2',
  ],
  algorithm: [
    'Keep a max-heap for the lower half and a min-heap for the upper half',
    'addNum: push into the lower heap, then move its maximum to the upper heap',
    'Rebalance: if the upper heap is now larger, move its minimum back to the lower heap',
    'findMedian: the lower root if the halves differ in size, otherwise the mean of both roots',
    'After the last number the medians are reported: each add cost O(log n), each median O(1)',
  ],
  complexity: [{ label: 'Time', value: 'O(log n) add, O(1) median' }, { label: 'Space', value: 'O(n)' }],
  why: 'Pushing through the lower heap before moving its maximum up guarantees every lower value stays ≤ every upper value, and the size fix-up keeps |low| − |high| ∈ {0, 1}. With those two facts the middle element(s) of the sorted data are exactly the heap roots, so the median needs no sorting and an insert is just a few O(log n) heap operations.',
};
