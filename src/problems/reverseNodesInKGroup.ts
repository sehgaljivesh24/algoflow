import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { arrow, chainKeys, chainOrder, emitter, listScene, parseInts, parseOne, parts, show } from './listheapKit.ts';
import { annotate } from './annotate.ts';

interface In { vals: number[]; k: number }

function parse(raw: string): In {
  const [a, b] = parts(raw, 2, 'values ; k — e.g. 1 2 3 4 5 ; 2');
  const vals = parseInts(a, { max: 9, hint: '1 2 3 4 5 ; 2' });
  return { vals, k: parseOne(b, 1, vals.length, 'k') };
}

function build({ vals, k }: In): Step[] {
  const all: (number | string)[] = ['D', ...vals];
  const len = vals.length;
  const next: (number | null)[] = all.map((_, i) => (i + 1 <= len ? i + 1 : null));
  let order = chainOrder(next, [0]);
  let gp: number | null = 0;
  let kth: number | null = null;
  let prev: number | null = null;
  let curr: number | null = null;
  const finished: number[] = [];
  const group: number[] = [];
  const flipped: number[] = [];
  let flipping: number | null = null;
  const steps: Step[] = [];
  const emit = emitter(steps, () => {
    const st: Record<number, CellState> = { 0: 'dim' };
    for (const f of finished) st[f] = 'found';
    for (const g of group) st[g] = 'compare';
    for (const f of flipped) st[f] = 'sorted';
    if (flipping !== null) st[flipping] = 'swap';
    return {
      scene: listScene(all, next, [{ id: 'gp', label: 'gp', at: gp, tone: 'purple' }, { id: 'kth', label: 'kth', at: kth, tone: 'orange' }, { id: 'prev', label: 'prev', at: prev, tone: 'green' }, { id: 'curr', label: 'curr', at: curr, tone: 'blue' }], st, order),
      vars: { groupPrev: show(gp, all), kth: show(kth, all), prev: show(prev, all), curr: show(curr, all) },
    };
  });

  emit('Start', `Reverse the list in groups of k = ${k}. D is a dummy head; gp (group prev) = D marks the node just before the current group.`, 'Each group is reversed on its own and then re-attached to the node before it and the node after it.', 'info', [1, 2], [1, 2], 0);

  for (;;) {
    let c: number | null = gp;
    for (let i = 0; i < k && c !== null; i++) c = next[c];
    if (c === null) {
      kth = null;
      group.length = 0;
      emit('Fewer than k nodes remain', `Walking ${k} nodes from gp falls off the end, so the remaining nodes stay in their original order.`, 'The problem says a short final group is left untouched.', 'warn', [4, 5], [4, 5, 6], 3);
      break;
    }
    kth = c;
    const groupNext: number | null = next[kth];
    group.length = 0;
    group.push(...chainKeys(next, next[gp as number]).slice(0, k));
    emit('Find the k-th node', `kth = ${all[kth]} is ${k} node${k === 1 ? '' : 's'} after gp. groupNext = ${show(groupNext, all)} (the node after the group).`, 'We need kth first, to know where the group ends and what it must connect to.', 'info', [4, 6], [4, 7], 1);

    prev = groupNext;
    curr = next[gp as number];
    emit('Prepare to reverse', `prev = groupNext (${show(prev, all)}), curr = ${show(curr, all)}. The first flipped node will point to groupNext.`, 'Starting prev at groupNext attaches the reversed group to the rest of the list automatically.', 'info', [7], [8], 2);
    while (curr !== groupNext) {
      const c0 = curr as number;
      const tmp = next[c0];
      next[c0] = prev;
      flipping = c0;
      emit(`Flip node ${all[c0]}`, `curr.next = prev, so ${all[c0]} now points to ${show(prev, all)}.`, 'Standard reversal, but it stops at groupNext instead of at null.', 'info', [9, 10, 11, 12], [10, 11, 12], 2);
      flipped.push(c0);
      flipping = null;
      prev = c0;
      curr = tmp;
    }
    const oldFirst = next[gp as number] as number;
    next[gp as number] = kth;
    emit('Reconnect the group', `gp.next = kth: the reversed group (${all[kth]} … ${all[oldFirst]}) hangs off ${all[gp as number]}. Then gp moves to ${all[oldFirst]}, the old first node, now the group’s tail.`,
      'The old first node is now the tail of the group, so it is the new "node before the next group".', 'success', [14, 15, 16], [13, 14, 15], 3);
    for (const g of group) finished.push(g);
    group.length = 0;
    flipped.length = 0;
    order = chainOrder(next, [0]);
    gp = oldFirst;
    kth = null;
    prev = null;
    curr = null;
  }

  const out = chainKeys(next, next[0]).map((x) => all[x]);
  gp = null;
  for (const x of chainKeys(next, next[0])) if (!finished.includes(x)) finished.push(x);
  emit('Done', `Return dummy.next: ${arrow(out)}.`, `Complete groups of ${k} are reversed${len % k ? `; the last ${len % k} node${len % k === 1 ? '' : 's'} were left alone` : ''}.`, 'success', [18], [16], 3, { title: arrow(out), text: `Reversed in groups of ${k}` });
  return steps;
}

function annotated(input: In): Step[] {
  const { k } = input;
  return annotate(build(input), (s, i, all) => {
    const v = s.vars;
    if (i === 0) return { tag: 'INIT —', note: 'dummy.next = head; gp = dummy', desc: `Reverse the list in groups of k = ${k}. D is a dummy head and gp (group prev) marks the node just before the current group.` };
    if (s.title === 'Find the k-th node') return { tag: 'FIND K-TH —', note: `kth = gp advanced ${k} times → ${v.kth}`, desc: s.desc };
    if (s.title === 'Prepare to reverse') return { tag: 'PREPARE —', note: `prev = groupNext (${v.prev}); curr = gp.next (${v.curr})`, desc: s.desc };
    if (s.title.startsWith('Flip node')) return { tag: 'FLIP —', note: `curr.next = prev (${v.prev}); prev = curr; curr = saved next`, desc: s.desc };
    if (s.title === 'Reconnect the group') return { tag: 'RECONNECT —', note: `gp.next = kth (${v.kth}); gp = old first node`, desc: s.desc };
    if (s.title.startsWith('Fewer than k')) return { tag: 'SHORT TAIL —', note: `fewer than ${k} nodes left → stop`, alert: `Fewer than k = ${k} nodes remain, so the tail stays as it is.`, desc: s.desc };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `return dummy.next → ${s.result?.title}`, desc: `${s.desc}`, algoStep: 4 };
  });
}

export const reverseNodesInKGroup: ProblemDef<In> = {
  slug: '25-reverse-nodes-in-k-group',
  id: '25', title: 'Reverse Nodes in K-Group', difficulty: 'Hard', category: 'Linked List', tag: 'group reversal',
  statement: 'Reverse the nodes of a linked list k at a time and return the modified list. If the number of nodes is not a multiple of k, the last leftover nodes stay as they are. Only node links may change, not values.',
  constraints: '1 ≤ k ≤ n ≤ 5000 (animation input: 1–9 nodes)',
  examples: [
    { label: '1 2 3 4 5, k = 2', input: { vals: [1, 2, 3, 4, 5], k: 2 }, output: '2 → 1 → 4 → 3 → 5' },
    { label: '1 2 3 4 5, k = 3', input: { vals: [1, 2, 3, 4, 5], k: 3 }, output: '3 → 2 → 1 → 4 → 5' },
    { label: '1 2 3 4 5 6, k = 3', input: { vals: [1, 2, 3, 4, 5, 6], k: 3 }, output: '3 → 2 → 1 → 6 → 5 → 4' },
  ],
  inputPlaceholder: 'values ; k — e.g. 1 2 3 4 5 ; 2',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Dummy head', state: 'dim' }, { label: 'Current group', state: 'compare' }, { label: 'Being flipped', state: 'swap' }, { label: 'Flipped', state: 'sorted' }, { label: 'Finished group', state: 'found' }],
  varLabels: ['groupPrev', 'kth', 'prev', 'curr'],
  emphasis: ['k at a time', 'leftover nodes'],
  phases: [
    { icon: '🚀', label: 'Dummy head, gp', tone: 'blue' },
    { icon: '🔎', label: 'Find the k-th node', tone: 'cyan' },
    { icon: '🔀', label: 'Flip the group', tone: 'orange' },
    { icon: '🔗', label: 'Reconnect, next group', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Reverse one group at a time',
    text: 'For each group: find its k-th node (if none exists, stop). Reverse the group with prev starting at the node after it, then connect the node before the group to the new first node and move on from the old first node.',
  },
  java: [
    'public ListNode reverseKGroup(ListNode head, int k) {',
    '    ListNode dummy = new ListNode(0, head);',
    '    ListNode groupPrev = dummy;',
    '    while (true) {',
    '        ListNode kth = getKth(groupPrev, k);',
    '        if (kth == null) break;',
    '        ListNode groupNext = kth.next;',
    '        ListNode prev = groupNext, curr = groupPrev.next;',
    '        while (curr != groupNext) {',
    '            ListNode tmp = curr.next;',
    '            curr.next = prev;',
    '            prev = curr;',
    '            curr = tmp;',
    '        }',
    '        ListNode oldFirst = groupPrev.next;',
    '        groupPrev.next = kth;',
    '        groupPrev = oldFirst;',
    '    }',
    '    return dummy.next;',
    '}',
    'private ListNode getKth(ListNode node, int k) {',
    '    while (node != null && k > 0) { node = node.next; k--; }',
    '    return node;',
    '}',
  ],
  python: [
    'def reverse_k_group(head, k):',
    '    dummy = ListNode(0, head)',
    '    group_prev = dummy',
    '    while True:',
    '        kth = get_kth(group_prev, k)',
    '        if not kth:',
    '            break',
    '        group_next = kth.next',
    '        prev, curr = group_next, group_prev.next',
    '        while curr != group_next:',
    '            tmp = curr.next',
    '            curr.next = prev',
    '            prev, curr = curr, tmp',
    '        old_first = group_prev.next',
    '        group_prev.next = kth',
    '        group_prev = old_first',
    '    return dummy.next',
    'def get_kth(node, k):',
    '    while node and k > 0:',
    '        node, k = node.next, k - 1',
    '    return node',
  ],
  algorithm: [
    'Add a dummy head; groupPrev = dummy',
    'Find the k-th node after groupPrev; if it does not exist, stop',
    'Reverse the k nodes with prev starting at groupNext (the node after the group)',
    'Set groupPrev.next = kth, move groupPrev to the old first node, repeat',
    'Return dummy.next',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Checking that k nodes exist before reversing guarantees a short tail group is never touched. Starting prev at groupNext makes the first flipped node point straight at the rest of the list, and after the flip kth is the group’s new head and the old first node its tail — so one assignment to groupPrev.next reconnects the front, and groupPrev = old first node is exactly the node before the next group. Every node is visited a constant number of times.',
};
