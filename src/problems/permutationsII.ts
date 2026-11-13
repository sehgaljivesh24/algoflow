import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { capSteps, fmtList, parseInts, recorder } from './stepKit.ts';
import { find } from './treeKit.ts';
import { treeOverArray, twoPass, type RecTree } from './recTreeKit.ts';

interface In { nums: number[] }

const java = [
  'public List<List<Integer>> permuteUnique(int[] nums) {',
  '    Arrays.sort(nums);                                  // equal values become neighbours',
  '    List<List<Integer>> res = new ArrayList<>();',
  '    backtrack(nums, new boolean[nums.length], new ArrayList<>(), res);',
  '    return res;',
  '}',
  'private void backtrack(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> res) {',
  '    if (path.size() == nums.length) {',
  '        res.add(new ArrayList<>(path));',
  '        return;',
  '    }',
  '    for (int i = 0; i < nums.length; i++) {',
  '        if (used[i]) continue;',
  '        if (i > 0 && nums[i] == nums[i - 1] && !used[i - 1]) continue;   // duplicate at this slot',
  '        used[i] = true;',
  '        path.add(nums[i]);                              // choose',
  '        backtrack(nums, used, path, res);               // explore',
  '        path.remove(path.size() - 1);                   // un-choose',
  '        used[i] = false;',
  '    }',
  '}',
];
const python = [
  'def permute_unique(nums):',
  '    nums.sort()                                          # equal values become neighbours',
  '    res, used, path = [], [False] * len(nums), []',
  '    def backtrack():',
  '        if len(path) == len(nums):',
  '            res.append(path[:])',
  '            return',
  '        for i in range(len(nums)):',
  '            if used[i]:',
  '                continue',
  '            if i > 0 and nums[i] == nums[i - 1] and not used[i - 1]:   # duplicate at this slot',
  '                continue',
  '            used[i] = True',
  '            path.append(nums[i])                         # choose',
  '            backtrack()                                  # explore',
  '            path.pop()                                   # un-choose',
  '            used[i] = False',
  '    backtrack()',
  '    return res',
];
const J = {
  sort: find(java, 'Arrays.sort', 'backtrack(nums, new boolean'),
  full: find(java, 'if (path.size() == nums.length)', 'res.add(new ArrayList'),
  used: find(java, 'if (used[i]) continue'),
  dup: find(java, 'if (i > 0 && nums[i]'),
  choose: find(java, 'used[i] = true', 'path.add(nums[i])', 'backtrack(nums, used, path, res);'),
  unchoose: find(java, 'path.remove', 'used[i] = false'),
  ret: find(java, 'return res;'),
};
const P = {
  sort: find(python, 'nums.sort()', 'res, used, path'),
  full: find(python, 'if len(path) == len(nums)', 'res.append(path[:])'),
  used: find(python, 'if used[i]', 'continue'),
  dup: find(python, 'if i > 0 and nums[i]'),
  choose: find(python, 'used[i] = True', 'path.append(nums[i])', 'backtrack()  '),
  unchoose: find(python, 'path.pop()', 'used[i] = False'),
  ret: find(python, 'return res'),
};

function run({ nums: input }: In, tree: RecTree): Step[] {
  const nums = [...input].sort((a, b) => a - b);
  const n = nums.length;
  const steps: Step[] = [];
  const path: number[] = [];
  const used = nums.map(() => false);
  const results: string[] = [];
  let cur = -1;
  let skipped = false;
  let hot: number | undefined;

  const say = recorder(steps, () => ({
    scene: treeOverArray(
      tree.scene(hot),
      nums.map((value, i): Cell => ({ key: i, value, state: used[i] ? 'found' : i === cur ? (skipped ? 'error' : 'active') : undefined })),
      cur >= 0 ? [{ id: 'i', label: 'i', index: cur, tone: skipped ? ('red' as const) : ('blue' as const) }] : [],
    ),
    aux: [
      { title: 'call stack', kind: 'stack' as const, items: tree.callStack() },
      {
        title: 'used[] (T = already in the path)', kind: 'list' as const, items: used.map((u, i) => `${nums[i]}: ${u ? 'T' : 'F'}`),
        highlight: cur >= 0 ? cur : undefined, bad: skipped && cur > 0 ? [cur - 1] : undefined,
      },
      { title: 'path (current permutation)', kind: 'stack' as const, items: path.map(String) },
      { title: `results (${results.length})`, kind: 'list' as const, items: [...results], highlight: results.length - 1 },
    ],
    vars: { depth: path.length, i: cur < 0 ? '—' : cur, path: fmtList(path), results: results.length },
  }));

  say({
    title: 'Sorted input', tag: 'SORT',
    desc: `Sort the numbers first: ${fmtList(nums)}. Equal values are now neighbours, which makes duplicates easy to spot.`,
    note: `Arrays.sort(nums) → ${fmtList(nums)}`,
    logic: 'Plain permutation code would produce each distinct arrangement several times, once for every way of ordering equal values. Sorting lets us forbid that.',
    java: J.sort, py: P.sort, algo: 0,
  });

  const bt = () => {
    cur = -1;
    skipped = false;
    tree.enter(path.length ? fmtList(path) : '[ ]', {
      edge: path.length ? `+${path[path.length - 1]}` : undefined,
      call: `bt(depth=${path.length}) ${fmtList(path)}`,
    });
    if (path.length === n) {
      results.push(fmtList(path));
      tree.found(tree.top);
      say({
        title: `Record ${fmtList(path)}`, tag: 'FOUND!',
        desc: `Full-length path: ${fmtList(path)} is distinct permutation #${results.length}. The duplicate rule guarantees it was not produced before.`,
        note: `path.size() == ${n} → res.add(${fmtList(path)})`,
        logic: 'The duplicate rule guarantees this arrangement has not been produced before.', tone: 'success', java: J.full, py: P.full, algo: 4,
      });
      tree.leave();
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      cur = i;
      if (i > 0 && nums[i] === nums[i - 1] && !used[i - 1]) {
        skipped = true;
        hot = tree.leaf(`${fmtList([...path, nums[i]])}`, 'pruned', { edge: `+${nums[i]}` });
        say({
          title: `Skip duplicate ${nums[i]} (index ${i})`, tag: 'SKIP DUPLICATE',
          alert: `Duplicate! nums[${i}] = nums[${i - 1}] = ${nums[i]} and index ${i - 1} is not used. Skip this branch.`,
          desc: `nums[${i}] equals nums[${i - 1}] but that earlier copy is not in the path, so this copy would only rebuild a permutation reachable through the earlier one.`,
          note: `nums[${i}] == nums[${i - 1}] && !used[${i - 1}] → continue`,
          logic: 'Rule: among equal values, a later copy may only be used after the earlier copy has been placed. That fixes one canonical order for the copies.', tone: 'warn',
          java: J.dup, py: P.dup, algo: 1,
        });
        skipped = false;
        hot = undefined;
        continue;
      }
      used[i] = true;
      path.push(nums[i]);
      say({
        title: `Choose ${nums[i]} (index ${i})`, tag: 'CHOOSE',
        desc: `Place nums[${i}] = ${nums[i]} at depth ${path.length} → path ${fmtList(path)}, then recurse for the next slot.`,
        note: `used[${i}] = true; path = ${fmtList(path)}`,
        logic: 'The used[] flags mark which positions are already in the path.', java: J.choose, py: P.choose, algo: 2,
      });
      bt();
      cur = i;
      used[i] = false;
      path.pop();
      say({
        title: `Un-choose ${nums[i]}`, tag: 'BACKTRACK',
        desc: `Free index ${i} again; the path is ${fmtList(path)} and the loop tries the next index.`,
        note: `path.remove(last); used[${i}] = false`,
        logic: 'Un-marking lets other branches place this value at a different slot.', tone: 'warn', java: J.unchoose, py: P.unchoose, algo: 3,
      });
    }
    cur = -1;
    tree.leave();
  };
  bt();

  say({
    title: 'Done', tag: '✅ Done!',
    desc: `${results.length} distinct permutation${results.length === 1 ? '' : 's'} found; the skipped duplicate branches (red) never produced a repeat.`,
    note: `return res → ${results.length} distinct`,
    logic: 'This equals n! divided by the factorials of the repeat counts of each value.', tone: 'success',
    java: J.ret, py: P.ret, algo: 5, result: { title: `${results.length} permutations`, text: results.join(' ') },
  });
  return steps;
}

const build = (input: In): Step[] => twoPass((t) => run(input, t));

function parse(raw: string): In {
  const nums = parseInts(raw, { what: 'numbers', example: '1 1 2', minLen: 1, maxLen: 5, lo: -9, hi: 9 });
  return capSteps(build, { nums });
}

export const permutationsII: ProblemDef<In> = {
  slug: '47-permutations-ii',
  id: '47', title: 'Permutations II', difficulty: 'Medium', category: 'Backtracking', tag: 'backtrack + dedup (sort, skip)',
  statement: 'Given an array that may contain duplicate numbers, return all distinct permutations in any order.',
  constraints: '1 ≤ nums.length ≤ 8, −10 ≤ nums[i] ≤ 10 (animation input is limited to 5 numbers and 400 steps).',
  examples: [
    { label: '[1, 1, 2]', input: { nums: [1, 1, 2] }, output: '[[1,1,2],[1,2,1],[2,1,1]]' },
    { label: '[2, 2, 1, 1]', input: { nums: [2, 2, 1, 1] }, output: '6 permutations' },
    { label: '[3, 3, 3]', input: { nums: [3, 3, 3] }, output: '[[3,3,3]]' },
  ],
  inputPlaceholder: 'e.g. 1 1 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  emphasis: ['duplicate numbers', 'distinct permutations'],
  phases: [
    { icon: '🔀', label: 'Sort', tone: 'blue' },
    { icon: '✂️', label: 'Skip duplicate', tone: 'orange' },
    { icon: '🔄', label: 'Choose', tone: 'green' },
    { icon: '↩', label: 'Backtrack', tone: 'orange' },
    { icon: '🌟', label: 'Found!', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [
    { label: 'Current call', state: 'active' },
    { label: 'Used in the path', state: 'found' },
    { label: 'Call on the stack', state: 'compare' },
    { label: 'Returned', state: 'swap' },
    { label: 'Skipped duplicate', state: 'error' },
  ],
  varLabels: ['depth', 'i', 'path', 'results'],
  approach: {
    title: 'Sort, then forbid out-of-order copies',
    text: 'Sort so equal values are adjacent and keep a used[] flag per index. At each slot try every unused index, except skip nums[i] when it equals nums[i − 1] and the earlier copy is not currently used. The skipped copy would only rebuild a permutation produced through the earlier copy.',
  },
  java, python,
  algorithm: [
    'Sort the array so duplicates are neighbours; start with an empty path',
    'Skip i if nums[i] == nums[i − 1] and index i − 1 is not used',
    'Otherwise choose it (mark used, append) and recurse',
    'Un-choose it on the way back: pop and clear the flag',
    'A full-length path is recorded as one distinct permutation',
    'Return every recorded permutation',
  ],
  complexity: [{ label: 'Time', value: 'O(n · n!)' }, { label: 'Space', value: 'O(n) recursion, plus the output' }],
  why: 'Among k equal values there are k! ways to assign them to the same slots, but they all give the same permutation. Requiring that equal values be placed in their sorted order (a copy may be used only if its left neighbour copy is already in the path) selects exactly one of those k! assignments, so every distinct permutation appears once. The check uses used[i − 1] of the current path, so it prunes only at the point where an out-of-order copy would be chosen.',
};
