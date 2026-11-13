import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotate, auxItems } from './annotate.ts';

interface In { nums1: number[]; nums2: number[] }

function parse(raw: string): In {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error('Format: nums1 | nums2, e.g. 4 1 2 | 1 3 4 2');
  const toNums = (s: string) => s.split(/[\s,]+/).filter(Boolean).map(Number);
  const nums1 = toNums(parts[0]);
  const nums2 = toNums(parts[1]);
  if (!nums1.length || !nums2.length || [...nums1, ...nums2].some((n) => !Number.isInteger(n))) throw new Error('Both lists must contain whole numbers');
  if (nums2.length > 10) throw new Error('Use at most 10 numbers in nums2');
  if (new Set(nums2).size !== nums2.length) throw new Error('nums2 must not contain duplicates');
  if (new Set(nums1).size !== nums1.length) throw new Error('nums1 must not contain duplicates');
  if (nums1.some((v) => !nums2.includes(v))) throw new Error('Every number in nums1 must also appear in nums2');
  return { nums1, nums2 };
}

function build({ nums1, nums2 }: In): Step[] {
  const n = nums2.length;
  const stack: number[] = []; // values
  const next = new Map<number, number>();
  const ans: (number | string)[] = [];
  const steps: Step[] = [];

  const cells = (cur: number, popped?: number, query?: number): Cell[] =>
    nums2.map((value, i) => {
      let state: CellState | undefined;
      if (i === query) state = 'active';
      else if (value === popped) state = 'found';
      else if (i === cur) state = 'active';
      else if (stack.includes(value)) state = 'compare';
      else if (i < cur && next.has(value)) state = 'sorted';
      return { key: i, value, state };
    });
  const aux = (hl?: number) => [
    { title: 'stack (waiting for a bigger number)', kind: 'stack' as const, items: stack.map(String), highlight: hl },
    { title: 'next greater (value → answer)', kind: 'map' as const, items: [...next].map(([k, v]) => `${k} → ${v}`) },
    { title: `answer for nums1 = [${nums1.join(', ')}]`, kind: 'list' as const, items: ans.map(String) },
  ];
  const vars = (i: number | string) => ({ i, 'stack size': stack.length, 'map size': next.size });
  const ptr = (i: number) => [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }];

  steps.push({
    title: 'Start', desc: 'Step 1: for every number in nums2 find its next greater element. Step 2: look up the numbers of nums1.',
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'A monotonic stack finds all next-greater answers in one pass; a map remembers them so nums1 can be answered by lookup.', logicTone: 'info',
    javaLines: [0, 1, 2], pyLines: [0, 1], algoStep: 0,
  });

  for (let i = 0; i < n; i++) {
    const x = nums2[i];
    steps.push({
      title: `Read ${x}`, desc: stack.length && stack[stack.length - 1] < x ? `${x} is greater than the top (${stack[stack.length - 1]}), so the top has found its answer.` : `${x} is not greater than the top (or the stack is empty).`,
      cells: cells(i), pointers: ptr(i), aux: aux(), vars: vars(i),
      logic: 'Compare the new number with the number on top of the stack.', logicTone: 'info', javaLines: [3, 4], pyLines: [2, 3], algoStep: 1,
    });
    while (stack.length && stack[stack.length - 1] < x) {
      const y = stack.pop()!;
      next.set(y, x);
      steps.push({
        title: `Next greater of ${y} is ${x}`, desc: `Pop ${y} and record ${y} → ${x}.`,
        cells: cells(i, y), pointers: ptr(i), aux: aux(), vars: vars(i),
        logic: 'The first bigger number to the right of y is the one that pops it.', logicTone: 'success', javaLines: [5], pyLines: [4], algoStep: 2,
      });
    }
    stack.push(x);
    steps.push({
      title: `Push ${x}`, desc: `${x} now waits for something bigger.`,
      cells: cells(i), pointers: ptr(i), aux: aux(stack.length - 1), vars: vars(i),
      logic: 'The stack stays in decreasing order from bottom to top.', logicTone: 'info', javaLines: [6], pyLines: [5], algoStep: 1,
    });
  }

  steps.push({
    title: 'nums2 scanned', desc: `Numbers still on the stack (${stack.length ? stack.join(', ') : 'none'}) never see a bigger number, so they have no entry in the map (answer −1).`,
    cells: cells(n), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'Now answer nums1 by looking each number up.', logicTone: 'warn', javaLines: [7, 8], pyLines: [6], algoStep: 3,
  });

  nums1.forEach((v) => {
    const a = next.get(v) ?? -1;
    ans.push(a);
    steps.push({
      title: `Look up ${v} → ${a}`, desc: a === -1 ? `${v} is not in the map, so its answer is −1.` : `The map says the next greater element of ${v} is ${a}.`,
      cells: cells(n, undefined, nums2.indexOf(v)), pointers: [], aux: aux(), vars: vars('—'),
      logic: 'A hash lookup replaces a rescan of nums2.', logicTone: a === -1 ? 'warn' : 'success', javaLines: [9, 10], pyLines: [6], algoStep: 3,
    });
  });

  const text = JSON.stringify(ans);
  steps.push({
    title: 'Done', desc: 'Every number of nums1 has its answer.', cells: cells(n), pointers: [], aux: aux(), vars: vars('—'),
    logic: `Result: ${text}`, logicTone: 'success', javaLines: [11], pyLines: [6], algoStep: 3, result: { title: text, text: 'Next greater element for each number of nums1' },
  });
  return steps;
}

/** Pattern-page extras: narration prefix, values on the code line, phase index (Init / Check / Pop + record / Push / Look up / Done). */
function annotated(input: In): Step[] {
  return annotate(build(input), (s, i, all) => {
    const stack = auxItems(s, 'stack');
    const top = stack.length ? stack[stack.length - 1] : 'none';
    const read = /^Read (-?\d+)/.exec(s.title);
    if (i === 0) return { tag: 'INIT —', note: 'stack = [], next = {}' };
    if (read) return { tag: 'CHECK —', note: `x = ${read[1]}, top = ${top} → ${s.desc.includes('so the top') ? 'pop' : 'no pop'}` };
    const pop = /^Next greater of (-?\d+) is (-?\d+)/.exec(s.title);
    if (pop) return { tag: 'POP + RECORD —', note: `next.put(${pop[1]}, ${pop[2]})` };
    const push = /^Push (-?\d+)/.exec(s.title);
    if (push) return { tag: 'PUSH —', note: `stack.push(${push[1]}) → size ${stack.length}`, algoStep: 3 };
    if (s.title === 'nums2 scanned') return { tag: 'SCANNED —', note: `leftovers [${stack.join(', ')}] → default −1`, algoStep: 4 };
    const look = /^Look up (-?\d+) → (-?\d+)/.exec(s.title);
    if (look) return { tag: 'LOOKUP —', note: `ans = next.getOrDefault(${look[1]}, -1) = ${look[2]}`, algoStep: 4 };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `return ans → ${s.result?.title ?? ''}`, desc: `Answers for nums1: ${s.result?.title ?? ''}.`, algoStep: 5 };
  });
}

export const nextGreaterElementI: ProblemDef<In> = {
  slug: '496-next-greater-element-i',
  id: '496', title: 'Next Greater Element I', difficulty: 'Easy', category: 'Stack', tag: 'monotonic stack',
  statement: 'nums1 is a subset of nums2 (all values distinct). For each x in nums1, find x in nums2 and return the first greater number to its right in nums2, or −1 if none exists.',
  constraints: '1 ≤ nums1.length ≤ nums2.length ≤ 1000 (animation input is limited to 10 numbers in nums2); all values unique',
  examples: [
    { label: '4 1 2 | 1 3 4 2', input: { nums1: [4, 1, 2], nums2: [1, 3, 4, 2] }, output: '[-1,3,-1]' },
    { label: '2 4 | 1 2 3 4', input: { nums1: [2, 4], nums2: [1, 2, 3, 4] }, output: '[3,-1]' },
    { label: '5 3 | 7 5 6 3 8', input: { nums1: [5, 3], nums2: [7, 5, 6, 3, 8] }, output: '[6,8]' },
  ],
  inputPlaceholder: 'nums1 | nums2, e.g. 4 1 2 | 1 3 4 2',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Current / looked-up value', state: 'active' }, { label: 'Waiting on stack', state: 'compare' }, { label: 'Just resolved', state: 'found' }, { label: 'Has an answer', state: 'sorted' }],
  varLabels: ['i', 'stack size', 'map size'],
  emphasis: ['next greater number', 'first greater number', '−1'],
  phases: [
    { icon: '🚀', label: 'Init stack + map', tone: 'blue' },
    { icon: '🔍', label: 'Check x vs top', tone: 'cyan' },
    { icon: '⬆️', label: 'Pop + record', tone: 'gold' },
    { icon: '📥', label: 'Push x', tone: 'green' },
    { icon: '🔎', label: 'Look up nums1', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Monotonic stack + map',
    text: 'Scan nums2 once with a stack of numbers still waiting for a greater one. Whenever the current number exceeds the top, pop the top and record "top → current". Then answer every query of nums1 with a map lookup.',
  },
  java: [
    'public int[] nextGreaterElement(int[] nums1, int[] nums2) {',
    '    Map<Integer, Integer> next = new HashMap<>();',
    '    Deque<Integer> stack = new ArrayDeque<>();',
    '    for (int x : nums2) {',
    '        while (!stack.isEmpty() && stack.peek() < x)',
    '            next.put(stack.pop(), x);',
    '        stack.push(x);',
    '    }',
    '    int[] ans = new int[nums1.length];',
    '    for (int i = 0; i < nums1.length; i++)',
    '        ans[i] = next.getOrDefault(nums1[i], -1);',
    '    return ans;',
    '}',
  ],
  python: [
    'def next_greater_element(nums1, nums2):',
    '    nxt, stack = {}, []',
    '    for x in nums2:',
    '        while stack and stack[-1] < x:',
    '            nxt[stack.pop()] = x',
    '        stack.append(x)',
    '    return [nxt.get(v, -1) for v in nums1]',
  ],
  algorithm: [
    'Keep a stack of nums2 values that are still waiting for a greater value',
    'For each x in nums2, compare with the top of the stack',
    'While the top is smaller than x, pop it and record top → x',
    'Push x and move to the next number',
    'Answer each nums1 value from the map, defaulting to −1',
    'Return the answers',
  ],
  complexity: [{ label: 'Time', value: 'O(n + m)' }, { label: 'Space', value: 'O(n)' }],
  why: 'The stack is always decreasing from bottom to top, so the first number that is larger than the top is also the first larger number to the right of every popped value, which makes each recorded answer the nearest one. Every value is pushed and popped at most once, so the scan is linear.',
};
