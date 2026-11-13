import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { capSteps, fmtList, parseInts, recorder } from './stepKit.ts';
import { treeOverArray, twoPass, type RecTree } from './recTreeKit.ts';

interface In { candidates: number[]; target: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: candidates ; target — e.g. 2 3 6 7 ; 7');
  const candidates = parseInts(left, { what: 'candidates', example: '2 3 6 7', minLen: 1, maxLen: 5, lo: 1, hi: 20, distinct: true });
  const target = Number(right.trim());
  if (!Number.isInteger(target) || target < 1 || target > 20) throw new Error('The target must be a whole number from 1 to 20');
  return capSteps(build, { candidates, target });
}

function run(input: In, tree: RecTree): Step[] {
  const cand = [...input.candidates].sort((a, b) => a - b);
  const target = input.target;
  const n = cand.length;
  const steps: Step[] = [];
  const path: number[] = [];
  const results: string[] = [];
  let start = 0;
  let cur = -1;
  let remaining = target;
  let pruned = false;
  let hot: number | undefined;

  const snap = () => ({
    scene: treeOverArray(
      tree.scene(hot),
      cand.map((value, i): Cell => ({
        key: i, value,
        state: i === cur ? (pruned ? 'error' : 'active') : i < start ? 'dim' : undefined,
      })),
      [
        ...(start < n ? [{ id: 'start', label: 'start', index: start, tone: 'green' as const }] : []),
        ...(cur >= 0 ? [{ id: 'i', label: 'i', index: cur, tone: pruned ? ('red' as const) : ('blue' as const) }] : []),
      ],
    ),
    aux: [
      { title: 'call stack', kind: 'stack' as const, items: tree.callStack() },
      { title: `path (sum ${target - remaining})`, kind: 'stack' as const, items: path.map(String) },
      { title: `results (${results.length})`, kind: 'list' as const, items: [...results], highlight: results.length - 1 },
    ],
    vars: { start, remaining, path: fmtList(path), results: results.length },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Start', tag: 'INIT',
    desc: `Sorted candidates ${fmtList(cand)}; find every combination summing to ${target}. A number may be reused, so remaining starts at ${target}.`,
    note: `sort → ${fmtList(cand)}, backtrack(c, 0, ${target}, [ ])`,
    logic: 'Sorting lets us stop a loop as soon as one candidate is too big, since every later one is bigger still.',
    java: [3], py: [2, 13], algo: 0,
  });

  const bt = (s: number, rem: number) => {
    start = s;
    cur = -1;
    remaining = rem;
    tree.enter(path.length ? fmtList(path) : '[ ]', {
      sub: `rem ${rem}`, edge: path.length ? `+${path[path.length - 1]}` : undefined,
      call: `bt(start=${s}, rem=${rem}) ${fmtList(path)}`,
    });
    if (rem === 0) {
      results.push(fmtList(path));
      tree.found(tree.top);
      say({
        title: `Record ${fmtList(path)}`, tag: 'FOUND!',
        desc: `The remaining amount is 0, so ${fmtList(path)} sums to ${target}. Save combination #${results.length}.`,
        note: `remain == 0 → res.add(${fmtList(path)})`,
        logic: 'A path with remaining = 0 is a valid combination.', tone: 'success', java: [7, 8], py: [4, 5], algo: 1,
      });
      tree.leave();
      return;
    }
    for (let i = s; i < n; i++) {
      start = s;
      remaining = rem;
      cur = i;
      if (cand[i] > rem) {
        pruned = true;
        hot = tree.leaf(fmtList([...path, cand[i]]), 'pruned', { sub: `rem ${rem - cand[i]}`, edge: `+${cand[i]}` });
        say({
          title: `Prune: ${cand[i]} > ${rem}`, tag: 'PRUNED ✂️',
          alert: `BREAK, not continue: ${cand[i]} > ${rem} and the candidates are sorted, so every later one is bigger too.`,
          desc: `${cand[i]} exceeds the remaining ${rem}; so does everything after it. The whole rest of this loop is cut.`,
          note: `c[${i}] = ${cand[i]} > remain = ${rem} → break`,
          logic: 'Because the array is sorted, no later candidate can fit either: break instead of continue.', tone: 'warn', java: [10], py: [8, 9], algo: 2,
        });
        pruned = false;
        hot = undefined;
        break;
      }
      path.push(cand[i]);
      remaining = rem - cand[i];
      say({
        title: `Choose ${cand[i]}`, tag: 'CHOOSE',
        desc: `Add ${cand[i]}: remaining ${rem} → ${rem - cand[i]}, path ${fmtList(path)}. Recurse with start = ${i}, so ${cand[i]} may be reused.`,
        note: `path.add(${cand[i]}); backtrack(c, ${i}, ${rem - cand[i]})`,
        logic: 'Recursing with start = i, not i + 1, is what allows the same number to be used again.', java: [11, 12], py: [10, 11], algo: 3,
      });
      bt(i, rem - cand[i]);
      start = s;
      cur = i;
      path.pop();
      remaining = rem;
      say({
        title: `Un-choose ${cand[i]}`, tag: 'BACKTRACK',
        desc: `Return from the recursion and remove ${cand[i]}: remaining is ${rem} again, path ${fmtList(path)}.${i + 1 < n ? ` Next candidate: c[${i + 1}] = ${cand[i + 1]}.` : ''}`,
        note: `path.remove(last) → remain = ${rem}`,
        logic: 'Restore the state, then try the next larger candidate.', tone: 'warn', java: [13], py: [12], algo: 4,
      });
    }
    tree.leave();
  };
  bt(0, target);

  start = n;
  cur = -1;
  remaining = target;
  say({
    title: 'Done', tag: '✅ Done!',
    desc: `${results.length} combination${results.length === 1 ? '' : 's'} sum to ${target}${results.length ? `: ${results.join(' ')}` : '; every branch ran out of room'}.`,
    note: `return res → ${results.length} found`,
    logic: 'Start only moves forward, so each multiset of candidates is generated once.', tone: 'success', java: [4], py: [14], algo: 5,
    result: { title: `${results.length} combination${results.length === 1 ? '' : 's'}`, text: results.length ? results.join(' ') : 'No combination reaches the target' },
  });
  return steps;
}

function build(input: In): Step[] {
  return twoPass((t) => run(input, t));
}

export const combinationSum: ProblemDef<In> = {
  slug: '39-combination-sum',
  id: '39', title: 'Combination Sum', difficulty: 'Medium', category: 'Backtracking', tag: 'backtrack with reuse',
  statement: 'Given distinct positive integers and a target, return every unique combination of candidates that sums to the target. The same number may be chosen any number of times.',
  emphasis: ['unique combination', 'sums to the target', 'any number of times'],
  constraints: '1 ≤ candidates.length ≤ 30, 2 ≤ candidates[i] ≤ 40, 1 ≤ target ≤ 40 (animation input: ≤ 5 candidates, values 1–20, target ≤ 20, and under 400 steps)',
  examples: [
    { label: '[2,3,6,7], target 7', input: { candidates: [2, 3, 6, 7], target: 7 }, output: '2 combinations', answer: '2 combinations: [2,2,3] and [7]' },
    { label: '[2,3,5], target 8', input: { candidates: [2, 3, 5], target: 8 }, output: '3 combinations' },
    { label: '[4,6], target 5', input: { candidates: [4, 6], target: 5 }, output: '0 combinations' },
  ],
  inputPlaceholder: 'candidates ; target, e.g. 2 3 6 7 ; 7',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '⚙️', label: 'Init', tone: 'blue' },
    { icon: '✅', label: 'Found!', tone: 'gold' },
    { icon: '✂️', label: 'Pruned', tone: 'orange' },
    { icon: '➕', label: 'Choose', tone: 'green' },
    { icon: '↩', label: 'Backtrack', tone: 'cyan' },
    { icon: '🎉', label: 'Done', tone: 'green' },
  ],
  legend: [
    { label: 'Current call / candidate', state: 'active' },
    { label: 'Combination found', state: 'found' },
    { label: 'Call on the stack', state: 'compare' },
    { label: 'Returned', state: 'swap' },
    { label: 'Too big (pruned)', state: 'error' },
    { label: 'Behind start / not visited', state: 'dim' },
  ],
  varLabels: ['start', 'remaining', 'path', 'results'],
  approach: {
    title: 'Subtract, reuse, and prune',
    text: 'Keep the remaining amount. For each candidate from start onward that fits, add it and recurse with the same start (reuse) and a smaller remainder. When the remainder hits 0 record the path; when a sorted candidate exceeds it, break.',
  },
  java: [
    'public List<List<Integer>> combinationSum(int[] candidates, int target) {',
    '    Arrays.sort(candidates);',
    '    List<List<Integer>> res = new ArrayList<>();',
    '    backtrack(candidates, 0, target, new ArrayList<>(), res);',
    '    return res;',
    '}',
    'void backtrack(int[] c, int start, int remain, List<Integer> path, List<List<Integer>> res) {',
    '    if (remain == 0) {',
    '        res.add(new ArrayList<>(path)); return;',
    '    }',
    '    for (int i = start; i < c.length && c[i] <= remain; i++) {   // prune when too big',
    '        path.add(c[i]);                                   // choose',
    '        backtrack(c, i, remain - c[i], path, res);        // explore (i, not i+1: reuse)',
    '        path.remove(path.size() - 1);                     // un-choose',
    '    }',
    '}',
  ],
  python: [
    'def combination_sum(candidates, target):',
    '    candidates.sort()',
    '    res, path = [], []',
    '    def backtrack(start, remain):',
    '        if remain == 0:',
    '            res.append(path[:])',
    '            return',
    '        for i in range(start, len(candidates)):',
    '            if candidates[i] > remain:',
    '                break  # sorted, so nothing later fits',
    '            path.append(candidates[i])  # choose',
    '            backtrack(i, remain - candidates[i])  # explore, reuse allowed',
    '            path.pop()  # un-choose',
    '    backtrack(0, target)',
    '    return res',
  ],
  algorithm: [
    'Sort the candidates, then call backtrack(0, target)',
    'If remaining == 0, record a copy of the path',
    'Prune: if candidates[i] > remaining, break out of the loop',
    'Choose candidates[i] and recurse with start = i (reuse allowed)',
    'Un-choose it and try the next candidate',
    'Return all recorded combinations',
  ],
  complexity: [{ label: 'Time', value: 'O(N^(T/M)) worst case, N candidates, M smallest' }, { label: 'Space', value: 'O(T/M) recursion depth' }],
  why: 'Candidates only move forward (start never decreases), so each multiset is built in one canonical order and no combination repeats. Allowing start = i lets a number repeat, and since all values are positive the remainder strictly shrinks, so recursion terminates. Sorting makes the break prune safe.',
};
