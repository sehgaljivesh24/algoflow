import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { arr, find, gc, parseInts, ptr, recorder } from './dpAdvKit.ts';

interface In { nums: number[] }

const java = [
  'public int maxCoins(int[] nums) {',
  '    int n = nums.length;',
  '    int[] vals = new int[n + 2];',
  '    vals[0] = vals[n + 1] = 1;                        // virtual balloons of value 1 at both ends',
  '    for (int i = 0; i < n; i++) vals[i + 1] = nums[i];',
  '    int[][] dp = new int[n + 2][n + 2];               // dp[l][r]: best coins for bursting everything strictly between l and r',
  '    for (int len = 2; len <= n + 1; len++) {          // interval length, shortest first',
  '        for (int l = 0; l + len <= n + 1; l++) {',
  '            int r = l + len;',
  '            for (int k = l + 1; k < r; k++) {         // k = the LAST balloon to burst inside (l, r)',
  '                int coins = dp[l][k] + dp[k][r] + vals[l] * vals[k] * vals[r];',
  '                dp[l][r] = Math.max(dp[l][r], coins);',
  '            }',
  '        }',
  '    }',
  '    return dp[0][n + 1];',
  '}',
];
const python = [
  'def max_coins(nums):',
  '    vals = [1] + nums + [1]                           # virtual balloons of value 1 at both ends',
  '    n = len(vals)',
  '    dp = [[0] * n for _ in range(n)]                  # dp[l][r]: best coins bursting everything strictly between l and r',
  '    for length in range(2, n):                        # interval length, shortest first',
  '        for l in range(n - length):',
  '            r = l + length',
  '            for k in range(l + 1, r):                 # k = the LAST balloon to burst inside (l, r)',
  '                coins = dp[l][k] + dp[k][r] + vals[l] * vals[k] * vals[r]',
  '                dp[l][r] = max(dp[l][r], coins)',
  '    return dp[0][n - 1]',
];
const J = { pad: find(java, 'int[] vals', 'vals[0] = vals[n + 1]'), def: find(java, 'int[][] dp'), len: find(java, 'for (int len', 'for (int l ', 'int r = l + len'), k: find(java, 'for (int k', 'int coins', 'dp[l][r] = Math.max'), ret: find(java, 'return dp[0][n + 1]') };
const P = { pad: find(python, 'vals = [1]', 'n = len(vals)'), def: find(python, 'dp = [[0]'), len: find(python, 'for length', 'for l in', 'r = l + length'), k: find(python, 'for k in', 'coins =', 'dp[l][r] = max'), ret: find(python, 'return dp[0][n - 1]') };

function build({ nums }: In): Step[] {
  const vals = [1, ...nums, 1];
  const N = vals.length;
  const dp: (number | null)[][] = Array.from({ length: N }, () => Array(N).fill(null));
  const steps: Step[] = [];
  let cl = -1;
  let cr = -1;
  let ck = -1;
  let done = false;
  let cand: number | string = '—';
  let cur: number | string = '—';
  let tries: string[] = [];

  const snap = () => ({
    scene: {
      kind: 'split' as const,
      parts: [
        {
          kind: 'array' as const, cells: arr(vals, (i) => (cl >= 0 && i > cl && i < cr ? (i === ck ? 'swap' : 'active') : i === cl || i === cr ? 'compare' : undefined), undefined, 'v'),
          pointers: cl >= 0 ? [ptr('l', 'l', cl, 'blue'), ...(ck >= 0 ? [ptr('k', 'k (last)', ck, 'orange')] : []), ptr('r', 'r', cr, 'green')] : [],
        },
        {
          kind: 'grid' as const, variant: 'table' as const,
          rows: dp.map((row, l) => row.map((v, r) => {
            if (r <= l) return gc(`${l},${r}`, '·', 'dim');
            let s: CellState | undefined;
            if (l === cl && r === cr) s = done ? 'found' : 'active';
            else if (ck >= 0 && ((l === cl && r === ck) || (l === ck && r === cr))) s = 'compare';
            else if (v === null) s = 'dim';
            return gc(`${l},${r}`, v === null ? '?' : v, s);
          })),
          rowHeads: vals.map((v, l) => `l=${l} (${v})`), colHeads: vals.map((_v, r) => `r=${r}`),
        },
      ],
    },
    aux: [{ title: cl >= 0 ? `last balloon k inside (${cl}, ${cr})` : 'candidates', kind: 'list' as const, items: [...tries] }],
    vars: { l: cl < 0 ? '—' : cl, r: cr < 0 ? '—' : cr, k: ck < 0 ? '—' : ck, coins: cand, 'dp[l][r]': cur },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Pad the ends', desc: `Add imaginary balloons of value 1 at both ends: ${vals.join(', ')}. Bursting a balloon pays left × it × right, and the walls make "no neighbour" count as 1.`,
    logic: 'The padding removes every special case at the edges of the row.', java: J.pad, py: P.pad, algo: 0,
    tag: 'PAD —', note: `vals = [${vals.join(', ')}]`,
  });
  for (let l = 0; l + 1 < N; l++) dp[l][l + 1] = 0;
  say({
    title: 'Define dp[l][r]', desc: 'dp[l][r] = the most coins from bursting every balloon strictly between positions l and r, while l and r themselves stay. Adjacent pairs have nothing between them: 0.',
    logic: 'Think of k as the LAST balloon popped in the gap. Then its neighbours at that moment are exactly l and r, and the two sides (l, k) and (k, r) are independent sub-problems.',
    tone: 'success', java: J.def, py: P.def, algo: 1,
    tag: 'DEFINE —', note: 'dp[l][l+1] = 0, goal dp[0][' + (N - 1) + ']',
  });

  for (let len = 2; len <= N - 1; len++) {
    for (let l = 0; l + len <= N - 1; l++) {
      const r = l + len;
      cl = l;
      cr = r;
      done = false;
      tries = [];
      dp[l][r] = 0;
      cur = 0;
      for (let k = l + 1; k < r; k++) {
        ck = k;
        const gain = vals[l] * vals[k] * vals[r];
        const c = dp[l][k]! + dp[k][r]! + gain;
        cand = c;
        const better = c > dp[l][r]!;
        if (better || k === l + 1) dp[l][r] = Math.max(dp[l][r]!, c);
        cur = dp[l][r]!;
        tries.push(`k=${k} (${vals[k]}): dp[${l}][${k}] + dp[${k}][${r}] + ${vals[l]}×${vals[k]}×${vals[r]} = ${dp[l][k]} + ${dp[k][r]} + ${gain} = ${c}`);
        if (k === r - 1) done = true;
        say({
          title: `Gap (${l}, ${r}), last = ${vals[k]}`,
          desc: `If balloon ${k} (value ${vals[k]}) is popped last in the gap, it earns ${vals[l]} × ${vals[k]} × ${vals[r]} = ${gain}, plus the left part ${dp[l][k]} and the right part ${dp[k][r]}: ${c}. ${better ? `New best for dp[${l}][${r}]: ${dp[l][r]}.` : `Best stays ${dp[l][r]}.`}`,
          logic: 'The last popped balloon is the one whose neighbours are the fixed ends l and r, which is what lets the two sides be solved separately.', tone: better ? 'success' : 'info', java: J.k, py: P.k, algo: 2,
          tag: better ? `LAST k=${k} · BEST —` : `LAST k=${k} —`, note: `${dp[l][k]} + ${dp[k][r]} + ${vals[l]}×${vals[k]}×${vals[r]} = ${c}; dp[${l}][${r}] = ${dp[l][r]}`,
        });
      }
    }
  }

  cl = 0;
  cr = N - 1;
  ck = -1;
  done = true;
  cur = dp[0][N - 1]!;
  say({
    title: 'Done', tag: '✅ Done!', note: `return dp[0][${N - 1}] = ${dp[0][N - 1]}`, desc: `dp[0][${N - 1}] = ${dp[0][N - 1]}: the most coins from bursting all ${plural(nums.length, 'balloon')}.`,
    logic: 'The full interval between the two walls is the original problem.', tone: 'success', java: J.ret, py: P.ret, algo: 3,
    result: { title: String(dp[0][N - 1]), text: 'Maximum coins' },
  });
  return steps;
}

export const burstBalloons: ProblemDef<In> = {
  slug: '312-burst-balloons',
  id: '312', title: 'Burst Balloons', difficulty: 'Hard', category: 'Dynamic Programming', tag: 'interval DP',
  statement: 'You are given balloons with numbers. Bursting balloon i earns nums[i−1] × nums[i] × nums[i+1] coins (an out-of-range neighbour counts as 1), and its neighbours then close up. Burst all balloons in the best order and return the maximum coins.',
  constraints: '1 ≤ n ≤ 300, 0 ≤ nums[i] ≤ 100 (animation input: ≤ 7 balloons, values 0–9)',
  examples: [
    { label: '3 1 5 8', input: { nums: [3, 1, 5, 8] }, output: '167' },
    { label: '1 5', input: { nums: [1, 5] }, output: '10' },
    { label: '2 4 3', input: { nums: [2, 4, 3] }, output: '33' },
  ],
  inputPlaceholder: 'balloon values, e.g. 3 1 5 8',
  parseInput: (raw) => ({ nums: parseInts(raw, { what: 'the balloon values', example: '3 1 5 8', minLen: 1, maxLen: 7, lo: 0, hi: 9 }) }),
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Interval (l, r) being solved', state: 'active' }, { label: 'Left / right sub-intervals', state: 'compare' }, { label: 'Finished interval', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['l', 'r', 'k', 'coins', 'dp[l][r]'],
  emphasis: ['Burst all balloons', 'maximum coins', 'best order'],
  phases: [
    { icon: '🎈', label: 'Pad the ends with 1', tone: 'blue' },
    { icon: '🧱', label: 'Define dp[l][r] (gap)', tone: 'blue' },
    { icon: '💥', label: 'Try each LAST balloon k', tone: 'cyan' },
    { icon: '✅', label: 'Done: dp[0][n+1]', tone: 'green' },
  ],
  approach: {
    title: 'Choose the LAST balloon to burst in each gap',
    text: 'Pad the row with 1s. For every gap (l, r), try each k inside as the last balloon popped: it earns vals[l]·vals[k]·vals[r], and the balloons on each side were popped earlier, independently, worth dp[l][k] and dp[k][r]. Fill the table by increasing gap length.',
  },
  java, python,
  algorithm: [
    'Pad with 1 at both ends; dp[l][r] = best coins strictly inside (l, r)',
    'Process gaps from length 2 upward so shorter gaps are ready',
    'For every k in (l, r): coins = dp[l][k] + dp[k][r] + vals[l]·vals[k]·vals[r]',
    'dp[l][r] = the largest such value; answer = dp[0][n+1]',
  ],
  complexity: [{ label: 'Time', value: 'O(n³)' }, { label: 'Space', value: 'O(n²)' }],
  why: 'Choosing the first balloon to burst makes the sub-problems depend on each other, because the neighbours change as balloons vanish. Choosing the last one fixes its neighbours to the gap’s ends, so the left and right parts no longer interact and each is an independent smaller gap. Every burst order has some last balloon, so trying them all covers every order, and gaps are solved shortest-first.',
};
