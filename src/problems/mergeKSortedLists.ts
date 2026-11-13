import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { Heap, arrow, emitter, parseInts, plainList } from './listheapKit.ts';

interface In { lists: number[][] }

function parse(raw: string): In {
  const lists = raw.split(';').map((p) => parseInts(p, { min: 0, max: 6, hint: '1 4 5 ; 1 3 4 ; 2 6', sorted: true }));
  if (lists.length < 2 || lists.length > 4) throw new Error('Give 2–4 sorted lists separated by ";", e.g. 1 4 5 ; 1 3 4 ; 2 6');
  const total = lists.reduce((s, l) => s + l.length, 0);
  if (total < 1) throw new Error('At least one list must contain a node');
  if (total > 12) throw new Error('Use 12 nodes in total or fewer');
  return { lists };
}

interface Item { v: number; l: number }

function build({ lists }: In): Step[] {
  const heap = new Heap<Item>('min', (x, y) => x.v < y.v || (x.v === y.v && x.l < y.l), (x) => `${x.v} (L${x.l})`);
  const taken = lists.map(() => 0);
  const res: (number | string)[] = ['D'];
  let hl: number | undefined;
  let last = '—';
  let hot: Record<number, CellState> = {};
  let popped: { l: number; j: number } | undefined;
  let seeded = false;
  let finished = false;
  const steps: Step[] = [];
  const noop = () => {};
  const width = Math.max(...lists.map((l) => l.length), 1);
  const rows = (): Cell[][] =>
    lists.map((l, li) =>
      Array.from({ length: width }, (_, j): Cell => {
        if (j >= l.length) return { key: `L${li}-${j}`, value: '·', state: 'dim' };
        const isFront = seeded && j === taken[li] && !(popped && popped.l === li && popped.j === j);
        return {
          key: `L${li}-${j}`, value: l[j],
          state: popped && popped.l === li && popped.j === j ? 'found' : j < taken[li] ? 'sorted' : isFront ? 'active' : undefined,
        };
      }),
    );
  const emit = emitter(steps, () => ({
    scene: finished
      ? plainList(res, [{ id: 'tail', label: 'tail', at: res.length - 1, tone: 'purple' }], { [res.length - 1]: 'active', 0: 'dim' })
      : {
      kind: 'split' as const,
      stack: true,
      parts: [
        { kind: 'grid' as const, rows: rows(), rowHeads: lists.map((_, i) => `L${i}`), variant: 'matrix' as const },
        heap.scene(hot),
        plainList(res, [{ id: 'tail', label: 'tail', at: res.length - 1, tone: 'purple' }], res.length > 1 ? { [res.length - 1]: 'active', 0: 'dim' } : { 0: 'dim' }),
      ],
    },
    aux: [
      heap.aux('min-heap (value, list)', hl),
      { title: 'input lists (not yet output)', kind: 'map' as const, items: lists.map((l, i) => `L${i}: ${l.length - taken[i] ? l.slice(taken[i]).join(' → ') : '(empty)'}`) },
    ],
    vars: { 'heap size': `${heap.size}/${lists.filter((l) => l.length).length}`, 'last out': last, output: res.length - 1 },
  }));

  emit('Start', `${lists.length} sorted lists. The answer list starts as a dummy node D; a min-heap will always tell us which list has the smallest front value.`,
    'Only the fronts of the lists can be the next smallest value, so the heap never needs more than k entries.', 'info', [1, 3], [1, 2], 0,
    undefined, { tag: 'INIT', note: `dummy = D, tail = D, k = ${lists.length} lists` });

  lists.forEach((l, i) => { if (l.length) heap.push({ v: l[0], l: i }, noop, true); });
  seeded = true;
  emit('Seed the heap with every head', `Push the first node of each non-empty list: ${heap.size} front value${heap.size === 1 ? '' : 's'} in the heap, and the root ${heap.peek().v} is the smallest.`,
    'After this, the heap root is the overall minimum of the whole input.', 'info', [2], [3, 4], 1,
    undefined, { tag: 'SEED', note: `pq = fronts [${lists.filter((l) => l.length).map((l) => l[0]).join(', ')}], min = ${heap.peek().v}` });

  while (heap.size > 0) {
    hl = 0;
    hot = { 0: 'found' };
    const top = heap.peek();
    popped = { l: top.l, j: taken[top.l] };
    emit(`Pop the minimum: ${top.v}`, `The root is ${top.v}, the front of list L${top.l}: the smallest value not yet output.`, 'Each pop yields the next value of the merged order.', 'info', [5], [6], 2,
      undefined, { tag: 'POP MIN', note: `pq.poll() = ${top.v} from L${top.l}, heap size ${heap.size} → ${heap.size - 1}` });
    heap.pop(noop, true);
    hl = undefined;
    hot = {};
    popped = undefined;
    taken[top.l]++;
    res.push(top.v);
    last = String(top.v);
    const nextVal = lists[top.l][taken[top.l]];
    if (nextVal !== undefined) heap.push({ v: nextVal, l: top.l }, noop, true);
    emit(`Append ${top.v}${nextVal !== undefined ? `, push ${nextVal}` : ''}`,
      nextVal !== undefined ? `tail.next = ${top.v}. List L${top.l} still has ${nextVal}, so it takes the place of ${top.v} in the heap.` : `tail.next = ${top.v}. List L${top.l} is now exhausted, so the heap shrinks.`,
      nextVal !== undefined ? 'Replace the popped front by the next node of the same list.' : 'A finished list simply drops out.', 'success', [6, 7], [7, 8, 9], 3,
      undefined, {
        tag: 'APPEND',
        note: nextVal !== undefined ? `tail.next = ${top.v}; pq.offer(${nextVal}) from L${top.l}` : `tail.next = ${top.v}; L${top.l} is empty, nothing to offer`,
        alert: nextVal === undefined ? `List L${top.l} is exhausted: it drops out of the heap.` : undefined,
      });
  }

  const out = res.slice(1);
  finished = true;
  emit('Done', `The heap is empty. Return dummy.next: ${arrow(out)}.`, `${out.length} nodes were output using a heap of at most ${lists.length} entries.`, 'success', [9], [10], 4,
    { title: arrow(out), text: `Merged ${lists.length} lists` }, { tag: '✅ Done!', note: `return dummy.next → ${out.join(', ')}` });
  return steps;
}

export const mergeKSortedLists: ProblemDef<In> = {
  slug: '23-merge-k-sorted-lists',
  id: '23', title: 'Merge K Sorted Lists', difficulty: 'Hard', category: 'Linked List', tag: 'min-heap',
  statement: 'You are given k sorted linked lists. Merge them into one sorted linked list and return its head.',
  constraints: '0 ≤ k ≤ 10⁴, total nodes ≤ 10⁴ (animation input: 2–4 lists, 12 nodes in total, each list sorted)',
  examples: [
    { label: '1 4 5 ; 1 3 4 ; 2 6', input: { lists: [[1, 4, 5], [1, 3, 4], [2, 6]] }, output: '1 → 1 → 2 → 3 → 4 → 4 → 5 → 6', answer: '1 → 1 → 2 → 3 → 4 → 4 → 5 → 6 (all 8 nodes in sorted order)' },
    { label: '2 ; 1 ; 3', input: { lists: [[2], [1], [3]] }, output: '1 → 2 → 3' },
    { label: '1 2 ; (empty) ; 0 5', input: { lists: [[1, 2], [], [0, 5]] }, output: '0 → 1 → 2 → 5' },
  ],
  inputPlaceholder: 'lists separated by ; — e.g. 1 4 5 ; 1 3 4 ; 2 6',
  parseInput: parse, buildSteps: build, viz: 'cells',
  emphasis: ['k sorted linked lists', 'one sorted linked list'],
  phases: [
    { icon: '🧱', label: 'Dummy + heap', tone: 'blue' },
    { icon: '🌱', label: 'Seed with heads', tone: 'cyan' },
    { icon: '⬇️', label: 'Pop minimum', tone: 'orange' },
    { icon: '➕', label: 'Append + refill', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Front of a list (in the heap)', state: 'active' }, { label: 'Just popped', state: 'found' }, { label: 'Already output', state: 'sorted' }, { label: 'Dummy head / padding', state: 'dim' }],
  varLabels: ['heap size', 'last out', 'output'],
  approach: {
    title: 'k-way merge with a min-heap',
    text: 'Put the head of every list in a min-heap. Repeatedly pop the smallest, append it to the answer, and push the next node of the list it came from. The heap never holds more than k nodes.',
  },
  java: [
    'public ListNode mergeKLists(ListNode[] lists) {',
    '    PriorityQueue<ListNode> pq = new PriorityQueue<>((a, b) -> a.val - b.val);',
    '    for (ListNode l : lists) if (l != null) pq.offer(l);',
    '    ListNode dummy = new ListNode(0), tail = dummy;',
    '    while (!pq.isEmpty()) {',
    '        ListNode node = pq.poll();',
    '        tail.next = node; tail = node;',
    '        if (node.next != null) pq.offer(node.next);',
    '    }',
    '    return dummy.next;',
    '}',
  ],
  python: [
    'def merge_k_lists(lists):',
    '    heap = []',
    '    dummy = tail = ListNode(0)',
    '    for i, l in enumerate(lists):',
    '        if l: heapq.heappush(heap, (l.val, i, l))',
    '    while heap:',
    '        val, i, node = heapq.heappop(heap)',
    '        tail.next = node; tail = node',
    '        if node.next:',
    '            heapq.heappush(heap, (node.next.val, i, node.next))',
    '    return dummy.next',
  ],
  algorithm: [
    'Create a dummy head and an empty min-heap',
    'Push the head of every non-empty list',
    'Pop the smallest node from the heap',
    'Append it to the answer and push its successor; repeat until the heap is empty',
    'With the heap empty, return dummy.next',
  ],
  complexity: [{ label: 'Time', value: 'O(N log k)' }, { label: 'Space', value: 'O(k)' }],
  why: 'The next value of the merged list is always the smallest front among the k lists, and the heap keeps exactly those k fronts, answering "which is smallest?" in O(log k). Each of the N nodes is pushed and popped once, giving O(N log k) — better than merging lists one after another, which costs O(N·k).',
};
