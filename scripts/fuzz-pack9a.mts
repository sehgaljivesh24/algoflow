/**
 * Fuzz for pack p9 fragment a: Replace Words, Add and Search Words, Maximum XOR, Weighted Union-Find Ratios,
 * Number of Islands II, Union-Find with Rollback. Random raw inputs go through parseInput, the animation's final
 * result is compared with a plain reference, and every step goes through checkScene.
 * Run:  node scripts/fuzz-pack9a.mts   (env FUZZ_N=200, FUZZ_ONLY=<slug part>)
 */
import { rng } from '../src/problems/graphKit.ts';
import { checkScene } from './check-scenes.mts';
import { replaceWords } from '../src/problems/p9/replaceWords.ts';
import { designAddAndSearchWords } from '../src/problems/p9/designAddAndSearchWords.ts';
import { maximumXor } from '../src/problems/p9/maximumXor.ts';
import { weightedUnionFind } from '../src/problems/p9/weightedUnionFind.ts';
import { numberOfIslandsII } from '../src/problems/p9/numberOfIslandsII.ts';
import { unionFindRollback } from '../src/problems/p9/unionFindRollback.ts';

const N = Number(process.env.FUZZ_N ?? 200);
const ONLY = process.env.FUZZ_ONLY;
type R = () => number;
const ri = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T,>(r: R, a: T[]): T => a[ri(r, 0, a.length - 1)];
const word = (r: R, alpha: string, lo: number, hi: number) => Array.from({ length: ri(r, lo, hi) }, () => alpha[ri(r, 0, alpha.length - 1)]).join('');

let failures = 0;
const fail = (slug: string, raw: string, msg: string) => {
  failures++;
  if (failures <= 25) console.log(`FAIL ${slug} [${raw}]: ${msg}`);
};

interface Case { slug: string; def: any; gen: (r: R) => string; ref: (input: any, result: string) => string | null; allowReject?: RegExp }
const cases: Case[] = [];

// ------------------------------------------------------------------ 648
cases.push({
  slug: '648', def: replaceWords,
  gen: (r) => {
    const roots = Array.from({ length: ri(r, 1, 5) }, () => word(r, 'abc', 1, 4));
    const words = Array.from({ length: ri(r, 1, 6) }, () => word(r, 'abcd', 1, 7));
    return `${roots.join(' ')} | ${words.join(' ')}`;
  },
  ref: ({ roots, words }, res) => {
    const exp = words.map((w: string) => {
      let best: string | null = null;
      for (const x of roots) if (w.startsWith(x) && (best === null || x.length < best.length)) best = x;
      return best ?? w;
    }).join(' ');
    return res === `"${exp}"` ? null : `got ${res}, want "${exp}"`;
  },
});

// ------------------------------------------------------------------ 211
cases.push({
  slug: '211', def: designAddAndSearchWords, allowReject: /too many steps/,
  gen: (r) => {
    const ops: string[] = [];
    const added: string[] = [];
    for (let i = 0; i < ri(r, 2, 9); i++) {
      if (added.length < 4 && (i === 0 || r() < 0.5)) { const w = word(r, 'abc', 1, 4); added.push(w); ops.push(`add:${w}`); }
      else {
        const base = added.length && r() < 0.7 ? pick(r, added) : word(r, 'abc', 1, 4);
        ops.push(`search:${[...base].map((c) => (r() < 0.35 ? '.' : c)).join('')}`);
      }
    }
    return ops.join(' ');
  },
  ref: ({ ops }, res) => {
    const stored: string[] = [];
    const out: string[] = [];
    for (const o of ops) {
      if (o.op === 'add') { stored.push(o.word); out.push('null'); }
      else out.push(String(stored.some((s) => s.length === o.word.length && [...o.word].every((c, i) => c === '.' || c === s[i]))));
    }
    const exp = `[${out.join(', ')}]`;
    return res === exp ? null : `got ${res}, want ${exp}`;
  },
});

// ------------------------------------------------------------------ 421
cases.push({
  slug: '421', def: maximumXor,
  gen: (r) => Array.from({ length: ri(r, 1, 7) }, () => ri(r, 0, 15)).join(' '),
  ref: ({ nums }, res) => {
    let best = 0;
    for (const a of nums) for (const b of nums) best = Math.max(best, a ^ b);
    return res === String(best) ? null : `got ${res}, want ${best}`;
  },
});

// ------------------------------------------------------------------ weighted DSU
cases.push({
  slug: 'weighted', def: weightedUnionFind, allowReject: /contradict/,
  gen: (r) => {
    const L = 'abcdefg';
    const k = ri(r, 1, 6);
    const eqs: string[] = [];
    for (let i = 0; i < k; i++) {
      let a = L[ri(r, 0, 5)];
      let b = L[ri(r, 0, 5)];
      while (b === a) b = L[ri(r, 0, 5)];
      eqs.push(`${a}/${b}=${ri(r, 1, 9)}`);
    }
    const qs = Array.from({ length: ri(r, 1, 5) }, () => `${L[ri(r, 0, 6)]}/${L[ri(r, 0, 6)]}`);
    return `${eqs.join(' ')} | ${qs.join(' ')}`;
  },
  ref: ({ eqs, queries }, res) => {
    const adj = new Map<string, [string, number][]>();
    const add = (u: string, v: string, f: number) => { adj.set(u, [...(adj.get(u) ?? []), [v, f]]); };
    for (const e of eqs) { add(e.a, e.b, e.k); add(e.b, e.a, 1 / e.k); }
    const exp = queries.map((q: any) => {
      if (!adj.has(q.a) || !adj.has(q.b)) return -1;
      const seen = new Map<string, number>([[q.a, 1]]);
      const st = [q.a];
      while (st.length) { const u = st.pop()!; for (const [v, f] of adj.get(u)!) if (!seen.has(v)) { seen.set(v, seen.get(u)! * f); st.push(v); } }
      return seen.has(q.b) ? seen.get(q.b)! : -1;
    });
    const got = res.slice(1, -1).split(', ').map(Number);
    if (got.length !== exp.length) return `got ${res}, want ${exp.length} answers`;
    for (let i = 0; i < exp.length; i++) if (Math.abs(got[i] - exp[i]) > 1e-4) return `query ${i}: got ${got[i]}, want ${exp[i]}`;
    return null;
  },
});

// ------------------------------------------------------------------ 305
cases.push({
  slug: '305', def: numberOfIslandsII,
  gen: (r) => {
    const m = ri(r, 1, 5);
    const n = ri(r, 1, 5);
    return `${m}x${n} | ${Array.from({ length: ri(r, 1, 8) }, () => `${ri(r, 0, m - 1)},${ri(r, 0, n - 1)}`).join(' ')}`;
  },
  ref: ({ m, n, pos }, res) => {
    const land = Array.from({ length: m }, () => Array<boolean>(n).fill(false));
    const out: number[] = [];
    for (const [r0, c0] of pos) {
      land[r0][c0] = true;
      const seen = Array.from({ length: m }, () => Array<boolean>(n).fill(false));
      let cnt = 0;
      for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
        if (!land[r][c] || seen[r][c]) continue;
        cnt++;
        const st: [number, number][] = [[r, c]];
        seen[r][c] = true;
        while (st.length) {
          const [a, b] = st.pop()!;
          for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = a + da;
            const y = b + db;
            if (x >= 0 && x < m && y >= 0 && y < n && land[x][y] && !seen[x][y]) { seen[x][y] = true; st.push([x, y]); }
          }
        }
      }
      out.push(cnt);
    }
    const exp = `[${out.join(', ')}]`;
    return res === exp ? null : `got ${res}, want ${exp}`;
  },
});

// ------------------------------------------------------------------ rollback
cases.push({
  slug: 'rollback', def: unionFindRollback,
  gen: (r) => {
    const n = ri(r, 2, 7);
    const ops: string[] = [];
    const k = ri(r, 2, 12);
    let live = 0;
    for (let i = 0; i < k; i++) {
      const x = r();
      if (x < 0.15 && live > 0 && r() < 0.9) ops.push('undo'); // may waste a live count if the union was a no-op: parse validates for us
      else if (x < 0.6) ops.push(`u:${ri(r, 0, n - 1)}-${ri(r, 0, n - 1)}`);
      else ops.push(`q:${ri(r, 0, n - 1)}-${ri(r, 0, n - 1)}`);
      live += ops[ops.length - 1].startsWith('u') ? 1 : 0;
    }
    if (!ops.some((o) => o.startsWith('q'))) ops.push(`q:0-${n - 1}`);
    return `${n} | ${ops.join(' ')}`;
  },
  allowReject: /undo|operations/,
  ref: ({ n, ops }, res) => {
    const edges: [number, number][] = [];
    const conn = (a: number, b: number) => {
      const seen = new Set([a]);
      const st = [a];
      while (st.length) { const u = st.pop()!; for (const [x, y] of edges) { const v = x === u ? y : y === u ? x : -1; if (v >= 0 && !seen.has(v)) { seen.add(v); st.push(v); } } }
      return seen.has(b);
    };
    void n;
    const out: string[] = [];
    for (const o of ops) {
      if (o.op === 'u') { if (!conn(o.a, o.b)) edges.push([o.a, o.b]); }
      else if (o.op === 'undo') edges.pop();
      else out.push(String(conn(o.a, o.b)));
    }
    const exp = `[${out.join(', ')}]`;
    return res === exp ? null : `got ${res}, want ${exp}`;
  },
});

const noop = () => {};
for (const c of cases) {
  if (ONLY && !c.slug.includes(ONLY)) continue;
  const r = rng(c.slug.length * 7919 + 17);
  let ran = 0;
  let rejected = 0;
  let maxSteps = 0;
  for (let t = 0; t < N; t++) {
    const raw = c.gen(r);
    let input: any;
    try {
      input = c.def.parseInput(raw);
    } catch (e) {
      const msg = String((e as Error).message);
      if (c.allowReject && c.allowReject.test(msg)) { rejected++; continue; }
      fail(c.slug, raw, `parseInput rejected a valid input: ${msg}`);
      continue;
    }
    let steps: any[];
    try {
      steps = c.def.buildSteps(input);
    } catch (e) {
      fail(c.slug, raw, `buildSteps threw: ${(e as Error).message}`);
      continue;
    }
    ran++;
    maxSteps = Math.max(maxSteps, steps.length);
    if (steps.length > 400) fail(c.slug, raw, `${steps.length} steps`);
    const last = steps[steps.length - 1];
    if (!last?.result) { fail(c.slug, raw, 'no result on the last step'); continue; }
    const msg = c.ref(input, last.result.title);
    if (msg) fail(c.slug, raw, msg);
    let bad = 0;
    steps.forEach((s, i) => checkScene(s, `${c.slug} step ${i}`, (name, cond, extra) => { if (!cond && bad++ < 2) fail(c.slug, raw, `${name} ${extra ?? ''}`); }));
    for (const s of steps) {
      if (!c.def.varLabels.every((k: string) => k in s.vars)) { fail(c.slug, raw, 'vars missing'); break; }
      if (s.javaLines.some((l: number) => l >= c.def.java.length) || s.pyLines.some((l: number) => l >= c.def.python.length) || s.algoStep >= c.def.algorithm.length) { fail(c.slug, raw, 'line index out of range'); break; }
    }
  }
  console.log(`${c.slug}: ran ${ran}, rejected ${rejected}, max steps ${maxSteps}`);
}
void noop;
console.log(failures ? `\n${failures} FUZZ FAILURE(S)` : '\nFUZZ OK');
process.exit(failures ? 1 : 0);
