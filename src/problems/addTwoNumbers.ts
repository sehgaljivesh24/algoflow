import type { ProblemDef, Step } from '../engine/types.ts';
import { arrow, emitter, parseInts, parts, plainList } from './listheapKit.ts';
import { annotate } from './annotate.ts';

interface In { a: number[]; b: number[] }

function parse(raw: string): In {
  const [x, y] = parts(raw, 2, 'digits ; digits — e.g. 2 4 3 ; 5 6 4 (least significant digit first)');
  const a = parseInts(x, { max: 6, lo: 0, hi: 9, hint: '2 4 3 ; 5 6 4' });
  const b = parseInts(y, { max: 6, lo: 0, hi: 9, hint: '2 4 3 ; 5 6 4' });
  return { a, b };
}

function build({ a, b }: In): Step[] {
  const res: (number | string)[] = ['D'];
  let i = 0;
  let j = 0;
  let carry = 0;
  let col = 0;
  let sum: number | string = '—';
  const steps: Step[] = [];
  const emit = emitter(steps, () => ({
    scene: plainList(res, [{ id: 'tail', label: 'tail', at: res.length - 1, tone: 'blue' }], res.length > 1 ? { [res.length - 1]: 'active' } : { 0: 'dim' }),
    aux: [
      { title: 'l1 (reversed digits)', kind: 'list' as const, items: a.map(String), highlight: i < a.length ? i : undefined },
      { title: 'l2 (reversed digits)', kind: 'list' as const, items: b.map(String), highlight: j < b.length ? j : undefined },
    ],
    vars: { column: col, carry, sum },
  }));

  emit('Start', 'Digits are stored least significant first, so we can add from the left just like on paper. D is a dummy head for the answer.',
    'Each column adds one digit from each list plus the carry from the previous column.', 'info', [1, 2], [1, 2, 3], 0);

  while (i < a.length || j < b.length || carry !== 0) {
    col++;
    const x = i < a.length ? a[i] : 0;
    const y = j < b.length ? b[j] : 0;
    sum = x + y + carry;
    const terms = [i < a.length ? `${x}` : '0 (l1 ended)', j < b.length ? `${y}` : '0 (l2 ended)', `carry ${carry}`];
    emit(`Column ${col}: ${x} + ${y} + ${carry}`, `${terms.join(' + ')} = ${sum}.`,
      i >= a.length && j >= b.length ? 'Both lists are done, but a leftover carry still needs its own node.' : 'A list that ended simply contributes 0.', 'info', [4, 5, 6], [4, 5, 6, 7, 8], 1);
    res.push(sum % 10);
    const newCarry = Math.floor(sum / 10);
    emit(`Write digit ${sum % 10}`, `Append node ${sum % 10} (sum % 10). New carry = ⌊${sum} / 10⌋ = ${newCarry}.`,
      newCarry ? 'The 1 will be added into the next column.' : 'No carry: the next column starts fresh.', newCarry ? 'warn' : 'success', [7, 8, 9], [9, 10, 11], 2);
    carry = newCarry;
    if (i < a.length) i++;
    if (j < b.length) j++;
  }

  const digits = res.slice(1) as number[];
  const num = [...digits].reverse().join('');
  sum = '—';
  emit('Done', `Both lists are exhausted and carry = 0. The answer list is ${arrow(digits)}.`, `Read backwards it is ${num} — the sum of the two numbers.`, 'success', [11], [12], 3,
    { title: arrow(digits), text: `Reads ${num} (least significant digit first)` });
  return steps;
}

function annotated(input: In): Step[] {
  return annotate(build(input), (s, i, all) => {
    const v = s.vars;
    if (i === 0) return { tag: 'INIT —', note: 'dummy = new ListNode(0); carry = 0', desc: `Digits come least significant first, so adding from the left works like paper addition: ${input.a.join('')} and ${input.b.join('')} reversed. D is a dummy head for the answer.` };
    const col = /^Column (\d+): (\d+) \+ (\d+) \+ (\d+)/.exec(s.title);
    if (col) return { tag: `COLUMN ${col[1]} —`, note: `sum = ${col[2]} + ${col[3]} + carry ${col[4]} = ${v.sum}`, desc: `${s.desc} Add the two digits and the carry from the previous column.` };
    const wr = /^Write digit (\d+)/.exec(s.title);
    if (wr) return { tag: 'WRITE —', note: `tail.next = new ListNode(${wr[1]}); carry = ${v.carry}`, desc: s.desc };
    if (i === all.length - 1) return { tag: '✅ Done!', note: `return dummy.next → ${s.result?.title}`, desc: s.desc };
  });
}

export const addTwoNumbers: ProblemDef<In> = {
  slug: '2-add-two-numbers',
  id: '2', title: 'Add Two Numbers', difficulty: 'Medium', category: 'Linked List', tag: 'carry simulation',
  statement: 'Two non-empty linked lists hold the digits of two non-negative integers in reverse order (least significant digit first). Add the numbers and return the sum as a linked list in the same reversed format.',
  constraints: 'each list has 1–100 digits 0–9, no leading zeros (animation input: up to 6 digits per list)',
  examples: [
    { label: '342 + 465', input: { a: [2, 4, 3], b: [5, 6, 4] }, output: '7 → 0 → 8' },
    { label: '99 + 1', input: { a: [9, 9], b: [1] }, output: '0 → 0 → 1' },
    { label: '0 + 0', input: { a: [0], b: [0] }, output: '0' },
  ],
  inputPlaceholder: 'digits ; digits — e.g. 2 4 3 ; 5 6 4',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Newest node', state: 'active' }, { label: 'Dummy head', state: 'dim' }],
  varLabels: ['column', 'carry', 'sum'],
  emphasis: ['reverse order', 'least significant digit first', 'sum'],
  phases: [
    { icon: '🚀', label: 'Dummy head, carry = 0', tone: 'blue' },
    { icon: '➕', label: 'Add column + carry', tone: 'cyan' },
    { icon: '✍️', label: 'Write digit, new carry', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Grade-school addition',
    text: 'Walk both lists together. At each step add the two digits (0 if a list ended) plus the carry, append sum % 10 to the answer, keep sum / 10 as the new carry. Continue while either list or the carry remains.',
  },
  java: [
    'public ListNode addTwoNumbers(ListNode l1, ListNode l2) {',
    '    ListNode dummy = new ListNode(0), tail = dummy;',
    '    int carry = 0;',
    '    while (l1 != null || l2 != null || carry != 0) {',
    '        int sum = carry;',
    '        if (l1 != null) { sum += l1.val; l1 = l1.next; }',
    '        if (l2 != null) { sum += l2.val; l2 = l2.next; }',
    '        tail.next = new ListNode(sum % 10);',
    '        tail = tail.next;',
    '        carry = sum / 10;',
    '    }',
    '    return dummy.next;',
    '}',
  ],
  python: [
    'def add_two_numbers(l1, l2):',
    '    dummy = tail = ListNode(0)',
    '    carry = 0',
    '    while l1 or l2 or carry:',
    '        total = carry',
    '        if l1:',
    '            total += l1.val; l1 = l1.next',
    '        if l2:',
    '            total += l2.val; l2 = l2.next',
    '        tail.next = ListNode(total % 10)',
    '        tail = tail.next',
    '        carry = total // 10',
    '    return dummy.next',
  ],
  algorithm: [
    'Create a dummy head and set carry = 0',
    'Add the current digits of l1 and l2 (0 if exhausted) and the carry',
    'Append sum % 10 as a new node; carry = sum / 10; repeat while a list or the carry remains',
    'Return dummy.next',
  ],
  complexity: [{ label: 'Time', value: 'O(max(m, n))' }, { label: 'Space', value: 'O(max(m, n))' }],
  why: 'Because the least significant digit comes first, a left-to-right walk processes columns in exactly the order that manual addition needs. The carry is at most 1 (9 + 9 + 1 = 19), so a single integer is enough state, and testing "carry != 0" in the loop handles a final extra digit such as 99 + 1 = 100.',
};
