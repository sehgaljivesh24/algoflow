import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { Heap } from './listheapKit.ts';
import { recorder } from './stepKit.ts';
import { gridScene, leaf, ordinal, parseNumRows, semis } from './p4Kit.ts';

interface In { m: number[][]; k: number }

const FORMAT = 'rows separated by "/" ; k — e.g. 1 5 9 / 10 11 13 / 12 13 15 ; 8';

function parse(raw: string): In {
  const p = semis(raw, 2, FORMAT);
  const m = parseNumRows(p[0], { example: '1 5 9 / 10 11 13 / 12 13 15', maxR: 5, maxC: 5, lo: -99, hi: 99 });
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[0].length; c++) {
      if ((c > 0 && m[r][c] < m[r][c - 1]) || (r > 0 && m[r][c] < m[r - 1][c])) throw new Error('Rows and columns must both be sorted in non-decreasing order');
    }
  }
  const k = Number(p[1].trim());
  if (!/^\d+$/.test(p[1].trim()) || k < 1 || k > m.length * m[0].length) throw new Error(`k must be a whole number from 1 to ${m.length * m[0].length}`);
  return { m, k };
}

interface Item { v: number; r: number; c: number }

function build({ m, k }: In): Step[] {
  const R = m.length;
  const C = m[0].length;
  const heap = new Heap<Item>('min', (x, y) => x.v < y.v || (x.v === y.v && (x.r < y.r || (x.r === y.r && x.c < y.c))), (x) => x.v, (x) => `(${x.r},${x.c})`, false);
  const noop = () => {};
  const popped = new Set<string>();
  const out: number[] = [];
  let cur: Item | null = null;
  let hot: Record<number, 'found'> = {};
  const steps: Step[] = [];

  const rows = (): Cell[][] =>
    m.map((row, r) => row.map((v, c): Cell => {
      const key = `${r},${c}`;
      const inHeap = heap.a.some((x) => x.r === r && x.c === c);
      const isCur = cur && cur.r === r && cur.c === c;
      return { key, value: v, state: isCur ? 'found' : popped.has(key) ? 'sorted' : inHeap ? 'active' : undefined };
    }));
  const say = recorder(steps, () => ({
    scene: { kind: 'split' as const, parts: [leaf(gridScene(rows())), leaf(heap.scene(hot))] },
    aux: [heap.aux('min-heap (value at row,col)'), { title: 'popped in order', kind: 'list' as const, items: out.map(String) }],
    vars: { popped: out.length, 'heap size': heap.size, current: cur ? cur.v : '—' },
  }));

  say({
    title: 'Start', desc: `A ${R}×${C} matrix whose rows and columns are sorted. Find the ${ordinal(k)} smallest value without flattening and sorting everything.`,
    logic: 'Each row is a sorted list, so this is a k-way merge: only the front of every row can be the next smallest value.', java: [2], py: [1, 2], algo: 0,
    tag: 'INIT', note: `${R} rows = ${R} sorted lists, k = ${k}`,
  });
  for (let r = 0; r < Math.min(R, k); r++) heap.push({ v: m[r][0], r, c: 0 }, noop, true);
  say({
    title: 'Seed the heap with the first column', desc: `Push the first value of ${Math.min(R, k)} row${Math.min(R, k) === 1 ? '' : 's'} (only the first k rows can matter).`,
    logic: 'The smallest value overall is the smallest first-column value, which is now the heap root.', java: [3], py: [3], algo: 1,
    tag: 'SEED', note: `pq = first column [${m.slice(0, Math.min(R, k)).map((row) => row[0]).join(', ')}], min = ${heap.peek().v}`,
  });

  for (let i = 1; i <= k; i++) {
    hot = { 0: 'found' };
    const top = heap.peek();
    say({
      title: `Pop #${i}: ${top.v} from row ${top.r}`, desc: `The root ${top.v} (row ${top.r}, column ${top.c}) is the ${ordinal(i)} smallest value in the whole matrix.`,
      logic: 'Everything still in the matrix is at least as large as the root, since each row is sorted and the heap holds every row front.', java: [6], py: [5], algo: 2,
      tag: `POP #${i}`, note: `cur = pq.poll() = ${top.v} at (${top.r},${top.c}); ${i} of ${k} done`,
    });
    heap.pop(noop, true);
    cur = top;
    popped.add(`${top.r},${top.c}`);
    out.push(top.v);
    hot = {};
    if (i === k) break;
    if (top.c + 1 < C) {
      heap.push({ v: m[top.r][top.c + 1], r: top.r, c: top.c + 1 }, noop, true);
      say({
        title: `Advance row ${top.r}`, desc: `Push the next value of row ${top.r}: ${m[top.r][top.c + 1]}.`,
        logic: 'Replace the popped front with its right neighbour so the row stays represented in the heap.', tone: 'success', java: [7], py: [6, 7], algo: 2,
        tag: 'ADVANCE', note: `col ${top.c} + 1 < ${C}: pq.add(${m[top.r][top.c + 1]}) from row ${top.r}`,
      });
    } else {
      say({
        title: `Row ${top.r} is used up`, desc: `Row ${top.r} has no more columns, so nothing is pushed.`,
        logic: 'A finished row simply drops out of the merge.', tone: 'info', java: [7], py: [6, 7], algo: 2,
        tag: 'ROW DONE', note: `col ${top.c} + 1 = ${C}: row ${top.r} is exhausted`,
        alert: `Row ${top.r} is used up: nothing to push, it leaves the merge.`,
      });
    }
  }

  const ans = out[out.length - 1];
  say({
    title: 'Done', desc: `The ${ordinal(k)} value popped is ${ans}.`,
    logic: `Popped order: ${out.join(', ')}. The heap never held more than ${Math.min(R, k)} entries.`, tone: 'success', java: [9], py: [8], algo: 3,
    result: { title: String(ans), text: `${ordinal(k)} smallest element` },
    tag: '✅ Done!', note: `return cur[0] = ${ans}`,
  });
  return steps;
}

export const kthSmallestInSortedMatrix: ProblemDef<In> = {
  slug: '378-kth-smallest-element-in-a-sorted-matrix',
  id: '378', title: 'Kth Smallest Element in a Sorted Matrix', difficulty: 'Medium', category: 'Heap', tag: 'k-way merge',
  statement: 'Every row and every column of a matrix is sorted in non-decreasing order. Return the k-th smallest value of the whole matrix (counting repeats).',
  constraints: 'n × n up to 300 × 300, 1 ≤ k ≤ n² (animation input: up to 5 × 5, values −99..99; write rows separated by "/" then ; k)',
  examples: [
    { label: '1 5 9 / 10 11 13 / 12 13 15 ; 8', input: { m: [[1, 5, 9], [10, 11, 13], [12, 13, 15]], k: 8 }, output: '13', answer: '13 (the 8th value popped in the merged order 1, 5, 9, 10, 11, 12, 13, 13)' },
    { label: '1 3 5 / 2 4 6 / 7 8 9 ; 4', input: { m: [[1, 3, 5], [2, 4, 6], [7, 8, 9]], k: 4 }, output: '4' },
    { label: '-5 -4 / -3 0 ; 3', input: { m: [[-5, -4], [-3, 0]], k: 3 }, output: '-3' },
  ],
  inputPlaceholder: FORMAT,
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'In the heap', state: 'active' }, { label: 'Popped earlier', state: 'sorted' }, { label: 'Just popped', state: 'found' }],
  emphasis: ['k-th smallest value', 'sorted in non-decreasing order'],
  phases: [
    { icon: '🔗', label: 'Rows as lists', tone: 'blue' },
    { icon: '🌱', label: 'Seed first column', tone: 'cyan' },
    { icon: '⬇️', label: 'Pop + advance', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['popped', 'heap size', 'current'],
  approach: {
    title: 'Merge the rows with a min-heap',
    text: 'Treat each row as a sorted list. Put the first value of each row into a min-heap. Pop k times: the value popped on the i-th pop is the i-th smallest. After every pop, push the next value of the same row. Only the first k rows ever need to be seeded.',
  },
  java: [
    'public int kthSmallest(int[][] matrix, int k) {',
    '    int n = matrix.length, m = matrix[0].length;',
    '    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);   // {value, row, col}',
    '    for (int r = 0; r < Math.min(n, k); r++) pq.add(new int[]{matrix[r][0], r, 0});',
    '    int[] cur = null;',
    '    for (int i = 0; i < k; i++) {',
    '        cur = pq.poll();                                  // the (i+1)-th smallest overall',
    '        if (cur[2] + 1 < m) pq.add(new int[]{matrix[cur[1]][cur[2] + 1], cur[1], cur[2] + 1});',
    '    }',
    '    return cur[0];',
    '}',
  ],
  python: [
    'def kth_smallest(matrix, k):',
    '    n, m = len(matrix), len(matrix[0])',
    '    heap = [(matrix[r][0], r, 0) for r in range(min(n, k))]',
    '    heapq.heapify(heap)',
    '    for _ in range(k):',
    '        value, r, c = heapq.heappop(heap)                # next smallest overall',
    '        if c + 1 < m:',
    '            heapq.heappush(heap, (matrix[r][c + 1], r, c + 1))',
    '    return value',
  ],
  algorithm: [
    'Treat every row as a sorted list',
    'Seed a min-heap with the first value of each row (at most k rows)',
    'Pop the minimum; push the next value from the same row',
    'The k-th popped value is the answer',
  ],
  complexity: [{ label: 'Time', value: 'O(k log min(n, k))' }, { label: 'Space', value: 'O(min(n, k))' }],
  why: 'The heap always contains the first not-yet-popped value of every row. The overall smallest unpopped value must be the front of some row (rows are sorted), so the root is exactly the next value of the merged order. Rows beyond the k-th can be ignored: the first entry of row k is at least as large as the first entries of the k rows above it, so k values are already no bigger than it.',
};
