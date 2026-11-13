/**
 * Fuzz for pack p9 fragment c (sqrt decomposition + persistent structures): random valid inputs written as raw strings
 * (so parseInput is exercised too), the animation's final result is compared with a brute-force reference, and every
 * step's scene goes through checkScene. Run:  node scripts/fuzz-pack9c.mts   (env FUZZ_N=200, FUZZ_ONLY=<slug part>)
 */
import { rng } from '../src/problems/p9/kitC.ts';
import { checkScene } from './check-scenes.mts';
import { sqrtDecompositionRangeSum } from '../src/problems/p9/sqrtDecompositionRangeSum.ts';
import { rangeAddRangeSumBlocks } from '../src/problems/p9/rangeAddRangeSumBlocks.ts';
import { rangeFrequencyQueries } from '../src/problems/p9/rangeFrequencyQueries.ts';
import { persistentSegmentTreeVersionArray } from '../src/problems/p9/persistentSegmentTreeVersionArray.ts';
import { kthSmallestInRangePersistent } from '../src/problems/p9/kthSmallestInRangePersistent.ts';
import { snapshotArray } from '../src/problems/p9/snapshotArray.ts';

const N = Number(process.env.FUZZ_N ?? 200);
const ONLY = process.env.FUZZ_ONLY;
type R = () => number;
const ri = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

let failures = 0;
const fail = (slug: string, raw: string, msg: string) => {
  failures++;
  if (failures <= 25) console.log(`FAIL ${slug} [${raw}]: ${msg}`);
};

/** gen returns [raw input, expected result title]. */
interface Case { def: any; gen: (r: R) => [string, string] }
const cases: Case[] = [];

const arr = (r: R, n: number, lo: number, hi: number) => Array.from({ length: n }, () => ri(r, lo, hi));

// ---- sqrt decomposition: range sum with updates
cases.push({
  def: sqrtDecompositionRangeSum,
  gen: (r) => {
    const n = ri(r, 3, 12);
    const a = arr(r, n, -50, 50);
    const cur = [...a];
    const toks: string[] = [];
    const out: number[] = [];
    for (let k = ri(r, 1, 6); k > 0; k--) {
      if (r() < 0.4) { const i = ri(r, 0, n - 1); const v = ri(r, -50, 50); cur[i] = v; toks.push(`set:${i}=${v}`); }
      else { const l = ri(r, 0, n - 1); const rr = ri(r, l, n - 1); toks.push(`sum:${l}-${rr}`); out.push(cur.slice(l, rr + 1).reduce((x, y) => x + y, 0)); }
    }
    return [`${a.join(' ')} | ${toks.join(' ')}`, `[${out.join(', ')}]`];
  },
});

// ---- range add / range sum with lazy block tags
cases.push({
  def: rangeAddRangeSumBlocks,
  gen: (r) => {
    const n = ri(r, 3, 12);
    const a = arr(r, n, -50, 50);
    const cur = [...a];
    const toks: string[] = [];
    const out: number[] = [];
    for (let k = ri(r, 1, 6); k > 0; k--) {
      const l = ri(r, 0, n - 1);
      const rr = ri(r, l, n - 1);
      if (r() < 0.5) { const v = ri(r, -20, 20); for (let i = l; i <= rr; i++) cur[i] += v; toks.push(`add:${l}-${rr}=${v}`); }
      else { toks.push(`sum:${l}-${rr}`); out.push(cur.slice(l, rr + 1).reduce((x, y) => x + y, 0)); }
    }
    return [`${a.join(' ')} | ${toks.join(' ')}`, `[${out.join(', ')}]`];
  },
});

// ---- 2080 range frequency
cases.push({
  def: rangeFrequencyQueries,
  gen: (r) => {
    const n = ri(r, 3, 12);
    const hi = ri(r, 1, 9);
    const a = arr(r, n, 0, hi);
    const toks: string[] = [];
    const out: number[] = [];
    for (let k = ri(r, 1, 5); k > 0; k--) {
      const l = ri(r, 0, n - 1);
      const rr = ri(r, l, n - 1);
      const v = ri(r, 0, hi);
      toks.push(`q:${l}-${rr}=${v}`);
      out.push(a.slice(l, rr + 1).filter((x) => x === v).length);
    }
    return [`${a.join(' ')} | ${toks.join(' ')}`, `[${out.join(', ')}]`];
  },
});

// ---- persistent array
cases.push({
  def: persistentSegmentTreeVersionArray,
  gen: (r) => {
    const n = ri(r, 2, 4);
    const a = arr(r, n, -50, 50);
    const vers: number[][] = [[...a]];
    const toks: string[] = [];
    const out: number[] = [];
    let sets = 0;
    for (let k = ri(r, 1, 6); k > 0; k--) {
      if (sets < 3 && r() < 0.5) {
        const i = ri(r, 0, n - 1);
        const v = ri(r, -50, 50);
        const nx = [...vers[vers.length - 1]];
        nx[i] = v;
        vers.push(nx);
        sets++;
        toks.push(`set:${i}=${v}`);
      } else {
        const ver = ri(r, 0, vers.length - 1);
        const i = ri(r, 0, n - 1);
        toks.push(`get:${ver}.${i}`);
        out.push(vers[ver][i]);
      }
    }
    return [`${a.join(' ')} | ${toks.join(' ')}`, `[${out.join(', ')}]`];
  },
});

// ---- k-th smallest in a range
cases.push({
  def: kthSmallestInRangePersistent,
  gen: (r) => {
    const n = ri(r, 2, 5);
    const pool = [1, 2, 3, 4].map(() => ri(r, 1, 99));
    const a = Array.from({ length: n }, () => pool[ri(r, 0, pool.length - 1)]);
    const toks: string[] = [];
    const out: number[] = [];
    for (let k = ri(r, 1, 3); k > 0; k--) {
      const l = ri(r, 1, n);
      const rr = ri(r, l, n);
      const kk = ri(r, 1, rr - l + 1);
      toks.push(`q:${l}-${rr}:${kk}`);
      out.push([...a.slice(l - 1, rr)].sort((x, y) => x - y)[kk - 1]);
    }
    return [`${a.join(' ')} | ${toks.join(' ')}`, `[${out.join(', ')}]`];
  },
});

// ---- 1146 snapshot array
cases.push({
  def: snapshotArray,
  gen: (r) => {
    const n = ri(r, 1, 5);
    const live = Array(n).fill(0) as number[];
    const snaps: number[][] = [];
    const toks: string[] = [];
    const out: string[] = [];
    for (let k = ri(r, 1, 10); k > 0; k--) {
      const x = r();
      if (x < 0.4) { const i = ri(r, 0, n - 1); const v = ri(r, 0, 99); live[i] = v; toks.push(`set:${i}=${v}`); out.push('null'); }
      else if (x < 0.65 && snaps.length < 4) { toks.push('snap'); out.push(String(snaps.length)); snaps.push([...live]); }
      else if (snaps.length) { const i = ri(r, 0, n - 1); const s = ri(r, 0, snaps.length - 1); toks.push(`get:${i}@${s}`); out.push(String(snaps[s][i])); }
      else { const i = ri(r, 0, n - 1); const v = ri(r, 0, 99); live[i] = v; toks.push(`set:${i}=${v}`); out.push('null'); }
    }
    return [`${n} | ${toks.join(' ')}`, `[${out.join(', ')}]`];
  },
});

for (const c of cases) {
  const slug: string = c.def.slug;
  if (ONLY && !slug.includes(ONLY)) continue;
  const r = rng(slug.length * 7919 + 17);
  let maxSteps = 0;
  for (let t = 0; t < N; t++) {
    const [raw, want] = c.gen(r);
    let input: any;
    try { input = c.def.parseInput(raw); } catch (e) { fail(slug, raw, `parseInput rejected a valid input: ${e}`); continue; }
    let steps: any[];
    try { steps = c.def.buildSteps(input); } catch (e) { fail(slug, raw, `buildSteps threw: ${e}`); continue; }
    maxSteps = Math.max(maxSteps, steps.length);
    const got = steps[steps.length - 1]?.result?.title;
    if (got !== want) fail(slug, raw, `got ${got}, expected ${want}`);
    if (steps.length > 400) fail(slug, raw, `${steps.length} steps (> 400)`);
    steps.forEach((s, i) => {
      checkScene(s, `${slug} step ${i}`, (name, cond, extra) => { if (!cond) fail(slug, raw, `${name} ${extra ?? ''}`); });
      if (!c.def.varLabels.every((k: string) => k in s.vars)) fail(slug, raw, `step ${i}: vars miss a label`);
      if (!s.javaLines.every((l: number) => l >= 0 && l < c.def.java.length) || !s.pyLines.every((l: number) => l >= 0 && l < c.def.python.length)) fail(slug, raw, `step ${i}: code line out of range`);
    });
  }
  console.log(`${slug}: ${N} random inputs checked (max ${maxSteps} steps)`);
}

// invalid inputs must be rejected with a friendly Error
const bad: [any, string][] = [
  [sqrtDecompositionRangeSum, '1 2 3 | sum:2-1'], [sqrtDecompositionRangeSum, '1 2 3 sum:0-1'], [rangeAddRangeSumBlocks, '1 2 3 | add:0-1=99'],
  [rangeFrequencyQueries, '1 2 3 | q:0-5=1'], [persistentSegmentTreeVersionArray, '1 2 | get:3.0'], [kthSmallestInRangePersistent, '1 2 3 4 5 | q:1-2:3'],
  [kthSmallestInRangePersistent, '1 2 3 4 5 | q:1-2:1'], [snapshotArray, '2 | get:0@0'], [snapshotArray, '9 | snap'],
];
for (const [def, raw] of bad) {
  try { def.parseInput(raw); fail(def.slug, raw, 'expected parseInput to throw'); } catch (e) { if (!(e instanceof Error) || !e.message) fail(def.slug, raw, 'not a friendly Error'); }
}

console.log(failures ? `\n${failures} FUZZ FAILURE(S)` : '\nFUZZ OK');
process.exit(failures ? 1 : 0);
