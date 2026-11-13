/**
 * Fuzz test for the binary-search / sorting / bit-manipulation animations.
 * Run: node scripts/fuzz-searchsortbits.mts
 * For every problem: ~200 random valid inputs -> buildSteps -> final result compared with a plain reference,
 * plus structural checks on every step and a parseInput(raw(input)) round trip.
 */
import { checkScene } from './check-scenes.mts';
import { searchsortbits } from '../src/problems/groups/searchsortbits.ts';

let seed = 12345;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = <T,>(a: T[]): T => a[ri(0, a.length - 1)];
const sortedAsc = (a: number[]) => [...a].sort((x, y) => x - y);
const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = ri(0, i);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};
const distinct = (n: number, lo: number, hi: number) => shuffle(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)).slice(0, n);
const rotate = (a: number[], k: number) => [...a.slice(k), ...a.slice(0, k)];

interface Case {
  slug: string;
  gen: () => any;
  /** expected final result.title, or a predicate over (input, title) */
  ref?: (inp: any) => string;
  ok?: (inp: any, title: string) => boolean;
  raw?: (inp: any) => string;
  runs?: number;
}

const list = (a: number[]) => a.join(' ');
const cases: Case[] = [];
const add = (c: Case) => cases.push(c);

// ---------------------------------------------------------------- binary search
add({
  slug: '35-search-insert-position',
  gen: () => {
    const nums = sortedAsc(distinct(ri(1, 14), -30, 30));
    return { nums, target: ri(-32, 32) };
  },
  ref: ({ nums, target }) => String(nums.filter((v: number) => v < target).length),
  raw: ({ nums, target }) => `${list(nums)} ; ${target}`,
});
add({
  slug: '268-missing-number',
  gen: () => {
    const n = ri(1, 12);
    const all = Array.from({ length: n + 1 }, (_, i) => i);
    const miss = ri(0, n);
    return { nums: shuffle(all.filter((v) => v !== miss)) };
  },
  ref: ({ nums }) => {
    const n = nums.length;
    return String((n * (n + 1)) / 2 - nums.reduce((a: number, b: number) => a + b, 0));
  },
  raw: ({ nums }) => list(nums),
});
add({
  slug: '34-find-first-and-last-position',
  gen: () => {
    const nums = sortedAsc(Array.from({ length: ri(1, 16) }, () => ri(-6, 6)));
    return { nums, target: ri(-7, 7) };
  },
  ref: ({ nums, target }) => {
    const f = nums.indexOf(target);
    return f < 0 ? '[-1, -1]' : `[${f}, ${nums.lastIndexOf(target)}]`;
  },
  raw: ({ nums, target }) => `${list(nums)} ; ${target}`,
});
add({
  slug: '162-find-peak-element',
  gen: () => {
    for (;;) {
      const nums = Array.from({ length: ri(1, 12) }, () => ri(0, 99));
      if (nums.every((v, i) => i === 0 || v !== nums[i - 1])) return { nums };
    }
  },
  ok: ({ nums }, t) => {
    const i = Number(t);
    return Number.isInteger(i) && i >= 0 && i < nums.length && (i === 0 || nums[i] > nums[i - 1]) && (i === nums.length - 1 || nums[i] > nums[i + 1]);
  },
  raw: ({ nums }) => list(nums),
});
add({
  slug: '153-find-minimum-in-rotated-sorted-array',
  gen: () => {
    const base = sortedAsc(distinct(ri(1, 14), -50, 99));
    return { nums: rotate(base, ri(0, base.length - 1)) };
  },
  ref: ({ nums }) => String(Math.min(...nums)),
  raw: ({ nums }) => list(nums),
});
add({
  slug: '33-search-in-rotated-sorted-array',
  gen: () => {
    const base = sortedAsc(distinct(ri(1, 14), -50, 99));
    const nums = rotate(base, ri(0, base.length - 1));
    return { nums, target: rnd() < 0.7 ? pick(nums) : ri(-52, 100) };
  },
  ref: ({ nums, target }) => String(nums.indexOf(target)),
  raw: ({ nums, target }) => `${list(nums)} ; ${target}`,
});
add({
  slug: '81-search-in-rotated-sorted-array-ii',
  gen: () => {
    const base = sortedAsc(Array.from({ length: ri(1, 14) }, () => ri(0, 6)));
    const nums = rotate(base, ri(0, base.length - 1));
    return { nums, target: rnd() < 0.6 ? pick(nums) : ri(-1, 7) };
  },
  ref: ({ nums, target }) => String(nums.includes(target)),
  raw: ({ nums, target }) => `${list(nums)} ; ${target}`,
});

const koko = (piles: number[], h: number) => {
  for (let k = 1; ; k++) if (piles.reduce((s, p) => s + Math.ceil(p / k), 0) <= h) return k;
};
add({
  slug: '875-koko-eating-bananas',
  gen: () => {
    const piles = Array.from({ length: ri(1, 8) }, () => ri(1, 16));
    return { piles, h: ri(piles.length, piles.length + 30) };
  },
  ref: ({ piles, h }) => String(koko(piles, h)),
  raw: ({ piles, h }) => `${list(piles)} ; ${h}`,
});

/** brute force: smallest cap such that greedy needs <= k groups */
const minCap = (nums: number[], k: number) => {
  for (let cap = Math.max(...nums); ; cap++) {
    let g = 1;
    let cur = 0;
    for (const x of nums) {
      if (cur + x > cap) { g++; cur = 0; }
      cur += x;
    }
    if (g <= k) return cap;
  }
};
/** independent DP check for the contiguous k-partition (exactly k non-empty parts) */
const dpSplit = (nums: number[], k: number) => {
  const n = nums.length;
  const pre = [0];
  for (const x of nums) pre.push(pre[pre.length - 1] + x);
  const dp: number[][] = Array.from({ length: k + 1 }, () => Array(n + 1).fill(Infinity));
  dp[0][0] = 0;
  for (let p = 1; p <= k; p++) for (let i = p; i <= n; i++) for (let j = p - 1; j < i; j++) dp[p][i] = Math.min(dp[p][i], Math.max(dp[p - 1][j], pre[i] - pre[j]));
  return dp[k][n];
};
const partGen = (kMax: (n: number) => number, kMin = 1) => () => {
  const nums = Array.from({ length: ri(1, 10) }, () => ri(1, 99));
  return { nums, k: ri(kMin, kMax(nums.length)) };
};
const partRaw = ({ nums, k }: any) => `${list(nums)} ; ${k}`;
add({ slug: '1011-capacity-to-ship-packages', gen: partGen((n) => n + 2), ref: ({ nums, k }) => String(minCap(nums, k)), raw: partRaw });
add({ slug: '410-split-array-largest-sum', gen: partGen((n) => n), ref: ({ nums, k }) => String(dpSplit(nums, k)), raw: partRaw });
add({
  slug: 'gfg-allocate-minimum-pages', gen: partGen((n) => n + 3),
  ref: ({ nums, k }) => (k > nums.length ? '-1' : String(dpSplit(nums, k))), raw: partRaw,
});
add({
  slug: 'ib-painters-partition-problem', gen: partGen((n) => n + 3),
  ref: ({ nums, k }) => String(dpSplit(nums, Math.min(k, nums.length))), raw: partRaw,
});
add({
  slug: '4-median-of-two-sorted-arrays',
  gen: () => {
    for (;;) {
      const a = sortedAsc(Array.from({ length: ri(0, 8) }, () => ri(-40, 40)));
      const b = sortedAsc(Array.from({ length: ri(0, 8) }, () => ri(-40, 40)));
      if (a.length + b.length > 0) return { a, b };
    }
  },
  ref: ({ a, b }) => {
    const m = sortedAsc([...a, ...b]);
    const n = m.length;
    return String(n % 2 ? m[(n - 1) / 2] : (m[n / 2 - 1] + m[n / 2]) / 2);
  },
  raw: ({ a, b }) => `${list(a)} ; ${list(b)}`,
});

// ---- (more cases are appended below by the sorting and bit sections)

// ---------------------------------------------------------------- sorting
const sortGen = () => {
  const n = ri(1, 12);
  const mode = ri(0, 4);
  let nums = Array.from({ length: n }, () => ri(-20, 20));
  if (mode === 1) nums = sortedAsc(nums);
  if (mode === 2) nums = sortedAsc(nums).reverse();
  if (mode === 3) nums = Array.from({ length: n }, () => ri(0, 2));
  return { nums };
};
const sortRef = ({ nums }: any) => '[' + sortedAsc(nums).join(', ') + ']';
for (const slug of ['912-insertion-sort', '912-quick-sort', '912-merge-sort', '912-heap-sort']) {
  add({ slug, gen: sortGen, ref: sortRef, raw: ({ nums }) => list(nums) });
}


// ---------------------------------------------------------------- bit manipulation
const withCopies = (copies: number, singles: number, maxGroups: number) => () => {
  const groups = ri(0, maxGroups);
  const vals = distinct(groups + singles, 0, 63);
  const nums: number[] = [];
  vals.forEach((v, i) => {
    const times = i < groups ? copies : 1;
    for (let k = 0; k < times; k++) nums.push(v);
  });
  return { nums: shuffle(nums), singles: vals.slice(groups) };
};
const stripSingles = (g: () => any) => () => {
  const { nums, singles } = g();
  const o: any = { nums };
  Object.defineProperty(o, 'singles', { value: singles, enumerable: false });
  return o;
};
add({
  slug: '136-single-number', gen: stripSingles(withCopies(2, 1, 5)),
  ref: (inp: any) => String(inp.singles[0]), raw: ({ nums }) => list(nums),
});
add({
  slug: '260-single-number-iii', gen: stripSingles(() => { for (;;) { const g = withCopies(2, 2, 4)(); if (g.nums.length >= 2) return g; } }),
  ref: (inp: any) => '[' + sortedAsc(inp.singles).join(', ') + ']', raw: ({ nums }) => list(nums),
});
add({
  slug: '137-single-number-ii', gen: stripSingles(withCopies(3, 1, 3)),
  ref: (inp: any) => String(inp.singles[0]), raw: ({ nums }) => list(nums),
});
const pop = (x: number) => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };
add({
  slug: '191-number-of-1-bits', gen: () => ({ n: rnd() < 0.2 ? pick([0, 1, 4095, 2048, 2047]) : ri(0, 4095) }),
  ref: ({ n }) => String(pop(n)), raw: ({ n }) => String(n),
});
add({
  slug: '231-power-of-two', gen: () => ({ n: rnd() < 0.5 ? (rnd() < 0.8 ? 1 << ri(0, 11) : -(1 << ri(0, 11))) : ri(-4096, 4095) }),
  ref: ({ n }) => String(n > 0 && pop(n) === 1), raw: ({ n }) => String(n),
});
add({
  slug: '338-counting-bits', gen: () => ({ n: ri(0, 16) }),
  ref: ({ n }) => '[' + Array.from({ length: n + 1 }, (_, i) => pop(i)).join(', ') + ']', raw: ({ n }) => String(n),
});
add({
  slug: '371-sum-of-two-integers', gen: () => ({ a: ri(-500, 500), b: ri(-500, 500) }),
  ref: ({ a, b }) => String(a + b), raw: ({ a, b }) => a + ' ; ' + b,
});
add({
  slug: '389-find-the-difference',
  gen: () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const s = Array.from({ length: ri(0, 7) }, () => letters[ri(0, rnd() < 0.5 ? 3 : 25)]).join('');
    const extra = letters[ri(0, rnd() < 0.5 ? 3 : 25)];
    const t = shuffle([...s, extra]).join('');
    const o: any = { s, t };
    Object.defineProperty(o, 'extra', { value: extra, enumerable: false });
    return o;
  },
  ref: (inp: any) => inp.extra, raw: ({ s, t }) => s + ' ; ' + t,
});
add({
  slug: '287-find-the-duplicate-number',
  gen: () => {
    const L = ri(2, 11);
    const d = ri(1, L - 1);
    const k = ri(2, L);
    const pool = shuffle(Array.from({ length: L - 1 }, (_, i) => i + 1).filter((v) => v !== d)).slice(0, L - k);
    const nums = shuffle([...Array(k).fill(d), ...pool]);
    const o: any = { nums };
    Object.defineProperty(o, 'dup', { value: d, enumerable: false });
    return o;
  },
  ref: (inp: any) => String(inp.dup), raw: ({ nums }) => list(nums),
});

//@@CASES@@

// ---------------------------------------------------------------- runner
let failures = 0;
const fail = (msg: string) => {
  failures++;
  if (failures <= 40) console.log(`FAIL  ${msg}`);
};
const bySlug = new Map(searchsortbits.map((p) => [p.slug, p]));

for (const c of cases) {
  const p = bySlug.get(c.slug);
  if (!p) { fail(`${c.slug}: not registered in searchsortbits`); continue; }
  const runs = c.runs ?? 200;
  for (let t = 0; t < runs; t++) {
    const inp = c.gen();
    const tag = `${c.slug} ${JSON.stringify(inp)}`;
    let steps: any[];
    try {
      steps = p.buildSteps(inp);
    } catch (e) {
      fail(`${tag}: buildSteps threw ${e}`);
      continue;
    }
    const last = steps[steps.length - 1];
    if (!last?.result) { fail(`${tag}: no result on final step`); continue; }
    if (steps.length > 400 || steps.length < 2) fail(`${tag}: step count ${steps.length}`);
    if (c.ref && last.result.title !== c.ref(inp)) fail(`${tag}: got ${last.result.title}, expected ${c.ref(inp)}`);
    if (c.ok && !c.ok(inp, last.result.title)) fail(`${tag}: result ${last.result.title} not accepted`);
    steps.forEach((s, i) => {
      const where = `${tag} step ${i}`;
      if (!s.javaLines.every((l: number) => l >= 0 && l < p.java.length)) fail(`${where}: java line range`);
      if (!s.pyLines.every((l: number) => l >= 0 && l < p.python.length)) fail(`${where}: python line range`);
      if (!(s.algoStep >= 0 && s.algoStep < p.algorithm.length)) fail(`${where}: algoStep range`);
      if (!p.varLabels.every((k: string) => k in s.vars)) fail(`${where}: vars missing ${p.varLabels.filter((k: string) => !(k in s.vars))}`);
      if (!s.title || !s.desc || !s.logic) fail(`${where}: empty text`);
      if (/undefined|NaN|Infinity/.test(`${s.title} ${s.desc} ${s.logic}`)) fail(`${where}: bad text "${s.desc}"`);
      checkScene(s, where, (name, cond, extra) => { if (!cond) fail(`${name} ${extra ?? ''}`); });
    });
    if (c.raw) {
      try {
        const back = p.parseInput(c.raw(inp));
        if (JSON.stringify(back) !== JSON.stringify(inp)) fail(`${tag}: parseInput round trip gave ${JSON.stringify(back)}`);
      } catch (e) {
        fail(`${tag}: parseInput threw ${e}`);
      }
    }
  }
}

// every registered problem should have a fuzz case
for (const p of searchsortbits) if (!cases.some((c) => c.slug === p.slug)) fail(`${p.slug}: no fuzz case`);

console.log(failures ? `\n${failures} FUZZ FAILURE(S)` : `fuzz ok: ${cases.length} problems x ~200 random inputs`);
process.exit(failures ? 1 : 0);
