import type { ProblemDef, Step } from '../engine/types.ts';
import { recorder } from './stepKit.ts';
import { CallTree } from './dpCoreKit.ts';

interface In { n: number }

function parse(raw: string): In {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 2 || n > 6) throw new Error('Enter a whole number n from 2 to 6, e.g. 5');
  return { n };
}

const fibOf = (k: number): number => (k <= 1 ? k : fibOf(k - 1) + fibOf(k - 2));
const naiveCalls = (k: number): number => (k <= 1 ? 1 : 1 + naiveCalls(k - 1) + naiveCalls(k - 2));

function build({ n }: In): Step[] {
  const steps: Step[] = [];
  let tree = new CallTree();
  const memo = new Map<number, number>();
  let calls = 0;
  let hits = 0;
  let curK: number | string = '—';
  const total = naiveCalls(n);

  const snap = () => ({
    scene: tree.scene(),
    aux: [{ title: 'memo (k → fib(k))', kind: 'map' as const, items: [...memo.entries()].map(([k, v]) => `${k} → ${v}`) }],
    vars: { k: curK, calls, 'cache hits': hits, 'plain calls': total },
  });
  const say = recorder(steps, snap);

  // ---- phase 1: the plain recursion tree, repeated work marked
  const seen = new Set<number>();
  let dupCalls = 0;
  const plain = (k: number, parent: number | null, side: 'left' | 'right', inDup: boolean): void => {
    const dup = inDup || (k >= 2 && seen.has(k));
    const id = tree.add(`f${k}`, parent, side);
    if (k >= 2) seen.add(k);
    if (dup) {
      tree.states[id] = 'error';
      dupCalls++;
    } else if (k >= 2) tree.states[id] = 'found';
    if (k >= 2) {
      plain(k - 1, id, 'left', dup);
      plain(k - 2, id, 'right', dup);
    }
  };
  plain(n, null, 'left', false);
  say({
    title: `Plain recursion for fib(${n})`, desc: `fib(k) = fib(k−1) + fib(k−2) makes ${total} calls for n = ${n}. The red nodes are repeats: ${dupCalls} of the ${total} calls recompute something already solved elsewhere in the tree.`,
    logic: 'Only n + 1 different sub-problems exist (fib(0)..fib(n)), yet the call count roughly multiplies by 1.6 for every +1 in n. The waste is the repeated sub-trees.',
    tone: 'warn', java: [1, 4], py: [1, 6], algo: 0,
    tag: 'PLAIN RECURSION —', note: `${total} calls for fib(${n}), ${dupCalls} are repeats; only ${n + 1} distinct values`,
    alert: `Red nodes are repeated work: ${dupCalls} of the ${total} calls recompute a sub-problem that was already solved.`,
  });

  // ---- phase 2: the same recursion with a cache
  tree = new CallTree();
  calls = 0;
  hits = 0;
  const waiting: number[] = [];
  const run = (k: number, parent: number | null, side: 'left' | 'right'): number => {
    const id = tree.add(`f${k}`, parent, side);
    calls++;
    curK = k;
    if (parent !== null) tree.states[parent] = 'sorted';
    tree.states[id] = 'active';
    if (k <= 1) {
      tree.states[id] = 'found';
      tree.labels[id] = `=${k}`;
      say({
        title: `fib(${k}) is a base case`, desc: `fib(${k}) = ${k} straight away; no recursion.`, logic: 'Base cases stop the recursion.', java: [2], py: [2, 3], algo: 1,
        tag: 'BASE CASE —', note: `k = ${k} ≤ 1 → return ${k}`,
      });
      if (parent !== null) tree.states[parent] = 'active';
      return k;
    }
    if (memo.has(k)) {
      hits++;
      tree.states[id] = 'compare';
      tree.labels[id] = `hit ${memo.get(k)}`;
      say({
        title: `fib(${k}) — cache hit`, desc: `fib(${k}) was already computed: the memo returns ${memo.get(k)} immediately, so this whole sub-tree is skipped.`,
        logic: 'A cache hit replaces an entire exponential sub-tree with one lookup.', tone: 'success', java: [3], py: [4, 5], algo: 2,
        tag: 'CACHE HIT —', note: `memo[${k}] = ${memo.get(k)} → return at once`,
      });
      if (parent !== null) tree.states[parent] = 'active';
      return memo.get(k)!;
    }
    say({
      title: `Call fib(${k})`, desc: `fib(${k}) is not in the memo, so it must recurse into fib(${k - 1}) and fib(${k - 2}).`,
      logic: 'First visit to this sub-problem: compute it the slow way, but remember the answer.', java: [4], py: [6], algo: 2,
      tag: 'CALL —', note: `memo miss → fib(${k - 1}) + fib(${k - 2})`,
    });
    waiting.push(id);
    const a = run(k - 1, id, 'left');
    tree.states[id] = 'active';
    curK = k;
    const b = run(k - 2, id, 'right');
    waiting.pop();
    const r = a + b;
    memo.set(k, r);
    tree.states[id] = 'found';
    tree.labels[id] = `=${r}`;
    curK = k;
    say({
      title: `fib(${k}) = ${a} + ${b} = ${r}`, desc: `Both children returned; store ${k} → ${r} in the memo before returning it.`,
      logic: 'Saving the result is what turns later repeats into cache hits.', tone: 'success', java: [5, 6], py: [6, 7], algo: 3,
      tag: 'STORE —', note: `memo[${k}] = ${a} + ${b} = ${r}`,
    });
    if (parent !== null) tree.states[parent] = 'active';
    return r;
  };
  const ans = run(n, null, 'left');
  curK = n;
  say({
    title: 'Done', tag: '✅ Done!', note: `fib(${n}) = ${ans}: ${calls} calls instead of ${total}`, desc: `fib(${n}) = ${ans} with only ${calls} calls (${hits} cache hit${hits === 1 ? '' : 's'}) instead of ${total}. Filling memo[2], memo[3], … memo[n] in a simple loop would be the bottom-up version of the same table.`,
    logic: 'Each distinct sub-problem is now expanded once, so the work is linear in n.', tone: 'success', java: [6], py: [7], algo: 4,
    result: { title: String(ans), text: `${calls} calls instead of ${total}` },
  });
  if (fibOf(n) !== ans) throw new Error('internal: memoized Fibonacci mismatch');
  return steps;
}

export const memoizedFibonacci: ProblemDef<In> = {
  slug: 'alg-memoized-fibonacci',
  id: 'ALG', title: 'Memoized Fibonacci', difficulty: 'Easy', category: 'Dynamic Programming', tag: 'recursion → memoization',
  statement: 'Compute fib(n) with the natural recursion fib(k) = fib(k−1) + fib(k−2), first watching how much work plain recursion repeats, then adding a cache (memo) so each value is computed once.',
  constraints: 'n ≥ 0 (animation input: 2 ≤ n ≤ 6 so the call tree stays readable)',
  examples: [
    { label: 'n = 5', input: { n: 5 }, output: '5' },
    { label: 'n = 6', input: { n: 6 }, output: '8' },
    { label: 'n = 3', input: { n: 3 }, output: '2' },
  ],
  inputPlaceholder: 'n from 2 to 6, e.g. 5',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizCaption: 'recursion tree — red = repeated work (first frame), blue = cache hit (second run)',
  legend: [{ label: 'Running call', state: 'active' }, { label: 'Waiting for sub-calls', state: 'sorted' }, { label: 'Cache hit', state: 'compare' }, { label: 'Finished / unique work', state: 'found' }, { label: 'Repeated work (plain recursion)', state: 'error' }],
  varLabels: ['k', 'calls', 'cache hits', 'plain calls'],
  emphasis: ['plain recursion', 'cache (memo)', 'computed once'],
  phases: [
    { icon: '🌳', label: 'Plain recursion repeats work', tone: 'orange' },
    { icon: '🏁', label: 'Base cases', tone: 'blue' },
    { icon: '⚡', label: 'Memo lookup / call', tone: 'cyan' },
    { icon: '💾', label: 'Store result', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Same recursion, plus a lookup table',
    text: 'Write the recursion first. Before recursing, check the memo for k; after computing, store the result. Every distinct k is expanded once and every later request is a cache hit, so the exponential tree collapses to a path of n expansions.',
  },
  java: [
    'static Map<Integer, Long> memo = new HashMap<>();',
    'static long fib(int k) {',
    '    if (k <= 1) return k;                          // base cases',
    '    if (memo.containsKey(k)) return memo.get(k);   // cache hit: skip the whole sub-tree',
    '    long r = fib(k - 1) + fib(k - 2);',
    '    memo.put(k, r);                                // remember before returning',
    '    return r;',
    '}',
  ],
  python: [
    'memo = {}',
    'def fib(k):',
    '    if k <= 1:',
    '        return k                       # base cases',
    '    if k in memo:',
    '        return memo[k]                 # cache hit: skip the whole sub-tree',
    '    memo[k] = fib(k - 1) + fib(k - 2)',
    '    return memo[k]                     # stored before returning',
  ],
  algorithm: [
    'Write the plain recursion and notice the repeated sub-problems',
    'Base cases: k ≤ 1 return k',
    'Before recursing, look k up in the memo — a hit returns instantly',
    'Otherwise recurse, then store the result in the memo',
    'Return fib(n); each distinct k was computed once',
  ],
  complexity: [{ label: 'Time', value: 'O(n) with memo (O(φⁿ) without)' }, { label: 'Space', value: 'O(n) memo + O(n) recursion depth' }],
  why: 'fib(k) depends only on k, so its value never changes: caching it is safe. There are only n + 1 distinct arguments, and each is expanded (does the two recursive calls) at most once because the second request finds it in the memo. Total work is therefore proportional to the number of distinct states times the work per state, which is the general recipe for turning an exponential recursion into DP.',
};
