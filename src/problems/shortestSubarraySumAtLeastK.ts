import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { parseNumsAndK, twoRows } from './pack1Kit.ts';

interface In { nums: number[]; k: number }

function parse(raw: string): In {
  return parseNumsAndK(raw, { example: '2 -1 2 | 3', what: 'the numbers', lo: -20, hi: 20, kName: 'K', kMin: 1, kMax: () => 200 });
}

function build({ nums, k }: In): Step[] {
  const n = nums.length;
  const P: number[] = [0];
  for (const x of nums) P.push(P[P.length - 1] + x);
  const dq: number[] = []; // indexes into P with increasing prefix values
  let best = Infinity;
  let bi = -1;
  let bj = -1;
  const steps: Step[] = [];

  const scene = (j: number, showBest = false, bad = -1) => {
    const top: (CellState | undefined)[] = P.map((_, c) => {
      if (showBest) return bi >= 0 && c > bi && c <= bj ? 'found' : undefined;
      return c === j && c >= 1 ? 'active' : undefined;
    });
    const bot: (CellState | undefined)[] = P.map((_, c) => {
      if (c === bad) return 'error';
      if (showBest) return c === bi || c === bj ? 'found' : undefined;
      if (c === j) return 'active';
      if (dq.length && c === dq[0]) return 'found';
      return dq.includes(c) ? 'sorted' : undefined;
    });
    // columns before j+1 are known; later prefix sums stay visible but plain
    return twoRows('nums', ['—', ...nums], top, 'P', P, bot);
  };
  const aux = () => [{ title: 'deque of prefix indexes (P increasing)', kind: 'queue' as const, items: dq.map((c) => `${c}: P=${P[c]}`) }];
  const vars = (j: number | string) => ({ j, K: k, 'P[j]': typeof j === 'number' ? P[j] : '—', best: best === Infinity ? '—' : best });
  const add = (title: string, tag: string, desc: string, note: string, logic: string, tone: 'info' | 'warn' | 'success', j: number, bad: number, jl: number[], pl: number[], a: number, alert?: string) =>
    steps.push({ title, tag, desc, note, alert, scene: scene(j, false, bad), aux: aux(), vars: vars(j >= 0 ? j : '—'), logic, logicTone: tone, javaLines: jl, pyLines: pl, algoStep: a });

  add('Start', 'BUILD P —', `Find the shortest non-empty subarray with sum ≥ K = ${k}. Negatives are allowed, so build prefix sums P = [${P.join(', ')}] first.`,
    `P = [${P.join(', ')}], K = ${k}`,
    'With negatives, adding a number can lower the sum, so "expand then shrink" is no longer monotone. Prefix sums P turn every subarray sum into a difference P[j] − P[i], and a monotonic deque over P restores the speed.', 'info', -1, -1, [1, 2, 3, 4, 5], [1, 2, 3, 4], 0);

  for (let j = 0; j <= n; j++) {
    while (dq.length && P[j] - P[dq[0]] >= k) {
      const i = dq.shift()!;
      const len = j - i;
      const better = len < best;
      const old = best;
      if (better) { best = len; bi = i; bj = j; }
      add(`P[${j}] − P[${i}] = ${P[j]} − ${P[i]} = ${P[j] - P[i]} ≥ ${k}`, 'RECORD:',
        `P[${j}]−P[${i}] = ${P[j] - P[i]} ≥ ${k} → nums[${i}..${j - 1}] has length ${len}${better ? ` 🏆 NEW BEST! best = ${best}` : `, best stays ${best}`}; pop index ${i}`,
        `best = min(${old === Infinity ? '∞' : old}, ${j} − ${i}) = ${best}; pollFirst()`,
        'Once index i has produced a valid answer for this j, any later j gives a longer subarray from i, so i is finished and can be dropped.', better ? 'success' : 'info', j, i, [8, 9, 10], [7, 8, 9], 1);
    }
    const dropped: number[] = [];
    while (dq.length && P[dq[dq.length - 1]] >= P[j]) dropped.push(dq.pop()!);
    dq.push(j);
    add(`Push ${j}${dropped.length ? `, drop [${dropped.join(', ')}]` : ''}`, 'PUSH:',
      dropped.length ? `P[${j}]=${P[j]} ≤ ${dropped.map((c) => `P[${c}]=${P[c]}`).join(', ')}; a later, smaller prefix is a better left end, so ${dropped.length === 1 ? 'that index is' : 'those indexes are'} dropped and ${j} is pushed` : `P[${j}]=${P[j]} is larger than the back of the deque, so index ${j} joins the back`,
      dropped.length ? `pollLast × ${dropped.length}, addLast(${j}); deque = [${dq.join(', ')}]` : `addLast(${j}); deque = [${dq.join(', ')}]`,
      'Keep P strictly increasing along the deque: a left end with a bigger prefix and an earlier position is dominated.', dropped.length ? 'warn' : 'info', j, -1, [12, 13, 14], [10, 11, 12], 2,
      dropped.length ? `Prefix index ${dropped.join(', ')} is dominated by ${j}: never a useful left end again.` : undefined);
  }

  const found = best !== Infinity;
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: found ? `shortest length is ${best}: nums[${bi}..${bj - 1}] = [${nums.slice(bi, bj).join(', ')}] sums to ${P[bj] - P[bi]} ≥ ${k}` : `no subarray ever reached ${k}, so the answer is −1`,
    note: found ? `return ${best}` : 'best = n + 1 → return −1',
    scene: scene(-1, true), aux: aux(), vars: vars('—'),
    alert: found ? undefined : `Every prefix difference stayed below K = ${k}.`,
    logic: found ? 'Every prefix index entered the deque once and left once.' : 'Return −1.', logicTone: found ? 'success' : 'warn', javaLines: [16], pyLines: [13], algoStep: 3,
    result: { title: String(found ? best : -1), text: found ? `Shortest subarray with sum ≥ ${k} has length ${best}` : 'No valid subarray' },
  });
  return steps;
}

export const shortestSubarraySumAtLeastK: ProblemDef<In> = {
  slug: '862-shortest-subarray-with-sum-at-least-k',
  id: '862', title: 'Shortest Subarray with Sum at Least K', difficulty: 'Hard', category: 'Arrays', tag: 'prefix sums + monotonic deque',
  statement: 'Given an integer array (which may contain negative numbers) and an integer K, return the length of the shortest non-empty contiguous subarray whose sum is at least K, or −1 if there is none.',
  constraints: '1 ≤ n ≤ 10⁵, −10⁵ ≤ nums[i] ≤ 10⁵, 1 ≤ K ≤ 10⁹ (animation input is limited to 12 numbers from −20 to 20)',
  examples: [
    { label: '2 -1 2 | K = 3', input: { nums: [2, -1, 2], k: 3 }, output: '3', answer: '3 (the whole array [2, −1, 2] sums to 3)' },
    { label: '1 2 | K = 4', input: { nums: [1, 2], k: 4 }, output: '-1' },
    { label: '5 -3 4 -6 8 1 | K = 9', input: { nums: [5, -3, 4, -6, 8, 1], k: 9 }, output: '2' },
  ],
  inputPlaceholder: 'numbers | K, e.g. 2 -1 2 | 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'nums and prefix sums',
  legend: [{ label: 'Current prefix j', state: 'active' }, { label: 'Deque front (best left end)', state: 'found' }, { label: 'Other deque candidate', state: 'sorted' }, { label: 'Just popped as answer', state: 'error' }],
  varLabels: ['j', 'K', 'P[j]', 'best'],
  emphasis: ['shortest non-empty contiguous subarray', 'at least K', 'negative'],
  phases: [
    { icon: '🧮', label: 'BUILD prefix sums P', tone: 'blue' },
    { icon: '★', label: 'RECORD (front reaches K)', tone: 'gold' },
    { icon: '⬇', label: 'PUSH j (drop dominated)', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Prefix sums, then a deque of left ends',
    text: 'Compute P with P[0] = 0. A subarray nums[i..j−1] has sum P[j] − P[i]. Walk j from left to right. While the front of the deque satisfies P[j] − P[front] ≥ K, record j − front and pop it. Then pop every back index whose P is not smaller than P[j], and push j.',
  },
  java: [
    'public int shortestSubarray(int[] nums, int K) {',
    '    int n = nums.length;',
    '    long[] P = new long[n + 1];',
    '    for (int i = 0; i < n; i++) P[i + 1] = P[i] + nums[i];',
    '    Deque<Integer> dq = new ArrayDeque<>();',
    '    int best = n + 1;',
    '    for (int j = 0; j <= n; j++) {',
    '        // pop finished left ends from the front',
    '        while (!dq.isEmpty() && P[j] - P[dq.peekFirst()] >= K) {',
    '            best = Math.min(best, j - dq.peekFirst());',
    '            dq.pollFirst();',
    '        }',
    '        while (!dq.isEmpty() && P[dq.peekLast()] >= P[j])',
    '            dq.pollLast();',
    '        dq.addLast(j);',
    '    }',
    '    return best == n + 1 ? -1 : best;',
    '}',
  ],
  python: [
    'def shortest_subarray(nums, K):',
    '    n = len(nums)',
    '    P = [0] * (n + 1)',
    '    for i, x in enumerate(nums): P[i + 1] = P[i] + x',
    '    dq = deque()',
    '    best = n + 1',
    '    for j in range(n + 1):',
    '        while dq and P[j] - P[dq[0]] >= K:',
    '            best = min(best, j - dq[0])',
    '            dq.popleft()',
    '        while dq and P[dq[-1]] >= P[j]:',
    '            dq.pop()',
    '        dq.append(j)',
    '    return -1 if best == n + 1 else best',
  ],
  algorithm: [
    'Build prefix sums P so any subarray sum is P[j] − P[i]',
    'Record: while P[j] − P[front] ≥ K, record the length j − front and pop the front',
    'Push: pop back indexes with P ≥ P[j] (the deque keeps P increasing), then push j',
    'Return the best length (or −1)',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Two exchange arguments. (1) A left end i that already reached K at some j is useless afterwards: later j only make the subarray longer. (2) If an earlier index has a prefix at least as big as a later one, the later index is a shorter and larger-sum left end for every future j, so the earlier one is dominated. What remains is increasing, and both removals are amortised O(1).',
};
