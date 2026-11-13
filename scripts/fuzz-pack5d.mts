/**
 * Fuzz for pack p5 sub-group d (bridges, articulation points, SCC, bipartite checks). Random raw inputs go through
 * parseInput; the final result is compared with brute force; every step goes through checkScene. Run:
 *   node scripts/fuzz-pack5d.mts   (env FUZZ_N=200, FUZZ_ONLY=<slug part>)
 */
import { rng } from '../src/problems/graphKit.ts';
import { checkScene } from './check-scenes.mts';
import { criticalConnections } from '../src/problems/criticalConnections.ts';
import { articulationPoints } from '../src/problems/articulationPoints.ts';
import { stronglyConnectedComponents } from '../src/problems/stronglyConnectedComponents.ts';
import { isGraphBipartite } from '../src/problems/isGraphBipartite.ts';
import { possibleBipartition } from '../src/problems/possibleBipartition.ts';
import { findAnOddCycle } from '../src/problems/findAnOddCycle.ts';

const N = Number(process.env.FUZZ_N ?? 200);
const ONLY = process.env.FUZZ_ONLY;
type R = () => number;
const ri = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
let failures = 0;
const fail = (slug: string, raw: string, msg: string) => {
  failures++;
  if (failures <= 25) console.log(`FAIL ${slug} [${raw}]: ${msg}`);
};

type E = [number, number];

/** Random simple undirected graph on 0..n-1 (labels shifted by `base`), optionally forced connected. Returns the raw input. */
function randomGraph(r: R, o: { minN: number; maxN: number; base: number; connected: boolean; directed?: boolean; maxE?: number }): { n: number; edges: E[]; raw: string } {
  const n = ri(r, o.minN, o.maxN);
  const maxE = o.maxE ?? 14;
  const key = (a: number, b: number) => (o.directed ? `${a}>${b}` : `${Math.min(a, b)}-${Math.max(a, b)}`);
  const seen = new Set<string>();
  const edges: E[] = [];
  const add = (a: number, b: number) => {
    if (a === b || seen.has(key(a, b)) || edges.length >= maxE) return false;
    seen.add(key(a, b));
    edges.push(!o.directed && r() < 0.5 ? [b, a] : [a, b]);
    return true;
  };
  const perm = Array.from({ length: n }, (_, i) => i).sort(() => r() - 0.5);
  if (o.connected) for (let i = 1; i < n; i++) add(perm[i], perm[ri(r, 0, i - 1)]);
  const target = ri(r, 0, Math.min(maxE, n * 2));
  for (let t = 0; t < target * 3 && edges.length < Math.min(maxE, Math.max(target, o.connected ? n - 1 : 0)); t++) add(ri(r, 0, n - 1), ri(r, 0, n - 1));
  edges.sort(() => r() - 0.5);
  const sep = o.directed ? '>' : '-';
  return { n, edges, raw: `${n} ${edges.map(([a, b]) => `${a + o.base}${sep}${b + o.base}`).join(' ')}`.trim() };
}

const components = (n: number, edges: E[], skipNode = -1, skipEdge = -1): number => {
  const p = Array.from({ length: n }, (_, i) => i);
  const f = (x: number): number => (p[x] === x ? x : (p[x] = f(p[x])));
  edges.forEach(([a, b], i) => { if (i !== skipEdge && a !== skipNode && b !== skipNode) p[f(a)] = f(b); });
  const roots = new Set<number>();
  for (let i = 0; i < n; i++) if (i !== skipNode) roots.add(f(i));
  return roots.size;
};

const isBipartite = (n: number, edges: E[]): boolean => {
  for (let mask = 0; mask < 1 << n; mask++) if (edges.every(([a, b]) => ((mask >> a) & 1) !== ((mask >> b) & 1))) return true;
  return false;
};

const nums = (s: string): number[] => (s.match(/\d+/g) ?? []).map(Number);

interface Case { slug: string; def: any; gen: (r: R) => string; ref: (input: any, title: string, raw: string) => string | null }
const cases: Case[] = [];

cases.push({
  slug: '1192', def: criticalConnections,
  gen: (r) => randomGraph(r, { minN: 2, maxN: 9, base: 0, connected: true }).raw,
  ref: ({ n, edges }, title) => {
    const E: E[] = edges.map((e: any) => [e.u, e.v]);
    const base = components(n, E);
    const want = E.map(([a, b], i) => (components(n, E, -1, i) > base ? `${Math.min(a, b)}-${Math.max(a, b)}` : '')).filter(Boolean).sort();
    const ps = nums(title);
    const got: string[] = [];
    for (let i = 0; i < ps.length; i += 2) got.push(`${Math.min(ps[i], ps[i + 1])}-${Math.max(ps[i], ps[i + 1])}`);
    got.sort();
    return JSON.stringify(got) === JSON.stringify(want) ? null : `expected ${want} got ${title}`;
  },
});

cases.push({
  slug: 'alg-articulation', def: articulationPoints,
  gen: (r) => randomGraph(r, { minN: 2, maxN: 9, base: 0, connected: r() < 0.5 }).raw,
  ref: ({ n, edges }, title) => {
    const E: E[] = edges.map((e: any) => [e.u, e.v]);
    const base = components(n, E);
    const want: number[] = [];
    for (let v = 0; v < n; v++) if (components(n, E, v) > base) want.push(v);
    const got = nums(title);
    return JSON.stringify(got) === JSON.stringify(want) ? null : `expected [${want}] got ${title}`;
  },
});

cases.push({
  slug: 'cp-strongly', def: stronglyConnectedComponents,
  gen: (r) => randomGraph(r, { minN: 2, maxN: 8, base: 0, connected: false, directed: true }).raw,
  ref: ({ n, edges }, title) => {
    const reach = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j));
    edges.forEach((e: any) => { reach[e.u][e.v] = true; });
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (reach[i][k] && reach[k][j]) reach[i][j] = true;
    const comps: number[][] = [];
    const used = new Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      const c = [];
      for (let j = 0; j < n; j++) if (reach[i][j] && reach[j][i]) { c.push(j); used[j] = true; }
      comps.push(c);
    }
    const want = `[${comps.map((c) => `[${c.join(',')}]`).join(',')}]`;
    return want === title ? null : `expected ${want} got ${title}`;
  },
});

cases.push({
  slug: '785', def: isGraphBipartite,
  gen: (r) => randomGraph(r, { minN: 1, maxN: 9, base: 0, connected: r() < 0.3 }).raw,
  ref: ({ n, edges }, title) => {
    const want = String(isBipartite(n, edges.map((e: any) => [e.u, e.v] as E)));
    return want === title ? null : `expected ${want} got ${title}`;
  },
});

cases.push({
  slug: '886', def: possibleBipartition,
  gen: (r) => randomGraph(r, { minN: 1, maxN: 9, base: 1, connected: r() < 0.3 }).raw,
  ref: ({ n, edges }, title) => {
    const want = String(isBipartite(n, edges.map((e: any) => [e.u - 1, e.v - 1] as E)));
    return want === title ? null : `expected ${want} got ${title}`;
  },
});

cases.push({
  slug: 'cp-find-an-odd', def: findAnOddCycle,
  gen: (r) => randomGraph(r, { minN: 3, maxN: 9, base: 0, connected: r() < 0.4 }).raw,
  ref: ({ n, edges }, title) => {
    const E: E[] = edges.map((e: any) => [e.u, e.v]);
    const bip = isBipartite(n, E);
    if (title === 'bipartite') return bip ? null : 'said bipartite but the graph has an odd cycle';
    if (bip) return `returned a cycle ${title} for a bipartite graph`;
    const cyc = nums(title);
    if (cyc.length < 3 || cyc.length % 2 === 0) return `cycle ${title} is not odd-length`;
    if (new Set(cyc).size !== cyc.length) return `cycle ${title} repeats a node`;
    const adj = (a: number, b: number) => E.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    for (let i = 0; i < cyc.length; i++) if (!adj(cyc[i], cyc[(i + 1) % cyc.length])) return `cycle ${title} uses a non-edge`;
    return null;
  },
});

for (const c of cases) {
  if (ONLY && !c.slug.includes(ONLY) && !c.def.slug.includes(ONLY)) continue;
  const r = rng(0x5d5d ^ c.slug.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
  let n = 0;
  const lens: number[] = [];
  for (let t = 0; t < N; t++) {
    const raw = c.gen(r);
    let input: any;
    try { input = c.def.parseInput(raw); } catch (e) { fail(c.slug, raw, `parseInput rejected generated input: ${(e as Error).message}`); continue; }
    let steps: any[];
    try { steps = c.def.buildSteps(input); } catch (e) { fail(c.slug, raw, `buildSteps threw ${(e as Error).stack}`); continue; }
    lens.push(steps.length);
    if (steps.length > 400) fail(c.slug, raw, `too many steps ${steps.length}`);
    // no array / object may be shared between two steps
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
    const res = steps[steps.length - 1]?.result;
    if (!res) { fail(c.slug, raw, 'no result on final step'); continue; }
    steps.slice(0, -1).forEach((s, i) => { if (s.result) fail(c.slug, raw, `result on non-final step ${i}`); });
    const msg = c.ref(input, res.title, raw);
    if (msg) fail(c.slug, raw, msg);
    steps.forEach((s, i) => {
      if (!s.vars) fail(c.slug, raw, `step ${i} has no vars`);
      else if (!c.def.varLabels.every((k: string) => k in s.vars)) fail(c.slug, raw, `step ${i} vars do not cover varLabels`);
      if (!s.javaLines.every((l: number) => l >= 0 && l < c.def.java.length)) fail(c.slug, raw, `step ${i} java lines out of range`);
      if (!s.pyLines.every((l: number) => l >= 0 && l < c.def.python.length)) fail(c.slug, raw, `step ${i} python lines out of range`);
      if (!(s.algoStep >= 0 && s.algoStep < c.def.algorithm.length)) fail(c.slug, raw, `step ${i} algoStep out of range`);
      checkScene(s, `${c.slug} [${raw}] step ${i}`, (name, cond, extra) => { if (!cond) fail(c.slug, raw, `${name} ${extra ?? ''}`); });
    });
    n++;
  }
  console.log(`${c.slug}: ${n}/${N} inputs ok, steps min ${Math.min(...lens)} max ${Math.max(...lens)}`);
}
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL FUZZ CHECKS PASSED');
process.exit(failures ? 1 : 0);
