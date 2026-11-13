import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotate, auxItems } from './annotate.ts';

interface Op { op: 'push' | 'pop' | 'top' | 'getMin'; val?: number }
interface In { ops: Op[] }

function parse(raw: string): In {
  const parts = raw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) throw new Error('Enter operations separated by commas, e.g. push 5, push 3, getMin, pop, getMin');
  if (parts.length > 12) throw new Error('Use 12 operations or fewer');
  const ops: Op[] = [];
  let size = 0;
  for (const part of parts) {
    const [name, arg, ...extra] = part.split(/\s+/);
    const lower = name.toLowerCase();
    if (extra.length) throw new Error(`Too many words in "${part}"`);
    if (lower === 'push') {
      const v = Number(arg);
      if (arg === undefined || !Number.isInteger(v) || Math.abs(v) > 999) throw new Error('"push" needs a whole number between -999 and 999, e.g. push 5');
      ops.push({ op: 'push', val: v });
      size++;
    } else if (lower === 'pop' || lower === 'top' || lower === 'getmin') {
      if (arg !== undefined) throw new Error(`"${name}" takes no argument`);
      if (size === 0) throw new Error(`"${name}" is called on an empty stack. Push something first`);
      ops.push({ op: lower === 'getmin' ? 'getMin' : lower, val: undefined } as Op);
      if (lower === 'pop') size--;
    } else throw new Error(`Unknown operation "${name}". Use push x, pop, top or getMin`);
  }
  return { ops };
}

const label = (o: Op) => (o.op === 'push' ? `push ${o.val}` : o.op);

function build({ ops }: In): Step[] {
  const main: number[] = [];
  const mins: number[] = [];
  const out: (number | null)[] = [];
  const steps: Step[] = [];

  const cells = (cur: number): Cell[] =>
    ops.map((o, i) => {
      let state: CellState | undefined;
      if (i === cur) state = 'active';
      else if (i < cur) state = 'sorted';
      return { key: i, value: label(o), state };
    });
  const aux = (hl?: number) => [
    { title: 'main stack (values)', kind: 'stack' as const, items: main.map(String), highlight: hl },
    { title: 'min stack (smallest value at or below each level)', kind: 'stack' as const, items: mins.map(String), highlight: hl },
    { title: 'returned so far', kind: 'list' as const, items: out.map((v) => (v === null ? 'null' : String(v))) },
  ];
  const vars = (op: string) => ({ operation: op, size: main.length, 'current min': mins.length ? mins[mins.length - 1] : '—' });
  const ptr = (i: number) => [{ id: 'i', label: 'op', index: i, tone: 'blue' as const }];

  steps.push({
    title: 'Start', desc: 'Replay the operations on a stack that can also report its minimum instantly.',
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'A second stack keeps, for every level of the main stack, the smallest value at or below that level. Its top is always the current minimum.', logicTone: 'info',
    javaLines: [0, 1, 2], pyLines: [0, 1, 2], algoStep: 0,
  });

  ops.forEach((o, i) => {
    if (o.op === 'push') {
      const v = o.val!;
      const m = mins.length ? Math.min(v, mins[mins.length - 1]) : v;
      main.push(v);
      mins.push(m);
      out.push(null);
      steps.push({
        title: `push ${v}`, desc: `Push ${v} on the main stack. The min stack receives min(${v}, ${mins.length > 1 ? mins[mins.length - 2] : 'nothing below'}) = ${m}.`,
        cells: cells(i), pointers: ptr(i), aux: aux(main.length - 1), vars: vars(label(o)),
        logic: 'Both stacks grow together, so they always have the same height.', logicTone: 'info', javaLines: [4, 5, 6], pyLines: [4, 5], algoStep: 1,
      });
    } else if (o.op === 'pop') {
      const v = main.pop()!;
      mins.pop();
      out.push(null);
      steps.push({
        title: `pop (removes ${v})`, desc: `Remove ${v} from both stacks. The minimum rolls back to ${mins.length ? mins[mins.length - 1] : 'nothing (empty)'}.`,
        cells: cells(i), pointers: ptr(i), aux: aux(), vars: vars(label(o)),
        logic: 'Popping the min stack too restores the previous minimum for free — no rescan needed.', logicTone: 'warn', javaLines: [8, 9], pyLines: [7, 8], algoStep: 2,
      });
    } else if (o.op === 'top') {
      const v = main[main.length - 1];
      out.push(v);
      steps.push({
        title: `top → ${v}`, desc: `Read the top of the main stack: ${v}.`,
        cells: cells(i), pointers: ptr(i), aux: aux(main.length - 1), vars: vars(label(o)),
        logic: 'top() only peeks at the main stack.', logicTone: 'info', javaLines: [11], pyLines: [10], algoStep: 2,
      });
    } else {
      const v = mins[mins.length - 1];
      out.push(v);
      steps.push({
        title: `getMin → ${v}`, desc: `Read the top of the min stack: ${v}. It is the minimum of everything currently stored.`,
        cells: cells(i), pointers: ptr(i), aux: aux(mins.length - 1), vars: vars(label(o)),
        logic: 'O(1): the answer is already waiting on top of the min stack.', logicTone: 'success', javaLines: [13], pyLines: [12], algoStep: 3,
      });
    }
  });

  const text = JSON.stringify(out);
  steps.push({
    title: 'Done', desc: 'All operations were applied. pop and push return nothing (null).',
    cells: cells(ops.length), pointers: [], aux: aux(), vars: vars('—'),
    logic: `Outputs: ${text}`, logicTone: 'success', javaLines: [14], pyLines: [12], algoStep: 3, result: { title: text, text: 'Return value of each operation' },
  });
  return steps;
}

function annotated(input: In): Step[] {
  return annotate(build(input), (s, i, all) => {
    const main = auxItems(s, 'main stack');
    const mins = auxItems(s, 'min stack');
    if (i === 0) return { tag: 'INIT —', note: 'main = [], mins = []' };
    const push = /^push (-?\d+)/.exec(s.title);
    if (push) return { tag: 'PUSH BOTH —', note: `main.push(${push[1]}); mins.push(${mins[mins.length - 1]}) → main [${main.join(', ')}] mins [${mins.join(', ')}]` };
    const pop = /^pop \(removes (-?\d+)\)/.exec(s.title);
    if (pop) return { tag: 'POP BOTH —', note: `main.pop() = ${pop[1]}; mins.pop() → min is ${mins.length ? mins[mins.length - 1] : 'none'}` };
    const top = /^top → (-?\d+)/.exec(s.title);
    if (top) return { tag: 'TOP —', note: `main.peek() = ${top[1]}` };
    const gm = /^getMin → (-?\d+)/.exec(s.title);
    if (gm) return { tag: 'GET MIN —', note: `mins.peek() = ${gm[1]}`, algoStep: 3 };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `outputs ${s.result?.title}`, desc: `All operations ran in O(1) each. Returned values: ${s.result?.title}.`, algoStep: 4 };
  });
}

export const minStack: ProblemDef<In> = {
  slug: '155-min-stack',
  id: '155', title: 'Min Stack', difficulty: 'Medium', category: 'Stack', tag: 'design',
  statement: 'Design a stack that supports push, pop, top and retrieving the minimum element, all in constant time.',
  constraints: 'pop, top and getMin are only called on a non-empty stack; −2³¹ ≤ val ≤ 2³¹ − 1 (animation input: at most 12 operations)',
  examples: [
    { label: 'push 5, push 3, getMin, pop, getMin', input: { ops: [{ op: 'push', val: 5 }, { op: 'push', val: 3 }, { op: 'getMin' }, { op: 'pop' }, { op: 'getMin' }] }, output: '[null,null,3,null,5]' },
    { label: 'push 2, push 0, push 3, push 0, getMin, pop, getMin, pop, getMin, top', input: { ops: [{ op: 'push', val: 2 }, { op: 'push', val: 0 }, { op: 'push', val: 3 }, { op: 'push', val: 0 }, { op: 'getMin' }, { op: 'pop' }, { op: 'getMin' }, { op: 'pop' }, { op: 'getMin' }, { op: 'top' }] }, output: '[null,null,null,null,0,null,0,null,0,0]' },
    { label: 'push 4, push 7, top, getMin', input: { ops: [{ op: 'push', val: 4 }, { op: 'push', val: 7 }, { op: 'top' }, { op: 'getMin' }] }, output: '[null,null,7,4]' },
  ],
  inputPlaceholder: 'operations, e.g. push 5, push 3, getMin, pop, getMin',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Operation being run', state: 'active' }, { label: 'Operation done', state: 'sorted' }],
  varLabels: ['operation', 'size', 'current min'],
  emphasis: ['push', 'pop', 'top', 'minimum element', 'constant time'],
  phases: [
    { icon: '🚀', label: 'Init two stacks', tone: 'blue' },
    { icon: '📥', label: 'push: both stacks', tone: 'cyan' },
    { icon: '⬆️', label: 'pop / top', tone: 'orange' },
    { icon: '🔎', label: 'getMin: peek mins', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'A second stack that tracks the minimum',
    text: 'Keep two stacks of equal height. The main stack holds the values. The min stack holds, at each level, the smallest value at or below that level. Push and pop both stacks together; getMin just peeks at the min stack.',
  },
  java: [
    'class MinStack {',
    '    Deque<Integer> main = new ArrayDeque<>();',
    '    Deque<Integer> mins = new ArrayDeque<>();',
    '',
    '    public void push(int val) {',
    '        main.push(val);',
    '        mins.push(mins.isEmpty() ? val : Math.min(val, mins.peek()));',
    '    }',
    '    public void pop() {',
    '        main.pop(); mins.pop();',
    '    }',
    '    public int top() { return main.peek(); }',
    '',
    '    public int getMin() { return mins.peek(); }',
    '}',
  ],
  python: [
    'class MinStack:',
    '    def __init__(self):',
    '        self.main, self.mins = [], []',
    '',
    '    def push(self, val):',
    '        self.main.append(val); self.mins.append(min(val, self.mins[-1]) if self.mins else val)',
    '',
    '    def pop(self):',
    '        self.main.pop(); self.mins.pop()',
    '',
    '    def top(self): return self.main[-1]',
    '',
    '    def get_min(self): return self.mins[-1]',
  ],
  algorithm: [
    'Create a main stack and a parallel min stack',
    'push(v): push v on main and min(v, current min) on the min stack',
    'pop(): pop both stacks; top(): peek the main stack',
    'getMin(): peek the min stack',
    'Every operation took O(1)',
  ],
  complexity: [{ label: 'Time', value: 'O(1) per operation' }, { label: 'Space', value: 'O(n) for the extra stack' }],
  why: 'Invariant: after every operation the min stack has the same height as the main stack and its entry at level k is the minimum of main[0..k]. A push extends the invariant using only the previous minimum, and a pop simply discards the top level, leaving all the lower levels (and their minima) untouched.',
};
