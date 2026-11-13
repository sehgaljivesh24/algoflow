import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { cycleNext, emitter, listScene, parseCycle, show } from './listheapKit.ts';
import type { Ptr } from './listheapKit.ts';
import { annotate } from './annotate.ts';

interface In { vals: number[]; pos: number }

function build({ vals, pos }: In): Step[] {
  const next = cycleNext(vals.length, pos);
  let slow: number | null = 0;
  let fast: number | null = 0;
  let ptr: number | null = null;
  let hot: Record<number, CellState> = {};
  let round = 0;
  const steps: Step[] = [];
  const emit = emitter(steps, () => {
    const ps: Ptr[] = [{ id: 'slow', label: 'slow', at: slow, tone: 'blue' }];
    if (ptr === null) ps.push({ id: 'fast', label: 'fast', at: fast, tone: 'orange' });
    else ps.push({ id: 'ptr', label: 'ptr', at: ptr, tone: 'green' });
    return { scene: listScene(vals, next, ps, hot), vars: { slow: show(slow, vals), fast: show(fast, vals), ptr: show(ptr, vals), round } };
  });

  emit('Start', 'Phase 1 detects whether a loop exists (slow +1, fast +2). Phase 2 then finds where the loop begins.', 'Two phases: first prove there is a cycle, then use the meeting point to locate its entrance.', 'info', [1], [1], 0);

  let met = false;
  while (fast !== null && next[fast] !== null) {
    slow = next[slow as number];
    fast = next[next[fast] as number];
    round++;
    met = slow === fast;
    hot = met ? { [slow as number]: 'found' } : {};
    emit(`Round ${round}: slow +1, fast +2`, `slow → ${show(slow, vals)}, fast → ${show(fast, vals)}.`, met ? 'They collide inside the loop.' : 'Keep going until they meet or fast reaches null.', met ? 'success' : 'info', [2, 3, 4, 5], [2, 3, 4, 5], 0);
    if (met) break;
  }

  if (!met) {
    hot = {};
    emit('Fast reached the end: no cycle', 'The list terminates, so there is no cycle entrance. Return null.', 'A terminating list has no loop.', 'warn', [14], [11], 3, { title: 'null', text: 'No cycle' });
    return steps;
  }

  const meet = slow as number;
  hot = { [meet]: 'found' };
  ptr = 0;
  fast = null;
  emit('Phase 2: start a pointer at the head', `ptr starts at the head; slow stays at the meeting node ${vals[meet]}. Now move both one node at a time.`,
    'The distance from the head to the entrance equals the distance from the meeting point onward to the entrance (modulo the loop length).', 'info', [6], [6], 1);

  let step2 = 0;
  while (ptr !== slow) {
    ptr = next[ptr as number];
    slow = next[slow as number];
    step2++;
    hot = ptr === slow ? { [ptr as number]: 'found' } : {};
    emit(`Phase 2 step ${step2}`, `ptr → ${show(ptr, vals)}, slow → ${show(slow, vals)}.`, ptr === slow ? 'They are on the same node: the entrance.' : 'Both walk at speed 1 and will meet exactly at the entrance.', ptr === slow ? 'success' : 'info', [7, 8, 9], [7, 8, 9], 2);
  }

  const entry = ptr as number;
  hot = { [entry]: 'found' };
  emit('Cycle entrance found', `ptr and slow meet at index ${entry} (value ${vals[entry]}) — the node where the tail links back.`, 'Return that node.', 'success', [11], [10], 3, { title: `index ${entry}`, text: `Cycle starts at node ${vals[entry]}` });
  return steps;
}

function annotated(input: In): Step[] {
  const { vals, pos } = input;
  return annotate(build(input), (s, i, all) => {
    const round = /^Round (\d+)/.exec(s.title);
    const p2 = /^Phase 2 step (\d+)/.exec(s.title);
    if (i === 0) return { tag: 'INIT —', note: `slow = fast = head (${vals[0]})`, desc: `Phase 1 looks for a meeting point (slow +1, fast +2). Phase 2 then restarts a pointer at the head to find the entrance of the loop.` };
    if (round) {
      const met = s.logic.startsWith('They collide');
      return {
        tag: met ? '🔄 MEET —' : 'TRAVERSING —', note: `slow → ${s.vars.slow}, fast → ${s.vars.fast}${met ? ' → equal: cycle!' : ''}`,
        desc: `Round ${round[1]}: slow steps to ${s.vars.slow}, fast jumps to ${s.vars.fast}.${met ? ' They stand on the same node: there is a cycle.' : ''}`,
        ...(met ? { alert: `✅ Cycle detected at node ${s.vars.slow}. Now find where it starts.` } : {}),
      };
    }
    if (s.title.startsWith('Fast reached')) return { tag: 'LIST ENDS —', note: 'fast == null → return null', desc: 'fast ran off the end of the list, so there is no cycle and therefore no entrance. Return null.', algoStep: 3 };
    if (s.title.startsWith('Phase 2: start')) return { tag: 'RESTART —', note: `ptr = head (${vals[0]}), slow stays at ${s.vars.slow}`, desc: `ptr goes back to the head (${vals[0]}); slow stays on the meeting node ${s.vars.slow}. From now on both move one node per step.` };
    if (p2) return { tag: 'FIND START —', note: `ptr → ${s.vars.ptr}, slow → ${s.vars.slow}${s.vars.ptr === s.vars.slow ? ' → equal' : ''}`, desc: `Step ${p2[1]}: ptr moves to ${s.vars.ptr} and slow to ${s.vars.slow}.${s.vars.ptr === s.vars.slow ? ' They meet: this is the entrance.' : ' Not equal yet.'}` };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `return ptr (index ${pos})`, desc: `ptr and slow met at index ${pos} (value ${vals[pos]}): the node where the tail links back is the cycle entrance.` };
  });
}

export const linkedListCycleII: ProblemDef<In> = {
  slug: '142-linked-list-cycle-ii',
  id: '142', title: 'Linked List Cycle II', difficulty: 'Medium', category: 'Linked List', tag: "Floyd's cycle start",
  statement: 'Given the head of a linked list, return the node where a cycle begins, or null if there is no cycle. Do not modify the list, and try to use O(1) extra memory.',
  constraints: '0 ≤ n ≤ 10⁴ (animation input: 1–10 nodes; pos is the index the tail links back to, or −1)',
  examples: [
    { label: '3 2 0 −4, tail → index 1', input: { vals: [3, 2, 0, -4], pos: 1 }, output: 'index 1' },
    { label: '1 2 3 4 5, tail → index 0', input: { vals: [1, 2, 3, 4, 5], pos: 0 }, output: 'index 0' },
    { label: '1 2 3, no cycle', input: { vals: [1, 2, 3], pos: -1 }, output: 'null' },
  ],
  inputPlaceholder: 'values ; pos — e.g. 3 2 0 -4 ; 1',
  parseInput: parseCycle, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Meeting / entrance node', state: 'found' }],
  varLabels: ['slow', 'fast', 'ptr', 'round'],
  emphasis: ['cycle begins', 'O(1) extra memory'],
  phases: [
    { icon: '🐢', label: 'Traversing: slow +1, fast +2', tone: 'cyan' },
    { icon: '🔄', label: 'Cycle detected: restart ptr', tone: 'gold' },
    { icon: '🎯', label: 'Find the start', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Meet, then restart from the head',
    text: 'Run slow/fast until they meet inside the loop. Then put a new pointer at the head and move it and slow one node at a time: they meet exactly at the node where the cycle begins.',
  },
  java: [
    'public ListNode detectCycle(ListNode head) {',
    '    ListNode slow = head, fast = head;',
    '    while (fast != null && fast.next != null) {',
    '        slow = slow.next;',
    '        fast = fast.next.next;',
    '        if (slow == fast) {',
    '            ListNode ptr = head;',
    '            while (ptr != slow) {',
    '                ptr = ptr.next;',
    '                slow = slow.next;',
    '            }',
    '            return ptr;',
    '        }',
    '    }',
    '    return null;',
    '}',
  ],
  python: [
    'def detect_cycle(head):',
    '    slow = fast = head',
    '    while fast and fast.next:',
    '        slow = slow.next',
    '        fast = fast.next.next',
    '        if slow is fast:',
    '            ptr = head',
    '            while ptr is not slow:',
    '                ptr = ptr.next',
    '                slow = slow.next',
    '            return ptr',
    '    return None',
  ],
  algorithm: [
    'Move slow by 1 and fast by 2 until they meet (no meeting: return null)',
    'Start a second pointer ptr at the head',
    'Move ptr and slow one node at a time until they are equal',
    'That node is where the cycle begins',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Let a be the nodes before the entrance and c the cycle length. When they meet, slow has walked a + x and fast 2(a + x), and fast has gone around the loop a whole number of extra times, so a + x is a multiple of c. Hence walking a more steps from the meeting point lands exactly on the entrance — the same a steps that a pointer from the head takes to reach it.',
};
