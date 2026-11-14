import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { arrow, chainKeys, chainOrder, emitter, listScene, parseInts, parts, show } from './listheapKit.ts';
import { annotate } from './annotate.ts';

interface In { a: number[]; b: number[] }

function parse(raw: string): In {
  const [x, y] = parts(raw, 2, 'list1 ; list2 — e.g. 1 2 4 ; 1 3 4 (either side may be empty)');
  const a = parseInts(x, { min: 0, max: 6, hint: '1 2 4 ; 1 3 4', sorted: true });
  const b = parseInts(y, { min: 0, max: 6, hint: '1 2 4 ; 1 3 4', sorted: true });
  if (!a.length && !b.length) throw new Error('At least one of the two lists must have a node');
  return { a, b };
}

function build({ a, b }: In): Step[] {
  const all: (number | string)[] = ['D', ...a, ...b]; // key 0 = dummy, then list 1, then list 2
  const next: (number | null)[] = all.map((_, k) => {
    if (k === 0) return null;
    if (k <= a.length) return k < a.length ? k + 1 : null;
    return k < a.length + b.length ? k + 1 : null;
  });
  let p1: number | null = a.length ? 1 : null;
  let p2: number | null = b.length ? a.length + 1 : null;
  let tail = 0;
  const merged = [0];
  let order = chainOrder(next, [0, p1, p2]);
  let hot: Record<number, CellState> = {};
  const steps: Step[] = [];
  const emit = emitter(steps, () => {
    const st: Record<number, CellState> = { 0: 'dim' };
    for (const m of merged.slice(1)) st[m] = 'found';
    return {
      scene: listScene(all, next, [{ id: 'l1', label: 'l1', at: p1, tone: 'blue' }, { id: 'l2', label: 'l2', at: p2, tone: 'orange' }, { id: 'tail', label: 'tail', at: tail, tone: 'purple' }], { ...st, ...hot }, order),
      vars: { l1: show(p1, all), l2: show(p2, all), tail: show(tail, all), merged: merged.length - 1 },
    };
  });

  emit('Start', 'Two sorted lists. D is a dummy head; tail marks the end of the merged list so far.', 'The dummy node removes the "which node is the head?" special case.', 'info', [1], [1, 2], 0);

  while (p1 !== null && p2 !== null) {
    hot = { [p1]: 'compare', [p2]: 'compare' };
    const takeFirst = (all[p1] as number) <= (all[p2] as number);
    emit(`Compare ${all[p1]} and ${all[p2]}`, `${all[p1]} ${takeFirst ? '≤' : '>'} ${all[p2]}, so the node from ${takeFirst ? 'l1' : 'l2'} goes next.`, 'Both lists are sorted, so the smaller front node is the smallest remaining value overall.', 'info', [2, 3], [3, 4], 1);
    const pick: number = takeFirst ? p1 : p2;
    next[tail] = pick;
    if (takeFirst) p1 = next[p1];
    else p2 = next[p2];
    tail = pick;
    merged.push(pick);
    hot = { [pick]: 'swap' };
    emit(`Attach ${all[pick]}`, `tail.next = ${all[pick]}; advance ${takeFirst ? 'l1' : 'l2'} and move tail onto the new node.`, 'The merged list grows by exactly one node per comparison.', 'success', takeFirst ? [3, 5] : [4, 5], takeFirst ? [5, 6, 10] : [8, 9, 10], 2);
    order = chainOrder(next, [0, p1, p2]);
  }

  const rest = p1 !== null ? p1 : p2;
  hot = {};
  if (rest !== null) {
    next[tail] = rest;
    for (const k of chainKeys(next, rest)) merged.push(k);
    order = chainOrder(next, [0]);
    emit('Attach the leftover list', `One list is empty, so the other one — still sorted — is hooked on as it is: tail.next = ${all[rest]}.`, 'No need to copy anything: the remaining nodes already form a sorted chain.', 'success', [7], [10], 3);
  } else {
    emit('Both lists are empty', 'Nothing is left to attach.', 'The merged list is complete.', 'success', [7], [10], 3);
  }

  const out = chainKeys(next, next[0]).map((k) => all[k]);
  p1 = null;
  p2 = null;
  emit('Done', `Return dummy.next: ${arrow(out)}.`, 'A single pass through both lists, relinking existing nodes.', 'success', [8], [11], 3, { title: arrow(out), text: `${plural(out.length, 'node')} merged` });
  return steps;
}

function annotated(input: In): Step[] {
  return annotate(build(input), (s, i, all) => {
    const v = s.vars;
    if (i === 0) return { tag: 'INIT —', note: 'dummy = new ListNode(0); tail = dummy', desc: `Two sorted lists, l1 front ${v.l1} and l2 front ${v.l2}. D is a dummy head and tail marks the end of the merged list so far.` };
    const cmp = /^Compare (\S+) and (\S+)/.exec(s.title);
    if (cmp) return { tag: 'COMPARE —', note: `${cmp[1]} ${s.desc.includes('≤') ? '≤' : '>'} ${cmp[2]} → take from ${s.desc.includes('from l1') ? 'l1' : 'l2'}`, desc: s.desc };
    const att = /^Attach (\S+)$/.exec(s.title);
    if (att) return { tag: 'ATTACH —', note: `tail.next = ${att[1]}; tail = ${att[1]}; merged = ${v.merged}`, desc: s.desc };
    if (s.title.startsWith('Attach the leftover')) return { tag: 'LEFTOVER —', note: `tail.next = rest of the non-empty list`, desc: s.desc };
    if (s.title === 'Both lists are empty') return { tag: 'LEFTOVER —', note: 'nothing left to attach', desc: 'Both lists ran out together, so nothing is left to attach and the merged list is complete.' };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `return dummy.next → ${s.result?.title}`, desc: `Return dummy.next: the merged list is ${s.result?.title}, made in one pass by relinking the existing nodes.`, algoStep: 4 };
  });
}

export const mergeTwoSortedLists: ProblemDef<In> = {
  slug: '21-merge-two-sorted-lists',
  id: '21', title: 'Merge Two Sorted Lists', difficulty: 'Easy', category: 'Linked List', tag: 'two pointers',
  statement: 'Merge two sorted linked lists into one sorted list by splicing together the existing nodes, and return its head.',
  constraints: '0 ≤ length of each list ≤ 50, both sorted ascending (animation input: up to 6 nodes each)',
  examples: [
    { label: '1 2 4 and 1 3 4', input: { a: [1, 2, 4], b: [1, 3, 4] }, output: '1 → 1 → 2 → 3 → 4 → 4' },
    { label: '1 5 and 2 3 4 6', input: { a: [1, 5], b: [2, 3, 4, 6] }, output: '1 → 2 → 3 → 4 → 5 → 6' },
    { label: '(empty) and 0', input: { a: [], b: [0] }, output: '0' },
  ],
  inputPlaceholder: 'list1 ; list2 — e.g. 1 2 4 ; 1 3 4',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Dummy head', state: 'dim' }, { label: 'Comparing fronts', state: 'compare' }, { label: 'Just attached', state: 'swap' }, { label: 'Merged', state: 'found' }],
  varLabels: ['l1', 'l2', 'tail', 'merged'],
  emphasis: ['sorted', 'merge', 'splicing'],
  phases: [
    { icon: '🚀', label: 'Dummy head, tail', tone: 'blue' },
    { icon: '⚖️', label: 'Compare the fronts', tone: 'cyan' },
    { icon: '🔗', label: 'Attach the smaller', tone: 'gold' },
    { icon: '📎', label: 'Attach the leftover', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Zip by comparing fronts',
    text: 'Keep a tail pointer on a dummy head. Repeatedly compare the fronts of both lists, hook the smaller node onto tail and advance that list. When one list runs out, attach the other.',
  },
  java: [
    'public ListNode mergeTwoLists(ListNode l1, ListNode l2) {',
    '    ListNode dummy = new ListNode(0), tail = dummy;',
    '    while (l1 != null && l2 != null) {',
    '        if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }',
    '        else { tail.next = l2; l2 = l2.next; }',
    '        tail = tail.next;',
    '    }',
    '    tail.next = (l1 != null) ? l1 : l2;',
    '    return dummy.next;',
    '}',
  ],
  python: [
    'def merge_two_lists(l1, l2):',
    '    dummy = ListNode(0)',
    '    tail = dummy',
    '    while l1 and l2:',
    '        if l1.val <= l2.val:',
    '            tail.next = l1',
    '            l1 = l1.next',
    '        else:',
    '            tail.next = l2',
    '            l2 = l2.next',
    '        tail = tail.next',
    '    tail.next = l1 or l2',
    '    return dummy.next',
  ],
  algorithm: [
    'Create a dummy head; tail = dummy',
    'While both lists have nodes, compare their fronts',
    'Attach the smaller node to tail, advance that list and tail',
    'Attach whatever remains of the other list',
    'Return dummy.next',
  ],
  complexity: [{ label: 'Time', value: 'O(m + n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'At every moment the merged list holds the smallest nodes seen so far in order, and everything still unmerged is ≥ the last merged value because both inputs are sorted. Picking the smaller of the two fronts therefore never breaks sortedness, and using <= takes l1 first on ties, making the merge stable. Nodes are relinked, not copied.',
};
