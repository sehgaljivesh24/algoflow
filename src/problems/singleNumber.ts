import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { bitHeads, bitRow, bitStr, parseNums } from './ssbShared.ts';

interface In { nums: number[] }

const W = 6;

export function parseSingle(raw: string, copies: number, extra: number, maxLen: number): number[] {
  const nums = parseNums(raw, { maxLen, lo: 0, hi: 63 });
  const count = new Map<number, number>();
  for (const v of nums) count.set(v, (count.get(v) ?? 0) + 1);
  const singles = [...count.values()].filter((c) => c === 1).length;
  const others = [...count.values()].filter((c) => c !== 1 && c !== copies).length;
  if (singles !== extra || others > 0) {
    throw new Error(`Every value must appear exactly ${copies} times except ${extra === 1 ? 'one value that appears once' : `${extra} values that appear once`}`);
  }
  return nums;
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let xor = 0;

  const grid = (done: number, cur: number | undefined, flipped = 0, final = false) => {
    const rows: Cell[][] = nums.map((v, i) => {
      const state: CellState | undefined = i === cur ? 'compare' : i >= done && cur !== i ? 'dim' : undefined;
      return bitRow(v, W, state);
    });
    rows.push(bitRow(xor, W, final ? 'found' : undefined, (c) => (flipped >> (W - 1 - c)) & 1 ? 'swap' : undefined));
    return { kind: 'grid' as const, rows, rowHeads: [...nums.map((v) => String(v)), 'XOR'], colHeads: bitHeads(W) };
  };
  const vars = (i: number | string, x: number | string) => ({ i, x, xor });

  steps.push({
    title: 'Start', tag: 'READY —', note: 'xor = 0', desc: `Every value appears twice except one. Keep a running XOR, starting at 0 (all bits off).`,
    scene: grid(0, undefined), vars: vars('—', '—'),
    logic: 'XOR is 1 only where two bits differ, so x ^ x = 0 and x ^ 0 = x. Equal pairs will wipe each other out, whatever the order.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  for (let i = 0; i < n; i++) {
    const before = xor;
    xor ^= nums[i];
    steps.push({
      title: `XOR with nums[${i}] = ${nums[i]}`, tag: nums.indexOf(nums[i]) !== i ? 'CANCEL —' : 'FOLD —',
      desc: `${bitStr(before, W)} ^ ${bitStr(nums[i], W)} = ${bitStr(xor, W)} (${before} ^ ${nums[i]} = ${xor}). Purple bits flipped.`,
      note: `xor = ${before} ^ ${nums[i]} = ${xor}`,
      scene: grid(i, i, before ^ xor), vars: vars(i, nums[i]),
      logic: nums.indexOf(nums[i]) !== i ? `${nums[i]} already appeared earlier, so this XOR cancels its first copy.` : 'First sighting of this value: its bits are folded into the accumulator.', logicTone: 'info',
      javaLines: [2, 3], pyLines: [2, 3], algoStep: 1,
    });
  }

  steps.push({
    title: `Answer = ${xor}`, tag: '✅ Done!', note: `return ${xor}`, desc: `Every paired value cancelled to 0, leaving the single number ${xor} (${bitStr(xor, W)}).`,
    scene: grid(n, undefined, 0, true), vars: vars('—', '—'),
    logic: 'The remaining bit pattern in the XOR row is exactly the unpaired number.', logicTone: 'success', javaLines: [5], pyLines: [4], algoStep: 2,
    result: { title: String(xor), text: `${xor} is the number that appears once` },
  });
  return steps;
}

export const singleNumber: ProblemDef<In> = {
  slug: '136-single-number', id: '136', title: 'Single Number', difficulty: 'Easy', category: 'Bit Manipulation', tag: 'XOR cancels pairs',
  statement: 'Every element of the array appears twice except for one that appears once. Find that single element using linear time and constant extra space.',
  constraints: '1 ≤ n ≤ 3·10⁴ · n is odd (animation input: at most 11 values between 0 and 63)',
  examples: [
    { label: '[2,2,1]', input: { nums: [2, 2, 1] }, output: '1' },
    { label: '[4,1,2,1,2]', input: { nums: [4, 1, 2, 1, 2] }, output: '4' },
    { label: '[7,3,5,5,3,9,9]', input: { nums: [7, 3, 5, 5, 3, 9, 9] }, output: '7' },
  ],
  inputPlaceholder: 'e.g. 4 1 2 1 2',
  parseInput: (raw) => ({ nums: parseSingle(raw, 2, 1, 11) }), buildSteps: build, viz: 'cells',
  legend: [{ label: 'Number being XORed', state: 'compare' }, { label: 'Bit just flipped', state: 'swap' }, { label: 'Final answer', state: 'found' }, { label: 'Not processed yet', state: 'dim' }],
  varLabels: ['i', 'x', 'xor'],
  emphasis: ['appears twice', 'appears once', 'linear time', 'constant extra space'],
  phases: [
    { icon: '🏁', label: 'Phase 1: Start xor = 0', tone: 'blue' },
    { icon: '⊕', label: 'Phase 2: XOR each number', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'XOR everything; pairs cancel',
    text: 'XOR is commutative and associative, x ^ x = 0 and x ^ 0 = x. XOR all numbers together: each pair cancels itself and only the unpaired value survives.',
  },
  java: [
    'public int singleNumber(int[] nums) {',
    '    int xor = 0;',
    '    for (int x : nums) {',
    '        xor ^= x;',
    '    }',
    '    return xor;',
    '}',
  ],
  python: [
    'def single_number(nums):',
    '    xor = 0',
    '    for x in nums:',
    '        xor ^= x',
    '    return xor',
  ],
  algorithm: [
    'Start with xor = 0',
    'For each number, xor ^= number',
    'Return xor: all pairs have cancelled',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Look at one bit column at a time: XOR gives 1 exactly when the number of 1s in that column is odd. Paired values contribute an even count to every column, so only the unpaired value decides each bit, and the XOR equals it.',
};
