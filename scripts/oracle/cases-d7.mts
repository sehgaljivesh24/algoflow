import type { Step } from '../../src/engine/types.ts';
import type { CaseModule, State } from './types.ts';
import { cellValues, num, ptr, rarr, rint, rng, rstr, sceneOfKind, scenesOf } from './util.ts';

/**
 * Batch d7 — bit tricks, number theory, linear sorts, string matching (KMP / Z / rolling hash / Manacher), compression, meet in the middle,
 * reservoir sampling. Every oracle below is written from the textbook algorithm (no import of the problem modules or their kits).
 */

/* ------------------------------------------------------------------ helpers */
const shuffle = <T,>(r: () => number, a: T[]): T[] => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};
/** k distinct integers in [lo, hi]. */
const distinct = (r: () => number, k: number, lo: number, hi: number): number[] => shuffle(r, Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)).slice(0, k);
const gridRows = (step: Step) => (sceneOfKind(step, 'grid')?.rows ?? []);
/** value of a grid cell: '·' / '?' / '—' placeholders become null, numeric strings become numbers. */
const cv = (v: unknown): string | number | null => (v === '·' || v === '?' || v === '—' || v === undefined ? null : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : (v as string | number));
const rowVals = (step: Step, row: number): (string | number | null)[] => (gridRows(step)[row] ?? []).map((c) => cv(c.value));
/** a row of binary digit cells (MSB first) read as a number; null when the row is a placeholder. */
const bitsNum = (step: Step, row: number): number | null => {
  const cs = gridRows(step)[row];
  if (!cs || cs.some((c) => c.value !== '0' && c.value !== '1')) return null;
  return parseInt(cs.map((c) => c.value).join(''), 2);
};
const auxItems = (step: Step, title: string): (string | number)[] => (step.aux ?? []).find((a) => a.title === title)?.items.map((x) => cv(x) as string | number) ?? [];
const varN = (step: Step, k: string): number | null => num(step, k);
/** a string-valued var as shown ('—' = unset becomes null). */
const shownStr = (step: Step, k: string): string | null => { const v = step.vars[k]; return v === undefined || v === '—' ? null : String(v); };

export const cases: CaseModule['cases'] = [];

/* ===================================================================== BIT TRICKS */

/* ---- 1310 XOR Queries of a Subarray */
{
  type In = { arr: number[]; queries: [number, number][] };
  cases.push({
    slug: '1310-xor-queries-of-a-subarray',
    gen: (r): In => {
      const n = rint(r, 1, 8);
      const arr = rarr(r, n, 1, 31);
      const queries = Array.from({ length: rint(r, 1, 4) }, () => { const l = rint(r, 0, n - 1); return [l, rint(r, l, n - 1)] as [number, number]; });
      return { arr, queries };
    },
    oracle: ({ arr, queries }): State[] => {
      const n = arr.length;
      const out: State[] = [];
      const pre = (k: number) => Array.from({ length: n + 1 }, (_, i) => (i < k ? px[i] : null));
      const px: number[] = [0];
      for (let i = 0; i < n; i++) px.push(px[i] ^ arr[i]);
      const ans: number[] = [];
      out.push({ j: 0, pj: 0, query: null, l: null, r: null, prefix: pre(1), answers: [] });
      for (let j = 1; j <= n; j++) out.push({ j, pj: px[j], query: null, l: null, r: null, prefix: pre(j + 1), answers: [] });
      queries.forEach(([l, rr], q) => {
        ans.push(px[rr + 1] ^ px[l]);
        out.push({ j: null, pj: null, query: q, l, r: rr, prefix: pre(n + 1), answers: ans.slice() });
      });
      out.push({ j: null, pj: null, query: null, l: null, r: null, prefix: pre(n + 1), answers: ans.slice() });
      return out;
    },
    project: (s) => ({ j: varN(s, 'j'), pj: varN(s, 'prefix[j]'), query: varN(s, 'query'), l: varN(s, 'l'), r: varN(s, 'r'), prefix: rowVals(s, 1) as number[], answers: auxItems(s, 'answers') as number[] }),
    invariants: [(s, _i, _st, { arr }) => { const p = rowVals(s, 1); let x = 0; for (let k = 0; k < p.length; k++) { if (k > 0) x ^= arr[k - 1]; if (p[k] !== null && p[k] !== x) return `prefix[${k}] shows ${p[k]}, expected ${x}`; } return null; }],
  });
}

/* ---- 477 Total Hamming Distance */
{
  type In = { nums: number[] };
  const W = 4;
  cases.push({
    slug: '477-total-hamming-distance',
    gen: (r): In => ({ nums: rarr(r, rint(r, 2, 6), 0, r() < 0.2 ? 3 : 15) }),
    oracle: ({ nums }): State[] => {
      const n = nums.length;
      const out: State[] = [];
      const ones: (number | null)[] = Array(W).fill(null);
      const pairs: (number | null)[] = Array(W).fill(null);
      let total = 0;
      const push = (bit: number | null, o: number | null, p: number | null) => out.push({ bit, ones: o, zeros: o === null ? null : n - o, pairs: p, total, onesRow: ones.slice(), pairsRow: pairs.slice() });
      push(null, null, null);
      for (let b = 0; b < W; b++) {
        const o = nums.filter((x) => ((x >> b) & 1) === 1).length;
        ones[b] = o;
        push(b, o, null);
        pairs[b] = o * (n - o);
        total += pairs[b]!;
        push(b, o, pairs[b]);
      }
      push(null, null, null);
      return out;
    },
    project: (s) => ({ bit: varN(s, 'bit'), ones: varN(s, 'ones'), zeros: varN(s, 'zeros'), pairs: varN(s, 'pairs'), total: varN(s, 'total'), onesRow: (rowVals(s, gridRows(s).length - 2) as number[]).slice().reverse(), pairsRow: (rowVals(s, gridRows(s).length - 1) as number[]).slice().reverse() }),
    invariants: [(s, _i, _st, { nums }) => { const n = nums.length; const b = varN(s, 'bit'); const o = varN(s, 'ones'); if (b === null || o === null) return null; const real = nums.filter((x) => ((x >> b) & 1) === 1).length; return real === o ? null : `ones ${o} != actual ${real} for bit ${b}`; }],
  });
}

/* ---- 2275 Largest Combination With AND > 0 */
{
  type In = { nums: number[] };
  const W = 6;
  cases.push({
    slug: '2275-largest-combination-with-bitwise-and-greater-than-zero',
    gen: (r): In => ({ nums: rarr(r, rint(r, 1, 8), 1, r() < 0.2 ? 7 : 63) }),
    oracle: ({ nums }): State[] => {
      const out: State[] = [];
      const ones: (number | null)[] = Array(W).fill(null);
      let best = 0, bestBit = -1;
      const push = (bit: number | null, o: number | null) => out.push({ bit, ones: o, best, bestBit: bestBit < 0 ? null : bestBit, onesRow: ones.slice() });
      push(null, null);
      for (let b = 0; b < W; b++) {
        const o = nums.filter((x) => ((x >> b) & 1) === 1).length;
        ones[b] = o;
        if (o > best) { best = o; bestBit = b; }
        push(b, o);
      }
      push(null, null);
      return out;
    },
    project: (s) => ({ bit: varN(s, 'bit'), ones: varN(s, 'ones'), best: varN(s, 'best'), bestBit: varN(s, 'best bit'), onesRow: (rowVals(s, gridRows(s).length - 1) as number[]).slice().reverse() }),
  });
}

/* ---- 136 Single Number */
{
  type In = { nums: number[] };
  cases.push({
    slug: '136-single-number',
    gen: (r): In => {
      const pairs = rint(r, 0, 5);
      const vals = distinct(r, pairs + 1, 0, r() < 0.2 ? 7 : 63);
      const nums: number[] = [vals[0]];
      for (let i = 1; i <= pairs; i++) nums.push(vals[i], vals[i]);
      return { nums: shuffle(r, nums) };
    },
    oracle: ({ nums }): State[] => {
      const out: State[] = [{ i: null, x: null, xor: 0, xorRow: 0 }];
      let x = 0;
      nums.forEach((v, i) => { x ^= v; out.push({ i, x: v, xor: x, xorRow: x }); });
      out.push({ i: null, x: null, xor: x, xorRow: x });
      return out;
    },
    project: (s) => ({ i: varN(s, 'i'), x: varN(s, 'x'), xor: varN(s, 'xor'), xorRow: bitsNum(s, gridRows(s).length - 1) }),
    invariants: [(s, _i, _st, { nums }) => { const i = varN(s, 'i'); if (i === null) return null; let x = 0; for (let k = 0; k <= i; k++) x ^= nums[k]; return x === varN(s, 'xor') ? null : `xor ${varN(s, 'xor')} != xor of nums[0..${i}] = ${x}`; }],
  });
}

/* ---- 137 Single Number II */
{
  type In = { nums: number[] };
  const W = 6;
  cases.push({
    slug: '137-single-number-ii',
    gen: (r): In => {
      const triples = rint(r, 0, 3);
      const vals = distinct(r, triples + 1, 0, r() < 0.2 ? 7 : 63);
      const nums: number[] = [vals[0]];
      for (let i = 1; i <= triples; i++) nums.push(vals[i], vals[i], vals[i]);
      return { nums: shuffle(r, nums) };
    },
    oracle: ({ nums }): State[] => {
      const out: State[] = [];
      const counts: (number | null)[] = Array(W).fill(null);
      const mods: (number | null)[] = Array(W).fill(null);
      let result = 0;
      const push = (bit: number | null, c: number | null, m: number | null) => out.push({ bit, count: c, mod3: m, result, counts: counts.slice(), mods: mods.slice() });
      push(null, null, null);
      for (let b = 0; b < W; b++) {
        const c = nums.filter((x) => ((x >> b) & 1) === 1).length;
        counts[b] = c;
        push(b, c, null);
        mods[b] = c % 3;
        if (c % 3) result |= 1 << b;
        push(b, c, c % 3);
      }
      push(null, null, null);
      return out;
    },
    project: (s) => {
      const rows = gridRows(s).length;
      return { bit: varN(s, 'bit'), count: varN(s, 'count'), mod3: varN(s, 'count % 3'), result: varN(s, 'result'), counts: (rowVals(s, rows - 2) as number[]).slice().reverse(), mods: (rowVals(s, rows - 1) as number[]).slice().reverse() };
    },
    invariants: [(s, _i, _st, { nums }) => {
      if (!s.result) return null;
      const cnt = new Map<number, number>();
      for (const v of nums) cnt.set(v, (cnt.get(v) ?? 0) + 1);
      const single = [...cnt.entries()].find(([, c]) => c === 1)![0];
      return Number(s.vars.result) === single ? null : `final result ${s.vars.result} != single ${single}`;
    }],
  });
}

/* ---- 260 Single Number III */
{
  type In = { nums: number[] };
  cases.push({
    slug: '260-single-number-iii',
    gen: (r): In => {
      const pairs = rint(r, 0, 4);
      const vals = distinct(r, pairs + 2, 0, r() < 0.2 ? 7 : 63);
      const nums: number[] = [vals[0], vals[1]];
      for (let i = 2; i < pairs + 2; i++) nums.push(vals[i], vals[i]);
      return { nums: shuffle(r, nums) };
    },
    oracle: ({ nums }): State[] => {
      const out: State[] = [];
      const grp: (number | null)[] = nums.map(() => null);
      let all = 0, diff = 0, a = 0, b = 0;
      const push = () => out.push({ all, diff: diff || null, a, b, group: grp.slice() });
      push();
      for (const v of nums) { all ^= v; push(); }
      diff = all & -all;
      push();
      nums.forEach((v, i) => { if (v & diff) { grp[i] = 1; a ^= v; } else { grp[i] = 0; b ^= v; } push(); });
      push();
      return out;
    },
    project: (s, { nums }) => {
      const rows = gridRows(s);
      const group = nums.map((_, i) => { const t = rows[i]?.[0]?.tone; return t === 'blue' ? 1 : t === 'orange' ? 0 : null; });
      return { all: varN(s, 'xor all'), diff: varN(s, 'diff'), a: varN(s, 'a'), b: varN(s, 'b'), group };
    },
    notes: 'the XOR-all / A / B bit rows of the grid are not compared (only the vars xor all, diff, a, b and the per-number group colour)',
  });
}

/* ---- 191 Number of 1 Bits */
{
  type In = { n: number };
  cases.push({
    slug: '191-number-of-1-bits',
    gen: (r): In => ({ n: r() < 0.15 ? 0 : r() < 0.2 ? 4095 : rint(r, 0, 4095) }),
    oracle: ({ n: n0 }): State[] => {
      const out: State[] = [{ n: n0, prev: null, count: 0, r0: n0, r1: null, r2: null }];
      let n = n0, count = 0;
      while (n !== 0) {
        const prev = n - 1;
        out.push({ n, prev, count, r0: n, r1: prev, r2: null });
        const next = n & prev;
        count++;
        out.push({ n: next, prev, count, r0: n, r1: prev, r2: next });
        n = next;
      }
      out.push({ n: 0, prev: null, count, r0: n0, r1: null, r2: null });
      return out;
    },
    project: (s) => ({ n: varN(s, 'n'), prev: varN(s, 'n-1'), count: varN(s, 'count'), r0: bitsNum(s, 0), r1: bitsNum(s, 1), r2: bitsNum(s, 2) }),
    notes: 'the n=0 case collapses (only Start and Done states); final answer popcount is checked by the count var',
    invariants: [(s, _i, _st, { n }) => { if (s.result) { const pc = n.toString(2).split('1').length - 1; return Number(s.vars.count) === pc ? null : `count ${s.vars.count} != popcount ${pc}`; } return null; }],
  });
}

/* ---- 231 Power of Two */
{
  type In = { n: number };
  cases.push({
    slug: '231-power-of-two',
    gen: (r): In => ({ n: r() < 0.35 ? 1 << rint(r, 0, 11) : r() < 0.15 ? -rint(r, 0, 4096) : rint(r, 0, 4095) }),
    oracle: ({ n }): State[] => {
      const m = (x: number) => x & 4095; // 12-bit two's complement, as the bit rows show negatives
      const out: State[] = [{ n, prev: null, and: null, r0: m(n), r1: null, r2: null }];
      if (n <= 0) { out.push({ n, prev: null, and: null, r0: m(n), r1: null, r2: null }); return out; }
      const prev = n - 1;
      out.push({ n, prev, and: null, r0: m(n), r1: m(prev), r2: null });
      out.push({ n, prev, and: n & prev, r0: m(n), r1: m(prev), r2: m(n & prev) });
      return out;
    },
    project: (s) => ({ n: varN(s, 'n'), prev: varN(s, 'n-1'), and: varN(s, 'n & (n-1)'), r0: bitsNum(s, 0), r1: bitsNum(s, 1), r2: bitsNum(s, 2) }),
  });
}

/* ---- 338 Counting Bits */
{
  type In = { n: number };
  cases.push({
    slug: '338-counting-bits',
    gen: (r): In => ({ n: rint(r, 0, 16) }),
    oracle: ({ n }): State[] => {
      const out: State[] = [];
      const ans: (number | null)[] = Array(n + 1).fill(null);
      ans[0] = 0;
      out.push({ i: null, half: null, last: null, ansI: null, ans: ans.slice() });
      for (let i = 1; i <= n; i++) {
        const h = Math.floor(i / 2), last = i % 2;
        out.push({ i, half: h, last, ansI: null, ans: ans.slice() });
        ans[i] = (ans[h] as number) + last;
        out.push({ i, half: h, last, ansI: ans[i], ans: ans.slice() });
      }
      out.push({ i: null, half: null, last: null, ansI: null, ans: ans.slice() });
      return out;
    },
    project: (s) => ({ i: varN(s, 'i'), half: varN(s, 'i>>1'), last: varN(s, 'i&1'), ansI: varN(s, 'ans[i]'), ans: (sceneOfKind(s, 'array')?.cells ?? []).map((c) => cv(c.value)) as number[] }),
    invariants: [(s, _i, _st, { n }) => { if (!s.result) return null; const cells = (sceneOfKind(s, 'array')?.cells ?? []).map((c) => Number(c.value)); const pc = (x: number) => x.toString(2).split('1').length - 1; for (let i = 0; i <= n; i++) if (cells[i] !== pc(i)) return `final ans[${i}] = ${cells[i]} != popcount ${pc(i)}`; return null; }],
  });
}

/* ===================================================================== RESERVOIR SAMPLING */
// The animations draw from a fixed-seed mulberry32 (rng(seed) in util.ts is the same generator); the oracle replays those scripted draws.

/* ---- alg-reservoir-sampling-k-items */
{
  type In = { stream: number[]; k: number; seed: number };
  cases.push({
    slug: 'alg-reservoir-sampling-k-items',
    gen: (r): In => { const n = rint(r, 1, 12); return { stream: rarr(r, n, -99, 99), k: rint(r, 1, Math.min(6, n)), seed: rint(r, 0, 999) }; },
    oracle: ({ stream, k, seed }): State[] => {
      const rand = rng(seed);
      const res: (number | null)[] = Array(k).fill(null);
      const draws: string[] = [];
      const out: State[] = [];
      const size = () => res.filter((v) => v !== null).length;
      const chance = (i: number) => (i >= 0 ? `${Math.min(k, i + 1)} / ${i + 1}  (min(k, seen) / seen)` : null);
      let draw: number | null = null;
      out.push({ seen: 0, draw: null, slot: null, size: 0, res: res.slice(), draws: [], chance: null, next: null });
      stream.forEach((x, idx) => {
        const seen = idx + 1;
        let slot: number | null = null;
        if (seen <= k) { res[idx] = x; slot = idx; draw = null; }
        else {
          const j = Math.floor(rand() * seen);
          draw = j;
          draws.push(`item ${seen}: rand(0..${seen - 1}) = ${j} → ${j < k ? `replace slot ${j}` : 'skip'}`);
          if (j < k) { res[j] = x; slot = j; }
        }
        out.push({ seen, draw, slot, size: size(), res: res.slice(), draws: draws.slice(), chance: chance(idx), next: idx });
      });
      out.push({ seen: stream.length, draw, slot: null, size: size(), res: res.slice(), draws: draws.slice(), chance: chance(stream.length - 1), next: stream.length - 1 });
      return out;
    },
    project: (s) => {
      const arrays = scenesOf(s).filter((q) => q.kind === 'array') as { kind: 'array'; cells: { value: string | number }[] }[];
      return {
        seen: varN(s, 'seen'), draw: varN(s, 'draw'), slot: varN(s, 'slot'), size: varN(s, 'sample size'),
        res: (arrays[1]?.cells ?? []).map((c) => (c.value === '_' ? null : c.value)) as number[],
        draws: (s.aux ?? []).find((a) => a.title.startsWith('draws'))?.items.slice() ?? [],
        chance: (s.aux ?? []).find((a) => a.title.startsWith('chance'))?.items[0] ?? null,
        next: ptr(s, 'next'),
      };
    },
    notes: 'the highlight colour of the slot (fill vs replace) and the stream cell colours are not compared; the oracle replays the same fixed-seed mulberry32 draws the page shows',
  });
}

/* ---- 382 Linked List Random Node */
{
  type In = { vals: number[]; seed: number };
  cases.push({
    slug: '382-linked-list-random-node',
    gen: (r): In => ({ vals: rarr(r, rint(r, 1, 8), -99, r() < 0.3 ? 3 : 99), seed: rint(r, 0, 999) }),
    oracle: ({ vals, seed }): State[] => {
      const rand = rng(seed);
      const draws: string[] = [];
      const out: State[] = [{ i: 0, draw: null, pick: null, chance: null, cur: null, found: null, draws: [], chances: [] }];
      let chosen = -1, draw: number | null = null;
      vals.forEach((v, j) => {
        const seen = j + 1;
        const rr = Math.floor(rand() * seen);
        draw = rr;
        if (rr === 0) chosen = j;
        draws.push(`node ${seen}: rand(0..${seen - 1}) = ${rr} → ${rr === 0 ? 'keep' : 'skip'}`);
        out.push({ i: seen, draw, pick: vals[chosen], chance: `1/${seen}`, cur: j, found: chosen, draws: draws.slice(), chances: vals.slice(0, seen).map((x) => `${x}: 1/${seen}`) });
      });
      out.push({ i: vals.length, draw, pick: vals[chosen], chance: `1/${vals.length}`, cur: null, found: chosen, draws: draws.slice(), chances: vals.slice(0, vals.length).map((x) => `${x}: 1/${vals.length}`) });
      return out;
    },
    project: (s) => {
      const list = sceneOfKind(s, 'list');
      const found = (list?.nodes ?? []).findIndex((n) => n.state === 'found');
      return {
        i: varN(s, 'i'), draw: varN(s, 'draw'), pick: varN(s, 'pick'), chance: (s.vars['chance to replace'] === '—' ? null : String(s.vars['chance to replace'])),
        cur: ptr(s, 'cur'), found: found < 0 ? null : found,
        draws: (s.aux ?? []).find((a) => a.title.startsWith('draws'))?.items.slice() ?? [],
        chances: (s.aux ?? []).find((a) => a.title.startsWith('chance'))?.items.slice() ?? [],
      };
    },
    notes: 'node colours other than the "found" (current pick) node are not compared',
  });
}

/* ---- 398 Random Pick Index */
{
  type In = { nums: number[]; target: number; seed: number };
  cases.push({
    slug: '398-random-pick-index',
    gen: (r): In => {
      const nums = rarr(r, rint(r, 1, 10), -3, r() < 0.5 ? 2 : 6);
      return { nums, target: nums[rint(r, 0, nums.length - 1)], seed: rint(r, 0, 999) };
    },
    oracle: ({ nums, target, seed }): State[] => {
      const rand = rng(seed);
      const draws: string[] = [], matches: number[] = [];
      let chosen = -1, seen = 0, draw: number | null = null;
      const out: State[] = [{ i: null, seen: 0, draw: null, pick: null, matches: [], draws: [] }];
      nums.forEach((v, j) => {
        if (v === target) {
          seen++;
          matches.push(j);
          const rr = Math.floor(rand() * seen);
          draw = rr;
          if (rr === 0) chosen = j;
          draws.push(`match ${seen} (index ${j}): rand(0..${seen - 1}) = ${rr} → ${rr === 0 ? 'keep' : 'skip'}`);
        }
        out.push({ i: j, seen, draw, pick: chosen < 0 ? null : chosen, matches: matches.map(String), draws: draws.slice() });
      });
      out.push({ i: null, seen, draw, pick: chosen, matches: matches.map(String), draws: draws.slice() });
      return out;
    },
    project: (s) => ({
      i: varN(s, 'i'), seen: varN(s, 'matches seen'), draw: varN(s, 'draw'), pick: varN(s, 'pick'),
      matches: (s.aux ?? []).find((a) => a.title.startsWith('indices'))?.items.slice() ?? [],
      draws: (s.aux ?? []).find((a) => a.title.startsWith('draws'))?.items.slice() ?? [],
    }),
    notes: 'cell colours are not compared; only i, matches seen, draw, pick and the two aux lists',
  });
}

/* ===================================================================== NUMBER THEORY */

/** Final answer shown in the result banner (result.title), or null while the animation is still running. */
const resultTitle = (s: Step): string | null => (s.result ? s.result.title : null);

/* ---- 204 Count Primes (sieve of Eratosthenes) */
{
  type In = { n: number };
  cases.push({
    slug: '204-count-primes',
    gen: (r): In => ({ n: r() < 0.15 ? rint(r, 2, 5) : rint(r, 2, 60) }),
    oracle: ({ n }): State[] => {
      const comp = new Array<boolean>(n).fill(false);
      const out: State[] = [];
      let crossed = 0;
      const list = (f: (v: number) => boolean) => { const o: number[] = []; for (let v = 2; v < n; v++) if (f(v)) o.push(v); return o; };
      const push = (p: number | null, cur: number | null, hot: number[], final: boolean, answer: number | null = null) => {
        const hs = new Set(hot);
        out.push({
          p, p2: p === null ? null : p * p, crossed, unmarked: list((v) => !comp[v]).length, cur,
          hot, dim: list((v) => comp[v] && !hs.has(v) && v !== cur),
          found: list((v) => !comp[v] && !hs.has(v) && v !== cur && (final || (p !== null && v < p))), answer,
        });
      };
      push(null, null, [], false);
      let p = 2;
      for (; p * p < n; p++) {
        if (comp[p]) { push(p, p, [], false); continue; }
        const mult: number[] = [];
        for (let m = p * p; m < n; m += p) mult.push(m);
        push(p, p, mult, false);
        for (const m of mult) if (!comp[m]) { comp[m] = true; crossed++; }
        push(p, p, [], false);
      }
      push(null, null, [], true);
      push(null, null, [], true, list((v) => !comp[v]).length);
      return out;
    },
    project: (s) => {
      const cells = gridRows(s).flat().filter((c) => typeof c.value === 'number');
      const pick = (st: string) => cells.filter((c) => c.state === st && (c.value as number) >= 2).map((c) => c.value as number);
      const cur = pick('compare');
      return { p: varN(s, 'p'), p2: varN(s, 'p²'), crossed: varN(s, 'crossed'), unmarked: varN(s, 'unmarked'), cur: cur.length ? cur[0] : null, hot: pick('swap'), dim: pick('dim'), found: pick('found'), answer: s.result ? Number(s.result.title) : null };
    },
    notes: 'a highlighted cell (current p, multiples being crossed) is drawn over the dim/found colour, so the oracle excludes those from dim/found the same way; layout rows/columns are not checked',
  });
}

/* ---- 50 Pow(x, n) */
{
  type In = { x: number; n: number };
  // the page shows values rounded to 6 significant digits (5 for huge / tiny magnitudes) — the oracle applies the same display rounding
  const disp = (v: number): number => (Math.abs(v) >= 1e15 || (v !== 0 && Math.abs(v) < 1e-9) ? Number(v.toExponential(4)) : Number(v.toPrecision(6)));
  const parseDisp = (v: unknown): number | null => (v === undefined || v === '—' || v === '?' ? null : Number(v));
  cases.push({
    slug: '50-pow-x-n',
    gen: (r): In => {
      const x = r() < 0.5 ? rint(r, -10, 10) : rint(r, -40, 40) / 4;
      let n = rint(r, -20, 20);
      if (x === 0 && n <= 0) n = rint(r, 1, 20);
      return { x, n };
    },
    oracle: ({ x, n }): State[] => {
      const m0 = Math.abs(n);
      const bits = m0.toString(2).split('').reverse().map(Number);
      const L = bits.length;
      const baseRow: (number | null)[] = Array(L + 1).fill(null);
      const resRow: (number | null)[] = Array(L + 1).fill(null);
      baseRow[0] = x; resRow[0] = 1;
      let result = 1, base = x, m = m0;
      const out: State[] = [];
      const push = () => out.push({ m, result: disp(result), base: disp(base), bits, baseRow: baseRow.map((v) => (v === null ? null : disp(v))), resRow: resRow.map((v) => (v === null ? null : disp(v))) });
      push();
      for (let i = 0; m > 0; i++) { // textbook: while (m > 0) — no iteration at all for n = 0
        if (bits[i] === 1) result *= base;
        resRow[i + 1] = result;
        push();
        base *= base; m >>= 1; baseRow[i + 1] = base;
        push();
      }
      push();
      return out;
    },
    project: (s) => {
      const rows = gridRows(s);
      const L = (rows[0]?.length ?? 1) - 1;
      return {
        m: varN(s, 'm'), result: parseDisp(s.vars.result), base: parseDisp(s.vars.base),
        bits: (rows[0] ?? []).slice(0, L).map((c) => Number(c.value)),
        baseRow: (rows[1] ?? []).map((c) => parseDisp(c.value)), resRow: (rows[2] ?? []).map((c) => parseDisp(c.value)),
      };
    },
    notes: 'values compared after the page\'s own display rounding (6 significant digits); the final reciprocal for n < 0 is only shown in the title/description, not compared',
  });
}

/* ---- alg-euclids-gcd-and-lcm */
{
  type In = { a: number; b: number };
  cases.push({
    slug: 'alg-euclids-gcd-and-lcm',
    gen: (r): In => {
      const t = r();
      if (t < 0.15) return { a: rint(r, 1, 30), b: rint(r, 1, 30) };
      if (t < 0.25) { const g = rint(r, 1, 30); return { a: g * rint(r, 1, 30), b: g * rint(r, 1, 30) }; }
      return { a: rint(r, 1, 999), b: rint(r, 1, 999) };
    },
    oracle: ({ a: a0, b: b0 }): State[] => {
      const out: State[] = [];
      const cols: number[][] = [];
      const flat = () => cols.map((c) => c.slice());
      let a = a0, b = b0;
      out.push({ a, b, rem: null, cols: [], answer: null });
      while (b !== 0) {
        const rem = a % b;
        cols.push([a, b, rem]);
        out.push({ a, b, rem, cols: flat(), answer: null });
        a = b; b = rem;
      }
      const lcm = (a0 / a) * b0;
      out.push({ a, b: 0, rem: 0, cols: flat(), answer: null });
      out.push({ a, b: 0, rem: 0, cols: flat(), answer: `gcd ${a}, lcm ${lcm}` });
      return out;
    },
    project: (s) => {
      const rows = gridRows(s);
      const first = rows[0]?.[0]?.value;
      const cols = first === '·' || first === undefined ? [] : (rows[0] ?? []).map((_, i) => [Number(rows[0][i].value), Number(rows[1][i].value), Number(rows[2][i].value)]);
      return { a: varN(s, 'a'), b: varN(s, 'b'), rem: varN(s, 'a mod b'), cols, answer: resultTitle(s) };
    },
    invariants: [(s, _i, _st, { a, b }) => { const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x); const A = varN(s, 'a'), B = varN(s, 'b'); return A !== null && B !== null && gcd(A, B) === gcd(a, b) ? null : `gcd(a,b) of the shown pair (${A}, ${B}) != gcd(${a},${b})`; }],
  });
}

/* ===================================================================== LINEAR SORTS */

/* ---- 912 Counting Sort */
{
  type In = { nums: number[] };
  cases.push({
    slug: '912-counting-sort',
    gen: (r): In => {
      const n = rint(r, 2, 12);
      const lo = rint(r, -20, 9);
      const span = r() < 0.15 ? 0 : rint(r, 0, 11);
      return { nums: rarr(r, n, lo, lo + span) };
    },
    oracle: ({ nums }): State[] => {
      const n = nums.length, lo = Math.min(...nums), hi = Math.max(...nums), k = hi - lo + 1;
      const count: number[] = Array(k).fill(0);
      const out: (number | null)[] = Array(n).fill(null);
      let w = 0;
      const st: State[] = [];
      const push = (i: number | null, x: number | null, slot: number | null) => st.push({ i, x, slot, written: w, count: count.slice(), out: out.slice() });
      push(null, null, null);
      nums.forEach((x, i) => { count[x - lo]++; push(i, x, x - lo); });
      for (let s = 0; s < k; s++) {
        if (count[s] === 0) continue;
        for (let c = 0; c < count[s]; c++) out[w++] = s + lo;
        push(null, s + lo, s);
      }
      push(null, null, null);
      return st;
    },
    project: (s) => {
      const arrays = scenesOf(s).filter((q) => q.kind === 'array') as { cells: { value: string | number }[] }[];
      const grid = sceneOfKind(s, 'grid');
      return { i: varN(s, 'i'), x: varN(s, 'x'), slot: varN(s, 'slot'), written: varN(s, 'written'), count: (grid?.rows[0] ?? []).map((c) => Number(c.value)), out: (arrays[1]?.cells ?? []).map((c) => cv(c.value)) as number[] };
    },
    invariants: [(s, _i, _st, { nums }) => { if (!s.result) return null; const out = (scenesOf(s).filter((q) => q.kind === 'array')[1] as { cells: { value: number }[] }).cells.map((c) => c.value); const want = nums.slice().sort((a, b) => a - b); return JSON.stringify(out) === JSON.stringify(want) ? null : `final output ${out} is not the sorted input ${want}`; }],
  });
}

/* ---- 912 Radix Sort (LSD, base 10) */
{
  type In = { nums: number[] };
  cases.push({
    slug: '912-radix-sort',
    gen: (r): In => {
      const hi = r() < 0.2 ? 9 : r() < 0.5 ? 99 : 999;
      return { nums: rarr(r, rint(r, 2, 10), 0, hi) };
    },
    oracle: ({ nums }): State[] => {
      const out: State[] = [];
      let order = nums.slice();
      const max = Math.max(...nums);
      let exp = 1;
      let buckets: number[][] = Array.from({ length: 10 }, () => []);
      const bstr = () => buckets.map((b, d) => `${d} → ${b.length ? b.join(', ') : '·'}`);
      const push = (digit: number | null) => out.push({ exp, digit, order: order.slice(), buckets: bstr() });
      push(null);
      while (Math.floor(max / exp) > 0) {
        buckets = Array.from({ length: 10 }, () => []);
        for (const v of order) {
          const d = Math.floor(v / exp) % 10;
          buckets[d].push(v);
          push(d);
        }
        order = buckets.flat();
        push(null);
        exp *= 10;
      }
      push(null);
      return out;
    },
    project: (s) => ({ exp: varN(s, 'exp'), digit: varN(s, 'digit'), order: (cellValues(s) as number[]).slice(), buckets: (s.aux ?? []).find((a) => a.title.startsWith('buckets'))?.items.slice() ?? [] }),
    notes: 'the array shown during a bucketing pass is the pre-pass order (elements stay in place while they are distributed), which is what the oracle emits; cell colours not compared',
    invariants: [(s, _i, _st, { nums }) => { const v = (cellValues(s) as number[]).slice().sort((a, b) => a - b); const w = nums.slice().sort((a, b) => a - b); return JSON.stringify(v) === JSON.stringify(w) ? null : 'array is not a permutation of the input'; }],
  });
}

/* ---- 164 Maximum Gap (bucket idea) */
{
  type In = { nums: number[] };
  cases.push({
    slug: '164-maximum-gap',
    gen: (r): In => {
      const t = r();
      const n = rint(r, 2, 10);
      if (t < 0.1) return { nums: Array(n).fill(rint(r, 0, 99)) };
      return { nums: rarr(r, n, 0, t < 0.4 ? 15 : 99) };
    },
    oracle: ({ nums }): State[] => {
      const n = nums.length, lo = Math.min(...nums), hi = Math.max(...nums);
      const out: State[] = [];
      if (lo === hi) {
        out.push({ size: null, bucket: null, prev: null, best: 0, bmin: [], bmax: [], gaps: [] });
        return out;
      }
      const size = Math.ceil((hi - lo) / (n - 1));
      const B = Math.floor((hi - lo) / size) + 1;
      const bmin: (number | null)[] = Array(B).fill(null), bmax: (number | null)[] = Array(B).fill(null);
      const gaps: string[] = [];
      const push = (bucket: number | null, best: number, prev: number | null) => out.push({ size, bucket, prev, best, bmin: bmin.slice(), bmax: bmax.slice(), gaps: gaps.slice() });
      push(null, 0, null);
      for (const x of nums) {
        const b = Math.floor((x - lo) / size);
        bmin[b] = bmin[b] === null ? x : Math.min(bmin[b]!, x);
        bmax[b] = bmax[b] === null ? x : Math.max(bmax[b]!, x);
        push(b, 0, null);
      }
      let best = 0, prev = lo;
      for (let b = 0; b < B; b++) {
        if (bmin[b] === null) { push(b, best, prev); continue; }
        const gap = bmin[b]! - prev;
        gaps.push(`${prev} → ${bmin[b]} = ${gap}`);
        best = Math.max(best, gap);
        push(b, best, prev);
        prev = bmax[b]!;
      }
      push(null, best, prev);
      return out;
    },
    project: (s) => {
      const grid = sceneOfKind(s, 'grid');
      const rows = grid?.rows ?? [];
      return {
        size: varN(s, 'size'), bucket: varN(s, 'bucket'), prev: varN(s, 'prev'), best: varN(s, 'best'),
        bmin: (rows[0] ?? []).map((c) => cv(c.value)) as number[], bmax: (rows[1] ?? []).map((c) => cv(c.value)) as number[],
        gaps: (s.aux ?? []).find((a) => a.title === 'gaps')?.items.slice() ?? [],
      };
    },
    invariants: [(s, _i, _st, { nums }) => { if (!s.result) return null; const t = nums.slice().sort((a, b) => a - b); let g = 0; for (let i = 1; i < t.length; i++) g = Math.max(g, t[i] - t[i - 1]); return Number(s.result.title) === g ? null : `answer ${s.result.title} != true max gap ${g}`; }],
    notes: 'all-equal input: the page answers 0 directly (single state compared); bucket highlight colours not compared',
  });
}

/* ===================================================================== KMP */

/** Textbook failure-table construction, one event per loop iteration: i = the position being decided, len = the border length as that iteration leaves it
 *  (extend: after ++len; fall back: the length that failed; none: 0). Start event = (i 1, len 0, lps[0] = 0). */
function lpsEvents(pat: string): { i: number; len: number; lps: (number | null)[] }[] {
  const m = pat.length;
  const lps: (number | null)[] = Array(m).fill(null);
  lps[0] = 0;
  const ev = [{ i: 1, len: 0, lps: lps.slice() }];
  let i = 1, len = 0;
  while (i < m) {
    if (pat[i] === pat[len]) { len++; lps[i] = len; ev.push({ i, len, lps: lps.slice() }); i++; }
    else if (len > 0) { ev.push({ i, len, lps: lps.slice() }); len = (lps[len - 1] as number); }
    else { lps[i] = 0; ev.push({ i, len: 0, lps: lps.slice() }); i++; }
  }
  return ev;
}
const lpsRow = (s: Step): (number | null)[] => (rowVals(s, 1) as (number | null)[]);

/* ---- 1392 Longest Happy Prefix */
{
  type In = { s: string };
  cases.push({
    slug: '1392-longest-happy-prefix',
    gen: (r): In => ({ s: rstr(r, rint(r, 1, 12), r() < 0.7 ? 'ab' : 'abc') }),
    oracle: ({ s }): State[] => {
      const ev = lpsEvents(s);
      const out: State[] = ev.map((e) => ({ i: e.i, len: e.len, last: null, lps: e.lps, answer: null }));
      const full = ev[ev.length - 1].lps;
      const L = full[s.length - 1] as number;
      out.push({ i: s.length, len: L, last: L, lps: full, answer: null });
      out.push({ i: s.length, len: L, last: L, lps: full, answer: `"${s.slice(0, L)}"` });
      return out;
    },
    project: (s) => ({ i: varN(s, 'i'), len: varN(s, 'len'), last: varN(s, 'lps[m-1]'), lps: lpsRow(s), answer: resultTitle(s) }),
    notes: 'prefix/suffix highlight colours not compared; the extend step shows i before the increment and len after (state right after lps[i] = ++len)',
  });
}

/* ---- 459 Repeated Substring Pattern */
{
  type In = { s: string };
  cases.push({
    slug: '459-repeated-substring-pattern',
    gen: (r): In => {
      if (r() < 0.4) { const b = rstr(r, rint(r, 1, 4), 'ab'); const k = rint(r, 1, 4); return { s: b.repeat(k).slice(0, 12) }; }
      return { s: rstr(r, rint(r, 1, 12), r() < 0.7 ? 'ab' : 'abc') };
    },
    oracle: ({ s }): State[] => {
      const ev = lpsEvents(s);
      const out: State[] = ev.map((e) => ({ i: e.i, len: e.len, period: null, lps: e.lps, answer: null }));
      const full = ev[ev.length - 1].lps;
      const L = full[s.length - 1] as number;
      const period = s.length - L;
      out.push({ i: s.length, len: L, period, lps: full, answer: null });
      out.push({ i: s.length, len: L, period, lps: full, answer: String(L > 0 && s.length % period === 0) });
      return out;
    },
    project: (s) => ({ i: varN(s, 'i'), len: varN(s, 'len'), period: varN(s, 'period'), lps: lpsRow(s), answer: resultTitle(s) }),
    invariants: [(s, _i, _st, { s: str }) => { if (!s.result) return null; const real = str.length > 1 && (str + str).indexOf(str, 1) < str.length; return s.result.title === String(real) ? null : `answer ${s.result.title} != brute force ${real}`; }],
  });
}

/* ---- 28 Find the Index of the First Occurrence (KMP) */
{
  type In = { text: string; pat: string };
  cases.push({
    slug: '28-find-the-index-of-the-first-occurrence-in-a-string',
    gen: (r): In => {
      const text = rstr(r, rint(r, 1, 14), r() < 0.7 ? 'ab' : 'abc');
      const pat = r() < 0.5 && text.length > 1 ? text.slice(rint(r, 0, text.length - 1)).slice(0, rint(r, 1, 7)) : rstr(r, rint(r, 1, 7), 'ab');
      return { text, pat };
    },
    oracle: ({ text, pat }): State[] => {
      const n = text.length, m = pat.length;
      const ev = lpsEvents(pat);
      const out: State[] = ev.map((e) => ({ phase: 'lps', i: e.i, len: e.len, j: null, lps: e.lps, shift: null, answer: null }));
      const lps = ev[ev.length - 1].lps as number[];
      let i = 0, j = 0, found = -1;
      const push = (ii: number, jj: number | null, shift: number | null, answer: string | null = null) => out.push({ phase: 'search', i: ii, len: null, j: jj, lps, shift, answer });
      push(0, null, 0);
      while (i < n) {
        if (text[i] === pat[j]) {
          i++; j++;
          if (j === m) { found = i - m; push(i, j, i - j, String(found)); break; }
          push(i, j, i - j);
        } else if (j > 0) { push(i, j, i - j); j = lps[j - 1]; }
        else { push(i, 0, i); i++; }
      }
      if (found < 0) push(n, j, j > 0 ? n - j : null, '-1'); // j = 0: no pattern cell is drawn
      return out;
    },
    project: (s) => {
      const rows = gridRows(s);
      const searching = (sceneOfKind(s, 'grid')?.rowHeads ?? [])[0] === 'text';
      const lpsNow = searching ? (s.aux ?? []).find((a) => a.title === 'lps table')!.items.map((x) => Number(String(x).split(': ')[1])) : lpsRow(s);
      const sh0 = searching ? (rows[1] ?? []).findIndex((c) => c.value !== '') : null;
      const shift = sh0 === null || sh0 < 0 ? null : sh0;
      return { phase: searching ? 'search' : 'lps', i: varN(s, 'i'), len: varN(s, 'len'), j: varN(s, 'j'), lps: lpsNow, shift, answer: resultTitle(s) };
    },
    invariants: [(s, _i, _st, { text, pat }) => { if (!s.result) return null; const real = text.indexOf(pat); return s.result.title === String(real) ? null : `answer ${s.result.title} != indexOf ${real}`; }],
    notes: 'the matched / mismatch cell colours of the text scan are not compared (alignment shift, i, j and the lps table are)',
  });
}

/* ===================================================================== Z-ALGORITHM */

/** Textbook Z-function, one event per index i: state after z[i] is decided and the Z-box [l, r) is updated. oldBox = the box used for this i (before the update). */
function zStates(s: string): { states: State[]; z: number[] } {
  const n = s.length;
  const z: (number | null)[] = Array(n).fill(null);
  z[0] = n;
  const st: State[] = [];
  const snap = (i: number | null, l: number, r: number, zi: number, extra: State) => st.push({ i, l, r, zi, z: z.slice(), ...extra });
  snap(null, 0, 0, n, { oldBox: null, mirror: null, cur: null, span: null });
  let l = 0, r = 0;
  for (let i = 1; i < n; i++) {
    const oldBox = r > l ? [l, r] : null;
    const mirror = i < r ? i - l : null;
    let zi = i < r ? Math.min(r - i, z[i - l] as number) : 0;
    while (i + zi < n && s[zi] === s[i + zi]) zi++;
    z[i] = zi;
    if (i + zi > r) { l = i; r = i + zi; }
    snap(i, l, r, zi, { oldBox, mirror, cur: i, span: Math.max(zi - 1, 0) });
  }
  return { states: st, z: z as number[] };
}
/** Projection of the Z grid (top row = s, bottom row = z). */
function zProject(s: Step): State {
  const rows = gridRows(s);
  const top = rows[0] ?? [];
  const purple = top.map((c, k) => (c.tone === 'purple' ? k : -1)).filter((k) => k >= 0);
  const cur = top.findIndex((c) => c.state === 'compare');
  const mirror = top.findIndex((c) => c.state === 'swap');
  const hasCur = cur >= 0;
  return {
    i: varN(s, 'i'), l: varN(s, 'l'), r: varN(s, 'r'), zi: varN(s, 'z[i]'),
    z: lpsRow(s),
    oldBox: purple.length ? [purple[0], purple[purple.length - 1] + 1] : null,
    mirror: mirror < 0 ? null : mirror, cur: hasCur ? cur : null,
    span: hasCur ? top.filter((c) => c.state === 'found').length : null,
  };
}
/** Columns whose z cell is shown as a hit (bottom row 'found', not the cell being computed). */
const hitCols = (s: Step): number[] => {
  const rows = gridRows(s);
  const cur = (rows[0] ?? []).findIndex((c) => c.state === 'compare');
  return (rows[1] ?? []).map((c, k) => (c.state === 'found' && k !== cur ? k : -1)).filter((k) => k >= 0);
};
const titleNums = (s: Step): number[] | null => (s.result ? (s.result.title.match(/-?\d+/g) ?? []).map(Number) : null);

/* ---- alg-z-algorithm-pattern-search */
{
  type In = { text: string; pat: string };
  cases.push({
    slug: 'alg-z-algorithm-pattern-search',
    gen: (r): In => {
      const text = rstr(r, rint(r, 1, 12), r() < 0.7 ? 'ab' : 'abc');
      const pat = r() < 0.5 ? text.slice(rint(r, 0, text.length - 1)).slice(0, rint(r, 1, 5)) : rstr(r, rint(r, 1, 5), 'ab');
      return { text, pat };
    },
    oracle: ({ text, pat }): State[] => {
      const m = pat.length;
      const { states, z } = zStates(`${pat}#${text}`);
      const out = states.map((x) => ({ ...x, hits: [] as number[], answer: null as number[] | null }));
      const cols: number[] = [];
      for (let i = m + 1; i < z.length; i++) if (z[i] === m) cols.push(i);
      const fin = { i: null, l: null, r: null, zi: null, z: z.slice(), oldBox: null, mirror: null, cur: null, span: null, hits: cols };
      out.push({ ...fin, answer: null });
      out.push({ ...fin, answer: cols.map((c) => c - m - 1) });
      return out;
    },
    project: (s) => ({ ...zProject(s), hits: hitCols(s), answer: titleNums(s) }),
    notes: 'the dim colour of the "#" separator column and the cell colour tones other than the Z-box tone / current / mirror / matched-cell count are not compared',
    invariants: [(s, _i, _st, { text, pat }) => { const a = titleNums(s); if (!a) return null; const want: number[] = []; for (let i = 0; i + pat.length <= text.length; i++) if (text.startsWith(pat, i)) want.push(i); return JSON.stringify(a) === JSON.stringify(want) ? null : `matches ${a} != brute force ${want}`; }],
  });
}

/* ---- 2223 Sum of Scores of Built Strings */
{
  type In = { s: string };
  cases.push({
    slug: '2223-sum-of-scores-of-built-strings',
    gen: (r): In => ({ s: rstr(r, rint(r, 1, 12), r() < 0.2 ? 'a' : r() < 0.7 ? 'ab' : 'abc') }),
    oracle: ({ s }): State[] => {
      const { states, z } = zStates(s);
      const out = states.map((x) => ({ ...x, scores: (x.z as (number | null)[]).filter((v) => v !== null) as number[], answer: null as number | null }));
      const sum = z.reduce((a, b) => a + b, 0);
      const fin = { i: null, l: null, r: null, zi: sum, z: z.slice(), oldBox: null, mirror: null, cur: null, span: null, scores: z.slice() };
      out.push({ ...fin, answer: null });
      out.push({ ...fin, answer: sum });
      return out;
    },
    project: (s) => ({ ...zProject(s), scores: auxItems(s, 'scores so far') as number[], answer: s.result ? Number(s.result.title) : null }),
    invariants: [(s, _i, _st, { s: str }) => { if (!s.result) return null; let t = 0; for (let k = 0; k < str.length; k++) { let c = 0; while (k + c < str.length && str[c] === str[k + c]) c++; t += c; } return Number(s.result.title) === t ? null : `answer ${s.result.title} != brute-force ${t}`; }],
  });
}

/* ---- alg-all-periods-of-a-string */
{
  type In = { s: string };
  cases.push({
    slug: 'alg-all-periods-of-a-string',
    gen: (r): In => {
      if (r() < 0.4) { const b = rstr(r, rint(r, 1, 4), 'ab'); return { s: b.repeat(rint(r, 1, 5)).slice(0, rint(r, 1, 12)) }; }
      return { s: rstr(r, rint(r, 1, 12), r() < 0.7 ? 'ab' : 'abc') };
    },
    oracle: ({ s }): State[] => {
      const n = s.length;
      const { states, z } = zStates(s);
      const out = states.map((x) => ({ ...x, hits: [] as number[], answer: null as number[] | null }));
      const periods: number[] = [];
      for (let p = 1; p <= n; p++) if (p === n || z[p] === n - p) periods.push(p);
      const cols = periods.filter((p) => p < n);
      const fin = { i: null, l: null, r: null, z: z.slice(), oldBox: null, mirror: null, cur: null, span: null, hits: cols };
      out.push({ ...fin, zi: null, answer: null });
      out.push({ ...fin, zi: periods[0], answer: periods });
      return out;
    },
    project: (s) => ({ ...zProject(s), hits: hitCols(s), answer: titleNums(s) }),
    invariants: [(s, _i, _st, { s: str }) => { const a = titleNums(s); if (!a) return null; const want: number[] = []; for (let p = 1; p <= str.length; p++) { let ok = true; for (let i = 0; i + p < str.length; i++) if (str[i] !== str[i + p]) { ok = false; break; } if (ok) want.push(p); } return JSON.stringify(a) === JSON.stringify(want) ? null : `periods ${a} != brute force ${want}`; }],
  });
}

/* ===================================================================== ROLLING HASH */
const letterVal = (c: string) => c.charCodeAt(0) - 96;
/** polynomial hash of a whole string computed directly (Horner), independent of any rolling update. */
const polyHash = (t: string, base: number, mod: number): number => [...t].reduce((h, c) => (h * base + letterVal(c)) % mod, 0);
/** verdict colour of the text row: found = verified, error = collision */
const verdictOf = (s: Step): string | null => {
  const top = gridRows(s)[0] ?? [];
  if (top.some((c) => c.state === 'found')) return 'match';
  if (top.some((c) => c.state === 'error')) return 'collision';
  return null;
};

/* ---- alg-rabin-karp-substring-search (base 26, modulus 17) */
{
  type In = { text: string; pat: string };
  cases.push({
    slug: 'alg-rabin-karp-substring-search',
    gen: (r): In => {
      const text = rstr(r, rint(r, 1, 14), r() < 0.7 ? 'ab' : 'abc');
      const m = rint(r, 1, Math.min(5, text.length));
      const pat = r() < 0.5 ? text.slice(rint(r, 0, text.length - m)).slice(0, m) : rstr(r, m, 'abc');
      return { text, pat };
    },
    oracle: ({ text, pat }): State[] => {
      const n = text.length, m = pat.length, windows = n - m + 1;
      const hp = polyHash(pat, 26, 17);
      const shown: (number | null)[] = Array(n).fill(null);
      const hits: number[] = [];
      const out: State[] = [];
      const push = (i: number | null, h: number | null, verdict: string | null, answer: number[] | null = null) => out.push({ i, h, hp, matches: hits.length, shown: shown.slice(), verdict, answer });
      push(null, null, null);
      for (let i = 0; i < windows; i++) {
        const w = text.slice(i, i + m);
        const h = polyHash(w, 26, 17);
        shown[i] = h;
        let verdict: string | null = null;
        if (h === hp) { if (w === pat) { hits.push(i); verdict = 'match'; } else verdict = 'collision'; }
        push(i, h, verdict);
        if (i + m < n) { shown[i + 1] = polyHash(text.slice(i + 1, i + 1 + m), 26, 17); push(i + 1, shown[i + 1], null); }
      }
      push(null, null, null);
      out[out.length - 1].answer = hits;
      return out;
    },
    project: (s) => ({ i: varN(s, 'i'), h: varN(s, 'window hash'), hp: varN(s, 'pattern hash'), matches: varN(s, 'matches'), shown: rowVals(s, 2) as number[], verdict: verdictOf(s), answer: titleNums(s) }),
    invariants: [(s, _i, _st, { text, pat }) => { const a = titleNums(s); if (!a) return null; const want: number[] = []; for (let i = 0; i + pat.length <= text.length; i++) if (text.startsWith(pat, i)) want.push(i); return JSON.stringify(a) === JSON.stringify(want) ? null : `matches ${a} != brute force ${want}`; }],
    notes: 'the oracle hashes every window from scratch (Horner), so it also verifies the page\'s rolling update; the "pattern hash" row of the aux map and cell colours other than match/collision are not compared',
  });
}

/* ---- 187 Repeated DNA Sequences (2 bits per base) */
{
  type In = { s: string; L: number };
  cases.push({
    slug: '187-repeated-dna-sequences',
    gen: (r): In => {
      const s = rstr(r, rint(r, 2, 21), r() < 0.5 ? 'AC' : 'ACGT');
      return { s, L: rint(r, 2, Math.min(10, s.length)) };
    },
    oracle: ({ s, L }): State[] => {
      const n = s.length;
      const code = (c: string) => 'ACGT'.indexOf(c);
      const base4 = (t: string) => [...t].reduce((h, c) => h * 4 + code(c), 0);
      const bits = (v: number) => v.toString(2).padStart(2 * L, '0');
      const seen = new Map<number, number>();
      const added: string[] = [];
      const out: State[] = [];
      const push = (i: number | null, w: string | null, h: number | null, b: string | null) => out.push({ i, window: w, hash: h, bits: b, seen: [...seen.entries()].map(([k, v]) => `${k} → ${v}`), added: added.slice() });
      push(null, null, 0, null);
      for (let i = 0; i < n; i++) {
        if (i < L - 1) { const h = base4(s.slice(0, i + 1)); push(i, null, h, bits(h)); continue; }
        const w = s.slice(i - L + 1, i + 1);
        const h = base4(w);
        if (!seen.has(h)) seen.set(h, i - L + 1);
        else if (!added.includes(w)) added.push(w);
        // the page shows the map after the insertion of a new window (its row is added together with the "new" step)
        push(i, w, h, bits(h));
      }
      push(null, null, null, null);
      return out;
    },
    project: (s) => ({
      i: varN(s, 'i'), window: shownStr(s, 'window'), hash: varN(s, 'hash'), bits: shownStr(s, 'bits'),
      seen: (s.aux ?? []).find((a) => a.title.startsWith('seen'))?.items.slice() ?? [], added: (s.aux ?? []).find((a) => a.title === 'repeated')?.items.slice() ?? [],
    }),
    invariants: [(s, _i, _st, { s: str, L }) => { if (!s.result) return null; const got = (s.result.title.match(/[ACGT]+/g) ?? []).slice().sort(); const cnt = new Map<string, number>(); for (let i = 0; i + L <= str.length; i++) { const w = str.slice(i, i + L); cnt.set(w, (cnt.get(w) ?? 0) + 1); } const want = [...cnt.entries()].filter(([, c]) => c > 1).map(([w]) => w).sort(); return JSON.stringify(got) === JSON.stringify(want) ? null : `repeated ${got} != brute force ${want}`; }],
    notes: 'the hash and its bit string are recomputed from the window letters in base 4 (exact), so the page\'s shift/mask update is checked; cell colours not compared',
  });
}

/* ---- 1044 Longest Duplicate Substring (binary search + rolling hash mod 101) */
{
  type In = { s: string };
  cases.push({
    slug: '1044-longest-duplicate-substring',
    gen: (r): In => ({ s: rstr(r, rint(r, 2, 10), r() < 0.2 ? 'a' : r() < 0.6 ? 'ab' : 'abc') }),
    oracle: ({ s }): State[] => {
      const n = s.length;
      let lo = 1, hi = n - 1, best = '';
      const seen = new Map<number, number[]>();
      let hash: number | null = null;
      let L = 0;
      const out: State[] = [];
      const push = (verdict: string | null, answer: string | null = null) => out.push({ lo, hi, L: L || null, hash, best: best || null, seen: [...seen.entries()].map(([k, v]) => `${k} → start ${v.join(', ')}`), verdict, answer });
      push(null);
      while (lo <= hi) {
        L = Math.floor((lo + hi) / 2);
        seen.clear(); hash = null;
        push(null);
        let dup: string | null = null;
        for (let i = L - 1; i < n && dup === null; i++) {
          const start = i - L + 1;
          const w = s.slice(start, i + 1);
          hash = polyHash(w, 26, 101);
          const others = seen.get(hash) ?? [];
          if (others.some((o) => s.startsWith(w, o))) { dup = w; push('match'); break; }
          // the page shows the map before this window's start is appended (the append happens right after the step)
          push(others.length ? 'collision' : null);
          seen.set(hash, [...others, start]);
        }
        if (dup !== null) { best = dup; lo = L + 1; } else hi = L - 1;
        push(null);
      }
      L = best.length; seen.clear(); hash = null;
      push(null, `"${best}"`);
      return out;
    },
    project: (s) => ({
      lo: varN(s, 'lo'), hi: varN(s, 'hi'), L: varN(s, 'L'), hash: varN(s, 'hash'), best: shownStr(s, 'best'),
      seen: (s.aux ?? [])[0]?.items.slice() ?? [], answer: s.result ? s.result.title : null,
      verdict: (() => { const cs = sceneOfKind(s, 'array')?.cells ?? []; return cs.some((c) => c.state === 'found') ? 'match' : cs.some((c) => c.state === 'error') ? 'collision' : null; })(),
    }),
    invariants: [(s, _i, _st, { s: str }) => { if (!s.result) return null; const best = s.result.title.replace(/"/g, ''); let L = 0; for (let l = 1; l < str.length; l++) { let found = false; const seen = new Set<string>(); for (let i = 0; i + l <= str.length; i++) { const w = str.slice(i, i + l); if (seen.has(w)) { found = true; break; } seen.add(w); } if (found) L = l; } return best.length === L ? null : `answer length ${best.length} != true longest duplicate length ${L}`; }],
    notes: 'windows are hashed from scratch (Horner mod 101) so the rolling update is checked; the map is compared as the page shows it (before the current window is appended); cell colours other than match/collision not compared',
  });
}

/* ===================================================================== MANACHER */

/** Textbook Manacher on t = #a#b#...#, one event per centre i (state after p[i] is final and (c, r) updated). */
function manStates(s: string): { states: State[]; p: number[]; t: string } {
  const t = `#${[...s].join('#')}#`;
  const N = t.length;
  const p: (number | null)[] = Array(N).fill(null);
  const st: State[] = [];
  const range = (a: number, b: number, skip: number[]) => { const o: number[] = []; for (let k = Math.max(a, 0); k <= Math.min(b, N - 1); k++) if (!skip.includes(k)) o.push(k); return o; };
  const snap = (i: number | null, c: number, r: number, pi: number | null, e: State) => st.push({ i, c, r, pi, p: p.slice(), ...e });
  snap(null, 0, 0, null, { box: null, mirror: null, cur: null, found: [], pFound: [] });
  let c = 0, r = 0;
  for (let i = 0; i < N; i++) {
    const inside = i < r;
    const mirror = inside ? 2 * c - i : null;
    const box = inside ? [c - (p[c] as number), c + (p[c] as number)] : null;
    let k = inside ? Math.min(r - i, p[mirror as number] as number) : 0;
    while (i - k - 1 >= 0 && i + k + 1 < N && t[i - k - 1] === t[i + k + 1]) k++;
    p[i] = k;
    if (i + k > r) { c = i; r = i + k; }
    snap(i, c, r, k, { box, mirror, cur: i, found: k > 0 ? range(i - k, i + k, [i, ...(mirror === null ? [] : [mirror])]) : [], pFound: [] });
  }
  return { states: st, p: p as number[], t };
}
function manProject(s: Step): State {
  const rows = gridRows(s);
  const top = rows[0] ?? [];
  const purple = top.map((c, k) => (c.tone === 'purple' ? k : -1)).filter((k) => k >= 0);
  const cur = top.findIndex((c) => c.state === 'compare');
  const mirror = top.findIndex((c) => c.state === 'swap');
  return {
    i: varN(s, 'i'), c: varN(s, 'c'), r: varN(s, 'r'), pi: varN(s, 'p[i]'),
    p: lpsRow(s),
    box: purple.length ? [purple[0], purple[purple.length - 1]] : null,
    mirror: mirror < 0 ? null : mirror, cur: cur < 0 ? null : cur,
    found: top.map((c, k) => (c.state === 'found' ? k : -1)).filter((k) => k >= 0),
    pFound: (rows[1] ?? []).map((c, k) => (c.state === 'found' && k !== cur ? k : -1)).filter((k) => k >= 0),
  };
}
const quoted = (s: Step): string | null => (s.result ? s.result.title : null);
const manFinal = (p: number[], extra: State): State => ({ i: null, c: null, r: null, p: p.slice(), box: null, mirror: null, ...extra });
const mrange = (a: number, b: number, skip: number[], N: number): number[] => { const o: number[] = []; for (let k = Math.max(a, 0); k <= Math.min(b, N - 1); k++) if (!skip.includes(k)) o.push(k); return o; };

/* ---- alg-manachers-algorithm (longest palindromic substring) */
{
  type In = { s: string };
  cases.push({
    slug: 'alg-manachers-algorithm',
    gen: (r): In => ({ s: rstr(r, rint(r, 1, 9), r() < 0.2 ? 'a' : r() < 0.7 ? 'ab' : 'abc') }),
    oracle: ({ s }): State[] => {
      const { states, p, t } = manStates(s);
      const N = t.length;
      let best = 0, ctr = 0;
      p.forEach((v, i) => { if (v > best) { best = v; ctr = i; } });
      const sub = s.slice((ctr - best) / 2, (ctr + best) / 2);
      const out = states.map((x) => ({ ...x, answer: null as string | null }));
      out.push({ ...manFinal(p, { pi: best, cur: ctr, found: mrange(ctr - best, ctr + best, [ctr], N), pFound: [] }), answer: null });
      out.push({ ...manFinal(p, { pi: best, cur: null, found: mrange(ctr - best, ctr + best, [], N), pFound: [] }), answer: `"${sub}"` });
      return out;
    },
    project: (s) => ({ ...manProject(s), answer: quoted(s) }),
    invariants: [(s, _i, _st, { s: str }) => { if (!s.result) return null; const got = s.result.title.replace(/"/g, ''); let L = 0; for (let c = 0; c < str.length; c++) for (const w of [0, 1]) { let a = c, b = c + w; while (a >= 0 && b < str.length && str[a] === str[b]) { a--; b++; } L = Math.max(L, b - a - 1); } return got.length === L && got === [...got].reverse().join('') && str.includes(got) ? null : `answer "${got}" is not a longest palindromic substring (longest ${L})`; }],
    notes: 'cell colours other than box tone / current / mirror / matched / found cells are not compared; among equal-length palindromes the page picks the leftmost centre (oracle uses the same rule; the answer is also checked by brute force)',
  });
}

/* ---- cp-palindromic-substrings-via-manacher */
{
  type In = { s: string };
  cases.push({
    slug: 'cp-palindromic-substrings-via-manacher',
    gen: (r): In => ({ s: rstr(r, rint(r, 1, 9), r() < 0.2 ? 'a' : r() < 0.7 ? 'ab' : 'abc') }),
    oracle: ({ s }): State[] => {
      const { states, p } = manStates(s);
      const per = p.map((v) => Math.ceil(v / 2));
      const total = per.reduce((a, b) => a + b, 0);
      const out = states.map((x) => ({ ...x, third: null as number[] | null, answer: null as number | null }));
      const pF = per.map((v, k) => (v > 0 ? k : -1)).filter((k) => k >= 0);
      out.push({ ...manFinal(p, { pi: total, cur: null, found: [], pFound: pF }), third: per, answer: null });
      out.push({ ...manFinal(p, { pi: total, cur: null, found: [], pFound: [] }), third: per, answer: total });
      return out;
    },
    project: (s) => ({ ...manProject(s), third: gridRows(s)[2] ? (rowVals(s, 2) as number[]) : null, answer: s.result ? Number(s.result.title) : null }),
    invariants: [(s, _i, _st, { s: str }) => { if (!s.result) return null; let t = 0; for (let a = 0; a < str.length; a++) for (let b = a; b < str.length; b++) { const w = str.slice(a, b + 1); if (w === [...w].reverse().join('')) t++; } return Number(s.result.title) === t ? null : `answer ${s.result.title} != brute force ${t}`; }],
  });
}

/* ---- 214 Shortest Palindrome */
{
  type In = { s: string };
  cases.push({
    slug: '214-shortest-palindrome',
    gen: (r): In => {
      if (r() < 0.3) { const h = rstr(r, rint(r, 1, 4), 'abc'); return { s: (h + [...h].reverse().join('') + rstr(r, rint(r, 0, 1), 'a')).slice(0, 9) }; }
      return { s: rstr(r, rint(r, 1, 9), r() < 0.2 ? 'a' : r() < 0.7 ? 'ab' : 'abc') };
    },
    oracle: ({ s }): State[] => {
      const { states, p, t } = manStates(s);
      const N = t.length;
      let L = 0;
      p.forEach((v, i) => { if (i - v === 0) L = Math.max(L, v); });
      const touch = p.map((v, k) => (k - v === 0 ? k : -1)).filter((k) => k >= 0);
      const ans = [...s.slice(L)].reverse().join('') + s;
      const out = states.map((x) => ({ ...x, answer: null as string | null }));
      out.push({ ...manFinal(p, { pi: L, cur: null, found: mrange(0, 2 * L, [], N), pFound: touch }), answer: null });
      out.push({ ...manFinal(p, { pi: L, cur: null, found: mrange(0, 2 * L, [], N), pFound: [] }), answer: `"${ans}"` });
      return out;
    },
    project: (s) => ({ ...manProject(s), answer: quoted(s) }),
    invariants: [(s, _i, _st, { s: str }) => { if (!s.result) return null; const got = s.result.title.replace(/"/g, ''); const isPal = (w: string) => w === [...w].reverse().join(''); let want = ''; for (let k = str.length; k >= 0; k--) { const cand = [...str.slice(k)].reverse().join('') + str; if (isPal(cand)) { want = cand; break; } } return got === want ? null : `answer "${got}" != shortest palindrome "${want}"`; }],
  });
}

/* ===================================================================== COORDINATE COMPRESSION */

/* ---- 1331 Rank Transform of an Array */
{
  type In = { nums: number[] };
  cases.push({
    slug: '1331-rank-transform-of-an-array',
    gen: (r): In => {
      const t = r();
      const n = rint(r, 1, 10);
      if (t < 0.4) return { nums: rarr(r, n, -5, 5) };
      if (t < 0.7) return { nums: rarr(r, n, -1000000000, 1000000000) };
      return { nums: rarr(r, n, 0, 3) };
    },
    oracle: ({ nums }): State[] => {
      const n = nums.length;
      const sorted = [...new Set(nums)].sort((a, b) => a - b);
      const rank = new Map<number, number>();
      const out: (number | null)[] = Array(n).fill(null);
      const st: State[] = [];
      let known = false;
      const push = (value: number | null, rk: number | null, answer: number[] | null = null) => st.push({ value, rank: rk, distinct: known ? sorted.length : null, out: out.slice(), sorted: known ? sorted.slice() : [], map: [...rank.entries()].map(([v, r]) => `${v} → ${r}`), answer });
      push(null, null);
      known = true;
      push(null, null);
      sorted.forEach((v, i) => { rank.set(v, i + 1); push(v, i + 1); });
      nums.forEach((v, i) => { out[i] = rank.get(v)!; push(v, out[i]); });
      push(null, null, out.slice() as number[]);
      return st;
    },
    project: (s) => ({
      value: varN(s, 'value'), rank: varN(s, 'rank'), distinct: varN(s, 'distinct'), out: rowVals(s, 1) as number[],
      sorted: auxItems(s, 'distinct values, sorted') as number[], map: (s.aux ?? []).find((a) => a.title === 'rank map')?.items.slice() ?? [], answer: titleNums(s),
    }),
    invariants: [(s, _i, _st, { nums }) => { const a = titleNums(s); if (!a) return null; const want = nums.map((v) => new Set(nums.filter((x) => x < v)).size + 1); return JSON.stringify(a) === JSON.stringify(want) ? null : `ranks ${a} != brute force ${want}`; }],
  });
}

/* ---- 506 Relative Ranks */
{
  type In = { nums: number[] };
  cases.push({
    slug: '506-relative-ranks',
    gen: (r): In => ({ nums: distinct(r, rint(r, 1, 10), 0, r() < 0.5 ? 14 : 1000000) }),
    oracle: ({ nums }): State[] => {
      const n = nums.length;
      const order = nums.map((_, i) => i).sort((a, b) => nums[b] - nums[a]);
      const place: (string | number | null)[] = Array(n).fill(null);
      const st: State[] = [];
      let known = false;
      const push = (rank: number | null, index: number | null, answer: string[] | null = null) => st.push({ rank, index, place: place.slice(), order: known ? order.map((i) => `#${i}: ${nums[i]}`) : [], answer });
      push(null, null);
      known = true;
      push(null, null);
      order.forEach((idx, r) => { place[idx] = r === 0 ? 'Gold' : r === 1 ? 'Silver' : r === 2 ? 'Bronze' : r + 1; push(r + 1, idx); });
      push(null, null, place.map((p) => (typeof p === 'number' ? String(p) : `${p} Medal`)));
      return st;
    },
    project: (s) => ({
      rank: varN(s, 'rank'), index: varN(s, 'index'), place: rowVals(s, 1) as (string | number)[],
      order: (s.aux ?? [])[0]?.items.slice() ?? [], answer: s.result ? (s.result.title.match(/"([^"]*)"/g) ?? []).map((x) => x.slice(1, -1)) : null,
    }),
    notes: 'cell colours not compared; the grid shows "Gold" / "Silver" / "Bronze" (the word Medal dropped) while the result banner shows the full "Gold Medal" text (both compared)',
    invariants: [(s, _i, _st, { nums }) => { if (!s.result) return null; const got = (s.result.title.match(/"([^"]*)"/g) ?? []).map((x) => x.slice(1, -1)); const want = nums.map((v) => { const rk = nums.filter((x) => x > v).length; return rk === 0 ? 'Gold Medal' : rk === 1 ? 'Silver Medal' : rk === 2 ? 'Bronze Medal' : String(rk + 1); }); return JSON.stringify(got) === JSON.stringify(want) ? null : `places ${got} != brute force ${want}`; }],
  });
}

/* ---- cp-maximum-overlap-of-wide-intervals */
{
  type In = { iv: [number, number][] };
  cases.push({
    slug: 'cp-maximum-overlap-of-wide-intervals',
    gen: (r): In => {
      const n = rint(r, 1, 6);
      const hi = r() < 0.4 ? 12 : 1000000000;
      const iv = Array.from({ length: n }, () => { const a = rint(r, 0, hi); const b = r() < 0.2 ? a : rint(r, a, Math.min(hi, a + (r() < 0.5 ? 6 : hi))); return [a, b] as [number, number]; });
      return { iv };
    },
    oracle: ({ iv }): State[] => {
      const pts = [...new Set(iv.flatMap(([a, b]) => [a, b + 1]))].sort((x, y) => x - y);
      const k = pts.length;
      const pos = (x: number) => pts.indexOf(x);
      const delta: number[] = Array(k).fill(0);
      const run: (number | null)[] = Array(k).fill(null);
      let phase = 'raw';
      let cur = 0, best = 0;
      const st: State[] = [];
      const push = (coordinate: number | null, answer: number | null = null) => st.push({ points: phase === 'raw' ? null : k, coordinate, overlap: cur, best, pts: phase === 'raw' ? null : pts.slice(), delta: phase === 'raw' ? null : delta.slice(), run: phase === 'raw' ? null : run.slice(), answer });
      push(null);
      phase = 'pts';
      push(null);
      iv.forEach(([a, b]) => { delta[pos(a)]++; delta[pos(b + 1)]--; push(a); });
      for (let j = 0; j < k; j++) { cur += delta[j]; run[j] = cur; best = Math.max(best, cur); push(pts[j]); }
      push(null, best);
      return st;
    },
    project: (s) => {
      const sc = sceneOfKind(s, 'grid');
      const raw = (sc?.rowHeads ?? [])[0] === 'start';
      return {
        points: varN(s, 'points'), coordinate: varN(s, 'coordinate'), overlap: varN(s, 'overlap'), best: varN(s, 'best'),
        pts: raw ? null : (rowVals(s, 0) as number[]), delta: raw ? null : (rowVals(s, 1) as number[]), run: raw ? null : (rowVals(s, 2) as number[]),
        answer: s.result ? Number(s.result.title) : null,
      };
    },
    invariants: [(s, _i, _st, { iv }) => { if (!s.result) return null; let b = 0; for (const [x] of iv) b = Math.max(b, iv.filter(([l, r2]) => l <= x && x <= r2).length); return Number(s.result.title) === b ? null : `answer ${s.result.title} != brute force ${b}`; }],
  });
}

/* ===================================================================== MEET IN THE MIDDLE */

const popcnt = (x: number): number => { let c = 0; for (; x; x >>= 1) c += x & 1; return c; };
/** all subset sums of a with the label shown by the page, in mask order (bit b of the mask = a[b] picked). */
const subsetList = (a: number[]) => Array.from({ length: 1 << a.length }, (_, m) => { const pk = a.filter((_x, b) => ((m >> b) & 1) === 1); const sum = pk.reduce((x, y) => x + y, 0); return { m, sum, label: `{${pk.join(',')}} = ${sum}` }; });
/** the two array scenes of a twoLists split: [first values, second values] and the pointer positions. */
const twoListState = (s: Step): { lists: (number[])[] | null; pi: number | null; pj: number | null } => {
  const arrays = scenesOf(s).filter((q) => q.kind === 'array') as { cells: { value: number }[] }[];
  const sc = s.scene;
  const isSplit = !!sc && sc.kind === 'split';
  return { lists: isSplit ? arrays.map((a) => a.cells.map((c) => Number(c.value))) : null, pi: ptr(s, 'i'), pj: ptr(s, 'j') };
};

/* ---- 1755 Closest Subsequence Sum */
{
  type In = { nums: number[]; goal: number };
  cases.push({
    slug: '1755-closest-subsequence-sum',
    gen: (r): In => ({ nums: rarr(r, rint(r, 1, 8), -20, 20), goal: rint(r, -50, 50) }),
    oracle: ({ nums, goal }): State[] => {
      const h = Math.floor(nums.length / 2);
      const ls = subsetList(nums.slice(0, h)), rs = subsetList(nums.slice(h));
      const L = ls.map((x) => x.sum).sort((a, b) => a - b), R = rs.map((x) => x.sum).sort((a, b) => a - b);
      const out: State[] = [];
      let best: number | null = null;
      const push = (lists: number[][] | null, i: number | null, j: number | null, sum: number | null, pi: number | null, pj: number | null, lsub: string[], rsub: string[], answer: number | null = null) => out.push({ lists, i, j, sum, best, pi, pj, lsub, rsub, answer });
      push(null, null, null, null, null, null, [], []);
      push([L, []], null, null, null, null, null, ls.map((x) => x.label), []);
      push([L, R], null, null, null, null, null, [], rs.map((x) => x.label));
      let i = 0, j = R.length - 1;
      while (i < L.length && j >= 0) {
        const s = L[i] + R[j];
        best = Math.min(best ?? Infinity, Math.abs(s - goal));
        push([L, R], i, j, s, i, j, [], []);
        if (s === goal) break;
        if (s < goal) i++; else j--;
      }
      push([L, R], null, null, null, null, null, [], [], best);
      return out;
    },
    project: (s) => {
      const t = twoListState(s);
      return {
        lists: t.lists, i: varN(s, 'i'), j: varN(s, 'j'), sum: varN(s, 'sum'), best: varN(s, 'best'), pi: t.pi, pj: t.pj,
        lsub: (s.aux ?? []).find((a) => a.title.startsWith('left'))?.items.slice() ?? [], rsub: (s.aux ?? []).find((a) => a.title.startsWith('right'))?.items.slice() ?? [],
        answer: s.result ? Number(s.result.title) : null,
      };
    },
    invariants: [(s, _i, _st, { nums, goal }) => { if (!s.result) return null; let b = Infinity; for (let m = 0; m < 1 << nums.length; m++) { let t = 0; for (let k = 0; k < nums.length; k++) if ((m >> k) & 1) t += nums[k]; b = Math.min(b, Math.abs(t - goal)); } return Number(s.result.title) === b ? null : `answer ${s.result.title} != brute force ${b}`; }],
  });
}

/* ---- 2035 Partition Array Into Two Arrays to Minimize Sum Difference */
{
  type In = { nums: number[] };
  cases.push({
    slug: '2035-partition-array-into-two-arrays-to-minimize-sum-difference',
    gen: (r): In => ({ nums: rarr(r, 2 * rint(r, 1, 4), -15, 15) }),
    oracle: ({ nums }): State[] => {
      const n = nums.length / 2;
      const total = nums.reduce((a, b) => a + b, 0);
      const bySize = (a: number[]) => Array.from({ length: a.length + 1 }, (_, k) => subsetList(a).filter((x) => popcnt(x.m) === k).map((x) => x.sum).sort((p, q) => p - q));
      const L = bySize(nums.slice(0, n)), R = bySize(nums.slice(n));
      const out: State[] = [];
      let best: number | null = null;
      const push = (lists: number[][] | null, k: number | null, i: number | null, j: number | null, sum: number | null, pi: number | null, pj: number | null, answer: number | null = null) => out.push({ lists, k, i, j, sum, best, pi, pj, shownBest: best, answer });
      push(null, null, null, null, null, null, null);
      push([L[0], R[n]], null, null, null, null, null, null);
      for (let k = 0; k <= n; k++) {
        const a = L[k], b = R[n - k];
        push([a, b], k, 0, b.length - 1, null, 0, b.length - 1);
        let i = 0, j = b.length - 1;
        while (i < a.length && j >= 0) {
          const s = a[i] + b[j];
          best = Math.min(best ?? Infinity, Math.abs(total - 2 * s));
          push([a, b], k, i, j, s, i, j);
          if (2 * s < total) i++; else j--;
        }
      }
      push([L[0], R[n]], null, null, null, null, null, null, best);
      return out;
    },
    project: (s) => {
      const t = twoListState(s);
      const aux = (s.aux ?? []).find((a) => a.title.startsWith('closest'));
      return {
        lists: t.lists, k: varN(s, 'k'), i: varN(s, 'i'), j: varN(s, 'j'), sum: varN(s, 'sum'), best: varN(s, 'best'), pi: t.pi, pj: t.pj,
        shownBest: aux && aux.items.length ? Number(aux.items[0].split('= ')[1]) : null, answer: s.result ? Number(s.result.title) : null,
      };
    },
    invariants: [(s, _i, _st, { nums }) => { if (!s.result) return null; const n = nums.length / 2; const total = nums.reduce((a, b) => a + b, 0); let b = Infinity; for (let m = 0; m < 1 << nums.length; m++) { if (popcnt(m) !== n) continue; let t = 0; for (let k = 0; k < nums.length; k++) if ((m >> k) & 1) t += nums[k]; b = Math.min(b, Math.abs(total - 2 * t)); } return Number(s.result.title) === b ? null : `answer ${s.result.title} != brute force ${b}`; }],
  });
}

/* ---- 454 4Sum II */
{
  type In = { a: number[]; b: number[]; c: number[]; d: number[] };
  cases.push({
    slug: '454-4sum-ii',
    gen: (r): In => { const n = rint(r, 1, 4); const hi = r() < 0.5 ? 2 : 5; const g = () => rarr(r, n, -hi, hi); return { a: g(), b: g(), c: g(), d: g() }; },
    oracle: ({ a, b, c, d }): State[] => {
      const n = a.length;
      const ab = new Map<number, number>();
      let count = 0;
      const out: State[] = [];
      const mapItems = () => [...ab.entries()].sort((x, y) => x[0] - y[0]).map(([k, v]) => `${k} → ${v}`);
      const push = (sum: number | null, need: number | null, hA: number | null, hC: number | null, hD: number | null, answer: number | null = null) => out.push({ sum, need, count, hA, hC, hD, map: mapItems(), answer });
      push(null, null, null, null, null);
      a.forEach((x, i) => { for (let j = 0; j < n; j++) ab.set(x + b[j], (ab.get(x + b[j]) ?? 0) + 1); push(x, null, i, null, null); });
      c.forEach((x, i) => { for (let j = 0; j < n; j++) { const need = -(x + d[j]); count += ab.get(need) ?? 0; push(x + d[j], need, null, i, j); } });
      push(null, null, null, null, null, count);
      return out;
    },
    project: (s) => {
      const rows = gridRows(s);
      const hi = (k: number) => { const i = (rows[k] ?? []).findIndex((c) => c.state === 'compare'); return i < 0 ? null : i; };
      return { sum: varN(s, 'sum'), need: varN(s, 'need (−(c+d))'), count: varN(s, 'count'), hA: hi(0), hC: hi(2), hD: hi(3), map: (s.aux ?? [])[0]?.items.slice() ?? [], answer: s.result ? Number(s.result.title) : null };
    },
    invariants: [(s, _i, _st, { a, b, c, d }) => { if (!s.result) return null; let t = 0; for (const w of a) for (const x of b) for (const y of c) for (const z of d) if (w + x + y + z === 0) t++; return Number(s.result.title) === t ? null : `answer ${s.result.title} != brute force ${t}`; }],
    notes: 'the B row is never highlighted by the page, so it is not part of the projection',
  });
}
