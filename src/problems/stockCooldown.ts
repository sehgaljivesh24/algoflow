import type { ProblemDef } from '../engine/types.ts';
import { buildStock, parsePrices, type StockSpec, type StockState } from './stockKit.ts';

interface In { prices: number[] }

const states: StockState[] = [
  {
    name: 'hold', init: 0,
    step: ([hold, , rest], p) => {
      const buy = rest - p;
      return {
        value: Math.max(hold, buy), from: [0, 2], moved: buy > hold,
        desc: `Keep holding: ${hold}. Buy today after a rest day: rest − price = ${rest} − ${p} = ${buy}. ${buy > hold ? 'Buying is better.' : 'Holding is at least as good.'}`,
      };
    },
  },
  {
    name: 'sold (cooldown next)', init: 0,
    step: ([hold], p) => ({ value: hold + p, from: [0], moved: true, desc: `Selling today means we held yesterday: hold + price = ${hold} + ${p} = ${hold + p}. Tomorrow is a cooldown day.` }),
  },
  {
    name: 'rest', init: 0,
    step: ([, sold, rest]) => ({
      value: Math.max(rest, sold), from: [1, 2], moved: sold > rest,
      desc: `Be idle today: stay resting (${rest}) or come out of yesterday's cooldown after selling (${sold}). Larger is ${Math.max(rest, sold)}.`,
    }),
  },
];

// day 0 values: hold = −price[0]; sold and rest are 0 (nothing sold yet)
function statesFor(prices: number[]): StockState[] {
  return states.map((s, i) => (i === 0 ? { ...s, init: -prices[0] } : s));
}

const spec: StockSpec = {
  intro: {
    title: 'Three states per day',
    desc: 'Every day we are in exactly one of three states: holding a stock (hold), having just sold today and therefore frozen tomorrow (sold), or free with no stock (rest). Each cell holds the best profit so far for that state; arrows go from yesterday\'s states to today\'s.',
    logic: 'The cooldown rule is encoded in the graph itself: from "sold" you can only move to "rest", never straight to "hold".',
  },
  baseDesc: 'On day 0 we may buy (hold = −price), or do nothing. Nothing has been sold yet, so sold and rest are both 0.',
  baseLogic: 'Starting values for the three states; later days only read the previous column.',
  answerRows: [1, 2],
  logicPerState: [
    'Hold comes from holding already, or from buying out of the rest state (not from sold: the cooldown forbids it).',
    'Selling is only possible when we were holding yesterday.',
    'Resting continues, or follows the cooldown day after a sale.',
  ],
  doneDesc: (ans) => `Best profit = max(sold, rest) on the last day = ${ans}. Ending while holding a stock can never beat having sold it.`,
  doneLogic: 'Holding at the end is wasted money, so only the two non-holding states can contain the optimum.',
  resultText: 'Maximum profit',
  lines: {
    intro: { j: [0, 1], p: [0, 1] },
    base: { j: [1], p: [1] },
    state: [{ j: [3], p: [3] }, { j: [4], p: [4] }, { j: [5], p: [5] }],
    done: { j: [8], p: [7] },
  },
};

export const stockCooldown: ProblemDef<In> = {
  slug: '309-best-time-to-buy-and-sell-stock-with-cooldown',
  id: '309', title: 'Best Time to Buy and Sell Stock with Cooldown', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'state machine DP',
  statement: 'Given daily stock prices, you may complete as many transactions as you like (buy then sell, holding at most one share), but after selling you cannot buy on the next day (one-day cooldown). Return the maximum profit.',
  constraints: '1 ≤ prices.length ≤ 5000, 0 ≤ prices[i] ≤ 1000 (animation input: 2–8 prices between 0 and 30)',
  examples: [
    { label: '1 2 3 0 2', input: { prices: [1, 2, 3, 0, 2] }, output: '3' },
    { label: '1 2 4', input: { prices: [1, 2, 4] }, output: '3' },
    { label: '6 1 3 2 4 7', input: { prices: [6, 1, 3, 2, 4, 7] }, output: '6' },
  ],
  inputPlaceholder: 'prices, e.g. 1 2 3 0 2',
  parseInput: (raw) => ({ prices: parsePrices(raw) }),
  buildSteps: ({ prices }) => buildStock(prices, statesFor(prices), spec), viz: 'cells',
  vizCaption: 'rows = states, columns = days (price after the colon) — green tint = a transition fired',
  legend: [{ label: 'Cell being computed', state: 'active' }, { label: 'Yesterday\'s cells it reads', state: 'compare' }, { label: 'Computed / answer cells', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['day', 'price', 'state', 'value'],
  emphasis: ['cooldown', 'maximum profit', 'one share'],
  phases: [
    { icon: '🔀', label: 'Three states: hold / sold / rest', tone: 'blue' },
    { icon: '🌅', label: 'Day 0 start values', tone: 'blue' },
    { icon: '📅', label: 'Advance all states one day', tone: 'cyan' },
    { icon: '✅', label: 'Done: max(sold, rest)', tone: 'green' },
  ],
  approach: {
    title: 'Hold / sold / rest',
    text: 'Per day keep three numbers: hold = max(hold, rest − price), sold = hold + price, rest = max(rest, sold) — all computed from the previous day. Start with hold = −prices[0] and the others 0; the answer is max(sold, rest) on the last day.',
  },
  java: [
    'public int maxProfit(int[] prices) {',
    '    int hold = -prices[0], sold = 0, rest = 0;       // day 0: bought, nothing sold, idle',
    '    for (int i = 1; i < prices.length; i++) {',
    '        int newHold = Math.max(hold, rest - prices[i]);   // keep holding, or buy after resting',
    '        int newSold = hold + prices[i];                     // sell today -> cooldown tomorrow',
    '        int newRest = Math.max(rest, sold);                 // idle (cooldown over, or still free)',
    '        hold = newHold; sold = newSold; rest = newRest;',
    '    }',
    '    return Math.max(sold, rest);',
    '}',
  ],
  python: [
    'def max_profit(prices):',
    '    hold, sold, rest = -prices[0], 0, 0         # day 0: bought, nothing sold, idle',
    '    for p in prices[1:]:',
    '        new_hold = max(hold, rest - p)           # keep holding, or buy after resting',
    '        new_sold = hold + p                      # sell today -> cooldown tomorrow',
    '        new_rest = max(rest, sold)               # idle (cooldown over, or still free)',
    '        hold, sold, rest = new_hold, new_sold, new_rest',
    '    return max(sold, rest)',
  ],
  algorithm: [
    'Define states: hold a stock, just sold (cooldown tomorrow), rest (free, no stock)',
    'Day 0: hold = −price, sold = 0, rest = 0',
    'Each day: hold = max(hold, rest − p); sold = hold + p; rest = max(rest, sold) (all from yesterday)',
    'Answer: max(sold, rest) on the last day',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1) with three variables' }],
  why: 'The future depends only on which of the three states you are in today, not on the history that led there. Listing the legal transitions (hold→hold, hold→sold by selling, sold→rest forced by the cooldown, rest→rest, rest→hold by buying) makes the recurrence mechanical: each state\'s best profit is the best over the states that can reach it. The cooldown shows up as the missing sold→hold arrow.',
};
