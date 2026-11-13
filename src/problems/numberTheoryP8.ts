/** Pack p8 math / number theory problems: Count Primes (#204, sieve), Pow(x, n) (#50, fast exponentiation), Euclid's GCD & LCM. */
import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { Rec, blank, int, parts } from './p8Kit.ts';

/* ------------------------------------------------------------------ #204 Count Primes */
interface NIn { n: number }
const COLS = 10;

function build204({ n }: NIn): Step[] {
  const rec = new Rec();
  const composite = new Array<boolean>(n).fill(false);
  composite[0] = composite[1] = true; // 0 and 1 are never prime
  let crossed = 0; // multiples crossed by the sieve (not counting 0 and 1)
  let p = 0;
  const grid = (cur: number, hot: number[] = [], final = false) => {
    const rows: Cell[][] = [];
    for (let r = 0; r * COLS < n; r++) {
      rows.push(Array.from({ length: COLS }, (_, c) => {
        const v = r * COLS + c;
        if (v >= n) return blank(`b${v}`);
        let state: Cell['state'];
        if (v < 2) state = 'dim';
        else if (hot.includes(v)) state = 'swap';
        else if (v === cur) state = 'compare';
        else if (composite[v]) state = 'dim';
        else if (final) state = 'found';
        else if (p > 0 && v < p) state = 'found'; // every uncrossed value below p is a confirmed prime
        return { key: v, value: v, state };
      }));
    }
    return { kind: 'grid' as const, variant: 'matrix' as const, rows, rowHeads: rows.map((_, r) => `${r * COLS}+`) };
  };
  const remaining = () => composite.filter((c, i) => !c && i >= 2).length;
  const vars = (start: number | string) => ({ p: p || '—', 'p²': start, crossed, unmarked: remaining() });
  rec.push({ t: 'Start', d: `List 0 … ${n - 1}. 0 and 1 are not prime. Every other number starts as "maybe prime".`, scene: grid(-1), v: vars('—'), why: 'The sieve never tests divisibility. It discards numbers by crossing off multiples of primes it already trusts.', j: [0, 1, 2], p: [0, 1, 2], a: 0, tag: 'READY —', note: `composite = new boolean[${n}]; 0 and 1 are not prime` });
  for (p = 2; p * p < n; p++) {
    if (composite[p]) {
      rec.push({ t: `p = ${p}: already crossed`, d: `${p} was crossed off by a smaller prime, so it is composite and its multiples are already gone.`, scene: grid(p), v: vars(p * p), why: 'Every multiple of a composite is also a multiple of one of its prime factors, which has been processed already.', j: [3, 4], p: [4, 5], a: 1, tag: `p = ${p} — SKIP`, note: `composite[${p}] is true → continue`, alert: `${p} is already crossed off, so it is composite: nothing to sieve.` });
      continue;
    }
    const mult: number[] = [];
    for (let m = p * p; m < n; m += p) mult.push(m);
    rec.push({ t: `p = ${p} is prime: cross off ${p}², ${p}²+${p}, …`, d: `Nothing smaller crossed ${p}, so it is prime. Its multiples from ${p * p} onward (${mult.slice(0, 6).join(', ')}${mult.length > 6 ? ', …' : ''}) are composite.`, scene: grid(p, mult), v: vars(p * p), why: 'Start at p²: any smaller multiple k·p has k < p, so it contains a smaller prime factor and is already crossed.', j: [3, 4, 5], p: [4, 5, 6], a: 1, tag: `p = ${p} — PRIME`, note: `m = ${p}² = ${p * p}; m < ${n}; m += ${p}` });
    const before = crossed;
    for (const m of mult) if (!composite[m]) { composite[m] = true; crossed++; }
    rec.push({ t: `Crossed off ${mult.length} multiple${mult.length === 1 ? '' : 's'} of ${p}`, d: `${crossed - before} number${crossed - before === 1 ? ' is' : 's are'} newly crossed (${mult.length - (crossed - before)} were already gone), ${remaining()} candidates left.`, scene: grid(p), v: vars(p * p), why: 'Each composite is crossed once per distinct prime factor ≤ √n, giving n·(1/2 + 1/3 + 1/5 + …) = O(n log log n) work.', j: [5], p: [6, 7], a: 1, tag: `p = ${p} — CROSSED`, note: `+${crossed - before} crossed → ${crossed} total, ${remaining()} unmarked` });
  }
  const primes = [...Array(n).keys()].filter((i) => i >= 2 && !composite[i]);
  const last = p;
  p = 0;
  rec.push({ t: `p² ≥ ${n}: stop sieving`, d: `The next candidate is ${last}, and ${last}² = ${last * last} is not below ${n}, so nothing new can be crossed. Whatever is unmarked is prime.`, scene: grid(-1, [], true), v: vars('—'), why: 'Every composite below n has a prime factor ≤ √n, so after all primes ≤ √n have been processed no composite remains.', tone: 'success', j: [3, 7, 8], p: [4, 9], a: 2, tag: 'STOP —', note: `${last}² = ${last * last} ≥ ${n} → loop ends` });
  rec.push({ t: `Primes below ${n}: ${primes.length}`, d: primes.length ? `They are ${primes.join(', ')}.` : 'There are none.', scene: grid(-1, [], true), v: vars('—'), why: 'Counting the unmarked cells gives the answer.', tone: 'success', j: [9], p: [9], a: 3, tag: '✅ Done!', note: `count = ${primes.length}`, result: { title: String(primes.length), text: `${primes.length} primes less than ${n}` } });
  return rec.steps;
}

export const countPrimes: ProblemDef<NIn> = {
  slug: '204-count-primes', id: '204', title: 'Count Primes', difficulty: 'Medium', category: 'Math', tag: 'sieve of Eratosthenes',
  statement: 'Given an integer n, return the number of prime numbers that are strictly less than n.',
  constraints: '0 ≤ n ≤ 5·10⁶ (animation input: 2 ≤ n ≤ 60)',
  examples: [
    { label: 'n = 30', input: { n: 30 }, output: '10' },
    { label: 'n = 10', input: { n: 10 }, output: '4' },
    { label: 'n = 50', input: { n: 50 }, output: '15' },
  ],
  inputPlaceholder: 'e.g. 30', parseInput: (raw) => ({ n: int(raw, 2, 60, 'n') }), buildSteps: build204, viz: 'cells', vizTitle: 'Sieve of Eratosthenes',
  legend: [{ label: 'Prime (confirmed)', state: 'found' }, { label: 'Prime p being processed', state: 'compare' }, { label: 'Multiples being crossed now', state: 'swap' }, { label: 'Composite (crossed off) or below 2', state: 'dim' }],
  varLabels: ['p', 'p²', 'crossed', 'unmarked'],
  emphasis: ['number of prime numbers', 'strictly less than'],
  phases: [
    { icon: '📋', label: 'Phase 1: List 2 … n−1', tone: 'blue' },
    { icon: '✖', label: 'Phase 2: Cross off multiples of p', tone: 'orange' },
    { icon: '🛑', label: 'Phase 3: Stop at p² ≥ n', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Cross off multiples instead of testing divisibility', text: 'Take the smallest number not yet crossed: it must be prime. Cross off its multiples (starting at its square, because smaller ones were already crossed by smaller primes). You only need primes up to √n. What is left uncrossed is exactly the primes.' },
  java: [
    'public int countPrimes(int n) {',
    '    if (n < 3) return 0;',
    '    boolean[] composite = new boolean[n];',
    '    for (int p = 2; (long) p * p < n; p++) {',
    '        if (composite[p]) continue;',
    '        for (int m = p * p; m < n; m += p) composite[m] = true;',
    '    }',
    '    int count = 0;',
    '    for (int i = 2; i < n; i++) if (!composite[i]) count++;',
    '    return count;',
    '}',
  ],
  python: [
    'def count_primes(n):',
    '    if n < 3: return 0',
    '    composite = [False] * n',
    '    p = 2',
    '    while p * p < n:',
    '        if not composite[p]:',
    '            for m in range(p * p, n, p):',
    '                composite[m] = True',
    '        p += 1',
    '    return sum(1 for i in range(2, n) if not composite[i])',
  ],
  algorithm: ['Mark every number from 2 up as "maybe prime"', 'For each p with p² < n that is still unmarked, cross off p², p²+p, …', 'Stop once p² ≥ n: all remaining unmarked numbers are prime', 'Count the unmarked numbers'],
  complexity: [{ label: 'Time', value: 'O(n log log n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'A composite c < n has a prime factor q ≤ √c < √n. When the loop reaches q (still unmarked, so prime), c is a multiple of q and is crossed. Starting the inner loop at p² loses nothing: k·p with k < p has a smaller prime factor and was already crossed.',
};

/* ------------------------------------------------------------------- #50 Pow(x, n) */
interface PIn { x: number; n: number }
const fmt = (v: number) => (Math.abs(v) >= 1e15 || (v !== 0 && Math.abs(v) < 1e-9) ? v.toExponential(4) : String(parseFloat(v.toPrecision(6))));

function parse50(raw: string): PIn {
  const [a, b] = parts(raw, 2, 'x ; n, e.g. 2 ; 10');
  const x = Number(a);
  if (!a || !Number.isFinite(x) || x < -10 || x > 10) throw new Error('x must be a number between -10 and 10');
  const n = int(b, -20, 20, 'n');
  if (x === 0 && n <= 0) throw new Error('0 cannot be raised to a power ≤ 0');
  return { x, n };
}

function build50({ x, n }: PIn): Step[] {
  const rec = new Rec();
  const m0 = Math.abs(n);
  const bits = m0.toString(2).split('').reverse().map(Number); // LSB first
  const L = bits.length;
  const baseRow: (number | undefined)[] = Array(L + 1).fill(undefined);
  const resRow: (number | undefined)[] = Array(L + 1).fill(undefined);
  baseRow[0] = x;
  let result = 1;
  let base = x;
  const grid = (cur: number, phase: 'bit' | 'sq' | 'none' = 'none') => {
    const bitCells: Cell[] = [...bits.map((b, i) => ({ key: `b${i}`, value: b, state: i === cur && phase !== 'none' ? ('compare' as const) : i < cur ? ('dim' as const) : undefined })), { key: 'bend', value: '·', state: 'dim' as const }];
    const baseCells: Cell[] = baseRow.map((v, i) => ({ key: `s${i}`, value: v === undefined ? '?' : fmt(v), state: v === undefined ? ('dim' as const) : i === cur && phase === 'bit' ? ('compare' as const) : i === cur + 1 && phase === 'sq' ? ('swap' as const) : undefined }));
    const resCells: Cell[] = resRow.map((v, i) => ({ key: `r${i}`, value: v === undefined ? '?' : fmt(v), state: v === undefined ? ('dim' as const) : i === cur + 1 && phase === 'bit' ? ('found' as const) : undefined }));
    return { kind: 'grid' as const, variant: 'table' as const, rows: [bitCells, baseCells, resCells], rowHeads: [`bits of ${m0}`, 'x^(2^i)', 'result'], colHeads: Array.from({ length: L + 1 }, (_, i) => `i=${i}`) };
  };
  const vars = (m: number) => ({ m, result: fmt(result), base: fmt(base) });
  let m = m0;
  resRow[0] = 1;
  rec.push({ t: 'Start', d: `Compute ${fmt(x)}^${n}. Write |n| = ${m0} in binary (${bits.slice().reverse().join('')}); the bits tell which repeated squares of x to multiply together.`, scene: grid(-1), v: vars(m), why: `x^${m0} = product of x^(2^i) over the set bits i, and each x^(2^(i+1)) is just the square of x^(2^i).`, j: [0, 1, 2], p: [0, 1, 2], a: 0, tag: 'READY —', note: `m = |${n}| = ${m0}, result = 1, base = ${fmt(x)}` });
  for (let i = 0; i < L; i++) {
    const set = bits[i] === 1;
    const resBefore = result;
    if (set) result *= base;
    resRow[i + 1] = result;
    rec.push({ t: `Bit ${i} of ${m0} is ${bits[i]}`, d: set ? `Bit set: result = ${fmt(resRow[i]!)} × ${fmt(base)} = ${fmt(result)}.` : `Bit clear: result stays ${fmt(result)}.`, scene: grid(i, 'bit'), v: vars(m), why: set ? 'This power of two is part of the exponent, so its square-power joins the product.' : 'This power of two is not part of the exponent, so it is skipped.', tone: set ? 'success' : 'info', j: [3, 4], p: [3, 4, 5], a: 1, tag: set ? `BIT ${i} = 1 — MULTIPLY` : `BIT ${i} = 0 — SKIP`, note: set ? `m & 1 = 1 → result = ${fmt(resBefore)} * ${fmt(base)} = ${fmt(result)}` : `m & 1 = 0 → result stays ${fmt(result)}` });
    const baseBefore = base;
    base *= base;
    m >>= 1;
    baseRow[i + 1] = base;
    rec.push({ t: `Square the base, halve the exponent`, d: `base = ${fmt(baseRow[i]!)}² = ${fmt(base)}, m becomes ${m}.${i === L - 1 ? ' m is 0, so the loop ends (this last square is unused).' : ''}`, scene: grid(i, 'sq'), v: vars(m), why: 'Squaring doubles the exponent: x^(2^i) squared is x^(2^(i+1)). Halving m exposes the next bit.', j: [5, 6], p: [6, 7], a: 2, tag: `ROUND ${i + 1} — SQUARE`, note: `base = ${fmt(baseBefore)} * ${fmt(baseBefore)} = ${fmt(base)}; m = ${m}` });
  }
  let out = result;
  if (n < 0) {
    out = 1 / result;
    rec.push({ t: 'Negative exponent: take the reciprocal', d: `x^${n} = 1 / x^${m0} = 1 / ${fmt(result)} = ${fmt(out)}.`, scene: grid(L), v: vars(0), why: 'x^(−k) = 1 / x^k, so the loop only ever works with the absolute value of n.', j: [8], p: [8], a: 3, tag: 'INVERT —', note: `n < 0 → 1 / ${fmt(result)} = ${fmt(out)}` });
  }
  rec.push({ t: `Answer: ${fmt(out)}`, d: `${fmt(x)}^${n} = ${fmt(out)} using ${L} squarings instead of ${m0} multiplications.`, scene: grid(L), v: vars(0), why: 'The loop runs ⌊log₂|n|⌋ + 1 times, so the work is logarithmic in the exponent.', tone: 'success', j: [8], p: [8], a: 4, tag: '✅ Done!', note: `return ${fmt(out)}`, result: { title: fmt(out), text: `${fmt(x)}^${n} = ${fmt(out)}` } });
  return rec.steps;
}

export const powXN: ProblemDef<PIn> = {
  slug: '50-pow-x-n', id: '50', title: 'Pow(x, n)', difficulty: 'Medium', category: 'Math', tag: 'fast exponentiation',
  statement: 'Implement pow(x, n): raise the real number x to the integer power n (n may be negative) without calling a library power function, in far fewer than |n| multiplications.',
  constraints: '-100 < x < 100, -2³¹ ≤ n ≤ 2³¹-1 (animation input: |x| ≤ 10, |n| ≤ 20; results are rounded to 6 significant digits)',
  examples: [
    { label: '2 ; 10', input: { x: 2, n: 10 }, output: '1024' },
    { label: '2.1 ; 3', input: { x: 2.1, n: 3 }, output: '9.261' },
    { label: '2 ; -3', input: { x: 2, n: -3 }, output: '0.125' },
  ],
  inputPlaceholder: 'x ; n   e.g. 2 ; 10', parseInput: parse50, buildSteps: build50, viz: 'cells', vizTitle: 'Binary exponentiation',
  legend: [{ label: 'Bit / base in use', state: 'compare' }, { label: 'Result updated', state: 'found' }, { label: 'Newly squared base', state: 'swap' }, { label: 'Not computed yet / bit already used', state: 'dim' }],
  varLabels: ['m', 'result', 'base'],
  emphasis: ['raise the real number x to the integer power n', 'far fewer than |n| multiplications'],
  phases: [
    { icon: '🏁', label: 'Phase 1: result = 1, base = x', tone: 'blue' },
    { icon: '🔢', label: 'Phase 2: Read a bit of m', tone: 'cyan' },
    { icon: '²', label: 'Phase 3: Square base, m >>= 1', tone: 'orange' },
    { icon: '↩', label: 'Phase 4: Invert if n < 0', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Square the base, read the exponent in binary', text: 'Instead of multiplying x by itself n times, keep base = x^(2^i). Look at |n| bit by bit: when the bit is 1, multiply base into the result; always square the base and shift n right. A negative exponent just inverts at the end.' },
  java: [
    'public double myPow(double x, int n) {',
    '    long m = Math.abs((long) n);',
    '    double result = 1, base = x;',
    '    while (m > 0) {',
    '        if ((m & 1) == 1) result *= base;',
    '        base *= base;',
    '        m >>= 1;',
    '    }',
    '    return n < 0 ? 1 / result : result;',
    '}',
  ],
  python: [
    'def my_pow(x, n):',
    '    m = abs(n)',
    '    result, base = 1.0, x',
    '    while m > 0:',
    '        if m & 1:',
    '            result *= base',
    '        base *= base',
    '        m >>= 1',
    '    return 1 / result if n < 0 else result',
  ],
  algorithm: ['Start with result = 1, base = x, m = |n|', 'If the lowest bit of m is 1, multiply result by base', 'Square the base and shift m right; repeat until m = 0', 'Invert the result if n was negative', 'Return the result'],
  complexity: [{ label: 'Time', value: 'O(log |n|)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Invariant: x^|n| = result · base^m. Taking a set low bit moves one factor of base from m into result; squaring base while halving m (⌊m/2⌋ pairs of factors) keeps the product unchanged. When m = 0 the invariant says result = x^|n|.',
};

/* ------------------------------------------------------------ Euclid's GCD and LCM */
interface GIn { a: number; b: number }

function parseGcd(raw: string): GIn {
  const t = raw.split(/[\s,;]+/).filter(Boolean);
  if (t.length !== 2) throw new Error('Enter two whole numbers, e.g. 84 36');
  return { a: int(t[0], 1, 999, 'a'), b: int(t[1], 1, 999, 'b') };
}

function buildGcd({ a: a0, b: b0 }: GIn): Step[] {
  const rec = new Rec();
  const cols: { a: number; b: number; r: number }[] = [];
  let a = a0;
  let b = b0;
  const grid = (cur: number, final = false) => {
    const mk = (f: (c: { a: number; b: number; r: number }) => number, tone?: Cell['state']): Cell[] => cols.map((c, i) => ({ key: `${i}`, value: f(c), state: i === cur ? (tone ?? 'compare') : undefined }));
    const rows = cols.length ? [mk((c) => c.a), mk((c) => c.b), mk((c) => c.r, final ? 'found' : 'swap')] : [[{ key: 'e', value: '·', state: 'dim' as const }], [{ key: 'e2', value: '·', state: 'dim' as const }], [{ key: 'e3', value: '·', state: 'dim' as const }]];
    return { kind: 'grid' as const, variant: 'table' as const, rows, rowHeads: ['a', 'b', 'a mod b'], colHeads: cols.length ? cols.map((_, i) => `round ${i + 1}`) : ['—'] };
  };
  const vars = (r: number | string) => ({ a, b, 'a mod b': r });
  rec.push({ t: 'Start', d: `Find gcd(${a0}, ${b0}) with Euclid's algorithm: replace (a, b) by (b, a mod b) until the remainder is 0.`, scene: grid(-1), v: vars('—'), why: 'gcd(a, b) = gcd(b, a mod b): any common divisor of a and b also divides a − k·b, and vice versa.', j: [0, 1], p: [0, 1], a: 0, tag: 'READY —', note: `a = ${a0}, b = ${b0}` });
  while (b !== 0) {
    const r = a % b;
    cols.push({ a, b, r });
    rec.push({ t: `${a} mod ${b} = ${r}`, d: `${a} = ${Math.floor(a / b)}·${b} + ${r}. ${r === 0 ? `The remainder is 0, so ${b} divides ${a}.` : `Now continue with (${b}, ${r}).`}`, scene: grid(cols.length - 1), v: vars(r), why: r === 0 ? 'When b divides a, gcd(a, b) = b: nothing larger can divide b.' : 'The pair shrinks fast: after two rounds the larger number at least halves, so there are O(log) rounds.', j: [2, 3, 4], p: [2], a: 1, tag: `ROUND ${cols.length} —`, note: `r = ${a} % ${b} = ${r}; a = ${b}, b = ${r}` });
    a = b;
    b = r;
  }
  const g = a;
  const l = (a0 / g) * b0;
  rec.push({ t: `gcd = ${g}`, d: `b reached 0, so the gcd is the last non-zero value, a = ${g}.`, scene: grid(cols.length - 1, true), v: vars(0), why: 'Invariant: gcd(a, b) never changes between rounds, and gcd(g, 0) = g.', tone: 'success', j: [6], p: [3], a: 2, tag: 'GCD —', note: `b = 0 → return a = ${g}` });
  rec.push({ t: `lcm = ${a0} / ${g} × ${b0} = ${l}`, d: `Since gcd · lcm = a · b, the lcm is ${a0} ÷ ${g} × ${b0} = ${l}. Dividing first keeps the intermediate value small.`, scene: grid(cols.length - 1, true), v: vars(0), why: 'a·b counts every prime factor of both numbers; the gcd takes the shared ones, so a·b / gcd keeps each shared factor once, which is the lcm.', tone: 'success', j: [9], p: [5], a: 3, tag: '✅ Done!', note: `${a0} / ${g} * ${b0} = ${l}`, result: { title: `gcd ${g}, lcm ${l}`, text: `gcd(${a0}, ${b0}) = ${g} and lcm(${a0}, ${b0}) = ${l}` } });
  return rec.steps;
}

export const euclidGcdLcm: ProblemDef<GIn> = {
  slug: 'alg-euclids-gcd-and-lcm', id: 'ALG', title: "Euclid's GCD and LCM", difficulty: 'Easy', category: 'Math', tag: 'Euclid, remainders',
  statement: 'Compute the greatest common divisor of two positive integers using Euclid\'s remainder algorithm, then derive their least common multiple from it.',
  constraints: '1 ≤ a, b ≤ 10⁹ (animation input: 1 ≤ a, b ≤ 999)',
  examples: [
    { label: '180 and 114', input: { a: 180, b: 114 }, output: 'gcd 6, lcm 3420' },
    { label: '84 and 36', input: { a: 84, b: 36 }, output: 'gcd 12, lcm 252' },
    { label: '17 and 5', input: { a: 17, b: 5 }, output: 'gcd 1, lcm 85' },
    { label: '144 and 89', input: { a: 144, b: 89 }, output: 'gcd 1, lcm 12816' },
  ],
  inputPlaceholder: 'e.g. 84 36', parseInput: parseGcd, buildSteps: buildGcd, viz: 'cells', vizTitle: 'Euclid rounds',
  legend: [{ label: 'Current round', state: 'compare' }, { label: 'Remainder', state: 'swap' }, { label: 'Final round (answer)', state: 'found' }],
  varLabels: ['a', 'b', 'a mod b'],
  emphasis: ['greatest common divisor', 'least common multiple', "Euclid's remainder algorithm"],
  phases: [
    { icon: '🏁', label: 'Phase 1: Start with (a, b)', tone: 'blue' },
    { icon: '🔁', label: 'Phase 2: (a, b) → (b, a mod b)', tone: 'cyan' },
    { icon: '🎯', label: 'Phase 3: b = 0 → gcd = a', tone: 'gold' },
    { icon: '✅', label: 'Done: lcm = a / gcd × b', tone: 'green' },
  ],
  approach: { title: 'Replace the pair by (b, a mod b)', text: 'Any divisor shared by a and b also divides the remainder a mod b, so (a, b) and (b, a mod b) have the same gcd. Repeat until the remainder is 0; the other number is the gcd. The lcm follows from gcd · lcm = a · b.' },
  java: [
    'static int gcd(int a, int b) {',
    '    while (b != 0) {',
    '        int r = a % b;',
    '        a = b;',
    '        b = r;',
    '    }',
    '    return a;',
    '}',
    'static long lcm(int a, int b) {',
    '    return (long) a / gcd(a, b) * b;',
    '}',
  ],
  python: [
    'def gcd(a, b):',
    '    while b:',
    '        a, b = b, a % b',
    '    return a',
    'def lcm(a, b):',
    '    return a // gcd(a, b) * b',
  ],
  algorithm: ['Start with the pair (a, b)', 'Replace it by (b, a mod b) while b ≠ 0', 'When b = 0 the answer is a: that is the gcd', 'lcm = a / gcd × b'],
  complexity: [{ label: 'Time', value: 'O(log min(a, b))' }, { label: 'Space', value: 'O(1)' }],
  why: 'Write a = qb + r. A number divides both a and b exactly when it divides both b and r, so the set of common divisors is unchanged. The second value strictly decreases, so the process ends at (g, 0), and gcd(g, 0) = g. Two rounds at least halve the larger value, which bounds the rounds by about 2·log₂ of the input.',
};
