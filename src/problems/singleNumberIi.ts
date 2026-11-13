import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { bitHeads, bitRow } from './ssbShared.ts';
import { parseSingle } from './singleNumber.ts';

interface In { nums: number[] }

const W = 6;

function build({ nums }: In): Step[] {
  const steps: Step[] = [];
  const counts: (number | undefined)[] = Array(W).fill(undefined); // by column (0 = MSB)
  const mods: (number | undefined)[] = Array(W).fill(undefined);
  let result = 0;

  const grid = (curCol?: number, final = false) => {
    const rows: Cell[][] = nums.map((v) => bitRow(v, W, undefined, (c) => (c === curCol ? 'compare' : undefined)));
    rows.push(counts.map((v, c) => ({ key: c, value: v === undefined ? '·' : v, state: c === curCol ? 'compare' : v === undefined ? 'dim' : undefined } as Cell)));
    rows.push(mods.map((v, c) => ({
      key: c, value: v === undefined ? '·' : v,
      state: final ? (v ? 'found' : undefined) : c === curCol ? 'compare' : v === undefined ? 'dim' : v ? 'found' : undefined,
    } as Cell)));
    return { kind: 'grid' as const, rows, rowHeads: [...nums.map(String), 'ones', 'ones % 3'], colHeads: bitHeads(W) };
  };
  const vars = (bit: number | string, count: number | string, mod: number | string) => ({ bit, count, 'count % 3': mod, result });

  steps.push({
    title: 'Start', tag: 'READY —', note: 'result = 0', desc: `Every value appears three times except one. Look at each bit column separately: in a column, the tripled values contribute multiples of 3 ones.`,
    scene: grid(), vars: vars('—', '—', '—'),
    logic: 'If we count the 1s in a bit column and take the count modulo 3, only the single number is left over. That remainder is its bit.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  for (let bit = 0; bit < W; bit++) {
    const col = W - 1 - bit;
    const count = nums.filter((x) => (x >> bit) & 1).length;
    counts[col] = count;
    steps.push({
      title: `Count the 1s in bit ${bit}`, tag: `BIT ${bit} — COUNT`, note: `ones = ${count}`, desc: `Column b${bit} contains ${count} one${count === 1 ? '' : 's'} among the ${nums.length} numbers.`,
      scene: grid(col), vars: vars(bit, count, '—'),
      logic: 'Sum the bit across every number (this is the inner loop).', logicTone: 'info', javaLines: [2, 3, 4], pyLines: [2, 3], algoStep: 1,
    });
    const mod = count % 3;
    mods[col] = mod;
    if (mod) result |= 1 << bit;
    steps.push({
      title: `${count} % 3 = ${mod}`, tag: `BIT ${bit} — MOD 3`, note: mod ? `${count} % 3 = ${mod} → result |= ${1 << bit} → ${result}` : `${count} % 3 = 0 → bit stays 0`,
      desc: mod ? `${count} is not a multiple of 3, so the single number has a 1 in bit ${bit}: result |= ${1 << bit} → ${result}.` : `${count} is a multiple of 3, so the single number has a 0 in bit ${bit}.`,
      scene: grid(col), vars: vars(bit, count, mod),
      logic: mod ? 'A leftover 1 can only come from the single number.' : 'All the 1s here come in groups of three.', logicTone: mod ? 'success' : 'info',
      javaLines: [5], pyLines: [4, 5], algoStep: 2,
    });
  }

  steps.push({
    title: `Answer = ${result}`, tag: '✅ Done!', note: `return ${result}  (${mods.join('')}₂)`, desc: `The "ones % 3" row spells the single number in binary: ${mods.join('')} = ${result}.`,
    scene: grid(undefined, true), vars: vars('—', '—', '—'),
    logic: 'Reading the remainders as bits rebuilds the number that appears once.', logicTone: 'success', javaLines: [7], pyLines: [6], algoStep: 3,
    result: { title: String(result), text: `${result} is the number that appears once` },
  });
  return steps;
}

export const singleNumberIi: ProblemDef<In> = {
  slug: '137-single-number-ii', id: '137', title: 'Single Number II', difficulty: 'Medium', category: 'Bit Manipulation', tag: 'bit count mod 3',
  statement: 'Every element of the array appears exactly three times except one, which appears once. Find the element that appears once using linear time and constant extra space.',
  constraints: '1 ≤ n ≤ 3·10⁴ · n = 3k + 1 (animation input: at most 10 values between 0 and 63, so 6 bit columns)',
  examples: [
    { label: '[2,2,3,2]', input: { nums: [2, 2, 3, 2] }, output: '3' },
    { label: '[0,1,0,1,0,1,50]', input: { nums: [0, 1, 0, 1, 0, 1, 50] }, output: '50' },
    { label: '[5,5,5,12,9,9,9]', input: { nums: [5, 5, 5, 12, 9, 9, 9] }, output: '12' },
  ],
  inputPlaceholder: 'e.g. 2 2 3 2',
  parseInput: (raw) => ({ nums: parseSingle(raw, 3, 1, 10) }), buildSteps: build, viz: 'cells',
  legend: [{ label: 'Column being examined', state: 'compare' }, { label: 'Bit set in the answer', state: 'found' }, { label: 'Not examined yet', state: 'dim' }],
  varLabels: ['bit', 'count', 'count % 3', 'result'],
  emphasis: ['exactly three times', 'appears once', 'linear time', 'constant extra space'],
  phases: [
    { icon: '🏁', label: 'Phase 1: Start result = 0', tone: 'blue' },
    { icon: '🔢', label: 'Phase 2: Count ones in a column', tone: 'cyan' },
    { icon: '➗', label: 'Phase 3: count % 3 → set bit', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Count the ones in every bit column, mod 3',
    text: 'Take each bit position on its own. Numbers that appear three times add 0 or 3 to the count of ones in that column, so count % 3 is exactly the single number’s bit. Assemble those bits into the answer.',
  },
  java: [
    'public int singleNumber(int[] nums) {',
    '    int result = 0;',
    '    for (int bit = 0; bit < 32; bit++) {',
    '        int count = 0;',
    '        for (int x : nums) count += (x >> bit) & 1;',
    '        if (count % 3 != 0) result |= (1 << bit);',
    '    }',
    '    return result;',
    '}',
  ],
  python: [
    'def single_number(nums):',
    '    result = 0',
    '    for bit in range(32):',
    '        count = sum((x >> bit) & 1 for x in nums)',
    '        if count % 3:',
    '            result |= 1 << bit',
    '    return result',
  ],
  algorithm: [
    'Start with result = 0',
    'For each bit position, count how many numbers have that bit set',
    'If count % 3 ≠ 0, set that bit in result',
    'Return result',
  ],
  complexity: [{ label: 'Time', value: 'O(32 · n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'In any single bit column, each tripled value contributes either 0 or 3 ones, a multiple of 3. The single value contributes its own bit (0 or 1). So the column count mod 3 equals the single number’s bit, and doing this for every column rebuilds the number.',
};
