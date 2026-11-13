import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { arrow, emitter, listScene, parseInts, show } from './listheapKit.ts';
import type { Ptr } from './listheapKit.ts';
import { annotate } from './annotate.ts';

interface In { vals: number[] }

function build({ vals }: In): Step[] {
  const n = vals.length;
  const next: (number | null)[] = vals.map((_, i) => (i + 1 < n ? i + 1 : null));
  let slow: number | null = null;
  let fast: number | null = null;
  let prev: number | null = null;
  let curr: number | null = null;
  let p1: number | null = null;
  let p2: number | null = null;
  let ptrs: Ptr[] = [];
  let hot: Record<number, CellState> = {};
  const steps: Step[] = [];
  const emit = emitter(steps, () => ({
    scene: listScene(vals, next, ptrs, hot),
    vars: { slow: show(slow, vals), fast: show(fast, vals), p1: show(p1, vals), p2: show(p2, vals) },
  }));
  const setPtrs = () => {
    ptrs = [];
    if (p1 !== null || p2 !== null) ptrs.push({ id: 'p1', label: 'p1', at: p1, tone: 'blue' }, { id: 'p2', label: 'p2', at: p2, tone: 'orange' });
    else if (prev !== null || curr !== null) ptrs.push({ id: 'prev', label: 'prev', at: prev, tone: 'purple' }, { id: 'curr', label: 'curr', at: curr, tone: 'blue' });
    else ptrs.push({ id: 'slow', label: 'slow', at: slow, tone: 'blue' }, { id: 'fast', label: 'fast', at: fast, tone: 'orange' });
  };

  slow = 0;
  fast = 0;
  setPtrs();
  emit('Start', 'Plan: (1) find the middle, (2) reverse the second half in place, (3) compare the two halves from both ends.', 'Reversing the second half lets us walk inward from both ends with two forward-moving pointers and no extra memory.', 'info', [1], [1], 0);

  let round = 0;
  while (fast !== null && next[fast] !== null) {
    slow = next[slow as number];
    fast = next[next[fast] as number];
    round++;
    setPtrs();
    emit(`Find middle: round ${round}`, `slow → ${show(slow, vals)}, fast → ${show(fast, vals)}.`, 'slow moves 1 and fast moves 2, so slow stops at the middle.', 'info', [2, 3, 4], [2, 3, 4], 0);
  }
  const mid = slow as number;
  hot = { [mid]: 'compare' };
  emit('Middle found', `slow stands on index ${mid}. The second half starts here; we will reverse it.`, n % 2 ? 'With an odd length the middle node ends up in both halves, which is harmless: it equals itself.' : 'With an even length the second half starts at the second middle.', 'success', [5], [5], 0);

  slow = null;
  fast = null;
  curr = mid;
  setPtrs();
  const done: number[] = [];
  while (curr !== null) {
    const nx: number | null = next[curr];
    next[curr] = prev;
    done.push(curr);
    hot = { [curr]: 'swap' };
    for (const d of done.slice(0, -1)) hot[d] = 'sorted';
    emit(`Reverse: flip node ${vals[curr]}`, `curr.next now points to ${prev === null ? 'null' : vals[prev]}.`, 'The same three-pointer reversal as "Reverse Linked List", but only on the second half.', 'info', [8, 9, 10, 11], [7, 8, 9], 1);
    prev = curr;
    curr = nx;
    setPtrs();
  }
  hot = {};
  for (const d of done) hot[d] = 'sorted';
  p1 = 0;
  p2 = prev;
  prev = null;
  setPtrs();
  emit('Second half reversed', `p1 starts at the head, p2 at the head of the reversed half (${vals[p2 as number]}). Compare until p2 runs out.`, 'The reversed half reads the original list from the end backwards.', 'info', [13], [10], 2);

  const matched: number[] = [];
  while (p2 !== null) {
    const a = p1 as number;
    const b = p2;
    const same = vals[a] === vals[b];
    hot = {};
    for (const d of done) hot[d] = 'sorted';
    for (const m of matched) hot[m] = 'found';
    hot[a] = same ? 'found' : 'error';
    hot[b] = same ? 'found' : 'error';
    if (!same) {
      emit(`${vals[a]} ≠ ${vals[b]}: not a palindrome`, `The value ${vals[a]} from the front differs from ${vals[b]} from the back.`, 'One mismatch is enough to answer false.', 'warn', [15], [12, 13], 2, { title: 'false', text: `${vals[a]} ≠ ${vals[b]}` });
      return steps;
    }
    emit(`Compare ${vals[a]} and ${vals[b]}: equal`, `p1 = ${vals[a]}, p2 = ${vals[b]}. They match, so move both inward.`, 'Matching pairs confirm the list reads the same from both ends.', 'success', [14, 15, 16, 17], [11, 12, 14], 2);
    matched.push(a, b);
    p1 = next[a];
    p2 = next[b];
    setPtrs();
  }

  hot = {};
  for (const m of matched) hot[m] = 'found';
  emit('Every pair matched', `p2 reached null and no mismatch occurred, so ${arrow(vals)} is a palindrome.`, 'Matching all the pairs means the list equals its reverse.', 'success', [19], [15], 3, { title: 'true', text: 'The list reads the same backwards' });
  return steps;
}

function annotated(input: In): Step[] {
  const { vals } = input;
  return annotate(build(input), (s, i, all) => {
    const v = s.vars;
    if (i === 0) return { tag: 'INIT —', note: 'slow = fast = head', desc: `Three stages: find the middle, reverse the second half in place, then compare the two halves from both ends. list = ${arrow(vals)}.` };
    const round = /^Find middle: round (\d+)/.exec(s.title);
    if (round) return { tag: 'FIND MIDDLE —', note: `slow → ${v.slow}, fast → ${v.fast}`, desc: `Round ${round[1]}: slow steps to ${v.slow}, fast jumps to ${v.fast}. When fast runs out, slow is at the middle.` };
    if (s.title === 'Middle found') return { tag: 'MIDDLE —', note: `slow == middle → ${v.slow}`, desc: s.desc };
    if (s.title.startsWith('Reverse: flip')) return { tag: 'REVERSE HALF —', note: `curr.next = prev; then prev, curr advance`, desc: s.desc };
    if (s.title === 'Second half reversed') return { tag: 'COMPARE —', note: `p1 = head (${v.p1}), p2 = ${v.p2}`, desc: s.desc };
    if (s.title.includes('not a palindrome')) return { tag: '✗ MISMATCH —', note: `${v.p1} ≠ ${v.p2} → return false`, alert: `Not a palindrome: ${v.p1} from the front ≠ ${v.p2} from the back.`, algoStep: 3 };
    if (s.title.startsWith('Compare')) return { tag: 'COMPARE —', note: `p1 = ${v.p1}, p2 = ${v.p2} → equal; move inward`, desc: s.desc };
    if (i === all.length - 1) return { tag: '✅ Done!', note: 'p2 == null → return true', alert: '✅ Palindrome! Every pair from the two ends matched.', desc: s.desc };
  });
}

export const palindromeLinkedList: ProblemDef<In> = {
  slug: '234-palindrome-linked-list',
  id: '234', title: 'Palindrome Linked List', difficulty: 'Easy', category: 'Linked List', tag: 'reverse second half',
  statement: 'Decide whether a singly linked list reads the same forwards and backwards, ideally in O(n) time and O(1) extra space.',
  constraints: '1 ≤ n ≤ 10⁵ (animation input: 1–10 nodes, values −99..99)',
  examples: [
    { label: '1 2 2 1', input: { vals: [1, 2, 2, 1] }, output: 'true' },
    { label: '1 2 3 2 1', input: { vals: [1, 2, 3, 2, 1] }, output: 'true' },
    { label: '1 2 3 4', input: { vals: [1, 2, 3, 4] }, output: 'false' },
  ],
  inputPlaceholder: 'e.g. 1 2 3 2 1',
  parseInput: (raw) => ({ vals: parseInts(raw, { max: 10, hint: '1 2 3 2 1' }) }),
  buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Middle', state: 'compare' }, { label: 'Being flipped', state: 'swap' }, { label: 'Reversed half', state: 'sorted' }, { label: 'Matched pair', state: 'found' }, { label: 'Mismatch', state: 'error' }],
  varLabels: ['slow', 'fast', 'p1', 'p2'],
  emphasis: ['palindrome', 'reads the same'],
  phases: [
    { icon: '🐢', label: 'Find the middle', tone: 'cyan' },
    { icon: '🔀', label: 'Reverse second half', tone: 'orange' },
    { icon: '⚖️', label: 'Compare halves', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Reverse the second half',
    text: 'Find the middle with slow/fast pointers, reverse everything from the middle on, then walk one pointer from the head and one from the reversed tail, comparing values until the second one runs out.',
  },
  java: [
    'public boolean isPalindrome(ListNode head) {',
    '    ListNode slow = head, fast = head;',
    '    while (fast != null && fast.next != null) {',
    '        slow = slow.next;',
    '        fast = fast.next.next;',
    '    }',
    '    ListNode prev = null, curr = slow;',
    '    while (curr != null) {',
    '        ListNode nxt = curr.next;',
    '        curr.next = prev;',
    '        prev = curr;',
    '        curr = nxt;',
    '    }',
    '    ListNode p1 = head, p2 = prev;',
    '    while (p2 != null) {',
    '        if (p1.val != p2.val) return false;',
    '        p1 = p1.next;',
    '        p2 = p2.next;',
    '    }',
    '    return true;',
    '}',
  ],
  python: [
    'def is_palindrome(head):',
    '    slow = fast = head',
    '    while fast and fast.next:',
    '        slow = slow.next',
    '        fast = fast.next.next',
    '    prev, curr = None, slow',
    '    while curr:',
    '        nxt = curr.next',
    '        curr.next = prev',
    '        prev, curr = curr, nxt',
    '    p1, p2 = head, prev',
    '    while p2:',
    '        if p1.val != p2.val:',
    '            return False',
    '        p1, p2 = p1.next, p2.next',
    '    return True',
  ],
  algorithm: [
    'Find the middle with slow and fast pointers',
    'Reverse the list from the middle to the end',
    'Walk p1 from the head and p2 from the reversed tail, comparing values',
    'Any mismatch means false; if p2 runs out, the list is a palindrome',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'A sequence is a palindrome exactly when its first half equals its second half read backwards. Reversing the second half in place makes that backwards reading a normal forward walk, so two pointers compare symmetric pairs. Comparing only until p2 ends is enough: for an odd length the shared middle node trivially matches itself.',
};
