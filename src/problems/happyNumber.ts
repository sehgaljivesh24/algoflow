import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { emitter, listScene, parseOne } from './listheapKit.ts';

interface In { n: number }

const sq = (x: number): number => String(x).split('').reduce((s, d) => s + Number(d) ** 2, 0);
const sqText = (x: number): string => `${String(x).split('').map((d) => `${d}²`).join(' + ')} = ${sq(x)}`;

/** The number chain n → f(n) → …, as list nodes (stops at 1, or loops back to a repeated value). */
function chain(n: number): { vals: number[]; next: (number | null)[] } {
  const vals = [n];
  const at = new Map<number, number>([[n, 0]]);
  const next: (number | null)[] = [null];
  let cur = n;
  while (cur !== 1) {
    const nx = sq(cur);
    if (at.has(nx)) {
      next[vals.length - 1] = at.get(nx)!;
      break;
    }
    next[vals.length - 1] = vals.length;
    at.set(nx, vals.length);
    vals.push(nx);
    next.push(null);
    cur = nx;
  }
  return { vals, next };
}

function parse(raw: string): In {
  const n = parseOne(raw, 1, 9999, 'The number');
  if (chain(n).vals.length > 14) throw new Error('That number’s chain is too long to draw — try a smaller one (e.g. 19, 2, 7)');
  return { n };
}

function build({ n }: In): Step[] {
  const { vals, next } = chain(n);
  const succ = (i: number): number => next[i] ?? i;
  let slow = 0;
  let fast = 0;
  let hot: Record<number, CellState> = {};
  let round = 0;
  const steps: Step[] = [];
  const emit = emitter(steps, () => ({
    scene: listScene(vals, next, [{ id: 'slow', label: 'slow', at: slow, tone: 'blue' }, { id: 'fast', label: 'fast', at: fast, tone: 'orange' }], hot),
    vars: { slow: vals[slow], fast: vals[fast], round },
  }));

  emit('Start', `Each node is the digit-square sum of the one before it, starting from ${n}: next(${vals[0]}) = ${sqText(vals[0])}. Both pointers begin at ${n}.`,
    'The sequence either reaches 1 and stays there, or falls into a cycle — exactly the situation Floyd’s two-pointer trick detects.', 'info', [8, 10], [1, 2], 0,
    undefined, { tag: 'DEFINE', note: `next(${vals[0]}) = ${sqText(vals[0])}` });

  fast = succ(0);
  hot = {};
  emit('fast takes one step ahead', `slow stays on ${vals[slow]}, and fast takes one step ahead: ${vals[0]} → ${vals[fast]} (${sqText(vals[0])})`,
    'Starting fast one step ahead lets the loop test "fast == 1" and "slow == fast" right away.', 'info', [1], [3], 1,
    undefined, { tag: 'INIT', note: `slow = ${vals[slow]}, fast = next(${vals[0]}) = ${vals[fast]}` });

  while (vals[fast] !== 1 && slow !== fast) {
    const oldSlow = slow;
    const oldFast = fast;
    const f1 = succ(fast);
    const f2 = succ(f1);
    round++;
    slow = succ(slow);
    emit(`Round ${round}: slow +1`, `slow moves one step: ${vals[oldSlow]} → ${vals[slow]} (${sqText(vals[oldSlow])})`,
      'Each "step" means replacing the number by the sum of the squares of its digits.', 'info', [3], [5], 2,
      undefined, { tag: 'SLOW', note: `slow = next(${vals[oldSlow]}) = ${vals[slow]}` });
    fast = f1;
    emit(`Round ${round}: fast +1`, `fast hops once: ${vals[oldFast]} → ${vals[f1]} (${sqText(vals[oldFast])})`,
      'Fast needs two applications of next per round.', 'info', [4], [6], 2,
      undefined, { tag: 'FAST', note: `next(${vals[oldFast]}) = ${vals[f1]}` });
    fast = f2;
    emit(`Round ${round}: fast +2`, `fast hops again: ${vals[f1]} → ${vals[f2]} (${sqText(vals[f1])}), so fast is on ${vals[fast]}`,
      'After the second hop fast is two steps further along; then the loop condition is tested.', 'info', [4], [6], 2,
      undefined, { tag: 'FAST', note: `fast = next(next(${vals[oldFast]})) = ${vals[f2]}` });
  }

  if (vals[fast] === 1) {
    hot = { [fast]: 'found' };
    emit('fast reached 1: happy', `fast is on 1, which maps to itself, so the process terminates and ${n} is happy`, 'Reaching 1 means the process terminates successfully.', 'success', [2, 6], [4, 7], 3,
      undefined, { tag: 'CHECK', note: 'fast == 1 → return true' });
    emit('Done', `${n} reaches 1, so the answer is true`, 'Reaching 1 means the process terminates successfully.', 'success', [6], [7], 4,
      { title: 'true', text: `${n} reaches 1` }, { tag: '✅ Done!', note: 'return fast == 1 → true' });
  } else {
    hot = { [fast]: 'error' };
    emit('slow met fast: a cycle without 1', `slow and fast both stand on ${vals[fast]}, so the sequence loops forever and never reaches 1`, 'Meeting inside a loop proves the sequence repeats; since fast would have hit 1 first otherwise, n is not happy.', 'warn', [2, 6], [4, 7], 3,
      undefined, { tag: 'CHECK', note: `slow == fast == ${vals[fast]}, fast != 1`, alert: `slow met fast on ${vals[fast]}: the numbers cycle and never reach 1.` });
    emit('Done', `${n} falls into a cycle that does not contain 1, so the answer is false`, 'Meeting inside a loop proves the sequence repeats; since fast would have hit 1 first otherwise, n is not happy.', 'warn', [6], [7], 4,
      { title: 'false', text: `${n} falls into a cycle` }, { tag: '✅ Done!', note: 'return fast == 1 → false' });
  }
  return steps;
}

export const happyNumber: ProblemDef<In> = {
  slug: '202-happy-number',
  id: '202', title: 'Happy Number', difficulty: 'Easy', category: 'Linked List', tag: "Floyd's cycle",
  statement: 'Repeatedly replace a positive integer by the sum of the squares of its digits. It is "happy" if this process reaches 1; otherwise it loops forever in a cycle that does not contain 1. Decide whether n is happy.',
  constraints: '1 ≤ n ≤ 2³¹ − 1 (animation input: 1–9999 and a sequence of at most 14 distinct values)',
  examples: [
    { label: '19 (happy)', input: { n: 19 }, output: 'true' },
    { label: '2 (cycle)', input: { n: 2 }, output: 'false' },
    { label: '7 (happy)', input: { n: 7 }, output: 'true' },
  ],
  inputPlaceholder: 'a positive integer, e.g. 19',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Reached 1', state: 'found' }, { label: 'Cycle meeting point', state: 'error' }],
  varLabels: ['slow', 'fast', 'round'],
  emphasis: ['sum of the squares of its digits', 'reaches 1', 'cycle'],
  phases: [
    { icon: '🔢', label: 'DEFINE next(x)', tone: 'blue' },
    { icon: '🚩', label: 'INIT slow, fast', tone: 'cyan' },
    { icon: '🐢', label: 'ROUND (slow +1, fast +2)', tone: 'gold' },
    { icon: '🔍', label: 'CHECK 1 or cycle', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'The sequence is a linked list',
    text: 'Treat "number → digit-square sum" as a next pointer. The chain either ends at 1 or enters a cycle, so run slow (1 step) and fast (2 steps): stop when fast hits 1 (happy) or slow meets fast (cycle, unhappy).',
  },
  java: [
    'public boolean isHappy(int n) {',
    '    int slow = n, fast = next(n);',
    '    while (fast != 1 && slow != fast) {',
    '        slow = next(slow);',
    '        fast = next(next(fast));',
    '    }',
    '    return fast == 1;',
    '}',
    'private int next(int x) {',
    '    int s = 0;',
    '    for (; x > 0; x /= 10) s += (x % 10) * (x % 10);',
    '    return s;',
    '}',
  ],
  python: [
    'def is_happy(n):',
    '    def nxt(x):',
    '        return sum(int(d) ** 2 for d in str(x))',
    '    slow, fast = n, nxt(n)',
    '    while fast != 1 and slow != fast:',
    '        slow = nxt(slow)',
    '        fast = nxt(nxt(fast))',
    '    return fast == 1',
  ],
  algorithm: [
    'Define next(x) = sum of squares of the digits of x',
    'Start slow at n and fast one step ahead',
    'Each round move slow once and fast twice',
    'Stop when fast reaches 1 (happy) or slow meets fast somewhere else (a cycle)',
    'Return fast == 1',
  ],
  complexity: [{ label: 'Time', value: 'O(log n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The next value is bounded (a number below 10⁴ maps to at most 324), so the sequence can take only finitely many values and must either hit 1 or repeat. Repeating means a cycle, which Floyd’s two pointers detect without storing visited numbers. Since 1 maps to itself, fast lands on 1 before slow could ever meet it, which makes "fast == 1" a safe success test.',
};
