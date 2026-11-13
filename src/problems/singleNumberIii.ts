import type { Cell, CellState, ProblemDef, Step, Tone } from '../engine/types.ts';
import { bitHeads, bitRow, bitStr, parseNums } from './ssbShared.ts';

interface In { nums: number[] }

const W = 6;

function parse(raw: string): In {
  const nums = parseNums(raw, { maxLen: 10, lo: 0, hi: 63 });
  const count = new Map<number, number>();
  for (const v of nums) count.set(v, (count.get(v) ?? 0) + 1);
  const vals = [...count.values()];
  if (vals.filter((c) => c === 1).length !== 2 || vals.some((c) => c !== 1 && c !== 2)) {
    throw new Error('Exactly two values must appear once; every other value must appear exactly twice (e.g. 1 2 1 3 2 5)');
  }
  return { nums };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  let all = 0;
  let a = 0;
  let b = 0;
  let diff = 0;
  const placeholder = (): Cell[] => Array.from({ length: W }, (_, c) => ({ key: c, value: '·', state: 'dim' as const }));

  interface G { done: number; cur?: number; flipped?: number; showAll?: boolean; showAB?: boolean; group?: (0 | 1 | undefined)[]; mark?: boolean; finalAB?: boolean }
  const grid = (g: G) => {
    const diffCol = diff ? W - 1 - Math.log2(diff) : -1;
    const rows: Cell[][] = nums.map((v, i) => {
      const grp = g.group?.[i];
      const tone: Tone | undefined = grp === undefined ? undefined : grp === 1 ? 'blue' : 'orange';
      const base: CellState | undefined = i === g.cur ? 'compare' : g.group ? undefined : i >= g.done ? 'dim' : undefined;
      return bitRow(v, W, base, (c) => (g.mark && c === diffCol && grp === undefined ? 'compare' : undefined), tone);
    });
    rows.push(g.showAll ? bitRow(all, W, g.mark ? 'found' : undefined, (c) => ((g.flipped ?? 0) >> (W - 1 - c)) & 1 ? 'swap' : undefined) : placeholder());
    rows.push(g.showAB ? bitRow(a, W, g.finalAB ? 'found' : undefined, undefined, g.finalAB ? undefined : 'blue') : placeholder());
    rows.push(g.showAB ? bitRow(b, W, g.finalAB ? 'found' : undefined, undefined, g.finalAB ? undefined : 'orange') : placeholder());
    const heads = bitHeads(W).map((h, c) => (c === diffCol && g.mark ? `*${h}` : h));
    return { kind: 'grid' as const, rows, rowHeads: [...nums.map(String), 'XOR all', 'A (bit=1)', 'B (bit=0)'], colHeads: heads };
  };
  const vars = (i: number | string, x: number | string) => ({ i, x, 'xor all': all, diff: diff || '—', a, b });

  steps.push({
    title: 'Start', tag: 'READY —', desc: 'Two values appear once (call them p and q); all others appear twice. Plan: XOR everything, then split the numbers into two groups that separate p from q.',
    scene: grid({ done: 0 }), vars: vars('—', '—'),
    logic: 'XOR-ing everything cancels all pairs and leaves p ^ q, which tells us where p and q differ.', logicTone: 'info', javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
    note: `xor = ${bitStr(0, W)}`,
  });
  for (let i = 0; i < n; i++) {
    const before = all;
    all ^= nums[i];
    steps.push({
      title: `XOR all: fold in nums[${i}] = ${nums[i]}`, tag: 'XOR ALL —',
      desc: `${bitStr(before, W)} ^ ${bitStr(nums[i], W)} = ${bitStr(all, W)} (${before} ^ ${nums[i]} = ${all}). Purple bits flipped.`,
      scene: grid({ done: i, cur: i, showAll: true, flipped: before ^ all }), vars: vars(i, nums[i]),
      logic: 'Pairs cancel each other, so only the two singles survive in the XOR.', logicTone: 'info', javaLines: [2], pyLines: [2, 3], algoStep: 0,
      note: `${before} ^ ${nums[i]} = ${all}  (${bitStr(all, W)})`,
    });
  }
  diff = all & -all;
  const dpos = Math.log2(diff);
  steps.push({
    title: `Pick a differing bit: diff = ${diff}`, tag: 'PICK BIT —',
    desc: `p ^ q = ${all} (${bitStr(all, W)}). Lowest 1-bit is bit ${dpos}, so diff = ${diff}: p and q differ exactly in column b${dpos}.`,
    scene: grid({ done: n, showAll: true, mark: true }), vars: vars('—', '—'),
    logic: 'x & −x isolates the lowest set bit. Splitting by this bit sends the two singles to different groups.', logicTone: 'success', javaLines: [3], pyLines: [3, 4], algoStep: 1,
    note: `${bitStr(all, W)} & ${bitStr(-all, W)} = ${bitStr(diff, W)} = ${diff}`,
  });
  const group: (0 | 1 | undefined)[] = nums.map(() => undefined);
  for (let i = 0; i < n; i++) {
    const has = (nums[i] & diff) !== 0;
    group[i] = has ? 1 : 0;
    const prev = has ? a : b;
    if (has) a ^= nums[i];
    else b ^= nums[i];
    steps.push({
      title: `nums[${i}] = ${nums[i]}: bit ${dpos} is ${has ? 1 : 0}`, tag: has ? 'GROUP A —' : 'GROUP B —',
      desc: `${nums[i]} = ${bitStr(nums[i], W)} has bit ${dpos} = ${has ? 1 : 0} → group ${has ? 'A' : 'B'}: ${has ? 'a' : 'b'} = ${prev} ^ ${nums[i]} = ${has ? a : b}.`,
      scene: grid({ done: n, cur: i, showAll: true, showAB: true, group: group.map((x, k) => (k <= i ? x : undefined)), mark: true }), vars: vars(i, nums[i]),
      logic: 'Equal numbers have equal bits, so each pair lands in the same group and cancels there.', logicTone: 'info', javaLines: has ? [5, 6] : [5, 7], pyLines: has ? [6, 7, 8] : [6, 7, 9, 10], algoStep: 2,
      note: `${nums[i]} & ${diff} = ${nums[i] & diff} → ${has ? `a = ${a}` : `b = ${b}`}`,
    });
  }
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  steps.push({
    title: `Answers: ${lo} and ${hi}`, tag: '✅ Done!', desc: `Group A XORs to ${a} and group B XORs to ${b}: the two single numbers are ${lo} and ${hi}.`,
    scene: grid({ done: n, showAll: true, showAB: true, group, mark: true, finalAB: true }), vars: vars('—', '—'),
    logic: 'Each group has exactly one unpaired value, so the single-number XOR trick finishes the job.', logicTone: 'success', javaLines: [9], pyLines: [11], algoStep: 3,
    note: `return {${a}, ${b}}`,
    result: { title: `[${lo}, ${hi}]`, text: `The two single numbers are ${lo} and ${hi}` },
  });
  return steps;
}

export const singleNumberIii: ProblemDef<In> = {
  slug: '260-single-number-iii', id: '260', title: 'Single Number III', difficulty: 'Medium', category: 'Bit Manipulation', tag: 'XOR partition',
  statement: 'In an array, exactly two elements appear once and every other element appears exactly twice. Find the two single elements (in any order) in linear time and constant extra space.',
  constraints: '2 ≤ n ≤ 3·10⁴ (animation input: at most 10 values between 0 and 63; answer shown in ascending order)',
  examples: [
    { label: '[1,2,1,3,2,5]', input: { nums: [1, 2, 1, 3, 2, 5] }, output: '[3,5]' },
    { label: '[7,4]', input: { nums: [7, 4] }, output: '[4,7]' },
    { label: '[9,12,9,12,20,5,33,5]', input: { nums: [9, 12, 9, 12, 20, 5, 33, 5] }, output: '[20,33]' },
  ],
  inputPlaceholder: 'e.g. 1 2 1 3 2 5',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Number being processed', state: 'compare' }, { label: 'Bit just flipped / differing bit column', state: 'swap' }, { label: 'Result', state: 'found' }, { label: 'Not processed yet', state: 'dim' }],
  varLabels: ['i', 'x', 'xor all', 'diff', 'a', 'b'],
  emphasis: ['exactly two elements appear once', 'linear time', 'constant extra space'],
  phases: [
    { icon: '⊕', label: 'Phase 1: XOR everything', tone: 'blue' },
    { icon: '🔍', label: 'Phase 2: Pick a differing bit', tone: 'cyan' },
    { icon: '🔀', label: 'Phase 3: Split & XOR groups', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'XOR all, then split by one differing bit',
    text: 'XOR of everything is p ^ q, the two singles combined. Any 1-bit in it is a place where p and q differ. Use the lowest one (x & −x) to split the numbers in two groups: p and q fall in different groups, pairs fall together. XOR each group to get p and q.',
  },
  java: [
    'public int[] singleNumber(int[] nums) {',
    '    int xor = 0;',
    '    for (int x : nums) xor ^= x;',
    '    int diff = xor & -xor;',
    '    int a = 0, b = 0;',
    '    for (int x : nums) {',
    '        if ((x & diff) != 0) a ^= x;',
    '        else b ^= x;',
    '    }',
    '    return new int[]{a, b};',
    '}',
  ],
  python: [
    'def single_number(nums):',
    '    xor = 0',
    '    for x in nums:',
    '        xor ^= x',
    '    diff = xor & -xor',
    '    a = b = 0',
    '    for x in nums:',
    '        if x & diff:',
    '            a ^= x',
    '        else:',
    '            b ^= x',
    '    return [a, b]',
  ],
  algorithm: [
    'XOR every number: pairs cancel, leaving x = p ^ q',
    'Isolate the lowest set bit: diff = x & −x',
    'Split the numbers by whether they have that bit; XOR each group',
    'The two group XORs are the answers',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'p ≠ q, so p ^ q has at least one 1-bit, and at that bit exactly one of p and q has a 1. Splitting by that bit puts p and q in different groups, while both copies of any pair share the same bit and stay together. Each group is then a single-number problem, solved by XOR.',
};
