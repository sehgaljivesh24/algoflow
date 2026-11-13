import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { arrow, chainKeys, chainOrder, emitter, listScene, parseInts, parseOne, parts, show } from './listheapKit.ts';
import { annotate } from './annotate.ts';

interface In { vals: number[]; left: number; right: number }

function parse(raw: string): In {
  const [a, b] = parts(raw, 2, 'values ; left right — e.g. 1 2 3 4 5 ; 2 4');
  const vals = parseInts(a, { max: 10, hint: '1 2 3 4 5 ; 2 4' });
  const lr = b.trim().split(/[\s,]+/);
  if (lr.length !== 2) throw new Error('Give left and right after the semicolon, e.g. 2 4');
  const left = parseOne(lr[0], 1, vals.length, 'left');
  const right = parseOne(lr[1], left, vals.length, 'right (≥ left)');
  return { vals, left, right };
}

function build({ vals, left, right }: In): Step[] {
  const all: (number | string)[] = ['D', ...vals]; // key 0 = dummy
  const len = vals.length;
  const next: (number | null)[] = all.map((_, i) => (i + 1 <= len ? i + 1 : null));
  let order = chainOrder(next, [0]);
  let prev: number | null = 0;
  let curr: number | null = null;
  let nxt: number | null = null;
  let hot: Record<number, CellState> = { 0: 'dim' };
  const steps: Step[] = [];
  const emit = emitter(steps, () => ({
    scene: listScene(all, next, [{ id: 'prev', label: 'prev', at: prev, tone: 'purple' }, { id: 'curr', label: 'curr', at: curr, tone: 'blue' }, { id: 'next', label: 'next', at: nxt, tone: 'orange' }], hot, order),
    vars: { prev: show(prev, all), curr: show(curr, all), next: show(nxt, all) },
  }));

  emit('Start', `Reverse positions ${left}…${right}. D is a dummy head; prev = D.`, 'The dummy node lets prev stand "before position 1", so reversing from the head needs no special case.', 'info', [1, 2], [1, 2], 0);

  for (let i = 1; i < left; i++) {
    prev = next[prev as number];
    hot = { 0: 'dim', [prev as number]: 'compare' };
    emit(`Walk prev to position ${i}`, `prev = ${all[prev as number]}. We need prev to stop at position ${left - 1}, just before the part to reverse.`, 'Nodes before `left` are not touched.', 'info', [3], [3, 4], 1);
  }

  curr = next[prev as number];
  hot = { 0: 'dim', [prev as number]: 'compare', [curr as number]: 'active' };
  emit(`curr = position ${left}`, `curr = ${all[curr as number]}, the first node of the section. It will end up as the last node of the reversed section.`,
    'curr never moves: each round pulls the node after curr to the front of the section.', 'info', [4], [5], 1);

  for (let i = left; i < right; i++) {
    const m = next[curr as number] as number;
    nxt = m;
    hot = { 0: 'dim', [prev as number]: 'compare', [curr as number]: 'active', [m]: 'swap' };
    next[curr as number] = next[m];
    emit(`Round ${i - left + 1}: cut ${all[m]} out`, `next = curr.next = ${all[m]}. curr.next = next.next, so curr now skips ${all[m]}.`,
      'We detach one node at a time so that nothing is lost.', 'info', [6, 7], [7, 8], 2);
    next[m] = next[prev as number];
    emit(`Point ${all[m]} at the front`, `next.next = prev.next, so ${all[m]} now points to ${all[next[m] as number]}, the current front of the section.`,
      'The cut-out node is placed just ahead of the old front of the section.', 'info', [8], [9], 2);
    next[prev as number] = m;
    emit(`Link prev to ${all[m]}`, `prev.next = next: ${all[m]} is now the first node of the section.`,
      'Each round grows the reversed block after prev by one node.', 'success', [9], [10], 2);
    order = chainOrder(next, [0]);
    nxt = null;
  }

  const out = chainKeys(next, next[0]).map((k) => all[k]);
  prev = null;
  curr = null;
  hot = { 0: 'dim' };
  emit('Done', `Return dummy.next. The list now reads ${arrow(out)}.`, `Positions ${left}…${right} are reversed; the rest is unchanged.`, 'success', [11], [11], 3, { title: arrow(out), text: `Reversed positions ${left}–${right}` });
  return steps;
}

function annotated(input: In): Step[] {
  const { left, right } = input;
  return annotate(build(input), (s, i, all) => {
    const v = s.vars;
    if (i === 0) return { tag: 'INIT —', note: 'dummy.next = head; prev = dummy', desc: `Reverse positions ${left} to ${right}. A dummy head D lets prev stand before position 1, so no special case is needed.` };
    if (s.title.startsWith('Walk prev')) return { tag: 'WALK —', note: `prev = prev.next → ${v.prev}`, desc: `prev moves to ${v.prev}. It must stop at position ${left - 1}, just before the section to reverse.` };
    if (s.title.startsWith('curr =')) return { tag: 'CURR —', note: `curr = prev.next → ${v.curr}`, desc: `curr = ${v.curr}, the first node of the section. It stays put and ends as the last node of the reversed section.` };
    const round = /^Round (\d+): cut (\S+) out/.exec(s.title);
    if (round) return { tag: `CUT (round ${round[1]}) —`, note: `next = curr.next → ${v.next}; curr.next = next.next`, desc: `Round ${round[1]}: next = ${v.next}. curr.next skips it, so ${v.next} is cut out of the chain.` };
    if (s.title.startsWith('Point')) return { tag: 'MOVE —', note: `next.next = prev.next (the old front)`, desc: `${s.desc}` };
    if (s.title.startsWith('Link prev')) return { tag: 'LINK —', note: `prev.next = next (${v.next})`, desc: `prev.next = ${v.next}: it is now the first node of the section.` };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `return dummy.next → ${s.result?.title}`, desc: `Positions ${left} to ${right} are reversed. The list now reads ${s.result?.title}.` };
  });
}

export const reverseLinkedListII: ProblemDef<In> = {
  slug: '92-reverse-linked-list-ii',
  id: '92', title: 'Reverse Linked List II', difficulty: 'Medium', category: 'Linked List', tag: 'in-place reversal',
  statement: 'Given the head of a linked list and two positions left ≤ right (1-indexed), reverse the nodes from position left to position right and return the list.',
  constraints: '1 ≤ left ≤ right ≤ n ≤ 500 (animation input: up to 10 nodes)',
  examples: [
    { label: '1 2 3 4 5, left 2, right 4', input: { vals: [1, 2, 3, 4, 5], left: 2, right: 4 }, output: '1 → 4 → 3 → 2 → 5' },
    { label: '5, left 1, right 1', input: { vals: [5], left: 1, right: 1 }, output: '5' },
    { label: '1 2 3 4, left 1, right 4', input: { vals: [1, 2, 3, 4], left: 1, right: 4 }, output: '4 → 3 → 2 → 1' },
  ],
  inputPlaceholder: 'values ; left right — e.g. 1 2 3 4 5 ; 2 4',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Dummy head', state: 'dim' }, { label: 'prev / curr', state: 'compare' }, { label: 'curr (fixed)', state: 'active' }, { label: 'Node being moved', state: 'swap' }],
  varLabels: ['prev', 'curr', 'next'],
  emphasis: ['positions left', 'reverse the nodes'],
  phases: [
    { icon: '🚶', label: 'Walk prev to left − 1', tone: 'blue' },
    { icon: '📍', label: 'curr = first of section', tone: 'cyan' },
    { icon: '✂️', label: 'Cut next, move to front', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Head insertion inside the section',
    text: 'Park prev just before position left. curr is the first node of the section and stays put. Each round take curr.next out and insert it right after prev; after right − left rounds the section is reversed.',
  },
  java: [
    'public ListNode reverseBetween(ListNode head, int left, int right) {',
    '    ListNode dummy = new ListNode(0, head);',
    '    ListNode prev = dummy;',
    '    for (int i = 1; i < left; i++) prev = prev.next;',
    '    ListNode curr = prev.next;',
    '    for (int i = left; i < right; i++) {',
    '        ListNode next = curr.next;',
    '        curr.next = next.next;',
    '        next.next = prev.next;',
    '        prev.next = next;',
    '    }',
    '    return dummy.next;',
    '}',
  ],
  python: [
    'def reverse_between(head, left, right):',
    '    dummy = ListNode(0, head)',
    '    prev = dummy',
    '    for _ in range(left - 1):',
    '        prev = prev.next',
    '    curr = prev.next',
    '    for _ in range(right - left):',
    '        nxt = curr.next',
    '        curr.next = nxt.next',
    '        nxt.next = prev.next',
    '        prev.next = nxt',
    '    return dummy.next',
  ],
  algorithm: [
    'Add a dummy head and walk prev to position left − 1',
    'Set curr = prev.next (the first node of the section)',
    'Repeat right − left times: cut curr.next out and insert it right after prev',
    'Return dummy.next',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'After k rounds the first k + 1 nodes of the section are already in reversed order directly after prev, with curr as the tail of that block. Pulling curr.next to the front extends the block by one while preserving the invariant, so after right − left rounds the whole section is reversed. Because curr is the tail, it automatically points at the first node after the section.',
};
