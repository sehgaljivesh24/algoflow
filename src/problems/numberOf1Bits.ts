import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { bitHeads, bitRow, parseInt1, parseParts } from './ssbShared.ts';

interface In { n: number }

const W = 12;
const blank = (): Cell[] => Array.from({ length: W }, (_, c) => ({ key: c, value: '·', state: 'dim' as const }));
const colOfBit = (p: number) => W - 1 - p;

function build({ n: n0 }: In): Step[] {
  const steps: Step[] = [];
  let n = n0;
  let count = 0;
  const vars = (nn: number | string, prev: number | string) => ({ n: nn, 'n-1': prev, count });

  const grid = (rows: [Cell[], Cell[], Cell[]], heads: [string, string, string]) => ({ kind: 'grid' as const, rows, rowHeads: heads, colHeads: bitHeads(W) });

  steps.push({
    title: 'Start', tag: 'READY —', note: 'count = 0', desc: `n = ${n} = ${n.toString(2)}₂. Count its 1 bits (the "Hamming weight"): the loop will run once per 1.`,
    scene: grid([bitRow(n, W), blank(), blank()], [`n=${n}`, 'n−1', 'n&(n−1)']), vars: vars(n, '—'),
    logic: 'Instead of testing all 12 bits, Brian Kernighan’s trick clears one set bit per loop, so the loop runs exactly as many times as there are 1s.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  while (n !== 0) {
    const low = Math.log2(n & -n);
    const prev = n - 1;
    steps.push({
      title: `Compute n − 1 = ${prev}`, tag: 'SUBTRACT —', note: `n − 1 = ${n} − 1 = ${prev}  (${prev.toString(2)})`,
      desc: `${n.toString(2)} − 1 = ${prev.toString(2)}: the lowest 1 (bit ${low}) becomes 0 and every 0 below it becomes 1. Purple bits changed.`,
      scene: grid([bitRow(n, W, undefined, (c) => (c === colOfBit(low) ? 'compare' : undefined)), bitRow(prev, W, undefined, (c) => (c >= colOfBit(low) ? 'swap' : undefined)), blank()], [`n=${n}`, `n−1=${prev}`, 'n&(n−1)']),
      vars: vars(n, prev),
      logic: 'n and n − 1 agree on every bit above the lowest set bit, and disagree on that bit and everything below it.', logicTone: 'info', javaLines: [2, 3], pyLines: [2, 3], algoStep: 1,
    });
    const next = n & prev;
    count++;
    steps.push({
      title: `n & (n − 1) = ${next}`, tag: 'CLEAR —', note: `n = ${n} & ${prev} = ${next}; count = ${count}`,
      desc: `${n.toString(2)} & ${prev.toString(2)} = ${next.toString(2)}: the lowest 1 is wiped out → count = ${count}${next === 0 ? ', n = 0 so the loop ends' : ''}.`,
      scene: grid([bitRow(n, W, undefined, (c) => (c === colOfBit(low) ? 'compare' : undefined)), bitRow(prev, W), bitRow(next, W, undefined, (c) => (c === colOfBit(low) ? 'found' : undefined))], [`n=${n}`, `n−1=${prev}`, `&=${next}`]),
      vars: vars(next, prev),
      logic: next === 0 ? 'n is now 0: no 1 bits are left, so the loop ends.' : `One 1 bit removed; ${next.toString(2).split('1').length - 1} remain.`, logicTone: 'success', javaLines: [3, 4], pyLines: [3, 4], algoStep: 2,
    });
    n = next;
  }

  steps.push({
    title: `Answer = ${count}`, tag: '✅ Done!', note: `return ${count}`, desc: `${n0} = ${n0.toString(2)}₂ has ${count} bit${count === 1 ? '' : 's'} set to 1 (the loop ran ${count} time${count === 1 ? '' : 's'}).`,
    scene: grid([bitRow(n0, W, 'found'), blank(), blank()], [`n=${n0}`, 'n−1', 'n&(n−1)']), vars: vars(0, '—'),
    logic: `The loop ran ${count} time${count === 1 ? '' : 's'}, once per set bit.`, logicTone: 'success', javaLines: [6], pyLines: [5], algoStep: 3,
    result: { title: String(count), text: `${n0} has ${count} set bit${count === 1 ? '' : 's'}` },
  });
  return steps;
}

export const numberOf1Bits: ProblemDef<In> = {
  slug: '191-number-of-1-bits', id: '191', title: 'Number of 1 Bits', difficulty: 'Easy', category: 'Bit Manipulation', tag: 'n & (n-1)',
  statement: 'Given a non-negative integer, return how many of its binary digits are 1 (its Hamming weight).',
  constraints: '1 ≤ n < 2³¹ (animation input: 0 to 4095 so the 12 bits stay readable)',
  examples: [
    { label: 'n = 11', input: { n: 11 }, output: '3' },
    { label: 'n = 128', input: { n: 128 }, output: '1' },
    { label: 'n = 2205', input: { n: 2205 }, output: '6' },
  ],
  inputPlaceholder: 'e.g. 11',
  parseInput: (raw) => ({ n: parseInt1(parseParts(raw, 1, 'a whole number — e.g. 11')[0], 0, 4095, 'n') }), buildSteps: build, viz: 'cells',
  legend: [{ label: 'Lowest set bit of n', state: 'compare' }, { label: 'Bits flipped by n − 1', state: 'swap' }, { label: 'Bit cleared / answer bits', state: 'found' }],
  varLabels: ['n', 'n-1', 'count'],
  emphasis: ['how many', 'binary digits', 'Hamming weight'],
  phases: [
    { icon: '🏁', label: 'Phase 1: Start count = 0', tone: 'blue' },
    { icon: '➖', label: 'Phase 2: Compute n − 1', tone: 'cyan' },
    { icon: '✂', label: 'Phase 3: n & (n − 1), count++', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Clear the lowest set bit, count the clears',
    text: 'n & (n − 1) removes exactly the lowest 1 bit of n. Repeat until n becomes 0 and count the repetitions: that is the number of 1 bits.',
  },
  java: [
    'public int hammingWeight(int n) {',
    '    int count = 0;',
    '    while (n != 0) {',
    '        n &= (n - 1);',
    '        count++;',
    '    }',
    '    return count;',
    '}',
  ],
  python: [
    'def hamming_weight(n):',
    '    count = 0',
    '    while n:',
    '        n &= n - 1',
    '        count += 1',
    '    return count',
  ],
  algorithm: [
    'Set count = 0',
    'While n ≠ 0, compute n − 1: it flips the lowest 1 and the zeros below it',
    'n = n & (n − 1) wipes out that lowest 1; count++',
    'Return count',
  ],
  complexity: [{ label: 'Time', value: 'O(number of set bits)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Write n as (prefix) 1 000…0. Then n − 1 is (prefix) 0 111…1, so n & (n − 1) is (prefix) 0 000…0: exactly one 1 bit disappears and nothing else changes. After k such steps n is 0, where k is the popcount.',
};
