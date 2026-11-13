import type { CellState, ProblemDef, Step, Tone } from '../engine/types.ts';
import { find, gc, heads, parseInts, recorder } from './dpAdvKit.ts';

interface In { stones: number[] }

const java = [
  'public String stoneGameIII(int[] stoneValue) {',
  '    int n = stoneValue.length;',
  '    int[] dp = new int[n + 1];                       // dp[i] = best (mover - opponent) lead using stones i..n-1',
  '    for (int i = n - 1; i >= 0; i--) {',
  '        int take = 0;',
  '        dp[i] = Integer.MIN_VALUE;',
  '        for (int k = 1; k <= 3 && i + k <= n; k++) {',
  '            take += stoneValue[i + k - 1];            // sum of the k stones grabbed',
  '            dp[i] = Math.max(dp[i], take - dp[i + k]);',
  '        }',
  '    }',
  '    if (dp[0] > 0) return "Alice";',
  '    return dp[0] < 0 ? "Bob" : "Tie";',
  '}',
];
const python = [
  'def stone_game_iii(stone_value):',
  '    n = len(stone_value)',
  '    dp = [0] * (n + 1)                               # dp[i] = best (mover - opponent) lead using stones i..',
  '    for i in range(n - 1, -1, -1):',
  '        take = 0',
  '        dp[i] = float("-inf")',
  '        for k in range(1, 4):',
  '            if i + k > n:',
  '                break',
  '            take += stone_value[i + k - 1]            # sum of the k stones grabbed',
  '            dp[i] = max(dp[i], take - dp[i + k])',
  '    if dp[0] > 0:',
  '        return "Alice"',
  '    return "Bob" if dp[0] < 0 else "Tie"',
];
const J = { def: find(java, 'int[] dp'), outer: find(java, 'for (int i = n - 1', 'int take = 0', 'dp[i] = Integer.MIN_VALUE'), cand: find(java, 'for (int k', 'take += ', 'dp[i] = Math.max'), ret: find(java, 'if (dp[0] > 0)', 'return dp[0] < 0') };
const P = { def: find(python, 'dp = [0]'), outer: find(python, 'for i in range(n - 1', 'take = 0', 'dp[i] = float'), cand: find(python, 'for k in range', 'take += ', 'dp[i] = max'), ret: find(python, 'if dp[0] > 0', 'return "Bob"') };

function build({ stones }: In): Step[] {
  const n = stones.length;
  const dp: (number | null)[] = Array(n + 1).fill(null);
  const steps: Step[] = [];
  let ci = -1;
  let ck = 0;
  let done = false;
  let phase: 'fill' | 'play' = 'fill';
  const owner: (0 | 1 | 2)[] = Array(n).fill(0);
  let opts: string[] = [];
  let plays: string[] = [];
  let sa = 0;
  let sb = 0;
  let takeV: number | string = '—';
  let cand: number | string = '—';

  const snap = () => ({
    scene: {
      kind: 'grid' as const, variant: 'table' as const,
      rows: [
        Array.from({ length: n + 1 }, (_, i) => {
          if (i === n) return gc('s-end', '·', 'dim');
          let s: CellState | undefined;
          let t: Tone | undefined;
          if (owner[i]) {
            s = 'dim';
            t = owner[i] === 1 ? 'blue' : 'orange';
          } else if (phase === 'fill' && ci >= 0 && ck > 0 && i >= ci && i < ci + ck) s = 'active';
          return gc(`s${i}`, stones[i], s, t);
        }),
        dp.map((v, i) => {
          let s: CellState | undefined;
          if (phase === 'fill' && i === ci) s = done ? 'found' : 'active';
          else if (phase === 'fill' && ck > 0 && ci >= 0 && i === ci + ck) s = 'compare';
          else if (v === null) s = 'dim';
          return gc(`d${i}`, v === null ? '?' : v, s);
        }),
      ],
      rowHeads: ['stones', 'dp'], colHeads: heads(n + 1),
    },
    aux: phase === 'fill' ? [{ title: ci >= 0 ? `options at i = ${ci}` : 'options', kind: 'list' as const, items: [...opts] }] : [{ title: 'optimal play', kind: 'list' as const, items: [...plays] }, { title: 'scores', kind: 'list' as const, items: [`Alice: ${sa}`, `Bob: ${sb}`] }],
    vars: { i: ci < 0 ? '—' : ci, k: ck || '—', 'take (sum)': takeV, 'take − dp[i+k]': cand },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', desc: 'Players alternate taking 1, 2 or 3 stones from the front of the row; each stone has a (possibly negative) value. dp[i] = how far ahead the player on move can finish when stones i..end remain.',
    logic: 'Because the row only ever shrinks from the front, the whole game state is one index i. Scores are stored as a lead (mover − opponent) so turns never need tracking.',
    java: J.def, py: P.def, algo: 0, tag: 'DEFINE —', note: `dp[0..${n}], dp[i] = mover − opponent on stones i..${n - 1}`,
  });
  dp[n] = 0;
  ci = n;
  done = true;
  say({
    title: 'Base case dp[n] = 0', desc: `No stones left: nothing to take, nobody leads, so dp[${n}] = 0.`,
    logic: 'Every game ends here; the recurrence reads this cell when a move takes the last stones.', tone: 'success', java: J.def, py: P.def, algo: 1,
    tag: 'BASE CASE —', note: `dp[${n}] = 0`,
  });

  for (let i = n - 1; i >= 0; i--) {
    ci = i;
    done = false;
    ck = 0;
    opts = [];
    let take = 0;
    let best = -Infinity;
    for (let k = 1; k <= 3 && i + k <= n; k++) {
      take += stones[i + k - 1];
      const c = take - dp[i + k]!;
      ck = k;
      takeV = take;
      cand = c;
      const better = c > best;
      if (better) best = c;
      dp[i] = best;
      opts.push(`take ${k}: ${take} − dp[${i + k}] = ${take} − ${dp[i + k]} = ${c}`);
      if (k === 3 || i + k === n) done = true;
      say({
        title: `i = ${i}, take ${k}`, desc: `Grab ${k} stone${k === 1 ? '' : 's'} worth ${take}; the opponent then leads by dp[${i + k}] = ${dp[i + k]}. Net for the mover: ${take} − ${dp[i + k]} = ${c}. ${better ? `Best so far: dp[${i}] = ${best}.` : `Best stays ${best}.`}`,
        logic: 'Each grab is scored against the opponent’s optimal reply on the shorter row; keep the largest net lead.', tone: better ? 'success' : 'info', java: J.cand, py: P.cand, algo: 2,
        tag: better ? `TAKE ${k} · BEST —` : `TAKE ${k} —`, note: `take − dp[${i + k}] = ${take} − ${dp[i + k]} = ${c}; dp[${i}] = ${best}`,
      });
    }
  }

  // replay
  phase = 'play';
  ck = 0;
  ci = 0;
  let i = 0;
  let turn: 1 | 2 = 1;
  while (i < n) {
    let take = 0;
    let bestK = 1;
    let best = -Infinity;
    for (let k = 1; k <= 3 && i + k <= n; k++) {
      take += stones[i + k - 1];
      if (take - dp[i + k]! > best) {
        best = take - dp[i + k]!;
        bestK = k;
      }
    }
    let got = 0;
    for (let q = 0; q < bestK; q++) {
      owner[i + q] = turn;
      got += stones[i + q];
    }
    if (turn === 1) sa += got;
    else sb += got;
    plays.push(`${turn === 1 ? 'Alice' : 'Bob'} takes ${bestK} (${got})`);
    i += bestK;
    ci = Math.min(i, n);
    say({
      title: `${turn === 1 ? 'Alice' : 'Bob'} takes ${bestK} stone${bestK === 1 ? '' : 's'}`, desc: `Replaying the table: the best choice here is to take ${bestK} (worth ${got}). Scores: Alice ${sa}, Bob ${sb}.`,
      logic: 'The stored maximum tells us which k achieved it; turns alternate between the two players.', java: J.cand, py: P.cand, algo: 3,
      tag: `${turn === 1 ? 'ALICE' : 'BOB'} —`, note: `takes ${bestK} (value ${got}), scores ${sa} : ${sb}`,
    });
    turn = turn === 1 ? 2 : 1;
  }

  const r = dp[0]! > 0 ? 'Alice' : dp[0]! < 0 ? 'Bob' : 'Tie';
  say({
    title: 'Done', tag: '✅ Done!', note: `dp[0] = ${dp[0]} → ${r}`, desc: `dp[0] = ${dp[0]} (Alice ${sa} vs Bob ${sb}): ${r === 'Tie' ? 'the game is a tie.' : `${r} wins.`}`,
    logic: 'The sign of the first mover’s guaranteed lead decides the game.', tone: r === 'Bob' ? 'warn' : 'success', java: J.ret, py: P.ret, algo: 3,
    result: { title: r, text: r === 'Tie' ? 'Equal scores' : `${r} wins` },
  });
  return steps;
}

export const stoneGameIII: ProblemDef<In> = {
  slug: '1406-stone-game-iii',
  id: '1406', title: 'Stone Game III', difficulty: 'Hard', category: 'Dynamic Programming', tag: 'game · suffix minimax',
  statement: 'Stones with integer values lie in a row. Alice and Bob alternate, Alice first; on a turn a player takes 1, 2 or 3 stones from the front of the row. Scores are the sums of the values taken. Both play optimally. Return "Alice", "Bob" or "Tie".',
  constraints: '1 ≤ stoneValue.length ≤ 5·10⁴, −1000 ≤ stoneValue[i] ≤ 1000 (animation input: ≤ 10 stones, values −99..99)',
  examples: [
    { label: '1 2 3 7', input: { stones: [1, 2, 3, 7] }, output: 'Bob' },
    { label: '1 2 3 -9', input: { stones: [1, 2, 3, -9] }, output: 'Alice' },
    { label: '1 2 3 6', input: { stones: [1, 2, 3, 6] }, output: 'Tie' },
  ],
  inputPlaceholder: 'stone values, e.g. 1 2 3 7',
  parseInput: (raw) => ({ stones: parseInts(raw, { what: 'the stone values', example: '1 2 3 7', minLen: 1, maxLen: 10, lo: -99, hi: 99 }) }),
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Stones grabbed / dp[i] being solved', state: 'active' }, { label: 'Opponent’s position dp[i+k]', state: 'compare' }, { label: 'Finished dp[i]', state: 'found' }, { label: 'Taken / not yet', state: 'dim' }],
  varLabels: ['i', 'k', 'take (sum)', 'take − dp[i+k]'],
  emphasis: ['1, 2 or 3 stones', 'Alice', 'Bob', 'Tie', 'play optimally'],
  phases: [
    { icon: '🧱', label: 'Define dp[i] = lead', tone: 'blue' },
    { icon: '🌱', label: 'Base: dp[n] = 0', tone: 'blue' },
    { icon: '🪨', label: 'Try taking 1, 2 or 3', tone: 'cyan' },
    { icon: '▶️', label: 'Replay play, verdict', tone: 'green' },
  ],
  approach: {
    title: 'Best lead from every suffix',
    text: 'Work from the back. If you take k stones starting at i you score their sum, and then the opponent faces suffix i+k and will lead by dp[i+k]. So dp[i] = max over k = 1..3 of (sum − dp[i+k]). The sign of dp[0] picks the winner.',
  },
  java, python,
  algorithm: [
    'dp[i] = best (mover − opponent) lead on stones i..n−1; dp[n] = 0',
    'Go from i = n−1 down to 0',
    'Try taking k = 1, 2, 3 stones: candidate = sum of them − dp[i+k]',
    'Keep the maximum; decide the winner from the sign of dp[0]',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'After a move the game is the same game on a shorter suffix with the players’ roles swapped, so the opponent’s best outcome there is exactly dp[i+k] and it subtracts from what I scored. The leads depend only on the suffix start, so one number per index summarises all histories, and each entry only needs entries to its right, which are already known.',
};
