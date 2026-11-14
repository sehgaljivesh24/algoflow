import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotate, auxItems } from './annotate.ts';

interface In { expr: string }

function parse(raw: string): In {
  const expr = raw.replace(/\s+/g, '');
  if (!expr) throw new Error('Enter an expression, e.g. 1 + (4 - (2 - 3))');
  if (/[^0-9+\-()]/.test(expr)) throw new Error('Use only digits, + - ( ) and spaces');
  if (expr.length > 16) throw new Error('Use 16 characters or fewer (spaces do not count)');
  let prev: 'start' | 'num' | 'op' | 'open' | 'close' = 'start';
  let depth = 0;
  let run = 0;
  for (const ch of expr) {
    if (/\d/.test(ch)) {
      if (prev === 'close') throw new Error('A number cannot directly follow ")". Put an operator in between');
      run = prev === 'num' ? run + 1 : 1;
      if (run > 3) throw new Error('Numbers may have at most 3 digits');
      prev = 'num';
    } else if (ch === '+') {
      if (prev !== 'num' && prev !== 'close') throw new Error('"+" must follow a number or ")" (unary plus is not supported)');
      prev = 'op';
    } else if (ch === '-') {
      if (prev === 'op') throw new Error('Two operators in a row');
      prev = 'op'; // after start or "(" this is a unary minus, which the algorithm also handles
    } else if (ch === '(') {
      if (prev === 'num' || prev === 'close') throw new Error('Put an operator before "("');
      depth++;
      prev = 'open';
    } else {
      if (depth === 0) throw new Error('Unbalanced ")"');
      if (prev !== 'num' && prev !== 'close') throw new Error('")" must follow a number or ")"');
      depth--;
      prev = 'close';
    }
  }
  if (depth !== 0) throw new Error('Unbalanced "("');
  if (prev !== 'num' && prev !== 'close') throw new Error('The expression cannot end with an operator or "("');
  return { expr };
}

function build({ expr }: In): Step[] {
  const chars = [...expr];
  const stack: string[] = [];
  const saved: number[] = [];
  let result = 0;
  let num = 0;
  let sign = 1;
  const steps: Step[] = [];
  const sg = (s: number) => (s > 0 ? '+' : '−');

  const cells = (cur: number): Cell[] =>
    chars.map((value, i) => {
      let state: CellState | undefined;
      if (i === cur) state = 'active';
      else if (i < cur) state = 'sorted';
      return { key: i, value, state };
    });
  const aux = (hl?: number) => [{ title: 'stack (saved result, sign before each "(")', kind: 'stack' as const, items: [...stack], highlight: hl }];
  const vars = () => ({ result, sign: sg(sign), num, 'stack size': stack.length });
  const ptr = (i: number) => [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }];

  steps.push({
    title: 'Start', desc: 'Evaluate +, − and brackets without building a tree: keep a running result, the sign of the next number, and a stack for brackets.',
    cells: cells(-1), pointers: [], aux: aux(), vars: vars(),
    logic: 'A bracket just says "compute this part, then add or subtract it". So at "(" we save the outer state on a stack and start fresh.', logicTone: 'info',
    javaLines: [1, 2], pyLines: [1], algoStep: 0,
  });

  chars.forEach((ch, i) => {
    if (/\d/.test(ch)) {
      num = num * 10 + Number(ch);
      steps.push({
        title: `Digit ${ch}: num = ${num}`, desc: `Append the digit to the number being read: num = ${num}.`,
        cells: cells(i), pointers: ptr(i), aux: aux(), vars: vars(),
        logic: 'Digits are accumulated until an operator or bracket ends the number.', logicTone: 'info', javaLines: [4, 5], pyLines: [3, 4], algoStep: 1,
      });
    } else if (ch === '+' || ch === '-') {
      const before = result;
      result += sign * num;
      const used = num;
      const oldSign = sign;
      num = 0;
      sign = ch === '+' ? 1 : -1;
      steps.push({
        title: `Operator ${ch}`, desc: `Flush the finished number: result = ${before} ${oldSign > 0 ? '+' : '−'} ${used} = ${result}. The next number gets sign ${sg(sign)}.`,
        cells: cells(i), pointers: ptr(i), aux: aux(), vars: vars(),
        logic: 'Add the number just read (with the sign that preceded it) to the result, then remember the new sign.', logicTone: 'warn', javaLines: [6, 7, 8], pyLines: [5, 6, 7], algoStep: 2,
      });
    } else if (ch === '(') {
      stack.push(`result ${result}`, `sign ${sg(sign)}`);
      saved.push(result, sign);
      const keepRes = result;
      const keepSign = sign;
      result = 0;
      sign = 1;
      steps.push({
        title: 'Open bracket: save and reset', desc: `Push the outer result (${keepRes}) and the sign in front of the bracket (${sg(keepSign)}), then start the inside from 0 with sign +.`,
        cells: cells(i), pointers: ptr(i), aux: aux(stack.length - 1), vars: vars(),
        logic: 'The bracket will be evaluated on its own, then merged back using the saved sign.', logicTone: 'info', javaLines: [9, 10, 11], pyLines: [8, 9, 10], algoStep: 3,
      });
    } else {
      result += sign * num;
      num = 0;
      const inner = result;
      const s = saved.pop()!; // sign
      const r = saved.pop()!; // outer result
      stack.pop();
      stack.pop();
      result = inner * s + r;
      steps.push({
        title: 'Close bracket: merge', desc: `Inside value = ${inner}. Multiply by the saved sign (${sg(s)}) and add the saved outer result (${r}): ${r} ${inner * s >= 0 ? '+' : '−'} ${Math.abs(inner)} = ${result}.`,
        cells: cells(i), pointers: ptr(i), aux: aux(), vars: vars(),
        logic: 'Pop the sign first (it was pushed last), then the outer result.', logicTone: 'success', javaLines: [12, 13, 14, 15], pyLines: [11, 12, 13, 14], algoStep: 3,
      });
    }
  });

  const before = result;
  result += sign * num;
  steps.push({
    title: 'Flush the last number', desc: `The string ended. Add the pending number: ${before} + (${sg(sign)}${num}) = ${result}.`,
    cells: cells(chars.length), pointers: [], aux: aux(), vars: vars(),
    logic: 'The final number has no operator after it, so it has to be added after the loop.', logicTone: 'warn', javaLines: [18], pyLines: [15], algoStep: 2,
  });
  steps.push({
    title: 'Done', desc: `The value of the expression is ${result}.`,
    cells: cells(chars.length), pointers: [], aux: aux(), vars: vars(),
    logic: `Result: ${result}`, logicTone: 'success', javaLines: [18], pyLines: [15], algoStep: 3, result: { title: String(result), text: 'Value of the expression' },
  });
  return steps;
}

function annotated(input: In): Step[] {
  return annotate(build(input), (s, i, all) => {
    const st = auxItems(s, 'stack');
    const v = s.vars;
    const state = `result = ${v.result}, sign ${v.sign}, num = ${v.num}`;
    if (i === 0) return { tag: 'INIT —', note: 'result = 0, num = 0, sign = +1' };
    if (s.title.startsWith('Digit')) return { tag: 'DIGIT —', note: `num = num * 10 + digit → ${v.num}` };
    if (s.title.startsWith('Operator')) return { tag: 'FLUSH —', note: `result += sign * num → ${state}` };
    if (s.title.startsWith('Open bracket')) return { tag: 'OPEN ( —', note: `push result, sign → stack [${st.join(', ')}]; ${state}` };
    if (s.title.startsWith('Close bracket')) return { tag: 'CLOSE ) —', note: `result = inner * poppedSign + poppedResult → ${v.result}` };
    if (s.title.startsWith('Flush')) return { tag: 'FLUSH LAST —', note: `result += sign * num → ${v.result}` };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `return result → ${s.result?.title}`, algoStep: 4 };
  });
}

export const basicCalculator: ProblemDef<In> = {
  slug: '224-basic-calculator',
  id: '224', title: 'Basic Calculator', difficulty: 'Hard', category: 'Stack', tag: 'stack + sign',
  statement: 'Evaluate a string expression containing non-negative integers, "+", "-", brackets and spaces. A "-" may also be a unary minus at the start of the expression or right after "(".',
  constraints: '1 ≤ s.length ≤ 3·10⁵ (animation input is limited to 16 characters); the expression is valid; no multiplication or division',
  examples: [
    { label: '1 + 1', input: { expr: '1+1' }, output: '2' },
    { label: '2-(5-6)', input: { expr: '2-(5-6)' }, output: '3' },
    { label: '(1+(4+5+2)-3)+(6+8)', input: { expr: '(1+(4+5+2)-3)+(6+8)' }, output: '23' },
  ],
  inputPlaceholder: 'e.g. 1 + (4 - (2 - 3))',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  emphasis: ['plus', 'minus', 'parentheses', 'without using eval'],
  phases: [
    { icon: '🚀', label: 'Init result, sign', tone: 'blue' },
    { icon: '🔢', label: 'Read digits', tone: 'cyan' },
    { icon: '➕', label: '+ / −: flush num', tone: 'orange' },
    { icon: '📦', label: '( save · ) merge', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Character being read', state: 'active' }, { label: 'Already read', state: 'sorted' }],
  varLabels: ['result', 'sign', 'num', 'stack size'],
  approach: {
    title: 'Running result, a sign, and a stack for brackets',
    text: 'Read left to right keeping result, the pending number and the sign in front of it. An operator flushes the number into the result and sets the next sign. "(" saves result and sign on the stack and restarts from zero; ")" finishes the inside, multiplies it by the saved sign and adds the saved result.',
  },
  java: [
    'public int calculate(String s) {',
    '    Deque<Integer> stack = new ArrayDeque<>();',
    '    int result = 0, num = 0, sign = 1;',
    '    for (char ch : s.toCharArray()) {',
    '        if (Character.isDigit(ch)) {',
    "            num = num * 10 + (ch - '0');",
    "        } else if (ch == '+' || ch == '-') {",
    '            result += sign * num; num = 0;',
    "            sign = (ch == '+') ? 1 : -1;",
    "        } else if (ch == '(') {",
    '            stack.push(result); stack.push(sign);',
    '            result = 0; sign = 1;',
    "        } else if (ch == ')') {",
    '            result += sign * num; num = 0;',
    '            result *= stack.pop();',
    '            result += stack.pop();',
    '        }',
    '    }',
    '    return result + sign * num;',
    '}',
  ],
  python: [
    'def calculate(s):',
    '    stack, result, num, sign = [], 0, 0, 1',
    '    for ch in s:',
    '        if ch.isdigit():',
    '            num = num * 10 + int(ch)',
    "        elif ch in '+-':",
    '            result += sign * num; num = 0',
    "            sign = 1 if ch == '+' else -1",
    "        elif ch == '(':",
    '            stack.append(result); stack.append(sign)',
    '            result, sign = 0, 1',
    "        elif ch == ')':",
    '            result += sign * num; num = 0',
    '            result *= stack.pop()',
    '            result += stack.pop()',
    '    return result + sign * num',
  ],
  algorithm: [
    'Start with result = 0, num = 0, sign = +1 and an empty stack',
    'Digits build up num',
    '"+" or "−": add sign × num to result, reset num, set the next sign',
    '"(": push result and sign, restart from 0. ")": finish the inside, multiply by the popped sign, add the popped result',
    'After the last character the result holds the value of the whole expression',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(depth of brackets)' }],
  why: 'Without multiplication, a bracket is just a block that is added to or subtracted from the outside: outer ± (inside). Saving the outer result and the sign in front of "(" lets the inside be computed independently from zero, and combining them on ")" restores exactly that formula. A unary minus works because it flushes a zero and flips the sign for what follows.',
};
