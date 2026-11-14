import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { parseInts, recorder } from './stepKit.ts';

interface In { cost: number[] }

function parse(raw: string): In {
  return { cost: parseInts(raw, { what: 'step costs', example: '10 15 20', minLen: 2, maxLen: 11, lo: 0, hi: 99 }) };
}

function build({ cost }: In): Step[] {
  const n = cost.length;
  const dp: (number | null)[] = Array(n + 1).fill(null);
  const steps: Step[] = [];
  let target = -1;
  let from: number[] = [];
  let done = false;
  let c1: number | string = '—';
  let c2: number | string = '—';

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: [
        cost.map((v, i): Cell => ({ key: `c${i}`, value: v, state: from.includes(i) ? 'compare' : undefined })).concat([{ key: 'c-top', value: '—', state: 'dim' }]),
        dp.map((v, i): Cell => {
          let state: CellState | undefined;
          if (i === target) state = done ? 'found' : 'active';
          else if (from.includes(i)) state = 'compare';
          else if (v === null) state = 'dim';
          return { key: `d${i}`, value: v === null ? '?' : v, state };
        }),
      ],
      rowHeads: ['cost[i]', 'dp[i]'],
      colHeads: Array.from({ length: n + 1 }, (_, i) => (i === n ? 'top' : String(i))),
    },
    vars: { i: target < 0 ? '—' : target, 'via 1 step': c1, 'via 2 steps': c2 },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', tag: 'DEFINE —', desc: `dp[i] is the minimum cost to stand on step i (the top is index ${n}); you may start on step 0 or step 1 for free.`,
    logic: 'Paying cost[i] is what lets you leave step i, so the price of arriving is paid when you depart from the previous steps.',
    java: [0, 1], py: [0, 1], algo: 0, note: `n = ${n}, dp has ${n + 1} cells`,
  });

  for (let i = 0; i <= 1; i++) {
    dp[i] = 0;
    target = i;
    from = [];
    done = true;
    say({
      title: `Base case dp[${i}] = 0`, tag: 'BASE:', desc: `standing on step ${i} costs nothing, because the climb may begin there for free.`,
      logic: 'The rules allow beginning on either of the first two steps.', tone: 'success', java: [2], py: [2], algo: 1, note: `dp[${i}] = 0`,
    });
  }

  for (let i = 2; i <= n; i++) {
    const via1 = dp[i - 1]! + cost[i - 1];
    const via2 = dp[i - 2]! + cost[i - 2];
    c1 = via1;
    c2 = via2;
    target = i;
    from = [i - 1, i - 2];
    done = false;
    say({
      title: `Reach ${i === n ? 'the top' : `step ${i}`}`, tag: 'OPTIONS:',
      desc: `to reach ${i === n ? 'the top' : `step ${i}`}: from ${i - 1} costs dp[${i - 1}] + cost[${i - 1}] = ${dp[i - 1]} + ${cost[i - 1]} = ${via1}; from ${i - 2} costs ${dp[i - 2]} + ${cost[i - 2]} = ${via2}.`,
      logic: 'You arrive by a 1-step from i−1 or a 2-step from i−2 and pay the cost of the step you left.', java: [3, 4], py: [3, 4], algo: 2,
      note: `${dp[i - 1]} + ${cost[i - 1]} = ${via1} vs ${dp[i - 2]} + ${cost[i - 2]} = ${via2}`,
    });
    dp[i] = Math.min(via1, via2);
    from = [];
    done = true;
    say({
      title: `dp[${i}] = min(${via1}, ${via2}) = ${dp[i]}`, tag: 'STORE:', desc: `the cheaper way to ${i === n ? 'the top' : `step ${i}`} is ${via1 <= via2 ? `from step ${i - 1}` : `from step ${i - 2}`} and costs ${dp[i]}.`,
      logic: 'Keep the cheaper of the two ways in.', tone: 'success', java: [4], py: [4], algo: 3, note: `dp[${i}] = min(${via1}, ${via2}) = ${dp[i]}`,
    });
  }

  c1 = '—';
  c2 = '—';
  target = n;
  from = [];
  done = true;
  say({
    title: 'Done', tag: '✅ Done!', desc: `the top is dp[${n}] = ${dp[n]}, so the cheapest way up costs ${dp[n]}.`,
    logic: 'The top sits one past the last step, so the answer is dp[n].', tone: 'success', java: [6], py: [5],
    algo: 4, note: `return dp[${n}] = ${dp[n]}`, result: { title: String(dp[n]), text: 'Minimum cost to reach the top' },
  });
  return steps;
}

export const minCostClimbingStairs: ProblemDef<In> = {
  slug: '746-min-cost-climbing-stairs',
  id: '746', title: 'Min Cost Climbing Stairs', difficulty: 'Easy', category: 'Dynamic Programming', tag: '1D DP',
  statement: 'cost[i] is the price to step off stair i, after which you climb one or two stairs. You may begin on stair 0 or stair 1. Return the minimum total cost to reach the top, which lies just past the last stair.',
  constraints: '2 ≤ cost.length ≤ 1000, 0 ≤ cost[i] ≤ 999 (animation input is limited to 2–11 values)',
  examples: [
    { label: '[10, 15, 20]', input: { cost: [10, 15, 20] }, output: '15' },
    { label: '[1,100,1,1,1,100,1,1,100,1]', input: { cost: [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] }, output: '6' },
    { label: '[5, 3, 8, 2]', input: { cost: [5, 3, 8, 2] }, output: '5' },
  ],
  inputPlaceholder: 'e.g. 10 15 20',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Computing', state: 'active' }, { label: 'Sources', state: 'compare' }, { label: 'Done', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['i', 'via 1 step', 'via 2 steps'],
  approach: {
    title: 'Cheapest way to arrive at each stair',
    text: 'dp[i] = min(dp[i−1] + cost[i−1], dp[i−2] + cost[i−2]) with dp[0] = dp[1] = 0. The answer is dp[n], the top.',
  },
  java: [
    'public int minCostClimbingStairs(int[] cost) {',
    '    int n = cost.length;',
    '    int[] dp = new int[n + 1];              // dp[0] = dp[1] = 0',
    '    for (int i = 2; i <= n; i++) {',
    '        dp[i] = Math.min(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2]);',
    '    }',
    '    return dp[n];',
    '}',
  ],
  python: [
    'def min_cost_climbing_stairs(cost):',
    '    n = len(cost)',
    '    dp = [0] * (n + 1)  # dp[0] = dp[1] = 0',
    '    for i in range(2, n + 1):',
    '        dp[i] = min(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2])',
    '    return dp[n]',
  ],
  phases: [
    { icon: '🧱', label: 'Define dp', tone: 'blue' },
    { icon: '🌱', label: 'Base cases', tone: 'cyan' },
    { icon: '🔀', label: 'Compare two ways in', tone: 'orange' },
    { icon: '💾', label: 'Store the cheaper', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['minimum total cost', 'top'],
  algorithm: [
    'dp[i] is the minimum cost to be standing on index i (top = n)',
    'Base cases: dp[0] = dp[1] = 0 (free starting spots)',
    'For i ≥ 2 compare arriving from i−1 with arriving from i−2',
    'Store the cheaper of the two in dp[i]',
    'Done: return dp[n]',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n), or O(1) with two variables' }],
  why: 'The last move into stair i must come from i−1 or i−2, and its cost is fixed by the stair it leaves. The cheapest way to reach each earlier stair is already stored, so taking the minimum of the two options is optimal (optimal substructure) and every state is computed once.',
};
