/**
 * Fuzz for pack p5 sub-group c (Floyd-Warshall family + max flow family). Random raw inputs go through parseInput, the final
 * `result` is compared with a plain reference (Bellman-Ford per source, DFS reachability, brute-force min cut over vertex subsets,
 * brute-force matching), flows / matchings / cuts reported by the animation are validated independently, every step goes through
 * checkScene and an aliasing check. Run:  node scripts/fuzz-pack5c.mts   (env FUZZ_N=200, FUZZ_ONLY=<slug part>)
 */
import { rng } from '../src/problems/graphKit.ts';
import { checkScene } from './check-scenes.mts';
import { bruteMinCut } from '../src/problems/p5cKit.ts';
import { floydWarshallAllPairs } from '../src/problems/floydWarshallAllPairs.ts';
import { findTheCityThreshold } from '../src/problems/findTheCityThreshold.ts';
import { transitiveClosureWarshall } from '../src/problems/transitiveClosureWarshall.ts';
import { maxFlowEdmondsKarp } from '../src/problems/maxFlowEdmondsKarp.ts';
import { maximumBipartiteMatchingFlow } from '../src/problems/maximumBipartiteMatchingFlow.ts';
import { minimumCutFromMaxFlow } from '../src/problems/minimumCutFromMaxFlow.ts';

const N = Number(process.env.FUZZ_N ?? 200);
const ONLY = process.env.FUZZ_ONLY;
type R = () => number;
const ri = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

let failures = 0;
const fail = (slug: string, raw: string, msg: string) => {
  failures++;
  if (failures <= 25) console.log(`FAIL ${slug} [${raw}]: ${msg}`);
};

interface Case { slug: string; def: any; gen: (r: R) => string; check: (input: any, steps: any[], raw: string) => string | null }
const cases: Case[] = [];
const INF = Infinity;

/** Pull the numbers out of the graph part of a scene. */
const lastGraph = (steps: any[]): any => {
  const sc = steps[steps.length - 1].scene;
  return sc.kind === 'split' ? sc.parts.find((p: any) => p.kind === 'graph') : sc;
};
const lastGrid = (steps: any[]): any => steps[steps.length - 1].scene.parts.find((p: any) => p.kind === 'grid');

/** Random directed edge set on 0..n-1 (unique ordered pairs, no loops). */
function randomEdges(r: R, n: number, maxE: number, undirected = false): [number, number][] {
  const seen = new Set<string>();
  const out: [number, number][] = [];
  const target = ri(r, 1, maxE);
  for (let t = 0; t < target * 3 && out.length < target; t++) {
    const a = ri(r, 0, n - 1);
    const b = ri(r, 0, n - 1);
    if (a === b) continue;
    const key = undirected ? `${Math.min(a, b)}-${Math.max(a, b)}` : `${a}>${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([a, b]);
  }
  if (!out.length) out.push([0, 1]);
  return out;
}

// ------------------------------------------------------------ Floyd-Warshall
cases.push({
  slug: 'alg-floyd-warshall', def: floydWarshallAllPairs,
  gen: (r) => {
    const n = ri(r, 2, 5);
    const pot = Array.from({ length: n }, () => ri(r, 0, 6));
    const base = ri(r, 0, 5);
    // w = base + pot[u] - pot[v] >= -6 and every cycle has total weight n*base >= 0, so there is never a negative cycle
    return `${n} ${randomEdges(r, n, 12).map(([u, v]) => `${u}>${v}:${base + pot[u] - pot[v]}`).join(' ')}`;
  },
  check: ({ n, edges }, steps) => {
    const ref: number[][] = [];
    for (let s = 0; s < n; s++) {
      const d = new Array<number>(n).fill(INF);
      d[s] = 0;
      for (let it = 0; it < n; it++) for (const e of edges) if (d[e.u] + e.w < d[e.v]) d[e.v] = d[e.u] + e.w;
      ref.push(d);
    }
    const txt = `[${ref.map((row) => `[${row.map((x) => (x === INF ? '∞' : String(x))).join(',')}]`).join(',')}]`;
    const got = steps[steps.length - 1].result.title;
    if (got !== txt) return `expected ${txt} got ${got}`;
    const g = lastGrid(steps);
    const flat = ref.flat().map((x) => (x === INF ? '∞' : String(x)));
    return g.rows.flat().map((c: any) => String(c.value)).join('|') === flat.join('|') ? null : 'final grid differs from the reference';
  },
});

// ------------------------------------------------------------ 1334
cases.push({
  slug: '1334', def: findTheCityThreshold,
  gen: (r) => {
    const n = ri(r, 2, 6);
    const th = ri(r, 1, 14);
    return `${n} ${th} ${randomEdges(r, n, 10, true).map(([u, v]) => `${u}-${v}:${ri(r, 1, 9)}`).join(' ')}`;
  },
  check: ({ n, threshold, edges }, steps) => {
    let best = -1;
    let fewest = n + 1;
    for (let s = 0; s < n; s++) {
      const d = new Array<number>(n).fill(INF);
      d[s] = 0;
      for (let it = 0; it < n; it++) for (const e of edges) { if (d[e.u] + e.w < d[e.v]) d[e.v] = d[e.u] + e.w; if (d[e.v] + e.w < d[e.u]) d[e.u] = d[e.v] + e.w; }
      const c = d.filter((x, j) => j !== s && x <= threshold).length;
      if (c <= fewest) { fewest = c; best = s; }
    }
    return String(best) === steps[steps.length - 1].result.title ? null : `expected ${best} got ${steps[steps.length - 1].result.title}`;
  },
});

// ------------------------------------------------------------ transitive closure
cases.push({
  slug: 'cp-transitive-closure', def: transitiveClosureWarshall,
  gen: (r) => {
    const n = ri(r, 2, 6);
    return `${n} ${randomEdges(r, n, 12).map(([u, v]) => `${u}>${v}`).join(' ')}`;
  },
  check: ({ n, edges }, steps) => {
    const reach = Array.from({ length: n }, (_, s) => {
      const seen = new Array<boolean>(n).fill(false);
      const st = [s];
      seen[s] = true;
      while (st.length) { const u = st.pop()!; for (const e of edges) if (e.u === u && !seen[e.v]) { seen[e.v] = true; st.push(e.v); } }
      return seen;
    });
    const count = reach.reduce((a, row, i) => a + row.filter((x, j) => x && i !== j).length, 0);
    if (String(count) !== steps[steps.length - 1].result.title) return `expected ${count} got ${steps[steps.length - 1].result.title}`;
    const g = lastGrid(steps);
    return g.rows.flat().map((c: any) => c.value).join('') === reach.flat().map((x) => (x ? 1 : 0)).join('') ? null : 'final grid differs from the reference';
  },
});

// ------------------------------------------------------------ flow network helpers
function genNet(r: R, maxN: number, maxE: number): string {
  const n = ri(r, 2, maxN);
  const s = ri(r, 0, n - 1);
  let t = ri(r, 0, n - 2);
  if (t >= s) t++;
  const es = randomEdges(r, n, maxE);
  return `${n} ${s} ${t} ${es.map(([u, v]) => `${u}>${v}:${ri(r, 1, r() < 0.2 ? 30 : 6)}`).join(' ')}`;
}

/** Validate the final edge flows ("f/c" weights) of a flow animation; returns the flow value or an error string. */
function checkFlows(net: any, steps: any[]): number | string {
  const g = lastGraph(steps);
  const flows: number[] = g.edges.map((e: any, i: number) => {
    const m = /^(\d+)\/(\d+)$/.exec(String(e.weight));
    if (!m || Number(m[2]) !== net.edges[i].cap) return NaN;
    return Number(m[1]);
  });
  if (flows.some((f, i) => !(f >= 0 && f <= net.edges[i].cap))) return 'an edge shows a bad flow/capacity';
  const bal = new Array<number>(net.n).fill(0);
  net.edges.forEach((e: any, i: number) => { bal[e.u] -= flows[i]; bal[e.v] += flows[i]; });
  for (let v = 0; v < net.n; v++) if (v !== net.s && v !== net.t && bal[v] !== 0) return `flow is not conserved at node ${v}`;
  if (bal[net.t] !== -bal[net.s]) return 'net flow out of s differs from net flow into t';
  return bal[net.t];
}

// ------------------------------------------------------------ max flow
cases.push({
  slug: 'alg-max-flow', def: maxFlowEdmondsKarp,
  gen: (r) => genNet(r, 8, 16),
  check: (net, steps) => {
    const want = bruteMinCut(net).value;
    const got = steps[steps.length - 1].result.title;
    if (String(want) !== got) return `expected ${want} got ${got}`;
    const f = checkFlows(net, steps);
    return typeof f === 'string' ? f : f === want ? null : `edges carry flow ${f}, not ${want}`;
  },
});

// ------------------------------------------------------------ min cut
cases.push({
  slug: 'cp-minimum-cut', def: minimumCutFromMaxFlow,
  gen: (r) => genNet(r, 8, 14),
  check: (net, steps) => {
    const want = bruteMinCut(net).value;
    const res = steps[steps.length - 1].result;
    if (String(want) !== res.title) return `expected ${want} got ${res.title}`;
    const cutKeys = new Set([...res.text.matchAll(/(\d+)>(\d+)/g)].map((m: any) => `${m[1]}>${m[2]}`));
    const cutEdges = net.edges.filter((e: any) => cutKeys.has(`${e.u}>${e.v}`));
    if (cutEdges.length !== cutKeys.size) return 'cut lists an edge that is not in the network';
    if (cutEdges.reduce((a: number, e: any) => a + e.cap, 0) !== want) return 'cut capacity differs from the max flow';
    // removing the cut must disconnect s from t
    const seen = new Array<boolean>(net.n).fill(false);
    seen[net.s] = true;
    const st = [net.s];
    while (st.length) { const u = st.pop()!; for (const e of net.edges) if (e.u === u && !cutKeys.has(`${e.u}>${e.v}`) && !seen[e.v]) { seen[e.v] = true; st.push(e.v); } }
    if (seen[net.t]) return 'removing the reported cut leaves a path from s to t';
    return null;
  },
});

// ------------------------------------------------------------ matching
cases.push({
  slug: 'cp-maximum-bipartite-matching', def: maximumBipartiteMatchingFlow,
  gen: (r) => {
    const L = ri(r, 1, 4);
    const R2 = ri(r, 1, 4);
    const seen = new Set<string>();
    const target = ri(r, 1, Math.min(12, L * R2));
    for (let t = 0; t < target * 3 && seen.size < target; t++) seen.add(`${ri(r, 0, L - 1)}-${ri(r, 0, R2 - 1)}`);
    return `${L} ${R2} ${[...seen].join(' ')}`;
  },
  check: ({ L, R, pairs }, steps) => {
    const adj: number[][] = Array.from({ length: L }, () => []);
    pairs.forEach(([l, rr]: number[]) => adj[l].push(rr));
    const best = (l: number, used: number): number => {
      if (l === L) return 0;
      let b = best(l + 1, used);
      for (const rr of adj[l]) if (!(used >> rr & 1)) b = Math.max(b, 1 + best(l + 1, used | 1 << rr));
      return b;
    };
    const want = best(0, 0);
    const res = steps[steps.length - 1].result;
    if (String(want) !== res.title) return `expected ${want} got ${res.title}`;
    const got = [...res.text.matchAll(/L(\d+)–R(\d+)/g)].map((m: any) => [Number(m[1]), Number(m[2])]);
    if (got.length !== want) return `lists ${got.length} pairs, expected ${want}`;
    if (new Set(got.map((p) => p[0])).size !== got.length || new Set(got.map((p) => p[1])).size !== got.length) return 'a node is used twice';
    if (!got.every(([l, rr]) => pairs.some(([a, b]: number[]) => a === l && b === rr))) return 'uses a pair that is not allowed';
    return null;
  },
});

for (const c of cases) {
  if (ONLY && !c.slug.includes(ONLY)) continue;
  const r = rng(0x5eed ^ c.slug.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
  let n = 0;
  let skipped = 0;
  const lens: number[] = [];
  for (let t = 0; t < N; t++) {
    const raw = c.gen(r);
    let input: any;
    try { input = c.def.parseInput(raw); } catch (e) {
      if (/more than 400/.test((e as Error).message)) { skipped++; continue; }
      fail(c.slug, raw, `parseInput rejected generated input: ${(e as Error).message}`); continue;
    }
    let steps: any[];
    try { steps = c.def.buildSteps(input); } catch (e) { fail(c.slug, raw, `buildSteps threw ${(e as Error).stack}`); continue; }
    lens.push(steps.length);
    if (steps.length > 400) fail(c.slug, raw, `too many steps ${steps.length}`);
    const owner = new Map<object, number>();
    let aliased = false;
    const visit = (o: any, si: number) => {
      if (!o || typeof o !== 'object' || aliased) return;
      if (Array.isArray(o) && owner.has(o) && owner.get(o) !== si) { aliased = true; return; }
      owner.set(o, si);
      for (const k of Object.keys(o)) visit(o[k], si);
    };
    steps.forEach((s, si) => visit({ scene: s.scene, aux: s.aux, cells: s.cells, pointers: s.pointers }, si));
    if (aliased) fail(c.slug, raw, 'a scene/aux object is shared between two steps (copy it when snapshotting)');
    if (JSON.stringify(c.def.buildSteps(input)) !== JSON.stringify(steps)) fail(c.slug, raw, 'not deterministic');
    if (!steps[steps.length - 1]?.result) { fail(c.slug, raw, 'no result on final step'); continue; }
    const msg = c.check(input, steps, raw);
    if (msg) fail(c.slug, raw, msg);
    steps.forEach((s, i) => {
      checkScene(s, `${c.slug} [${raw}] step ${i}`, (name, cond, extra) => { if (!cond) fail(c.slug, raw, `${name} ${extra ?? ''}`); });
      if (!c.def.varLabels.every((k: string) => k in s.vars)) fail(c.slug, raw, `step ${i}: vars miss a varLabel`);
      if (!s.javaLines.every((l: number) => l >= 0 && l < c.def.java.length) || !s.pyLines.every((l: number) => l >= 0 && l < c.def.python.length)) fail(c.slug, raw, `step ${i}: code line out of range`);
    });
    n++;
  }
  console.log(`${c.slug}: ${n}/${N} inputs ok${skipped ? ` (${skipped} skipped as too long)` : ''}, steps min ${Math.min(...lens)} max ${Math.max(...lens)}`);
}

// negative cycles must be rejected with a friendly message
for (const bad of ['3 0>1:1 1>2:-3 2>0:1', '2 0>1:-1 1>0:-1']) {
  try { floydWarshallAllPairs.parseInput(bad); fail('alg-floyd-warshall', bad, 'negative cycle was accepted'); } catch (e) { if (!/negative cycle/.test((e as Error).message)) fail('alg-floyd-warshall', bad, 'unfriendly message'); }
}
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL FUZZ CHECKS PASSED');
process.exit(failures ? 1 : 0);
