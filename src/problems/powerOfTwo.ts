import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { bitHeads, bitRow, parseInt1, parseParts } from './ssbShared.ts';

interface In { n: number }

const W = 12;
const blank = (): Cell[] => Array.from({ length: W }, (_, c) => ({ key: c, value: '·', state: 'dim' as const }));

function build({ n }: In): Step[] {
  const steps: Step[] = [];
  const vars = (prev: number | string, and: number | string) => ({ n, 'n-1': prev, 'n & (n-1)': and });
  const grid = (rows: [Cell[], Cell[], Cell[]], heads: [string, string, string]) => ({ kind: 'grid' as const, rows, rowHeads: heads, colHeads: bitHeads(W) });
  const pop = (x: number) => x.toString(2).split('1').length - 1;

  steps.push({
    title: 'Start', tag: 'READY —', note: `n = ${n}`, desc: `n = ${n}${n < 0 ? ' (negatives are shown in 12-bit two’s complement)' : ''}. Is it exactly 2ᵏ for some k ≥ 0?`,
    scene: grid([bitRow(n, W), blank(), blank()], [`n=${n}`, 'n−1', 'n&(n−1)']), vars: vars('—', '—'),
    logic: 'A power of two has exactly one 1 bit (1, 10, 100, 1000…). So the question is: does n have exactly one set bit?', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0,
  });

  if (n <= 0) {
    steps.push({
      title: 'n ≤ 0 is never a power of two', tag: '✅ Done!', note: `n = ${n} ≤ 0 → return false`, alert: `${n} is not positive, so it can never be 2ᵏ.`,
      desc: `${n} is not positive, and 2ᵏ is always at least 1. Answer: false.`,
      scene: grid([bitRow(n, W, 'error'), blank(), blank()], [`n=${n}`, 'n−1', 'n&(n−1)']), vars: vars('—', '—'),
      logic: n === 0 ? 'Zero has no 1 bit at all, and the n & (n − 1) test would wrongly accept it, so it must be rejected first.' : 'Negative numbers have their sign bit set and are never powers of two.', logicTone: 'warn',
      javaLines: [1], pyLines: [1, 2], algoStep: 3,
      result: { title: 'false', text: `${n} is not a power of two` },
    });
    return steps;
  }

  const prev = n - 1;
  const low = Math.log2(n & -n);
  steps.push({
    title: `n−1=${prev}`, tag: 'SUBTRACT —', note: `n − 1 = ${n} − 1 = ${prev}`, desc: `${n.toString(2)} − 1 = ${prev.toString(2)}: the lowest 1 (bit ${low}) and every 0 below it flip. Purple bits changed.`,
    scene: grid([bitRow(n, W, undefined, (c) => (c === W - 1 - low ? 'compare' : undefined)), bitRow(prev, W, undefined, (c) => (c >= W - 1 - low ? 'swap' : undefined)), blank()], [`n=${n}`, `n−1=${prev}`, 'n&(n−1)']),
    vars: vars(prev, '—'), logic: 'If n has one set bit, n − 1 is all 1s below that bit and 0 at it, so the two numbers share no 1 bits.', logicTone: 'info',
    javaLines: [2], pyLines: [3], algoStep: 1,
  });
  const and = n & prev;
  const ok = and === 0;
  steps.push({
    title: `n & (n − 1) = ${and}`, tag: 'AND —', note: `${n} & ${prev} = ${and} ${ok ? '== 0' : '≠ 0'}`, alert: ok ? undefined : `AND is ${and}, not 0: another 1 bit survives, so n is not a power of two.`,
    desc: ok ? `${n.toString(2)} & ${prev.toString(2)} = 0: no shared 1 bits, so n had a single set bit.` : `${n.toString(2)} & ${prev.toString(2)} = ${and.toString(2)} ≠ 0: n has ${pop(n)} set bits, more than one.`,
    scene: grid([bitRow(n, W), bitRow(prev, W), bitRow(and, W, ok ? 'found' : 'error')], [`n=${n}`, `n−1=${prev}`, `&=${and}`]),
    vars: vars(prev, and), logic: ok ? `${n} = 2^${low}.` : 'AND only clears the lowest set bit; since something remains, there was another 1 above it.', logicTone: ok ? 'success' : 'warn',
    javaLines: [2], pyLines: [3], algoStep: 2,
  });
  steps.push({
    title: ok ? 'Verdict: true' : 'Verdict: false', tag: '✅ Done!', note: `return (${and} == 0) = ${ok}`,
    desc: ok ? `${n} = 2^${low}: exactly one bit is set, answer true.` : `${n} has ${pop(n)} set bits, answer false.`,
    scene: grid([bitRow(n, W), bitRow(prev, W), bitRow(and, W, ok ? 'found' : 'error')], [`n=${n}`, `n−1=${prev}`, `&=${and}`]),
    vars: vars(prev, and), logic: ok ? 'The AND is zero, so n is a power of two.' : 'The AND is non-zero, so n is not a power of two.', logicTone: ok ? 'success' : 'warn',
    javaLines: [2], pyLines: [3], algoStep: 3,
    result: { title: String(ok), text: ok ? `${n} = 2^${low} is a power of two` : `${n} is not a power of two` },
  });
  return steps;
}

export const powerOfTwo: ProblemDef<In> = {
  slug: '231-power-of-two', id: '231', title: 'Power of Two', difficulty: 'Easy', category: 'Bit Manipulation', tag: 'n & (n-1) == 0',
  statement: 'Return true if the integer n can be written as 2ᵏ for some integer k ≥ 0, otherwise false. Try to avoid loops and recursion.',
  constraints: '−2³¹ ≤ n ≤ 2³¹ − 1 (animation input: −4096 to 4095)',
  examples: [
    { label: 'n = 16', input: { n: 16 }, output: 'true' },
    { label: 'n = 12', input: { n: 12 }, output: 'false' },
    { label: 'n = 0', input: { n: 0 }, output: 'false' },
    { label: 'n = 1', input: { n: 1 }, output: 'true' },
  ],
  inputPlaceholder: 'e.g. 16',
  parseInput: (raw) => ({ n: parseInt1(parseParts(raw, 1, 'a whole number — e.g. 16')[0], -4096, 4095, 'n') }), buildSteps: build, viz: 'cells',
  legend: [{ label: 'Lowest set bit', state: 'compare' }, { label: 'Bits flipped by n − 1', state: 'swap' }, { label: 'Power of two', state: 'found' }, { label: 'Not a power of two', state: 'error' }],
  varLabels: ['n', 'n-1', 'n & (n-1)'],
  emphasis: ['2ᵏ', 'true', 'false'],
  phases: [
    { icon: '🚧', label: 'Phase 1: Guard n > 0', tone: 'blue' },
    { icon: '➖', label: 'Phase 2: Compute n − 1', tone: 'cyan' },
    { icon: '✂', label: 'Phase 3: n & (n − 1)', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'A power of two has exactly one 1 bit',
    text: 'If n > 0, then n & (n − 1) clears n’s lowest set bit. The result is 0 precisely when that was the only set bit, which is the definition of a power of two.',
  },
  java: [
    'public boolean isPowerOfTwo(int n) {',
    '    if (n <= 0) return false;',
    '    return (n & (n - 1)) == 0;',
    '}',
  ],
  python: [
    'def is_power_of_two(n):',
    '    if n <= 0:',
    '        return False',
    '    return (n & (n - 1)) == 0',
  ],
  algorithm: [
    'If n ≤ 0 return false',
    'Compute n − 1 (flips the lowest 1 and the zeros below it)',
    'Compute n & (n − 1), which clears the lowest set bit',
    'Return true exactly when the result is 0',
  ],
  complexity: [{ label: 'Time', value: 'O(1)' }, { label: 'Space', value: 'O(1)' }],
  why: 'For n = (prefix) 1 000…0, n − 1 = (prefix) 0 111…1 and the AND is (prefix) 0 000…0. That is zero only if the prefix is empty, i.e. n = 100…0 = 2ᵏ. Rejecting n ≤ 0 first matters because 0 & (0 − 1) is also 0.',
};
