import type { ProblemDef, Step } from '../engine/types.ts';
import { parseInts, recorder } from './stepKit.ts';
import { CallTree } from './dpCoreKit.ts';

interface In { nums: number[]; target: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: numbers ; target — e.g. 1 1 1 1 1 ; 3');
  const nums = parseInts(left, { what: 'numbers', example: '1 1 1 1 1', minLen: 1, maxLen: 5, lo: 0, hi: 9 });
  const target = Number(right.trim());
  if (!Number.isInteger(target) || Math.abs(target) > 20) throw new Error('The target must be a whole number between −20 and 20');
  const input = { nums, target };
  const steps = build(input);
  const scene = steps[steps.length - 1].scene;
  const nodeCount = scene && scene.kind === 'tree' ? scene.nodes.length : 0;
  if (steps.length > 400 || nodeCount > 33) throw new Error('That input makes the call tree too big to read. Use fewer numbers or repeated values.');
  return input;
}

function build({ nums, target }: In): Step[] {
  const n = nums.length;
  const steps: Step[] = [];
  const tree = new CallTree();
  const memo = new Map<string, number>();
  let calls = 0;
  let hits = 0;
  let curI: number | string = '—';
  let curRem: number | string = '—';
  const plain = 2 ** (n + 1) - 1;

  const snap = () => ({
    scene: tree.scene(),
    aux: [
      { title: 'numbers', kind: 'list' as const, items: nums.map(String), highlight: typeof curI === 'number' && curI < n ? curI : undefined },
      { title: 'memo ((i, rem) → ways)', kind: 'map' as const, items: [...memo.entries()].map(([k, v]) => `(${k}) → ${v}`) },
    ],
    vars: { i: curI, rem: curRem, calls, 'cache hits': hits },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Every number gets + or −', desc: `For ${nums.join(', ')} we must choose a sign per number so the total equals ${target}. State (i, rem): the numbers from index i on still have to add up to rem. Each node shows rem; the level is the index i. Left child = '+', right child = '−'. Plain recursion would make ${plain} calls.`,
    logic: 'Two numbers describe the future completely: how far we are (i) and how much is still needed (rem). Different sign choices can land on the same pair.', java: [0, 4, 5], py: [0, 5], algo: 0,
    tag: 'DEFINE STATE —', note: `state (i, rem) = (0, ${target}); plain recursion = ${plain} calls`,
  });

  const run = (i: number, rem: number, parent: number | null, side: 'left' | 'right'): number => {
    const id = tree.add(rem, parent, side);
    calls++;
    curI = i;
    curRem = rem;
    if (parent !== null) tree.states[parent] = 'sorted';
    tree.states[id] = 'active';
    const key = `${i},${rem}`;
    if (i === n) {
      const v = rem === 0 ? 1 : 0;
      tree.states[id] = v ? 'found' : 'dim';
      tree.labels[id] = `=${v}`;
      say({
        title: `All numbers signed, rem = ${rem}`, desc: rem === 0 ? 'The signs add up to the target exactly (rem = 0): this is one valid way.' : `Still ${rem} away from the target: not a valid way.`,
        logic: 'The base case only succeeds when nothing is left to add.', tone: v ? 'success' : 'info', java: [1], py: [1, 2], algo: 1,
        tag: v ? 'VALID WAY —' : 'DEAD END —', note: `i = ${n} = n, rem = ${rem} → return ${v}`,
      });
      if (parent !== null) tree.states[parent] = 'active';
      return v;
    }
    if (memo.has(key)) {
      hits++;
      tree.states[id] = 'compare';
      tree.labels[id] = `hit ${memo.get(key)}`;
      say({
        title: `(i=${i}, rem=${rem}) — cache hit`, desc: `This exact state was solved before: ${memo.get(key)} way${memo.get(key) === 1 ? '' : 's'}. The sub-tree under it is skipped.`,
        logic: 'Different earlier signs produced the same remainder, so the future is identical.', tone: 'success', java: [3], py: [3, 4], algo: 2,
        tag: 'CACHE HIT —', note: `memo[(${i},${rem})] = ${memo.get(key)} → skip the whole sub-tree`,
      });
      if (parent !== null) tree.states[parent] = 'active';
      return memo.get(key)!;
    }
    say({
      title: `Call ways(i=${i}, rem=${rem})`, desc: `Try +${nums[i]} (need ${rem - nums[i]} from the rest) and −${nums[i]} (need ${rem + nums[i]} from the rest).`,
      logic: 'New state: compute it from its two children.', java: [4, 5], py: [5], algo: 2,
      tag: 'CALL —', note: `ways(${i + 1}, ${rem} − ${nums[i]}) + ways(${i + 1}, ${rem} + ${nums[i]})`,
    });
    const a = run(i + 1, rem - nums[i], id, 'left');
    tree.states[id] = 'active';
    curI = i;
    curRem = rem;
    const b = run(i + 1, rem + nums[i], id, 'right');
    memo.set(key, a + b);
    curI = i;
    curRem = rem;
    tree.states[id] = 'found';
    tree.labels[id] = `=${a + b}`;
    say({
      title: `ways(${i}, ${rem}) = ${a} + ${b} = ${a + b}`, desc: `Store (${key}) → ${a + b} in the memo and return it.`,
      logic: 'Sum the two sign choices; remember the result for repeats.', tone: 'success', java: [6, 7], py: [6, 7], algo: 3,
      tag: 'STORE —', note: `memo[(${i},${rem})] = ${a} + ${b} = ${a + b}`,
    });
    if (parent !== null) tree.states[parent] = 'active';
    return a + b;
  };
  const ans = run(0, target, null, 'left');

  curI = '—';
  curRem = '—';
  const total = nums.reduce((x, y) => x + y, 0);
  const odd = (total + target) % 2 !== 0 || Math.abs(target) > total;
  say({
    title: 'Same answer as a subset-sum count', desc: `Let P be the numbers that get '+' and N the ones that get '−': P − N = ${target} and P + N = ${total}, so sum(P) = (${total} + ${target}) / 2${odd ? ' — not a non-negative whole number, so the answer is 0' : ` = ${(total + target) / 2}`}. Counting subsets with that sum is a 0/1 knapsack, and the memo states above are its table cells.`,
    logic: 'Top-down memo and bottom-up knapsack are two views of the same states.', java: [6], py: [6], algo: 3,
    tag: 'KNAPSACK VIEW —', note: odd ? `(${total} + ${target}) / 2 is not a whole number ≥ 0 → 0 ways` : `subset-sum target = (${total} + ${target}) / 2 = ${(total + target) / 2}`,
  });
  say({
    title: 'Done', tag: '✅ Done!', note: `ways(0, ${target}) = ${ans} with ${calls} calls instead of ${plain}`, desc: `${ans} way${ans === 1 ? '' : 's'} to reach ${target}, using ${calls} calls (${hits} cache hit${hits === 1 ? '' : 's'}) instead of ${plain}.`,
    logic: 'Only distinct (i, rem) pairs were expanded, so the exponential tree shrank to the number of reachable states.', tone: 'success', java: [7], py: [7], algo: 4,
    result: { title: String(ans), text: `${calls} calls instead of ${plain}` },
  });
  return steps;
}

export const targetSum: ProblemDef<In> = {
  slug: '494-target-sum',
  id: '494', title: 'Target Sum', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'memoized recursion → subset-sum knapsack',
  statement: 'Put a + or − sign in front of every number of the array. Count how many different sign assignments make the resulting expression equal the target.',
  constraints: '1 ≤ nums.length ≤ 20, 0 ≤ nums[i] ≤ 1000 (animation input: ≤ 5 numbers 0–9, |target| ≤ 20, small call tree)',
  examples: [
    { label: '1 1 1 1 1 ; 3', input: { nums: [1, 1, 1, 1, 1], target: 3 }, output: '5' },
    { label: '1 ; 1', input: { nums: [1], target: 1 }, output: '1' },
    { label: '2 1 1 2 ; 0', input: { nums: [2, 1, 1, 2], target: 0 }, output: '4' },
  ],
  inputPlaceholder: 'numbers ; target, e.g. 1 1 1 1 1 ; 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizCaption: 'call tree: node = remaining target, level = index i; left = +, right = −',
  legend: [{ label: 'Running call', state: 'active' }, { label: 'Waiting for sub-calls', state: 'sorted' }, { label: 'Cache hit', state: 'compare' }, { label: 'Finished / valid way', state: 'found' }, { label: 'Dead end (0 ways)', state: 'dim' }],
  varLabels: ['i', 'rem', 'calls', 'cache hits'],
  emphasis: ['+ or −', 'sign assignments', 'target'],
  phases: [
    { icon: '🧩', label: 'State (i, rem)', tone: 'blue' },
    { icon: '🏁', label: 'Base: i = n', tone: 'blue' },
    { icon: '⚡', label: 'Memo lookup / call', tone: 'cyan' },
    { icon: '💾', label: 'Add + and − branches, store', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Memoize on (index, remaining target)',
    text: 'ways(i, rem) = ways(i+1, rem − nums[i]) + ways(i+1, rem + nums[i]), with ways(n, rem) = 1 if rem == 0 else 0. Cache by the pair (i, rem). Equivalently, count subsets whose sum is (total + target) / 2 with a 0/1 knapsack table.',
  },
  java: [
    'static int ways(int[] nums, int i, int rem, Map<String, Integer> memo) {',
    '    if (i == nums.length) return rem == 0 ? 1 : 0;      // all signs chosen: valid only if exactly on target',
    '    String key = i + "," + rem;',
    '    if (memo.containsKey(key)) return memo.get(key);     // cache hit',
    '    int total = ways(nums, i + 1, rem - nums[i], memo)   // give nums[i] a "+"',
    '              + ways(nums, i + 1, rem + nums[i], memo);  // give nums[i] a "-"',
    '    memo.put(key, total);',
    '    return total;',
    '}',
  ],
  python: [
    'def ways(nums, i, rem, memo):',
    '    if i == len(nums):',
    '        return 1 if rem == 0 else 0     # valid only if exactly on target',
    '    if (i, rem) in memo:',
    '        return memo[(i, rem)]           # cache hit',
    '    total = ways(nums, i + 1, rem - nums[i], memo) + ways(nums, i + 1, rem + nums[i], memo)',
    '    memo[(i, rem)] = total',
    '    return total',
  ],
  algorithm: [
    'State (i, rem): ways for nums[i..] to add up to rem',
    'Base case: after the last number succeed only if rem == 0',
    'Look (i, rem) up in the memo; a hit returns immediately',
    'Otherwise add the "+" branch and the "−" branch, then store the sum',
    'Return ways(0, target)',
  ],
  complexity: [{ label: 'Time', value: 'O(n · distinct remainders)' }, { label: 'Space', value: 'O(n · distinct remainders)' }],
  why: 'What remains to be done after deciding the first i signs depends only on i and on how far the running total is from the target, not on which signs were chosen. So (i, rem) is a complete state; there are at most n times (2·total + 1) of them, far fewer than 2ⁿ paths. Caching each state once collapses the tree, and rewriting the problem as "count subsets with sum (total + target)/2" shows the table is a 0/1 knapsack.',
};
