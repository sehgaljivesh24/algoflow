import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { arrow, emitter, listScene, parseInts, show } from './listheapKit.ts';
import { annotate } from './annotate.ts';

interface In { vals: number[] }

function build({ vals }: In): Step[] {
  const n = vals.length;
  const next = vals.map((_, i) => (i + 1 < n ? i + 1 : null));
  let slow: number | null = 0;
  let fast: number | null = 0;
  let hot: Record<number, CellState> = {};
  let round = 0;
  const steps: Step[] = [];
  const emit = emitter(steps, () => ({
    scene: listScene(vals, next, [{ id: 'slow', label: 'slow', at: slow, tone: 'blue' }, { id: 'fast', label: 'fast', at: fast, tone: 'orange' }], hot),
    vars: { slow: show(slow, vals), fast: show(fast, vals), round },
  }));

  emit('Start', 'slow and fast both begin at the head.', 'fast covers twice the distance of slow, so when fast finishes the list, slow is halfway.', 'info', [1], [1], 0);

  while (fast !== null && next[fast] !== null) {
    slow = next[slow as number];
    fast = next[next[fast] as number];
    round++;
    emit(`Round ${round}: slow +1, fast +2`, `slow → ${show(slow, vals)}, fast → ${show(fast, vals)}.`, 'fast is always twice as far along as slow.', 'info', [3, 4], [3, 4], 1);
  }

  const mid = slow as number;
  hot = { [mid]: 'found' };
  const tail = [];
  for (let c: number | null = mid; c !== null; c = next[c]) tail.push(vals[c]);
  emit('fast cannot move further — slow is the middle', `${fast === null ? 'fast is null' : 'fast.next is null'}, so slow (${vals[mid]}) is the middle. Return it: the list from here is ${arrow(tail)}.`,
    n % 2 === 0 ? 'With an even length there are two middles; this loop lands on the second one, as the problem asks.' : 'With an odd length there is exactly one middle.', 'success', [6], [5], 2,
    { title: arrow(tail), text: `Middle node ${vals[mid]} (index ${mid})` });
  return steps;
}

function annotated(input: In): Step[] {
  return annotate(build(input), (s, i, all) => {
    const round = /^Round (\d+)/.exec(s.title);
    if (i === 0) return { tag: 'INIT —', note: `slow = fast = head (${input.vals[0]})`, desc: `slow and fast both start at the head (${input.vals[0]}) of a list of ${input.vals.length}. fast covers twice the distance of slow.` };
    if (round) return { tag: 'MOVE —', note: `slow = slow.next → ${s.vars.slow}; fast = fast.next.next → ${s.vars.fast}`, desc: `Round ${round[1]}: slow steps to ${s.vars.slow}, fast jumps to ${s.vars.fast}. fast is twice as far along as slow.` };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `fast can't move → return slow (${s.vars.slow})`, desc: `${s.desc}`, algoStep: 3 };
  });
}

export const middleOfLinkedList: ProblemDef<In> = {
  slug: '876-middle-of-the-linked-list',
  id: '876', title: 'Middle of the Linked List', difficulty: 'Easy', category: 'Linked List', tag: 'slow / fast pointer',
  statement: 'Return the middle node of a singly linked list. If the list has two middle nodes, return the second one.',
  constraints: '1 ≤ n ≤ 100 (animation input: 1–11 nodes)',
  examples: [
    { label: '1 2 3 4 5 6 7 8', input: { vals: [1, 2, 3, 4, 5, 6, 7, 8] }, output: '5 → 6 → 7 → 8' },
    { label: '1 2 3 4 5', input: { vals: [1, 2, 3, 4, 5] }, output: '3 → 4 → 5' },
    { label: '1 2 3 4 5 6', input: { vals: [1, 2, 3, 4, 5, 6] }, output: '4 → 5 → 6' },
    { label: '9', input: { vals: [9] }, output: '9' },
  ],
  inputPlaceholder: 'e.g. 1 2 3 4 5 6',
  parseInput: (raw) => ({ vals: parseInts(raw, { max: 11, hint: '1 2 3 4 5 6' }) }),
  buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Middle node', state: 'found' }],
  varLabels: ['slow', 'fast', 'round'],
  emphasis: ['middle node', 'second one'],
  phases: [
    { icon: '🚀', label: 'Init at head', tone: 'blue' },
    { icon: '🐢', label: 'Traversing: slow +1, fast +2', tone: 'cyan' },
    { icon: '🎯', label: 'fast stops: slow is the middle', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Two speeds',
    text: 'Move slow one node and fast two nodes at a time. When fast cannot take another full double step, slow has covered half the distance, so it sits on the middle.',
  },
  java: [
    'public ListNode middleNode(ListNode head) {',
    '    ListNode slow = head, fast = head;',
    '    while (fast != null && fast.next != null) {',
    '        slow = slow.next;',
    '        fast = fast.next.next;',
    '    }',
    '    return slow;',
    '}',
  ],
  python: [
    'def middle_node(head):',
    '    slow = fast = head',
    '    while fast and fast.next:',
    '        slow = slow.next',
    '        fast = fast.next.next',
    '    return slow',
  ],
  algorithm: [
    'Start slow and fast at the head',
    'While fast and fast.next exist: slow moves 1, fast moves 2',
    'When the loop ends, slow is the middle node',
    'Return slow and the list that follows it',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'After r rounds slow is at index r and fast at index 2r. The loop stops when 2r reaches the last index (odd n) or falls off the end (even n), so r = ⌊n/2⌋, which is exactly the index of the (second) middle node. No length count or second pass is needed.',
};
