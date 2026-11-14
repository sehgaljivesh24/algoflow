import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { arr, find, gc, parseOne, perm, recorder } from './dpAdvKit.ts';

interface In { n: number }

const java = [
  'public int countSpecialNumbers(int n) {',
  '    String s = String.valueOf(n);',
  '    int L = s.length(), count = 0;',
  '    for (int len = 1; len < L; len++) {',
  '        count += 9 * perm(9, len - 1);                       // first digit 1-9, then distinct digits from the rest',
  '    }',
  '    boolean[] used = new boolean[10];                        // digits already placed along n\'s prefix',
  '    for (int i = 0; i < L; i++) {',
  '        int c = s.charAt(i) - \'0\';',
  '        for (int x = (i == 0 ? 1 : 0); x < c; x++) {         // smaller digit at position i (no leading zero)',
  '            if (!used[x]) count += perm(9 - i, L - i - 1);   // the rest: distinct digits from what is left',
  '        }',
  '        if (used[c]) return count;                           // n\'s own prefix repeats a digit: stop',
  '        used[c] = true;',
  '    }',
  '    return count + 1;                                        // n itself has all-distinct digits',
  '}',
  'private int perm(int a, int k) { int r = 1; for (int t = 0; t < k; t++) r *= a - t; return r; }   // a * (a-1) * ... (k factors)',
];
const python = [
  'def count_special_numbers(n):',
  '    s = str(n)',
  '    L, count = len(s), 0',
  '    for length in range(1, L):',
  '        count += 9 * perm(9, length - 1)                     # first digit 1-9, then distinct digits from the rest',
  '    used = set()                                             # digits already placed along n\'s prefix',
  '    for i, ch in enumerate(s):',
  '        c = int(ch)',
  '        for x in range(1 if i == 0 else 0, c):               # smaller digit at position i (no leading zero)',
  '            if x not in used:',
  '                count += perm(9 - i, L - i - 1)              # the rest: distinct digits from what is left',
  '        if c in used:',
  '            return count                                     # n\'s own prefix repeats a digit: stop',
  '        used.add(c)',
  '    return count + 1                                         # n itself has all-distinct digits',
  '',
  'def perm(a, k):                                              # a * (a-1) * ... (k factors)',
  '    r = 1',
  '    for t in range(k):',
  '        r *= a - t',
  '    return r',
];
const J = { def: find(java, 'String s = String.valueOf', 'int L = s.length()'), shorter: find(java, 'for (int len = 1', 'count += 9 * perm'), loop: find(java, 'boolean[] used', 'for (int i = 0; i < L'), cnt: find(java, 'for (int x =', 'if (!used[x])'), stop: find(java, 'if (used[c]) return count'), mark: find(java, 'used[c] = true'), self: find(java, 'return count + 1') };
const P = { def: find(python, 's = str(n)', 'L, count'), shorter: find(python, 'for length in', 'count += 9 * perm'), loop: find(python, 'used = set()', 'for i, ch in enumerate'), cnt: find(python, 'for x in range', 'if x not in used', 'count += perm(9 - i'), stop: find(python, 'if c in used', 'return count   '), mark: find(python, 'used.add(c)'), self: find(python, 'return count + 1') };

function build({ n }: In): Step[] {
  const s = String(n);
  const L = s.length;
  const steps: Step[] = [];
  const row: (number | null)[][] = [Array(L).fill(null), Array(L).fill(null), Array(L).fill(null), Array(L).fill(null)];
  const used = new Set<number>();
  let pos = -1;
  let count = 0;
  let status = 'tight';
  let notes: string[] = [];
  let finished = false;

  const snap = () => ({
    scene: {
      kind: 'split' as const,
      parts: [
        {
          kind: 'grid' as const, variant: 'table' as const,
          rows: row.map((r, ri) => r.map((v, c) => {
            let st: CellState | undefined;
            if (c === pos) st = finished ? 'found' : 'active';
            else if (v === null) st = 'dim';
            else if (ri === 0 && c < pos) st = 'sorted';
            return gc(`${ri},${c}`, v === null ? '?' : v, st);
          })),
          rowHeads: ['digit of N', 'unused digits below it', 'ways to fill the rest', 'adds to count'], colHeads: s.split('').map((_, i) => `position ${i}`),
        },
        { kind: 'array' as const, cells: arr(Array.from({ length: 10 }, (_, i) => i), (i) => (used.has(i) ? 'sorted' : undefined), undefined, 'u'), pointers: [] },
      ],
    },
    aux: [{ title: 'running count', kind: 'list' as const, items: [...notes] }],
    vars: { position: pos < 0 ? '—' : pos, state: status, 'used digits': used.size ? [...used].sort().join('') : '∅', count },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Same plan as before, with a "used" set', desc: `Count the numbers in 1..${n} whose digits are all different. Shorter numbers are all below N; same-length numbers are counted by the first position where they drop below N, while the prefix copied from N must itself have no repeated digit. The row of digits 0-9 below tracks which digits N's prefix has used.`,
    logic: 'The state of a digit DP is (position, still tight?, digits used, started?); here "not started yet" is the shorter-length group and "tight" is the walk along N.',
    java: J.def, py: P.def, algo: 0, tag: 'PLAN —', note: `N = ${n}: ${L} digit${L === 1 ? '' : 's'}, used = ∅`,
  });

  for (let len = 1; len < L; len++) {
    const add = 9 * perm(9, len - 1);
    count += add;
    notes.push(`${len}-digit: 9 × P(9,${len - 1}) = ${add}`);
  }
  if (L > 1) {
    say({
      title: 'All shorter lengths', desc: `A number with len digits and no repeats: 9 choices for the first digit (not 0), then distinct digits from the 9 left: 9 × 9 × 8 × …. Lengths 1..${L - 1} add up to ${count}.`,
      logic: 'Leading zeros are not part of the number, so a shorter number is exactly a "not started yet" prefix; its first real digit must be non-zero.', tone: 'success', java: J.shorter, py: P.shorter, algo: 1,
      tag: 'SHORTER —', note: `Σ 9 × P(9, len−1) for len = 1..${L - 1} = ${count}`,
    });
  }

  let tightOn = true;
  for (let i = 0; i < L && tightOn; i++) {
    pos = i;
    const c = Number(s[i]);
    let choices = 0;
    for (let x = i === 0 ? 1 : 0; x < c; x++) if (!used.has(x)) choices++;
    const rest = perm(9 - i, L - i - 1);
    const add = choices * rest;
    count += add;
    row[0][i] = c;
    row[1][i] = choices;
    row[2][i] = rest;
    row[3][i] = add;
    notes.push(`position ${i}: ${choices} × ${rest} = ${add}`);
    const dup = used.has(c);
    status = dup ? 'repeat — stop' : 'tight';
    say({
      title: `Position ${i}: N has ${c}`, desc: `Drop below N here with an unused digit smaller than ${c}${i === 0 ? ' (not 0: no leading zero)' : ''}: ${choices} choice${choices === 1 ? '' : 's'}. The other ${L - i - 1} slot${L - i - 1 === 1 ? '' : 's'} take distinct unused digits in P(${9 - i}, ${L - i - 1}) = ${plural(rest, 'way')}. Adds ${choices} × ${rest} = ${add}; count = ${count}. ${dup ? `But ${c} was already used earlier in N, so no number can follow N's prefix any further.` : `Digit ${c} is new, so keep following N.`}`,
      logic: dup ? 'A repeated digit kills the tight path: every number matching N this far already has a repeat.' : 'Staying tight means copying N’s digit, which marks it as used.', tone: dup ? 'warn' : 'info',
      java: [...J.cnt, ...(dup ? J.stop : J.mark)], py: [...P.cnt, ...(dup ? P.stop : P.mark)], algo: dup ? 3 : 2,
      tag: dup ? `POSITION ${i} · REPEAT —` : `POSITION ${i} · TIGHT —`, note: `count += ${choices} × P(${9 - i}, ${L - i - 1}) = ${choices} × ${rest} = ${add} → ${count}`,
      ...(dup ? { alert: `Digit ${c} already appears earlier in N: every number matching N's prefix has a repeat, so the walk stops.` } : {}),
    });
    if (dup) tightOn = false;
    else used.add(c);
  }

  let self = false;
  if (tightOn) {
    count++;
    self = true;
    notes.push('N itself: +1');
    finished = true;
    say({
      title: 'N itself qualifies', desc: `All digits of ${n} are different, so N is one more special number. Count = ${count}.`,
      logic: 'Finishing the tight walk without a repeat means N itself passes.', tone: 'success', java: J.self, py: P.self, algo: 4,
      tag: 'N ITSELF —', note: `all digits distinct → count = ${count}`,
    });
  }
  finished = true;
  say({
    title: 'Done', desc: `${plural(count, 'integer')} in 1..${n} ${count === 1 ? 'has' : 'have'} all-distinct digits${self ? ' (N included)' : ''}.`,
    logic: 'Shorter lengths plus the below-N choices along the tight path partition every valid number exactly once.', tone: 'success', java: J.self, py: P.self, algo: 4,
    tag: '✅ Done!', note: `return count = ${count}`,
    result: { title: String(count), text: 'Special integers' },
  });
  return steps;
}

export const countSpecialIntegers: ProblemDef<In> = {
  slug: '2376-count-special-integers',
  id: '2376', title: 'Count Special Integers', difficulty: 'Hard', category: 'Dynamic Programming', tag: 'digit DP · used digits',
  statement: 'A positive integer is special if all of its decimal digits are different. Given n, return how many special integers lie in the range [1, n].',
  constraints: '1 ≤ n ≤ 2 × 10⁹ (animation input: n ≤ 999999)',
  examples: [
    { label: 'n = 2345', input: { n: 2345 }, output: '1371' },
    { label: 'n = 135', input: { n: 135 }, output: '110' },
    { label: 'n = 20', input: { n: 20 }, output: '19' },
    { label: 'n = 5', input: { n: 5 }, output: '5' },
  ],
  inputPlaceholder: 'n, e.g. 2345',
  parseInput: (raw) => ({ n: parseOne(raw, 'n', 1, 999999, '2345') }),
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Position being handled', state: 'active' }, { label: 'Used digit / tight prefix', state: 'sorted' }, { label: 'Final', state: 'found' }, { label: 'Not reached', state: 'dim' }],
  varLabels: ['position', 'state', 'used digits', 'count'],
  emphasis: ['special', 'all of its decimal digits are different'],
  phases: [
    { icon: '📋', label: 'Plan: tight walk + used set', tone: 'blue' },
    { icon: '📉', label: 'Shorter lengths: 9·P(9, len−1)', tone: 'blue' },
    { icon: '🚶', label: 'Walk N: unused digits below N[i]', tone: 'cyan' },
    { icon: '🔁', label: 'Repeated digit: stop', tone: 'orange' },
    { icon: '✅', label: 'N itself, done', tone: 'green' },
  ],
  approach: {
    title: 'Shorter lengths, then a tight walk with a used-digit set',
    text: 'Shorter numbers: 9 · P(9, len−1) each. For the same length, walk N from the left. At position i count unused digits below N[i] (no 0 at the front) times the ways P(9−i, rest) to fill the remaining slots with distinct digits. Stop if N[i] was already used; if the walk finishes, add 1 for N.',
  },
  java, python,
  algorithm: [
    'L = number of digits of N',
    'Add 9 · P(9, len−1) for each length 1..L−1',
    'Walk N: add (unused digits below N[i]) × P(9−i, L−i−1)',
    'Stop when N[i] repeats an earlier digit; otherwise mark it used',
    'If no repeat appears, add 1 for N itself',
  ],
  complexity: [{ label: 'Time', value: 'O(L · 10)' }, { label: 'Space', value: 'O(10)' }],
  why: 'Special numbers shorter than N are all ≤ N, and for those the first digit just cannot be zero. For equal length, each number below N first differs from N at one position; before that it copies N, so N’s prefix must be duplicate-free, and at that position it takes a smaller unused digit. Afterwards the free slots only need pairwise-different digits from the digits not yet used, whose count depends on how many have been placed, not on which ones — which is the permutation count.',
};
