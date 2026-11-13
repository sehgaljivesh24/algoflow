import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { fmtList, recorder } from './stepKit.ts';
import { treeOverArray, twoPass, type RecTree } from './recTreeKit.ts';

interface In { n: number; k: number }

function parse(raw: string): In {
  const nums = raw.split(/[\s,;]+/).filter(Boolean).map(Number);
  if (nums.length !== 2 || nums.some((x) => !Number.isInteger(x))) throw new Error('Format: n ; k — e.g. 4 ; 2');
  const [n, k] = nums;
  if (n < 1 || n > 6) throw new Error('n must be between 1 and 6');
  if (k < 1 || k > n) throw new Error('k must be between 1 and n');
  return { n, k };
}

function run({ n, k }: In, tree: RecTree): Step[] {
  const steps: Step[] = [];
  const path: number[] = [];
  const chosen = new Set<number>();
  const results: string[] = [];
  let start = 1;
  let limit = n;
  let cur = 0;
  let cut = false;
  let hot: number | undefined;

  const snap = () => ({
    scene: treeOverArray(
      tree.scene(hot),
      Array.from({ length: n }, (_, j): Cell => {
        const v = j + 1;
        return { key: v, value: v, state: chosen.has(v) ? 'found' : v === cur ? (cut ? 'error' : 'active') : v < start || v > limit ? 'dim' : undefined };
      }),
      cur > 0 ? [{ id: 'i', label: 'i', index: cur - 1, tone: cut ? ('red' as const) : ('blue' as const) }] : [],
    ),
    aux: [
      { title: 'call stack', kind: 'stack' as const, items: tree.callStack() },
      { title: `path (need ${k})`, kind: 'stack' as const, items: path.map(String) },
      { title: `results (${results.length})`, kind: 'list' as const, items: [...results], highlight: results.length - 1 },
    ],
    vars: { start, 'last i': limit, path: fmtList(path), results: results.length },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Start', tag: 'INIT',
    desc: `Choose ${k} numbers out of 1..${n}. Order does not matter, so numbers are picked in increasing order.`,
    note: `backtrack(n=${n}, k=${k}, start=1, [ ])`,
    logic: 'Picking only numbers larger than the last one chosen means each group is built in exactly one order.',
    java: [2], py: [9], algo: 0,
  });

  const bt = (s: number) => {
    start = s;
    cur = 0;
    const lim = n - (k - path.length) + 1;
    limit = lim;
    tree.enter(path.length ? fmtList(path) : '[ ]', {
      edge: path.length ? `+${path[path.length - 1]}` : undefined,
      call: `bt(start=${s}) ${fmtList(path)}`,
    });
    if (path.length === k) {
      results.push(fmtList(path));
      tree.found(tree.top);
      say({
        title: `Record ${fmtList(path)}`, tag: 'FOUND!',
        desc: `${k} numbers chosen: ${fmtList(path)} is combination #${results.length}. Save it and return.`,
        note: `path.size() == ${k} → res.add(${fmtList(path)})`,
        logic: 'The path reached the target size, so it is a complete answer.', tone: 'success', java: [6], py: [3, 4], algo: 1,
      });
      tree.leave();
      return;
    }
    say({
      title: `Explore from ${s}`, tag: 'BOUND',
      desc: `${k - path.length} more number${k - path.length > 1 ? 's' : ''} needed, so i may only run from ${s} to ${lim}${lim < n ? `; ${lim + 1}..${n} would leave too few numbers to finish` : ''}.`,
      note: `i = ${s} .. n − (k − size) + 1 = ${n} − ${k - path.length} + 1 = ${lim}`,
      logic: 'Pruning: starting later than n − (still needed) + 1 can never reach size k, so those branches are never entered.',
      tone: 'info', java: [7], py: [5], algo: 2,
    });
    for (let i = s; i <= lim; i++) {
      start = s;
      cur = i;
      path.push(i);
      chosen.add(i);
      say({
        title: `Choose ${i}`, tag: 'CHOOSE',
        desc: `Add ${i} → path ${fmtList(path)}, ${k - path.length} more to go. Explore with start = ${i + 1}.`,
        note: `path.add(${i}); backtrack(n, k, ${i + 1}, ${fmtList(path)})`,
        logic: 'Choose, explore, un-choose.', java: [8, 9], py: [6, 7], algo: 3,
      });
      bt(i + 1);
      start = s;
      limit = lim;
      cur = i;
      path.pop();
      chosen.delete(i);
      say({
        title: `Un-choose ${i}`, tag: 'BACKTRACK',
        desc: `Return and remove ${i}: the path is ${fmtList(path)} again${i < lim ? `; the loop moves on to i = ${i + 1}` : '; the loop is exhausted'}.`,
        note: `path.remove(last) → ${fmtList(path)}`,
        logic: 'Undo before trying the next candidate.', tone: 'warn', java: [10], py: [8], algo: 4,
      });
    }
    if (lim < n) {
      cur = lim + 1;
      cut = true;
      hot = tree.leaf(fmtList([...path, lim + 1]), 'pruned', { edge: `+${lim + 1}`, sub: 'too few left' });
      say({
        title: `Prune ${lim + 1}..${n}`, tag: 'PRUNED ✂️',
        alert: `Pruned: starting at ${lim + 1} leaves only ${n - lim} number${n - lim > 1 ? 's' : ''}, but ${k - path.length} more ${k - path.length > 1 ? 'are' : 'is'} needed.`,
        desc: `The loop bound stops at ${lim}; values ${lim + 1}..${n} could never complete a combination of size ${k}, so they are never entered.`,
        note: `i <= ${lim}; ${lim + 1} would break the bound`,
        logic: 'The upper bound only removes branches that cannot supply k numbers, so nothing valid is lost.', tone: 'warn', java: [7], py: [5], algo: 2,
      });
      cut = false;
      hot = undefined;
      cur = 0;
    }
    tree.leave();
  };
  bt(1);

  start = n + 1;
  cur = 0;
  say({
    title: 'Done', tag: '✅ Done!',
    desc: `${results.length} combinations found, C(${n},${k}) = ${results.length}: each unordered group of ${k} appears exactly once.`,
    note: `return res → ${results.length} = C(${n},${k})`,
    logic: 'Each unordered group of k numbers appears exactly once.', tone: 'success', java: [3], py: [10], algo: 5,
    result: { title: `${results.length} combinations`, text: results.join(' ') },
  });
  return steps;
}

const build = (input: In): Step[] => twoPass((t) => run(input, t));

export const combinations: ProblemDef<In> = {
  slug: '77-combinations',
  id: '77', title: 'Combinations', difficulty: 'Medium', category: 'Backtracking', tag: 'backtracking',
  statement: 'Given two integers n and k, return all possible combinations of k numbers chosen from the range 1..n. Order inside a combination does not matter.',
  emphasis: ['all possible combinations', 'k numbers', 'does not matter'],
  constraints: '1 ≤ n ≤ 20, 1 ≤ k ≤ n (animation input is limited to n ≤ 6)',
  examples: [
    { label: 'n = 4, k = 2', input: { n: 4, k: 2 }, output: '6 combinations', answer: '6 combinations: [1,2] [1,3] [1,4] [2,3] [2,4] [3,4]' },
    { label: 'n = 5, k = 3', input: { n: 5, k: 3 }, output: '10 combinations' },
    { label: 'n = 3, k = 1', input: { n: 3, k: 1 }, output: '3 combinations' },
  ],
  inputPlaceholder: 'n ; k, e.g. 4 ; 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '⚙️', label: 'Init', tone: 'blue' },
    { icon: '✅', label: 'Found!', tone: 'gold' },
    { icon: '✂️', label: 'Bound / pruned', tone: 'orange' },
    { icon: '➕', label: 'Choose', tone: 'green' },
    { icon: '↩', label: 'Backtrack', tone: 'cyan' },
    { icon: '🎉', label: 'Done', tone: 'green' },
  ],
  legend: [
    { label: 'Current call / candidate', state: 'active' },
    { label: 'In the path', state: 'found' },
    { label: 'Call on the stack', state: 'compare' },
    { label: 'Returned', state: 'swap' },
    { label: 'Pruned (too few left)', state: 'error' },
    { label: 'Not allowed here', state: 'dim' },
  ],
  varLabels: ['start', 'last i', 'path', 'results'],
  approach: {
    title: 'Pick increasing numbers, prune early',
    text: 'Recurse with a start value. Each level tries i from start up to n − (numbers still needed) + 1, adds i, recurses with i + 1, and removes i. Record the path when it reaches size k.',
  },
  java: [
    'public List<List<Integer>> combine(int n, int k) {',
    '    List<List<Integer>> res = new ArrayList<>();',
    '    backtrack(n, k, 1, new ArrayList<>(), res);',
    '    return res;',
    '}',
    'void backtrack(int n, int k, int start, List<Integer> path, List<List<Integer>> res) {',
    '    if (path.size() == k) { res.add(new ArrayList<>(path)); return; }',
    '    for (int i = start; i <= n - (k - path.size()) + 1; i++) {',
    '        path.add(i);                                // choose',
    '        backtrack(n, k, i + 1, path, res);          // explore',
    '        path.remove(path.size() - 1);               // un-choose',
    '    }',
    '}',
  ],
  python: [
    'def combine(n, k):',
    '    res, path = [], []',
    '    def backtrack(start):',
    '        if len(path) == k:',
    '            res.append(path[:]); return',
    '        for i in range(start, n - (k - len(path)) + 2):',
    '            path.append(i)  # choose',
    '            backtrack(i + 1)  # explore',
    '            path.pop()  # un-choose',
    '    backtrack(1)',
    '    return res',
  ],
  algorithm: [
    'Start with an empty path and start = 1',
    'When the path has k numbers, record it',
    'Compute the last useful i = n − (k − size) + 1 (pruning)',
    'Choose i and recurse with start = i + 1',
    'Un-choose i on the way back and try the next i',
    'Return all recorded combinations',
  ],
  complexity: [{ label: 'Time', value: 'O(k · C(n, k))' }, { label: 'Space', value: 'O(k) recursion plus output' }],
  why: 'Because the next number must be larger than the last, each k-subset is built in exactly one order, so there are no duplicates. The upper bound on i only removes branches that cannot supply k numbers, so nothing valid is lost.',
};
