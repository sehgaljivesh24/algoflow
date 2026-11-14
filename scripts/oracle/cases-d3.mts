import type { Step } from '../../src/engine/types.ts';
import type { CaseModule, State } from './types.ts';
import { ptr, rarr, rint, scenesOf, shown } from './util.ts';

/**
 * Batch d3 — backtracking, BFS / flood fill, matrix traversal, greedy, sweep, heaps, divide and conquer.
 * Every oracle below is written from the textbook algorithm (the Java in problem.java as the spec) and never imports the problem file or a kit.
 */

/* ------------------------------------------------------------------ helpers */
type Aux = NonNullable<Step['aux']>[number];
const auxOf = (s: Step, prefix: string): Aux | undefined => s.aux?.find((a) => a.title.startsWith(prefix));
const nums = (v: unknown): number[] => (String(v ?? '').match(/-?\d+/g) ?? []).map(Number);
const varNums = (s: Step, k: string): number[] => nums(s.vars[k]);
/** numbers captured by `re` (first group) from every item of the aux panel whose title starts with `prefix` */
const auxCapture = (s: Step, prefix: string, re: RegExp): number[] => (auxOf(s, prefix)?.items ?? []).map((t) => Number(re.exec(t)?.[1]));
/** items of a list panel as plain strings (results lists): "[1,2]" -> "1,2" */
const strip = (t: string): string => t.replace(/[\[\]\s"]/g, '');
const auxList = (s: Step, prefix: string): string[] => (auxOf(s, prefix)?.items ?? []).map(strip);
const numVar = (s: Step, k: string): number | null => { const v = s.vars[k]; return v === undefined || v === '—' ? null : Number(v); };
const sc = (a: number[]): string => a.join(',');
const gridOf = (s: Step) => scenesOf(s).find((x) => x.kind === 'grid') as Extract<ReturnType<typeof scenesOf>[number], { kind: 'grid' }> | undefined;

export const cases: CaseModule['cases'] = [];

/* ============================================================ 78 / 90 subsets */
/** loop-start-index subsets; dedup = Subsets II (sorted input, skip a repeat of the previous sibling). */
function subsetsOracle(input: number[], dedup: boolean): State[] {
  const a = dedup ? [...input].sort((x, y) => x - y) : input;
  const out: State[] = [];
  const path: number[] = [];
  const res: string[] = [];
  const stack: number[] = [];
  const snap = (i: number | null) => out.push({ stack: [...stack], path: [...path], results: [...res], i });
  snap(null);
  const bt = (start: number) => {
    stack.push(start);
    res.push(sc(path));
    snap(null);
    for (let i = start; i < a.length; i++) {
      if (dedup && i > start && a[i] === a[i - 1]) { snap(i); continue; }
      path.push(a[i]);
      snap(i);
      bt(i + 1);
      stack.pop();
      path.pop();
      snap(i);
    }
  };
  bt(0);
  stack.length = 0;
  snap(null);
  return out;
}
const subsetsProject = (s: Step): State => ({
  stack: auxCapture(s, 'call stack', /start=(\d+)/),
  path: varNums(s, 'path'),
  results: auxList(s, 'results'),
  i: numVar(s, 'i'),
});
cases.push({
  slug: '78-subsets',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 5), -5, 9).filter((v, i, a) => a.indexOf(v) === i) }),
  oracle: ({ nums: n }: { nums: number[] }) => subsetsOracle(n, false),
  project: subsetsProject,
  notes: 'tree scene colours, array cell colours and the start pointer are not compared (call stack frames compared by start index)',
});
cases.push({
  slug: '90-subsets-ii',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 6), -2, 3) }),
  oracle: ({ nums: n }: { nums: number[] }) => subsetsOracle(n, true),
  project: subsetsProject,
  notes: 'tree scene colours not compared',
});

/* ============================================================ 46 / 47 permutations */
function permOracle(input: number[], dedup: boolean): State[] {
  const a = dedup ? [...input].sort((x, y) => x - y) : input;
  const n = a.length;
  const out: State[] = [];
  const used = new Array(n).fill(false);
  const path: number[] = [];
  const res: string[] = [];
  const stack: number[] = [];
  const snap = (i: number | null) => out.push({ stack: [...stack], path: [...path], results: [...res], used: used.map((u) => (u ? 'T' : 'F')), i });
  snap(null);
  const bt = (depth: number) => {
    stack.push(depth);
    if (depth === n) {
      res.push(sc(path));
      snap(null);
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      if (dedup && i > 0 && a[i] === a[i - 1] && !used[i - 1]) { snap(i); continue; } // the skip is a shown event (i lands on the duplicate)
      used[i] = true;
      path.push(a[i]);
      // the child frame is shown with the first event that happens inside it (its record, or its own choose)
      snap(i);
      bt(depth + 1);
      stack.pop();
      path.pop();
      used[i] = false;
      snap(i);
    }
  };
  bt(0);
  stack.length = 0;
  snap(null);
  return out;
}
const permProject = (s: Step): State => ({
  stack: auxCapture(s, 'call stack', /depth=(\d+)/),
  path: varNums(s, 'path'),
  results: auxList(s, 'results'),
  used: (auxOf(s, 'used')?.items ?? []).map((t) => t.split(':')[1].trim()),
  i: numVar(s, 'i'),
});
cases.push({
  slug: '46-permutations',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 4), -5, 9).filter((v, i, a) => a.indexOf(v) === i) }),
  oracle: ({ nums: n }: { nums: number[] }) => permOracle(n, false),
  project: permProject,
  notes: 'tree scene not compared',
});
cases.push({
  slug: '47-permutations-ii',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 5), 1, 3) }),
  oracle: ({ nums: n }: { nums: number[] }) => permOracle(n, true),
  project: permProject,
  notes: 'tree scene not compared',
});

/* ============================================================ 77 combinations */
cases.push({
  slug: '77-combinations',
  gen: (r) => { const n = rint(r, 1, 6); return { n, k: rint(r, 1, n) }; },
  oracle: ({ n, k }: { n: number; k: number }): State[] => {
    const out: State[] = [];
    const path: number[] = [];
    const res: string[] = [];
    const stack: number[] = [];
    let start = 1, lastI = n;
    const snap = () => out.push({ start, lastI, stack: [...stack], path: [...path], results: [...res] });
    snap();
    const bt = (s: number) => {
      stack.push(s);
      start = s;
      lastI = n - (k - path.length) + 1;
      if (path.length === k) { res.push(sc(path)); snap(); return; }
      snap();
      for (let i = s; i <= n - (k - path.length) + 1; i++) {
        path.push(i);
        snap();
        bt(i + 1);
        stack.pop();
        path.pop();
        start = s;
        lastI = n - (k - path.length) + 1;
        snap();
      }
    };
    bt(1);
    stack.length = 0;
    start = n + 1; // design choice: the Done step sets start = n+1 so that every number is drawn dim
    snap();
    return out;
  },
  project: (s) => ({
    start: numVar(s, 'start'), lastI: numVar(s, 'last i'),
    stack: auxCapture(s, 'call stack', /start=(\d+)/), path: varNums(s, 'path'), results: auxList(s, 'results'),
  }),
  notes: 'tree scene not compared; the Done step shows start = n+1 on purpose (dims every number)',
});

/* ============================================================ 39 combination sum */
cases.push({
  slug: '39-combination-sum',
  gen: (r) => ({ candidates: rarr(r, rint(r, 1, 4), 2, 9).filter((v, i, a) => a.indexOf(v) === i), target: rint(r, 1, 12) }),
  oracle: ({ candidates, target }: { candidates: number[]; target: number }): State[] => {
    const c = [...candidates].sort((x, y) => x - y);
    const out: State[] = [];
    const path: number[] = [];
    const res: string[] = [];
    const stack: string[] = [];
    let start = 0, remaining = target;
    const snap = () => out.push({ start, remaining, stack: [...stack], path: [...path], results: [...res] });
    snap();
    const bt = (s: number, rem: number) => {
      stack.push(`${s}:${rem}`);
      start = s; remaining = rem;
      if (rem === 0) { res.push(sc(path)); snap(); return; }
      for (let i = s; i < c.length; i++) {
        start = s; remaining = rem;
        if (c[i] > rem) { snap(); break; } // sorted: break, not continue
        path.push(c[i]);
        remaining = rem - c[i];
        snap();
        bt(i, rem - c[i]);
        stack.pop();
        path.pop();
        start = s; remaining = rem;
        snap();
      }
    };
    bt(0, target);
    stack.length = 0;
    start = c.length; remaining = target;
    snap();
    return out;
  },
  project: (s) => ({
    start: numVar(s, 'start'), remaining: numVar(s, 'remaining'), path: varNums(s, 'path'), results: auxList(s, 'results'),
    stack: (auxOf(s, 'call stack')?.items ?? []).map((t) => { const m = /start=(\d+), rem=(-?\d+)/.exec(t); return `${m?.[1]}:${m?.[2]}`; }),
  }),
  notes: 'tree scene not compared; candidates are sorted by the animation and the loop breaks at the first candidate larger than the remainder',
});

/* ============================================================ 17 letter combinations */
const KEYS: Record<string, string> = { '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl', '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz' };
cases.push({
  slug: '17-letter-combinations-of-a-phone-number',
  gen: (r) => ({ digits: Array.from({ length: rint(r, 1, 3) }, () => String(rint(r, 2, 9))).join('') }),
  oracle: ({ digits }: { digits: string }): State[] => {
    const out: State[] = [];
    let path = '';
    const res: string[] = [];
    const stack: number[] = [];
    const snap = (idx: number, letter: string | null) => out.push({ idx, letter, stack: [...stack], path, results: [...res] });
    snap(0, null);
    const bt = (idx: number) => {
      stack.push(idx);
      if (idx === digits.length) { res.push(path); snap(idx, null); return; }
      for (const ch of KEYS[digits[idx]]) {
        path += ch;
        snap(idx, ch);
        bt(idx + 1);
        stack.pop();
        path = path.slice(0, -1);
        snap(idx, ch);
      }
    };
    bt(0);
    stack.length = 0;
    snap(digits.length, null);
    return out;
  },
  project: (s) => ({
    idx: numVar(s, 'idx'), letter: shown(s, 'letter') as string | null, stack: auxCapture(s, 'call stack', /idx=(\d+)/),
    path: strip(String(s.vars.path)), results: auxList(s, 'results'),
  }),
  notes: 'tree scene and the keypad panel not compared',
});

/* ============================================================ 22 generate parentheses */
cases.push({
  slug: '22-generate-parentheses',
  gen: (r) => ({ n: rint(r, 1, 4) }),
  oracle: ({ n }: { n: number }): State[] => {
    const out: State[] = [];
    let path = '';
    const res: string[] = [];
    const stack: string[] = [];
    const snap = () => out.push({ open: [...path].filter((c) => c === '(').length, close: [...path].filter((c) => c === ')').length, stack: [...stack], path, results: [...res] });
    snap();
    const bt = (open: number, close: number) => {
      stack.push(`${open}:${close}`);
      if (path.length === 2 * n) { res.push(path); snap(); return; }
      // a rejected branch is a shown event too: it displays this frame (frames appear with their first event)
      if (open < n) { path += '('; snap(); bt(open + 1, close); stack.pop(); path = path.slice(0, -1); snap(); } else snap();
      if (close < open) { path += ')'; snap(); bt(open, close + 1); stack.pop(); path = path.slice(0, -1); snap(); } else snap();
    };
    bt(0, 0);
    stack.length = 0;
    snap();
    return out;
  },
  project: (s) => ({
    open: numVar(s, 'open'), close: numVar(s, 'close'),
    stack: (auxOf(s, 'call stack')?.items ?? []).map((t) => { const m = /open=(\d+), close=(\d+)/.exec(t); return `${m?.[1]}:${m?.[2]}`; }),
    path: strip(String(s.vars.path)), results: auxList(s, 'results'),
  }),
  notes: 'tree scene not compared; Reject steps are compared through the frame they display (a frame appears with its first event)',
});

/* ============================================================ 131 palindrome partitioning */
const pieces = (t: string): string[] => t.replace(/^\[|\]$/g, '').split(/,\s*/).filter(Boolean);
cases.push({
  slug: '131-palindrome-partitioning',
  gen: (r) => ({ s: Array.from({ length: rint(r, 1, 6) }, () => 'ab'[rint(r, 0, r() < 0.7 ? 0 : 1)]).join('') }),
  oracle: ({ s }: { s: string }): State[] => {
    const out: State[] = [];
    const path: string[] = [];
    const res: string[] = [];
    const stack: number[] = [];
    const isPal = (t: string) => t === [...t].reverse().join('');
    const snap = (start: number, end: number | null, piece: string | null) => out.push({ start, end, piece, stack: [...stack], path: [...path], results: [...res] });
    snap(0, null, null);
    const dfs = (start: number) => {
      stack.push(start);
      if (start === s.length) { res.push(path.join('|')); snap(start, null, null); return; }
      for (let end = start; end < s.length; end++) {
        const piece = s.slice(start, end + 1);
        if (!isPal(piece)) { snap(start, end, piece); continue; }
        path.push(piece);
        snap(start, end, piece);
        dfs(end + 1);
        stack.pop();
        path.pop();
        snap(start, end, piece);
      }
    };
    dfs(0);
    stack.length = 0;
    snap(s.length, null, null);
    return out;
  },
  project: (s) => ({
    start: numVar(s, 'start'), end: numVar(s, 'end'), piece: shown(s, 'piece') as string | null,
    stack: auxCapture(s, 'call stack', /start=(\d+)/), path: pieces(String(s.vars.path)),
    results: (auxOf(s, 'results')?.items ?? []).map((t) => pieces(t).join('|')),
  }),
  notes: 'tree scene not compared',
});

/* ============================================================ 51 N-Queens */
cases.push({
  slug: '51-n-queens',
  gen: (r) => ({ n: rint(r, 1, 6) }),
  oracle: ({ n }: { n: number }): State[] => {
    const out: State[] = [];
    const cols: number[] = [];
    const sols: string[] = [];
    const attacked = (row: number, c: number) => cols.some((qc, qr) => qr < row && (qc === c || Math.abs(qc - c) === Math.abs(qr - row)));
    const safe = (row: number): string[] => (row >= n ? [] : Array.from({ length: n }, (_, c) => (attacked(row, c) ? 'F' : 'T')));
    const snap = (row: number) => out.push({
      row, queens: cols.length, lastCol: cols.length ? cols[cols.length - 1] : null, safe: safe(row),
      stack: cols.map((c, r) => `${r},${c}`), solutions: [...sols],
    });
    snap(0);
    const solve = (row: number) => {
      for (let c = 0; c < n; c++) {
        if (attacked(row, c)) continue;
        cols.push(c);
        if (row + 1 === n) sols.push(sc(cols));
        snap(row + 1); // Place queen (the last row's placement is the "Solution found" step)
        if (row + 1 < n) solve(row + 1);
        cols.pop();
        snap(row); // Remove queen
      }
    };
    solve(0);
    snap(0); // Done
    return out;
  },
  project: (s) => ({
    row: numVar(s, 'row'), queens: numVar(s, 'queens'), lastCol: numVar(s, 'last col'),
    safe: (auxOf(s, 'row')?.items ?? []).map((t) => (t.includes('✓') ? 'T' : 'F')),
    stack: (auxOf(s, 'call stack')?.items ?? []).map((t) => { const m = /→ \((\d+),(\d+)\)/.exec(t); return `${m?.[1]},${m?.[2]}`; }),
    solutions: auxList(s, 'solutions'),
  }),
  notes: 'board cell marks (Q / x / colours) not compared; the safe-columns panel is compared as T/F per column',
});

/* ============================================================ 37 Sudoku solver */
function sudokuGen(r: () => number): { board: string[] } {
  const base = (rr: number, cc: number) => ((rr % 3) * 3 + Math.floor(rr / 3) + cc) % 9;
  const shuffle = <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = rint(r, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const g3 = shuffle([0, 1, 2]);
  const rows = shuffle([0, 1, 2]).flatMap((b) => shuffle([0, 1, 2]).map((x) => b * 3 + x));
  const cols = g3.flatMap((b) => shuffle([0, 1, 2]).map((x) => b * 3 + x));
  const dig = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const grid = rows.map((rr) => cols.map((cc) => String(dig[base(rr, cc)])));
  const k = rint(r, 1, 20);
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i)).slice(0, k);
  for (const i of cells) grid[Math.floor(i / 9)][i % 9] = '.';
  return { board: grid.map((row) => row.join('')) };
}
cases.push({
  slug: '37-sudoku-solver',
  gen: sudokuGen,
  runs: 40,
  oracle: ({ board }: { board: string[] }): State[] => {
    const b = board.map((row) => [...row]);
    const out: State[] = [];
    const decisions: string[] = [];
    const ok = (rr: number, cc: number, d: string) => {
      for (let i = 0; i < 9; i++) {
        if (b[rr][i] === d || b[i][cc] === d) return false;
        if (b[Math.floor(rr / 3) * 3 + Math.floor(i / 3)][Math.floor(cc / 3) * 3 + (i % 3)] === d) return false;
      }
      return true;
    };
    const snap = (focus: [number, number] | null, digit: string | null, cands: string[]) => out.push({
      board: b.map((row) => row.join('')).join('/'), row: focus ? focus[0] : null, col: focus ? focus[1] : null, digit,
      decisions: [...decisions], cands: focus ? cands : [],
    });
    snap(null, null, []);
    const solve = (): boolean => {
      for (let rr = 0; rr < 9; rr++) for (let cc = 0; cc < 9; cc++) {
        if (b[rr][cc] !== '.') continue;
        const options = [...'123456789'].filter((d) => ok(rr, cc, d));
        if (options.length === 0) { snap([rr, cc], null, []); return false; } // dead end
        for (const d of options) {
          b[rr][cc] = d;
          decisions.push(`(${rr},${cc})=${d}`);
          snap([rr, cc], d, options);
          if (solve()) return true;
          b[rr][cc] = '.';
          decisions.pop();
          snap([rr, cc], d, options); // undo
        }
        return false;
      }
      return true;
    };
    solve();
    snap(null, null, []); // Solved
    return out;
  },
  project: (s) => {
    const g = gridOf(s);
    const focusItems = (auxOf(s, 'digits for')?.items ?? []);
    return {
      board: (g?.rows ?? []).map((row) => row.map((c) => (c.value === '' ? '.' : String(c.value))).join('')).join('/'),
      row: numVar(s, 'row'), col: numVar(s, 'col'), digit: shown(s, 'digit') === null ? null : String(shown(s, 'digit')),
      decisions: (auxOf(s, 'call stack')?.items ?? []),
      cands: focusItems.filter((t) => !t.includes('✗')),
    };
  },
  notes: 'cell tones/colours not compared; solver is the plain reading-order backtracker (every candidate / dead end / undo is a step)',
});

/* ============================================================ 79 word search */
cases.push({
  slug: '79-word-search',
  gen: (r) => {
    const R = rint(r, 1, 4), C = rint(r, 1, 5);
    const alpha = r() < 0.5 ? 'AB' : 'ABC';
    const board = Array.from({ length: R }, () => Array.from({ length: C }, () => alpha[rint(r, 0, alpha.length - 1)]).join(''));
    const word = Array.from({ length: rint(r, 1, 8) }, () => alpha[rint(r, 0, alpha.length - 1)]).join('');
    return { board, word };
  },
  oracle: ({ board, word }: { board: string[]; word: string }): State[] => {
    const R = board.length, C = board[0].length;
    const events: State[] = [];
    const path: [number, number][] = [];
    const on = board.map((row) => [...row].map(() => false));
    let cur: [number, number] | null = null;
    let k = 0;
    const MAX = 360; // the animation drops unforced steps after 360 and says so in the final step
    const snap = (force = false) => {
      if (!force && events.length >= MAX) return;
      events.push({ row: cur ? cur[0] : null, col: cur ? cur[1] : null, k, depth: path.length, stack: path.map(([a, b]) => `${a},${b}`) });
    };
    snap();
    const dfs = (rr: number, cc: number, i: number): boolean => {
      if (rr < 0 || cc < 0 || rr >= R || cc >= C) return false;
      if (on[rr][cc]) { k = i; cur = [rr, cc]; snap(); return false; }
      k = i;
      if (board[rr][cc] !== word[i]) { cur = [rr, cc]; snap(); return false; }
      on[rr][cc] = true; path.push([rr, cc]); cur = [rr, cc];
      if (i === word.length - 1) { snap(true); return true; }
      snap();
      if (dfs(rr + 1, cc, i + 1) || dfs(rr - 1, cc, i + 1) || dfs(rr, cc + 1, i + 1) || dfs(rr, cc - 1, i + 1)) return true;
      on[rr][cc] = false; path.pop(); cur = [rr, cc]; k = i;
      snap();
      return false;
    };
    let found = false;
    for (let rr = 0; rr < R && !found; rr++) for (let cc = 0; cc < C && !found; cc++) {
      if (board[rr][cc] !== word[0]) continue;
      cur = [rr, cc]; k = 0;
      snap();
      found = dfs(rr, cc, 0);
    }
    cur = null;
    snap(true); // Found / Not found
    return events;
  },
  project: (s) => ({
    row: numVar(s, 'row'), col: numVar(s, 'col'), k: numVar(s, 'letter index'), depth: numVar(s, 'depth'),
    stack: (auxOf(s, 'call stack')?.items ?? []).map((t) => { const m = /dfs\((\d+),(\d+),/.exec(t); return `${m?.[1]},${m?.[2]}`; }),
  }),
  notes: 'grid cell colours not compared; replicates the 360-step cap (steps beyond it are dropped, the last step is forced) - compared as the same truncated prefix',
});

/* ============================================================ 31 next permutation */
cases.push({
  slug: '31-next-permutation',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 7), 1, r() < 0.5 ? 3 : 8) }),
  oracle: ({ nums: a0 }: { nums: number[] }): State[] => {
    const a = [...a0];
    const n = a.length;
    const out: State[] = [];
    const snap = (i: number | null, j: number | null) => out.push({ arr: [...a], i, j });
    snap(null, null);
    let i = n - 2;
    for (;;) {
      if (i < 0) { snap(-1, null); break; }
      snap(i, null);
      if (a[i] < a[i + 1]) break;
      i--;
    }
    if (i >= 0) {
      let j = n - 1;
      for (;;) {
        snap(i, j);
        if (a[j] > a[i]) break;
        j--;
      }
      [a[i], a[j]] = [a[j], a[i]];
      snap(i, j);
    }
    for (let lo = i + 1, hi = n - 1; lo < hi; lo++, hi--) {
      [a[lo], a[hi]] = [a[hi], a[lo]];
      snap(i, null);
    }
    snap(i, null);
    return out;
  },
  project: (s) => ({ arr: (s.cells ?? scenesOf(s).flatMap((x) => (x.kind === 'array' ? x.cells : []))).map((c) => c.value as number), i: shown(s, 'i') === 'none' ? -1 : numVar(s, 'i'), j: numVar(s, 'j') }),
  notes: 'cell colours not compared; the reverse of the tail is compared swap by swap',
});

/* ============================================================ flood fill family */
const bitGrid = (r: () => number, maxR: number, maxC: number, pOne = 0.55): string[] => {
  const R = rint(r, 1, maxR), C = rint(r, 1, maxC);
  return Array.from({ length: R }, () => Array.from({ length: C }, () => (r() < pOne ? '1' : '0')).join(''));
};
const pairOf = (t: string): string | null => { const m = /\((\d+),\s*(\d+)\)/.exec(t); return m ? `${m[1]},${m[2]}` : null; };
const stackPairs = (s: Step, prefix: string): string[] => (auxOf(s, prefix)?.items ?? []).map((t) => pairOf(t) ?? '?');
const tonedCells = (s: Step): string[] => {
  const out: string[] = [];
  gridOf(s)?.rows.forEach((row, rr) => row.forEach((c, cc) => { if (c.tone) out.push(`${rr},${cc}`); }));
  return out;
};
const DIRS_DUL_R_L: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/* ---- 200 number of islands */
cases.push({
  slug: '200-number-of-islands',
  gen: (r) => ({ grid: bitGrid(r, 5, 5) }),
  oracle: ({ grid }: { grid: string[] }): State[] => {
    const R = grid.length, C = grid[0].length;
    const g = grid.map((row) => [...row]);
    const out: State[] = [];
    const sunkSet: string[] = [];
    const stack: string[] = [];
    let islands = 0, scan: string | null = null, sunk = 0;
    const snap = () => out.push({ islands, scan, sunk, depth: stack.length, stack: [...stack], toned: [...sunkSet].sort((a, b) => { const [ar, ac] = a.split(',').map(Number), [br, bc] = b.split(',').map(Number); return ar - br || ac - bc; }) });
    snap();
    const sink = (rr: number, cc: number) => {
      if (rr < 0 || cc < 0 || rr >= R || cc >= C || g[rr][cc] !== '1') return;
      g[rr][cc] = '0';
      sunk++; sunkSet.push(`${rr},${cc}`); stack.push(`${rr},${cc}`); scan = `${rr},${cc}`;
      snap(); // Sink
      for (const [dr, dc] of DIRS_DUL_R_L) sink(rr + dr, cc + dc);
      stack.pop();
      scan = `${rr},${cc}`;
      snap(); // Return from
    };
    for (let rr = 0; rr < R; rr++) for (let cc = 0; cc < C; cc++) {
      if (g[rr][cc] === '1') { islands++; scan = `${rr},${cc}`; snap(); sink(rr, cc); }
      else if (grid[rr][cc] === '1') { scan = `${rr},${cc}`; snap(); } // Skip: land that an earlier flood already sank
    }
    scan = null;
    snap();
    return out;
  },
  project: (s) => ({
    islands: numVar(s, 'islands'), scan: shown(s, 'scan') === null ? null : (pairOf(String(s.vars.scan)) as string), sunk: numVar(s, 'cells sunk'),
    depth: numVar(s, 'stack depth'), stack: stackPairs(s, 'call stack'), toned: tonedCells(s),
  }),
  notes: 'compares which cells are tinted (sunk) but not the per-island tint colour or the cell states (active / compare)',
});

/* ---- 695 max area of island */
cases.push({
  slug: '695-max-area-of-island',
  gen: (r) => ({ grid: bitGrid(r, 5, 5) }),
  oracle: ({ grid }: { grid: string[] }): State[] => {
    const R = grid.length, C = grid[0].length;
    const g = grid.map((row) => [...row]);
    const out: State[] = [];
    const sunkSet: string[] = [];
    const stack: string[] = [];
    const areas: number[] = [];
    let island: number | null = null, area = 0, best = 0;
    const snap = () => out.push({ island, area, best, depth: stack.length, stack: [...stack], areas: [...areas], toned: [...sunkSet].sort((a, b) => { const [ar, ac] = a.split(',').map(Number), [br, bc] = b.split(',').map(Number); return ar - br || ac - bc; }) });
    snap();
    const dfs = (rr: number, cc: number): number => {
      if (rr < 0 || cc < 0 || rr >= R || cc >= C || g[rr][cc] !== '1') return 0;
      g[rr][cc] = '0';
      area++; sunkSet.push(`${rr},${cc}`); stack.push(`${rr},${cc}`);
      snap(); // Enter
      let tot = 1;
      for (const [dr, dc] of DIRS_DUL_R_L) tot += dfs(rr + dr, cc + dc);
      snap(); // Return from (the returning frame is still drawn on the stack for that step)
      stack.pop();
      return tot;
    };
    for (let rr = 0; rr < R; rr++) for (let cc = 0; cc < C; cc++) {
      if (g[rr][cc] !== '1') continue;
      island = (island ?? 0) + 1; area = 0; snap(); // New island
      const a = dfs(rr, cc);
      best = Math.max(best, a); areas.push(a);
      snap(); // Island covers
    }
    snap();
    return out;
  },
  project: (s) => ({
    island: numVar(s, 'island'), area: numVar(s, 'area so far'), best: numVar(s, 'best'), depth: numVar(s, 'stack depth'),
    stack: stackPairs(s, 'recursion stack'), areas: (auxOf(s, 'island areas')?.items ?? []).map(Number), toned: tonedCells(s),
  }),
  notes: 'compares which cells are tinted but not island tint colours or cell states; the Return step still shows the returning frame on the stack (popped with the next event) and the oracle mirrors that display rule',
});

/* ---- 994 rotting oranges */
cases.push({
  slug: '994-rotting-oranges',
  gen: (r) => {
    const R = rint(r, 1, 4), C = rint(r, 1, 5);
    return { grid: Array.from({ length: R }, () => Array.from({ length: C }, () => { const x = r(); return x < 0.2 ? '0' : x < 0.85 ? '1' : '2'; }).join('')) };
  },
  oracle: ({ grid }: { grid: string[] }): State[] => {
    const R = grid.length, C = grid[0].length;
    const g = grid.map((row) => [...row]);
    let q: string[] = [];
    let fresh = 0;
    for (let rr = 0; rr < R; rr++) for (let cc = 0; cc < C; cc++) { if (g[rr][cc] === '2') q.push(`${rr},${cc}`); else if (g[rr][cc] === '1') fresh++; }
    const out: State[] = [];
    let minute = 0;
    const snap = (answer: number | null = null) => out.push({ minute, qsize: q.length, fresh, queue: [...q], board: g.map((row) => row.join('')).join('/'), answer });
    snap();
    while (q.length && fresh > 0) {
      minute++;
      snap(); // Minute k begins
      const next: string[] = [];
      for (const cur of q) {
        const [cr, cc] = cur.split(',').map(Number);
        for (const [dr, dc] of DIRS_DUL_R_L) {
          const nr = cr + dr, nc = cc + dc;
          if (nr < 0 || nc < 0 || nr >= R || nc >= C || g[nr][nc] !== '1') continue;
          g[nr][nc] = '2'; fresh--; next.push(`${nr},${nc}`);
        }
      }
      q = next;
      snap(); // Minute k: n oranges rot
    }
    snap(fresh === 0 ? minute : -1);
    return out;
  },
  project: (s) => ({
    minute: numVar(s, 'minute'), qsize: numVar(s, 'queue size'), fresh: numVar(s, 'fresh left'), queue: stackPairs(s, 'queue'),
    board: (gridOf(s)?.rows ?? []).map((row) => row.map((c) => String(c.value)).join('')).join('/'), answer: numVar(s, 'answer'),
  }),
  notes: 'cell highlight states not compared',
});

/* ---- 130 surrounded regions */
cases.push({
  slug: '130-surrounded-regions',
  gen: (r) => {
    const R = rint(r, 1, 5), C = rint(r, 1, 5), p = [0.3, 0.5, 0.7][rint(r, 0, 2)];
    return { grid: Array.from({ length: R }, () => Array.from({ length: C }, () => (r() < p ? 'O' : 'X')).join('')) };
  },
  oracle: ({ grid }: { grid: string[] }): State[] => {
    const R = grid.length, C = grid[0].length;
    const b = grid.map((row) => [...row]);
    const safe = b.map((row) => row.map(() => false));
    const out: State[] = [];
    const stack: string[] = [];
    let nSafe = 0, doomed = 0, phase = 'start';
    const O = grid.join('').split('O').length - 1;
    const snap = () => out.push({ safe: nSafe, doomed, depth: stack.length, phase, stack: [...stack], board: b.map((row) => row.join('')).join('/') });
    doomed = O;
    snap();
    phase = 'mark safe';
    snap(); // Flood from the border
    const dfs = (rr: number, cc: number) => {
      safe[rr][cc] = true; nSafe++; stack.push(`${rr},${cc}`);
      doomed = O - nSafe;
      snap(); // Mark safe (the frame is popped silently when the call returns)
      for (const [dr, dc] of DIRS_DUL_R_L) {
        const nr = rr + dr, nc = cc + dc;
        if (nr < 0 || nc < 0 || nr >= R || nc >= C || b[nr][nc] !== 'O' || safe[nr][nc]) continue;
        dfs(nr, nc);
      }
      stack.pop();
    };
    const border: [number, number][] = [];
    for (let rr = 0; rr < R; rr++) border.push([rr, 0], [rr, C - 1]);
    for (let cc = 0; cc < C; cc++) border.push([0, cc], [R - 1, cc]);
    for (const [rr, cc] of border) if (b[rr][cc] === 'O' && !safe[rr][cc]) dfs(rr, cc);
    phase = 'capture';
    snap(); // Border flood finished
    for (let rr = 0; rr < R; rr++) for (let cc = 0; cc < C; cc++) if (b[rr][cc] === 'O' && !safe[rr][cc]) { b[rr][cc] = 'X'; snap(); }
    phase = 'restore';
    snap(); snap();
    return out;
  },
  project: (s) => ({
    safe: numVar(s, 'safe O cells'), doomed: numVar(s, 'O cells to capture'), depth: numVar(s, 'stack depth'), phase: String(s.vars.phase),
    stack: stackPairs(s, 'recursion stack'),
    board: (gridOf(s)?.rows ?? []).map((row) => row.map((c) => String(c.value)).join('')).join('/'),
  }),
  notes: 'cell highlight states not compared; "O cells to capture" is compared as the count of still-unsafe O cells',
});

/* ---- 417 pacific atlantic */
cases.push({
  slug: '417-pacific-atlantic-water-flow',
  gen: (r) => {
    const R = rint(r, 1, 5), C = rint(r, 1, 6), hi = [1, 3, 9][rint(r, 0, 2)];
    return { grid: Array.from({ length: R }, () => Array.from({ length: C }, () => String(rint(r, 0, hi))).join('')) };
  },
  oracle: ({ grid }: { grid: string[] }): State[] => {
    const R = grid.length, C = grid[0].length;
    const h = grid.map((row) => [...row].map(Number));
    const pac = h.map((row) => row.map(() => false)), atl = h.map((row) => row.map(() => false));
    const out: State[] = [];
    let newly: string[] = [];
    let answer: string | null = null;
    const cnt = (m: boolean[][]) => m.flat().filter(Boolean).length;
    const bothList = (): string[] => { const l: string[] = []; for (let rr = 0; rr < R; rr++) for (let cc = 0; cc < C; cc++) if (pac[rr][cc] && atl[rr][cc]) l.push(`${rr},${cc}`); return l; };
    const rowMajor = (a: string[]) => [...a].sort((x, y) => { const [ar, ac] = x.split(',').map(Number), [br, bc] = y.split(',').map(Number); return ar - br || ac - bc; });
    const snap = () => out.push({ pac: cnt(pac), atl: cnt(atl), both: bothList().length, bothCells: bothList(), newly: rowMajor(newly), answer });
    snap();
    const flood = (seen: boolean[][], seeds: [number, number][]) => {
      let frontier: [number, number][] = [];
      newly = [];
      for (const [rr, cc] of seeds) if (!seen[rr][cc]) { seen[rr][cc] = true; frontier.push([rr, cc]); newly.push(`${rr},${cc}`); }
      snap();
      while (frontier.length) {
        const next: [number, number][] = [];
        newly = [];
        for (const [rr, cc] of frontier) for (const [dr, dc] of DIRS_DUL_R_L) {
          const nr = rr + dr, nc = cc + dc;
          if (nr < 0 || nc < 0 || nr >= R || nc >= C || seen[nr][nc] || h[nr][nc] < h[rr][cc]) continue;
          seen[nr][nc] = true; next.push([nr, nc]); newly.push(`${nr},${nc}`);
        }
        frontier = next;
        if (!next.length) break;
        snap();
      }
      newly = [];
      snap();
    };
    const ps: [number, number][] = [], as: [number, number][] = [];
    for (let rr = 0; rr < R; rr++) ps.push([rr, 0]);
    for (let cc = 1; cc < C; cc++) ps.push([0, cc]);
    for (let rr = 0; rr < R; rr++) as.push([rr, C - 1]);
    for (let cc = 0; cc < C - 1; cc++) as.push([R - 1, cc]);
    flood(pac, ps);
    flood(atl, as);
    answer = `[${bothList().map((p) => `[${p}]`).join(',')}]`;
    snap();
    return out;
  },
  project: (s) => {
    const newly: string[] = [];
    gridOf(s)?.rows.forEach((row, rr) => row.forEach((c, cc) => { if (c.state === 'swap') newly.push(`${rr},${cc}`); }));
    const a = shown(s, 'answer');
    return {
      pac: numVar(s, 'reach Pacific'), atl: numVar(s, 'reach Atlantic'), both: numVar(s, 'reach both'),
      bothCells: stackPairs(s, 'cells that reach'), newly, answer: a === null ? null : String(a).replace(/\s+/g, ''),
    };
  },
  notes: 'compares the counts, the cells that reach both oceans, the cells added by each wave (the purple wave cells) and the final answer; per-cell Pacific-only / Atlantic-only colours not compared',
});

/* ---- 542 01 matrix */
cases.push({
  slug: '542-01-matrix',
  gen: (r) => {
    const R = rint(r, 1, 5), C = rint(r, 1, 5), p = [0.2, 0.5, 0.8][rint(r, 0, 2)];
    const g = Array.from({ length: R }, () => Array.from({ length: C }, () => (r() < p ? '1' : '0')));
    if (!g.flat().includes('0')) g[rint(r, 0, R - 1)][rint(r, 0, C - 1)] = '0';
    return { grid: g.map((row) => row.join('')) };
  },
  oracle: ({ grid }: { grid: string[] }): State[] => {
    const R = grid.length, C = grid[0].length;
    const dist = grid.map((row) => [...row].map((ch) => (ch === '0' ? 0 : -1)));
    const q: [number, number][] = [];
    for (let rr = 0; rr < R; rr++) for (let cc = 0; cc < C; cc++) if (dist[rr][cc] === 0) q.push([rr, cc]);
    const out: State[] = [];
    let time = 0;
    const snap = () => out.push({
      time, qsize: q.length, unknown: dist.flat().filter((d) => d === -1).length,
      queue: q.map(([a, b]) => `${a},${b}:${dist[a][b]}`), board: dist.map((row) => row.map((d) => (d === -1 ? '?' : d)).join(',')).join('/'),
    });
    snap();
    let level = 0;
    while (q.length) {
      const [rr, cc] = q[0];
      const d = dist[rr][cc];
      if (d !== level) { level = d; time = d; snap(); } // Time d tick
      q.shift();
      time = d;
      for (const [dr, dc] of DIRS_DUL_R_L) {
        const nr = rr + dr, nc = cc + dc;
        if (nr < 0 || nc < 0 || nr >= R || nc >= C || dist[nr][nc] !== -1) continue;
        dist[nr][nc] = d + 1; q.push([nr, nc]);
      }
      snap();
    }
    snap();
    return out;
  },
  project: (s) => ({
    time: numVar(s, 'time'), qsize: numVar(s, 'queue size'), unknown: numVar(s, 'unknown'),
    queue: (auxOf(s, 'queue')?.items ?? []).map((t) => { const m = /\((\d+),(\d+)\) d=(\d+)/.exec(t); return `${m?.[1]},${m?.[2]}:${m?.[3]}`; }),
    board: (gridOf(s)?.rows ?? []).map((row) => row.map((c) => String(c.value)).join(',')).join('/'),
  }),
  notes: 'cell highlight states not compared',
});

/* ---- 127 word ladder */
cases.push({
  slug: '127-word-ladder',
  gen: (r) => {
    const L = rint(r, 2, 4), alpha = 'abc';
    const word = () => Array.from({ length: L }, () => alpha[rint(r, 0, alpha.length - 1)]).join('');
    const begin = word();
    let end = word();
    while (end === begin) end = word();
    const words: string[] = [];
    for (let k = rint(r, 1, 8); words.length < k && words.length < 20;) { const w = word(); if (w !== begin && !words.includes(w)) words.push(w); if (words.length >= 3 ** L - 1) break; }
    if (r() < 0.7 && !words.includes(end)) words[rint(r, 0, words.length - 1)] = end;
    return { begin, end, words: words.filter((w, i, a) => a.indexOf(w) === i) };
  },
  oracle: ({ begin, end, words }: { begin: string; end: string; words: string[] }): State[] => {
    const dict = new Set(words);
    const out: State[] = [];
    let word: string | null = null, length: number | null = null, answer: string | null = null;
    const len = new Map<string, number>([]);
    const queue: string[] = [];
    const snap = () => out.push({
      word, length, visited: len.size, qsize: queue.length, answer,
      queue: queue.map((w) => `${w}(${len.get(w)})`), unreached: words.filter((w) => !len.has(w) && w !== begin),
    });
    snap();
    if (!dict.has(end)) { answer = '0'; snap(); return out; }
    len.set(begin, 1); queue.push(begin);
    snap();
    let found = false;
    while (queue.length) {
      const w = queue.shift()!;
      word = w; length = len.get(w)!;
      if (w === end) { answer = String(length); snap(); found = true; break; }
      snap();
      for (let i = 0; i < w.length; i++) for (let k = 0; k < 26; k++) {
        const ch = String.fromCharCode(97 + k);
        const nx = w.slice(0, i) + ch + w.slice(i + 1);
        if (dict.has(nx) && !len.has(nx)) { len.set(nx, length + 1); queue.push(nx); }
      }
      snap();
      word = null; length = null;
    }
    if (!found) { word = null; length = null; answer = '0'; }
    snap();
    return out;
  },
  project: (s) => ({
    word: shown(s, 'word') as string | null, length: numVar(s, 'length'), visited: numVar(s, 'visited'), qsize: numVar(s, 'queue size'),
    answer: shown(s, 'answer') === null ? null : String(shown(s, 'answer')),
    queue: (auxOf(s, 'queue')?.items ?? []).map((t) => t.replace(/\s+/g, '')),
    unreached: auxOf(s, 'words not reached')?.items ?? [],
  }),
  notes: 'graph node colours and edge states not compared; siblings enter the queue in the Java order (position left to right, then a..z)',
});

/* ---- 1971 path exists */
cases.push({
  slug: '1971-find-if-path-exists-in-graph',
  gen: (r) => {
    const n = rint(r, 2, 8);
    const pairs: [number, number][] = [];
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) pairs.push([a, b]);
    const edges: { u: number; v: number }[] = [];
    const m = rint(r, 0, Math.min(12, pairs.length));
    for (let k = 0; k < m; k++) { const [a, b] = pairs.splice(rint(r, 0, pairs.length - 1), 1)[0]; edges.push(r() < 0.5 ? { u: a, v: b } : { u: b, v: a }); }
    return { n, source: rint(r, 0, n - 1), destination: rint(r, 0, n - 1), edges };
  },
  oracle: ({ n, source, destination, edges }: { n: number; source: number; destination: number; edges: { u: number; v: number }[] }): State[] => {
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (const { u, v } of edges) { adj[u].push(v); adj[v].push(u); }
    const seen = new Array(n).fill(false);
    const dist = new Array(n).fill(0);
    const queue: number[] = [];
    const out: State[] = [];
    let node: number | null = null, answer: string | null = null;
    const snap = () => out.push({
      node, level: node === null ? null : dist[node], visited: seen.filter(Boolean).length, qsize: queue.length, answer,
      queue: [...queue], seen: seen.flatMap((s, i) => (s ? [i] : [])),
    });
    snap();
    seen[source] = true; queue.push(source);
    snap();
    let found = false;
    while (queue.length) {
      const u = queue.shift()!;
      node = u;
      if (u === destination) { found = true; snap(); break; }
      snap();
      for (const v of adj[u]) if (!seen[v]) { seen[v] = true; dist[v] = dist[u] + 1; queue.push(v); snap(); }
      node = null;
    }
    node = found ? destination : null;
    answer = String(found);
    snap();
    return out;
  },
  project: (s) => ({
    node: numVar(s, 'node'), level: numVar(s, 'level'), visited: numVar(s, 'visited'), qsize: numVar(s, 'queue size'),
    answer: shown(s, 'answer') === null ? null : String(shown(s, 'answer')),
    queue: (auxOf(s, 'queue')?.items ?? []).map(Number), seen: (auxOf(s, 'seen')?.items ?? []).map(Number),
  }),
  notes: 'graph node / edge colours not compared; neighbours are taken in edge-list order, as in the displayed Java',
});

/* ============================================================ matrix traversal */
const boardOf = (s: Step): string => (gridOf(s)?.rows ?? []).map((row) => row.map((c) => String(c.value)).join(',')).join('/');
const flat = (m: number[][]): string => m.map((row) => row.join(',')).join('/');
const genMatrix = (r: () => number, maxR: number, maxC: number, square = false, lo = -9, hi = 9): { m: number[][] } => {
  const R = rint(r, 1, maxR), C = square ? R : rint(r, 1, maxC);
  return { m: Array.from({ length: R }, () => rarr(r, C, lo, hi)) };
};

/* ---- 48 rotate image */
cases.push({
  slug: '48-rotate-image',
  gen: (r) => genMatrix(r, 5, 5, true, 1, 20),
  oracle: ({ m: m0 }: { m: number[][] }): State[] => {
    const m = m0.map((row) => [...row]);
    const n = m.length;
    const out: State[] = [];
    const snap = (phase: string, i: number | null, j: number | null) => out.push({ phase, i, j, board: flat(m) });
    snap('start', null, null);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { [m[i][j], m[j][i]] = [m[j][i], m[i][j]]; snap('transpose', i, j); }
    snap('transpose', null, null);
    for (let i = 0; i < n; i++) for (let j = 0; j < Math.floor(n / 2); j++) { [m[i][j], m[i][n - 1 - j]] = [m[i][n - 1 - j], m[i][j]]; snap('reverse rows', i, j); }
    snap('done', null, null);
    return out;
  },
  project: (s) => ({ phase: String(s.vars.phase), i: numVar(s, 'i'), j: numVar(s, 'j'), board: boardOf(s) }),
  notes: 'swap highlight states not compared',
});

/* ---- 54 spiral matrix */
cases.push({
  slug: '54-spiral-matrix',
  gen: (r) => genMatrix(r, 5, 5),
  oracle: ({ m }: { m: number[][] }): State[] => {
    const R = m.length, C = m[0].length;
    const out: State[] = [];
    const res: number[] = [];
    let top = 0, bottom = R - 1, left = 0, right = C - 1;
    const snap = () => out.push({ top, bottom, left, right, out: [...res] });
    snap();
    while (top <= bottom && left <= right) {
      for (let j = left; j <= right; j++) { res.push(m[top][j]); snap(); }
      top++; snap();
      for (let i = top; i <= bottom; i++) { res.push(m[i][right]); snap(); }
      right--; snap();
      if (top <= bottom) { for (let j = right; j >= left; j--) { res.push(m[bottom][j]); snap(); } bottom--; snap(); }
      if (left <= right) { for (let i = bottom; i >= top; i--) { res.push(m[i][left]); snap(); } left++; snap(); }
    }
    snap();
    return out;
  },
  project: (s) => ({
    top: numVar(s, 'top'), bottom: numVar(s, 'bottom'), left: numVar(s, 'left'), right: numVar(s, 'right'),
    out: (auxOf(s, 'output')?.items ?? []).map(Number),
  }),
  notes: 'cell colours and the Ring / Guard narration steps (no state change) not compared',
});

/* ---- 498 diagonal traverse */
cases.push({
  slug: '498-diagonal-traverse',
  gen: (r) => genMatrix(r, 5, 5),
  oracle: ({ m }: { m: number[][] }): State[] => {
    const R = m.length, C = m[0].length;
    const out: State[] = [];
    const res: number[] = [];
    let r = 0, c = 0, up = true;
    const snap = () => out.push({ row: r, col: c, dir: up ? 'up-right' : 'down-left', diag: r + c, taken: res.length, out: [...res] });
    snap();
    for (let k = 0; k < R * C; k++) {
      res.push(m[r][c]);
      if (up) {
        if (c === C - 1) { r++; up = false; } else if (r === 0) { c++; up = false; } else { r--; c++; }
      } else if (r === R - 1) { c++; up = true; } else if (c === 0) { r++; up = true; } else { r++; c--; }
      snap();
    }
    snap();
    return out;
  },
  project: (s) => ({
    row: numVar(s, 'row'), col: numVar(s, 'col'), dir: String(s.vars.direction), diag: numVar(s, 'diagonal'), taken: numVar(s, 'taken'),
    out: (auxOf(s, 'output')?.items ?? []).map(Number),
  }),
  notes: 'cell colours not compared; row/col after the last cell are the (out-of-matrix) next position the unguarded loop computes, and the shown diagonal is r+c of that next position',
});

/* ---- 73 set matrix zeroes */
cases.push({
  slug: '73-set-matrix-zeroes',
  gen: (r) => { const R = rint(r, 1, 4), C = rint(r, 1, 5), p = [0.1, 0.25, 0.5][rint(r, 0, 2)]; return { m: Array.from({ length: R }, () => Array.from({ length: C }, () => (r() < p ? 0 : rint(r, 1, 9)))) }; },
  oracle: ({ m: m0 }: { m: number[][] }): State[] => {
    const m = m0.map((row) => [...row]);
    const R = m.length, C = m[0].length;
    const out: State[] = [];
    let rowZero = false, colZero = false;
    let row: number | null = null, col: number | null = null;
    const snap = () => out.push({ rowZero: String(rowZero), colZero: String(colZero), row, col, board: flat(m) });
    snap();
    for (let c = 0; c < C; c++) if (m[0][c] === 0) rowZero = true;
    for (let r = 0; r < R; r++) if (m[r][0] === 0) colZero = true;
    snap();
    for (let r = 1; r < R; r++) for (let c = 1; c < C; c++) if (m[r][c] === 0) { m[r][0] = 0; m[0][c] = 0; row = r; col = c; snap(); }
    row = null; col = null;
    snap();
    for (let r = 1; r < R; r++) for (let c = 1; c < C; c++) if (m[r][c] !== 0 && (m[r][0] === 0 || m[0][c] === 0)) { m[r][c] = 0; row = r; col = c; snap(); }
    row = null; col = null;
    if (rowZero) { for (let c = 0; c < C; c++) m[0][c] = 0; snap(); }
    if (colZero) { for (let r = 0; r < R; r++) m[r][0] = 0; snap(); }
    snap();
    return out;
  },
  project: (s) => ({ rowZero: String(s.vars['first row zero']), colZero: String(s.vars['first col zero']), row: numVar(s, 'row'), col: numVar(s, 'col'), board: boardOf(s) }),
  notes: 'cell colours and the flags panel (a restatement of the two flag vars) not compared',
});

/* ============================================================ greedy / intervals / sweep */
const ivScene = (s: Step) => scenesOf(s).find((x) => x.kind === 'intervals') as Extract<ReturnType<typeof scenesOf>[number], { kind: 'intervals' }> | undefined;
/** "[1, 3]" -> "1,3"; anything without numbers -> null */
const ivText = (v: unknown): string | null => { const n = nums(v); return n.length ? n.join(',') : null; };
const numOrNull = (v: unknown): number | null => { if (v === undefined || v === null) return null; const n = Number(v); return Number.isFinite(n) && String(v).trim() !== '' ? n : null; };
const genIntervals = (r: () => number, maxN: number, hi = 12): [number, number][] =>
  Array.from({ length: rint(r, 1, maxN) }, () => { const a = rint(r, 0, hi - 1); return [a, a + rint(r, 1, 5)] as [number, number]; });

/* ---- 55 jump game */
cases.push({
  slug: '55-jump-game',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 8), 0, r() < 0.5 ? 2 : 4) }),
  oracle: ({ nums: a }: { nums: number[] }): State[] => {
    const n = a.length;
    const out: State[] = [];
    let reach = 0;
    let i: number | null = null;
    const snap = () => out.push({ i, reach });
    snap();
    for (let k = 0; k < n; k++) {
      i = k;
      snap(); // Scan index k
      if (k > reach) break; // Stuck at index k
      reach = Math.max(reach, k + a[k]);
      snap();
      if (reach >= n - 1) break;
    }
    return out;
  },
  project: (s) => ({ i: numVar(s, 'i'), reach: numVar(s, 'reach') }),
  notes: 'cell colours and the reach pointer (a restatement of the reach var) not compared',
});

/* ---- 45 jump game II */
cases.push({
  slug: '45-jump-game-ii',
  gen: (r) => { const n = rint(r, 1, 8); const a = rarr(r, n, 1, 3); if (r() < 0.7) return { nums: a }; return { nums: rarr(r, n, 0, 3).map((v, i) => (i === 0 ? Math.max(1, v) : v)) }; },
  oracle: ({ nums: a }: { nums: number[] }): State[] => {
    const n = a.length;
    const out: State[] = [];
    let jumps = 0, curEnd = 0, far = 0;
    let i: number | null = null;
    const snap = () => out.push({ i, jumps, curEnd, far });
    snap();
    for (let k = 0; k < n - 1; k++) {
      i = k;
      far = Math.max(far, k + a[k]);
      snap(); // At k: can reach far
      if (k === curEnd) { jumps++; curEnd = far; snap(); } // End of the level
    }
    i = null;
    snap();
    return out;
  },
  project: (s) => ({ i: numVar(s, 'i'), jumps: numVar(s, 'jumps'), curEnd: numVar(s, 'curEnd'), far: numVar(s, 'far') }),
  notes: 'cell colours not compared; inputs where the end is unreachable are not generated (the problem guarantees reachability)',
});

/* ---- 134 gas station */
cases.push({
  slug: '134-gas-station',
  gen: (r) => { const n = rint(r, 1, 7); return { gas: rarr(r, n, 0, 6), cost: rarr(r, n, 0, 6) }; },
  oracle: ({ gas, cost }: { gas: number[]; cost: number[] }): State[] => {
    const out: State[] = [];
    let tank = 0, total = 0, start = 0;
    let i: number | null = null;
    const snap = () => out.push({ i, tank, total, start });
    snap();
    for (let k = 0; k < gas.length; k++) {
      i = k;
      total += gas[k] - cost[k];
      tank += gas[k] - cost[k];
      snap(); // Station k: tank would be ...
      if (tank < 0) { start = k + 1; tank = 0; snap(); } // New candidate start
    }
    i = null;
    snap();
    return out;
  },
  project: (s) => ({ i: numVar(s, 'i'), tank: numVar(s, 'current tank'), total: numVar(s, 'total net'), start: numVar(s, 'candidate start') }),
  notes: 'the final answer (-1 or the start) is only in the result card and is not compared',
});

/* ---- 435 non overlapping intervals */
cases.push({
  slug: '435-non-overlapping-intervals',
  gen: (r) => ({ iv: genIntervals(r, 7) }),
  oracle: ({ iv }: { iv: [number, number][] }): State[] => {
    const out: State[] = [];
    let order: [number, number][] = iv.map((p) => [p[0], p[1]]);
    const kept: [number, number][] = [];
    let current: [number, number] | null = null;
    let lastEnd: number | null = null, removed = 0;
    const snap = () => out.push({ order: order.map((p) => `${p[0]},${p[1]}`), current: current ? `${current[0]},${current[1]}` : null, lastEnd, removed, kept: kept.map((p) => `${p[0]},${p[1]}`) });
    snap();
    order = [...order].sort((a, b) => a[1] - b[1]); // stable: ties keep the input order
    snap();
    for (const p of order) {
      current = p;
      snap(); // Examine
      if (lastEnd === null || p[0] >= lastEnd) { kept.push(p); lastEnd = p[1]; } else removed++;
      snap();
    }
    current = null;
    snap();
    return out;
  },
  project: (s) => ({
    order: (s.aux?.[0]?.items ?? []).map((t) => ivText(t) as string),
    current: ivText(s.vars.current), lastEnd: numOrNull(s.vars.lastEnd), removed: numVar(s, 'removed'),
    kept: (ivScene(s)?.result ?? []).map((b) => `${b.start},${b.end}`),
  }),
  notes: 'bar colours and the sweep marker caption not compared; equal end times keep input order (stable sort)',
});

/* ---- 56 merge intervals */
cases.push({
  slug: '56-merge-intervals',
  gen: (r) => ({ iv: genIntervals(r, 7) }),
  oracle: ({ iv }: { iv: [number, number][] }): State[] => {
    const out: State[] = [];
    let order: [number, number][] = iv.map((p) => [p[0], p[1]]);
    const res: [number, number][] = [];
    let cur: [number, number] | null = null, next: [number, number] | null = null;
    let answer: string | null = null;
    const f = (p: [number, number] | null) => (p ? `${p[0]},${p[1]}` : null);
    const snap = () => out.push({ order: order.map((p) => `${p[0]},${p[1]}`), current: f(cur), next: f(next), merged: res.length, list: res.map((p) => `${p[0]},${p[1]}`), answer });
    snap();
    order = [...order].sort((a, b) => a[0] - b[0] || a[1] - b[1]); // design choice: equal starts are ordered by end (any tie order is valid for the Java comparator)
    snap();
    cur = [order[0][0], order[0][1]];
    res.push(cur);
    snap();
    for (let k = 1; k < order.length; k++) {
      next = order[k];
      snap(); // Compare
      if (next[0] <= cur[1]) { cur[1] = Math.max(cur[1], next[1]); } else { cur = [next[0], next[1]]; res.push(cur); }
      snap();
    }
    cur = null; next = null;
    answer = res.map((p) => `[${p[0]},${p[1]}]`).join(' ');
    snap();
    return out;
  },
  project: (s) => ({
    order: (s.aux?.[0]?.items ?? []).map((t) => ivText(t) as string),
    current: ivText(s.vars.current), next: ivText(s.vars.next), merged: numVar(s, 'merged'),
    list: (ivScene(s)?.result ?? []).map((b) => `${b.start},${b.end}`),
    answer: shown(s, 'answer') === null ? null : String(shown(s, 'answer')).replace(/,\s+/g, ','),
  }),
  notes: 'bar colours and the sweep marker caption not compared; DESIGN CHOICE: the animation orders equal start times by end (the Java comparator a[0]-b[0] leaves ties open), the oracle follows that tie rule',
});

/* ---- 57 insert interval */
cases.push({
  slug: '57-insert-interval',
  gen: (r) => {
    const iv: [number, number][] = [];
    let pos = rint(r, 0, 3);
    for (let k = rint(r, 0, 6); k > 0; k--) { const s = pos + rint(r, 0, 2); const e = s + rint(r, 0, 3); iv.push([s, e]); pos = e + 1; }
    const a = rint(r, 0, pos + 1);
    return { iv, add: [a, a + rint(r, 0, 5)] as [number, number] };
  },
  oracle: ({ iv, add }: { iv: [number, number][]; add: [number, number] }): State[] => {
    const n = iv.length;
    const out: State[] = [];
    const res: [number, number][] = [];
    const nw: [number, number] = [add[0], add[1]];
    let i = 0;
    let answer: string | null = null;
    const snap = () => out.push({ i, nw: `${nw[0]},${nw[1]}`, size: res.length, list: res.map((p) => `${p[0]},${p[1]}`), answer });
    snap();
    while (i < n && iv[i][1] < nw[0]) { res.push(iv[i]); snap(); i++; }
    while (i < n && iv[i][0] <= nw[1]) { nw[0] = Math.min(nw[0], iv[i][0]); nw[1] = Math.max(nw[1], iv[i][1]); snap(); i++; }
    res.push([nw[0], nw[1]]);
    snap();
    while (i < n) { res.push(iv[i]); snap(); i++; }
    answer = res.map((p) => `[${p[0]},${p[1]}]`).join(' ');
    snap();
    return out;
  },
  project: (s) => ({
    i: numVar(s, 'i'), nw: ivText(s.vars.new) as string, size: numVar(s, 'result size'),
    list: (ivScene(s)?.result ?? []).map((b) => `${b.start},${b.end}`),
    answer: shown(s, 'answer') === null ? null : String(shown(s, 'answer')).replace(/,\s+/g, ','),
  }),
  notes: 'bar colours and the new.end marker not compared; i is the index of the interval just handled (it advances after the step)',
});

/* ---- 253 meeting rooms II */
cases.push({
  slug: '253-meeting-rooms-ii',
  gen: (r) => ({ iv: genIntervals(r, 8) }),
  oracle: ({ iv }: { iv: [number, number][] }): State[] => {
    const out: State[] = [];
    const order = iv.map((p, i) => ({ p, i })).sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1] || a.i - b.i); // tie rule: start, then end, then input order
    const ends: number[] = []; // multiset of room end times
    let meeting: string | null = null, answer: string | null = null;
    const sorted = () => [...ends].sort((a, b) => a - b);
    const snap = (sortedShown: boolean) => out.push({
      meeting, earliest: ends.length ? Math.min(...ends) : null, rooms: ends.length, ends: sorted(), answer,
      order: (sortedShown ? order.map((o) => o.p) : iv).map((p) => `${p[0]},${p[1]}`),
    });
    snap(true); // the aux panel already lists the sorted order at Start
    snap(true);
    for (const o of order) {
      const [s, e] = o.p;
      meeting = `${s},${e}`;
      snap(true); // arrives
      if (ends.length && Math.min(...ends) <= s) ends.splice(ends.indexOf(Math.min(...ends)), 1);
      ends.push(e);
      snap(true);
    }
    meeting = null;
    answer = String(ends.length);
    snap(true);
    return out;
  },
  project: (s) => ({
    meeting: ivText(s.vars.meeting), earliest: numOrNull(s.vars['earliest end']), rooms: numVar(s, 'rooms used'),
    ends: (auxOf(s, 'min-heap')?.items ?? []).map((t) => Number(/^(\d+)/.exec(t)?.[1])),
    answer: shown(s, 'answer') === null ? null : String(shown(s, 'answer')),
    order: (auxOf(s, 'sorted by start')?.items ?? []).map((t) => ivText(t) as string),
  }),
  notes: 'the heap is drawn as a sorted queue (not the heap array) so only the multiset of end times is compared; "room k" labels and bar rows/colours are not compared; meetings with equal start are ordered by end then input index',
});

/* ---- 1094 car pooling */
cases.push({
  slug: '1094-car-pooling',
  gen: (r) => ({
    trips: Array.from({ length: rint(r, 1, 5) }, () => { const f = rint(r, 0, 8); return [rint(r, 1, 4), f, f + rint(r, 1, 5)] as [number, number, number]; }),
    capacity: rint(r, 1, 9),
  }),
  oracle: ({ trips, capacity }: { trips: [number, number, number][]; capacity: number }): State[] => {
    const out: State[] = [];
    const ev: [number, number][] = [];
    for (const [k, f, t] of trips) { ev.push([f, k]); ev.push([t, -k]); }
    let load = 0, position: number | null = null, answer: string | null = null;
    const label = (e: [number, number]) => `${e[0]}:${e[1] > 0 ? '+' : '-'}${Math.abs(e[1])}`;
    const snap = (events: [number, number][]) => out.push({ position, load, answer, events: events.map(label) });
    snap(ev);
    snap(ev);
    const sorted = [...ev].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    snap(sorted);
    let ok = true;
    for (const [pos, d] of sorted) {
      position = pos; load += d;
      if (load > capacity) { ok = false; answer = 'false'; snap(sorted); break; }
      snap(sorted);
    }
    position = null;
    if (ok) answer = 'true';
    snap(sorted);
    return out;
  },
  project: (s) => ({
    position: numVar(s, 'position'), load: numVar(s, 'load'), answer: shown(s, 'answer') === null ? null : String(shown(s, 'answer')),
    events: (s.aux?.find((a) => a.title.startsWith('events'))?.items ?? []).map((t) => t.replace(/[−–]/g, '-').replace(/\s+/g, '')),
  }),
  notes: 'bar colours / sweep marker not compared; events with the same position are ordered by signed delta (drop-offs first)',
});

/* ---- 218 the skyline problem */
cases.push({
  slug: '218-the-skyline-problem',
  gen: (r) => ({ b: Array.from({ length: rint(r, 1, 6) }, () => { const l = rint(r, 0, 12); return [l, l + rint(r, 1, 8), rint(r, 1, 9)] as [number, number, number]; }) }),
  oracle: ({ b }: { b: [number, number, number][] }): State[] => {
    const out: State[] = [];
    const events: { x: number; s: number; id: number }[] = [];
    b.forEach(([l, rr, h], id) => { events.push({ x: l, s: -h, id }); events.push({ x: rr, s: h, id }); });
    const sorted = [...events].sort((p, q) => p.x - q.x || p.s - q.s || p.id - q.id);
    const text = (e: { x: number; s: number }) => `x=${e.x} ${e.s < 0 ? 'start' : 'end'} ${Math.abs(e.s)}`;
    const active: number[] = [0];
    const keys: [number, number][] = [];
    let prev = 0;
    let x: number | null = null;
    const snap = (shownEvents: typeof events) => out.push({
      x, tall: Math.max(...active), prev, keys: keys.length, keyList: keys.map((k) => `${k[0]},${k[1]}`),
      active: [...active].sort((p, q) => q - p), events: shownEvents.map(text),
    });
    snap(events);
    snap(sorted);
    for (const e of sorted) {
      x = e.x;
      if (e.s < 0) active.push(-e.s); else active.splice(active.indexOf(e.s), 1);
      const top = Math.max(...active);
      if (top !== prev) { keys.push([e.x, top]); prev = top; }
      snap(sorted);
    }
    x = null;
    snap(sorted);
    return out;
  },
  project: (s) => ({
    x: numVar(s, 'x'), tall: numVar(s, 'tallest now'), prev: numVar(s, 'previous height'), keys: numVar(s, 'key points'),
    keyList: (auxOf(s, 'key points')?.items ?? []).map((t) => nums(t).join(',')),
    active: (auxOf(s, 'active heights')?.items ?? []).map(Number),
    events: (s.aux?.[0]?.items ?? []).map((t) => t.trim()),
  }),
  notes: 'result bars / sweep marker not compared; events with the same x and the same signed height are interchangeable',
});

/* ============================================================ heaps */
/** Textbook binary heap (array form, Java PriorityQueue sift rules). `snap` is called at every point where the array visibly changes. */
class H<T> {
  a: T[] = [];
  before: (x: T, y: T) => boolean;
  snap: () => void;
  constructor(before: (x: T, y: T) => boolean, snap: () => void = () => {}) { this.before = before; this.snap = snap; }
  private swap(i: number, j: number) { const t = this.a[i]; this.a[i] = this.a[j]; this.a[j] = t; }
  push(x: T, quiet = false): void {
    this.a.push(x);
    if (!quiet) this.snap();
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.before(this.a[i], this.a[p])) break;
      this.swap(i, p);
      i = p;
      if (!quiet) this.snap();
    }
  }
  pop(quiet = false): T {
    const top = this.a[0];
    const last = this.a.pop() as T;
    if (this.a.length === 0) return top; // the empty hole is never drawn: the next push draws the heap again
    this.a[0] = last;
    if (!quiet) this.snap();
    let i = 0;
    for (;;) {
      const n = this.a.length, l = 2 * i + 1, r = l + 1;
      let c = i;
      if (l < n && this.before(this.a[l], this.a[c])) c = l;
      if (r < n && this.before(this.a[r], this.a[c])) c = r;
      if (c === i) return top;
      this.swap(i, c);
      i = c;
      if (!quiet) this.snap();
    }
  }
}
const sizeOf = (v: unknown): number | null => { const m = /^(\d+)/.exec(String(v ?? '')); return m ? Number(m[1]) : null; };

/* ---- 215 kth largest element */
cases.push({
  slug: '215-kth-largest-element-in-an-array',
  gen: (r) => { const n = rint(r, 1, 9); return { nums: rarr(r, n, -5, 9), k: rint(r, 1, n) }; },
  oracle: ({ nums: a, k }: { nums: number[]; k: number }): State[] => {
    const out: State[] = [];
    let x: number | null = null, answer: number | null = null;
    const h = new H<number>((p, q) => p < q, () => snap());
    const snap = () => out.push({ x, size: h.a.length, root: h.a.length ? h.a[0] : null, heap: [...h.a], answer });
    snap();
    for (const v of a) {
      x = v;
      snap(); // Read
      if (h.a.length < k) h.push(v);
      else if (v > h.a[0]) { h.pop(); h.push(v); }
    }
    x = null; answer = h.a[0];
    snap();
    return out;
  },
  project: (s) => ({
    x: numVar(s, 'x'), size: sizeOf(s.vars['heap size']), root: numOrNull(shown(s, 'cut-off (root)')),
    heap: (auxOf(s, 'min-heap')?.items ?? []).map(Number), answer: numOrNull(shown(s, 'answer')),
  }),
  notes: 'tree scene / cell colours not compared; every sift swap is compared (heap array after each push, fill and swap)',
});

/* ---- 973 k closest points */
cases.push({
  slug: '973-k-closest-points-to-origin',
  gen: (r) => { const n = rint(r, 1, 8); return { points: Array.from({ length: n }, () => [rint(r, -4, 4), rint(r, -4, 4)] as [number, number]), k: rint(r, 1, n) }; },
  oracle: ({ points, k }: { points: [number, number][]; k: number }): State[] => {
    type P = { x: number; y: number; d: number };
    const out: State[] = [];
    let cur: P | null = null;
    const h = new H<P>((p, q) => p.d > q.d, () => snap());
    const snap = () => out.push({ point: cur ? `${cur.x},${cur.y}` : null, dist: cur ? cur.d : null, size: h.a.length, far: h.a.length ? h.a[0].d : null, heap: h.a.map((p) => `${p.d},${p.x},${p.y}`) });
    snap();
    for (const [px, py] of points) {
      cur = { x: px, y: py, d: px * px + py * py };
      snap(); // Read
      h.push(cur);
      if (h.a.length > k) h.pop();
    }
    cur = null;
    snap();
    return out;
  },
  project: (s) => ({
    point: ivText(s.vars.point), dist: numOrNull(shown(s, 'dist²')), size: sizeOf(s.vars['heap size']), far: numOrNull(shown(s, 'farthest kept')),
    heap: (auxOf(s, 'max-heap')?.items ?? []).map((t) => nums(t).join(',')),
  }),
  notes: 'tree scene / cell colours not compared; every sift swap is compared; strict comparator on dist² (ties keep the sift rules of a Java PriorityQueue)',
});

/* ---- 347 top k frequent elements */
cases.push({
  slug: '347-top-k-frequent-elements',
  gen: (r) => { const nums2 = rarr(r, rint(r, 1, 9), 1, 5); return { nums: nums2, k: rint(r, 1, new Set(nums2).size) }; },
  oracle: ({ nums: a, k }: { nums: number[]; k: number }): State[] => {
    const out: State[] = [];
    type E = { n: number; f: number };
    const map: E[] = [];
    let num: number | null = null, freq: number | null = null;
    let phaseHeap = false;
    const h = new H<E>((p, q) => p.f < q.f, () => snap());
    const snap = () => out.push({
      num, freq, size: h.a.length, root: h.a.length ? h.a[0].f : null, heap: phaseHeap ? h.a.map((e) => e.n) : [],
      map: map.map((e) => `${e.n}>${e.f}`),
    });
    snap();
    for (const v of a) {
      let e = map.find((q) => q.n === v);
      if (!e) { e = { n: v, f: 0 }; map.push(e); }
      e.f++;
      num = v; freq = e.f;
      snap();
    }
    num = null; freq = null; phaseHeap = true;
    snap();
    for (const e of map) {
      num = e.n; freq = e.f;
      h.push(e);
      if (h.a.length > k) h.pop();
    }
    num = null; freq = null;
    snap();
    return out;
  },
  project: (s) => ({
    num: numVar(s, 'num'), freq: numVar(s, 'freq'), size: sizeOf(s.vars['heap size']), root: numOrNull(shown(s, 'root freq')),
    heap: (auxOf(s, 'min-heap')?.items ?? []).map(Number),
    map: (auxOf(s, 'frequency map')?.items ?? []).map((t) => t.replace(/\s*→\s*/, '>')),
  }),
  notes: 'tree scene not compared; the heap holds numbers keyed by frequency with a strict < comparator (frequency ties follow the Java PriorityQueue sift rules)',
});

/* ---- 378 kth smallest in a sorted matrix */
cases.push({
  slug: '378-kth-smallest-element-in-a-sorted-matrix',
  gen: (r) => {
    const R = rint(r, 1, 4), C = rint(r, 1, 4);
    const m: number[][] = [];
    for (let i = 0; i < R; i++) { m.push([]); for (let j = 0; j < C; j++) m[i].push(Math.max(i ? m[i - 1][j] : -5, j ? m[i][j - 1] : -5) + rint(r, 0, 3)); }
    return { m, k: rint(r, 1, R * C) };
  },
  oracle: ({ m, k }: { m: number[][]; k: number }): State[] => {
    type It = { v: number; r: number; c: number };
    const R = m.length, C = m[0].length;
    const out: State[] = [];
    const popped: number[] = [];
    let cur: number | null = null;
    // tie rule of the animation (matches the displayed Python tuples): value, then row, then column
    const h = new H<It>((x, y) => x.v < y.v || (x.v === y.v && (x.r < y.r || (x.r === y.r && x.c < y.c))));
    const snap = () => out.push({ popped: popped.length, size: h.a.length, current: cur, heap: h.a.map((e) => e.v), out: [...popped] });
    snap();
    for (let r = 0; r < Math.min(R, k); r++) h.push({ v: m[r][0], r, c: 0 }, true);
    snap();
    for (let i = 1; i <= k; i++) {
      const top = h.pop(true);
      cur = top.v; popped.push(top.v);
      if (i === k) break;
      if (top.c + 1 < C) h.push({ v: m[top.r][top.c + 1], r: top.r, c: top.c + 1 }, true);
      snap();
    }
    snap();
    return out;
  },
  project: (s) => ({
    popped: numVar(s, 'popped'), size: numVar(s, 'heap size'), current: numVar(s, 'current'),
    heap: (auxOf(s, 'min-heap')?.items ?? []).map(Number), out: (auxOf(s, 'popped in order')?.items ?? []).map(Number),
  }),
  notes: 'the poll + offer of one "Advance" is one step (its sift swaps are not narrated), so only the heap after the pair is compared; ties between equal values are broken by (row, column) like the displayed Python tuples; matrix rows are sorted (columns too), rectangular shapes included',
});

/* ---- 23 merge k sorted lists */
cases.push({
  slug: '23-merge-k-sorted-lists',
  gen: (r) => {
    const lists = Array.from({ length: rint(r, 2, 4) }, () => rarr(r, rint(r, r() < 0.2 ? 0 : 1, 4), 0, 9).sort((a, b) => a - b));
    if (!lists.some((l) => l.length)) lists[0] = [rint(r, 0, 9)];
    return { lists };
  },
  oracle: ({ lists }: { lists: number[][] }): State[] => {
    type It = { v: number; l: number };
    const rest = lists.map((l) => [...l]);
    const pos = lists.map(() => 0);
    const out: State[] = [];
    const outList: number[] = [];
    let last: number | null = null;
    // tie rule of the animation = the displayed Python tuples (value, list index); the Java comparator leaves ties open
    const h = new H<It>((x, y) => x.v < y.v || (x.v === y.v && x.l < y.l));
    const lt = () => rest.map((l, i) => `L${i}:${l.length ? l.join('→') : '(empty)'}`);
    const snap = () => out.push({ size: h.a.length, last, output: outList.length, heap: h.a.map((e) => `${e.v}(L${e.l})`), lists: lt() });
    snap();
    lists.forEach((l, i) => { if (l.length) { h.push({ v: l[0], l: i }, true); pos[i] = 0; } });
    snap();
    while (h.a.length) {
      const top = h.pop(true);
      outList.push(top.v); last = top.v;
      rest[top.l].shift(); pos[top.l]++;
      if (pos[top.l] < lists[top.l].length) h.push({ v: lists[top.l][pos[top.l]], l: top.l }, true);
      snap();
    }
    snap();
    return out;
  },
  project: (s) => ({
    size: sizeOf(s.vars['heap size']), last: numOrNull(shown(s, 'last out')), output: numVar(s, 'output'),
    heap: (auxOf(s, 'min-heap')?.items ?? []).map((t) => t.replace(/\s+/g, '')),
    lists: (auxOf(s, 'input lists')?.items ?? []).map((t) => t.replace(/\s+/g, '').replace(/->/g, '→')),
  }),
  notes: 'the pop + push of one step is shown as one step (sift swaps inside it are not narrated); list node / tree scenes not compared; value ties are resolved by heap position only (strict comparator)',
});

/* ---- 632 smallest range covering elements from k lists */
cases.push({
  slug: '632-smallest-range-covering-elements-from-k-lists',
  gen: (r) => ({ lists: Array.from({ length: rint(r, 2, 4) }, () => rarr(r, rint(r, 1, 4), 0, 20).sort((a, b) => a - b)) }),
  oracle: ({ lists }: { lists: number[][] }): State[] => {
    type It = { v: number; l: number; j: number };
    const out: State[] = [];
    // tie rule of the animation = the displayed Python tuples (value, list index); the Java comparator leaves ties open
    const h = new H<It>((x, y) => x.v < y.v || (x.v === y.v && x.l < y.l));
    let curMax: number | null = null;
    let best: [number, number] | null = null;
    const snap = () => out.push({ min: h.a.length ? h.a[0].v : null, max: curMax, best: best ? `${best[0]},${best[1]}` : null, heap: h.a.map((e) => e.v) });
    snap();
    lists.forEach((l, i) => h.push({ v: l[0], l: i, j: 0 }, true));
    curMax = Math.max(...lists.map((l) => l[0]));
    best = [h.a[0].v, curMax];
    snap(); // seed
    snap(); // Window
    for (;;) {
      const top = h.pop(true);
      if (top.j + 1 >= lists[top.l].length) { snap(); break; } // list exhausted
      const nx = lists[top.l][top.j + 1];
      h.push({ v: nx, l: top.l, j: top.j + 1 }, true);
      curMax = Math.max(curMax as number, nx);
      snap(); // Advance
      if ((curMax as number) - h.a[0].v < best[1] - best[0]) best = [h.a[0].v, curMax as number];
      snap(); // Window
    }
    snap();
    return out;
  },
  project: (s) => ({
    min: numOrNull(shown(s, 'heap min')), max: numOrNull(shown(s, 'current max')), best: ivText(shown(s, 'best')),
    heap: (auxOf(s, 'min-heap')?.items ?? []).map(Number),
  }),
  notes: 'tree / grid scenes not compared; the pop + push of one "Advance" step is compared as one step; best is replaced only when the window is strictly narrower',
});

/* ---- 502 IPO */
cases.push({
  slug: '502-ipo',
  gen: (r) => {
    const n = rint(r, 1, 6);
    const pool = Array.from({ length: 30 }, (_, i) => i + 1);
    const profits = Array.from({ length: n }, () => pool.splice(rint(r, 0, pool.length - 1), 1)[0]); // distinct profits: heap array order does not depend on a tie rule
    return { k: rint(r, 1, 6), w: rint(r, 0, 6), profits, capital: rarr(r, n, 0, 12) };
  },
  oracle: ({ k, w: w0, profits, capital }: { k: number; w: number; profits: number[]; capital: number[] }): State[] => {
    const n = profits.length;
    const order = profits.map((_, i) => i).sort((a, b) => capital[a] - capital[b] || a - b);
    const out: State[] = [];
    const h = new H<number>((x, y) => x > y);
    let w = w0, ptr = 0, round = 0;
    const snap = () => out.push({ round: Math.min(round, k), capital: w, size: h.a.length, heap: [...h.a], next: ptr < n ? `c${capital[order[ptr]]}` : null });
    snap();
    for (round = 1; round <= k; round++) {
      while (ptr < n && capital[order[ptr]] <= w) { h.push(profits[order[ptr]], true); ptr++; }
      snap();
      if (h.a.length === 0) break;
      const best = h.pop(true);
      w += best;
      snap();
    }
    snap();
    return out;
  },
  project: (s) => ({
    round: numVar(s, 'round'), capital: numVar(s, 'capital'), size: numVar(s, 'in heap'), heap: (auxOf(s, 'affordable')?.items ?? []).map(Number),
    next: shown(s, 'next locked') === null ? null : String(shown(s, 'next locked')),
  }),
  notes: 'sorted project cells and tree scene not compared; profits are generated distinct (with equal profits the animation breaks ties by project index, the textbook heap does not); pushes / pops inside one step are compared as one step',
});

/* ---- 295 find median from data stream */
cases.push({
  slug: '295-find-median-from-data-stream',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 7), -5, 9) }),
  oracle: ({ nums: a }: { nums: number[] }): State[] => {
    const out: State[] = [];
    let adding: number | null = null, median: number | null = null;
    const medians: number[] = [];
    const low: H<number> = new H<number>((x, y) => x > y, () => snap());
    const high: H<number> = new H<number>((x, y) => x < y, () => snap());
    const snap = () => out.push({ adding, lowSize: low.a.length, highSize: high.a.length, median, low: [...low.a], high: [...high.a], medians: [...medians] });
    snap();
    for (const x of a) {
      adding = x;
      snap(); // addNum
      low.push(x);
      const moved = low.pop();
      high.push(moved);
      if (high.a.length > low.a.length) { const back = high.pop(); low.push(back); }
      const m = low.a.length > high.a.length ? low.a[0] : (low.a[0] + high.a[0]) / 2;
      medians.push(m); median = m;
      snap(); // findMedian
    }
    snap();
    return out;
  },
  project: (s) => ({
    adding: numVar(s, 'adding'), lowSize: numVar(s, 'low size'), highSize: numVar(s, 'high size'), median: numOrNull(shown(s, 'median')),
    low: (auxOf(s, 'lower half')?.items ?? []).map(Number), high: (auxOf(s, 'upper half')?.items ?? []).map(Number),
    medians: (auxOf(s, 'medians so far')?.items ?? []).map(Number),
  }),
  notes: 'tree scenes and the balance-rule panel not compared; both heap arrays are compared after every add / sift swap / pop / fill; the rebalance and balance narration steps carry no state change',
});

/* ---- 480 sliding window median */
cases.push({
  slug: '480-sliding-window-median',
  gen: (r) => { const n = rint(r, 1, 10); return { nums: rarr(r, n, -6, 9), k: rint(r, 1, Math.min(n, 6)) }; },
  oracle: ({ nums: a, k }: { nums: number[]; k: number }): State[] => {
    type It = { v: number; i: number };
    const n = a.length;
    const out: State[] = [];
    const gone = new Set<number>();
    const inLow = new Set<number>();
    // tie rule of the animation: equal values are ordered by index (the Java comparator is value-only and leaves ties open)
    const low = new H<It>((x, y) => x.v > y.v || (x.v === y.v && x.i < y.i));
    const high = new H<It>((x, y) => x.v < y.v || (x.v === y.v && x.i < y.i));
    let lowN = 0, highN = 0, r = -1;
    const medians: number[] = [];
    const prune = (h: H<It>) => { while (h.a.length && gone.has(h.a[0].i)) h.pop(true); };
    const label = (e: It) => `${e.v}${gone.has(e.i) ? '✗' : ''}`;
    const snap = () => out.push({
      lowN, highN, stale: [...low.a, ...high.a].filter((e) => gone.has(e.i)).length,
      low: low.a.map(label), high: high.a.map(label), medians: [...medians],
      win: a.map((v, i) => (i <= r && i >= r - k + 1 ? `[${v}]` : String(v))).join('|'),
    });
    snap();
    for (let i = 0; i < n; i++) {
      r = i;
      if (i >= k) { const j = i - k; gone.add(j); if (inLow.has(j)) lowN--; else highN--; snap(); }
      prune(low); // design choice: pruned before the insert decision even when lowSize == 0 (the Java short-circuits)
      const x = a[i];
      if (lowN === 0 || x <= low.a[0].v) { low.push({ v: x, i }, true); inLow.add(i); lowN++; snap(); }
      else { high.push({ v: x, i }, true); highN++; snap(); }
      if (lowN > highN + 1) { prune(low); const t = low.pop(true); inLow.delete(t.i); high.push(t, true); lowN--; highN++; snap(); }
      else if (lowN < highN) { prune(high); const t = high.pop(true); inLow.add(t.i); low.push(t, true); lowN++; highN--; snap(); }
      if (i >= k - 1) {
        prune(low); if (k % 2 === 0) prune(high);
        medians.push(k % 2 === 1 ? low.a[0].v : (low.a[0].v + high.a[0].v) / 2);
        snap();
      }
    }
    snap();
    return out;
  },
  project: (s) => ({
    lowN: numVar(s, 'low size'), highN: numVar(s, 'high size'), stale: numVar(s, 'stale entries'),
    low: (auxOf(s, 'lower half')?.items ?? []), high: (auxOf(s, 'upper half')?.items ?? []),
    medians: (auxOf(s, 'medians so far')?.items ?? []).map(Number),
    win: (auxOf(s, 'numbers')?.items ?? []).join('|'),
  }),
  notes: 'tree scenes not compared; DESIGN CHOICES: equal values are ordered by index in both heaps, and stale roots of the lower heap are discarded before the insert decision even when the lower half is empty (Java short-circuits); heap pushes / pops inside one step are compared as one step',
});

/* ============================================================ divide and conquer */
const arrayVals = (s: Step): number[] => { const a = scenesOf(s).find((x) => x.kind === 'array') as { cells: { value: string | number }[] } | undefined; return (a?.cells ?? s.cells ?? []).map((c) => Number(c.value)); };

/* ---- 912 merge sort */
cases.push({
  slug: '912-merge-sort',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 10), -9, 9) }),
  oracle: ({ nums }: { nums: number[] }): State[] => {
    const a = [...nums];
    const n = a.length;
    const out: State[] = [];
    const stack: string[] = [];
    let buffer: number[] = [];
    let compares = 0;
    const snap = (lo: number | null, mid: number | null, hi: number | null, p: number | null, q: number | null) =>
      out.push({ lo, mid, hi, p, q, compares, arr: [...a], stack: [...stack], buffer: [...buffer] });
    snap(0, null, n - 1, null, null);
    const sort = (lo: number, hi: number) => {
      if (lo >= hi) return;
      stack.push(`${lo}..${hi}`);
      const mid = lo + Math.floor((hi - lo) / 2);
      snap(lo, mid, hi, null, null); // Split
      sort(lo, mid);
      sort(mid + 1, hi);
      buffer = [];
      let p = lo, q = mid + 1;
      snap(lo, mid, hi, p, q); // Merge
      while (p <= mid && q <= hi) {
        compares++;
        if (a[p] <= a[q]) { buffer.push(a[p]); snap(lo, mid, hi, p, q); p++; } else { buffer.push(a[q]); snap(lo, mid, hi, p, q); q++; }
      }
      if (p <= mid || q <= hi) {
        // the copy-the-rest step shows p / q where the leftover run STARTS (display choice: the pointers are not advanced through the copied tail)
        const shownP = Math.min(p, mid + 1), shownQ = Math.min(q, hi + 1);
        while (p <= mid) buffer.push(a[p++]);
        while (q <= hi) buffer.push(a[q++]);
        snap(lo, mid, hi, shownP, shownQ);
      }
      for (let k = 0; k < buffer.length; k++) a[lo + k] = buffer[k];
      snap(lo, mid, hi, null, null); // write back
      buffer = [];
      stack.pop();
    };
    sort(0, n - 1);
    snap(null, null, null, null, null);
    return out;
  },
  project: (s) => ({
    lo: numVar(s, 'lo'), mid: numVar(s, 'mid'), hi: numVar(s, 'hi'), p: numVar(s, 'p'), q: numVar(s, 'q'), compares: numVar(s, 'compares'),
    arr: arrayVals(s), stack: auxOf(s, 'Active ranges')?.items ?? [], buffer: (auxOf(s, 'Merge buffer')?.items ?? []).map(Number),
  }),
  notes: 'recursion-tree scene, cell colours and pointer chips not compared; ties take the left element (stable)',
});

/* ---- 912 quick sort */
cases.push({
  slug: '912-quick-sort',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 10), -9, r() < 0.4 ? 3 : 9) }),
  oracle: ({ nums }: { nums: number[] }): State[] => {
    const a = [...nums];
    const n = a.length;
    const out: State[] = [];
    const stack: string[] = [];
    let compares = 0, swaps = 0;
    const snap = (lo: number, hi: number, i: number | null, j: number | null, pivot: number | null) =>
      out.push({ lo, hi, i, j, pivot, compares, swaps, arr: [...a], stack: [...stack] });
    out.push({ lo: 0, hi: n - 1, i: null, j: null, pivot: null, compares: 0, swaps: 0, arr: [...a], stack: [] });
    const sort = (lo: number, hi: number) => {
      if (lo > hi) return;
      stack.push(`sort(${lo}..${hi})`);
      if (lo === hi) { snap(lo, hi, null, null, null); stack.pop(); return; }
      const pivot = a[hi];
      let i = lo;
      snap(lo, hi, i, null, pivot);
      for (let j = lo; j < hi; j++) {
        compares++;
        snap(lo, hi, i, j, pivot);
        if (a[j] < pivot) {
          if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; swaps++; }
          i++;
          snap(lo, hi, i, j, pivot);
        }
      }
      [a[i], a[hi]] = [a[hi], a[i]];
      if (i !== hi) swaps++;
      snap(lo, hi, i, null, pivot); // place the pivot
      sort(lo, i - 1);
      sort(i + 1, hi);
      stack.pop();
    };
    sort(0, n - 1);
    out.push({ lo: null, hi: null, i: null, j: null, pivot: null, compares, swaps, arr: [...a], stack: [] });
    return out;
  },
  project: (s) => ({
    lo: numVar(s, 'lo'), hi: numVar(s, 'hi'), i: numVar(s, 'i'), j: numVar(s, 'j'), pivot: numVar(s, 'pivot'),
    compares: numVar(s, 'compares'), swaps: numVar(s, 'swaps'), arr: arrayVals(s), stack: auxOf(s, 'Ranges being sorted')?.items ?? [],
  }),
  notes: 'recursion-tree scene, cell colours and pointer chips not compared; Lomuto partition with the last element as pivot and a strict < test',
});

/* ---- 493 reverse pairs */
cases.push({
  slug: '493-reverse-pairs',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 8), -5, 9) }),
  oracle: ({ nums }: { nums: number[] }): State[] => {
    const a = [...nums];
    const n = a.length;
    const out: State[] = [];
    const stack: string[] = [];
    const pairs: string[] = [];
    let total = 0;
    let lo: number | null = 0, mid: number | null = null, hi: number | null = n - 1;
    const snap = (i: number | null, j: number | null) => out.push({ lo, mid, hi, i, j, total, arr: [...a], stack: [...stack], pairs: [...pairs] });
    snap(null, null);
    const sort = (l: number, h: number) => {
      if (l >= h) return;
      stack.push(`${l},${h}`);
      const m = l + Math.floor((h - l) / 2);
      lo = l; mid = m; hi = h;
      snap(null, null); // Split
      sort(l, m);
      sort(m + 1, h);
      lo = l; mid = m; hi = h;
      let j = m + 1, cnt = 0;
      for (let i = l; i <= m; i++) {
        while (j <= h && a[i] > 2 * a[j]) j++;
        cnt += j - (m + 1);
        snap(i, j);
      }
      const merged: number[] = [];
      let x = l, y = m + 1;
      while (x <= m && y <= h) merged.push(a[x] <= a[y] ? a[x++] : a[y++]);
      while (x <= m) merged.push(a[x++]);
      while (y <= h) merged.push(a[y++]);
      merged.forEach((v, k) => { a[l + k] = v; });
      total += cnt;
      pairs.push(`${l}..${h}:+${cnt}`);
      snap(null, null); // Merge (the frame is still drawn on the stack for this step)
      stack.pop();
    };
    sort(0, n - 1);
    stack.length = 0;
    snap(null, null);
    return out;
  },
  project: (s) => ({
    lo: numVar(s, 'lo'), mid: numVar(s, 'mid'), hi: numVar(s, 'hi'), i: numVar(s, 'i'), j: numVar(s, 'j'), total: numVar(s, 'total'),
    arr: arrayVals(s), stack: (auxOf(s, 'recursion stack')?.items ?? []).map((t) => nums(t).join(',')),
    pairs: (auxOf(s, 'pairs counted')?.items ?? []).map((t) => t.replace(/\[|\]/g, '').replace(/\s+/g, '')),
  }),
  notes: 'recursion-tree scene and cell colours not compared; the counting pass of each merge is compared pointer by pointer (i, j), the merged array only at the merge step',
});

/* ---- alg: maximum subarray (divide and conquer) */
cases.push({
  slug: 'alg-maximum-subarray-divide-and-conquer',
  gen: (r) => ({ nums: rarr(r, rint(r, 1, 9), -6, 9) }),
  oracle: ({ nums: a }: { nums: number[] }): State[] => {
    const n = a.length;
    const out: State[] = [];
    const stack: string[] = [];
    let answers: string[] = [];
    let lo = 0, hi = n - 1;
    let mid: number | null = null, left: number | null = null, right: number | null = null;
    let cross: string | number | null = null;
    const snap = () => out.push({ lo, hi, mid, left, right, cross, stack: [...stack], answers: [...answers] });
    snap();
    const solve = (l: number, h: number): number => {
      stack.push(`${l},${h}`);
      lo = l; hi = h;
      if (l === h) {
        mid = null; left = null; right = null; cross = null;
        answers.push(`${l}..${h}:${a[l]}`);
        snap(); // Base case
        stack.pop();
        return a[l];
      }
      const m = l + Math.floor((h - l) / 2);
      mid = m; left = null; right = null; cross = null;
      snap(); // Split
      const L = solve(l, m);
      const R = solve(m + 1, h);
      lo = l; hi = h; mid = m; left = L; right = R; cross = null;
      snap(); // Halves solved
      let sum = 0, bestL = -Infinity, bestR = -Infinity;
      for (let i = m; i >= l; i--) { sum += a[i]; bestL = Math.max(bestL, sum); cross = `L ${bestL}`; snap(); }
      sum = 0;
      for (let j = m + 1; j <= h; j++) { sum += a[j]; bestR = Math.max(bestR, sum); cross = `L ${bestL} + R ${bestR}`; snap(); }
      cross = bestL + bestR;
      const best = Math.max(L, R, cross);
      answers = answers.slice(0, answers.length - 2); answers.push(`${l}..${h}:${best}`);
      snap(); // Combine
      stack.pop();
      return best;
    };
    solve(0, n - 1);
    stack.length = 0;
    snap();
    return out;
  },
  project: (s) => ({
    lo: numVar(s, 'lo'), hi: numVar(s, 'hi'), mid: numVar(s, 'mid'), left: numVar(s, 'left'), right: numVar(s, 'right'),
    cross: shown(s, 'cross') === null ? null : (typeof s.vars.cross === 'number' ? s.vars.cross : String(s.vars.cross)),
    stack: (auxOf(s, 'recursion stack')?.items ?? []).map((t) => nums(t).join(',')),
    answers: (auxOf(s, 'returned answers')?.items ?? []).map((t) => t.replace(/\[|\]/g, '').replace(/\s*→\s*/, ':').replace(/\s+/g, '')),
  }),
  notes: 'recursion-tree scene, cell colours and pointer chips not compared; the crossing sum is compared as text while it is being built ("L x + R y") and as a number once combined',
});

/* ---- 241 different ways to add parentheses */
cases.push({
  slug: '241-different-ways-to-add-parentheses',
  gen: (r) => {
    const cnt = rint(r, 1, 5);
    let s = '';
    for (let k = 0; k < cnt; k++) { if (k) s += '+-*'[rint(r, 0, 2)]; s += String(r() < 0.8 ? rint(r, 0, 9) : rint(r, 10, 20)); }
    return { expr: s };
  },
  oracle: ({ expr }: { expr: string }): State[] => {
    const toks = expr.match(/\d+|[+\-*]/g) as string[];
    const out: State[] = [];
    const stack: string[] = [];
    let calls = 0;
    let range = `0..${toks.length - 1}`, op: string | null = null, left: string | null = null, right: string | null = null;
    let panels: string[] = [];
    const text = (a: number, b: number) => toks.slice(a, b + 1).join('');
    const show = (xs: number[]) => (xs.length > 8 ? `${xs.slice(0, 8).join(', ')}, … (${xs.length})` : xs.join(', '));
    const snap = () => out.push({ range, op, left, right, calls, stack: [...stack], panels: [...panels] });
    snap();
    const ways = (a: number, b: number): number[] => {
      calls++;
      range = `${a}..${b}`; op = null; left = null; right = null;
      stack.push(text(a, b));
      panels = [];
      if (a === b) { panels = [toks[a]]; snap(); stack.pop(); return [Number(toks[a])]; }
      snap(); // Solve
      const res: number[] = [];
      for (let k = a + 1; k < b; k += 2) {
        range = `${a}..${b}`; op = toks[k]; left = null; right = null;
        panels = [show(res)];
        snap(); // Split
        const L = ways(a, k - 1);
        const R = ways(k + 1, b);
        const made = L.flatMap((x) => R.map((y) => (toks[k] === '+' ? x + y : toks[k] === '-' ? x - y : x * y)));
        res.push(...made);
        range = `${a}..${b}`; op = toks[k]; left = `{${show(L)}}`; right = `{${show(R)}}`;
        panels = [`left {${show(L)}}|right {${show(R)}}|combined {${show(made)}}`, show(res)];
        snap(); // Combine
      }
      panels = [show(res)];
      op = null; left = null; right = null;
      range = `${a}..${b}`;
      snap(); // Return
      stack.pop();
      return res;
    };
    const all = ways(0, toks.length - 1);
    stack.length = 0;
    panels = [show([...all].sort((x, y) => x - y))];
    snap();
    return out;
  },
  project: (s) => ({
    range: String(s.vars.range), op: shown(s, 'op') === null ? null : String(s.vars.op), left: shown(s, 'left') === null ? null : String(s.vars.left),
    right: shown(s, 'right') === null ? null : String(s.vars.right), calls: numVar(s, 'calls'),
    stack: auxOf(s, 'call stack')?.items ?? [],
    panels: (s.aux ?? []).slice(1).map((a) => a.items.join('|')),
  }),
  notes: 'recursion-tree scene and expression-cell colours not compared; the display truncation of long result lists (more than 8 values) is mirrored in the oracle text',
});

void ptr; void shown; void gridOf;
