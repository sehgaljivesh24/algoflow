import type { ProblemDef, Step } from '../engine/types.ts';
import { capSteps, recorder } from './stepKit.ts';
import { parseKnapsack, rowCells, type Knap } from './dpCoreKit.ts';

function parse(raw: string): Knap {
  return capSteps(build, parseKnapsack(raw, { maxItems: 4, maxW: 9, maxV: 30, maxCap: 12 }));
}

/** Best value when each item may be used at most once (shown for contrast in the last step). */
function zeroOne(wt: number[], val: number[], cap: number): number {
  const d = Array(cap + 1).fill(0);
  for (let i = 0; i < wt.length; i++) for (let c = cap; c >= wt[i]; c--) d[c] = Math.max(d[c], d[c - wt[i]] + val[i]);
  return d[cap];
}

function build({ wt, val, cap }: Knap): Step[] {
  const dp: number[] = Array(cap + 1).fill(0);
  const touched: boolean[] = Array(cap + 1).fill(false);
  const steps: Step[] = [];
  let item = -1;
  let c = -1;
  let from = -1;
  let done = false;
  let cand: number | string = '—';

  const snap = () => ({
    cells: rowCells('c', dp, (i) => (i === c ? (done ? 'found' : 'active') : i === from ? 'compare' : undefined), (i) => (touched[i] ? 'purple' : undefined)),
    pointers: [
      ...(c >= 0 ? [{ id: 'c', label: 'c', index: c, tone: 'blue' as const }] : []),
      ...(from >= 0 ? [{ id: 'f', label: `c−${wt[item]}`, index: from, tone: 'orange' as const }] : []),
    ],
    aux: [{ title: 'items (weight:value)', kind: 'list' as const, items: wt.map((w, i) => `${w}:${val[i]}`), highlight: item >= 0 ? item : undefined }],
    vars: { item: item >= 0 ? `${wt[item]}:${val[item]}` : '—', c: c < 0 ? '—' : c, 'dp[c-w]+v': cand, 'dp[c]': c < 0 ? '—' : dp[c] },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the array', desc: `dp[c] = the best value in a bag of capacity c when every item can be used any number of times. Capacities 0..${cap}, all starting at 0.`,
    logic: 'Because items repeat, a single row is enough: we keep improving dp as each kind of item is considered.', java: [0, 1], py: [0, 1], algo: 0,
    tag: 'DEFINE —', note: `dp[0..${cap}] = 0, items ${wt.map((w, i) => `${w}:${val[i]}`).join(' ')}`,
  });

  for (let i = 0; i < wt.length; i++) {
    item = i;
    touched.fill(false);
    c = -1;
    from = -1;
    cand = '—';
    done = false;
    say({
      title: `Item ${wt[i]}:${val[i]} — sweep upward`, desc: `Now allow item (weight ${wt[i]}, value ${val[i]}) as often as it fits. Go through capacities ${wt[i]}..${cap} in increasing order.`,
      logic: 'Increasing order is the whole trick: when we reach c, dp[c − w] has already been updated for this very item, so the item can be taken again.',
      java: [2, 3], py: [2, 3], algo: 1,
      tag: 'NEXT ITEM —', note: `for c = ${wt[i]}..${cap} (upward) with item w=${wt[i]}, v=${val[i]}`,
    });
    for (let x = wt[i]; x <= cap; x++) {
      c = x;
      from = x - wt[i];
      done = false;
      const reuse = touched[from];
      cand = dp[from] + val[i];
      const better = cand > dp[x];
      const was = dp[x];
      if (better) {
        dp[x] = cand as number;
        touched[x] = true;
      }
      done = true;
      say({
        title: `Capacity ${x}: ${better ? `improved to ${dp[x]}` : `stays ${dp[x]}`}`,
        desc: `dp[${from}] + ${val[i]} = ${cand}${reuse ? ` (dp[${from}] already used this item, so this takes it again)` : ''}. ${better ? `Better than before, so dp[${x}] = ${cand}.` : 'Not better than the current value.'}`,
        logic: reuse ? 'The purple cell was improved earlier in this same sweep, so it counts another copy of the item — impossible in 0/1 knapsack.' : 'The cell c − w holds the best bag without extra copies; adding one item gives a candidate.',
        tone: better ? 'success' : 'info', java: [4], py: [4], algo: 2,
        tag: reuse && better ? 'REUSE ♻ —' : better ? 'IMPROVE —' : 'KEEP —',
        note: `dp[${x}] = max(${was}, dp[${from}] + ${val[i]} = ${cand}) = ${dp[x]}`,
      });
    }
  }

  item = -1;
  from = -1;
  c = cap;
  cand = '—';
  done = true;
  const once = zeroOne(wt, val, cap);
  say({
    title: 'Done', tag: '✅ Done!', note: `return dp[${cap}] = ${dp[cap]} (0/1 would give ${once})`, desc: `Best value with unlimited copies: ${dp[cap]}. (If each item could be used only once the best would be ${once}.)`,
    logic: once === dp[cap] ? 'Here repeating items does not help, but the loop direction is what made it allowed.' : 'The difference comes entirely from allowing reuse: the capacity loop ran upward instead of downward.',
    tone: 'success', java: [7], py: [5], algo: 3, result: { title: String(dp[cap]), text: 'Maximum value (unbounded)' },
  });
  return steps;
}

export const unboundedKnapsack: ProblemDef<Knap> = {
  slug: 'cp-unbounded-knapsack',
  id: 'CP', title: 'Unbounded Knapsack', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'unbounded knapsack',
  statement: 'Each kind of item has a weight and a value and can be taken any number of times. Fill a bag of the given capacity (total weight at most the capacity) so that the total value is as large as possible.',
  constraints: '1 ≤ n ≤ 100, capacity ≤ 10⁴ (animation input: ≤ 4 item kinds, weights ≤ 9, values ≤ 30, capacity ≤ 12)',
  examples: [
    { label: 'items 2:3 3:5 4:7, cap 7', input: { wt: [2, 3, 4], val: [3, 5, 7], cap: 7 }, output: '12' },
    { label: 'items 3:4 5:7, cap 10', input: { wt: [3, 5], val: [4, 7], cap: 10 }, output: '14' },
    { label: 'items 4:5 7:9, cap 9', input: { wt: [4, 7], val: [5, 9], cap: 9 }, output: '10' },
  ],
  inputPlaceholder: 'w:v pairs ; capacity, e.g. 2:3 3:5 4:7 ; 7',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizCaption: 'dp[capacity] — purple = improved during the current item\'s sweep',
  legend: [{ label: 'Capacity being updated', state: 'active' }, { label: 'dp[c − w] (reused)', state: 'compare' }, { label: 'Updated', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['item', 'c', 'dp[c-w]+v', 'dp[c]'],
  emphasis: ['any number of times', 'as large as possible'],
  phases: [
    { icon: '🧱', label: 'Define dp[c]', tone: 'blue' },
    { icon: '⬆️', label: 'Next item: sweep upward', tone: 'blue' },
    { icon: '♻️', label: 'dp[c] = max(keep, dp[c−w] + v)', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'One row, capacities swept upward',
    text: 'dp[c] starts at 0. For each item (w, v) and each capacity c from w up to W: dp[c] = max(dp[c], dp[c − w] + v). The upward sweep lets dp[c − w] already contain this item, which is exactly what unlimited copies means. In 0/1 knapsack the sweep goes downward.',
  },
  java: [
    'public int unboundedKnapsack(int[] wt, int[] val, int W) {',
    '    int[] dp = new int[W + 1];                       // dp[c]: best value with capacity c, items reusable',
    '    for (int i = 0; i < wt.length; i++) {',
    '        for (int c = wt[i]; c <= W; c++) {           // ascending: dp[c - wt[i]] may already include item i',
    '            dp[c] = Math.max(dp[c], dp[c - wt[i]] + val[i]);',
    '        }',
    '    }',
    '    return dp[W];',
    '}',
  ],
  python: [
    'def unbounded_knapsack(wt, val, W):',
    '    dp = [0] * (W + 1)                  # dp[c]: best value with capacity c, items reusable',
    '    for w, v in zip(wt, val):',
    '        for c in range(w, W + 1):       # ascending: dp[c - w] may already include this item',
    '            dp[c] = max(dp[c], dp[c - w] + v)',
    '    return dp[W]',
  ],
  algorithm: [
    'dp[c] = best value with capacity c; start at 0',
    'For each item kind, sweep capacities upward from its weight',
    'dp[c] = max(dp[c], dp[c − w] + v), where dp[c − w] may already hold this item',
    'Return dp[W]',
  ],
  complexity: [{ label: 'Time', value: 'O(n · W)' }, { label: 'Space', value: 'O(W)' }],
  why: 'Processing capacities in increasing order means dp[c − w] has already been improved with the current item whenever that helps, so the transition can stack as many copies as fit. With a downward sweep dp[c − w] would still describe the state before this item, allowing at most one copy. The optimal-substructure argument is the same as 0/1 knapsack: remove one item from an optimal bag and what remains is optimal for the smaller capacity.',
};
