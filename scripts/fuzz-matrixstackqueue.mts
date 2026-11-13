/**
 * Fuzz test for the matrix / stack / queue / greedy problems.
 * Run:  node scripts/fuzz-matrixstackqueue.mts
 * For each problem: generate random valid inputs, run buildSteps, and compare the final `result.title`
 * with an independent reference implementation. Exits non-zero on any mismatch.
 */
import { spiralMatrix } from '../src/problems/spiralMatrix.ts';
import { spiralMatrixII } from '../src/problems/spiralMatrixII.ts';
import { setMatrixZeroes } from '../src/problems/setMatrixZeroes.ts';
import { wordSearch } from '../src/problems/wordSearch.ts';
import { searchA2DMatrixII } from '../src/problems/searchA2DMatrixII.ts';
import { rotateImage } from '../src/problems/rotateImage.ts';
import { searchA2DMatrix } from '../src/problems/searchA2DMatrix.ts';
import { validSudoku } from '../src/problems/validSudoku.ts';
import { evaluateRPN } from '../src/problems/evaluateRPN.ts';
import { minStack } from '../src/problems/minStack.ts';
import { nextGreaterElementI } from '../src/problems/nextGreaterElementI.ts';
import { largestRectangleInHistogram } from '../src/problems/largestRectangleInHistogram.ts';
import { maximalRectangle } from '../src/problems/maximalRectangle.ts';
import { basicCalculator } from '../src/problems/basicCalculator.ts';
import { reverseFirstKQueue } from '../src/problems/reverseFirstKQueue.ts';
import { slidingWindowMaximum } from '../src/problems/slidingWindowMaximum.ts';
import { jumpGame } from '../src/problems/jumpGame.ts';
import { jumpGameII } from '../src/problems/jumpGameII.ts';
import { candy } from '../src/problems/candy.ts';
import { gasStation } from '../src/problems/gasStation.ts';
import { minimumPlatforms } from '../src/problems/minimumPlatforms.ts';
import { partitionLabels } from '../src/problems/partitionLabels.ts';

// ---- tiny helpers ---------------------------------------------------------------------------
let seed = 20240607;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ri = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1)); // inclusive
const pick = <T,>(a: T[]): T => a[ri(0, a.length - 1)];
const arr = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => f(i));
const J = (x: unknown) => JSON.stringify(x);

let failures = 0;
const N = 200;
function run<I>(name: string, p: { buildSteps: (i: I) => any[] }, gen: () => I, ref: (i: I) => string, n = N) {
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
      failures++;
      if (bad <= 3) console.log(`FAIL ${name}: input=${J(input)}\n   want=${want}\n   got =${got} (steps=${steps.length})`);
    }
  }
  console.log(`${bad ? 'FAIL' : 'ok  '} ${name} (${n} cases${bad ? `, ${bad} bad` : ''})`);
}
const randMatrix = (maxR: number, maxC: number, lo = -9, hi = 9) => {
  const R = ri(1, maxR), C = ri(1, maxC);
  return arr(R, () => arr(C, () => ri(lo, hi)));
};

// ---- #54 Spiral Matrix ------------------------------------------------------------------------
run('54 spiral matrix', spiralMatrix, () => ({ m: randMatrix(7, 9, 0, 99) }), ({ m }) => {
  const R = m.length, C = m[0].length;
  const seen = m.map((r) => r.map(() => false));
  const out: number[] = [];
  let r = 0, c = 0, d = 0;
  const dr = [0, 1, 0, -1], dc = [1, 0, -1, 0];
  for (let k = 0; k < R * C; k++) {
    out.push(m[r][c]);
    seen[r][c] = true;
    const nr = r + dr[d], nc = c + dc[d];
    if (nr < 0 || nc < 0 || nr >= R || nc >= C || seen[nr][nc]) d = (d + 1) % 4;
    r += dr[d];
    c += dc[d];
  }
  return J(out);
});

// ---- #59 Spiral Matrix II (layer-by-layer reference) ------------------------------------------
run('59 spiral matrix II', spiralMatrixII, () => ({ n: ri(1, 7) }), ({ n }) => {
  const g = arr(n, () => arr(n, () => 0));
  let k = 1;
  for (let layer = 0; layer < Math.ceil(n / 2); layer++) {
    const lo = layer, hi = n - 1 - layer;
    for (let c = lo; c <= hi; c++) g[lo][c] = k++;
    for (let r = lo + 1; r <= hi; r++) g[r][hi] = k++;
    if (hi > lo) for (let c = hi - 1; c >= lo; c--) g[hi][c] = k++;
    if (hi > lo) for (let r = hi - 1; r > lo; r--) g[r][lo] = k++;
  }
  return J(g);
});

// ---- #73 Set Matrix Zeroes -------------------------------------------------------------------
run('73 set matrix zeroes', setMatrixZeroes, () => ({ m: randMatrix(7, 9, 0, 4) }), ({ m }) => {
  const zr = new Set<number>(), zc = new Set<number>();
  m.forEach((row, r) => row.forEach((v, c) => { if (v === 0) { zr.add(r); zc.add(c); } }));
  return J(m.map((row, r) => row.map((v, c) => (zr.has(r) || zc.has(c) ? 0 : v))));
});

// ---- #79 Word Search -------------------------------------------------------------------------
run('79 word search', wordSearch, () => {
  const alpha = pick(['AB', 'ABC', 'ABCD']);
  const R = ri(1, 4), C = ri(1, 5);
  const board = arr(R, () => arr(C, () => alpha[ri(0, alpha.length - 1)]).join(''));
  const word = arr(ri(1, 8), () => alpha[ri(0, alpha.length - 1)]).join('');
  return { board, word };
}, ({ board, word }) => {
  const R = board.length, C = board[0].length;
  const go = (r: number, c: number, i: number, used: Set<string>): boolean => {
    if (i === word.length) return true;
    if (r < 0 || c < 0 || r >= R || c >= C || used.has(`${r},${c}`) || board[r][c] !== word[i]) return false;
    const next = new Set(used).add(`${r},${c}`);
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => go(r + a, c + b, i + 1, next));
  };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (go(r, c, 0, new Set())) return 'true';
  return 'false';
});

// ---- #240 Search a 2D Matrix II --------------------------------------------------------------
function sortedBoth(R: number, C: number): number[][] {
  const m = arr(R, () => arr(C, () => 0));
  for (let i = 0; i < R; i++) {
    for (let j = 0; j < C; j++) {
      const up = i > 0 ? m[i - 1][j] : 0;
      const left = j > 0 ? m[i][j - 1] : 0;
      m[i][j] = Math.max(up, left) + ri(0, 3);
    }
  }
  return m;
}
run('240 search a 2D matrix II', searchA2DMatrixII, () => {
  const m = sortedBoth(ri(1, 7), ri(1, 9));
  const flat = m.flat();
  const target = rand() < 0.5 ? pick(flat) : ri(Math.min(...flat) - 2, Math.max(...flat) + 2);
  return { m, target };
}, ({ m, target }) => String(m.some((row) => row.includes(target))));

// ---- #48 Rotate Image ------------------------------------------------------------------------
run('48 rotate image', rotateImage, () => {
  const n = ri(1, 7);
  return { m: arr(n, () => arr(n, () => ri(-9, 99))) };
}, ({ m }) => {
  const n = m.length;
  const out = arr(n, () => arr(n, () => 0));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out[c][n - 1 - r] = m[r][c];
  return J(out);
});

// ---- #74 Search a 2D Matrix -----------------------------------------------------------------
run('74 search a 2D matrix', searchA2DMatrix, () => {
  const R = ri(1, 7), C = ri(1, 9);
  let v = ri(-5, 5);
  const m = arr(R, () => arr(C, () => (v += ri(0, 3))));
  const flat = m.flat();
  const target = rand() < 0.5 ? pick(flat) : ri(flat[0] - 2, flat[flat.length - 1] + 2);
  return { m, target };
}, ({ m, target }) => String(m.flat().includes(target)));

// ---- #36 Valid Sudoku -----------------------------------------------------------------------
run('36 valid sudoku', validSudoku, () => {
  const base = arr(9, (r) => arr(9, (c) => ((r * 3 + Math.floor(r / 3) + c) % 9) + 1));
  const keep = rand();
  const b = base.map((row) => row.map((v) => (rand() < keep ? String(v) : '.')));
  if (rand() < 0.6) {
    const r = ri(0, 8), c = ri(0, 8);
    b[r][c] = String(ri(1, 9));
  }
  return { board: b.map((row) => row.join('')) };
}, ({ board }) => {
  const g = board.map((r) => [...r]);
  const dupFree = (cells: string[]) => {
    const f = cells.filter((x) => x !== '.');
    return new Set(f).size === f.length;
  };
  for (let i = 0; i < 9; i++) {
    if (!dupFree(g[i])) return 'false';
    if (!dupFree(g.map((row) => row[i]))) return 'false';
    const br = Math.floor(i / 3) * 3, bc = (i % 3) * 3;
    const cells: string[] = [];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) cells.push(g[br + a][bc + b]);
    if (!dupFree(cells)) return 'false';
  }
  return 'true';
});

// ---- #150 Evaluate Reverse Polish Notation ---------------------------------------------------
run('150 evaluate RPN', evaluateRPN, () => {
  // build a random valid expression tree, then emit postfix
  const gen = (leaves: number): { tokens: string[]; val: number } => {
    if (leaves === 1) { const v = ri(-20, 30); return { tokens: [String(v)], val: v }; }
    for (;;) {
      const l = ri(1, leaves - 1);
      const a = gen(l), b = gen(leaves - l);
      const op = pick(['+', '-', '*', '/']);
      if (op === '/' && b.val === 0) continue;
      const val = op === '+' ? a.val + b.val : op === '-' ? a.val - b.val : op === '*' ? a.val * b.val : Math.trunc(a.val / b.val);
      return { tokens: [...a.tokens, ...b.tokens, op], val };
    }
  };
  for (;;) {
    const e = gen(ri(1, 7));
    if (e.tokens.length <= 13) return { tokens: e.tokens, val: e.val } as any;
  }
}, (i: any) => String(i.val));

// ---- #155 Min Stack ---------------------------------------------------------------------------
run('155 min stack', minStack, () => {
  const ops: any[] = [];
  let size = 0;
  const n = ri(1, 12);
  for (let k = 0; k < n; k++) {
    if (size === 0 || rand() < 0.45) { ops.push({ op: 'push', val: ri(-8, 8) }); size++; }
    else { const o = pick(['pop', 'top', 'getMin']); ops.push({ op: o }); if (o === 'pop') size--; }
  }
  return { ops };
}, ({ ops }) => {
  const a: number[] = [];
  const out: (number | null)[] = [];
  for (const o of ops) {
    if (o.op === 'push') { a.push(o.val); out.push(null); }
    else if (o.op === 'pop') { a.pop(); out.push(null); }
    else if (o.op === 'top') out.push(a[a.length - 1]);
    else out.push(Math.min(...a));
  }
  return J(out);
});

// ---- #496 Next Greater Element I -------------------------------------------------------------
run('496 next greater element I', nextGreaterElementI, () => {
  const n = ri(1, 10);
  const nums2 = [...Array(30).keys()].sort(() => rand() - 0.5).slice(0, n);
  const nums1 = nums2.filter(() => rand() < 0.5).sort(() => rand() - 0.5);
  if (!nums1.length) nums1.push(nums2[0]);
  return { nums1, nums2 };
}, ({ nums1, nums2 }) => J(nums1.map((x) => {
  const i = nums2.indexOf(x);
  for (let j = i + 1; j < nums2.length; j++) if (nums2[j] > x) return nums2[j];
  return -1;
})));

// ---- #84 Largest Rectangle in Histogram ------------------------------------------------------
const bruteHist = (h: number[]) => {
  let best = 0;
  for (let l = 0; l < h.length; l++) {
    let mn = Infinity;
    for (let r = l; r < h.length; r++) { mn = Math.min(mn, h[r]); best = Math.max(best, mn * (r - l + 1)); }
  }
  return best;
};
run('84 largest rectangle in histogram', largestRectangleInHistogram, () => ({ heights: arr(ri(1, 12), () => ri(0, rand() < 0.5 ? 6 : 40)) }), ({ heights }) => String(bruteHist(heights)));

// ---- #85 Maximal Rectangle -------------------------------------------------------------------
run('85 maximal rectangle', maximalRectangle, () => {
  const R = ri(1, 6), C = ri(1, 8), p = rand();
  return { grid: arr(R, () => arr(C, () => (rand() < p ? 1 : 0)).join('')) };
}, ({ grid }) => {
  const R = grid.length, C = grid[0].length;
  let best = 0;
  for (let r1 = 0; r1 < R; r1++) for (let r2 = r1; r2 < R; r2++) for (let c1 = 0; c1 < C; c1++) for (let c2 = c1; c2 < C; c2++) {
    let all = true;
    for (let r = r1; r <= r2 && all; r++) for (let c = c1; c <= c2; c++) if (grid[r][c] !== '1') { all = false; break; }
    if (all) best = Math.max(best, (r2 - r1 + 1) * (c2 - c1 + 1));
  }
  return String(best);
});

// ---- #224 Basic Calculator -------------------------------------------------------------------
run('224 basic calculator', basicCalculator, () => {
  // grammar: expr := term (('+'|'-') term)* ; term := ['-' (only first in group)] num | '(' expr ')'
  const genExpr = (depth: number, budget: { n: number }): string => {
    let s = '';
    const terms = ri(1, 3);
    for (let t = 0; t < terms; t++) {
      if (t > 0) s += pick(['+', '-']);
      if (t === 0 && rand() < 0.2) s += '-';
      if (depth < 2 && budget.n > 6 && rand() < 0.35) {
        budget.n -= 2;
        s += '(' + genExpr(depth + 1, budget) + ')';
      } else {
        const v = String(ri(0, rand() < 0.3 ? 120 : 9));
        budget.n -= v.length + 1;
        s += v;
      }
    }
    return s;
  };
  for (;;) {
    const e = genExpr(0, { n: 16 });
    if (e.length <= 16) return { expr: e };
  }
}, ({ expr }) => {
  // independent recursive-descent evaluator
  let pos = 0;
  const parseExpr = (): number => {
    let v = parseTerm();
    while (expr[pos] === '+' || expr[pos] === '-') { const op = expr[pos++]; const t = parseTerm(); v = op === '+' ? v + t : v - t; }
    return v;
  };
  const parseTerm = (): number => {
    if (expr[pos] === '-') { pos++; return -parseTerm(); }
    if (expr[pos] === '(') { pos++; const v = parseExpr(); pos++; return v; }
    let s = '';
    while (pos < expr.length && /\d/.test(expr[pos])) s += expr[pos++];
    return Number(s);
  };
  return String(parseExpr());
});

// ---- GFG Reverse First K Elements of Queue ---------------------------------------------------
run('GFG reverse first K of queue', reverseFirstKQueue, () => {
  const n = ri(1, 12);
  return { queue: arr(n, () => ri(-9, 99)), k: ri(1, n) };
}, ({ queue, k }) => J([...queue.slice(0, k).reverse(), ...queue.slice(k)]));

// ---- #239 Sliding Window Maximum -------------------------------------------------------------
run('239 sliding window maximum', slidingWindowMaximum, () => {
  const n = ri(1, 12);
  return { nums: arr(n, () => ri(-6, 6)), k: ri(1, n) };
}, ({ nums, k }) => J(arr(nums.length - k + 1, (i) => Math.max(...nums.slice(i, i + k)))));

// ---- #55 Jump Game (BFS reachability reference) ----------------------------------------------
run('55 jump game', jumpGame, () => ({ nums: arr(ri(1, 12), () => (rand() < 0.3 ? 0 : ri(0, rand() < 0.5 ? 2 : 6))) }), ({ nums }) => {
  const seen = new Set([0]);
  const q = [0];
  while (q.length) {
    const i = q.shift()!;
    for (let s = 1; s <= nums[i]; s++) if (i + s < nums.length && !seen.has(i + s)) { seen.add(i + s); q.push(i + s); }
  }
  return String(seen.has(nums.length - 1));
});

// ---- #45 Jump Game II (DP reference) ---------------------------------------------------------
run('45 jump game II', jumpGameII, () => {
  for (;;) {
    const nums = arr(ri(1, 12), () => (rand() < 0.2 ? 0 : ri(1, rand() < 0.5 ? 2 : 6)));
    let reach = 0;
    for (let i = 0; i < nums.length && i <= reach; i++) reach = Math.max(reach, i + nums[i]);
    if (reach >= nums.length - 1) return { nums };
  }
}, ({ nums }) => {
  const n = nums.length;
  const dp = Array(n).fill(Infinity);
  dp[0] = 0;
  for (let i = 0; i < n; i++) for (let s = 1; s <= nums[i]; s++) if (i + s < n) dp[i + s] = Math.min(dp[i + s], dp[i] + 1);
  return String(dp[n - 1]);
});

// ---- #135 Candy (relaxation to a fixed point) ------------------------------------------------
run('135 candy', candy, () => ({ ratings: arr(ri(1, 12), () => ri(0, rand() < 0.5 ? 3 : 20)) }), ({ ratings }) => {
  const n = ratings.length;
  const c = Array(n).fill(1);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < n; i++) {
      if (i > 0 && ratings[i] > ratings[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; changed = true; }
      if (i < n - 1 && ratings[i] > ratings[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; changed = true; }
    }
  }
  return String(c.reduce((a, b) => a + b, 0));
});

// ---- #134 Gas Station (try every start) ------------------------------------------------------
run('134 gas station', gasStation, () => {
  const n = ri(1, 10);
  const gas = arr(n, () => ri(0, 8));
  const cost = arr(n, () => ri(0, 8));
  if (rand() < 0.5) { // nudge towards solvable
    const diff = gas.reduce((a, b) => a + b, 0) - cost.reduce((a, b) => a + b, 0);
    if (diff < 0) gas[ri(0, n - 1)] += -diff;
  }
  return { gas, cost };
}, ({ gas, cost }) => {
  const n = gas.length;
  for (let s = 0; s < n; s++) {
    let tank = 0, ok = true;
    for (let k = 0; k < n; k++) {
      const i = (s + k) % n;
      tank += gas[i] - cost[i];
      if (tank < 0) { ok = false; break; }
    }
    if (ok) return String(s);
  }
  return '-1';
});

// ---- GFG Minimum Platforms (max overlap at any train time) -----------------------------------
run('GFG minimum platforms', minimumPlatforms, () => {
  const n = ri(1, 9);
  const arrs: number[] = [], deps: number[] = [];
  for (let k = 0; k < n; k++) {
    const a = ri(0, 23) * 100 + ri(0, 11) * 5;
    let d = a + ri(0, 3) * 100 + ri(0, 11) * 5;
    if (d % 100 >= 60 || d > 2359) d = a;
    arrs.push(a); deps.push(d);
  }
  return { arr: arrs, dep: deps };
}, ({ arr: A, dep: D }) => {
  let best = 0;
  for (const t of A) best = Math.max(best, A.filter((a, i) => a <= t && t <= D[i]).length);
  return String(best);
});

// ---- #763 Partition Labels (cut wherever prefix and suffix share no letter) ------------------
run('763 partition labels', partitionLabels, () => {
  const alpha = pick(['ab', 'abc', 'abcde', 'abcdefgh']);
  return { s: arr(ri(1, 16), () => alpha[ri(0, alpha.length - 1)]).join('') };
}, ({ s }) => {
  const cuts: number[] = [];
  for (let i = 1; i <= s.length; i++) {
    const pre = new Set(s.slice(0, i)), suf = s.slice(i);
    if ([...suf].every((ch) => !pre.has(ch))) cuts.push(i);
  }
  const out: number[] = [];
  let prev = 0;
  for (const c of cuts) { out.push(c - prev); prev = c; }
  return J(out);
});

// ---- every example's declared output must equal what the animation computes -------------------
const ALL: any[] = [spiralMatrix, spiralMatrixII, setMatrixZeroes, wordSearch, searchA2DMatrixII, rotateImage, searchA2DMatrix, validSudoku,
  evaluateRPN, minStack, nextGreaterElementI, largestRectangleInHistogram, maximalRectangle, basicCalculator,
  reverseFirstKQueue, slidingWindowMaximum, jumpGame, jumpGameII, candy, gasStation, minimumPlatforms, partitionLabels];
let exBad = 0;
for (const p of ALL) {
  for (const ex of p.examples) {
    const steps = p.buildSteps(ex.input);
    const got = steps[steps.length - 1].result?.title;
    if (got !== ex.output) { exBad++; failures++; console.log(`FAIL example ${p.slug} [${ex.label}]: declared ${ex.output}, animation says ${got}`); }
  }
}
console.log(`${exBad ? 'FAIL' : 'ok  '} examples of all ${ALL.length} problems match their declared output`);



console.log(failures ? `\n${failures} FUZZ FAILURE(S)` : '\nALL FUZZ TESTS PASSED');
process.exit(failures ? 1 : 0);
