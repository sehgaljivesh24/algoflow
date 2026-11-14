import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { plural, verb } from './text.ts';
import { fmtList, parseInts, recorder } from './stepKit.ts';
import { treeOverArray, twoPass, type RecTree } from './recTreeKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  return { nums: parseInts(raw, { what: 'numbers', example: '1 2 3', minLen: 1, maxLen: 4, distinct: true }) };
}

function run({ nums }: In, tree: RecTree): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  const path: number[] = [];
  const used: boolean[] = nums.map(() => false);
  const results: string[] = [];
  let cur = -1;
  let fact = 1;
  for (let k = 2; k <= n; k++) fact *= k;

  const snap = () => ({
    scene: treeOverArray(
      tree.scene(),
      nums.map((value, i): Cell => ({ key: i, value, state: used[i] ? 'found' : i === cur ? 'active' : undefined })),
      cur >= 0 ? [{ id: 'i', label: 'i', index: cur, tone: 'blue' as const }] : [],
    ),
    aux: [
      { title: 'call stack', kind: 'stack' as const, items: tree.callStack() },
      { title: 'used[] (T = already in the path)', kind: 'list' as const, items: used.map((u, i) => `${nums[i]}: ${u ? 'T' : 'F'}`), highlight: cur >= 0 ? cur : undefined },
      { title: 'path (current permutation)', kind: 'stack' as const, items: path.map(String) },
      { title: `results (${results.length})`, kind: 'list' as const, items: [...results], highlight: results.length - 1 },
    ],
    vars: { depth: path.length, i: cur < 0 ? '—' : cur, path: fmtList(path), results: results.length },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Start', tag: 'INIT',
    desc: `Arrange all ${plural(n, 'number')} of ${fmtList(nums)} in every order: ${n}! = ${fact} leaves in the tree. used[] starts all false.`,
    note: `used = new boolean[${n}], path = [ ]`,
    logic: 'At each depth we may pick any number that is not already in the path; a full-length path is one permutation.',
    java: [2], py: [2], algo: 0,
  });

  const bt = () => {
    tree.enter(path.length ? fmtList(path) : '[ ]', {
      edge: path.length ? `+${path[path.length - 1]}` : undefined,
      call: `bt(depth=${path.length}) ${fmtList(path)}`,
    });
    if (path.length === n) {
      cur = -1;
      results.push(fmtList(path));
      tree.found(tree.top);
      say({
        title: `Record ${fmtList(path)}`, tag: 'FOUND!',
        desc: `The path holds all ${plural(n, 'number')}: ${fmtList(path)} is permutation #${results.length}. Save a copy and return.`,
        note: `path.size() == ${n} → res.add(${fmtList(path)})`,
        logic: 'A path of full length uses every number exactly once.', tone: 'success', java: [6], py: [4, 5], algo: 1,
      });
      tree.leave();
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      cur = i;
      used[i] = true;
      path.push(nums[i]);
      say({
        title: `Choose ${nums[i]}, then explore`, tag: 'TRY',
        desc: `nums[${i}] = ${nums[i]} is unused: mark it, extend the path to ${fmtList(path)} and recurse for slot ${path.length + 1}.`,
        note: `used[${i}] = true; path = ${fmtList(path)}`,
        logic: 'Marking it used keeps later slots from picking it again.', java: [9, 10], py: [10, 11], algo: 2,
      });
      bt();
      cur = i;
      used[i] = false;
      path.pop();
      say({
        title: `Un-choose ${nums[i]}`, tag: 'BACKTRACK',
        desc: `Back from the recursion: free nums[${i}] = ${nums[i]}, the path is ${fmtList(path)} again.${i < n - 1 ? ' The loop moves on to the next unused number.' : ''}`,
        note: `used[${i}] = false; path = ${fmtList(path)}`,
        logic: 'Un-marking lets other branches use this number at a different position.', tone: 'warn', java: [11], py: [12], algo: 3,
      });
    }
    tree.leave();
  };
  bt();

  cur = -1;
  say({
    title: 'Done', tag: '✅ Done!',
    desc: `All ${plural(results.length, 'permutation')} generated (${n}! = ${results.length}): every slot tried each number that was still free.`,
    note: `return res → ${results.length} = ${n}!`,
    logic: `There ${verb(n, 'is', 'are')} ${plural(n, 'choice')} for the first slot, ${Math.max(n - 1, 1)} for the second, and so on.`, tone: 'success',
    java: [3], py: [14], algo: 4,
    result: { title: plural(results.length, 'permutation'), text: results.join(' ') },
  });
  return steps;
}

const build = (input: In): Step[] => twoPass((t) => run(input, t));

export const permutations: ProblemDef<In> = {
  slug: '46-permutations',
  id: '46', title: 'Permutations', difficulty: 'Medium', category: 'Backtracking', tag: 'backtracking',
  statement: 'Given an array of distinct integers, return every possible ordering of its elements, in any order.',
  emphasis: ['every possible ordering', 'distinct integers'],
  constraints: '1 ≤ nums.length ≤ 6, all values distinct (animation input is limited to 4 numbers)',
  examples: [
    { label: '[1, 2, 3]', input: { nums: [1, 2, 3] }, output: '6 permutations', answer: '6 permutations: [1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]' },
    { label: '[7, 4]', input: { nums: [7, 4] }, output: '2 permutations' },
    { label: '[1, 2, 3, 4]', input: { nums: [1, 2, 3, 4] }, output: '24 permutations' },
  ],
  inputPlaceholder: 'e.g. 1 2 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '🔍', label: 'Init', tone: 'blue' },
    { icon: '🌟', label: 'Found!', tone: 'gold' },
    { icon: '🔄', label: 'Try element', tone: 'green' },
    { icon: '↩', label: 'Backtrack', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [
    { label: 'Current call', state: 'active' },
    { label: 'In the path (used[i] = T)', state: 'found' },
    { label: 'Call on the stack', state: 'compare' },
    { label: 'Returned', state: 'swap' },
    { label: 'Not visited yet', state: 'dim' },
  ],
  varLabels: ['depth', 'i', 'path', 'results'],
  approach: {
    title: 'Fill each slot with an unused number',
    text: 'Keep a path and a used[] flag per element. At every depth try each unused number: mark it, push it, recurse, then pop and unmark. When the path has n numbers, record a copy.',
  },
  java: [
    'public List<List<Integer>> permute(int[] nums) {',
    '    List<List<Integer>> res = new ArrayList<>();',
    '    backtrack(nums, new boolean[nums.length], new ArrayList<>(), res);',
    '    return res;',
    '}',
    'void backtrack(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> res) {',
    '    if (path.size() == nums.length) { res.add(new ArrayList<>(path)); return; }',
    '    for (int i = 0; i < nums.length; i++) {',
    '        if (used[i]) continue;',
    '        used[i] = true; path.add(nums[i]);                 // choose',
    '        backtrack(nums, used, path, res);                  // explore',
    '        path.remove(path.size() - 1); used[i] = false;     // un-choose',
    '    }',
    '}',
  ],
  python: [
    'def permute(nums):',
    '    res, path = [], []',
    '    used = [False] * len(nums)',
    '    def backtrack():',
    '        if len(path) == len(nums):',
    '            res.append(path[:])',
    '            return',
    '        for i in range(len(nums)):',
    '            if used[i]:',
    '                continue',
    '            used[i] = True; path.append(nums[i])  # choose',
    '            backtrack()  # explore',
    '            path.pop(); used[i] = False  # un-choose',
    '    backtrack()',
    '    return res',
  ],
  algorithm: [
    'Start with an empty path and nothing marked used',
    'If the path has n numbers, record a copy',
    'Choose: for every unused number, mark it and append it, then recurse',
    'Un-choose: pop it and clear its used flag',
    'Return all recorded permutations',
  ],
  complexity: [{ label: 'Time', value: 'O(n · n!)' }, { label: 'Space', value: 'O(n) recursion plus output' }],
  why: 'The used flags guarantee no number appears twice in a path, so every full-length path is an ordering. Different choices at any slot lead to different prefixes, so no ordering is generated twice, and every ordering is reachable by choosing its numbers in order.',
};
