/**
 * Fuzz pack p6 (dp-core): for every new problem, run buildSteps on ~200 random inputs and compare the final result
 * with a plain brute-force / independent reference. Run:  node scripts/fuzz-pack6.mts   (exit code 0 = all good)
 */
import { knapsack01 } from '../src/problems/knapsack01.ts';
import { lastStoneWeightII } from '../src/problems/lastStoneWeightII.ts';
import { unboundedKnapsack } from '../src/problems/unboundedKnapsack.ts';
import { coinChangeII } from '../src/problems/coinChangeII.ts';
import { perfectSquares } from '../src/problems/perfectSquares.ts';
import { longestPalindromicSubsequence } from '../src/problems/longestPalindromicSubsequence.ts';
import { palindromePartitioningII } from '../src/problems/palindromePartitioningII.ts';
import { minInsertionStepsPalindrome } from '../src/problems/minInsertionStepsPalindrome.ts';
import { memoizedFibonacci } from '../src/problems/memoizedFibonacci.ts';
import { gridPathsMemo } from '../src/problems/gridPathsMemo.ts';
import { targetSum } from '../src/problems/targetSum.ts';
import { stockCooldown } from '../src/problems/stockCooldown.ts';
import { stockFee } from '../src/problems/stockFee.ts';
import { stockAtMostK } from '../src/problems/stockAtMostK.ts';
import { numberOfLongestIncreasingSubsequence } from '../src/problems/numberOfLongestIncreasingSubsequence.ts';
import { russianDollEnvelopes } from '../src/problems/russianDollEnvelopes.ts';
import { maximumSumCircularSubarray } from '../src/problems/maximumSumCircularSubarray.ts';

let seed = 20240611;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const arr = (n: number, lo: number, hi: number) => Array.from({ length: n }, () => ri(lo, hi));
const word = (n: number, alpha = 3) => Array.from({ length: n }, () => String.fromCharCode(97 + ri(0, alpha - 1))).join('');

let failures = 0;
function fuzz<I>(p: { slug: string; buildSteps: (i: I) => any[] }, gen: () => I, ref: (i: I) => number, runs = 200) {
  let bad = 0;
  for (let t = 0; t < runs; t++) {
    const input = gen();
    let steps: any[];
    try {
      steps = p.buildSteps(input);
    } catch (e) {
      bad++;
      if (bad <= 3) console.log(`  ${p.slug}: threw on ${JSON.stringify(input)}: ${e}`);
      continue;
    }
    const got = steps[steps.length - 1]?.result?.title;
    const want = String(ref(input));
    if (got !== want || steps.length > 400) {
      bad++;
      if (bad <= 3) console.log(`  ${p.slug}: ${JSON.stringify(input)} -> got ${got} (${steps.length} steps), want ${want}`);
    }
  }
  failures += bad;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${p.slug} (${runs} runs)`);
}

// ---------- 0/1 knapsack family
function bruteKnap(wt: number[], val: number[], cap: number): number {
  let best = 0;
  for (let m = 0; m < 1 << wt.length; m++) {
    let w = 0, v = 0;
    for (let i = 0; i < wt.length; i++) if (m >> i & 1) { w += wt[i]; v += val[i]; }
    if (w <= cap) best = Math.max(best, v);
  }
  return best;
}
fuzz(knapsack01, () => { const n = ri(1, 5); return { wt: arr(n, 1, 9), val: arr(n, 1, 30), cap: ri(1, 10) }; }, ({ wt, val, cap }) => bruteKnap(wt, val, cap));

fuzz(lastStoneWeightII, () => { for (;;) { const s = arr(ri(1, 6), 1, 20); if (s.reduce((a, b) => a + b, 0) <= 30) return { stones: s }; } }, ({ stones }) => {
  let best = Infinity;
  for (let m = 0; m < 1 << stones.length; m++) {
    let d = 0;
    stones.forEach((x, i) => { d += m >> i & 1 ? x : -x; });
    best = Math.min(best, Math.abs(d));
  }
  return best;
});

// ---------- unbounded family
fuzz(unboundedKnapsack, () => { const n = ri(1, 4); return { wt: arr(n, 1, 9), val: arr(n, 1, 30), cap: ri(1, 12) }; }, ({ wt, val, cap }) => {
  const d = Array(cap + 1).fill(0);
  for (let c = 1; c <= cap; c++) for (let i = 0; i < wt.length; i++) if (wt[i] <= c) d[c] = Math.max(d[c], d[c - wt[i]] + val[i]);
  return d[cap];
});

const distinct = (n: number, lo: number, hi: number) => { const s = new Set<number>(); while (s.size < n) s.add(ri(lo, hi)); return [...s]; };
fuzz(coinChangeII, () => ({ coins: distinct(ri(1, 4), 1, 12), amount: ri(0, 12) }), ({ coins, amount }) => {
  const go = (i: number, rem: number): number => (rem === 0 ? 1 : i === coins.length || rem < 0 ? 0 : go(i, rem - coins[i]) + go(i + 1, rem));
  return go(0, amount);
});

fuzz(perfectSquares, () => ({ n: ri(1, 24) }), ({ n }) => {
  const go = (r: number): number => { if (r === 0) return 0; let b = Infinity; for (let s = 1; s * s <= r; s++) b = Math.min(b, 1 + go(r - s * s)); return b; };
  return go(n);
});

// ---------- palindromic family
const lcs = (a: string, b: string) => {
  const d = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
  return d[a.length][b.length];
};
const rev = (s: string) => [...s].reverse().join('');
const isPal = (s: string) => s === rev(s);
fuzz(longestPalindromicSubsequence, () => ({ s: word(ri(1, 8), ri(2, 4)) }), ({ s }) => {
  let best = 0;
  for (let m = 1; m < 1 << s.length; m++) {
    let t = '';
    for (let i = 0; i < s.length; i++) if (m >> i & 1) t += s[i];
    if (isPal(t)) best = Math.max(best, t.length);
  }
  return best;
});
fuzz(minInsertionStepsPalindrome, () => ({ s: word(ri(1, 8), ri(2, 4)) }), ({ s }) => s.length - lcs(s, rev(s)));
fuzz(palindromePartitioningII, () => ({ s: word(ri(1, 8), ri(1, 3)) }), ({ s }) => {
  const go = (i: number): number => { if (i === s.length) return -1; let b = Infinity; for (let j = i; j < s.length; j++) if (isPal(s.slice(i, j + 1))) b = Math.min(b, 1 + go(j + 1)); return b; };
  return go(0);
});

// ---------- memoization family
fuzz(memoizedFibonacci, () => ({ n: ri(2, 6) }), ({ n }) => { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; }, 20);
fuzz(gridPathsMemo, () => ({ rows: ri(2, 4), cols: ri(2, 4) }), ({ rows, cols }) => {
  const f = (k: number): number => (k <= 1 ? 1 : k * f(k - 1));
  return f(rows + cols - 2) / (f(rows - 1) * f(cols - 1));
}, 40);
fuzz(targetSum, () => {
  for (;;) {
    const nums = arr(ri(1, 5), 0, 3);
    const input = { nums, target: ri(-6, 6) };
    try { targetSum.parseInput(`${nums.join(' ')} ; ${input.target}`); return input; } catch { /* call tree too big: draw again */ }
  }
}, ({ nums, target }) => {
  let c = 0;
  for (let m = 0; m < 1 << nums.length; m++) {
    let s = 0;
    nums.forEach((x, i) => { s += m >> i & 1 ? x : -x; });
    if (s === target) c++;
  }
  return c;
});

// ---------- state machine family
const dfsStock = (prices: number[], opts: { cooldown?: boolean; fee?: number; k?: number }) => {
  const { cooldown = false, fee = 0, k = Infinity } = opts;
  const go = (day: number, holding: boolean, cool: boolean, left: number): number => {
    if (day === prices.length) return 0;
    let best = go(day + 1, holding, false, left); // do nothing
    if (holding) best = Math.max(best, prices[day] - fee + go(day + 1, false, cooldown, left));
    else if (!cool && left > 0) best = Math.max(best, -prices[day] + go(day + 1, true, false, left - 1));
    return best;
  };
  return go(0, false, false, k);
};
const prices = () => arr(ri(2, 8), 0, 30);
fuzz(stockCooldown, () => ({ prices: prices() }), ({ prices: p }) => dfsStock(p, { cooldown: true }));
fuzz(stockFee, () => ({ prices: prices(), fee: ri(0, 10) }), ({ prices: p, fee }) => dfsStock(p, { fee }));
fuzz(stockAtMostK, () => ({ k: ri(1, 3), prices: prices() }), ({ k, prices: p }) => dfsStock(p, { k }));

// ---------- LIS / min-max extras
fuzz(numberOfLongestIncreasingSubsequence, () => ({ nums: arr(ri(1, 8), -4, 4) }), ({ nums }) => {
  let best = 0, count = 0;
  for (let m = 1; m < 1 << nums.length; m++) {
    const t: number[] = [];
    for (let i = 0; i < nums.length; i++) if (m >> i & 1) t.push(nums[i]);
    if (t.every((x, i) => i === 0 || t[i - 1] < x)) {
      if (t.length > best) { best = t.length; count = 1; } else if (t.length === best) count++;
    }
  }
  return count;
});
fuzz(russianDollEnvelopes, () => ({ env: Array.from({ length: ri(1, 8) }, () => [ri(1, 9), ri(1, 9)] as [number, number]) }), ({ env }) => {
  const d = env.map(() => 1);
  const idx = env.map((_, i) => i).sort((a, b) => env[a][0] - env[b][0] || env[a][1] - env[b][1]);
  let best = 0;
  idx.forEach((i, ii) => {
    for (let jj = 0; jj < ii; jj++) {
      const j = idx[jj];
      if (env[j][0] < env[i][0] && env[j][1] < env[i][1]) d[i] = Math.max(d[i], d[j] + 1);
    }
    best = Math.max(best, d[i]);
  });
  return best;
});
fuzz(maximumSumCircularSubarray, () => ({ nums: arr(ri(1, 10), -20, 20) }), ({ nums }) => {
  const n = nums.length;
  let best = -Infinity;
  for (let s = 0; s < n; s++) {
    let sum = 0;
    for (let l = 1; l <= n; l++) { sum += nums[(s + l - 1) % n]; best = Math.max(best, sum); }
  }
  return best;
});

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL FUZZ CHECKS PASSED');
process.exit(failures ? 1 : 0);
