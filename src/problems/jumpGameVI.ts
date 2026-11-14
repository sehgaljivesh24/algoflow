import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { parseNumsAndK, twoRows } from './pack1Kit.ts';

interface In { nums: number[]; k: number }

function parse(raw: string): In {
  return parseNumsAndK(raw, { example: '1 -1 -2 4 -7 3 | 2', what: 'the numbers', minLen: 1, lo: -20, hi: 20, kName: 'k', kMin: 1, kMax: (n) => Math.max(1, n) });
}

function build({ nums, k }: In): Step[] {
  const n = nums.length;
  const dp: (number | null)[] = nums.map(() => null);
  const dq: number[] = []; // indexes whose dp values decrease from front to back
  const steps: Step[] = [];
  dp[0] = nums[0];
  dq.push(0);

  const scene = (cur: number, gone = -1) => {
    const top: (CellState | undefined)[] = nums.map((_, j) => (j === cur ? 'active' : cur >= 0 && j >= cur - k && j < cur ? 'compare' : undefined));
    const bot: (CellState | undefined)[] = nums.map((_, j) => {
      if (j === gone) return 'error';
      if (j === cur) return 'active';
      if (dq.length && j === dq[0]) return 'found';
      return dq.includes(j) ? 'sorted' : undefined;
    });
    return twoRows('nums', nums, top, 'dp', dp, bot);
  };
  const aux = () => [{ title: 'deque of indexes (front = best dp in reach)', kind: 'queue' as const, items: dq.map((j) => `${j}: dp=${dp[j]}`) }];
  const vars = (i: number | string) => ({ i, k, front: dq.length ? dq[0] : '—', 'dp[i]': typeof i === 'number' && dp[i] !== null ? (dp[i] as number) : '—' });
  const add = (title: string, tag: string, desc: string, note: string, logic: string, tone: 'info' | 'warn' | 'success', cur: number, gone: number, j: number[], p: number[], a: number, alert?: string) =>
    steps.push({ title, tag, desc, note, alert, scene: scene(cur, gone), aux: aux(), vars: vars(cur >= 0 ? cur : '—'), logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a });

  add('Start', 'READY —', `dp[i] = best score of any path landing on index i. dp[0] = nums[0] = ${nums[0]}; every jump moves 1 to ${plural(k, 'step')} right.`,
    `dp[0] = ${nums[0]}, dq = [0]`,
    'dp[i] = nums[i] + max(dp[i−k .. i−1]). A plain scan of that range costs O(k) per cell. The deque keeps the best dp value in reach at its front.', 'info', 0, -1, [1, 2, 3, 4, 5], [1, 2, 3, 4], 0);

  for (let i = 1; i < n; i++) {
    if (dq[0] < i - k) {
      const j = dq.shift()!;
      add(`Index ${j} is out of reach of ${i}`, 'EXPIRE:', `index ${j} is ${i - j} steps behind ${i}, more than k=${k}, so it leaves the front of the deque`,
        `${j} < ${i} − ${k} = ${i - k} → pollFirst()`,
        'The window of reachable predecessors is [i − k, i − 1]. Expired indexes only ever sit at the front.', 'warn', i, j, [7], [6, 7], 0,
        `Index ${j} is too far from index ${i} to jump from.`);
    }
    dp[i] = nums[i] + (dp[dq[0]] as number);
    add(`dp[${i}] = nums[${i}] + dp[${dq[0]}] = ${nums[i]} + ${dp[dq[0]]} = ${dp[i]}`, 'COMPUTE:', `front index ${dq[0]} has the best dp in reach (${dp[dq[0]]}), so dp[${i}] = ${nums[i]} + ${dp[dq[0]]} = ${dp[i]}`,
      `dp[${i}] = nums[${i}] + dp[${dq[0]}] = ${nums[i]} + ${dp[dq[0]]} = ${dp[i]}`,
      'Reading the best predecessor is O(1).', 'success', i, -1, [8], [8], 1);
    const dropped: number[] = [];
    while (dq.length && (dp[dq[dq.length - 1]] as number) <= (dp[i] as number)) dropped.push(dq.pop()!);
    dq.push(i);
    add(`Push ${i}${dropped.length ? `, drop [${dropped.join(', ')}]` : ''}`, 'PUSH:',
      dropped.length ? `dp[${i}]=${dp[i]} ≥ ${dropped.map((j) => `dp[${j}]=${dp[j]}`).join(', ')} and is newer, so ${dropped.length === 1 ? 'that one is' : 'those are'} dominated; push ${i}` : `dp[${i}]=${dp[i]} is below the back candidate, so index ${i} joins the back`,
      dropped.length ? `pollLast × ${dropped.length}, addLast(${i}); deque = [${dq.join(', ')}]` : `addLast(${i}); deque = [${dq.join(', ')}]`,
      'Keep dp values strictly decreasing from front to back: a worse and older candidate is dominated.', dropped.length ? 'warn' : 'info', i, -1, [9, 10, 11], [9, 10, 11], 2,
      dropped.length ? `Index ${dropped.join(', ')} can never be the best launch point again.` : undefined);
  }

  const ans = dp[n - 1] as number;
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `the best score when landing on the last index is dp[${n - 1}] = ${ans}`, note: `return dp[${n - 1}] = ${ans}`, scene: scene(-1), aux: aux(), vars: vars('—'),
    logic: 'Each index entered and left the deque once, so the DP ran in O(n).', logicTone: 'success', javaLines: [13], pyLines: [12], algoStep: 3,
    result: { title: String(ans), text: `Maximum score = ${ans}` },
  });
  return steps;
}

export const jumpGameVI: ProblemDef<In> = {
  slug: '1696-jump-game-vi',
  id: '1696', title: 'Jump Game VI', difficulty: 'Medium', category: 'Arrays', tag: 'DP + monotonic deque',
  statement: 'You start at index 0 and must reach the last index. From index i you may jump to any index from i+1 to i+k. Your score is the sum of nums at every index you land on (including both ends). Return the maximum score.',
  constraints: '1 ≤ n ≤ 10⁵, 1 ≤ k ≤ n, −10⁴ ≤ nums[i] ≤ 10⁴ (animation input is limited to 12 numbers from −20 to 20)',
  examples: [
    { label: '1 -1 -2 4 -7 3 | k = 2', input: { nums: [1, -1, -2, 4, -7, 3], k: 2 }, output: '7', answer: '7 (path 1 → −1 → 4 → 3)' },
    { label: '10 -5 -2 4 0 3 | k = 3', input: { nums: [10, -5, -2, 4, 0, 3], k: 3 }, output: '17' },
    { label: '1 -5 -20 4 -1 3 -6 -3 | k = 2', input: { nums: [1, -5, -20, 4, -1, 3, -6, -3], k: 2 }, output: '0' },
  ],
  inputPlaceholder: 'numbers | k, e.g. 1 -1 -2 4 -7 3 | 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'nums and dp',
  legend: [{ label: 'Current index', state: 'active' }, { label: 'Reachable from i', state: 'compare' }, { label: 'Best predecessor (deque front)', state: 'found' }, { label: 'Other deque candidate', state: 'sorted' }, { label: 'Just expired', state: 'error' }],
  varLabels: ['i', 'k', 'front', 'dp[i]'],
  phases: [
    { icon: '⌛', label: 'EXPIRE front (out of reach)', tone: 'orange' },
    { icon: '🧮', label: 'COMPUTE dp[i]', tone: 'cyan' },
    { icon: '⬇', label: 'PUSH i (drop dominated)', tone: 'blue' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['maximum score', 'i+1 to i+k'],
  approach: {
    title: 'A DP whose max-over-window is a monotonic deque',
    text: 'dp[i] is nums[i] plus the best dp among the previous k cells. Instead of scanning those k cells, keep a deque of indexes with decreasing dp. Expire the front when it is more than k steps behind, read dp[front], then pop dominated candidates from the back and push i.',
  },
  java: [
    'public int maxResult(int[] nums, int k) {',
    '    int n = nums.length;',
    '    int[] dp = new int[n];',
    '    dp[0] = nums[0];',
    '    Deque<Integer> dq = new ArrayDeque<>();',
    '    dq.addLast(0);',
    '    for (int i = 1; i < n; i++) {',
    '        if (dq.peekFirst() < i - k) dq.pollFirst();',
    '        dp[i] = nums[i] + dp[dq.peekFirst()];',
    '        while (!dq.isEmpty() && dp[dq.peekLast()] <= dp[i])',
    '            dq.pollLast();',
    '        dq.addLast(i);',
    '    }',
    '    return dp[n - 1];',
    '}',
  ],
  python: [
    'def max_result(nums, k):',
    '    n = len(nums)',
    '    dp = [0] * n',
    '    dp[0] = nums[0]',
    '    dq = deque([0])',
    '    for i in range(1, n):',
    '        if dq[0] < i - k:',
    '            dq.popleft()',
    '        dp[i] = nums[i] + dp[dq[0]]',
    '        while dq and dp[dq[-1]] <= dp[i]:',
    '            dq.pop()',
    '        dq.append(i)',
    '    return dp[-1]',
  ],
  algorithm: [
    'Expire: with dp[0] = nums[0] and index 0 in the deque, pop the front if it is more than k steps behind i',
    'Compute: dp[i] = nums[i] + dp[front of the deque]',
    'Push: pop smaller-or-equal dp values off the back, then push i',
    'Return dp[n − 1]',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'If an older index j has dp[j] ≤ dp[i] for a newer index i, then i is a better launch point for every future cell that j can reach (i is in range for at least as long). So j is dominated and can be discarded, which keeps dp decreasing along the deque and puts the best reachable predecessor at the front.',
};
