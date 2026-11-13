/**
 * Fuzz test for the pack-p8 animations (bits / math / linear sorts / strings / techniques).
 * Run: node scripts/fuzz-pack8.mts
 * For every problem: ~200 random valid inputs -> buildSteps -> final result compared with a plain reference,
 * structural checks on every step, a parseInput(raw(input)) round trip, and every shipped example's declared output.
 */
import { checkScene } from './check-scenes.mts';
import { pack8 } from '../src/problems/groups/pack8.ts';
import { ALL_ENTRIES } from '../src/data/catalog.ts';

let seed = 8088;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = <T,>(a: T[]): T => a[ri(0, a.length - 1)];
const ints = (n: number, lo: number, hi: number) => Array.from({ length: n }, () => ri(lo, hi));
const str = (n: number, alpha: string) => Array.from({ length: n }, () => alpha[ri(0, alpha.length - 1)]).join('');
const list = (a: number[]) => a.join(' ');
const arrStr = (a: (number | string)[]) => `[${a.join(',')}]`;
const strs = (a: string[]) => `[${a.map((s) => `"${s}"`).join(',')}]`;

interface Case {
  slug: string;
  gen: () => any;
  ref?: (inp: any) => string;
  ok?: (inp: any, title: string) => boolean;
  raw?: (inp: any) => string;
  runs?: number;
}
const cases: Case[] = [];
const add = (c: Case) => cases.push(c);

// ---------------------------------------------------------------- bits
add({
  slug: '1310-xor-queries-of-a-subarray',
  gen: () => {
    const a = ints(ri(1, 8), 1, 31);
    const queries = Array.from({ length: ri(1, 4) }, () => { const l = ri(0, a.length - 1); return [l, ri(l, a.length - 1)]; });
    return { arr: a, queries };
  },
  ref: ({ arr, queries }) => arrStr(queries.map(([l, r]: number[]) => arr.slice(l, r + 1).reduce((x: number, y: number) => x ^ y, 0))),
  raw: ({ arr, queries }) => `${list(arr)} ; ${queries.map((q: number[]) => q.join(' ')).join(', ')}`,
});
add({
  slug: '477-total-hamming-distance',
  gen: () => ({ nums: ints(ri(2, 6), 0, 15) }),
  ref: ({ nums }) => {
    let t = 0;
    const pop = (x: number) => x.toString(2).split('1').length - 1;
    for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) t += pop(nums[i] ^ nums[j]);
    return String(t);
  },
  raw: ({ nums }) => list(nums),
});
add({
  slug: '2275-largest-combination-with-bitwise-and-greater-than-zero',
  gen: () => ({ nums: ints(ri(1, 8), 1, 63) }),
  ref: ({ nums }) => {
    let best = 0;
    const n = nums.length;
    for (let m = 1; m < 1 << n; m++) {
      let and = -1, c = 0;
      for (let i = 0; i < n; i++) if (m >> i & 1) { and &= nums[i]; c++; }
      if (and > 0) best = Math.max(best, c);
    }
    return String(best);
  },
  raw: ({ nums }) => list(nums),
});

// ---------------------------------------------------------------- math
add({
  slug: '204-count-primes',
  gen: () => ({ n: ri(2, 60) }),
  ref: ({ n }) => { let c = 0; for (let i = 2; i < n; i++) { let pr = true; for (let d = 2; d * d <= i; d++) if (i % d === 0) pr = false; if (pr) c++; } return String(c); },
  raw: ({ n }) => String(n),
});
add({
  slug: '50-pow-x-n',
  gen: () => {
    const x = pick([ri(-10, 10), ri(-30, 30) / 10, ri(1, 99) / 100]);
    const n = ri(-20, 20);
    return x === 0 && n <= 0 ? { x: 2, n } : { x, n };
  },
  ok: ({ x, n }, t) => { const e = Math.pow(x, n); const g = Number(t); return Math.abs(g - e) <= Math.abs(e) * 1e-4 + 1e-9; },
  raw: ({ x, n }) => `${x} ; ${n}`,
});
add({
  slug: 'alg-euclids-gcd-and-lcm',
  gen: () => ({ a: ri(1, 999), b: ri(1, 999) }),
  ref: ({ a, b }) => { let g = 1; for (let d = 1; d <= Math.min(a, b); d++) if (a % d === 0 && b % d === 0) g = d; return `gcd ${g}, lcm ${(a / g) * b}`; },
  raw: ({ a, b }) => `${a} ${b}`,
});

// ---------------------------------------------------------------- linear sorts
const sortedNums = (a: number[]) => [...a].sort((x, y) => x - y);
add({
  slug: '912-counting-sort',
  gen: () => { const lo = ri(-20, 9); return { nums: ints(ri(2, 12), lo, lo + ri(0, 11)) }; },
  ref: ({ nums }) => arrStr(sortedNums(nums)),
  raw: ({ nums }) => list(nums),
});
add({
  slug: '912-radix-sort',
  gen: () => ({ nums: ints(ri(2, 10), 0, pick([9, 99, 999])) }),
  ref: ({ nums }) => arrStr(sortedNums(nums)),
  raw: ({ nums }) => list(nums),
});
add({
  slug: '164-maximum-gap',
  gen: () => ({ nums: ints(ri(2, 10), 0, pick([5, 30, 99])) }),
  ref: ({ nums }) => { const s = sortedNums(nums); let b = 0; for (let i = 1; i < s.length; i++) b = Math.max(b, s[i] - s[i - 1]); return String(b); },
  raw: ({ nums }) => list(nums),
});

// ---------------------------------------------------------------- KMP
const border = (s: string) => { for (let L = s.length - 1; L > 0; L--) if (s.slice(0, L) === s.slice(s.length - L)) return L; return 0; };
add({
  slug: '28-find-the-index-of-the-first-occurrence-in-a-string',
  gen: () => { const al = pick(['ab', 'abc', 'a']); const text = str(ri(1, 14), al); const pat = rnd() < 0.5 ? text.slice(ri(0, text.length - 1)).slice(0, ri(1, 7)) : str(ri(1, 7), al); return { text, pat }; },
  ref: ({ text, pat }) => String(text.indexOf(pat)),
  raw: ({ text, pat }) => `${text} ; ${pat}`,
});
add({
  slug: '1392-longest-happy-prefix',
  gen: () => ({ s: str(ri(1, 12), pick(['a', 'ab', 'abc'])) }),
  ref: ({ s }) => `"${s.slice(0, border(s))}"`,
  raw: ({ s }) => s,
});
add({
  slug: '459-repeated-substring-pattern',
  gen: () => { const al = pick(['a', 'ab', 'abc']); const blk = str(ri(1, 4), al); const reps = ri(1, 3); const s = rnd() < 0.6 ? blk.repeat(reps) + (rnd() < 0.3 ? str(1, al) : '') : str(ri(1, 12), al); return { s: s.slice(0, 12) }; },
  ref: ({ s }) => String((s + s).indexOf(s, 1) < s.length),
  raw: ({ s }) => s,
});

// ---------------------------------------------------------------- Z algorithm
const zNaive = (s: string) => s.split('').map((_, i) => { let k = 0; while (i + k < s.length && s[k] === s[i + k]) k++; return k; });
add({
  slug: 'alg-z-algorithm-pattern-search',
  gen: () => { const al = pick(['ab', 'abc', 'a']); const text = str(ri(1, 12), al); const pat = rnd() < 0.6 ? text.slice(ri(0, text.length - 1)).slice(0, ri(1, 5)) : str(ri(1, 5), al); return { text, pat }; },
  ref: ({ text, pat }) => { const r: number[] = []; for (let i = 0; i + pat.length <= text.length; i++) if (text.startsWith(pat, i)) r.push(i); return arrStr(r); },
  raw: ({ text, pat }) => `${text} ; ${pat}`,
});
add({
  slug: '2223-sum-of-scores-of-built-strings',
  gen: () => ({ s: str(ri(1, 12), pick(['a', 'ab', 'abc'])) }),
  ref: ({ s }) => String(zNaive(s).reduce((a, b) => a + b, 0)),
  raw: ({ s }) => s,
});
add({
  slug: 'alg-all-periods-of-a-string',
  gen: () => { const al = pick(['a', 'ab', 'abc']); const blk = str(ri(1, 4), al); return { s: (rnd() < 0.6 ? blk.repeat(ri(1, 3)) + blk.slice(0, ri(0, 2)) : str(ri(1, 12), al)).slice(0, 12) }; },
  ref: ({ s }) => { const r: number[] = []; for (let p = 1; p <= s.length; p++) { let ok = true; for (let i = 0; i + p < s.length; i++) if (s[i] !== s[i + p]) ok = false; if (ok) r.push(p); } return arrStr(r); },
  raw: ({ s }) => s,
});

// ---------------------------------------------------------------- rolling hash
add({
  slug: 'alg-rabin-karp-substring-search',
  gen: () => { const al = pick(['ab', 'abc', 'abcd']); const text = str(ri(1, 14), al); const pat = rnd() < 0.6 ? text.slice(ri(0, text.length - 1)).slice(0, ri(1, 5)) : str(ri(1, Math.min(5, text.length)), al); return { text, pat }; },
  ref: ({ text, pat }) => { const r: number[] = []; for (let i = 0; i + pat.length <= text.length; i++) if (text.startsWith(pat, i)) r.push(i); return arrStr(r); },
  raw: ({ text, pat }) => `${text} ; ${pat}`,
});
add({
  slug: '187-repeated-dna-sequences',
  gen: () => { const s = str(ri(2, 21), pick(['A', 'AC', 'ACGT', 'AT'])); return { s, L: ri(2, Math.min(10, s.length)) }; },
  ref: ({ s, L }) => { const seen = new Set<string>(); const added: string[] = []; for (let i = 0; i + L <= s.length; i++) { const w = s.slice(i, i + L); if (seen.has(w) && !added.includes(w)) added.push(w); seen.add(w); } return strs(added); },
  raw: ({ s, L }) => `${s} ; ${L}`,
});
add({
  slug: '1044-longest-duplicate-substring',
  gen: () => ({ s: str(ri(2, 10), pick(['a', 'ab', 'abc', 'abcdef'])) }),
  ok: ({ s }, t) => {
    let best = 0;
    for (let L = 1; L < s.length; L++) { const seen = new Set<string>(); for (let i = 0; i + L <= s.length; i++) { const w = s.slice(i, i + L); if (seen.has(w)) best = L; seen.add(w); } }
    const sub = t.slice(1, -1);
    if (sub.length !== best) return false;
    if (!best) return true;
    return s.indexOf(sub) !== s.lastIndexOf(sub);
  },
  raw: ({ s }) => s,
});

// ---------------------------------------------------------------- Manacher
const isPal = (x: string) => x === [...x].reverse().join('');
const palStr = () => { const al = pick(['a', 'ab', 'abc']); const half = str(ri(1, 4), al); return (rnd() < 0.5 ? half + [...half].reverse().join('') : half + str(1, al) + [...half].reverse().join('')).slice(0, 9) || 'a'; };
add({
  slug: 'alg-manachers-algorithm',
  gen: () => ({ s: rnd() < 0.5 ? palStr() : str(ri(1, 9), pick(['a', 'ab', 'abc'])) }),
  ok: ({ s }, t) => {
    let best = 0;
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j <= s.length; j++) if (isPal(s.slice(i, j))) best = Math.max(best, j - i);
    const sub = t.slice(1, -1);
    return sub.length === best && isPal(sub) && s.includes(sub);
  },
  raw: ({ s }) => s,
});
add({
  slug: 'cp-palindromic-substrings-via-manacher',
  gen: () => ({ s: rnd() < 0.4 ? palStr() : str(ri(1, 9), pick(['a', 'ab', 'abc'])) }),
  ref: ({ s }) => { let c = 0; for (let i = 0; i < s.length; i++) for (let j = i + 1; j <= s.length; j++) if (isPal(s.slice(i, j))) c++; return String(c); },
  raw: ({ s }) => s,
});
add({
  slug: '214-shortest-palindrome',
  gen: () => ({ s: rnd() < 0.4 ? palStr() : str(ri(1, 9), pick(['a', 'ab', 'abc'])) }),
  ref: ({ s }) => { for (let L = s.length; L >= 0; L--) if (isPal(s.slice(0, L))) return `"${[...s.slice(L)].reverse().join('')}${s}"`; return ''; },
  raw: ({ s }) => s,
});

// ---------------------------------------------------------------- coordinate compression
add({
  slug: '1331-rank-transform-of-an-array',
  gen: () => ({ nums: ints(ri(1, 10), pick([-3, -1000, -1000000000]), pick([3, 1000, 1000000000])) }),
  ref: ({ nums }) => { const u = [...new Set(nums as number[])].sort((a, b) => a - b); return arrStr(nums.map((v: number) => u.indexOf(v) + 1)); },
  raw: ({ nums }) => list(nums),
});
add({
  slug: '506-relative-ranks',
  gen: () => ({ nums: [...new Set(ints(ri(1, 10), 0, pick([12, 1000000])))] }),
  ref: ({ nums }) => { const s = [...nums].sort((a: number, b: number) => b - a); return strs(nums.map((v: number) => { const r = s.indexOf(v); return r < 3 ? ['Gold Medal', 'Silver Medal', 'Bronze Medal'][r] : String(r + 1); })); },
  raw: ({ nums }) => list(nums),
});
add({
  slug: 'cp-maximum-overlap-of-wide-intervals',
  gen: () => { const big = pick([10, 1000, 1000000000]); return { iv: Array.from({ length: ri(1, 6) }, () => { const a = ri(0, big); return [a, Math.min(1000000000, a + ri(0, big))]; }) }; },
  ref: ({ iv }) => { let best = 0; for (const [a] of iv) best = Math.max(best, iv.filter(([x, y]: number[]) => x <= a && a <= y).length); return String(best); },
  raw: ({ iv }) => iv.map((q: number[]) => q.join(' ')).join(', '),
});

// ---------------------------------------------------------------- meet in the middle
add({
  slug: '1755-closest-subsequence-sum',
  gen: () => ({ nums: ints(ri(1, 8), -20, 20), goal: ri(-50, 50) }),
  ref: ({ nums, goal }) => { let best = Infinity; for (let m = 0; m < 1 << nums.length; m++) { let s = 0; for (let b = 0; b < nums.length; b++) if (m >> b & 1) s += nums[b]; best = Math.min(best, Math.abs(s - goal)); } return String(best); },
  raw: ({ nums, goal }) => `${list(nums)} ; ${goal}`,
});
add({
  slug: '2035-partition-array-into-two-arrays-to-minimize-sum-difference',
  gen: () => ({ nums: ints(2 * ri(1, 4), -15, 15) }),
  ref: ({ nums }) => { const n = nums.length / 2; const tot = nums.reduce((a: number, b: number) => a + b, 0); let best = Infinity; for (let m = 0; m < 1 << nums.length; m++) { let c = 0, s = 0; for (let b = 0; b < nums.length; b++) if (m >> b & 1) { c++; s += nums[b]; } if (c === n) best = Math.min(best, Math.abs(tot - 2 * s)); } return String(best); },
  raw: ({ nums }) => list(nums),
});
add({
  slug: '454-4sum-ii',
  gen: () => { const n = ri(1, 4); return { a: ints(n, -5, 5), b: ints(n, -5, 5), c: ints(n, -5, 5), d: ints(n, -5, 5) }; },
  ref: ({ a, b, c, d }) => { let t = 0; for (const x of a) for (const y of b) for (const z of c) for (const w of d) if (x + y + z + w === 0) t++; return String(t); },
  raw: ({ a, b, c, d }) => [a, b, c, d].map(list).join(' ; '),
});

//@@CASES@@

// ---------------------------------------------------------------- runner
let failures = 0;
const fail = (msg: string) => {
  failures++;
  if (failures <= 40) console.log(`FAIL  ${msg}`);
};
const bySlug = new Map(pack8.map((p) => [p.slug, p]));

for (const c of cases) {
  const p = bySlug.get(c.slug);
  if (!p) { fail(`${c.slug}: not registered in pack8`); continue; }
  const runs = c.runs ?? 200;
  const check = (inp: any, tag: string) => {
    let steps: any[];
    try {
      steps = p.buildSteps(inp);
    } catch (e) {
      fail(`${tag}: buildSteps threw ${e}`);
      return undefined;
    }
    const last = steps[steps.length - 1];
    if (!last?.result) { fail(`${tag}: no result on final step`); return undefined; }
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
      if (/undefined|NaN|Infinity/.test(`${s.title} ${s.desc} ${s.logic} ${JSON.stringify(s.vars)}`)) fail(`${where}: bad text "${s.title} / ${s.desc}"`);
      checkScene(s, where, (name, cond, extra) => { if (!cond) fail(`${name} ${extra ?? ''}`); });
    });
    return last.result.title as string;
  };
  for (let t = 0; t < runs; t++) {
    const inp = c.gen();
    const tag = `${c.slug} ${JSON.stringify(inp)}`;
    check(inp, tag);
    if (c.raw) {
      try {
        const back = p.parseInput(c.raw(inp));
        if (JSON.stringify(back) !== JSON.stringify(inp)) fail(`${tag}: parseInput round trip gave ${JSON.stringify(back)}`);
      } catch (e) {
        fail(`${tag}: parseInput threw ${e}`);
      }
    }
  }
  // shipped examples: the declared output must equal the animation's final answer (and match the reference)
  for (const ex of p.examples) {
    const title = check(ex.input, `${c.slug} example "${ex.label}"`);
    if (title !== undefined && title !== ex.output) fail(`${c.slug} example "${ex.label}": declared output ${ex.output} but animation says ${title}`);
  }
}

for (const p of pack8) if (!cases.some((c) => c.slug === p.slug)) fail(`${p.slug}: no fuzz case`);

// catalog consistency (slug / difficulty / category must match the pack.problems entry)
const catalog = new Map(ALL_ENTRIES.map((e) => [e.slug, e]));
for (const p of pack8) {
  const e = catalog.get(p.slug);
  if (!e) fail(`${p.slug}: missing from the catalog (add it to pack.problems in src/data/packs/p8.ts)`);
  else if (e.difficulty !== p.difficulty || e.category !== p.category) fail(`${p.slug}: catalog says ${e.difficulty}/${e.category}, problem says ${p.difficulty}/${p.category}`);
}

console.log(failures ? `\n${failures} FUZZ FAILURE(S)` : `fuzz ok: ${cases.length} problems x ~200 random inputs`);
process.exit(failures ? 1 : 0);
