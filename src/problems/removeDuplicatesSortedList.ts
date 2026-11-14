import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { arrow, chainKeys, emitter, listScene, parseInts, show } from './listheapKit.ts';

interface In { vals: number[] }

function build({ vals }: In): Step[] {
  const n = vals.length;
  const next = vals.map((_, i) => (i + 1 < n ? i + 1 : null));
  let curr: number | null = 0;
  let removed = 0;
  let hot: Record<number, CellState> = {};
  const steps: Step[] = [];
  const emit = emitter(steps, () => ({
    scene: listScene(vals, next, [{ id: 'curr', label: 'curr', at: curr, tone: 'blue' }], hot, chainKeys(next, 0)),
    vars: { curr: show(curr, vals), 'curr.next': curr === null ? 'null' : show(next[curr], vals), removed },
  }));

  emit('Start', `curr starts at the head, value ${vals[0]}. The list is sorted, so equal values sit side by side.`,
    'Because the list is sorted, a duplicate can only be the very next node. One pass is enough.', 'info', [1], [1], 0, undefined,
    { tag: 'START —', note: `curr = head (${vals[0]}), removed = 0` });

  while (curr !== null && next[curr] !== null) {
    const nx: number = next[curr] as number;
    hot = { [curr]: 'compare', [nx]: 'compare' };
    emit(`Compare ${vals[curr]} and ${vals[nx]}`, `curr.val = ${vals[curr]} and curr.next.val = ${vals[nx]}: ${vals[curr] === vals[nx] ? 'they are equal' : 'they differ'}.`,
      'Only neighbours need to be compared, thanks to the sorted order.', 'info', [2, 3], [2, 3], 1, undefined,
      { tag: 'COMPARE:', note: `${vals[curr]} == ${vals[nx]} → ${vals[curr] === vals[nx]}` });
    if (vals[curr] === vals[nx]) {
      hot = { [curr]: 'compare', [nx]: 'error' };
      emit('Duplicate found', `both nodes hold ${vals[curr]}, so the second copy must go; the first is kept.`, 'We keep the first copy and unlink the later one.', 'warn', [3], [3], 2, undefined,
        { tag: 'DUPLICATE:', note: `${vals[curr]} appears twice in a row`, alert: `Duplicate: two neighbouring nodes both hold ${vals[curr]}, so the later one is deleted.` });
      const after = next[nx];
      next[curr] = after;
      removed++;
      hot = { [curr]: 'swap' };
      emit('Unlink the duplicate', `curr.next now skips the extra ${vals[nx]} and points to ${after === null ? 'null' : vals[after]}; curr stays put in case more copies follow (removed = ${removed}).`,
        'Do not advance after deleting: the new neighbour could be another duplicate.', 'success', [4], [4], 2, undefined,
        { tag: 'UNLINK:', note: `curr.next = ${after === null ? 'null' : vals[after]}, removed = ${removed}` });
    } else {
      hot = { [curr]: 'found' };
      emit('Different values — advance', `${vals[curr]} ≠ ${vals[nx]}, so ${vals[curr]} is final: move curr forward to ${vals[nx]}.`,
        'Only advance when the next node is different.', 'info', [6], [6], 3, undefined,
        { tag: 'ADVANCE:', note: `curr = ${vals[nx]}` });
      curr = nx;
    }
  }

  const out = chainKeys(next, 0).map((k) => vals[k]);
  hot = {};
  curr = null;
  emit('Done', `curr reached the last node, so the list now reads ${arrow(out)}.`, `${removed} duplicate node${removed === 1 ? '' : 's'} removed, every value appears once.`, 'success', [9], [7], 4,
    { title: arrow(out), text: `${removed} duplicate${removed === 1 ? '' : 's'} removed` },
    { tag: '✅ Done!', note: `return head: ${arrow(out)}` });
  return steps;
}

export const removeDuplicatesSortedList: ProblemDef<In> = {
  slug: '83-remove-duplicates-from-sorted-list',
  id: '83', title: 'Remove Duplicates from Sorted List', difficulty: 'Easy', category: 'Linked List', tag: 'traversal',
  statement: 'You are given the head of a sorted singly linked list. Delete nodes so that every value appears exactly once, and return the list (still sorted).',
  constraints: '0 ≤ n ≤ 300, list sorted ascending (animation input: 1–10 nodes, values −99..99)',
  examples: [
    { label: '1 → 1 → 2 → 3 → 3', input: { vals: [1, 1, 2, 3, 3] }, output: '1 → 2 → 3', answer: '1 → 2 → 3 (2 duplicate nodes removed)' },
    { label: '1 → 1 → 2', input: { vals: [1, 1, 2] }, output: '1 → 2' },
    { label: '4 → 4 → 4 → 4', input: { vals: [4, 4, 4, 4] }, output: '4' },
  ],
  inputPlaceholder: 'sorted values, e.g. 1 1 2 3 3',
  parseInput: (raw) => ({ vals: parseInts(raw, { max: 10, hint: '1 1 2 3 3', sorted: true }) }),
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Comparing', state: 'compare' }, { label: 'Duplicate', state: 'error' }, { label: 'Pointer re-linked', state: 'swap' }, { label: 'Final value', state: 'found' }],
  varLabels: ['curr', 'curr.next', 'removed'],
  approach: {
    title: 'Compare neighbours, skip equal ones',
    text: 'In a sorted list equal values are adjacent. Walk with curr: if curr.next has the same value, bypass it (curr.next = curr.next.next) and stay; otherwise move forward.',
  },
  java: [
    'public ListNode deleteDuplicates(ListNode head) {',
    '    ListNode curr = head;',
    '    while (curr != null && curr.next != null) {',
    '        if (curr.val == curr.next.val) {',
    '            curr.next = curr.next.next;',
    '        } else {',
    '            curr = curr.next;',
    '        }',
    '    }',
    '    return head;',
    '}',
  ],
  python: [
    'def delete_duplicates(head):',
    '    curr = head',
    '    while curr and curr.next:',
    '        if curr.val == curr.next.val:',
    '            curr.next = curr.next.next',
    '        else:',
    '            curr = curr.next',
    '    return head',
  ],
  phases: [
    { icon: '🚩', label: 'curr = head', tone: 'blue' },
    { icon: '🔍', label: 'Compare neighbours', tone: 'cyan' },
    { icon: '✂️', label: 'Equal: unlink', tone: 'orange' },
    { icon: '➡️', label: 'Different: advance', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['sorted singly linked list', 'every value appears exactly once'],
  algorithm: [
    'Start curr at the head',
    'While curr and curr.next exist, compare their values',
    'Equal: unlink curr.next and keep curr where it is',
    'Different: advance curr',
    'Done: return head',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Sortedness guarantees all copies of a value form one contiguous run, so after comparing curr with its neighbour there is never a reason to look further. Deleting does not move curr, so a run of any length is collapsed one node at a time. The head never changes because the first copy is always kept.',
};
