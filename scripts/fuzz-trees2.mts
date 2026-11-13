/**
 * Fuzz test for pack p10 (DFS traversal orders + BST search / insert): random inputs, final animation result vs a plain reference.
 * Run:  node scripts/fuzz-trees2.mts        (exits non-zero on any mismatch)
 *   env FUZZ_N=<count>  cases per problem (default 200)
 */
import { pack10 } from '../src/problems/groups/pack10.ts';
import { checkScene } from './check-scenes.mts';

let seed = 20261113;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const shuffle = <X,>(xs: X[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = ri(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const distinct = (n: number, lo: number, hi: number) => shuffle(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)).slice(0, n);

interface T { v: number; l: T | null; r: T | null }
function randShape(maxN: number, density = 0.65): T {
  const n = ri(1, maxN);
  const root: T = { v: 0, l: null, r: null };
  const q = [root];
  let count = 1;
  for (let i = 0; i < q.length; i++) {
    for (const side of ['l', 'r'] as const) {
      if (count < n && rnd() < density) {
        const c: T = { v: 0, l: null, r: null };
        q[i][side] = c;
        q.push(c);
        count++;
      }
    }
  }
  return root;
}
const pre = (t: T | null): number[] => (t ? [t.v, ...pre(t.l), ...pre(t.r)] : []);
const ino = (t: T | null): number[] => (t ? [...ino(t.l), t.v, ...ino(t.r)] : []);
const post = (t: T | null): number[] => (t ? [...post(t.l), ...post(t.r), t.v] : []);
const preNodes = (t: T | null): T[] => (t ? [t, ...preNodes(t.l), ...preNodes(t.r)] : []);
const tokens = (root: T): (number | null)[] => {
  const out: (number | null)[] = [];
  const q: (T | null)[] = [root];
  for (let i = 0; i < q.length; i++) {
    const n = q[i];
    if (!n) { out.push(null); continue; }
    out.push(n.v);
    q.push(n.l, n.r);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
};
const raw = (root: T) => tokens(root).map((x) => (x === null ? 'null' : x)).join(' ');
const lvl = (root: T | null) => (root ? `[${tokens(root).map((x) => (x === null ? 'null' : x)).join(',')}]` : '[]');
const size = (t: T | null): number => (t ? 1 + size(t.l) + size(t.r) : 0);
function randTree(maxN = 12): T {
  const t = randShape(maxN);
  const vals = distinct(30, -20, 40);
  preNodes(t).forEach((n, i) => (n.v = vals[i]));
  return t;
}
function randBst(n: number, vals?: number[]): T {
  const vs = vals ?? distinct(n, -30, 60);
  let root: T | null = null;
  for (const v of vs) {
    const node: T = { v, l: null, r: null };
    if (!root) { root = node; continue; }
    let c = root;
    for (;;) {
      if (v < c.v) { if (c.l) c = c.l; else { c.l = node; break; } }
      else if (c.r) c = c.r; else { c.r = node; break; }
    }
  }
  return root!;
}
const list = (xs: number[]) => `[${xs.join(',')}]`;
const find = (t: T | null, v: number): T | null => (t === null ? null : v === t.v ? t : find(v < t.v ? t.l : t.r, v));
function insertRef(t: T | null, v: number): T {
  if (!t) return { v, l: null, r: null };
  if (v < t.v) t.l = insertRef(t.l, v); else t.r = insertRef(t.r, v);
  return t;
}

interface Case { raw: string; expect: string; stepsExact?: number }
const gens: Record<string, () => Case> = {
  'alg-preorder-traversal-recursive-dfs': () => { const t = randTree(); return { raw: raw(t), expect: list(pre(t)), stepsExact: 3 * size(t) + 2 }; },
  'alg-inorder-traversal-recursive-dfs': () => { const t = randTree(); return { raw: raw(t), expect: list(ino(t)), stepsExact: 3 * size(t) + 2 }; },
  '145-binary-tree-postorder-traversal': () => { const t = randTree(); return { raw: raw(t), expect: list(post(t)), stepsExact: 3 * size(t) + 2 }; },
  '700-search-in-a-binary-search-tree': () => {
    const t = randBst(ri(1, 12));
    const vals = ino(t);
    const target = ri(0, 2) === 0 ? ri(-35, 65) : vals[ri(0, vals.length - 1)];
    const hit = find(t, target);
    return { raw: `${raw(t)} ; ${target}`, expect: hit ? lvl(hit) : '[]' };
  },
  '701-insert-into-a-binary-search-tree': () => {
    const n = ri(1, 11);
    const vals = distinct(n + 1, -30, 60);
    const t = randBst(n, vals.slice(0, n));
    const extra = vals[n];
    const want = lvl(insertRef(randBst(n, vals.slice(0, n)), extra));
    return { raw: `${raw(t)} ; ${extra}`, expect: want };
  },
};

const N = Number(process.env.FUZZ_N ?? 200);
let failed = 0;
for (const p of pack10) {
  const gen = gens[p.slug];
  if (!gen) { console.log(`FAIL ${p.slug}: no fuzz generator`); failed++; continue; }
  let bad = 0;
  for (let k = 0; k < N; k++) {
    const c = gen();
    let input;
    try {
      input = p.parseInput(c.raw);
    } catch (e) {
      bad++;
      if (bad <= 3) console.log(`FAIL ${p.slug}: parseInput rejected "${c.raw}": ${e}`);
      continue;
    }
    const steps = p.buildSteps(input);
    const res = steps[steps.length - 1].result;
    const issues: string[] = [];
    if (!res || res.title !== c.expect) issues.push(`expected ${c.expect} got ${res?.title}`);
    if (c.stepsExact !== undefined && steps.length !== c.stepsExact) issues.push(`steps ${steps.length} != ${c.stepsExact}`);
    steps.forEach((s, i) => {
      if (i < steps.length - 1 && s.result) issues.push(`result before the end (step ${i})`);
      if (!s.tag || !s.note) issues.push(`step ${i} lacks tag/note`);
      if (!(s.algoStep >= 0 && s.algoStep < p.algorithm.length)) issues.push(`step ${i} algoStep`);
      if (!s.javaLines.every((l) => l >= 0 && l < p.java.length)) issues.push(`step ${i} java line`);
      if (!s.pyLines.every((l) => l >= 0 && l < p.python.length)) issues.push(`step ${i} python line`);
      if (!p.varLabels.every((v: string) => v in s.vars)) issues.push(`step ${i} vars`);
      checkScene(s, `step ${i}`, (n: string, ok: boolean, extra?: string) => { if (!ok) issues.push(`${n} ${extra ?? ''}`); });
    });
    if (p.phases && p.phases.length !== p.algorithm.length) issues.push('phases and algorithm differ in length');
    if (steps.length > 400) issues.push('more than 400 steps');
    if (JSON.stringify(p.buildSteps(input)) !== JSON.stringify(steps)) issues.push('not deterministic');
    if (issues.length) {
      bad++;
      if (bad <= 3) console.log(`FAIL ${p.slug}: input "${c.raw}": ${issues.slice(0, 4).join('; ')}`);
    }
  }
  console.log(`${bad ? 'FAIL' : 'ok  '} ${p.slug} (${N} cases)`);
  if (bad) failed++;
}
// the declared example outputs must equal what the animation ends with
for (const p of pack10) {
  for (const e of p.examples) {
    const got = p.buildSteps(e.input).at(-1)!.result?.title;
    if (got !== e.output) { console.log(`FAIL ${p.slug} [${e.label}]: declared ${e.output}, animation says ${got}`); failed++; }
  }
}
if (failed) { console.log(`\n${failed} problem(s) failed`); process.exit(1); }
console.log('\nALL OK');
