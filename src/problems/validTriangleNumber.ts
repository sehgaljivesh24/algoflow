import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { ptr } from './pack1Kit.ts';
import { parseInts } from './stepKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  return { nums: parseInts(raw, { what: 'the side lengths', example: '2 2 3 4', minLen: 1, maxLen: 12, lo: 0, hi: 30 }) };
}

function build({ nums }: In): Step[] {
  const n = nums.length;
  const order = nums.map((_, k) => k).sort((a, b) => nums[a] - nums[b] || a - b);
  const s = order.map((k) => nums[k]);
  const steps: Step[] = [];
  let count = 0;
  let k = -1;
  let l = -1;
  let r = -1;
  let hit: number[] = [];

  const cells = (): Cell[] =>
    s.map((value, p) => {
      let state: CellState | undefined;
      if (hit.includes(p)) state = 'found';
      else if (p === k) state = 'active';
      else if (p === l || p === r) state = 'compare';
      else if (k >= 0 && p > k) state = 'dim';
      return { key: order[p], value, state };
    });
  const ptrs = () => (k < 0 ? [] : [ptr('k', 'k', k, 'purple'), ...(l >= 0 && l < r ? [ptr('l', 'l', l, 'blue'), ptr('r', 'r', r, 'orange')] : [])]);
  const vars = () => ({ k: k >= 0 ? k : '—', l: l >= 0 ? l : '—', r: r >= 0 ? r : '—', count });
  const add = (title: string, desc: string, logic: string, tone: 'info' | 'warn' | 'success', jl: number[], pl: number[], algo: number, x: Partial<Step> = {}) =>
    steps.push({ title, desc, cells: cells(), pointers: ptrs(), vars: vars(), logic, logicTone: tone, javaLines: jl, pyLines: pl, algoStep: algo, ...x });

  steps.push({
    title: 'Start', tag: 'SETUP —', desc: `Count the triples of sticks in [${nums.join(', ')}] that can form a triangle: the two shorter sides must add up to more than the longest.`,
    cells: nums.map((value, p) => ({ key: p, value })), pointers: [], vars: vars(), logic: 'Checking all triples is O(n³). If the sticks are sorted, the longest side is simply the rightmost one of a triple, and one inequality decides validity.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, note: 'count = 0',
  });
  add('Sort the lengths', `Sorted: [${s.join(', ')}]. For a triple a ≤ b ≤ c only a + b > c matters (the other two inequalities hold automatically).`,
    'Sorting reduces three triangle inequalities to one.', 'info', [1, 2], [1, 2], 0, { tag: 'SORT —', note: `Arrays.sort → [${s.join(', ')}]` });

  for (k = n - 1; k >= 2; k--) {
    l = 0;
    r = k - 1;
    hit = [];
    add(`Fix the longest side s[${k}] = ${s[k]}`, `k = ${k}: longest side ${s[k]}. Count pairs (l, r) among the ${plural(k, 'shorter stick')} with s[l] + s[r] > ${s[k]}, starting at l = ${l}, r = ${r}.`,
      'Sweep l from the far left and r from just left of k.', 'info', [3, 4], [3, 4], 1, { tag: 'FIX k —', note: `k = ${k}, l = 0, r = ${r}` });
    while (l < r) {
      const sum = s[l] + s[r];
      if (sum > s[k]) {
        const before = count;
        count += r - l;
        hit = [];
        for (let p = l; p <= r; p++) hit.push(p);
        add(`${s[l]} + ${s[r]} = ${sum} > ${s[k]}: add ${r - l}`, `${s[l]} + ${s[r]} = ${sum} > ${s[k]}, so all ${plural(r - l, 'stick')} from l to r−1 pair with s[${r}] = ${s[r]}: count ${before} → ${count}. Then r moves to ${r - 1}.`,
          'Sorted order means that if the smallest partner works, all bigger ones do too, so a whole block is counted in O(1).', 'success', [6, 7, 8], [6, 7, 8], 2,
          { tag: 'COUNT —', note: `count += ${r} − ${l} = ${r - l} → ${count}` });
        hit = [];
        r--;
      } else {
        add(`${s[l]} + ${s[r]} = ${sum} ≤ ${s[k]}: l moves right`, `${s[l]} + ${s[r]} = ${sum} ≤ ${s[k]}: ${s[l]} is too short even with the biggest remaining partner ${s[r]}, so l moves from ${l} to ${l + 1}.`,
          'l is the bottleneck: it can never form a triangle with any r at or left of the current one, so skip it for good.', 'warn', [9, 10], [9, 10], 3,
          { tag: 'MOVE l —', alert: `${s[l]} + ${s[r]} = ${sum} does not beat ${s[k]}, so ${s[l]} cannot be a side with anything up to r. Discard it for this k.`, note: `${sum} ≤ ${s[k]} → l++ (l = ${l + 1})` });
        l++;
      }
    }
  }

  k = -1; l = -1; r = -1; hit = [];
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `Every longest side has been swept: ${count} triple${count === 1 ? '' : 's'} can form a triangle.`, cells: cells(), pointers: [], vars: vars(),
    logic: 'For each longest side one two-pointer sweep: O(n²) in total after sorting.', logicTone: 'success', javaLines: [14], pyLines: [11], algoStep: 4,
    note: `return count = ${count}`,
    result: { title: String(count), text: `${count} valid triangles` },
  });
  return steps;
}

export const validTriangleNumber: ProblemDef<In> = {
  slug: '611-valid-triangle-number',
  id: '611', title: 'Valid Triangle Number', difficulty: 'Medium', category: 'Arrays', tag: 'sort + two pointers, counting',
  statement: 'Given an array of non-negative stick lengths, count the triples (by index) that can be the three sides of a triangle with positive area. Three lengths a ≤ b ≤ c qualify when a + b > c.',
  constraints: '1 ≤ n ≤ 1000, 0 ≤ nums[i] ≤ 1000 (animation input: up to 12 lengths from 0 to 30)',
  examples: [
    { label: '2 2 3 4', input: { nums: [2, 2, 3, 4] }, output: '3' },
    { label: '4 2 3 4', input: { nums: [4, 2, 3, 4] }, output: '4' },
    { label: '1 1 3 5 6 7', input: { nums: [1, 1, 3, 5, 6, 7] }, output: '4' },
  ],
  inputPlaceholder: 'e.g. 2 2 3 4',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Longest side k', state: 'active' }, { label: 'l and r', state: 'compare' }, { label: 'Block of valid partners', state: 'found' }, { label: 'Already used as k', state: 'dim' }],
  varLabels: ['k', 'l', 'r', 'count'],
  emphasis: ['triangle', 'a + b > c'],
  phases: [
    { icon: '🔀', label: 'Sort the lengths', tone: 'blue' },
    { icon: '📌', label: 'Fix longest side k', tone: 'cyan' },
    { icon: '🧮', label: 'Count a block of pairs', tone: 'gold' },
    { icon: '➡️', label: 'Move l right', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Fix the longest side, count pairs in blocks',
    text: 'Sort. For k from the right, let l = 0 and r = k − 1. If s[l] + s[r] > s[k] then every index from l to r − 1 pairs with r, so add r − l and move r left. Otherwise s[l] is too small for anything to the left of r too, so move l right.',
  },
  java: [
    'public int triangleNumber(int[] nums) {',
    '    Arrays.sort(nums);',
    '    int count = 0;',
    '    for (int k = nums.length - 1; k >= 2; k--) {',
    '        int l = 0, r = k - 1;',
    '        while (l < r) {',
    '            if (nums[l] + nums[r] > nums[k]) {',
    '                count += r - l;',
    '                r--;',
    '            } else {',
    '                l++;',
    '            }',
    '        }',
    '    }',
    '    return count;',
    '}',
  ],
  python: [
    'def triangle_number(nums):',
    '    nums.sort()',
    '    count = 0',
    '    for k in range(len(nums) - 1, 1, -1):',
    '        l, r = 0, k - 1',
    '        while l < r:',
    '            if nums[l] + nums[r] > nums[k]:',
    '                count += r - l',
    '                r -= 1',
    '            else:',
    '                l += 1',
    '    return count',
  ],
  algorithm: [
    'Sort the lengths; the largest element of each triple is its longest side',
    'Fix k from the right and set l = 0, r = k − 1',
    'If s[l] + s[r] > s[k], all of l..r−1 pair with r: add r − l and move r left',
    'Otherwise move l right; when l meets r go to the next k',
    'After the last k, return the count',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(1)' }],
  why: 'In sorted order, s[l] + s[r] > s[k] implies s[l+1..r−1] + s[r] > s[k] as well, so one comparison settles r − l pairs at once. If it fails, s[l] cannot work with r or with anything smaller than r, so it is permanently useless for this k. Each sweep moves l or r each time, giving O(n) per k.',
};
