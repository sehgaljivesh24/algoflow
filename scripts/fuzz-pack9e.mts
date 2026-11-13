/**
 * Fuzz for pack p9 fragment e (binary lifting / LCA, heavy-light decomposition): random trees and queries are written as raw
 * strings (so parseInput is exercised), the animation's final result is compared with a plain reference, and every
 * step's scene goes through checkScene. Run:  node scripts/fuzz-pack9e.mts   (env FUZZ_N=200)
 */
import { rng } from '../src/problems/graphKit.ts';
import { checkScene } from './check-scenes.mts';
import { kthAncestorOfTreeNode } from '../src/problems/p9/kthAncestorOfTreeNode.ts';
import { lcaViaBinaryLifting } from '../src/problems/p9/lcaViaBinaryLifting.ts';
import { distanceBetweenNodesInTree } from '../src/problems/p9/distanceBetweenNodesInTree.ts';
import { hldChains } from '../src/problems/p9/hldChains.ts';
import { hldPathMax } from '../src/problems/p9/hldPathMax.ts';
import { hldLca } from '../src/problems/p9/hldLca.ts';
import { refDist, refLca } from '../src/problems/p9/lcaEngine.ts';
import { refPathMax } from '../src/problems/p9/hldKit.ts';

const N = Number(process.env.FUZZ_N ?? 200);
type R = () => number;
const ri = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

let failures = 0;
const fail = (slug: string, raw: string, msg: string) => {
  failures++;
  if (failures <= 25) console.log(`FAIL ${slug} [${raw}]: ${msg}`);
};

/** Random parent list for nodes 1..n-1; shape mixes bushy, path-like and caterpillar trees. */
function randTree(r: R): number[] {
  const n = ri(r, 2, 11);
  const mode = ri(r, 0, 2);
  const par: number[] = [-1];
  for (let k = 1; k < n; k++) par.push(mode === 0 ? ri(r, 0, k - 1) : mode === 1 ? (r() < 0.8 ? k - 1 : ri(r, 0, k - 1)) : (r() < 0.5 ? k - 1 : Math.max(0, k - 2)));
  return par;
}
const parStr = (par: number[]) => par.slice(1).join(' ');
const refKth = (par: number[], v: number, k: number) => {
  for (let i = 0; i < k && v >= 0; i++) v = par[v];
  return v;
};

interface Case { slug: string; def: any; gen: (r: R) => { raw: string; expect: string } }
const cases: Case[] = [];

cases.push({
  slug: '1483', def: kthAncestorOfTreeNode,
  gen: (r) => {
    const par = randTree(r);
    const n = par.length;
    const qs = Array.from({ length: ri(r, 1, 3) }, () => [ri(r, 0, n - 1), ri(r, 1, n)] as [number, number]);
    return { raw: `${parStr(par)} | ${qs.map(([a, b]) => `${a}:${b}`).join(' ')}`, expect: `[${qs.map(([v, k]) => refKth(par, v, k)).join(', ')}]` };
  },
});
for (const [slug, def, dist] of [['lca-lift', lcaViaBinaryLifting, false], ['dist', distanceBetweenNodesInTree, true]] as const) {
  cases.push({
    slug, def,
    gen: (r) => {
      const par = randTree(r);
      const n = par.length;
      const qs = Array.from({ length: ri(r, 1, 3) }, () => [ri(r, 0, n - 1), ri(r, 0, n - 1)] as [number, number]);
      return { raw: `${parStr(par)} | ${qs.map(([a, b]) => `${a}:${b}`).join(' ')}`, expect: `[${qs.map(([a, b]) => (dist ? refDist(par, a, b) : refLca(par, a, b))).join(', ')}]` };
    },
  });
}
cases.push({
  slug: 'hld-lca', def: hldLca,
  gen: (r) => {
    const par = randTree(r);
    const n = par.length;
    const qs = Array.from({ length: ri(r, 1, 3) }, () => [ri(r, 0, n - 1), ri(r, 0, n - 1)] as [number, number]);
    return { raw: `${parStr(par)} | ${qs.map(([a, b]) => `${a}:${b}`).join(' ')}`, expect: `[${qs.map(([a, b]) => refLca(par, a, b)).join(', ')}]` };
  },
});
cases.push({
  slug: 'hld-pathmax', def: hldPathMax,
  gen: (r) => {
    const par = randTree(r);
    const n = par.length;
    const vals = Array.from({ length: n }, () => ri(r, -20, 99));
    const qs = Array.from({ length: ri(r, 1, 3) }, () => [ri(r, 0, n - 1), ri(r, 0, n - 1)] as [number, number]);
    return { raw: `${parStr(par)} | ${vals.join(' ')} | ${qs.map(([a, b]) => `${a}:${b}`).join(' ')}`, expect: `[${qs.map(([a, b]) => refPathMax(par, vals, a, b)).join(', ')}]` };
  },
});
cases.push({
  slug: 'hld-chains', def: hldChains,
  gen: (r) => {
    const par = randTree(r);
    // reference: independent chain construction (walk heavy children, ties to the smaller id)
    const n = par.length;
    const size = par.map(() => 1);
    for (let v = n - 1; v >= 1; v--) size[par[v]] += size[v];
    const kids = par.map((_, v) => par.map((p, c) => (p === v ? c : -1)).filter((c) => c >= 0));
    const heavy = kids.map((k) => k.reduce((b, c) => (b < 0 || size[c] > size[b] ? c : b), -1));
    const chains: number[][] = [];
    const visit = (v: number) => {
      const chain = [v];
      chains.push(chain);
      const idx = chains.length - 1;
      let x = v;
      const order: number[] = [x];
      while (heavy[x] >= 0) { x = heavy[x]; chain.push(x); order.push(x); }
      // light children are visited deepest chain node first, as in the DFS
      for (const y of [...order].reverse()) for (const c of kids[y]) if (c !== heavy[y]) visit(c);
      void idx;
    };
    visit(0);
    return { raw: parStr(par), expect: chains.map((x) => `(${x.join('-')})`).join(' ') };
  },
});

const rand = rng(9_005);
for (const c of cases) {
  for (let i = 0; i < N; i++) {
    const { raw, expect } = c.gen(rand);
    let input: any;
    try { input = c.def.parseInput(raw); } catch (e) { fail(c.slug, raw, `parseInput threw: ${e}`); continue; }
    let steps: any[];
    try { steps = c.def.buildSteps(input); } catch (e) { fail(c.slug, raw, `buildSteps threw: ${e}`); continue; }
    if (steps.length > 400) fail(c.slug, raw, `too many steps (${steps.length})`);
    const got = steps[steps.length - 1]?.result?.title;
    if (got !== expect) fail(c.slug, raw, `expected ${expect}, got ${got}`);
    steps.forEach((s, k) => {
      checkScene(s, `${c.slug} [${raw}] step ${k}`, (name, cond, extra) => { if (!cond) fail(c.slug, raw, `scene check "${name}" ${extra ?? ''}`); });
      if (!c.def.varLabels.every((l: string) => l in s.vars)) fail(c.slug, raw, `step ${k}: vars miss a varLabel`);
    });
  }
}
// friendly errors for bad input
for (const [def, raw] of [[kthAncestorOfTreeNode, ''], [kthAncestorOfTreeNode, '0 5 | 1:1'], [lcaViaBinaryLifting, '0 0 1 | 9:1'], [hldPathMax, '0 0 | 1 2 | 1:2'], [hldChains, '0 x'], [hldLca, '0 0 0 0 0 0 0 0 0 0 0 | 1:2']] as const) {
  try { (def as any).parseInput(raw); fail((def as any).slug, raw, 'expected parseInput to throw'); } catch { /* ok */ }
}

console.log(failures ? `\n${failures} FUZZ FAILURE(S)` : `fuzz-pack9e: all ${cases.length} problems x ${N} inputs OK`);
process.exit(failures ? 1 : 0);
