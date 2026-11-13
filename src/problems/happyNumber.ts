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
  let fast = succ(0);
  let hot: Record<number, CellState> = {};
  let round = 0;
  const steps: Step[] = [];
  const emit = emitter(steps, () => ({
    scene: listScene(vals, next, [{ id: 'slow', label: 'slow', at: slow, tone: 'blue' }, { id: 'fast', label: 'fast', at: fast, tone: 'orange' }], hot),
    vars: { slow: vals[slow], fast: vals[fast], round },
  }));

  emit('Start', `Each node is the digit-square sum of the one before it, starting from ${n}. slow = ${n}; fast takes one step ahead: ${vals[0]} → ${vals[fast]} (${sqText(vals[0])}).`,
    'The sequence either reaches 1 and stays there, or falls into a cycle — exactly the situation Floyd’s two-pointer trick detects.', 'info', [1], [3], 0);

  while (vals[fast] !== 1 && slow !== fast) {
    const s2 = succ(slow);
    const f1 = succ(fast);
    const f2 = succ(f1);
    slow = s2;
    fast = f2;
    round++;
    emit(`Round ${round}: slow +1, fast +2`, `slow → ${vals[slow]}; fast → ${vals[f1]} → ${vals[fast]}.`,
      'Each "step" means replacing the number by the sum of the squares of its digits.', 'info', [3, 4], [5, 6], 1);
  }

  if (vals[fast] === 1) {
    hot = { [fast]: 'found' };
    emit('fast reached 1: happy', `The sequence ends at 1 (and 1 stays 1), so ${n} is a happy number.`, 'Reaching 1 means the process terminates successfully.', 'success', [6], [7], 2, { title: 'true', text: `${n} reaches 1` });
  } else {
    hot = { [fast]: 'error' };
    emit('slow met fast: a cycle without 1', `Both pointers stand on ${vals[fast]}, so the sequence loops forever and never reaches 1.`, 'Meeting inside a loop proves the sequence repeats; since fast would have hit 1 first otherwise, n is not happy.', 'warn', [2, 6], [4, 7], 3, { title: 'false', text: `${n} falls into a cycle` });
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
    'Happy if fast reaches 1; unhappy if slow meets fast somewhere else',
  ],
  complexity: [{ label: 'Time', value: 'O(log n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The next value is bounded (a number below 10⁴ maps to at most 324), so the sequence can take only finitely many values and must either hit 1 or repeat. Repeating means a cycle, which Floyd’s two pointers detect without storing visited numbers. Since 1 maps to itself, fast lands on 1 before slow could ever meet it, which makes "fast == 1" a safe success test.',
};
