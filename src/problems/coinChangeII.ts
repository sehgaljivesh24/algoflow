import type { ProblemDef, Step } from '../engine/types.ts';
import { capSteps, parseInts, recorder } from './stepKit.ts';
import { rowCells } from './dpCoreKit.ts';

interface In { coins: number[]; amount: number }

function parse(raw: string): In {
  const [left, right] = raw.split(';');
  if (right === undefined) throw new Error('Format: coins ; amount — e.g. 1 2 5 ; 5');
  const coins = parseInts(left, { what: 'coin values', example: '1 2 5', minLen: 1, maxLen: 4, lo: 1, hi: 12, distinct: true });
  const amount = Number(right.trim());
  if (!Number.isInteger(amount) || amount < 0 || amount > 12) throw new Error('The amount must be a whole number from 0 to 12');
  return capSteps(build, { coins, amount });
}

/** Ordered sequences (the answer you get if the loops are swapped), shown for contrast in the last step. */
function sequences(coins: number[], amount: number): number {
  const d = Array(amount + 1).fill(0);
  d[0] = 1;
  for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) d[a] += d[a - c];
  return d[amount];
}

function build({ coins, amount }: In): Step[] {
  const dp: number[] = Array(amount + 1).fill(0);
  const touched: boolean[] = Array(amount + 1).fill(false);
  const steps: Step[] = [];
  let ci = -1;
  let a = -1;
  let from = -1;
  let done = false;

  const snap = () => ({
    cells: rowCells('a', dp, (i) => (i === a ? (done ? 'found' : 'active') : i === from ? 'compare' : undefined), (i) => (touched[i] ? 'purple' : undefined)),
    pointers: [
      ...(a >= 0 ? [{ id: 'a', label: 'a', index: a, tone: 'blue' as const }] : []),
      ...(from >= 0 ? [{ id: 'f', label: `a−${coins[ci]}`, index: from, tone: 'orange' as const }] : []),
    ],
    aux: [{ title: 'coins (outer loop)', kind: 'list' as const, items: coins.map(String), highlight: ci >= 0 ? ci : undefined }],
    vars: { coin: ci >= 0 ? coins[ci] : '—', a: a < 0 ? '—' : a, 'dp[a]': a < 0 ? '—' : dp[a], 'dp[a-coin]': from < 0 ? '—' : dp[from] },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the array', desc: `dp[a] = the number of different coin combinations (order ignored) that add up to a, using coins ${coins.join(', ')}.`,
    logic: 'Counting problems add the ways of the sub-cases instead of taking a minimum.', java: [0, 1], py: [0, 1], algo: 0,
    tag: 'DEFINE —', note: `dp[0..${amount}] = 0, coins = [${coins.join(', ')}]`,
  });

  dp[0] = 1;
  a = 0;
  done = true;
  say({
    title: 'Base case dp[0] = 1', desc: 'There is exactly one way to make amount 0: use no coins at all.',
    logic: 'This single "empty" way is what every later combination grows from.', tone: 'success', java: [2], py: [2], algo: 1,
    tag: 'BASE CASE —', note: 'dp[0] = 1 (the empty combination)',
  });

  coins.forEach((coin, idx) => {
    ci = idx;
    touched.fill(false);
    a = -1;
    from = -1;
    done = false;
    say({
      title: `Allow coin ${coin}`, desc: `Coin ${coin} is now allowed in addition to the earlier coins. Go through amounts ${coin}..${amount} upward and add dp[a − ${coin}].`,
      logic: 'The coin is the OUTER loop, so every combination is built in coin order (all 1s, then 2s, …) and is counted exactly once.', java: [3, 4], py: [3, 4], algo: 2,
      tag: `ALLOW COIN ${coin} —`, note: `for a = ${coin}..${amount}: dp[a] += dp[a − ${coin}]`,
    });
    for (let x = coin; x <= amount; x++) {
      a = x;
      from = x - coin;
      done = false;
      const add = dp[from];
      const was = dp[x];
      dp[x] += add;
      if (add > 0) touched[x] = true;
      done = true;
      say({
        title: `Amount ${x}: dp[${x}] = ${dp[x]}`, desc: `Add dp[${from}] = ${add}: every combination for ${from} can take one more coin ${coin}. New total ${dp[x]}.`,
        logic: add ? 'Upward order lets the same coin repeat; the purple cells changed during this coin\'s pass.' : 'No combination makes the remainder, so nothing is added.', tone: add ? 'success' : 'info', java: [5], py: [5], algo: 2,
        tag: add ? `ADD +${add} —` : 'NO CHANGE —', note: `dp[${x}] = ${was} + dp[${from}] = ${was} + ${add} = ${dp[x]}`,
      });
    }
  });

  ci = -1;
  from = -1;
  a = amount;
  done = true;
  const seq = sequences(coins, amount);
  say({
    title: 'Done', tag: '✅ Done!', note: `return dp[${amount}] = ${dp[amount]} (ordered sequences would be ${seq})`, desc: `${dp[amount]} combination${dp[amount] === 1 ? '' : 's'} make ${amount}. (Counting ordered sequences instead — swapping the loops — would give ${seq}.)`,
    logic: 'Coins outside, amounts inside counts combinations; amounts outside, coins inside counts sequences.', tone: 'success', java: [8], py: [6], algo: 3,
    result: { title: String(dp[amount]), text: 'Combinations' },
  });
  return steps;
}

export const coinChangeII: ProblemDef<In> = {
  slug: '518-coin-change-ii',
  id: '518', title: 'Coin Change II', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'unbounded knapsack (count combinations)',
  statement: 'Given coin denominations (unlimited supply of each) and a target amount, count how many different combinations of coins add up to exactly the amount. Two combinations are the same if they use the same number of each coin, regardless of order.',
  constraints: '1 ≤ coins.length ≤ 300, 0 ≤ amount ≤ 5000 (animation input: ≤ 4 distinct coins of value ≤ 12, amount ≤ 12)',
  examples: [
    { label: 'coins 1 2 5, amount 5', input: { coins: [1, 2, 5], amount: 5 }, output: '4' },
    { label: 'coins 2, amount 3', input: { coins: [2], amount: 3 }, output: '0' },
    { label: 'coins 1 2 3, amount 6', input: { coins: [1, 2, 3], amount: 6 }, output: '7' },
  ],
  inputPlaceholder: 'coins ; amount, e.g. 1 2 5 ; 5',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizCaption: 'dp[a] — number of combinations making a (purple = changed in this coin\'s pass)',
  legend: [{ label: 'Amount being updated', state: 'active' }, { label: 'dp[a − coin]', state: 'compare' }, { label: 'Updated', state: 'found' }, { label: 'Not yet changed', state: 'dim' }],
  varLabels: ['coin', 'a', 'dp[a]', 'dp[a-coin]'],
  emphasis: ['combinations', 'unlimited supply', 'regardless of order'],
  phases: [
    { icon: '🧱', label: 'Define dp[a] = #ways', tone: 'blue' },
    { icon: '🌱', label: 'Base dp[0] = 1', tone: 'blue' },
    { icon: '🪙', label: 'Coin outer, amount inner', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Coins outside, amounts inside',
    text: 'dp[0] = 1 and the rest are 0. For each coin in turn, sweep amounts from the coin value up to the target and add dp[a − coin] to dp[a]. The answer is dp[amount]. Putting the coin loop outermost counts combinations; swapping the loops would count ordered sequences.',
  },
  java: [
    'public int change(int amount, int[] coins) {',
    '    int[] dp = new int[amount + 1];',
    '    dp[0] = 1;                                   // one way to make 0: take nothing',
    '    for (int coin : coins) {                     // coins outside: each combination counted once',
    '        for (int a = coin; a <= amount; a++) {   // ascending: the coin may repeat',
    '            dp[a] += dp[a - coin];',
    '        }',
    '    }',
    '    return dp[amount];',
    '}',
  ],
  python: [
    'def change(amount, coins):',
    '    dp = [0] * (amount + 1)',
    '    dp[0] = 1                                    # one way to make 0: take nothing',
    '    for coin in coins:                           # coins outside: each combination counted once',
    '        for a in range(coin, amount + 1):        # ascending: the coin may repeat',
    '            dp[a] += dp[a - coin]',
    '    return dp[amount]',
  ],
  algorithm: [
    'dp[a] = number of combinations that make a',
    'Base case: dp[0] = 1',
    'For each coin (outer loop) and each a ≥ coin (inner, ascending): dp[a] += dp[a − coin]',
    'Return dp[amount]',
  ],
  complexity: [{ label: 'Time', value: 'O(amount × coins)' }, { label: 'Space', value: 'O(amount)' }],
  why: 'After the pass for the first k coins, dp[a] counts the combinations that use only those coins. Allowing coin k+1 adds exactly the combinations that contain it at least once; removing one copy of it leaves a combination of the first k+1 coins for a − coin, which is dp[a − coin] in the same upward pass. Because each coin has its own pass, a multiset of coins is generated in only one order, so combinations are never double counted.',
};
