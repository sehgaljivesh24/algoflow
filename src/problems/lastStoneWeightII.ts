import type { ProblemDef, Step } from '../engine/types.ts';
import { capSteps, parseInts, recorder } from './stepKit.ts';
import { rowCells } from './dpCoreKit.ts';

interface In { stones: number[] }

function parse(raw: string): In {
  const stones = parseInts(raw, { what: 'stone weights', example: '2 7 4 1 8 1', minLen: 1, maxLen: 6, lo: 1, hi: 20 });
  if (stones.reduce((a, b) => a + b, 0) > 30) throw new Error('Keep the total weight at most 30 so the animation stays readable');
  return capSteps(build, { stones });
}

function build({ stones }: In): Step[] {
  const total = stones.reduce((a, b) => a + b, 0);
  const half = Math.floor(total / 2);
  const dp: boolean[] = Array(half + 1).fill(false);
  const steps: Step[] = [];
  let x: number | string = '—';
  let s = -1;
  let from = -1;
  let done = false;
  let best: number | string = '—';

  const snap = () => ({
    cells: rowCells('s', dp.map((v) => (v ? 'T' : 'F')), (i) => (i === s ? (done ? 'found' : 'active') : i === from ? 'compare' : undefined), (i) => (dp[i] ? 'green' : undefined)),
    pointers: [
      ...(s >= 0 ? [{ id: 's', label: 's', index: s, tone: 'blue' as const }] : []),
      ...(from >= 0 ? [{ id: 'f', label: `s−${x}`, index: from, tone: 'orange' as const }] : []),
    ],
    aux: [{ title: 'stones', kind: 'list' as const, items: stones.map(String), highlight: curIdx >= 0 ? curIdx : undefined }],
    vars: { stone: x, s: s < 0 ? '—' : s, 'dp[s-stone]': from < 0 ? '—' : dp[from] ? 'T' : 'F', best },
  });
  let curIdx = -1;
  const say = recorder(steps, snap);

  say({
    title: 'Turn smashing into splitting', tag: 'REDUCE —', desc: `Total weight ${total}. Smashing stones always ends with (sum of one group) − (sum of the other), so we want two groups whose sums are as close as possible: ideally each ${total}/2.`,
    logic: 'Choosing a sign (+ or −) for every stone is the same as splitting them into two groups; only the group sums matter.', java: [0, 1], py: [0, 1], algo: 0,
    note: `total = ${total}, search sums 0..${half}`,
  });

  dp[0] = true;
  s = 0;
  done = true;
  say({
    title: `dp[s] = can some stones weigh exactly s? (s ≤ ${half})`, tag: 'BASE CASE —', desc: 'We only track sums up to half the total; the lighter group never exceeds that. dp[0] is true (the empty group).',
    logic: 'If one group weighs s, the other weighs total − s, so we just want the largest reachable s ≤ total/2.', tone: 'success', java: [2, 3], py: [2, 3], algo: 1,
    note: 'dp[0] = true, every other sum unreachable',
  });

  stones.forEach((w, idx) => {
    x = w;
    curIdx = idx;
    for (let t = half; t >= w; t--) {
      s = t;
      from = t - w;
      done = false;
      const before = dp[t];
      const gained = !before && dp[from];
      if (dp[from]) dp[t] = true;
      done = true;
      say({
        title: `Stone ${w}, s = ${t}: ${dp[t] ? 'T' : 'F'}`, tag: gained ? `STONE ${w} FITS —` : `STONE ${w} —`,
        desc: `dp[${from}] is ${dp[from] ? 'true' : 'false'}, so ${dp[from] ? (gained ? `sum ${t} becomes reachable by adding this stone to a group of ${from}.` : `sum ${t} was already reachable.`) : `this stone cannot complete sum ${t}.`}`,
        logic: 'Sweeping s downward keeps dp[s − stone] from the previous stones, so each stone joins a group at most once.', tone: gained ? 'success' : 'info', java: [5, 6], py: [5, 6], algo: 2,
        note: `dp[${t}] = ${before ? 'T' : 'F'} OR dp[${t} − ${w}] = dp[${from}] = ${dp[from] ? 'T' : 'F'} → ${dp[t] ? 'T' : 'F'}`,
      });
    }
  });

  x = '—';
  curIdx = -1;
  from = -1;
  let found = 0;
  for (let t = half; t >= 0; t--) {
    if (dp[t]) { found = t; break; }
  }
  s = found;
  best = found;
  done = true;
  say({
    title: `Largest reachable sum ≤ ${half} is ${found}`, tag: 'SCAN DOWN —', desc: `Scanning down from ${half}, the first true cell is s = ${found}. One group weighs ${found}, the other ${total - found}.`,
    logic: 'The group sums closest to half are the ones that leave the smallest leftover stone.', tone: 'success', java: [9, 10], py: [7, 8, 9], algo: 3,
    note: `best s = ${found}, other group = ${total} − ${found} = ${total - found}`,
  });
  say({
    title: 'Done', tag: '✅ Done!', note: `${total} − 2 × ${found} = ${total - 2 * found}`, desc: `Smallest possible final weight = ${total} − 2 × ${found} = ${total - 2 * found}.`,
    logic: 'The difference of the two group sums is total − 2·s.', tone: 'success', java: [10], py: [9], algo: 3,
    result: { title: String(total - 2 * found), text: 'Smallest remaining stone weight' },
  });
  return steps;
}

export const lastStoneWeightII: ProblemDef<In> = {
  slug: '1049-last-stone-weight-ii',
  id: '1049', title: 'Last Stone Weight II', difficulty: 'Medium', category: 'Dynamic Programming', tag: '0/1 knapsack (subset sum)',
  statement: 'Repeatedly pick any two stones and smash them: equal stones both vanish, otherwise the heavier one keeps the difference. After all smashes at most one stone remains. Return the smallest possible weight of that stone (0 if none).',
  constraints: '1 ≤ stones.length ≤ 30, 1 ≤ stones[i] ≤ 100 (animation input: ≤ 6 stones of weight ≤ 20, total ≤ 30)',
  examples: [
    { label: '[2, 7, 4, 1, 8, 1]', input: { stones: [2, 7, 4, 1, 8, 1] }, output: '1' },
    { label: '[3, 2, 3, 2, 4]', input: { stones: [3, 2, 3, 2, 4] }, output: '0' },
    { label: '[9, 5]', input: { stones: [9, 5] }, output: '4' },
  ],
  inputPlaceholder: 'e.g. 2 7 4 1 8 1',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizCaption: 'dp[s] — can a group of stones weigh exactly s?',
  legend: [{ label: 'Sum s being updated', state: 'active' }, { label: 'dp[s − stone]', state: 'compare' }, { label: 'Just updated', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['stone', 's', 'dp[s-stone]', 'best'],
  emphasis: ['smash', 'smallest possible weight'],
  phases: [
    { icon: '🔀', label: 'Reduce to two groups', tone: 'blue' },
    { icon: '🌱', label: 'Base: dp[0] = true', tone: 'blue' },
    { icon: '🎒', label: 'Add a stone, s downward', tone: 'cyan' },
    { icon: '🏆', label: 'Largest s ≤ total/2', tone: 'green' },
  ],
  approach: {
    title: 'Split into two groups with nearly equal sums',
    text: 'Every smash order corresponds to giving each stone a + or − sign, i.e. splitting stones into two groups. Find the largest group sum s ≤ total/2 with a 0/1 subset-sum array (sweep s downward for each stone). The answer is total − 2s.',
  },
  java: [
    'public int lastStoneWeightII(int[] stones) {',
    '    int total = Arrays.stream(stones).sum(), half = total / 2;',
    '    boolean[] dp = new boolean[half + 1];',
    '    dp[0] = true;                                   // the empty group weighs 0',
    '    for (int x : stones) {',
    '        for (int s = half; s >= x; s--) {           // downward: each stone used at most once',
    '            dp[s] |= dp[s - x];',
    '        }',
    '    }',
    '    for (int s = half; s >= 0; s--) {',
    '        if (dp[s]) return total - 2 * s;            // closest group weight to half',
    '    }',
    '    return 0;',
    '}',
  ],
  python: [
    'def last_stone_weight_ii(stones):',
    '    total = sum(stones); half = total // 2',
    '    dp = [False] * (half + 1)',
    '    dp[0] = True                                    # the empty group weighs 0',
    '    for x in stones:',
    '        for s in range(half, x - 1, -1):            # downward: each stone used at most once',
    '            dp[s] = dp[s] or dp[s - x]',
    '    for s in range(half, -1, -1):',
    '        if dp[s]:',
    '            return total - 2 * s',
    '    return 0',
  ],
  algorithm: [
    'Reframe: split the stones into two groups; the answer is the difference of their sums',
    'dp[s] = some group of stones weighs exactly s (s ≤ total/2); dp[0] = true',
    'For each stone, sweep s downward: dp[s] |= dp[s − stone]',
    'Take the largest reachable s; return total − 2s',
  ],
  complexity: [{ label: 'Time', value: 'O(n · total/2)' }, { label: 'Space', value: 'O(total/2)' }],
  why: 'Whatever order the stones are smashed in, each stone ends up contributing with a plus or a minus sign to the last stone, so the result is |sum(A) − sum(B)| for some split into groups A and B; conversely every split can be realised. Minimising the gap means making one group as close to total/2 as possible from below, which is subset sum. The downward sweep keeps each stone single-use.',
};
