/**
 * Fuzz test for the pack-p4 problems (greedy / heap / grid / sweep / sampling).
 * Run:  node scripts/fuzz-pack4.mts
 * For each problem: generate random valid inputs, run buildSteps, compare the final `result.title` with an independent
 * reference implementation, check every example's stated output, and (for the sampling problems) check uniformity.
 * Exits non-zero on any mismatch.
 */
import { ipo } from '../src/problems/ipo.ts';
import { slidingWindowMedian } from '../src/problems/slidingWindowMedian.ts';
import { kthSmallestInSortedMatrix } from '../src/problems/kthSmallestInSortedMatrix.ts';
import { smallestRange } from '../src/problems/smallestRange.ts';
import { zeroOneMatrix } from '../src/problems/zeroOneMatrix.ts';
import { maxAreaOfIsland } from '../src/problems/maxAreaOfIsland.ts';
import { surroundedRegions } from '../src/problems/surroundedRegions.ts';
import { diagonalTraverse } from '../src/problems/diagonalTraverse.ts';
import { carPooling } from '../src/problems/carPooling.ts';
import { theSkylineProblem } from '../src/problems/theSkylineProblem.ts';
import { linkedListRandomNode, pickNode } from '../src/problems/linkedListRandomNode.ts';
import { randomPickIndex, pickIndex } from '../src/problems/randomPickIndex.ts';
import { reservoirSampling, sampleReservoir } from '../src/problems/reservoirSampling.ts';

// ---- tiny helpers ---------------------------------------------------------------------------
let seed = 20260311;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ri = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1)); // inclusive
const arr = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => f(i));

let failures = 0;
const N = 200;
function run<I>(name: string, p: { buildSteps: (i: I) => any[]; examples: { label: string; input: I; output: string }[] }, gen: () => I, ref: (i: I) => string, n = N) {
  let bad = 0;
  for (let t = 0; t < n; t++) {
    const input = gen();
    let got: string | undefined;
    let steps: any[] = [];
    try {
      steps = p.buildSteps(input);
      got = steps[steps.length - 1]?.result?.title;
    } catch (e) {
      got = `THREW ${e}`;
    }
    const want = ref(input);
    const sane = steps.length >= 2 && steps.length <= 400;
    if (got !== want || !sane) {
      bad++;
      if (bad <= 3) console.log(`  MISMATCH ${name}: input=${JSON.stringify(input)} got=${got} want=${want} steps=${steps.length}`);
    }
  }
  // the examples' printed outputs must equal what the animation ends with
  for (const ex of p.examples) {
    const got = p.buildSteps(ex.input).slice(-1)[0]?.result?.title;
    if (got !== ex.output) { bad++; console.log(`  EXAMPLE ${name} [${ex.label}]: got=${got} stated=${ex.output}`); }
  }
  if (bad) failures++;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${name}${bad ? ` (${bad} bad)` : ''}`);
}

const grid01 = (R: number, C: number, p: number) => arr(R, () => arr(C, () => (rand() < p ? 1 : 0)).join(''));

// ---- 502 IPO: brute force over every order of picks --------------------------------------------
run('502 ipo', ipo, () => {
  const n = ri(1, 6);
  return { k: ri(1, n + 1), w: ri(0, 6), profits: arr(n, () => ri(0, 12)), capital: arr(n, () => ri(0, 12)) };
}, ({ k, w, profits, capital }) => {
  const n = profits.length;
  const f = (cap: number, used: number, left: number): number => {
    let best = cap;
    if (left === 0) return best;
    for (let i = 0; i < n; i++) if (!(used >> i & 1) && capital[i] <= cap) best = Math.max(best, f(cap + profits[i], used | 1 << i, left - 1));
    return best;
  };
  return String(f(w, 0, k));
});

// ---- 480 Sliding Window Median: sort every window ------------------------------------------------
run('480 slidingWindowMedian', slidingWindowMedian, () => {
  const n = ri(1, 10);
  return { nums: arr(n, () => ri(-9, 9)), k: ri(1, Math.min(n, 6)) };
}, ({ nums, k }) => {
  const out: number[] = [];
  for (let i = 0; i + k <= nums.length; i++) {
    const w = nums.slice(i, i + k).sort((a, b) => a - b);
    out.push(k % 2 ? w[(k - 1) / 2] : (w[k / 2 - 1] + w[k / 2]) / 2);
  }
  return `[${out.join(',')}]`;
});

// ---- 378 Kth Smallest in a Sorted Matrix: flatten and sort -------------------------------------
run('378 kthSmallestInSortedMatrix', kthSmallestInSortedMatrix, () => {
  const R = ri(1, 5);
  const C = ri(1, 5);
  // sorted rows and columns: m[r][c] = base grows with r and c plus a non-negative bump
  const m: number[][] = [];
  for (let r = 0; r < R; r++) {
    m.push([]);
    for (let c = 0; c < C; c++) m[r].push(Math.max(r > 0 ? m[r - 1][c] : -50, c > 0 ? m[r][c - 1] : -50) + ri(0, 6));
  }
  return { m, k: ri(1, R * C) };
}, ({ m, k }) => String(m.flat().sort((a, b) => a - b)[k - 1]));

// ---- 632 Smallest Range: brute force over all [lo, hi] -----------------------------------------
run('632 smallestRange', smallestRange, () => {
  const K = ri(2, 4);
  let lists: number[][];
  do { lists = arr(K, () => arr(ri(1, 4), () => ri(0, 30)).sort((a, b) => a - b)); } while (lists.reduce((s, l) => s + l.length, 0) > 14);
  return { lists };
}, ({ lists }) => {
  const vals = [...new Set(lists.flat())].sort((a, b) => a - b);
  let best: [number, number] | null = null;
  for (const lo of vals) for (const hi of vals) {
    if (hi < lo) continue;
    if (!lists.every((l) => l.some((x) => x >= lo && x <= hi))) continue;
    if (!best || hi - lo < best[1] - best[0] || (hi - lo === best[1] - best[0] && lo < best[0])) best = [lo, hi];
  }
  return `[${best![0]},${best![1]}]`;
});

// ---- 542 01 Matrix: Manhattan distance to the nearest 0 (no obstacles on this grid) -------------
run('542 zeroOneMatrix', zeroOneMatrix, () => {
  let g: string[];
  do { g = grid01(ri(1, 6), ri(1, 8), 0.6); } while (!g.some((r) => r.includes('0')));
  return { grid: g };
}, ({ grid }) => {
  const zeros: [number, number][] = [];
  grid.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '0') zeros.push([r, c]); }));
  return grid.map((row, r) => `[${[...row].map((_, c) => Math.min(...zeros.map(([a, b]) => Math.abs(a - r) + Math.abs(b - c)))).join(',')}]`).join(',').replace(/^/, '[').concat(']');
});

// ---- 695 Max Area of Island: iterative component sizes ---------------------------------------
run('695 maxAreaOfIsland', maxAreaOfIsland, () => ({ grid: grid01(ri(1, 6), ri(1, 8), rand() * 0.8 + 0.1) }), ({ grid }) => {
  const R = grid.length, C = grid[0].length;
  const seen = grid.map((r) => [...r].map(() => false));
  let best = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (grid[r][c] !== '1' || seen[r][c]) continue;
    let size = 0;
    const st: [number, number][] = [[r, c]];
    seen[r][c] = true;
    while (st.length) {
      const [a, b] = st.pop()!;
      size++;
      for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = a + da, y = b + db;
        if (x >= 0 && y >= 0 && x < R && y < C && grid[x][y] === '1' && !seen[x][y]) { seen[x][y] = true; st.push([x, y]); }
      }
    }
    best = Math.max(best, size);
  }
  return String(best);
});

// ---- 130 Surrounded Regions: BFS from the border ----------------------------------------------
run('130 surroundedRegions', surroundedRegions, () => ({ grid: grid01(ri(1, 6), ri(1, 8), rand() * 0.7 + 0.2).map((r) => r.replace(/1/g, 'O').replace(/0/g, 'X')) }), ({ grid }) => {
  const R = grid.length, C = grid[0].length;
  const safe = grid.map((r) => [...r].map(() => false));
  const q: [number, number][] = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if ((r === 0 || c === 0 || r === R - 1 || c === C - 1) && grid[r][c] === 'O') { safe[r][c] = true; q.push([r, c]); }
  while (q.length) {
    const [a, b] = q.shift()!;
    for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = a + da, y = b + db;
      if (x >= 0 && y >= 0 && x < R && y < C && grid[x][y] === 'O' && !safe[x][y]) { safe[x][y] = true; q.push([x, y]); }
    }
  }
  return grid.map((row, r) => [...row].map((ch, c) => (ch === 'O' && !safe[r][c] ? 'X' : ch)).join('')).join(' ');
});

// ---- 498 Diagonal Traverse: group by r + c -------------------------------------------------------
run('498 diagonalTraverse', diagonalTraverse, () => {
  const R = ri(1, 6), C = ri(1, 8);
  return { m: arr(R, () => arr(C, () => ri(-50, 50))) };
}, ({ m }) => {
  const R = m.length, C = m[0].length;
  const out: number[] = [];
  for (let d = 0; d <= R + C - 2; d++) {
    const cells: number[] = [];
    for (let r = Math.max(0, d - C + 1); r <= Math.min(d, R - 1); r++) cells.push(m[r][d - r]); // r ascending = down-left
    out.push(...(d % 2 === 0 ? cells.reverse() : cells));
  }
  return `[${out.join(',')}]`;
});

// ---- 1094 Car Pooling: check the load at every integer position -----------------------------------
run('1094 carPooling', carPooling, () => {
  const n = ri(1, 6);
  return { trips: arr(n, () => { const f = ri(0, 18); return [ri(1, 6), f, ri(f + 1, 20)] as [number, number, number]; }), capacity: ri(1, 14) };
}, ({ trips, capacity }) => {
  for (let x = 0; x <= 20; x++) {
    const load = trips.reduce((s, [p, f, t]) => s + (f <= x && x < t ? p : 0), 0);
    if (load > capacity) return 'false';
  }
  return 'true';
});

// ---- 218 Skyline: height function at every critical x ----------------------------------------------
run('218 theSkylineProblem', theSkylineProblem, () => {
  const n = ri(1, 6);
  return { b: arr(n, () => { const l = ri(0, 25); return [l, ri(l + 1, 30), ri(1, 12)] as [number, number, number]; }) };
}, ({ b }) => {
  const xs = [...new Set(b.flatMap(([l, r]) => [l, r]))].sort((p, q) => p - q);
  const out: [number, number][] = [];
  let prev = 0;
  for (const x of xs) {
    const h = Math.max(0, ...b.filter(([l, r]) => l <= x && x < r).map((t) => t[2]));
    if (h !== prev) { out.push([x, h]); prev = h; }
  }
  return `[${out.map(([x, h]) => `[${x},${h}]`).join(',')}]`;
});

// ---- sampling problems: same seeded generator as the reference, plus uniformity -----------------
run('382 linkedListRandomNode', linkedListRandomNode, () => ({ vals: arr(ri(1, 8), () => ri(-99, 99)), seed: ri(0, 999) }), ({ vals, seed: s }) => String(vals[pickNode(vals.length, s)]));
run('398 randomPickIndex', randomPickIndex, () => {
  const nums = arr(ri(1, 10), () => ri(0, 3));
  return { nums, target: nums[ri(0, nums.length - 1)], seed: ri(0, 999) };
}, ({ nums, target, seed: s }) => String(pickIndex(nums, target, s)));
run('ALG reservoirSampling', reservoirSampling, () => {
  const n = ri(1, 12);
  return { stream: arr(n, () => ri(-99, 99)), k: ri(1, Math.min(6, n)), seed: ri(0, 999) };
}, ({ stream, k, seed: s }) => `[${sampleReservoir(stream, k, s).join(',')}]`);

function uniform(name: string, counts: number[], trials: number, expected: number[]) {
  const bad = counts.some((c, i) => Math.abs(c / trials - expected[i]) > 0.04);
  if (bad) failures++;
  console.log(`${bad ? 'FAIL' : 'ok  '} uniformity ${name}: ${counts.map((c) => (c / trials).toFixed(3)).join(' ')}`);
}
{
  const T = 3000;
  const c1 = [0, 0, 0, 0, 0];
  for (let s = 0; s < T; s++) c1[pickNode(5, s)]++;
  uniform('382 (n = 5)', c1, T, [0.2, 0.2, 0.2, 0.2, 0.2]);
  const nums = [7, 1, 7, 7, 2, 7];
  const c2 = [0, 0, 0, 0, 0, 0];
  for (let s = 0; s < T; s++) c2[pickIndex(nums, 7, s)]++;
  uniform('398 (4 matches)', c2, T, [0.25, 0, 0.25, 0.25, 0, 0.25]);
  const stream = [1, 2, 3, 4, 5, 6, 7];
  const c3 = [0, 0, 0, 0, 0, 0, 0];
  for (let s = 0; s < T; s++) for (const v of sampleReservoir(stream, 3, s)) c3[v - 1]++;
  uniform('reservoir k = 3 of 7', c3, T, stream.map(() => 3 / 7));
}

console.log(failures ? `\n${failures} FUZZ GROUP(S) FAILED` : '\nALL FUZZ PASSED');
process.exit(failures ? 1 : 0);
