import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { fmtList, parseInts, recorder } from './stepKit.ts';
import { treeOverArray, twoPass, type RecTree } from './recTreeKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  return { nums: parseInts(raw, { what: 'numbers', example: '1 2 2', minLen: 1, maxLen: 5, lo: -10, hi: 10 }) };
}

function run(input: In, tree: RecTree): Step[] {
  const nums = [...input.nums].sort((a, b) => a - b);
  const n = nums.length;
  const steps: Step[] = [];
  const path: number[] = [];
  const chosen = new Set<number>();
  const results: string[] = [];
  let start = 0;
  let cur = -1;
  let skipping = false;
  let hot: number | undefined;
  const lab = (p: number[]) => (p.length ? fmtList(p) : '[ ]');

  const snap = () => ({
    scene: treeOverArray(
      tree.scene(hot),
      nums.map((value, i): Cell => ({
        key: i, value,
        state: chosen.has(i) ? 'found' : i === cur ? (skipping ? 'error' : 'active') : i < start ? 'dim' : undefined,
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
    title: 'Sort first', tag: 'SORT',
    desc: `Sorted input: ${fmtList(nums)}. Equal values are now neighbours, so a repeat is one comparison away.`,
    note: `Arrays.sort(nums) → ${fmtList(nums)}`,
    logic: 'Sorting groups duplicates together, so "same value as the previous sibling" is a one-comparison test.',
    java: [1], py: [1], algo: 0,
  });

  const bt = (s: number) => {
    start = s;
    cur = -1;
    tree.enter(lab(path), { edge: path.length ? `+${path[path.length - 1]}` : undefined, call: `bt(start=${s}) ${lab(path)}` });
    results.push(fmtList(path));
    say({
      title: `Enter backtrack(start=${s}), record ${fmtList(path)}`, tag: 'RECORD',
      desc: `bt(start=${s}) holds ${lab(path)}, a new distinct subset: record it (${results.length} so far).`,
      note: `res.add(${fmtList(path)}) → size ${results.length}`,
      logic: 'Duplicates are skipped at the choice level, so every path that reaches this point is unique.',
      tone: 'success', java: [7], py: [4], algo: 1,
    });
    for (let i = s; i < n; i++) {
      start = s;
      cur = i;
      if (i > s && nums[i] === nums[i - 1]) {
        skipping = true;
        hot = tree.leaf(`✗ ${nums[i]}`, 'pruned', { edge: `+${nums[i]}` });
        say({
          title: `Skip duplicate ${nums[i]}`, tag: 'SKIP DUPLICATE',
          desc: `nums[${i}] = ${nums[i]} equals nums[${i - 1}], which was already tried at this level, so its whole subtree would repeat.`,
          note: `i=${i} > start=${s} and ${nums[i]} == ${nums[i - 1]} → continue`,
          alert: `Duplicate sibling ${nums[i]} at i=${i}: skipped, otherwise the subsets under ${lab([...path, nums[i]])} would appear twice.`,
          logic: 'Choosing the same value again at the same depth would rebuild exactly the subsets we already generated.',
          tone: 'warn', java: [9, 10], py: [6, 7], algo: 2,
        });
        skipping = false;
        hot = undefined;
        continue;
      }
      path.push(nums[i]);
      chosen.add(i);
      say({
        title: `Choose ${nums[i]}`, tag: 'CHOOSE',
        desc: `First ${nums[i]} at this level: add nums[${i}] → path ${fmtList(path)}, then explore with start = ${i + 1}.`,
        note: `path.add(${nums[i]}); backtrack(nums, ${i + 1}, ${fmtList(path)})`,
        logic: 'A duplicate may still be chosen deeper in the path (e.g. [2,2]); it is only banned as a repeated sibling.',
        java: [11, 12], py: [8, 9], algo: 3,
      });
      bt(i + 1);
      start = s;
      cur = i;
      path.pop();
      chosen.delete(i);
      say({
        title: `Un-choose ${nums[i]}`, tag: 'BACKTRACK',
        desc: `bt(start=${i + 1}) returned. Pop ${nums[i]} → path ${lab(path)}${i + 1 < n ? `; next candidate is i = ${i + 1}.` : '; the loop is over.'}`,
        note: `path.remove(last) → path = ${lab(path)}`,
        logic: 'Undo the choice so the next sibling starts from the same path.',
        tone: 'warn', java: [13], py: [10], algo: 4,
      });
    }
    tree.leave();
  };
  bt(0);

  start = n;
  cur = -1;
  say({
    title: 'Done', tag: '✅ Done!',
    desc: `${results.length} distinct subsets of ${fmtList(nums)}; every repeated sibling was cut off by the one-line check.`,
    note: `return res → ${results.length} subsets`,
    logic: 'Skipping repeated siblings removed every duplicate without needing a set.', tone: 'success',
    java: [4], py: [12], algo: 5,
    result: { title: `${results.length} subsets`, text: results.join(' ') },
  });
  return steps;
}

const build = (input: In): Step[] => twoPass((t) => run(input, t));

export const subsetsII: ProblemDef<In> = {
  slug: '90-subsets-ii',
  id: '90', title: 'Subsets II', difficulty: 'Medium', category: 'Backtracking', tag: 'backtrack + dedup',
  statement: 'Given an integer array that may contain duplicates, return all possible subsets. The result must not contain duplicate subsets.',
  emphasis: ['may contain duplicates', 'all possible subsets', 'duplicate subsets'],
  constraints: '1 ≤ nums.length ≤ 10, −10 ≤ nums[i] ≤ 10 (animation input is limited to 5 numbers)',
  examples: [
    { label: '[1, 2, 2]', input: { nums: [1, 2, 2] }, output: '6 subsets', answer: '6 subsets: [ ], [1], [1,2], [1,2,2], [2], [2,2]' },
    { label: '[4, 4, 4, 1]', input: { nums: [4, 4, 4, 1] }, output: '8 subsets' },
    { label: '[3, 1]', input: { nums: [3, 1] }, output: '4 subsets' },
  ],
  inputPlaceholder: 'e.g. 1 2 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '🔃', label: 'Sort', tone: 'blue' },
    { icon: '📋', label: 'Add to result', tone: 'gold' },
    { icon: '🚫', label: 'Skip duplicate', tone: 'orange' },
    { icon: '➕', label: 'Choose element', tone: 'green' },
    { icon: '↩', label: 'Backtrack', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [
    { label: 'Current call', state: 'active' },
    { label: 'Chosen (in path)', state: 'found' },
    { label: 'Call on the stack', state: 'compare' },
    { label: 'Returned', state: 'swap' },
    { label: 'Duplicate skipped', state: 'error' },
    { label: 'Not visited yet / behind start', state: 'dim' },
  ],
  varLabels: ['start', 'i', 'path', 'results'],
  approach: {
    title: 'Sort, then skip repeated siblings',
    text: 'Sort so equal numbers are adjacent. Run the usual subsets backtracking, but inside the loop skip nums[i] when i > start and nums[i] == nums[i−1]: that value was already tried at this depth.',
  },
  java: [
    'public List<List<Integer>> subsetsWithDup(int[] nums) {',
    '    Arrays.sort(nums);',
    '    List<List<Integer>> res = new ArrayList<>();',
    '    backtrack(nums, 0, new ArrayList<>(), res);',
    '    return res;',
    '}',
    'void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {',
    '    res.add(new ArrayList<>(path));',
    '    for (int i = start; i < nums.length; i++) {',
    '        if (i > start && nums[i] == nums[i - 1])',
    '            continue;                              // same sibling value',
    '        path.add(nums[i]);                         // choose',
    '        backtrack(nums, i + 1, path, res);         // explore',
    '        path.remove(path.size() - 1);              // un-choose',
    '    }',
    '}',
  ],
  python: [
    'def subsets_with_dup(nums):',
    '    nums.sort()',
    '    res = []',
    '    def backtrack(start, path):',
    '        res.append(path[:])',
    '        for i in range(start, len(nums)):',
    '            if i > start and nums[i] == nums[i - 1]:',
    '                continue  # same sibling value',
    '            path.append(nums[i])  # choose',
    '            backtrack(i + 1, path)  # explore',
    '            path.pop()  # un-choose',
    '    backtrack(0, [])',
    '    return res',
  ],
  algorithm: [
    'Sort the array so duplicates are adjacent',
    'Record the current path as a subset',
    'Skip nums[i] if it equals nums[i−1] and i > start',
    'Choose nums[i] and recurse with start = i + 1',
    'Un-choose nums[i] on the way back, then try the next sibling',
    'Return the recorded subsets',
  ],
  complexity: [{ label: 'Time', value: 'O(n · 2ⁿ)' }, { label: 'Space', value: 'O(n) recursion plus output' }],
  why: 'After sorting, two equal siblings at the same depth would generate identical subtrees, so only the first one is explored. A duplicate at a deeper level is not a sibling (i == start there), so subsets like [2,2] are still produced. Every distinct multiset appears exactly once.',
};
