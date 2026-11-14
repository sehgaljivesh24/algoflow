import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { arrow, chainKeys, chainOrder, emitter, listScene, parseInts, show } from './listheapKit.ts';
import type { Ptr } from './listheapKit.ts';

interface In { vals: number[] }

function build({ vals }: In): Step[] {
  const n = vals.length;
  const next: (number | null)[] = vals.map((_, i) => (i + 1 < n ? i + 1 : null));
  const cur: Record<string, number | null> = { slow: null, fast: null, prev: null, curr: null, l1: null, l2: null };
  const tones: Record<string, Ptr['tone']> = { slow: 'blue', fast: 'orange', prev: 'purple', curr: 'blue', l1: 'blue', l2: 'orange' };
  let order = vals.map((_, i) => i);
  let hot: Record<number, CellState> = {};
  const steps: Step[] = [];
  const emit = emitter(steps, () => ({
    scene: listScene(vals, next, Object.keys(cur).map((k) => ({ id: k, label: k, at: cur[k], tone: tones[k] })), hot, order),
    vars: { slow: show(cur.slow, vals), fast: show(cur.fast, vals), prev: show(cur.prev, vals), curr: show(cur.curr, vals), l1: show(cur.l1, vals), l2: show(cur.l2, vals) },
  }));

  cur.slow = 0;
  cur.fast = 0;
  emit('Start', 'Goal: L0 → Ln → L1 → Ln−1 → … Plan: find the middle, reverse the second half, then weave the two halves together.', 'Reordering needs the tail nodes in reverse order — a reversed second half provides exactly that, in place.', 'info', [1], [1], 0,
    undefined, { tag: 'START', note: `slow = fast = head = ${vals[0]}, ${n} node${n === 1 ? '' : 's'}` });

  let round = 0;
  while (next[cur.fast as number] !== null && next[next[cur.fast as number] as number] !== null) {
    cur.slow = next[cur.slow as number];
    cur.fast = next[next[cur.fast as number] as number];
    round++;
    emit(`Find middle: round ${round}`, `slow moves one step to ${show(cur.slow, vals)}, fast moves two steps to ${show(cur.fast, vals)}`, 'The loop stops while there is still room for slow to be the end of the first half.', 'info', [2, 3, 4], [2, 3, 4], 0,
      undefined, { tag: 'FIND MIDDLE', note: `slow = ${show(cur.slow, vals)}, fast = fast.next.next = ${show(cur.fast, vals)}` });
  }

  const mid = cur.slow as number;
  hot = { [mid]: 'compare' };
  emit('Middle found', `fast=${show(cur.fast, vals)} cannot jump two more nodes, so slow=${vals[mid]} is the end of the first half`, 'The loop stops while there is still room for slow to be the end of the first half.', 'success', [2], [2], 0,
    undefined, { tag: 'MIDDLE', note: `fast.next${next[cur.fast as number] === null ? '' : '.next'} == null → stop, slow = ${vals[mid]}` });
  const secondHead = next[mid];
  next[mid] = null;
  cur.fast = null;
  cur.curr = secondHead;
  emit('Cut the list after the middle', `slow=${vals[mid]} ends the first half: save curr = slow.next = ${show(secondHead, vals)} and set slow.next = null`, 'Cutting makes two independent lists: a first half and a second half to reverse.', 'info', [5, 6], [5, 6], 1,
    undefined, { tag: 'CUT', note: `curr = ${show(secondHead, vals)}; ${vals[mid]}.next = null` });

  const rev: number[] = [];
  while (cur.curr !== null) {
    const c = cur.curr;
    const nx = next[c];
    next[c] = cur.prev;
    rev.push(c);
    hot = { [mid]: 'compare', [c]: 'swap' };
    for (const r of rev.slice(0, -1)) hot[r] = 'sorted';
    emit(`Reverse: flip node ${vals[c]}`, `flip node ${vals[c]}: curr.next now points to ${cur.prev === null ? 'null' : vals[cur.prev]}`, 'Standard in-place reversal of the second half.', 'info', [8, 9, 10, 11], [7, 8, 9, 10], 1,
      undefined, { tag: 'REVERSE', note: `${vals[c]}.next = prev = ${cur.prev === null ? 'null' : vals[cur.prev]}; prev = ${vals[c]}` });
    cur.prev = c;
    cur.curr = nx;
  }
  cur.slow = null;
  cur.curr = null;
  cur.l1 = 0;
  cur.l2 = cur.prev;
  cur.prev = null;
  order = chainOrder(next, [0, cur.l2]);
  hot = {};
  emit('Halves ready', cur.l2 === null ? 'There is no second half (one node), so nothing to weave.' : `second half is reversed: l1 = ${vals[0]} (first half), l2 = ${vals[cur.l2]} (reversed second half), drawn as two lists`,
    'Now alternate: one node from l1, one from l2.', 'info', [13], [11], 2,
    undefined, { tag: 'HALVES', note: cur.l2 === null ? 'l2 == null: nothing to weave' : `l1 = head = ${vals[0]}, l2 = prev = ${vals[cur.l2]}` });

  while (cur.l2 !== null) {
    const a = cur.l1 as number;
    const b = cur.l2;
    const t1 = next[a];
    const t2 = next[b];
    next[a] = b;
    hot = { [a]: 'compare', [b]: 'swap' };
    emit(`Link ${vals[a]} → ${vals[b]}`, `remember t1=${show(t1, vals)} and t2=${show(t2, vals)}, then l1.next = l2 so ${vals[a]} now points to ${vals[b]}`, 'Save both successors first; otherwise the rest of each half would be lost.', 'info', [15, 16], [13, 14], 2,
      undefined, { tag: 'LINK', note: `t1 = ${show(t1, vals)}, t2 = ${show(t2, vals)}; ${vals[a]}.next = ${vals[b]}` });
    next[b] = t1;
    hot = { [a]: 'found', [b]: 'found' };
    cur.l1 = t1;
    cur.l2 = t2;
    emit(`Link ${vals[b]} → ${show(t1, vals)}`, `l2.next = t1 so ${vals[b]} now points to ${show(t1, vals)}; advance l1 = ${show(t1, vals)} and l2 = ${show(t2, vals)}`, 'The pair a → b has been spliced in; the rest is processed the same way.', 'success', [17, 18], [15, 16], 2,
      undefined, { tag: 'LINK', note: `${vals[b]}.next = ${show(t1, vals)}; l1 = ${show(t1, vals)}, l2 = ${show(t2, vals)}` });
    order = chainOrder(next, [0, cur.l2]);
  }

  const out = chainKeys(next, 0).map((k) => vals[k]);
  cur.l1 = null;
  hot = {};
  emit('Done', `l2 is null, so the list is reordered in place: ${arrow(out)}`, 'Nodes alternate between the front and the back of the original list.', 'success', [19], [16], 3, { title: arrow(out), text: 'Reordered in place' },
    { tag: '✅ Done!', note: `l2 == null → ${arrow(out)}` });
  return steps;
}

export const reorderList: ProblemDef<In> = {
  slug: '143-reorder-list',
  id: '143', title: 'Reorder List', difficulty: 'Medium', category: 'Linked List', tag: 'middle + reverse + merge',
  statement: 'Reorder L0 → L1 → … → Ln−1 → Ln into L0 → Ln → L1 → Ln−1 → L2 → Ln−2 → … in place, by relinking nodes (not by changing their values).',
  constraints: '1 ≤ n ≤ 5 × 10⁴ (animation input: 1–10 nodes)',
  examples: [
    { label: '1 2 3 4', input: { vals: [1, 2, 3, 4] }, output: '1 → 4 → 2 → 3' },
    { label: '1 2 3 4 5', input: { vals: [1, 2, 3, 4, 5] }, output: '1 → 5 → 2 → 4 → 3' },
    { label: '1 2', input: { vals: [1, 2] }, output: '1 → 2' },
  ],
  inputPlaceholder: 'e.g. 1 2 3 4 5',
  parseInput: (raw) => ({ vals: parseInts(raw, { max: 10, hint: '1 2 3 4 5' }) }),
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'End of first half', state: 'compare' }, { label: 'Being flipped / linked', state: 'swap' }, { label: 'Reversed half', state: 'sorted' }, { label: 'Woven pair', state: 'found' }],
  varLabels: ['slow', 'fast', 'prev', 'curr', 'l1', 'l2'],
  emphasis: ['in place', 'relinking nodes'],
  phases: [
    { icon: '🔎', label: 'FIND middle (slow / fast)', tone: 'cyan' },
    { icon: '🔄', label: 'CUT + REVERSE 2nd half', tone: 'orange' },
    { icon: '🧵', label: 'WEAVE halves', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Middle, reverse, weave',
    text: 'Three classic list tricks in a row: slow/fast pointers find the middle, the second half is reversed in place, and the two halves are interleaved by alternately relinking one node from each.',
  },
  java: [
    'public void reorderList(ListNode head) {',
    '    ListNode slow = head, fast = head;',
    '    while (fast.next != null && fast.next.next != null) {',
    '        slow = slow.next;',
    '        fast = fast.next.next;',
    '    }',
    '    ListNode prev = null, curr = slow.next;',
    '    slow.next = null;',
    '    while (curr != null) {',
    '        ListNode nxt = curr.next;',
    '        curr.next = prev;',
    '        prev = curr; curr = nxt;',
    '    }',
    '    ListNode l1 = head, l2 = prev;',
    '    while (l2 != null) {',
    '        ListNode t1 = l1.next, t2 = l2.next;',
    '        l1.next = l2;',
    '        l2.next = t1;',
    '        l1 = t1; l2 = t2;',
    '    }',
    '}',
  ],
  python: [
    'def reorder_list(head):',
    '    slow = fast = head',
    '    while fast.next and fast.next.next:',
    '        slow = slow.next',
    '        fast = fast.next.next',
    '    prev, curr = None, slow.next',
    '    slow.next = None',
    '    while curr:',
    '        nxt = curr.next',
    '        curr.next = prev',
    '        prev, curr = curr, nxt',
    '    l1, l2 = head, prev',
    '    while l2:',
    '        t1, t2 = l1.next, l2.next',
    '        l1.next = l2',
    '        l2.next = t1',
    '        l1, l2 = t1, t2',
  ],
  algorithm: [
    'Find the end of the first half with slow and fast pointers',
    'Cut the list there and reverse the second half in place',
    'Interleave: l1.next = l2, l2.next = t1, then advance both',
    'Stop when the second half is exhausted',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The target order alternates the front of the list with the back, walking inward. Reversing the second half turns "the back, walking inward" into an ordinary forward list, so each weaving step only relinks two nodes. The first half is never shorter than the second, so exhausting l2 is the right stopping point and a leftover first-half node is already in place.',
};
