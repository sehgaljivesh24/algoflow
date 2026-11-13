import type { ProblemDef } from '../engine/types.ts';
import { buildStock, parsePrices, type StockSpec, type StockState } from './stockKit.ts';

interface In { k: number; prices: number[] }

function statesFor(k: number, prices: number[]): StockState[] {
  const out: StockState[] = [];
  for (let j = 1; j <= k; j++) {
    const b = 2 * (j - 1);
    const s = b + 1;
    out.push({
      name: `buy ${j}`, init: -prices[0],
      step: (prev, p) => {
        const before = j === 1 ? 0 : prev[s - 2];
        const start = before - p;
        return {
          value: Math.max(prev[b], start), from: j === 1 ? [b] : [b, s - 2], moved: start > prev[b],
          desc: `Keep the stock bought for trade ${j}: ${prev[b]}. Or start trade ${j} today after ${j === 1 ? 'doing nothing (profit 0)' : `finishing trade ${j - 1} (${before})`}: ${before} − ${p} = ${start}. ${start > prev[b] ? 'Starting now is better.' : 'Keep the earlier purchase.'}`,
        };
      },
    });
    out.push({
      name: `sell ${j}`, init: 0,
      step: (prev, p) => {
        const finish = prev[b] + p;
        return {
          value: Math.max(prev[s], finish), from: [s, b], moved: finish > prev[s],
          desc: `Keep the best finished profit for ${j} trade${j === 1 ? '' : 's'}: ${prev[s]}. Or sell today the stock held for trade ${j}: ${prev[b]} + ${p} = ${finish}. ${finish > prev[s] ? 'Selling now improves it.' : 'No improvement.'}`,
        };
      },
    });
  }
  return out;
}

const spec = (k: number): StockSpec => ({
  intro: {
    title: 'A state per trade and phase',
    desc: `With at most ${k} transaction${k === 1 ? '' : 's'}, the state is (how many trades are in progress or done, are we holding?). Row "buy j" = best profit while holding the stock of trade j; row "sell j" = best profit after finishing j trades. Columns are days.`,
    logic: 'Counting transactions in the state is what makes the limit k enforceable: trade j can only start from the profit of trade j − 1.',
  },
  baseDesc: 'On day 0 every buy row is −price (we may buy right away) and every sell row is 0 (no trade finished).',
  baseLogic: 'Selling on the same day you buy earns nothing, so these starting values are safe for every j.',
  answerRows: [2 * k - 1],
  logicPerState: Array.from({ length: 2 * k }, (_, r) => (r % 2 === 0 ? 'Buying trade j depends on the profit after trade j − 1 — the chain that limits us to k trades.' : 'Selling trade j adds today\'s price to the profit held in "buy j".')),
  doneDesc: (ans) => `The best profit with at most ${k} transaction${k === 1 ? '' : 's'} is the last "sell ${k}" cell: ${ans}.`,
  doneLogic: 'sell k is never smaller than sell k − 1 here, so the last row already allows "at most" k trades.',
  resultText: `Maximum profit with ≤ ${k} trades`,
  lines: {
    intro: { j: [0, 1], p: [0, 1] },
    base: { j: [1, 2], p: [1, 2] },
    state: Array.from({ length: 2 * k }, (_, r) => (r % 2 === 0 ? { j: [5], p: [5] } : { j: [6], p: [6] })),
    done: { j: [9], p: [7] },
  },
});

export const stockAtMostK: ProblemDef<In> = {
  slug: '188-best-time-to-buy-and-sell-stock-iv',
  id: '188', title: 'Best Time to Buy and Sell Stock IV', difficulty: 'Hard', category: 'Dynamic Programming', tag: 'state machine DP (k transactions)',
  statement: 'Given daily prices and an integer k, return the maximum profit using at most k transactions (each is a buy followed by a later sell; you must sell before buying again).',
  constraints: '1 ≤ k ≤ 100, 1 ≤ prices.length ≤ 1000 (animation input: k from 1 to 3, 2–8 prices between 0 and 30)',
  examples: [
    { label: 'k = 2, prices 3 2 6 5 0 3', input: { k: 2, prices: [3, 2, 6, 5, 0, 3] }, output: '7' },
    { label: 'k = 1, prices 2 4 1', input: { k: 1, prices: [2, 4, 1] }, output: '2' },
    { label: 'k = 2, prices 3 3 5 0 0 3 1 4', input: { k: 2, prices: [3, 3, 5, 0, 0, 3, 1, 4] }, output: '6' },
  ],
  inputPlaceholder: 'k ; prices, e.g. 2 ; 3 2 6 5 0 3',
  parseInput: (raw) => {
    const [left, right] = raw.split(';');
    if (right === undefined) throw new Error('Format: k ; prices — e.g. 2 ; 3 2 6 5 0 3');
    const k = Number(left.trim());
    if (!Number.isInteger(k) || k < 1 || k > 3) throw new Error('k must be a whole number from 1 to 3');
    return { k, prices: parsePrices(right) };
  },
  buildSteps: ({ k, prices }) => buildStock(prices, statesFor(k, prices), spec(k)), viz: 'cells',
  vizCaption: 'rows = buy j / sell j, columns = days (price after the colon) — green tint = a transition fired',
  legend: [{ label: 'Cell being computed', state: 'active' }, { label: 'Yesterday\'s cells it reads', state: 'compare' }, { label: 'Computed / answer cell', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['day', 'price', 'state', 'value'],
  emphasis: ['at most k transactions', 'maximum profit'],
  phases: [
    { icon: '🔀', label: 'A buy / sell state per trade', tone: 'blue' },
    { icon: '🌅', label: 'Day 0 start values', tone: 'blue' },
    { icon: '⛓️', label: 'Advance a day: chain the trades', tone: 'cyan' },
    { icon: '✅', label: 'Done: last "sell k"', tone: 'green' },
  ],
  approach: {
    title: 'Buy/sell pair for every transaction',
    text: 'Keep buy[j] and sell[j] for j = 1..k. Each day: buy[j] = max(buy[j], sell[j−1] − p) (with sell[0] = 0) and sell[j] = max(sell[j], buy[j] + p). Start with buy[j] = −prices[0], sell[j] = 0. The answer is sell[k].',
  },
  java: [
    'public int maxProfit(int k, int[] prices) {',
    '    int[] buy = new int[k + 1], sell = new int[k + 1];   // buy[j]: best while holding for trade j',
    '    Arrays.fill(buy, -prices[0]);                        // day 0: could already hold; sell[] stays 0',
    '    for (int i = 1; i < prices.length; i++) {',
    '        for (int j = 1; j <= k; j++) {',
    '            buy[j] = Math.max(buy[j], sell[j - 1] - prices[i]);   // start trade j after trade j-1',
    '            sell[j] = Math.max(sell[j], buy[j] + prices[i]);      // finish trade j today',
    '        }',
    '    }',
    '    return sell[k];',
    '}',
  ],
  python: [
    'def max_profit(k, prices):',
    '    buy = [-prices[0]] * (k + 1)             # buy[j]: best while holding for trade j',
    '    sell = [0] * (k + 1)                     # sell[j]: best after j finished trades',
    '    for p in prices[1:]:',
    '        for j in range(1, k + 1):',
    '            buy[j] = max(buy[j], sell[j - 1] - p)    # start trade j after trade j-1',
    '            sell[j] = max(sell[j], buy[j] + p)       # finish trade j today',
    '    return sell[k]',
  ],
  algorithm: [
    'State per trade: buy[j] (holding for trade j) and sell[j] (after j finished trades)',
    'Day 0: buy[j] = −price, sell[j] = 0',
    'Each day and each j: buy[j] = max(buy[j], sell[j−1] − p); sell[j] = max(sell[j], buy[j] + p)',
    'Answer: sell[k]',
  ],
  complexity: [{ label: 'Time', value: 'O(n · k)' }, { label: 'Space', value: 'O(k)' }],
  why: 'A path through the states is a legal trading plan: buy j is only reachable from sell j − 1, so a plan can never contain more than k complete trades. Each cell stores the best profit over all plans ending in that state on that day, and a plan\'s last move is one of the two transitions into the state, so taking the maximum over them is exhaustive. Using more trades never hurts when k is large, which is why sell k is the answer for "at most k".',
};
