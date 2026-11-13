/**
 * Fuzz for pack p9 fragment f (convex hull problems): random point sets are written as raw strings (so parseInput is
 * exercised), the animation's final result is compared with brute-force references, every step goes through checkScene.
 * Run: node scripts/fuzz-pack9f.mts   (env FUZZ_N=200)
 */
import { rng } from '../src/problems/graphKit.ts';
import { checkScene } from './check-scenes.mts';
import { erectTheFence } from '../src/problems/p9/erectTheFence.ts';
import { grahamScan } from '../src/problems/p9/grahamScan.ts';
import { jarvisMarch } from '../src/problems/p9/jarvisMarch.ts';
import { rotatingCalipers } from '../src/problems/p9/rotatingCalipers.ts';

const N = Number(process.env.FUZZ_N ?? 200);
type Pt = [number, number];
type R = () => number;
const ri = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const cr = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const key = (p: Pt) => `${p[0]},${p[1]}`;
const d2 = (a: Pt, b: Pt) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

// ---- brute-force references
/** Boundary points (collinear ones included): a point is on the boundary iff some line through it and another point has every point on one side. */
function boundary(ps: Pt[]): Set<string> {
  const out = new Set<string>();
  for (const p of ps) for (const q of ps) {
    if (p === q) continue;
    let pos = false, neg = false;
    for (const x of ps) { const c = cr(p, q, x); if (c > 0) pos = true; if (c < 0) neg = true; }
    if (!(pos && neg)) { out.add(key(p)); break; }
  }
  return out;
}
/** Strict corners: p is not a corner iff it lies in a closed (possibly degenerate) triangle of other points. */
function corners(ps: Pt[]): Set<string> {
  const out = new Set<string>();
  const onSeg = (p: Pt, a: Pt, b: Pt) => cr(a, b, p) === 0 && Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
  for (let i = 0; i < ps.length; i++) {
    const others = ps.filter((_, k) => k !== i);
    let inside = false;
    for (const a of others) for (const b of others) {
      if (onSeg(ps[i], a, b)) inside = true;
      for (const c of others) {
        const s1 = cr(a, b, ps[i]), s2 = cr(b, c, ps[i]), s3 = cr(c, a, ps[i]);
        if (cr(a, b, c) !== 0 && ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0))) inside = true;
      }
    }
    if (!inside) out.add(key(ps[i]));
  }
  return out;
}

let failures = 0;
const fail = (slug: string, raw: string, msg: string) => { failures++; if (failures <= 25) console.log(`FAIL ${slug} [${raw}]: ${msg}`); };

function gen(r: R, collinearBias: boolean): { raw: string; pts: Pt[] } {
  const n = ri(r, 2, 10);
  const span = collinearBias ? ri(r, 2, 4) : ri(r, 4, 12);
  const seen = new Set<string>();
  const pts: Pt[] = [];
  let guard = 0;
  while (pts.length < n && guard++ < 200) {
    const p: Pt = collinearBias && r() < 0.4 ? [ri(r, 0, span) * 2 % 13, 3] : [ri(r, 0, span), ri(r, 0, span)];
    if (!seen.has(key(p))) { seen.add(key(p)); pts.push(p); }
  }
  if (pts.length < 2) return gen(r, collinearBias);
  return { raw: pts.map((p) => `${p[0]},${p[1]}`).join(' '), pts };
}

const parseList = (s: string): Pt[] => JSON.parse(s) as Pt[];
const sameSet = (a: Pt[], s: Set<string>) => a.length === s.size && a.every((p) => s.has(key(p)));

const rand = rng(9_606);
const defs: { slug: string; def: any; check: (pts: Pt[], res: string, raw: string) => string | null }[] = [
  {
    slug: '587', def: erectTheFence,
    check: (pts, res) => { const got = parseList(res); const want = boundary(pts); return sameSet(got, want) ? null : `got ${res}, want ${[...want].join(' ')}`; },
  },
  {
    slug: 'graham', def: grahamScan,
    check: (pts, res) => {
      const got = parseList(res); const want = corners(pts);
      if (!sameSet(got, want)) return `got ${res}, want ${[...want].join(' ')}`;
      let pivot = pts[0];
      for (const p of pts) if (p[1] < pivot[1] || (p[1] === pivot[1] && p[0] < pivot[0])) pivot = p;
      if (key(got[0]) !== key(pivot)) return 'does not start at the pivot';
      for (let i = 0; i < got.length && got.length >= 3; i++) if (cr(got[i], got[(i + 1) % got.length], got[(i + 2) % got.length]) <= 0) return 'not counter-clockwise';
      return null;
    },
  },
  {
    slug: 'jarvis', def: jarvisMarch,
    check: (pts, res) => {
      const got = parseList(res); const want = corners(pts);
      if (!sameSet(got, want)) return `got ${res}, want ${[...want].join(' ')}`;
      let s = pts[0];
      for (const p of pts) if (p[0] < s[0] || (p[0] === s[0] && p[1] < s[1])) s = p;
      if (key(got[0]) !== key(s)) return 'does not start at the leftmost point';
      for (let i = 0; i < got.length && got.length >= 3; i++) if (cr(got[i], got[(i + 1) % got.length], got[(i + 2) % got.length]) <= 0) return 'not counter-clockwise';
      return null;
    },
  },
  {
    slug: 'calipers', def: rotatingCalipers,
    check: (pts, res) => {
      let best = 0;
      for (const a of pts) for (const b of pts) best = Math.max(best, d2(a, b));
      return Number(res) === best ? null : `got ${res}, want ${best}`;
    },
  },
];

for (const c of defs) {
  // the declared examples must match too
  for (const ex of c.def.examples) {
    const steps = c.def.buildSteps(ex.input);
    const got = steps[steps.length - 1].result.title;
    const norm = (s: string) => s.replace(/\s/g, '');
    if (c.slug === '587') { if (norm(got) !== norm(ex.output)) fail(c.slug, ex.label, `example output ${ex.output} but animation says ${got}`); }
    else if (c.slug === 'calipers') { if (got !== ex.output) fail(c.slug, ex.label, `example output ${ex.output} but animation says ${got}`); }
    else if (norm(got) !== norm(ex.output)) fail(c.slug, ex.label, `example output ${ex.output} but animation says ${got}`);
  }
  for (let i = 0; i < N; i++) {
    const { raw, pts } = gen(rand, i % 3 === 0);
    let input: any;
    try { input = c.def.parseInput(raw); } catch (e) { fail(c.slug, raw, `parseInput threw: ${e}`); continue; }
    let steps: any[];
    try { steps = c.def.buildSteps(input); } catch (e) { fail(c.slug, raw, `buildSteps threw: ${e}`); continue; }
    if (steps.length > 400) fail(c.slug, raw, `too many steps (${steps.length})`);
    const res = steps[steps.length - 1]?.result?.title;
    if (res === undefined) { fail(c.slug, raw, 'no result'); continue; }
    const msg = c.check(pts, res, raw);
    if (msg) fail(c.slug, raw, msg);
    steps.forEach((s, k) => checkScene(s, `${c.slug} step ${k}`, (name, cond, extra) => { if (!cond) fail(c.slug, raw, `${name} ${extra ?? ''}`); }));
    for (const lab of c.def.varLabels) if (!steps.every((s) => lab in s.vars)) fail(c.slug, raw, `var ${lab} missing`);
  }
  for (const bad of ['', '1,1', '1,1 1,1', '1,1 2', '99,1 2,2', 'a,b c,d']) {
    let threw = false;
    try { c.def.parseInput(bad); } catch (e) { threw = e instanceof Error; }
    if (!threw) fail(c.slug, bad, 'parseInput should reject this');
  }
  console.log(`${c.slug}: ${N} inputs`);
}
console.log(failures ? `\n${failures} FAILURE(S)` : '\nPACK 9F FUZZ PASSED');
process.exit(failures ? 1 : 0);
