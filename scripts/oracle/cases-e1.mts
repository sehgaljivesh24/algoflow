import type { Step } from '../../src/engine/types.ts';
import type { CaseModule, OracleCase, Scalar, State } from './types.ts';
import { cellValues, num, ptr, rarr, rint, rstr, sceneOfKind, scenesOf, shown } from './util.ts';

/**
 * Batch e1 oracles (30 mixed problems). Every oracle is written from the textbook algorithm and never imports the
 * problem module or its kit. Helpers below are local to this file.
 */
type R = () => number;
type Tok = number | null;

// ------------------------------------------------------------------ helpers
/** Plain binary tree built from LeetCode level-order tokens; ids are creation order (the order of the scene's node list). */
interface TN { id: number; v: number; l: number | null; r: number | null }
function treeFromTokens(tokens: Tok[]): TN[] {
  const nodes: TN[] = [];
  const mk = (v: number) => { nodes.push({ id: nodes.length, v, l: null, r: null }); return nodes.length - 1; };
  const q: number[] = [mk(tokens[0] as number)];
  let i = 1;
  for (let h = 0; h < q.length && i < tokens.length; h++) {
    const p = nodes[q[h]];
    if (i < tokens.length) { const t = tokens[i++]; if (t !== null) { p.l = mk(t); q.push(p.l); } }
    if (i < tokens.length) { const t = tokens[i++]; if (t !== null) { p.r = mk(t); q.push(p.r); } }
  }
  return nodes;
}
/** Random tree as level-order tokens (children of null are omitted, trailing nulls trimmed). */
function genTokens(r: R, maxN: number, lo: number, hi: number, density = 0.65): Tok[] {
  const n = rint(r, 1, maxN);
  type S = { v: number; l: S | null; r: S | null };
  const root: S = { v: rint(r, lo, hi), l: null, r: null };
  const q = [root];
  let count = 1;
  for (let i = 0; i < q.length; i++) {
    for (const side of ['l', 'r'] as const) {
      if (count < n && r() < density) { const c: S = { v: rint(r, lo, hi), l: null, r: null }; q[i][side] = c; q.push(c); count++; }
    }
  }
  const out: Tok[] = [];
  const qq: (S | null)[] = [root];
  for (let i = 0; i < qq.length; i++) {
    const nd = qq[i];
    if (!nd) { out.push(null); continue; }
    out.push(nd.v);
    qq.push(nd.l, nd.r);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}
/** Items of aux panel `idx` (empty list when the panel is missing). */
const auxItems = (step: Step, idx = 0): string[] => step.aux?.[idx]?.items ?? [];
/** Numbers after the arrow of a map panel ("b → 2" gives 2). */
const mapNums = (step: Step, idx = 0): number[] => auxItems(step, idx).map((s) => Number(s.split('→')[1]));
/** Per-node label of the tree scene, by node id (null when none). */
function treeLabels(step: Step): (string | null)[] {
  const t = sceneOfKind(step, 'tree');
  if (!t) return [];
  return t.nodes.map((n) => t.labels[n.id] ?? null);
}
/** left / right child ids per node id of the tree scene. */
function treeLinks(step: Step): { left: (number | null)[]; right: (number | null)[] } {
  const t = sceneOfKind(step, 'tree');
  const ns = t?.nodes ?? [];
  return { left: ns.map((n) => n.left), right: ns.map((n) => n.right) };
}
const v = (x: Scalar | undefined): Scalar => (x === undefined ? null : x);
/** Invariant factory: when pointer chip `pid` is drawn it must sit at the index the variable `key` (plus `off`) says. */
const ptrVar = (pid: string, key: string, off = 0) => (st: Step): string | null => {
  const p = ptr(st, pid);
  if (p === null) return null;
  const x = num(st, key);
  return x !== null && p === x + off ? null : `pointer ${pid} at ${p} but variable ${key} = ${shown(st, key)}${off ? ` (+${off})` : ''}`;
};

// ================================================================== 1004 Max Consecutive Ones III
type In1004 = { nums: number[]; k: number };
function oracle1004({ nums, k }: In1004): State[] {
  const out: State[] = [];
  const n = nums.length;
  let l = 0, zeros = 0, best = 0;
  out.push({ l: 0, r: null, zeros: 0, best: 0 });
  for (let r = 0; r < n; r++) {
    if (nums[r] === 0) zeros++;
    out.push({ l, r, zeros, best });
    while (zeros > k) {
      if (nums[l] === 0) zeros--;
      l++;
      out.push({ l, r, zeros, best });
    }
    best = Math.max(best, r - l + 1);
    out.push({ l, r, zeros, best });
  }
  out.push({ l: null, r: null, zeros, best });
  return out;
}

// ================================================================== 1046 Last Stone Weight
type In1046 = { stones: number[] };
function oracle1046({ stones }: In1046): State[] {
  const a: number[] = [];
  const out: State[] = [];
  let y: number | null = null, x: number | null = null;
  const emit = () => out.push({ y, x, size: a.length, heap: [...a] });
  const siftDown = (i: number) => {
    for (;;) {
      const lc = 2 * i + 1, rc = lc + 1;
      let m = i;
      if (lc < a.length && a[lc] > a[m]) m = lc;
      if (rc < a.length && a[rc] > a[m]) m = rc;
      if (m === i) return;
      [a[i], a[m]] = [a[m], a[i]];
      i = m;
      emit();
    }
  };
  const siftUp = (i: number) => {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p] >= a[i]) return;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
      emit();
    }
  };
  const pop = (): number => {
    const top = a[0];
    const last = a.pop()!;
    // removing the very last element leaves nothing to re-seat: the animation shows no separate state for it
    if (a.length) { a[0] = last; emit(); siftDown(0); }
    return top;
  };
  const push = (val: number) => { a.push(val); emit(); siftUp(a.length - 1); };
  // Java spec: `for (int s : stones) pq.offer(s)`, i.e. sequential sift-up; the animation presents the built heap as its first state
  for (const s of stones) { a.push(s); siftUp(a.length - 1); }
  out.length = 0;
  emit();
  while (a.length > 1) {
    const t1 = pop(); y = t1; emit();
    const t2 = pop(); x = t2; emit();
    if (t1 !== t2) push(t1 - t2);
  }
  return out;
}

// ================================================================== 110 Balanced Binary Tree
type TreeIn = { tokens: Tok[] };
function oracle110({ tokens }: TreeIn): State[] {
  const nodes = treeFromTokens(tokens);
  const out: State[] = [];
  const labels: (string | null)[] = nodes.map(() => null);
  const stack: string[] = [];
  const emit = (node: Scalar, left: Scalar, right: Scalar, returns: Scalar) => out.push({ node, left, right, returns, stack: [...stack], labels: [...labels] });
  emit(null, null, null, null);
  const height = (id: number | null): number => {
    if (id === null) return 0;
    const nd = nodes[id];
    stack.push(`node ${nd.v}`);
    emit(nd.v, '?', '?', null);
    const l = height(nd.l);
    if (l === -1) { labels[id] = '−1'; emit(nd.v, -1, '?', -1); stack.pop(); return -1; }
    const r = height(nd.r);
    if (r === -1) { labels[id] = '−1'; emit(nd.v, l, -1, -1); stack.pop(); return -1; }
    if (Math.abs(l - r) > 1) { labels[id] = '−1'; emit(nd.v, l, r, -1); stack.pop(); return -1; }
    const h = 1 + Math.max(l, r);
    labels[id] = `h=${h}`;
    emit(nd.v, l, r, h);
    stack.pop();
    return h;
  };
  const h = height(0);
  emit(null, null, null, h);
  return out;
}

// ================================================================== 112 Path Sum
type In112 = { tokens: Tok[]; target: number };
function oracle112({ tokens, target }: In112): State[] {
  const nodes = treeFromTokens(tokens);
  const out: State[] = [];
  const labels: (string | null)[] = nodes.map(() => null);
  const stack: string[] = [];
  const emit = (node: Scalar, need: Scalar, returns: Scalar) => out.push({ node, need, returns, stack: [...stack], labels: [...labels] });
  emit(null, target, null);
  const has = (id: number, need: number): boolean => {
    const nd = nodes[id];
    stack.push(`${nd.v} (need ${need})`);
    labels[id] = `need ${need}`;
    if (nd.l === null && nd.r === null) {
      const hit = need === nd.v;
      emit(nd.v, need, String(hit));
      stack.pop();
      return hit;
    }
    emit(nd.v, need, null);
    let ok = false;
    if (nd.l !== null) ok = has(nd.l, need - nd.v);
    if (!ok && nd.r !== null) ok = has(nd.r, need - nd.v);
    emit(nd.v, need, String(ok));
    stack.pop();
    return ok;
  };
  const ans = has(0, target);
  emit(null, target, String(ans));
  return out;
}

// ================================================================== 114 Flatten Binary Tree to Linked List
function oracle114({ tokens }: TreeIn): State[] {
  const nodes = treeFromTokens(tokens);
  const out: State[] = [];
  const chain: number[] = [];
  const emit = (cur: Scalar, pred: Scalar) => out.push({ cur, pred, chain: [...chain], left: nodes.map((n) => n.l), right: nodes.map((n) => n.r) });
  emit(null, null);
  let cur: number | null = 0;
  let first = true;
  while (cur !== null) {
    const c: number = cur;
    if (!first) emit(nodes[c].v, null); // moved right, nothing recorded yet
    first = false;
    chain.push(nodes[c].v);
    emit(nodes[c].v, null);
    if (nodes[c].l !== null) {
      let pred: number = nodes[c].l as number;
      emit(nodes[c].v, nodes[pred].v);
      while (nodes[pred].r !== null) { pred = nodes[pred].r as number; emit(nodes[c].v, nodes[pred].v); }
      nodes[pred].r = nodes[c].r;
      nodes[c].r = nodes[c].l;
      nodes[c].l = null;
      emit(nodes[c].v, nodes[pred].v);
    }
    cur = nodes[c].r;
  }
  emit('null', null);
  return out;
}

// ================================================================== 1189 Maximum Number of Balloons
type In1189 = { text: string };
function oracle1189({ text }: In1189): State[] {
  const need: Record<string, number> = { b: 1, a: 1, l: 2, o: 2, n: 1 };
  const order = ['b', 'a', 'l', 'o', 'n'];
  const cnt: Record<string, number> = { b: 0, a: 0, l: 0, o: 0, n: 0 };
  const counts = () => order.map((c) => cnt[c]);
  const out: State[] = [];
  out.push({ counts: counts(), allow: null, best: null });
  for (const ch of text) { if (ch in need) cnt[ch]++; out.push({ counts: counts(), allow: null, best: null }); }
  const allow = order.map((c) => Math.floor(cnt[c] / need[c]));
  out.push({ counts: counts(), allow, best: null });
  const best = Math.min(...allow);
  out.push({ counts: counts(), allow, best });
  out.push({ counts: counts(), allow: null, best });
  return out;
}

// ================================================================== 125 Valid Palindrome
type In125 = { s: string };
function oracle125({ s }: In125): State[] {
  const n = s.length;
  const isAl = (c: string) => /[a-z0-9]/i.test(c);
  const st = (l: number, r: number): State => ({ l, r, lc: l < n ? s[l].toLowerCase() : null, rc: r >= 0 ? s[r].toLowerCase() : null });
  const out: State[] = [st(0, n - 1)];
  let l = 0, r = n - 1;
  while (l < r) {
    while (l < r && !isAl(s[l])) { l++; out.push(st(l, r)); }
    while (l < r && !isAl(s[r])) { r--; out.push(st(l, r)); }
    if (s[l].toLowerCase() !== s[r].toLowerCase()) return out; // false: the scan stops, pointers stay
    l++; r--;
    out.push(st(l, r));
  }
  // true: the animation hides the pointers and clamps the variables into the string
  out[out.length - 1] = st(Math.min(l, n - 1), Math.max(r, 0));
  return out;
}

// ================================================================== 13 Roman to Integer
type In13 = { s: string };
const toRoman = (num: number): string => {
  const t: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [val, sym] of t) while (num >= val) { out += sym; num -= val; }
  return out;
};
function oracle13({ s }: In13): State[] {
  const V: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const out: State[] = [];
  const terms: string[] = [];
  let total = 0;
  out.push({ i: null, cur: null, next: null, total: 0, terms: [] });
  for (let i = 0; i < s.length; i++) {
    const cur = V[s[i]];
    const nxt = i + 1 < s.length ? V[s[i + 1]] : null;
    out.push({ i, cur, next: nxt, total, terms: [...terms] });
    const sub = nxt !== null && cur < nxt;
    total += sub ? -cur : cur;
    terms.push(`${sub ? '−' : '+'}${cur}`);
    out.push({ i, cur, next: nxt, total, terms: [...terms] });
  }
  out.push({ i: null, cur: null, next: null, total, terms: [...terms] });
  return out;
}

// ================================================================== 133 Clone Graph
type Edge = { u: number; v: number };
type In133 = { n: number; edges: Edge[] };
function genConnected(r: R, n: number, maxEdges: number): Edge[] {
  const edges: Edge[] = [];
  const has = (a: number, b: number) => edges.some((e) => (e.u === a && e.v === b) || (e.u === b && e.v === a));
  for (let i = 2; i <= n; i++) { const p = rint(r, 1, i - 1); edges.push(r() < 0.5 ? { u: p, v: i } : { u: i, v: p }); }
  const extra = rint(r, 0, 4);
  for (let k = 0; k < extra && edges.length < maxEdges; k++) {
    const a = rint(r, 1, n), b = rint(r, 1, n);
    if (a !== b && !has(a, b)) edges.push({ u: a, v: b });
  }
  return edges;
}
const ekey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;
function oracle133({ n, edges }: In133): State[] {
  const adj: number[][] = Array.from({ length: n + 1 }, () => []);
  for (const e of edges) { adj[e.u].push(e.v); adj[e.v].push(e.u); }
  adj.forEach((l) => l.sort((a, b) => a - b));
  const map = new Map<number, true>();
  const links: [number, number][] = [];
  const stack: number[] = [];
  const out: State[] = [];
  const emit = (node: number | null) => out.push({
    node, copies: map.size, links: links.length,
    map: [...map.keys()].sort((a, b) => a - b).map((k) => `${k} → ${k}'`),
    stack: stack.map((s) => `clone(${s})`),
    cloneEdges: [...new Set(links.map(([a, b]) => ekey(a, b)))].sort(),
  });
  emit(null);
  const clone = (u: number) => {
    map.set(u, true);
    stack.push(u);
    emit(u);
    for (const w of adj[u]) {
      if (!map.has(w)) clone(w);
      links.push([u, w]);
      emit(u);
    }
    stack.pop();
  };
  clone(1);
  emit(null);
  return out;
}

// ================================================================== 135 Candy
type In135 = { ratings: number[] };
function oracle135({ ratings: r }: In135): State[] {
  const n = r.length;
  const c = Array(n).fill(1);
  const out: State[] = [];
  const emit = (pass: string, i: number | null) => out.push({ pass, i, total: c.reduce((a, b) => a + b, 0), candies: [...c] });
  emit('init', null);
  for (let i = 1; i < n; i++) { if (r[i] > r[i - 1]) c[i] = c[i - 1] + 1; emit('left → right', i); }
  for (let i = n - 2; i >= 0; i--) { if (r[i] > r[i + 1]) c[i] = Math.max(c[i], c[i + 1] + 1); emit('right → left', i); }
  emit('sum', null);
  emit('done', null);
  return out;
}

// ================================================================== 138 Copy List with Random Pointer
type In138 = { vals: number[]; random: (number | null)[] };
function oracle138({ vals, random }: In138): State[] {
  const n = vals.length;
  const out: State[] = [];
  const copyNext: (number | null)[] = [];
  const copyRand: (number | null)[] = [];
  let created = 0;
  let wired = 0;
  let cur: number | null = null;
  const emit = () => out.push({
    cur, mapSize: created, wired,
    map: Array.from({ length: created }, (_, i) => `[${i}] ${vals[i]} → copy ${vals[i]}′`),
    copyNext: Array.from({ length: created }, (_, i) => (i < copyNext.length ? copyNext[i] : null)),
    copyRand: copyRand.slice(0, wired),
  });
  emit();
  for (let i = 0; i < n; i++) { cur = i; created++; emit(); }
  for (let i = 0; i < n; i++) {
    cur = i;
    copyNext[i] = i + 1 < n ? i + 1 : null;
    emit();
    copyRand[i] = random[i];
    wired++;
    emit();
  }
  cur = null;
  emit();
  return out;
}

// ================================================================== 139 Word Break
type In139 = { s: string; words: string[] };
function oracle139({ s, words }: In139): State[] {
  const n = s.length;
  const dp: (boolean | null)[] = Array(n + 1).fill(null);
  const out: State[] = [];
  const row = () => dp.map((x) => (x === null ? '?' : x ? 'T' : 'F'));
  const emit = (i: number | null, word: string | null, prev: boolean | null) => out.push({ i, word, prev: prev === null ? null : prev ? 'T' : 'F', dp: row() });
  emit(null, null, null);
  dp[0] = true;
  emit(0, null, null);
  for (let i = 1; i <= n; i++) {
    let ok = false;
    for (const w of words) {
      if (w.length > i) continue;
      const from = i - w.length;
      const hit = dp[from] === true && s.startsWith(w, from);
      if (hit) { ok = true; dp[i] = true; }
      emit(i, w, dp[from] === true);
      if (hit) break;
    }
    if (!ok) { dp[i] = false; emit(i, null, null); }
  }
  emit(n, null, null);
  return out;
}

// ================================================================== 14 Longest Common Prefix
type In14 = { words: string[] };
function oracle14({ words }: In14): State[] {
  const first = words[0];
  const m = words.length;
  const out: State[] = [];
  let plen = 0;
  const emit = (col: number | null, active: number, err: number | null) =>
    out.push({ col, char: col === null ? null : first[col], prefix: `"${first.slice(0, plen)}"`, active, err, list: [...first.slice(0, plen)] });
  emit(null, 0, null);
  for (let c = 0; c < first.length; c++) {
    emit(c, 1, null);
    for (let r = 1; r < m; r++) {
      if (c >= words[r].length || words[r][c] !== first[c]) { emit(c, r, r); return out; }
      emit(c, r + 1, null);
    }
    emit(c, m, null);
    plen = c + 1;
  }
  emit(null, 0, null);
  return out;
}

// ================================================================== 143 Reorder List
type In143 = { vals: number[] };
function oracle143({ vals }: In143): State[] {
  const n = vals.length;
  const next: (number | null)[] = vals.map((_, i) => (i + 1 < n ? i + 1 : null));
  const p: Record<string, number | null> = { slow: null, fast: null, prev: null, curr: null, l1: null, l2: null };
  const out: State[] = [];
  const emit = () => out.push({ slow: p.slow, fast: p.fast, prev: p.prev, curr: p.curr, l1: p.l1, l2: p.l2, next: [...next] });
  p.slow = 0; p.fast = 0;
  emit();
  while (next[p.fast as number] !== null && next[next[p.fast as number] as number] !== null) {
    p.slow = next[p.slow as number];
    p.fast = next[next[p.fast as number] as number];
    emit();
  }
  const mid = p.slow as number;
  const second = next[mid];
  next[mid] = null;
  p.fast = null;
  p.curr = second;
  emit();
  while (p.curr !== null) {
    const c = p.curr;
    const nx = next[c];
    next[c] = p.prev;
    emit(); // the animation shows the flipped link before prev / curr advance
    p.prev = c;
    p.curr = nx;
  }
  p.slow = null; p.curr = null;
  p.l1 = 0; p.l2 = p.prev; p.prev = null;
  emit();
  while (p.l2 !== null) {
    const a = p.l1 as number, b = p.l2;
    const t1 = next[a], t2 = next[b];
    next[a] = b;
    emit();
    next[b] = t1;
    p.l1 = t1; p.l2 = t2;
    emit();
  }
  p.l1 = null;
  emit();
  return out;
}

// ================================================================== 1470 Shuffle the Array
type In1470 = { nums: number[]; n: number };
function oracle1470({ nums, n }: In1470): State[] {
  const out: State[] = [];
  const ans: number[] = [];
  const emit = (i: number | null, done = false) => out.push({ n, i, size: ans.length, ans: [...ans], cells: done ? [...ans] : [...nums] });
  emit(null);
  for (let i = 0; i < n; i++) {
    ans[2 * i] = nums[i]; emit(i);
    ans[2 * i + 1] = nums[i + n]; emit(i);
  }
  emit(null, true);
  return out;
}

// ================================================================== 153 Find Minimum in Rotated Sorted Array
type In153 = { nums: number[] };
function oracle153({ nums }: In153): State[] {
  const out: State[] = [];
  let lo = 0, hi = nums.length - 1, iter = 0;
  const emit = (mid: number | null, minAt: number | null = null) => out.push({ lo, mid, hi, iter, minAt });
  emit(null);
  while (lo < hi) {
    iter++;
    const mid = lo + Math.floor((hi - lo) / 2);
    emit(mid);
    if (nums[mid] > nums[hi]) lo = mid + 1; else hi = mid;
    emit(mid);
  }
  emit(null, lo);
  return out;
}

// ================================================================== 1672 Richest Customer Wealth
type In1672 = { accounts: number[][] };
function oracle1672({ accounts }: In1672): State[] {
  const R = accounts.length, C = accounts[0].length;
  const wealth: string[] = Array(R).fill('?');
  const out: State[] = [];
  let best = 0;
  const emit = (customer: number | null, sum: number | null) => out.push({ customer, sum, best, wealth: [...wealth] });
  emit(null, null);
  for (let r = 0; r < R; r++) {
    let run = 0;
    for (let c = 0; c < C; c++) {
      run += accounts[r][c];
      if (c === C - 1) wealth[r] = String(run);
      emit(r, run);
    }
    best = Math.max(best, run);
    emit(r, run);
  }
  emit(null, null);
  return out;
}

// ================================================================== 189 Rotate Array
type In189 = { nums: number[]; k: number };
function oracle189({ nums, k: kRaw }: In189): State[] {
  const n = nums.length;
  const k = kRaw % n;
  const a = [...nums];
  const out: State[] = [];
  const emit = (l: number | null, r: number | null) => out.push({ k, l, r, arr: [...a] });
  emit(null, null);
  const reverse = (lo: number, hi: number) => {
    emit(lo, hi);
    let l = lo, r = hi;
    while (l < r) { [a[l], a[r]] = [a[r], a[l]]; emit(l, r); l++; r--; }
  };
  if (k !== 0) { reverse(0, n - 1); reverse(0, k - 1); reverse(k, n - 1); }
  emit(null, null);
  return out;
}

// ================================================================== 1929 Concatenation of Array
type In1929 = { nums: number[] };
function oracle1929({ nums }: In1929): State[] {
  const n = nums.length;
  const ans: (number | string)[] = Array(2 * n).fill('·');
  const out: State[] = [];
  const emit = (i: number | null) => out.push({ n, i, ans: [...ans] });
  emit(null);
  for (let i = 0; i < n; i++) { ans[i] = nums[i]; emit(i); ans[i + n] = nums[i]; emit(i); }
  emit(null);
  return out;
}

// ================================================================== 202 Happy Number
type In202 = { n: number };
const dsq = (x: number): number => { let s = 0; while (x > 0) { const d = x % 10; s += d * d; x = Math.floor(x / 10); } return s; };
function happyChain(n: number): { vals: number[]; back: number | null } {
  const vals = [n];
  const seen = new Map<number, number>([[n, 0]]);
  let cur = n;
  while (cur !== 1) {
    const nx = dsq(cur);
    if (seen.has(nx)) return { vals, back: seen.get(nx)! };
    seen.set(nx, vals.length);
    vals.push(nx);
    cur = nx;
  }
  return { vals, back: null };
}
function oracle202({ n }: In202): State[] {
  const out: State[] = [];
  const ch = happyChain(n);
  let slow = n, fast = n, round = 0;
  const emit = () => out.push({ slow, fast, round, chain: ch.vals, back: ch.back });
  emit();
  fast = dsq(n);
  emit();
  while (fast !== 1 && slow !== fast) {
    round++;
    slow = dsq(slow); emit();
    fast = dsq(fast); emit();
    fast = dsq(fast); emit();
  }
  return out;
}

// ================================================================== 205 Isomorphic Strings
type In205 = { s: string; t: string };
function oracle205({ s, t }: In205): State[] {
  const st = new Map<string, string>(), ts = new Map<string, string>();
  const items = (m: Map<string, string>) => [...m].map(([k, x]) => `${k} → ${x}`);
  const out: State[] = [];
  const emit = (i: number | null, a: string | null, b: string | null) => out.push({ i, a, b, st: items(st), ts: items(ts) });
  emit(null, null, null);
  for (let i = 0; i < s.length; i++) {
    const a = s[i], b = t[i];
    emit(i, a, b);
    if ((st.has(a) && st.get(a) !== b) || (ts.has(b) && ts.get(b) !== a)) return out;
    st.set(a, b); ts.set(b, a);
    emit(i, a, b);
  }
  emit(null, null, null);
  return out;
}

// ================================================================== 213 House Robber II
type In213 = { nums: number[] };
function oracle213({ nums }: In213): State[] {
  const n = nums.length;
  const out: State[] = [];
  const A: (number | null)[] = Array(n).fill(null), B: (number | null)[] = Array(n).fill(null);
  let rob: number | null = null, skip: number | null = null, bestA: number | null = null, bestB: number | null = null;
  const row = (dp: (number | null)[], lo: number, hi: number) => dp.map((x, i) => (i < lo || i > hi ? '—' : x === null ? '?' : String(x)));
  const emit = (i: number | null) => out.push({ i, rob, skip, bestA, bestB, rowA: row(A, 0, n - 2), rowB: row(B, 1, n - 1) });
  emit(null);
  if (n === 1) { emit(0); return out; }
  const line = (dp: (number | null)[], lo: number, hi: number, which: 'A' | 'B') => {
    for (let i = lo; i <= hi; i++) {
      const p1 = i - 1 >= lo ? (dp[i - 1] as number) : 0;
      const p2 = i - 2 >= lo ? (dp[i - 2] as number) : 0;
      rob = p2 + nums[i];
      skip = p1;
      dp[i] = Math.max(rob, skip);
      emit(i);
    }
    if (which === 'A') bestA = dp[hi]; else bestB = dp[hi];
    emit(hi);
  };
  line(A, 0, n - 2, 'A');
  line(B, 1, n - 1, 'B');
  rob = null; skip = null;
  emit(null);
  return out;
}

// ================================================================== 217 Contains Duplicate
type In217 = { nums: number[] };
function oracle217({ nums }: In217): State[] {
  const seen: number[] = [];
  const out: State[] = [];
  const emit = (i: number | null, x: number | null, ans: string | null = null) => out.push({ i, x, seen: seen.length, set: seen.map(String), ans });
  emit(null, null);
  for (let i = 0; i < nums.length; i++) {
    emit(i, nums[i]);
    if (seen.includes(nums[i])) { emit(i, nums[i], 'true'); return out; }
    seen.push(nums[i]);
    emit(i, nums[i]);
  }
  emit(null, null, 'false');
  return out;
}

// ================================================================== 2239 Find Closest Number to Zero
type In2239 = { nums: number[] };
function oracle2239({ nums }: In2239): State[] {
  const out: State[] = [];
  let best = nums[0];
  const emit = (i: number | null, ans: string | null = null) => out.push({ i, best, abs: Math.abs(best), ans });
  emit(0);
  for (let i = 1; i < nums.length; i++) {
    emit(i);
    const x = nums[i];
    if (Math.abs(x) < Math.abs(best) || (Math.abs(x) === Math.abs(best) && x > best)) { best = x; emit(i); }
  }
  emit(null, String(best));
  return out;
}

// ================================================================== 226 Invert Binary Tree
function oracle226({ tokens }: TreeIn): State[] {
  const nodes = treeFromTokens(tokens);
  const out: State[] = [];
  const stack: string[] = [];
  const nm = (id: number | null): string => (id === null ? '∅' : String(nodes[id].v));
  const emit = (node: Scalar, l: Scalar, r: Scalar) => out.push({ node, left: l, right: r, stack: [...stack], tl: nodes.map((n) => n.l), tr: nodes.map((n) => n.r) });
  emit(null, null, null);
  const inv = (id: number) => {
    const nd = nodes[id];
    stack.push(`node ${nd.v}`);
    emit(nd.v, nm(nd.l), nm(nd.r));
    if (nd.l !== null) inv(nd.l);
    if (nd.r !== null) inv(nd.r);
    if (nd.l !== null || nd.r !== null) {
      [nd.l, nd.r] = [nd.r, nd.l];
      emit(nd.v, nm(nd.l), nm(nd.r));
    }
    stack.pop();
  };
  inv(0);
  emit(null, null, null);
  return out;
}

// ================================================================== 236 Lowest Common Ancestor
type In236 = { tokens: Tok[]; p: number; q: number };
function oracle236({ tokens, p, q }: In236): State[] {
  const nodes = treeFromTokens(tokens);
  const out: State[] = [];
  const stack: string[] = [];
  const labels: (string | null)[] = nodes.map((n) => (n.v === p ? 'p' : n.v === q ? 'q' : null));
  const nm = (id: number | null): string => (id === null ? '∅' : String(nodes[id].v));
  const emit = (node: Scalar, l: Scalar, r: Scalar, ret: Scalar) => out.push({ node, left: l, right: r, returns: ret, stack: [...stack], labels: [...labels] });
  emit(null, null, null, null);
  const go = (id: number): number | null => {
    const nd = nodes[id];
    stack.push(`node ${nd.v}`);
    const isT = nd.v === p || nd.v === q;
    emit(nd.v, '?', '?', isT ? String(nd.v) : null);
    if (isT) {
      labels[id] = `↑${nd.v}`;
      emit(nd.v, null, null, String(nd.v));
      stack.pop();
      return id;
    }
    const l = nd.l === null ? null : go(nd.l);
    const r = nd.r === null ? null : go(nd.r);
    const ret = l !== null && r !== null ? id : l !== null ? l : r;
    labels[id] = `↑${nm(ret)}`;
    emit(nd.v, nm(l), nm(r), nm(ret));
    stack.pop();
    return ret;
  };
  const res = go(0) as number;
  emit(null, null, null, String(nodes[res].v));
  return out;
}

// ================================================================== 240 Search a 2D Matrix II
type In240 = { m: number[][]; target: number };
function oracle240({ m, target }: In240): State[] {
  const R = m.length, C = m[0].length;
  const out: State[] = [];
  let r = 0, c = C - 1;
  const emit = (ans: string | null = null) => out.push({ target, row: r, col: c, current: r < R && c >= 0 ? m[r][c] : null, ans });
  emit();
  while (r < R && c >= 0) {
    if (m[r][c] === target) { emit('true'); return out; }
    if (m[r][c] > target) c--; else r++;
    emit(); // the move step already shows the new (possibly off-grid) position
  }
  emit('false');
  return out;
}

// ================================================================== 242 Valid Anagram
type In242 = { s: string; t: string };
function oracle242({ s, t }: In242): State[] {
  const cnt = new Map<string, number>();
  const out: State[] = [];
  const emit = (i: number | null, ch: string | null, phase: string, ans: string | null = null) =>
    out.push({ i, ch, phase, map: [...cnt].map(([k, x]) => `${k} → ${x}`), ans });
  emit(null, null, 'start');
  if (s.length !== t.length) {
    emit(null, null, 'length check');
    emit(null, null, 'verdict', 'false');
    return out;
  }
  emit(null, null, 'length check');
  for (let i = 0; i < s.length; i++) { cnt.set(s[i], (cnt.get(s[i]) ?? 0) + 1); emit(i, s[i], 'count s'); }
  for (let i = 0; i < t.length; i++) { cnt.set(t[i], (cnt.get(t[i]) ?? 0) - 1); emit(i, t[i], 'cancel t'); }
  emit(null, null, 'verdict', String([...cnt.values()].every((x) => x === 0)));
  return out;
}

// ================================================================== 268 Missing Number
type In268 = { nums: number[] };
function oracle268({ nums }: In268): State[] {
  const n = nums.length;
  const sorted = [...nums].sort((a, b) => a - b);
  const out: State[] = [];
  let lo = 0, hi = n - 1, iter = 0;
  const emit = (mid: number | null, cells: number[], ans: string | null = null) =>
    out.push({ lo, mid, hi, val: mid === null ? null : sorted[mid], iter, cells, ans });
  emit(null, nums);
  emit(null, sorted);
  while (lo <= hi) {
    iter++;
    const mid = lo + Math.floor((hi - lo) / 2);
    emit(mid, sorted);
    if (sorted[mid] > mid) hi = mid - 1; else lo = mid + 1;
    emit(mid, sorted);
  }
  emit(null, sorted);
  emit(null, sorted, String(lo));
  return out;
}

// ================================================================== 271 Encode and Decode Strings
type In271 = { words: string[] };
function oracle271({ words }: In271): State[] {
  const out: State[] = [];
  const q = (a: string[]) => a.map((w) => `"${w}"`);
  const enc = words.map((w) => `${w.length}#${w}`).join('');
  const dec: string[] = [];
  const emit = (i: number | null, len: number | null, cells: string[], ans: string | null = null) =>
    out.push({ i, len, words: dec.length, cells, decoded: q(dec), ans });
  emit(null, null, words);
  let pos = 0;
  for (const w of words) { pos += `${w.length}#${w}`.length; emit(null, w.length, [...enc.slice(0, pos)]); }
  emit(0, null, [...enc]);
  let i = 0;
  while (i < enc.length) {
    const j = enc.indexOf('#', i);
    const len = Number(enc.slice(i, j));
    emit(i, len, [...enc]);
    dec.push(enc.slice(j + 1, j + 1 + len));
    i = j + 1 + len;
    emit(i, len, [...enc]);
  }
  emit(null, null, [...enc], JSON.stringify(dec));
  return out;
}

/** Tree tokens with pairwise distinct values 1..n. */
function genDistinctTokens(r: R, maxN: number, density: number): Tok[] {
  const t = genTokens(r, maxN, 1, 1, density);
  const cnt = t.filter((x) => x !== null).length;
  const perm = Array.from({ length: cnt }, (_, i) => i + 1).sort(() => r() - 0.5);
  let k = 0;
  return t.map((x) => (x === null ? null : perm[k++]));
}

/** Key of the list node a pointer chip sits on (the chip index is the position in the scene's node order). */
function listPtrKey(step: Step, id: string): number | null {
  const sc = sceneOfKind(step, 'list');
  if (!sc) return null;
  const idx = ptr(step, id);
  return idx === null ? null : sc.nodes[idx]?.key ?? null;
}
/** next key per node key (sorted by key) of the list scene. */
function listNext(step: Step): (number | null)[] {
  const sc = sceneOfKind(step, 'list');
  return [...(sc?.nodes ?? [])].sort((a, b) => a.key - b.key).map((n) => n.next);
}

export const cases: CaseModule['cases'] = [
  {
    slug: '1004-max-consecutive-ones-iii',
    gen: (r): In1004 => { const n = rint(r, 1, 14); return { nums: rarr(r, n, 0, 1), k: rint(r, 0, Math.min(n, 4)) }; },
    oracle: oracle1004,
    project: (st) => ({ l: num(st, 'l'), r: num(st, 'r'), zeros: num(st, 'zeros'), best: num(st, 'best') }),
    invariants: [
      (st, _i, _s, { nums }) => {
        const r = num(st, 'r'), l = num(st, 'l'), z = num(st, 'zeros');
        if (r === null || l === null || z === null) return null;
        const c = nums.slice(l, r + 1).filter((x) => x === 0).length;
        return c === z ? null : `zeros ${z} != zeros in nums[${l}..${r}] = ${c}`;
      },
      (st) => { // pointer chips must sit where the variables say
        const l = num(st, 'l'), r = num(st, 'r');
        if (r !== null && ptr(st, 'r') !== r) return `pointer r at ${ptr(st, 'r')} but r = ${r}`;
        if (l !== null && ptr(st, 'l') !== null && ptr(st, 'l') !== l) return `pointer l at ${ptr(st, 'l')} but l = ${l}`;
        return null;
      },
      (st, _i, _s, { nums }) => { // window cells: 0 inside the window is 'compare' (to be flipped), 1 is 'active'; error only on a zero
        const l = num(st, 'l'), r = num(st, 'r');
        const cs = sceneOfKind(st, 'array')?.cells ?? [];
        if (r === null || l === null) return null;
        for (let i = l; i <= r; i++) {
          const s = cs[i]?.state;
          if (s === 'error') { if (nums[i] !== 0) return `cell ${i} (a 1) marked error`; continue; }
          if (s !== (nums[i] === 0 ? 'compare' : 'active')) return `window cell ${i} (value ${nums[i]}) has state ${s}`;
        }
        return null;
      },
    ],
    notes: 'cell colours (window / best window highlight) not checked',
  } as OracleCase<In1004>,
  {
    slug: '1046-last-stone-weight',
    gen: (r): In1046 => ({ stones: rarr(r, rint(r, 1, 8), 1, r() < 0.4 ? 4 : 30) }),
    oracle: oracle1046,
    project: (st) => ({ y: num(st, 'y'), x: num(st, 'x'), size: num(st, 'heap size'), heap: auxItems(st).map(Number) }),
    invariants: [
      (st) => {
        const h = auxItems(st).map(Number);
        const bad = h.findIndex((x, i) => i > 0 && h[(i - 1) >> 1] < x);
        // heap property may be momentarily broken mid sift; only flag when the scene shows no active/swap node
        const sc = sceneOfKind(st, 'tree');
        const mid = sc && Object.values(sc.states).some((s) => s === 'swap' || s === 'active');
        return bad >= 0 && !mid ? `max-heap property broken at index ${bad}: [${h.join(',')}]` : null;
      },
    ],
    notes: 'tree-scene colours not checked; the heap tree and the array panel are assumed to show the same array (only the panel is compared). Design choices: the initial heap is shown already built (sequential offers, as in the Java; the build is not animated); popping the last element has no separate state',
  } as OracleCase<In1046>,
  {
    slug: '110-balanced-binary-tree',
    gen: (r): TreeIn => ({ tokens: genTokens(r, 12, 1, 9, r() < 0.5 ? 0.5 : 0.8) }),
    oracle: oracle110,
    project: (st) => ({ node: num(st, 'node'), left: v(shown(st, 'left')), right: v(shown(st, 'right')), returns: num(st, 'returns'), stack: auxItems(st), labels: treeLabels(st) }),
    notes: 'node colours not checked',
  } as OracleCase<TreeIn>,
  {
    slug: '112-path-sum',
    gen: (r): In112 => {
      const tokens = genTokens(r, 12, -5, 9);
      const nodes = treeFromTokens(tokens);
      const leaves: number[] = [];
      const walk = (id: number, s: number) => { const nd = nodes[id]; const t = s + nd.v; if (nd.l === null && nd.r === null) leaves.push(t); if (nd.l !== null) walk(nd.l, t); if (nd.r !== null) walk(nd.r, t); };
      walk(0, 0);
      return { tokens, target: r() < 0.55 ? leaves[rint(r, 0, leaves.length - 1)] : rint(r, -10, 30) };
    },
    oracle: oracle112,
    project: (st) => ({ node: num(st, 'node'), need: num(st, 'target left'), returns: v(shown(st, 'returns')), stack: auxItems(st), labels: treeLabels(st) }),
    notes: 'node colours not checked',
  } as OracleCase<In112>,
  {
    slug: '114-flatten-binary-tree-to-linked-list',
    gen: (r): TreeIn => ({ tokens: genTokens(r, 12, 1, 9, r() < 0.5 ? 0.5 : 0.85) }),
    oracle: oracle114,
    project: (st) => {
      const lk = treeLinks(st);
      return { cur: v(shown(st, 'cur')), pred: num(st, 'pred'), chain: auxItems(st).map(Number), left: lk.left, right: lk.right };
    },
    notes: 'the root`s own "cur = root" step is not a separate state (the animation shows cur as the em dash on Start); node colours / cur-pred labels not checked',
  } as OracleCase<TreeIn>,
  {
    slug: '1189-maximum-number-of-balloons',
    gen: (r): In1189 => ({ text: rstr(r, rint(r, 1, 15), r() < 0.5 ? 'balonxe' : 'balloonlo') }),
    oracle: oracle1189,
    invariants: [ptrVar('i', 'i')],
    project: (st) => ({ counts: mapNums(st, 0), allow: st.aux && st.aux.length > 1 ? mapNums(st, 1) : null, best: num(st, 'max words') }),
  } as OracleCase<In1189>,
  {
    slug: '125-valid-palindrome',
    gen: (r): In125 => {
      const n = rint(r, 1, 15);
      const base = rstr(r, Math.ceil(n / 2), 'aAbB1 ,!');
      let s = base + [...base].reverse().join('');
      if (r() < 0.4) s = rstr(r, n, 'aAbB1 ,!');
      s = s.trim() || 'a';
      return { s: s.slice(0, 15) };
    },
    oracle: oracle125,
    project: (st) => ({ l: num(st, 'l'), r: num(st, 'r'), lc: v(shown(st, 'left char')), rc: v(shown(st, 'right char')) }),
    invariants: [
      (st) => {
        const l = ptr(st, 'l'), r = ptr(st, 'r');
        if (l !== null && l !== num(st, 'l')) return `pointer l at ${l} but l = ${num(st, 'l')}`;
        if (r !== null && r !== num(st, 'r')) return `pointer r at ${r} but r = ${num(st, 'r')}`;
        return null;
      },
    ],
    notes: 'skipped / dimmed cell colours not checked; on the success path the animation hides the pointers and clamps l, r into the string (modelled)',
  } as OracleCase<In125>,
  {
    slug: '13-roman-to-integer',
    gen: (r): In13 => { for (;;) { const s = toRoman(rint(r, 1, 3999)); if (s.length <= 12) return { s }; } },
    oracle: oracle13,
    invariants: [ptrVar('i', 'i')],
    project: (st) => ({ i: num(st, 'i'), cur: num(st, 'cur'), next: num(st, 'next'), total: num(st, 'total'), terms: auxItems(st, 1) }),
    notes: 'the symbol-value map and cell colours not checked',
  } as OracleCase<In13>,
  {
    slug: '133-clone-graph',
    gen: (r): In133 => { const n = rint(r, 1, 7); return { n, edges: genConnected(r, n, 12) }; },
    oracle: oracle133,
    project: (st) => {
      const gs = scenesOf(st).filter((s) => s.kind === 'graph') as Extract<ReturnType<typeof scenesOf>[number], { kind: 'graph' }>[];
      const right = gs[1];
      return {
        node: num(st, 'node'), copies: num(st, 'copies'), links: num(st, 'links made'),
        map: auxItems(st, 0), stack: auxItems(st, 1),
        cloneEdges: [...new Set((right?.edges ?? []).map((e) => ekey(e.from, e.to)))].sort(),
      };
    },
    notes: 'node / edge colours not checked; neighbour order is ascending id (LeetCode adjacency-list convention); map panel is listed in ascending key order (a HashMap of small ints iterates that way)',
  } as OracleCase<In133>,
  {
    slug: '135-candy',
    gen: (r): In135 => ({ ratings: rarr(r, rint(r, 1, 12), 0, r() < 0.5 ? 3 : 99) }),
    oracle: oracle135,
    project: (st) => {
      const g = sceneOfKind(st, 'grid');
      return { pass: shown(st, 'pass'), i: num(st, 'i'), total: num(st, 'candies so far'), candies: (g?.rows[1] ?? []).map((c) => Number(c.value)) };
    },
    invariants: [
      (st, _i, _s, { ratings }) => {
        const g = sceneOfKind(st, 'grid');
        const c = (g?.rows[1] ?? []).map((x) => Number(x.value));
        const tot = num(st, 'candies so far');
        if (tot !== c.reduce((a, b) => a + b, 0)) return `total ${tot} != sum of candy row`;
        const done = shown(st, 'pass') === 'done';
        if (done) for (let i = 0; i < ratings.length; i++) {
          if (i > 0 && ratings[i] > ratings[i - 1] && c[i] <= c[i - 1]) return `child ${i} has ${c[i]} candies, not more than left neighbour (${c[i - 1]})`;
          if (i + 1 < ratings.length && ratings[i] > ratings[i + 1] && c[i] <= c[i + 1]) return `child ${i} has ${c[i]} candies, not more than right neighbour (${c[i + 1]})`;
        }
        return null;
      },
    ],
    notes: 'cell colours (active / neighbour / changed) not checked',
  } as OracleCase<In135>,
  {
    slug: '138-copy-list-with-random-pointer',
    gen: (r): In138 => {
      const n = rint(r, 1, 6);
      return { vals: rarr(r, n, r() < 0.4 ? 1 : -9, r() < 0.4 ? 2 : 9), random: Array.from({ length: n }, () => (r() < 0.3 ? null : rint(r, 0, n - 1))) };
    },
    oracle: oracle138,
    project: (st, { vals }) => {
      const n = vals.length;
      const p = String(st.vars.p);
      const m = /^\[(\d+)\]/.exec(p);
      const lst = sceneOfKind(st, 'list');
      const copies = [...(lst?.nodes ?? [])].filter((x) => x.key >= n).sort((a, b) => a.key - b.key);
      return {
        cur: m ? Number(m[1]) : null, mapSize: num(st, 'map size'), wired: num(st, 'copies wired'),
        map: auxItems(st, 0),
        copyNext: copies.map((x) => (x.next === null ? null : x.next - n)),
        copyRand: auxItems(st, 2).map((s) => { const q = /⇢ \[(\d+)\]$/.exec(s); return q ? Number(q[1]) : null; }),
      };
    },
    notes: 'node colours and the original-random-links panel not checked; the copy list order on screen is not checked',
  } as OracleCase<In138>,
  {
    slug: '139-word-break',
    gen: (r): In139 => {
      const s = rstr(r, rint(r, 1, 12), r() < 0.5 ? 'ab' : 'abc');
      const words = new Set<string>();
      const k = rint(r, 1, 5);
      while (words.size < k) {
        if (r() < 0.6) { const a = rint(r, 0, s.length - 1); words.add(s.slice(a, a + rint(r, 1, 4))); }
        else words.add(rstr(r, rint(r, 1, 4), 'abc'));
      }
      return { s, words: [...words] };
    },
    oracle: oracle139,
    project: (st) => {
      const g = sceneOfKind(st, 'grid');
      return { i: num(st, 'i'), word: v(shown(st, 'word')), prev: v(shown(st, 'dp[i-len]')), dp: (g?.rows[1] ?? []).map((c) => String(c.value)) };
    },
    notes: 'cell colours (word window highlight, error shading) not checked',
  } as OracleCase<In139>,
  {
    slug: '14-longest-common-prefix',
    gen: (r): In14 => {
      const common = rstr(r, rint(r, 0, 4), 'ab');
      const m = rint(r, 1, 6);
      return { words: Array.from({ length: m }, () => (common + rstr(r, rint(r, r() < 0.2 ? 0 : 1, 5), 'ab')).slice(0, 9) || 'a') };
    },
    oracle: oracle14,
    project: (st) => {
      const g = sceneOfKind(st, 'grid');
      const col = num(st, 'col');
      let active = 0;
      let err: number | null = null;
      if (g && col !== null) g.rows.forEach((row, ri) => { const s = row[col]?.state; if (s === 'active') active++; if (s === 'error') err = ri; });
      return { col, char: v(shown(st, 'char')), prefix: v(shown(st, 'prefix')), active, err, list: auxItems(st, 0) };
    },
    notes: 'only the active / error state of the compared column is read from the grid; confirmed-prefix colouring not checked',
  } as OracleCase<In14>,
  {
    slug: '143-reorder-list',
    gen: (r): In143 => ({ vals: rarr(r, rint(r, 1, 10), 1, 9) }),
    oracle: oracle143,
    project: (st) => ({
      slow: listPtrKey(st, 'slow'), fast: listPtrKey(st, 'fast'), prev: listPtrKey(st, 'prev'), curr: listPtrKey(st, 'curr'),
      l1: listPtrKey(st, 'l1'), l2: listPtrKey(st, 'l2'), next: listNext(st),
    }),
    invariants: [
      (st, _i, _s, { vals }) => {
        const sc = sceneOfKind(st, 'list');
        const keys = new Set((sc?.nodes ?? []).map((x) => x.key));
        return keys.size === vals.length ? null : `list scene shows ${keys.size} distinct nodes, expected ${vals.length}`;
      },
    ],
    notes: 'display order of nodes and node colours not checked; pointers are compared by node identity, next links by node key',
  } as OracleCase<In143>,
  {
    slug: '1470-shuffle-the-array',
    gen: (r): In1470 => { const n = rint(r, 1, 6); return { nums: rarr(r, 2 * n, -9, 9), n }; },
    oracle: oracle1470,
    invariants: [ptrVar('i', 'i'), (st) => ptrVar('j', 'i', num(st, 'n') ?? 0)(st)],
    project: (st) => ({ n: num(st, 'n'), i: num(st, 'i'), size: num(st, 'ans size'), ans: auxItems(st).map(Number), cells: cellValues(st) as number[] }),
    notes: 'cell colours not checked; the slide animation of cells to their new slots is only checked through the final cell order',
  } as OracleCase<In1470>,
  {
    slug: '153-find-minimum-in-rotated-sorted-array',
    gen: (r): In153 => {
      const n = rint(r, 1, 14);
      const set = new Set<number>();
      while (set.size < n) set.add(rint(r, -99, 999));
      const sorted = [...set].sort((a, b) => a - b);
      const k = rint(r, 0, n - 1);
      return { nums: [...sorted.slice(k), ...sorted.slice(0, k)] };
    },
    oracle: oracle153,
    project: (st) => ({ lo: num(st, 'lo'), mid: num(st, 'mid'), hi: num(st, 'hi'), iter: num(st, 'iterations'), minAt: ptr(st, 'min') }),
    invariants: [
      (st) => {
        for (const k of ['lo', 'mid', 'hi']) { const p = ptr(st, k); if (p !== null && p !== num(st, k)) return `pointer ${k} at ${p} but ${k} = ${num(st, k)}`; }
        return null;
      },
      (st) => { // everything outside the live window [lo, hi] is shown as discarded (dim)
        const lo = num(st, 'lo'), hi = num(st, 'hi');
        const cs = sceneOfKind(st, 'array')?.cells ?? [];
        if (lo === null || hi === null) return null;
        for (let i = 0; i < cs.length; i++) if ((i < lo || i > hi) && cs[i].state !== 'dim') return `cell ${i} outside window [${lo},${hi}] is ${cs[i].state}`;
        return null;
      },
    ],
    notes: 'compared-cell colours not checked (discarded cells are, via an invariant)',
  } as OracleCase<In153>,
  {
    slug: '1672-richest-customer-wealth',
    gen: (r): In1672 => { const R = rint(r, 1, 6), C = rint(r, 1, 8); return { accounts: Array.from({ length: R }, () => rarr(r, C, 0, r() < 0.5 ? 3 : 99)) }; },
    oracle: oracle1672,
    project: (st) => ({ customer: num(st, 'customer'), sum: num(st, 'sum'), best: num(st, 'best'), wealth: auxItems(st) }),
    notes: 'grid cell colours (best row, running column) not checked',
  } as OracleCase<In1672>,
  {
    slug: '189-rotate-array',
    gen: (r): In189 => { const n = rint(r, 1, 12); return { nums: rarr(r, n, -9, 9), k: r() < 0.15 ? n * rint(r, 0, 3) : rint(r, 0, 20) }; },
    oracle: oracle189,
    // (pointer chips l / r are checked against the variables in the invariants below)
    project: (st) => ({ k: num(st, 'k'), l: num(st, 'l'), r: num(st, 'r'), arr: cellValues(st) as number[] }),
    invariants: [
      ptrVar('l', 'l'), ptrVar('r', 'r'),
      (st, _i, _s, { nums }) => {
        const a = cellValues(st).map(Number);
        const x = [...a].sort((p, q) => p - q).join(), y = [...nums].sort((p, q) => p - q).join();
        return x === y ? null : `array [${a}] is not a permutation of the input`;
      },
    ],
    notes: 'swap / active-range colours not checked',
  } as OracleCase<In189>,
  {
    slug: '1929-concatenation-of-array',
    gen: (r): In1929 => ({ nums: rarr(r, rint(r, 1, 8), 1, 9) }),
    oracle: oracle1929,
    invariants: [ptrVar('i', 'i'), (st) => ptrVar('in', 'i', num(st, 'n') ?? 0)(st)],
    project: (st) => ({ n: num(st, 'n'), i: num(st, 'i'), ans: cellValues(st) }),
    notes: 'cell colours not checked',
  } as OracleCase<In1929>,
  {
    slug: '202-happy-number',
    gen: (r): In202 => { for (;;) { const n = r() < 0.3 ? rint(r, 1, 30) : rint(r, 1, 9999); if (happyChain(n).vals.length <= 14) return { n }; } },
    oracle: oracle202,
    project: (st) => {
      const sc = sceneOfKind(st, 'list');
      const nodes = sc?.nodes ?? [];
      const last = nodes[nodes.length - 1];
      return { slow: num(st, 'slow'), fast: num(st, 'fast'), round: num(st, 'round'), chain: nodes.map((x) => Number(x.value)), back: last ? last.next : null };
    },
    notes: 'node colours (found / error) not checked; slow / fast are compared by value, chip positions are not',
  } as OracleCase<In202>,
  {
    slug: '205-isomorphic-strings',
    gen: (r): In205 => {
      const n = rint(r, 1, 10);
      const s = rstr(r, n, r() < 0.5 ? 'ab' : 'abcd');
      if (r() < 0.5) { // a true bijection image
        const perm = [...'wxyz'].sort(() => r() - 0.5);
        return { s, t: [...s].map((c) => perm['abcd'.indexOf(c)]).join('') };
      }
      return { s, t: rstr(r, n, 'wxy') };
    },
    oracle: oracle205,
    project: (st) => ({ i: num(st, 'i'), a: v(shown(st, 'a')), b: v(shown(st, 'b')), st: auxItems(st, 0), ts: auxItems(st, 1) }),
    notes: 'cell colours not checked; maps are listed in insertion order (a Java HashMap would order differently)',
  } as OracleCase<In205>,
  {
    slug: '213-house-robber-ii',
    gen: (r): In213 => ({ nums: rarr(r, rint(r, 1, 10), 0, r() < 0.4 ? 4 : 99) }),
    oracle: oracle213,
    project: (st) => {
      const g = sceneOfKind(st, 'grid');
      return {
        i: num(st, 'i'), rob: num(st, 'rob it'), skip: num(st, 'skip it'), bestA: num(st, 'best A'), bestB: num(st, 'best B'),
        rowA: (g?.rows[1] ?? []).map((c) => String(c.value)), rowB: (g?.rows[2] ?? []).map((c) => String(c.value)),
      };
    },
    notes: 'cell colours (source / target cells) not checked',
  } as OracleCase<In213>,
  {
    slug: '217-contains-duplicate',
    gen: (r): In217 => ({ nums: rarr(r, rint(r, 1, 12), -3, r() < 0.4 ? 5 : 30) }),
    oracle: oracle217,
    invariants: [ptrVar('i', 'i')],
    project: (st) => ({ i: num(st, 'i'), x: num(st, 'x'), seen: num(st, 'seen'), set: auxItems(st), ans: v(st.result?.title ?? null) }),
    notes: 'cell colours not checked; the set panel is listed in insertion order (a Java HashSet orders differently); early exit and the final verdict are included',
  } as OracleCase<In217>,
  {
    slug: '2239-find-closest-number-to-zero',
    gen: (r): In2239 => ({ nums: rarr(r, rint(r, 1, 12), -6, 6) }),
    oracle: oracle2239,
    invariants: [ptrVar('i', 'i')],
    project: (st) => ({ i: num(st, 'i'), best: num(st, 'best'), abs: num(st, '|best|'), ans: v(st.result?.title ?? null) }),
    notes: 'cell colours not checked',
  } as OracleCase<In2239>,
  {
    slug: '226-invert-binary-tree',
    gen: (r): TreeIn => ({ tokens: genTokens(r, 12, 1, 9, r() < 0.5 ? 0.5 : 0.85) }),
    oracle: oracle226,
    project: (st) => {
      const lk = treeLinks(st);
      return { node: num(st, 'node'), left: v(shown(st, 'left')), right: v(shown(st, 'right')), stack: auxItems(st), tl: lk.left, tr: lk.right };
    },
    notes: 'node colours (active / swap / found) not checked',
  } as OracleCase<TreeIn>,
  {
    slug: '236-lowest-common-ancestor',
    gen: (r): In236 => {
      for (;;) {
        const tokens = genDistinctTokens(r, 12, r() < 0.5 ? 0.5 : 0.85);
        const vals = tokens.filter((x): x is number => x !== null);
        if (vals.length < 2) continue;
        const p = vals[rint(r, 0, vals.length - 1)];
        let q = vals[rint(r, 0, vals.length - 1)];
        while (q === p) q = vals[rint(r, 0, vals.length - 1)];
        return { tokens, p, q };
      }
    },
    oracle: oracle236,
    project: (st) => ({ node: num(st, 'node'), left: v(shown(st, 'left')), right: v(shown(st, 'right')), returns: v(shown(st, 'returns')), stack: auxItems(st), labels: treeLabels(st) }),
    invariants: [
      (st, i, steps, { tokens, p, q }) => {
        if (i !== steps.length - 1) return null;
        // independent check of the answer: deepest common node of the two root paths
        const nodes = treeFromTokens(tokens);
        const path = (target: number): number[] => {
          const go = (id: number | null, acc: number[]): number[] | null => {
            if (id === null) return null;
            const a = [...acc, nodes[id].v];
            if (nodes[id].v === target) return a;
            return go(nodes[id].l, a) ?? go(nodes[id].r, a);
          };
          return go(0, []) as number[];
        };
        const a = path(p), b = path(q);
        let k = 0;
        while (k < a.length && k < b.length && a[k] === b[k]) k++;
        const want = a[k - 1];
        return num(st, 'returns') === want ? null : `final LCA ${num(st, 'returns')} != path-based LCA ${want}`;
      },
    ],
    notes: 'node colours not checked; values are distinct (the problem requires it)',
  } as OracleCase<In236>,
  {
    slug: '240-search-a-2d-matrix-ii',
    gen: (r): In240 => {
      const R = rint(r, 1, 7), C = rint(r, 1, 9);
      const m: number[][] = [];
      for (let i = 0; i < R; i++) {
        m.push([]);
        for (let j = 0; j < C; j++) m[i].push(Math.max(i ? m[i - 1][j] : 0, j ? m[i][j - 1] : 0) + rint(r, 0, 3));
      }
      const flat = m.flat();
      return { m, target: r() < 0.5 ? flat[rint(r, 0, flat.length - 1)] : rint(r, -1, flat[flat.length - 1] + 2) };
    },
    oracle: oracle240,
    project: (st) => ({ target: num(st, 'target'), row: num(st, 'row'), col: num(st, 'col'), current: num(st, 'current'), ans: v(st.result?.title ?? null) }),
    invariants: [
      (st, _i, _s, { m }) => { // the highlighted cell is the one at (row, col) and the 'current' var shows its value
        const g = sceneOfKind(st, 'grid');
        const r = num(st, 'row'), c = num(st, 'col');
        if (!g || r === null || c === null || r >= m.length || c < 0) return null;
        const st0 = g.rows[r][c].state;
        if (st0 !== 'active' && st0 !== 'found') return `cell (${r},${c}) has state ${st0}, expected active/found`;
        if (num(st, 'current') !== m[r][c]) return `current ${num(st, 'current')} != m[${r}][${c}] = ${m[r][c]}`;
        // staircase invariant: every cell in an eliminated row (above r) or column (right of c) is dimmed
        for (let i = 0; i < m.length; i++) for (let j = 0; j < m[0].length; j++) if ((i < r || j > c) && g.rows[i][j].state !== 'dim') return `eliminated cell (${i},${j}) not dimmed`;
        return null;
      },
    ],
    notes: 'cell colours (eliminated / current / found) not checked',
  } as OracleCase<In240>,
  {
    slug: '242-valid-anagram',
    gen: (r): In242 => {
      const n = rint(r, 1, 10);
      const s = rstr(r, n, r() < 0.5 ? 'ab' : 'abcd');
      const roll = r();
      if (roll < 0.4) return { s, t: [...s].sort(() => r() - 0.5).join('') };
      if (roll < 0.55) return { s, t: rstr(r, rint(r, 1, 10), 'abcd') };
      return { s, t: rstr(r, n, 'abcd') };
    },
    oracle: oracle242,
    project: (st) => ({ i: num(st, 'i'), ch: v(shown(st, 'char')), phase: v(shown(st, 'phase')), map: auxItems(st), ans: v(st.result?.title ?? null) }),
    notes: 'grid cell colours (error letters, progress) not checked; the balance map is in first-seen order',
  } as OracleCase<In242>,
  {
    slug: '268-missing-number',
    gen: (r): In268 => {
      const n = rint(r, 1, 12);
      const all = Array.from({ length: n + 1 }, (_, i) => i);
      all.splice(rint(r, 0, n), 1);
      return { nums: all.sort(() => r() - 0.5) };
    },
    oracle: oracle268,
    project: (st) => ({ lo: num(st, 'lo'), mid: num(st, 'mid'), hi: num(st, 'hi'), val: num(st, 'nums[mid]'), iter: num(st, 'iterations'), cells: cellValues(st) as number[], ans: v(st.result?.title ?? null) }),
    invariants: [
      (st) => {
        for (const k of ['lo', 'mid', 'hi']) { const p = ptr(st, k); if (p !== null && p !== num(st, k)) return `pointer ${k} at ${p} but ${k} = ${num(st, k)}`; }
        return null;
      },
      (st, i, steps, { nums }) => {
        if (i !== steps.length - 1) return null;
        const n = nums.length;
        const want = n * (n + 1) / 2 - nums.reduce((a, b) => a + b, 0);
        return String(want) === st.result?.title ? null : `answer ${st.result?.title} != sum-based missing number ${want}`;
      },
    ],
    notes: 'cell colours not checked',
  } as OracleCase<In268>,
  {
    slug: '271-encode-and-decode-strings',
    gen: (r): In271 => {
      for (;;) {
        const words = Array.from({ length: rint(r, 1, 4) }, () => rstr(r, rint(r, 1, 6), 'ab#12'));
        if (words.map((w) => `${w.length}#${w}`).join('').length <= 24) return { words };
      }
    },
    oracle: oracle271,
    project: (st) => ({
      i: num(st, 'i'), len: num(st, 'len'), words: num(st, 'words'), cells: cellValues(st) as string[],
      decoded: st.aux?.[0]?.title.startsWith('decoded') ? auxItems(st, 0) : [], ans: v(st.result?.title ?? null),
    }),
    notes: 'cell colours (length digits, delimiter, word characters) and pointer chips not checked; the encoding format is length + "#" + word',
  } as OracleCase<In271>,
];

// ================================================================== final answer text vs an independent brute force
/**
 * Every animation ends with `result.title`. For the problems whose oracle state does not already carry the verdict, check that
 * text against a brute-force answer computed differently from the oracle (naive / exhaustive method). Appended as an invariant.
 */
const levelOrder = (tokens: Tok[], mirror: boolean): string => {
  const nodes = treeFromTokens(tokens);
  const flip = (id: number | null) => { if (id === null) return; flip(nodes[id].l); flip(nodes[id].r); if (mirror) [nodes[id].l, nodes[id].r] = [nodes[id].r, nodes[id].l]; };
  flip(0);
  const out: (number | null)[] = [];
  const q: (number | null)[] = [0];
  for (let i = 0; i < q.length; i++) { const id = q[i]; if (id === null) { out.push(null); continue; } out.push(nodes[id].v); q.push(nodes[id].l, nodes[id].r); }
  while (out.length && out[out.length - 1] === null) out.pop();
  return `[${out.map((x) => (x === null ? 'null' : x)).join(',')}]`;
};
const finals: Record<string, (input: any) => string> = {
  '1004-max-consecutive-ones-iii': ({ nums, k }: In1004) => {
    let best = 0;
    for (let a = 0; a < nums.length; a++) for (let b = a; b < nums.length; b++) if (nums.slice(a, b + 1).filter((x) => x === 0).length <= k) best = Math.max(best, b - a + 1);
    return String(best);
  },
  '1046-last-stone-weight': ({ stones }: In1046) => {
    let a = [...stones];
    while (a.length > 1) { a.sort((x, y) => y - x); const d = a[0] - a[1]; a = a.slice(2); if (d) a.push(d); }
    return String(a.length ? a[0] : 0);
  },
  '110-balanced-binary-tree': ({ tokens }: TreeIn) => {
    const nodes = treeFromTokens(tokens);
    const depth = (id: number | null): number => (id === null ? 0 : 1 + Math.max(depth(nodes[id].l), depth(nodes[id].r)));
    return String(nodes.every((n) => Math.abs(depth(n.l) - depth(n.r)) <= 1));
  },
  '112-path-sum': ({ tokens, target }: In112) => {
    const nodes = treeFromTokens(tokens);
    const sums: number[] = [];
    const go = (id: number, s: number) => { const n = nodes[id]; const t = s + n.v; if (n.l === null && n.r === null) sums.push(t); if (n.l !== null) go(n.l, t); if (n.r !== null) go(n.r, t); };
    go(0, 0);
    return String(sums.includes(target));
  },
  '114-flatten-binary-tree-to-linked-list': ({ tokens }: TreeIn) => {
    const nodes = treeFromTokens(tokens);
    const pre: number[] = [];
    const go = (id: number | null) => { if (id === null) return; pre.push(nodes[id].v); go(nodes[id].l); go(nodes[id].r); };
    go(0);
    return `[${pre.join(',')}]`;
  },
  '1189-maximum-number-of-balloons': ({ text }: In1189) => {
    const pool = [...text];
    let n = 0;
    for (;;) {
      let ok = true;
      for (const ch of 'balloon') { const k = pool.indexOf(ch); if (k < 0) { ok = false; break; } pool.splice(k, 1); }
      if (!ok) break;
      n++;
    }
    return String(n);
  },
  '125-valid-palindrome': ({ s }: In125) => { const c = s.toLowerCase().replace(/[^a-z0-9]/g, ''); return String(c === [...c].reverse().join('')); },
  '13-roman-to-integer': ({ s }: In13) => {
    let rest = s, total = 0;
    for (const [sym, val] of [['CM', 900], ['CD', 400], ['XC', 90], ['XL', 40], ['IX', 9], ['IV', 4]] as [string, number][]) while (rest.includes(sym)) { rest = rest.replace(sym, ''); total += val; }
    for (const ch of rest) total += { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }[ch as 'I'];
    return String(total);
  },
  '133-clone-graph': ({ n, edges }: In133) => `[${Array.from({ length: n }, (_, i) => `[${edges.flatMap((e) => (e.u === i + 1 ? [e.v] : e.v === i + 1 ? [e.u] : [])).sort((a, b) => a - b).join(', ')}]`).join(', ')}]`,
  '135-candy': ({ ratings: r }: In135) => {
    const c = r.map(() => 1);
    for (let changed = true; changed;) {
      changed = false;
      for (let i = 0; i < r.length; i++) {
        if (i > 0 && r[i] > r[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; changed = true; }
        if (i + 1 < r.length && r[i] > r[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; changed = true; }
      }
    }
    return String(c.reduce((a, b) => a + b, 0));
  },
  '138-copy-list-with-random-pointer': ({ vals }: In138) => vals.join(' → '),
  '139-word-break': ({ s, words }: In139) => {
    const memo = new Map<number, boolean>();
    const can = (i: number): boolean => {
      if (i === s.length) return true;
      if (memo.has(i)) return memo.get(i) as boolean;
      const x = words.some((w) => s.startsWith(w, i) && can(i + w.length));
      memo.set(i, x);
      return x;
    };
    return String(can(0));
  },
  '14-longest-common-prefix': ({ words }: In14) => { let p = words[0]; while (!words.every((w) => w.startsWith(p))) p = p.slice(0, -1); return JSON.stringify(p); },
  '143-reorder-list': ({ vals }: In143) => { const out: number[] = []; let a = 0, b = vals.length - 1; while (a <= b) { out.push(vals[a++]); if (a <= b) out.push(vals[b--]); } return out.join(' → '); },
  '1470-shuffle-the-array': ({ nums, n }: In1470) => `[${nums.slice(0, n).flatMap((x, i) => [x, nums[i + n]]).join(', ')}]`,
  '153-find-minimum-in-rotated-sorted-array': ({ nums }: In153) => String(Math.min(...nums)),
  '1672-richest-customer-wealth': ({ accounts }: In1672) => String(Math.max(...accounts.map((row) => row.reduce((a, b) => a + b, 0)))),
  '189-rotate-array': ({ nums, k }: In189) => { const n = nums.length; const kk = k % n; return `[${[...nums.slice(n - kk), ...nums.slice(0, n - kk)].join(',')}]`; },
  '1929-concatenation-of-array': ({ nums }: In1929) => `[${[...nums, ...nums].join(', ')}]`,
  '202-happy-number': ({ n }: In202) => { const seen = new Set<number>(); let x = n; while (x !== 1 && !seen.has(x)) { seen.add(x); x = dsq(x); } return String(x === 1); },
  '205-isomorphic-strings': ({ s, t }: In205) => {
    const sig = (x: string) => [...x].map((c) => x.indexOf(c)).join(',');
    return String(sig(s) === sig(t));
  },
  '213-house-robber-ii': ({ nums }: In213) => {
    const n = nums.length;
    let best = 0;
    for (let mask = 0; mask < 1 << n; mask++) {
      let ok = true, sum = 0;
      for (let i = 0; i < n && ok; i++) if (mask & (1 << i)) { sum += nums[i]; if (n > 1 && mask & (1 << ((i + 1) % n))) ok = false; }
      if (ok) best = Math.max(best, sum);
    }
    return String(best);
  },
  '226-invert-binary-tree': ({ tokens }: TreeIn) => levelOrder(tokens, true),
};
for (const c of cases) {
  const f = finals[c.slug];
  if (!f) continue;
  (c.invariants ??= []).push((st, i, steps, input) => {
    if (i !== steps.length - 1) return null;
    const want = f(input);
    return st.result?.title === want ? null : `final result "${st.result?.title}" != brute-force answer "${want}"`;
  });
}
