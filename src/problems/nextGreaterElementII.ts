import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { emitter } from './listheapKit.ts';
import { parseNums, ptr } from './ssbShared.ts';
import { annotate, auxItems } from './annotate.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  return { nums: parseNums(raw, { maxLen: 10, lo: -99, hi: 99, what: 'numbers' }) };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const ans: number[] = Array(n).fill(-1);
  const done: boolean[] = Array(n).fill(false);
  const stack: number[] = [];
  const steps: Step[] = [];
  let cur = -1; // virtual index 0 .. 2n-1
  let popped = -1;
  let phase = '—';

  const emit = emitter(steps, () => {
    const cells: Cell[] = nums.map((value, i) => {
      let state: CellState | undefined;
      if (i === popped) state = 'found';
      else if (cur >= 0 && i === cur % n) state = 'active';
      else if (stack.includes(i)) state = 'compare';
      else if (done[i]) state = 'sorted';
      return { key: i, value, state };
    });
    return {
      cells,
      pointers: cur >= 0 ? [ptr('i', cur >= n ? `i (lap 2)` : 'i', cur % n, 'blue')] : [],
      aux: [
        { title: 'stack (index:value, still waiting)', kind: 'stack' as const, items: stack.map((i) => `${i}:${nums[i]}`) },
        { title: 'answer (next greater, −1 = none)', kind: 'list' as const, items: ans.map((a, i) => (done[i] ? String(a) : '?')) },
      ],
      vars: { i: cur < 0 ? '—' : cur, x: cur < 0 ? '—' : nums[cur % n], lap: phase, 'stack size': stack.length },
    };
  });

  emit('Start', `A circular array of ${n} numbers: after the last element the search wraps to the first. We scan 2n = ${2 * n} positions with a stack of unresolved indexes.`,
    'Walking the array twice lets every element "see" the ones before it, which is exactly what wrapping around means.', 'info', [1, 2, 3, 4], [1, 2, 3], 0);

  for (let v = 0; v < 2 * n; v++) {
    cur = v;
    popped = -1;
    phase = v < n ? '1' : '2';
    const x = nums[v % n];
    emit(`Visit ${x} (position ${v % n}${v >= n ? ', second lap' : ''})`,
      stack.length && nums[stack[stack.length - 1]] < x ? `${x} is bigger than ${nums[stack[stack.length - 1]]} on top of the stack, so that index is resolved.` : 'Nothing on the stack is smaller than this value (or the stack is empty).',
      'Compare the new value with the most recent unresolved index.', 'info', [5, 6], [4, 5], 1);
    while (stack.length && nums[stack[stack.length - 1]] < x) {
      const j = stack.pop()!;
      ans[j] = x;
      done[j] = true;
      popped = j;
      emit(`Index ${j} resolved: next greater = ${x}`, `${nums[j]} < ${x}, so ans[${j}] = ${x}. Pop and keep checking the new top.`,
        'Everything popped here has finally met a larger value; the stack stays non-increasing.', 'success', [7, 8], [6, 7], 2);
      popped = -1;
    }
    if (v < n) {
      stack.push(v);
      emit(`Push index ${v}`, `Index ${v} (value ${x}) is now waiting for a bigger value to its right (or, after wrapping, to its left).`,
        'Only the first lap pushes: every index needs to be on the stack once, and the second lap just gives them a second chance.', 'info', [9], [8, 9], 3);
    } else {
      emit('Second lap: no push', `We only look for answers now; index ${v % n} was already pushed in the first lap.`,
        'Pushing again would create duplicates and could never change an answer.', 'warn', [9], [8], 3);
    }
  }

  cur = -1;
  popped = -1;
  phase = 'done';
  stack.forEach((j) => { done[j] = true; });
  emit('Done', `Indexes still on the stack (values ${stack.length ? stack.map((j) => nums[j]).join(', ') : 'none'}) hold the maximum, so nothing is greater: their answer stays −1.`,
    'After two laps every index has seen all other elements in circular order.', 'success', [11], [10], 3,
    { title: `[${ans.join(', ')}]`, text: 'Next greater element for each position (circular)' });
  return steps;
}

function annotated(input: In): Step[] {
  return annotate(build(input), (s, i, all) => {
    const stack = auxItems(s, 'stack');
    const top = stack.length ? stack[stack.length - 1] : 'none';
    if (i === 0) return { tag: 'INIT —', note: 'ans = [−1, …], stack = []' };
    const visit = /^Visit (-?\d+) \(position (\d+)/.exec(s.title);
    if (visit) return { tag: 'CHECK —', note: `x = nums[${visit[2]}] = ${visit[1]}, top = ${top}` };
    const pop = /^Index (\d+) resolved: next greater = (-?\d+)/.exec(s.title);
    if (pop) return { tag: 'POP + ANSWER —', note: `ans[${pop[1]}] = ${pop[2]}` };
    const push = /^Push index (\d+)/.exec(s.title);
    if (push) return { tag: 'PUSH —', note: `i = ${push[1]} < n → stack.push(${push[1]})` };
    if (s.title.startsWith('Second lap')) return { tag: 'SKIP PUSH —', note: 'i ≥ n → no push on lap 2' };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `return ans → ${s.result?.title ?? ''}`, desc: `${s.desc} Result: ${s.result?.title ?? ''}.`, algoStep: 4 };
  });
}

export const nextGreaterElementII: ProblemDef<In> = {
  slug: '503-next-greater-element-ii',
  id: '503', title: 'Next Greater Element II', difficulty: 'Medium', category: 'Stack', tag: 'monotonic stack + circular',
  statement: 'The array is circular: the element after the last one is the first one. For every position find the first strictly greater value you meet walking forward (wrapping around if needed), or −1 if there is none.',
  constraints: '1 ≤ n ≤ 10⁴, −10⁹ ≤ nums[i] ≤ 10⁹ (animation: up to 10 numbers between −99 and 99)',
  examples: [
    { label: '1 2 1', input: { nums: [1, 2, 1] }, output: '[2,-1,2]' },
    { label: '1 2 3 4 3', input: { nums: [1, 2, 3, 4, 3] }, output: '[2,3,4,-1,4]' },
    { label: '5 4 3 2 1', input: { nums: [5, 4, 3, 2, 1] }, output: '[-1,5,5,5,5]' },
  ],
  inputPlaceholder: 'e.g. 1 2 3 4 3',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Current position', state: 'active' }, { label: 'Waiting on stack', state: 'compare' }, { label: 'Just resolved', state: 'found' }, { label: 'Resolved', state: 'sorted' }],
  varLabels: ['i', 'x', 'lap', 'stack size'],
  emphasis: ['circular', 'first strictly greater value', 'wrapping around'],
  phases: [
    { icon: '🚀', label: 'Init stack + answers', tone: 'blue' },
    { icon: '🔍', label: 'Check x vs top (2 laps)', tone: 'cyan' },
    { icon: '⬆️', label: 'Pop + answer', tone: 'gold' },
    { icon: '📥', label: 'Push (lap 1 only)', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Two laps over the same stack',
    text: 'Run the usual next-greater scan, but over indexes 0 … 2n−1 using i mod n. Push an index only on the first lap; on both laps pop every index whose value is smaller than the current one and record the current value as its answer.',
  },
  java: [
    'public int[] nextGreaterElements(int[] nums) {',
    '    int n = nums.length;',
    '    int[] ans = new int[n];',
    '    Arrays.fill(ans, -1);',
    '    Deque<Integer> stack = new ArrayDeque<>();',
    '    for (int i = 0; i < 2 * n; i++) {',
    '        int x = nums[i % n];',
    '        while (!stack.isEmpty() && nums[stack.peek()] < x)',
    '            ans[stack.pop()] = x;',
    '        if (i < n) stack.push(i);',
    '    }',
    '    return ans;',
    '}',
  ],
  python: [
    'def next_greater_elements(nums):',
    '    n = len(nums)',
    '    ans = [-1] * n',
    '    stack = []',
    '    for i in range(2 * n):',
    '        x = nums[i % n]',
    '        while stack and nums[stack[-1]] < x:',
    '            ans[stack.pop()] = x',
    '        if i < n:',
    '            stack.append(i)',
    '    return ans',
  ],
  algorithm: [
    'Create ans filled with −1 and an empty stack of indexes',
    'For i = 0 … 2n−1 look at x = nums[i mod n]',
    'While the top index holds a smaller value, pop it and set its answer to x',
    'On the first lap (i < n) push index i',
    'Indexes left on the stack keep −1: they hold a maximum',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Unrolling the circle into a doubled array turns "wrap around" into an ordinary scan to the right. Each index is pushed once and popped at most once, so the 2n visits cost O(n) overall. The stack stays non-increasing from bottom to top, so the first value that beats the top is the first greater value for every index it pops.',
};
