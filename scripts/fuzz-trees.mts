/**
 * Fuzz test for the tree problems: random inputs, final animation result vs a plain reference.
 * Run:  node scripts/fuzz-trees.mts        (exits non-zero on any mismatch)
 *   env FUZZ_ONLY=<slug part>  run a subset;  FUZZ_N=<count>  cases per problem (default 200)
 */
import type { AnyProblem } from '../src/engine/types.ts';
import { trees } from '../src/problems/groups/trees.ts';

// ------------------------------------------------------------------ rng + generators
let seed = 20240607;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = <X,>(xs: X[]) => xs[ri(0, xs.length - 1)];
const shuffle = <X,>(xs: X[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = ri(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

type Tok = number | null;
/** Random tree *shape* as a tree of objects; values assigned by `val`. */
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
const preorderNodes = (t: T | null): T[] => (t ? [t, ...preorderNodes(t.l), ...preorderNodes(t.r)] : []);
const size = (t: T | null): number => (t ? 1 + size(t.l) + size(t.r) : 0);

/** LeetCode level-order tokens (children of null are not listed, trailing nulls trimmed). */
function toTokens(root: T): Tok[] {
  const out: Tok[] = [];
  const q: (T | null)[] = [root];
  for (let i = 0; i < q.length; i++) {
    const n = q[i];
    if (!n) {
      out.push(null);
      continue;
    }
    out.push(n.v);
    q.push(n.l, n.r);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}
const lvl = (root: T | null) => (root ? `[${toTokens(root).map((x) => (x === null ? 'null' : x)).join(',')}]` : '[]');
const clone = (t: T | null): T | null => (t ? { v: t.v, l: clone(t.l), r: clone(t.r) } : null);

/** Random tree with values drawn from `vals` (small range => many duplicates). */
function randTree(maxN = 12, lo = -4, hi = 9, density = 0.65): T {
  const t = randShape(maxN, density);
  for (const n of preorderNodes(t)) n.v = ri(lo, hi);
  return t;
}
function randTreeUnique(maxN = 12, density = 0.65): T {
  const t = randShape(maxN, density);
  const vals = shuffle(Array.from({ length: 30 }, (_, i) => i + 1));
  preorderNodes(t).forEach((n, i) => (n.v = vals[i]));
  return t;
}
/** Valid BST (distinct keys) with a random shape. */
function randBst(maxN = 12): T {
  const t = randShape(maxN, 0.7);
  const vals = shuffle(Array.from({ length: 40 }, (_, i) => i - 10)).slice(0, size(t)).sort((a, b) => a - b);
  let i = 0;
  const fill = (n: T | null) => {
    if (!n) return;
    fill(n.l);
    n.v = vals[i++];
    fill(n.r);
  };
  fill(t);
  return t;
}
const txt = (t: T) => toTokens(t).map((x) => (x === null ? 'null' : x)).join(' ');

// ------------------------------------------------------------------ cases
interface Case { slug: string; gen: () => string; ref: (raw: string) => string; check?: (raw: string, got: string, steps: any[]) => void }
const parseT = (raw: string): T => {
  const toks = raw.split(/\s+/).map((s) => (s === 'null' ? null : Number(s)));
  const root: T = { v: toks[0]!, l: null, r: null };
  const q = [root];
  let i = 1;
  for (let k = 0; k < q.length && i < toks.length; k++) {
    for (const side of ['l', 'r'] as const) {
      if (i >= toks.length) break;
      const x = toks[i++];
      if (x !== null) {
        q[k][side] = { v: x, l: null, r: null };
        q.push(q[k][side]!);
      }
    }
  }
  return root;
};
const levels = (t: T): number[][] => {
  const out: number[][] = [];
  const go = (n: T | null, d: number) => {
    if (!n) return;
    (out[d] ??= []).push(n.v);
    go(n.l, d + 1);
    go(n.r, d + 1);
  };
  go(t, 0);
  return out;
};
const lists = (xs: number[][]) => `[${xs.map((l) => `[${l.join(',')}]`).join(',')}]`;
const height = (t: T | null): number => (t ? 1 + Math.max(height(t.l), height(t.r)) : 0);
const mirror = (t: T | null): T | null => (t ? { v: t.v, l: mirror(t.r), r: mirror(t.l) } : null);
const treeTxt = () => txt(randTree());
const gen236 = (): string => {
  for (;;) {
    const t = randTreeUnique();
    const ns = preorderNodes(t);
    if (ns.length >= 2) {
      const [a, b] = shuffle(ns);
      return `${txt(t)} ; ${a.v} ${b.v}`;
    }
  }
};

const cases: Case[] = [
  { slug: '102-', gen: treeTxt, ref: (raw) => lists(levels(parseT(raw))) },
  {
    slug: '637-', gen: treeTxt,
    ref: (raw) => `[${levels(parseT(raw)).map((l) => String(Number((l.reduce((a, b) => a + b, 0) / l.length).toFixed(5)))).join(', ')}]`,
  },
  { slug: '103-', gen: treeTxt, ref: (raw) => lists(levels(parseT(raw)).map((l, d) => (d % 2 ? [...l].reverse() : l))) },
  {
    slug: '199-', gen: treeTxt,
    ref: (raw) => {
      // right-first DFS, keep the first node seen at each depth
      const seen: number[] = [];
      const go = (n: T | null, d: number) => {
        if (!n) return;
        if (seen.length === d) seen.push(n.v);
        go(n.r, d + 1);
        go(n.l, d + 1);
      };
      go(parseT(raw), 0);
      return `[${seen.join(',')}]`;
    },
  },
  {
    slug: '101-',
    gen: () => {
      // half the time make a genuinely symmetric tree
      if (rnd() < 0.5) {
        const half = randTree(5, 1, 3);
        const root: T = { v: ri(1, 3), l: half, r: mirror(half) };
        if (rnd() < 0.3 && root.r) root.r.v = ri(1, 3);
        if (size(root) <= 12) return txt(root);
      }
      return txt(randTree(12, 1, 2, 0.75));
    },
    ref: (raw) => {
      const t = parseT(raw);
      return String(lvl(t) === lvl(mirror(t)) && JSON.stringify(t) === JSON.stringify(mirror(t)));
    },
  },
  {
    slug: '543-', gen: treeTxt,
    ref: (raw) => {
      // brute force: BFS distance between every pair of nodes in the undirected tree
      const nodes = preorderNodes(parseT(raw));
      const idx = new Map(nodes.map((n, i) => [n, i]));
      const adj = nodes.map(() => [] as number[]);
      for (const n of nodes) for (const c of [n.l, n.r]) if (c) { adj[idx.get(n)!].push(idx.get(c)!); adj[idx.get(c)!].push(idx.get(n)!); }
      let best = 0;
      for (let s = 0; s < nodes.length; s++) {
        const d = Array(nodes.length).fill(-1);
        d[s] = 0;
        const q = [s];
        for (let i = 0; i < q.length; i++) for (const w of adj[q[i]]) if (d[w] < 0) { d[w] = d[q[i]] + 1; q.push(w); }
        best = Math.max(best, ...d);
      }
      return String(best);
    },
  },
  { slug: '226-', gen: treeTxt, ref: (raw) => lvl(mirror(parseT(raw))) },
  {
    slug: '110-', gen: () => (rnd() < 0.5 ? txt(randTree(12, 1, 9, 0.85)) : txt(randTree())),
    ref: (raw) => {
      const ok = (t: T | null): boolean => !t || (ok(t.l) && ok(t.r) && Math.abs(height(t.l) - height(t.r)) <= 1);
      return String(ok(parseT(raw)));
    },
  },

  {
    slug: '108-', gen: () => String(Array.from({ length: ri(1, 12) }, () => 0).map((_, i) => i).map((i) => i * 3 + ri(0, 2) - 10).join(' ')),
    ref: (raw) => {
      const nums = raw.split(' ').map(Number);
      const mk = (lo: number, hi: number): T | null => (lo > hi ? null : (() => { const m = Math.floor((lo + hi) / 2); return { v: nums[m], l: mk(lo, m - 1), r: mk(m + 1, hi) }; })());
      const t = mk(0, nums.length - 1)!;
      return lvl(t);
    },
    check: (raw, got) => {
      // independent property check on what the animation produced: BST + balanced + same elements
      const nums = raw.split(' ').map(Number);
      const t = parseT(got.slice(1, -1).split(',').join(' '));
      const seq: number[] = [];
      const io = (n: T | null) => { if (n) { io(n.l); seq.push(n.v); io(n.r); } };
      io(t);
      const bal = (n: T | null): boolean => !n || (bal(n.l) && bal(n.r) && Math.abs(height(n.l) - height(n.r)) <= 1);
      if (JSON.stringify(seq) !== JSON.stringify(nums)) throw new Error('inorder differs from input: ' + got);
      if (!bal(t)) throw new Error('not height-balanced: ' + got);
    },
  },
  { slug: '114-', gen: treeTxt, ref: (raw) => `[${preorderNodes(parseT(raw)).map((n) => n.v).join(',')}]` },
  {
    slug: '98-',
    gen: () => {
      const r = rnd();
      if (r < 0.4) return txt(randBst());
      if (r < 0.7) {
        const t = randBst();
        const ns = preorderNodes(t);
        pick(ns).v = ri(-10, 30);
        return txt(t);
      }
      return txt(randTree(12, 0, 6, 0.7));
    },
    ref: (raw) => {
      const seq: number[] = [];
      const io = (n: T | null) => { if (n) { io(n.l); seq.push(n.v); io(n.r); } };
      io(parseT(raw));
      return String(seq.every((v, i) => i === 0 || v > seq[i - 1]));
    },
  },
  {
    slug: '236-',
    gen: () => {
      const t = randTreeUnique();
      const ns = preorderNodes(t);
      if (ns.length < 2) return gen236();
      const [a, b] = shuffle(ns);
      return `${txt(t)} ; ${a.v} ${b.v}`;
    },
    ref: (raw) => {
      const [tt, pq] = raw.split(';');
      const [p, q] = pq.trim().split(' ').map(Number);
      const t = parseT(tt.trim());
      const path = (n: T | null, x: number): number[] | null => {
        if (!n) return null;
        if (n.v === x) return [n.v];
        const sub = path(n.l, x) ?? path(n.r, x);
        return sub ? [n.v, ...sub] : null;
      };
      const a = path(t, p)!;
      const b = path(t, q)!;
      let k = 0;
      while (k < a.length && k < b.length && a[k] === b[k]) k++;
      return String(a[k - 1]);
    },
  },

  {
    slug: '230-',
    gen: () => {
      const t = randBst();
      return `${txt(t)} ; ${ri(1, size(t))}`;
    },
    ref: (raw) => {
      const [tt, k] = raw.split(';');
      const seq: number[] = [];
      const io = (n: T | null) => { if (n) { io(n.l); seq.push(n.v); io(n.r); } };
      io(parseT(tt.trim()));
      return String([...seq].sort((a, b) => a - b)[Number(k) - 1]);
    },
  },
  {
    slug: '94-',
    gen: treeTxt,
    ref: (raw) => {
      const seq: number[] = [];
      const io = (n: T | null) => { if (n) { io(n.l); seq.push(n.v); io(n.r); } };
      io(parseT(raw));
      return `[${seq.join(',')}]`;
    },
  },
  {
    slug: '105-',
    gen: () => {
      const t = randTreeUnique();
      const pre = preorderNodes(t).map((n) => n.v);
      const ino: number[] = [];
      const io = (n: T | null) => { if (n) { io(n.l); ino.push(n.v); io(n.r); } };
      io(t);
      return `${pre.join(' ')} ; ${ino.join(' ')}`;
    },
    // expected: the tree the generator started from; recover it from the same raw string via a second construction
    ref: (raw) => {
      const [a, b] = raw.split(';').map((x) => x.trim().split(' ').map(Number));
      const mk = (pl: number[], il: number[]): T | null => {
        if (!pl.length) return null;
        const m = il.indexOf(pl[0]);
        return { v: pl[0], l: mk(pl.slice(1, 1 + m), il.slice(0, m)), r: mk(pl.slice(1 + m), il.slice(m + 1)) };
      };
      return lvl(mk(a, b));
    },
  },
  {
    slug: '297-', gen: treeTxt,
    ref: (raw) => {
      const out: string[] = [];
      const w = (n: T | null) => { if (!n) { out.push('#'); return; } out.push(String(n.v)); w(n.l); w(n.r); };
      w(parseT(raw));
      return out.join(',');
    },
    check: (raw, _got, steps) => {
      const last = steps[steps.length - 1].scene;
      const nodes = last.nodes as { id: number; value: number; left: number | null; right: number | null }[];
      const back = (id: number | null): T | null => (id === null ? null : { v: nodes[id].value, l: back(nodes[id].left), r: back(nodes[id].right) });
      if (lvl(back(0)) !== lvl(parseT(raw))) throw new Error('rebuilt tree differs: ' + lvl(back(0)));
    },
  },
  {
    slug: '112-',
    gen: () => {
      const t = randTree(12, -3, 9);
      const sums: number[] = [];
      const go = (n: T | null, acc: number) => { if (!n) return; if (!n.l && !n.r) sums.push(acc + n.v); go(n.l, acc + n.v); go(n.r, acc + n.v); };
      go(t, 0);
      const target = rnd() < 0.5 ? pick(sums) : pick(sums) + ri(-2, 2);
      return `${txt(t)} ; ${target}`;
    },
    ref: (raw) => {
      const [tt, tg] = raw.split(';');
      const sums: number[] = [];
      const go = (n: T | null, acc: number) => { if (!n) return; if (!n.l && !n.r) sums.push(acc + n.v); go(n.l, acc + n.v); go(n.r, acc + n.v); };
      go(parseT(tt.trim()), 0);
      return String(sums.includes(Number(tg)));
    },
  },

  {
    slug: '113-',
    gen: () => {
      const t = randTree(12, -3, 9);
      const sums: number[] = [];
      const go = (n: T | null, acc: number) => { if (!n) return; if (!n.l && !n.r) sums.push(acc + n.v); go(n.l, acc + n.v); go(n.r, acc + n.v); };
      go(t, 0);
      const target = rnd() < 0.7 ? pick(sums) : pick(sums) + ri(-2, 2);
      return `${txt(t)} ; ${target}`;
    },
    ref: (raw) => {
      const [tt, tg] = raw.split(';');
      const out: number[][] = [];
      const go = (n: T | null, path: number[]) => {
        if (!n) return;
        const p = [...path, n.v];
        if (!n.l && !n.r && p.reduce((a, b) => a + b, 0) === Number(tg)) out.push(p);
        go(n.l, p);
        go(n.r, p);
      };
      go(parseT(tt.trim()), []);
      return lists(out);
    },
  },
  {
    slug: '129-',
    gen: () => {
      for (;;) {
        const t = randTree(12, 0, 9, rnd() < 0.5 ? 0.45 : 0.65);
        let total = 0;
        let bad = false;
        const go = (n: T | null, cur: number) => { if (!n) return; const x = cur * 10 + n.v; if (x > 2147483647) bad = true; if (!n.l && !n.r) total += x; go(n.l, x); go(n.r, x); };
        go(t, 0);
        if (!bad && total <= 2147483647) return txt(t);
      }
    },
    ref: (raw) => {
      let total = 0;
      const go = (n: T | null, cur: number) => { if (!n) return; const x = cur * 10 + n.v; if (!n.l && !n.r) total += x; go(n.l, x); go(n.r, x); };
      go(parseT(raw), 0);
      return String(total);
    },
  },
  {
    slug: '124-', gen: () => txt(randTree(12, -9, 9)),
    ref: (raw) => {
      // brute force: start a walk from every node, never go back to the node we came from, take the max prefix sum
      const nodes = preorderNodes(parseT(raw));
      const idx = new Map(nodes.map((n, i) => [n, i]));
      const adj = nodes.map(() => [] as number[]);
      for (const n of nodes) for (const c of [n.l, n.r]) if (c) { adj[idx.get(n)!].push(idx.get(c)!); adj[idx.get(c)!].push(idx.get(n)!); }
      let best = -Infinity;
      const walk = (u: number, from: number, acc: number) => {
        acc += nodes[u].v;
        best = Math.max(best, acc);
        for (const w of adj[u]) if (w !== from) walk(w, u, acc);
      };
      for (let s0 = 0; s0 < nodes.length; s0++) walk(s0, -1, 0);
      return String(best);
    },
  },
];

// ------------------------------------------------------------------ runner
const N = Number(process.env.FUZZ_N ?? 200);
const only = process.env.FUZZ_ONLY;
const bySlug = new Map<string, AnyProblem>();
for (const p of trees) bySlug.set(p.slug, p);
let bad = 0;
let ran = 0;
for (const c of cases) {
  if (only && !c.slug.includes(only)) continue;
  const def = [...bySlug.values()].find((p) => p.slug.startsWith(c.slug));
  if (!def) {
    console.log(`SKIP  ${c.slug} (not registered)`);
    continue;
  }
  let fails = 0;
  for (let i = 0; i < N; i++) {
    const raw = c.gen();
    try {
      const steps = def.buildSteps(def.parseInput(raw));
      const got = steps[steps.length - 1].result?.title;
      const want = c.ref(raw);
      c.check?.(raw, got!, steps);
      if (got !== want) {
        if (fails++ < 3) console.log(`MISMATCH ${def.slug}\n  input: ${raw}\n  got:   ${got}\n  want:  ${want}`);
      }
      if (steps.length > 400) throw new Error(`too many steps: ${steps.length}`);
    } catch (e) {
      if (fails++ < 3) console.log(`THREW ${def.slug}\n  input: ${raw}\n  ${(e as Error).message}`);
    }
  }
  ran++;
  bad += fails;
  console.log(`${fails ? 'FAIL' : 'ok  '}  ${def.slug}  (${N} cases${fails ? `, ${fails} bad` : ''})`);
}
console.log(bad ? `\n${bad} FAILURES` : `\nALL ${ran} PROBLEMS PASSED`);
process.exit(bad ? 1 : 0);
