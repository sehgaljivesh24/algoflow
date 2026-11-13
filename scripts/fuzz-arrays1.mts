/**
 * Correctness fuzz for the arrays-1 group. Run:  node scripts/fuzz-arrays1.mts
 * For every problem: random valid inputs -> buildSteps -> compare the final `result` text with a plain reference.
 * Also checks that every example's declared output equals the animation's result.
 */
import { concatenationOfArray } from '../src/problems/concatenationOfArray.ts';
import { runningSum } from '../src/problems/runningSum.ts';
import { richestCustomerWealth } from '../src/problems/richestCustomerWealth.ts';
import { shuffleTheArray } from '../src/problems/shuffleTheArray.ts';
import { flippingAnImage } from '../src/problems/flippingAnImage.ts';
import { findClosestNumberToZero } from '../src/problems/findClosestNumberToZero.ts';
import { mergeSortedArray } from '../src/problems/mergeSortedArray.ts';
import { squaresOfASortedArray } from '../src/problems/squaresOfASortedArray.ts';
import { threeSum } from '../src/problems/threeSum.ts';
import { trappingRainWater } from '../src/problems/trappingRainWater.ts';
import { twoSumII } from '../src/problems/twoSumII.ts';
import { nextPermutation } from '../src/problems/nextPermutation.ts';
import { bestTimeToBuyAndSellStock } from '../src/problems/bestTimeToBuyAndSellStock.ts';
import { maxConsecutiveOnesIII } from '../src/problems/maxConsecutiveOnesIII.ts';
import { rotateArray } from '../src/problems/rotateArray.ts';
import { sortColors } from '../src/problems/sortColors.ts';

// small deterministic PRNG so failures are reproducible
let seed = 12345;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const arr = (len: number, lo: number, hi: number) => Array.from({ length: len }, () => int(lo, hi));
const fmt = (a: number[]) => `[${a.join(',')}]`;
const strip = (s: string) => s.split(' ').join('');
const fmt2 =(a: number[][]) => `[${a.map(fmt).join(',')}]`;

let failures = 0;
const N = 200;

function run<I>(name: string, p: { buildSteps: (i: I) => any[]; varLabels: string[]; java: string[]; python: string[]; algorithm: string[]; examples: { label: string; input: I; output: string }[] }, gen: () => I, ref: (i: I) => string) {
  let bad = 0;
  const check = (input: I, expected: string, tag: string) => {
    let steps: any[];
    try {
      steps = p.buildSteps(input);
    } catch (e) {
      bad++;
      if (bad <= 3) console.log(`  ${name} ${tag}: threw ${e} for ${JSON.stringify(input)}`);
      return;
    }
    const got = strip(steps[steps.length - 1]?.result?.title ?? '');
    if (got !== strip(expected)) {
      bad++;
      if (bad <= 3) console.log(`  ${name} ${tag}: input ${JSON.stringify(input)} expected ${expected} got ${got}`);
    }
    // structural sanity on random inputs too (the real check only sees the examples)
    steps.forEach((s, si) => {
      const sc = s.scene ?? { kind: 'array', cells: s.cells, pointers: s.pointers ?? [] };
      const problems: string[] = [];
      for (const part of sc.kind === 'split' ? sc.parts : [sc]) {
        const list = part.kind === 'grid' ? part.rows.flat() : part.cells;
        if (new Set(list.map((c: any) => c.key)).size !== list.length) problems.push('duplicate cell keys');
        if (part.kind !== 'grid' && (part.pointers ?? []).some((q: any) => q.index < 0 || q.index >= list.length)) problems.push('pointer out of range');
      }
      if (p.varLabels.some((k: string) => !(k in s.vars))) problems.push('vars missing');
      if (s.javaLines.some((l: number) => l < 0 || l >= p.java.length) || s.pyLines.some((l: number) => l < 0 || l >= p.python.length)) problems.push('code line out of range');
      if (s.algoStep < 0 || s.algoStep >= p.algorithm.length) problems.push('algoStep out of range');
      if (problems.length) {
        bad++;
        if (bad <= 3) console.log(`  ${name} ${tag} step ${si}: ${problems.join(', ')} for ${JSON.stringify(input)}`);
      }
    });
    if (steps.length > 400) {
      bad++;
      if (bad <= 3) console.log(`  ${name} ${tag}: ${steps.length} steps (too many)`);
    }
  };
  for (const ex of p.examples) {
    check(ex.input, ex.output, 'example');
    if (strip(ref(ex.input)) !== strip(ex.output)) {
      bad++;
      console.log(`  ${name} example "${ex.label}" declared output ${ex.output} but reference says ${ref(ex.input)}`);
    }
  }
  for (let t = 0; t < N; t++) {
    const input = gen();
    check(input, ref(input), `#${t}`);
  }
  console.log(`${bad ? 'FAIL' : 'ok  '} ${name}`);
  if (bad) failures++;
}

run('1929 concatenation', concatenationOfArray, () => ({ nums: arr(int(1, 8), 1, 20) }), ({ nums }) => fmt([...nums, ...nums]));

run('1480 running sum', runningSum, () => ({ nums: arr(int(1, 12), -20, 20) }), ({ nums }) => {
  let s = 0;
  return fmt(nums.map((x) => (s += x)));
});

run('1672 richest', richestCustomerWealth, () => {
  const R = int(1, 6);
  const C = int(1, 8);
  return { accounts: Array.from({ length: R }, () => arr(C, 0, 20)) };
}, ({ accounts }) => String(Math.max(...accounts.map((r) => r.reduce((a, b) => a + b, 0)))));

run('1470 shuffle', shuffleTheArray, () => {
  const n = int(1, 6);
  return { nums: arr(2 * n, 1, 30), n };
}, ({ nums, n }) => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(nums[i], nums[i + n]);
  return fmt(out);
});

run('832 flipping', flippingAnImage, () => {
  const n = int(1, 6);
  return { image: Array.from({ length: n }, () => arr(n, 0, 1)) };
}, ({ image }) => fmt2(image.map((r) => [...r].reverse().map((x) => 1 - x))));

run('2239 closest to zero', findClosestNumberToZero, () => ({ nums: arr(int(1, 12), -6, 6) }), ({ nums }) => {
  let best = nums[0];
  for (const x of nums) if (Math.abs(x) < Math.abs(best) || (Math.abs(x) === Math.abs(best) && x > best)) best = x;
  return String(best);
});

run('88 merge sorted', mergeSortedArray, () => {
  const total = int(1, 10);
  const m = int(0, total);
  const sorted = (len: number) => arr(len, -8, 8).sort((a, b) => a - b);
  return { nums1: sorted(m), nums2: sorted(total - m) };
}, ({ nums1, nums2 }) => fmt([...nums1, ...nums2].sort((a, b) => a - b)));

run('977 squares', squaresOfASortedArray, () => ({ nums: arr(int(1, 12), -10, 10).sort((a, b) => a - b) }), ({ nums }) => fmt(nums.map((x) => x * x).sort((a, b) => a - b)));

// 3Sum returns triplets in discovery order, so compare as a set: wrap the real runner in a normaliser.
{
  const orig = threeSum.buildSteps;
  const norm = (title: string) =>
    (JSON.parse(title) as number[][]).map((t) => t.join(',')).sort().join('|');
  let bad = 0;
  for (const ex of threeSum.examples) {
    const st = orig(ex.input);
    if (norm(st[st.length - 1].result!.title) !== norm(ex.output)) {
      bad++;
      console.log('  3sum example mismatch ' + ex.label);
    }
  }
  for (let t = 0; t < N + 50; t++) {
    const nums = arr(int(3, 12), t % 3 === 0 ? -2 : -6, t % 3 === 0 ? 2 : 6);
    const steps = orig({ nums });
    for (const s of steps) {
      const cs = s.cells!;
      const sane =
        new Set(cs.map((c) => c.key)).size === cs.length &&
        (s.pointers ?? []).every((q) => q.index >= 0 && q.index < cs.length) &&
        threeSum.varLabels.every((k) => k in s.vars) &&
        s.javaLines.every((l) => l >= 0 && l < threeSum.java.length) &&
        s.pyLines.every((l) => l >= 0 && l < threeSum.python.length) &&
        s.algoStep < threeSum.algorithm.length;
      if (!sane) {
        bad++;
        if (bad <= 3) console.log(`  3sum structural problem for ${JSON.stringify(nums)}`);
        break;
      }
    }
    const got = norm(steps[steps.length - 1].result!.title);
    const set = new Set<string>();
    for (let i = 0; i < nums.length; i++)
      for (let j = i + 1; j < nums.length; j++)
        for (let k = j + 1; k < nums.length; k++)
          if (nums[i] + nums[j] + nums[k] === 0) set.add([nums[i], nums[j], nums[k]].sort((a, b) => a - b).join(','));
    const exp = [...set].sort().join('|');
    // also each reported triplet must be unique
    const reported = (JSON.parse(steps[steps.length - 1].result!.title) as number[][]).length;
    if (got !== exp || reported !== set.size) {
      bad++;
      if (bad <= 3) console.log(`  3sum normalised: ${JSON.stringify(nums)} expected ${exp} got ${got}`);
    }
  }
  console.log(`${bad ? 'FAIL' : 'ok  '} 15 3sum (set comparison, ${bad} bad)`);
  if (bad) failures++;
}

run('42 trapping rain', trappingRainWater, () => ({ height: arr(int(1, 12), 0, 9) }), ({ height }) => {
  let total = 0;
  for (let i = 0; i < height.length; i++) {
    const lm = Math.max(...height.slice(0, i + 1));
    const rm = Math.max(...height.slice(i));
    total += Math.min(lm, rm) - height[i];
  }
  return String(total);
});

run('167 two sum II', twoSumII, () => {
  for (;;) {
    const numbers = arr(int(2, 12), -10, 15).sort((a, b) => a - b);
    const i = int(0, numbers.length - 2);
    const j = int(i + 1, numbers.length - 1);
    const target = numbers[i] + numbers[j];
    let pairs = 0;
    for (let a = 0; a < numbers.length; a++) for (let b = a + 1; b < numbers.length; b++) if (numbers[a] + numbers[b] === target) pairs++;
    if (pairs === 1) return { numbers, target };
  }
}, ({ numbers, target }) => {
  for (let a = 0; a < numbers.length; a++) for (let b = a + 1; b < numbers.length; b++) if (numbers[a] + numbers[b] === target) return `[${a + 1}, ${b + 1}]`;
  return 'none';
});
// parseInput must reject inputs with 0 or 2+ pairs
for (const bad of ['1 2 3 ; 100', '1 2 3 4 ; 5', '3 2 1 ; 3']) {
  let threw = false;
  try { twoSumII.parseInput(bad); } catch { threw = true; }
  if (!threw) { console.log(`FAIL 167 parseInput accepted "${bad}"`); failures++; }
}

run('31 next permutation', nextPermutation, () => ({ nums: arr(int(1, 8), 0, 4) }), ({ nums }) => {
  // reference: enumerate all permutations in lexicographic order, take the successor (wrap to smallest)
  const key = (a: number[]) => a.join(',');
  const perms = new Set<string>();
  const rec = (cur: number[], rest: number[]) => {
    if (!rest.length) return void perms.add(key(cur));
    rest.forEach((x, i) => rec([...cur, x], [...rest.slice(0, i), ...rest.slice(i + 1)]));
  };
  rec([], nums);
  const all = [...perms].map((s) => s.split(',').map(Number)).sort((a, b) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  });
  const idx = all.findIndex((p) => key(p) === key(nums));
  return fmt(all[(idx + 1) % all.length]);
});

run('121 best time to buy/sell', bestTimeToBuyAndSellStock, () => ({ prices: arr(int(1, 12), 0, 15) }), ({ prices }) => {
  let best = 0;
  for (let i = 0; i < prices.length; i++) for (let j = i + 1; j < prices.length; j++) best = Math.max(best, prices[j] - prices[i]);
  return String(best);
});

run('1004 max consecutive ones III', maxConsecutiveOnesIII, () => {
  const n = int(1, 14);
  return { nums: arr(n, 0, 1), k: int(0, n) };
}, ({ nums, k }) => {
  let best = 0;
  for (let i = 0; i < nums.length; i++) {
    let z = 0;
    for (let j = i; j < nums.length; j++) {
      if (nums[j] === 0) z++;
      if (z <= k) best = Math.max(best, j - i + 1);
    }
  }
  return String(best);
});

run('189 rotate array', rotateArray, () => {
  const n = int(1, 12);
  return { nums: arr(n, -9, 9), k: int(0, 30) };
}, ({ nums, k }) => {
  const n = nums.length;
  return fmt(nums.map((_, i) => nums[(((i - k) % n) + n) % n]));
});

run('75 sort colors', sortColors, () => ({ nums: arr(int(1, 12), 0, 2) }), ({ nums }) => fmt([...nums].sort((a, b) => a - b)));

console.log(failures ? `\n${failures} problem(s) FAILED` : '\nALL ARRAYS-1 FUZZ CHECKS PASSED');
process.exit(failures ? 1 : 0);
