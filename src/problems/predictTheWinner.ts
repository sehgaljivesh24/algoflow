import type { CellState, ProblemDef, Step, Tone } from '../engine/types.ts';
import { arr, find, gc, parseInts, ptr, recorder } from './dpAdvKit.ts';

interface In { nums: number[] }

const java = [
  'public boolean predictTheWinner(int[] nums) {',
  '    int n = nums.length;',
  '    int[][] dp = new int[n][n];                 // dp[i][j] = best (my score - opponent score) on nums[i..j], me to move',
  '    for (int i = 0; i < n; i++) dp[i][i] = nums[i];',
  '    for (int len = 2; len <= n; len++) {',
  '        for (int i = 0; i + len - 1 < n; i++) {',
  '            int j = i + len - 1;',
  '            int takeLeft = nums[i] - dp[i + 1][j];     // opponent then moves on i+1..j',
  '            int takeRight = nums[j] - dp[i][j - 1];',
  '            dp[i][j] = Math.max(takeLeft, takeRight);',
  '        }',
  '    }',
  '    return dp[0][n - 1] >= 0;',
  '}',
];
const python = [
  'def predict_the_winner(nums):',
  '    n = len(nums)',
  '    dp = [[0] * n for _ in range(n)]            # dp[i][j] = best (my score - opponent score) on nums[i..j]',
  '    for i in range(n):',
  '        dp[i][i] = nums[i]',
  '    for length in range(2, n + 1):',
  '        for i in range(n - length + 1):',
  '            j = i + length - 1',
  '            take_left = nums[i] - dp[i + 1][j]       # opponent then moves on i+1..j',
  '            take_right = nums[j] - dp[i][j - 1]',
  '            dp[i][j] = max(take_left, take_right)',
  '    return dp[0][n - 1] >= 0',
];
const J = { def: find(java, 'int[][] dp'), base: find(java, 'dp[i][i] = nums[i]'), cell: find(java, 'int j = i + len', 'int takeLeft', 'int takeRight', 'dp[i][j] = Math.max'), ret: find(java, 'return dp[0][n - 1]') };
const P = { def: find(python, 'dp = [[0]'), base: find(python, 'dp[i][i] = nums[i]'), cell: find(python, 'j = i + length', 'take_left =', 'take_right =', 'dp[i][j] = max'), ret: find(python, 'return dp[0][n - 1]') };

function build({ nums }: In): Step[] {
  const n = nums.length;
  const dp: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
  const steps: Step[] = [];
  let ci = -1;
  let cj = -1;
  let src: [number, number][] = [];
  let done = false;
  let phase: 'fill' | 'play' = 'fill';
  let lo = 0;
  let hi = n - 1;
  const owner: (0 | 1 | 2)[] = Array(n).fill(0); // who took pile k during the replay
  let opts: string[] = [];
  let plays: string[] = [];
  let tl: number | string = '—';
  let tr: number | string = '—';
  let val: number | string = '—';
  let sc1 = 0;
  let sc2 = 0;

  const snap = () => ({
    scene: {
      kind: 'split' as const,
      parts: [
        {
          kind: 'array' as const,
          cells: arr(nums, (k) => (owner[k] ? 'dim' : phase === 'fill' && k >= ci && k <= cj && ci >= 0 ? 'active' : phase === 'play' && k >= lo && k <= hi ? 'active' : undefined), (k) => (owner[k] === 1 ? ('blue' as Tone) : owner[k] === 2 ? ('orange' as Tone) : undefined)),
          pointers: phase === 'fill' && ci >= 0 ? [ptr('i', 'i', ci, 'blue'), ...(cj !== ci ? [ptr('j', 'j', cj, 'orange')] : [])] : phase === 'play' && lo <= hi ? [ptr('i', 'left', lo, 'blue'), ...(hi !== lo ? [ptr('j', 'right', hi, 'orange')] : [])] : [],
        },
        {
          kind: 'grid' as const, variant: 'table' as const,
          rows: dp.map((row, i) => row.map((v, j) => {
            if (j < i) return gc(`${i},${j}`, '·', 'dim');
            let s: CellState | undefined;
            if (i === ci && j === cj) s = done ? 'found' : 'active';
            else if (src.some(([a, b]) => a === i && b === j)) s = 'compare';
            else if (v === null) s = 'dim';
            return gc(`${i},${j}`, v === null ? '?' : v, s);
          })),
          rowHeads: nums.map((v, i) => `i=${i} (${v})`), colHeads: nums.map((_v, j) => `j=${j}`),
        },
      ],
    },
    aux: phase === 'fill' ? [{ title: 'the two options', kind: 'list' as const, items: [...opts] }] : [{ title: 'optimal play so far', kind: 'list' as const, items: [...plays] }, { title: 'scores', kind: 'list' as const, items: [`Player 1: ${sc1}`, `Player 2: ${sc2}`] }],
    vars: { i: ci < 0 ? '—' : ci, j: cj < 0 ? '—' : cj, 'take left': tl, 'take right': tr, 'dp[i][j]': val },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', desc: `dp[i][j] = the most the player ON MOVE can lead by, if only piles nums[i..j] remain. Whoever moves, the number is always "mover minus opponent". We need dp[0][${n - 1}] ≥ 0.`,
    logic: 'Storing a score difference removes the need to remember whose turn it is: after I move, my opponent is simply the mover in a smaller interval, so I subtract their value.',
    java: J.def, py: P.def, algo: 0, tag: 'DEFINE —', note: `dp[i][j] = mover − opponent on nums[i..j], goal dp[0][${n - 1}] ≥ 0`,
  });

  for (let i = 0; i < n; i++) dp[i][i] = nums[i];
  say({
    title: 'Base: one pile left', desc: 'With a single pile the mover takes it and leads by exactly that pile: dp[i][i] = nums[i] (the diagonal).',
    logic: 'No choice, no opponent reply — the length-1 intervals are the foundation.', tone: 'success', java: J.base, py: P.base, algo: 1,
    tag: 'BASE CASE —', note: `dp[i][i] = nums[i] = [${nums.join(', ')}]`,
  });

  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      ci = i;
      cj = j;
      done = false;
      src = [[i + 1, j], [i, j - 1]];
      const left = nums[i] - dp[i + 1][j]!;
      const right = nums[j] - dp[i][j - 1]!;
      tl = left;
      tr = right;
      dp[i][j] = Math.max(left, right);
      val = dp[i][j]!;
      opts = [`take left (${nums[i]}): ${nums[i]} − dp[${i + 1}][${j}] = ${nums[i]} − ${dp[i + 1][j]} = ${left}`, `take right (${nums[j]}): ${nums[j]} − dp[${i}][${j - 1}] = ${nums[j]} − ${dp[i][j - 1]} = ${right}`];
      done = true;
      say({
        title: `Piles ${i}..${j}: best lead = ${dp[i][j]}`,
        desc: `Mover takes ${nums[i]} (left): then the opponent leads by dp[${i + 1}][${j}] = ${dp[i + 1][j]}, net ${left}. Mover takes ${nums[j]} (right): opponent leads by dp[${i}][${j - 1}] = ${dp[i][j - 1]}, net ${right}. The better choice (${left >= right ? 'left' : 'right'}) gives ${dp[i][j]}.`,
        logic: 'Both options are scored against an opponent who also plays optimally, so the maximum of the two is the mover’s best guaranteed lead.',
        tone: dp[i][j]! < 0 ? 'warn' : 'info', java: J.cell, py: P.cell, algo: 2,
        tag: `LENGTH ${len} —`, note: `dp[${i}][${j}] = max(${nums[i]} − ${dp[i + 1][j]}, ${nums[j]} − ${dp[i][j - 1]}) = max(${left}, ${right}) = ${dp[i][j]}`,
      });
    }
  }

  // replay optimal play to show whose turn it is
  phase = 'play';
  ci = 0;
  cj = n - 1;
  src = [];
  done = true;
  lo = 0;
  hi = n - 1;
  let turn: 1 | 2 = 1;
  while (lo <= hi) {
    ci = lo;
    cj = hi;
    let pickLeft = true;
    if (lo < hi) pickLeft = nums[lo] - dp[lo + 1][hi]! >= nums[hi] - dp[lo][hi - 1]!;
    const k = pickLeft ? lo : hi;
    owner[k] = turn;
    if (turn === 1) sc1 += nums[k];
    else sc2 += nums[k];
    plays.push(`Player ${turn} takes ${nums[k]} (${pickLeft ? 'left' : 'right'})`);
    if (pickLeft) lo++;
    else hi--;
    say({
      title: `Player ${turn} takes ${nums[k]}`, desc: `Following the table: Player ${turn} takes the ${pickLeft ? 'left' : 'right'} pile ${nums[k]}. Scores are now ${sc1} vs ${sc2}.`,
      logic: 'The optimal choice in each state is the one that achieved the stored maximum; turns alternate.', java: J.cell, py: P.cell, algo: 3,
      tag: `PLAYER ${turn} —`, note: `takes ${nums[k]} (${pickLeft ? 'left' : 'right'}), scores ${sc1} : ${sc2}`,
    });
    turn = turn === 1 ? 2 : 1;
  }

  const win = dp[0][n - 1]! >= 0;
  ci = 0;
  cj = n - 1;
  say({
    title: 'Done', tag: '✅ Done!', note: `dp[0][${n - 1}] = ${dp[0][n - 1]} ${win ? '≥' : '<'} 0 → ${win}`, desc: `dp[0][${n - 1}] = ${dp[0][n - 1]}: ${win ? `Player 1 can finish ahead or level (final scores ${sc1} vs ${sc2}).` : `Player 2 wins even against best play (final scores ${sc1} vs ${sc2}).`}`,
    logic: 'A non-negative lead for the first mover means Player 1 never loses (ties go to Player 1).', tone: win ? 'success' : 'warn',
    java: J.ret, py: P.ret, algo: 3, result: { title: win ? 'true' : 'false', text: win ? 'Player 1 can win' : 'Player 1 loses' },
  });
  return steps;
}

export const predictTheWinner: ProblemDef<In> = {
  slug: '486-predict-the-winner',
  id: '486', title: 'Predict the Winner', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'interval minimax',
  statement: 'Two players alternately take a pile from either end of a row of non-negative numbers; each adds the taken value to their score. Player 1 moves first and both play optimally. Return true if Player 1 can end with at least as many points as Player 2.',
  constraints: '1 ≤ nums.length ≤ 20, 0 ≤ nums[i] ≤ 10⁷ (animation input: ≤ 7 numbers, 0–99)',
  examples: [
    { label: '1 5 233 7', input: { nums: [1, 5, 233, 7] }, output: 'true' },
    { label: '1 5 2', input: { nums: [1, 5, 2] }, output: 'false' },
    { label: '3 9 1 2', input: { nums: [3, 9, 1, 2] }, output: 'true' },
  ],
  inputPlaceholder: 'piles, e.g. 1 5 2',
  parseInput: (raw) => ({ nums: parseInts(raw, { what: 'the piles', example: '1 5 2', minLen: 1, maxLen: 7, lo: 0, hi: 99 }) }),
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Interval being solved', state: 'active' }, { label: 'Opponent’s sub-intervals', state: 'compare' }, { label: 'Finished', state: 'found' }, { label: 'Taken / not yet', state: 'dim' }],
  varLabels: ['i', 'j', 'take left', 'take right', 'dp[i][j]'],
  emphasis: ['both play optimally', 'Player 1', 'at least as many points'],
  phases: [
    { icon: '🧱', label: 'Define dp[i][j] = lead', tone: 'blue' },
    { icon: '🌱', label: 'Base: one pile', tone: 'blue' },
    { icon: '⚔️', label: 'Max of take-left / take-right', tone: 'cyan' },
    { icon: '▶️', label: 'Replay optimal play, verdict', tone: 'green' },
  ],
  approach: {
    title: 'Best score difference on each interval',
    text: 'Let dp[i][j] be how far ahead the player to move can get on piles i..j. Taking the left pile gives nums[i] minus whatever lead the opponent then has on i+1..j; the right pile is symmetric. dp[i][j] is the larger of the two, and Player 1 wins if dp[0][n−1] ≥ 0.',
  },
  java, python,
  algorithm: [
    'dp[i][j] = best (mover − opponent) lead on piles i..j',
    'Base: dp[i][i] = nums[i]',
    'By interval length: dp[i][j] = max(nums[i] − dp[i+1][j], nums[j] − dp[i][j−1])',
    'Player 1 wins iff dp[0][n−1] ≥ 0',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(n²)' }],
  why: 'Zero-sum play makes the opponent’s best result my worst: whatever lead the opponent can get from the remaining interval is exactly what I lose, so my value for a choice is my pile minus their optimal lead. Intervals shrink by one pile per move, so every sub-interval needed is shorter and already filled. The minimax value of the whole game is the entry for the full interval.',
};
