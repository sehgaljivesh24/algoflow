import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { arrow, chainKeys, emitter, listScene, parseInts, parseOne, parts, show } from './listheapKit.ts';
import { annotate } from './annotate.ts';

interface In { vals: number[]; n: number }

const ordinal = (m: number) => `${m}${m % 100 >= 11 && m % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][m % 10 > 3 ? 0 : m % 10]}`;

function parse(raw: string): In {
  const [a, b] = parts(raw, 2, 'values ; n — e.g. 1 2 3 4 5 ; 2');
  const vals = parseInts(a, { max: 10, hint: '1 2 3 4 5 ; 2' });
  return { vals, n: parseOne(b, 1, vals.length, 'n') };
}

function build({ vals, n }: In): Step[] {
  // key 0 is the dummy node; real nodes are keys 1..len
  const all: (number | string)[] = ['D', ...vals];
  const len = vals.length;
  const next: (number | null)[] = all.map((_, i) => (i + 1 <= len ? i + 1 : null));
  let slow: number | null = 0;
  let fast: number | null = 1;
  let gap = 0;
  let hot: Record<number, CellState> = { 0: 'dim' };
  const steps: Step[] = [];
  /** slow = compare, fast = active, nodes between them (the gap of n) = sorted, dummy = dim. */
  const gapStates = (): Record<number, CellState> => {
    const st: Record<number, CellState> = { 0: 'dim' };
    if (slow !== null) {
      st[slow] = 'compare';
      let c = next[slow];
      while (c !== null && c !== fast) {
        st[c] = 'sorted';
        c = next[c];
      }
    }
    if (fast !== null) st[fast] = 'active';
    return st;
  };
  hot = gapStates();
  const emit = emitter(steps, () => ({
    scene: listScene(all, next, [{ id: 'slow', label: 'slow', at: slow, tone: 'blue' }, { id: 'fast', label: 'fast', at: fast, tone: 'orange' }], hot, chainKeys(next, 0)),
    vars: { slow: show(slow, all), fast: show(fast, all), gap: `${gap}/${n}` },
  }));

  emit('Start', `Add a dummy node D before the head. slow = D, fast = head. We want to delete the ${ordinal(n)} node from the end.`,
    'The dummy node means deleting the head needs no special case: slow can always stand in front of the victim.', 'info', [1, 2], [1, 2], 0);

  for (let i = 0; i < n; i++) {
    fast = next[fast as number];
    gap++;
    hot = gapStates();
    emit(`Move fast ahead (${gap}/${n})`, `fast advances to ${show(fast, all)}. fast is now ${gap} node${gap === 1 ? '' : 's'} ahead of the head.`,
      `We build a head start of exactly ${n} nodes between slow and fast.`, 'info', [3], [3], 1);
  }

  while (fast !== null) {
    fast = next[fast];
    slow = next[slow as number];
    hot = gapStates();
    emit('Move both one step', `fast → ${show(fast, all)}, slow → ${show(slow, all)}.`,
      'Both move at the same speed, so the distance between them stays fixed at n.', 'info', [4, 5, 6], [3, 4, 5], 2);
  }

  const victim = next[slow as number] as number;
  hot = { 0: 'dim', [victim]: 'error', [slow as number]: 'compare' };
  emit('fast is null: slow is just before the target', `When fast fell off the end, slow stands right before the ${ordinal(n)} node from the end (${vals[victim - 1]}).`,
    'fast is n nodes ahead of slow; when fast is past the last node, slow.next is the n-th node from the end.', 'warn', [4, 7], [5, 6], 3);

  next[slow as number] = next[victim];
  const out = chainKeys(next, next[0]).map((k) => all[k]);
  hot = { 0: 'dim', [slow as number]: 'swap' };
  emit('Unlink the target', `slow.next now skips ${vals[victim - 1]}. Return dummy.next.`, `The list reads ${arrow(out)}.`, 'success', [8], [7], 3);

  slow = null;
  hot = { 0: 'dim', ...Object.fromEntries(chainKeys(next, next[0]).map((k) => [k, 'found' as CellState])) };
  emit('Done', `Removed the ${ordinal(n)} node from the end. Result: ${arrow(out)}.`, 'One pass, no length computation.', 'success', [9], [8], 3, { title: arrow(out), text: `Node ${vals[victim - 1]} removed` });
  return steps;
}

function annotated(input: In): Step[] {
  const { n } = input;
  return annotate(build(input), (s, i, all) => {
    const v = s.vars;
    if (i === 0) return { tag: 'INIT —', note: `slow = dummy, fast = head, n = ${n}`, desc: s.desc };
    const ahead = /^Move fast ahead \((\d+)\/(\d+)\)/.exec(s.title);
    if (ahead) return { tag: 'GAP —', note: `fast = fast.next → ${v.fast} (gap ${ahead[1]}/${ahead[2]})`, desc: s.desc };
    if (s.title === 'Move both one step') return { tag: 'MOVE BOTH —', note: `fast → ${v.fast}, slow → ${v.slow}; gap stays ${n}`, desc: s.desc };
    if (s.title.startsWith('fast is null')) return { tag: 'TARGET FOUND —', note: `fast == null → slow.next is the target`, alert: `The node to delete is the one right after slow.`, desc: s.desc };
    if (s.title === 'Unlink the target') return { tag: 'UNLINK —', note: 'slow.next = slow.next.next', desc: s.desc };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `return dummy.next → ${s.result?.title}`, desc: s.desc, algoStep: 4 };
  });
}

export const removeNthFromEnd: ProblemDef<In> = {
  slug: '19-remove-nth-node-from-end',
  id: '19', title: 'Remove Nth Node From End', difficulty: 'Medium', category: 'Linked List', tag: 'two pointers',
  statement: 'Given the head of a linked list and an integer n, delete the n-th node counted from the end of the list and return the head. Try to do it in a single pass.',
  constraints: '1 ≤ n ≤ list length ≤ 30 (animation input: 1–10 nodes)',
  examples: [
    { label: '1 2 3 4 5, n = 2', input: { vals: [1, 2, 3, 4, 5], n: 2 }, output: '1 → 2 → 3 → 5' },
    { label: '1, n = 1', input: { vals: [1], n: 1 }, output: '(empty)' },
    { label: '1 2, n = 2 (remove the head)', input: { vals: [1, 2], n: 2 }, output: '2' },
  ],
  inputPlaceholder: 'values ; n — e.g. 1 2 3 4 5 ; 2',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Dummy node', state: 'dim' }, { label: 'slow (stops before the target)', state: 'compare' }, { label: 'fast (n nodes ahead)', state: 'active' }, { label: 'The gap between them', state: 'sorted' }, { label: 'Node to delete', state: 'error' }, { label: 'Pointer re-linked', state: 'swap' }, { label: 'Final list', state: 'found' }],
  varLabels: ['slow', 'fast', 'gap'],
  emphasis: ['n-th node', 'from the end', 'single pass'],
  phases: [
    { icon: '🚀', label: 'Dummy, slow, fast', tone: 'blue' },
    { icon: '⏩', label: 'Build the gap of n', tone: 'cyan' },
    { icon: '🚶', label: 'Move both together', tone: 'green' },
    { icon: '✂️', label: 'Unlink the target', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Keep a gap of n',
    text: 'Send fast n nodes ahead, then move slow and fast together. When fast reaches the end, slow is just before the node to remove, so slow.next = slow.next.next. A dummy node handles deleting the head.',
  },
  java: [
    'public ListNode removeNthFromEnd(ListNode head, int n) {',
    '    ListNode dummy = new ListNode(0, head);',
    '    ListNode fast = head, slow = dummy;',
    '    for (int i = 0; i < n; i++) fast = fast.next;',
    '    while (fast != null) {',
    '        fast = fast.next;',
    '        slow = slow.next;',
    '    }',
    '    slow.next = slow.next.next;',
    '    return dummy.next;',
    '}',
  ],
  python: [
    'def remove_nth_from_end(head, n):',
    '    dummy = ListNode(0, head)',
    '    fast, slow = head, dummy',
    '    for _ in range(n):',
    '        fast = fast.next',
    '    while fast:',
    '        fast, slow = fast.next, slow.next',
    '    slow.next = slow.next.next',
    '    return dummy.next',
  ],
  algorithm: [
    'Create a dummy node in front of head; slow = dummy, fast = head',
    'Advance fast n nodes to create a gap of n',
    'Move slow and fast together until fast is null',
    'slow is before the target: set slow.next = slow.next.next',
    'Return dummy.next',
  ],
  complexity: [{ label: 'Time', value: 'O(L)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The n-th node from the end is L − n + 1 nodes from the start. With fast n steps ahead, fast reaches null after L − n more moves, and slow has made the same L − n moves from the dummy, landing on node number L − n — the one just before the target. The dummy makes this correct even when the target is the head.',
};
