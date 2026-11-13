import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { at, heads, inList, recorder } from './stepKit.ts';
import { capSteps } from './stepKit.ts';
import { parseKnapsack, type Knap } from './dpCoreKit.ts';

function parse(raw: string): Knap {
  const k = parseKnapsack(raw, { maxItems: 5, maxW: 9, maxV: 30, maxCap: 10 });
  return capSteps(build, k);
}

function build({ wt, val, cap }: Knap): Step[] {
  const n = wt.length;
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, () => Array(cap + 1).fill(null));
  const took: boolean[][] = Array.from({ length: n + 1 }, () => Array(cap + 1).fill(false));
  const steps: Step[] = [];
  let cur: [number, number] | null = null;
  let src: [number, number][] = [];
  let done = false;
  let path: [number, number][] = [];
  let skip: number | string = '—';
  let take: number | string = '—';
  let chosen: string[] = [];

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: dp.map((row, r) => row.map((v, c): Cell => ({
        key: `${r},${c}`, value: v === null ? '?' : v,
        state: inList(path, r, c) ? 'found' : at(cur, r, c) ? (done ? 'found' : 'active') : inList(src, r, c) ? 'compare' : v === null ? 'dim' : undefined,
        tone: took[r][c] ? 'green' : undefined,
      }))),
      rowHeads: ['no items', ...wt.map((w, i) => `w${w} v${val[i]}`)],
      colHeads: heads(cap + 1),
    },
    aux: [{ title: 'items taken', kind: 'list' as const, items: [...chosen] }],
    vars: { item: cur && cur[0] > 0 ? `w${wt[cur[0] - 1]} v${val[cur[0] - 1]}` : '—', cap: cur ? cur[1] : '—', skip, take },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', tag: 'DEFINE —', desc: `dp[i][c] = the most value we can carry using only the first i items with a bag of capacity c. Rows are items, columns are capacities 0..${cap}.`,
    logic: 'Each item is decided once: put it in the bag (take) or leave it (skip). The table remembers the best result for every smaller bag.',
    java: [0, 1, 2], py: [0, 1, 2], algo: 0, note: `dp is ${n + 1}×${cap + 1}, answer = dp[${n}][${cap}]`,
  });

  for (let c = 0; c <= cap; c++) dp[0][c] = 0;
  cur = [0, 0];
  say({
    title: 'Base row: no items, no value', tag: 'BASE ROW —', desc: 'With zero items available the best value is 0 at every capacity, so dp[0][c] = 0.',
    logic: 'Nothing to put in the bag yet, so every capacity is worth 0.', tone: 'success', java: [2], py: [2], algo: 1, note: 'dp[0][c] = 0 for every c',
  });

  for (let i = 1; i <= n; i++) {
    const w = wt[i - 1];
    const v = val[i - 1];
    for (let c = 0; c <= cap; c++) {
      cur = [i, c];
      done = false;
      const skipV = dp[i - 1][c]!;
      const canTake = c >= w;
      const takeV = canTake ? dp[i - 1][c - w]! + v : null;
      src = [[i - 1, c], ...(canTake ? [[i - 1, c - w] as [number, number]] : [])];
      skip = skipV;
      take = takeV === null ? 'n/a' : takeV;
      const useTake = takeV !== null && takeV > skipV;
      dp[i][c] = useTake ? takeV! : skipV;
      took[i][c] = useTake;
      done = true;
      say({
        title: `Item w${w} v${v}, capacity ${c}: ${dp[i][c]}`, tag: !canTake ? 'TOO HEAVY —' : useTake ? 'TAKE —' : 'SKIP —',
        desc: `Skip: dp[${i - 1}][${c}] = ${skipV}. Take: ${canTake ? `dp[${i - 1}][${c - w}] + ${v} = ${takeV}` : `weight ${w} does not fit in ${c}`}. ${useTake ? `Taking wins, so dp[${i}][${c}] = ${takeV}.` : `Skipping is at least as good, so dp[${i}][${c}] = ${skipV}.`}`,
        logic: 'Both options look only at the row above: the bag without this item, or a bag with room reserved for it.', tone: useTake ? 'success' : 'info',
        java: canTake ? [5, 6, 7] : [5], py: canTake ? [5, 6, 7] : [5], algo: 2,
        note: canTake ? `dp[${i}][${c}] = max(${skipV}, ${dp[i - 1][c - w]} + ${v}) = ${dp[i][c]}` : `w=${w} > c=${c} → dp[${i}][${c}] = ${skipV}`,
        ...(canTake ? {} : { alert: `Item w${w} does not fit in a bag of capacity ${c}: it must be skipped.` }),
      });
    }
  }

  cur = [n, cap];
  src = [];
  skip = take = '—';
  done = true;
  say({
    title: `Best value = dp[${n}][${cap}] = ${dp[n][cap]}`, tag: 'ANSWER —', desc: `The bottom-right cell considers every item with the full capacity: best value = dp[${n}][${cap}] = ${dp[n][cap]}.`,
    logic: 'All items were allowed and the whole bag was available, so this is the answer.', tone: 'success', java: [11], py: [8], algo: 3,
    note: `return dp[${n}][${cap}] = ${dp[n][cap]}`,
  });

  let c = cap;
  path = [[n, cap]];
  for (let i = n; i >= 1; i--) {
    cur = [i, c];
    if (dp[i][c] !== dp[i - 1][c]) {
      chosen = [...chosen, `w${wt[i - 1]} v${val[i - 1]}`];
      c -= wt[i - 1];
      path = [...path, [i - 1, c]];
      say({
        title: `Walk back: item ${i} was taken`, tag: 'WALK BACK —', desc: `dp[${i}][${c + wt[i - 1]}] differs from the cell above, so item w${wt[i - 1]} v${val[i - 1]} is in the bag. Move to capacity ${c}.`,
        logic: 'A value that changed relative to the row above can only come from taking the item.', tone: 'success', java: [10], py: [9], algo: 4,
        note: `dp[${i}][${c + wt[i - 1]}] = ${dp[i][c + wt[i - 1]]} ≠ dp[${i - 1}][${c + wt[i - 1]}] = ${dp[i - 1][c + wt[i - 1]]} → take, c = ${c}`,
      });
    } else {
      path = [...path, [i - 1, c]];
      say({
        title: `Walk back: item ${i} was skipped`, tag: 'WALK BACK —', desc: `dp[${i}][${c}] equals the cell above, so the item is not needed. Stay at capacity ${c}.`,
        logic: 'Equal values mean skipping already achieved the best result.', java: [10], py: [9], algo: 4,
        note: `dp[${i}][${c}] = dp[${i - 1}][${c}] = ${dp[i][c]} → skip, c = ${c}`,
      });
    }
  }
  cur = [n, cap];
  say({
    title: 'Done', tag: '✅ Done!', note: `max value = ${dp[n][cap]}`, desc: `Best total value ${dp[n][cap]} using ${chosen.length ? chosen.join(', ') : 'no items'}.`,
    logic: 'The green path shows which items the optimum used.', tone: 'success', java: [11], py: [9], algo: 4,
    result: { title: String(dp[n][cap]), text: 'Maximum value' },
  });
  return steps;
}

export const knapsack01: ProblemDef<Knap> = {
  slug: 'cp-0-1-knapsack',
  id: 'CP', title: '0/1 Knapsack', difficulty: 'Medium', category: 'Dynamic Programming', tag: '0/1 knapsack table',
  statement: 'Each item has a weight and a value and may be taken at most once. Pick a set of items whose total weight is at most the bag capacity and whose total value is as large as possible.',
  constraints: '1 ≤ n ≤ 100, capacity ≤ 10⁴ (animation input: ≤ 5 items, weights ≤ 9, values ≤ 30, capacity ≤ 10)',
  examples: [
    { label: 'items 1:1 3:4 4:5 5:7, cap 7', input: { wt: [1, 3, 4, 5], val: [1, 4, 5, 7], cap: 7 }, output: '9' },
    { label: 'items 2:3 3:4 4:5 5:6, cap 5', input: { wt: [2, 3, 4, 5], val: [3, 4, 5, 6], cap: 5 }, output: '7' },
    { label: 'items 6:10 5:7, cap 4 (nothing fits)', input: { wt: [6, 5], val: [10, 7], cap: 4 }, output: '0' },
  ],
  inputPlaceholder: 'w:v pairs ; capacity, e.g. 1:1 3:4 4:5 5:7 ; 7',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizCaption: 'dp[item][capacity] — green tint = the item was taken here',
  legend: [{ label: 'Cell being computed', state: 'active' }, { label: 'Skip / take sources', state: 'compare' }, { label: 'Computed / on the answer path', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['item', 'cap', 'skip', 'take'],
  emphasis: ['at most once', 'total weight', 'as large as possible'],
  phases: [
    { icon: '🧱', label: 'Define dp[i][c]', tone: 'blue' },
    { icon: '🌱', label: 'Base row: no items', tone: 'blue' },
    { icon: '🎒', label: 'Skip or take', tone: 'cyan' },
    { icon: '🏆', label: 'Answer dp[n][W]', tone: 'gold' },
    { icon: '↩️', label: 'Walk back to the items', tone: 'green' },
  ],
  approach: {
    title: 'Table of items × capacities',
    text: 'dp[i][c] is the best value from the first i items in a bag of size c. Skip the item: dp[i−1][c]. Take it (if it fits): dp[i−1][c−w] + v. Keep the larger; the answer is dp[n][W]. Walk back through the table to recover the chosen items.',
  },
  java: [
    'public int knapsack(int[] wt, int[] val, int W) {',
    '    int n = wt.length;',
    '    int[][] dp = new int[n + 1][W + 1];       // dp[i][c]: best value from the first i items, capacity c (row 0 = 0)',
    '    for (int i = 1; i <= n; i++) {',
    '        for (int c = 0; c <= W; c++) {',
    '            dp[i][c] = dp[i - 1][c];                                   // skip item i',
    '            if (c >= wt[i - 1])',
    '                dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - wt[i - 1]] + val[i - 1]);   // take item i',
    '        }',
    '    }',
    '    // to list the items: walk back; if dp[i][c] != dp[i-1][c] item i was taken, then c -= wt[i-1]',
    '    return dp[n][W];',
    '}',
  ],
  python: [
    'def knapsack(wt, val, W):',
    '    n = len(wt)',
    '    dp = [[0] * (W + 1) for _ in range(n + 1)]   # row 0: no items, value 0',
    '    for i in range(1, n + 1):',
    '        for c in range(W + 1):',
    '            dp[i][c] = dp[i - 1][c]               # skip item i',
    '            if c >= wt[i - 1]:',
    '                dp[i][c] = max(dp[i][c], dp[i - 1][c - wt[i - 1]] + val[i - 1])   # take item i',
    '    return dp[n][W]',
    '    # to list the items: walk back; if dp[i][c] != dp[i-1][c] item i was taken, then c -= wt[i-1]',
  ],
  algorithm: [
    'dp[i][c] = best value using the first i items with capacity c',
    'Base row: with no items every capacity is worth 0',
    'For each item and capacity: dp[i][c] = max(skip, take if it fits)',
    'The answer is dp[n][W]',
    'Walk back from dp[n][W]: a changed value means the item was taken',
  ],
  complexity: [{ label: 'Time', value: 'O(n · W)' }, { label: 'Space', value: 'O(n · W), or O(W) with one row' }],
  why: 'An optimal bag for the first i items either does not contain item i (then it is an optimal bag for the first i−1 items with the same capacity) or contains it (then the rest is an optimal bag for the first i−1 items with capacity c − w). Because every item is considered once and the choice only looks at the previous row, an item can never be used twice. The table covers all 2ⁿ subsets without listing them.',
};
