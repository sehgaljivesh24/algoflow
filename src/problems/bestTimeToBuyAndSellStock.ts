import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { prices: number[] }

function parse(raw: string): In {
  const prices = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!prices.length || prices.some((n) => !Number.isInteger(n) || n < 0)) throw new Error('Enter non-negative whole numbers, e.g. 7 1 5 3 6 4');
  if (prices.length > 12) throw new Error('Use 12 prices or fewer');
  return { prices };
}

function build({ prices }: In): Step[] {
  const n = prices.length;
  const steps: Step[] = [];
  let minIdx = 0;
  let best = 0;
  let bestBuy = -1;
  let bestSell = -1;

  const cells = (cur: number, finished = false): Cell[] =>
    prices.map((value, i) => {
      let state: CellState | undefined;
      if (finished) state = i === bestBuy || i === bestSell ? 'found' : 'dim';
      else if (i === cur) state = 'active';
      else if (i === minIdx) state = 'compare';
      else if (best > 0 && (i === bestBuy || i === bestSell)) state = 'found';
      else if (i > cur) state = undefined;
      return { key: i, value, state };
    });
  const ptrs = (cur: number) => {
    const p: { id: string; label: string; index: number; tone: 'blue' | 'green' }[] = [{ id: 'i', label: 'i', index: cur, tone: 'blue' }];
    if (minIdx !== cur) p.push({ id: 'm', label: 'min', index: minIdx, tone: 'green' });
    return p;
  };
  const vars = (i: number | string, today: number | string = '—') => ({ i, 'min price': prices[minIdx], profit: today, 'best profit': best });

  steps.push({
    title: 'Start', tag: 'SETUP —', desc: `Day 0 costs ${prices[0]}: the cheapest price seen so far, so min = ${prices[0]} and best profit = 0.`,
    cells: cells(0), pointers: ptrs(0), vars: vars(0),
    logic: 'We can only sell after we buy, so for each day the best buy is the cheapest earlier day. Track that minimum as we walk right.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0, note: `min = ${prices[0]}, best = 0`,
  });

  for (let i = 1; i < n; i++) {
    if (prices[i] < prices[minIdx]) {
      const old = prices[minIdx];
      minIdx = i;
      steps.push({
        title: `New low: ${prices[i]}`, tag: 'NEW LOW —', desc: `prices[${i}] = ${prices[i]} < ${old} → a cheaper day to buy; min = ${prices[i]}. Selling today would lose money.`,
        cells: cells(i), pointers: ptrs(i), vars: vars(i, 0),
        logic: 'A lower price always beats the old minimum as a buying day for every later day.', logicTone: 'info',
        javaLines: [3], pyLines: [3, 4], algoStep: 1, note: `min = ${old} → ${prices[i]}`,
      });
    } else {
      const profit = prices[i] - prices[minIdx];
      const old = best;
      const improved = profit > best;
      if (improved) {
        best = profit;
        bestBuy = minIdx;
        bestSell = i;
      }
      steps.push({
        title: `Sell on day ${i}: profit ${profit}`, tag: 'SELL —',
        desc: `profit = ${prices[i]} − ${prices[minIdx]} = ${profit} ${improved ? `🏆 NEW BEST! best profit = ${best}` : `· not above best = ${best}`}`,
        cells: cells(i), pointers: ptrs(i), vars: vars(i, profit),
        logic: improved ? 'New best deal: remember it.' : 'Selling today is no better than the best deal found so far.', logicTone: improved ? 'success' : 'info',
        javaLines: [5, 6], pyLines: [5, 6], algoStep: 2, note: `best = max(${old}, ${profit}) = ${best}`,
      });
    }
  }

  steps.push({
    title: 'Done', tag: '✅ Done!', desc: best > 0 ? `Buy on day ${bestBuy} at ${prices[bestBuy]}, sell on day ${bestSell} at ${prices[bestSell]}: profit ${best}.` : 'Prices never rise after a low, so the best choice is not to trade: profit 0.',
    cells: cells(-1, true), pointers: [], vars: vars('—'), note: `return ${best}`,
    logic: `Maximum profit: ${best}`, logicTone: 'success', javaLines: [9], pyLines: [7], algoStep: 3,
    result: { title: String(best), text: best > 0 ? `Buy day ${bestBuy}, sell day ${bestSell}` : 'No profitable trade' },
  });
  return steps;
}

export const bestTimeToBuyAndSellStock: ProblemDef<In> = {
  slug: '121-best-time-to-buy-and-sell-stock',
  id: '121', title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', category: 'Arrays', tag: 'greedy / Kadane',
  statement: 'prices[i] is the price of a stock on day i. Choose one day to buy and a later day to sell to maximise profit. Return that maximum profit, or 0 if no profitable trade exists.',
  constraints: '1 ≤ n ≤ 10⁵ · 0 ≤ prices[i] ≤ 10⁴ (animation input is limited to 12 prices)',
  examples: [
    { label: '[7,1,5,3,6,4]', input: { prices: [7, 1, 5, 3, 6, 4] }, output: '5' },
    { label: '[7,6,4,3,1]', input: { prices: [7, 6, 4, 3, 1] }, output: '0' },
    { label: '[2,4,1,7]', input: { prices: [2, 4, 1, 7] }, output: '6' },
  ],
  inputPlaceholder: 'e.g. 7 1 5 3 6 4',
  parseInput: parse, buildSteps: build, viz: 'bars',
  legend: [{ label: 'Day being considered for selling', state: 'active' }, { label: 'Cheapest day so far (buy)', state: 'compare' }, { label: 'Best trade', state: 'found' }, { label: 'Not used', state: 'dim' }],
  varLabels: ['i', 'min price', 'profit', 'best profit'],
  emphasis: ['maximise profit', 'later day'],
  phases: [
    { icon: '🏁', label: 'Setup: min = prices[0]', tone: 'blue' },
    { icon: '⬇️', label: 'New low: min = price', tone: 'orange' },
    { icon: '💰', label: 'Sell: profit = price − min', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Cheapest so far, best deal so far',
    text: 'Walk through the days once. Keep the lowest price seen (the best day to have bought). On each later day compute price − lowest and keep the largest such difference.',
  },
  java: [
    'public int maxProfit(int[] prices) {',
    '    int min = prices[0], best = 0;',
    '    for (int i = 1; i < prices.length; i++) {',
    '        if (prices[i] < min) min = prices[i];',
    '        else {',
    '            int profit = prices[i] - min;',
    '            best = Math.max(best, profit);',
    '        }',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def max_profit(prices):',
    '    low, best = prices[0], 0',
    '    for p in prices[1:]:',
    '        if p < low:',
    '            low = p',
    '        else:',
    '            best = max(best, p - low)',
    '    return best',
  ],
  algorithm: [
    'Set min to the first price and best to 0',
    'If today is cheaper than min, update min (a new buying day)',
    'Otherwise profit = today − min; update best if it is larger',
    'Return best',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'For any selling day, the most profitable buying day is the cheapest day before it. Keeping the running minimum gives exactly that day in O(1), and taking the maximum profit over all selling days covers every possible best trade. This is Kadane\'s idea applied to the day-to-day price differences.',
};
