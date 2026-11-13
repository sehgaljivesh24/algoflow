/**
 * Fuzz for pack p5 sub-group b: 547, 269, 310, 1514, 1631, Bellman-Ford (negative edges), negative-cycle detection.
 * Random raw inputs (so parseInput is exercised), final result vs a plain reference, aliasing check, checkScene on every step.
 * Run:  node scripts/fuzz-pack5b.mts   (env FUZZ_N=200, FUZZ_ONLY=<slug part>)
 */
import { rng } from '../src/problems/graphKit.ts';
import { checkScene } from './check-scenes.mts';
import { numberOfProvinces } from '../src/problems/numberOfProvinces.ts';
import { alienDictionary } from '../src/problems/alienDictionary.ts';
import { minimumHeightTrees } from '../src/problems/minimumHeightTrees.ts';
import { pathWithMaximumProbability } from '../src/problems/pathWithMaximumProbability.ts';
import { pathWithMinimumEffort } from '../src/problems/pathWithMinimumEffort.ts';
import { bellmanFordNegativeEdges } from '../src/problems/bellmanFordNegativeEdges.ts';
import { negativeCycleArbitrage } from '../src/problems/negativeCycleArbitrage.ts';

const N = Number(process.env.FUZZ_N ?? 200);
const ONLY = process.env.FUZZ_ONLY;
type R = () => number;
const ri = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const shuffle = <T,>(r: R, a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = ri(r, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; };

let failures = 0;
const fail = (slug: string, raw: string, msg: string) => {
  failures++;
  if (failures <= 25) console.log(`FAIL ${slug} [${raw}]: ${msg}`);
};

interface Case { slug: string; def: any; gen: (r: R) => string; ref: (input: any, resultTitle: string, raw: string, resultText: string) => string | null }
const cases: Case[] = [];

/** distinct node pairs, up to `count` of them */
function pairs(r: R, n: number, count: number, directed: boolean): [number, number][] {
  const all: [number, number][] = [];
  for (let a = 0; a < n; a++) for (let b = directed ? 0 : a + 1; b < n; b++) if (a !== b) all.push([a, b]);
  return shuffle(r, all).slice(0, Math.min(count, all.length)).map(([a, b]): [number, number] => (!directed && r() < 0.5 ? [b, a] : [a, b]));
}

// ------------------------------------------------------------ 547 number of provinces
cases.push({
  slug: '547-number-of-provinces', def: numberOfProvinces,
  gen: (r) => {
    const n = ri(r, 1, 9);
    const es = pairs(r, n, ri(r, 0, Math.min(14, n + 2)), false);
    return `${n} ${es.map(([a, b]) => `${a}-${b}`).join(' ')}`;
  },
  ref: ({ n, edges }, title) => {
    // brute force: transitive closure of the boolean adjacency matrix, then count distinct rows
    const m = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j));
    edges.forEach((e: any) => { m[e.u][e.v] = true; m[e.v][e.u] = true; });
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (m[i][k] && m[k][j]) m[i][j] = true;
    const seen = new Set<string>();
    for (let i = 0; i < n; i++) seen.add(m[i].map((x) => (x ? 1 : 0)).join(''));
    return String(seen.size) === title ? null : `expected ${seen.size} got ${title}`;
  },
});

// ------------------------------------------------------------ 269 alien dictionary
cases.push({
  slug: '269-alien-dictionary', def: alienDictionary,
  gen: (r) => {
    const k = ri(r, 2, 5);
    const alpha = 'abcdefghij'.slice(0, k).split('');
    const nw = ri(r, 1, 7);
    const words = Array.from({ length: nw }, () => Array.from({ length: ri(r, 1, 4) }, () => alpha[ri(r, 0, k - 1)]).join(''));
    if (r() < 0.55) {
      // make it a consistent dictionary for a random alphabet order
      const perm = shuffle(r, alpha);
      const rank = (c: string) => perm.indexOf(c);
      const cmp = (a: string, b: string) => { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return rank(a[i]) - rank(b[i]); return a.length - b.length; };
      words.sort(cmp);
    }
    return words.join(' ');
  },
  ref: ({ words }, title) => {
    const letters = [...new Set((words as string[]).join(''))];
    const cons = new Set<string>();
    let invalid = false;
    for (let i = 0; i + 1 < words.length; i++) {
      const a = words[i], b = words[i + 1];
      let j = 0;
      while (j < Math.min(a.length, b.length) && a[j] === b[j]) j++;
      if (j === Math.min(a.length, b.length)) { if (a.length > b.length) invalid = true; } else cons.add(a[j] + b[j]);
    }
    // cycle check by repeatedly removing letters with no remaining predecessor
    const rest = new Set(letters);
    const c = [...cons];
    for (;;) {
      const free = [...rest].filter((x) => !c.some((p) => p[1] === x && rest.has(p[0])));
      if (!free.length) break;
      free.forEach((x) => rest.delete(x));
    }
    const impossible = invalid || rest.size > 0;
    const got = title === '""' ? '' : title.replace(/"/g, '');
    if (impossible) return got === '' ? null : `expected "" got ${title}`;
    if (got.length !== letters.length || new Set(got).size !== letters.length || ![...got].every((x) => letters.includes(x))) return `not a permutation of the letters: ${title}`;
    return c.every((p) => got.indexOf(p[0]) < got.indexOf(p[1])) ? null : `order ${got} violates a constraint`;
  },
});

// ------------------------------------------------------------ 310 minimum height trees
cases.push({
  slug: '310-minimum-height-trees', def: minimumHeightTrees,
  gen: (r) => {
    const n = ri(r, 1, 10);
    const lab = shuffle(r, Array.from({ length: n }, (_, i) => i));
    const es: string[] = [];
    for (let i = 1; i < n; i++) {
      const a = lab[i];
      const b = lab[ri(r, r() < 0.5 ? 0 : Math.max(0, i - 2), i - 1)];
      es.push(r() < 0.5 ? `${a}-${b}` : `${b}-${a}`);
    }
    return `${n} ${shuffle(r, es).join(' ')}`;
  },
  ref: ({ n, edges }, title) => {
    const adj: number[][] = Array.from({ length: n }, () => []);
    edges.forEach((e: any) => { adj[e.u].push(e.v); adj[e.v].push(e.u); });
    const heights = Array.from({ length: n }, (_, root) => {
      let h = 0;
      const dist = new Array(n).fill(-1);
      dist[root] = 0;
      const q = [root];
      for (let i = 0; i < q.length; i++) for (const v of adj[q[i]]) if (dist[v] < 0) { dist[v] = dist[q[i]] + 1; h = Math.max(h, dist[v]); q.push(v); }
      return h;
    });
    const mn = Math.min(...heights);
    const exp = `[${heights.map((h, i) => (h === mn ? i : -1)).filter((x) => x >= 0).join(', ')}]`;
    return exp === title ? null : `expected ${exp} got ${title}`;
  },
});

// ------------------------------------------------------------ 1514 path with maximum probability
cases.push({
  slug: '1514-path-with-maximum-probability', def: pathWithMaximumProbability,
  gen: (r) => {
    const n = ri(r, 2, 8);
    const s = ri(r, 0, n - 1);
    let e = ri(r, 0, n - 1);
    while (e === s) e = ri(r, 0, n - 1);
    const es = pairs(r, n, ri(r, 0, 12), false);
    const probs = ['0.5', '0.25', '0.9', '0.01', '1', '1.0', '.5', '0.99', '0.3', '0.75', '0.1', '0.05'];
    return `${n} ${s} ${e} ${es.map(([a, b]) => `${a}-${b}:${probs[ri(r, 0, probs.length - 1)]}`).join(' ')}`;
  },
  ref: ({ n, start, end, edges }, title) => {
    const best = new Array(n).fill(0);
    best[start] = 1;
    for (let it = 0; it < n; it++) {
      for (const e of edges) {
        best[e.v] = Math.max(best[e.v], best[e.u] * e.p);
        best[e.u] = Math.max(best[e.u], best[e.v] * e.p);
      }
    }
    return Math.abs(Number(title) - best[end]) < 1e-5 && /^\d\.\d{5}$/.test(title) ? null : `expected ${best[end].toFixed(5)} got ${title}`;
  },
});

// ------------------------------------------------------------ 1631 path with minimum effort
cases.push({
  slug: '1631-path-with-minimum-effort', def: pathWithMinimumEffort,
  gen: (r) => {
    const rows = ri(r, 1, 4);
    let cols = ri(r, 1, 5);
    if (rows * cols < 2) cols = 2;
    const hi = r() < 0.5 ? 9 : 60;
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ri(r, 1, hi)).join(r() < 0.5 ? ' ' : ',')).join('/');
  },
  ref: ({ grid }, title) => {
    const rows = grid.length, cols = grid[0].length;
    const eff: number[][] = grid.map((row: number[]) => row.map(() => Infinity));
    eff[0][0] = 0;
    for (let changed = true; changed;) {
      changed = false;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        const v = Math.max(eff[r][c], Math.abs(grid[r][c] - grid[nr][nc]));
        if (v < eff[nr][nc]) { eff[nr][nc] = v; changed = true; }
      }
    }
    const exp = eff[rows - 1][cols - 1];
    return String(exp) === title ? null : `expected ${exp} got ${title}`;
  },
});

/** Floyd-Warshall on a directed weighted edge list (an independent reference for both Bellman-Ford problems). */
function fw(n: number, edges: { u: number; v: number; w: number }[]) {
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
  edges.forEach((e) => { d[e.u][e.v] = Math.min(d[e.u][e.v], e.w); });
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
  return d;
}
const genSigned = (r: R, withSrc: boolean, negFrac: number) => {
  const n = ri(r, 2, 8);
  const src = ri(r, 0, n - 1);
  const es = pairs(r, n, ri(r, 1, 12), true);
  const body = es.map(([a, b]) => `${a}>${b}:${r() < negFrac ? ri(r, -9, -1) : ri(r, 0, 9)}`).join(' ');
  return withSrc ? `${n} ${src} ${body}` : `${n} ${body}`;
};

// ------------------------------------------------------------ Bellman-Ford, negative edges
cases.push({
  slug: 'alg-bellman-ford-shortest-paths-negative-edges', def: bellmanFordNegativeEdges,
  gen: (r) => genSigned(r, true, r() < 0.5 ? 0.12 : 0.3),
  ref: ({ n, src, edges }, title) => {
    const d = fw(n, edges.map((e: any) => ({ u: e.u, v: e.v, w: e.w })));
    let cycle = false;
    for (let v = 0; v < n; v++) if (d[src][v] < Infinity && d[v][v] < 0) cycle = true;
    if (cycle) return title === 'negative cycle' ? null : `expected negative cycle got ${title}`;
    const exp = `[${d[src].map((x) => (x === Infinity ? '∞' : String(x))).join(', ')}]`;
    return exp === title ? null : `expected ${exp} got ${title}`;
  },
});

// ------------------------------------------------------------ negative cycle detection (arbitrage)
cases.push({
  slug: 'cp-negative-cycle-detection-currency-arbitrage', def: negativeCycleArbitrage,
  gen: (r) => genSigned(r, false, r() < 0.5 ? 0.12 : 0.3),
  ref: ({ n, edges }, title, _raw, text) => {
    const d = fw(n, edges.map((e: any) => ({ u: e.u, v: e.v, w: e.w })));
    const cycle = d.some((row, i) => row[i] < 0);
    if (title !== (cycle ? 'true' : 'false')) return `expected ${cycle} got ${title}`;
    if (!cycle) return null;
    // validate the reported cycle: a closed loop of real edges with negative total
    const m = /Negative cycle: ([\d → ]+) \(total (-?\d+)\)/.exec(text);
    if (!m) return `cannot parse cycle from "${text}"`;
    const nodes = m[1].split(' → ').map(Number);
    if (nodes[0] !== nodes[nodes.length - 1] || nodes.length < 3) return `not a closed loop: ${m[1]}`;
    if (new Set(nodes.slice(1)).size !== nodes.length - 1) return `loop repeats a node: ${m[1]}`;
    let total = 0;
    for (let i = 0; i + 1 < nodes.length; i++) {
      const e = edges.find((x: any) => x.u === nodes[i] && x.v === nodes[i + 1]);
      if (!e) return `hop ${nodes[i]}>${nodes[i + 1]} is not an edge`;
      total += e.w;
    }
    return total < 0 && total === Number(m[2]) ? null : `bad total: computed ${total}, reported ${m[2]}`;
  },
});

const tally: Record<string, { cyc: number }> = {};
for (const c of cases) {
  if (ONLY && !c.slug.includes(ONLY)) continue;
  const r = rng(0xb5b5 ^ c.slug.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
  let n = 0;
  tally[c.slug] = { cyc: 0 };
  const lens: number[] = [];
  for (let t = 0; t < N; t++) {
    const raw = c.gen(r);
    let input: any;
    try { input = c.def.parseInput(raw); } catch (e) { fail(c.slug, raw, `parseInput rejected generated input: ${(e as Error).message}`); continue; }
    let steps: any[];
    try { steps = c.def.buildSteps(input); } catch (e) { fail(c.slug, raw, `buildSteps threw ${(e as Error).stack}`); continue; }
    lens.push(steps.length);
    if (steps.length > 400) fail(c.slug, raw, `too many steps ${steps.length}`);
    const owner = new Map<object, number>();
    let aliased = false;
    const visit = (o: any, si: number) => {
      if (!o || typeof o !== 'object' || aliased) return;
      if (Array.isArray(o) && owner.has(o) && owner.get(o) !== si) { aliased = true; return; }
      owner.set(o, si);
      for (const k of Object.keys(o)) visit(o[k], si);
    };
    steps.forEach((s, si) => visit({ scene: s.scene, aux: s.aux, cells: s.cells, pointers: s.pointers }, si));
    if (aliased) fail(c.slug, raw, 'a scene/aux object is shared between two steps (copy it when snapshotting)');
    if (JSON.stringify(c.def.buildSteps(input)) !== JSON.stringify(steps)) fail(c.slug, raw, 'not deterministic');
    const res = steps[steps.length - 1]?.result;
    if (!res) { fail(c.slug, raw, 'no result on final step'); continue; }
    steps.slice(0, -1).forEach((s, i) => { if (s.result) fail(c.slug, raw, `step ${i} already has a result`); });
    if (res.title === 'true' || res.title === 'negative cycle') tally[c.slug].cyc++;
    const msg = c.ref(input, res.title, raw, res.text);
    if (msg) fail(c.slug, raw, msg);
    steps.forEach((s, i) => checkScene(s, `${c.slug} [${raw}] step ${i}`, (name, cond, extra) => { if (!cond) fail(c.slug, raw, `${name} ${extra ?? ''}`); }));
    n++;
  }
  console.log(`${c.slug}: ${n}/${N} inputs ok, steps min ${Math.min(...lens)} max ${Math.max(...lens)}${tally[c.slug].cyc ? `, ${tally[c.slug].cyc} with a negative cycle` : ''}`);
}
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL FUZZ CHECKS PASSED');
process.exit(failures ? 1 : 0);
