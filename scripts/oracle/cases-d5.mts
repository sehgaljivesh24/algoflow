import type { Step } from '../../src/engine/types.ts';
import type { CaseModule, OracleCase, Scalar, State } from './types.ts';
import { cellValues, ptr, rarr, rint, rstr, sceneOfKind, scenesOf, shown } from './util.ts';

/**
 * Batch d5 — dynamic programming (1-D, grid, two-sequence, LIS, knapsack, palindromic, memoisation, stock machines, Catalan,
 * game theory, bitmask, interval, tree, digit DP).
 *
 * Every oracle below is written from the textbook recurrence (never importing the problem module or a kit). The strongest
 * projection is the DP TABLE itself, shown flat after every cell is filled, plus the current index / choice variables.
 * Display conventions parsed from the animations: '?' / '' / '—' = not computed (null); '∞' = unreachable.
 */

/* ----------------------------------------------------------------------------------------------- helpers */
const q = (v: unknown): Scalar => (v === '?' || v === '' || v === '—' || v === '·' || v === '×' || v === undefined ? null : (v as Scalar));
/** All cells of the first grid scene, row-major, '?'/'' → null. `rows` optionally restricts to some rows. */
const gridFlat = (step: Step, rows?: number[]): Scalar[] => {
  const g = sceneOfKind(step, 'grid');
  if (!g) return [];
  return g.rows.flatMap((r, i) => (rows && !rows.includes(i) ? [] : r.map((c) => q(c.value))));
};
const arrFlat = (step: Step): Scalar[] => cellValues(step).map(q);
const vs = (step: Step, key: string): Scalar => {
  const v = shown(step, key);
  return v === null ? null : v;
};
const nullArr = (n: number): Scalar[] => Array(n).fill(null);
/** Flat (row-major) indexes of the cells drawn as a "source it reads" (state 'compare') in the first grid scene (restricted to `rows`), or in the first array scene. */
const cmpIdx = (s: Step, rows?: number[]): number[] => {
  const g = sceneOfKind(s, 'grid');
  if (g) {
    const o: number[] = []; let k = 0;
    g.rows.forEach((row, i) => { if (rows && !rows.includes(i)) return; row.forEach((c) => { if (c.state === 'compare') o.push(k); k++; }); });
    return o;
  }
  return (sceneOfKind(s, 'array')?.cells ?? []).flatMap((c, i) => (c.state === 'compare' ? [i] : []));
};
const cmpArr = (s: Step): number[] => (sceneOfKind(s, 'array')?.cells ?? []).flatMap((c, i) => (c.state === 'compare' ? [i] : []));
const INFS = '∞';
const _unused = [rarr, rint, rstr, ptr, scenesOf]; void _unused;

const out: OracleCase[] = [];
const add = (c: OracleCase) => { out.push(c); };

/* ============================================================================================ 70 climbing stairs */
add({
  slug: '70-climbing-stairs',
  gen: (r) => ({ n: rint(r, 1, 12) }),
  oracle: ({ n }: { n: number }) => {
    const dp: Scalar[] = nullArr(n + 1); dp[0] = 0;
    let src: number[] = [];
    const st = (i: number | null, a: Scalar, b: Scalar, cur: Scalar): State => ({ dp: [...dp], i, a, b, cur, src: [...src] });
    const res: State[] = [st(null, null, null, null)];
    for (let i = 1; i <= Math.min(2, n); i++) { dp[i] = i; res.push(st(i, null, null, i)); }
    for (let i = 3; i <= n; i++) { const a = dp[i - 1] as number, b = dp[i - 2] as number; dp[i] = a + b; src = [i - 2, i - 1]; res.push(st(i, a, b, a + b)); }
    src = [];
    res.push(st(n, n - 1 >= 0 ? dp[n - 1] : null, n - 2 >= 0 ? dp[n - 2] : null, dp[n]));
    return res;
  },
  project: (s) => ({ dp: arrFlat(s), i: vs(s, 'i') , a: vs(s, 'dp[i-1]'), b: vs(s, 'dp[i-2]'), cur: vs(s, 'dp[i]'), src: cmpIdx(s) }),
  notes: 'tile colours / aux "last move" panel text not checked',
});

/* ================================================================================================ 198 house robber */
add({
  slug: '198-house-robber',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 9), 0, r() < 0.3 ? 3 : 20) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const n = nums.length;
    const dp: Scalar[] = nullArr(n);
    let src: number[] = [];
    const st = (i: number | null, rob: Scalar, skip: Scalar, cur: Scalar): State => ({ dp: [...dp], i, rob, skip, cur, src: [...src] });
    const res: State[] = [st(null, null, null, null)];
    dp[0] = nums[0]; res.push(st(0, null, null, dp[0]));
    if (n === 1) return res;
    dp[1] = Math.max(nums[0], nums[1]); src = [0]; res.push(st(1, null, null, dp[1]));
    for (let i = 2; i < n; i++) {
      const rob = (dp[i - 2] as number) + nums[i], skip = dp[i - 1] as number;
      src = [i - 2, i - 1];
      res.push(st(i, rob, skip, null));
      dp[i] = Math.max(rob, skip);
      res.push(st(i, rob, skip, dp[i]));
    }
    src = [];
    res.push(st(n - 1, null, null, dp[n - 1]));
    return res;
  },
  project: (s) => ({ dp: gridFlat(s, [1]), i: vs(s, 'i'), rob: vs(s, 'rob it'), skip: vs(s, 'skip it'), cur: vs(s, 'dp[i]'), src: cmpIdx(s, [1]) }),
  notes: 'cell colours not checked; the house row (input) is not compared',
});

/* ================================================================================================ 322 coin change */
add({
  slug: '322-coin-change',
  gen: (r) => {
    const k = rint(r, 1, 4); const set = new Set<number>();
    while (set.size < k) set.add(rint(r, 1, r() < 0.4 ? 6 : 12));
    return { coins: [...set], amount: rint(r, 0, 14) };
  },
  oracle: ({ coins: c0, amount }: { coins: number[]; amount: number }) => {
    const coins = [...c0].sort((x, y) => x - y);
    const INF = 1e9;
    const dp: number[] = Array(amount + 1).fill(null);
    const show = (): Scalar[] => dp.map((v) => (v === null ? null : v >= INF ? INFS : v));
    const st = (a: number | null, coin: Scalar, cand: Scalar, from: number | null): State => ({
      dp: show(), a, coin, cand, from, cur: a === null || dp[a] === null ? null : dp[a] >= INF ? INFS : dp[a],
    });
    const res: State[] = [st(null, null, null, null)];
    dp[0] = 0; res.push(st(0, null, null, null));
    for (let x = 1; x <= amount; x++) {
      dp[x] = INF;
      for (const c of coins) {
        if (c > x) continue;
        const prev = dp[x - c];
        const cand: Scalar = prev >= INF ? INFS : prev + 1;
        if (prev < INF && prev + 1 < dp[x]) dp[x] = prev + 1;
        res.push(st(x, c, cand, x - c));
      }
      res.push(st(x, null, null, null));
    }
    res.push(st(amount, null, null, null));
    return res;
  },
  project: (s) => ({ dp: arrFlat(s), a: ptr(s, 'a'), coin: vs(s, 'coin'), cand: vs(s, 'dp[a-coin]+1'), from: ptr(s, 'f'), cur: vs(s, 'dp[a]') }),
  notes: 'colours not checked',
});

/* ================================================================================================ 279 perfect squares */
add({
  slug: '279-perfect-squares',
  gen: (r) => ({ n: rint(r, 1, 24) }),
  oracle: ({ n }: { n: number }) => {
    const INF = 1e9;
    const dp: number[] = Array(n + 1).fill(null);
    const show = (): Scalar[] => dp.map((v) => (v === null ? null : v >= INF ? INFS : v));
    const st = (i: number | null, sq: Scalar, cand: Scalar, from: number | null): State => ({
      dp: show(), i, sq, cand, from, cur: i === null || dp[i] === null ? null : dp[i],
    });
    const res: State[] = [st(null, null, null, null)];
    dp[0] = 0; res.push(st(0, null, null, null));
    for (let x = 1; x <= n; x++) {
      dp[x] = INF;
      for (let s = 1; s * s <= x; s++) {
        const prev = dp[x - s * s];
        if (prev + 1 < dp[x]) dp[x] = prev + 1;
        res.push(st(x, s * s, prev + 1, x - s * s));
      }
    }
    res.push(st(n, null, null, null));
    return res;
  },
  project: (s) => ({ dp: arrFlat(s), i: ptr(s, 'i'), sq: vs(s, 'square'), cand: vs(s, 'dp[i-sq]+1'), from: ptr(s, 'f'), cur: vs(s, 'dp[i]') }),
  notes: 'colours, the reconstruction chain highlighting and the squares list not checked',
});

/* ================================================================================================ 62 unique paths */
add({
  slug: '62-unique-paths',
  gen: (r) => ({ m: rint(r, 1, 7), n: rint(r, 1, 9) }),
  oracle: ({ m, n }: { m: number; n: number }) => {
    const dp: Scalar[][] = Array.from({ length: m }, () => nullArr(n));
    let src: number[] = [];
    const st = (rr: number | null, cc: number | null, up: Scalar, left: Scalar): State => ({ dp: dp.flat(), r: rr, c: cc, up, left, src: [...src] });
    const res: State[] = [st(null, null, null, null)];
    for (let r = 0; r < m; r++) dp[r][0] = 1;
    res.push(st(null, null, null, null));
    for (let c = 0; c < n; c++) dp[0][c] = 1;
    res.push(st(null, null, null, null));
    for (let r = 1; r < m; r++) for (let c = 1; c < n; c++) {
      const up = dp[r - 1][c] as number, left = dp[r][c - 1] as number;
      dp[r][c] = up + left;
      src = [(r - 1) * n + c, r * n + c - 1].sort((x, y) => x - y);
      res.push(st(r, c, up, left));
    }
    src = [];
    res.push(st(m - 1, n - 1, null, null));
    return res;
  },
  project: (s) => ({ dp: gridFlat(s), r: vs(s, 'r'), c: vs(s, 'c'), up: vs(s, 'dp[r-1][c]'), left: vs(s, 'dp[r][c-1]'), src: cmpIdx(s) }),
  notes: 'colours not checked',
});

/* ================================================================================================ 63 unique paths II */
add({
  slug: '63-unique-paths-ii',
  gen: (r) => {
    const m = rint(r, 1, 5), n = rint(r, 1, 6), p = r() < 0.3 ? 0.5 : 0.2;
    return { grid: Array.from({ length: m }, () => Array.from({ length: n }, () => (r() < p ? '1' : '0')).join('')) };
  },
  oracle: ({ grid }: { grid: string[] }) => {
    const m = grid.length, n = grid[0].length;
    const dp: Scalar[][] = grid.map((row) => [...row].map((ch) => (ch === '1' ? '✕' : null)));
    const val = (r: number, c: number): number => (grid[r][c] === '1' ? 0 : (dp[r][c] as number));
    let src: number[] = [];
    const st = (r: number | null, c: number | null, up: Scalar, left: Scalar): State => ({ dp: dp.flat(), r, c, up, left, src: [...src] });
    const res: State[] = [st(null, null, null, null)];
    for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
      src = [];
      if (grid[r][c] === '1') { res.push(st(r, c, null, null)); continue; }
      if (r === 0 && c === 0) { dp[0][0] = 1; res.push(st(0, 0, null, null)); continue; }
      const a = r > 0 ? val(r - 1, c) : 0, b = c > 0 ? val(r, c - 1) : 0;
      dp[r][c] = a + b;
      // an obstacle source keeps its red ✕ look (it is never drawn as a yellow source); its 0 is shown in "from above/left"
      src = [...(r > 0 && grid[r - 1][c] !== '1' ? [(r - 1) * n + c] : []), ...(c > 0 && grid[r][c - 1] !== '1' ? [r * n + c - 1] : [])].sort((x, y) => x - y);
      res.push(st(r, c, r > 0 ? a : 'edge', c > 0 ? b : 'edge'));
    }
    src = [];
    res.push(st(m - 1, n - 1, null, null));
    return res;
  },
  project: (s) => ({ dp: gridFlat(s), r: vs(s, 'r'), c: vs(s, 'c'), up: vs(s, 'from above'), left: vs(s, 'from left'), src: cmpIdx(s) }),
  notes: 'obstacle cells shown as ✕ (the animation never shows their 0); colours not checked',
});

/* ================================================================================================ 120 triangle */
add({
  slug: '120-triangle',
  gen: (r) => {
    const R = rint(r, 1, 6);
    return { tri: Array.from({ length: R }, (_, i) => rarr(r, i + 1, -9, 9)) };
  },
  oracle: ({ tri }: { tri: number[][] }) => {
    const R = tri.length;
    const dp = tri.map((row) => [...row]);
    const flat = (): Scalar[] => Array.from({ length: R }, (_, r) => Array.from({ length: R }, (_, c) => (c > r ? null : dp[r][c]))).flat();
    let src: number[] = [];
    const st = (r: number | null, c: number | null, below: Scalar, br: Scalar): State => ({ dp: flat(), row: r, col: c, below, br, src: [...src] });
    const res: State[] = [st(null, null, null, null)];
    for (let r = R - 2; r >= 0; r--) for (let c = 0; c <= r; c++) {
      const b = dp[r + 1][c], d = dp[r + 1][c + 1];
      src = [(r + 1) * R + c, (r + 1) * R + c + 1];
      res.push(st(r, c, b, d));
      dp[r][c] = tri[r][c] + Math.min(b, d);
      res.push(st(r, c, b, d));
    }
    src = [];
    res.push(st(0, 0, null, null));
    return res;
  },
  project: (s) => ({ dp: gridFlat(s), row: vs(s, 'row'), col: vs(s, 'col'), below: vs(s, 'below'), br: vs(s, 'below-right'), src: cmpIdx(s) }),
  notes: 'colours not checked; the triangle shows the in-place bottom-up values (cells not yet processed still show the input number)',
});

/* ============================================================================ two-string tables (LCS / edit distance) */
const strGen = (r: () => number, maxA: number, maxB: number, minLen = 1) => ({ a: rstr(r, rint(r, minLen, maxA), r() < 0.5 ? 'ab' : 'abc'), b: rstr(r, rint(r, minLen, maxB), r() < 0.5 ? 'ab' : 'abc') });
const auxItems = (s: Step, k = 0): Scalar[] => (s.aux?.[k]?.items ?? []).map((x) => x as Scalar);

add({
  slug: '1143-longest-common-subsequence',
  gen: (r) => strGen(r, 7, 8),
  oracle: ({ a, b }: { a: string; b: string }) => {
    const m = a.length, n = b.length;
    const dp: Scalar[][] = Array.from({ length: m + 1 }, () => nullArr(n + 1));
    let src: number[] = [];
    const st = (i: number | null, j: number | null, up: Scalar, left: Scalar, diag: Scalar, built: string[]): State => ({ dp: dp.flat(), i, j, up, left, diag, built: [...built], src: [...src] });
    const res: State[] = [st(null, null, null, null, null, [])];
    for (let i = 0; i <= m; i++) dp[i][0] = 0;
    for (let j = 0; j <= n; j++) dp[0][j] = 0;
    res.push(st(null, null, null, null, null, []));
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) { const d = dp[i - 1][j - 1] as number; dp[i][j] = d + 1; src = [(i - 1) * (n + 1) + j - 1]; res.push(st(i, j, null, null, d, [])); }
      else { const u = dp[i - 1][j] as number, l = dp[i][j - 1] as number; dp[i][j] = Math.max(u, l); src = [(i - 1) * (n + 1) + j, i * (n + 1) + j - 1].sort((x, y) => x - y); res.push(st(i, j, u, l, null, [])); }
    }
    src = [];
    let i = m, j = n; const letters: string[] = [];
    // the walk-back path: matched cells are green ('found'), the other cells on the path are 'sorted'
    const pmap = new Map<number, 'found' | 'sorted'>(); let walk = false;
    const mark = (r: number, c: number, kind: 'found' | 'sorted') => { const k = r * (n + 1) + c; if (kind === 'found' || !pmap.has(k)) pmap.set(k, kind); };
    const stw = (...args: Parameters<typeof st>): State => ({
      ...st(...args),
      pf: walk ? [...pmap].filter(([, v]) => v === 'found').map(([k]) => k).sort((x, y) => x - y) : [],
      ps: walk ? [...pmap].filter(([, v]) => v === 'sorted').map(([k]) => k).sort((x, y) => x - y) : [],
    });
    for (let q2 = 0; q2 < res.length; q2++) res[q2] = { ...res[q2], pf: [], ps: [] };
    walk = true; mark(i, j, 'sorted');
    res.push(stw(m, n, null, null, null, []));
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) { letters.push(a[i - 1]); mark(i, j, 'found'); res.push(stw(i, j, null, null, null, letters)); i--; j--; mark(i, j, 'sorted'); }
      else if ((dp[i - 1][j] as number) >= (dp[i][j - 1] as number)) { i--; mark(i, j, 'sorted'); res.push(stw(i, j, null, null, null, letters)); }
      else { j--; mark(i, j, 'sorted'); res.push(stw(i, j, null, null, null, letters)); }
    }
    res.push(stw(m, n, null, null, null, letters));
    return res;
  },
  project: (s) => {
    const g = sceneOfKind(s, 'grid');
    const walkStep = /^(Length =|Take |Move |Done)/.test(s.title);
    const pick = (state: string): number[] => { const o: number[] = []; if (g && walkStep) g.rows.forEach((row, r) => row.forEach((c, k) => { if (c.state === state) o.push(r * row.length + k); })); return o; };
    return { dp: gridFlat(s), i: vs(s, 'i'), j: vs(s, 'j'), up: vs(s, 'up'), left: vs(s, 'left'), diag: vs(s, 'diag'), built: auxItems(s), src: cmpIdx(s), pf: pick('found'), ps: pick('sorted') };
  },
  invariants: [
    // the subsequence read off the table must be a common subsequence of the right length (checked on the last step)
    (step, idx, steps, { a, b }: { a: string; b: string }) => {
      if (idx !== steps.length - 1) return null;
      const built = auxItems(step).map(String).reverse().join('');
      const isSub = (x: string, y: string) => { let p = 0; for (const ch of y) if (p < x.length && x[p] === ch) p++; return p === x.length; };
      const g = gridFlat(step); const len = g[g.length - 1];
      if (!isSub(built, a) || !isSub(built, b)) return `"${built}" is not a common subsequence`;
      return built.length === len ? null : `reconstructed length ${built.length} != dp corner ${len}`;
    },
  ],
  notes: 'the walk-back is verified through (i, j), the built-letter list and the green (matched) / sorted (path) cell colours; fill-phase colours other than the source cells are not checked',
});

add({
  slug: '72-edit-distance',
  gen: (r) => strGen(r, 7, 8, 0),
  oracle: ({ a, b }: { a: string; b: string }) => {
    const m = a.length, n = b.length;
    const dp: Scalar[][] = Array.from({ length: m + 1 }, () => nullArr(n + 1));
    let src: number[] = [];
    const st = (i: number | null, j: number | null, rep: Scalar, del: Scalar, ins: Scalar): State => ({ dp: dp.flat(), i, j, rep, del, ins, src: [...src] });
    const res: State[] = [st(null, null, null, null, null)];
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    res.push(st(null, null, null, null, null));
    const W = n + 1;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) { dp[i][j] = dp[i - 1][j - 1]; src = [(i - 1) * W + j - 1]; res.push(st(i, j, null, null, null)); }
      else {
        const rep = dp[i - 1][j - 1] as number, del = dp[i - 1][j] as number, ins = dp[i][j - 1] as number;
        dp[i][j] = 1 + Math.min(rep, del, ins);
        src = [(i - 1) * W + j - 1, (i - 1) * W + j, i * W + j - 1];
        res.push(st(i, j, rep, del, ins));
      }
    }
    src = [];
    res.push(st(m, n, null, null, null));
    return res;
  },
  project: (s) => ({ dp: gridFlat(s), i: vs(s, 'i'), j: vs(s, 'j'), rep: vs(s, 'replace'), del: vs(s, 'delete'), ins: vs(s, 'insert'), src: cmpIdx(s) }),
  notes: 'colours not checked; the best operation named in the narration text is not checked',
});

add({
  slug: 'gfg-longest-common-substring',
  gen: (r) => strGen(r, 7, 8),
  oracle: ({ a, b }: { a: string; b: string }) => {
    const m = a.length, n = b.length;
    const dp: Scalar[][] = Array.from({ length: m + 1 }, () => nullArr(n + 1));
    let best = 0, bi = 0, bj = 0;
    let src: number[] = [];
    const st = (i: number | null, j: number | null, diag: Scalar, run: Scalar[] | null): State => ({ dp: dp.flat(), i, j, diag, best, run, src: [...src] });
    const res: State[] = [st(null, null, null, null)];
    for (let i = 0; i <= m; i++) dp[i][0] = 0;
    for (let j = 0; j <= n; j++) dp[0][j] = 0;
    res.push(st(null, null, null, null));
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        const d = dp[i - 1][j - 1] as number; dp[i][j] = d + 1;
        if (d + 1 > best) { best = d + 1; bi = i; bj = j; }
        src = [(i - 1) * (n + 1) + j - 1];
        res.push(st(i, j, d, null));
      } else { dp[i][j] = 0; src = []; res.push(st(i, j, null, null)); }
    }
    src = [];
    const run: number[] = [];
    for (let t = 0; t < best; t++) run.push((bi - t) * (n + 1) + (bj - t));
    run.sort((x, y) => x - y);
    res.push(st(null, null, null, run));
    return res;
  },
  project: (s) => {
    const g = sceneOfKind(s, 'grid');
    const run: number[] = [];
    if (s.title === 'Done' && g) g.rows.forEach((row, r) => row.forEach((c, k) => { if (c.state === 'found') run.push(r * row.length + k); }));
    return { dp: gridFlat(s), i: vs(s, 'i'), j: vs(s, 'j'), diag: vs(s, 'diag'), best: vs(s, 'best'), run: s.title === 'Done' ? run : null, src: cmpIdx(s) };
  },
  notes: 'only the final highlighted diagonal run is compared (ties: first maximum in row-major order, as the Java spec does with a strict >); the purple provisional best-end marker is not checked',
});

/* ============================================================================================ 300 LIS (patience sort) */
const stateIdx = (s: Step, row: number, state: string): number | null => {
  const g = sceneOfKind(s, 'grid');
  const i = g ? g.rows[row].findIndex((c) => c.state === state) : -1;
  return i < 0 ? null : i;
};
add({
  slug: '300-longest-increasing-subsequence',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 10), r() < 0.3 ? 0 : -20, r() < 0.3 ? 3 : 20) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const n = nums.length;
    const tails: number[] = [];
    const st = (i: number | null, lo: number | null, hi: number | null, mid: number | null, placed: number | null): State => ({
      tails: Array.from({ length: n }, (_, k) => (k < tails.length ? tails[k] : null)), i, x: i === null ? null : nums[i], lo, hi, len: tails.length, mid, placed,
      // slots still inside the binary-search window [lo, hi) that hold a tail (the probe and the freshly written slot are drawn differently)
      rng: lo === null || hi === null ? [] : Array.from({ length: Math.max(0, hi - lo) }, (_, q2) => lo + q2).filter((q2) => q2 < tails.length && q2 !== mid && q2 !== placed),
    });
    const res: State[] = [st(null, null, null, null, null)];
    for (let i = 0; i < n; i++) {
      const x = nums[i];
      let lo = 0, hi = tails.length;
      res.push(st(i, lo, hi, null, null));
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        res.push(st(i, lo, hi, m, null));
        if (tails[m] < x) lo = m + 1; else hi = m;
      }
      if (lo === tails.length) tails.push(x); else tails[lo] = x;
      res.push(st(i, lo, lo, null, lo));
    }
    res.push(st(null, null, null, null, null));
    return res;
  },
  project: (s) => ({
    tails: gridFlat(s, [1]), i: vs(s, 'i'), x: vs(s, 'x'), lo: vs(s, 'lo'), hi: vs(s, 'hi'), len: vs(s, 'LIS length'),
    mid: stateIdx(s, 1, 'active'), placed: stateIdx(s, 1, 'found'), rng: cmpIdx(s, [1]),
  }),
  notes: 'mid / placed are read from the tails-row cell colours (active / found); the "search range" colouring and the nums-row colours are not checked',
});

/* ================================================================================================ 91 decode ways */
add({
  slug: '91-decode-ways',
  gen: (r) => ({ s: Array.from({ length: rint(r, 1, 12) }, () => '0126789'[rint(r, 0, r() < 0.5 ? 3 : 6)]).join('') }),
  oracle: ({ s }: { s: string }) => {
    const n = s.length;
    const dp: Scalar[] = nullArr(n + 1);
    let src: number[] = [];
    const st = (i: number | null, one: Scalar, two: Scalar): State => ({ dp: [...dp], i, one, two, src: [...src] });
    const res: State[] = [st(null, null, null)];
    dp[0] = 1; res.push(st(0, null, null));
    for (let i = 1; i <= n; i++) {
      const w = s[i - 1] !== '0' ? (dp[i - 1] as number) : 0;
      const pair = i >= 2 ? Number(s.slice(i - 2, i)) : -1;
      const ok2 = i >= 2 && pair >= 10 && pair <= 26;
      const w2 = ok2 ? (dp[i - 2] as number) : 0;
      dp[i] = w + w2;
      src = [...(ok2 ? [i - 2] : []), ...(s[i - 1] !== '0' ? [i - 1] : [])];
      res.push(st(i, w, w2));
      src = [];
    }
    res.push(st(n, null, null));
    return res;
  },
  project: (s) => ({ dp: gridFlat(s, [1]), i: vs(s, 'i'), one: vs(s, 'one digit'), two: vs(s, 'two digits'), src: cmpIdx(s, [1]) }),
  notes: 'colours not checked; the digit row is not compared',
});

/* ============================================================== 516 / 1312 interval palindromic tables (shared kit in the animation) */
function palTable(kind: 'lps' | 'ins') {
  return (input: { s: string }): State[] => {
    const s = input.s, n = s.length;
    const dp: Scalar[][] = Array.from({ length: n }, () => nullArr(n));
    const st = (i: number | null, j: number | null, len: number | null, ends: Scalar): State => ({ dp: dp.flat(), i, j, len, ends });
    const res: State[] = [st(null, null, null, null)];
    for (let i = 0; i < n; i++) dp[i][i] = kind === 'lps' ? 1 : 0;
    res.push(st(null, null, 1, null));
    let last: State = res[res.length - 1];
    for (let len = 2; len <= n; len++) for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      const inner = len === 2 ? 0 : (dp[i + 1][j - 1] as number);
      if (s[i] === s[j]) dp[i][j] = kind === 'lps' ? inner + 2 : inner;
      else dp[i][j] = kind === 'lps' ? Math.max(dp[i + 1][j] as number, dp[i][j - 1] as number) : 1 + Math.min(dp[i + 1][j] as number, dp[i][j - 1] as number);
      last = st(i, j, len, `${s[i]} vs ${s[j]}`);
      res.push(last);
    }
    // Done frames the answer cell dp[0][n-1] (for n = 1 that is the single diagonal cell, no ends pair)
    res.push(st(0, n - 1, n, n >= 2 ? `${s[0]} vs ${s[n - 1]}` : null)); void last;
    return res;
  };
}
for (const [slug, kind] of [['516-longest-palindromic-subsequence', 'lps'], ['1312-minimum-insertion-steps-to-make-a-string-palindrome', 'ins']] as const) {
  add({
    slug,
    gen: (r) => ({ s: rstr(r, rint(r, 1, 8), r() < 0.5 ? 'ab' : 'abc') }),
    oracle: palTable(kind),
    project: (s) => ({ dp: gridFlat(s), i: vs(s, 'i'), j: vs(s, 'j'), len: vs(s, 'len'), ends: vs(s, 'ends') }),
    notes: 'colours not checked; lower-triangle placeholder cells are treated as empty',
  });
}

/* ================================================================================================ 647 palindromic substrings */
add({
  slug: '647-palindromic-substrings',
  gen: (r) => ({ s: rstr(r, rint(r, 1, 8), r() < 0.3 ? 'a' : r() < 0.5 ? 'ab' : 'abc') }),
  oracle: ({ s }: { s: string }) => {
    const n = s.length;
    const found: string[] = [];
    // hl = the letters framed green (the palindrome just counted), err = the two mismatching letters drawn red, auxHl = the highlighted entry of the list
    const st = (center: Scalar, l: number | null, r: number | null, pl: number | null, pr: number | null, hl: number[] = [], err: number[] = [], auxHl: number | null = null): State => ({
      center, l, r, count: found.length, pl, pr, found: found.map((w, i) => `${i + 1}. ${w}`), hl, err, auxHl,
    });
    const res: State[] = [st(null, null, null, null, null)];
    for (let c = 0; c < n; c++) for (let ext = 0; ext < 2; ext++) {
      let l = c, r = c + ext;
      const label = `${ext === 0 ? 'odd' : 'even'} @ ${c}`;
      for (;;) {
        if (l < 0 || r >= n) { res.push(st(label, l, r, null, null)); break; }
        if (s[l] !== s[r]) { res.push(st(label, l, r, l, r, [], [l, r])); break; }
        found.push(s.slice(l, r + 1));
        res.push(st(label, l, r, l, r, Array.from({ length: r - l + 1 }, (_, q2) => l + q2), [], found.length - 1));
        l--; r++;
      }
    }
    res.push(st(null, null, null, null, null));
    return res;
  },
  project: (s) => {
    const cells = sceneOfKind(s, 'array')?.cells ?? [];
    return {
      center: vs(s, 'center'), l: vs(s, 'l'), r: vs(s, 'r'), count: vs(s, 'count'), pl: ptr(s, 'l'), pr: ptr(s, 'r'), found: auxItems(s),
      hl: cells.flatMap((c, i) => (c.state === 'found' ? [i] : [])), err: cells.flatMap((c, i) => (c.state === 'error' ? [i] : [])), auxHl: s.aux?.[0]?.highlight ?? null,
    };
  },
  notes: 'only the green (found) / red (error) letter frames and the highlighted list entry are checked as colours',
});

/* ================================================================================================ 132 palindrome partitioning II */
add({
  slug: '132-palindrome-partitioning-ii',
  gen: (r) => ({ s: rstr(r, rint(r, 1, 8), r() < 0.3 ? 'a' : r() < 0.5 ? 'ab' : 'abc') }),
  oracle: ({ s }: { s: string }) => {
    const n = s.length;
    const pal: (boolean | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
    const cuts: Scalar[] = nullArr(n);
    const tbl = (): Scalar[] => pal.flatMap((row, r) => row.map((v, c) => (c < r || v === null ? null : v ? 'T' : 'F')));
    let src: number[] = []; let cutSrc: number[] = [];
    const st = (j: number | null, i: number | null, verdict: Scalar, cand: Scalar): State => ({ pal: tbl(), cuts: [...cuts], j, i, verdict, cand, src: [...src], cutSrc: [...cutSrc] });
    const res: State[] = [st(null, null, null, null)];
    for (let e = 0; e < n; e++) {
      cuts[e] = e; src = []; cutSrc = [];
      res.push(st(e, null, null, null));
      for (let b = 0; b <= e; b++) {
        const isPal = s[b] === s[e] && (e - b < 2 || pal[b + 1][e - 1] === true);
        pal[b][e] = isPal;
        const cand = isPal ? (b === 0 ? 0 : (cuts[b - 1] as number) + 1) : null;
        if (isPal && (cand as number) < (cuts[e] as number)) cuts[e] = cand;
        src = e - b < 2 ? [] : [(b + 1) * n + (e - 1)];   // the inner substring's verdict is the one source read
        cutSrc = isPal && b > 0 ? [b - 1] : [];            // cuts[b-1] is read only when the piece is a palindrome that does not start at 0
        res.push(st(e, b, isPal ? 'T' : 'F', cand));
      }
      src = []; cutSrc = [];
      res.push(st(e, null, null, null));
    }
    res.push(st(n - 1, null, null, null));
    return res;
  },
  project: (s) => ({ pal: gridFlat(s), cuts: arrFlat(s), j: vs(s, 'j'), i: vs(s, 'i'), verdict: vs(s, 'pal[i][j]'), cand: vs(s, 'cand'), src: cmpIdx(s), cutSrc: cmpArr(s) }),
  invariants: [
    (step, idx, steps, { s }: { s: string }) => {
      if (idx !== steps.length - 1) return null;
      const pieces = auxItems(step).map(String);
      if (pieces.join('') !== s) return `pieces ${pieces.join('|')} do not spell ${s}`;
      if (pieces.some((p) => p !== [...p].reverse().join(''))) return `a piece is not a palindrome: ${pieces.join('|')}`;
      const c = arrFlat(step); const last = c[c.length - 1];
      return pieces.length - 1 === last ? null : `${pieces.length - 1} cuts in pieces but cuts[n-1] = ${last}`;
    },
  ],
  notes: 'which optimal partition is shown (tie-break: earliest start wins) is checked only as valid + minimal, not against a specific one; colours not checked',
});

/* ===================================================================================== knapsack family */
const toneFlags = (s: Step, tone: string): number[] => {
  const g = sceneOfKind(s, 'grid');
  if (g) return g.rows.flatMap((r) => r.map((c) => (c.tone === tone ? 1 : 0)));
  return (sceneOfKind(s, 'array')?.cells ?? []).map((c) => (c.tone === tone ? 1 : 0));
};
type Knap = { wt: number[]; val: number[]; cap: number };
const genKnap = (r: () => number, maxItems: number, maxCap: number): Knap => {
  const n = rint(r, 1, maxItems);
  return { wt: rarr(r, n, 1, 9), val: rarr(r, n, 1, r() < 0.3 ? 3 : 30), cap: rint(r, 1, maxCap) };
};

add({
  slug: 'cp-0-1-knapsack',
  gen: (r) => genKnap(r, 5, 10),
  oracle: ({ wt, val, cap }: Knap) => {
    const n = wt.length;
    const dp: Scalar[][] = Array.from({ length: n + 1 }, () => nullArr(cap + 1));
    const took: number[][] = Array.from({ length: n + 1 }, () => Array(cap + 1).fill(0));
    let chosen: string[] = [];
    const item = (i: number): Scalar => (i > 0 ? `w${wt[i - 1]} v${val[i - 1]}` : null);
    let src: number[] = [];
    const st = (i: number | null, c: number | null, skip: Scalar, take: Scalar): State => ({
      dp: dp.flat(), took: took.flat(), item: i === null ? null : item(i), cap: c, skip, take, chosen: [...chosen], src: [...src],
    });
    const res: State[] = [st(null, null, null, null)];
    for (let c = 0; c <= cap; c++) dp[0][c] = 0;
    res.push(st(0, 0, null, null));
    for (let i = 1; i <= n; i++) for (let c = 0; c <= cap; c++) {
      const w = wt[i - 1], v = val[i - 1];
      const skipV = dp[i - 1][c] as number;
      const takeV = c >= w ? (dp[i - 1][c - w] as number) + v : null;
      const useTake = takeV !== null && takeV > skipV;
      dp[i][c] = useTake ? takeV : skipV;
      took[i][c] = useTake ? 1 : 0;
      src = [(i - 1) * (cap + 1) + c, ...(c >= w ? [(i - 1) * (cap + 1) + c - w] : [])].sort((x, y) => x - y);
      res.push(st(i, c, skipV, takeV === null ? 'n/a' : takeV));
    }
    src = [];
    // fnd = green cells during the answer / walk-back phase: first just the corner, then the path of cells the walk-back has visited
    let fnd: number[] = [];
    const stf = (i: number, c: number): State => ({ ...st(i, c, null, null), fnd: [...fnd].sort((x, y) => x - y) });
    for (let q2 = 0; q2 < res.length; q2++) res[q2] = { ...res[q2], fnd: [] };
    fnd = [n * (cap + 1) + cap];
    res.push(stf(n, cap));
    let c = cap;
    const path = [n * (cap + 1) + cap];
    for (let i = n; i >= 1; i--) {
      if (dp[i][c] !== dp[i - 1][c]) {
        chosen = [...chosen, `w${wt[i - 1]} v${val[i - 1]}`];
        path.push((i - 1) * (cap + 1) + c - wt[i - 1]); fnd = [...path]; res.push(stf(i, c)); c -= wt[i - 1];
      } else { path.push((i - 1) * (cap + 1) + c); fnd = [...path]; res.push(stf(i, c)); }
    }
    fnd = [...path];
    res.push(stf(n, cap));
    return res;
  },
  project: (s) => {
    const g = sceneOfKind(s, 'grid');
    const walkStep = /^(Best value|Walk back|Done)/.test(s.title);
    const fnd: number[] = [];
    if (g && walkStep) g.rows.forEach((row, r) => row.forEach((c, k) => { if (c.state === 'found') fnd.push(r * row.length + k); }));
    return { dp: gridFlat(s), took: toneFlags(s, 'green'), item: vs(s, 'item'), cap: vs(s, 'cap'), skip: vs(s, 'skip'), take: vs(s, 'take'), chosen: auxItems(s), src: cmpIdx(s), fnd };
  },
  notes: 'the walk-back is verified through the item / capacity shown, the "items taken" list and the green path cells; took = green-tinted cells; fill-phase colours other than the source cells are not checked',
});

add({
  slug: 'cp-unbounded-knapsack',
  gen: (r) => genKnap(r, 4, 12),
  oracle: ({ wt, val, cap }: Knap) => {
    const dp: number[] = Array(cap + 1).fill(0);
    const touched: number[] = Array(cap + 1).fill(0);
    const st = (item: number | null, c: number | null, cand: Scalar, from: number | null): State => ({
      dp: [...dp], touched: [...touched], item: item === null ? null : `${wt[item]}:${val[item]}`, c, cand, cur: c === null ? null : dp[c], from,
    });
    const res: State[] = [st(null, null, null, null)];
    for (let i = 0; i < wt.length; i++) {
      touched.fill(0);
      res.push(st(i, null, null, null));
      for (let x = wt[i]; x <= cap; x++) {
        const cand = dp[x - wt[i]] + val[i];
        if (cand > dp[x]) { dp[x] = cand; touched[x] = 1; }
        res.push(st(i, x, cand, x - wt[i]));
      }
    }
    res.push(st(null, cap, null, null));
    return res;
  },
  project: (s) => ({ dp: arrFlat(s), touched: toneFlags(s, 'purple'), item: vs(s, 'item'), c: vs(s, 'c'), cand: vs(s, 'dp[c-w]+v'), cur: vs(s, 'dp[c]'), from: ptr(s, 'f') }),
  notes: 'colours other than the purple "improved in this sweep" tint not checked; the 0/1 comparison number in the last narration is not checked',
});

add({
  slug: '416-partition-equal-subset-sum',
  gen: (r) => {
    for (;;) {
      const nums = rarr(r, rint(r, 1, 6), 1, r() < 0.3 ? 4 : 9);
      let sum = nums.reduce((a, b) => a + b, 0);
      if (sum % 2 && r() < 0.6) { nums[0] += nums[0] > 1 ? -1 : 1; sum = nums.reduce((a, b) => a + b, 0); }
      if (sum <= 24) return { nums };
    }
  },
  oracle: ({ nums }: { nums: number[] }) => {
    const n = nums.length, total = nums.reduce((a, b) => a + b, 0);
    if (total % 2) return [{ dp: [], item: null, sum: null, skip: null, take: null, src: [] }, { dp: [], item: null, sum: null, skip: null, take: null, src: [] }];
    const target = total / 2;
    const dp: Scalar[][] = Array.from({ length: n + 1 }, () => nullArr(target + 1));
    let src: number[] = [];
    const st = (i: number | null, sm: number | null, skip: Scalar, take: Scalar): State => ({ dp: dp.flat(), item: i !== null && i > 0 ? nums[i - 1] : null, sum: sm, skip, take, src: [...src] });
    const res: State[] = [st(null, null, null, null)];
    dp[0][0] = 'T'; for (let s = 1; s <= target; s++) dp[0][s] = 'F';
    res.push(st(0, 0, null, null));
    for (let i = 1; i <= n; i++) for (let s = 0; s <= target; s++) {
      const x = nums[i - 1];
      const skipV = dp[i - 1][s] === 'T', can = s >= x, takeV = can ? dp[i - 1][s - x] === 'T' : false;
      dp[i][s] = skipV || takeV ? 'T' : 'F';
      src = [(i - 1) * (target + 1) + s, ...(can ? [(i - 1) * (target + 1) + s - x] : [])].sort((p, q) => p - q);
      res.push(st(i, s, skipV ? 'T' : 'F', can ? (takeV ? 'T' : 'F') : 'n/a'));
    }
    src = [];
    res.push(st(n, target, null, null));
    return res;
  },
  project: (s) => ({ dp: sceneOfKind(s, 'grid')?.rowHeads ? gridFlat(s) : [], item: vs(s, 'item'), sum: vs(s, 'sum'), skip: vs(s, 'skip'), take: vs(s, 'take'), src: cmpIdx(s) }),
  notes: 'odd total: only "no table is built" is checked; colours not checked',
});

add({
  slug: '518-coin-change-ii',
  gen: (r) => {
    const k = rint(r, 1, 4); const set = new Set<number>();
    while (set.size < k) set.add(rint(r, 1, r() < 0.4 ? 5 : 12));
    return { coins: [...set], amount: rint(r, 0, 12) };
  },
  oracle: ({ coins, amount }: { coins: number[]; amount: number }) => {
    const dp: number[] = Array(amount + 1).fill(0);
    const touched: number[] = Array(amount + 1).fill(0);
    const st = (ci: number | null, a: number | null, from: number | null): State => ({
      dp: [...dp], touched: [...touched], coin: ci === null ? null : coins[ci], a, cur: a === null ? null : dp[a], prev: from === null ? null : dp[from], from,
    });
    const res: State[] = [st(null, null, null)];
    dp[0] = 1; res.push(st(null, 0, null));
    coins.forEach((coin, idx) => {
      touched.fill(0);
      res.push(st(idx, null, null));
      for (let x = coin; x <= amount; x++) {
        const add = dp[x - coin];
        dp[x] += add;
        if (add > 0) touched[x] = 1;
        res.push(st(idx, x, x - coin));
      }
    });
    res.push(st(null, amount, null));
    return res;
  },
  project: (s) => ({ dp: arrFlat(s), touched: toneFlags(s, 'purple'), coin: vs(s, 'coin'), a: vs(s, 'a'), cur: vs(s, 'dp[a]'), prev: vs(s, 'dp[a-coin]'), from: ptr(s, 'f') }),
  notes: 'colours other than the purple tint not checked; the "ordered sequences" contrast number is not checked',
});

add({
  slug: '1049-last-stone-weight-ii',
  gen: (r) => {
    for (;;) {
      const stones = rarr(r, rint(r, 1, 6), 1, r() < 0.4 ? 5 : 20);
      if (stones.reduce((a, b) => a + b, 0) <= 30) return { stones };
    }
  },
  oracle: ({ stones }: { stones: number[] }) => {
    const total = stones.reduce((a, b) => a + b, 0), half = total >> 1;
    const dp: boolean[] = Array(half + 1).fill(false);
    const st = (stone: Scalar, s: number | null, from: Scalar, best: Scalar): State => ({ dp: dp.map((v) => (v ? 'T' : 'F')), stone, s, from, best });
    const res: State[] = [st(null, null, null, null)];
    dp[0] = true; res.push(st(null, 0, null, null));
    for (const w of stones) for (let t = half; t >= w; t--) {
      if (dp[t - w]) dp[t] = true;
      res.push(st(w, t, dp[t - w] ? 'T' : 'F', null));
    }
    let found = 0;
    for (let t = half; t >= 0; t--) if (dp[t]) { found = t; break; }
    res.push(st(null, found, null, found));
    return res;
  },
  project: (s) => ({ dp: arrFlat(s), stone: vs(s, 'stone'), s: vs(s, 's'), from: vs(s, 'dp[s-stone]'), best: vs(s, 'best') }),
  notes: 'colours not checked; the final "total - 2*best" answer is only in the result text (not projected)',
});

/* ===================================================================================== 698 bitmask table */
add({
  slug: '698-partition-to-k-equal-sum-subsets',
  gen: (r) => {
    const nums = rarr(r, rint(r, 1, 6), 1, r() < 0.4 ? 4 : 9);
    const total = nums.reduce((a, b) => a + b, 0);
    const divs = Array.from({ length: nums.length }, (_, i) => i + 1).filter((k) => total % k === 0);
    const k = r() < 0.75 && divs.length ? divs[rint(r, 0, divs.length - 1)] : rint(r, 1, nums.length);
    return { nums, k };
  },
  oracle: ({ nums, k }: { nums: number[]; k: number }) => {
    const n = nums.length, total = nums.reduce((a, b) => a + b, 0);
    const bin = (m: number) => m.toString(2).padStart(n, '0');
    const divisible = total % k === 0, target = divisible ? total / k : 0;
    const dp: number[] = Array(1 << n).fill(-1);
    const tbl = (): Scalar[] => dp.map((v) => (v < 0 ? null : v));
    const st = (cur: number | null, fresh: number[]): State => ({
      dp: tbl(), mask: cur === null ? null : bin(cur), cur: cur === null ? null : dp[cur], fresh, target: divisible ? target : null,
      inMask: cur === null ? [] : Array.from({ length: n }, (_, i) => i).filter((i) => cur & (1 << i)),   // numbers of the current mask are lit
    });
    const res: State[] = [st(null, [])];
    if (!divisible) return res;
    dp[0] = 0; res.push(st(0, []));
    for (let mask = 0; mask < 1 << n; mask++) {
      if (dp[mask] < 0) continue;
      const fresh: number[] = [];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) continue;
        const fill = dp[mask] + nums[i];
        if (fill > target) continue;
        dp[mask | (1 << i)] = fill % target;
        fresh.push(mask | (1 << i));
      }
      if (mask === (1 << n) - 1) break;
      res.push(st(mask, fresh));
    }
    res.push(st((1 << n) - 1, []));
    return res;
  },
  project: (s) => {
    const g = sceneOfKind(s, 'grid');
    const fresh: number[] = [];
    if (g) g.rows.forEach((row, r) => row.forEach((c, k) => { if (c.state === 'compare') fresh.push(r * row.length + k); }));
    return { dp: gridFlat(s), mask: vs(s, 'mask'), cur: vs(s, 'dp[mask]'), fresh, target: vs(s, 'target'), inMask: arrStates(s, 'active') };
  },
  notes: 'the table is shown folded (low 3 bits across, rest down) so its row-major order equals mask order; the aux "bucket arithmetic" texts and the number-chip highlights are not checked',
});

/* ===================================================================================== memoised recursion (call trees) */
/** The recursion tree the viewer sees: node values + child links, and the label chips. */
class OTree {
  nodes: { value: string | number; left: number | null; right: number | null }[] = [];
  labels: string[] = [];
  add(value: string | number, parent: number | null, side: 'left' | 'right'): number {
    const id = this.nodes.length;
    this.nodes.push({ value, left: null, right: null });
    this.labels.push('');
    if (parent !== null) this.nodes[parent][side] = id;
    return id;
  }
  shape(): Scalar[] { return this.nodes.map((n) => `${n.value}:${n.left ?? '-'}:${n.right ?? '-'}`); }
  lab(): Scalar[] { return [...this.labels]; }
}
const treeProj = (s: Step): { shape: Scalar[]; labels: Scalar[]; errors: Scalar[] } => {
  const t = sceneOfKind(s, 'tree');
  const nodes = t?.nodes ?? [];
  return {
    shape: nodes.map((n) => `${n.value}:${n.left ?? '-'}:${n.right ?? '-'}`),
    labels: nodes.map((n) => t?.labels[n.id] ?? ''),
    errors: nodes.filter((n) => t?.states[n.id] === 'error').map((n) => n.id),
  };
};

add({
  slug: 'alg-memoized-fibonacci',
  gen: (r) => ({ n: rint(r, 2, 6) }),
  oracle: ({ n }: { n: number }) => {
    const res: State[] = [];
    // phase 1: plain recursion tree, repeats marked
    let t = new OTree();
    const seen = new Set<number>(); const errs: number[] = [];
    const plain = (k: number, parent: number | null, side: 'left' | 'right', inDup: boolean) => {
      const dup = inDup || (k >= 2 && seen.has(k));
      const id = t.add(`f${k}`, parent, side);
      if (k >= 2) seen.add(k);
      if (dup) errs.push(id);
      if (k >= 2) { plain(k - 1, id, 'left', dup); plain(k - 2, id, 'right', dup); }
    };
    plain(n, null, 'left', false);
    const total = t.nodes.length;
    let calls = 0, hits = 0, k: number | null = null;
    const memo = new Map<number, number>();
    const st = (dupList: number[]): State => ({ shape: t.shape(), labels: t.lab(), errors: dupList, memo: [...memo.entries()].map(([a, b]) => `${a} → ${b}`), k, calls, hits, plain: total });
    res.push(st(errs));
    // phase 2: with a cache
    t = new OTree();
    const run = (kk: number, parent: number | null, side: 'left' | 'right'): number => {
      const id = t.add(`f${kk}`, parent, side);
      calls++; k = kk;
      if (kk <= 1) { t.labels[id] = `=${kk}`; res.push(st([])); return kk; }
      if (memo.has(kk)) { hits++; t.labels[id] = `hit ${memo.get(kk)}`; res.push(st([])); return memo.get(kk)!; }
      res.push(st([]));
      const a = run(kk - 1, id, 'left');
      k = kk;
      const b = run(kk - 2, id, 'right');
      memo.set(kk, a + b); t.labels[id] = `=${a + b}`; k = kk;
      res.push(st([]));
      return a + b;
    };
    run(n, null, 'left');
    k = n; res.push(st([]));
    return res;
  },
  project: (s) => {
    const tp = treeProj(s);
    return { shape: tp.shape, labels: tp.labels, errors: tp.errors, memo: auxItems(s), k: vs(s, 'k'), calls: vs(s, 'calls'), hits: vs(s, 'cache hits'), plain: vs(s, 'plain calls') };
  },
  notes: 'node colours other than the red "repeated work" flag of the plain-recursion tree are not checked',
});

add({
  slug: 'cp-grid-paths-with-memoization',
  gen: (r) => ({ rows: rint(r, 2, 4), cols: rint(r, 2, 4) }),
  oracle: ({ rows: R, cols: C }: { rows: number; cols: number }) => {
    const t = new OTree();
    const memo: Scalar[][] = Array.from({ length: R }, () => nullArr(C));
    const items: string[] = [];
    let calls = 0, hits = 0;
    let cell: Scalar = null; let hit: number | null = null;
    const count = (r: number, c: number): number => (r === R - 1 || c === C - 1 ? 1 : 1 + count(r + 1, c) + count(r, c + 1));
    const plain = count(0, 0);
    const st = (): State => ({ shape: t.shape(), labels: t.lab(), memo: memo.flat(), items: [...items], hit, cell, calls, hits, plain });
    const res: State[] = [st()];
    const run = (r: number, c: number, parent: number | null, side: 'left' | 'right'): number => {
      const id = t.add(`${r},${c}`, parent, side);
      calls++; cell = `(${r},${c})`; hit = null;
      if (r === R - 1 || c === C - 1) { t.labels[id] = '=1'; memo[r][c] = 1; res.push(st()); return 1; }
      if (memo[r][c] !== null) { hits++; hit = r * C + c; t.labels[id] = `hit ${memo[r][c]}`; res.push(st()); return memo[r][c] as number; }
      res.push(st());
      const down = run(r + 1, c, id, 'left');
      cell = `(${r},${c})`;
      const right = run(r, c + 1, id, 'right');
      const v = down + right;
      memo[r][c] = v; items.push(`(${r},${c}) → ${v}`);
      cell = `(${r},${c})`; hit = null; t.labels[id] = `=${v}`;
      res.push(st());
      return v;
    };
    run(0, 0, null, 'left');
    cell = '(0,0)'; hit = null; res.push(st());
    return res;
  },
  project: (s) => {
    const tp = treeProj(s);
    const g = sceneOfKind(s, 'grid');
    let hit: number | null = null;
    if (g) g.rows.forEach((row, r) => row.forEach((c, k) => { if (c.state === 'compare') hit = r * row.length + k; }));
    return { shape: tp.shape, labels: tp.labels, memo: gridFlat(s), items: auxItems(s), hit, cell: vs(s, 'cell'), calls: vs(s, 'calls'), hits: vs(s, 'cache hits'), plain: vs(s, 'plain calls') };
  },
  notes: 'node colours not checked; "hit" = the memo cell highlighted as a cache hit',
});

add({
  slug: '494-target-sum',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 5), 0, r() < 0.5 ? 2 : 6), target: rint(r, -6, 6) }),
  oracle: ({ nums, target }: { nums: number[]; target: number }) => {
    const n = nums.length;
    const t = new OTree();
    const memo = new Map<string, number>();
    let calls = 0, hits = 0;
    let ci: number | null = null, crem: number | null = null;
    const st = (): State => ({ shape: t.shape(), labels: t.lab(), memo: [...memo.entries()].map(([k, v]) => `(${k}) → ${v}`), i: ci, rem: crem, calls, hits });
    const res: State[] = [st()];
    const run = (i: number, rem: number, parent: number | null, side: 'left' | 'right'): number => {
      const id = t.add(rem, parent, side);
      calls++; ci = i; crem = rem;
      const key = `${i},${rem}`;
      if (i === n) { const v = rem === 0 ? 1 : 0; t.labels[id] = `=${v}`; res.push(st()); return v; }
      if (memo.has(key)) { hits++; t.labels[id] = `hit ${memo.get(key)}`; res.push(st()); return memo.get(key)!; }
      res.push(st());
      const a = run(i + 1, rem - nums[i], id, 'left');
      const b = run(i + 1, rem + nums[i], id, 'right');
      memo.set(key, a + b);
      ci = i; crem = rem; t.labels[id] = `=${a + b}`;
      res.push(st());
      return a + b;
    };
    run(0, target, null, 'left');
    ci = null; crem = null; res.push(st());
    return res;
  },
  project: (s) => {
    const tp = treeProj(s);
    return { shape: tp.shape, labels: tp.labels, memo: auxItems(s, 1), i: vs(s, 'i'), rem: vs(s, 'rem'), calls: vs(s, 'calls'), hits: vs(s, 'cache hits') };
  },
  notes: 'node colours not checked; the closing "knapsack view" narration (subset-sum reduction) is not checked',
});

/* ===================================================================================== game theory */
add({
  slug: '464-can-i-win',
  gen: (r) => { const m = rint(r, 1, r() < 0.3 ? 6 : 5); return { m, total: Math.max(0, rint(r, -1, (m * (m + 1)) / 2 + (r() < 0.2 ? 3 : 0))) }; },
  oracle: ({ m, total }: { m: number; total: number }) => {
    const maskSet = (used: number) => `{${Array.from({ length: m }, (_, i) => i + 1).filter((i) => used & (1 << (i - 1))).join(',') || '∅'}}`;
    const memo = new Map<number, boolean>(); const memoOrder: number[] = [];
    const path: { num: number; by: string }[] = [];
    let mover: Scalar = null, rem: Scalar = null, usedShow: Scalar = '∅', ret: Scalar = null;
    const st = (): State => ({
      path: path.map((p) => `${p.by} takes ${p.num}`),
      taken: Array.from({ length: m }, (_, i) => { const p = path.find((q) => q.num === i + 1); return p ? (p.by === 'A' ? 1 : 2) : 0; }),
      memo: memoOrder.slice(-9).map((u) => `${maskSet(u)} → ${memo.get(u) ? 'win' : 'lose'}`),
      mover, rem, used: usedShow, ret,
    });
    const res: State[] = [st()];
    if (total <= 0 || (m * (m + 1)) / 2 < total) return res;
    const win = (used: number, remaining: number, depth: number): boolean => {
      const who = depth % 2 === 0 ? 'A' : 'B';
      mover = who; rem = remaining; usedShow = maskSet(used);
      if (memo.has(used)) { ret = memo.get(used) ? 'win' : 'lose'; res.push(st()); return memo.get(used)!; }
      ret = '…'; res.push(st());
      for (let i = 1; i <= m; i++) {
        const bit = 1 << (i - 1);
        if (used & bit) continue;
        if (i >= remaining) { memo.set(used, true); memoOrder.push(used); ret = 'win'; res.push(st()); return true; }
        path.push({ num: i, by: who });
        const opp = win(used | bit, remaining - i, depth + 1);
        path.pop();
        mover = who; rem = remaining; usedShow = maskSet(used);
        if (!opp) { memo.set(used, true); memoOrder.push(used); ret = 'win'; res.push(st()); return true; }
      }
      memo.set(used, false); memoOrder.push(used); ret = 'lose'; res.push(st());
      return false;
    };
    const w = win(0, total, 0);
    mover = 'A'; rem = total; usedShow = '∅'; ret = w ? 'win' : 'lose';
    res.push(st());
    return res;
  },
  project: (s) => {
    const a = sceneOfKind(s, 'array');
    return {
      path: auxItems(s, 0), taken: (a?.cells ?? []).map((c) => (c.tone === 'blue' ? 1 : c.tone === 'orange' ? 2 : 0)), memo: auxItems(s, 1),
      mover: vs(s, 'player to move'), rem: vs(s, 'remaining'), used: vs(s, 'used'), ret: vs(s, 'returns'),
    };
  },
  notes: 'cell dimming and the narration text are not checked; the memo list shows only the last 9 entries (as the animation does)',
});

add({
  slug: '486-predict-the-winner',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 7), 0, r() < 0.4 ? 3 : 20) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const n = nums.length;
    const dp: Scalar[][] = Array.from({ length: n }, () => nullArr(n));
    const owner: number[] = Array(n).fill(0);
    let plays: string[] = []; let scores: string[] = [];
    let tl: Scalar = null, tr: Scalar = null, val: Scalar = null;
    let src: number[] = [];
    const st = (i: number | null, j: number | null, pi: number | null, pj: number | null): State => ({
      dp: dp.flatMap((row, a) => row.map((v, b) => (b < a ? null : v))), i, j, tl, tr, val, pi, pj, owner: [...owner], plays: [...plays], scores: [...scores], src: [...src],
    });
    const res: State[] = [st(null, null, null, null)];
    for (let i = 0; i < n; i++) dp[i][i] = nums[i];
    res.push(st(null, null, null, null));
    for (let len = 2; len <= n; len++) for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      const left = nums[i] - (dp[i + 1][j] as number), right = nums[j] - (dp[i][j - 1] as number);
      tl = left; tr = right; dp[i][j] = Math.max(left, right); val = dp[i][j];
      src = [i * n + j - 1, (i + 1) * n + j];
      res.push(st(i, j, i, j));
    }
    src = [];
    // replay of the optimal play (tie between the two equal options: take LEFT)
    let lo = 0, hi = n - 1, turn = 1, s1 = 0, s2 = 0;
    scores = ['Player 1: 0', 'Player 2: 0'];
    while (lo <= hi) {
      const ci = lo, cj = hi;
      let pickLeft = true;
      if (lo < hi) pickLeft = nums[lo] - (dp[lo + 1][hi] as number) >= nums[hi] - (dp[lo][hi - 1] as number);
      const k = pickLeft ? lo : hi;
      owner[k] = turn;
      if (turn === 1) s1 += nums[k]; else s2 += nums[k];
      plays.push(`Player ${turn} takes ${nums[k]} (${pickLeft ? 'left' : 'right'})`);
      scores = [`Player 1: ${s1}`, `Player 2: ${s2}`];
      if (pickLeft) lo++; else hi--;
      res.push(st(ci, cj, lo <= hi ? lo : null, lo <= hi && hi !== lo ? hi : null));
      turn = turn === 1 ? 2 : 1;
    }
    res.push(st(0, n - 1, null, null));
    return res;
  },
  project: (s) => {
    const a = sceneOfKind(s, 'array');
    const play = s.aux?.[0]?.title === 'optimal play so far';
    return {
      dp: gridFlat(s), i: vs(s, 'i'), j: vs(s, 'j'), tl: vs(s, 'take left'), tr: vs(s, 'take right'), val: vs(s, 'dp[i][j]'), pi: ptr(s, 'i'), pj: ptr(s, 'j'),
      owner: (a?.cells ?? []).map((c) => (c.tone === 'blue' ? 1 : c.tone === 'orange' ? 2 : 0)),
      plays: play ? auxItems(s, 0) : [], scores: play ? auxItems(s, 1) : [], src: cmpIdx(s),
    };
  },
  notes: 'DESIGN: the replay of optimal play (an extra pedagogical phase) takes the LEFT pile when both options are equal; the oracle follows that documented tie rule. Cell colours other than the taken-by-player tint are not checked.',
});

add({
  slug: '1406-stone-game-iii',
  gen: (r) => ({ stones: rarr(r, rint(r, 1, 8), -9, r() < 0.3 ? 2 : 9) }),
  oracle: ({ stones }: { stones: number[] }) => {
    const n = stones.length;
    const dp: Scalar[] = nullArr(n + 1);
    const owner: number[] = Array(n).fill(0);
    let plays: string[] = []; let scores: string[] = [];
    let takeV: Scalar = null, cand: Scalar = null;
    let src: number[] = []; let act: number[] = [];
    const st = (i: number | null, k: number | null): State => ({ dp: [...dp], i, k, take: takeV, cand, owner: [...owner], plays: [...plays], scores: [...scores], src: [...src], act: [...act] });
    const res: State[] = [st(null, null)];
    dp[n] = 0; res.push(st(n, null));
    for (let i = n - 1; i >= 0; i--) {
      let take = 0, best = -Infinity;
      for (let k = 1; k <= 3 && i + k <= n; k++) {
        take += stones[i + k - 1];
        const c = take - (dp[i + k] as number);
        takeV = take; cand = c;
        if (c > best) best = c;
        dp[i] = best;
        src = [i + k]; act = Array.from({ length: k }, (_, q2) => i + q2);   // dp[i+k] is read; the k stones taken are lit
        res.push(st(i, k));
      }
    }
    src = []; act = [];
    // replay (tie between equal options: take the SMALLEST k)
    let i = 0, turn = 1, sa = 0, sb = 0;
    scores = ['Alice: 0', 'Bob: 0'];
    while (i < n) {
      let take = 0, bestK = 1, best = -Infinity;
      for (let k = 1; k <= 3 && i + k <= n; k++) { take += stones[i + k - 1]; if (take - (dp[i + k] as number) > best) { best = take - (dp[i + k] as number); bestK = k; } }
      let got = 0;
      for (let q2 = 0; q2 < bestK; q2++) { owner[i + q2] = turn; got += stones[i + q2]; }
      if (turn === 1) sa += got; else sb += got;
      plays.push(`${turn === 1 ? 'Alice' : 'Bob'} takes ${bestK} (${got})`);
      scores = [`Alice: ${sa}`, `Bob: ${sb}`];
      i += bestK;
      res.push(st(Math.min(i, n), null));
      turn = turn === 1 ? 2 : 1;
    }
    return res;
  },
  project: (s) => {
    const g = sceneOfKind(s, 'grid');
    const play = s.aux?.[0]?.title === 'optimal play';
    return {
      dp: gridFlat(s, [1]), i: vs(s, 'i'), k: vs(s, 'k'), take: vs(s, 'take (sum)'), cand: vs(s, 'take − dp[i+k]'),
      owner: (g?.rows[0] ?? []).slice(0, -1).map((c) => (c.tone === 'blue' ? 1 : c.tone === 'orange' ? 2 : 0)),
      plays: play ? auxItems(s, 0) : [], scores: play ? auxItems(s, 1) : [],
      src: cmpIdx(s, [1]), act: (g?.rows[0] ?? []).slice(0, -1).flatMap((c, i) => (c.state === 'active' ? [i] : [])),
    };
  },
  notes: 'DESIGN: the replay (extra pedagogical phase) takes the smallest k among equal options (strict >); colours other than the taken-by-player tint not checked; "options" aux text not checked',
});

/* ===================================================================================== interval DP: tables over (l, r) */
const upper = (dp: Scalar[][]): Scalar[] => dp.flatMap((row, a) => row.map((v, b) => (b <= a ? null : v)));
add({
  slug: '312-burst-balloons',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 7), 0, r() < 0.3 ? 3 : 9) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const vals = [1, ...nums, 1]; const N = vals.length;
    const dp: Scalar[][] = Array.from({ length: N }, () => nullArr(N));
    let cand: Scalar = null, cur: Scalar = null;
    let src: number[] = [];
    // the balloon row: inside the gap (l, r) the balloons are active, the last-popped k is 'swap', the walls l and r are 'compare'
    const rowOf = (l: number | null, r: number | null, k: number | null) => {
      const act: number[] = [], swp: number[] = [], cmp: number[] = [];
      if (l !== null && r !== null) for (let x = 0; x < N; x++) { if (x > l && x < r) (x === k ? swp : act).push(x); else if (x === l || x === r) cmp.push(x); }
      return { act, swp, cmp };
    };
    const st = (l: number | null, r: number | null, k: number | null, nt: number): State => ({ dp: upper(dp), l, r, k, coins: cand, cur, tries: nt, src: [...src], rowAct: rowOf(l, r, k).act, rowSwap: rowOf(l, r, k).swp, rowCmp: rowOf(l, r, k).cmp });
    const res: State[] = [st(null, null, null, 0)];
    for (let l = 0; l + 1 < N; l++) dp[l][l + 1] = 0;
    res.push(st(null, null, null, 0));
    for (let len = 2; len <= N - 1; len++) for (let l = 0; l + len <= N - 1; l++) {
      const r = l + len; let best = 0; let nt = 0;
      for (let k = l + 1; k < r; k++) {
        const c = (dp[l][k] as number) + (dp[k][r] as number) + vals[l] * vals[k] * vals[r];
        best = Math.max(best, c); dp[l][r] = best; cand = c; cur = best; nt++;
        src = [l * N + k, k * N + r];
        res.push(st(l, r, k, nt));
      }
    }
    cur = dp[0][N - 1]; src = [];
    res.push(st(0, N - 1, null, (res[res.length - 1].tries as number)));
    return res;
  },
  project: (s) => ({ dp: gridFlat(s), l: vs(s, 'l'), r: vs(s, 'r'), k: vs(s, 'k'), coins: vs(s, 'coins'), cur: vs(s, 'dp[l][r]'), tries: auxItems(s, 0).length, src: cmpIdx(s), rowAct: arrStates(s, 'active'), rowSwap: arrStates(s, 'swap'), rowCmp: arrStates(s, 'compare') }),
  notes: 'candidate list is compared by length only (text not checked); array/table colours not checked',
});

add({
  slug: '664-strange-printer',
  gen: (r) => ({ s: rstr(r, rint(r, 1, 9), r() < 0.5 ? 'ab' : 'abc') }),
  oracle: ({ s: raw }: { s: string }) => {
    const s = [...raw].filter((c, i) => i === 0 || c !== raw[i - 1]).join('');
    const n = s.length;
    const dp: Scalar[][] = Array.from({ length: n }, () => nullArr(n));
    let cand: Scalar = null, cur: Scalar = null;
    let src: number[] = [];
    // the letter row: the stretch i..j is active, i and the shared-stroke partner k are 'swap'
    const rowOf = (i: number | null, j: number | null, k: number | null) => {
      const act: number[] = [], swp: number[] = [];
      if (i !== null && j !== null) for (let x = i; x <= j; x++) (x === i || x === k ? swp : act).push(x);
      return { act, swp };
    };
    const st = (i: number | null, j: number | null, k: number | null, nt: number): State => ({ letters: s.split(''), dp: dp.flatMap((row, a) => row.map((v, b) => (b < a ? null : v))), i, j, k, cand, cur, tries: nt, src: [...src], rowAct: rowOf(i, j, k).act, rowSwap: rowOf(i, j, k).swp });
    const res: State[] = [st(null, null, null, 0)];
    for (let i = 0; i < n; i++) dp[i][i] = 1;
    res.push(st(null, null, null, 0));
    for (let len = 2; len <= n; len++) for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      let best = (dp[i + 1][j] as number) + 1; let nt = 1;
      dp[i][j] = best; cand = best; cur = best;
      src = [(i + 1) * n + j];
      res.push(st(i, j, null, nt));
      for (let k = i + 1; k <= j; k++) {
        if (s[k] !== s[i]) continue;
        const inside = k - 1 >= i + 1 ? (dp[i + 1][k - 1] as number) : 0;
        const c = inside + (dp[k][j] as number);
        best = Math.min(best, c); dp[i][j] = best; cand = c; cur = best; nt++;
        src = [...new Set([(i + 1) * n + j, ...(k - 1 >= i + 1 ? [(i + 1) * n + k - 1] : []), k * n + j])].sort((x, y) => x - y);
        res.push(st(i, j, k, nt));
      }
    }
    src = [];
    res.push(st(0, n - 1, null, (res[res.length - 1].tries as number)));
    cur = dp[0][n - 1]; res[res.length - 1].cur = cur;
    return res;
  },
  project: (s) => ({ letters: cellValues(s), dp: gridFlat(s), i: vs(s, 'i'), j: vs(s, 'j'), k: vs(s, 'k'), cand: vs(s, 'cand'), cur: vs(s, 'dp[i][j]'), tries: auxItems(s, 0).length, src: cmpIdx(s), rowAct: arrStates(s, 'active'), rowSwap: arrStates(s, 'swap') }),
  notes: 'candidate list compared by length only; other colours not checked. Adjacent equal letters are squashed first (the shown letters row is compared)',
});

add({
  slug: 'gfg-matrix-chain-multiplication',
  gen: (r) => ({ dims: rarr(r, rint(r, 3, 7), 1, r() < 0.3 ? 4 : 50) }),
  oracle: ({ dims }: { dims: number[] }) => {
    const n = dims.length - 1;
    const dp: Scalar[][] = Array.from({ length: n }, () => nullArr(n));
    let cand: Scalar = null, cur: Scalar = null;
    let src: number[] = [];
    // the matrix chain row: while a split k is tried, the chain i..j is active, the left part i..k blue and the right part k+1..j orange
    const rng2 = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, q2) => a + q2);
    const st = (i: number | null, j: number | null, k: number | null): State => ({
      dp: upper2(dp), i, j, k, cost: cand, cur, src: [...src],
      chAct: i !== null && j !== null && k !== null ? rng2(i, j) : [], chBlue: i !== null && k !== null ? rng2(i, k) : [], chOrange: i !== null && j !== null && k !== null ? rng2(k + 1, j) : [],
    });
    const res: State[] = [st(null, null, null)];
    for (let i = 0; i < n; i++) dp[i][i] = 0;
    res.push(st(null, null, null));
    for (let len = 2; len <= n; len++) for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1; let best = Infinity;
      for (let k = i; k < j; k++) {
        const c = (dp[i][k] as number) + (dp[k + 1][j] as number) + dims[i] * dims[k + 1] * dims[j + 1];
        best = Math.min(best, c); dp[i][j] = best; cand = c; cur = best;
        src = [i * n + k, (k + 1) * n + j];
        res.push(st(i, j, k));
      }
    }
    cur = dp[0][n - 1]; src = [];
    res.push(st(0, n - 1, null));
    return res;
  },
  project: (s) => ({ dp: gridFlat(s), i: vs(s, 'i'), j: vs(s, 'j'), k: vs(s, 'k'), cost: vs(s, 'cost'), cur: vs(s, 'dp[i][j]'), src: cmpIdx(s),
    chAct: arrStates(s, 'active'), chBlue: (sceneOfKind(s, 'array')?.cells ?? []).flatMap((c, q2) => (c.tone === 'blue' ? [q2] : [])), chOrange: (sceneOfKind(s, 'array')?.cells ?? []).flatMap((c, q2) => (c.tone === 'orange' ? [q2] : [])) }),
  invariants: [
    // the bracketing shown at the end must cost exactly dp[0][n-1]
    (step, idx, steps, { dims }: { dims: number[] }) => {
      if (idx !== steps.length - 1) return null;
      const paren = String(step.aux?.[0]?.items?.[0] ?? '');
      const toks = paren.match(/A\d+|\(|\)/g) ?? [];
      let p = 0; let cost = 0;
      const parse = (): { r: number; c: number } => {
        if (toks[p] === '(') { p++; const a = parse(); const b = parse(); p++; cost += a.r * a.c * b.c; return { r: a.r, c: b.c }; }
        const id = Number(toks[p++].slice(1)) - 1; return { r: dims[id], c: dims[id + 1] };
      };
      parse();
      const g = gridFlat(step); const n = dims.length - 1; const best = g[0 * n + (n - 1)];
      return cost === best ? null : `bracketing ${paren} costs ${cost}, table says dp[0][n-1] = ${best}`;
    },
  ],
  notes: 'candidate list not checked; the printed bracketing is checked to be valid and optimal (cost equals dp[0][n-1]), not against a specific tie-break',
});
function upper2(dp: Scalar[][]): Scalar[] { return dp.flatMap((row, a) => row.map((v, b) => (b < a ? null : v))); }

/* ===================================================================================== Catalan family */
add({
  slug: 'cp-triangulate-a-convex-polygon',
  gen: (r) => ({ n: rint(r, 3, 9) }),
  oracle: ({ n }: { n: number }) => {
    const ways: Scalar[] = nullArr(n + 1);
    let sum: Scalar = null;
    // src = the two sub-polygon cells read (drawn yellow), actE = the two triangle edges drawn active, base = the edge (0, v-1) drawn chosen
    const st = (v: number | null, apex: number | null, wl: Scalar, wr: Scalar, tri: number[]): State => ({
      ways: ways.slice(2), v, apex, wl, wr, sum, tri,
      src: apex === null ? [] : [...new Set([apex + 1 - 2, (v as number) - apex - 2])].sort((a, b) => a - b), // sizes (apex+1) and (v-apex) → cells size-2
      actE: apex === null || v === null ? [] : [...new Set([`0-${apex}`, `${apex}-${v - 1}`])].sort(),
      base: v !== null && v >= 3 ? [`0-${v - 1}`] : [],
    });
    const res: State[] = [st(null, null, null, null, [])];
    ways[2] = 1; res.push(st(2, null, null, null, []));
    for (let size = 3; size <= n; size++) {
      ways[size] = 0;
      for (let k = 1; k <= size - 2; k++) {
        ways[size] = (ways[size] as number) + (ways[k + 1] as number) * (ways[size - k] as number);
        sum = ways[size];
        res.push(st(size, k, ways[k + 1], ways[size - k], [...new Set([0, k, size - 1])].sort((a, b) => a - b)));
      }
      res.push(st(size, null, null, null, []));
    }
    res.push(st(n, null, null, null, []));
    return res;
  },
  project: (s) => {
    const g = sceneOfKind(s, 'graph');
    const ek = (e: { from: number; to: number }) => `${Math.min(e.from, e.to)}-${Math.max(e.from, e.to)}`;
    return {
      ways: gridFlat(s), v: vs(s, 'v'), apex: vs(s, 'apex'), wl: vs(s, 'ways[left]'), wr: vs(s, 'ways[right]'), sum: vs(s, 'sum'),
      tri: (g?.nodes ?? []).filter((nd) => nd.state === 'active').map((nd) => nd.id),
      src: cmpIdx(s),
      actE: (g?.edges ?? []).filter((e) => e.state === 'active').map(ek).sort(),
      base: (g?.edges ?? []).filter((e) => e.state === 'chosen').map(ek).sort(),
    };
  },
  notes: 'tri = the polygon corners highlighted as the chosen triangle (active nodes); src = the two sub-polygon cells read, actE / base = active triangle edges and the chosen base edge; other node/edge colours and the term list text are not checked',
});

add({
  slug: '96-unique-binary-search-trees',
  gen: (r) => ({ n: rint(r, 1, 10) }),
  oracle: ({ n }: { n: number }) => {
    const dp: Scalar[] = nullArr(n + 1);
    let sum: Scalar = null;
    let src: number[] = [];
    const st = (nodes: number | null, root: number | null, wl: Scalar, wr: Scalar): State => ({ dp: [...dp], nodes, root, wl, wr, sum, src: [...src] });
    const res: State[] = [st(null, null, null, null)];
    dp[0] = 1; dp[1] = 1; res.push(st(1, null, null, null));
    for (let m = 2; m <= n; m++) {
      dp[m] = 0;
      for (let j = 1; j <= m; j++) {
        dp[m] = (dp[m] as number) + (dp[j - 1] as number) * (dp[m - j] as number);
        sum = dp[m];
        src = [...new Set([j - 1, m - j])].sort((a, b) => a - b);
        res.push(st(m, j, dp[j - 1], dp[m - j]));
      }
      src = [];
      res.push(st(m, null, null, null));
    }
    res.push(st(n, null, null, null));
    return res;
  },
  project: (s) => ({ dp: gridFlat(s), nodes: vs(s, 'nodes'), root: vs(s, 'root'), wl: vs(s, 'dp[root-1]'), wr: vs(s, 'dp[nodes-root]'), sum: vs(s, 'sum'), src: cmpIdx(s) }),
  notes: 'colours and the term list text not checked',
});

add({
  slug: 'cp-count-valid-parentheses-sequences',
  gen: (r) => ({ n: rint(r, 1, 8) }),
  oracle: ({ n }: { n: number }) => {
    const dp: Scalar[][] = Array.from({ length: n + 1 }, () => nullArr(n + 1));
    const diag: string[] = [];
    let fo: Scalar = null, fc: Scalar = null;
    let src: number[] = [];
    const st = (i: number | null, j: number | null): State => ({ dp: dp.flatMap((row, a) => row.map((v, b) => (b > a ? null : v))), i, j, fo, fc, diag: [...diag], src: [...src] });
    const res: State[] = [st(null, null)];
    dp[0][0] = 1; diag.push('dp[0][0] = 1'); res.push(st(0, 0));
    for (let i = 0; i <= n; i++) for (let j = 0; j <= i; j++) {
      if (i === 0 && j === 0) continue;
      const a = i > 0 && j < i ? (dp[i - 1][j] as number) : 0;
      const b = j > 0 ? (dp[i][j - 1] as number) : 0;
      fo = i > 0 && j < i ? a : null; fc = j > 0 ? b : null;
      dp[i][j] = a + b;
      if (i === j) diag.push(`dp[${i}][${i}] = ${a + b}`);
      src = [...(i > 0 && j < i ? [(i - 1) * (n + 1) + j] : []), ...(j > 0 ? [i * (n + 1) + j - 1] : [])].sort((x, y) => x - y);
      res.push(st(i, j));
    }
    src = [];
    res.push(st(n, n));
    return res;
  },
  project: (s) => ({ dp: gridFlat(s), i: vs(s, 'i'), j: vs(s, 'j'), fo: vs(s, 'from "("'), fc: vs(s, 'from ")"'), diag: auxItems(s, 0), src: cmpIdx(s) }),
  notes: 'colours not checked; cells above the diagonal (j > i, shown ×) are impossible states and treated as empty',
});

/* ===================================================================================== stock state machines (188 / 309 / 714) */
type StockRow = { name: string; init: (p0: number) => number; from: number[]; step: (prev: number[], p: number) => { v: number; moved: boolean } };
function stockOracle(prices: number[], rows: StockRow[], answer: (last: number[]) => number) {
  const D = prices.length, R = rows.length;
  const tab: Scalar[][] = rows.map(() => nullArr(D));
  const mv: number[][] = rows.map(() => Array(D).fill(0));
  let src: number[] = [];
  const st = (cur: [number, number] | null, ans: Scalar): State => ({
    tab: tab.flat(), moved: mv.flat(), src: [...src],
    day: cur ? cur[1] : null, price: cur ? prices[cur[1]] : null, state: cur ? rows[cur[0]].name : null,
    value: cur && tab[cur[0]][cur[1]] !== null ? tab[cur[0]][cur[1]] : null, ans,
  });
  const res: State[] = [st(null, null)];
  rows.forEach((rw, r) => { tab[r][0] = rw.init(prices[0]); });
  res.push(st([0, 0], null));
  for (let d = 1; d < D; d++) {
    const prev = rows.map((_, r) => tab[r][d - 1] as number);
    for (let r = 0; r < R; r++) {
      const { v, moved } = rows[r].step(prev, prices[d]);
      tab[r][d] = v; mv[r][d] = moved ? 1 : 0;
      src = rows[r].from.map((f) => f * D + d - 1).sort((a, b) => a - b);   // yesterday's cells this state reads
      res.push(st([r, d], null));
    }
  }
  src = [];
  res.push(st(null, answer(rows.map((_, r) => tab[r][D - 1] as number))));
  return res;
}
const stockProject = (s: Step): State => ({
  tab: gridFlat(s), moved: toneFlags(s, 'green'), src: cmpIdx(s), day: vs(s, 'day'), price: vs(s, 'price'), state: vs(s, 'state'), value: vs(s, 'value'),
  ans: s.result ? Number(s.result.title) : null,
});
const genPrices = (r: () => number) => rarr(r, rint(r, 2, 8), 0, r() < 0.3 ? 4 : 30);

add({
  slug: '188-best-time-to-buy-and-sell-stock-iv',
  gen: (r) => ({ k: rint(r, 1, 3), prices: genPrices(r) }),
  oracle: ({ k, prices }: { k: number; prices: number[] }) => {
    const rows: StockRow[] = [];
    for (let j = 1; j <= k; j++) {
      const b = 2 * (j - 1), s = b + 1;
      rows.push({ name: `buy ${j}`, init: (p0) => -p0, from: j === 1 ? [b] : [b, s - 2], step: (prev, p) => { const start = (j === 1 ? 0 : prev[s - 2]) - p; return { v: Math.max(prev[b], start), moved: start > prev[b] }; } });
      rows.push({ name: `sell ${j}`, init: () => 0, from: [s, b], step: (prev, p) => { const fin = prev[b] + p; return { v: Math.max(prev[s], fin), moved: fin > prev[s] }; } });
    }
    // answer = best finished profit over ALL "sell j" rows (at most k trades), not only the last row
    return stockOracle(prices, rows, (last) => Math.max(...last.filter((_, i) => i % 2 === 1)));
  },
  project: stockProject,
  notes: 'cell colours other than the green "transition fired" tint not checked',
});

add({
  slug: '309-best-time-to-buy-and-sell-stock-with-cooldown',
  gen: (r) => ({ prices: genPrices(r) }),
  oracle: ({ prices }: { prices: number[] }) => stockOracle(prices, [
    { name: 'hold', init: (p0) => -p0, from: [0, 2], step: (prev, p) => { const buy = prev[2] - p; return { v: Math.max(prev[0], buy), moved: buy > prev[0] }; } },
    { name: 'sold (cooldown next)', init: () => 0, from: [0], step: (prev, p) => ({ v: prev[0] + p, moved: true }) },
    { name: 'rest', init: () => 0, from: [1, 2], step: (prev) => ({ v: Math.max(prev[2], prev[1]), moved: prev[1] > prev[2] }) },
  ], (last) => Math.max(last[1], last[2])),
  project: stockProject,
  notes: 'cell colours other than the green "transition fired" tint not checked',
});

add({
  slug: '714-best-time-to-buy-and-sell-stock-with-transaction-fee',
  gen: (r) => ({ prices: genPrices(r), fee: rint(r, 0, 10) }),
  oracle: ({ prices, fee }: { prices: number[]; fee: number }) => stockOracle(prices, [
    { name: 'cash (no stock)', init: () => 0, from: [0, 1], step: (prev, p) => { const sell = prev[1] + p - fee; return { v: Math.max(prev[0], sell), moved: sell > prev[0] }; } },
    { name: 'hold (own a stock)', init: (p0) => -p0, from: [0, 1], step: (prev, p) => { const buy = prev[0] - p; return { v: Math.max(prev[1], buy), moved: buy > prev[1] }; } },
  ], (last) => last[0]),
  project: stockProject,
  notes: 'cell colours other than the green "transition fired" tint not checked',
});

/* ===================================================================================== 918 circular Kadane */
add({
  slug: '918-maximum-sum-circular-subarray',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 10), -20, r() < 0.25 ? -1 : 20) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const res: State[] = [{ x: null, cm: null, cn: null, total: 0 }];
    let total = 0, curMax = 0, curMin = 0, best = nums[0], worst = nums[0];
    nums.forEach((v, x) => {
      total += v;
      curMax = x === 0 ? v : Math.max(curMax + v, v); best = x === 0 ? curMax : Math.max(best, curMax);
      curMin = x === 0 ? v : Math.min(curMin + v, v); worst = x === 0 ? curMin : Math.min(worst, curMin);
      res.push({ x: v, cm: `${curMax} / ${best}`, cn: `${curMin} / ${worst}`, total });
    });
    res.push({ x: null, cm: null, cn: null, total });
    return res;
  },
  project: (s) => ({ x: vs(s, 'x'), cm: vs(s, 'curMax / best'), cn: vs(s, 'curMin / worst'), total: vs(s, 'total') }),
  invariants: [
    // the green (found) cells must always be the best slice so far / the final answer slice; compare with brute force at the end
    (step, idx, steps, { nums }: { nums: number[] }) => {
      const cells = sceneOfKind(step, 'array')?.cells ?? [];
      const foundSum = cells.filter((c) => c.state === 'found').reduce((a, c) => a + Number(c.value), 0);
      if (idx === steps.length - 1) {
        const n = nums.length; let brute = -Infinity;
        for (let s0 = 0; s0 < n; s0++) { let sm = 0; for (let l = 0; l < n; l++) { sm += nums[(s0 + l) % n]; brute = Math.max(brute, sm); } }
        if (Number(step.result?.title) !== brute) return `answer ${step.result?.title} != brute force ${brute}`;
        return foundSum === brute ? null : `highlighted slice sums to ${foundSum}, expected ${brute}`;
      }
      const cm = String(step.vars['curMax / best'] ?? '');
      if (cm.includes('/') && steps[idx].title.startsWith('i =')) {
        const best = Number(cm.split('/')[1]);
        // the element being read is drawn 'active' (it wins over green), so it may be part of the green slice without being green
        const act = cells.filter((c) => c.state === 'active').reduce((a, c) => a + Number(c.value), 0);
        if (foundSum !== best && foundSum + act !== best) return `green cells sum ${foundSum} (+ active ${act}) != best ${best}`;
      }
      return null;
    },
  ],
  notes: 'the red (worst slice) cells are not checked; the green slice is checked by its sum (best so far) at every scan step and against a brute-force circular maximum at the end',
});

/* ===================================================================================== digit DP */
const permN = (a: number, b: number): number => { let p = 1; for (let i = 0; i < b; i++) p *= a - i; return p; };
const sortedUsed = (u: Set<number>): Scalar => (u.size ? [...u].sort((a, b) => a - b).join('') : '∅');
const arrStates = (s: Step, state: string): number[] => (sceneOfKind(s, 'array')?.cells ?? []).flatMap((c, i) => (c.state === state ? [i] : []));

add({
  slug: '2376-count-special-integers',
  gen: (r) => {
    const x = r();
    if (x < 0.2) return { n: rint(r, 1, 99) };
    if (x < 0.4) { const d = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => r() - 0.5).slice(0, rint(r, 1, 6)); if (d[0] === 0) d[0] = 7; return { n: Number(d.join('')) }; }
    return { n: rint(r, 1, 999999) };
  },
  oracle: ({ n }: { n: number }) => {
    const s = String(n), L = s.length;
    const row: Scalar[][] = [nullArr(L), nullArr(L), nullArr(L), nullArr(L)];
    const used = new Set<number>(); let count = 0; let pos: number | null = null; let status = 'tight'; let notes: string[] = [];
    const st = (): State => ({ table: row.flat(), usedCells: [...used].sort((a, b) => a - b), position: pos, status, used: sortedUsed(used), count, notes: [...notes] });
    const res: State[] = [st()];
    for (let len = 1; len < L; len++) { const add2 = 9 * permN(9, len - 1); count += add2; notes.push(`${len}-digit: 9 × P(9,${len - 1}) = ${add2}`); }
    if (L > 1) res.push(st());
    let tightOn = true;
    for (let i = 0; i < L && tightOn; i++) {
      pos = i; const c = Number(s[i]);
      let choices = 0;
      for (let x = i === 0 ? 1 : 0; x < c; x++) if (!used.has(x)) choices++;
      const rest = permN(9 - i, L - i - 1), add2 = choices * rest;
      count += add2; row[0][i] = c; row[1][i] = choices; row[2][i] = rest; row[3][i] = add2;
      notes.push(`position ${i}: ${choices} × ${rest} = ${add2}`);
      const dup = used.has(c);
      status = dup ? 'repeat — stop' : 'tight';
      res.push(st());
      if (dup) tightOn = false; else used.add(c);
    }
    if (tightOn) { count++; notes.push('N itself: +1'); }
    res.push(st());
    return res;
  },
  project: (s) => ({
    table: gridFlat(s), usedCells: arrStates(s, 'sorted'), position: vs(s, 'position'), status: vs(s, 'state'), used: vs(s, 'used digits'), count: vs(s, 'count'), notes: auxItems(s, 0),
  }),
  invariants: [
    (step, idx, steps, { n }: { n: number }) => {
      if (idx !== steps.length - 1) return null;
      let brute = 0;
      for (let v = 1; v <= n; v++) { const t = String(v); if (new Set(t).size === t.length) brute++; }
      return Number(step.result?.title) === brute ? null : `answer ${step.result?.title} != brute force ${brute}`;
    },
  ],
  notes: 'colours other than the used-digit (sorted) cells not checked; the final answer is also checked against brute force',
});

add({
  slug: '902-numbers-at-most-n-given-digit-set',
  gen: (r) => {
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(() => r() < 0.4);
    if (!digits.length) digits.push(rint(r, 1, 9));
    const x = r();
    const n = x < 0.2 ? rint(r, 1, 99) : x < 0.5 ? Number(Array.from({ length: rint(r, 1, 6) }, () => digits[rint(r, 0, digits.length - 1)]).join('')) : rint(r, 1, 999999);
    return { digits, n };
  },
  oracle: ({ digits, n }: { digits: number[]; n: number }) => {
    const s = String(n), L = s.length, d = digits.length;
    const row: Scalar[][] = [nullArr(L), nullArr(L), nullArr(L), nullArr(L)];
    let count = 0, pos: number | null = null, tight = 'yes'; const notes: string[] = [];
    const st = (): State => ({ table: row.flat(), position: pos, tight, count, notes: [...notes] });
    const res: State[] = [st()];
    for (let len = 1; len < L; len++) { const a = d ** len; count += a; notes.push(`${len}-digit numbers: ${d}^${len} = ${a}`); }
    if (L > 1) res.push(st());
    let tightOn = true;
    for (let i = 0; i < L && tightOn; i++) {
      pos = i; const c = Number(s[i]);
      const smaller = digits.filter((x) => x < c).length, rest = d ** (L - i - 1), a = smaller * rest;
      count += a; row[0][i] = c; row[1][i] = smaller; row[2][i] = rest; row[3][i] = a;
      const has = digits.includes(c);
      notes.push(`position ${i}: ${smaller} × ${d}^${L - i - 1} = ${a}`);
      tight = has ? 'yes' : 'no (broken)';
      res.push(st());
      tightOn = has;
    }
    if (tightOn) { count++; notes.push('N itself: +1'); }
    tight = tightOn ? 'yes' : 'no (broken)';
    res.push(st());
    return res;
  },
  project: (s) => ({ table: gridFlat(s), position: vs(s, 'position'), tight: vs(s, 'tight'), count: vs(s, 'count'), notes: auxItems(s, 0) }),
  invariants: [
    (step, idx, steps, { digits, n }: { digits: number[]; n: number }) => {
      if (idx !== steps.length - 1) return null;
      let brute = 0;
      for (let v = 1; v <= n; v++) if ([...String(v)].every((ch) => digits.includes(Number(ch)))) brute++;
      return Number(step.result?.title) === brute ? null : `answer ${step.result?.title} != brute force ${brute}`;
    },
  ],
  notes: 'colours not checked; the final answer is also checked against brute force',
});

add({
  slug: 'cp-count-numbers-with-digit-sum',
  gen: (r) => ({ n: r() < 0.3 ? rint(r, 1, 120) : rint(r, 1, 99999), target: rint(r, 1, r() < 0.5 ? 9 : 15) }),
  oracle: ({ n, target: S }: { n: number; target: number }) => {
    const s = String(n), L = s.length;
    const free: Scalar[][] = Array.from({ length: L }, () => nullArr(S + 1));
    let count = 0; let position: number | null = null; let prefix: number | null = null; let notes: string[] = []; let used: number[] = [];
    const st = (): State => ({ free: free.flat(), position, prefix, count, notes: [...notes], used: [...used].sort((a, b) => a - b) });
    const res: State[] = [st()];
    for (let t = 0; t <= S; t++) free[0][t] = t === 0 ? 1 : 0;
    res.push(st());
    for (let r = 1; r < L; r++) for (let t = 0; t <= S; t++) {
      let v = 0; const terms: string[] = [];
      for (let g = 0; g <= 9 && g <= t; g++) { const f = free[r - 1][t - g] as number; v += f; if (f > 0) terms.push(`first digit ${g}: free[${r - 1}][${t - g}] = ${f}`); }
      free[r][t] = v; notes = terms;
      res.push(st());
    }
    notes = []; prefix = 0;
    res.push(st());
    let p = 0; let broke = false;
    for (let i = 0; i < L; i++) {
      const c = Number(s[i]); position = i; used = []; const terms: string[] = []; let add2 = 0;
      for (let g = 0; g < c; g++) {
        const need = S - p - g;
        if (need >= 0) { const f = free[L - 1 - i][need] as number; add2 += f; used.push((L - 1 - i) * (S + 1) + need); terms.push(`digit ${g}: free[${L - 1 - i}][${need}] = ${f}`); }
        else terms.push(`digit ${g}: needs sum ${need} < 0, skip`);
      }
      count += add2; notes = terms; prefix = p;
      res.push(st());
      p += c; prefix = p;
      if (p > S) { broke = true; used = []; res.push(st()); break; }
    }
    used = [];
    if (!broke && p === S) count++;
    res.push(st());
    return res;
  },
  project: (s) => {
    const g = sceneOfKind(s, 'grid');
    const pos = vs(s, 'position');
    const usedIdx: number[] = [];
    if (g && pos !== null) g.rows.forEach((row, r) => row.forEach((c, k) => { if (c.state === 'found') usedIdx.push(r * row.length + k); }));
    return { free: gridFlat(s), position: pos, prefix: vs(s, 'prefix'), count: vs(s, 'count'), notes: auxItems(s, 0), used: usedIdx };
  },
  invariants: [
    (step, idx, steps, { n, target }: { n: number; target: number }) => {
      if (idx !== steps.length - 1) return null;
      let brute = 0;
      for (let v = 0; v <= n; v++) if ([...String(v)].reduce((a, ch) => a + Number(ch), 0) === target) brute++;
      return Number(step.result?.title) === brute ? null : `answer ${step.result?.title} != brute force ${brute}`;
    },
  ],
  notes: 'colours other than the "terms used" (found) cells during the walk not checked; the final answer is also checked against brute force',
});

/* ===================================================================================== LIS family */
add({
  slug: '673-number-of-longest-increasing-subsequence',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 8), -5, r() < 0.4 ? 1 : 12) }),
  oracle: ({ nums }: { nums: number[] }) => {
    const n = nums.length;
    const len: Scalar[] = nullArr(n), cnt: Scalar[] = nullArr(n);
    let best: Scalar = null;
    let win: number[] = [];
    const st = (i: number | null, j: number | null, cand: Scalar, ans: Scalar = null): State => ({ len: [...len], cnt: [...cnt], i, j, cand, best, ans, win: [...win] });
    const res: State[] = [st(null, null, null)];
    let result = 0, bestLen = 0;
    for (let x = 0; x < n; x++) {
      len[x] = 1; cnt[x] = 1; res.push(st(x, null, null));
      for (let y = 0; y < x; y++) {
        if (nums[y] >= nums[x]) continue;
        const cand = (len[y] as number) + 1;
        if (cand > (len[x] as number)) { len[x] = cand; cnt[x] = cnt[y]; }
        else if (cand === len[x]) cnt[x] = (cnt[x] as number) + (cnt[y] as number);
        res.push(st(x, y, cand));
      }
      if ((len[x] as number) > bestLen) { bestLen = len[x] as number; result = cnt[x] as number; }
      else if (len[x] === bestLen) result += cnt[x] as number;
      best = bestLen;
      res.push(st(x, null, null));
    }
    win = Array.from({ length: n }, (_, q2) => q2).filter((q2) => len[q2] === bestLen);   // the end positions of the longest chains turn green at the end
    res.push(st(null, null, null, result));
    return res;
  },
  project: (s) => ({
    len: gridFlat(s, [1]), cnt: gridFlat(s, [2]), i: vs(s, 'i'), j: vs(s, 'j'), cand: vs(s, 'len[j]+1'), best: vs(s, 'best'), ans: s.result ? Number(s.result.title) : null,
    win: (sceneOfKind(s, 'grid')?.rows[1] ?? []).flatMap((c, q2) => (c.state === 'found' ? [q2] : [])),
  }),
  invariants: [
    // brute force: count the longest strictly increasing subsequences by enumeration
    (step, idx, steps, { nums }: { nums: number[] }) => {
      if (idx !== steps.length - 1) return null;
      const n = nums.length; let bl = 0, bc = 0;
      for (let m = 1; m < 1 << n; m++) {
        const sub: number[] = []; for (let i = 0; i < n; i++) if (m & (1 << i)) sub.push(nums[i]);
        if (!sub.every((v, k) => k === 0 || v > sub[k - 1])) continue;
        if (sub.length > bl) { bl = sub.length; bc = 1; } else if (sub.length === bl) bc++;
      }
      return Number(step.result?.title) === bc ? null : `answer ${step.result?.title} != brute force ${bc}`;
    },
  ],
  notes: 'colours (active / compare / winners) not checked; the final answer is also checked against brute-force enumeration',
});

add({
  slug: '354-russian-doll-envelopes',
  gen: (r) => ({ env: Array.from({ length: rint(r, 1, 8) }, () => [rint(r, 1, r() < 0.5 ? 4 : 9), rint(r, 1, r() < 0.5 ? 4 : 9)] as [number, number]) }),
  oracle: ({ env }: { env: [number, number][] }) => {
    const flatOf = (o: [number, number][]): Scalar[] => [...o.map((e) => e[0]), ...o.map((e) => e[1])];
    let order = env.map((e) => [...e] as [number, number]);
    let tails: number[] = []; let tailCol: number[] = [];
    const st = (cur: number, height: Scalar, probes: Scalar, pos: Scalar, ans: Scalar = null): State => ({
      order: flatOf(order), tails: [...tails], found: tailCol.filter((c) => c !== cur).sort((a, b) => a - b), height, probes, pos, size: tails.length, ans,
    });
    const res: State[] = [st(-1, null, null, null)];
    order = [...env].sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    res.push(st(-1, null, null, null));
    order.forEach((e, idx) => {
      const h = e[1]; let lo = 0, hi = tails.length; const seen: number[] = [];
      while (lo < hi) { const mid = (lo + hi) >> 1; seen.push(tails[mid]); if (tails[mid] < h) lo = mid + 1; else hi = mid; }
      if (lo === tails.length) { tails.push(h); tailCol.push(idx); } else { tails[lo] = h; tailCol[lo] = idx; }
      tails = [...tails]; tailCol = [...tailCol];
      res.push(st(idx, h, seen.length ? seen.join(', ') : null, lo));
    });
    res.push(st(-1, null, null, null, tails.length));
    return res;
  },
  project: (s) => ({
    order: gridFlat(s), tails: auxItems(s, 0), found: (() => { const g = sceneOfKind(s, 'grid'); return (g?.rows[1] ?? []).flatMap((c, i) => (c.state === 'found' ? [i] : [])); })(),
    height: vs(s, 'height'), probes: vs(s, 'probes'), pos: vs(s, 'pos'), size: vs(s, 'size'), ans: s.result ? Number(s.result.title) : null,
  }),
  notes: 'the width/height rows are compared as shown (original order, then sorted by width asc / height desc); only "found" (current tail) colours are checked, other colours not',
});

/* ===================================================================================== bitmask BFS (847) */
add({
  slug: '847-shortest-path-visiting-all-nodes',
  gen: (r) => {
    const n = rint(r, 1, 5); const edges: [number, number][] = [];
    for (let v = 1; v < n; v++) edges.push([rint(r, 0, v - 1), v]);
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (r() < 0.25 && !edges.some(([p, q]) => (p === a && q === b) || (p === b && q === a))) edges.push([a, b]);
    return { n, edges };
  },
  oracle: ({ n, edges }: { n: number; edges: [number, number][] }) => {
    const full = (1 << n) - 1; const bin = (m: number) => m.toString(2).padStart(n, '0');
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
    adj.forEach((l) => l.sort((x, y) => x - y));
    const dist: Scalar[][] = Array.from({ length: 1 << n }, () => nullArr(n));
    const table = (): Scalar[] => { const o: Scalar[] = []; for (let m = 1; m <= full; m++) for (let v = 0; v < n; v++) o.push(m & (1 << v) ? dist[m][v] : null); return o; };
    const queue: [number, number, number][] = []; let cur: [number, number, number] | null = null; let fresh: number[] = []; let pops = 0;
    const st = (): State => ({
      dist: table(), mask: cur ? bin(cur[0]) : null, node: cur ? cur[1] : null, d: cur ? cur[2] : null, popped: pops,
      queue: queue.slice(0, 8).map(([m, v, d]) => `(${bin(m)}, ${v}, d${d})`).concat(queue.length > 8 ? ['…'] : []), fresh: [...fresh].sort((a, b) => a - b),
      // graph: the node being expanded is active, the nodes already in its visited set are green, the edges to newly stamped neighbours are active
      nodeAct: cur ? [cur[1]] : [],
      nodeVis: cur ? Array.from({ length: n }, (_, v) => v).filter((v) => v !== cur![1] && cur![0] & (1 << v)) : [],
      hotE: cur ? edges.filter(([a, b]) => (cur![1] === a && fresh.some((f) => f % n === b)) || (cur![1] === b && fresh.some((f) => f % n === a))).map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`).sort() : [],
    });
    const res: State[] = [st()];
    for (let i = 0; i < n; i++) { dist[1 << i][i] = 0; queue.push([1 << i, i, 0]); }
    res.push(st());
    while (queue.length) {
      const [mask, node, d] = queue.shift()!;
      pops++; cur = [mask, node, d]; fresh = [];
      if (mask === full) { res.push(st()); break; }
      for (const nx of adj[node]) {
        const nm = mask | (1 << nx);
        if (dist[nm][nx] !== null) continue;
        dist[nm][nx] = d + 1; queue.push([nm, nx, d + 1]); fresh.push((nm - 1) * n + nx);
      }
      res.push(st());
    }
    return res;
  },
  project: (s) => {
    const g = sceneOfKind(s, 'grid');
    const fresh: number[] = [];
    if (g) g.rows.forEach((row, r) => row.forEach((c, k) => { if (c.state === 'compare') fresh.push(r * row.length + k); }));
    const gr = sceneOfKind(s, 'graph');
    return {
      dist: gridFlat(s), mask: vs(s, 'mask'), node: vs(s, 'node'), d: vs(s, 'dist'), popped: vs(s, 'popped'), queue: auxItems(s, 0), fresh,
      nodeAct: (gr?.nodes ?? []).filter((x) => x.state === 'active').map((x) => x.id),
      nodeVis: (gr?.nodes ?? []).filter((x) => x.state === 'found').map((x) => x.id),
      hotE: (gr?.edges ?? []).filter((e) => e.state === 'active').map((e) => `${Math.min(e.from, e.to)}-${Math.max(e.from, e.to)}`).sort(),
    };
  },
  invariants: [
    // the answer equals a brute-force BFS answer computed independently (Floyd-Warshall + permutations)
    (step, idx, steps, { n, edges }: { n: number; edges: [number, number][] }) => {
      if (idx !== steps.length - 1) return null;
      const INF = 1e9; const D = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : INF)));
      for (const [a, b] of edges) { D[a][b] = 1; D[b][a] = 1; }
      for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) D[i][j] = Math.min(D[i][j], D[i][k] + D[k][j]);
      let best = INF;
      const perm = (rest: number[], last: number, cost: number) => { if (!rest.length) { best = Math.min(best, cost); return; } rest.forEach((v, i) => perm([...rest.slice(0, i), ...rest.slice(i + 1)], v, last < 0 ? 0 : cost + D[last][v])); };
      perm(Array.from({ length: n }, (_, i) => i), -1, 0);
      return Number(step.result?.title) === best ? null : `answer ${step.result?.title} != brute force ${best}`;
    },
  ],
  notes: 'graph node/edge colours not checked; the answer is also checked against a brute force over visiting orders',
});

/* ===================================================================================== TSP (Held-Karp) */
add({
  slug: 'cp-travelling-salesman-bitmask-dp',
  gen: (r) => {
    const n = rint(r, 3, 6); const hi = r() < 0.4 ? 3 : 30;
    const d = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { d[i][j] = rint(r, 1, hi); d[j][i] = d[i][j]; }
    return { d };
  },
  oracle: ({ d }: { d: number[][] }) => {
    const n = d.length, m = n - 1, full = (1 << m) - 1; const INF = 1e9;
    const names = (mask: number) => `{${Array.from({ length: m }, (_, i) => i + 1).filter((c) => mask & (1 << (c - 1))).join(',')}}`;
    const dp: number[][] = Array.from({ length: 1 << m }, () => Array(n).fill(INF));
    const table = (): Scalar[] => { const o: Scalar[] = []; for (let mask = 1; mask <= full; mask++) for (let c = 0; c < m; c++) { const j = c + 1; o.push(!(mask & (1 << c)) ? null : dp[mask][j] >= INF ? null : dp[mask][j]); } return o; };
    let cm = -1, cj = -1; let best: Scalar = null; let tour: Scalar = null;
    let src: number[] = [];
    const st = (): State => ({ table: table(), mask: cm < 0 ? null : names(cm), end: cj < 0 ? null : cj, best, tour, src: [...src] });
    const res: State[] = [st()];
    for (let j = 1; j < n; j++) dp[1 << (j - 1)][j] = d[0][j];
    res.push(st());
    const pop = (x: number) => { let c = 0; for (; x > 0; x >>= 1) c += x & 1; return c; };
    for (let mask = 1; mask <= full; mask++) {
      if (pop(mask) < 2) continue;
      for (let j = 1; j < n; j++) {
        if (!(mask & (1 << (j - 1)))) continue;
        const prev = mask ^ (1 << (j - 1));
        let bv = INF; src = [];
        for (let i = 1; i < n; i++) if (prev & (1 << (i - 1))) { bv = Math.min(bv, dp[prev][i] + d[i][j]); src.push((prev - 1) * m + (i - 1)); }
        dp[mask][j] = bv; cm = mask; cj = j; best = bv;
        res.push(st());
      }
    }
    cm = full; cj = -1;
    let total = INF; src = [];
    for (let j = 1; j < n; j++) { total = Math.min(total, dp[full][j] + d[j][0]); src.push((full - 1) * m + (j - 1)); }
    best = total; res.push(st());
    src = []; tour = total; res.push(st());
    return res;
  },
  project: (s) => ({ table: gridFlat(s), mask: vs(s, 'mask'), end: vs(s, 'end'), best: vs(s, 'best'), tour: vs(s, 'tour'), src: cmpIdx(s) }),
  invariants: [
    // the highlighted tour (chosen edges) must be a Hamiltonian cycle whose weight equals the answer
    (step, idx, steps) => {
      if (idx !== steps.length - 1) return null;
      const g = sceneOfKind(step, 'graph');
      if (!g) return 'no graph scene';
      const chosen = g.edges.filter((e) => e.state === 'chosen');
      const deg = new Map<number, number>(); let w = 0;
      for (const e of chosen) { deg.set(e.from, (deg.get(e.from) ?? 0) + 1); deg.set(e.to, (deg.get(e.to) ?? 0) + 1); w += Number(e.weight); }
      const nn = g.nodes.length;
      if (deg.size !== nn || [...deg.values()].some((x) => x !== 2)) return 'chosen edges are not a 2-regular spanning cycle';
      return w === Number(step.result?.title) ? null : `tour weight ${w} != answer ${step.result?.title}`;
    },
  ],
  notes: 'DESIGN: which optimal tour is highlighted (tie-break) is checked only as a valid Hamiltonian cycle of the optimal weight; graph colours and the candidates list text are not checked',
});

/* ===================================================================================== tree DP (337 / 968) */
type TNode = { val: number; left: number | null; right: number | null };
const buildT = (tokens: (number | null)[]): TNode[] => {
  const nodes: TNode[] = []; const q: number[] = [];
  const mk = (v: number) => { nodes.push({ val: v, left: null, right: null }); return nodes.length - 1; };
  q.push(mk(tokens[0] as number)); let i = 1;
  while (q.length && i < tokens.length) {
    const p = nodes[q.shift()!];
    for (const side of ['left', 'right'] as const) { if (i >= tokens.length) break; const t = tokens[i++]; if (t !== null) { p[side] = mk(t); q.push(p[side]!); } }
  }
  return nodes;
};
const genTokens = (r: () => number, maxN: number, lo: number, hi: number): (number | null)[] => {
  const n = rint(r, 1, maxN);
  const kids: { v: number; l: number | null; r: number | null }[] = [{ v: rint(r, lo, hi), l: null, r: null }];
  for (let k = 1; k < n; k++) {
    for (;;) {
      const p = rint(r, 0, kids.length - 1); const side = r() < 0.5 ? 'l' : 'r';
      if (kids[p][side] === null) { kids.push({ v: rint(r, lo, hi), l: null, r: null }); kids[p][side] = kids.length - 1; break; }
    }
  }
  const out: (number | null)[] = []; const q: (number | null)[] = [0];
  while (q.length) { const id = q.shift()!; if (id === null) { out.push(null); continue; } out.push(kids[id].v); q.push(kids[id].l, kids[id].r); }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
};
const nodeLabels = (s: Step): Scalar[] => { const t = sceneOfKind(s, 'tree'); return (t?.nodes ?? []).map((n) => t?.labels[n.id] ?? ''); };

add({
  slug: '337-house-robber-iii',
  gen: (r) => ({ tokens: genTokens(r, 12, 0, r() < 0.4 ? 3 : 99) }),
  oracle: ({ tokens }: { tokens: (number | null)[] }) => {
    const nodes = buildT(tokens); const labels: string[] = nodes.map(() => ''); const stack: string[] = [];
    const st = (node: Scalar, rob: Scalar, skip: Scalar, best: Scalar): State => ({ labels: [...labels], stack: [...stack], node, rob, skip, best });
    const res: State[] = [st(null, null, null, null)];
    const dfs = (id: number): [number, number] => {
      stack.push(`node ${nodes[id].val}`);
      res.push(st(nodes[id].val, '?', '?', null));
      const l: [number, number] = nodes[id].left === null ? [0, 0] : dfs(nodes[id].left!);
      const r2: [number, number] = nodes[id].right === null ? [0, 0] : dfs(nodes[id].right!);
      const rob = nodes[id].val + l[1] + r2[1], skip = Math.max(...l) + Math.max(...r2);
      labels[id] = `${rob}/${skip}`;
      res.push(st(nodes[id].val, rob, skip, Math.max(rob, skip)));
      stack.pop();
      return [rob, skip];
    };
    const [a, b] = dfs(0);
    res.push(st(null, a, b, Math.max(a, b)));
    return res;
  },
  project: (s) => ({ labels: nodeLabels(s), stack: auxItems(s, 0), node: vs(s, 'node'), rob: vs(s, 'rob'), skip: vs(s, 'skip'), best: vs(s, 'best') }),
  invariants: [
    // the robbed houses (green at the end) must be pairwise non-adjacent and add up to the answer
    (step, idx, steps, { tokens }: { tokens: (number | null)[] }) => {
      if (idx !== steps.length - 1) return null;
      const nodes = buildT(tokens); const t = sceneOfKind(step, 'tree');
      const rob = new Set((t?.nodes ?? []).filter((n) => t?.states[n.id] === 'found').map((n) => n.id));
      for (const id of rob) for (const c of [nodes[id].left, nodes[id].right]) if (c !== null && rob.has(c)) return `adjacent houses ${id} and ${c} both robbed`;
      const sum = [...rob].reduce((a, id) => a + nodes[id].val, 0);
      return sum === Number(step.result?.title) ? null : `robbed houses sum to ${sum}, answer ${step.result?.title}`;
    },
  ],
  notes: 'the pre-final node colours are not checked; the final robbed set is checked only for validity (no adjacent pair) and total = answer, not against a specific tie-break',
});

add({
  slug: '968-binary-tree-cameras',
  gen: (r) => ({ tokens: genTokens(r, 12, 0, 0) }),
  oracle: ({ tokens }: { tokens: (number | null)[] }) => {
    const nodes = buildT(tokens);
    const pathName: string[] = []; pathName[0] = 'root';
    nodes.forEach((n, id) => { if (n.left !== null) pathName[n.left] = `${pathName[id]}.left`; if (n.right !== null) pathName[n.right] = `${pathName[id]}.right`; });
    const NAME = ['gap', 'cam', 'ok'];
    const labels: string[] = nodes.map(() => ''); const stack: string[] = []; let cameras = 0;
    const st = (node: Scalar, left: Scalar, right: Scalar): State => ({ labels: [...labels], stack: [...stack], node, left, right, cameras });
    const res: State[] = [st(null, null, null)];
    const dfs = (id: number): number => {
      stack.push(pathName[id]);
      res.push(st(pathName[id], '?', '?'));
      const n = nodes[id];
      const l = n.left === null ? 2 : dfs(n.left), r2 = n.right === null ? 2 : dfs(n.right);
      let out: number;
      if (l === 0 || r2 === 0) {
        cameras++; out = 1;
        if (n.left !== null && l === 0) labels[n.left] = NAME[2];
        if (n.right !== null && r2 === 0) labels[n.right] = NAME[2];
      } else out = l === 1 || r2 === 1 ? 2 : 0;
      labels[id] = NAME[out];
      res.push(st(pathName[id], l, r2));
      stack.pop();
      return out;
    };
    if (dfs(0) === 0) { cameras++; labels[0] = NAME[1]; res.push(st('root', null, null)); }
    res.push(st(null, null, null));
    return res;
  },
  project: (s) => ({ labels: nodeLabels(s), stack: auxItems(s, 0), node: vs(s, 'node'), left: vs(s, 'left'), right: vs(s, 'right'), cameras: vs(s, 'cameras') }),
  invariants: [
    // a node's label (gap / cam / ok) and its colour (error / swap / found) must always agree
    (step) => {
      const t = sceneOfKind(step, 'tree'); if (!t) return null;
      const want: Record<string, string> = { gap: 'error', cam: 'swap', ok: 'found' };
      for (const n of t.nodes) { const l = t.labels[n.id]; if (l && want[l] && t.states[n.id] !== want[l]) return `node ${n.id} is labelled "${l}" but coloured ${t.states[n.id]}`; }
      return null;
    },
    // brute force: the minimum camera count over all node subsets, and the final cameras must cover every node
    (step, idx, steps, { tokens }: { tokens: (number | null)[] }) => {
      if (idx !== steps.length - 1) return null;
      const nodes = buildT(tokens); const n = nodes.length;
      const par: (number | null)[] = Array(n).fill(null);
      nodes.forEach((nd, id) => { if (nd.left !== null) par[nd.left] = id; if (nd.right !== null) par[nd.right] = id; });
      let best = n;
      for (let m = 0; m < 1 << n; m++) {
        const cov = Array(n).fill(false);
        for (let id = 0; id < n; id++) if (m & (1 << id)) { cov[id] = true; if (par[id] !== null) cov[par[id]!] = true; if (nodes[id].left !== null) cov[nodes[id].left!] = true; if (nodes[id].right !== null) cov[nodes[id].right!] = true; }
        if (cov.every(Boolean)) { let c = 0; for (let id = 0; id < n; id++) if (m & (1 << id)) c++; best = Math.min(best, c); }
      }
      return Number(step.result?.title) === best ? null : `answer ${step.result?.title} != brute force ${best}`;
    },
  ],
  notes: 'colours not checked; the final answer is also checked against a brute force over all camera placements',
});

/* ===================================================================================== final-answer cross-checks (independent brute force) */
/** Adds an invariant: on the last step the result card shows exactly the brute-force answer. */
function addFinal<I>(slug: string, brute: (input: I) => string | number | boolean) {
  const c = out.find((x) => x.slug === slug);
  if (!c) throw new Error(`addFinal: no case ${slug}`);
  c.invariants = [...(c.invariants ?? []), (step, idx, steps, input) => {
    if (idx !== steps.length - 1) return null;
    const want = String(brute(input as I));
    const got = step.result?.title;
    return got === want ? null : `result card shows ${got}, brute force says ${want}`;
  }];
}
addFinal('70-climbing-stairs', ({ n }: { n: number }) => { let a = 1, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; });
addFinal('198-house-robber', ({ nums }: { nums: number[] }) => { let best = 0; for (let m = 0; m < 1 << nums.length; m++) { if (m & (m >> 1)) continue; let s = 0; nums.forEach((v, i) => { if (m & (1 << i)) s += v; }); best = Math.max(best, s); } return best; });
addFinal('322-coin-change', ({ coins, amount }: { coins: number[]; amount: number }) => {
  const q: [number, number][] = [[0, 0]]; const seen = new Set([0]);
  while (q.length) { const [v, d] = q.shift()!; if (v === amount) return d; for (const c of coins) { if (v + c <= amount && !seen.has(v + c)) { seen.add(v + c); q.push([v + c, d + 1]); } } }
  return -1;
});
addFinal('279-perfect-squares', ({ n }: { n: number }) => {
  const q: [number, number][] = [[0, 0]]; const seen = new Set([0]);
  while (q.length) { const [v, d] = q.shift()!; if (v === n) return d; for (let s = 1; v + s * s <= n; s++) if (!seen.has(v + s * s)) { seen.add(v + s * s); q.push([v + s * s, d + 1]); } }
  return -1;
});
addFinal('518-coin-change-ii', ({ coins, amount }: { coins: number[]; amount: number }) => { const go = (i: number, rem: number): number => (rem === 0 ? 1 : i >= coins.length ? 0 : (rem >= coins[i] ? go(i, rem - coins[i]) : 0) + go(i + 1, rem)); return go(0, amount); });
addFinal('416-partition-equal-subset-sum', ({ nums }: { nums: number[] }) => { const t = nums.reduce((a, b) => a + b, 0); if (t % 2) return false; for (let m = 0; m < 1 << nums.length; m++) { let s = 0; nums.forEach((v, i) => { if (m & (1 << i)) s += v; }); if (s === t / 2) return true; } return false; });
addFinal('1049-last-stone-weight-ii', ({ stones }: { stones: number[] }) => { let best = Infinity; for (let m = 0; m < 1 << stones.length; m++) { let s = 0; stones.forEach((v, i) => { s += m & (1 << i) ? v : -v; }); best = Math.min(best, Math.abs(s)); } return best; });
addFinal('494-target-sum', ({ nums, target }: { nums: number[]; target: number }) => { let c = 0; for (let m = 0; m < 1 << nums.length; m++) { let s = 0; nums.forEach((v, i) => { s += m & (1 << i) ? v : -v; }); if (s === target) c++; } return c; });
addFinal('698-partition-to-k-equal-sum-subsets', ({ nums, k }: { nums: number[]; k: number }) => {
  const t = nums.reduce((a, b) => a + b, 0); if (t % k) return false;
  const buckets = Array(k).fill(0); const go = (i: number): boolean => { if (i === nums.length) return true; const seen = new Set<number>(); for (let b = 0; b < k; b++) { if (seen.has(buckets[b]) || buckets[b] + nums[i] > t / k) continue; seen.add(buckets[b]); buckets[b] += nums[i]; if (go(i + 1)) return true; buckets[b] -= nums[i]; } return false; };
  return go(0);
});
addFinal('464-can-i-win', ({ m, total }: { m: number; total: number }) => {
  if (total <= 0) return true; if ((m * (m + 1)) / 2 < total) return false;
  const win = (used: number, rem: number): boolean => { for (let i = 1; i <= m; i++) { if (used & (1 << (i - 1))) continue; if (i >= rem || !win(used | (1 << (i - 1)), rem - i)) return true; } return false; };
  return win(0, total);
});
addFinal('486-predict-the-winner', ({ nums }: { nums: number[] }) => { const f = (l: number, r: number): number => (l === r ? nums[l] : Math.max(nums[l] - f(l + 1, r), nums[r] - f(l, r - 1))); return f(0, nums.length - 1) >= 0; });
addFinal('1406-stone-game-iii', ({ stones }: { stones: number[] }) => {
  const n = stones.length; const f = (i: number): number => { if (i >= n) return 0; let best = -Infinity, take = 0; for (let k = 1; k <= 3 && i + k <= n; k++) { take += stones[i + k - 1]; best = Math.max(best, take - f(i + k)); } return best; };
  const d = f(0); return d > 0 ? 'Alice' : d < 0 ? 'Bob' : 'Tie';
});
addFinal('1143-longest-common-subsequence', ({ a, b }: { a: string; b: string }) => { const f = (i: number, j: number): number => (i === 0 || j === 0 ? 0 : a[i - 1] === b[j - 1] ? 1 + f(i - 1, j - 1) : Math.max(f(i - 1, j), f(i, j - 1))); return f(a.length, b.length); });
addFinal('72-edit-distance', ({ a, b }: { a: string; b: string }) => { const f = (i: number, j: number): number => (i === 0 ? j : j === 0 ? i : a[i - 1] === b[j - 1] ? f(i - 1, j - 1) : 1 + Math.min(f(i - 1, j), f(i, j - 1), f(i - 1, j - 1))); return f(a.length, b.length); });
addFinal('300-longest-increasing-subsequence', ({ nums }: { nums: number[] }) => { let best = 0; for (let m = 1; m < 1 << nums.length; m++) { const sub = nums.filter((_, i) => m & (1 << i)); if (sub.every((v, k) => k === 0 || v > sub[k - 1])) best = Math.max(best, sub.length); } return best; });
addFinal('647-palindromic-substrings', ({ s }: { s: string }) => { let c = 0; for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) { const t = s.slice(i, j + 1); if (t === [...t].reverse().join('')) c++; } return c; });
addFinal('516-longest-palindromic-subsequence', ({ s }: { s: string }) => { let best = 0; for (let m = 1; m < 1 << s.length; m++) { const t = [...s].filter((_, i) => m & (1 << i)).join(''); if (t === [...t].reverse().join('')) best = Math.max(best, t.length); } return best; });
addFinal('1312-minimum-insertion-steps-to-make-a-string-palindrome', ({ s }: { s: string }) => { let best = 0; for (let m = 1; m < 1 << s.length; m++) { const t = [...s].filter((_, i) => m & (1 << i)).join(''); if (t === [...t].reverse().join('')) best = Math.max(best, t.length); } return s.length - best; });
addFinal('132-palindrome-partitioning-ii', ({ s }: { s: string }) => { const n = s.length; const isP = (t: string) => t === [...t].reverse().join(''); const f = (i: number): number => { if (i === n) return -1; let best = Infinity; for (let j = i + 1; j <= n; j++) if (isP(s.slice(i, j))) best = Math.min(best, 1 + f(j)); return best; }; return f(0); });
addFinal('91-decode-ways', ({ s }: { s: string }) => { const f = (i: number): number => (i === s.length ? 1 : s[i] === '0' ? 0 : f(i + 1) + (i + 1 < s.length && Number(s.slice(i, i + 2)) <= 26 ? f(i + 2) : 0)); return f(0); });
addFinal('gfg-longest-common-substring', ({ a, b }: { a: string; b: string }) => { let best = 0; for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) { let k = 0; while (i + k < a.length && j + k < b.length && a[i + k] === b[j + k]) k++; best = Math.max(best, k); } return best; });
addFinal('62-unique-paths', ({ m, n }: { m: number; n: number }) => { const f = (r: number, c: number): number => (r === m - 1 || c === n - 1 ? 1 : f(r + 1, c) + f(r, c + 1)); return f(0, 0); });
addFinal('63-unique-paths-ii', ({ grid }: { grid: string[] }) => { const m = grid.length, n = grid[0].length; const f = (r: number, c: number): number => (r >= m || c >= n || grid[r][c] === '1' ? 0 : r === m - 1 && c === n - 1 ? 1 : f(r + 1, c) + f(r, c + 1)); return f(0, 0); });
addFinal('120-triangle', ({ tri }: { tri: number[][] }) => { const f = (r: number, c: number): number => (r === tri.length - 1 ? tri[r][c] : tri[r][c] + Math.min(f(r + 1, c), f(r + 1, c + 1))); return f(0, 0); });
addFinal('cp-0-1-knapsack', ({ wt, val, cap }: Knap) => { let best = 0; for (let m = 0; m < 1 << wt.length; m++) { let w = 0, v = 0; wt.forEach((x, i) => { if (m & (1 << i)) { w += x; v += val[i]; } }); if (w <= cap) best = Math.max(best, v); } return best; });
addFinal('cp-unbounded-knapsack', ({ wt, val, cap }: Knap) => { const f = (c: number): number => { let b = 0; wt.forEach((w, i) => { if (w <= c) b = Math.max(b, val[i] + f(c - w)); }); return b; }; return f(cap); });
addFinal('312-burst-balloons', ({ nums }: { nums: number[] }) => { const f = (arr: number[]): number => { let b = 0; arr.forEach((v, i) => { b = Math.max(b, (arr[i - 1] ?? 1) * v * (arr[i + 1] ?? 1) + f([...arr.slice(0, i), ...arr.slice(i + 1)])); }); return b; }; return f(nums); });
addFinal('664-strange-printer', ({ s }: { s: string }) => {
  // BFS over printable strings is too big; use the classic memoised search over (i, j) with a different formulation
  const memo = new Map<string, number>(); const t = s;
  const f = (i: number, j: number): number => { if (i > j) return 0; const key = `${i},${j}`; if (memo.has(key)) return memo.get(key)!; let best = f(i, j - 1) + 1; for (let k = i; k < j; k++) if (t[k] === t[j]) best = Math.min(best, f(i, k) + f(k + 1, j - 1)); memo.set(key, best); return best; };
  return f(0, t.length - 1);
});
addFinal('gfg-matrix-chain-multiplication', ({ dims }: { dims: number[] }) => { const f = (i: number, j: number): number => { if (i === j) return 0; let b = Infinity; for (let k = i; k < j; k++) b = Math.min(b, f(i, k) + f(k + 1, j) + dims[i] * dims[k + 1] * dims[j + 1]); return b; }; return f(0, dims.length - 2); });
addFinal('cp-triangulate-a-convex-polygon', ({ n }: { n: number }) => { const f = (v: number): number => { if (v < 3) return 1; let s = 0; for (let k = 1; k <= v - 2; k++) s += f(k + 1) * f(v - k); return s; }; return f(n); });
addFinal('96-unique-binary-search-trees', ({ n }: { n: number }) => { const f = (k: number): number => { if (k <= 1) return 1; let s = 0; for (let r = 1; r <= k; r++) s += f(r - 1) * f(k - r); return s; }; return f(n); });
addFinal('cp-count-valid-parentheses-sequences', ({ n }: { n: number }) => { const f = (o: number, c: number): number => (o === n && c === n ? 1 : (o < n ? f(o + 1, c) : 0) + (c < o ? f(o, c + 1) : 0)); return f(0, 0); });
addFinal('alg-memoized-fibonacci', ({ n }: { n: number }) => { const f = (k: number): number => (k <= 1 ? k : f(k - 1) + f(k - 2)); return f(n); });
addFinal('cp-grid-paths-with-memoization', ({ rows, cols }: { rows: number; cols: number }) => { const f = (r: number, c: number): number => (r === rows - 1 || c === cols - 1 ? 1 : f(r + 1, c) + f(r, c + 1)); return f(0, 0); });
addFinal('188-best-time-to-buy-and-sell-stock-iv', ({ k, prices }: { k: number; prices: number[] }) => { const f = (i: number, t: number, holding: boolean): number => { if (i === prices.length || t === 0) return 0; const rest = f(i + 1, t, holding); return holding ? Math.max(rest, prices[i] + f(i + 1, t - 1, false)) : Math.max(rest, -prices[i] + f(i + 1, t, true)); }; return f(0, k, false); });
addFinal('309-best-time-to-buy-and-sell-stock-with-cooldown', ({ prices }: { prices: number[] }) => { const f = (i: number, holding: boolean): number => { if (i >= prices.length) return 0; const rest = f(i + 1, holding); return holding ? Math.max(rest, prices[i] + f(i + 2, false)) : Math.max(rest, -prices[i] + f(i + 1, true)); }; return f(0, false); });
addFinal('714-best-time-to-buy-and-sell-stock-with-transaction-fee', ({ prices, fee }: { prices: number[]; fee: number }) => { const f = (i: number, holding: boolean): number => { if (i >= prices.length) return 0; const rest = f(i + 1, holding); return holding ? Math.max(rest, prices[i] - fee + f(i + 1, false)) : Math.max(rest, -prices[i] + f(i + 1, true)); }; return f(0, false); });
addFinal('cp-travelling-salesman-bitmask-dp', ({ d }: { d: number[][] }) => { const n = d.length; let best = Infinity; const go = (rest: number[], last: number, cost: number) => { if (!rest.length) { best = Math.min(best, cost + d[last][0]); return; } rest.forEach((v, i) => go([...rest.slice(0, i), ...rest.slice(i + 1)], v, cost + d[last][v])); }; go(Array.from({ length: n - 1 }, (_, i) => i + 1), 0, 0); return best; });

export const cases: CaseModule['cases'] = out;
