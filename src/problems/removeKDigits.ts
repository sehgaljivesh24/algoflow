import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { emitter, parseOne, parts } from './listheapKit.ts';
import { ptr } from './ssbShared.ts';
import { annotate, auxItems } from './annotate.ts';

interface In { num: string; k: number }

function parse(raw: string): In {
  const [a, b] = parts(raw, 2, 'digits ; k — e.g. 1432219 ; 3');
  const num = a.trim();
  if (!/^\d+$/.test(num)) throw new Error('The number must be made of digits only, e.g. 1432219');
  if (num.length > 10) throw new Error('Use 10 digits or fewer so the animation stays readable');
  if (num.length > 1 && num[0] === '0') throw new Error('The number must not start with 0 (except the number 0 itself)');
  const k = parseOne(b, 0, num.length, 'k');
  return { num, k };
}

function build({ num, k: k0 }: In): Step[] {
  const n = num.length;
  let k = k0;
  const stack: number[] = []; // indexes of kept digits
  const gone = new Set<number>();
  let cur = -1;
  let phase = 'scan';
  let final: Set<number> | null = null;
  const steps: Step[] = [];

  const emit = emitter(steps, () => {
    const cells: Cell[] = [...num].map((ch, i) => {
      let state: CellState | undefined;
      if (final) state = final.has(i) ? 'found' : gone.has(i) || stack.includes(i) ? 'dim' : undefined;
      else if (gone.has(i)) state = 'error';
      else if (i === cur) state = 'active';
      else if (stack.includes(i)) state = 'compare';
      return { key: i, value: ch, state };
    });
    return {
      cells,
      pointers: cur >= 0 && cur < n && phase === 'scan' ? [ptr('i', 'i', cur, 'blue')] : [],
      aux: [
        { title: 'stack (kept digits, bottom → top)', kind: 'stack' as const, items: stack.map((i) => num[i]) },
        { title: 'removed so far', kind: 'list' as const, items: [...gone].sort((x, y) => x - y).map((i) => num[i]) },
      ],
      vars: { digit: cur >= 0 && cur < n ? num[cur] : '—', 'k left': k, 'stack size': stack.length, phase },
    };
  });

  emit('Start', `Remove exactly ${k0} digit${k0 === 1 ? '' : 's'} from ${num} so that the remaining number is as small as possible.`,
    'A smaller digit in an earlier position always beats anything later, so we want the kept digits to be as non-decreasing as we can make them.', 'info', [0, 1], [0, 1], 0);

  for (let i = 0; i < n; i++) {
    cur = i;
    const c = num[i];
    emit(`Read digit ${c}`, stack.length && k > 0 && num[stack[stack.length - 1]] > c ? `The top digit ${num[stack[stack.length - 1]]} is bigger than ${c}, and we may still remove ${k}.` : k === 0 ? 'No removals left: this digit is simply kept.' : 'The top digit is not bigger (or the stack is empty): nothing to remove.',
      'Deleting a digit that is followed by a smaller digit always shrinks the number.', 'info', [2, 3], [2, 3], 1);
    while (k > 0 && stack.length && num[stack[stack.length - 1]] > c) {
      const j = stack.pop()!;
      gone.add(j);
      k--;
      emit(`Remove ${num[j]}`, `${num[j]} > ${c}, so ${num[j]} leaves the stack. ${k} removal${k === 1 ? '' : 's'} left.`,
        'Pop while the previous digit is larger: the stack stays non-decreasing from bottom to top.', 'warn', [4, 5], [4, 5], 2);
    }
    stack.push(i);
    emit(`Push ${c}`, `${c} joins the kept digits: ${stack.map((j) => num[j]).join('')}.`,
      'Everything below it is now at most as large.', 'success', [7], [6], 3);
  }

  cur = -1;
  phase = 'trim';
  if (k > 0) {
    emit('Trim the tail', `The digits never decreased enough, so ${k} removal${k === 1 ? '' : 's'} remain. The stack is non-decreasing: the largest digits are at the end.`,
      'In a non-decreasing number, dropping the last digit hurts least.', 'warn', [9], [7, 8], 3);
    while (k > 0) {
      const j = stack.pop()!;
      gone.add(j);
      k--;
      emit(`Drop the last digit ${num[j]}`, `${k} removal${k === 1 ? '' : 's'} left.`, 'Same rule, applied to the end of the stack.', 'warn', [9], [7, 8], 3);
    }
  }

  phase = 'zeros';
  let lead = 0;
  while (lead < stack.length && num[stack[lead]] === '0') lead++;
  if (lead > 0) {
    emit('Strip leading zeros', `${lead} zero${lead === 1 ? '' : 's'} at the front carry no value, so they are skipped.`, 'A number may not be printed with leading zeros.', 'info', [10, 11], [9], 3);
  }
  const keep = stack.slice(lead);
  const res = keep.length ? keep.map((j) => num[j]).join('') : '0';
  final = new Set(keep);
  phase = 'done';
  emit('Done', keep.length ? `The smallest number left is ${res}.` : 'Nothing is left, so the answer is "0".', 'The kept digits form the smallest possible number.', 'success', [12, 13], [10], 3,
    { title: res, text: `Smallest number after removing ${k0} digit${k0 === 1 ? '' : 's'}` });
  return steps;
}

function annotated(input: In): Step[] {
  return annotate(build(input), (s, i, all) => {
    const st = auxItems(s, 'stack').join('');
    const kLeft = s.vars['k left'];
    if (i === 0) return { tag: 'INIT —', note: `k = ${kLeft}, stack = ""` };
    const read = /^Read digit (\d)/.exec(s.title);
    if (read) return { tag: 'SCAN —', note: `c = '${read[1]}', top = '${st ? st[st.length - 1] : 'none'}', k = ${kLeft}`, algoStep: 1 };
    const rem = /^Remove (\d)/.exec(s.title);
    if (rem) return { tag: 'POP BIGGER —', note: `pop '${rem[1]}' → k = ${kLeft}, stack "${st}"`, algoStep: 2 };
    const push = /^Push (\d)/.exec(s.title);
    if (push) return { tag: 'PUSH —', note: `stack.push('${push[1]}') → "${st}"`, algoStep: 3 };
    if (s.title === 'Trim the tail') return { tag: 'TRIM TAIL —', note: `k = ${kLeft} left, stack "${st}" is non-decreasing`, algoStep: 4 };
    if (s.title.startsWith('Drop the last')) return { tag: 'TRIM TAIL —', note: `drop last digit → k = ${kLeft}, stack "${st}"`, algoStep: 4, desc: `Drop the last digit (${s.title.slice(-1)}) of the non-decreasing stack: it changes the number least. ${kLeft} removal${kLeft === 1 ? '' : 's'} left.` };
    if (s.title === 'Strip leading zeros') return { tag: 'STRIP ZEROS —', note: `leading zeros skipped`, algoStep: 4 };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `return "${s.result?.title}"`, desc: `${s.desc} Answer: ${s.result?.title}.`, algoStep: 5 };
  });
}

export const removeKDigits: ProblemDef<In> = {
  slug: '402-remove-k-digits',
  id: '402', title: 'Remove K Digits', difficulty: 'Medium', category: 'Stack', tag: 'monotonic stack (increasing)',
  statement: 'Given a number written as a string and an integer k, delete exactly k digits so that the number that remains is as small as possible. Return it without leading zeros ("0" if nothing is left).',
  constraints: '1 ≤ k ≤ num.length ≤ 10⁵, num has no leading zeros (animation: up to 10 digits, 0 ≤ k ≤ length)',
  examples: [
    { label: '1432219 ; 3', input: { num: '1432219', k: 3 }, output: '1219' },
    { label: '10200 ; 1', input: { num: '10200', k: 1 }, output: '200' },
    { label: '12345 ; 2', input: { num: '12345', k: 2 }, output: '123' },
  ],
  inputPlaceholder: 'digits ; k — e.g. 1432219 ; 3',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Digit being read', state: 'active' }, { label: 'Kept on stack', state: 'compare' }, { label: 'Removed', state: 'error' }, { label: 'In the answer', state: 'found' }],
  varLabels: ['digit', 'k left', 'stack size', 'phase'],
  emphasis: ['delete exactly k digits', 'as small as possible', 'leading zeros'],
  phases: [
    { icon: '🚀', label: 'Init stack', tone: 'blue' },
    { icon: '🔍', label: 'Scan next digit', tone: 'cyan' },
    { icon: '⬆️', label: 'Pop bigger digit', tone: 'orange' },
    { icon: '📥', label: 'Push digit', tone: 'green' },
    { icon: '✂️', label: 'Trim tail + zeros', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Pop every digit that is larger than its successor',
    text: 'Scan left to right with a stack. While the top digit is larger than the new digit and removals remain, pop it. Then push the new digit. If removals are left at the end, cut them from the tail, then drop leading zeros.',
  },
  java: [
    'public String removeKdigits(String num, int k) {',
    '    StringBuilder st = new StringBuilder();',
    '    for (char c : num.toCharArray()) {',
    '        while (k > 0 && st.length() > 0 && st.charAt(st.length() - 1) > c) {',
    '            st.deleteCharAt(st.length() - 1);',
    '            k--;',
    '        }',
    '        st.append(c);',
    '    }',
    '    while (k > 0) { st.deleteCharAt(st.length() - 1); k--; }',
    '    int i = 0;',
    "    while (i < st.length() && st.charAt(i) == '0') i++;",
    '    String res = st.substring(i);',
    '    return res.isEmpty() ? "0" : res;',
    '}',
  ],
  python: [
    'def remove_k_digits(num, k):',
    '    st = []',
    '    for c in num:',
    '        while k and st and st[-1] > c:',
    '            st.pop()',
    '            k -= 1',
    '        st.append(c)',
    '    if k:',
    '        st = st[:len(st) - k]',
    "    res = ''.join(st).lstrip('0')",
    "    return res or '0'",
  ],
  algorithm: [
    'Keep a stack of digits that stays non-decreasing',
    'Read the next digit and compare it with the top',
    'While k > 0 and the top is larger, pop it and decrement k',
    'Push the new digit',
    'After the scan, remove any remaining k digits from the end and strip leading zeros',
    'Return the digits; an empty result means "0"',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Compare two candidates digit by digit: the first position where they differ decides. So at the first place where a digit is followed by a smaller one, deleting the bigger digit is always at least as good as deleting any later digit. The stack applies that rule repeatedly: it removes the leftmost "descent" each time, and each digit is pushed and popped at most once. If there are no descents left the number is non-decreasing and the cheapest deletions are at the tail.',
};
