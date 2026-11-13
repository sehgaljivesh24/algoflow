import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { parseInt1, parseParts, ptr } from './ssbShared.ts';

interface In { n: number }

function build({ n }: In): Step[] {
  const steps: Step[] = [];
  const ans: (number | undefined)[] = Array(n + 1).fill(undefined);
  ans[0] = 0;
  const cells = (mark: Record<number, CellState> = {}): Cell[] =>
    ans.map((v, i) => ({ key: i, value: v === undefined ? '·' : v, state: mark[i] ?? (v === undefined ? 'dim' : undefined) }));
  const vars = (i: number | string, h: number | string, last: number | string, v: number | string) => ({ i, 'i>>1': h, 'i&1': last, 'ans[i]': v });
  const bin = (x: number) => x.toString(2);

  steps.push({
    title: 'Start', tag: 'READY —', note: 'ans[0] = 0', desc: `Build ans[0..${n}] where ans[i] = number of 1 bits in i. ans[0] = 0.`,
    cells: cells({ 0: 'found' }), pointers: [], vars: vars('—', '—', '—', '—'),
    logic: 'Dropping the last bit of i (i >> 1) gives a smaller number we have already solved, so each answer needs only one lookup.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  for (let i = 1; i <= n; i++) {
    const h = i >> 1;
    const last = i & 1;
    steps.push({
      title: `i = ${i} (${bin(i)}₂): look at i >> 1 = ${h} (${bin(h)}₂)`, tag: `i = ${i} — LOOKUP`, note: `${i} >> 1 = ${h}, ans[${h}] = ${ans[h]}, ${i} & 1 = ${last}`,
      desc: `${bin(i)}₂ = ${bin(h)}₂ with a ${last} appended, so it has the 1s of ${h} (ans[${h}] = ${ans[h]}) plus ${last}.`,
      cells: cells({ [i]: 'compare', [h]: 'active' }), pointers: [ptr('i', 'i', i, 'blue'), ...(h !== i ? [ptr('h', 'i>>1', h, 'orange')] : [])], vars: vars(i, h, last, '—'),
      aux: [{ title: 'Binary view', kind: 'map', items: [`i = ${i} → ${bin(i)}`, `i >> 1 = ${h} → ${bin(h)}`, `last bit (i & 1) → ${last}`] }],
      logic: 'Reuse the answer already stored at index i >> 1.', logicTone: 'info', javaLines: [2, 3], pyLines: [2, 3], algoStep: 1,
    });
    ans[i] = (ans[h] as number) + last;
    steps.push({
      title: `ans[${i}] = ans[${h}] + ${last} = ${ans[i]}`, tag: `i = ${i} — STORE`, note: `ans[${i}] = ${ans[h]} + ${last} = ${ans[i]}`,
      desc: `ans[${i}] = ${ans[h]} + ${last} = ${ans[i]}: ${i} (${bin(i)}₂) has ${ans[i]} one${ans[i] === 1 ? '' : 's'}.`,
      cells: cells({ [i]: 'found', [h]: 'active' }), pointers: [ptr('i', 'i', i, 'blue')], vars: vars(i, h, last, ans[i] as number),
      aux: [{ title: 'Binary view', kind: 'map', items: [`i = ${i} → ${bin(i)}`, `i >> 1 = ${h} → ${bin(h)}`, `last bit (i & 1) → ${last}`], highlight: 2 }],
      logic: last ? 'The last bit is 1, so one extra set bit.' : 'The last bit is 0, so the count is unchanged.', logicTone: 'success', javaLines: [3], pyLines: [3], algoStep: 2,
    });
  }

  const out = ans as number[];
  steps.push({
    title: 'Done', tag: '✅ Done!', note: `return ans (${out.length} values)`, desc: `ans = [${out.join(', ')}]: one lookup per number, n = ${n}.`,
    cells: out.map((value, i) => ({ key: i, value, state: 'found' as const })), pointers: [], vars: vars('—', '—', '—', '—'),
    logic: 'One pass, one lookup per number: O(n) total.', logicTone: 'success', javaLines: [5], pyLines: [4], algoStep: 3,
    result: { title: `[${out.join(', ')}]`, text: `Bit counts for 0..${n}` },
  });
  return steps;
}

export const countingBits: ProblemDef<In> = {
  slug: '338-counting-bits', id: '338', title: 'Counting Bits', difficulty: 'Easy', category: 'Bit Manipulation', tag: 'DP + shift',
  statement: 'For every number i from 0 to n, count the 1 bits in its binary form and return all the counts as an array. Aim for a single O(n) pass without calling a popcount for each number.',
  constraints: '0 ≤ n ≤ 10⁵ (animation input: 0 to 16)',
  examples: [
    { label: 'n = 5', input: { n: 5 }, output: '[0,1,1,2,1,2]' },
    { label: 'n = 2', input: { n: 2 }, output: '[0,1,1]' },
    { label: 'n = 10', input: { n: 10 }, output: '[0,1,1,2,1,2,2,3,1,2,2]' },
  ],
  inputPlaceholder: 'e.g. 5',
  parseInput: (raw) => ({ n: parseInt1(parseParts(raw, 1, 'a whole number n — e.g. 5')[0], 0, 16, 'n') }), buildSteps: build, viz: 'cells',
  legend: [{ label: 'Being computed', state: 'compare' }, { label: 'Lookup source (i >> 1)', state: 'active' }, { label: 'Computed', state: 'found' }, { label: 'Not computed yet', state: 'dim' }],
  varLabels: ['i', 'i>>1', 'i&1', 'ans[i]'],
  emphasis: ['count the 1 bits', 'single O(n) pass'],
  phases: [
    { icon: '🏁', label: 'Phase 1: ans[0] = 0', tone: 'blue' },
    { icon: '🔎', label: 'Phase 2: Look up ans[i >> 1]', tone: 'cyan' },
    { icon: '💾', label: 'Phase 3: ans[i] = ans[i >> 1] + (i & 1)', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Each number reuses the answer for i >> 1',
    text: 'Right-shifting i removes its last bit, giving a smaller number whose count is already known. So ans[i] = ans[i >> 1] + (i & 1): the same 1s, plus one if the removed bit was 1.',
  },
  java: [
    'public int[] countBits(int n) {',
    '    int[] ans = new int[n + 1];',
    '    for (int i = 1; i <= n; i++) {',
    '        ans[i] = ans[i >> 1] + (i & 1);',
    '    }',
    '    return ans;',
    '}',
  ],
  python: [
    'def count_bits(n):',
    '    ans = [0] * (n + 1)',
    '    for i in range(1, n + 1):',
    '        ans[i] = ans[i >> 1] + (i & 1)',
    '    return ans',
  ],
  algorithm: [
    'Create ans of size n + 1 with ans[0] = 0',
    'For each i from 1 to n, look up ans[i >> 1]',
    'ans[i] = ans[i >> 1] + (i & 1)',
    'Return ans',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n) for the output' }],
  why: 'i in binary is (i >> 1) followed by the bit (i & 1). Appending a bit adds exactly that bit to the count of 1s. Since i >> 1 < i for i ≥ 1, its answer is always computed before it is needed.',
};
