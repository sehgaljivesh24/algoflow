import type { Cell, CellState, ProblemDef, Step } from '../engine/types';

interface In { temps: number[] }

function parse(raw: string): In {
  const temps = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!temps.length || temps.some((n) => !Number.isInteger(n))) throw new Error('Enter whole numbers, e.g. 73 74 75 71 69 72 76 73');
  if (temps.length > 12) throw new Error('Use 12 numbers or fewer');
  return { temps };
}

function build({ temps }: In): Step[] {
  const n = temps.length;
  const ans: (number | null)[] = Array(n).fill(null);
  const stack: number[] = [];
  const steps: Step[] = [];
  let resolved = 0;

  const cells = (cur: number, popped?: number): Cell[] =>
    temps.map((value, i) => {
      let state: CellState | undefined;
      if (i === popped) state = 'found';
      else if (i === cur) state = 'active';
      else if (stack.includes(i)) state = 'compare';
      else if (ans[i] !== null) state = 'sorted';
      return { key: i, value, state };
    });
  const aux = (hl?: number, cmp?: string[]) => [
    { title: 'stack (day:temp, waiting for a warmer day)', kind: 'stack' as const, items: stack.map((i) => `${i}:${temps[i]}`), highlight: hl },
    ...(cmp ? [{ title: 'compare: today vs the day on top', kind: 'list' as const, items: cmp }] : []),
    { title: 'answer[] (days to wait; ? = still waiting)', kind: 'list' as const, items: ans.map((a) => (a === null ? '?' : String(a))) },
  ];
  const vars = (i: number | string) => ({ i, 'temp[i]': i === '—' ? '—' : temps[i as number], 'stack size': stack.length, resolved });
  const ptr = (i: number) => [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }];

  steps.push({
    title: 'Start', tag: 'INIT —', desc: 'For every day we want the wait until a warmer one. The stack holds days still waiting; their temperatures never rise from bottom to top.',
    note: 'stack = [], answer = all unknown',
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'The stack holds days that are still waiting for a warmer temperature. Their temperatures never increase from bottom to top (a monotonic stack).', logicTone: 'info',
    javaLines: [0, 1, 2], pyLines: [0, 1, 2], algoStep: 0,
  });

  for (let i = 0; i < n; i++) {
    const top = stack.length ? stack[stack.length - 1] : -1;
    const warmer = top >= 0 && temps[i] > temps[top];
    steps.push({
      title: `Day ${i}: ${temps[i]}°`, tag: 'CHECK —',
      desc: top < 0
        ? `Day ${i} is ${temps[i]}° and the stack is empty, so nobody is waiting on it. Nothing to pop.`
        : warmer
          ? `${temps[i]}° > ${temps[top]}° (day ${top} on top): day ${top} has found its warmer day.`
          : `${temps[i]}° ≤ ${temps[top]}° (day ${top} on top): not warmer, so no day is resolved.`,
      note: top < 0 ? `stack empty → push day ${i}` : `t[${i}] = ${temps[i]} ${warmer ? '>' : '≤'} t[${top}] = ${temps[top]} → ${warmer ? 'pop' : 'stop popping'}`,
      cells: cells(i), pointers: ptr(i), aux: aux(undefined, top < 0 ? [`${temps[i]}`, 'stack empty'] : [`${temps[i]}`, warmer ? '>' : '≤', `${temps[top]}`, warmer ? '→ pop' : '→ keep']), vars: vars(i),
      logic: 'Compare today with the most recent unresolved day.', logicTone: 'info', javaLines: [3, 4], pyLines: [3, 4], algoStep: 1,
    });
    while (stack.length && temps[i] > temps[stack[stack.length - 1]]) {
      const j = stack.pop()!;
      ans[j] = i - j;
      resolved++;
      const nextTop = stack.length ? stack[stack.length - 1] : -1;
      steps.push({
        title: `Day ${j} resolved: wait ${i - j}`, tag: 'POP + ANSWER —',
        desc: `${temps[i]}° > ${temps[j]}°, so day ${j} waits ${i} − ${j} = ${i - j} day${i - j === 1 ? '' : 's'}: answer[${j}] = ${i - j}. ${nextTop >= 0 ? `Next on top: day ${nextTop} (${temps[nextTop]}°).` : 'The stack is empty now.'}`,
        note: `ans[${j}] = ${i} − ${j} = ${i - j}`,
        cells: cells(i, j), pointers: ptr(i), aux: aux(undefined, [`${temps[i]}`, '>', `${temps[j]}`, `→ ans[${j}] = ${i - j}`]), vars: vars(i),
        logic: 'Pop it and record the distance. Keep popping while today is still warmer.', logicTone: 'success', javaLines: [5, 6], pyLines: [5, 6], algoStep: 2,
      });
    }
    stack.push(i);
    steps.push({
      title: `Push day ${i}`, tag: 'PUSH —',
      desc: `Day ${i} (${temps[i]}°) now waits for something warmer. Stack, bottom to top: ${stack.map((k) => `${k}:${temps[k]}`).join(', ')}.`,
      note: `stack.push(${i}) → size ${stack.length}`,
      cells: cells(i), pointers: ptr(i), aux: aux(stack.length - 1), vars: vars(i),
      logic: 'Everything below it on the stack is at least as warm.', logicTone: 'info', javaLines: [8], pyLines: [7], algoStep: 3,
    });
  }

  const out = ans.map((a) => a ?? 0);
  steps.push({
    title: 'Done', tag: '✅ Done!',
    desc: `${stack.length ? `Day${stack.length > 1 ? 's' : ''} ${stack.join(', ')} never saw a warmer day, so ${stack.length > 1 ? 'their answers stay' : 'its answer stays'} 0. ` : ''}Result: [${out.join(', ')}].`,
    note: `return ans → [${out.join(', ')}]`,
    cells: cells(-1), pointers: [], aux: [{ title: 'stack (never resolved)', kind: 'stack', items: stack.map((i) => `${i}:${temps[i]}`) }, { title: 'answer[] (days to wait)', kind: 'list', items: out.map(String) }], vars: vars('—'),
    logic: `Result: [${out.join(', ')}]`, logicTone: 'success', javaLines: [10], pyLines: [8],
    algoStep: 4, result: { title: `[${out.join(', ')}]`, text: 'Days until a warmer temperature' },
  });
  return steps;
}

export const dailyTemperatures: ProblemDef<In> = {
  slug: '739-daily-temperatures',
  id: '739', title: 'Daily Temperatures', difficulty: 'Medium', category: 'Stack', tag: 'monotonic stack',
  statement: 'Given daily temperatures, return an array where answer[i] is the number of days you must wait after day i to get a warmer temperature, or 0 if that never happens.',
  emphasis: ['warmer temperature', 'number of days you must wait', 'answer[i]'],
  constraints: '1 ≤ n ≤ 10⁵ (animation input is limited to 12 numbers)',
  examples: [
    { label: '30 60 90 50 40 70 100 80', input: { temps: [30, 60, 90, 50, 40, 70, 100, 80] }, output: '[1,1,4,2,1,1,0,0]' },
    { label: '73 74 75 71 69 72 76 73', input: { temps: [73, 74, 75, 71, 69, 72, 76, 73] }, output: '[1,1,4,2,1,1,0,0]' },
    { label: '30 40 50 60', input: { temps: [30, 40, 50, 60] }, output: '[1,1,1,0]' },
    { label: '60 50 40', input: { temps: [60, 50, 40] }, output: '[0,0,0]' },
  ],
  inputPlaceholder: 'e.g. 73 74 75 71 69 72 76 73',
  parseInput: parse, buildSteps: build, viz: 'bars',
  legend: [{ label: 'Today', state: 'active' }, { label: 'Waiting on stack', state: 'compare' }, { label: 'Just resolved', state: 'found' }, { label: 'Resolved', state: 'sorted' }],
  varLabels: ['i', 'temp[i]', 'stack size', 'resolved'],
  phases: [
    { icon: '🚀', label: 'Init stack', tone: 'blue' },
    { icon: '🔍', label: 'Check today vs top', tone: 'cyan' },
    { icon: '⬆️', label: 'Pop + answer', tone: 'gold' },
    { icon: '📥', label: 'Push today', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'A stack of days still waiting',
    text: 'Scan left to right. While today is warmer than the day on top of the stack, that day has found its answer: pop it. Then push today.',
  },
  java: [
    'public int[] dailyTemperatures(int[] t) {',
    '    int[] ans = new int[t.length];',
    '    Deque<Integer> stack = new ArrayDeque<>();',
    '    for (int i = 0; i < t.length; i++) {',
    '        while (!stack.isEmpty() && t[i] > t[stack.peek()]) {',
    '            int j = stack.pop();',
    '            ans[j] = i - j;',
    '        }',
    '        stack.push(i);',
    '    }',
    '    return ans;',
    '}',
  ],
  python: [
    'def daily_temperatures(t):',
    '    ans = [0] * len(t)',
    '    stack = []',
    '    for i, x in enumerate(t):',
    '        while stack and x > t[stack[-1]]:',
    '            j = stack.pop()',
    '            ans[j] = i - j',
    '        stack.append(i)',
    '    return ans',
  ],
  algorithm: [
    'Keep a stack of indexes whose answer is unknown',
    'For each day i, compare t[i] with the day on top',
    'While t[i] is warmer: pop j and set ans[j] = i − j',
    'Push i and move on',
    'Days left on the stack never see a warmer day: their answer stays 0',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Each index is pushed once and popped at most once, so the nested loop is O(n) in total. Because we pop as soon as a warmer day appears, the first warmer day is always the nearest one.',
};
