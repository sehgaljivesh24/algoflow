/**
 * Fuzz test for the backtracking / DP group.  Run:  node scripts/fuzz-backtrackdp.mts
 * For every problem: ~200 random valid inputs, run buildSteps, compare the final answer with a plain reference solution.
 * For backtracking problems the sorted SET of produced results is compared with a reference generator.
 */
import { subsets } from '../src/problems/subsets.ts';
import { subsetsII } from '../src/problems/subsetsII.ts';
import { permutations } from '../src/problems/permutations.ts';
import { combinations } from '../src/problems/combinations.ts';
import { combinationSum } from '../src/problems/combinationSum.ts';
import { letterCombinations } from '../src/problems/letterCombinations.ts';
import { generateParentheses } from '../src/problems/generateParentheses.ts';
import { nQueens } from '../src/problems/nQueens.ts';
import { sudokuSolver } from '../src/problems/sudokuSolver.ts';
import { fibonacciNumber } from '../src/problems/fibonacciNumber.ts';
import { minCostClimbingStairs } from '../src/problems/minCostClimbingStairs.ts';
import { uniquePaths } from '../src/problems/uniquePaths.ts';
import { uniquePathsII } from '../src/problems/uniquePathsII.ts';
import { triangle } from '../src/problems/triangle.ts';
import { houseRobber } from '../src/problems/houseRobber.ts';
import { houseRobberII } from '../src/problems/houseRobberII.ts';
import { maxProductSubarray } from '../src/problems/maxProductSubarray.ts';
import { longestIncreasingSubsequence } from '../src/problems/longestIncreasingSubsequence.ts';
import { decodeWays } from '../src/problems/decodeWays.ts';
import { coinChange } from '../src/problems/coinChange.ts';
import { longestCommonSubsequence } from '../src/problems/longestCommonSubsequence.ts';
import { editDistance } from '../src/problems/editDistance.ts';
import { longestCommonSubstring } from '../src/problems/longestCommonSubstring.ts';
import { wordBreak } from '../src/problems/wordBreak.ts';
import { partitionEqualSubsetSum } from '../src/problems/partitionEqualSubsetSum.ts';
import type { Step } from '../src/engine/types.ts';

let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = <T,>(a: T[]): T => a[ri(0, a.length - 1)];
const distinct = (n: number, lo: number, hi: number) => {
  const s = new Set<number>();
  while (s.size < n) s.add(ri(lo, hi));
  return [...s];
};

let failures = 0;
const totals: Record<string, number> = {};
const bad = (name: string, msg: string) => {
  failures++;
  if (failures <= 40) console.log(`FAIL ${name}: ${msg}`);
};
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Items of the results/solutions list panel on the final step. */
function listItems(steps: Step[]): string[] {
  const last = steps[steps.length - 1];
  const panel = last.aux?.find((a) => a.title.startsWith('results') || a.title.startsWith('solutions'));
  return panel ? [...panel.items] : [];
}
function sanity(name: string, steps: Step[]) {
  if (steps.length < 2 || steps.length > 400) bad(name, `step count ${steps.length}`);
  if (!steps[steps.length - 1].result) bad(name, 'final step has no result');
}
function run(name: string, n: number, fn: (i: number) => void) {
  for (let i = 0; i < n; i++) {
    try {
      fn(i);
      totals[name] = (totals[name] ?? 0) + 1;
    } catch (e) {
      bad(name, `threw ${String(e)}`);
    }
  }
}
const fmt = (a: (number | string)[]) => `[${a.join(',')}]`;
const sortStr = (a: string[]) => [...a].sort();

// ---------------------------------------------------------------- backtracking
const powerset = (nums: number[]) => {
  const out: string[] = [];
  for (let m = 0; m < 1 << nums.length; m++) out.push(fmt(nums.filter((_, i) => (m >> i) & 1)));
  return out;
};

run('subsets', 200, () => {
  const nums = distinct(ri(1, 5), -9, 9);
  const steps = subsets.buildSteps({ nums });
  sanity('subsets', steps);
  if (!eq(sortStr(listItems(steps)), sortStr(powerset(nums)))) bad('subsets', JSON.stringify(nums));
});

run('subsetsII', 200, () => {
  const nums = Array.from({ length: ri(1, 5) }, () => ri(-3, 3));
  const steps = subsetsII.buildSteps({ nums });
  sanity('subsetsII', steps);
  const sorted = [...nums].sort((a, b) => a - b);
  const want = [...new Set(powerset(sorted))];
  const got = listItems(steps);
  if (new Set(got).size !== got.length || !eq(sortStr(got), sortStr(want))) bad('subsetsII', JSON.stringify(nums));
});

const perms = (a: number[]): number[][] => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
run('permutations', 200, () => {
  const nums = distinct(ri(1, 4), -9, 9);
  const steps = permutations.buildSteps({ nums });
  sanity('permutations', steps);
  if (!eq(sortStr(listItems(steps)), sortStr(perms(nums).map(fmt)))) bad('permutations', JSON.stringify(nums));
});

run('combinations', 200, () => {
  const n = ri(1, 6);
  const k = ri(1, n);
  const steps = combinations.buildSteps({ n, k });
  sanity('combinations', steps);
  const want: string[] = [];
  for (let m = 0; m < 1 << n; m++) {
    const s = Array.from({ length: n }, (_, i) => i + 1).filter((_, i) => (m >> i) & 1);
    if (s.length === k) want.push(fmt(s));
  }
  if (!eq(sortStr(listItems(steps)), sortStr(want))) bad('combinations', `${n},${k}`);
});

let csSkipped = 0;
run('combinationSum', 200, () => {
  const cands = distinct(ri(1, 5), 1, 12);
  const target = ri(1, 20);
  let input;
  try {
    input = combinationSum.parseInput(`${cands.join(' ')} ; ${target}`);
  } catch {
    csSkipped++;
    return;
  }
  const steps = combinationSum.buildSteps(input);
  sanity('combinationSum', steps);
  const sorted = [...cands].sort((a, b) => a - b);
  const want: string[] = [];
  const rec = (i: number, rem: number, path: number[]) => {
    if (rem === 0) { want.push(fmt(path)); return; }
    for (let j = i; j < sorted.length; j++) if (sorted[j] <= rem) rec(j, rem - sorted[j], [...path, sorted[j]]);
  };
  rec(0, target, []);
  if (!eq(sortStr(listItems(steps)), sortStr(want))) bad('combinationSum', `${cands} ; ${target}`);
});
if (csSkipped > 150) bad('combinationSum', `too many inputs rejected by the 400-step guard: ${csSkipped}/200`);

const KEYS: Record<string, string> = { '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl', '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz' };
run('letterCombinations', 200, () => {
  let digits = Array.from({ length: ri(1, 3) }, () => String(ri(2, 9))).join('');
  if (rnd() < 0.2) digits = Array.from({ length: 4 }, () => String(ri(2, 6))).join('');
  let input;
  try { input = letterCombinations.parseInput(digits); } catch { return; }
  const steps = letterCombinations.buildSteps(input);
  sanity('letterCombinations', steps);
  let want = [''];
  for (const d of digits) want = want.flatMap((p) => [...KEYS[d]].map((ch) => p + ch));
  if (!eq(sortStr(listItems(steps)), sortStr(want))) bad('letterCombinations', digits);
});

run('generateParentheses', 40, () => {
  const n = ri(1, 4);
  const steps = generateParentheses.buildSteps({ n });
  sanity('generateParentheses', steps);
  const want: string[] = [];
  for (let m = 0; m < 1 << (2 * n); m++) {
    let s = '';
    let bal = 0;
    let okk = true;
    for (let i = 0; i < 2 * n; i++) {
      const open = (m >> i) & 1;
      s += open ? '(' : ')';
      bal += open ? 1 : -1;
      if (bal < 0) okk = false;
    }
    if (okk && bal === 0) want.push(s);
  }
  if (!eq(sortStr(listItems(steps)), sortStr(want))) bad('generateParentheses', String(n));
});

run('nQueens', 30, () => {
  const n = ri(1, 6);
  const steps = nQueens.buildSteps({ n });
  sanity('nQueens', steps);
  const want = perms(Array.from({ length: n }, (_, i) => i))
    .filter((p) => p.every((c, r) => p.every((c2, r2) => r === r2 || Math.abs(c - c2) !== Math.abs(r - r2))))
    .map(fmt);
  if (!eq(sortStr(listItems(steps)), sortStr(want))) bad('nQueens', String(n));
});

// Sudoku: reference solver with the same scan order; also verify validity of the final board.
const BASE = ['534678912', '672195348', '198342567', '859761423', '426853791', '713924856', '961537284', '287419635', '345286179'];
function randomSolved(): string[] {
  // relabel digits, shuffle rows within bands and columns within stacks
  const perm = [...'123456789'].sort(() => rnd() - 0.5);
  const order = () => [0, 1, 2].sort(() => rnd() - 0.5);
  const rowOrder = order().flatMap((b) => order().map((r) => b * 3 + r));
  const colOrder = order().flatMap((b) => order().map((c) => b * 3 + c));
  return rowOrder.map((r) => colOrder.map((c) => perm[Number(BASE[r][c]) - 1]).join(''));
}
function refSolve(b: string[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (b[r][c] !== '.') continue;
      for (const d of '123456789') {
        let okk = true;
        for (let i = 0; i < 9 && okk; i++) {
          if (b[r][i] === d || b[i][c] === d || b[3 * Math.floor(r / 3) + Math.floor(i / 3)][3 * Math.floor(c / 3) + (i % 3)] === d) okk = false;
        }
        if (!okk) continue;
        b[r][c] = d;
        if (refSolve(b)) return true;
        b[r][c] = '.';
      }
      return false;
    }
  }
  return true;
}
let sudokuRejected = 0;
run('sudokuSolver', 200, () => {
  const solved = randomSolved();
  const g = solved.map((r) => [...r]);
  const k = ri(1, 20);
  const cells = new Set<number>();
  while (cells.size < k) cells.add(ri(0, 80));
  for (const x of cells) g[Math.floor(x / 9)][x % 9] = rnd() < 0.1 ? '0' : '.';
  const rows = g.map((r) => r.join(''));
  let input;
  try { input = sudokuSolver.parseInput(rows.join(' ')); } catch { sudokuRejected++; return; }
  const steps = sudokuSolver.buildSteps(input);
  sanity('sudokuSolver', steps);
  const last = steps[steps.length - 1];
  const got = last.result!.text.split(' ');
  const ref = input.board.map((r) => [...r]);
  if (!refSolve(ref)) { bad('sudokuSolver', 'reference could not solve ' + rows.join(' ')); return; }
  if (last.result!.title !== 'Solved' || !eq(got, ref.map((r) => r.join('')))) bad('sudokuSolver', rows.join(' '));
  // validity of the produced board
  const full = got.map((r) => [...r]);
  for (let i = 0; i < 9; i++) {
    const row = new Set(full[i]);
    const col = new Set(full.map((r) => r[i]));
    const box = new Set(Array.from({ length: 9 }, (_, j) => full[3 * Math.floor(i / 3) + Math.floor(j / 3)][3 * (i % 3) + (j % 3)]));
    if (row.size !== 9 || col.size !== 9 || box.size !== 9 || row.has('.')) bad('sudokuSolver', 'invalid final board ' + rows.join(' '));
  }
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (input.board[r][c] !== '.' && got[r][c] !== input.board[r][c]) bad('sudokuSolver', 'givens changed');
});
if (sudokuRejected > 100) bad('sudokuSolver', `too many boards rejected by the step guard: ${sudokuRejected}/200`);

// ---------------------------------------------------------------- dynamic programming
const finalTitle = (steps: Step[]) => steps[steps.length - 1].result!.title;
const finalText = (steps: Step[]) => steps[steps.length - 1].result!.text;

run('fibonacciNumber', 100, () => {
  const n = ri(0, 15);
  const steps = fibonacciNumber.buildSteps({ n });
  sanity('fibonacciNumber', steps);
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  if (finalTitle(steps) !== String(a)) bad('fibonacciNumber', `${n}: got ${finalTitle(steps)} want ${a}`);
});

run('minCostClimbingStairs', 200, () => {
  const cost = Array.from({ length: ri(2, 12) }, () => ri(0, 30));
  const steps = minCostClimbingStairs.buildSteps({ cost });
  sanity('minCostClimbingStairs', steps);
  // brute force: recursion over paths
  const n = cost.length;
  const f = (i: number): number => (i >= n ? 0 : cost[i] + Math.min(f(i + 1), f(i + 2)));
  const want = Math.min(f(0), f(1));
  if (finalTitle(steps) !== String(want)) bad('minCostClimbingStairs', `${cost}: got ${finalTitle(steps)} want ${want}`);
});

run('uniquePaths', 100, () => {
  const m = ri(1, 7);
  const n = ri(1, 9);
  const steps = uniquePaths.buildSteps({ m, n });
  sanity('uniquePaths', steps);
  const f = (r: number, c: number): number => (r === m - 1 || c === n - 1 ? 1 : f(r + 1, c) + f(r, c + 1));
  const want = f(0, 0);
  if (finalTitle(steps) !== String(want)) bad('uniquePaths', `${m}x${n}: got ${finalTitle(steps)} want ${want}`);
});

run('uniquePathsII', 200, () => {
  const m = ri(1, 6);
  const n = ri(1, 8);
  const grid = Array.from({ length: m }, () => Array.from({ length: n }, () => (rnd() < 0.25 ? '1' : '0')).join(''));
  const steps = uniquePathsII.buildSteps({ grid });
  sanity('uniquePathsII', steps);
  const memo = new Map<string, number>();
  const f = (r: number, c: number): number => {
    if (r >= m || c >= n || grid[r][c] === '1') return 0;
    if (r === m - 1 && c === n - 1) return 1;
    const k = `${r},${c}`;
    if (!memo.has(k)) memo.set(k, f(r + 1, c) + f(r, c + 1));
    return memo.get(k)!;
  };
  const want = f(0, 0);
  if (finalTitle(steps) !== String(want)) bad('uniquePathsII', `${grid}: got ${finalTitle(steps)} want ${want}`);
});

run('triangle', 200, () => {
  const rows = ri(1, 6);
  const tri = Array.from({ length: rows }, (_, r) => Array.from({ length: r + 1 }, () => ri(-9, 9)));
  const steps = triangle.buildSteps({ tri });
  sanity('triangle', steps);
  const f = (r: number, c: number): number => (r === rows - 1 ? tri[r][c] : tri[r][c] + Math.min(f(r + 1, c), f(r + 1, c + 1)));
  const want = f(0, 0);
  if (finalTitle(steps) !== String(want)) bad('triangle', `${JSON.stringify(tri)}: got ${finalTitle(steps)} want ${want}`);
});

run('houseRobber', 200, () => {
  const nums = Array.from({ length: ri(1, 12) }, () => ri(0, 20));
  const steps = houseRobber.buildSteps({ nums });
  sanity('houseRobber', steps);
  let want = 0;
  for (let m = 0; m < 1 << nums.length; m++) {
    if (m & (m >> 1)) continue;
    want = Math.max(want, nums.reduce((s, v, i) => s + (((m >> i) & 1) ? v : 0), 0));
  }
  if (finalTitle(steps) !== String(want)) bad('houseRobber', `${nums}: got ${finalTitle(steps)} want ${want}`);
});

run('houseRobberII', 200, () => {
  const nums = Array.from({ length: ri(1, 10) }, () => ri(0, 20));
  const steps = houseRobberII.buildSteps({ nums });
  sanity('houseRobberII', steps);
  const n = nums.length;
  let want = 0;
  for (let m = 0; m < 1 << n; m++) {
    let clash = false;
    for (let i = 0; i < n; i++) if (n > 1 && ((m >> i) & 1) && ((m >> ((i + 1) % n)) & 1)) clash = true;
    if (clash) continue;
    want = Math.max(want, nums.reduce((s, v, i) => s + (((m >> i) & 1) ? v : 0), 0));
  }
  if (finalTitle(steps) !== String(want)) bad('houseRobberII', `${nums}: got ${finalTitle(steps)} want ${want}`);
});

run('maxProductSubarray', 300, () => {
  const nums = Array.from({ length: ri(1, 10) }, () => ri(-4, 4));
  const steps = maxProductSubarray.buildSteps({ nums });
  sanity('maxProductSubarray', steps);
  let want = -Infinity;
  for (let i = 0; i < nums.length; i++) {
    let p = 1;
    for (let j = i; j < nums.length; j++) { p *= nums[j]; want = Math.max(want, p); }
  }
  if (finalTitle(steps) !== String(want)) bad('maxProductSubarray', `${nums}: got ${finalTitle(steps)} want ${want}`);
});

run('longestIncreasingSubsequence', 300, () => {
  const nums = Array.from({ length: ri(1, 10) }, () => ri(-9, 20));
  const steps = longestIncreasingSubsequence.buildSteps({ nums });
  sanity('longestIncreasingSubsequence', steps);
  const dp = nums.map(() => 1);
  for (let i = 0; i < nums.length; i++) for (let j = 0; j < i; j++) if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
  const want = Math.max(...dp);
  if (finalTitle(steps) !== String(want)) bad('longestIncreasingSubsequence', `${nums}: got ${finalTitle(steps)} want ${want}`);
});

run('decodeWays', 300, () => {
  const len = ri(1, 10);
  const s = Array.from({ length: len }, () => (rnd() < 0.2 ? '0' : String(ri(1, 9)))).join('');
  const steps = decodeWays.buildSteps({ s });
  sanity('decodeWays', steps);
  const f = (i: number): number => {
    if (i === s.length) return 1;
    if (s[i] === '0') return 0;
    let t = f(i + 1);
    if (i + 1 < s.length && Number(s.slice(i, i + 2)) <= 26) t += f(i + 2);
    return t;
  };
  const want = f(0);
  if (finalTitle(steps) !== String(want)) bad('decodeWays', `${s}: got ${finalTitle(steps)} want ${want}`);
});

run('coinChange', 300, () => {
  const coins = distinct(ri(1, 4), 1, 9);
  const amount = ri(0, 14);
  const steps = coinChange.buildSteps({ coins, amount });
  sanity('coinChange', steps);
  // BFS reference
  let want = -1;
  if (amount === 0) want = 0;
  else {
    const seen = new Set<number>([0]);
    let frontier = [0];
    for (let d = 1; frontier.length && want < 0; d++) {
      const nxt: number[] = [];
      for (const v of frontier) for (const c of coins) {
        const w = v + c;
        if (w === amount) { want = d; }
        if (w < amount && !seen.has(w)) { seen.add(w); nxt.push(w); }
      }
      frontier = nxt;
    }
  }
  if (finalTitle(steps) !== String(want)) bad('coinChange', `${coins} / ${amount}: got ${finalTitle(steps)} want ${want}`);
});

const letters = (n: number, alpha: string) => Array.from({ length: n }, () => alpha[ri(0, alpha.length - 1)]).join('');

run('longestCommonSubsequence', 300, () => {
  const a = letters(ri(1, 7), 'abc');
  const b = letters(ri(1, 8), 'abc');
  const steps = longestCommonSubsequence.buildSteps({ a, b });
  sanity('longestCommonSubsequence', steps);
  const f = (i: number, j: number): number => (i === a.length || j === b.length ? 0 : a[i] === b[j] ? 1 + f(i + 1, j + 1) : Math.max(f(i + 1, j), f(i, j + 1)));
  const want = f(0, 0);
  if (finalTitle(steps) !== String(want)) bad('longestCommonSubsequence', `${a}/${b}: got ${finalTitle(steps)} want ${want}`);
  // the reported subsequence must really be a common subsequence of that length
  const sub = finalText(steps).match(/"([a-z]*)"/)?.[1] ?? '';
  const isSub = (s: string, t: string) => { let k = 0; for (const ch of t) if (k < s.length && ch === s[k]) k++; return k === s.length; };
  if (sub.length !== want || !isSub(sub, a) || !isSub(sub, b)) bad('longestCommonSubsequence', `${a}/${b}: bad subsequence "${sub}"`);
});

run('editDistance', 300, () => {
  const a = letters(ri(0, 7), 'abc');
  const b = letters(ri(0, 8), 'abc');
  const steps = editDistance.buildSteps({ a, b });
  sanity('editDistance', steps);
  const memo = new Map<string, number>();
  const f = (i: number, j: number): number => {
    if (i === a.length) return b.length - j;
    if (j === b.length) return a.length - i;
    const k = `${i},${j}`;
    if (!memo.has(k)) memo.set(k, a[i] === b[j] ? f(i + 1, j + 1) : 1 + Math.min(f(i + 1, j), f(i, j + 1), f(i + 1, j + 1)));
    return memo.get(k)!;
  };
  const want = f(0, 0);
  if (finalTitle(steps) !== String(want)) bad('editDistance', `${a}/${b}: got ${finalTitle(steps)} want ${want}`);
});

run('longestCommonSubstring', 300, () => {
  const a = letters(ri(1, 7), 'abc');
  const b = letters(ri(1, 8), 'abc');
  const steps = longestCommonSubstring.buildSteps({ a, b });
  sanity('longestCommonSubstring', steps);
  let want = 0;
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    let k = 0;
    while (i + k < a.length && j + k < b.length && a[i + k] === b[j + k]) k++;
    want = Math.max(want, k);
  }
  if (finalTitle(steps) !== String(want)) bad('longestCommonSubstring', `${a}/${b}: got ${finalTitle(steps)} want ${want}`);
  const sub = finalText(steps).match(/"([a-z]*)"/)?.[1] ?? '';
  if (sub.length !== want || (want > 0 && (!a.includes(sub) || !b.includes(sub)))) bad('longestCommonSubstring', `${a}/${b}: bad substring "${sub}"`);
});

run('wordBreak', 300, () => {
  const s = letters(ri(1, 10), 'ab');
  const words = [...new Set(Array.from({ length: ri(1, 4) }, () => letters(ri(1, 3), 'ab')))];
  const steps = wordBreak.buildSteps({ s, words });
  sanity('wordBreak', steps);
  const memo = new Map<number, boolean>();
  const f = (i: number): boolean => {
    if (i === s.length) return true;
    if (!memo.has(i)) memo.set(i, words.some((w) => s.startsWith(w, i) && f(i + w.length)));
    return memo.get(i)!;
  };
  const want = f(0);
  if (finalTitle(steps) !== String(want)) bad('wordBreak', `${s} / ${words}: got ${finalTitle(steps)} want ${want}`);
});

run('partitionEqualSubsetSum', 300, () => {
  const nums = Array.from({ length: ri(1, 5) }, () => ri(1, 6));
  let input;
  try { input = partitionEqualSubsetSum.parseInput(nums.join(' ')); } catch { return; }
  const steps = partitionEqualSubsetSum.buildSteps(input);
  sanity('partitionEqualSubsetSum', steps);
  const total = nums.reduce((a, b) => a + b, 0);
  let want = false;
  for (let m = 0; m < 1 << nums.length; m++) if (nums.reduce((s, v, i) => s + (((m >> i) & 1) ? v : 0), 0) * 2 === total) want = true;
  if (finalTitle(steps) !== String(want)) bad('partitionEqualSubsetSum', `${nums}: got ${finalTitle(steps)} want ${want}`);
});

console.log('rejected by input guards: combinationSum', csSkipped, 'sudoku', sudokuRejected);
console.log('inputs checked per problem:', JSON.stringify(totals));
console.log(failures ? `\n${failures} FUZZ FAILURE(S)` : '\nFUZZ OK');
process.exit(failures ? 1 : 0);
