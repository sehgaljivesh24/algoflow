/**
 * Fuzz test for pack p3 (trees + backtracking + divide & conquer): random inputs, final animation result vs a plain reference.
 * Run:  node scripts/fuzz-pack3.mts        (exits non-zero on any mismatch)
 *   env FUZZ_ONLY=<slug part>  run a subset;  FUZZ_N=<count>  cases per problem (default 200)
 */
import type { AnyProblem, Step } from '../src/engine/types.ts';
import { pack3 } from '../src/problems/groups/pack3.ts';

// ------------------------------------------------------------------ rng + helpers
let seed = 20240913;
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

// ------------------------------------------------------------------ trees
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
const preNodes = (t: T | null): T[] => (t ? [t, ...preNodes(t.l), ...preNodes(t.r)] : []);
const inNodes = (t: T | null): T[] => (t ? [...inNodes(t.l), t, ...inNodes(t.r)] : []);
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
function randTree(maxN = 12): T {
  const t = randShape(maxN);
  const vals = distinct(30, -20, 40);
  preNodes(t).forEach((n, i) => (n.v = ri(0, 3) === 0 ? ri(-5, 5) : vals[i]));
  return t;
}
/** Random BST with distinct values: insert shuffled values. */
function randBst(n: number): T {
  const vals = distinct(n, -30, 60);
  let root: T | null = null;
  for (const v of vals) {
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
function randBstSkewed(n: number): T {
  // sorted-ish insertion gives deeper trees
  const vals = distinct(n, -30, 60).sort((a, b) => a - b);
  const seq = rnd() < 0.5 ? vals : shuffle(vals).sort(() => (rnd() < 0.7 ? -1 : 1));
  let root: T | null = null;
  for (const v of seq) {
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

// ------------------------------------------------------------------ references
const refIn = (t: T | null): number[] => inNodes(t).map((n) => n.v);
const refPre = (t: T | null): number[] => preNodes(t).map((n) => n.v);
const kadane = (a: number[]) => { let cur = a[0], best = a[0]; for (let i = 1; i < a.length; i++) { cur = Math.max(a[i], cur + a[i]); best = Math.max(best, cur); } return best; };
const bruteRev = (a: number[]) => { let c = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > 2 * a[j]) c++; return c; };
function refWays(expr: string): number[] {
  const toks = expr.match(/\d+|[+\-*]/g)!;
  const go = (a: number, b: number): number[] => {
    if (a === b) return [Number(toks[a])];
    const out: number[] = [];
    for (let k = a + 1; k < b; k += 2) for (const x of go(a, k - 1)) for (const y of go(k + 1, b)) out.push(toks[k] === '+' ? x + y : toks[k] === '-' ? x - y : x * y);
    return out;
  };
  return go(0, toks.length - 1).sort((x, y) => x - y);
}
function refPal(s: string): string[] {
  const out: string[] = [];
  const go = (st: number, path: string[]) => {
    if (st === s.length) { out.push(`[${path.join(', ')}]`); return; }
    for (let e = st; e < s.length; e++) {
      const p = s.slice(st, e + 1);
      if (p === [...p].reverse().join('')) go(e + 1, [...path, p]);
    }
  };
  go(0, []);
  return out;
}
function refPermUnique(nums: number[]): string[] {
  const set = new Set<string>();
  const go = (rest: number[], path: number[]) => {
    if (!rest.length) { set.add(`[${path.join(',')}]`); return; }
    rest.forEach((v, i) => go([...rest.slice(0, i), ...rest.slice(i + 1)], [...path, v]));
  };
  go(nums, []);
  return [...set].sort();
}
function refLca(root: T, p: number, q: number): number {
  const path = (v: number) => { const out: T[] = []; let c: T | null = root; while (c) { out.push(c); if (v === c.v) break; c = v < c.v ? c.l : c.r; } return out; };
  const a = path(p), b = path(q);
  let last = a[0];
  for (let i = 0; i < Math.min(a.length, b.length) && a[i] === b[i]; i++) last = a[i];
  return last.v;
}
function refMaxTree(nums: number[]): T | null {
  const go = (lo: number, hi: number): T | null => {
    if (lo > hi) return null;
    let m = lo;
    for (let i = lo; i <= hi; i++) if (nums[i] > nums[m]) m = i;
    return { v: nums[m], l: go(lo, m - 1), r: go(m + 1, hi) };
  };
  return go(0, nums.length - 1);
}
function refBstPre(pre: number[]): T {
  let root: T | null = null;
  for (const v of pre) {
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

// ------------------------------------------------------------------ cases
type Case = { raw: string; expect: string; check?: (steps: Step[]) => string | null };
const lastScene = (steps: Step[]) => steps[steps.length - 1].scene as any;
const sceneInorder = (steps: Step[]) => {
  const sc = lastScene(steps);
  const out: number[] = [];
  const go = (id: number | null) => { if (id === null) return; go(sc.nodes[id].left); out.push(sc.nodes[id].value); go(sc.nodes[id].right); };
  go(sc.root);
  return out;
};

const gens: Record<string, () => Case> = {
  'alg-morris-inorder-traversal': () => { const t = randTree(); return { raw: raw(t), expect: `[${refIn(t).join(',')}]`, check: (s) => (lastScene(s).extraEdges?.length ? 'threads left over' : null) }; },
  '144-binary-tree-preorder-traversal': () => { const t = randTree(); return { raw: raw(t), expect: `[${refPre(t).join(',')}]`, check: (s) => (lastScene(s).extraEdges?.length ? 'threads left over' : null) }; },
  '99-recover-binary-search-tree': () => {
    const t = randBst(ri(2, 12));
    const ns = inNodes(t);
    const sorted = ns.map((n) => n.v);
    const i = ri(0, ns.length - 1);
    let j = ri(0, ns.length - 1);
    while (j === i) j = ri(0, ns.length - 1);
    [ns[i].v, ns[j].v] = [ns[j].v, ns[i].v];
    return {
      raw: raw(t), expect: `[${sorted.join(',')}]`,
      check: (s) => (sceneInorder(s).join() === sorted.join() ? null : `final tree inorder ${sceneInorder(s).join()} != ${sorted.join()}`),
    };
  },
  'alg-maximum-subarray-divide-and-conquer': () => { const a = Array.from({ length: ri(1, 10) }, () => ri(-9, 9)); return { raw: a.join(' '), expect: String(kadane(a)) }; },
  '493-reverse-pairs': () => { const a = Array.from({ length: ri(1, 10) }, () => ri(-9, 9)); return { raw: a.join(' '), expect: String(bruteRev(a)) }; },
  '241-different-ways-to-add-parentheses': () => {
    const k = ri(1, 5);
    let e = String(ri(0, 20));
    for (let i = 1; i < k; i++) e += '+-*'[ri(0, 2)] + ri(0, 20);
    return { raw: e, expect: `[${refWays(e).join(',')}]` };
  },
  '131-palindrome-partitioning': () => {
    const n = ri(1, 6);
    const alpha = ri(0, 1) ? 'ab' : 'abc';
    const s = Array.from({ length: n }, () => alpha[ri(0, alpha.length - 1)]).join('');
    return { raw: s, expect: refPal(s).join(' ') };
  },
  '47-permutations-ii': () => {
    const n = ri(1, 5);
    const a = Array.from({ length: n }, () => ri(0, 2));
    return { raw: a.join(' '), expect: refPermUnique(a).join(' ') };
  },
  '235-lowest-common-ancestor-of-a-binary-search-tree': () => {
    const t = ri(0, 1) ? randBst(ri(2, 12)) : randBstSkewed(ri(2, 12));
    const vals = inNodes(t).map((n) => n.v);
    const [p, q] = shuffle(vals).slice(0, 2);
    return { raw: `${raw(t)} ; ${p} ${q}`, expect: String(refLca(t, p, q)) };
  },
  '654-maximum-binary-tree': () => { const a = distinct(ri(1, 8), -9, 30); return { raw: a.join(' '), expect: lvl(refMaxTree(a)) }; },
  '1008-construct-binary-search-tree-from-preorder-traversal': () => { const t = ri(0, 1) ? randBst(ri(1, 10)) : randBstSkewed(ri(1, 10)); const a = refPre(t); return { raw: a.join(' '), expect: lvl(t) }; },
};

const N = Number(process.env.FUZZ_N ?? 200);
const only = process.env.FUZZ_ONLY;
let failed = 0;
const normalize = (p: AnyProblem, r: { title: string; text: string }): string => {
  if (p.slug === '131-palindrome-partitioning' || p.slug === '47-permutations-ii') {
    const parts = r.text.split(/ (?=\[)/);
    return p.slug === '47-permutations-ii' ? parts.sort().join(' ') : parts.join(' ');
  }
  return r.title;
};
for (const p of pack3) {
  if (only && !p.slug.includes(only)) continue;
  const gen = gens[p.slug];
  if (!gen) { console.log(`FAIL ${p.slug}: no fuzz generator`); failed++; continue; }
  let bad = 0, skipped = 0, maxSteps = 0;
  for (let k = 0; k < N; k++) {
    const c = gen();
    let input;
    try {
      input = p.parseInput(c.raw);
    } catch (e) {
      // inputs that need more than 400 steps (or a cap) are legitimately rejected by parseInput
      if (/400 animation steps|too long|12 nodes/.test(String(e))) { skipped++; continue; }
      bad++;
      if (bad <= 3) console.log(`FAIL ${p.slug}: parseInput rejected "${c.raw}": ${e}`);
      continue;
    }
    const steps = p.buildSteps(input);
    maxSteps = Math.max(maxSteps, steps.length);
    const res = steps[steps.length - 1].result;
    const got = res ? normalize(p, res) : '(no result)';
    const expect = p.slug === '47-permutations-ii' ? c.expect.split(' ').sort().join(' ') : c.expect;
    const extra = c.check?.(steps) ?? null;
    if (got !== expect || extra || steps.length > 400) {
      bad++;
      if (bad <= 3) console.log(`FAIL ${p.slug}: input "${c.raw}" expected ${expect} got ${got}${extra ? ` (${extra})` : ''} steps=${steps.length}`);
    }
  }
  if (bad) failed++;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${p.slug}: ${N - skipped - bad}/${N - skipped} correct (skipped ${skipped}, max steps ${maxSteps})`);
}
console.log(failed ? `\n${failed} problem(s) FAILED` : '\nALL FUZZ TESTS PASSED');
process.exit(failed ? 1 : 0);
