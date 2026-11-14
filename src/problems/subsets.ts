import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { plural, verb } from './text.ts';
import { fmtList, parseInts, recorder } from './stepKit.ts';
import { treeOverArray, twoPass, type RecTree } from './recTreeKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  return { nums: parseInts(raw, { what: 'numbers', example: '1 2 3', minLen: 1, maxLen: 5, distinct: true }) };
}

function run({ nums }: In, tree: RecTree): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  const path: number[] = [];
  const chosen = new Set<number>();
  const results: string[] = [];
  let start = 0;
  let cur = -1;
  let hot: number | undefined;

  const snap = () => ({
    scene: treeOverArray(
      tree.scene(hot),
      nums.map((value, i): Cell => ({
        key: i, value,
        state: chosen.has(i) ? 'found' : i === cur ? 'active' : i < start ? 'dim' : undefined,
      })),
      [
        ...(start < n ? [{ id: 'start', label: 'start', index: start, tone: 'green' as const }] : []),
        ...(cur >= 0 ? [{ id: 'i', label: 'i', index: cur, tone: 'blue' as const }] : []),
      ],
    ),
    aux: [
      { title: 'call stack', kind: 'stack' as const, items: tree.callStack() },
      { title: 'path (current subset)', kind: 'stack' as const, items: path.map(String) },
      { title: `results (${results.length})`, kind: 'list' as const, items: [...results], highlight: results.length - 1 },
    ],
    vars: { start, i: cur < 0 ? '—' : cur, path: fmtList(path), results: results.length },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Start', tag: 'INIT',
    desc: `Build every subset of ${fmtList(nums)}: ${plural(n, 'element')} ${verb(n, 'gives', 'give')} 2^${n} = ${2 ** n} calls in the recursion tree. Path = [ ], start = 0.`,
    note: 'res = [], backtrack(nums, 0, [])',
    logic: 'Every node of the recursion is itself a valid subset, so we record the path on entry and then try to extend it with each later element.',
    java: [0, 1, 2], py: [0, 1, 2, 8], algo: 0,
  });

  const bt = (s: number) => {
    start = s;
    cur = -1;
    tree.enter(fmtList(path) === '[]' ? '[ ]' : fmtList(path), {
      edge: path.length ? `+${path[path.length - 1]}` : undefined,
      call: `bt(start=${s}) ${fmtList(path)}`,
    });
    results.push(fmtList(path));
    say({
      title: `Enter backtrack(start=${s}), record ${fmtList(path)}`, tag: 'RECORD',
      desc: `bt(start=${s}) holds ${fmtList(path)}, which is a valid subset. Save a copy: ${results.length} subset${results.length > 1 ? 's' : ''} so far.`,
      note: `res.add(${fmtList(path)}) → size ${results.length}`,
      logic: 'Every path we reach, including the empty one, is a distinct subset. Choosing only from index start onward prevents repeats like [2,1].',
      tone: 'success', java: [6], py: [3], algo: 1,
    });
    for (let i = s; i < n; i++) {
      start = s;
      cur = i;
      path.push(nums[i]);
      chosen.add(i);
      say({
        title: `Choose ${nums[i]}`, tag: 'CHOOSE',
        desc: `Add nums[${i}] = ${nums[i]} → path ${fmtList(path)}. Recurse with start = ${i + 1}, so only later elements can follow.`,
        note: `path.add(${nums[i]}); backtrack(nums, ${i + 1}, ${fmtList(path)})`,
        logic: 'Choose, explore, un-choose: the path is shared, so every change must be undone before trying the next option.',
        java: [8, 9], py: [5, 6], algo: 2,
      });
      bt(i + 1);
      start = s;
      cur = i;
      path.pop();
      chosen.delete(i);
      say({
        title: `Un-choose ${nums[i]}`, tag: 'BACKTRACK',
        desc: `bt(start=${i + 1}) returned. Pop ${nums[i]} → path ${fmtList(path)}${i + 1 < n ? `; the loop moves on to i = ${i + 1}.` : `; no more elements, bt(start=${s}) is finished.`}`,
        note: `path.remove(last) → path = ${fmtList(path)}`,
        logic: 'Restoring the path is what lets the loop try the next element from the same starting state.',
        tone: 'warn', java: [10], py: [7], algo: 3,
      });
    }
    tree.leave();
  };
  bt(0);

  start = n;
  cur = -1;
  say({
    title: 'Done', tag: '✅ Done!',
    desc: `The tree is complete: ${results.length} subsets generated (2^${n}). Each element was either in or out of every one of them.`,
    note: `return res → ${results.length} = 2^${n}`,
    logic: `Each of the ${plural(n, 'element')} is either in or out of a subset, giving 2^${n} = ${2 ** n} subsets.`, tone: 'success',
    java: [3], py: [9], algo: 4,
    result: { title: `${results.length} subsets`, text: results.join(' ') },
  });
  return steps;
}

const build = (input: In): Step[] => twoPass((t) => run(input, t));

export const subsets: ProblemDef<In> = {
  slug: '78-subsets',
  id: '78', title: 'Subsets', difficulty: 'Medium', category: 'Backtracking', tag: 'backtracking',
  statement: 'Given an array of distinct integers, return all possible subsets (the power set). The answer must not contain duplicate subsets, and may be in any order.',
  emphasis: ['all possible subsets', 'power set', 'duplicate subsets'],
  constraints: '1 ≤ nums.length ≤ 10, all values distinct (animation input is limited to 5 numbers)',
  examples: [
    { label: '[1, 2, 3]', input: { nums: [1, 2, 3] }, output: '8 subsets', answer: '8 subsets: [ ], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]' },
    { label: '[5, 7]', input: { nums: [5, 7] }, output: '4 subsets' },
    { label: '[4, 1, 6, 2]', input: { nums: [4, 1, 6, 2] }, output: '16 subsets' },
  ],
  inputPlaceholder: 'e.g. 1 2 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '🔍', label: 'Init', tone: 'blue' },
    { icon: '📋', label: 'Add to result', tone: 'gold' },
    { icon: '➕', label: 'Choose element', tone: 'green' },
    { icon: '↩', label: 'Backtrack', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [
    { label: 'Current call', state: 'active' },
    { label: 'Chosen (in path)', state: 'found' },
    { label: 'Call on the stack', state: 'compare' },
    { label: 'Returned', state: 'swap' },
    { label: 'Not visited yet / behind start', state: 'dim' },
  ],
  varLabels: ['start', 'i', 'path', 'results'],
  approach: {
    title: 'Choose, explore, un-choose',
    text: 'Keep a shared path. On entering the recursion, record a copy of the path. Then for each index i from start onward, add nums[i], recurse with start = i + 1, and remove nums[i] again.',
  },
  java: [
    'public List<List<Integer>> subsets(int[] nums) {',
    '    List<List<Integer>> res = new ArrayList<>();',
    '    backtrack(nums, 0, new ArrayList<>(), res);',
    '    return res;',
    '}',
    'void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {',
    '    res.add(new ArrayList<>(path));            // every path is a subset',
    '    for (int i = start; i < nums.length; i++) {',
    '        path.add(nums[i]);                     // choose',
    '        backtrack(nums, i + 1, path, res);     // explore',
    '        path.remove(path.size() - 1);          // un-choose',
    '    }',
    '}',
  ],
  python: [
    'def subsets(nums):',
    '    res = []',
    '    def backtrack(start, path):',
    '        res.append(path[:])  # every path is a subset',
    '        for i in range(start, len(nums)):',
    '            path.append(nums[i])  # choose',
    '            backtrack(i + 1, path)  # explore',
    '            path.pop()  # un-choose',
    '    backtrack(0, [])',
    '    return res',
  ],
  algorithm: [
    'Start with an empty path and start = 0',
    'On entry, record a copy of the path as a subset',
    'Choose: for each i ≥ start, append nums[i] and recurse with start = i + 1',
    'Un-choose: pop nums[i] on the way back, then try the next i',
    'When every call has returned, hand back all the results',
  ],
  complexity: [{ label: 'Time', value: 'O(n · 2ⁿ)' }, { label: 'Space', value: 'O(n) recursion, O(n · 2ⁿ) output' }],
  why: 'Each subset corresponds to exactly one path from the root, because elements are always added in increasing index order (start only moves forward). That gives no duplicates and no misses: any subset is reached by adding its elements left to right. Undoing each choice restores the exact state the loop needs for its next option.',
};
