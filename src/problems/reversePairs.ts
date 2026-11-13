import type { Cell, CellState, Pointer, ProblemDef, Step } from '../engine/types.ts';
import { parseInts, recorder } from './stepKit.ts';
import { find } from './treeKit.ts';
import { ptr } from './ssbShared.ts';
import { treeOverArray, twoPass, type RecTree } from './recTreeKit.ts';

interface In { nums: number[] }

const java = [
  'public int reversePairs(int[] nums) {',
  '    return sort(nums, 0, nums.length - 1);',
  '}',
  'private int sort(int[] nums, int lo, int hi) {',
  '    if (lo >= hi) return 0;',
  '    int mid = lo + (hi - lo) / 2;',
  '    int count = sort(nums, lo, mid) + sort(nums, mid + 1, hi);   // pairs inside each half',
  '    int j = mid + 1;',
  '    for (int i = lo; i <= mid; i++) {                 // both halves are sorted now',
  '        while (j <= hi && (long) nums[i] > 2L * nums[j]) j++;',
  '        count += j - (mid + 1);                       // right values before j all pair with nums[i]',
  '    }',
  '    merge(nums, lo, mid, hi);                         // ordinary merge of the two sorted runs',
  '    return count;',
  '}',
];
const python = [
  'def reverse_pairs(nums):',
  '    def sort(lo, hi):',
  '        if lo >= hi:',
  '            return 0',
  '        mid = (lo + hi) // 2',
  '        count = sort(lo, mid) + sort(mid + 1, hi)     # pairs inside each half',
  '        j = mid + 1',
  '        for i in range(lo, mid + 1):                  # both halves are sorted now',
  '            while j <= hi and nums[i] > 2 * nums[j]:',
  '                j += 1',
  '            count += j - (mid + 1)                    # right values before j all pair with nums[i]',
  '        nums[lo:hi + 1] = sorted(nums[lo:hi + 1])     # merge the two sorted runs',
  '        return count',
  '    return sort(0, len(nums) - 1)',
];
const J = {
  start: find(java, 'return sort(nums, 0'),
  base: find(java, 'if (lo >= hi)'),
  split: find(java, 'int mid = lo'),
  sub: find(java, 'int count = sort'),
  count: find(java, 'int j = mid + 1', 'for (int i = lo', 'while (j <= hi', 'count += j'),
  merge: find(java, 'merge(nums, lo'),
  ret: find(java, 'return count;'),
};
const P = {
  start: find(python, 'return sort(0'),
  base: find(python, 'if lo >= hi', 'return 0'),
  split: find(python, 'mid = (lo + hi)'),
  sub: find(python, 'count = sort'),
  count: find(python, 'j = mid + 1', 'for i in range', 'while j <= hi', 'j += 1', 'count += j'),
  merge: find(python, 'nums[lo:hi + 1] = sorted'),
  ret: find(python, 'return count'),
};

function run({ nums }: In, tree: RecTree): Step[] {
  const arr = [...nums];
  const keys = arr.map((_, i) => i);
  const n = arr.length;
  const steps: Step[] = [];
  const stack: string[] = [];
  const found: string[] = [];
  const merged = arr.map(() => false);
  let lo0 = 0;
  let hi0 = n - 1;
  let marks: Record<number, CellState> = {};
  let ptrs: Pointer[] = [];
  let total = 0;
  const v: Record<string, string | number> = { lo: 0, mid: '—', hi: n - 1, i: '—', j: '—', total: 0 };

  const say = recorder(steps, () => ({
    scene: treeOverArray(
      tree.scene(),
      arr.map((value, i): Cell => ({ key: keys[i], value, state: marks[i] ?? (i < lo0 || i > hi0 ? (merged[i] ? 'found' : 'dim') : undefined) })),
      ptrs.map((p) => ({ ...p })),
    ),
    aux: [
      { title: 'recursion stack', kind: 'stack' as const, items: [...stack] },
      { title: `pairs counted per merge (total ${total})`, kind: 'list' as const, items: [...found], highlight: found.length - 1 },
    ],
    vars: { ...v },
  }));

  say({
    title: 'Start', desc: `Count pairs (i < j) with nums[i] > 2·nums[j] in ${JSON.stringify(nums)} by merge sort.`,
    logic: 'Pairs inside the left half and inside the right half are counted recursively. Only pairs with i in the left half and j in the right half remain, and sorted halves make those cheap to count.',
    java: J.start, py: P.start, algo: 0,
    tag: 'INIT', note: `sort(nums, 0, ${n - 1}) on ${JSON.stringify(nums)}`,
  });

  const sort = (lo: number, hi: number): number => {
    lo0 = lo; hi0 = hi; v.lo = lo; v.hi = hi; v.mid = '—'; v.i = '—'; v.j = '—';
    if (lo >= hi) {
      tree.leaf(`${lo}`, 'done', { call: `sort(${lo}, ${lo})` });
      return 0;
    }
    stack.push(`sort(${lo}, ${hi})`);
    const node = tree.enter(`${lo}..${hi}`, { call: `sort(${lo}, ${hi})` });
    const mid = lo + Math.floor((hi - lo) / 2);
    v.mid = mid;
    marks = Object.fromEntries(Array.from({ length: mid - lo + 1 }, (_, k) => [lo + k, 'active' as const]));
    say({
      title: `Split [${lo}..${hi}] at mid = ${mid}`, desc: `Left run [${lo}..${mid}] (blue) and right run [${mid + 1}..${hi}]. Handle each half first.`,
      logic: 'After the recursive calls both runs are sorted, which is what the counting step relies on.',
      java: J.split, py: P.split, algo: 0,
      tag: 'SPLIT', note: `mid = ${lo} + (${hi} - ${lo}) / 2 = ${mid}; sort both halves first`,
    });
    marks = {};
    let count = sort(lo, mid) + sort(mid + 1, hi);
    lo0 = lo; hi0 = hi; v.lo = lo; v.hi = hi; v.mid = mid; v.i = '—'; v.j = '—';
    let j = mid + 1;
    let level = 0;
    for (let i = lo; i <= mid; i++) {
      const j0 = j;
      while (j <= hi && arr[i] > 2 * arr[j]) j++;
      const k = j - (mid + 1);
      level += k;
      marks = {};
      for (let q = lo; q <= mid; q++) marks[q] = q === i ? 'swap' : 'active';
      for (let q = mid + 1; q < j; q++) marks[q] = 'found';
      v.i = i; v.j = j;
      ptrs = [ptr('i', 'i', i, 'blue'), ...(j <= hi ? [ptr('j', 'j', j, 'orange')] : [])];
      say({
        title: `i = ${i}: ${k} right value${k === 1 ? '' : 's'} pair${k === 1 ? 's' : ''} with ${arr[i]}`,
        desc: k === 0
          ? `nums[${i}] = ${arr[i]} is not more than twice nums[${mid + 1}] = ${arr[mid + 1]}, so j stays at ${j}.`
          : `j ${j === j0 ? 'stays' : 'advanced'} at ${j}: the ${k} smallest right value${k === 1 ? '' : 's'} (${arr.slice(mid + 1, j).join(', ')}) satisfy ${arr[i]} > 2·value. The running total for this merge is ${level}.`,
        logic: 'The right run is sorted and the left run is sorted, so as i grows j never has to move back: both pointers sweep once.',
        java: J.count, py: P.count, algo: 1,
        tag: 'COUNT', note: `i=${i}: nums[${i}] = ${arr[i]} > 2*nums[j] for ${k} right value${k === 1 ? '' : 's'}; count += ${k} → ${level}`,
      });
    }
    count += level;
    total += level;
    found.push(`[${lo}..${hi}]: +${level}`);
    // merge: stable order of the two sorted runs
    const order: number[] = [];
    let a = lo;
    let b = mid + 1;
    while (a <= mid && b <= hi) order.push(arr[a] <= arr[b] ? a++ : b++);
    while (a <= mid) order.push(a++);
    while (b <= hi) order.push(b++);
    const newArr = order.map((o) => arr[o]);
    const newKeys = order.map((o) => keys[o]);
    for (let k = 0; k < order.length; k++) { arr[lo + k] = newArr[k]; keys[lo + k] = newKeys[k]; merged[lo + k] = true; }
    marks = Object.fromEntries(order.map((_, k) => [lo + k, 'found' as const]));
    ptrs = [];
    v.i = '—'; v.j = '—'; v.total = total;
    tree.relabel(node, { sub: `+${level}` });
    say({
      title: `Merge [${lo}..${hi}]: +${level} pairs`, desc: `This merge level contributed ${level} pair${level === 1 ? '' : 's'}. Now merge the runs into the sorted order ${JSON.stringify(arr.slice(lo, hi + 1))}.`,
      logic: 'Counting had to happen before merging: afterwards left and right values are interleaved and the left/right origin is lost.', tone: 'success',
      java: J.merge, py: P.merge, algo: 2,
      tag: 'MERGE', note: `count += ${level} → total ${total}; nums[${lo}..${hi}] = ${JSON.stringify(arr.slice(lo, hi + 1))}`,
    });
    marks = {};
    stack.pop();
    tree.leave();
    return count;
  };

  const ans = sort(0, n - 1);
  lo0 = 0; hi0 = n - 1; marks = {}; ptrs = []; v.lo = 0; v.hi = n - 1;
  say({
    title: 'Done', desc: `There are ${ans} reverse pair${ans === 1 ? '' : 's'}.`,
    logic: 'Each pair is counted at exactly one level: the merge where its two indices are first separated into different halves.', tone: 'success',
    java: J.ret, py: P.ret, algo: 3, result: { title: String(ans), text: 'Reverse pairs' },
    tag: '✅ Done!', note: `return count = ${ans}`,
  });
  return steps;
}

const build = (input: In): Step[] => twoPass((t) => run(input, t));

export const reversePairs: ProblemDef<In> = {
  slug: '493-reverse-pairs',
  id: '493', title: 'Reverse Pairs', difficulty: 'Hard', category: 'Divide and Conquer', tag: 'merge sort + two pointers',
  statement: 'Count the pairs (i, j) with i < j and nums[i] > 2 * nums[j]. Use merge sort: count the cross pairs between two sorted halves with a pair of sweeping pointers, then merge.',
  constraints: '1 ≤ n ≤ 5·10⁴ in general (animation input is limited to 10 numbers between −99 and 99).',
  examples: [
    { label: '[1,3,2,3,1]', input: { nums: [1, 3, 2, 3, 1] }, output: '2', answer: '2 (the pairs (1, 4) and (3, 4): 3 > 2·1 and 3 > 2·1)' },
    { label: '[2,4,3,5,1]', input: { nums: [2, 4, 3, 5, 1] }, output: '3' },
    { label: '[5,4,3,2,1,0]', input: { nums: [5, 4, 3, 2, 1, 0] }, output: '9' },
  ],
  inputPlaceholder: 'e.g. 2 4 3 5 1',
  parseInput: (raw) => ({ nums: parseInts(raw, { what: 'numbers', example: '2 4 3 5 1', minLen: 1, maxLen: 10 }) }),
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Left run (current i = swap)', state: 'active' }, { label: 'Right values that pair with i / merged run', state: 'found' }, { label: 'Outside the current range', state: 'dim' }],
  emphasis: ['nums[i] > 2 * nums[j]', 'merge sort', 'sorted halves'],
  phases: [
    { icon: '✂️', label: 'Split', tone: 'blue' },
    { icon: '🔢', label: 'Count cross pairs', tone: 'gold' },
    { icon: '🔀', label: 'Merge', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  varLabels: ['lo', 'mid', 'hi', 'i', 'j', 'total'],
  approach: {
    title: 'Count across the middle, then merge',
    text: 'Recursively count the pairs inside each half. For the pairs that straddle the middle, both runs are sorted, so for each i in the left run the right values it beats form a prefix; the pointer j that marks the end of that prefix only moves forward. After counting, merge the runs so the parent sees sorted halves.',
  },
  java, python,
  algorithm: [
    'Split the range at mid and recursively count pairs inside each half (the halves come back sorted)',
    'For each i in the left run, advance j while nums[i] > 2·nums[j]; add j − (mid + 1)',
    'Merge the two runs into one sorted run',
    'The total is the sum of the counts from every merge level',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(n) for the merge buffer' }],
  why: 'Every pair (i, j) with i < j is split apart at exactly one level of the recursion, namely the first merge in which i is in the left run and j in the right run, so counting only cross pairs per level counts each pair once. Within that merge both runs are sorted, so if nums[i] > 2·nums[j] then every smaller right value also works, and as i increases (nums[i] grows) the qualifying prefix of the right run only gets longer. That monotonicity lets j sweep once, making each level linear and the whole algorithm O(n log n).',
};
