import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural, verb } from './text.ts';
import { find, gc, heads, recorder, splitParts } from './dpAdvKit.ts';

interface In { n: number; target: number }

const java = [
  'public int countWithDigitSum(int n, int S) {',
  '    String s = String.valueOf(n);',
  '    int L = s.length();',
  '    int[][] free = new int[L][S + 1];                  // free[r][t]: r-digit strings (leading zeros allowed) with digit sum t',
  '    free[0][0] = 1;',
  '    for (int r = 1; r < L; r++)',
  '        for (int t = 0; t <= S; t++)',
  '            for (int dgt = 0; dgt <= 9 && dgt <= t; dgt++)',
  '                free[r][t] += free[r - 1][t - dgt];       // choose the first digit, the rest is r-1 free digits',
  '    int count = 0, prefix = 0;',
  '    for (int i = 0; i < L; i++) {',
  '        int c = s.charAt(i) - \'0\';',
  '        for (int dgt = 0; dgt < c; dgt++) {            // drop below n at position i; the rest is free',
  '            int need = S - prefix - dgt;',
  '            if (need >= 0) count += free[L - 1 - i][need];',
  '        }',
  '        prefix += c;                                   // stay tight: copy n\'s digit',
  '        if (prefix > S) break;',
  '    }',
  '    if (prefix == S) count++;                          // n itself',
  '    return count;',
  '}',
];
const python = [
  'def count_with_digit_sum(n, S):',
  '    s = str(n)',
  '    L = len(s)',
  '    free = [[0] * (S + 1) for _ in range(L)]           # free[r][t]: r-digit strings (leading zeros allowed) with digit sum t',
  '    free[0][0] = 1',
  '    for r in range(1, L):',
  '        for t in range(S + 1):',
  '            for dgt in range(0, min(9, t) + 1):',
  '                free[r][t] += free[r - 1][t - dgt]        # choose the first digit, the rest is r-1 free digits',
  '    count = prefix = 0',
  '    for i, ch in enumerate(s):',
  '        c = int(ch)',
  '        for dgt in range(c):                           # drop below n at position i; the rest is free',
  '            need = S - prefix - dgt',
  '            if need >= 0:',
  '                count += free[L - 1 - i][need]',
  '        prefix += c                                    # stay tight: copy n\'s digit',
  '        if prefix > S:',
  '            break',
  '    if prefix == S:                                    # n itself',
  '        count += 1',
  '    return count',
];
const J = { def: find(java, 'String s = String.valueOf', 'int[][] free', 'free[0][0] = 1'), fill: find(java, 'for (int r = 1', 'for (int t = 0', 'for (int dgt = 0; dgt <= 9', 'free[r][t] +='), init: find(java, 'int count = 0, prefix'), walk: find(java, 'for (int i = 0; i < L', 'int c = s.charAt', 'for (int dgt = 0; dgt < c', 'int need', 'if (need >= 0)'), tight: find(java, 'prefix += c', 'if (prefix > S)'), self: find(java, 'if (prefix == S) count++'), ret: find(java, 'return count;') };
const P = { def: find(python, 's = str(n)', 'free = [[0]', 'free[0][0] = 1'), fill: find(python, 'for r in range(1', 'for t in range', 'for dgt in range(0, min', 'free[r][t] +='), init: find(python, 'count = prefix = 0'), walk: find(python, 'for i, ch in', 'c = int(ch)', 'for dgt in range(c)', 'need = S', 'if need >= 0', 'count += free'), tight: find(python, 'prefix += c', 'if prefix > S'), self: find(python, 'if prefix == S', 'count += 1'), ret: find(python, 'return count') };

function build({ n, target: S }: In): Step[] {
  const s = String(n);
  const L = s.length;
  const free: (number | null)[][] = Array.from({ length: L }, () => Array(S + 1).fill(null));
  const steps: Step[] = [];
  let cr = -1;
  let ct = -1;
  let done = false;
  let srcs: [number, number][] = [];
  let used: [number, number][] = [];
  let count = 0;
  let prefix: number | string = '—';
  let pos: number | string = '—';
  let notes: string[] = [];

  const snap = () => ({
    scene: {
      kind: 'grid' as const, variant: 'table' as const,
      rows: free.map((r, ri) => r.map((v, t) => {
        let st: CellState | undefined;
        if (ri === cr && t === ct) st = done ? 'found' : 'active';
        else if (srcs.some(([a, b]) => a === ri && b === t)) st = 'compare';
        else if (used.some(([a, b]) => a === ri && b === t)) st = 'found';
        else if (v === null) st = 'dim';
        return gc(`${ri},${t}`, v === null ? '?' : v, st);
      })),
      rowHeads: free.map((_, r) => `${r} free digit${r === 1 ? '' : 's'}`), colHeads: heads(S + 1, (t) => `sum ${t}`),
    },
    aux: [{ title: 'terms', kind: 'list' as const, items: [...notes] }, { title: `digits of N = ${n}`, kind: 'list' as const, items: s.split('') }],
    vars: { position: pos, prefix, count },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Table of free suffixes', desc: `Count the numbers in 0..${n} whose digits add up to ${S}. free[r][t] = how many strings of exactly r digits (leading zeros allowed) have digit sum t. Once a number is known to be smaller than N, its remaining r digits are such a free string.`,
    logic: 'Leading zeros add 0 to a digit sum, so "r free digits with leading zeros" is exactly "all numbers below 10^r" — no separate leading-zero flag is needed for this question.',
    java: J.def, py: P.def, algo: 0, tag: 'DEFINE —', note: `free[0..${L - 1}][0..${S}] for N = ${n}, S = ${S}`,
  });
  free[0][0] = 1;
  for (let t = 1; t <= S; t++) free[0][t] = 0;
  cr = 0;
  ct = 0;
  done = true;
  say({
    title: 'Row 0: the empty suffix', desc: 'Zero digits have sum 0 in exactly one way (the empty string); any other sum is impossible.',
    logic: 'This is the base of the convolution below.', tone: 'success', java: J.def, py: P.def, algo: 1,
    tag: 'BASE ROW —', note: `free[0][0] = 1, free[0][t>0] = 0`,
  });

  for (let r = 1; r < L; r++) {
    for (let t = 0; t <= S; t++) {
      cr = r;
      ct = t;
      done = false;
      srcs = [];
      const terms: string[] = [];
      let v = 0;
      for (let dgt = 0; dgt <= 9 && dgt <= t; dgt++) {
        srcs.push([r - 1, t - dgt]);
        v += free[r - 1][t - dgt]!;
        if (free[r - 1][t - dgt]! > 0) terms.push(`first digit ${dgt}: free[${r - 1}][${t - dgt}] = ${free[r - 1][t - dgt]}`);
      }
      free[r][t] = v;
      done = true;
      notes = terms;
      say({
        title: `free[${r}][${t}] = ${v}`, desc: `A ${r}-digit string with sum ${t} starts with some digit 0..${Math.min(9, t)}; the other ${plural(r - 1, 'digit')} ${verb(r - 1, 'then needs', 'then need')} sum ${t} − digit. Adding the ${plural(Math.min(9, t) + 1, 'cell')} above (yellow) gives ${v}.`,
        logic: 'A convolution row by row: each cell sums up to ten cells of the previous row.', java: J.fill, py: P.fill, algo: 2,
        tag: 'FILL CELL —', note: `free[${r}][${t}] = Σ free[${r - 1}][${t}−d], d = 0..${Math.min(9, t)} = ${v}`,
      });
    }
  }

  srcs = [];
  cr = -1;
  ct = -1;
  notes = [];
  prefix = 0;
  say({
    title: 'Walk along N (tight)', desc: `Now compare with N = ${n}. At each position, if a number puts a digit BELOW N's digit it becomes smaller than N for good, and the remaining digits are free. We add up those cases, then copy N's digit and move on.`,
    logic: 'Every number below N first differs from it at exactly one position, so these cases are disjoint and cover everything.', java: J.init, py: P.init, algo: 3,
    tag: 'WALK N —', note: `count = 0, prefix = 0, digits of N = ${s.split('').join(' ')}`,
  });

  let p = 0;
  let broke = false;
  for (let i = 0; i < L; i++) {
    const c = Number(s[i]);
    pos = i;
    used = [];
    const terms: string[] = [];
    let add = 0;
    for (let dgt = 0; dgt < c; dgt++) {
      const need = S - p - dgt;
      if (need >= 0) {
        const v = free[L - 1 - i][need]!;
        add += v;
        used.push([L - 1 - i, need]);
        terms.push(`digit ${dgt}: free[${L - 1 - i}][${need}] = ${v}`);
      } else terms.push(`digit ${dgt}: needs sum ${need} < 0, skip`);
    }
    count += add;
    notes = terms;
    prefix = p;
    say({
      title: `Position ${i}: N has ${c}`, desc: c === 0
        ? `Prefix sum so far ${p}. N has 0 here, so no smaller digit exists: ${add} numbers added. Count = ${count}.`
        : `Prefix sum so far ${p}. Put a smaller digit (0..${c - 1}) here and leave ${L - 1 - i} free digit${L - 1 - i === 1 ? '' : 's'}: ${add} number${add === 1 ? '' : 's'}. Count = ${count}.`,
      logic: 'The free suffix must supply exactly S − prefix − chosen digit.', java: J.walk, py: P.walk, algo: 4,
      tag: `POSITION ${i} —`, note: `digits < ${c} with prefix ${p}: +${add} → count = ${count}`,
    });
    p += c;
    prefix = p;
    if (p > S) {
      broke = true;
      used = [];
      say({
        title: 'Prefix sum exceeds S', desc: `Copying N's digits already gives sum ${p} > ${S}; no number matching N's prefix can reach ${S}, so the walk stops.`,
        logic: 'Digits are non-negative, so a prefix that overshoots can never come back.', tone: 'warn', java: J.tight, py: P.tight, algo: 4,
        tag: 'OVERSHOOT —', note: `prefix ${p} > S ${S} → break`, alert: `Prefix sum ${p} already exceeds ${S}: the tight path cannot recover.`,
      });
      break;
    }
  }

  used = [];
  let self = false;
  if (!broke && p === S) {
    count++;
    self = true;
    say({
      title: 'N itself', desc: `The digits of ${n} add to exactly ${S}, so N itself counts: +1. Count = ${count}.`,
      logic: 'The walk matched N completely, which is the one number not counted by any "drop below" case.', tone: 'success', java: J.self, py: P.self, algo: 4,
      tag: 'N ITSELF —', note: `prefix ${p} == S ${S} → count = ${count}`,
    });
  }
  say({
    title: 'Done', tag: '✅ Done!', note: `return count = ${count}`, desc: `${count} number${count === 1 ? '' : 's'} in 0..${n} have digit sum ${S}${self ? ' (including N)' : ''}.`,
    logic: 'Free-suffix counts plus the tight walk partition all numbers ≤ N.', tone: 'success', java: J.ret, py: P.ret, algo: 4,
    result: { title: String(count), text: `Numbers ≤ ${n} with digit sum ${S}` },
  });
  return steps;
}

function parse(raw: string): In {
  const [a, b] = splitParts(raw, 2, 'N ; target sum — e.g. 5000 ; 8');
  const n = Number(a);
  const target = Number(b);
  if (!Number.isInteger(n) || n < 1 || n > 99999) throw new Error('N must be a whole number from 1 to 99999');
  if (!Number.isInteger(target) || target < 1 || target > 15) throw new Error('The digit sum must be a whole number from 1 to 15');
  return { n, target };
}

export const countNumbersWithDigitSum: ProblemDef<In> = {
  slug: 'cp-count-numbers-with-digit-sum',
  id: 'CP', title: 'Count Numbers With Digit Sum', difficulty: 'Hard', category: 'Dynamic Programming', tag: 'digit DP · free suffix table',
  statement: 'Given N and a target S, count the integers x with 0 ≤ x ≤ N whose decimal digits add up to exactly S. (The same engine solves LeetCode 2719 by taking a difference of two prefixes.)',
  constraints: '1 ≤ N ≤ 10¹⁸, 1 ≤ S ≤ 162 (animation input: N ≤ 99999, S ≤ 15)',
  examples: [
    { label: 'N = 100, S = 5', input: { n: 100, target: 5 }, output: '6' },
    { label: 'N = 5000, S = 8', input: { n: 5000, target: 8 }, output: '145' },
    { label: 'N = 999, S = 3', input: { n: 999, target: 3 }, output: '10' },
  ],
  inputPlaceholder: 'N ; S, e.g. 5000 ; 8',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Cell being computed', state: 'active' }, { label: 'Cells it sums', state: 'compare' }, { label: 'Used in the tight walk', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['position', 'prefix', 'count'],
  emphasis: ['digits add up to exactly S', '0 ≤ x ≤ N'],
  phases: [
    { icon: '🧱', label: 'Define free[r][t]', tone: 'blue' },
    { icon: '🌱', label: 'Base row: empty suffix', tone: 'blue' },
    { icon: '➕', label: 'Fill: ten-way convolution', tone: 'cyan' },
    { icon: '🚶', label: 'Start the tight walk', tone: 'cyan' },
    { icon: '🏆', label: 'Digits below N[i], N itself, done', tone: 'green' },
  ],
  approach: {
    title: 'Free-suffix table + walk along N',
    text: 'Precompute free[r][t], the number of r-digit strings with digit sum t (free[r][t] = Σ free[r−1][t−d] over the first digit d). Then walk N from the left: at position i, for every digit below N[i], the number is already smaller, so add free[remaining][S − prefix − digit]; then copy N[i] into the prefix. If the digits of N sum to S, add 1.',
  },
  java, python,
  algorithm: [
    'free[0][0] = 1; free[r][t] = Σ over first digit d of free[r−1][t−d]',
    'Walk the digits of N with a running prefix sum',
    'At position i, for each digit d < N[i]: add free[L−1−i][S − prefix − d]',
    'Add N[i] to the prefix; stop early if the prefix exceeds S',
    'Add 1 if the digits of N themselves sum to S',
  ],
  complexity: [{ label: 'Time', value: 'O(L · S · 10)' }, { label: 'Space', value: 'O(L · S)' }],
  why: 'Every x ≤ N either equals N or first differs from it at one position where its digit is smaller; these groups are disjoint and exhaustive. Inside a group the prefix is fixed, the chosen digit is fixed, and the remaining digits are completely free, so the group size is a pure lookup in the free-suffix table, which depends only on how many digits remain and the sum still needed. The table itself is a standard counting DP with a ten-way sum per cell.',
};
