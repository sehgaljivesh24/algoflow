/**
 * Correctness fuzz for pack p1 (windows / pointers / hashing / array techniques). Run:  node scripts/fuzz-pack1.mts
 * For every new problem: random valid inputs -> buildSteps -> compare the final `result` title with a plain reference.
 * Also checks that every example's declared output equals the animation's result.
 */
import { longestSubarrayAbsDiffLimit } from '../src/problems/longestSubarrayAbsDiffLimit.ts';
import { jumpGameVI } from '../src/problems/jumpGameVI.ts';
import { shortestSubarraySumAtLeastK } from '../src/problems/shortestSubarraySumAtLeastK.ts';
import { majorityElementII } from '../src/problems/majorityElementII.ts';
import { majorityWithVerification } from '../src/problems/majorityWithVerification.ts';
import { cyclicSort } from '../src/problems/cyclicSort.ts';
import { findAllDuplicates } from '../src/problems/findAllDuplicates.ts';
import { threeSumClosest } from '../src/problems/threeSumClosest.ts';
import { validTriangleNumber } from '../src/problems/validTriangleNumber.ts';

let seed = 20240611;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const arr = (len: number, lo: number, hi: number) => Array.from({ length: len }, () => int(lo, hi));
const fmt = (a: number[]) => `[${a.join(',')}]`;
const strip = (s: string) => s.split(' ').join('');
const shuffle = <T,>(a: T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = int(0, i);
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

let failures = 0;
const N = 250;

function run<I>(
  name: string,
  p: { buildSteps: (i: I) => any[]; parseInput: (raw: string) => I; examples: { label: string; input: I; output: string }[] },
  gen: () => I,
  ref: (i: I) => string,
  raw?: (i: I) => string,
  norm?: (i: I, got: string) => string,
) {
  let bad = 0;
  let maxSteps = 0;
  const check = (input: I, expected: string, tag: string, useNorm = true) => {
    let steps: any[];
    try {
      steps = p.buildSteps(input);
    } catch (e) {
      bad++;
      if (bad <= 3) console.log(`  ${name} ${tag}: threw ${e} for ${JSON.stringify(input)}`);
      return;
    }
    maxSteps = Math.max(maxSteps, steps.length);
    const got0 = strip(steps[steps.length - 1]?.result?.title ?? '');
    const got = norm && useNorm ? norm(input, got0) : got0;
    if (got !== strip(expected)) {
      bad++;
      if (bad <= 3) console.log(`  ${name} ${tag}: input ${JSON.stringify(input)} expected ${expected} got ${got}`);
    }
    if (steps.length > 400) {
      bad++;
      if (bad <= 3) console.log(`  ${name} ${tag}: ${steps.length} steps`);
    }
    if (raw) {
      try {
        const back = p.parseInput(raw(input));
        if (JSON.stringify(back) !== JSON.stringify(input)) {
          bad++;
          if (bad <= 3) console.log(`  ${name} ${tag}: parseInput round trip differs for ${raw(input)}`);
        }
      } catch (e) {
        bad++;
        if (bad <= 3) console.log(`  ${name} ${tag}: parseInput rejected "${raw(input)}": ${e}`);
      }
    }
  };
  for (const ex of p.examples) check(ex.input, ex.output, `[example ${ex.label}]`, false);
  for (let t = 0; t < N; t++) {
    const input = gen();
    check(input, ref(input), `#${t}`);
  }
  console.log(`${bad ? 'FAIL' : 'ok  '} ${name} (max ${maxSteps} steps)`);
  if (bad) failures++;
}

// ---- 1438
run('1438 longest subarray abs diff <= limit', longestSubarrayAbsDiffLimit, () => ({ nums: arr(int(1, 12), 0, 30), limit: int(0, 30) }), ({ nums, limit }) => {
  let best = 0;
  for (let i = 0; i < nums.length; i++) {
    let mx = -Infinity;
    let mn = Infinity;
    for (let j = i; j < nums.length; j++) {
      mx = Math.max(mx, nums[j]);
      mn = Math.min(mn, nums[j]);
      if (mx - mn <= limit) best = Math.max(best, j - i + 1);
    }
  }
  return String(best);
}, ({ nums, limit }) => `${nums.join(' ')} | ${limit}`);

// ---- 1696
run('1696 jump game VI', jumpGameVI, () => {
  const n = int(1, 12);
  return { nums: arr(n, -20, 20), k: int(1, n) };
}, ({ nums, k }) => {
  const n = nums.length;
  const dp = Array(n).fill(-Infinity);
  dp[0] = nums[0];
  for (let i = 1; i < n; i++) {
    for (let j = Math.max(0, i - k); j < i; j++) dp[i] = Math.max(dp[i], dp[j] + nums[i]);
  }
  return String(dp[n - 1]);
}, ({ nums, k }) => `${nums.join(' ')} | ${k}`);

// ---- 862
run('862 shortest subarray sum >= K', shortestSubarraySumAtLeastK, () => ({ nums: arr(int(1, 12), -20, 20), k: int(1, 60) }), ({ nums, k }) => {
  let best = Infinity;
  for (let i = 0; i < nums.length; i++) {
    let s = 0;
    for (let j = i; j < nums.length; j++) {
      s += nums[j];
      if (s >= k) best = Math.min(best, j - i + 1);
    }
  }
  return String(best === Infinity ? -1 : best);
}, ({ nums, k }) => `${nums.join(' ')} | ${k}`);

// ---- 229
run('229 majority element II', majorityElementII, () => {
  const style = int(0, 2);
  if (style === 0) return { nums: arr(int(1, 12), -3, 3) };
  const n = int(3, 12);
  const a = int(-5, 5);
  const b = int(-5, 5);
  return { nums: shuffle(Array.from({ length: n }, (_, i) => (i < n / 3 + 1 ? a : i < n * 0.7 ? b : int(-5, 5)))) };
}, ({ nums }) => {
  const c = new Map<number, number>();
  for (const x of nums) c.set(x, (c.get(x) ?? 0) + 1);
  return fmt([...c.entries()].filter(([, v]) => v > Math.floor(nums.length / 3)).map(([k]) => k).sort((x, y) => x - y));
}, ({ nums }) => nums.join(' '));

// ---- CP majority with verification
run('CP majority element with verification', majorityWithVerification, () => ({ nums: arr(int(1, 12), 1, int(1, 4)) }), ({ nums }) => {
  const c = new Map<number, number>();
  for (const x of nums) c.set(x, (c.get(x) ?? 0) + 1);
  for (const [k, v] of c) if (v > nums.length / 2) return String(k);
  return '-1';
}, ({ nums }) => nums.join(' '));

// ---- CP cyclic sort
run('CP cyclic sort', cyclicSort, () => ({ nums: shuffle(Array.from({ length: int(1, 12) }, (_, i) => i + 1)) }), ({ nums }) => fmt([...nums].sort((a, b) => a - b)), ({ nums }) => nums.join(' '));

// ---- 442
run('442 find all duplicates', findAllDuplicates, () => {
  const n = int(1, 12);
  const nums: number[] = [];
  const cnt = new Map<number, number>();
  while (nums.length < n) {
    const v = int(1, n);
    if ((cnt.get(v) ?? 0) < 2) {
      cnt.set(v, (cnt.get(v) ?? 0) + 1);
      nums.push(v);
    }
  }
  return { nums };
}, ({ nums }) => {
  const c = new Map<number, number>();
  for (const x of nums) c.set(x, (c.get(x) ?? 0) + 1);
  return fmt([...c.entries()].filter(([, v]) => v === 2).map(([k]) => k).sort((x, y) => x - y));
}, ({ nums }) => nums.join(' '));

// ---- 16
run('16 3Sum closest', threeSumClosest, () => ({ nums: arr(int(3, 12), -15, 15), target: int(-30, 30) }), ({ nums, target }) => {
  let best = Infinity;
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      for (let k = j + 1; k < nums.length; k++) {
        const s = nums[i] + nums[j] + nums[k];
        if (Math.abs(s - target) < best) {
          best = Math.abs(s - target);
        }
      }
  return String(best);
}, ({ nums, target }) => `${nums.join(' ')} | ${target}`, ({ target }, got) => String(Math.abs(Number(got) - target)));

// ---- 611
run('611 valid triangle number', validTriangleNumber, () => ({ nums: arr(int(1, 12), 0, 15) }), ({ nums }) => {
  let c = 0;
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      for (let k = j + 1; k < nums.length; k++) {
        const [a, b, d] = [nums[i], nums[j], nums[k]].sort((x, y) => x - y);
        if (a + b > d) c++;
      }
  return String(c);
}, ({ nums }) => nums.join(' '));

console.log(failures ? `\n${failures} problem(s) FAILED` : '\nALL PACK-1 FUZZ CHECKS PASSED');
process.exit(failures ? 1 : 0);
