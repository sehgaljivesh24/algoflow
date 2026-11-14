import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotate, auxItems } from './annotate.ts';

interface In { tokens: string[] }

const OPS = ['+', '-', '*', '/'];
/** Java line (0-based) of the `case` that handles each operator. */
const CASE_LINE: Record<string, number> = { '+': 4, '*': 5, '-': 6, '/': 7 };
const apply = (op: string, a: number, b: number): number => {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '*') return a * b;
  return Math.trunc(a / b);
};

function parse(raw: string): In {
  const tokens = raw.split(/[\s,]+/).filter(Boolean);
  if (!tokens.length) throw new Error('Enter tokens separated by spaces, e.g. 2 1 + 3 *');
  if (tokens.length > 13) throw new Error('Use 13 tokens or fewer');
  const st: number[] = [];
  for (const t of tokens) {
    if (OPS.includes(t)) {
      if (st.length < 2) throw new Error(`Operator "${t}" needs two numbers before it`);
      const b = st.pop()!;
      const a = st.pop()!;
      if (t === '/' && b === 0) throw new Error('Division by zero');
      const v = apply(t, a, b);
      if (Math.abs(v) > 2147483647) throw new Error('A value exceeds the 32-bit integer range');
      st.push(v);
    } else {
      if (!/^-?\d{1,2}$/.test(t)) throw new Error(`"${t}" is not an operator (+ - * /) or a whole number of at most 2 digits`);
      st.push(Number(t));
    }
  }
  if (st.length !== 1) throw new Error('This is not a complete expression: too many numbers for the operators');
  return { tokens };
}

function build({ tokens }: In): Step[] {
  const stack: number[] = [];
  const steps: Step[] = [];
  const cells = (cur: number): Cell[] =>
    tokens.map((value, i) => {
      let state: CellState | undefined;
      if (i === cur) state = 'active';
      else if (i < cur) state = 'sorted';
      return { key: i, value, state };
    });
  const aux = (hl?: number) => [{ title: 'operand stack', kind: 'stack' as const, items: stack.map(String), highlight: hl }];
  const ptr = (i: number) => [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }];
  const vars = (i: number | string) => ({ i, 'stack size': stack.length, top: stack.length ? stack[stack.length - 1] : '—' });

  steps.push({
    title: 'Start', desc: 'Reverse Polish notation writes the operator after its two operands. Read left to right with a stack.',
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'When an operator arrives, the two most recent numbers are exactly its operands, and a stack hands them back in that order.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  tokens.forEach((t, i) => {
    if (!OPS.includes(t)) {
      stack.push(Number(t));
      steps.push({
        title: `Push ${t}`, desc: `${t} is a number, so push it.`,
        cells: cells(i), pointers: ptr(i), aux: aux(stack.length - 1), vars: vars(i),
        logic: 'Numbers wait on the stack until an operator needs them.', logicTone: 'info', javaLines: [8], pyLines: [9, 10], algoStep: 1,
      });
      return;
    }
    const b = stack.pop()!;
    const a = stack.pop()!;
    steps.push({
      title: `Operator ${t}: pop ${b} and ${a}`, desc: `Pop b = ${b} (top) first, then a = ${a}. The result is a ${t} b.`,
      cells: cells(i), pointers: ptr(i), aux: aux(), vars: vars(i),
      logic: 'The first pop is the right operand b; it matters for − and ÷.', logicTone: 'warn', javaLines: [CASE_LINE[t]], pyLines: [2, 3, 4], algoStep: 2,
    });
    const v = apply(t, a, b);
    stack.push(v);
    steps.push({
      title: `${a} ${t} ${b} = ${v}`, desc: t === '/' ? `Integer division truncates toward zero: ${a} / ${b} = ${v}. Push ${v}.` : `Push the result ${v} back.`,
      cells: cells(i), pointers: ptr(i), aux: aux(stack.length - 1), vars: vars(i),
      logic: 'The result is a single number again, ready for the next operator.', logicTone: 'success', javaLines: [CASE_LINE[t]], pyLines: [5, 6, 7, 8], algoStep: 3,
    });
  });

  steps.push({
    title: 'Done', desc: 'The input is used up and one number remains: the value of the expression.',
    cells: cells(tokens.length), pointers: [], aux: aux(), vars: vars('—'),
    logic: `Result: ${stack[0]}`, logicTone: 'success', javaLines: [11], pyLines: [11], algoStep: 3, result: { title: String(stack[0]), text: 'Value of the expression' },
  });
  return steps;
}

function annotated(input: In): Step[] {
  return annotate(build(input), (s, i, all) => {
    const st = auxItems(s, 'operand stack');
    if (i === 0) return { tag: 'INIT —', note: 'st = []' };
    const push = /^Push (-?\d+)/.exec(s.title);
    if (push) return { tag: 'PUSH —', note: `st.push(${push[1]}) → [${st.join(', ')}]` };
    const pop = /^Operator (\S+): pop (-?\d+) and (-?\d+)/.exec(s.title);
    if (pop) return { tag: 'POP 2 —', note: `b = ${pop[2]}, a = ${pop[3]}`, desc: `Operator '${pop[1]}': pop b = ${pop[2]} (the top) first, then a = ${pop[3]}. The value is a ${pop[1]} b.` };
    const calc = /^(-?\d+) (\S+) (-?\d+) = (-?\d+)$/.exec(s.title);
    if (calc) return { tag: 'APPLY —', note: `${calc[1]} ${calc[2]} ${calc[3]} = ${calc[4]} → push, stack [${st.join(', ')}]`, desc: `${calc[1]} ${calc[2]} ${calc[3]} = ${calc[4]}${calc[2] === '/' ? ' (division truncates toward zero)' : ''}. Push ${calc[4]} back; stack [${st.join(', ')}].` };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `return st.pop() → ${s.result?.title}`, desc: `All tokens used and one number is left: the expression equals ${s.result?.title}.`, algoStep: 4 };
  });
}

export const evaluateRPN: ProblemDef<In> = {
  slug: '150-evaluate-reverse-polish-notation',
  id: '150', title: 'Evaluate Reverse Polish Notation', difficulty: 'Medium', category: 'Stack', tag: 'stack',
  statement: 'Evaluate an arithmetic expression given in Reverse Polish Notation. Valid operators are + − * /. Division truncates toward zero, and the expression is always valid.',
  constraints: '1 ≤ tokens ≤ 10⁴ (animation input is limited to 13 tokens); numbers fit in 32-bit signed integers',
  examples: [
    { label: '2 1 + 3 *', input: { tokens: ['2', '1', '+', '3', '*'] }, output: '9' },
    { label: '4 13 5 / +', input: { tokens: ['4', '13', '5', '/', '+'] }, output: '6' },
    { label: '10 6 9 3 + -11 * / * 17 + 5 +', input: { tokens: ['10', '6', '9', '3', '+', '-11', '*', '/', '*', '17', '+', '5', '+'] }, output: '22' },
  ],
  inputPlaceholder: 'tokens separated by spaces, e.g. 2 1 + 3 *',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Current token', state: 'active' }, { label: 'Already processed', state: 'sorted' }],
  varLabels: ['i', 'stack size', 'top'],
  emphasis: ['Reverse Polish Notation', 'operators', 'truncates toward zero'],
  phases: [
    { icon: '🚀', label: 'Init stack', tone: 'blue' },
    { icon: '📥', label: 'Push number', tone: 'cyan' },
    { icon: '⬆️', label: 'Pop b, a', tone: 'orange' },
    { icon: '🧮', label: 'Apply + push result', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Push numbers, apply operators to the top two',
    text: 'Scan the tokens left to right. Push every number. On an operator, pop the right operand then the left operand, apply the operator, and push the result. At the end the stack holds the single answer.',
  },
  java: [
    'public int evalRPN(String[] tokens) {',
    '    Deque<Integer> st = new ArrayDeque<>();',
    '    for (String t : tokens) {',
    '        switch (t) {',
    '            case "+": st.push(st.pop() + st.pop()); break;',
    '            case "*": st.push(st.pop() * st.pop()); break;',
    '            case "-": { int b = st.pop(), a = st.pop(); st.push(a - b); break; }',
    '            case "/": { int b = st.pop(), a = st.pop(); st.push(a / b); break; }',
    '            default: st.push(Integer.parseInt(t));',
    '        }',
    '    }',
    '    return st.pop();',
    '}',
  ],
  python: [
    'def eval_rpn(tokens):',
    '    st = []',
    '    for t in tokens:',
    '        if t in "+-*/":',
    '            b, a = st.pop(), st.pop()',
    '            if t == "+": st.append(a + b)',
    '            elif t == "-": st.append(a - b)',
    '            elif t == "*": st.append(a * b)',
    '            else: st.append(int(a / b))',
    '        else:',
    '            st.append(int(t))',
    '    return st[0]',
  ],
  algorithm: [
    'Create an empty stack of numbers',
    'Push each number token',
    'On an operator pop b (top) then a, compute a op b',
    'Push the result and continue with the next token',
    'After the last token the single number on the stack is the answer',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'In postfix form every operator is preceded by exactly the two sub-expressions it combines, and each sub-expression has already been collapsed into one number on the stack. The most recent value is therefore the right operand and the one below it the left operand. Each token is pushed or popped a constant number of times.',
};
