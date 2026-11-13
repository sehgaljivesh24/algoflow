import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { parseInts, recorder } from './stepKit.ts';

interface In { coins: number[]; amount: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: coins ; amount — e.g. 1 2 5 ; 11');
  const coins = parseInts(left, { what: 'coin values', example: '1 2 5', minLen: 1, maxLen: 4, lo: 1, hi: 20, distinct: true });
  const amount = Number(right.trim());
  if (!Number.isInteger(amount) || amount < 0 || amount > 14) throw new Error('The amount must be a whole number from 0 to 14');
  return { coins, amount };
}

function build({ coins: input, amount }: In): Step[] {
  const coins = [...input].sort((a, b) => a - b);
  const INF = amount + 1;
  const dp: (number | null)[] = Array(amount + 1).fill(null);
  const show = (v: number | null) => (v === null ? '?' : v >= INF ? '∞' : v);
  const steps: Step[] = [];
  let a = -1;
  let from = -1;
  let coin: number | string = '—';
  let cand: number | string = '—';
  let done = false;

  const snap = () => ({
    cells: dp.map((v, i): Cell => {
      let state: CellState | undefined;
      if (i === a) state = done ? 'found' : 'active';
      else if (i === from) state = 'compare';
      else if (v === null) state = 'dim';
      return { key: i, value: show(v), state };
    }),
    pointers: [
      ...(a >= 0 ? [{ id: 'a', label: 'a', index: a, tone: 'blue' as const }] : []),
      ...(from >= 0 ? [{ id: 'f', label: `a−${coin}`, index: from, tone: 'orange' as const }] : []),
    ],
    aux: [{ title: 'coins', kind: 'list' as const, items: coins.map(String) }],
    vars: { a: a < 0 ? '—' : a, coin, 'dp[a-coin]+1': cand, 'dp[a]': a >= 0 && dp[a] !== null ? show(dp[a]) : '—' },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', tag: 'DEFINE —', desc: `dp[a] = fewest coins that make amount a, using coins ${coins.join(', ')} (unlimited supply). ∞ means "cannot be made". Target: dp[${amount}].`,
    logic: 'The last coin used is some coin c, leaving amount a − c, so dp[a] = 1 + the best dp[a − c] over all coins c.',
    java: [0, 1, 2], py: [0, 1, 2], algo: 0, note: `dp[0..${amount}] = ∞ (${INF}), coins = [${coins.join(', ')}]`,
  });

  dp[0] = 0;
  a = 0;
  done = true;
  say({
    title: 'Base case dp[0] = 0', tag: 'BASE CASE —', desc: 'Zero coins are needed to make amount 0, so dp[0] = 0.',
    logic: 'This is where every chain of coin subtractions ends.', tone: 'success', java: [3], py: [3], algo: 1, note: 'dp[0] = 0',
  });

  for (let x = 1; x <= amount; x++) {
    dp[x] = INF;
    a = x;
    done = false;
    for (const c of coins) {
      if (c > x) continue;
      from = x - c;
      coin = c;
      const prev = dp[x - c]!;
      cand = prev >= INF ? '∞' : prev + 1;
      const before = dp[x]!;
      const better = prev < INF && prev + 1 < before;
      if (better) dp[x] = prev + 1;
      say({
        title: `a = ${x}, try coin ${c}`, tag: better ? `BEST COIN ${c} —` : `TRY COIN ${c} —`,
        desc: prev >= INF ? `Amount ${x - c} cannot be made, so coin ${c} does not help here.` : `dp[${x - c}] + 1 = ${prev} + 1 = ${prev + 1}. ${better ? `Better than before: dp[${x}] = ${dp[x]}.` : `Not better than the current ${dp[x]! >= INF ? '∞' : dp[x]}.`}`,
        logic: 'Try every coin as the last one used and keep the smallest total.', tone: better ? 'success' : 'info', java: [4, 5, 6], py: [4, 5, 6, 7], algo: 2,
        note: prev >= INF ? `dp[${x - c}] = ∞ → skip` : `min(${before >= INF ? '∞' : before}, dp[${x - c}] + 1 = ${prev + 1}) = ${better ? prev + 1 : before}`,
      });
    }
    from = -1;
    coin = '—';
    cand = '—';
    done = true;
    say({
      title: `dp[${x}] = ${show(dp[x])}`, tag: dp[x]! >= INF ? 'UNREACHABLE —' : 'STORE —',
      desc: dp[x]! >= INF ? `No coin combination makes ${x}: dp[${x}] stays ∞.` : `The fewest coins for ${x} is ${dp[x]}, so dp[${x}] = ${dp[x]}.`,
      logic: dp[x]! >= INF ? 'Every coin led to an unreachable remainder.' : 'Stored for larger amounts to build on.', tone: dp[x]! >= INF ? 'warn' : 'success', java: [6], py: [7], algo: 2,
      note: `dp[${x}] = ${show(dp[x])}`,
      ...(dp[x]! >= INF ? { alert: `Amount ${x} cannot be made with coins ${coins.join(', ')}, so dp[${x}] stays ∞.` } : {}),
    });
  }

  a = amount;
  from = -1;
  coin = '—';
  cand = '—';
  done = true;
  const ans = dp[amount]! >= INF ? -1 : dp[amount]!;
  say({
    title: 'Done', tag: ans === -1 ? '❌ Impossible!' : '✅ Done!',
    desc: ans === -1 ? `Amount ${amount} cannot be made with these coins: return -1.` : `Amount ${amount} needs ${ans} coin${ans === 1 ? '' : 's'}: the answer is dp[${amount}] = ${ans}.`,
    logic: ans === -1 ? 'Staying at "infinity" means no combination exists.' : 'dp[amount] holds the minimum.', tone: ans === -1 ? 'warn' : 'success', java: [9], py: [8],
    note: ans === -1 ? `dp[${amount}] = ∞ → return -1` : `return dp[${amount}] = ${ans}`,
    algo: 3, result: { title: String(ans), text: ans === -1 ? 'Impossible' : 'Fewest coins' },
  });
  return steps;
}

export const coinChange: ProblemDef<In> = {
  slug: '322-coin-change',
  id: '322', title: 'Coin Change', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'unbounded knapsack',
  statement: 'Given coin denominations (each usable any number of times) and a target amount, return the fewest coins needed to make exactly that amount, or −1 if it is impossible.',
  constraints: '1 ≤ coins.length ≤ 12, 0 ≤ amount ≤ 10⁴ (animation input: ≤ 4 coins of value 1–20, amount ≤ 14)',
  emphasis: ['fewest coins', 'any number of times', 'exactly', '−1'],
  examples: [
    { label: 'coins 1 3 4, amount 6', input: { coins: [1, 3, 4], amount: 6 }, output: '2', answer: '2 coins (3 + 3; greedy 4 + 1 + 1 would need 3)' },
    { label: 'coins 1 2 5, amount 11', input: { coins: [1, 2, 5], amount: 11 }, output: '3' },
    { label: 'coins 2, amount 3', input: { coins: [2], amount: 3 }, output: '-1' },
  ],
  inputPlaceholder: 'coins ; amount, e.g. 1 2 5 ; 11',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Amount being solved', state: 'active' }, { label: 'a − coin (sub-problem)', state: 'compare' }, { label: 'Final value', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['a', 'coin', 'dp[a-coin]+1', 'dp[a]'],
  phases: [
    { icon: '🧱', label: 'Define dp[a] = ∞', tone: 'blue' },
    { icon: '🌱', label: 'Base dp[0] = 0', tone: 'blue' },
    { icon: '🪙', label: 'Try every coin as the last one', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Fewest coins for every amount up to the target',
    text: 'dp[0] = 0 and every other entry starts at ∞. For each amount a and each coin c ≤ a, dp[a] = min(dp[a], dp[a − c] + 1). If dp[amount] is still ∞, return −1.',
  },
  java: [
    'public int coinChange(int[] coins, int amount) {',
    '    int[] dp = new int[amount + 1];',
    '    Arrays.fill(dp, amount + 1);              // "infinity"',
    '    dp[0] = 0;',
    '    for (int a = 1; a <= amount; a++) {',
    '        for (int c : coins) {',
    '            if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);',
    '        }',
    '    }',
    '    return dp[amount] > amount ? -1 : dp[amount];',
    '}',
  ],
  python: [
    'def coin_change(coins, amount):',
    '    INF = amount + 1',
    '    dp = [INF] * (amount + 1)',
    '    dp[0] = 0',
    '    for a in range(1, amount + 1):',
    '        for c in coins:',
    '            if c <= a:',
    '                dp[a] = min(dp[a], dp[a - c] + 1)',
    '    return -1 if dp[amount] >= INF else dp[amount]',
  ],
  algorithm: [
    'dp[a] = fewest coins to make amount a; start every entry at ∞',
    'Base case: dp[0] = 0',
    'For each amount a and each coin c ≤ a: dp[a] = min(dp[a], dp[a−c] + 1)',
    'Return dp[amount], or −1 if it is still ∞',
  ],
  complexity: [{ label: 'Time', value: 'O(amount × coins)' }, { label: 'Space', value: 'O(amount)' }],
  why: 'Whatever the last coin c of an optimal solution for amount a is, the rest is an optimal solution for a − c (otherwise swap in a better one). Trying every coin as the last one and taking the minimum therefore finds the optimum, and smaller amounts are always solved first. Greedy choices fail here (coins 1,3,4 for 6), which is why the table is needed.',
};
