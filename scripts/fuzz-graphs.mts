/**
 * Fuzz for the graph / intervals / trie problems: random valid inputs (built as raw strings, so parseInput is exercised too),
 * the animation's final result is compared with a plain reference solution, and every step's scene goes through
 * checkScene. Run:  node scripts/fuzz-graphs.mts   (env FUZZ_N=200, FUZZ_ONLY=<slug part>)
 */
import { rng } from '../src/problems/graphKit.ts';
import { checkScene } from './check-scenes.mts';
import { redundantConnection } from '../src/problems/redundantConnection.ts';
import { courseScheduleII } from '../src/problems/courseScheduleII.ts';
import { networkDelayTime } from '../src/problems/networkDelayTime.ts';
import { cheapestFlights } from '../src/problems/cheapestFlights.ts';
import { minCostConnectPoints } from '../src/problems/minCostConnectPoints.ts';
import { rottingOranges } from '../src/problems/rottingOranges.ts';
import { mergeIntervals } from '../src/problems/mergeIntervals.ts';
import { insertInterval } from '../src/problems/insertInterval.ts';
import { meetingRoomsII } from '../src/problems/meetingRoomsII.ts';
import { nonOverlappingIntervals } from '../src/problems/nonOverlappingIntervals.ts';
import { minimumArrows } from '../src/problems/minimumArrows.ts';
import { implementTrie } from '../src/problems/implementTrie.ts';
import { wordSearchII } from '../src/problems/wordSearchII.ts';
import { validPath } from '../src/problems/validPath.ts';
import { cloneGraph } from '../src/problems/cloneGraph.ts';
import { courseSchedule } from '../src/problems/courseSchedule.ts';
import { isGraphATree } from '../src/problems/isGraphATree.ts';
import { pacificAtlantic } from '../src/problems/pacificAtlantic.ts';
import { evaluateDivision } from '../src/problems/evaluateDivision.ts';
import { wordLadder } from '../src/problems/wordLadder.ts';

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

interface Case { slug: string; def: any; gen: (r: R) => string; ref: (input: any, resultTitle: string, raw: string) => string | null; allowReject?: RegExp }

/** ref returns null when the result is correct, otherwise a message. */
const cases: Case[] = [];

// ---------------------------------------------------------------- 684
cases.push({
  slug: '684', def: redundantConnection,
  gen: (r) => {
    const n = ri(r, 3, 9);
    const lab = shuffle(r, Array.from({ length: n }, (_, i) => i + 1));
    const es: [number, number][] = [];
    const key = new Set<string>();
    const add = (a: number, b: number) => { key.add(`${Math.min(a, b)}-${Math.max(a, b)}`); es.push(r() < 0.5 ? [a, b] : [b, a]); };
    for (let i = 1; i < n; i++) add(lab[i], lab[ri(r, 0, i - 1)]);
    for (;;) {
      const a = lab[ri(r, 0, n - 1)];
      const b = lab[ri(r, 0, n - 1)];
      if (a !== b && !key.has(`${Math.min(a, b)}-${Math.max(a, b)}`)) { add(a, b); break; }
    }
    return shuffle(r, es).map(([a, b]) => `${a}-${b}`).join(' ');
  },
  ref: ({ edges }, title) => {
    const n = edges.length;
    let ans = '';
    for (let skip = n - 1; skip >= 0 && !ans; skip--) {
      const p = Array.from({ length: n + 1 }, (_, i) => i);
      const f = (x: number): number => (p[x] === x ? x : (p[x] = f(p[x])));
      edges.forEach((e: any, i: number) => { if (i !== skip) p[f(e.u)] = f(e.v); });
      if (new Set(Array.from({ length: n }, (_, i) => f(i + 1))).size === 1) ans = `[${edges[skip].u}, ${edges[skip].v}]`;
    }
    return ans === title ? null : `expected ${ans} got ${title}`;
  },
});

// ---------------------------------------------------------------- 210
cases.push({
  slug: '210', def: courseScheduleII,
  gen: (r) => {
    const n = ri(r, 1, 8);
    const es = new Set<string>();
    const target = ri(r, 0, Math.min(14, n * 2));
    const dag = r() < 0.6;
    const perm = shuffle(r, Array.from({ length: n }, (_, i) => i));
    for (let t = 0; t < target * 3 && es.size < target && n > 1; t++) {
      const a = ri(r, 0, n - 1);
      const b = ri(r, 0, n - 1);
      if (a === b) continue;
      if (dag && perm.indexOf(a) > perm.indexOf(b)) es.add(`${b}>${a}`); else es.add(`${a}>${b}`);
    }
    return `${n} ${[...es].join(' ')}`;
  },
  ref: ({ n, edges }, title) => {
    const indeg = new Array(n).fill(0);
    edges.forEach((e: any) => indeg[e.v]++);
    const q: number[] = [];
    indeg.forEach((d, i) => d === 0 && q.push(i));
    let seen = 0;
    for (let h = 0; h < q.length; h++) { seen++; for (const e of edges) if (e.u === q[h] && --indeg[e.v] === 0) q.push(e.v); }
    const cyc = seen < n;
    if (cyc) return title === '[]' ? null : `expected [] got ${title}`;
    const order = title.replace(/[\[\]\s]/g, '').split(',').map(Number);
    if (order.length !== n || new Set(order).size !== n) return `bad permutation ${title}`;
    const pos = new Map(order.map((c, i) => [c, i]));
    return edges.every((e: any) => pos.get(e.u)! < pos.get(e.v)!) ? null : `order violates an edge: ${title}`;
  },
});

// ---------------------------------------------------------------- 743
cases.push({
  slug: '743', def: networkDelayTime,
  gen: (r) => {
    const n = ri(r, 2, 8);
    const m = ri(r, 1, Math.min(14, n * 2));
    const es: string[] = [];
    for (let i = 0; i < m; i++) {
      const a = ri(r, 1, n);
      let b = ri(r, 1, n);
      if (a === b) b = (a % n) + 1;
      es.push(`${a}>${b}:${ri(r, 0, 12)}`);
    }
    return `${n} ${ri(r, 1, n)} ${es.join(' ')}`;
  },
  ref: ({ n, k, edges }, title) => {
    const d = new Array(n + 1).fill(Infinity);
    d[k] = 0;
    for (let it = 0; it < n; it++) for (const e of edges) if (d[e.u] + e.w < d[e.v]) d[e.v] = d[e.u] + e.w;
    const m = Math.max(...d.slice(1));
    const exp = m === Infinity ? '-1' : String(m);
    return exp === title ? null : `expected ${exp} got ${title}`;
  },
});

// ---------------------------------------------------------------- 787
cases.push({
  slug: '787', def: cheapestFlights,
  gen: (r) => {
    const n = ri(r, 2, 7);
    const m = ri(r, 1, Math.min(12, n * 2));
    const es: string[] = [];
    for (let i = 0; i < m; i++) {
      const a = ri(r, 0, n - 1);
      let b = ri(r, 0, n - 1);
      if (a === b) b = (a + 1) % n;
      es.push(`${a}>${b}:${ri(r, 1, 30)}`);
    }
    const src = ri(r, 0, n - 1);
    const dst = (src + ri(r, 1, n - 1)) % n;
    return `${n} ${src} ${dst} ${ri(r, 0, 4)} ${es.join(' ')}`;
  },
  ref: ({ n, src, dst, k, edges }, title) => {
    // dp over exact number of flights, best = min over <= k+1 flights
    let cur = new Array(n).fill(Infinity);
    cur[src] = 0;
    let best = Infinity;
    for (let h = 1; h <= k + 1; h++) {
      const nxt = new Array(n).fill(Infinity);
      for (const e of edges) if (cur[e.u] + e.w < nxt[e.v]) nxt[e.v] = cur[e.u] + e.w;
      cur = nxt;
      best = Math.min(best, cur[dst]);
    }
    const exp = best === Infinity ? '-1' : String(best);
    return exp === title ? null : `expected ${exp} got ${title}`;
  },
});

// ---------------------------------------------------------------- 1584
cases.push({
  slug: '1584', def: minCostConnectPoints,
  gen: (r) => {
    const n = ri(r, 2, 7);
    const pts = new Set<string>();
    while (pts.size < n) pts.add(`${ri(r, -12, 12)},${ri(r, -12, 12)}`);
    return [...pts].join(' ');
  },
  ref: ({ pts }, title) => {
    const n = pts.length;
    const es: [number, number, number][] = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) es.push([Math.abs(pts[i][0] - pts[j][0]) + Math.abs(pts[i][1] - pts[j][1]), i, j]);
    es.sort((a, b) => a[0] - b[0]);
    const p = Array.from({ length: n }, (_, i) => i);
    const f = (x: number): number => (p[x] === x ? x : (p[x] = f(p[x])));
    let tot = 0;
    for (const [w, a, b] of es) if (f(a) !== f(b)) { p[f(a)] = f(b); tot += w; }
    return String(tot) === title ? null : `expected ${tot} got ${title}`;
  },
});

// ---------------------------------------------------------------- 994
cases.push({
  slug: '994', def: rottingOranges,
  gen: (r) => {
    const R = ri(r, 1, 6);
    const C = ri(r, 1, 8);
    const pf = r() * 0.8 + 0.1;
    return Array.from({ length: R }, () => Array.from({ length: C }, () => { const x = r(); return x < 0.2 ? '0' : x < 0.2 + pf * 0.6 ? '1' : '2'; }).join('')).join(' ');
  },
  ref: ({ grid }, title) => {
    const g = grid.map((s: string) => [...s].map(Number));
    let t = 0;
    for (;;) {
      const flip: [number, number][] = [];
      g.forEach((row: number[], r: number) => row.forEach((v, c) => {
        if (v !== 1) return;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => g[r + dr]?.[c + dc] === 2)) flip.push([r, c]);
      }));
      if (!flip.length) break;
      flip.forEach(([r, c]) => (g[r][c] = 2));
      t++;
    }
    const exp = g.flat().includes(1) ? '-1' : String(t);
    return exp === title ? null : `expected ${exp} got ${title}`;
  },
});

// ---------------------------------------------------------------- 56
cases.push({
  slug: '56-merge', def: mergeIntervals,
  gen: (r) => Array.from({ length: ri(r, 1, 8) }, () => { const a = ri(r, 0, 25); return `${a}-${a + ri(r, 0, 5)}`; }).join(' '),
  ref: ({ iv }, title) => {
    const pts = new Set<number>();
    iv.forEach(([a, b]: number[]) => { for (let x = a * 2; x <= b * 2; x++) pts.add(x); }); // half-units so touching != gap
    const xs = [...pts].sort((a, b) => a - b);
    const out: string[] = [];
    let s = xs[0];
    for (let i = 1; i <= xs.length; i++) if (i === xs.length || xs[i] !== xs[i - 1] + 1) { out.push(`[${s / 2}, ${xs[i - 1] / 2}]`); s = xs[i]; }
    const exp = out.join(' ');
    return exp === title ? null : `expected ${exp} got ${title}`;
  },
});

// ---------------------------------------------------------------- 57
cases.push({
  slug: '57-insert', def: insertInterval,
  gen: (r) => {
    const m = ri(r, 0, 6);
    let x = ri(r, 0, 3);
    const parts: string[] = [];
    for (let i = 0; i < m && x < 24; i++) { const e = x + ri(r, 1, 4); parts.push(`${x}-${e}`); x = e + ri(r, 1, 3); }
    const a = ri(r, 0, 24);
    return `${parts.join(' ')} | ${a}-${a + ri(r, 0, 6)}`;
  },
  ref: ({ iv, add }, title) => {
    const all = [...iv, add].sort((p: number[], q: number[]) => p[0] - q[0] || p[1] - q[1]);
    const out: number[][] = [];
    for (const [s, e] of all) { const l = out[out.length - 1]; if (l && s <= l[1]) l[1] = Math.max(l[1], e); else out.push([s, e]); }
    const exp = out.map(([a, b]) => `[${a}, ${b}]`).join(' ');
    return exp === title ? null : `expected ${exp} got ${title}`;
  },
});

// ---------------------------------------------------------------- 253
cases.push({
  slug: '253', def: meetingRoomsII,
  gen: (r) => Array.from({ length: ri(r, 1, 8) }, () => { const a = ri(r, 0, 22); return `${a}-${a + ri(r, 1, 8)}`; }).join(' '),
  ref: ({ iv }, title) => {
    let best = 0;
    for (let t = 0; t <= 40; t += 0.5) best = Math.max(best, iv.filter(([s, e]: number[]) => s <= t && t < e).length);
    return String(best) === title ? null : `expected ${best} got ${title}`;
  },
});

// ---------------------------------------------------------------- 435
cases.push({
  slug: '435', def: nonOverlappingIntervals,
  gen: (r) => Array.from({ length: ri(r, 1, 8) }, () => { const a = ri(r, 0, 20); return `${a}-${a + ri(r, 1, 8)}`; }).join(' '),
  ref: ({ iv }, title) => {
    // brute force: largest subset of pairwise non-overlapping intervals
    const n = iv.length;
    let keep = 0;
    for (let mask = 0; mask < 1 << n; mask++) {
      const pick = iv.filter((_: any, i: number) => mask & (1 << i)).sort((a: number[], b: number[]) => a[0] - b[0] || a[1] - b[1]);
      if (pick.every((p: number[], i: number) => i === 0 || pick[i - 1][1] <= p[0])) keep = Math.max(keep, pick.length);
    }
    return String(n - keep) === title ? null : `expected ${n - keep} got ${title}`;
  },
});

// ---------------------------------------------------------------- 452
cases.push({
  slug: '452', def: minimumArrows,
  gen: (r) => Array.from({ length: ri(r, 1, 8) }, () => { const a = ri(r, 0, 20); return `${a}-${a + ri(r, 1, 8)}`; }).join(' '),
  ref: ({ iv }, title) => {
    // smallest set of integer points hitting every range (brute force over subsets of candidate points)
    const pts = [...new Set(iv.map((p: number[]) => p[1]))] as number[];
    let best = Infinity;
    for (let mask = 1; mask < 1 << pts.length; mask++) {
      const chosen = pts.filter((_, i) => mask & (1 << i));
      if (iv.every(([s, e]: number[]) => chosen.some((x) => s <= x && x <= e))) best = Math.min(best, chosen.length);
    }
    return String(best) === title ? null : `expected ${best} got ${title}`;
  },
});

// ---------------------------------------------------------------- 208
cases.push({
  slug: '208', def: implementTrie,
  gen: (r) => {
    const pool = Array.from({ length: 6 }, () => Array.from({ length: ri(r, 1, 5) }, () => 'abc'[ri(r, 0, 2)]).join(''));
    const words = [...new Set(pool)].slice(0, 5);
    const ops = Array.from({ length: ri(r, 1, 8) }, () => {
      const k = ri(r, 0, 2);
      const w = r() < 0.5 ? words[ri(r, 0, words.length - 1)] : Array.from({ length: ri(r, 1, 5) }, () => 'abc'[ri(r, 0, 2)]).join('');
      return k === 0 ? `insert:${words[ri(r, 0, words.length - 1)]}` : k === 1 ? `search:${w}` : `startsWith:${w}`;
    });
    return ops.join(' ');
  },
  ref: ({ ops }, title) => {
    const set = new Set<string>();
    const out = ops.map((o: any) => {
      if (o.op === 'insert') { set.add(o.word); return 'null'; }
      if (o.op === 'search') return String(set.has(o.word));
      return String([...set].some((w) => w.startsWith(o.word)));
    });
    const exp = `[${out.join(', ')}]`;
    return exp === title ? null : `expected ${exp} got ${title}`;
  },
});

// ---------------------------------------------------------------- 212
cases.push({
  slug: '212', def: wordSearchII, allowReject: /too many paths/,
  gen: (r) => {
    const R = ri(r, 1, 4);
    const C = ri(r, 1, 4);
    const alpha = 'abcd'.slice(0, ri(r, 2, 4));
    const board = Array.from({ length: R }, () => Array.from({ length: C }, () => alpha[ri(r, 0, alpha.length - 1)]).join(''));
    const words = new Set<string>();
    for (let t = 0; t < ri(r, 1, 4); t++) {
      if (r() < 0.5) {
        // a real path through the board
        let rr = ri(r, 0, R - 1), cc = ri(r, 0, C - 1), w = board[rr][cc];
        const seen = new Set([`${rr},${cc}`]);
        for (let k = ri(r, 1, 4); k > 0; k--) {
          const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [rr + a, cc + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < R && b < C && !seen.has(`${a},${b}`));
          if (!nb.length) break;
          [rr, cc] = nb[ri(r, 0, nb.length - 1)];
          seen.add(`${rr},${cc}`);
          w += board[rr][cc];
        }
        words.add(w);
      } else words.add(Array.from({ length: ri(r, 1, 5) }, () => alpha[ri(r, 0, alpha.length - 1)]).join(''));
    }
    return `${board.join(' ')} | ${[...words].slice(0, 4).join(' ')}`;
  },
  ref: ({ board, words }, title) => {
    const R = board.length, C = board[0].length;
    const has = (w: string) => {
      const go = (r: number, c: number, k: number, seen: Set<string>): boolean => {
        if (r < 0 || c < 0 || r >= R || c >= C || seen.has(`${r},${c}`) || board[r][c] !== w[k]) return false;
        if (k === w.length - 1) return true;
        seen.add(`${r},${c}`);
        const ok = go(r + 1, c, k + 1, seen) || go(r - 1, c, k + 1, seen) || go(r, c + 1, k + 1, seen) || go(r, c - 1, k + 1, seen);
        seen.delete(`${r},${c}`);
        return ok;
      };
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (go(r, c, 0, new Set())) return true;
      return false;
    };
    const exp = words.filter(has).sort().join(',');
    const got = title.replace(/[\[\]\s]/g, '').split(',').filter(Boolean).sort().join(',');
    return exp === got ? null : `expected ${exp} got ${got}`;
  },
});

// ---------------------------------------------------------------- helpers for undirected cases
const randEdges = (r: R, n: number, base: number, maxE: number, directed = false): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  const m = ri(r, 0, Math.min(maxE, n * 2));
  for (let t = 0; t < m * 3 && out.length < m; t++) {
    const a = ri(r, 0, n - 1);
    const b = ri(r, 0, n - 1);
    const k = directed ? `${a}>${b}` : `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (a === b || seen.has(k)) continue;
    seen.add(k);
    out.push(directed ? `${a + base}>${b + base}` : `${a + base}-${b + base}`);
  }
  return out;
};
const components = (n: number, edges: { u: number; v: number }[], base: number) => {
  const p = Array.from({ length: n }, (_, i) => i);
  const f = (x: number): number => (p[x] === x ? x : (p[x] = f(p[x])));
  edges.forEach((e) => { p[f(e.u - base)] = f(e.v - base); });
  return f;
};

// ---------------------------------------------------------------- 1971
cases.push({
  slug: '1971', def: validPath,
  gen: (r) => { const n = ri(r, 2, 8); return `${n} ${ri(r, 0, n - 1)} ${ri(r, 0, n - 1)} ${randEdges(r, n, 0, 12).join(' ')}`; },
  ref: ({ n, source, destination, edges }, title) => {
    const f = components(n, edges, 0);
    const exp = String(f(source) === f(destination));
    return exp === title ? null : `expected ${exp} got ${title}`;
  },
});

// ---------------------------------------------------------------- 133
cases.push({
  slug: '133', def: cloneGraph,
  gen: (r) => {
    const n = ri(r, 1, 7);
    const lab = shuffle(r, Array.from({ length: n }, (_, i) => i + 1));
    const es = new Set<string>();
    for (let i = 1; i < n; i++) { const a = lab[i]; const b = lab[ri(r, 0, i - 1)]; es.add(`${Math.min(a, b)}-${Math.max(a, b)}`); }
    for (let t = ri(r, 0, 5); t > 0 && n > 2; t--) { const a = ri(r, 1, n); const b = ri(r, 1, n); if (a !== b) es.add(`${Math.min(a, b)}-${Math.max(a, b)}`); }
    return `${n} ${[...es].slice(0, 12).join(' ')}`;
  },
  ref: ({ n, edges }, title) => {
    // the generator may drop edges past 12, so re-check connectivity before trusting the input
    const adj: number[][] = Array.from({ length: n + 1 }, () => []);
    edges.forEach((e: any) => { adj[e.u].push(e.v); adj[e.v].push(e.u); });
    const exp = `[${adj.slice(1).map((l) => `[${l.sort((a, b) => a - b).join(', ')}]`).join(', ')}]`;
    return exp === title ? null : `expected ${exp} got ${title}`;
  },
  allowReject: /connected/,
});

// ---------------------------------------------------------------- 207
cases.push({
  slug: '207', def: courseSchedule,
  gen: (r) => {
    const n = ri(r, 1, 8);
    const dag = r() < 0.6;
    const perm = shuffle(r, Array.from({ length: n }, (_, i) => i));
    const es = new Set<string>();
    for (let t = 0; t < 40 && es.size < ri(r, 0, Math.min(14, n * 2)) && n > 1; t++) {
      const a = ri(r, 0, n - 1);
      const b = ri(r, 0, n - 1);
      if (a === b) continue;
      es.add(dag && perm.indexOf(a) > perm.indexOf(b) ? `${b}>${a}` : `${a}>${b}`);
    }
    return `${n} ${[...es].join(' ')}`;
  },
  ref: ({ n, edges }, title) => {
    const indeg = new Array(n).fill(0);
    edges.forEach((e: any) => indeg[e.v]++);
    const q: number[] = [];
    indeg.forEach((d, i) => d === 0 && q.push(i));
    for (let h = 0; h < q.length; h++) for (const e of edges) if (e.u === q[h] && --indeg[e.v] === 0) q.push(e.v);
    const exp = String(q.length === n);
    return exp === title ? null : `expected ${exp} got ${title}`;
  },
});

// ---------------------------------------------------------------- GFG tree
cases.push({
  slug: 'gfg-is-graph', def: isGraphATree,
  gen: (r) => {
    const n = ri(r, 1, 8);
    if (r() < 0.45 && n > 1) {
      // a random tree, maybe with one edge removed / added
      const lab = shuffle(r, Array.from({ length: n }, (_, i) => i));
      const es: string[] = [];
      for (let i = 1; i < n; i++) es.push(`${lab[i]}-${lab[ri(r, 0, i - 1)]}`);
      if (r() < 0.3) es.splice(ri(r, 0, es.length - 1), 1);
      return `${n} ${es.join(' ')}`;
    }
    return `${n} ${randEdges(r, n, 0, 12).join(' ')}`;
  },
  ref: ({ n, edges }, title) => {
    const f = components(n, edges, 0);
    const connected = new Set(Array.from({ length: n }, (_, i) => f(i))).size === 1;
    const exp = connected && edges.length === n - 1 ? 'Yes' : 'No';
    return exp === title ? null : `expected ${exp} got ${title}`;
  },
});

// ---------------------------------------------------------------- 417
cases.push({
  slug: '417', def: pacificAtlantic,
  gen: (r) => { const R_ = ri(r, 1, 5); const C_ = ri(r, 1, 6); const mx = ri(r, 1, 9); return Array.from({ length: R_ }, () => Array.from({ length: C_ }, () => String(ri(r, 0, mx))).join('')).join(' '); },
  ref: ({ grid }, title) => {
    const h = grid.map((s: string) => [...s].map(Number));
    const R_ = h.length, C_ = h[0].length;
    const reach = (r0: number, c0: number) => {
      // forward flow: DFS to equal-or-lower neighbours, record which oceans the border touches
      const seen = new Set<string>([`${r0},${c0}`]);
      const st = [[r0, c0]];
      let p = false, a = false;
      while (st.length) {
        const [r, c] = st.pop()!;
        if (r === 0 || c === 0) p = true;
        if (r === R_ - 1 || c === C_ - 1) a = true;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= R_ || nc >= C_ || seen.has(`${nr},${nc}`) || h[nr][nc] > h[r][c]) continue;
          seen.add(`${nr},${nc}`); st.push([nr, nc]);
        }
      }
      return p && a;
    };
    const out: string[] = [];
    for (let r = 0; r < R_; r++) for (let c = 0; c < C_; c++) if (reach(r, c)) out.push(`[${r}, ${c}]`);
    const exp = `[${out.join(', ')}]`;
    return exp === title ? null : `expected ${exp} got ${title}`;
  },
});

// ---------------------------------------------------------------- 399
cases.push({
  slug: '399', def: evaluateDivision,
  gen: (r) => {
    const names = 'abcdefg'.slice(0, ri(r, 2, 7));
    const val: Record<string, number> = {};
    for (const ch of names) val[ch] = 2 ** ri(r, 0, 4);
    const eq = new Set<string>();
    const out: string[] = [];
    for (let t = 0; t < ri(r, 1, 6); t++) {
      const a = names[ri(r, 0, names.length - 1)];
      const b = names[ri(r, 0, names.length - 1)];
      const k = [a, b].sort().join('');
      if (a === b || eq.has(k)) continue;
      eq.add(k);
      out.push(`${a}/${b}=${val[a] / val[b]}`);
    }
    if (!out.length) { out.push(`${names[0]}/${names[1]}=${val[names[0]] / val[names[1]]}`); }
    // the first equation fixed val for its own variables only; recompute the truth from the equations themselves
    const qs = Array.from({ length: ri(r, 1, 3) }, () => `${'abcdefgz'[ri(r, 0, 7)]}/${'abcdefgz'[ri(r, 0, 7)]}`);
    return `${out.join(' ')} | ${qs.join(' ')}`;
  },
  ref: ({ eqs, queries }, title) => {
    // weighted union-find style truth: assign values by traversal, answer by ratio when connected
    const adj = new Map<string, [string, number][]>();
    for (const e of eqs) { adj.set(e.a, [...(adj.get(e.a) ?? []), [e.b, 1 / e.v]]); adj.set(e.b, [...(adj.get(e.b) ?? []), [e.a, e.v]]); }
    const val = new Map<string, number>(); const comp = new Map<string, string>();
    for (const root of adj.keys()) {
      if (val.has(root)) continue;
      val.set(root, 1); comp.set(root, root);
      const q = [root];
      for (let h = 0; h < q.length; h++) for (const [nx, fct] of adj.get(q[h])!) if (!val.has(nx)) { val.set(nx, val.get(q[h])! * fct); comp.set(nx, root); q.push(nx); }
    }
    const out = queries.map(([x, y]: string[]) => (!val.has(x) || !val.has(y) || comp.get(x) !== comp.get(y) ? -1 : val.get(x)! / val.get(y)!));
    const got = title.replace(/[\[\]\s]/g, '').split(',').map(Number);
    return got.length === out.length && out.every((v: number, i: number) => Math.abs(v - got[i]) < 1e-4) ? null : `expected ${out} got ${got}`;
  },
  allowReject: /contradict/,
});

// ---------------------------------------------------------------- 127
cases.push({
  slug: '127', def: wordLadder,
  gen: (r) => {
    const L = ri(r, 2, 3);
    const mkw = () => Array.from({ length: L }, () => 'abc'[ri(r, 0, 2)]).join('');
    const list = new Set<string>();
    for (let t = 0; t < ri(r, 1, 8); t++) list.add(mkw());
    const begin = mkw();
    let end = mkw();
    if (end === begin) end = begin.replace(/./, (ch) => (ch === 'a' ? 'b' : 'a'));
    if (r() < 0.7 && !list.has(end)) list.add(end);
    return `${begin} ${end} | ${[...list].slice(0, 8).join(' ')}`;
  },
  ref: ({ begin, end, words }, title) => {
    const dict = new Set<string>(words);
    if (!dict.has(end)) return title === '0' ? null : `expected 0 got ${title}`;
    const q: [string, number][] = [[begin, 1]];
    const seen = new Set([begin]);
    let ans = 0;
    for (let h = 0; h < q.length && !ans; h++) {
      const [w, d] = q[h];
      if (w === end) { ans = d; break; }
      for (let i = 0; i < w.length; i++) for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
        const nx = w.slice(0, i) + ch + w.slice(i + 1);
        if (dict.has(nx) && !seen.has(nx)) { seen.add(nx); q.push([nx, d + 1]); }
      }
    }
    return String(ans) === title ? null : `expected ${ans} got ${title}`;
  },
});

// ---------------------------------------------------------------- driver
register();
function register() { /* additional cases are appended above this line */ }

for (const c of cases) {
  if (ONLY && !c.slug.includes(ONLY)) continue;
  const r = rng(0xc0ffee ^ c.slug.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
  let n = 0;
  let skipped = 0;
  const lens: number[] = [];
  for (let t = 0; t < N; t++) {
    const raw = c.gen(r);
    let input: any;
    try { input = c.def.parseInput(raw); } catch (e) { if (c.allowReject?.test((e as Error).message)) { skipped++; continue; } fail(c.slug, raw, `parseInput rejected generated input: ${(e as Error).message}`); continue; }
    let steps: any[];
    try { steps = c.def.buildSteps(input); } catch (e) { fail(c.slug, raw, `buildSteps threw ${(e as Error).stack}`); continue; }
    lens.push(steps.length);
    if (steps.length > 400) fail(c.slug, raw, `too many steps ${steps.length}`);
    // no array / object may be shared between two steps (it could be mutated later and rewrite history)
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
    const res = steps[steps.length - 1]?.result;
    if (!res) { fail(c.slug, raw, 'no result on final step'); continue; }
    const msg = c.ref(input, res.title, raw);
    if (msg) fail(c.slug, raw, msg);
    steps.forEach((s, i) => checkScene(s, `${c.slug} [${raw}] step ${i}`, (name, cond, extra) => { if (!cond) fail(c.slug, raw, `${name} ${extra ?? ''}`); }));
    n++;
  }
  console.log(`${c.slug}: ${n}/${N} inputs ok${skipped ? ` (${skipped} rejected as too long)` : ""}, steps min ${Math.min(...lens)} max ${Math.max(...lens)}`);
}
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL FUZZ CHECKS PASSED');
process.exit(failures ? 1 : 0);
