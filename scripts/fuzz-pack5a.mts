/**
 * Fuzz for pack p5 sub-group a (union-find + spanning trees): 990, 1319, Prim with a heap, 1168, 1135, k-clustering, 1489.
 * Random raw inputs go through parseInput; the final result is compared with brute force (all spanning trees, all
 * partitions, all value assignments); every step goes through checkScene. Run:
 *   node scripts/fuzz-pack5a.mts   (env FUZZ_N=200, FUZZ_ONLY=<slug part>)
 */
import { rng } from '../src/problems/graphKit.ts';
import { checkScene } from './check-scenes.mts';
import { equalityEquations } from '../src/problems/equalityEquations.ts';
import { networkConnectedOperations } from '../src/problems/networkConnectedOperations.ts';
import { primsMstHeap } from '../src/problems/primsMstHeap.ts';
import { optimizeWaterDistribution } from '../src/problems/optimizeWaterDistribution.ts';
import { connectingCities } from '../src/problems/connectingCities.ts';
import { maxSpacingKClustering } from '../src/problems/maxSpacingKClustering.ts';
import { criticalPseudoCriticalEdges } from '../src/problems/criticalPseudoCriticalEdges.ts';

const N = Number(process.env.FUZZ_N ?? 200);
const ONLY = process.env.FUZZ_ONLY;
type R = () => number;
const ri = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
let failures = 0;
const fail = (slug: string, raw: string, msg: string) => {
  failures++;
  if (failures <= 25) console.log(`FAIL ${slug} [${raw}]: ${msg}`);
};

interface WE { u: number; v: number; w: number }
interface Case { slug: string; def: any; gen: (r: R) => string; check: (input: any, steps: any[], raw: string) => string | null }
const cases: Case[] = [];
const INF = Infinity;

/** Random simple weighted graph on `base..base+n-1`, optionally connected, as raw "u-v:w" tokens. */
function wGraph(r: R, n: number, base: number, maxE: number, maxW: number, connected: boolean): WE[] {
  const seen = new Set<string>();
  const out: WE[] = [];
  const add = (a: number, b: number) => {
    const k = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (a === b || seen.has(k)) return false;
    seen.add(k);
    out.push(r() < 0.5 ? { u: a, v: b, w: ri(r, 1, maxW) } : { u: b, v: a, w: ri(r, 1, maxW) });
    return true;
  };
  if (connected) {
    const perm = Array.from({ length: n }, (_, i) => base + i).sort(() => r() - 0.5);
    for (let i = 1; i < n; i++) add(perm[i], perm[ri(r, 0, i - 1)]);
  }
  const target = ri(r, connected ? out.length : 1, maxE);
  for (let t = 0; t < 40 && out.length < target; t++) add(base + ri(r, 0, n - 1), base + ri(r, 0, n - 1));
  return out.sort(() => r() - 0.5);
}
const raw = (es: WE[]) => es.map((e) => `${e.u}-${e.v}:${e.w}`).join(' ');

/** Every spanning tree (as an index set) of an n-node graph with nodes 0..n-1. */
function spanningTrees(n: number, es: WE[]): number[][] {
  const out: number[][] = [];
  const pick: number[] = [];
  const rec = (i: number) => {
    if (pick.length === n - 1) {
      const p = Array.from({ length: n }, (_, k) => k);
      const f = (x: number): number => (p[x] === x ? x : (p[x] = f(p[x])));
      for (const j of pick) { const a = f(es[j].u); const b = f(es[j].v); if (a === b) return; p[a] = b; }
      out.push([...pick]);
      return;
    }
    if (i === es.length || es.length - i < n - 1 - pick.length) return;
    pick.push(i); rec(i + 1); pick.pop();
    rec(i + 1);
  };
  rec(0);
  return out;
}
const mstBrute = (n: number, es: WE[]): { best: number; trees: number[][] } => {
  const all = spanningTrees(n, es);
  let best = INF;
  const wt = (t: number[]) => t.reduce((a, j) => a + es[j].w, 0);
  all.forEach((t) => { best = Math.min(best, wt(t)); });
  return { best, trees: all.filter((t) => wt(t) === best) };
};

// ------------------------------------------------------------ 990
cases.push({
  slug: '990', def: equalityEquations,
  gen: (r) => {
    const k = ri(r, 2, 5);
    const eqs: string[] = [];
    const m = ri(r, 1, 8);
    for (let i = 0; i < m; i++) {
      const a = ri(r, 0, k - 1);
      let b = ri(r, 0, k - 1);
      if (b === a) b = (b + 1) % k;
      eqs.push(`${String.fromCharCode(97 + a)}${r() < 0.6 ? '==' : '!='}${String.fromCharCode(97 + b)}`);
    }
    return eqs.join(' ');
  },
  check: ({ eqs }, steps) => {
    const letters = [...new Set(eqs.flatMap((e: any) => [e.a, e.b]))] as string[];
    const k = letters.length;
    let sat = false;
    const val = new Array<number>(k).fill(0);
    const rec = (i: number) => {
      if (sat) return;
      if (i === k) {
        if (eqs.every((e: any) => (val[letters.indexOf(e.a)] === val[letters.indexOf(e.b)]) === e.eq)) sat = true;
        return;
      }
      for (let x = 0; x < k; x++) { val[i] = x; rec(i + 1); }
    };
    rec(0);
    const got = steps[steps.length - 1].result.title;
    return got === String(sat) ? null : `expected ${sat} got ${got}`;
  },
});

// ------------------------------------------------------------ 1319
cases.push({
  slug: '1319', def: networkConnectedOperations,
  gen: (r) => {
    const n = ri(r, 2, 8);
    const seen = new Set<string>();
    const target = ri(r, 1, Math.min(12, (n * (n - 1)) / 2));
    for (let t = 0; t < 60 && seen.size < target; t++) {
      const a = ri(r, 0, n - 1);
      const b = ri(r, 0, n - 1);
      if (a !== b) seen.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
    }
    if (!seen.size) seen.add('0-1');
    return `${n} ${[...seen].map((s) => (r() < 0.5 ? s : s.split('-').reverse().join('-'))).join(' ')}`;
  },
  check: ({ n, cables }, steps) => {
    const seen = new Array<boolean>(n).fill(false);
    let comps = 0;
    for (let s = 0; s < n; s++) {
      if (seen[s]) continue;
      comps++;
      const st = [s];
      seen[s] = true;
      while (st.length) { const u = st.pop()!; for (const c of cables) { const o = c.u === u ? c.v : c.v === u ? c.u : -1; if (o >= 0 && !seen[o]) { seen[o] = true; st.push(o); } } }
    }
    const want = cables.length < n - 1 ? -1 : comps - 1;
    const got = steps[steps.length - 1].result.title;
    return got === String(want) ? null : `expected ${want} got ${got}`;
  },
});

// ------------------------------------------------------------ Prim heap
cases.push({
  slug: 'cp-prims-mst', def: primsMstHeap,
  gen: (r) => { const n = ri(r, 2, 7); return `${n} ${raw(wGraph(r, n, 0, 10, 9, true))}`; },
  check: ({ n, edges }, steps) => {
    const { best } = mstBrute(n, edges);
    const got = steps[steps.length - 1].result.title;
    if (got !== String(best)) return `expected ${best} got ${got}`;
    const sc = steps[steps.length - 1].scene;
    const chosen = sc.edges.filter((e: any) => e.state === 'chosen');
    if (chosen.length !== n - 1) return `${chosen.length} chosen edges, expected ${n - 1}`;
    return chosen.reduce((a: number, e: any) => a + e.weight, 0) === best ? null : 'chosen edges do not add up to the answer';
  },
});

// ------------------------------------------------------------ 1168
cases.push({
  slug: '1168', def: optimizeWaterDistribution,
  gen: (r) => {
    const n = ri(r, 2, 5);
    const wells = Array.from({ length: n }, () => ri(r, 1, 9));
    const pipes = r() < 0.15 ? [] : wGraph(r, n, 1, 6, 9, false);
    return `${wells.join(' ')} | ${raw(pipes)}`;
  },
  check: ({ wells, pipes }, steps) => {
    const n = wells.length + 1;
    const es: WE[] = [...wells.map((c: number, i: number) => ({ u: 0, v: i + 1, w: c })), ...pipes];
    const { best } = mstBrute(n, es);
    const got = steps[steps.length - 1].result.title;
    return got === String(best) ? null : `expected ${best} got ${got}`;
  },
});

// ------------------------------------------------------------ 1135
cases.push({
  slug: '1135', def: connectingCities,
  gen: (r) => { const n = ri(r, 2, 7); return `${n} ${raw(wGraph(r, n, 1, 11, 9, r() < 0.6))}`; },
  check: ({ n, edges }, steps) => {
    const { best } = mstBrute(n, edges.map((e: WE) => ({ u: e.u - 1, v: e.v - 1, w: e.w })));
    const want = best === INF ? -1 : best;
    const got = steps[steps.length - 1].result.title;
    return got === String(want) ? null : `expected ${want} got ${got}`;
  },
});

// ------------------------------------------------------------ k-clustering
cases.push({
  slug: 'cp-max-spacing', def: maxSpacingKClustering,
  gen: (r) => { const n = ri(r, 3, 6); return `${n} ${ri(r, 2, n)} ${raw(wGraph(r, n, 1, 11, 9, true))}`; },
  check: ({ n, k, edges }, steps) => {
    // try every assignment of points to clusters 0..k-1 that uses every cluster
    let best = -INF;
    const lab = new Array<number>(n).fill(0);
    const rec = (i: number) => {
      if (i === n) {
        if (new Set(lab).size !== k) return;
        let sp = INF;
        for (const e of edges) if (lab[e.u - 1] !== lab[e.v - 1]) sp = Math.min(sp, e.w);
        best = Math.max(best, sp);
        return;
      }
      for (let c = 0; c < k; c++) { lab[i] = c; rec(i + 1); }
    };
    rec(0);
    const got = steps[steps.length - 1].result.title;
    return got === String(best) ? null : `expected ${best} got ${got}`;
  },
});

// ------------------------------------------------------------ 1489
cases.push({
  slug: '1489', def: criticalPseudoCriticalEdges,
  gen: (r) => { const n = ri(r, 3, 6); return `${n} ${raw(wGraph(r, n, 0, 8, ri(r, 1, 4), true))}`; },
  check: ({ n, edges }, steps) => {
    const { trees } = mstBrute(n, edges);
    const crit: number[] = [];
    const pseudo: number[] = [];
    for (let i = 0; i < edges.length; i++) {
      const inCount = trees.filter((t) => t.includes(i)).length;
      if (inCount === trees.length) crit.push(i);
      else if (inCount > 0) pseudo.push(i);
    }
    const want = `[[${crit.join(',')}],[${pseudo.join(',')}]]`;
    const got = steps[steps.length - 1].result.title;
    return got === want ? null : `expected ${want} got ${got}`;
  },
});

for (const c of cases) {
  if (ONLY && !c.slug.includes(ONLY)) continue;
  const r = rng(0xa11ce ^ c.slug.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
  let n = 0;
  const lens: number[] = [];
  for (let t = 0; t < N; t++) {
    const text = c.gen(r);
    let input: any;
    try { input = c.def.parseInput(text); } catch (e) { fail(c.slug, text, `parseInput rejected generated input: ${(e as Error).message}`); continue; }
    let steps: any[];
    try { steps = c.def.buildSteps(input); } catch (e) { fail(c.slug, text, `buildSteps threw ${(e as Error).stack}`); continue; }
    lens.push(steps.length);
    if (steps.length > 400) fail(c.slug, text, `too many steps ${steps.length}`);
    const owner = new Map<object, number>();
    let aliased = false;
    const visit = (o: any, si: number) => {
      if (!o || typeof o !== 'object' || aliased) return;
      if (Array.isArray(o) && owner.has(o) && owner.get(o) !== si) { aliased = true; return; }
      owner.set(o, si);
      for (const k of Object.keys(o)) visit(o[k], si);
    };
    steps.forEach((s, si) => visit({ scene: s.scene, aux: s.aux, cells: s.cells, pointers: s.pointers }, si));
    if (aliased) fail(c.slug, text, 'a scene/aux object is shared between two steps');
    if (JSON.stringify(c.def.buildSteps(input)) !== JSON.stringify(steps)) fail(c.slug, text, 'not deterministic');
    if (!steps[steps.length - 1]?.result) { fail(c.slug, text, 'no result on final step'); continue; }
    const msg = c.check(input, steps, text);
    if (msg) fail(c.slug, text, msg);
    steps.forEach((s, i) => {
      checkScene(s, `${c.slug} [${text}] step ${i}`, (name, cond, extra) => { if (!cond) fail(c.slug, text, `${name} ${extra ?? ''}`); });
      if (!c.def.varLabels.every((k: string) => k in s.vars)) fail(c.slug, text, `step ${i}: vars miss a varLabel`);
      if (!s.javaLines.every((l: number) => l >= 0 && l < c.def.java.length) || !s.pyLines.every((l: number) => l >= 0 && l < c.def.python.length)) fail(c.slug, text, `step ${i}: code line out of range`);
      if (s.algoStep < 0 || s.algoStep >= c.def.algorithm.length) fail(c.slug, text, `step ${i}: algoStep out of range`);
    });
    n++;
  }
  console.log(`${c.slug}: ${n}/${N} inputs ok, steps min ${Math.min(...lens)} max ${Math.max(...lens)}`);
}
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL FUZZ CHECKS PASSED');
process.exit(failures ? 1 : 0);
