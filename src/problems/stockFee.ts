import type { ProblemDef } from '../engine/types.ts';
import { buildStock, parsePrices, type StockSpec, type StockState } from './stockKit.ts';

interface In { prices: number[]; fee: number }

function statesFor(prices: number[], fee: number): StockState[] {
  return [
    {
      name: 'cash (no stock)', init: 0,
      step: ([cash, hold], p) => {
        const sell = hold + p - fee;
        return {
          value: Math.max(cash, sell), from: [0, 1], moved: sell > cash,
          desc: `Stay out: ${cash}. Sell the held stock and pay the fee: hold + price − fee = ${hold} + ${p} − ${fee} = ${sell}. ${sell > cash ? 'Selling pays off.' : 'Not worth selling.'}`,
        };
      },
    },
    {
      name: 'hold (own a stock)', init: -prices[0],
      step: ([cash, hold], p) => {
        const buy = cash - p;
        return {
          value: Math.max(hold, buy), from: [0, 1], moved: buy > hold,
          desc: `Keep holding: ${hold}. Buy today with the cash we had: cash − price = ${cash} − ${p} = ${buy}. ${buy > hold ? 'Switching to this purchase is better.' : 'Keep the old purchase.'}`,
        };
      },
    },
  ];
}

const spec: StockSpec = {
  intro: {
    title: 'Two states per day',
    desc: 'Each day we either hold no stock (cash) or own one (hold). Each cell is the best profit so far for that state. The transaction fee is charged once, when we sell, so it only appears in the cash row.',
    logic: 'Without a cooldown or a transaction cap the only memory we need is "do I hold a stock?" — two states are enough.',
  },
  baseDesc: 'Day 0: cash = 0 (we did nothing), hold = −price (we bought).',
  baseLogic: 'These are the two possible situations after the first day.',
  answerRows: [0],
  logicPerState: [
    'Cash today: stay out, or sell the stock we held yesterday and pay the fee.',
    'Hold today: keep the stock, or buy now with yesterday\'s cash.',
  ],
  doneDesc: (ans) => `The best profit is the cash value on the last day: ${ans}. Holding a stock on the last day can never be better than having sold it.`,
  doneLogic: 'Unsold stock is worth nothing, so the answer lives in the cash state.',
  resultText: 'Maximum profit after fees',
  lines: {
    intro: { j: [0, 1], p: [0, 1] },
    base: { j: [1], p: [1] },
    state: [{ j: [3], p: [3] }, { j: [4], p: [4] }],
    done: { j: [7], p: [6] },
  },
};

export const stockFee: ProblemDef<In> = {
  slug: '714-best-time-to-buy-and-sell-stock-with-transaction-fee',
  id: '714', title: 'Best Time to Buy and Sell Stock with Transaction Fee', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'state machine DP',
  statement: 'Given daily prices and a fixed fee paid on every sale, you may make as many transactions as you want but hold at most one share at a time. Return the maximum profit after paying the fees.',
  constraints: '1 ≤ prices.length ≤ 5·10⁴, 0 ≤ fee < 5·10⁴ (animation input: 2–8 prices between 0 and 30, fee 0–10)',
  examples: [
    { label: 'prices 1 3 2 8 4 9, fee 2', input: { prices: [1, 3, 2, 8, 4, 9], fee: 2 }, output: '8' },
    { label: 'prices 1 3 7 5 10 3, fee 3', input: { prices: [1, 3, 7, 5, 10, 3], fee: 3 }, output: '6' },
    { label: 'prices 5 4 3, fee 1', input: { prices: [5, 4, 3], fee: 1 }, output: '0' },
  ],
  inputPlaceholder: 'prices ; fee, e.g. 1 3 2 8 4 9 ; 2',
  parseInput: (raw) => {
    const [left, right] = raw.split(';');
    if (right === undefined) throw new Error('Format: prices ; fee — e.g. 1 3 2 8 4 9 ; 2');
    const fee = Number(right.trim());
    if (!Number.isInteger(fee) || fee < 0 || fee > 10) throw new Error('The fee must be a whole number from 0 to 10');
    return { prices: parsePrices(left), fee };
  },
  buildSteps: ({ prices, fee }) => buildStock(prices, statesFor(prices, fee), spec), viz: 'cells',
  vizCaption: 'rows = states, columns = days (price after the colon) — green tint = a transition fired',
  legend: [{ label: 'Cell being computed', state: 'active' }, { label: 'Yesterday\'s cells it reads', state: 'compare' }, { label: 'Computed / answer cell', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['day', 'price', 'state', 'value'],
  emphasis: ['transaction fee', 'maximum profit'],
  phases: [
    { icon: '🔀', label: 'Two states: hold / cash', tone: 'blue' },
    { icon: '🌅', label: 'Day 0 start values', tone: 'blue' },
    { icon: '💸', label: 'Advance a day (fee on the sale)', tone: 'cyan' },
    { icon: '✅', label: 'Done: cash on the last day', tone: 'green' },
  ],
  approach: {
    title: 'Cash / hold with the fee on selling',
    text: 'cash = max(cash, hold + price − fee) and hold = max(hold, cash − price), computed from the previous day. Start cash = 0, hold = −prices[0]. The answer is cash on the last day.',
  },
  java: [
    'public int maxProfit(int[] prices, int fee) {',
    '    int cash = 0, hold = -prices[0];                  // day 0: nothing done / bought',
    '    for (int i = 1; i < prices.length; i++) {',
    '        int newCash = Math.max(cash, hold + prices[i] - fee);   // stay out, or sell and pay the fee',
    '        int newHold = Math.max(hold, cash - prices[i]);          // keep holding, or buy',
    '        cash = newCash; hold = newHold;',
    '    }',
    '    return cash;',
    '}',
  ],
  python: [
    'def max_profit(prices, fee):',
    '    cash, hold = 0, -prices[0]                  # day 0: nothing done / bought',
    '    for p in prices[1:]:',
    '        new_cash = max(cash, hold + p - fee)     # stay out, or sell and pay the fee',
    '        new_hold = max(hold, cash - p)           # keep holding, or buy',
    '        cash, hold = new_cash, new_hold',
    '    return cash',
  ],
  algorithm: [
    'Two states: cash (no stock) and hold (own one stock)',
    'Day 0: cash = 0, hold = −price',
    'Each day: cash = max(cash, hold + p − fee); hold = max(hold, cash − p)',
    'Answer: cash on the last day',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Only one fact about the past matters to tomorrow\'s decisions: whether we hold a stock, together with the best profit achieving that. So two numbers per day are a complete summary. Charging the fee at the sale (or equivalently at the purchase) makes small price wiggles unprofitable automatically, which is why no separate "is this trade worth it" test is needed.',
};
