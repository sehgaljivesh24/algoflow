import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { cycleNext, emitter, listScene, parseCycle, show } from './listheapKit.ts';

interface In { vals: number[]; pos: number }

function build({ vals, pos }: In): Step[] {
  const next = cycleNext(vals.length, pos);
  let slow: number | null = 0;
  let fast: number | null = 0;
  let hot: Record<number, CellState> = {};
  let round = 0;
  let status = 'searching';
  const steps: Step[] = [];
  const emit = emitter(steps, () => ({
    scene: listScene(vals, next, [{ id: 'slow', label: 'slow', at: slow, tone: 'blue' }, { id: 'fast', label: 'fast', at: fast, tone: 'orange' }], hot),
    vars: { slow: show(slow, vals), fast: show(fast, vals), round, status },
  }));

  emit('Start', `Both pointers begin at the head (${vals[0]}). ${pos >= 0 ? `The tail secretly links back to node ${vals[pos]}.` : 'The tail points to null.'}`,
    'Idea: if there is a loop, a fast runner must eventually lap a slow runner, like two people on a circular track.', 'info', [1], [1], 0, undefined,
    { tag: 'INIT —', note: `slow = fast = head (${vals[0]})` });

  while (fast !== null && next[fast] !== null) {
    round++;
    const fromFast: number = fast;
    slow = next[slow as number] as number;
    emit(`Round ${round}: slow +1`, `slow takes one step to node ${show(slow, vals)}. fast waits at ${show(fast, vals)} for its turn.`,
      'slow always moves exactly one node per round.', 'info', [3], [3], 1, undefined,
      { tag: 'SLOW +1 —', note: `slow = slow.next → ${show(slow, vals)}` });
    fast = next[next[fast] as number];
    const meet = slow === fast;
    hot = meet ? { [slow]: 'found' } : {};
    emit(`Round ${round}: fast +2`, `fast jumps two nodes from ${vals[fromFast]} to ${show(fast, vals)}. ${meet ? 'slow and fast now stand on the same node!' : `slow is on ${show(slow, vals)}, fast on ${show(fast, vals)}: different nodes, keep going.`}`,
      meet ? 'They landed on the same node.' : 'Inside a loop the gap between them changes by exactly one node per round.', meet ? 'success' : 'info', [4, 5], [4, 5], 1, undefined,
      { tag: 'FAST +2 —', note: `fast = fast.next.next → ${show(fast, vals)}; slow == fast? ${meet ? 'yes' : 'no'}` });
    if (meet) {
      status = 'cycle!';
      emit('They meet: a cycle exists', `After ${round} round${round > 1 ? 's' : ''} both pointers are on node ${vals[slow]}. A list that ends could never make fast catch up with slow.`,
        'Inside a loop the fast pointer gains exactly one node per round, so it cannot jump over the slow one — they must meet.', 'success', [5], [5], 2, undefined,
        { tag: '🔄 CYCLE FOUND —', note: `slow == fast == ${vals[slow]} → return true`, alert: `✅ Cycle detected: slow and fast met at node ${vals[slow]} after ${round} round${round > 1 ? 's' : ''}.` });
      emit('Done', 'The pointers met, so the list contains a cycle.', 'One meeting is a proof; no second pass is needed to answer yes or no.', 'success', [5], [6], 4,
        { title: 'true', text: `Pointers met at node ${vals[slow]}` }, { tag: '✅ Done!', note: 'return true' });
      return steps;
    }
  }

  hot = {};
  status = 'no cycle';
  emit('Fast fell off the end: no cycle', fast === null ? `After ${round} round${round === 1 ? '' : 's'} fast became null: it ran off the end of the list.` : `After ${round} round${round === 1 ? '' : 's'} fast.next is null: it reached the last node.`,
    'A list with a loop never ends, so reaching null proves there is no loop.', 'warn', [2, 7], [2, 7], 3, undefined,
    { tag: 'LIST ENDS —', note: fast === null ? 'fast == null → loop stops' : 'fast.next == null → loop stops' });
  emit('Done', 'fast reached the end of the list, so no node is ever visited twice.', 'Finite lists end in null; only a cycle can keep fast running forever.', 'success', [7], [7], 4,
    { title: 'false', text: 'The list ends in null' }, { tag: '✅ Done!', note: 'return false' });
  return steps;
}

export const linkedListCycle: ProblemDef<In> = {
  slug: '141-linked-list-cycle',
  id: '141', title: 'Linked List Cycle', difficulty: 'Easy', category: 'Linked List', tag: "Floyd's cycle",
  statement: 'Given the head of a linked list, decide whether some node can be reached again by following next pointers (the list contains a cycle). Use O(1) extra memory if you can.',
  constraints: '0 ≤ n ≤ 10⁴ (animation input: 1–10 nodes; pos is the index the tail links back to, or −1 for no cycle)',
  examples: [
    { label: '3 2 0 −4, tail → index 1', input: { vals: [3, 2, 0, -4], pos: 1 }, output: 'true' },
    { label: '1 2, tail → index 0', input: { vals: [1, 2], pos: 0 }, output: 'true' },
    { label: '1 2 3 4 5, no cycle', input: { vals: [1, 2, 3, 4, 5], pos: -1 }, output: 'false' },
  ],
  inputPlaceholder: 'values ; pos — e.g. 3 2 0 -4 ; 1',
  parseInput: parseCycle, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Meeting node', state: 'found' }],
  varLabels: ['slow', 'fast', 'round', 'status'],
  emphasis: ['cycle', 'next pointers', 'O(1) extra memory'],
  phases: [
    { icon: '🚀', label: 'Init at head', tone: 'blue' },
    { icon: '🐢', label: 'Traversing: slow +1, fast +2', tone: 'cyan' },
    { icon: '🔄', label: 'Cycle detected', tone: 'gold' },
    { icon: '🏁', label: 'List ends', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Tortoise and hare',
    text: 'Move slow one node and fast two nodes per round. If fast reaches null the list is finite. If there is a cycle, fast enters it and keeps closing the gap on slow until they stand on the same node.',
  },
  java: [
    'public boolean hasCycle(ListNode head) {',
    '    ListNode slow = head, fast = head;',
    '    while (fast != null && fast.next != null) {',
    '        slow = slow.next;',
    '        fast = fast.next.next;',
    '        if (slow == fast) return true;',
    '    }',
    '    return false;',
    '}',
  ],
  python: [
    'def has_cycle(head):',
    '    slow = fast = head',
    '    while fast and fast.next:',
    '        slow = slow.next',
    '        fast = fast.next.next',
    '        if slow is fast:',
    '            return True',
    '    return False',
  ],
  algorithm: [
    'Put slow and fast on the head',
    'Each round: slow moves 1 step, fast moves 2 steps',
    'If slow and fast are the same node, there is a cycle',
    'If fast (or fast.next) is null, the list ends: no cycle',
    'Return the verdict',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Once both pointers are inside a cycle of length L, each round fast gains one node on slow, so the gap shrinks by 1 modulo L and must hit 0 within L rounds. Fast moves by 2, but the gap only changes by 1, so it can never skip past slow. Without a cycle fast reaches null after about n/2 rounds.',
};
