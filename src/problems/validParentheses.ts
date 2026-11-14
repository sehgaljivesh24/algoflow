import type { Cell, CellState, ProblemDef, Step } from '../engine/types';

interface In { s: string }

const PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

function parse(raw: string): In {
  const s = raw.replace(/\s+/g, '');
  if (!s || /[^()[\]{}]/.test(s)) throw new Error('Use only the characters ( ) [ ] { }');
  if (s.length > 14) throw new Error('Use 14 characters or fewer');
  return { s };
}

function build({ s }: In): Step[] {
  const steps: Step[] = [];
  const stack: string[] = [];
  const chars = [...s];

  const cells = (cur: number, bad?: number): Cell[] =>
    chars.map((value, i) => {
      let state: CellState | undefined;
      if (i === bad) state = 'error';
      else if (i === cur) state = 'active';
      else if (i < cur) state = 'sorted';
      return { key: i, value, state };
    });
  const aux = (hl?: number, match?: string[], bad?: number[]) => [
    { title: 'stack (top = most recent opener)', kind: 'stack' as const, items: [...stack], highlight: hl },
    ...(match ? [{ title: 'match check', kind: 'list' as const, items: match, bad }] : []),
  ];
  const ptr = (i: number) => [{ id: 'i', label: 'i', index: i, tone: 'blue' as const }];
  const vars = (i: number | string) => ({ i, char: typeof i === 'number' ? chars[i] : '—', 'stack size': stack.length, top: stack.length ? stack[stack.length - 1] : '—' });

  steps.push({
    title: 'Start', tag: 'INIT —', desc: `s = "${s}": scan left to right. Openers go on the stack, a closer must match the opener on top.`,
    note: 'stack = []',
    cells: cells(-1), pointers: [], aux: aux(), vars: vars('—'),
    logic: 'The most recent unclosed opener has to be closed first — exactly what a stack gives us.',
    logicTone: 'info', javaLines: [0, 1], pyLines: [0, 1, 2], algoStep: 0,
  });

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (!PAIRS[c]) {
      stack.push(c);
      steps.push({
        title: `Push '${c}'`, tag: 'PUSH —', desc: `s[${i}] = '${c}' is an opener, so push it. The stack is now [${stack.join(' ')}], size ${stack.length}.`,
        note: `stack.push('${c}') → size ${stack.length}`,
        cells: cells(i), pointers: ptr(i), aux: aux(stack.length - 1), vars: vars(i),
        logic: 'It now waits for its closer.', logicTone: 'info', javaLines: [2, 3, 4], pyLines: [3, 7, 8], algoStep: 1,
      });
      continue;
    }
    if (stack.length === 0) {
      steps.push({
        title: `Nothing to match '${c}'`, tag: 'MISMATCH —', desc: `s[${i}] = '${c}' is a closer but the stack is empty: nothing to close.`,
        note: 'stack.isEmpty() → return false',
        alert: `Invalid! '${c}' at index ${i} has no opener before it.`,
        cells: cells(i, i), pointers: ptr(i), aux: aux(undefined, [`'${c}' needs '${PAIRS[c]}'`, 'stack empty', '✗ no match'], [2]), vars: vars(i),
        logic: 'A closer with no opener before it can never be valid.', logicTone: 'warn', javaLines: [6], pyLines: [4, 5, 6], algoStep: 3,
        result: { title: 'false', text: `Unmatched '${c}' at index ${i}` },
      });
      return steps;
    }
    const open = stack.pop()!;
    if (open !== PAIRS[c]) {
      steps.push({
        title: 'Mismatch', tag: 'MISMATCH —', desc: `s[${i}] = '${c}' needs '${PAIRS[c]}' but the top was '${open}'. The types do not match, so the string is invalid.`,
        note: `pop '${open}' ≠ '${PAIRS[c]}' → return false`,
        alert: `Invalid! '${open}' cannot be closed by '${c}' at index ${i}.`,
        cells: cells(i, i), pointers: ptr(i), aux: aux(undefined, [`'${c}' needs '${PAIRS[c]}'`, `popped '${open}'`, '✗ no match'], [2]), vars: vars(i),
        logic: 'Brackets must close in the right order, so this string is invalid.', logicTone: 'warn', javaLines: [7, 8], pyLines: [5, 6], algoStep: 3,
        result: { title: 'false', text: `'${open}' cannot be closed by '${c}'` },
      });
      return steps;
    }
    steps.push({
      title: `Match '${open}' with '${c}'`, tag: 'POP + MATCH —', desc: `s[${i}] = '${c}' needs '${PAIRS[c]}'. Pop the top '${open}': a match, so the pair cancels. Stack size ${stack.length}.`,
      note: `pop '${open}' = '${PAIRS[c]}' ✓ → size ${stack.length}`,
      cells: cells(i), pointers: ptr(i), aux: aux(undefined, [`'${c}' needs '${PAIRS[c]}'`, `popped '${open}'`, '✓ match']), vars: vars(i),
      logic: 'A matching pair cancels out.', logicTone: 'success', javaLines: [5, 6, 7, 8], pyLines: [4, 5], algoStep: 2,
    });
  }

  const ok = stack.length === 0;
  steps.push({
    title: ok ? 'Stack is empty' : 'Openers left over', tag: ok ? '✅ Valid!' : 'LEFTOVER —',
    desc: ok ? `The whole string was scanned and the stack is empty: every opener was closed in the right order.` : `The string ended with ${stack.length} unclosed opener${stack.length > 1 ? 's' : ''} [${stack.join(' ')}] still on the stack.`,
    note: ok ? 'stack.isEmpty() → return true' : `stack.isEmpty() is false → return false`,
    alert: ok ? `✅ Valid! Every bracket in "${s}" is matched.` : `Invalid! ${stack.length} opener${stack.length > 1 ? 's were' : ' was'} never closed.`,
    cells: cells(chars.length), pointers: [], aux: aux(), vars: vars('—'),
    logic: ok ? 'All brackets matched in order.' : 'Unclosed openers remain on the stack, so the string is invalid.',
    logicTone: ok ? 'success' : 'warn', javaLines: [11], pyLines: [9], algoStep: 3,
    result: { title: String(ok), text: ok ? 'Valid string' : `Unclosed: ${stack.join(' ')}` },
  });
  return steps;
}

export const validParentheses: ProblemDef<In> = {
  slug: '20-valid-parentheses',
  id: '20', title: 'Valid Parentheses', difficulty: 'Easy', category: 'Stack', tag: 'stack',
  statement:
    "Given a string containing only '(', ')', '{', '}', '[' and ']', decide whether it is valid: every opener must be closed by the same type of bracket, in the correct order.",
  constraints: '1 ≤ s.length ≤ 10⁴ (animation input is limited to 14 characters)',
  examples: [
    { label: '({[]})', input: { s: '({[]})' }, output: 'true' },
    { label: '()[]{}', input: { s: '()[]{}' }, output: 'true' },
    { label: '([{}])', input: { s: '([{}])' }, output: 'true' },
    { label: '([)]', input: { s: '([)]' }, output: 'false' },
    { label: '((]', input: { s: '((]' }, output: 'false' },
  ],
  inputPlaceholder: 'e.g. ([{}])',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current', state: 'active' }, { label: 'Processed', state: 'sorted' }, { label: 'Problem', state: 'error' }],
  varLabels: ['i', 'char', 'stack size', 'top'],
  emphasis: ['valid', 'same type of bracket', 'correct order'],
  phases: [
    { icon: '🔍', label: 'Scan the string', tone: 'blue' },
    { icon: '📥', label: 'Push opener', tone: 'cyan' },
    { icon: '🤝', label: 'Pop + match closer', tone: 'gold' },
    { icon: '✅', label: 'Valid? stack empty', tone: 'green' },
  ],
  approach: {
    title: 'Push openers, pop on closers',
    text: 'Scan left to right. Push every opener. On a closer, pop the top and check that it is the matching opener. At the end the stack must be empty.',
  },
  java: [
    'public boolean isValid(String s) {',
    '    Deque<Character> stack = new ArrayDeque<>();',
    '    for (char c : s.toCharArray()) {',
    "        if (c == '(' || c == '[' || c == '{') {",
    '            stack.push(c);',
    '        } else {',
    '            if (stack.isEmpty()) return false;',
    '            char open = stack.pop();',
    '            if (!matches(open, c)) return false;',
    '        }',
    '    }',
    '    return stack.isEmpty();',
    '}',
  ],
  python: [
    'def is_valid(s):',
    '    stack = []',
    "    pairs = {')': '(', ']': '[', '}': '{'}",
    '    for c in s:',
    '        if c in pairs:',
    '            if not stack or stack.pop() != pairs[c]:',
    '                return False',
    '        else:',
    '            stack.append(c)',
    '    return not stack',
  ],
  algorithm: [
    'Start with an empty stack',
    'Opener → push it',
    'Closer → pop; fail if empty or not the matching opener',
    'At the end the stack must be empty',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Brackets nest, so the last opener to appear must be the first one closed — last-in, first-out. Any mismatch, early closer, or leftover opener proves the string cannot be balanced.',
};
