import type { Step } from '../../src/engine/types.ts';
import type { CaseModule, OracleCase, State } from './types.ts';
import { num, ptr, rarr, rint, rstr, scenesOf, shown } from './util.ts';

/**
 * Batch d1 — sliding windows, two pointers, prefix sums, hashing, Kadane, voting, cyclic sort, binary-search families.
 * Every oracle below is written from the textbook algorithm (the Java in problem.java is the spec) and never imports the problems.
 */

/* ------------------------------------------------------------------ helpers (projection side) */
/** Items of the aux panel whose title starts with `prefix` (null when the panel is absent). */
const auxItems = (step: Step, prefix: string): string[] | null => {
  const a = (step.aux ?? []).find((x) => x.title.toLowerCase().startsWith(prefix.toLowerCase()));
  return a ? a.items : null;
};
/** Numeric parts of "k → v" / "5" style items: returns the part after `sep` (or the whole item). */
const nums = (items: string[] | null, sep = ''): number[] | null => (items ? items.map((s) => Number(sep ? s.split(sep)[1] : s)) : null);
/** Values of the n-th array scene of the step. */
const arrCells = (step: Step, n = 0): (string | number)[] => {
  const arrs = scenesOf(step).filter((s) => s.kind === 'array');
  const a = arrs[n] as { cells: { value: string | number }[] } | undefined;
  return a ? a.cells.map((c) => c.value) : [];
};
/** Greedy partition used by "ship in D days" / "split array": day sums and the 1-based day of every element. */
const greedySplit = (a: number[], cap: number): { sums: number[]; asg: number[] } => {
  const sums: number[] = [];
  const asg: number[] = [];
  let cur = 0;
  for (const w of a) { if (cur + w > cap) { sums.push(cur); cur = 0; } cur += w; asg.push(sums.length + 1); }
  sums.push(cur);
  return { sums, asg };
};
/** Row `row` of the first grid scene read as labels like "D3" -> 3; "·" / "?" -> null. Returns null when the row holds no label at all. */
const gridLabels = (step: Step, row: number, prefix: string): (number | null)[] | null => {
  const g = scenesOf(step).find((x) => x.kind === 'grid') as { rows: { value: string | number }[][] } | undefined;
  if (!g || !g.rows[row]) return null;
  const vals = g.rows[row].map((c) => (typeof c.value === 'string' && c.value.startsWith(prefix) ? Number(c.value.slice(prefix.length)) : null));
  return vals.some((v) => v !== null) ? vals : null;
};
/** Numeric cells of row `row` of the first grid scene ("·", "?", "—" and other text -> null). */
const gridNums = (step: Step, row: number): (number | null)[] => {
  const g = scenesOf(step).find((x) => x.kind === 'grid') as { rows: { value: string | number }[][] } | undefined;
  return g && g.rows[row] ? g.rows[row].map((c) => (typeof c.value === 'number' ? c.value : null)) : [];
};
const sortedNum = (a: number[] | null): number[] | null => (a ? [...a].sort((x, y) => x - y) : null);
const sumOf = (a: number[]): number => a.reduce((x, y) => x + y, 0);

type NumsK = { nums: number[]; k: number };
const cases: OracleCase[] = [];
const add = (c: OracleCase) => cases.push(c);

/* ================================================================== 1. Two Sum (hash map) */
type TwoSumIn = { nums: number[]; target: number };
add({
  slug: '1-two-sum',
  gen: (r): TwoSumIn => {
    const n = rint(r, 2, 10);
    const nums = rarr(r, n, -6, 12);
    const target = r() < 0.7 ? nums[rint(r, 0, n - 1)] + nums[rint(r, 0, n - 1)] : rint(r, -5, 25);
    return { nums, target };
  },
  oracle: ({ nums, target }) => {
    const out: State[] = [];
    const seen: [number, number][] = []; // insertion-ordered value -> index
    const items = () => seen.map(([v, i]) => `${v} → ${i}`);
    out.push({ i: null, map: items(), found: null });
    for (let i = 0; i < nums.length; i++) {
      out.push({ i, map: items(), found: null });
      const need = target - nums[i];
      const hit = seen.find(([v]) => v === need);
      if (hit) { out.push({ i, map: items(), found: `[${hit[1]}, ${i}]` }); return out; }
      const e = seen.find(([v]) => v === nums[i]);
      if (e) e[1] = i; else seen.push([nums[i], i]);
      out.push({ i, map: items(), found: null });
    }
    out.push({ i: null, map: items(), found: 'none' });
    return out;
  },
  project: (s) => ({ i: num(s, 'i'), map: auxItems(s, 'Map seen') ?? [], found: shown(s, 'found') }),
  notes: 'cell colours and the Lookup panel are not compared; map order is insertion order (JS Map).',
});

/* ================================================================== 1011. Capacity to ship packages in D days */
add({
  slug: '1011-capacity-to-ship-packages',
  gen: (r): NumsK => { const n = rint(r, 1, 10); return { nums: rarr(r, n, 1, 30), k: rint(r, 1, n) }; },
  oracle: ({ nums, k }) => {
    const out: State[] = [];
    let lo = Math.max(...nums), hi = sumOf(nums);
    out.push({ lo, mid: null, hi, need: null, sums: null, asg: null });
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      out.push({ lo, mid, hi, need: null, sums: null, asg: null });
      const d = greedySplit(nums, mid);
      out.push({ lo, mid, hi, need: d.sums.length, sums: d.sums, asg: d.asg });
      if (d.sums.length <= k) hi = mid; else lo = mid + 1;
      out.push({ lo, mid, hi, need: d.sums.length, sums: null, asg: null });
    }
    const f = greedySplit(nums, lo);
    out.push({ lo, mid: null, hi, need: f.sums.length, sums: f.sums, asg: f.asg });
    return out;
  },
  project: (s) => {
    const sums = nums(auxItems(s, 'Day sums') ?? auxItems(s, 'Final split'), ': ');
    return { lo: num(s, 'lo'), mid: num(s, 'mid'), hi: num(s, 'hi'), need: num(s, 'days needed'), sums, asg: gridLabels(s, 1, 'D') };
  },
  notes: 'cell colours not compared; the grid\'s "day" row (which day each weight ships on) is compared at every feasibility check.',
});

/* ================================================================== 11. Container with most water */
add({
  slug: '11-container-with-most-water',
  gen: (r) => ({ height: rarr(r, rint(r, 2, 10), 0, 9) }),
  oracle: ({ height }: { height: number[] }) => {
    const out: State[] = [];
    let l = 0, r = height.length - 1, best = 0;
    out.push({ l, r, area: null, best });
    while (l < r) {
      const area = Math.min(height[l], height[r]) * (r - l);
      best = Math.max(best, area);
      out.push({ l, r, area, best });
      if (height[l] < height[r]) l++; else r--;
    }
    out.push({ l, r, area: null, best });
    return out;
  },
  project: (s) => ({ l: num(s, 'l'), r: num(s, 'r'), area: num(s, 'area'), best: num(s, 'best') }),
  notes: 'the move steps (which pointer moves) are folded into the next area step; the pointer chips on the Done step show the best pair and are not compared.',
});
/* NOTE for 11: the animation shows area for the NEW pointers together with the move (vars l/r change in the same step as area), so states are compared after each area computation. */

/* ================================================================== 121. Best time to buy and sell stock */
add({
  slug: '121-best-time-to-buy-and-sell-stock',
  gen: (r) => ({ prices: rarr(r, rint(r, 1, 10), 1, 12) }),
  oracle: ({ prices }: { prices: number[] }) => {
    const out: State[] = [];
    let minP = prices[0], minI = 0, best = 0;
    out.push({ i: 0, minPrice: minP, profit: null, best, minAt: null });
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] < minP) { minP = prices[i]; minI = i; }
      const profit = prices[i] - minP;
      best = Math.max(best, profit);
      out.push({ i, minPrice: minP, profit, best, minAt: minI === i ? null : minI });
    }
    out.push({ i: null, minPrice: minP, profit: null, best, minAt: null });
    return out;
  },
  project: (s) => ({ i: num(s, 'i'), minPrice: num(s, 'min price'), profit: num(s, 'profit'), best: num(s, 'best profit'), minAt: ptr(s, 'm') }),
  notes: 'cell colours not compared; a single price has only the start and done states.',
});

/* ================================================================== 128. Longest consecutive sequence */
add({
  slug: '128-longest-consecutive-sequence',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 10), -3, 9) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const out: State[] = [];
    const set = new Set(nums);
    const setList = [...set].sort((a, b) => a - b);
    let best = 0;
    out.push({ x: null, len: null, best, set: setList });
    const handled = new Set<number>();
    for (const x of nums) {
      // design choice of the animation: a repeated value gets its own "already handled" step and is not re-walked
      if (handled.has(x) || set.has(x - 1)) { handled.add(x); out.push({ x, len: null, best, set: setList }); continue; }
      handled.add(x);
      let len = 1, y = x;
      out.push({ x, len, best, set: setList });
      while (set.has(y + 1)) { y++; len++; out.push({ x, len, best, set: setList }); }
      best = Math.max(best, len);
      out.push({ x, len, best, set: setList });
    }
    out.push({ x: null, len: null, best, set: setList });
    return out;
  },
  project: (s) => ({ x: num(s, 'x'), len: num(s, 'len'), best: num(s, 'best'), set: sortedNum(nums(auxItems(s, 'set of numbers'))) }),
  notes: 'pointer chip positions and cell colours not compared; set compared as a sorted multiset-free list.',
});

/* ================================================================== 1438. Longest subarray with abs diff limit (two monotonic deques) */
add({
  slug: '1438-longest-continuous-subarray-with-abs-diff-limit',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 10), 0, 12), limit: r() < 0.2 ? 0 : rint(r, 0, 12) }),
  oracle: ({ nums, limit }: { nums: number[]; limit: number }) => {
    const out: State[] = [];
    const mx: number[] = [], mn: number[] = [];
    let l = 0, best = 0, bl = 0, br = -1;
    out.push({ L: 0, R: null, max: null, min: null, best, maxQ: [], minQ: [] });
    for (let r = 0; r < nums.length; r++) {
      while (mx.length && mx[mx.length - 1] < nums[r]) mx.pop();
      mx.push(nums[r]);
      while (mn.length && mn[mn.length - 1] > nums[r]) mn.pop();
      mn.push(nums[r]);
      out.push({ L: l, R: r, max: mx[0], min: mn[0], best, maxQ: [...mx], minQ: [...mn] });
      while (mx[0] - mn[0] > limit) {
        if (mx[0] === nums[l]) mx.shift();
        if (mn[0] === nums[l]) mn.shift();
        l++;
        out.push({ L: l, R: r, max: mx[0], min: mn[0], best, maxQ: [...mx], minQ: [...mn] });
      }
      if (r - l + 1 > best) { best = r - l + 1; bl = l; br = r; }
      out.push({ L: l, R: r, max: mx[0], min: mn[0], best, maxQ: [...mx], minQ: [...mn] });
    }
    const w = nums.slice(bl, br + 1);
    out.push({ L: bl, R: br, max: Math.max(...w), min: Math.min(...w), best, maxQ: [], minQ: [] });
    return out;
  },
  project: (s) => ({
    L: num(s, 'L'), R: num(s, 'R'), max: num(s, 'max'), min: num(s, 'min'), best: num(s, 'best'),
    maxQ: nums(auxItems(s, 'max deque')) ?? [], minQ: nums(auxItems(s, 'min deque')) ?? [],
  }),
  invariants: [
    (s, _i, _st, { nums: a }: { nums: number[] }) => {
      const L = num(s, 'L'), R = num(s, 'R'), mx = num(s, 'max'), mn = num(s, 'min');
      if (L === null || R === null || mx === null || mn === null) return null;
      const w = a.slice(L, R + 1);
      if (!w.length) return null;
      return Math.max(...w) === mx && Math.min(...w) === mn ? null : `max/min ${mx}/${mn} != window [${L}..${R}] max/min`;
    },
  ],
  notes: 'cell colours not compared. Final Done step shows the best window with empty deques.',
});

/* ================================================================== 1480. Running sum / prefix sum with a range query */
type RunIn = { nums: number[]; l?: number; r?: number };
add({
  slug: '1480-running-sum-of-1d-array',
  gen: (r): RunIn => {
    const n = rint(r, 1, 9);
    const nums = rarr(r, n, -5, 9);
    if (r() < 0.5) { const a = rint(r, 0, n - 1); return { nums, l: a, r: rint(r, a, n - 1) }; }
    return { nums };
  },
  oracle: ({ nums, l: ql, r: qr }: RunIn) => {
    const n = nums.length;
    const l = ql ?? Math.min(1, n - 1), r = qr ?? Math.min(3, n - 1);
    const out: State[] = [];
    const P = [0];
    out.push({ i: null, prefix: 0, pre: [0], sum: null });
    for (let i = 0; i < n; i++) {
      P.push(P[i] + nums[i]);
      out.push({ i, prefix: P[i + 1], pre: [...P], sum: null });
    }
    out.push({ i: null, prefix: P[r + 1], pre: [...P], sum: '?' });
    out.push({ i: null, prefix: P[r + 1], pre: [...P], sum: P[r + 1] - P[l] });
    out.push({ i: null, prefix: P[n], pre: [...P], sum: P[r + 1] - P[l] });
    return out;
  },
  project: (s) => ({
    i: num(s, 'i'), prefix: num(s, 'prefix'),
    pre: arrCells(s, 1).filter((v) => v !== '·') as number[],
    sum: shown(s, 'sum(l,r)'),
  }),
  notes: 'when no query is given the animation queries (min(1,n-1), min(3,n-1)); the oracle mirrors that default. Cell colours and pointer chips not compared.',
});

/* ================================================================== 15. 3Sum */
add({
  slug: '15-3sum',
  gen: (r) => ({ nums: rarr(r, rint(r, 3, 9), -4, 4) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const out: State[] = [];
    const a = [...nums].sort((x, y) => x - y);
    const n = a.length;
    const found: string[] = [];
    const st = (i: number | null, l: number | null, r: number | null, sum: number | null, arr = a): State => ({ i, l, r, sum, trip: found.length, list: [...found], arr: [...arr] });
    out.push(st(null, null, null, null, nums));
    out.push(st(null, null, null, null));
    for (let i = 0; i < n - 2; i++) {
      if (a[i] > 0) { out.push(st(i, null, null, null)); break; } // "x > 0: stop" step
      if (i > 0 && a[i] === a[i - 1]) { out.push(st(i, null, null, null)); continue; }
      let l = i + 1, r = n - 1;
      out.push(st(i, l, r, null));
      while (l < r) {
        const sum = a[i] + a[l] + a[r];
        if (sum === 0) {
          found.push(`[${a[i]}, ${a[l]}, ${a[r]}]`);
          out.push(st(i, l, r, sum));
          l++; r--;
          while (l < r && a[l] === a[l - 1]) l++;
          while (l < r && a[r] === a[r + 1]) r--;
        } else {
          out.push(st(i, l, r, sum));
          if (sum < 0) l++; else r--;
        }
      }
    }
    out.push(st(null, null, null, null));
    return out;
  },
  project: (s) => {
    // steps that only move l / r after a compare (sum shown as "—" while l and r are set) are folded into the next compare
    const sum = num(s, 'sum'), l = num(s, 'l');
    if (sum === null && l !== null && !s.title.startsWith('Fix')) return null;
    return { i: num(s, 'i'), l, r: num(s, 'r'), sum, trip: num(s, 'triplets'), list: auxItems(s, 'TRIPLETS') ?? [], arr: arrCells(s) };
  },
  notes: 'the "move inward / skip duplicates" steps (sum shown as —) are not compared directly, but the l/r they produce are checked by the next compare; cell colours not compared.',
});

/* ================================================================== 152. Maximum product subarray */
add({
  slug: '152-maximum-product-subarray',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 8), -4, 4) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const n = nums.length;
    const out: State[] = [];
    const mx: (number | null)[] = nums.map(() => null);
    const mn: (number | null)[] = nums.map(() => null);
    const rows = () => ({ mxRow: [...mx], mnRow: [...mn] });
    let cm = nums[0], cn = nums[0], best = nums[0];
    mx[0] = cm; mn[0] = cn;
    out.push({ i: 0, a: null, b: null, best, ...rows() });
    for (let i = 1; i < n; i++) {
      const x = nums[i];
      const a = cm * x, b = cn * x;
      out.push({ i, a, b, best, ...rows() }); // three candidates: x, cm*x, cn*x
      cm = Math.max(x, a, b); cn = Math.min(x, a, b);
      mx[i] = cm; mn[i] = cn;
      out.push({ i, a, b, best, ...rows() });
      best = Math.max(best, cm);
      out.push({ i, a, b, best, ...rows() });
    }
    out.push({ i: null, a: null, b: null, best, ...rows() });
    return out;
  },
  project: (s, _in, idx) => {
    if (idx === 0) return null; // the intro step ("why track a minimum too?") has no algorithm state yet
    const g = scenesOf(s).find((x) => x.kind === 'grid') as { rows: { value: string | number }[][] } | undefined;
    const row = (k: number) => (g ? g.rows[k].map((c) => (c.value === '?' ? null : (c.value as number))) : []);
    return { i: num(s, 'i'), a: num(s, 'cur×max'), b: num(s, 'cur×min'), best: num(s, 'best'), mxRow: row(1), mnRow: row(2) };
  },
  notes: 'a/b = (previous max × x) and (previous min × x) shown as cur×max / cur×min; the grid\'s "max/min ending here" rows are compared (? = not computed yet); cell colours not compared.',
});

/* ================================================================== 16. 3Sum closest */
add({
  slug: '16-3sum-closest',
  gen: (r) => ({ nums: rarr(r, rint(r, 3, 8), -9, 9), target: rint(r, -15, 15) }),
  oracle: ({ nums, target }: { nums: number[]; target: number }) => {
    const out: State[] = [];
    const a = [...nums].sort((x, y) => x - y);
    const n = a.length;
    let best = a[0] + a[1] + a[2];
    const st = (i: number | null, l: number | null, r: number | null, sum: number | null, arr: number[]): State => ({ i, l, r, sum, best, arr: [...arr] });
    // The animation's Start step already shows the best guess taken from the SORTED array, with the array still unsorted.
    out.push(st(null, null, null, null, nums));
    out.push(st(null, null, null, null, a));
    for (let i = 0; i < n - 2; i++) {
      let l = i + 1, r = n - 1;
      out.push(st(i, l, r, null, a));
      while (l < r) {
        const sum = a[i] + a[l] + a[r];
        if (Math.abs(sum - target) < Math.abs(best - target)) best = sum;
        out.push(st(i, l, r, sum, a));
        if (sum === target) { out.push(st(null, null, null, best, a)); return out; }
        if (sum < target) l++; else r--;
      }
    }
    out.push(st(null, null, null, best, a)); // Done step shows the best sum in the "sum" slot
    return out;
  },
  project: (s) => ({ i: num(s, 'i'), l: num(s, 'l'), r: num(s, 'r'), sum: num(s, 'sum'), best: num(s, 'best'), arr: arrCells(s) }),
  notes: 'cell colours and the CLOSEST SO FAR panel text not compared. The Done step displays best in the sum slot (design choice).',
});

/* ================================================================== 162. Find peak element */
add({
  slug: '162-find-peak-element',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 9), 0, 9) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const out: State[] = [];
    let lo = 0, hi = nums.length - 1, it = 0;
    out.push({ lo, mid: null, hi, it, slope: null, peak: null });
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      it++;
      out.push({ lo, mid, hi, it, slope: null, peak: null });
      const up = nums[mid] < nums[mid + 1];
      out.push({ lo, mid, hi, it, slope: up ? 'up' : 'down', peak: null });
      if (up) lo = mid + 1; else hi = mid;
      out.push({ lo, mid, hi, it, slope: null, peak: null });
    }
    out.push({ lo, mid: null, hi, it, slope: null, peak: lo });
    return out;
  },
  project: (s) => {
    const box = auxItems(s, 'Compare box') ?? [];
    const last = box[box.length - 1] ?? '';
    const slope = last.includes('uphill') ? 'up' : last.includes('downhill') ? 'down' : null;
    return { lo: num(s, 'lo'), mid: num(s, 'mid'), hi: num(s, 'hi'), it: num(s, 'iterations'), slope, peak: ptr(s, 'p') };
  },
  notes: 'cell colours not compared; slope read from the compare box text (uphill when nums[mid] < nums[mid+1]).',
});

/* ================================================================== 167. Two Sum II (sorted, two pointers) */
add({
  slug: '167-two-sum-ii',
  gen: (r) => {
    // the problem guarantees exactly one pair; reject other inputs
    for (;;) {
      const n = rint(r, 2, 9);
      const numbers = rarr(r, n, 1, 15).sort((a, b) => a - b);
      const target = rint(r, 2, 30);
      let pairs = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (numbers[i] + numbers[j] === target) pairs++;
      if (pairs === 1) return { numbers, target };
    }
  },
  oracle: ({ numbers, target }: { numbers: number[]; target: number }) => {
    const out: State[] = [];
    let l = 0, r = numbers.length - 1;
    out.push({ L: l, R: r, sum: null });
    for (;;) {
      const sum = numbers[l] + numbers[r];
      out.push({ L: l, R: r, sum });
      if (sum === target) return out;
      if (sum < target) l++; else r--;
      out.push({ L: l, R: r, sum }); // pointer moved, the shown sum is still the old one
    }
  },
  project: (s) => ({ L: num(s, 'L'), R: num(s, 'R'), sum: num(s, 'sum') }),
  notes: 'cell colours and the pointer-card text not compared; the answer pair is the final L/R.',
});

/* ================================================================== 169. Majority element (Boyer-Moore) */
add({
  slug: '169-majority-element',
  gen: (r) => {
    const n = rint(r, 1, 11);
    const maj = rint(r, 1, 5);
    const nums = rarr(r, n, 1, 5);
    const need = Math.floor(n / 2) + 1;
    const pos = Array.from({ length: n }, (_, i) => i).sort(() => r() - 0.5).slice(0, need);
    for (const p of pos) nums[p] = maj; // the problem guarantees a majority element
    return { nums };
  },
  oracle: ({ nums }: { nums: number[] }) => {
    const out: State[] = [];
    let cand: number | null = null, count = 0;
    out.push({ i: null, x: null, cand, count, ans: null });
    for (let i = 0; i < nums.length; i++) {
      const x = nums[i];
      if (count === 0) cand = x;
      count += x === cand ? 1 : -1;
      out.push({ i, x, cand, count, ans: null });
    }
    out.push({ i: null, x: null, cand, count, ans: cand });
    return out;
  },
  project: (s) => ({ i: num(s, 'i'), x: num(s, 'x'), cand: num(s, 'candidate'), count: num(s, 'count'), ans: s.result ? Number(s.result.title) : null }),
  notes: 'cell colours not compared; the animation shows count after the vote; input restricted to arrays that have a majority element.',
});

/* ================================================================== 1696. Jump game VI (dp + monotonic deque) */
add({
  slug: '1696-jump-game-vi',
  gen: (r) => { const n = rint(r, 1, 9); return { nums: rarr(r, n, -9, 9), k: rint(r, 1, 4) }; },
  oracle: ({ nums, k }: NumsK) => {
    const out: State[] = [];
    const n = nums.length;
    const dp = [nums[0]];
    const dq = [0];
    const q = () => dq.map((j) => `${j}: dp=${dp[j]}`);
    const row = () => nums.map((_, j) => (j < dp.length ? dp[j] : null)); // the grid's dp row, "?" = not computed yet
    out.push({ i: 0, front: 0, dpi: nums[0], dq: q(), dpRow: row() });
    for (let i = 1; i < n; i++) {
      if (dq[0] < i - k) {
        dq.shift();
        out.push({ i, front: dq[0], dpi: null, dq: q(), dpRow: row() });
      }
      dp[i] = nums[i] + dp[dq[0]];
      out.push({ i, front: dq[0], dpi: dp[i], dq: q(), dpRow: row() });
      while (dq.length && dp[dq[dq.length - 1]] <= dp[i]) dq.pop();
      dq.push(i);
      out.push({ i, front: dq[0], dpi: dp[i], dq: q(), dpRow: row() });
    }
    out.push({ i: null, front: dq[0], dpi: null, dq: q(), dpRow: row() });
    return out;
  },
  project: (s) => ({ i: num(s, 'i'), front: num(s, 'front'), dpi: num(s, 'dp[i]'), dq: auxItems(s, 'deque of indexes') ?? [], dpRow: gridNums(s, 1) }),
  notes: 'cell colours not compared; deque contents (index: dp), front/dp[i] and the grid\'s dp row (? = not computed yet) are.',
});

/* ================================================================== 209. Minimum size subarray sum (variable window) */
add({
  slug: '209-minimum-size-subarray-sum',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 10), 1, 9), target: rint(r, 1, 30) }),
  oracle: ({ nums, target }: { nums: number[]; target: number }) => {
    const out: State[] = [];
    let l = 0, sum = 0, best = Infinity, bl = -1, br = -1;
    const b = () => (best === Infinity ? '∞' : best);
    out.push({ L: 0, R: null, sum: 0, best: b(), ans: null });
    for (let r = 0; r < nums.length; r++) {
      sum += nums[r];
      out.push({ L: l, R: r, sum, best: b(), ans: null });
      while (sum >= target) {
        if (r - l + 1 < best) { best = r - l + 1; bl = l; br = r; }
        out.push({ L: l, R: r, sum, best: b(), ans: null });
        sum -= nums[l];
        l++;
        out.push({ L: l, R: r, sum, best: b(), ans: null });
      }
    }
    if (best === Infinity) out.push({ L: null, R: null, sum, best: 0, ans: 0 });
    else out.push({ L: bl, R: br, sum: nums.slice(bl, br + 1).reduce((x, y) => x + y, 0), best, ans: best });
    return out;
  },
  project: (s) => ({ L: num(s, 'L'), R: num(s, 'R'), sum: num(s, 'sum'), best: shown(s, 'best'), ans: s.result ? Number(s.result.title) : null }),
  notes: 'cell colours not compared. Done step frames the best window [bl..br] with its sum (or "no valid subarray": best 0).',
});

/* ================================================================== 229. Majority element II (Boyer-Moore, two candidates) */
add({
  slug: '229-majority-element-ii',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 11), 1, r() < 0.5 ? 3 : 5) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const out: State[] = [];
    let c1: number | null = null, c2: number | null = null, n1 = 0, n2 = 0;
    const st = (i: number | null, x: number | null, extra: Partial<State> = {}): State => ({ i, x, c1, n1, c2, n2, chk: null, ans: null, ...extra });
    out.push(st(null, null));
    for (let i = 0; i < nums.length; i++) {
      const x = nums[i];
      if (n1 > 0 && x === c1) n1++;
      else if (n2 > 0 && x === c2) n2++;
      else if (n1 === 0) { c1 = x; n1 = 1; }
      else if (n2 === 0) { c2 = x; n2 = 1; }
      else { n1--; n2--; }
      out.push(st(i, x));
    }
    out.push(st(null, null));
    const res: number[] = [];
    const lim = Math.floor(nums.length / 3);
    for (const c of [c1, c2]) {
      if (c === null) continue;
      const cnt = nums.filter((v) => v === c).length;
      out.push(st(null, null, { chk: `count of ${c} → ${cnt}` }));
      if (cnt > lim && !res.includes(c)) res.push(c);
    }
    res.sort((p, q) => p - q); // the animation lists the answer in ascending order (any order is valid for LC 229)
    out.push(st(null, null, { ans: `[${res.join(',')}]` }));
    return out;
  },
  project: (s) => {
    const items = auxItems(s, 'Votes') ?? [];
    const chk = items.find((t) => t.startsWith('count of')) ?? null;
    return { i: num(s, 'i'), x: num(s, 'x'), c1: num(s, 'c1'), n1: num(s, 'n1'), c2: num(s, 'c2'), n2: num(s, 'n2'), chk, ans: s.result ? s.result.title : null };
  },
  notes: 'cell colours not compared. A candidate slot that was never assigned is "—" (null).',
});

/* ================================================================== 238. Product of array except self */
add({
  slug: '238-product-of-array-except-self',
  gen: (r) => ({ nums: rarr(r, rint(r, 2, 8), -4, 4) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const n = nums.length;
    const out: State[] = [];
    const ans: (number | null)[] = nums.map(() => null);
    const st = (i: number | null, prefix: number, suffix: number, phase: string): State => ({ i, prefix, suffix, phase, ans: [...ans] });
    out.push(st(null, 1, 1, 'setup'));
    let prefix = 1;
    for (let i = 0; i < n; i++) {
      ans[i] = prefix;
      prefix *= nums[i];
      out.push(st(i, prefix, 1, 'left'));
    }
    let suffix = 1;
    for (let i = n - 1; i >= 0; i--) {
      ans[i] = (ans[i] as number) * suffix;
      suffix *= nums[i];
      out.push(st(i, prefix, suffix, 'right'));
    }
    out.push(st(null, prefix, suffix, 'done'));
    return out;
  },
  project: (s) => {
    const g = scenesOf(s).find((x) => x.kind === 'grid') as { rows: { value: string | number }[][] } | undefined;
    const ans = g ? g.rows[1].map((c) => (c.value === '·' ? null : (c.value as number))) : [];
    return { i: num(s, 'i'), prefix: num(s, 'prefix'), suffix: num(s, 'suffix'), phase: shown(s, 'phase'), ans };
  },
  notes: 'cell colours and the Running products panel text not compared; the answer row of the grid is (· = not written yet).',
});

/* ================================================================== 239. Sliding window maximum (monotonic deque) */
add({
  slug: '239-sliding-window-maximum',
  gen: (r) => { const n = rint(r, 1, 10); return { nums: rarr(r, n, -5, 9), k: rint(r, 1, n) }; },
  oracle: ({ nums, k }: NumsK) => {
    const out: State[] = [];
    const dq: number[] = [];
    const ans: number[] = [];
    const st = (i: number | null): State => ({
      i,
      win: i === null ? null : `[${Math.max(0, i - k + 1)}..${i}]`,
      dq: dq.map((j) => `${j}:${nums[j]}`),
      wmax: i !== null && dq.length && i >= k - 1 ? nums[dq[0]] : null,
      out: [...ans],
    });
    out.push(st(null));
    for (let i = 0; i < nums.length; i++) {
      while (dq.length && nums[dq[dq.length - 1]] <= nums[i]) { dq.pop(); out.push(st(i)); }
      dq.push(i);
      out.push(st(i));
      if (dq[0] <= i - k) { dq.shift(); out.push(st(i)); }
      if (i >= k - 1) { ans.push(nums[dq[0]]); out.push(st(i)); }
    }
    out.push(st(null));
    return out;
  },
  project: (s) => ({
    i: num(s, 'i'),
    win: shown(s, 'window'),
    dq: auxItems(s, 'deque of candidates') ?? [],
    wmax: num(s, 'window max'),
    out: nums(auxItems(s, 'window maximums')) ?? [],
  }),
  invariants: [
    // the chips frame the window: R on i, L on i - k + 1 once the first window is full
    (s, _i, _st, { k }: NumsK) => {
      const i = num(s, 'i');
      if (i === null) return null;
      const R = ptr(s, 'r'), L = ptr(s, 'l');
      if (R !== i) return `chip R at ${R}, i = ${i}`;
      const wantL = i - k + 1 >= 0 ? i - k + 1 : null;
      return L === wantL ? null : `chip L at ${L}, expected ${wantL}`;
    },
  ],
  notes: 'follows the Java in problem.java: pop back, push, expire front, record. Cell colours not compared; chips R/L are checked by an invariant.',
});

/* ================================================================== 26. Remove duplicates from sorted array */
add({
  slug: '26-remove-duplicates-from-sorted-array',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 10), 0, 5).sort((a, b) => a - b) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const out: State[] = [];
    const a = [...nums];
    let slow = 0;
    const st = (fast: number | null, unique: number): State => ({ slow, fast, unique, arr: [...a] });
    out.push(st(null, 1));
    for (let fast = 1; fast < a.length; fast++) {
      out.push(st(fast, slow + 1));
      if (a[fast] !== a[slow]) {
        slow++;
        out.push(st(fast, slow + 1)); // slow advanced, the cell still holds the old value
        a[slow] = a[fast];
        out.push(st(fast, slow + 1)); // written
      }
    }
    out.push(st(null, slow + 1));
    return out;
  },
  project: (s) => ({ slow: num(s, 'slow'), fast: num(s, 'fast'), unique: num(s, 'unique'), arr: arrCells(s) }),
  notes: 'cell colours and the INVARIANT panel not compared; the array shown is the in-place array (tail left untouched).',
});

/* ================================================================== 3. Longest substring without repeating characters */
add({
  slug: '3-longest-substring-without-repeating-characters',
  gen: (r) => ({ s: rstr(r, rint(r, 1, 10), r() < 0.3 ? 'ab' : 'abcd') }),
  oracle: ({ s }: { s: string }) => {
    const out: State[] = [];
    const win = new Map<string, number>(); // JS Map: insertion order, like the animation's panel
    const items = () => [...win].map(([c, n]) => `'${c}' ×${n}`);
    let l = 0, result = 0, bl = 0, br = -1;
    out.push({ L: null, R: null, len: null, result, win: items() });
    for (let r = 0; r < s.length; r++) {
      const c = s[r];
      win.set(c, (win.get(c) ?? 0) + 1);
      out.push({ L: l, R: r, len: r - l + 1, result, win: items() });
      while ((win.get(c) as number) > 1) {
        const o = s[l];
        const k = (win.get(o) as number) - 1;
        if (k === 0) win.delete(o); else win.set(o, k);
        l++;
        out.push({ L: l, R: r, len: r - l + 1, result, win: items() });
      }
      if (r - l + 1 > result) { result = r - l + 1; bl = l; br = r; }
      out.push({ L: l, R: r, len: r - l + 1, result, win: items() });
    }
    // Done: the best window is framed and the panel lists its letters (first-seen order)
    const best = new Map<string, number>();
    for (const c of s.slice(bl, br + 1)) best.set(c, (best.get(c) ?? 0) + 1);
    out.push({ L: bl, R: br, len: br - bl + 1, result, win: [...best].map(([c, n]) => `'${c}' ×${n}`) });
    return out;
  },
  project: (s) => ({
    L: num(s, 'L'), R: num(s, 'R'), len: num(s, 'len'), result: num(s, 'result'),
    win: (auxItems(s, 'Window contents') ?? []),
  }),
  invariants: [
    // after every step that shows a valid window, the panel counts equal the letters of s[L..R]
    (st, _i, _steps, { s }: { s: string }) => {
      const L = num(st, 'L'), R = num(st, 'R');
      if (L === null || R === null) return null;
      const items = auxItems(st, 'Window contents') ?? [];
      const total = items.reduce((a, t) => a + Number(t.split('×')[1]), 0);
      return total === R - L + 1 ? null : `panel counts add to ${total} but window [${L}..${R}] has ${R - L + 1} chars of ${s}`;
    },
  ],
  notes: 'cell colours not compared. Done frames the first best window and the panel lists that window\'s letters.',
});

/* ================================================================== 33. Search in rotated sorted array */
type RotIn = { nums: number[]; target: number };
const genRotated = (r: () => number): RotIn => {
  const n = rint(r, 1, 9);
  const set = new Set<number>();
  while (set.size < n) set.add(rint(r, 0, 15));
  const sorted = [...set].sort((a, b) => a - b);
  const k = rint(r, 0, n - 1);
  const nums = [...sorted.slice(k), ...sorted.slice(0, k)];
  return { nums, target: r() < 0.7 ? nums[rint(r, 0, n - 1)] : rint(r, -1, 16) };
};
add({
  slug: '33-search-in-rotated-sorted-array',
  gen: genRotated,
  oracle: ({ nums, target }: RotIn) => {
    const out: State[] = [];
    let lo = 0, hi = nums.length - 1, it = 0;
    out.push({ lo, mid: null, hi, it, half: null, ans: null });
    while (lo <= hi) {
      const mid = lo + ((hi - lo) >> 1);
      it++;
      out.push({ lo, mid, hi, it, half: null, ans: null });
      if (nums[mid] === target) { out.push({ lo, mid, hi, it, half: null, ans: mid }); return out; }
      if (nums[lo] <= nums[mid]) {
        out.push({ lo, mid, hi, it, half: 'left', ans: null });
        if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
      } else {
        out.push({ lo, mid, hi, it, half: 'right', ans: null });
        if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
      }
      out.push({ lo, mid, hi, it, half: null, ans: null });
    }
    out.push({ lo, mid: null, hi, it, half: null, ans: -1 });
    return out;
  },
  project: (s) => {
    const box = auxItems(s, 'Compare box') ?? [];
    const last = box[box.length - 1] ?? '';
    return {
      lo: num(s, 'lo'), mid: num(s, 'mid'), hi: num(s, 'hi'), it: num(s, 'iterations'),
      half: last.includes('left sorted') ? 'left' : last.includes('right sorted') ? 'right' : null,
      ans: s.result ? Number(s.result.title) : null,
    };
  },
  notes: 'cell colours not compared; the sorted half is read from the compare-box line "… → left/right sorted".',
});

/* ================================================================== 34. First and last position (two binary searches) */
add({
  slug: '34-find-first-and-last-position',
  gen: (r) => {
    const n = rint(r, 1, 9);
    const nums = rarr(r, n, 0, 6).sort((a, b) => a - b);
    return { nums, target: r() < 0.7 ? nums[rint(r, 0, n - 1)] : rint(r, -1, 7) };
  },
  oracle: ({ nums, target }: RotIn) => {
    const n = nums.length;
    const out: State[] = [];
    let first = -1, last = -1;
    const st = (search: string, lo: number | null, mid: number | null, hi: number | null, cand: number | null, ans: string | null = null): State => ({ search, lo, mid, hi, cand, first, last, ans });
    // leftmost
    let lo = 0, hi = n - 1, cand: number | null = null;
    out.push(st('leftmost', lo, null, hi, cand));
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      out.push(st('leftmost', lo, mid, hi, cand));
      if (nums[mid] === target) { cand = mid; first = mid; hi = mid - 1; }
      else if (nums[mid] < target) lo = mid + 1;
      else hi = mid - 1;
      out.push(st('leftmost', lo, mid, hi, cand));
    }
    if (cand === null) { out.push(st('done', null, null, null, null, '[-1, -1]')); return out; }
    // rightmost
    lo = 0; hi = n - 1; cand = null;
    out.push(st('rightmost', lo, null, hi, cand));
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      out.push(st('rightmost', lo, mid, hi, cand));
      if (nums[mid] === target) { cand = mid; last = mid; lo = mid + 1; }
      else if (nums[mid] < target) lo = mid + 1;
      else hi = mid - 1;
      out.push(st('rightmost', lo, mid, hi, cand));
    }
    out.push(st('done', null, null, null, null, `[${first}, ${last}]`));
    return out;
  },
  project: (s) => ({
    search: shown(s, 'search'), lo: num(s, 'lo'), mid: num(s, 'mid'), hi: num(s, 'hi'), cand: num(s, 'candidate'),
    first: num(s, 'first'), last: num(s, 'last'), ans: s.result ? s.result.title : null,
  }),
  notes: 'cell colours not compared. If the leftmost search finds nothing the rightmost search is skipped (as in the Java).',
});

/* ================================================================== 35. Search insert position */
add({
  slug: '35-search-insert-position',
  gen: (r) => {
    const n = rint(r, 1, 8);
    const set = new Set<number>();
    while (set.size < n) set.add(rint(r, 1, 14));
    return { nums: [...set].sort((a, b) => a - b), target: rint(r, 0, 15) };
  },
  oracle: ({ nums, target }: RotIn) => {
    const out: State[] = [];
    let lo = 0, hi = nums.length - 1, it = 0;
    out.push({ lo, mid: null, hi, it, ans: null });
    while (lo <= hi) {
      const mid = lo + ((hi - lo) >> 1);
      it++;
      out.push({ lo, mid, hi, it, ans: null });
      if (nums[mid] === target) { out.push({ lo, mid, hi, it, ans: mid }); return out; }
      if (nums[mid] < target) lo = mid + 1; else hi = mid - 1;
      out.push({ lo, mid, hi, it, ans: null });
    }
    out.push({ lo, mid: null, hi, it, ans: lo });
    return out;
  },
  project: (s) => ({ lo: num(s, 'lo'), mid: num(s, 'mid'), hi: num(s, 'hi'), it: num(s, 'iterations'), ans: s.result ? Number(s.result.title) : null }),
  notes: 'cell colours not compared; the insertAt variable is checked separately in the invariant (it mirrors lo while searching).',
  invariants: [
    (s) => {
      const lo = num(s, 'lo'), ins = num(s, 'insertAt');
      return lo === null || ins === null || s.result ? null : ins === lo ? null : `insertAt ${ins} != lo ${lo}`;
    },
  ],
});

/* ================================================================== 41. First missing positive (cyclic placement) */
add({
  slug: '41-first-missing-positive',
  gen: (r) => { const n = rint(r, 1, 8); return { nums: rarr(r, n, r() < 0.3 ? -2 : 0, n + 2) }; },
  oracle: ({ nums }: { nums: number[] }) => {
    const n = nums.length;
    const a = [...nums];
    const out: State[] = [];
    const placed = () => a.filter((v, idx) => v >= 1 && v <= n && idx === v - 1).sort((x, y) => x - y);
    const ignored = () => a.filter((v) => v < 1 || v > n);
    const st = (i: number | null, ans: number | null = null): State => ({ i, arr: [...a], placed: placed(), ignored: ignored(), ans });
    out.push(st(null));
    for (let i = 0; i < n; i++) {
      let swapped = false;
      while (a[i] > 0 && a[i] <= n && a[a[i] - 1] !== a[i]) {
        const j = a[i] - 1;
        const t = a[i]; a[i] = a[j]; a[j] = t;
        out.push(st(i)); // the step for index i shows the state AFTER each swap
        swapped = true;
      }
      if (!swapped) out.push(st(i));
    }
    out.push(st(null)); // "Placement done"
    for (let i = 0; i < n; i++) {
      if (a[i] !== i + 1) { out.push(st(i, i + 1)); return out; }
      out.push(st(i));
    }
    out.push(st(null, n + 1));
    return out;
  },
  project: (s) => {
    const placed = nums(auxItems(s, 'Placed'));
    const ignored = nums(auxItems(s, 'Ignored'));
    return { i: num(s, 'i'), arr: arrCells(s), placed: placed ?? [], ignored: ignored ?? [], ans: num(s, 'answer') };
  },
  notes: 'cell colours not compared. A step for index i shows the state after each swap; indexes that need no swap get one state. "placed" = values v with arr[v-1] == v, "ignored" = values outside 1..n.',
});

/* ================================================================== 410. Split array largest sum (binary search on the answer) */
add({
  slug: '410-split-array-largest-sum',
  gen: (r): NumsK => { const n = rint(r, 1, 9); return { nums: rarr(r, n, 1, 20), k: rint(r, 1, n) }; },
  oracle: ({ nums, k }: NumsK) => {
    const out: State[] = [];
    let lo = Math.max(...nums), hi = sumOf(nums);
    out.push({ lo, mid: null, hi, need: null, sums: null, asg: null });
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      out.push({ lo, mid, hi, need: null, sums: null, asg: null });
      const d = greedySplit(nums, mid);
      out.push({ lo, mid, hi, need: d.sums.length, sums: d.sums, asg: d.asg });
      if (d.sums.length <= k) hi = mid; else lo = mid + 1;
      out.push({ lo, mid, hi, need: d.sums.length, sums: null, asg: null });
    }
    const f = greedySplit(nums, lo);
    out.push({ lo, mid: null, hi, need: f.sums.length, sums: f.sums, asg: f.asg });
    return out;
  },
  project: (s) => {
    const sums = nums(auxItems(s, 'Subarray sums') ?? auxItems(s, 'Final split'), ': ');
    return { lo: num(s, 'lo'), mid: num(s, 'mid'), hi: num(s, 'hi'), need: num(s, 'subarrays needed'), sums, asg: gridLabels(s, 1, 'S') };
  },
  notes: 'cell colours not compared; the grid\'s assignment row (which subarray S1.. each element belongs to) is compared at every feasibility check.',
});

/* ================================================================== 42. Trapping rain water (two pointers) */
add({
  slug: '42-trapping-rain-water',
  gen: (r) => ({ height: rarr(r, rint(r, 1, 11), 0, 5) }),
  oracle: ({ height }: { height: number[] }) => {
    const out: State[] = [];
    const bars: (number | null)[] = height.map(() => null);
    let l = 0, r = height.length - 1, lm = 0, rm = 0, water = 0;
    const st = (): State => ({ l, r, lm, rm, water, bars: [...bars] });
    out.push(st());
    while (l < r) {
      if (height[l] < height[r]) {
        lm = Math.max(lm, height[l]);
        water += lm - height[l];
        bars[l] = lm - height[l];
        out.push(st());
        l++;
      } else {
        rm = Math.max(rm, height[r]);
        water += rm - height[r];
        bars[r] = rm - height[r];
        out.push(st());
        r--;
      }
      out.push(st());
    }
    return out;
  },
  project: (s) => ({
    l: num(s, 'l'), r: num(s, 'r'), lm: num(s, 'leftMax'), rm: num(s, 'rightMax'), water: num(s, 'water'),
    bars: (auxItems(s, 'water above') ?? []).map((t) => (t === '?' ? null : Number(t))),
  }),
  invariants: [
    (s) => {
      const items = auxItems(s, 'water above') ?? [];
      const sum = items.reduce((a, t) => a + (t === '?' ? 0 : Number(t)), 0);
      const w = num(s, 'water');
      return w === null || sum === w ? null : `water ${w} != sum of per-bar water ${sum}`;
    },
  ],
  notes: 'follows the two-pointer Java (the pointer that meets is never processed, its slot stays "?"); cell colours not compared.',
});

/* ================================================================== 424. Longest repeating character replacement */
add({
  slug: '424-longest-repeating-character-replacement',
  gen: (r) => ({ s: rstr(r, rint(r, 1, 10), r() < 0.5 ? 'AB' : 'ABC'), k: rint(r, 0, 3) }),
  oracle: ({ s, k }: { s: string; k: number }) => {
    const out: State[] = [];
    const cnt = new Map<string, number>(); // like a count table: a letter keeps its slot when its count drops to 0 (hidden while 0)
    const items = () => [...cnt].filter(([, n]) => n > 0).map(([c, n]) => `'${c}' ×${n}`);
    let l = 0, maxf = 0, best = 0, bl = 0, br = -1;
    const cond = (len: number) => `${len - maxf} ≤ ${k} ${len - maxf <= k ? '✓' : '✗'}`;
    out.push({ L: 0, R: null, maxf, cond: null, best, win: items() });
    for (let r = 0; r < s.length; r++) {
      cnt.set(s[r], (cnt.get(s[r]) ?? 0) + 1);
      maxf = Math.max(maxf, cnt.get(s[r]) as number);
      out.push({ L: l, R: r, maxf, cond: cond(r - l + 1), best, win: items() });
      while (r - l + 1 - maxf > k) {
        const o = s[l++];
        cnt.set(o, (cnt.get(o) as number) - 1);
        out.push({ L: l, R: r, maxf, cond: cond(r - l + 1), best, win: items() });
      }
      if (r - l + 1 > best) { best = r - l + 1; bl = l; br = r; }
      out.push({ L: l, R: r, maxf, cond: cond(r - l + 1), best, win: items() });
    }
    // Done: the first best window is framed and the panel lists its letters
    const bw = new Map<string, number>();
    for (const c of s.slice(bl, br + 1)) bw.set(c, (bw.get(c) ?? 0) + 1);
    out.push({ L: bl, R: br, maxf, cond: cond(br - bl + 1), best, win: [...bw].map(([c, n]) => `'${c}' ×${n}`) });
    return out;
  },
  project: (s) => ({
    L: num(s, 'L'), R: num(s, 'R'), maxf: num(s, 'maxf'), cond: shown(s, 'len − maxf ≤ k'), best: num(s, 'best'),
    win: auxItems(s, 'Window letter counts') ?? [],
  }),
  notes: 'cell colours not compared. maxf is the usual never-decreasing maximum (as in the Java). The counts panel keeps a letter in its first-seen slot and hides it while its count is 0 (design choice).',
});

/* ================================================================== 442. Find all duplicates (cyclic placement) */
add({
  slug: '442-find-all-duplicates-in-an-array',
  gen: (r) => {
    for (;;) {
      const n = rint(r, 1, 8);
      const nums = rarr(r, n, 1, n);
      const c = new Map<number, number>();
      for (const v of nums) c.set(v, (c.get(v) ?? 0) + 1);
      if ([...c.values()].every((x) => x <= 2)) return { nums };
    }
  },
  oracle: ({ nums }: { nums: number[] }) => {
    const n = nums.length;
    const a = [...nums];
    const id = nums.map((_, k) => k); // identity of the item sitting in each slot (a surplus copy is one physical item that may be swapped around)
    const out: State[] = [];
    const parkedIds: number[] = [];
    const dups: number[] = [];
    const st = (i: number | null, phase: string): State => ({ i, phase, found: dups.length, arr: [...a], parked: a.filter((_, k) => parkedIds.includes(id[k])), dups: [...dups] });
    out.push(st(null, 'place'));
    let i = 0;
    while (i < n) {
      const j = a[i] - 1;
      if (a[i] !== a[j]) {
        const t = a[i]; a[i] = a[j]; a[j] = t;
        const u = id[i]; id[i] = id[j]; id[j] = u;
        out.push(st(i, 'place'));
      } else {
        if (j !== i && !parkedIds.includes(id[i])) parkedIds.push(id[i]); // this physical item is a surplus copy left in a wrong slot
        out.push(st(i, 'place'));
        i++;
      }
    }
    out.push(st(null, 'scan'));
    for (let k = 0; k < n; k++) {
      if (a[k] !== k + 1) dups.push(a[k]);
      out.push(st(k, 'scan'));
    }
    out.push(st(null, 'scan'));
    return out;
  },
  project: (s) => ({
    i: num(s, 'i'), phase: shown(s, 'phase'), found: num(s, 'found'), arr: arrCells(s),
    parked: nums(auxItems(s, 'Parked')) ?? [], dups: nums(auxItems(s, 'Duplicates found')) ?? [],
  }),
  notes: 'cell colours not compared. Inputs follow the animation contract: values 1..n, each at most twice. "parked" = surplus copies (tracked as physical items, so one item that is swapped around is parked only once) left in a wrong slot, listed by value in array-slot order (design choice of the panel).',
});

/* ================================================================== 49. Group anagrams */
add({
  slug: '49-group-anagrams',
  gen: (r) => ({ words: Array.from({ length: rint(r, 1, 7) }, () => rstr(r, rint(r, 1, 4), 'abc')) }),
  oracle: ({ words }: { words: string[] }) => {
    const out: State[] = [];
    const groups = new Map<string, string[]>();
    const items = () => [...groups].map(([k, w]) => `${k} → ${w.join(', ')}`);
    out.push({ i: null, word: null, key: null, groups: 0, grp: [], res: null });
    for (let i = 0; i < words.length; i++) {
      const key = [...words[i]].sort().join('');
      out.push({ i, word: words[i], key, groups: groups.size, grp: items(), res: null });
      if (!groups.has(key)) groups.set(key, []);
      (groups.get(key) as string[]).push(words[i]);
      out.push({ i, word: words[i], key, groups: groups.size, grp: items(), res: null });
    }
    out.push({ i: null, word: null, key: null, groups: groups.size, grp: null, res: [...groups.values()].map((w) => `[${w.join(', ')}]`) });
    return out;
  },
  project: (s) => ({
    i: num(s, 'i'), word: shown(s, 'word'), key: shown(s, 'key'), groups: num(s, 'groups'),
    grp: auxItems(s, 'groups (sorted'), res: auxItems(s, 'result groups'),
  }),
  notes: 'cell colours not compared; groups appear in order of first key, words inside a group in input order.',
});

/* ================================================================== 53. Maximum subarray (Kadane) */
add({
  slug: '53-maximum-subarray',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 10), -6, 6) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const out: State[] = [];
    let cur = nums[0], best = nums[0], start = 0, bs = 0, be = 0;
    const run = (a: number, b: number) => `[${a}..${b}]`;
    out.push({ i: 0, cur, best, run: run(0, 0), cand: [] });
    for (let i = 1; i < nums.length; i++) {
      const x = nums[i];
      const ext = cur + x;
      out.push({ i, cur, best, run: run(start, i - 1), cand: [`extend = ${cur} + ${x} = ${ext}`, `restart = ${x}`] });
      if (x > ext) { cur = x; start = i; } else cur = ext; // cur = max(x, cur + x); a tie keeps extending
      const old = best;
      if (cur > best) { best = cur; bs = start; be = i; }
      out.push({ i, cur, best, run: run(start, i), cand: [`cur = ${cur}`, `best = max(${old}, ${cur}) = ${best}`] });
    }
    out.push({ i: null, cur, best, run: run(bs, be), cand: [] });
    return out;
  },
  project: (s) => ({ i: num(s, 'i'), cur: num(s, 'cur'), best: num(s, 'best'), run: shown(s, 'run'), cand: auxItems(s, 'Candidates') ?? [] }),
  notes: 'cell colours not compared. Done frames the first best subarray; cur keeps its last value.',
});

/* ================================================================== 540. Single element in a sorted array */
add({
  slug: '540-single-element-in-a-sorted-array',
  gen: (r) => {
    const m = rint(r, 0, 5);
    const vals = new Set<number>();
    while (vals.size < m + 1) vals.add(rint(r, 0, 20));
    const sorted = [...vals].sort((a, b) => a - b);
    const single = rint(r, 0, m);
    const nums: number[] = [];
    sorted.forEach((v, k) => { nums.push(v); if (k !== single) nums.push(v); });
    return { nums };
  },
  oracle: ({ nums }: { nums: number[] }) => {
    const out: State[] = [];
    let lo = 0, hi = nums.length - 1, it = 0;
    out.push({ lo, mid: null, hi, par: null, it, ans: null });
    while (lo < hi) {
      let mid = lo + ((hi - lo) >> 1);
      it++;
      out.push({ lo, mid, hi, par: mid % 2 ? 'odd' : 'even', it, ans: null });
      if (mid % 2 === 1) { mid--; out.push({ lo, mid, hi, par: 'even', it, ans: null }); }
      if (nums[mid] === nums[mid + 1]) lo = mid + 2; else hi = mid;
      out.push({ lo, mid, hi, par: 'even', it, ans: null });
    }
    out.push({ lo, mid: null, hi, par: null, it, ans: nums[lo] });
    return out;
  },
  project: (s) => ({ lo: num(s, 'lo'), mid: num(s, 'mid'), hi: num(s, 'hi'), par: shown(s, 'mid parity'), it: num(s, 'iterations'), ans: s.result ? Number(s.result.title) : null }),
  notes: 'cell colours not compared; inputs are valid "pairs plus one single" arrays.',
});

/* ================================================================== 560. Subarray sum equals k (prefix sums + map) */
add({
  slug: '560-subarray-sum-equals-k',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 9), -3, 5), k: rint(r, -3, 8) }),
  oracle: ({ nums, k }: NumsK) => {
    const out: State[] = [];
    const seen = new Map<number, number>([[0, 1]]);
    const items = () => [...seen].map(([p, c]) => `${p} → ${c}`);
    let sum = 0, count = 0;
    const pre = [0]; // the grid's prefix row fills in as the scan advances
    out.push({ i: null, sum, need: null, count, map: items(), pre: [...pre] });
    for (let i = 0; i < nums.length; i++) {
      sum += nums[i];
      pre.push(sum);
      out.push({ i, sum, need: null, count, map: items(), pre: [...pre] });
      const need = sum - k;
      count += seen.get(need) ?? 0;
      out.push({ i, sum, need, count, map: items(), pre: [...pre] });
      seen.set(sum, (seen.get(sum) ?? 0) + 1);
      out.push({ i, sum, need, count, map: items(), pre: [...pre] });
    }
    out.push({ i: null, sum, need: null, count, map: items(), pre: [...pre] });
    return out;
  },
  project: (s) => ({
    i: num(s, 'i'), sum: num(s, 'sum'), need: num(s, 'need'), count: num(s, 'count'), map: auxItems(s, 'prefix sum') ?? [],
    pre: gridNums(s, 1).filter((v) => v !== null),
  }),
  notes: 'cell colours not compared; the grid\'s prefix row (filled so far) is compared, as are the map panel (prefix -> times seen, insertion order) and the vars.',
});

/* ================================================================== 567. Permutation in string (fixed window with letter counts) */
add({
  slug: '567-permutation-in-string',
  gen: (r) => {
    const alpha = r() < 0.5 ? 'ab' : 'abcz';
    const p = rstr(r, rint(r, 1, 4), alpha);
    const s = rstr(r, rint(r, 1, 9), alpha);
    return { p, s };
  },
  oracle: ({ p, s }: { p: string; s: string }) => {
    const out: State[] = [];
    const k = p.length, n = s.length;
    const need = new Array<number>(26).fill(0), win = new Array<number>(26).fill(0);
    const L = (i: number) => String.fromCharCode(97 + i);
    const needItems = () => need.map((c, i) => (c > 0 ? `'${L(i)}' ×${c}` : null)).filter((x): x is string => x !== null);
    // window panel: letters of p (even at 0) and letters currently in the window, alphabetical
    const winItems = () => win.map((c, i) => (need[i] > 0 || c > 0 ? `'${L(i)}' ×${c}` : null)).filter((x): x is string => x !== null);
    const matchesNow = () => need.filter((c, i) => c === win[i]).length;
    const st = (window: string | null, matches: number | null, equal: string | null, ans: string | null = null): State => ({
      window: window === null ? null : `"${window}"`, matches: matches === null ? null : `${matches}/26`, equal, need: needItems(), win: winItems(), ans,
    });
    out.push(st(null, null, null));
    for (const c of p) need[c.charCodeAt(0) - 97]++;
    if (k > n) { out.push(st(null, null, 'false', 'false')); return out; }
    out.push(st(null, null, null)); // need counted
    for (let i = 0; i < k; i++) win[s.charCodeAt(i) - 97]++;
    out.push(st(s.slice(0, k), null, null)); // first window counted
    let matches = matchesNow();
    out.push(st(s.slice(0, k), matches, null));
    for (let i = k; i < n; i++) {
      if (matches === 26) { out.push(st(s.slice(i - k, i), matches, 'true', 'true')); return out; }
      win[s.charCodeAt(i) - 97]++;
      matches = matchesNow();
      out.push(st(s.slice(i - k, i + 1), matches, null));
      win[s.charCodeAt(i - k) - 97]--;
      matches = matchesNow();
      out.push(st(s.slice(i - k + 1, i + 1), matches, String(matches === 26)));
    }
    if (matches === 26) out.push(st(s.slice(n - k), matches, 'true', 'true'));
    else out.push(st(null, matches, 'false', 'false'));
    return out;
  },
  project: (s) => ({
    window: shown(s, 'window'), matches: shown(s, 'matches'), equal: shown(s, 'equal'),
    need: auxItems(s, 'need') ?? [], win: auxItems(s, 'window counts') ?? [], ans: s.result ? s.result.title : null,
  }),
  notes: 'cell colours not compared; matches is recomputed from scratch in the oracle (the animation uses the incremental update from the Java) so both must agree at every step.',
});

/* ================================================================== 611. Valid triangle number (sort + two pointers) */
add({
  slug: '611-valid-triangle-number',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 8), 0, 7) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const out: State[] = [];
    const a = [...nums].sort((x, y) => x - y);
    let count = 0;
    const st = (k: number | null, l: number | null, r: number | null, arr: number[]): State => ({ k, l, r, count, arr: [...arr] });
    out.push(st(null, null, null, nums));
    out.push(st(null, null, null, a));
    for (let k = a.length - 1; k >= 2; k--) {
      let l = 0, r = k - 1;
      out.push(st(k, l, r, a));
      while (l < r) {
        // one animation step per comparison: it shows the pointers at compare time and the count after the decision
        if (a[l] + a[r] > a[k]) { count += r - l; out.push(st(k, l, r, a)); r--; }
        else { out.push(st(k, l, r, a)); l++; }
      }
    }
    out.push(st(null, null, null, a));
    return out;
  },
  project: (s) => ({ k: num(s, 'k'), l: num(s, 'l'), r: num(s, 'r'), count: num(s, 'count'), arr: arrCells(s) }),
  notes: 'cell colours not compared. Each comparison step shows the pointers as compared (before the move) with the count already updated.',
});

/* ================================================================== 658. Find K closest elements (binary search on block start) */
add({
  slug: '658-find-k-closest-elements',
  gen: (r) => {
    const n = rint(r, 1, 9);
    const arr = rarr(r, n, -9, 12).sort((a, b) => a - b);
    return { arr, k: rint(r, 1, n), x: rint(r, -10, 13) };
  },
  oracle: ({ arr, k, x }: { arr: number[]; k: number; x: number }) => {
    const out: State[] = [];
    let lo = 0, hi = arr.length - k;
    out.push({ lo, mid: null, hi, a: null, b: null, ans: null });
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const a = x - arr[mid], b = arr[mid + k] - x;
      out.push({ lo, mid, hi, a, b, ans: null });
      if (a > b) lo = mid + 1; else hi = mid;
      out.push({ lo, mid: null, hi, a: null, b: null, ans: null });
    }
    out.push({ lo, mid: null, hi, a: null, b: null, ans: `[${arr.slice(lo, lo + k).join(', ')}]` });
    return out;
  },
  project: (s) => ({ lo: num(s, 'lo'), mid: num(s, 'mid'), hi: num(s, 'hi'), a: num(s, 'x − arr[mid]'), b: num(s, 'arr[mid+k] − x'), ans: s.result ? s.result.title : null }),
  notes: 'cell colours not compared; ties (x − arr[mid] == arr[mid+k] − x) keep the smaller block (hi = mid), as in the Java.',
});

/* ================================================================== 704. Binary search */
const titleNum = (s: Step): number | null => (s.result ? Number(s.result.title.replace('−', '-').replace('Index ', '')) : null);
add({
  slug: '704-binary-search',
  gen: (r) => {
    const n = rint(r, 1, 10);
    const set = new Set<number>();
    while (set.size < n) set.add(rint(r, -9, 20));
    const nums = [...set].sort((a, b) => a - b);
    return { nums, target: r() < 0.6 ? nums[rint(r, 0, n - 1)] : rint(r, -10, 21) };
  },
  oracle: ({ nums, target }: RotIn) => {
    const out: State[] = [];
    let lo = 0, hi = nums.length - 1, it = 0;
    out.push({ lo, mid: null, hi, it, ans: null });
    while (lo <= hi) {
      const mid = lo + ((hi - lo) >> 1);
      it++;
      out.push({ lo, mid, hi, it, ans: null });
      if (nums[mid] === target) { out.push({ lo, mid, hi, it, ans: mid }); return out; }
      if (nums[mid] < target) lo = mid + 1; else hi = mid - 1;
      out.push({ lo, mid, hi, it, ans: null });
    }
    out.push({ lo, mid: null, hi, it, ans: -1 });
    return out;
  },
  project: (s) => ({ lo: num(s, 'lo'), mid: num(s, 'mid'), hi: num(s, 'hi'), it: num(s, 'iterations'), ans: titleNum(s) }),
  notes: 'cell colours not compared; discarded halves are checked through lo/hi after each comparison.',
});

/* ================================================================== 74. Search a 2D matrix (flat binary search) */
add({
  slug: '74-search-a-2d-matrix',
  gen: (r) => {
    const rows = rint(r, 1, 4), cols = rint(r, 1, 5);
    const flat = rarr(r, rows * cols, 0, 40).sort((a, b) => a - b);
    const m = Array.from({ length: rows }, (_, i) => flat.slice(i * cols, (i + 1) * cols));
    return { m, target: r() < 0.6 ? flat[rint(r, 0, flat.length - 1)] : rint(r, -1, 41) };
  },
  oracle: ({ m, target }: { m: number[][]; target: number }) => {
    const out: State[] = [];
    const cols = m[0].length;
    let lo = 0, hi = m.length * cols - 1;
    out.push({ lo, hi, mid: null, ans: null });
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const v = m[Math.floor(mid / cols)][mid % cols];
      out.push({ lo, hi, mid, ans: null });
      if (v === target) { out.push({ lo, hi, mid, ans: 'true' }); return out; }
      if (v < target) lo = mid + 1; else hi = mid - 1;
      out.push({ lo, hi, mid, ans: null });
    }
    out.push({ lo, hi, mid: null, ans: 'false' });
    return out;
  },
  project: (s) => ({ lo: num(s, 'lo'), hi: num(s, 'hi'), mid: num(s, 'mid'), ans: s.result ? s.result.title : null }),
  notes: 'the grid scene and the (row, col) text are not compared; only the flat lo/mid/hi trace and the verdict (duplicates allowed in the generated matrices).',
});

/* ================================================================== 75. Sort colors (Dutch national flag) */
add({
  slug: '75-sort-colors',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 10), 0, 2) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const out: State[] = [];
    const a = [...nums];
    let low = 0, mid = 0, high = a.length - 1;
    out.push({ low, mid, high, arr: [...a] });
    while (mid <= high) {
      if (a[mid] === 0) { [a[low], a[mid]] = [a[mid], a[low]]; low++; mid++; }
      else if (a[mid] === 1) mid++;
      else { [a[mid], a[high]] = [a[high], a[mid]]; high--; }
      out.push({ low, mid, high, arr: [...a] });
    }
    return out;
  },
  project: (s) => ({ low: num(s, 'low'), mid: num(s, 'mid'), high: num(s, 'high'), arr: arrCells(s) }),
  invariants: [
    (s, _i, _st, { nums: a }: { nums: number[] }) => {
      const cur = arrCells(s) as number[];
      return [...cur].sort().join() === [...a].sort().join() ? null : `array ${cur} is not a permutation of ${a}`;
    },
  ],
  notes: 'cell colours not compared; one state per loop iteration (swap or leave), the array must stay a permutation.',
});

/* ================================================================== 862. Shortest subarray with sum at least K (monotonic deque on prefix sums) */
add({
  slug: '862-shortest-subarray-with-sum-at-least-k',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 8), -4, 6), k: rint(r, 1, 10) }),
  oracle: ({ nums, k }: NumsK) => {
    const out: State[] = [];
    const n = nums.length;
    const P = [0];
    for (const x of nums) P.push(P[P.length - 1] + x);
    const dq: number[] = [];
    const q = () => dq.map((i) => `${i}: P=${P[i]}`);
    let best = Infinity;
    const b = () => (best === Infinity ? null : best);
    out.push({ j: null, pj: null, best: null, dq: [], P: [...P] });
    for (let j = 0; j <= n; j++) {
      while (dq.length && P[j] - P[dq[0]] >= k) {
        best = Math.min(best, j - dq[0]);
        dq.shift();
        out.push({ j, pj: P[j], best: b(), dq: q(), P: [...P] });
      }
      while (dq.length && P[dq[dq.length - 1]] >= P[j]) dq.pop();
      dq.push(j);
      out.push({ j, pj: P[j], best: b(), dq: q(), P: [...P] });
    }
    out.push({ j: null, pj: null, best: b(), dq: q(), P: [...P] });
    return out;
  },
  project: (s) => ({ j: num(s, 'j'), pj: num(s, 'P[j]'), best: num(s, 'best'), dq: auxItems(s, 'deque of prefix') ?? [], P: gridNums(s, 1) }),
  notes: 'cell colours not compared; deque contents (index: P), j, P[j], best and the full prefix row P of the grid are. Pops from the back are shown together with the push.',
});

/* ================================================================== 875. Koko eating bananas (binary search on the speed) */
add({
  slug: '875-koko-eating-bananas',
  gen: (r) => { const n = rint(r, 1, 6); return { piles: rarr(r, n, 1, 16), h: rint(r, n, n + 10) }; },
  oracle: ({ piles, h }: { piles: number[]; h: number }) => {
    const out: State[] = [];
    const hours = (k: number) => piles.reduce((a, p) => a + Math.ceil(p / k), 0);
    const list = (k: number) => piles.map((p) => `${p} → ${Math.ceil(p / k)}h`);
    let lo = 1, hi = Math.max(...piles);
    out.push({ lo, mid: null, hi, hrs: null, per: null, total: null, ans: null });
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      out.push({ lo, mid, hi, hrs: null, per: null, total: null, ans: null });
      const t = hours(mid);
      const ok = t <= h;
      out.push({ lo, mid, hi, hrs: t, per: list(mid), total: [`total = ${t}`, `limit h = ${h}`, ok ? 'feasible' : 'not feasible'], ans: null });
      if (ok) hi = mid; else lo = mid + 1;
      out.push({ lo, mid, hi, hrs: t, per: null, total: null, ans: null });
    }
    out.push({ lo, mid: null, hi, hrs: hours(lo), per: null, total: null, ans: lo });
    return out;
  },
  project: (s) => ({
    lo: num(s, 'lo'), mid: num(s, 'mid'), hi: num(s, 'hi'), hrs: num(s, 'hours'),
    per: auxItems(s, 'Hours per pile'), total: auxItems(s, 'Total vs limit'), ans: s.result ? Number(s.result.title) : null,
  }),
  notes: 'cell colours and the speed-range panel text not compared; per-pile hours and total-vs-limit panels are.',
});

/* ================================================================== 88. Merge sorted array (from the back) */
add({
  slug: '88-merge-sorted-array',
  gen: (r) => {
    for (;;) {
      const m = rint(r, 0, 6), n = rint(r, 0, 6);
      if (m + n >= 1 && m + n <= 10) return { nums1: rarr(r, m, 0, 12).sort((a, b) => a - b), nums2: rarr(r, n, 0, 12).sort((a, b) => a - b) };
    }
  },
  oracle: ({ nums1, nums2 }: { nums1: number[]; nums2: number[] }) => {
    const out: State[] = [];
    const m = nums1.length, n = nums2.length;
    const a: (number | string)[] = [...nums1, ...nums2.map(() => '·')]; // free slots drawn as "·"
    let i = m - 1, j = n - 1, k = m + n - 1;
    const st = (): State => ({ i, j, k, arr: [...a] });
    out.push(st());
    while (j >= 0) {
      if (i >= 0 && (a[i] as number) > nums2[j]) { a[k] = a[i]; a[i] = '·'; i--; }
      else { a[k] = nums2[j]; j--; }
      k--;
      out.push(st());
    }
    return out;
  },
  project: (s) => ({ i: num(s, 'i'), j: num(s, 'j'), k: num(s, 'k'), arr: arrCells(s) }),
  notes: 'cell colours not compared. A value moved inside nums1 leaves a free slot "·" behind (as drawn); ties take from nums2 (as in the Java).',
});

/* ================================================================== cp-cyclic-sort */
add({
  slug: 'cp-cyclic-sort',
  gen: (r) => {
    const n = rint(r, 1, 8);
    const a = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = n - 1; i > 0; i--) { const j = rint(r, 0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return { nums: a };
  },
  oracle: ({ nums }: { nums: number[] }) => {
    const out: State[] = [];
    const a = [...nums];
    const n = a.length;
    let swaps = 0;
    const inPlace = () => a.filter((v, idx) => idx === v - 1);
    const st = (i: number | null, slot: number | null): State => ({
      i, slot, swaps, inplace: inPlace().length, arr: [...a],
      okList: [...inPlace()].sort((x, y) => x - y), bad: a.filter((v, idx) => idx !== v - 1),
    });
    out.push(st(null, null));
    let i = 0;
    while (i < n) {
      const j = a[i] - 1;
      if (a[i] !== a[j]) { [a[i], a[j]] = [a[j], a[i]]; swaps++; out.push(st(i, j)); }
      else { out.push(st(i, j)); i++; }
    }
    out.push(st(null, null));
    return out;
  },
  project: (s) => ({
    i: num(s, 'i'), slot: num(s, 'target slot'), swaps: num(s, 'swaps'), inplace: num(s, 'in place'), arr: arrCells(s),
    okList: nums(auxItems(s, 'In place')) ?? [], bad: nums(auxItems(s, 'Still misplaced')) ?? [],
  }),
  notes: 'cell colours not compared; inputs are permutations of 1..n.',
});

/* ================================================================== cp-majority-element-with-verification */
add({
  slug: 'cp-majority-element-with-verification',
  gen: (r) => {
    const n = rint(r, 1, 10);
    const nums = rarr(r, n, 0, r() < 0.5 ? 2 : 5);
    if (r() < 0.4) { const v = rint(r, 0, 5); for (let p = 0; p < Math.floor(n / 2) + 1; p++) nums[p] = v; nums.sort(() => r() - 0.5); }
    return { nums };
  },
  oracle: ({ nums }: { nums: number[] }) => {
    const out: State[] = [];
    const n = nums.length;
    let cand: number | null = null, votes = 0, count = 0;
    out.push({ i: null, cand, votes, count, ans: null });
    for (let i = 0; i < n; i++) {
      if (votes === 0) cand = nums[i];
      votes += nums[i] === cand ? 1 : -1;
      out.push({ i, cand, votes, count, ans: null });
    }
    out.push({ i: null, cand, votes, count, ans: null }); // pass 1 ends
    for (let i = 0; i < n; i++) {
      if (nums[i] === cand) count++;
      out.push({ i, cand, votes, count, ans: null });
    }
    out.push({ i: null, cand, votes, count, ans: count > n / 2 ? (cand as number) : -1 });
    return out;
  },
  project: (s) => ({ i: num(s, 'i'), cand: num(s, 'candidate'), votes: num(s, 'votes'), count: num(s, 'count'), ans: s.result ? Number(s.result.title) : null }),
  notes: 'cell colours and the pass panels text not compared; both passes (vote, then verify the count > n/2) are.',
});

/* ================================================================== pointer chips must sit where the variables say */
// For each problem: [pointer id, variable key, offset between chip index and variable value]. Skipped on the result (Done) step, where
// several animations re-use the chips to frame the best window / pair.
const PTR_CHECKS: Record<string, [string, string, number?][]> = {
  '1-two-sum': [['i', 'i']],
  '11-container-with-most-water': [['l', 'l'], ['r', 'r']],
  '121-best-time-to-buy-and-sell-stock': [['i', 'i']],
  '1438-longest-continuous-subarray-with-abs-diff-limit': [['l', 'L'], ['r', 'R']],
  '15-3sum': [['i', 'i'], ['l', 'l'], ['r', 'r']],
  '16-3sum-closest': [['i', 'i'], ['l', 'l'], ['r', 'r']],
  '167-two-sum-ii': [['l', 'L'], ['r', 'R']],
  '162-find-peak-element': [['lo', 'lo'], ['mid', 'mid'], ['hi', 'hi']],
  '33-search-in-rotated-sorted-array': [['lo', 'lo'], ['mid', 'mid'], ['hi', 'hi']],
  '34-find-first-and-last-position': [['lo', 'lo'], ['mid', 'mid'], ['hi', 'hi']],
  '35-search-insert-position': [['lo', 'lo'], ['mid', 'mid'], ['hi', 'hi']],
  '540-single-element-in-a-sorted-array': [['lo', 'lo'], ['mid', 'mid'], ['hi', 'hi']],
  '704-binary-search': [['lo', 'lo'], ['mid', 'mid'], ['hi', 'hi']],
  '658-find-k-closest-elements': [['lo', 'lo'], ['mid', 'mid']],
  '875-koko-eating-bananas': [['lo', 'lo', -1], ['mid', 'mid', -1], ['hi', 'hi', -1]],
  '209-minimum-size-subarray-sum': [['l', 'L'], ['r', 'R']],
  '3-longest-substring-without-repeating-characters': [['l', 'L'], ['r', 'R']],
  '424-longest-repeating-character-replacement': [['l', 'L'], ['r', 'R']],
  '42-trapping-rain-water': [['l', 'l'], ['r', 'r']],
  '611-valid-triangle-number': [['k', 'k'], ['l', 'l'], ['r', 'r']],
  '75-sort-colors': [['low', 'low'], ['mid', 'mid'], ['high', 'high']],
  '88-merge-sorted-array': [['i', 'i'], ['k', 'k']],
  '169-majority-element': [['i', 'i']],
  '229-majority-element-ii': [['i', 'i']],
  'cp-majority-element-with-verification': [['i', 'i']],
  'cp-cyclic-sort': [['i', 'i']],
  '41-first-missing-positive': [['i', 'i']],
  '442-find-all-duplicates-in-an-array': [['i', 'i']],
  '53-maximum-subarray': [['i', 'i']],
  '1480-running-sum-of-1d-array': [['i', 'i']],
  '49-group-anagrams': [['i', 'i']],
  '26-remove-duplicates-from-sorted-array': [['slow', 'slow'], ['fast', 'fast']],
};
for (const c of cases) {
  const checks = PTR_CHECKS[c.slug];
  if (!checks) continue;
  c.invariants = [
    ...(c.invariants ?? []),
    (step) => {
      if (step.result) return null;
      for (const [id, key, off = 0] of checks) {
        const p = ptr(step, id), v = num(step, key);
        // a chip is clamped onto the last cell when its variable has run off the end (e.g. an emptied window: L = R + 1 = n)
        if (p !== null && v !== null && p !== Math.min(v + off, arrCells(step).length - 1)) return `pointer "${id}" sits at index ${p} but variable ${key} = ${v}`;
      }
      return null;
    },
  ];
}

/* ================================================================== cell colours: search windows and sliding windows */
const cellStates = (step: Step): (string | undefined)[] => {
  const a = scenesOf(step).find((s) => s.kind === 'array') as { cells: { state?: string }[] } | undefined;
  return a ? a.cells.map((c) => c.state) : [];
};
/** Binary-search problems: a cell is drawn dim exactly when it lies outside the live window [lo..hi]. */
const SEARCH_DIM = ['704-binary-search', '35-search-insert-position', '33-search-in-rotated-sorted-array', '540-single-element-in-a-sorted-array', '162-find-peak-element'];
/** Sliding windows: the cells in [L..R] are never dim and cells outside it are never the active (window) colour. */
const WINDOW_FRAME: Record<string, [string, string]> = {
  '209-minimum-size-subarray-sum': ['L', 'R'],
  '3-longest-substring-without-repeating-characters': ['L', 'R'],
  '424-longest-repeating-character-replacement': ['L', 'R'],
  '1438-longest-continuous-subarray-with-abs-diff-limit': ['L', 'R'],
};
for (const c of cases) {
  if (SEARCH_DIM.includes(c.slug)) {
    c.invariants = [...(c.invariants ?? []), (step) => {
      const lo = num(step, 'lo'), hi = num(step, 'hi');
      if (lo === null || hi === null || lo > hi) return null; // an empty window: 35 highlights the insertion slot on purpose
      const st = cellStates(step);
      for (let i = 0; i < st.length; i++) {
        const outside = i < lo || i > hi;
        if (outside !== (st[i] === 'dim')) return `cell ${i} is ${st[i] === 'dim' ? 'dim' : 'not dim'} but the window is [${lo}..${hi}]`;
      }
      return null;
    }];
  }
  const wf = WINDOW_FRAME[c.slug];
  if (wf) {
    c.invariants = [...(c.invariants ?? []), (step) => {
      const L = num(step, wf[0]), R = num(step, wf[1]);
      if (L === null || R === null || step.result) return null;
      const st = cellStates(step);
      for (let i = 0; i < st.length; i++) {
        const inside = i >= L && i <= R;
        if (inside && st[i] === 'dim') return `cell ${i} inside window [${L}..${R}] is dim`;
        if (!inside && st[i] === 'active') return `cell ${i} outside window [${L}..${R}] is drawn active`;
      }
      return null;
    }];
  }
}

export { cases };
void rstr;
