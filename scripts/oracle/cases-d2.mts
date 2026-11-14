import type { Step } from '../../src/engine/types.ts';
import type { CaseModule, State } from './types.ts';
import { num, ptr, rarr, rint, sceneOfKind, scenesOf } from './util.ts';

/**
 * Batch d2: stacks, monotonic stacks, linked lists, tree DFS/BFS/paths/BST, Morris, tree construction, LRU/LFU caches.
 * Every oracle below is an independent re-implementation from the textbook algorithm (never imports a problem file or kit).
 */

// ---------------------------------------------------------------- shared helpers (own copy; util.ts is not edited)
/** Items of the first aux panel whose title starts with `prefix` (empty array when the panel is absent). */
const auxItems = (step: Step, prefix: string): string[] => (step.aux ?? []).find((a) => a.title.startsWith(prefix))?.items ?? [];
const hasAux = (step: Step, prefix: string): boolean => (step.aux ?? []).some((a) => a.title.startsWith(prefix));
const toNum = (s: string): number | string => (s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : s);
const resultTitle = (step: Step): string | null => step.result?.title ?? null;
const pick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];

type Case = CaseModule['cases'][number];
export const cases: Case[] = [];

// ================================================================ 20 Valid Parentheses
{
  type In = { s: string };
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const oracle = ({ s }: In): State[] => {
    const out: State[] = [];
    const st: string[] = [];
    out.push({ i: null, stack: [], result: null });
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if ('([{'.includes(c)) {
        st.push(c);
        out.push({ i, stack: [...st], result: null });
      } else {
        if (!st.length) { out.push({ i, stack: [], result: 'false' }); return out; }
        const top = st.pop()!;
        if (top !== pairs[c]) { out.push({ i, stack: [...st], result: 'false' }); return out; }
        out.push({ i, stack: [...st], result: null });
      }
    }
    out.push({ i: null, stack: [...st], result: st.length === 0 ? 'true' : 'false' });
    return out;
  };
  cases.push({
    slug: '20-valid-parentheses',
    gen: (r): In => {
      const n = rint(r, 1, 9);
      let s = '';
      const open: string[] = [];
      const ch = '([{';
      for (let i = 0; i < n; i++) {
        if (open.length && r() < 0.5) { const o = open.pop()!; s += o === '(' ? ')' : o === '[' ? ']' : '}'; }
        else if (r() < 0.12) s += pick(r, [')', ']', '}']);
        else { const o = ch[rint(r, 0, 2)]; open.push(o); s += o; }
      }
      if (r() < 0.5) while (open.length) { const o = open.pop()!; s += o === '(' ? ')' : o === '[' ? ']' : '}'; }
      return { s: s.slice(0, 14) };
    },
    oracle,
    project: (step) => ({ i: num(step, 'i'), stack: auxItems(step, 'stack'), result: resultTitle(step) }),
    invariants: [(step) => { const sz = num(step, 'stack size'); return sz === auxItems(step, 'stack').length ? null : `stack size var ${sz} != panel`; }],
    notes: 'match-check panel text and cell colours not compared',
  });
}

// ================================================================ 150 Evaluate Reverse Polish Notation
{
  type In = { tokens: string[] };
  const apply = (a: number, b: number, op: string): number => (op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : Math.trunc(a / b));
  const oracle = ({ tokens }: In): State[] => {
    const out: State[] = [{ i: null, stack: [] }];
    const st: number[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (['+', '-', '*', '/'].includes(t)) {
        const b = st.pop()!; const a = st.pop()!;
        out.push({ i, stack: [...st] }); // both operands popped
        st.push(apply(a, b, t));
        out.push({ i, stack: [...st] });
      } else { st.push(Number(t)); out.push({ i, stack: [...st] }); }
    }
    out.push({ i: null, stack: [...st] });
    return out;
  };
  cases.push({
    slug: '150-evaluate-reverse-polish-notation',
    gen: (r): In => {
      const n = rint(r, 0, 4);
      const vals: number[] = [];
      const tokens: string[] = [];
      const pushNum = () => { const v = rint(r, -9, 12); vals.push(v); tokens.push(String(v)); };
      pushNum();
      for (let k = 0; k < n; k++) {
        pushNum();
        while (vals.length > 1 && r() < 0.6) {
          const op = pick(r, ['+', '-', '*', '/']);
          const b = vals[vals.length - 1];
          if (op === '/' && b === 0) continue;
          vals.pop(); const a = vals.pop()!; vals.push(apply(a, b, op)); tokens.push(op);
        }
      }
      while (vals.length > 1) {
        const b = vals[vals.length - 1];
        const ops = ['+', '-', '*'].concat(b === 0 ? [] : ['/']);
        const op = pick(r, ops);
        vals.pop(); const a = vals.pop()!; vals.push(apply(a, b, op)); tokens.push(op);
      }
      return { tokens };
    },
    oracle,
    project: (step) => ({ i: num(step, 'i'), stack: auxItems(step, 'operand').map(toNum) as number[] }),
  });
}

// ================================================================ 155 Min Stack
{
  type Op = { op: 'push' | 'pop' | 'top' | 'getMin'; val?: number };
  type In = { ops: Op[] };
  const oracle = ({ ops }: In): State[] => {
    const out: State[] = [];
    const main: number[] = [];
    const mins: number[] = [];
    const ret: string[] = [];
    const snap = (): State => ({ stack: [...main], mins: [...mins], ret: [...ret], size: main.length, curMin: mins.length ? mins[mins.length - 1] : null });
    out.push(snap());
    for (const o of ops) {
      if (o.op === 'push') { main.push(o.val!); mins.push(mins.length ? Math.min(o.val!, mins[mins.length - 1]) : o.val!); ret.push('null'); }
      else if (o.op === 'pop') { main.pop(); mins.pop(); ret.push('null'); }
      else if (o.op === 'top') ret.push(String(main[main.length - 1]));
      else ret.push(String(mins[mins.length - 1]));
      out.push(snap());
    }
    return out;
  };
  cases.push({
    slug: '155-min-stack',
    gen: (r): In => {
      const n = rint(r, 1, 11);
      const ops: Op[] = [];
      let size = 0;
      for (let i = 0; i < n; i++) {
        const k = r();
        if (size === 0 || k < 0.4) { ops.push({ op: 'push', val: rint(r, -5, 9) }); size++; }
        else if (k < 0.6) { ops.push({ op: 'pop' }); size--; }
        else ops.push({ op: r() < 0.5 ? 'top' : 'getMin' });
      }
      return { ops };
    },
    oracle,
    project: (step) => ({
      stack: auxItems(step, 'main').map(toNum) as number[],
      mins: auxItems(step, 'min stack').map(toNum) as number[],
      ret: auxItems(step, 'returned'),
      size: num(step, 'size'),
      curMin: num(step, 'current min'),
    }),
    invariants: [(step) => {
      const m = auxItems(step, 'main').map(Number), n = auxItems(step, 'min stack').map(Number);
      if (m.length !== n.length) return 'main and min stacks differ in height';
      for (let i = 0; i < m.length; i++) if (n[i] !== Math.min(...m.slice(0, i + 1))) return `min stack level ${i} is not the prefix minimum`;
      return null;
    }],
  });
}

// ================================================================ 224 Basic Calculator
{
  type In = { expr: string };
  const sg = (s: number) => (s > 0 ? 1 : -1);
  const oracle = ({ expr }: In): State[] => {
    const out: State[] = [];
    let res = 0, n = 0, sign = 1;
    const st: number[] = []; // textbook: push result then sign
    const snap = (): State => ({ result: res, sign: sg(sign), num: n, stack: st.map((v, i) => (i % 2 === 0 ? `r${v}` : `s${v}`)) });
    out.push(snap());
    for (const ch of expr) {
      if (ch >= '0' && ch <= '9') { n = n * 10 + Number(ch); }
      else if (ch === '+' || ch === '-') { res += sign * n; n = 0; sign = ch === '+' ? 1 : -1; }
      else if (ch === '(') { st.push(res); st.push(sign); res = 0; sign = 1; }
      else { res += sign * n; n = 0; res *= st.pop()!; res += st.pop()!; }
      out.push(snap());
    }
    res += sign * n; // return res + sign * num
    out.push(snap());
    return out;
  };
  const genExpr = (r: () => number, budget: number, depth: number): string => {
    // number | -number | (expr)
    let s = '';
    const terms = rint(r, 1, 3);
    for (let t = 0; t < terms; t++) {
      if (t > 0) s += r() < 0.5 ? '+' : '-';
      else if (r() < 0.15) s += '-';
      if (depth < 2 && budget > 6 && r() < 0.35) s += '(' + genExpr(r, budget - 5, depth + 1) + ')';
      else s += String(rint(r, 0, r() < 0.2 ? 120 : 9));
    }
    return s;
  };
  cases.push({
    slug: '224-basic-calculator',
    gen: (r): In => {
      for (let k = 0; k < 20; k++) { const e = genExpr(r, 16, 0); if (e.length <= 16) return { expr: e }; }
      return { expr: '1+1' };
    },
    oracle,
    project: (step) => {
      const stack = auxItems(step, 'stack').map((x) => (x.startsWith('result ') ? `r${x.slice(7)}` : `s${x.endsWith('−') ? -1 : 1}`));
      return { result: num(step, 'result'), sign: step.vars.sign === '−' ? -1 : 1, num: num(step, 'num'), stack };
    },
    notes: 'final "Flush" step is the return expression res + sign*num (num is not reset); cell colours not compared',
  });
}

// ================================================================ 402 Remove K Digits
{
  type In = { num: string; k: number };
  const oracle = ({ num: s, k: k0 }: In): State[] => {
    const out: State[] = [];
    let k = k0;
    const st: number[] = [];
    const gone: number[] = [];
    const snap = (cur: number | null): State => ({ digit: cur === null ? null : s[cur], k, stack: st.map((j) => s[j]), removed: [...gone].sort((a, b) => a - b).map((j) => s[j]) });
    out.push(snap(null));
    for (let i = 0; i < s.length; i++) {
      out.push(snap(i));
      while (k > 0 && st.length && s[st[st.length - 1]] > s[i]) { gone.push(st.pop()!); k--; out.push(snap(i)); }
      st.push(i);
      out.push(snap(i));
    }
    out.push(snap(null));
    while (k > 0) { gone.push(st.pop()!); k--; out.push(snap(null)); }
    return out;
  };
  cases.push({
    slug: '402-remove-k-digits',
    gen: (r): In => {
      const n = rint(r, 1, 9);
      const digs = Array.from({ length: n }, () => String(r() < 0.25 ? 0 : rint(r, 1, 9))).join('');
      const s = digs[0] === '0' && n > 1 ? '1' + digs.slice(1) : digs;
      return { num: s, k: rint(r, 0, n) };
    },
    oracle,
    project: (step) => ({ digit: step.vars.digit === '—' ? null : String(step.vars.digit), k: num(step, 'k left'), stack: auxItems(step, 'stack').map(String), removed: auxItems(step, 'removed').map(String) }),
    notes: 'leading-zero strip and final answer string not compared (the stack panel is not changed by the strip)',
  });
}

// ================================================================ 496 Next Greater Element I
{
  type In = { nums1: number[]; nums2: number[] };
  const oracle = ({ nums1, nums2 }: In): State[] => {
    const out: State[] = [];
    const st: number[] = [];
    const map: [number, number][] = [];
    const snap = (i: number | null, ans: number[]): State => ({ i, stack: [...st], map: map.map(([a, b]) => `${a} → ${b}`), ans });
    out.push(snap(null, []));
    for (let i = 0; i < nums2.length; i++) {
      const x = nums2[i];
      out.push(snap(i, []));
      while (st.length && st[st.length - 1] < x) { map.push([st.pop()!, x]); out.push(snap(i, [])); }
      st.push(x);
      out.push(snap(i, []));
    }
    out.push(snap(null, [])); // nums2 fully scanned
    const m = new Map(map);
    const ans: number[] = [];
    for (const v of nums1) { ans.push(m.has(v) ? m.get(v)! : -1); out.push(snap(null, [...ans])); }
    return out;
  };
  cases.push({
    slug: '496-next-greater-element-i',
    gen: (r): In => {
      const n = rint(r, 1, 8);
      const pool = Array.from({ length: 10 }, (_, k) => k + 1);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const nums2 = pool.slice(0, n);
      const k = rint(r, 1, n);
      const nums1 = [...nums2].sort(() => r() - 0.5).slice(0, k);
      return { nums1, nums2 };
    },
    oracle,
    project: (step) => ({ i: num(step, 'i'), stack: auxItems(step, 'stack').map(toNum) as number[], map: auxItems(step, 'next greater'), ans: auxItems(step, 'answer').map(toNum) as number[] }),
  });
}

// ================================================================ 503 Next Greater Element II
{
  type In = { nums: number[] };
  const oracle = ({ nums }: In): State[] => {
    const n = nums.length;
    const out: State[] = [];
    const st: number[] = [];
    const ans: (number | string)[] = Array(n).fill('?');
    const snap = (i: number | null, lap: number | string | null): State => ({ i, x: i === null ? null : nums[i % n], lap, stack: st.map((j) => `${j}:${nums[j]}`), ans: [...ans].map(String) });
    out.push(snap(null, null));
    for (let i = 0; i < 2 * n; i++) {
      const lap = i < n ? 1 : 2;
      out.push(snap(i, lap));
      const x = nums[i % n];
      while (st.length && nums[st[st.length - 1]] < x) { ans[st.pop()!] = x; out.push(snap(i, lap)); }
      if (i < n) { st.push(i); out.push(snap(i, lap)); }
    }
    for (const j of st) ans[j] = -1;
    out.push(snap(null, 'done'));
    return out;
  };
  cases.push({
    slug: '503-next-greater-element-ii',
    gen: (r): In => ({ nums: rarr(r, rint(r, 1, 8), r() < 0.3 ? 1 : -3, r() < 0.3 ? 2 : 6) }),
    oracle,
    project: (step) => ({ i: num(step, 'i'), x: num(step, 'x'), lap: step.vars.lap === '—' ? null : toNum(String(step.vars.lap)), stack: auxItems(step, 'stack'), ans: auxItems(step, 'answer') }),
    notes: 'visual ring/colours and the lap pointer label not compared',
  });
}

// ================================================================ 739 Daily Temperatures
{
  type In = { temps: number[] };
  const oracle = ({ temps }: In): State[] => {
    const n = temps.length;
    const out: State[] = [];
    const st: number[] = [];
    const ans: (number | string)[] = Array(n).fill('?');
    let resolved = 0;
    const snap = (i: number | null): State => ({ i, stack: st.map((j) => `${j}:${temps[j]}`), ans: ans.map(String), resolved });
    out.push(snap(null));
    for (let i = 0; i < n; i++) {
      out.push(snap(i));
      while (st.length && temps[st[st.length - 1]] < temps[i]) { const j = st.pop()!; ans[j] = i - j; resolved++; out.push(snap(i)); }
      st.push(i);
      out.push(snap(i));
    }
    for (const j of st) ans[j] = 0;
    out.push(snap(null));
    return out;
  };
  cases.push({
    slug: '739-daily-temperatures',
    gen: (r): In => ({ temps: rarr(r, rint(r, 1, 9), 30, r() < 0.3 ? 33 : 100) }),
    oracle,
    project: (step) => ({ i: num(step, 'i'), stack: auxItems(step, 'stack'), ans: auxItems(step, 'answer'), resolved: num(step, 'resolved') }),
    notes: 'compare panel text not compared',
  });
}

// ================================================================ 84 Largest Rectangle in Histogram
{
  type In = { heights: number[] };
  const oracle = ({ heights }: In): State[] => {
    const n = heights.length;
    const out: State[] = [];
    const st: number[] = [];
    let best = 0;
    const snap = (i: number | null, h: number | null): State => ({ i, h, stack: st.map((j) => `${j}:${heights[j]}`), best });
    out.push(snap(null, null));
    for (let i = 0; i <= n; i++) {
      const cur = i === n ? 0 : heights[i];
      out.push(snap(i, cur));
      while (st.length && heights[st[st.length - 1]] > cur) {
        const j = st.pop()!;
        const left = st.length ? st[st.length - 1] : -1;
        best = Math.max(best, heights[j] * (i - left - 1));
        out.push(snap(i, cur));
      }
      if (i < n) { st.push(i); out.push(snap(i, cur)); }
    }
    out.push(snap(null, null));
    return out;
  };
  cases.push({
    slug: '84-largest-rectangle-in-histogram',
    gen: (r): In => ({ heights: rarr(r, rint(r, 1, 9), 0, r() < 0.3 ? 3 : 9) }),
    oracle,
    project: (step) => ({ i: num(step, 'i'), h: num(step, 'h[i]'), stack: auxItems(step, 'stack'), best: num(step, 'best area') }),
    notes: 'area-computation panel text and the highlighted bars not compared (best area is)',
  });
}

// ================================================================ 85 Maximal Rectangle
{
  type In = { grid: string[] };
  const oracle = ({ grid }: In): State[] => {
    const R = grid.length, C = grid[0].length;
    const out: State[] = [];
    const h: number[] = Array(C).fill(0);
    let best = 0;
    let st: number[] = [];
    const snap = (row: number | null, col: number | null): State => ({ row, col, h: [...h], stack: st.map((c) => `${c}:${h[c]}`), best });
    out.push(snap(null, null));
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) h[c] = grid[r][c] === '1' ? h[c] + 1 : 0;
      st = [];
      out.push(snap(r, null));
      for (let i = 0; i <= C; i++) {
        const cur = i === C ? 0 : h[i];
        const col = i === C ? null : i;
        while (st.length && cur < h[st[st.length - 1]]) {
          const j = st.pop()!;
          const left = st.length ? st[st.length - 1] : -1;
          best = Math.max(best, h[j] * (i - left - 1));
          out.push(snap(r, col));
        }
        if (i < C) { st.push(i); out.push(snap(r, col)); }
      }
      st = []; // only zero-height bars may remain; the next row starts with a new stack
      out.push(snap(r, null));
    }
    out.push(snap(null, null));
    return out;
  };
  cases.push({
    slug: '85-maximal-rectangle',
    gen: (r): In => {
      const R = rint(r, 1, 5), C = rint(r, 1, 6);
      const p = pick(r, [0.3, 0.6, 0.85]);
      return { grid: Array.from({ length: R }, () => Array.from({ length: C }, () => (r() < p ? '1' : '0')).join('')) };
    },
    oracle,
    project: (step) => ({ row: num(step, 'row'), col: num(step, 'col'), h: auxItems(step, 'heights').map(Number), stack: auxItems(step, 'stack'), best: num(step, 'best area') }),
    notes: 'grid cell colouring and the highlighted candidate rectangle are not compared',
  });
}

// ================================================================ linked-list helpers
type LNode = { key: number; next: number | null };
const listNodes = (step: Step): LNode[] => (sceneOfKind(step, 'list')?.nodes ?? []) as LNode[];
/** Key of the node a pointer chip sits on (pointer indexes are positions in the scene's node order, which some animations reshuffle). */
const pk = (step: Step, id: string): number | null => {
  const i = ptr(step, id);
  if (i === null) return null;
  return listNodes(step)[i]?.key ?? null;
};
/** "key>next" for every drawn node, sorted by key: the real wiring of the list at this step. */
const nextsOf = (step: Step): string[] => [...listNodes(step)].sort((a, b) => a.key - b.key).map((n) => `${n.key}>${n.next ?? 'x'}`);
const fmtNexts = (nx: Map<number, number | null>): string[] => [...nx.keys()].sort((a, b) => a - b).map((k) => `${k}>${nx.get(k) ?? 'x'}`);
/** next-map of a plain singly linked list whose node keys are base, base+1, ... */
const chain = (base: number, n: number): Map<number, number | null> => new Map(Array.from({ length: n }, (_, i) => [base + i, i + 1 < n ? base + i + 1 : null] as [number, number | null]));
const cyc = (vals: number[], pos: number): (number | null)[] => vals.map((_, i) => (i + 1 < vals.length ? i + 1 : pos >= 0 ? pos : null));
const genCycle = (r: () => number, maxN = 7): { vals: number[]; pos: number } => {
  const n = rint(r, 1, maxN);
  return { vals: rarr(r, n, -5, 9), pos: r() < 0.35 ? -1 : rint(r, 0, n - 1) };
};

// ================================================================ 141 Linked List Cycle
{
  type In = { vals: number[]; pos: number };
  const oracle = ({ vals, pos }: In): State[] => {
    const nx = cyc(vals, pos);
    const out: State[] = [];
    let slow: number | null = 0, fast: number | null = 0, round = 0;
    const snap = (status: string): State => ({ slow, fast, round, status });
    out.push(snap('searching'));
    while (fast !== null && nx[fast] !== null) {
      round++;
      slow = nx[slow!];
      out.push(snap('searching'));
      fast = nx[nx[fast]!];
      out.push(snap('searching'));
      if (slow === fast) { out.push(snap('cycle!')); return out; }
    }
    out.push(snap('no cycle'));
    return out;
  };
  cases.push({
    slug: '141-linked-list-cycle',
    gen: (r) => genCycle(r),
    oracle,
    project: (step) => ({ slow: ptr(step, 'slow'), fast: ptr(step, 'fast'), round: num(step, 'round'), status: String(step.vars.status) }),
    notes: 'node colours not compared',
  });
}

// ================================================================ 142 Linked List Cycle II
{
  type In = { vals: number[]; pos: number };
  const oracle = ({ vals, pos }: In): State[] => {
    const nx = cyc(vals, pos);
    const out: State[] = [];
    let slow: number | null = 0, fast: number | null = 0, p: number | null = null, round = 0;
    const snap = (): State => ({ slow, fast, p, round });
    out.push(snap());
    let met = false;
    while (fast !== null && nx[fast] !== null) {
      round++;
      slow = nx[slow!];
      fast = nx[nx[fast]!];
      out.push(snap());
      if (slow === fast) { met = true; break; }
    }
    if (!met) return out;
    fast = null; p = 0;
    out.push(snap()); // phase 2: a pointer starts at the head, fast is dropped
    while (p !== slow) { p = nx[p!]; slow = nx[slow!]; out.push(snap()); }
    return out;
  };
  cases.push({
    slug: '142-linked-list-cycle-ii',
    gen: (r) => genCycle(r),
    oracle,
    project: (step) => ({ slow: ptr(step, 'slow'), fast: ptr(step, 'fast'), p: ptr(step, 'ptr'), round: num(step, 'round') }),
    notes: 'node colours not compared; in phase 2 the fast chip is hidden (design: ptr replaces it)',
  });
}

// ================================================================ 876 Middle of the Linked List
{
  type In = { vals: number[] };
  const oracle = ({ vals }: In): State[] => {
    const n = vals.length;
    const nx = vals.map((_, i) => (i + 1 < n ? i + 1 : null));
    const out: State[] = [];
    let slow: number | null = 0, fast: number | null = 0, round = 0;
    out.push({ slow, fast, round });
    while (fast !== null && nx[fast] !== null) { round++; slow = nx[slow!]; fast = nx[nx[fast]!]; out.push({ slow, fast, round }); }
    out.push({ slow, fast, round });
    return out;
  };
  cases.push({
    slug: '876-middle-of-the-linked-list',
    gen: (r): In => ({ vals: rarr(r, rint(r, 1, 11), 1, 9) }),
    oracle,
    project: (step) => ({ slow: ptr(step, 'slow'), fast: ptr(step, 'fast'), round: num(step, 'round') }),
    invariants: [(step, _i, _s, { vals }) => {
      const s = ptr(step, 'slow');
      return s === null || String(step.vars.slow) === String(vals[s]) ? null : `slow var ${step.vars.slow} != vals[${s}]`;
    }],
  });
}

// ================================================================ 206 Reverse Linked List
{
  type In = { vals: number[] };
  const oracle = ({ vals }: In): State[] => {
    const n = vals.length;
    const nx = chain(0, n);
    const out: State[] = [];
    let prev: number | null = null, curr: number | null = 0, next: number | null = null, it = 0;
    const snap = (): State => ({ prev, curr, next, it, nexts: fmtNexts(nx) });
    out.push(snap());
    while (curr !== null) {
      it++;
      next = nx.get(curr)!;
      out.push(snap()); // save next
      nx.set(curr, prev);
      out.push(snap()); // flip the arrow
      prev = curr; curr = next; next = null; // advance (the next chip is dropped: it now coincides with curr)
      out.push(snap());
    }
    return out;
  };
  cases.push({
    slug: '206-reverse-linked-list',
    gen: (r): In => ({ vals: rarr(r, rint(r, 1, 9), 1, 9) }),
    oracle,
    project: (step) => ({ prev: pk(step, 'prev'), curr: pk(step, 'curr'), next: pk(step, 'next'), it: num(step, 'iteration'), nexts: nextsOf(step) }),
    notes: 'design: after "Advance" the next chip is cleared (it equals curr); node colours not compared',
  });
}

// ================================================================ 92 Reverse Linked List II
{
  type In = { vals: number[]; left: number; right: number };
  const oracle = ({ vals, left, right }: In): State[] => {
    const nx = chain(0, vals.length + 1); // key 0 = dummy, key i = i-th node (1-based)
    const out: State[] = [];
    let prev: number | null = 0, curr: number | null = null, next: number | null = null;
    const snap = (): State => ({ prev, curr, next, nexts: fmtNexts(nx) });
    out.push(snap());
    for (let i = 1; i < left; i++) { prev = nx.get(prev!)!; out.push(snap()); }
    curr = nx.get(prev!)!;
    out.push(snap());
    for (let i = left; i < right; i++) {
      next = nx.get(curr!)!;
      nx.set(curr!, nx.get(next!)!); out.push(snap()); // curr.next = next.next
      nx.set(next!, nx.get(prev!)!); out.push(snap()); // next.next = prev.next
      nx.set(prev!, next); out.push(snap()); // prev.next = next
    }
    prev = curr = next = null;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '92-reverse-linked-list-ii',
    gen: (r): In => {
      const n = rint(r, 1, 8);
      const a = rint(r, 1, n), b = rint(r, 1, n);
      return { vals: rarr(r, n, 1, 9), left: Math.min(a, b), right: Math.max(a, b) };
    },
    oracle,
    project: (step) => ({ prev: pk(step, 'prev'), curr: pk(step, 'curr'), next: pk(step, 'next'), nexts: nextsOf(step) }),
    notes: '"next = curr.next" is shown together with "curr.next = next.next" (one step); node colours and drawing order not compared',
  });
}

// ================================================================ 19 Remove Nth Node From End of List
{
  type In = { vals: number[]; n: number };
  const oracle = ({ vals, n }: In): State[] => {
    const len = vals.length;
    const nx = chain(0, len + 1);
    const out: State[] = [];
    let slow: number | null = 0, fast: number | null = 1, gap = 0;
    const snap = (): State => ({ slow, fast, gap: `${gap}/${n}`, nexts: fmtNexts(nx) });
    out.push(snap());
    for (let i = 0; i < n; i++) { fast = nx.get(fast!)!; gap = i + 1; out.push(snap()); }
    while (fast !== null) { fast = nx.get(fast)!; slow = nx.get(slow!)!; out.push(snap()); }
    const target = nx.get(slow!)!;
    nx.set(slow!, nx.get(target)!);
    nx.delete(target);
    out.push(snap());
    slow = null; fast = null;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '19-remove-nth-node-from-end',
    gen: (r): In => { const len = rint(r, 1, 8); return { vals: rarr(r, len, 1, 9), n: rint(r, 1, len) }; },
    oracle,
    project: (step) => ({ slow: pk(step, 'slow'), fast: pk(step, 'fast'), gap: String(step.vars.gap), nexts: nextsOf(step) }),
    notes: 'node colours (target highlighted before unlink) not compared',
  });
}

// ================================================================ 21 Merge Two Sorted Lists
{
  type In = { a: number[]; b: number[] };
  const oracle = ({ a, b }: In): State[] => {
    const na = a.length, nb = b.length;
    // keys: 0 = dummy, 1..na = a, na+1..na+nb = b
    const nx = new Map<number, number | null>([[0, null]]);
    for (let i = 0; i < na; i++) nx.set(1 + i, i + 1 < na ? 2 + i : null);
    for (let i = 0; i < nb; i++) nx.set(na + 1 + i, i + 1 < nb ? na + 2 + i : null);
    const val = (k: number) => (k <= na ? a[k - 1] : b[k - na - 1]);
    const out: State[] = [];
    let l1: number | null = na ? 1 : null, l2: number | null = nb ? na + 1 : null, tail = 0, merged = 0;
    const snap = (): State => ({ l1, l2, tail, merged, nexts: fmtNexts(nx) });
    out.push(snap());
    while (l1 !== null && l2 !== null) {
      if (val(l1) <= val(l2)) { nx.set(tail, l1); tail = l1; l1 = nx.get(l1)!; }
      else { nx.set(tail, l2); tail = l2; l2 = nx.get(l2)!; }
      merged++;
      out.push(snap());
    }
    nx.set(tail, l1 !== null ? l1 : l2);
    merged = na + nb;
    out.push(snap());
    l1 = null; l2 = null;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '21-merge-two-sorted-lists',
    gen: (r): In => {
      const mk = (n: number) => rarr(r, n, 0, 9).sort((x, y) => x - y);
      const na = rint(r, 0, 5), nb = rint(r, na === 0 ? 1 : 0, 5);
      return { a: mk(na), b: mk(nb) };
    },
    oracle,
    project: (step) => ({ l1: pk(step, 'l1'), l2: pk(step, 'l2'), tail: pk(step, 'tail'), merged: num(step, 'merged'), nexts: nextsOf(step) }),
    notes: 'design: after "Attach the leftover list" the l1/l2 chips stay on the leftover head until Done; node colours/order not compared',
  });
}

// ================================================================ 2 Add Two Numbers
{
  type In = { a: number[]; b: number[] };
  // The animation shows carry-in at the column step and carry-out only at the next column / Done, so model exactly that.
  const oracle2 = ({ a, b }: In): State[] => {
    const out: State[] = [];
    const digits: number[] = [];
    let carry = 0, col = 0, sum: number | null = null;
    const snap = (): State => ({ col, carry, sum, digits: [...digits], tail: digits.length });
    out.push(snap());
    let i = 0;
    while (i < a.length || i < b.length || carry > 0) {
      col++;
      const x = i < a.length ? a[i] : 0, y = i < b.length ? b[i] : 0;
      sum = x + y + carry;
      out.push(snap()); // "Column k: x + y + carry": carry shown = carry-in
      digits.push(sum % 10);
      out.push(snap()); // "Write digit"
      carry = Math.floor(sum / 10); // becomes visible at the next column step (or at Done)
      i++;
      if (i < a.length || i < b.length || carry > 0) continue;
    }
    sum = null;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '2-add-two-numbers',
    gen: (r): In => {
      const mk = (n: number, nines: boolean) => rarr(r, n, nines ? 9 : 0, 9);
      const nines = r() < 0.3;
      return { a: mk(rint(r, 1, 5), nines), b: mk(rint(r, 1, 5), nines) };
    },
    oracle: oracle2,
    project: (step) => {
      const nodes = listNodes(step) as (LNode & { value: number | string })[];
      const digits = nodes.filter((n) => n.key !== 0).sort((p, q) => p.key - q.key).map((n) => Number(n.value));
      return { col: num(step, 'column'), carry: num(step, 'carry'), sum: num(step, 'sum'), digits, tail: pk(step, 'tail') };
    },
    notes: 'design: the carry var shows the carry-in of the current column; the carry-out appears at the next Column step (or at Done); aux l1/l2 cursors not compared',
  });
}

// ================================================================ 234 Palindrome Linked List
{
  type In = { vals: number[] };
  const oracle2 = ({ vals }: In): State[] => {
    const n = vals.length;
    const nx = chain(0, n);
    const out: State[] = [];
    let slow: number | null = 0, fast: number | null = 0, prev: number | null = null, curr: number | null = null;
    let p1: number | null = null, p2: number | null = null;
    const snap = (): State => ({ slow, fast, prev, curr, p1, p2, nexts: fmtNexts(nx) });
    out.push(snap());
    while (fast !== null && nx.get(fast) !== null) { slow = nx.get(slow!)!; fast = nx.get(nx.get(fast)!)!; out.push(snap()); }
    out.push(snap()); // middle found
    curr = slow;
    slow = null; fast = null; // design: slow/fast chips are replaced by prev/curr once the reversal starts
    while (curr !== null) {
      const t: number | null = nx.get(curr)!;
      nx.set(curr, prev);
      out.push(snap()); // state right after `curr.next = prev`
      prev = curr; curr = t;
    }
    // loop finished: prev/curr chips disappear, p1/p2 appear
    const half = prev;
    prev = null; curr = null;
    p1 = 0; p2 = half;
    out.push(snap());
    while (p2 !== null) {
      if (vals[p1!] !== vals[p2]) return out;
      p1 = nx.get(p1!)!; p2 = nx.get(p2)!;
      out.push(snap());
    }
    return out;
  };
  cases.push({
    slug: '234-palindrome-linked-list',
    gen: (r): In => {
      const n = rint(r, 1, 8);
      const half = rarr(r, Math.ceil(n / 2), 1, 3);
      const vals = r() < 0.6 ? [...half, ...[...half].reverse().slice(n % 2)] : rarr(r, n, 1, 3);
      return { vals };
    },
    oracle: oracle2,
    project: (step) => ({ slow: pk(step, 'slow'), fast: pk(step, 'fast'), prev: pk(step, 'prev'), curr: pk(step, 'curr'), p1: pk(step, 'p1'), p2: pk(step, 'p2'), nexts: nextsOf(step) }),
    notes: 'design: slow/fast chips vanish when reversal starts; reversal chips prev/curr vanish when the compare phase starts; node colours not compared',
  });
}

// ================================================================ 25 Reverse Nodes in k-Group
{
  type In = { vals: number[]; k: number };
  const oracle = ({ vals, k }: In): State[] => {
    const nx = chain(0, vals.length + 1);
    const out: State[] = [];
    let gp: number | null = 0, kth: number | null = null, prev: number | null = null, curr: number | null = null;
    const snap = (): State => ({ gp, kth, prev, curr, nexts: fmtNexts(nx) });
    out.push(snap());
    while (true) {
      let node: number | null = gp, kk = k;
      while (node !== null && kk > 0) { node = nx.get(node)!; kk--; }
      kth = node;
      out.push(snap()); // find the k-th node (or find none)
      if (kth === null) break;
      const groupNext: number | null = nx.get(kth)!;
      prev = groupNext; curr = nx.get(gp!)!;
      out.push(snap()); // prepare to reverse
      const first: number = curr;
      while (curr !== groupNext) {
        const tmp: number | null = nx.get(curr!)!;
        nx.set(curr!, prev);
        out.push(snap()); // curr.next = prev
        prev = curr; curr = tmp;
      }
      nx.set(gp!, kth);
      out.push(snap()); // reconnect: prev/curr as at loop exit, groupPrev.next = kth
      gp = first; kth = null; prev = null; curr = null;
    }
    gp = null;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '25-reverse-nodes-in-k-group',
    gen: (r): In => { const n = rint(r, 1, 9); return { vals: rarr(r, n, 1, 9), k: rint(r, 1, Math.min(n + 1, 5)) }; },
    oracle,
    project: (step) => ({ gp: pk(step, 'gp'), kth: pk(step, 'kth'), prev: pk(step, 'prev'), curr: pk(step, 'curr'), nexts: nextsOf(step) }),
    notes: 'node colours and drawing order not compared; when k=1 the animation is checked as-is',
  });
}

// ================================================================ 287 Find the Duplicate Number
{
  type In = { nums: number[] };
  const oracle = ({ nums }: In): State[] => {
    const out: State[] = [];
    let slow = 0, fast = 0, phase = 1;
    const snap = (): State => ({ phase, slow, fast });
    out.push(snap());
    do { slow = nums[slow]; fast = nums[nums[fast]]; out.push(snap()); } while (slow !== fast);
    phase = 2; slow = 0;
    out.push(snap());
    while (slow !== fast) { slow = nums[slow]; fast = nums[fast]; out.push(snap()); }
    return out;
  };
  cases.push({
    slug: '287-find-the-duplicate-number',
    gen: (r): In => {
      const n = rint(r, 1, 7);
      const len = n + 1;
      const d = rint(r, 1, n);
      const c = rint(r, 2, Math.max(2, Math.min(len, 1 + len - (n - 1))));
      const others = Array.from({ length: n }, (_, i) => i + 1).filter((v) => v !== d).sort(() => r() - 0.5).slice(0, len - c);
      const arr = [...Array(c).fill(d), ...others];
      while (arr.length < len) arr.push(d);
      arr.sort(() => r() - 0.5);
      return { nums: arr };
    },
    oracle,
    project: (step) => ({ phase: step.vars.phase === 'phase 2' ? 2 : 1, slow: ptr(step, 'slow'), fast: ptr(step, 'fast') }),
    invariants: [(step) => { const s = ptr(step, 'slow'); return s === null || Number(step.vars.slow) === s ? null : `slow var ${step.vars.slow} != chip ${s}`; }],
  });
}

// ================================================================ binary-tree helpers (own parser / generators)
type TN = { v: number; l: TN | null; r: TN | null };
type Tok = number | null;
/** LeetCode level-order tokens -> tree. */
function parseTree(tokens: Tok[]): TN | null {
  if (!tokens.length || tokens[0] === null) return null;
  const root: TN = { v: tokens[0], l: null, r: null };
  const q: TN[] = [root];
  let i = 1;
  for (let h = 0; h < q.length && i < tokens.length; h++) {
    const n = q[h];
    if (i < tokens.length && tokens[i] !== null) { n.l = { v: tokens[i] as number, l: null, r: null }; q.push(n.l); }
    i++;
    if (i < tokens.length && tokens[i] !== null) { n.r = { v: tokens[i] as number, l: null, r: null }; q.push(n.r); }
    i++;
  }
  return root;
}
function serializeTree(root: TN | null): Tok[] {
  if (!root) return [];
  const out: Tok[] = [];
  const q: (TN | null)[] = [root];
  for (let h = 0; h < q.length; h++) {
    const n = q[h];
    if (!n) { out.push(null); continue; }
    out.push(n.v);
    q.push(n.l, n.r);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}
function randShape(r: () => number, n: number): TN | null {
  if (n === 0) return null;
  const k = r() < 0.25 ? 0 : r() < 0.25 ? n - 1 : rint(r, 0, n - 1);
  return { v: 0, l: randShape(r, k), r: randShape(r, n - 1 - k) };
}
const inorderNodes = (t: TN | null, out: TN[] = []): TN[] => { if (t) { inorderNodes(t.l, out); out.push(t); inorderNodes(t.r, out); } return out; };
const bfsNodes = (t: TN | null): TN[] => { const out: TN[] = []; if (t) out.push(t); for (let i = 0; i < out.length; i++) { const n = out[i]; if (n.l) out.push(n.l); if (n.r) out.push(n.r); } return out; };
const shuffled = <T,>(r: () => number, xs: T[]): T[] => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
type TreeMode = 'unique' | 'any' | 'bst' | 'digit' | 'signed';
/** Random tree as a token list. */
function genTokens(r: () => number, maxN: number, mode: TreeMode = 'unique', minN = 1): Tok[] {
  const n = r() < 0.15 ? Math.min(12, maxN + 1) : rint(r, minN, maxN); // sometimes the animation size cap (12 nodes)
  const t = randShape(r, n);
  const nodes = inorderNodes(t);
  if (mode === 'bst') {
    const vals = shuffled(r, Array.from({ length: 30 }, (_, i) => i + 1)).slice(0, n).sort((a, b) => a - b);
    nodes.forEach((x, i) => { x.v = vals[i]; });
  } else if (mode === 'unique') {
    const vals = shuffled(r, Array.from({ length: 20 }, (_, i) => i + 1)).slice(0, n);
    nodes.forEach((x, i) => { x.v = vals[i]; });
  } else if (mode === 'digit') nodes.forEach((x) => { x.v = rint(r, 0, 9); });
  else if (mode === 'signed') nodes.forEach((x) => { x.v = rint(r, -9, 9); });
  else nodes.forEach((x) => { x.v = rint(r, 1, 4); });
  return serializeTree(t);
}
const treeFrom = (tokens: Tok[]) => parseTree(tokens);

/** The scene's tree: paths ('' root, 'L', 'LR', ...) of every drawn node, found by walking the scene's own links. */
function sceneTree(step: Step): { paths: Map<number, string>; value: Map<number, string | number>; labels: Record<number, string> } {
  const sc = sceneOfKind(step, 'tree');
  const paths = new Map<number, string>();
  const value = new Map<number, string | number>();
  if (!sc || sc.root === null) return { paths, value, labels: sc?.labels ?? {} };
  const byId = new Map(sc.nodes.map((n) => [n.id, n]));
  const walk = (id: number | null, p: string) => {
    if (id === null) return;
    const n = byId.get(id);
    if (!n) return;
    paths.set(id, p); value.set(id, n.value);
    walk(n.left, p + 'L'); walk(n.right, p + 'R');
  };
  walk(sc.root, '');
  return { paths, value, labels: sc.labels };
}
/** "path:label" of every labelled node, sorted. */
const labelsOf = (step: Step): string[] => {
  const { paths, labels } = sceneTree(step);
  return Object.entries(labels).filter(([, l]) => l !== undefined && l !== '').map(([id, l]) => `${paths.get(Number(id)) ?? '?'}:${l}`).sort();
};
/** "path=value" of every drawn node, sorted: the tree shape built so far. */
const shapeOf = (step: Step): string[] => {
  const { paths, value } = sceneTree(step);
  return [...paths.entries()].map(([id, p]) => `${p}=${value.get(id)}`).sort();
};
const fmtLabels = (m: Map<string, string>): string[] => [...m.entries()].map(([p, l]) => `${p}:${l}`).sort();
const varOrNull = (step: Step, key: string): string | number | null => { const v = step.vars[key]; return v === undefined || v === '—' ? null : v; };
const NEG_INF = '−∞';

// ================================================================ recursive DFS traversals (pre / in / post order)
for (const [slug, order, stackWord] of [
  ['alg-preorder-traversal-recursive-dfs', 'pre', 'pre-order'],
  ['alg-inorder-traversal-recursive-dfs', 'in', 'in-order'],
  ['145-binary-tree-postorder-traversal', 'post', 'post-order'],
] as const) {
  type In = { tokens: Tok[] };
  const oracle = ({ tokens }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    const stack: TN[] = [];
    const result: number[] = [];
    const badges = new Map<string, string>();
    let node: TN | null = null;
    const snap = (): State => ({ node: node ? node.v : null, depth: stack.length, visited: result.length, stack: stack.map((n) => `dfs(${n.v})`), result: [...result], badges: fmtLabels(badges) });
    out.push(snap());
    const dfs = (n: TN, parent: TN | null, p: string) => {
      stack.push(n); node = n; out.push(snap());
      const visit = () => { result.push(n.v); badges.set(p, `#${result.length}`); out.push(snap()); };
      if (order === 'pre') visit();
      if (n.l) dfs(n.l, n, p + 'L');
      if (order === 'in') visit();
      if (n.r) dfs(n.r, n, p + 'R');
      if (order === 'post') visit();
      stack.pop(); node = parent; out.push(snap());
    };
    dfs(root, null, '');
    out.push(snap());
    return out;
  };
  cases.push({
    slug,
    gen: (r): In => ({ tokens: genTokens(r, 11, r() < 0.8 ? 'unique' : 'any') }),
    oracle,
    project: (step) => ({ node: varOrNull(step, 'node'), depth: num(step, 'depth'), visited: num(step, 'visited'), stack: auxItems(step, 'call stack'), result: auxItems(step, 'result'), badges: labelsOf(step) }),
    notes: `${stackWord}: node colours and the rule panel are not compared (the #k visit badges are)`,
  });
}

// ================================================================ 104 Maximum Depth of Binary Tree
{
  type In = { tokens: Tok[] };
  const oracle = ({ tokens }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    const path: TN[] = [];
    const pathStr: string[] = [];
    const labels = new Map<string, string>();
    let node: number | null = null, returns: number | null = null;
    const snap = (): State => ({ node, depth: path.length, returns, stack: path.map((n) => `node ${n.v}`), labels: fmtLabels(labels) });
    out.push(snap());
    const dfs = (n: TN, p: string): number => {
      path.push(n); pathStr.push(p);
      node = n.v; returns = null; out.push(snap()); // visit
      const h = 1 + Math.max(n.l ? dfs(n.l, p + 'L') : 0, n.r ? dfs(n.r, p + 'R') : 0);
      node = n.v; returns = h; labels.set(p, `h=${h}`);
      out.push(snap()); // returns
      path.pop(); pathStr.pop();
      return h;
    };
    const h = dfs(root, '');
    node = null; returns = h;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '104-maximum-depth-of-binary-tree',
    gen: (r): In => ({ tokens: genTokens(r, 11, 'any') }),
    oracle,
    project: (step) => ({ node: varOrNull(step, 'node'), depth: num(step, 'depth'), returns: varOrNull(step, 'returns'), stack: auxItems(step, 'call stack'), labels: labelsOf(step) }),
    notes: 'node colours not compared; the call stack still shows a frame while it reports its return (popped at the next event)',
  });
}

// ================================================================ 543 Diameter of Binary Tree
{
  type In = { tokens: Tok[] };
  const oracle = ({ tokens }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    const path: TN[] = [];
    const labels = new Map<string, string>();
    let node: number | null = null, left: number | string | null = null, right: number | string | null = null, best = 0;
    const snap = (): State => ({ node, left, right, best, stack: path.map((n) => `node ${n.v}`), labels: fmtLabels(labels) });
    out.push(snap());
    const dfs = (n: TN, p: string): number => {
      path.push(n);
      node = n.v; left = '?'; right = '?'; out.push(snap());
      const hl = n.l ? dfs(n.l, p + 'L') : 0;
      const hr = n.r ? dfs(n.r, p + 'R') : 0;
      best = Math.max(best, hl + hr);
      node = n.v; left = hl; right = hr;
      labels.set(p, `h=${1 + Math.max(hl, hr)}`);
      out.push(snap());
      path.pop();
      return 1 + Math.max(hl, hr);
    };
    dfs(root, '');
    node = null; left = null; right = null;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '543-diameter-of-binary-tree',
    gen: (r): In => ({ tokens: genTokens(r, 11, 'any') }),
    oracle,
    project: (step) => ({ node: varOrNull(step, 'node'), left: varOrNull(step, 'left'), right: varOrNull(step, 'right'), best: num(step, 'best'), stack: auxItems(step, 'call stack'), labels: labelsOf(step) }),
    notes: 'node colours not compared',
  });
}

// ================================================================ 124 Binary Tree Maximum Path Sum
{
  type In = { tokens: Tok[] };
  const oracle = ({ tokens }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    const path: TN[] = [];
    const labels = new Map<string, string>();
    let node: number | null = null, left: number | string | null = null, right: number | string | null = null;
    let best: number | string = NEG_INF;
    const snap = (): State => ({ node, left, right, best, stack: path.map((n) => `node ${n.v}`), labels: fmtLabels(labels) });
    out.push(snap());
    const dfs = (n: TN, p: string): number => {
      path.push(n);
      node = n.v; left = '?'; right = '?'; out.push(snap());
      const gl = n.l ? Math.max(0, dfs(n.l, p + 'L')) : 0;
      const gr = n.r ? Math.max(0, dfs(n.r, p + 'R')) : 0;
      const through = n.v + gl + gr;
      best = typeof best === 'number' ? Math.max(best, through) : through;
      node = n.v; left = gl; right = gr;
      const gain = n.v + Math.max(gl, gr);
      labels.set(p, `↑${gain}`);
      out.push(snap());
      path.pop();
      return gain;
    };
    dfs(root, '');
    node = null; left = null; right = null;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '124-binary-tree-maximum-path-sum',
    gen: (r): In => ({ tokens: genTokens(r, 11, 'signed') }),
    oracle,
    project: (step) => ({ node: varOrNull(step, 'node'), left: varOrNull(step, 'left'), right: varOrNull(step, 'right'), best: step.vars.best === NEG_INF ? NEG_INF : num(step, 'best'), stack: auxItems(step, 'call stack'), labels: labelsOf(step) }),
    notes: 'node colours not compared',
  });
}

// ================================================================ 129 Sum Root to Leaf Numbers
{
  type In = { tokens: Tok[] };
  const oracle = ({ tokens }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    const stack: string[] = [];
    const leaves: number[] = [];
    const labels = new Map<string, string>();
    let node: number | null = null, cur: number | null = 0, ret: number | null = null, total = 0;
    const snap = (): State => ({ node, cur, returns: ret, total, stack: [...stack], leaves: [...leaves], labels: fmtLabels(labels) });
    out.push(snap());
    const dfs = (n: TN, before: number, p: string): number => {
      const c = before * 10 + n.v;
      stack.push(`${n.v} → ${c}`);
      labels.set(p, String(c));
      const leaf = !n.l && !n.r;
      node = n.v; cur = c; ret = leaf ? c : null; out.push(snap()); // visit (a leaf already shows what it will return)
      if (leaf) {
        leaves.push(c); total += c;
        node = n.v; cur = c; ret = c; out.push(snap());
        stack.pop();
        return c;
      }
      const a = n.l ? dfs(n.l, c, p + 'L') : 0;
      const b = n.r ? dfs(n.r, c, p + 'R') : 0;
      node = n.v; cur = c; ret = a + b; out.push(snap());
      stack.pop();
      return a + b;
    };
    const ans = dfs(root, 0, '');
    node = null; cur = null; ret = ans;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '129-sum-root-to-leaf-numbers',
    gen: (r): In => ({ tokens: genTokens(r, 11, 'digit') }),
    oracle,
    project: (step) => ({ node: varOrNull(step, 'node'), cur: varOrNull(step, 'cur'), returns: varOrNull(step, 'returns'), total: num(step, 'total'), stack: auxItems(step, 'call stack'), leaves: auxItems(step, 'leaf numbers'), labels: labelsOf(step) }),
    notes: 'node colours not compared; a leaf shows its return value from the Visit step on',
  });
}

// ================================================================ 98 Validate Binary Search Tree
{
  type In = { tokens: Tok[] };
  const oracle = ({ tokens }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    const stack: string[] = [];
    const labels = new Map<string, string>();
    let node: number | null = null, lo: number | string | null = NEG_INF, hi: number | string | null = '∞', returns: string | null = null;
    const snap = (): State => ({ node, lo, hi, returns, stack: [...stack], labels: fmtLabels(labels) });
    out.push(snap());
    const fmt = (x: number | null, inf: string) => (x === null ? inf : String(x));
    let ok = true;
    const dfs = (n: TN | null, l: number | null, h: number | null, p: string): boolean => {
      if (!n) return true;
      const rng = `(${fmt(l, NEG_INF)}, ${fmt(h, '∞')})`;
      stack.push(`node ${n.v} in ${rng}`);
      labels.set(p, rng);
      node = n.v; lo = fmt(l, NEG_INF); hi = fmt(h, '∞');
      const bad = (l !== null && n.v <= l) || (h !== null && n.v >= h);
      returns = bad ? 'false' : null;
      out.push(snap());
      if (bad) { ok = false; return false; }
      const good = dfs(n.l, l, n.v, p + 'L') && dfs(n.r, n.v, h, p + 'R');
      if (good) stack.pop();
      return good;
    };
    dfs(root, null, null, '');
    stack.length = 0; node = null; lo = null; hi = null; returns = ok ? 'true' : 'false';
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '98-validate-binary-search-tree',
    gen: (r): In => {
      const mode = r() < 0.5 ? 'bst' : 'signed';
      const toks = genTokens(r, 10, mode);
      if (mode === 'bst' && r() < 0.5) { // break the BST at one place
        const i = toks.findIndex((t, k) => k > 0 && t !== null && r() < 0.4);
        if (i > 0) toks[i] = rint(r, 1, 30);
      }
      return { tokens: toks };
    },
    oracle,
    project: (step) => ({ node: varOrNull(step, 'node'), lo: varOrNull(step, 'lo'), hi: varOrNull(step, 'hi'), returns: varOrNull(step, 'returns'), stack: auxItems(step, 'call stack'), labels: labelsOf(step) }),
    notes: 'node colours not compared; the "Children of v" explanatory step carries no state change',
  });
}

// ================================================================ 101 Symmetric Tree
{
  type In = { tokens: Tok[] };
  const oracle = ({ tokens }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    const stack: string[] = [];
    let a: number | string | null = null, b: number | string | null = null, returns: string | null = null;
    const snap = (): State => ({ a, b, returns, stack: [...stack] });
    out.push(snap());
    const sv = (n: TN | null) => (n ? n.v : '∅');
    const mirror = (x: TN | null, y: TN | null): boolean => {
      stack.push(`(${sv(x)}, ${sv(y)})`);
      a = sv(x); b = sv(y);
      let res: boolean;
      if (!x && !y) { returns = 'true'; out.push(snap()); res = true; }
      else if (!x || !y) { returns = 'false'; out.push(snap()); res = false; }
      else {
        returns = null; out.push(snap()); // compare
        if (x.v !== y.v) { returns = 'false'; out.push(snap()); res = false; }
        else {
          res = mirror(x.l, y.r) && mirror(x.r, y.l);
          a = sv(x); b = sv(y); returns = String(res); out.push(snap());
        }
      }
      stack.pop();
      return res;
    };
    const res = mirror(root.l, root.r);
    a = null; b = null; returns = String(res); stack.length = 0;
    out.push(snap());
    return out;
  };
  const genSym = (r: () => number): Tok[] => {
    const half = parseTree(genTokens(r, 5, 'any'))!;
    const mirrorOf = (t: TN | null): TN | null => (t ? { v: t.v, l: mirrorOf(t.r), r: mirrorOf(t.l) } : null);
    const root: TN = { v: rint(r, 1, 4), l: half, r: mirrorOf(half) };
    if (r() < 0.4) { const ns = bfsNodes(root); const x = ns[rint(r, 1, ns.length - 1)]; if (x) x.v = rint(r, 5, 9); }
    return serializeTree(root);
  };
  cases.push({
    slug: '101-symmetric-tree',
    gen: (r): In => ({ tokens: r() < 0.7 ? genSym(r) : genTokens(r, 9, 'any') }),
    oracle,
    project: (step) => ({ a: varOrNull(step, 'a'), b: varOrNull(step, 'b'), returns: varOrNull(step, 'returns'), stack: auxItems(step, 'call stack') }),
    notes: 'node colours not compared; "Recurse on the children" explanatory step carries no state change',
  });
}

// ================================================================ 113 Path Sum II
{
  type In = { tokens: Tok[]; target: number };
  const oracle = ({ tokens, target }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    const path: number[] = [];
    const found: string[] = [];
    const labels = new Map<string, string>();
    let node: number | null = null, remaining = target, pathSum = 0;
    const snap = (): State => ({ node, remaining, pathSum, found: found.length, path: [...path], paths: [...found], labels: fmtLabels(labels) });
    out.push(snap());
    const dfs = (n: TN | null, rem: number, sum: number, parent: TN | null, prem: number, psum: number, p: string) => {
      if (!n) return;
      path.push(n.v);
      const r2 = rem - n.v, s2 = sum + n.v;
      node = n.v; remaining = r2; pathSum = s2; labels.set(p, `rem ${r2}`);
      out.push(snap()); // choose
      if (!n.l && !n.r && r2 === 0) { found.push(`[${path.join(',')}]`); out.push(snap()); }
      dfs(n.l, r2, s2, n, r2, s2, p + 'L');
      dfs(n.r, r2, s2, n, r2, s2, p + 'R');
      path.pop();
      node = parent ? parent.v : null; remaining = prem; pathSum = psum;
      out.push(snap()); // backtrack
    };
    dfs(root, target, 0, null, target, 0, '');
    return out;
  };
  cases.push({
    slug: '113-path-sum-ii',
    gen: (r): In => {
      const tokens = genTokens(r, 10, 'signed');
      const t = treeFrom(tokens)!;
      // aim at a real root-to-leaf sum most of the time
      const leaves = bfsNodes(t).filter((n) => !n.l && !n.r);
      const walk = (n: TN, s: number, target: TN): number | null => (n === target ? s + n.v : ((n.l && walk(n.l, s + n.v, target)) ?? null) ?? (n.r ? walk(n.r, s + n.v, target) : null));
      const lf = leaves[rint(r, 0, leaves.length - 1)];
      const sum = walk(t, 0, lf);
      return { tokens, target: r() < 0.8 && sum !== null ? sum : rint(r, -10, 15) };
    },
    oracle,
    project: (step) => ({ node: varOrNull(step, 'node'), remaining: num(step, 'remaining'), pathSum: num(step, 'path sum'), found: num(step, 'found'), path: auxItems(step, 'path (current').map(Number), paths: auxItems(step, 'paths found'), labels: labelsOf(step) }),
    notes: 'node colours not compared; the "Leaf v: remaining != 0" step carries no state change',
  });
}

// ================================================================ BFS family: 102 / 103 / 199
{
  type In = { tokens: Tok[] };
  const oracle102 = ({ tokens }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    let q: { n: TN; p: string }[] = [{ n: root, p: '' }];
    let level = 0, visited = 0;
    let levelSize: number | null = null;
    let cur: number[] = [];
    const result: string[] = [];
    const labels = new Map<string, string>();
    const snap = (): State => ({ level, visited, qsize: q.length, levelSize, queue: q.map((x) => x.n.v), cur: [...cur], result: [...result], labels: fmtLabels(labels) });
    out.push(snap());
    while (q.length) {
      levelSize = q.length; cur = [];
      out.push(snap());
      for (let i = levelSize; i > 0; i--) {
        const { n, p } = q.shift()!;
        visited++; cur.push(n.v); labels.set(p, `L${level}`);
        out.push(snap());
        if (n.l) q.push({ n: n.l, p: p + 'L' });
        if (n.r) q.push({ n: n.r, p: p + 'R' });
        out.push(snap());
      }
      result.push(`[${cur.join(',')}]`);
      out.push(snap());
      level++;
    }
    levelSize = null; cur = [];
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '102-binary-tree-level-order-traversal',
    gen: (r): In => ({ tokens: genTokens(r, 11, 'unique') }),
    oracle: oracle102,
    project: (step) => ({ level: num(step, 'level'), visited: num(step, 'visited'), qsize: num(step, 'q.size'), levelSize: num(step, 'level size'), queue: auxItems(step, 'queue').map(Number), cur: auxItems(step, 'current level').map(Number), result: auxItems(step, 'result'), labels: labelsOf(step) }),
    notes: 'node colours not compared; "Enqueue children" adds both children in one step',
  });

  const oracle103 = ({ tokens }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    let q: { n: TN; p: string }[] = [{ n: root, p: '' }];
    let level = 0;
    let dir = 'L→R';
    let node: number | null = null;
    let cur: number[] = [];
    const result: string[] = [];
    const labels = new Map<string, string>();
    const snap = (): State => ({ level, direction: dir, node, queue: q.map((x) => x.n.v), cur: [...cur], result: [...result], labels: fmtLabels(labels) });
    out.push(snap());
    while (q.length) {
      const size = q.length; cur = [];
      out.push(snap()); // Level k
      for (let i = 0; i < size; i++) {
        const { n, p } = q.shift()!;
        node = n.v; cur.push(n.v); labels.set(p, `L${level}`);
        out.push(snap());
        if (n.l) q.push({ n: n.l, p: p + 'L' });
        if (n.r) q.push({ n: n.r, p: p + 'R' });
        out.push(snap());
      }
      node = null;
      if (level % 2 === 1) cur.reverse();
      out.push(snap()); // keep / reverse the level
      result.push(`[${cur.join(',')}]`);
      dir = dir === 'L→R' ? 'R→L' : 'L→R';
      out.push(snap()); // saved
      level++;
    }
    cur = [];
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '103-binary-tree-zigzag-level-order',
    gen: (r): In => ({ tokens: genTokens(r, 11, 'unique') }),
    oracle: oracle103,
    project: (step) => ({ level: num(step, 'level'), direction: String(step.vars.direction), node: varOrNull(step, 'node'), queue: auxItems(step, 'queue').map(Number), cur: auxItems(step, 'current level').map(Number), result: auxItems(step, 'result'), labels: labelsOf(step) }),
    notes: 'node colours not compared',
  });

  const oracle199 = ({ tokens }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    let q: { n: TN; p: string }[] = [{ n: root, p: '' }];
    let level = 0, size = 0;
    let i: number | null = null, node: number | null = null;
    const view: number[] = [];
    const labels = new Map<string, string>();
    const snap = (): State => ({ level, size, i, node, queue: q.map((x) => x.n.v), view: [...view], labels: fmtLabels(labels) });
    out.push(snap());
    while (q.length) {
      size = q.length; i = null; node = null;
      out.push(snap());
      for (let k = 0; k < size; k++) {
        const { n, p } = q.shift()!;
        i = k; node = n.v;
        out.push(snap());
        if (k === size - 1) { view.push(n.v); labels.set(p, 'seen'); out.push(snap()); }
        if (n.l) q.push({ n: n.l, p: p + 'L' });
        if (n.r) q.push({ n: n.r, p: p + 'R' });
        out.push(snap());
      }
      level++;
    }
    i = null; node = null;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '199-binary-tree-right-side-view',
    gen: (r): In => ({ tokens: genTokens(r, 11, 'unique') }),
    oracle: oracle199,
    project: (step) => ({ level: num(step, 'level'), size: num(step, 'size'), i: num(step, 'i'), node: varOrNull(step, 'node'), queue: auxItems(step, 'queue').map(Number), view: auxItems(step, 'right side').map(Number), labels: labelsOf(step) }),
    notes: 'node colours not compared; "Enqueue children" adds both children in one step',
  });
}

// ================================================================ BST family: 700 / 701 / 235 / 230
const fmtTok = (toks: Tok[]): string => `[${toks.map((t) => (t === null ? 'null' : t)).join(',')}]`;
const shapeStrings = (t: TN | null): string[] => {
  const out: string[] = [];
  const walk = (n: TN | null, p: string) => { if (n) { out.push(`${p}=${n.v}`); walk(n.l, p + 'L'); walk(n.r, p + 'R'); } };
  walk(t, '');
  return out.sort();
};
{
  type In = { tokens: Tok[]; target: number };
  const oracle = ({ tokens, target }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    const path: number[] = [];
    let node: number | string | null = root.v, rule: string | null = null, steps = 0;
    const snap = (result: string | null = null): State => ({ node, rule, steps, path: [...path], result });
    out.push(snap());
    let cur: TN | null = root;
    while (cur) {
      steps++; path.push(cur.v); node = cur.v;
      if (target === cur.v) { rule = 'match'; out.push(snap(fmtTok(serializeTree(cur)))); return out; }
      rule = target < cur.v ? 'go left' : 'go right';
      out.push(snap());
      cur = target < cur.v ? cur.l : cur.r;
    }
    node = 'null'; rule = 'absent';
    out.push(snap('[]'));
    return out;
  };
  cases.push({
    slug: '700-search-in-a-binary-search-tree',
    gen: (r): In => { const tokens = genTokens(r, 11, 'bst'); const vals = tokens.filter((t) => t !== null) as number[]; return { tokens, target: r() < 0.6 ? vals[rint(r, 0, vals.length - 1)] : rint(r, 0, 31) }; },
    oracle,
    project: (step) => ({ node: varOrNull(step, 'node'), rule: varOrNull(step, 'rule'), steps: num(step, 'steps'), path: auxItems(step, 'path walked').map(Number), result: resultTitle(step) }),
    notes: 'node colours and the compare panel text not compared',
  });
}
{
  type In = { tokens: Tok[]; value: number };
  const oracle = ({ tokens, value }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    const path: number[] = [];
    let node: number | null = root.v, rule: string | null = null, depth = 0;
    const labels = new Map<string, string>();
    const snap = (result: string | null = null): State => ({ node, rule, depth, path: [...path], shape: shapeStrings(root), labels: fmtLabels(labels), result });
    out.push(snap());
    let cur: TN = root, p = '';
    while (true) {
      depth++; path.push(cur.v); node = cur.v;
      const goLeft = value < cur.v;
      const child = goLeft ? cur.l : cur.r;
      rule = child ? (goLeft ? 'go left' : 'go right') : 'slot is free';
      out.push(snap());
      if (!child) {
        const nn: TN = { v: value, l: null, r: null };
        if (goLeft) cur.l = nn; else cur.r = nn;
        p += goLeft ? 'L' : 'R';
        node = value; rule = 'inserted'; labels.set(p, 'new');
        out.push(snap(fmtTok(serializeTree(root))));
        return out;
      }
      cur = child; p += goLeft ? 'L' : 'R';
    }
  };
  cases.push({
    slug: '701-insert-into-a-binary-search-tree',
    gen: (r): In => {
      const tokens = genTokens(r, 10, 'bst');
      const vals = new Set(tokens.filter((t) => t !== null) as number[]);
      let v = rint(r, 0, 31);
      while (vals.has(v)) v = rint(r, 0, 31);
      return { tokens, value: v };
    },
    oracle,
    project: (step) => ({ node: varOrNull(step, 'node'), rule: varOrNull(step, 'rule'), depth: num(step, 'depth'), path: auxItems(step, 'path walked').map(Number), shape: shapeOf(step), labels: labelsOf(step), result: resultTitle(step) }),
    notes: 'node colours and the compare panel text not compared; the oracle inserts into a copy of the parsed tree (the animation only draws the new leaf at the last step)',
  });
}
{
  type In = { tokens: Tok[]; p: number; q: number };
  const oracle = ({ tokens, p, q }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    const path: number[] = [];
    let cur: number | null = root.v, rule: string | null = null;
    const snap = (result: string | null = null): State => ({ cur, rule, path: [...path], result });
    out.push(snap());
    let n: TN | null = root;
    while (n) {
      cur = n.v; path.push(n.v);
      if (p < n.v && q < n.v) { rule = 'go left'; out.push(snap()); n = n.l; }
      else if (p > n.v && q > n.v) { rule = 'go right'; out.push(snap()); n = n.r; }
      else { rule = 'split'; out.push(snap(String(n.v))); return out; }
    }
    return out;
  };
  cases.push({
    slug: '235-lowest-common-ancestor-of-a-binary-search-tree',
    gen: (r): In => {
      const tokens = genTokens(r, 11, 'bst', 2);
      const vals = tokens.filter((t) => t !== null) as number[];
      const p = vals[rint(r, 0, vals.length - 1)];
      let q = vals[rint(r, 0, vals.length - 1)];
      if (q === p) q = vals[(vals.indexOf(p) + 1) % vals.length];
      return { tokens, p, q };
    },
    oracle,
    project: (step) => ({ cur: varOrNull(step, 'cur'), rule: step.vars.rule === '—' ? null : String(step.vars.rule), path: auxItems(step, 'path walked').map(Number), result: resultTitle(step) }),
    notes: 'node colours and the p/q marker badges not compared',
  });
}
{
  type In = { tokens: Tok[]; k: number };
  const oracle = ({ tokens, k }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    const stack: TN[] = [];
    const visited: number[] = [];
    const labels = new Map<string, string>();
    let cur: number | string = 'root', count = 0;
    const snap = (result: string | null = null): State => ({ cur, count, stack: stack.map((n) => n.v), visited: [...visited], labels: fmtLabels(labels), result });
    out.push(snap());
    // iterative in-order with an explicit stack
    const pathOf = new Map<TN, string>();
    const mark = (n: TN | null, p: string) => { if (n) { pathOf.set(n, p); mark(n.l, p + 'L'); mark(n.r, p + 'R'); } };
    mark(root, '');
    let n: TN | null = root;
    while (n || stack.length) {
      while (n) { stack.push(n); cur = n.v; out.push(snap()); n = n.l; }
      n = stack.pop()!;
      count++; visited.push(n.v); cur = n.v; labels.set(pathOf.get(n)!, `#${count}`);
      if (count === k) { out.push(snap()); out.push(snap(String(n.v))); return out; }
      out.push(snap());
      n = n.r;
      cur = n ? n.v : 'null';
      out.push(snap());
    }
    return out;
  };
  cases.push({
    slug: '230-kth-smallest-element-in-a-bst',
    gen: (r): In => { const tokens = genTokens(r, 11, 'bst'); const n = tokens.filter((t) => t !== null).length; return { tokens, k: rint(r, 1, n) }; },
    oracle,
    project: (step) => ({ cur: varOrNull(step, 'cur'), count: num(step, 'count'), stack: auxItems(step, 'stack').map(Number), visited: auxItems(step, 'visited').map(Number), labels: labelsOf(step), result: resultTitle(step) }),
    notes: 'node colours not compared',
  });
}

// ================================================================ Morris traversals (144 pre-order, alg inorder, 99 recover BST)
/** Dashed thread arrows of the tree scene as "fromPath>toPath", sorted. */
const threadEdges = (step: Step): string[] => {
  const sc = sceneOfKind(step, 'tree');
  const { paths } = sceneTree(step);
  return (sc?.extraEdges ?? []).map((e) => `${paths.get(e.from)}>${paths.get(e.to)}`).sort();
};
/** A var holding a node value, "null" or "—" -> number | null. */
const vnull = (step: Step, key: string): number | string | null => { const v = step.vars[key]; return v === undefined || v === '—' || v === 'null' ? null : (typeof v === 'number' ? v : toNum(v)); };
type MorrisMode = 'pre' | 'in' | 'recover';
function morrisOracle(tokens: Tok[], mode: MorrisMode): State[] {
  const root = treeFrom(tokens)!;
  const pathOf = new Map<TN, string>();
  const mark = (n: TN | null, p: string) => { if (n) { pathOf.set(n, p); mark(n.l, p + 'L'); mark(n.r, p + 'R'); } };
  mark(root, '');
  const out: State[] = [];
  const order: number[] = [];
  const threadsList: { p: TN; c: TN }[] = [];
  const labels = new Map<string, string>();
  let cur: TN | null = root, pred: TN | null = null, visited = 0;
  let prev: TN | null = null, first: TN | null = null, second: TN | null = null;
  const nv = (n: TN | null) => (n ? n.v : null);
  const snap = (): State => {
    const s: State = { cur: nv(cur), pred: nv(pred), threads: threadsList.length, visited, order: [...order], threadsList: threadsList.map((t) => `${t.p.v} → ${t.c.v}`), edges: threadsList.map((t) => `${pathOf.get(t.p)}>${pathOf.get(t.c)}`).sort(), labels: fmtLabels(labels) };
    if (mode === 'recover') { s.prev = nv(prev); s.first = nv(first); s.second = nv(second); s.shape = [...pathOf.entries()].map(([n, p]) => `${p}=${n.v}`).sort(); }
    return s;
  };
  const visit = (n: TN) => {
    visited++; order.push(n.v); labels.set(pathOf.get(n)!, `#${visited}`);
    if (mode === 'recover') {
      if (prev && prev.v > n.v) { if (!first) first = prev; second = n; }
      prev = n;
    }
  };
  out.push(snap());
  while (cur) {
    if (!cur.l) {
      visit(cur); pred = null; out.push(snap());
      cur = cur.r;
    } else {
      pred = cur.l; out.push(snap());
      while (pred.r && pred.r !== cur) { pred = pred.r; out.push(snap()); }
      if (!pred.r) {
        pred.r = cur; threadsList.push({ p: pred, c: cur });
        if (mode === 'pre') visit(cur);
        out.push(snap());
        cur = cur.l;
      } else {
        pred.r = null; threadsList.splice(threadsList.findIndex((t) => t.p === pred && t.c === cur), 1);
        if (mode !== 'pre') visit(cur);
        out.push(snap());
        cur = cur.r;
      }
    }
  }
  cur = null; pred = null;
  if (!(mode === 'recover' && first && second)) out.push(snap()); // for recover the loop exit and the swap are one step
  if (mode === 'recover' && first && second) {
    const t = (first as TN).v; (first as TN).v = (second as TN).v; (second as TN).v = t;
    out.push(snap());
  }
  return out;
}
for (const [slug, mode] of [['144-binary-tree-preorder-traversal', 'pre'], ['alg-morris-inorder-traversal', 'in']] as const) {
  type In = { tokens: Tok[] };
  cases.push({
    slug,
    gen: (r): In => ({ tokens: genTokens(r, 11, r() < 0.8 ? 'unique' : 'any') }),
    oracle: ({ tokens }: In) => morrisOracle(tokens, mode),
    project: (step) => ({
      cur: vnull(step, 'cur'), pred: vnull(step, 'pred'), threads: num(step, 'threads'), visited: num(step, 'visited'),
      order: auxItems(step, mode === 'pre' ? 'Pre-order' : 'In-order').map(Number), threadsList: auxItems(step, 'threads'), edges: threadEdges(step), labels: labelsOf(step),
    }),
    notes: 'node colours not compared; the thread is removed in the same event as the visit',
  });
}
{
  type In = { tokens: Tok[] };
  cases.push({
    slug: '99-recover-binary-search-tree',
    gen: (r): In => {
      const t = treeFrom(genTokens(r, 10, 'bst', 2))!;
      const ns = inorderNodes(t);
      const i = rint(r, 0, ns.length - 2), j = rint(r, i + 1, ns.length - 1);
      const tmp = ns[i].v; ns[i].v = ns[j].v; ns[j].v = tmp;
      return { tokens: serializeTree(t) };
    },
    oracle: ({ tokens }: In) => morrisOracle(tokens, 'recover'),
    project: (step) => ({
      cur: vnull(step, 'cur'), pred: vnull(step, 'pred'), threads: num(step, 'threads'), visited: num(step, 'visited'),
      order: auxItems(step, 'In-order').map(Number), threadsList: auxItems(step, 'threads'), edges: threadEdges(step), labels: labelsOf(step),
      prev: vnull(step, 'prev'), first: vnull(step, 'first'), second: vnull(step, 'second'), shape: shapeOf(step),
    }),
    notes: 'node colours not compared; inputs always have exactly two swapped values (the animation is checked on those)',
  });
}

// ================================================================ tree construction (recursion state + the tree built so far)
const frameStack = (frames: string[]): string[] => [...frames];
const preorderVals = (t: TN | null, out: number[] = []): number[] => { if (t) { out.push(t.v); preorderVals(t.l, out); preorderVals(t.r, out); } return out; };
const inorderVals = (t: TN | null): number[] => inorderNodes(t).map((n) => n.v);
const pathsToStrings = (m: Map<string, number>): string[] => [...m.entries()].map(([p, v]) => `${p}=${v}`).sort();

// ---------------------------------------------------------------- 105 Construct Tree from Preorder and Inorder
{
  type In = { pre: number[]; ino: number[] };
  const oracle = ({ pre, ino }: In): State[] => {
    const n = pre.length;
    const pos = new Map(ino.map((v, i) => [v, i]));
    const out: State[] = [];
    const frames: string[] = [];
    const shape = new Map<string, number>();
    let lo: number | null = 0, hi: number | null = n - 1, root: number | null = null, mid: number | null = null, preIdx = 0;
    const snap = (): State => ({ lo, hi, root, mid, pre: preIdx, stack: frameStack(frames), shape: pathsToStrings(shape) });
    out.push(snap());
    const build = (l: number, h: number, p: string) => {
      frames.push(`build(${l}, ${h})`);
      if (l > h) { lo = l; hi = h; root = null; mid = null; out.push(snap()); frames.pop(); return; }
      const v = pre[preIdx++];
      shape.set(p, v);
      lo = l; hi = h; root = v; mid = null; out.push(snap()); // next preorder value is the root
      const m = pos.get(v)!;
      mid = m; out.push(snap()); // locate in inorder
      build(l, m - 1, p + 'L');
      lo = l; hi = h; root = v; mid = m; out.push(snap()); // left subtree done
      build(m + 1, h, p + 'R');
      frames.pop();
    };
    build(0, n - 1, '');
    lo = null; hi = null; root = null; mid = null;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '105-construct-tree-from-preorder-inorder',
    gen: (r): In => { const t = treeFrom(genTokens(r, 10, 'unique'))!; return { pre: preorderVals(t), ino: inorderVals(t) }; },
    oracle,
    project: (step) => ({ lo: num(step, 'lo'), hi: num(step, 'hi'), root: num(step, 'root'), mid: num(step, 'mid'), pre: num(step, 'pre'), stack: auxItems(step, 'call stack'), shape: shapeOf(step) }),
    notes: 'node colours and the highlighted cells of the preorder / inorder panels not compared; no event is shown when the RIGHT subtree finishes (the frame just disappears at the next event)',
  });
}

// ---------------------------------------------------------------- 108 Convert Sorted Array to BST
{
  type In = { nums: number[] };
  const oracle = ({ nums }: In): State[] => {
    const n = nums.length;
    const out: State[] = [];
    const frames: string[] = [];
    const shape = new Map<string, number>();
    let lo: number | null = 0, hi: number | null = n - 1, mid: number | null = null;
    const snap = (): State => ({ lo, hi, mid, stack: frameStack(frames), shape: pathsToStrings(shape) });
    out.push(snap());
    const build = (l: number, h: number, p: string) => {
      frames.push(`build(${l}, ${h})`);
      lo = l; hi = h;
      if (l > h) { mid = null; out.push(snap()); frames.pop(); return; }
      const m = Math.floor((l + h) / 2);
      mid = m; shape.set(p, nums[m]); out.push(snap());
      build(l, m - 1, p + 'L');
      build(m + 1, h, p + 'R');
      frames.pop();
    };
    build(0, n - 1, '');
    lo = null; hi = null; mid = null;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '108-convert-sorted-array-to-bst',
    gen: (r): In => ({ nums: Array.from(new Set(rarr(r, rint(r, 1, 12), -9, 9))).sort((a, b) => a - b) }),
    oracle,
    project: (step) => ({ lo: num(step, 'lo'), hi: num(step, 'hi'), mid: num(step, 'mid'), stack: auxItems(step, 'call stack'), shape: shapeOf(step) }),
    notes: 'node colours not compared; the middle is the lower middle (floor((lo+hi)/2))',
  });
}

// ---------------------------------------------------------------- 1008 Construct BST from Preorder Traversal
{
  type In = { pre: number[] };
  const oracle = ({ pre }: In): State[] => {
    const n = pre.length;
    const out: State[] = [];
    const frames: string[] = [];
    const shape = new Map<string, number>();
    let idx = 0, bound: number | string | null = '∞', node: number | null = null;
    const snap = (): State => ({ idx, bound, node, stack: frameStack(frames), shape: pathsToStrings(shape) });
    out.push(snap());
    const fmt = (b: number | null) => (b === null ? '∞' : b);
    const build = (b: number | null, p: string): boolean => {
      frames.push(`build(${fmt(b)})`);
      bound = fmt(b);
      if (idx === n || (b !== null && pre[idx] > b)) { node = null; out.push(snap()); frames.pop(); return false; }
      const v = pre[idx++];
      shape.set(p, v); node = v; out.push(snap());
      build(v, p + 'L');
      bound = fmt(b); node = v; out.push(snap()); // left subtree done
      build(b, p + 'R');
      frames.pop();
      return true;
    };
    build(null, '');
    bound = null; node = null;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '1008-construct-binary-search-tree-from-preorder-traversal',
    gen: (r): In => { const t = treeFrom(genTokens(r, 10, 'bst'))!; return { pre: preorderVals(t) }; },
    oracle,
    project: (step) => ({ idx: num(step, 'idx'), bound: varOrNull(step, 'bound'), node: varOrNull(step, 'node'), stack: auxItems(step, 'call stack'), shape: shapeOf(step) }),
    notes: 'node colours and the highlighted preorder cell not compared; no event when the RIGHT call returns',
  });
}

// ---------------------------------------------------------------- 654 Maximum Binary Tree
{
  type In = { nums: number[] };
  const oracle = ({ nums }: In): State[] => {
    const n = nums.length;
    const out: State[] = [];
    const frames: string[] = [];
    const shape = new Map<string, number>();
    let lo: number | null = 0, hi: number | null = n - 1, i: number | null = null, max: number | null = null;
    const snap = (): State => ({ lo, hi, i, max, stack: frameStack(frames), shape: pathsToStrings(shape) });
    out.push(snap());
    const build = (l: number, h: number, p: string) => {
      frames.push(`build(${l}, ${h})`);
      lo = l; hi = h; i = null;
      if (l > h) { max = null; out.push(snap()); frames.pop(); return; }
      let m = l;
      max = nums[l]; out.push(snap()); // scan starts with the first value
      for (let k = l + 1; k <= h; k++) {
        if (nums[k] > nums[m]) m = k;
        i = k; max = nums[m]; out.push(snap());
      }
      i = null; max = nums[m];
      shape.set(p, nums[m]); out.push(snap()); // becomes the root
      build(l, m - 1, p + 'L');
      lo = l; hi = h; i = null; max = nums[m]; out.push(snap()); // left side finished
      build(m + 1, h, p + 'R');
      frames.pop();
    };
    build(0, n - 1, '');
    lo = null; hi = null; i = null; max = null;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '654-maximum-binary-tree',
    gen: (r): In => ({ nums: shuffled(r, Array.from({ length: 12 }, (_, k) => k)).slice(0, rint(r, 1, 9)) }),
    oracle,
    project: (step) => ({ lo: num(step, 'lo'), hi: num(step, 'hi'), i: num(step, 'i'), max: num(step, 'max'), stack: auxItems(step, 'call stack'), shape: shapeOf(step) }),
    notes: 'node colours and array cell colours not compared; no event when the RIGHT call returns; values are distinct',
  });
}

// ---------------------------------------------------------------- 297 Serialize and Deserialize Binary Tree
{
  type In = { tokens: Tok[] };
  const oracle = ({ tokens }: In): State[] => {
    const root = treeFrom(tokens)!;
    const out: State[] = [];
    const ser: string[] = [];
    const stack: string[] = [];
    let phase = 'serialize', token: string | number | null = null, count = 0;
    let shape: Map<string, number> = new Map();
    const full = new Map<string, number>();
    const markFull = (n: TN | null, p: string) => { if (n) { full.set(p, n.v); markFull(n.l, p + 'L'); markFull(n.r, p + 'R'); } };
    markFull(root, '');
    let highlight: number | null = null;
    const snap = (): State => ({ phase, token, tokens: count, ser: phase === 'serialize' ? [...ser] : [], toRead: phase === 'deserialize' ? [...ser] : [], stack: [...stack], shape: pathsToStrings(shape), highlight });
    shape = full;
    out.push(snap());
    const write = (n: TN | null) => {
      if (!n) { ser.push('#'); count++; token = '#'; out.push(snap()); return; }
      stack.push(`write(${n.v})`);
      ser.push(String(n.v)); count++; token = n.v; out.push(snap());
      write(n.l); write(n.r);
      stack.pop();
    };
    write(root);
    token = null; stack.length = 0;
    out.push(snap()); // Serialized
    // deserialize
    phase = 'deserialize'; count = 0; token = null; shape = new Map(); highlight = 0;
    out.push(snap());
    let idx = 0;
    const read = (p: string) => {
      const t = ser[idx++];
      count++; token = t; highlight = idx < ser.length ? idx : null;
      if (t === '#') { out.push(snap()); return; }
      stack.push(`read() → ${t}`);
      shape.set(p, Number(t)); out.push(snap());
      read(p + 'L'); read(p + 'R');
      stack.pop();
    };
    read('');
    token = null; stack.length = 0; highlight = null;
    out.push(snap());
    return out;
  };
  cases.push({
    slug: '297-serialize-and-deserialize-binary-tree',
    gen: (r): In => ({ tokens: genTokens(r, 10, 'any') }),
    oracle,
    project: (step) => ({
      phase: String(step.vars.phase), token: varOrNull(step, 'token'), tokens: num(step, 'tokens'),
      ser: String(step.vars.phase) === 'serialize' ? auxItems(step, 'serialized') : [],
      toRead: String(step.vars.phase) === 'deserialize' ? auxItems(step, 'tokens to read') : [],
      stack: String(step.vars.phase) === 'serialize' ? auxItems(step, 'call stack: write') : auxItems(step, 'call stack: read'),
      shape: shapeOf(step),
      highlight: (step.aux ?? []).find((a) => a.title.startsWith('tokens to read'))?.highlight ?? null,
    }),
    notes: 'node colours not compared; a deserialized node is drawn attached to its parent as soon as it is created',
  });
}

// ================================================================ caches: 146 LRU, 460 LFU, 432 All O(1)
type COp = { t: 'put' | 'get'; k: number; v?: number };
const genCacheOps = (r: () => number): { cap: number; ops: COp[] } => {
  const cap = rint(r, 1, 3);
  const n = rint(r, 2, 11);
  const keys = rint(r, 2, 5);
  const ops: COp[] = [];
  for (let i = 0; i < n; i++) ops.push(r() < 0.55 ? { t: 'put', k: rint(r, 1, keys), v: rint(r, 1, 9) } : { t: 'get', k: rint(r, 1, keys) });
  return { cap, ops };
};
/** Values of the chain head -> ... -> tail of a cache list scene (sentinels excluded), following the next links. */
const chainValues = (step: Step, headLabel: string, tailLabel: string): string[] => {
  const nodes = (sceneOfKind(step, 'list')?.nodes ?? []) as (LNode & { value: string | number })[];
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  let n = nodes.find((x) => String(x.value) === headLabel);
  const out: string[] = [];
  while (n && n.next !== null) {
    n = byKey.get(n.next);
    if (!n || String(n.value) === tailLabel) break;
    out.push(String(n.value));
  }
  return out;
};
const sortedMapItems = (items: string[]): string[] => [...items].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

{
  type In = { cap: number; ops: COp[] };
  const oracle = ({ cap, ops }: In): State[] => {
    const out: State[] = [];
    let order: [number, number][] = []; // MRU first
    const outputs: string[] = [];
    const snap = (): State => ({ order: order.map(([k, v]) => `${k}:${v}`), map: sortedMapItems(order.map(([k, v]) => `${k} → ${k}:${v}`)), outputs: [...outputs], size: `${order.length}/${cap}` });
    out.push(snap());
    for (const o of ops) {
      const i = order.findIndex(([k]) => k === o.k);
      if (o.t === 'get') {
        if (i < 0) { outputs.push('-1'); out.push(snap()); continue; }
        const e = order[i];
        order = [e, ...order.slice(0, i), ...order.slice(i + 1)];
        outputs.push(String(e[1])); out.push(snap());
      } else if (i >= 0) {
        order[i] = [o.k, o.v!]; out.push(snap()); // value updated in place
        const e = order[i];
        order = [e, ...order.slice(0, i), ...order.slice(i + 1)]; out.push(snap());
      } else {
        if (order.length === cap) { order = order.slice(0, -1); out.push(snap()); }
        order = [[o.k, o.v!], ...order]; out.push(snap());
      }
    }
    return out;
  };
  cases.push({
    slug: '146-lru-cache',
    gen: genCacheOps,
    oracle,
    project: (step) => ({ order: chainValues(step, 'H', 'T'), map: sortedMapItems(auxItems(step, 'hash map')), outputs: auxItems(step, 'outputs'), size: String(step.vars.size) }),
    notes: 'node colours / MRU-LRU chips not compared; the hash-map panel is compared as a set sorted by key',
  });
}
{
  type In = { cap: number; ops: COp[] };
  const oracle = ({ cap, ops }: In): State[] => {
    const out: State[] = [];
    const val = new Map<number, number>();
    const freq = new Map<number, number>();
    const buckets = new Map<number, number[]>(); // freq -> keys, oldest first
    let minF: number | null = null;
    const outputs: string[] = [];
    const snap = (): State => ({
      kv: [...val.keys()].sort((a, b) => a - b).map((k) => `${k} → ${val.get(k)}, ×${freq.get(k)}`),
      buckets: [...buckets.entries()].filter(([, ks]) => ks.length).sort((a, b) => a[0] - b[0]).map(([f, ks]) => `×${f} → ${ks.join(', ')}`),
      minF: val.size === 0 ? null : minF, size: `${val.size}/${cap}`, outputs: [...outputs],
    });
    const touch = (k: number) => {
      const f = freq.get(k)!;
      buckets.set(f, buckets.get(f)!.filter((x) => x !== k));
      if (!buckets.get(f)!.length) { buckets.delete(f); if (minF === f) minF = f + 1; }
      freq.set(k, f + 1);
      if (!buckets.has(f + 1)) buckets.set(f + 1, []);
      buckets.get(f + 1)!.push(k);
    };
    out.push(snap());
    for (const o of ops) {
      if (o.t === 'get') {
        if (!val.has(o.k)) { outputs.push('-1'); out.push(snap()); continue; }
        touch(o.k); outputs.push(String(val.get(o.k))); out.push(snap());
      } else if (val.has(o.k)) {
        val.set(o.k, o.v!); out.push(snap());
        touch(o.k); out.push(snap());
      } else {
        if (val.size === cap) {
          const ks = buckets.get(minF!)!;
          const victim = ks.shift()!;
          if (!ks.length) buckets.delete(minF!);
          val.delete(victim); freq.delete(victim);
          out.push(snap());
        }
        val.set(o.k, o.v!); freq.set(o.k, 1);
        if (!buckets.has(1)) buckets.set(1, []);
        buckets.get(1)!.push(o.k); minF = 1;
        out.push(snap());
      }
    }
    return out;
  };
  const parseKv = (items: string[]) => items.map((s) => s).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  cases.push({
    slug: '460-lfu-cache',
    gen: genCacheOps,
    oracle,
    project: (step) => ({
      kv: parseKv(auxItems(step, 'key → value')),
      buckets: auxItems(step, 'buckets'),
      minF: num(step, 'min uses'),
      size: String(step.vars.size),
      outputs: auxItems(step, 'outputs'),
    }),
    notes: 'node colours / chips not compared; the key->value panel is compared sorted by key; within a bucket keys are in insertion/touch order (oldest first = evicted first); design: "min uses" shows — while the cache is empty (a stale minFreq is invisible to the algorithm because the next insert resets it to 1)',
  });
}
{
  type Op = { t: 'inc' | 'dec' | 'max' | 'min'; k?: string };
  type In = { ops: Op[] };
  const oracle = ({ ops }: In): State[] => {
    const out: State[] = [];
    let bs: { c: number; keys: string[] }[] = []; // ascending count
    const map = new Map<string, number>();
    const outputs: string[] = [];
    const snap = (): State => ({
      buckets: bs.length, keys: map.size,
      chain: bs.map((b) => `×${b.c}·${b.keys.join('')}`),
      map: [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, c]) => `${k} → ×${c}`),
      outputs: [...outputs],
    });
    out.push(snap());
    for (const o of ops) {
      if (o.t === 'max' || o.t === 'min') {
        const b = o.t === 'max' ? bs[bs.length - 1] : bs[0];
        outputs.push(b ? b.keys[0] : '""'); out.push(snap()); continue;
      }
      const k = o.k!;
      if (o.t === 'inc') {
        if (!map.has(k)) {
          if (!bs.length || bs[0].c !== 1) { bs.unshift({ c: 1, keys: [] }); out.push(snap()); }
          bs[0].keys.push(k); map.set(k, 1); out.push(snap());
        } else {
          const c = map.get(k)!;
          const i = bs.findIndex((b) => b.c === c);
          if (i + 1 >= bs.length || bs[i + 1].c !== c + 1) { bs.splice(i + 1, 0, { c: c + 1, keys: [] }); out.push(snap()); }
          bs[i + 1].keys.push(k); map.set(k, c + 1); out.push(snap());
          bs[i].keys = bs[i].keys.filter((x) => x !== k);
          if (!bs[i].keys.length) bs.splice(i, 1);
          out.push(snap());
        }
      } else {
        const c = map.get(k)!;
        const i = bs.findIndex((b) => b.c === c);
        if (c === 1) {
          map.delete(k); out.push(snap());
          bs[i].keys = bs[i].keys.filter((x) => x !== k);
          if (!bs[i].keys.length) bs.splice(i, 1);
          out.push(snap());
        } else {
          if (i === 0 || bs[i - 1].c !== c - 1) { bs.splice(i, 0, { c: c - 1, keys: [] }); out.push(snap()); }
          const ni = bs[i].c === c ? i : i + 1; // index of the old bucket after a possible insertion before it
          const prevIdx = ni - 1;
          bs[prevIdx].keys.push(k); map.set(k, c - 1); out.push(snap());
          bs[ni].keys = bs[ni].keys.filter((x) => x !== k);
          if (!bs[ni].keys.length) bs.splice(ni, 1);
          out.push(snap());
        }
      }
    }
    return out;
  };
  cases.push({
    slug: '432-all-o-1-data-structure',
    gen: (r): In => {
      const n = rint(r, 2, 12);
      const cnt = new Map<string, number>();
      const ops: Op[] = [];
      const letters = 'abcd'.slice(0, rint(r, 2, 4));
      for (let i = 0; i < n; i++) {
        const x = r();
        const live = [...cnt.entries()].filter(([, c]) => c > 0).map(([k]) => k);
        if (x < 0.55 || !live.length) { const k = letters[rint(r, 0, letters.length - 1)]; ops.push({ t: 'inc', k }); cnt.set(k, (cnt.get(k) ?? 0) + 1); }
        else if (x < 0.8) { const k = live[rint(r, 0, live.length - 1)]; ops.push({ t: 'dec', k }); cnt.set(k, cnt.get(k)! - 1); }
        else ops.push({ t: r() < 0.5 ? 'max' : 'min' });
      }
      return { ops };
    },
    oracle,
    project: (step) => ({
      buckets: num(step, 'buckets'), keys: num(step, 'keys'),
      chain: chainBuckets(step),
      map: [...auxItems(step, 'map')].sort((a, b) => (a < b ? -1 : 1)),
      outputs: auxItems(step, 'outputs'),
    }),
    notes: 'node colours / min-max chips not compared; keys are single letters; the map panel is compared sorted by key; getMax/getMin of a bucket holding several keys is assumed to return its first-inserted key',
  });
}

function chainBuckets(step: Step): string[] {
  const nodes = (sceneOfKind(step, 'list')?.nodes ?? []) as (LNode & { value: string | number })[];
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  let n = nodes.find((x) => String(x.value) === 'HEAD');
  const out: string[] = [];
  while (n && n.next !== null) {
    n = byKey.get(n.next);
    if (!n || String(n.value) === 'TAIL') break;
    out.push(String(n.value));
  }
  return out;
}

// ================================================================ final answers (result panel of the Done step)
// The text of `step.result.title` is checked against an independent computation. Wrapped around the cases above at module end.
const arrow = (xs: number[]): string => (xs.length ? xs.join(' → ') : '(empty)');
const lvl = (t: TN | null): number[][] => { const out: number[][] = []; let q = t ? [t] : []; while (q.length) { out.push(q.map((n) => n.v)); q = q.flatMap((n) => [n.l, n.r].filter((x): x is TN => !!x)); } return out; };
const insertBst = (root: TN | null, v: number): TN => { if (!root) return { v, l: null, r: null }; if (v < root.v) root.l = insertBst(root.l, v); else root.r = insertBst(root.r, v); return root; };
const lastOf = (s: State[]): State => s[s.length - 1];
const RESULTS: Record<string, (input: any, st: State[]) => string> = {
  '1008-construct-binary-search-tree-from-preorder-traversal': ({ pre }) => { let t: TN | null = null; for (const v of pre) t = insertBst(t, v); return fmtTok(serializeTree(t)); },
  '101-symmetric-tree': ({ tokens }) => { const t = treeFrom(tokens)!; const m = (a: TN | null, b: TN | null): boolean => (!a && !b) || (!!a && !!b && a.v === b.v && m(a.l, b.r) && m(a.r, b.l)); return String(m(t.l, t.r)); },
  '102-binary-tree-level-order-traversal': ({ tokens }) => `[${lvl(treeFrom(tokens)).map((l) => `[${l.join(',')}]`).join(',')}]`,
  '103-binary-tree-zigzag-level-order': ({ tokens }) => `[${lvl(treeFrom(tokens)).map((l, i) => `[${(i % 2 ? [...l].reverse() : l).join(',')}]`).join(',')}]`,
  '104-maximum-depth-of-binary-tree': ({ tokens }) => String(lvl(treeFrom(tokens)).length),
  '105-construct-tree-from-preorder-inorder': ({ pre, ino }) => {
    const rec = (ps: number[], is: number[]): TN | null => { if (!ps.length) return null; const m = is.indexOf(ps[0]); return { v: ps[0], l: rec(ps.slice(1, 1 + m), is.slice(0, m)), r: rec(ps.slice(1 + m), is.slice(m + 1)) }; };
    return fmtTok(serializeTree(rec(pre, ino)));
  },
  '108-convert-sorted-array-to-bst': ({ nums }) => {
    const rec = (l: number, h: number): TN | null => { if (l > h) return null; const m = Math.floor((l + h) / 2); return { v: nums[m], l: rec(l, m - 1), r: rec(m + 1, h) }; };
    return fmtTok(serializeTree(rec(0, nums.length - 1)));
  },
  '113-path-sum-ii': ({ tokens, target }) => {
    const res: number[][] = [];
    const go = (n: TN | null, rem: number, p: number[]) => { if (!n) return; const q = [...p, n.v]; if (!n.l && !n.r && rem === n.v) res.push(q); go(n.l, rem - n.v, q); go(n.r, rem - n.v, q); };
    go(treeFrom(tokens), target, []);
    return `[${res.map((x) => `[${x.join(',')}]`).join(',')}]`;
  },
  '124-binary-tree-maximum-path-sum': ({ tokens }) => { let best = -Infinity; const g = (n: TN | null): number => { if (!n) return 0; const a = Math.max(0, g(n.l)), b = Math.max(0, g(n.r)); best = Math.max(best, n.v + a + b); return n.v + Math.max(a, b); }; g(treeFrom(tokens)); return String(best); },
  '129-sum-root-to-leaf-numbers': ({ tokens }) => { const g = (n: TN | null, c: number): number => { if (!n) return 0; const x = c * 10 + n.v; return !n.l && !n.r ? x : g(n.l, x) + g(n.r, x); }; return String(g(treeFrom(tokens), 0)); },
  '141-linked-list-cycle': ({ vals, pos }) => { const nx = cyc(vals, pos); let s: number | null = 0, f: number | null = 0; while (f !== null && nx[f] !== null) { s = nx[s!]; f = nx[nx[f]!]; if (s === f) return 'true'; } return 'false'; },
  '142-linked-list-cycle-ii': ({ vals, pos }) => { const seen = new Set<number>(); const nx = cyc(vals, pos); let c: number | null = 0; while (c !== null) { if (seen.has(c)) return `index ${c}`; seen.add(c); c = nx[c]; } return 'null'; },
  '144-binary-tree-preorder-traversal': ({ tokens }) => `[${preorderVals(treeFrom(tokens)).join(',')}]`,
  'alg-morris-inorder-traversal': ({ tokens }) => `[${inorderVals(treeFrom(tokens)).join(',')}]`,
  'alg-inorder-traversal-recursive-dfs': ({ tokens }) => `[${inorderVals(treeFrom(tokens)).join(',')}]`,
  'alg-preorder-traversal-recursive-dfs': ({ tokens }) => `[${preorderVals(treeFrom(tokens)).join(',')}]`,
  '145-binary-tree-postorder-traversal': ({ tokens }) => { const o: number[] = []; const g = (n: TN | null) => { if (n) { g(n.l); g(n.r); o.push(n.v); } }; g(treeFrom(tokens)); return `[${o.join(',')}]`; },
  '146-lru-cache': (_i, st) => ((lastOf(st).outputs as string[]).join(', ') || '(no get calls)'),
  '460-lfu-cache': (_i, st) => ((lastOf(st).outputs as string[]).join(', ') || '(no get calls)'),
  '432-all-o-1-data-structure': (_i, st) => ((lastOf(st).outputs as string[]).join(', ') || '(no queries)'),
  '150-evaluate-reverse-polish-notation': ({ tokens }) => { const s: number[] = []; for (const t of tokens as string[]) { if (['+', '-', '*', '/'].includes(t)) { const b = s.pop()!, a = s.pop()!; s.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : Math.trunc(a / b)); } else s.push(Number(t)); } return String(s[0]); },
  '155-min-stack': (_i, st) => `[${(lastOf(st).ret as string[]).join(',')}]`,
  '19-remove-nth-node-from-end': ({ vals, n }) => arrow(vals.filter((_: number, i: number) => i !== vals.length - n)),
  '199-binary-tree-right-side-view': ({ tokens }) => `[${lvl(treeFrom(tokens)).map((l) => l[l.length - 1]).join(',')}]`,
  '2-add-two-numbers': ({ a, b }) => { const o: number[] = []; let c = 0, i = 0; while (i < a.length || i < b.length || c) { const s = (a[i] ?? 0) + (b[i] ?? 0) + c; o.push(s % 10); c = Math.floor(s / 10); i++; } return arrow(o); },
  '206-reverse-linked-list': ({ vals }) => arrow([...vals].reverse()),
  '21-merge-two-sorted-lists': ({ a, b }) => arrow([...a, ...b].sort((x, y) => x - y)),
  '224-basic-calculator': ({ expr }) => String(Function(`"use strict"; return (${expr.replace(/(\d+)/g, (m: string) => String(Number(m)))});`)()),
  '234-palindrome-linked-list': ({ vals }) => String(vals.join(',') === [...vals].reverse().join(',')),
  '25-reverse-nodes-in-k-group': ({ vals, k }) => { const o: number[] = []; let i = 0; for (; i + k <= vals.length; i += k) o.push(...vals.slice(i, i + k).reverse()); o.push(...vals.slice(i)); return arrow(o); },
  '287-find-the-duplicate-number': ({ nums }) => { const seen = new Set<number>(); for (const x of nums as number[]) { if (seen.has(x)) return String(x); seen.add(x); } return '?'; },
  '297-serialize-and-deserialize-binary-tree': ({ tokens }) => { const o: string[] = []; const w = (n: TN | null) => { if (!n) { o.push('#'); return; } o.push(String(n.v)); w(n.l); w(n.r); }; w(treeFrom(tokens)); return o.join(','); },
  '402-remove-k-digits': ({ num: s, k }) => { const st: string[] = []; let kk = k; for (const c of s as string) { while (kk > 0 && st.length && st[st.length - 1] > c) { st.pop(); kk--; } st.push(c); } while (kk-- > 0) st.pop(); const r = st.join('').replace(/^0+/, ''); return r === '' ? '0' : r; },
  '496-next-greater-element-i': (_i, st) => `[${(lastOf(st).ans as number[]).join(',')}]`,
  '503-next-greater-element-ii': (_i, st) => `[${(lastOf(st).ans as string[]).join(', ')}]`,
  '543-diameter-of-binary-tree': ({ tokens }) => { let best = 0; const h = (n: TN | null): number => { if (!n) return 0; const a = h(n.l), b = h(n.r); best = Math.max(best, a + b); return 1 + Math.max(a, b); }; h(treeFrom(tokens)); return String(best); },
  '654-maximum-binary-tree': ({ nums }) => { const rec = (a: number[]): TN | null => { if (!a.length) return null; let m = 0; a.forEach((x, i) => { if (x > a[m]) m = i; }); return { v: a[m], l: rec(a.slice(0, m)), r: rec(a.slice(m + 1)) }; }; return fmtTok(serializeTree(rec(nums))); },
  '739-daily-temperatures': (_i, st) => `[${(lastOf(st).ans as string[]).join(', ')}]`,
  '84-largest-rectangle-in-histogram': ({ heights }) => { let b = 0; for (let i = 0; i < heights.length; i++) { let lo = i, hi = i; while (lo > 0 && heights[lo - 1] >= heights[i]) lo--; while (hi < heights.length - 1 && heights[hi + 1] >= heights[i]) hi++; b = Math.max(b, heights[i] * (hi - lo + 1)); } return String(b); },
  '85-maximal-rectangle': ({ grid }) => { let b = 0; const R = grid.length, C = grid[0].length; for (let r1 = 0; r1 < R; r1++) for (let r2 = r1; r2 < R; r2++) for (let c1 = 0; c1 < C; c1++) for (let c2 = c1; c2 < C; c2++) { let ok = true; for (let r = r1; r <= r2 && ok; r++) for (let c = c1; c <= c2; c++) if (grid[r][c] !== '1') { ok = false; break; } if (ok) b = Math.max(b, (r2 - r1 + 1) * (c2 - c1 + 1)); } return String(b); },
  '876-middle-of-the-linked-list': ({ vals }) => arrow(vals.slice(Math.floor(vals.length / 2))),
  '92-reverse-linked-list-ii': ({ vals, left, right }) => arrow([...vals.slice(0, left - 1), ...vals.slice(left - 1, right).reverse(), ...vals.slice(right)]),
  '98-validate-binary-search-tree': ({ tokens }) => { const v = (n: TN | null, lo: number, hi: number): boolean => !n || (n.v > lo && n.v < hi && v(n.l, lo, n.v) && v(n.r, n.v, hi)); return String(v(treeFrom(tokens), -Infinity, Infinity)); },
  '99-recover-binary-search-tree': ({ tokens }) => `[${inorderVals(treeFrom(tokens)).sort((a, b) => a - b).join(',')}]`,
};
for (const c of cases) {
  const f = RESULTS[c.slug];
  if (!f) continue;
  const oracle0 = c.oracle, project0 = c.project;
  c.oracle = (input) => {
    const s = oracle0(input);
    const fin = JSON.stringify(s[s.length - 1]);
    let j = s.length - 1;
    while (j > 0 && JSON.stringify(s[j - 1]) === fin) j--;
    const res = f(input, s);
    return s.map((x, k) => ({ ...x, result: k >= j ? res : null }));
  };
  // The answer is shown from the first step whose observable state already equals the final one (some animations have a separate Done step, some merge it with the last event).
  const settle = new WeakMap<Step[], number>();
  c.project = (step, input, i, steps) => {
    const p = project0(step, input, i, steps);
    if (!p) return p;
    let at = settle.get(steps);
    if (at === undefined) {
      const key = (j: number) => JSON.stringify(project0(steps[j], input, j, steps));
      const fin = key(steps.length - 1);
      let j = steps.length - 1;
      while (j > 0 && key(j - 1) === fin) j--;
      at = j; settle.set(steps, j);
    }
    return { ...p, result: i >= at ? resultTitle(steps[steps.length - 1]) : null };
  };
  c.notes = (c.notes ?? '') + ' · the result panel text of the Done step is checked against an independent computation';
}

// ================================================================ extra invariants checked on EVERY step
type Inv = NonNullable<Case['invariants']>[number];
/** List scenes: a variable shown in the Variables panel must equal the value of the node its chip sits on ("null" / "—" when the chip is absent). */
const chipVars = (pairs: [string, string][]): Inv => (step) => {
  const nodes = (sceneOfKind(step, 'list')?.nodes ?? []) as (LNode & { value: string | number })[];
  for (const [v, id] of pairs) {
    const i = ptr(step, id);
    const shownVar = String(step.vars[v]);
    if (i === null) { if (shownVar !== 'null' && shownVar !== '—') return `var ${v}=${shownVar} but there is no ${id} chip`; continue; }
    const want = String(nodes[i]?.value);
    if (shownVar !== want) return `var ${v}=${shownVar} but the ${id} chip sits on node ${want}`;
  }
  return null;
};
/** An aux stack whose "a" part (before ':') or whole item parses to a number must be monotone bottom -> top. */
const monotoneStack = (title: string, dir: 'nonincreasing' | 'nondecreasing', part: 'whole' | 'after-colon'): Inv => (step) => {
  const xs = auxItems(step, title).map((s) => Number(part === 'whole' ? s : s.split(':')[1]));
  for (let i = 1; i < xs.length; i++) {
    if (dir === 'nonincreasing' ? xs[i] > xs[i - 1] : xs[i] < xs[i - 1]) return `stack "${title}" is not ${dir}: ${xs.join(',')}`;
  }
  return null;
};
const EXTRA: Record<string, Inv[]> = {
  '141-linked-list-cycle': [chipVars([['slow', 'slow'], ['fast', 'fast']])],
  '142-linked-list-cycle-ii': [chipVars([['slow', 'slow'], ['fast', 'fast'], ['ptr', 'ptr']])],
  '206-reverse-linked-list': [chipVars([['prev', 'prev'], ['curr', 'curr'], ['next', 'next']])],
  '92-reverse-linked-list-ii': [chipVars([['prev', 'prev'], ['curr', 'curr'], ['next', 'next']])],
  '19-remove-nth-node-from-end': [chipVars([['slow', 'slow'], ['fast', 'fast']])],
  '21-merge-two-sorted-lists': [chipVars([['l1', 'l1'], ['l2', 'l2'], ['tail', 'tail']])],
  '234-palindrome-linked-list': [chipVars([['slow', 'slow'], ['fast', 'fast'], ['p1', 'p1'], ['p2', 'p2']])],
  '25-reverse-nodes-in-k-group': [chipVars([['groupPrev', 'gp'], ['kth', 'kth'], ['prev', 'prev'], ['curr', 'curr']])],
  '876-middle-of-the-linked-list': [chipVars([['slow', 'slow'], ['fast', 'fast']])],
  '739-daily-temperatures': [monotoneStack('stack', 'nonincreasing', 'after-colon')],
  '503-next-greater-element-ii': [monotoneStack('stack', 'nonincreasing', 'after-colon')],
  '496-next-greater-element-i': [monotoneStack('stack', 'nonincreasing', 'whole')],
  '84-largest-rectangle-in-histogram': [monotoneStack('stack', 'nondecreasing', 'after-colon')],
  '85-maximal-rectangle': [monotoneStack('stack', 'nondecreasing', 'after-colon')],
};
for (const c of cases) if (EXTRA[c.slug]) c.invariants = [...(c.invariants ?? []), ...EXTRA[c.slug]];

// (further chunks appended below)
void scenesOf; void hasAux; void bfsNodes;
