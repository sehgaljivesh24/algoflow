import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { find, gc, parseInts, recorder, splitParts } from './dpAdvKit.ts';

interface In { digits: number[]; n: number }

const java = [
  'public int atMostNGivenDigitSet(String[] digits, int n) {',
  '    String s = String.valueOf(n);',
  '    int L = s.length(), d = digits.length, count = 0;',
  '    for (int len = 1; len < L; len++) {',
  '        count += (int) Math.pow(d, len);                // every shorter number is automatically below n',
  '    }',
  '    boolean tight = true;                               // still equal to the prefix of n so far',
  '    for (int i = 0; i < L && tight; i++) {',
  '        int digit = s.charAt(i) - \'0\';',
  '        int smaller = 0;',
  '        boolean has = false;',
  '        for (String x : digits) {',
  '            int v = Integer.parseInt(x);',
  '            if (v < digit) smaller++;',
  '            if (v == digit) has = true;',
  '        }',
  '        count += smaller * (int) Math.pow(d, L - i - 1);   // pick a smaller digit here; the rest is free',
  '        tight = has;                                       // follow n only if its digit is allowed',
  '        if (tight && i == L - 1) count++;                  // n itself can be built',
  '    }',
  '    return count;',
  '}',
];
const python = [
  'def at_most_n_given_digit_set(digits, n):',
  '    s = str(n)',
  '    L, d, count = len(s), len(digits), 0',
  '    for length in range(1, L):',
  '        count += d ** length                            # every shorter number is automatically below n',
  '    for i, ch in enumerate(s):                          # walk along n while we are "tight"',
  '        smaller = sum(1 for x in digits if x < ch)',
  '        count += smaller * d ** (L - i - 1)             # pick a smaller digit here; the rest is free',
  '        if ch not in digits:',
  '            return count                                # n\'s digit is not allowed: stop following n',
  '    return count + 1                                    # n itself can be built',
];
const J = { def: find(java, 'String s = String.valueOf', 'int L = s.length()'), shorter: find(java, 'for (int len = 1', 'count += (int) Math.pow(d, len)'), loop: find(java, 'boolean tight = true', 'for (int i = 0; i < L'), cnt: find(java, 'for (String x : digits)', 'if (v < digit)', 'count += smaller'), stop: find(java, 'tight = has'), self: find(java, 'if (tight && i == L - 1)'), ret: find(java, 'return count;') };
const P = { def: find(python, 's = str(n)', 'L, d, count'), shorter: find(python, 'for length in', 'count += d ** length'), loop: find(python, 'for i, ch in enumerate(s)'), cnt: find(python, 'smaller = sum', 'count += smaller'), stop: find(python, 'if ch not in digits', 'return count   '), self: find(python, 'return count + 1'), ret: find(python, 'return count + 1') };

function build({ digits, n }: In): Step[] {
  const s = String(n);
  const L = s.length;
  const d = digits.length;
  const dset = new Set(digits);
  const steps: Step[] = [];
  const row: (number | null)[][] = [Array(L).fill(null), Array(L).fill(null), Array(L).fill(null), Array(L).fill(null)];
  let pos = -1;
  let count = 0;
  let tight = 'yes';
  let notes: string[] = [];
  let finished = false;

  const snap = () => ({
    scene: {
      kind: 'grid' as const, variant: 'table' as const,
      rows: row.map((r, ri) => r.map((v, c) => {
        let st: CellState | undefined;
        if (c === pos) st = finished ? 'found' : 'active';
        else if (v === null) st = 'dim';
        else if (ri === 0 && c < pos) st = 'sorted';
        return gc(`${ri},${c}`, v === null ? '?' : v, st);
      })),
      rowHeads: ['digit of N', 'allowed digits below it', 'free slots → d^slots', 'adds to count'], colHeads: s.split('').map((_, i) => `position ${i}`),
    },
    aux: [{ title: 'running count', kind: 'list' as const, items: [...notes] }, { title: 'allowed digits', kind: 'list' as const, items: digits.map(String) }],
    vars: { position: pos < 0 ? '—' : pos, tight, count },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Two kinds of numbers', desc: `Count positive numbers ≤ ${n} built only from the digits {${digits.join(', ')}} (repeats allowed). N = ${n} has ${L} digit${L === 1 ? '' : 's'}. Numbers with FEWER digits are always smaller; numbers with exactly ${plural(L, 'digit')} must be compared with N digit by digit.`,
    logic: 'Splitting by length removes the "is it ≤ N?" question for every shorter length, leaving one careful walk for the same length.',
    java: J.def, py: P.def, algo: 0, tag: 'SPLIT BY LENGTH —', note: `N = ${n} has ${plural(L, 'digit')}, d = ${plural(d, 'allowed digit')}`,
  });

  for (let len = 1; len < L; len++) {
    const add = d ** len;
    count += add;
    notes.push(`${len}-digit numbers: ${d}^${len} = ${add}`);
  }
  if (L > 1) {
    say({
      title: 'All shorter lengths', desc: `Any ${d}-letter alphabet gives ${d}^len numbers of length len, all below ${n}. Together they add up to ${count}.`,
      logic: 'Every digit slot is free to take any of the d allowed digits, so lengths 1..L−1 contribute d + d² + … + d^(L−1).', tone: 'success', java: J.shorter, py: P.shorter, algo: 1,
      tag: 'SHORTER —', note: `${Array.from({ length: L - 1 }, (_, i) => `${d}^${i + 1}`).join(' + ')} = ${count}`,
    });
  }

  let tightOn = true;
  for (let i = 0; i < L && tightOn; i++) {
    pos = i;
    const c = Number(s[i]);
    const smaller = digits.filter((x) => x < c).length;
    const rest = d ** (L - i - 1);
    const add = smaller * rest;
    count += add;
    row[0][i] = c;
    row[1][i] = smaller;
    row[2][i] = rest;
    row[3][i] = add;
    const has = dset.has(c);
    notes.push(`position ${i}: ${smaller} × ${d}^${L - i - 1} = ${add}`);
    tight = has ? 'yes' : 'no (broken)';
    say({
      title: `Position ${i}: N has ${c}`, desc: `While still equal to N's prefix, pick an allowed digit below ${c}: ${smaller} choice${smaller === 1 ? '' : 's'}. After that the number is already smaller, so the other ${L - i - 1} slot${L - i - 1 === 1 ? ' is' : 's are'} free: ${smaller} × ${d}^${L - i - 1} = ${add}. Count is now ${count}. ${has ? `Digit ${c} is allowed, so keep following N.` : `Digit ${c} is NOT allowed, so no number can match N here: stop.`}`,
      logic: has ? 'We stay "tight" (equal to N so far) only as long as N’s own digit is available.' : 'Once N’s digit is missing from the set, the tight path dies; nothing equal to N’s prefix can continue.', tone: has ? 'info' : 'warn',
      java: [...J.cnt, ...(has ? [] : J.stop)], py: [...P.cnt, ...(has ? [] : P.stop)], algo: has ? 2 : 3,
      tag: has ? `POSITION ${i} · TIGHT —` : `POSITION ${i} · BROKEN —`, note: `count += ${smaller} × ${d}^${L - i - 1} = ${add} → ${count}; ${c} ${has ? 'is' : 'is not'} allowed`,
      ...(has ? {} : { alert: `Digit ${c} is not in the set: no number can keep matching N's prefix, so the tight walk stops.` }),
    });
    tightOn = has;
  }

  let self = false;
  if (tightOn) {
    count++;
    self = true;
    notes.push(`N itself: +1`);
    finished = true;
    say({
      title: 'N itself is buildable', desc: `Every digit of ${n} is allowed, so ${n} itself is one more valid number. Count = ${count}.`,
      logic: 'Reaching the end while still tight means the walk matched N exactly — the one number equal to N.', tone: 'success', java: J.self, py: P.self, algo: 4,
      tag: 'N ITSELF —', note: `walk finished still tight → count = ${count}`,
    });
  }
  finished = true;
  tight = tightOn ? 'yes' : 'no (broken)';
  say({
    title: 'Done', desc: `${plural(count, 'number')} ≤ ${n} can be written with {${digits.join(', ')}}${self ? ' (including N itself)' : ''}.`,
    logic: 'Shorter lengths plus the below-N choices along the tight path cover every valid number exactly once.', tone: 'success', java: J.ret, py: P.ret, algo: 4,
    tag: '✅ Done!', note: `return count = ${count}`,
    result: { title: String(count), text: 'Numbers ≤ N' },
  });
  return steps;
}

function parse(raw: string): In {
  const [a, b] = splitParts(raw, 2, 'digits ; N — e.g. 1 3 5 7 ; 100');
  const digits = parseInts(a, { what: 'the digit set', example: '1 3 5 7', minLen: 1, maxLen: 9, lo: 1, hi: 9, distinct: true }).sort((x, y) => x - y);
  const n = Number(b);
  if (!Number.isInteger(n) || n < 1 || n > 999999) throw new Error('N must be a whole number from 1 to 999999');
  return { digits, n };
}

export const numbersAtMostNGivenDigitSet: ProblemDef<In> = {
  slug: '902-numbers-at-most-n-given-digit-set',
  id: '902', title: 'Numbers At Most N Given Digit Set', difficulty: 'Hard', category: 'Dynamic Programming', tag: 'digit DP · tight prefix',
  statement: 'Given a set of digits 1–9 (each digit may be reused any number of times) and an integer n, count the positive integers ≤ n that can be written using only digits from the set.',
  constraints: '1 ≤ digits.length ≤ 9, distinct digits 1–9, 1 ≤ n ≤ 10⁹ (animation input: n ≤ 999999)',
  examples: [
    { label: '1 4 9 ; 999999', input: { digits: [1, 4, 9], n: 999999 }, output: '1092' },
    { label: '1 3 5 7 ; 100', input: { digits: [1, 3, 5, 7], n: 100 }, output: '20' },
    { label: '7 ; 8', input: { digits: [7], n: 8 }, output: '1' },
  ],
  inputPlaceholder: 'digits ; N, e.g. 1 3 5 7 ; 100',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Position being handled', state: 'active' }, { label: 'Tight path so far', state: 'sorted' }, { label: 'Final', state: 'found' }, { label: 'Not reached', state: 'dim' }],
  varLabels: ['position', 'tight', 'count'],
  emphasis: ['digits', 'reused', 'positive integers ≤ n'],
  phases: [
    { icon: '📏', label: 'Split by length', tone: 'blue' },
    { icon: '📉', label: 'All shorter lengths: d^len', tone: 'blue' },
    { icon: '🚶', label: 'Walk N while tight', tone: 'cyan' },
    { icon: '🛑', label: 'Tight path broken', tone: 'orange' },
    { icon: '✅', label: 'N itself, done', tone: 'green' },
  ],
  approach: {
    title: 'Shorter lengths + a walk along N',
    text: 'Numbers shorter than N contribute d^len each. For numbers with the same length, walk N from the left while the prefix still equals N ("tight"): at each position choose an allowed digit smaller than N’s digit and leave the remaining slots free (d^remaining ways), then continue only if N’s own digit is allowed. If the walk reaches the end, N itself counts too.',
  },
  java, python,
  algorithm: [
    'Let L = number of digits of N and d = size of the digit set',
    'Add d^len for every length 1..L−1',
    'Walk N’s digits while tight: add (digits below N[i]) × d^(L−i−1)',
    'Stop if N[i] is not in the set; otherwise continue',
    'If the walk finishes, add 1 for N itself',
  ],
  complexity: [{ label: 'Time', value: 'O(L · d)' }, { label: 'Space', value: 'O(1)' }],
  why: 'A same-length number is smaller than N exactly when, at the first position where they differ, its digit is smaller. Grouping numbers by that first differing position partitions them with no overlap: before it the number copies N (so every copied digit must be allowed — that is the tight flag), at it the number picks a smaller allowed digit, after it every slot is free. Shorter numbers are all smaller than N, so length alone classifies them.',
};
