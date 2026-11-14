import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { bitHeads, bitRow, parseInt1, parseParts } from './ssbShared.ts';

interface In { a: number; b: number }

const W = 12;
const M = (1 << W) - 1;
const signed = (x: number) => (x >= 1 << (W - 1) ? x - (1 << W) : x);
const blank = (): Cell[] => Array.from({ length: W }, (_, c) => ({ key: c, value: '·', state: 'dim' as const }));

function parse(raw: string): In {
  const [x, y] = parseParts(raw, 2, 'a ; b — e.g. 5 ; 3');
  return { a: parseInt1(x, -500, 500, 'a'), b: parseInt1(y, -500, 500, 'b') };
}

function build(inp: In): Step[] {
  const steps: Step[] = [];
  let a = inp.a & M;
  let b = inp.b & M;
  let sum: number | string = '—';
  let carry: number | string = '—';
  const vars = () => ({ a: signed(a), b: signed(b), 'a ^ b': typeof sum === 'number' ? signed(sum) : sum, carry: typeof carry === 'number' ? signed(carry) : carry });
  const grid = (rows: Cell[][], heads: string[]) => ({ kind: 'grid' as const, rows, rowHeads: heads, colHeads: bitHeads(W) });
  const heads = (withTail: boolean) => [`a=${signed(a)}`, `b=${signed(b)}`, withTail && typeof sum === 'number' ? `a^b=${signed(sum)}` : 'a^b', withTail && typeof carry === 'number' ? `carry=${signed(carry)}` : 'carry'];

  steps.push({
    title: 'Start', tag: 'START —', desc: `Add ${inp.a} and ${inp.b} without + or −, using only bit operations on 12-bit two’s complement numbers (Java uses 32 bits, same idea).`,
    scene: grid([blank(), blank(), blank(), blank()], heads(false)), vars: vars(),
    logic: 'Binary addition = XOR (the sum of each column ignoring carries) plus AND shifted left (the carries). Repeat until no carry is left.', logicTone: 'info',
    javaLines: [0], pyLines: [0, 1], algoStep: 0, note: `a = ${inp.a}, b = ${inp.b}`,
  });
  steps.push({
    title: 'Write both numbers as bits', tag: 'ENCODE:', desc: `a = ${signed(a)} and b = ${signed(b)} are laid out as 12 bit columns, most significant bit on the left.`,
    scene: grid([bitRow(a, W), bitRow(b, W), blank(), blank()], heads(false)), vars: vars(),
    logic: 'Seeing the bits makes the column sums and carries visible.', logicTone: 'info',
    javaLines: [0], pyLines: [0, 1], algoStep: 0, note: `a = ${signed(a)}, b = ${signed(b)}`,
  });

  let guard = 0;
  let pass = 0;
  while (b !== 0 && guard++ < 40) {
    pass++;
    steps.push({
      title: `Pass ${pass}: b is not zero`, tag: 'CHECK:', desc: `b = ${signed(b)} is not 0, so carries are still pending: run pass ${pass}.`,
      scene: grid([bitRow(a, W), bitRow(b, W), blank(), blank()], heads(false)), vars: vars(),
      logic: 'The loop keeps going while any carry bit is left in b.', logicTone: 'info',
      javaLines: [1], pyLines: [2], algoStep: 1, note: `${signed(b)} ≠ 0 → loop`,
    });
    const both = a & b;
    carry = ((a & b) << 1) & M;
    steps.push({
      title: 'Carries: (a & b) << 1', tag: 'CARRY:',
      desc: both ? `columns where a and b are both 1 carry left: (a & b) << 1 = ${signed(carry)}.` : `no column has two 1s, so (a & b) << 1 = 0: nothing to carry.`,
      scene: grid([
        bitRow(a, W, undefined, (c) => ((both >> (W - 1 - c)) & 1 ? 'compare' : undefined)),
        bitRow(b, W, undefined, (c) => ((both >> (W - 1 - c)) & 1 ? 'compare' : undefined)),
        blank(),
        bitRow(carry, W, undefined, (c) => (((carry as number) >> (W - 1 - c)) & 1 ? 'swap' : undefined)),
      ], heads(true)),
      vars: vars(), logic: both ? 'Columns where both bits are 1 (yellow) produce a carry into the next column to the left.' : 'No column has two 1s, so there is nothing to carry: the XOR is already the sum.', logicTone: 'info',
      javaLines: [2], pyLines: [3], algoStep: 2, note: `(${signed(a)} & ${signed(b)}) << 1 = ${signed(carry)}`,
    });
    sum = (a ^ b) & M;
    steps.push({
      title: 'Sum without carry: a ^ b', tag: 'XOR:', desc: `a ^ b adds each column ignoring carries: ${signed(a)} ^ ${signed(b)} = ${signed(sum)}.`,
      scene: grid([bitRow(a, W), bitRow(b, W), bitRow(sum, W, 'found'), bitRow(carry, W, undefined, (c) => (((carry as number) >> (W - 1 - c)) & 1 ? 'swap' : undefined))], heads(true)),
      vars: vars(), logic: 'XOR is 1 exactly where the two bits differ, which is the column sum with the carry dropped.', logicTone: 'info',
      javaLines: [3], pyLines: [4], algoStep: 3, note: `${signed(a)} ^ ${signed(b)} = ${signed(sum)}`,
    });
    const prevA = signed(a);
    const prevB = signed(b);
    a = sum;
    b = carry;
    sum = '—';
    carry = '—';
    steps.push({
      title: b === 0 ? 'Carry is zero' : 'Feed the carry back in', tag: 'FEED:',
      desc: b === 0 ? `a = ${signed(a)} and b = 0: no carries remain, so a already holds the sum.` : `a = ${signed(a)}, b = carry = ${signed(b)}: add these two the same way next pass.`,
      scene: grid([bitRow(a, W, b === 0 ? 'found' : undefined), bitRow(b, W), blank(), blank()], heads(false)), vars: vars(),
      logic: b === 0 ? 'The loop condition b != 0 is about to fail.' : 'The carry may itself create new carries, so we loop. Each pass pushes the carries at least one column left, so at most 12 passes are needed here.', logicTone: b === 0 ? 'success' : 'info',
      javaLines: [3, 4], pyLines: [4, 5], algoStep: 4, note: `a = ${signed(a)}, b = ${signed(b)} (was ${prevA}, ${prevB})`,
    });
  }

  const out = signed(a);
  steps.push({
    title: 'b is zero: stop', tag: 'CHECK:', desc: `b = 0, so the loop ends after ${pass} pass${pass === 1 ? '' : 'es'}; a = ${out} is the answer.`,
    scene: grid([bitRow(a, W, 'found'), bitRow(b, W), blank(), blank()], heads(false)), vars: vars(),
    logic: 'When b is 0 the value left in a is the sum (read as a signed number).', logicTone: 'success',
    javaLines: [1, 5], pyLines: [2], algoStep: 1, note: '0 ≠ 0 → false, exit loop',
  });
  steps.push({
    title: `Answer = ${out}`, tag: '✅ Done!', desc: `${inp.a} + ${inp.b} = ${out}, computed with XOR and AND only.`,
    scene: grid([bitRow(a, W, 'found'), bitRow(b, W), blank(), blank()], heads(false)), vars: vars(),
    logic: 'a + b = (a ^ b) + ((a & b) << 1) at every pass, so the final a equals the original sum.', logicTone: 'success', javaLines: [6], pyLines: [6], algoStep: 5,
    note: `${inp.a} + ${inp.b} = ${out}`,
    result: { title: String(out), text: `${inp.a} + ${inp.b} = ${out}` },
  });
  return steps;
}

export const sumOfTwoIntegers: ProblemDef<In> = {
  slug: '371-sum-of-two-integers', id: '371', title: 'Sum of Two Integers', difficulty: 'Medium', category: 'Bit Manipulation', tag: 'XOR + carry',
  statement: 'Return the sum of two integers a and b without using the + or − operators.',
  constraints: '−1000 ≤ a, b ≤ 1000 (animation input: −500 to 500, shown in 12-bit two’s complement)',
  examples: [
    { label: 'a = 1, b = 2', input: { a: 1, b: 2 }, output: '3' },
    { label: 'a = 13, b = 11', input: { a: 13, b: 11 }, output: '24' },
    { label: 'a = −5, b = 3', input: { a: -5, b: 3 }, output: '−2' },
  ],
  inputPlaceholder: 'e.g. 13 ; 11',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Both bits 1 (carry source)', state: 'compare' }, { label: 'Carry bits', state: 'swap' }, { label: 'Sum / result bits', state: 'found' }],
  varLabels: ['a', 'b', 'a ^ b', 'carry'],
  approach: {
    title: 'XOR adds without carry, AND finds the carry',
    text: 'In every bit column, a ^ b is the sum bit ignoring carry, and (a & b) << 1 is the carry that moves to the next column. Replace a with the XOR and b with the carry, and repeat until the carry is 0.',
  },
  java: [
    'public int getSum(int a, int b) {',
    '    while (b != 0) {',
    '        int carry = (a & b) << 1;',
    '        a = a ^ b;',
    '        b = carry;',
    '    }',
    '    return a;',
    '}',
  ],
  python: [
    'def get_sum(a, b):',
    '    MASK = 0xFFFFFFFF',
    '    while b != 0:',
    '        carry = ((a & b) << 1) & MASK',
    '        a = (a ^ b) & MASK',
    '        b = carry',
    '    return a if a <= 0x7FFFFFFF else ~(a ^ MASK)',
  ],
  phases: [
    { icon: '🔢', label: 'Write a and b as bits', tone: 'blue' },
    { icon: '🔍', label: 'Check b ≠ 0', tone: 'cyan' },
    { icon: '🧮', label: 'Carries (a & b) << 1', tone: 'orange' },
    { icon: '➕', label: 'XOR a ^ b', tone: 'green' },
    { icon: '🔁', label: 'Feed carry back', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['without using the + or − operators'],
  algorithm: [
    'Write a and b as bit columns',
    'While b ≠ 0, run a pass; when b is 0 stop',
    'Find the carries: (a & b) << 1',
    'Add without carry: a ^ b',
    'Make the XOR the new a and the carries the new b, then loop',
    'Done: a holds the sum',
  ],
  complexity: [{ label: 'Time', value: 'O(bit width)' }, { label: 'Space', value: 'O(1)' }],
  why: 'a + b = (a ^ b) + ((a & b) << 1) always holds: XOR is the column sum with carries dropped, and the AND shifted left is exactly the carries. Each iteration moves every carry at least one column left, so after at most the bit width of iterations no carry remains. Two’s complement makes it work for negatives too.',
};
