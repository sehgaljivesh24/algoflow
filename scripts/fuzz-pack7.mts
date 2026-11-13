/**
 * Fuzz pack p7 (advanced DP): compare each animation's final result with an independent brute force.
 * Run: node scripts/fuzz-pack7.mts   (exits non-zero on any mismatch)
 */
import { uniqueBinarySearchTrees } from '../src/problems/uniqueBinarySearchTrees.ts';
import { countValidParenthesesSequences } from '../src/problems/countValidParenthesesSequences.ts';
import { triangulateConvexPolygon } from '../src/problems/triangulateConvexPolygon.ts';
import { predictTheWinner } from '../src/problems/predictTheWinner.ts';
import { canIWin } from '../src/problems/canIWin.ts';
import { stoneGameIII } from '../src/problems/stoneGameIII.ts';
import { shortestPathVisitingAllNodes } from '../src/problems/shortestPathVisitingAllNodes.ts';
import { partitionToKEqualSumSubsets } from '../src/problems/partitionToKEqualSumSubsets.ts';
import { travellingSalesmanBitmask } from '../src/problems/travellingSalesmanBitmask.ts';
import { burstBalloons } from '../src/problems/burstBalloons.ts';
import { matrixChainMultiplication } from '../src/problems/matrixChainMultiplication.ts';
import { strangePrinter } from '../src/problems/strangePrinter.ts';
import { houseRobberIII } from '../src/problems/houseRobberIII.ts';
import { binaryTreeCameras } from '../src/problems/binaryTreeCameras.ts';
import { numbersAtMostNGivenDigitSet } from '../src/problems/numbersAtMostNGivenDigitSet.ts';
import { countSpecialIntegers } from '../src/problems/countSpecialIntegers.ts';
import { countNumbersWithDigitSum } from '../src/problems/countNumbersWithDigitSum.ts';
import { buildTree } from '../src/problems/maxDepth.ts';
import type { ProblemDef } from '../src/engine/types.ts';

let seed = 20240607;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const ri = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const N = 200;

let failures = 0;
let maxSteps = 0;
function run<I>(p: ProblemDef<I>, input: I): string {
  const steps = p.buildSteps(input);
  maxSteps = Math.max(maxSteps, steps.length);
  if (steps.length > 400) throw new Error(`${p.slug}: ${steps.length} steps for ${JSON.stringify(input)}`);
  const res = steps[steps.length - 1].result;
  if (!res) throw new Error(`${p.slug}: no result on last step`);
  return res.title;
}
function fuzz<I>(p: ProblemDef<I>, gen: () => I, ref: (i: I) => string | number | boolean, n = N) {
  let bad = 0;
  let worst = 0;
  for (let t = 0; t < n; t++) {
    const input = gen();
    const got = run(p, input);
    worst = Math.max(worst, p.buildSteps(input).length);
    const want = String(ref(input));
    if (got !== want) {
      bad++;
      failures++;
      if (bad <= 3) console.log(`FAIL ${p.slug} input=${JSON.stringify(input)} got=${got} want=${want}`);
    }
  }
  // the declared examples must match too
  for (const ex of p.examples) {
    const got = run(p, ex.input);
    if (got !== ex.output) {
      failures++;
      console.log(`FAIL ${p.slug} example "${ex.label}" got=${got} declared=${ex.output}`);
    }
    const want = String(ref(ex.input));
    if (want !== ex.output) {
      failures++;
      console.log(`FAIL ${p.slug} example "${ex.label}" reference=${want} declared=${ex.output}`);
    }
  }
  console.log(`${bad === 0 ? 'ok  ' : 'FAIL'} ${p.slug}  (${n} random inputs, max ${worst} steps)`);
}

/* ---------------------------------------------------------------- references */
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const catalan = (n: number) => fact(2 * n) / (fact(n) * fact(n + 1));

// 96: enumerate BST shapes by recursion (no table)
const countShapes = (lo: number, hi: number): number => {
  if (lo >= hi) return 1;
  let t = 0;
  for (let r = lo; r <= hi; r++) t += countShapes(lo, r - 1) * countShapes(r + 1, hi);
  return t;
};
fuzz(uniqueBinarySearchTrees, () => ({ n: ri(1, 10) }), ({ n }) => countShapes(1, n));

// bracket sequences: enumerate all strings
const bruteBrackets = (n: number) => {
  let c = 0;
  for (let m = 0; m < 1 << (2 * n); m++) {
    let bal = 0;
    let ok = true;
    for (let i = 0; i < 2 * n && ok; i++) {
      bal += (m >> i) & 1 ? 1 : -1;
      if (bal < 0) ok = false;
    }
    if (ok && bal === 0) c++;
  }
  return c;
};
fuzz(countValidParenthesesSequences, () => ({ n: ri(1, 8) }), ({ n }) => bruteBrackets(n));

// polygon: count triangulations by listing diagonal sets (non-crossing maximal sets) for small n, formula otherwise
const bruteTriang = (n: number): number => {
  const diags: [number, number][] = [];
  for (let a = 0; a < n; a++) for (let b = a + 2; b < n; b++) if (!(a === 0 && b === n - 1)) diags.push([a, b]);
  const cross = (d1: [number, number], d2: [number, number]) => {
    const [a, b] = d1;
    const [c, d] = d2;
    return (a < c && c < b && b < d) || (c < a && a < d && d < b);
  };
  let count = 0;
  for (let m = 0; m < 1 << diags.length; m++) {
    const chosen = diags.filter((_, i) => (m >> i) & 1);
    if (chosen.length !== n - 3) continue;
    let ok = true;
    for (let i = 0; i < chosen.length && ok; i++) for (let j = i + 1; j < chosen.length; j++) if (cross(chosen[i], chosen[j])) ok = false;
    if (ok) count++;
  }
  return count;
};
fuzz(triangulateConvexPolygon, () => ({ n: ri(3, 9) }), ({ n }) => (n <= 8 ? bruteTriang(n) : catalan(n - 2)));

// 486: game search over scores
const predictRef = (nums: number[]) => {
  const play = (i: number, j: number, turn: 1 | 2, a: number, b: number): number => {
    if (i > j) return a - b;
    const l = play(i + 1, j, turn === 1 ? 2 : 1, a + (turn === 1 ? nums[i] : 0), b + (turn === 2 ? nums[i] : 0));
    const r = play(i, j - 1, turn === 1 ? 2 : 1, a + (turn === 1 ? nums[j] : 0), b + (turn === 2 ? nums[j] : 0));
    return turn === 1 ? Math.max(l, r) : Math.min(l, r);
  };
  return play(0, nums.length - 1, 1, 0, 0) >= 0;
};
fuzz(predictTheWinner, () => ({ nums: Array.from({ length: ri(1, 7) }, () => ri(0, 99)) }), ({ nums }) => predictRef(nums));

// 464: plain recursion without memo
const canWinRef = (m: number, total: number) => {
  if (total <= 0) return true;
  if ((m * (m + 1)) / 2 < total) return false;
  const win = (used: number, rem: number): boolean => {
    for (let i = 1; i <= m; i++) {
      if (used & (1 << (i - 1))) continue;
      if (i >= rem || !win(used | (1 << (i - 1)), rem - i)) return true;
    }
    return false;
  };
  return win(0, total);
};
fuzz(canIWin, () => ({ m: ri(1, 6), total: ri(0, 21) }), ({ m, total }) => canWinRef(m, total));
{
  // exhaustive step-count check for every input the parser accepts
  let worst = 0;
  let rejected = 0;
  for (let m = 1; m <= 6; m++) {
    for (let total = 0; total <= 21; total++) {
      const len = canIWin.buildSteps({ m, total }).length;
      if (len > 400) rejected++;
      else worst = Math.max(worst, len);
    }
  }
  console.log(`info 464-can-i-win: worst accepted ${worst} steps; ${rejected} inputs would be rejected by parseInput`);
  for (let m = 1; m <= 6; m++) {
    for (let total = 0; total <= 21; total++) {
      let threw = false;
      try {
        canIWin.parseInput(`${m} ; ${total}`);
      } catch {
        threw = true;
      }
      if (threw !== canIWin.buildSteps({ m, total }).length > 400) {
        failures++;
        console.log(`FAIL can-i-win parse cap mismatch for ${m} ; ${total}`);
      }
    }
  }
}

// 1406: full game search tracking both scores
const stone3Ref = (v: number[]) => {
  const play = (i: number, alice: boolean, a: number, b: number): number => {
    if (i >= v.length) return a - b;
    let best = alice ? -Infinity : Infinity;
    let s = 0;
    for (let k = 1; k <= 3 && i + k <= v.length; k++) {
      s += v[i + k - 1];
      const r = play(i + k, !alice, a + (alice ? s : 0), b + (alice ? 0 : s));
      best = alice ? Math.max(best, r) : Math.min(best, r);
    }
    return best;
  };
  const d = play(0, true, 0, 0);
  return d > 0 ? 'Alice' : d < 0 ? 'Bob' : 'Tie';
};
fuzz(stoneGameIII, () => ({ stones: Array.from({ length: ri(1, 10) }, () => ri(-9, 9)) }), ({ stones }) => stone3Ref(stones));

// 847: Floyd + permutations
const allNodesRef = (n: number, edges: [number, number][]) => {
  const INF = 1e9;
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : INF)));
  for (const [a, b] of edges) d[a][b] = d[b][a] = 1;
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) d[i][j] = Math.min(d[i][j], d[i][k] + d[k][j]);
  let best = INF;
  const used = Array(n).fill(false);
  const go = (last: number, cnt: number, cost: number) => {
    if (cnt === n) {
      best = Math.min(best, cost);
      return;
    }
    for (let v = 0; v < n; v++) {
      if (used[v]) continue;
      used[v] = true;
      go(v, cnt + 1, last < 0 ? 0 : cost + d[last][v]);
      used[v] = false;
    }
  };
  go(-1, 0, 0);
  return best;
};
const randConnected = (n: number): [number, number][] => {
  for (;;) {
    const edges: [number, number][] = [];
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (rand() < 0.45) edges.push([a, b]);
    // connectivity
    const seen = new Set([0]);
    const st = [0];
    while (st.length) {
      const u = st.pop()!;
      for (const [p, q] of edges) {
        const w = p === u ? q : q === u ? p : -1;
        if (w >= 0 && !seen.has(w)) {
          seen.add(w);
          st.push(w);
        }
      }
    }
    if (seen.size === n) return edges;
  }
};
fuzz(shortestPathVisitingAllNodes, () => {
  const n = ri(1, 5);
  return { n, edges: randConnected(n) };
}, ({ n, edges }) => allNodesRef(n, edges));
{
  // worst-case step count over every connected graph on 5 nodes (and also the parser path)
  const pairs: [number, number][] = [];
  for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) pairs.push([a, b]);
  let worst = 0;
  for (let m = 0; m < 1 << pairs.length; m++) {
    const edges = pairs.filter((_, i) => (m >> i) & 1);
    const text = `5 ; ${edges.length ? edges.map(([a, b]) => `${a}-${b}`).join(' ') : 'none'}`;
    let inp;
    try {
      inp = shortestPathVisitingAllNodes.parseInput(text);
    } catch {
      continue; // disconnected
    }
    worst = Math.max(worst, shortestPathVisitingAllNodes.buildSteps(inp).length);
  }
  console.log(`info 847: worst steps over all connected 5-node graphs = ${worst}`);
}

// 698: backtracking with k buckets
const kSubsetsRef = (nums: number[], k: number) => {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % k) return false;
  const t = total / k;
  const arr = [...nums].sort((a, b) => b - a);
  if (arr[0] > t) return false;
  const buckets = Array(k).fill(0);
  const go = (i: number): boolean => {
    if (i === arr.length) return buckets.every((b) => b === t);
    for (let b = 0; b < k; b++) {
      if (buckets[b] + arr[i] > t) continue;
      buckets[b] += arr[i];
      if (go(i + 1)) return true;
      buckets[b] -= arr[i];
    }
    return false;
  };
  return go(0);
};
fuzz(partitionToKEqualSumSubsets, () => {
  const n = ri(1, 6);
  const k = ri(1, n);
  // bias toward feasible inputs: sometimes build from k equal groups
  if (rand() < 0.5 && n >= k) {
    const target = ri(3, 9);
    const nums: number[] = [];
    let groups = k;
    for (let g = 0; g < k && nums.length < n; g++) {
      let left = target;
      while (left > 0 && nums.length < n - (groups - 1 - g)) {
        const x = Math.min(left, ri(1, 9));
        nums.push(x);
        left -= x;
      }
      if (left > 0) nums.push(...[]);
    }
    if (nums.length >= 1 && nums.length <= 6 && nums.every((x) => x >= 1 && x <= 9)) return { nums, k: Math.min(k, nums.length) };
  }
  return { nums: Array.from({ length: n }, () => ri(1, 9)), k };
}, ({ nums, k }) => kSubsetsRef(nums, k));

// TSP: all permutations
const tspRef = (d: number[][]) => {
  const n = d.length;
  let best = Infinity;
  const used = Array(n).fill(false);
  used[0] = true;
  const go = (last: number, cnt: number, cost: number) => {
    if (cnt === n) {
      best = Math.min(best, cost + d[last][0]);
      return;
    }
    for (let v = 1; v < n; v++) {
      if (used[v]) continue;
      used[v] = true;
      go(v, cnt + 1, cost + d[last][v]);
      used[v] = false;
    }
  };
  go(0, 1, 0);
  return best;
};
fuzz(travellingSalesmanBitmask, () => {
  const n = ri(3, 6);
  const d = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) d[i][j] = d[j][i] = ri(1, 99);
  return { d };
}, ({ d }) => tspRef(d), 120);

// 312: try every burst order
const burstRef = (nums: number[]): number => {
  if (!nums.length) return 0;
  let best = 0;
  for (let i = 0; i < nums.length; i++) {
    const gain = (nums[i - 1] ?? 1) * nums[i] * (nums[i + 1] ?? 1);
    best = Math.max(best, gain + burstRef([...nums.slice(0, i), ...nums.slice(i + 1)]));
  }
  return best;
};
fuzz(burstBalloons, () => ({ nums: Array.from({ length: ri(1, 7) }, () => ri(0, 9)) }), ({ nums }) => burstRef(nums));

// matrix chain: enumerate every bracketing recursively
const mcmRef = (d: number[]) => {
  const go = (i: number, j: number): number => {
    if (i === j) return 0;
    let best = Infinity;
    for (let k = i; k < j; k++) best = Math.min(best, go(i, k) + go(k + 1, j) + d[i] * d[k + 1] * d[j + 1]);
    return best;
  };
  return go(0, d.length - 2);
};
fuzz(matrixChainMultiplication, () => ({ dims: Array.from({ length: ri(3, 7) }, () => ri(1, 50)) }), ({ dims }) => mcmRef(dims));

// 664: BFS over printed strings (0 = blank)
const printerRef = (target: string) => {
  const n = target.length;
  const letters = [...new Set(target)];
  const start = '0'.repeat(n);
  const dist = new Map<string, number>([[start, 0]]);
  const q = [start];
  for (let h = 0; h < q.length; h++) {
    const cur = q[h];
    if (cur === target) return dist.get(cur)!;
    for (let a = 0; a < n; a++) {
      for (let b = a; b < n; b++) {
        for (const c of letters) {
          const nx = cur.slice(0, a) + c.repeat(b - a + 1) + cur.slice(b + 1);
          if (!dist.has(nx)) {
            dist.set(nx, dist.get(cur)! + 1);
            q.push(nx);
          }
        }
      }
    }
  }
  return -1;
};
fuzz(strangePrinter, () => {
  const n = ri(1, 7);
  const k = ri(1, 3);
  return { s: Array.from({ length: n }, () => String.fromCharCode(97 + ri(0, k - 1))).join('') };
}, ({ s }) => printerRef(s.split('').filter((c, i) => i === 0 || c !== s[i - 1]).join('')), 150);

// trees
const randTokens = (maxNodes: number, valLo: number, valHi: number): (number | null)[] => {
  const k = ri(1, maxNodes);
  const nodes: { l: number | null; r: number | null }[] = [{ l: null, r: null }];
  const q2 = [0];
  let c2 = 1;
  for (let h = 0; h < q2.length && c2 < k; h++) {
    const id = q2[h];
    if (rand() < 0.65 && c2 < k) {
      nodes[id].l = c2;
      nodes.push({ l: null, r: null });
      q2.push(c2++);
    }
    if (rand() < 0.65 && c2 < k) {
      nodes[id].r = c2;
      nodes.push({ l: null, r: null });
      q2.push(c2++);
    }
    if (h === q2.length - 1 && c2 < k) {
      nodes[id].l = nodes[id].l ?? c2;
      if (nodes[id].l === c2) {
        nodes.push({ l: null, r: null });
        q2.push(c2++);
      }
    }
  }
  const toks: (number | null)[] = [];
  const bq: (number | null)[] = [0];
  for (let h = 0; h < bq.length; h++) {
    const id = bq[h];
    if (id === null) {
      toks.push(null);
      continue;
    }
    toks.push(ri(valLo, valHi));
    bq.push(nodes[id].l, nodes[id].r);
  }
  while (toks.length && toks[toks.length - 1] === null) toks.pop();
  return toks;
};
const treeParts = (tokens: (number | null)[]) => {
  const nodes = buildTree(tokens);
  const parent: number[] = Array(nodes.length).fill(-1);
  nodes.forEach((n) => {
    if (n.left !== null) parent[n.left] = n.id;
    if (n.right !== null) parent[n.right] = n.id;
  });
  return { nodes, parent };
};

fuzz(houseRobberIII, () => ({ tokens: randTokens(12, 0, 99) }), ({ tokens }) => {
  const { nodes, parent } = treeParts(tokens);
  let best = 0;
  for (let m = 0; m < 1 << nodes.length; m++) {
    let ok = true;
    let sum = 0;
    for (let i = 0; i < nodes.length && ok; i++) {
      if (!((m >> i) & 1)) continue;
      sum += Number(nodes[i].value);
      if (parent[i] >= 0 && (m >> parent[i]) & 1) ok = false;
    }
    if (ok) best = Math.max(best, sum);
  }
  return best;
});

fuzz(binaryTreeCameras, () => ({ tokens: randTokens(12, 0, 0) }), ({ tokens }) => {
  const { nodes, parent } = treeParts(tokens);
  let best = Infinity;
  for (let m = 0; m < 1 << nodes.length; m++) {
    let cnt = 0;
    for (let i = 0; i < nodes.length; i++) cnt += (m >> i) & 1;
    if (cnt >= best) continue;
    let ok = true;
    for (let i = 0; i < nodes.length && ok; i++) {
      const n = nodes[i];
      const covered = ((m >> i) & 1) || (parent[i] >= 0 && (m >> parent[i]) & 1) || (n.left !== null && (m >> n.left) & 1) || (n.right !== null && (m >> n.right) & 1);
      if (!covered) ok = false;
    }
    if (ok) best = cnt;
  }
  return best;
});

// digit problems: brute-force loops
fuzz(numbersAtMostNGivenDigitSet, () => {
  const all = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(() => rand() < 0.4);
  if (!all.length) all.push(ri(1, 9));
  return { digits: all, n: rand() < 0.8 ? ri(1, 60000) : ri(1, 999999) };
}, ({ digits, n }) => {
  const set = new Set(digits.map(String));
  let c = 0;
  for (let x = 1; x <= n; x++) if ([...String(x)].every((ch) => set.has(ch))) c++;
  return c;
}, 120);
fuzz(countSpecialIntegers, () => ({ n: rand() < 0.5 ? ri(1, 3000) : ri(1, 999999) }), ({ n }) => {
  let c = 0;
  for (let x = 1; x <= n; x++) {
    const s = String(x);
    if (new Set(s).size === s.length) c++;
  }
  return c;
}, 120);
fuzz(countNumbersWithDigitSum, () => ({ n: ri(1, 99999), target: ri(1, 15) }), ({ n, target }) => {
  let c = 0;
  for (let x = 0; x <= n; x++) {
    let s = 0;
    for (let y = x; y > 0; y = Math.floor(y / 10)) s += y % 10;
    if (s === target) c++;
  }
  return c;
}, 150);

console.log(`max steps seen: ${maxSteps}`);
if (failures) {
  console.log(`\n${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('\nall pack p7 fuzz checks passed');
