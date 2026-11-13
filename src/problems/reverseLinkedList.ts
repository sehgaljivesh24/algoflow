import type { CellState, ListNodeVM, ProblemDef, Step } from '../engine/types';
import { annotate } from './annotate.ts';

interface In { vals: number[] }

function parse(raw: string): In {
  const vals = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!vals.length || vals.some((n) => !Number.isInteger(n))) throw new Error('Enter whole numbers, e.g. 1 2 3 4 5');
  if (vals.length > 8) throw new Error('Use 8 numbers or fewer');
  return { vals };
}

function build({ vals }: In): Step[] {
  const n = vals.length;
  const next: (number | null)[] = vals.map((_, i) => (i + 1 < n ? i + 1 : null));
  const steps: Step[] = [];
  let prev: number | null = null;
  let curr: number | null = 0;
  let nxt: number | null = null;
  let iter = 0;

  const nodes = (hot?: number, hotState?: CellState): ListNodeVM[] =>
    vals.map((value, i) => ({ key: i, value, next: next[i], state: i === hot ? hotState : undefined }));
  const ptrs = () => {
    const out = [];
    if (prev !== null) out.push({ id: 'prev', label: 'prev', index: prev, tone: 'purple' as const });
    if (curr !== null) out.push({ id: 'curr', label: 'curr', index: curr, tone: 'blue' as const });
    if (nxt !== null) out.push({ id: 'next', label: 'next', index: nxt, tone: 'orange' as const });
    return out;
  };
  const show = (v: number | null) => (v === null ? 'null' : vals[v]);
  const vars = () => ({ prev: show(prev), curr: show(curr), next: show(nxt), iteration: iter });

  steps.push({
    title: 'Start', desc: 'prev = null, curr = head.',
    scene: { kind: 'list', nodes: nodes(), pointers: ptrs() }, vars: vars(),
    logic: 'We will walk down the list once and flip each arrow to point backwards.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  while (curr !== null) {
    iter++;
    nxt = next[curr];
    steps.push({
      title: `Save next (${show(nxt)})`, desc: `Remember curr.next before we overwrite it.`,
      scene: { kind: 'list', nodes: nodes(curr, 'active'), pointers: ptrs() }, vars: vars(),
      logic: 'If we flipped the arrow first, we would lose the rest of the list.', logicTone: 'warn',
      javaLines: [2, 3], pyLines: [2, 3], algoStep: 1,
    });
    next[curr] = prev;
    steps.push({
      title: 'Flip the arrow', desc: `curr.next now points to ${prev === null ? 'null' : `node ${vals[prev]}`}.`,
      scene: { kind: 'list', nodes: nodes(curr, 'swap'), pointers: ptrs() }, vars: vars(),
      logic: 'The link between curr and its old next is reversed.', logicTone: 'info',
      javaLines: [4], pyLines: [4], algoStep: 2,
    });
    prev = curr;
    curr = nxt;
    nxt = null;
    steps.push({
      title: 'Advance', desc: 'prev = curr, then curr = next.',
      scene: { kind: 'list', nodes: nodes(prev, 'found'), pointers: ptrs() }, vars: vars(),
      logic: 'The reversed part grows by one node.', logicTone: 'success',
      javaLines: [5, 6], pyLines: [5, 6], algoStep: 3,
    });
  }

  steps.push({
    title: 'Done', desc: 'curr is null, so prev is the new head.',
    scene: { kind: 'list', nodes: nodes(), pointers: ptrs() }, vars: vars(),
    logic: `Return prev. The list now reads ${[...vals].reverse().join(' → ')}.`, logicTone: 'success',
    javaLines: [8], pyLines: [7], algoStep: 3,
    result: { title: [...vals].reverse().join(' → '), text: 'Head is the old tail' },
  });
  return steps;
}

function annotated(input: In): Step[] {
  const { vals } = input;
  return annotate(build(input), (s, i, all) => {
    const v = s.vars;
    if (i === 0) return { tag: 'INIT —', note: `prev = null, curr = head (${vals[0]})`, desc: `Start with prev = null and curr = the head (${vals[0]}). The loop will flip one arrow per iteration.` };
    if (s.title.startsWith('Save next')) return { tag: `SAVE NEXT (iter ${v.iteration}) —`, note: `next = curr.next → ${v.next}`, desc: `Remember next = curr.next = ${v.next} before touching curr (${v.curr}), or the rest of the list would be lost.` };
    if (s.title === 'Flip the arrow') return { tag: 'FLIP ARROW —', note: `curr.next = prev (${v.prev}) — node ${v.curr} now points backwards`, desc: `Flip: node ${v.curr} now points to ${v.prev === 'null' ? 'null' : 'node ' + v.prev} instead of ${v.next}.` };
    if (s.title === 'Advance') return { tag: 'ADVANCE —', note: `prev = curr (${v.prev}); curr = next (${v.curr})`, desc: `Move on: prev becomes ${v.prev} and curr becomes ${v.curr}. The reversed part is one node longer.` };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `return prev (${v.prev})`, desc: `curr is null, so prev (${v.prev}) is the new head. The list now reads ${[...vals].reverse().join(' → ')}.`, algoStep: 4 };
  });
}

export const reverseLinkedList: ProblemDef<In> = {
  slug: '206-reverse-linked-list',
  id: '206', title: 'Reverse Linked List', difficulty: 'Easy', category: 'Linked List', tag: 'iterative / recursive',
  statement: 'Given the head of a singly linked list, reverse the list and return the new head.',
  constraints: '0 ≤ n ≤ 5000 (animation input is limited to 8 nodes)',
  examples: [
    { label: '1 → 2 → 3 → 4 → 5', input: { vals: [1, 2, 3, 4, 5] }, output: '5 → 4 → 3 → 2 → 1' },
    { label: '1 → 2', input: { vals: [1, 2] }, output: '2 → 1' },
    { label: '7', input: { vals: [7] }, output: '7' },
  ],
  inputPlaceholder: 'e.g. 1 2 3 4 5',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Saving next', state: 'active' }, { label: 'Flipping', state: 'swap' }, { label: 'Reversed', state: 'found' }],
  varLabels: ['prev', 'curr', 'next', 'iteration'],
  emphasis: ['reverse', 'singly linked list', 'new head'],
  phases: [
    { icon: '🚀', label: 'Initial', tone: 'blue' },
    { icon: '💾', label: 'Save next', tone: 'cyan' },
    { icon: '🔀', label: 'Flip arrow', tone: 'orange' },
    { icon: '➡️', label: 'Advance pointers', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Three pointers, one pass',
    text: 'Keep prev (the reversed part), curr (the node being processed) and next (saved before we break the link). Flip curr.next to prev, then slide all three forward.',
  },
  java: [
    'public ListNode reverseList(ListNode head) {',
    '    ListNode prev = null, curr = head;',
    '    while (curr != null) {',
    '        ListNode next = curr.next;',
    '        curr.next = prev;',
    '        prev = curr;',
    '        curr = next;',
    '    }',
    '    return prev;',
    '}',
  ],
  python: [
    'def reverse_list(head):',
    '    prev, curr = None, head',
    '    while curr:',
    '        nxt = curr.next',
    '        curr.next = prev',
    '        prev = curr',
    '        curr = nxt',
    '    return prev',
  ],
  algorithm: [
    'Start with prev = null and curr = head',
    'Save next = curr.next',
    'Point curr.next at prev',
    'Move prev and curr one step forward; repeat until curr is null',
    'Return prev: it is the new head',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Each node is touched once and only its own pointer changes. Saving next before overwriting it is what keeps the rest of the list reachable. When curr falls off the end, prev is the last node — the new head.',
};
