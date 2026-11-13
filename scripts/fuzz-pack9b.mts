/**
 * Fuzz for pack p9 fragment b (segment tree + Fenwick tree problems). Random raw inputs go through parseInput, the final
 * result is compared with a plain reference, every step is checked structurally (like scripts/check.mts) and every
 * scene goes through checkScene. Run:  node scripts/fuzz-pack9b.mts   (env FUZZ_N=200)
 */
import { rng } from '../src/problems/graphKit.ts';
import { checkScene } from './check-scenes.mts';
import { rangeSumQueryMutable } from '../src/problems/p9/rangeSumQueryMutable.ts';
import { rangeMinimumQuerySegTree } from '../src/problems/p9/rangeMinimumQuerySegTree.ts';
import { rangeAddRangeSumLazy, lazyReference } from '../src/problems/p9/rangeAddRangeSumLazy.ts';
import { fenwickTree, fenwickReference } from '../src/problems/p9/fenwickTree.ts';
import { countOfSmallerNumbersAfterSelf } from '../src/problems/p9/countOfSmallerNumbersAfterSelf.ts';
import { countInversionsFenwick } from '../src/problems/p9/countInversionsFenwick.ts';
import { segReference } from '../src/problems/p9/segEngine.ts';
import { fenReference } from '../src/problems/p9/fenCount.ts';

const N = Number(process.env.FUZZ_N ?? 200);
type R = () => number;
const ri = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const nums = (r: R, n: number, lo: number, hi: number) => Array.from({ length: n }, () => ri(r, lo, hi));

let failures = 0;
const fail = (slug: string, raw: string, msg: string) => {
  failures++;
  if (failures <= 30) console.log(`FAIL ${slug} [${raw}]: ${msg}`);
};

interface Case { def: any; gen: (r: R) => string; ref: (input: any, raw: string) => string }
const cases: Case[] = [];

const rangeOf = (r: R, n: number): [number, number] => { const a = ri(r, 0, n - 1); const b = ri(r, 0, n - 1); return [Math.min(a, b), Math.max(a, b)]; };

for (const [def, q, u] of [[rangeSumQueryMutable, 'sum', 'update'], [rangeMinimumQuerySegTree, 'min', 'set']] as const) {
  cases.push({
    def,
    gen: (r) => {
      const n = ri(r, 2, 9);
      const ops = Array.from({ length: ri(r, 1, 5) }, () => {
        if (r() < 0.5) { const [l, h] = rangeOf(r, n); return `${q} ${l} ${h}`; }
        return `${u} ${ri(r, 0, n - 1)} ${ri(r, -50, 50)}`;
      });
      return `${nums(r, n, -50, 50).join(' ')} | ${ops.join(' | ')}`;
    },
    ref: (input) => segReference(input, q),
  });
}
cases.push({
  def: rangeAddRangeSumLazy,
  gen: (r) => {
    const n = ri(r, 2, 8);
    const ops = Array.from({ length: ri(r, 1, 4) }, () => {
      const [l, h] = rangeOf(r, n);
      if (r() < 0.5) return `sum ${l} ${h}`;
      let v = 0;
      while (v === 0) v = ri(r, -20, 20);
      return `add ${l} ${h} ${v}`;
    });
    return `${nums(r, n, -30, 30).join(' ')} | ${ops.join(' | ')}`;
  },
  ref: (input) => lazyReference(input),
});
cases.push({
  def: fenwickTree,
  gen: (r) => {
    const n = ri(r, 2, 8);
    const ops = Array.from({ length: ri(r, 1, 5) }, () => (r() < 0.5 ? `prefix ${ri(r, 1, n)}` : `add ${ri(r, 1, n)} ${ri(r, -20, 20)}`));
    return `${nums(r, n, -20, 20).join(' ')} | ${ops.join(' | ')}`;
  },
  ref: (input) => fenwickReference(input),
});
for (const [def, mode] of [[countOfSmallerNumbersAfterSelf, 'smaller'], [countInversionsFenwick, 'inversions']] as const) {
  cases.push({
    def,
    gen: (r) => {
      const n = ri(r, 2, 8);
      const span = ri(r, 1, 9);
      return nums(r, n, -span, span).join(' ');
    },
    ref: (input) => fenReference(input, mode),
  });
}

for (const c of cases) {
  const d = c.def;
  const r = rng(0x9b0 + d.slug.length * 7);
  let maxSteps = 0;
  // the shown examples must also match the reference
  for (const ex of d.examples) {
    const want = c.ref(ex.input, ex.label);
    if (want !== ex.output) fail(d.slug, ex.label, `example output ${ex.output} but reference says ${want}`);
  }
  for (let t = 0; t < N; t++) {
    const raw = c.gen(r);
    let input: any;
    try { input = d.parseInput(raw); } catch (e) { fail(d.slug, raw, `parseInput threw: ${(e as Error).message}`); continue; }
    let steps: any[];
    try { steps = d.buildSteps(input); } catch (e) { fail(d.slug, raw, `buildSteps threw: ${(e as Error).stack}`); continue; }
    maxSteps = Math.max(maxSteps, steps.length);
    if (steps.length > 400) fail(d.slug, raw, `${steps.length} steps`);
    const res = steps[steps.length - 1]?.result?.title;
    const want = c.ref(input, raw);
    if (res !== want) fail(d.slug, raw, `result ${res} but reference ${want}`);
    steps.forEach((s, i) => {
      const where = `${d.slug} step ${i}`;
      const bad = (m: string) => fail(d.slug, raw, `${where}: ${m}`);
      if (!s.javaLines.every((l: number) => Number.isInteger(l) && l >= 0 && l < d.java.length)) bad(`java lines ${JSON.stringify(s.javaLines)}`);
      if (!s.pyLines.every((l: number) => Number.isInteger(l) && l >= 0 && l < d.python.length)) bad(`py lines ${JSON.stringify(s.pyLines)}`);
      if (!(s.algoStep >= 0 && s.algoStep < d.algorithm.length)) bad(`algoStep ${s.algoStep}`);
      if (!d.varLabels.every((k: string) => k in s.vars)) bad(`vars ${JSON.stringify(Object.keys(s.vars))}`);
      if (!s.title || !s.desc || !s.logic) bad('missing text');
      checkScene(s, where, (name, cond, extra) => { if (!cond) fail(d.slug, raw, `${name} ${extra ?? ''}`); });
    });
    if (JSON.stringify(d.buildSteps(input)) !== JSON.stringify(steps)) fail(d.slug, raw, 'not deterministic');
  }
  console.log(`ok ${d.slug}: ${N} inputs, max ${maxSteps} steps`);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nfuzz-pack9b: ALL PASSED');
process.exit(failures ? 1 : 0);
