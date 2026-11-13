import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { queue: number[]; k: number }

function parse(raw: string): In {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error('Format: queue | k, e.g. 1 2 3 4 5 | 3');
  const queue = parts[0].split(/[\s,]+/).filter(Boolean).map(Number);
  const k = Number(parts[1].trim());
  if (!queue.length || queue.some((n) => !Number.isInteger(n))) throw new Error('The queue must contain whole numbers');
  if (queue.length > 12) throw new Error('Use 12 elements or fewer');
  if (!Number.isInteger(k) || k < 1 || k > queue.length) throw new Error(`k must be a whole number from 1 to ${queue.length}`);
  return { queue, k };
}

interface Item { v: number; id: number }

function build({ queue: input, k }: In): Step[] {
  const n = input.length;
  const q: Item[] = input.map((v, id) => ({ v, id }));
  const stack: Item[] = [];
  const steps: Step[] = [];
  let moved = -1;

  const cells = (): Cell[] =>
    input.map((value, id) => {
      let state: CellState | undefined;
      if (id === moved) state = 'active';
      else if (stack.some((s) => s.id === id)) state = 'compare';
      return { key: id, value, state };
    });
  const aux = () => [
    { title: 'queue (front → back)', kind: 'queue' as const, items: q.map((x) => String(x.v)) },
    { title: 'stack (top on the right)', kind: 'stack' as const, items: stack.map((x) => String(x.v)), highlight: stack.length ? stack.length - 1 : undefined },
  ];
  const vars = (phase: string) => ({ phase, k, 'queue size': q.length, 'stack size': stack.length });
  const add = (title: string, desc: string, logic: string, tone: 'info' | 'warn' | 'success', j: number[], p: number[], a: number, phase: string, result?: Step['result']) =>
    steps.push({ title, desc, cells: cells(), pointers: [], aux: aux(), vars: vars(phase), logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, result });

  add('Start', `Queue = [${input.join(', ')}], k = ${k}. Reverse only the first ${k} elements.`,
    'A queue only gives back its oldest element and a stack gives back its newest. Moving k items through a stack reverses their order.', 'info', [0, 1], [0, 1], 0, 'start');

  for (let i = 0; i < k; i++) {
    const x = q.shift()!;
    stack.push(x);
    moved = x.id;
    add(`Dequeue ${x.v} → push on stack`, `Take ${x.v} from the front of the queue and push it onto the stack (${i + 1} of ${k}).`,
      'The first element ends up deepest in the stack, the k-th element on top.', 'info', [2, 3], [2, 3], 1, 'queue → stack');
  }

  for (let i = 0; i < k; i++) {
    const x = stack.pop()!;
    q.push(x);
    moved = x.id;
    add(`Pop ${x.v} → enqueue at the back`, `Pop ${x.v} from the stack and add it to the back of the queue (${i + 1} of ${k}).`,
      'The stack returns the k-th element first, so the first k items re-enter in reversed order, behind the untouched ones.', 'success', [4, 5], [4, 5], 2, 'stack → queue');
  }

  for (let i = 0; i < n - k; i++) {
    const x = q.shift()!;
    q.push(x);
    moved = x.id;
    add(`Rotate ${x.v} to the back`, `The untouched element ${x.v} is still at the front. Move it behind the reversed block (${i + 1} of ${n - k}).`,
      'Cycling the remaining n − k elements to the back restores their original order in front of the reversed part.', 'warn', [6, 7], [6, 7], 3, 'rotate rest');
  }

  moved = -1;
  const out = q.map((x) => x.v);
  add('Done', `The first ${k} elements are reversed; the rest keep their order.`, `Result: [${out.join(', ')}]`, 'success', [8], [8], 3, 'done',
    { title: JSON.stringify(out), text: 'Queue after reversing the first k elements' });
  return steps;
}

export const reverseFirstKQueue: ProblemDef<In> = {
  slug: 'gfg-reverse-first-k-elements-of-queue',
  id: 'GFG', title: 'Reverse First K Elements of Queue', difficulty: 'Medium', category: 'Queue', tag: 'queue + stack',
  statement: 'Given a queue of integers and a number k, reverse the order of the first k elements of the queue and leave the remaining elements in their original relative order.',
  constraints: '1 ≤ k ≤ n ≤ 10⁵ (animation input is limited to 12 elements)',
  examples: [
    { label: '1 2 3 4 5 | k = 3', input: { queue: [1, 2, 3, 4, 5], k: 3 }, output: '[3,2,1,4,5]' },
    { label: '10 20 30 40 | k = 4', input: { queue: [10, 20, 30, 40], k: 4 }, output: '[40,30,20,10]' },
    { label: '5 6 7 8 9 | k = 1', input: { queue: [5, 6, 7, 8, 9], k: 1 }, output: '[5,6,7,8,9]' },
  ],
  inputPlaceholder: 'queue | k, e.g. 1 2 3 4 5 | 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Element just moved', state: 'active' }, { label: 'Currently on the stack', state: 'compare' }],
  varLabels: ['phase', 'k', 'queue size', 'stack size'],
  approach: {
    title: 'Use a stack as a reverser, then rotate',
    text: 'Dequeue the first k elements onto a stack (this reverses their order), then pop them back into the queue, which puts the reversed block at the back. Finally rotate the other n − k elements from the front to the back so they sit before the reversed block again.',
  },
  java: [
    'public Queue<Integer> reverseFirstK(Queue<Integer> q, int k) {',
    '    Deque<Integer> stack = new ArrayDeque<>();',
    '    for (int i = 0; i < k; i++)',
    '        stack.push(q.poll());',
    '    while (!stack.isEmpty())',
    '        q.add(stack.pop());',
    '    for (int i = 0; i < q.size() - k; i++)',
    '        q.add(q.poll());',
    '    return q;',
    '}',
  ],
  python: [
    'def reverse_first_k(q, k):  # q is a collections.deque',
    '    stack = []',
    '    for _ in range(k):',
    '        stack.append(q.popleft())',
    '    while stack:',
    '        q.append(stack.pop())',
    '    for _ in range(len(q) - k):',
    '        q.append(q.popleft())',
    '    return q',
  ],
  algorithm: [
    'Create an empty stack',
    'Dequeue k elements and push each onto the stack',
    'Pop the stack and enqueue each element at the back',
    'Move the remaining n − k elements from the front to the back and return the queue',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(k)' }],
  why: 'Pushing k items on a stack and popping them reverses their order (last in, first out). After re-enqueueing, the queue is the n − k untouched elements followed by the k reversed ones; cycling the untouched elements from front to back keeps their relative order and puts them ahead of the reversed block, which is the required final order.',
};
