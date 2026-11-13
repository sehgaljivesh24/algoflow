/**
 * Fuzz test for the pack-p2 animations (search / stack / design).
 * Run: node scripts/fuzz-pack2.mts
 * For every problem: ~200 random valid inputs -> buildSteps -> final result compared with a plain reference,
 * plus structural checks on every step and a parseInput(raw(input)) round trip.
 */
import { checkScene } from './check-scenes.mts';
import { pack2 } from '../src/problems/groups/pack2.ts';

let seed = 20240402;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const sortedAsc = (a: number[]) => [...a].sort((x, y) => x - y);

interface Case {
  slug: string;
  gen: () => any;
  ref?: (inp: any) => string;
  ok?: (inp: any, title: string) => boolean;
  raw?: (inp: any) => string;
  runs?: number;
}
const cases: Case[] = [];
const add = (c: Case) => cases.push(c);
const list = (a: number[]) => a.join(' ');

// ---------------------------------------------------------------- 503 Next Greater Element II
add({
  slug: '503-next-greater-element-ii',
  gen: () => ({ nums: Array.from({ length: ri(1, 10) }, () => ri(-9, 9)) }),
  ref: ({ nums }) => {
    const n = nums.length;
    const ans = nums.map((x: number, i: number) => {
      for (let d = 1; d < n; d++) if (nums[(i + d) % n] > x) return nums[(i + d) % n];
      return -1;
    });
    return `[${ans.join(', ')}]`;
  },
  raw: ({ nums }) => list(nums),
});

// ---------------------------------------------------------------- 402 Remove K Digits
add({
  slug: '402-remove-k-digits',
  gen: () => {
    const n = ri(1, 9);
    const small = rnd() < 0.5;
    let num = '';
    for (let i = 0; i < n; i++) num += String(i === 0 ? ri(1, small ? 3 : 9) : ri(0, small ? 3 : 9));
    if (rnd() < 0.05) num = '0';
    return { num, k: ri(0, num.length) };
  },
  ref: ({ num, k }) => {
    const n = num.length;
    let best: string | null = null;
    const norm = (s: string) => { const t = s.replace(/^0+/, ''); return t === '' ? '0' : t; };
    const less = (a: string, b: string) => (a.length !== b.length ? a.length < b.length : a < b);
    for (let mask = 0; mask < 1 << n; mask++) {
      let bits = 0;
      for (let i = 0; i < n; i++) if (mask >> i & 1) bits++;
      if (bits !== k) continue;
      let s = '';
      for (let i = 0; i < n; i++) if (!(mask >> i & 1)) s += num[i];
      const t = norm(s);
      if (best === null || less(t, best)) best = t;
    }
    return best!;
  },
  raw: ({ num, k }) => `${num} ; ${k}`,
});

// ---------------------------------------------------------------- 540 Single Element in a Sorted Array
add({
  slug: '540-single-element-in-a-sorted-array',
  gen: () => {
    const pairs = ri(0, 5);
    const vals = new Set<number>();
    while (vals.size < pairs + 1) vals.add(ri(0, 60));
    const v = sortedAsc([...vals]);
    const single = ri(0, pairs);
    const nums: number[] = [];
    v.forEach((x, i) => { nums.push(x); if (i !== single) nums.push(x); });
    const o: any = { nums };
    Object.defineProperty(o, 'single', { value: v[single], enumerable: false });
    return o;
  },
  ref: (inp: any) => String(inp.single),
  raw: ({ nums }) => list(nums),
});

// ---------------------------------------------------------------- 658 Find K Closest Elements
add({
  slug: '658-find-k-closest-elements',
  gen: () => {
    const arr = sortedAsc(Array.from({ length: ri(1, 12) }, () => ri(-20, 20)));
    return { arr, k: ri(1, arr.length), x: ri(-25, 25) };
  },
  ref: ({ arr, k, x }) => {
    const best = [...arr].sort((a, b) => Math.abs(a - x) - Math.abs(b - x) || a - b).slice(0, k);
    return `[${sortedAsc(best).join(', ')}]`;
  },
  raw: ({ arr, k, x }) => `${list(arr)} ; ${k} ; ${x}`,
});

// ---------------------------------------------------------------- 460 LFU Cache
add({
  slug: '460-lfu-cache',
  gen: () => {
    const cap = ri(1, 3);
    const keyMax = ri(1, 5);
    const ops = Array.from({ length: ri(1, 12) }, () =>
      rnd() < 0.5 ? { t: 'get', k: ri(0, keyMax) } : { t: 'put', k: ri(0, keyMax), v: ri(0, 99) });
    return { cap, ops };
  },
  ref: ({ cap, ops }) => {
    // plain O(n) simulation: evict the entry with the lowest use count, ties by oldest last use
    const cache: { k: number; v: number; f: number; t: number }[] = [];
    let clock = 0;
    const outs: number[] = [];
    for (const op of ops) {
      clock++;
      const e = cache.find((x) => x.k === op.k);
      if (op.t === 'get') {
        if (e) { e.f++; e.t = clock; outs.push(e.v); } else outs.push(-1);
      } else if (e) {
        e.v = op.v; e.f++; e.t = clock;
      } else {
        if (cache.length === cap) {
          cache.sort((a, b) => a.f - b.f || a.t - b.t);
          cache.shift();
        }
        cache.push({ k: op.k, v: op.v, f: 1, t: clock });
      }
    }
    return outs.length ? outs.join(', ') : '(no get calls)';
  },
  raw: ({ cap, ops }) => `${cap} ; ${ops.map((o: any) => (o.t === 'get' ? `get ${o.k}` : `put ${o.k} ${o.v}`)).join(', ')}`,
});

// ---------------------------------------------------------------- 432 All O(1) Data Structure
add({
  slug: '432-all-o-1-data-structure',
  gen: () => {
    const counts: Record<string, number> = {};
    const keys = 'abcde'.slice(0, ri(1, 5));
    const ops: any[] = [];
    for (let i = ri(1, 12); i > 0; i--) {
      const r = rnd();
      const live = Object.keys(counts).filter((k) => counts[k] > 0);
      if (r < 0.2) ops.push({ t: 'max' });
      else if (r < 0.4) ops.push({ t: 'min' });
      else if (r < 0.7 && live.length) {
        const k = live[ri(0, live.length - 1)];
        counts[k]--;
        ops.push({ t: 'dec', k });
      } else {
        const k = keys[ri(0, keys.length - 1)];
        counts[k] = (counts[k] ?? 0) + 1;
        ops.push({ t: 'inc', k });
      }
    }
    return { ops };
  },
  // any key with the extreme count is valid, so replay the operations and accept every legal answer sequence
  ok: ({ ops }, title) => {
    const counts = new Map<string, number>();
    const got = title === '(no queries)' ? [] : title.split(', ');
    let q = 0;
    for (const op of ops) {
      if (op.t === 'inc') counts.set(op.k, (counts.get(op.k) ?? 0) + 1);
      else if (op.t === 'dec') { const c = counts.get(op.k)! - 1; if (c === 0) counts.delete(op.k); else counts.set(op.k, c); }
      else {
        const out = got[q++];
        const vals = [...counts.values()];
        if (vals.length === 0) { if (out !== '""') return false; continue; }
        const target = op.t === 'max' ? Math.max(...vals) : Math.min(...vals);
        if (out === undefined || out === '""' || counts.get(out) !== target) return false;
      }
    }
    return q === got.length;
  },
  raw: ({ ops }) => ops.map((o: any) => (o.t === 'max' ? 'getMax' : o.t === 'min' ? 'getMin' : `${o.t} ${o.k}`)).join(', '),
});

// ---------------------------------------------------------------- runner
let failures = 0;
const fail = (msg: string) => {
  failures++;
  if (failures <= 40) console.log(`FAIL  ${msg}`);
};
const bySlug = new Map(pack2.map((p) => [p.slug, p]));

for (const c of cases) {
  const p = bySlug.get(c.slug);
  if (!p) { fail(`${c.slug}: not registered in pack2`); continue; }
  const runs = c.runs ?? 200;
  for (let t = 0; t < runs; t++) {
    const inp = c.gen();
    const tag = `${c.slug} ${JSON.stringify(inp)}`;
    let steps: any[];
    try {
      steps = p.buildSteps(inp);
    } catch (e) {
      fail(`${tag}: buildSteps threw ${e}`);
      continue;
    }
    const last = steps[steps.length - 1];
    if (!last?.result) { fail(`${tag}: no result on final step`); continue; }
    if (steps.length > 400 || steps.length < 2) fail(`${tag}: step count ${steps.length}`);
    if (c.ref && last.result.title !== c.ref(inp)) fail(`${tag}: got ${last.result.title}, expected ${c.ref(inp)}`);
    if (c.ok && !c.ok(inp, last.result.title)) fail(`${tag}: result ${last.result.title} not accepted`);
    steps.forEach((s, i) => {
      const where = `${tag} step ${i}`;
      if (!s.javaLines.every((l: number) => l >= 0 && l < p.java.length)) fail(`${where}: java line range`);
      if (!s.pyLines.every((l: number) => l >= 0 && l < p.python.length)) fail(`${where}: python line range`);
      if (!(s.algoStep >= 0 && s.algoStep < p.algorithm.length)) fail(`${where}: algoStep range`);
      if (!p.varLabels.every((k: string) => k in s.vars)) fail(`${where}: vars missing ${p.varLabels.filter((k: string) => !(k in s.vars))}`);
      if (!s.title || !s.desc || !s.logic) fail(`${where}: empty text`);
      if (/undefined|NaN|Infinity/.test(`${s.title} ${s.desc} ${s.logic}`)) fail(`${where}: bad text "${s.desc}"`);
      checkScene(s, where, (name, cond, extra) => { if (!cond) fail(`${name} ${extra ?? ''}`); });
    });
    if (c.raw) {
      try {
        const back = p.parseInput(c.raw(inp));
        if (JSON.stringify(back) !== JSON.stringify(inp)) fail(`${tag}: parseInput round trip gave ${JSON.stringify(back)}`);
      } catch (e) {
        fail(`${tag}: parseInput threw ${e}`);
      }
    }
  }
}

for (const p of pack2) if (!cases.some((c) => c.slug === p.slug)) fail(`${p.slug}: no fuzz case`);

console.log(failures ? `\n${failures} FUZZ FAILURE(S)` : `fuzz ok: ${cases.length} problems x ~200 random inputs`);
process.exit(failures ? 1 : 0);
