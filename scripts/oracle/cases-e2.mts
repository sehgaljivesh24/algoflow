import type { Step } from '../../src/engine/types.ts';
import type { CaseModule, State } from './types.ts';
import { cellValues, num, ptr, rarr, rint, rstr, sceneOfKind, shown } from './util.ts';

/**
 * Batch e2 oracles (30 mixed problems). Every oracle below is written from the textbook algorithm and never imports the
 * problem file or its kit; projections read only what the viewer sees (vars, pointers, cells, aux panels, scene nodes).
 */

/* ------------------------------------------------------------------ helpers */
const auxAt = (step: Step, i: number): string[] => step.aux?.[i]?.items ?? [];
const gridRowValues = (step: Step, row: number): (string | number)[] => (sceneOfKind(step, 'grid')?.rows[row] ?? []).map((c) => c.value);
const gridAll = (step: Step): (string | number)[][] => (sceneOfKind(step, 'grid')?.rows ?? []).map((r) => r.map((c) => c.value));
const arr = <T,>(n: number, f: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => f(i));
const rpick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];

export const cases: CaseModule['cases'] = [];

/* ------------------------------------------------------------ 344 reverse string */
{
  type In = { s: string };
  cases.push({
    slug: '344-reverse-string',
    gen: (r): In => ({ s: rstr(r, rint(r, 1, 9), 'abcdefg') }),
    oracle: ({ s }) => {
      const a = [...s];
      const out: State[] = [];
      let l = 0, rr = a.length - 1, swaps = 0;
      out.push({ l, r: rr, arr: [...a], swaps });
      while (l < rr) {
        [a[l], a[rr]] = [a[rr], a[l]];
        swaps++;
        out.push({ l, r: rr, arr: [...a], swaps });
        l++; rr--;
        out.push({ l, r: rr, arr: [...a], swaps });
      }
      out.push({ l: null, r: null, arr: [...a], swaps }); // Done: pointers retired
      // design quirk: for a one-letter string the Start step draws no pointer chips (l and r would overlap), later steps do
      const withChips = out.map((s, k) => ({ ...s, pl: k === 0 && a.length === 1 ? null : s.l, pr: k === 0 && a.length === 1 ? null : s.r }));
      if (a.length === 1) withChips.splice(1, 0, { ...out[0], pl: 0, pr: 0 }); // the failing "l < r" check shows the chips
      return withChips;
    },
    project: (st) => ({ l: num(st, 'l'), r: num(st, 'r'), arr: cellValues(st).map(String), swaps: num(st, 'swaps'), pl: ptr(st, 'l'), pr: ptr(st, 'r') }),
    notes: 'cell colours not checked (only the l / r chips and the array order); design quirk mirrored in the oracle: a one-letter string draws no chips on the Start step only',
  });
}

/* ---------------------------------------------------------- 36 valid sudoku */
{
  type In = { board: string[] };
  const boxOf = (r: number, c: number) => Math.floor(r / 3) * 3 + Math.floor(c / 3);
  cases.push({
    slug: '36-valid-sudoku',
    gen: (r): In => {
      const perm = arr(9, (i) => i + 1).sort(() => r() - 0.5);
      const grid = arr(9, (rr) => arr(9, (c) => perm[(rr * 3 + Math.floor(rr / 3) + c) % 9]));
      const dens = rpick(r, [0.2, 0.4, 0.7]);
      const board = grid.map((row) => row.map((d) => (r() < dens ? String(d) : '.')));
      if (r() < 0.55) { // inject a clash
        const kind = rint(r, 0, 2);
        const rr = rint(r, 0, 8), c = rint(r, 0, 8);
        let r2 = rr, c2 = c;
        if (kind === 0) c2 = (c + rint(r, 1, 8)) % 9;
        else if (kind === 1) r2 = (rr + rint(r, 1, 8)) % 9;
        else { r2 = Math.floor(rr / 3) * 3 + rint(r, 0, 2); c2 = Math.floor(c / 3) * 3 + rint(r, 0, 2); }
        const d = String(rint(r, 1, 9));
        board[rr][c] = d;
        board[r2][c2] = d;
      }
      return { board: board.map((row) => row.join('')) };
    },
    oracle: ({ board }) => {
      const rowS: string[][] = arr(9, () => []), colS: string[][] = arr(9, () => []), boxS: string[][] = arr(9, () => []);
      const out: State[] = [];
      const snap = (cur: [number, number] | null, checked: number, extra: Partial<State> = {}): State => ({
        row: cur ? cur[0] : null, col: cur ? cur[1] : null, box: cur ? boxOf(cur[0], cur[1]) : null, checked,
        rowSeen: cur ? [...rowS[cur[0]]].sort() : [], colSeen: cur ? [...colS[cur[1]]].sort() : [], boxSeen: cur ? [...boxS[boxOf(cur[0], cur[1])]].sort() : [],
        dup: null, verdict: null, ...extra,
      });
      out.push(snap(null, 0));
      let checked = 0;
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const d = board[r][c];
        if (d === '.') continue;
        const b = boxOf(r, c);
        const where = rowS[r].includes(d) ? `row ${r}` : colS[c].includes(d) ? `column ${c}` : boxS[b].includes(d) ? `box ${b}` : null;
        if (!where) out.push(snap([r, c], checked)); // lookup (a clash goes straight to the REJECT step)
        if (where) {
          out.push(snap([r, c], checked, { dup: `${d} in ${where}` }));
          out.push(snap([r, c], checked, { verdict: 'false' }));
          return out;
        }
        rowS[r].push(d); colS[c].push(d); boxS[b].push(d); checked++;
        out.push(snap([r, c], checked)); // record
      }
      out.push(snap(null, checked, { verdict: 'true' }));
      return out;
    },
    project: (st) => {
      const m = /^Duplicate (\d) in ((?:row|column|box) \d)$/.exec(st.title);
      return {
        row: num(st, 'row'), col: num(st, 'col'), box: num(st, 'box'), checked: num(st, 'digits checked'),
        rowSeen: [...auxAt(st, 0)].sort(), colSeen: [...auxAt(st, 1)].sort(), boxSeen: [...auxAt(st, 2)].sort(),
        dup: m ? `${m[1]} in ${m[2]}` : null, verdict: st.result ? st.result.title : null,
      };
    },
    invariants: [
      (st, k, steps, { board }: { board: string[] }) => { // end-to-end: verdict equals a brute-force validity test of all rows, columns and boxes
        if (k !== steps.length - 1) return null;
        const groups: string[][] = [];
        for (let a = 0; a < 9; a++) { groups.push(arr(9, (b) => board[a][b]), arr(9, (b) => board[b][a]), arr(9, (b) => board[Math.floor(a / 3) * 3 + Math.floor(b / 3)][(a % 3) * 3 + (b % 3)])); }
        const valid = groups.every((g) => { const d = g.filter((c) => c !== '.'); return new Set(d).size === d.length; });
        return st.result?.title === String(valid) ? null : `verdict ${st.result?.title} but the board is ${valid ? 'valid' : 'invalid'}`;
      },
    ],
    notes: 'cell tones/colours (row/col/box highlight) and the red clash cells not checked; which earlier cell clashes is not checked',
  });
}

/* ------------------------------------------------- 371 sum of two integers */
{
  type In = { a: number; b: number };
  const W = 12, M = (1 << W) - 1;
  const sg = (x: number) => (x >= 1 << (W - 1) ? x - (1 << W) : x);
  const bits = (x: number) => arr(W, (i) => (x >> (W - 1 - i)) & 1);
  cases.push({
    slug: '371-sum-of-two-integers',
    gen: (r): In => {
      const f = () => (r() < 0.15 ? rpick(r, [0, 1, -1, 500, -500]) : rint(r, -500, 500));
      return { a: f(), b: f() };
    },
    oracle: ({ a: a0, b: b0 }) => {
      let a = a0 & M, b = b0 & M;
      const out: State[] = [];
      const snap = (x: number | null, c: number | null): State => ({ a: sg(a), b: sg(b), x: x === null ? null : sg(x), carry: c === null ? null : sg(c), aBits: bits(a), bBits: bits(b) });
      out.push({ ...snap(null, null), aBits: arr(W, () => null), bBits: arr(W, () => null) }); // Start: bit grid still blank ('·')
      out.push(snap(null, null)); // "Write both numbers as bits"
      while (b !== 0) {
        const carry = ((a & b) << 1) & M;
        out.push(snap(null, carry));
        const x = (a ^ b) & M;
        out.push(snap(x, carry));
        a = x; b = carry;
        out.push(snap(null, null));
      }
      return out;
    },
    project: (st) => ({ a: num(st, 'a'), b: num(st, 'b'), x: num(st, 'a ^ b'), carry: num(st, 'carry'), aBits: gridRowValues(st, 0).map((v) => (v === '·' ? null : Number(v))), bBits: gridRowValues(st, 1).map((v) => (v === '·' ? null : Number(v))) }),
    notes: 'the XOR / carry rows of the bit grid are checked only through the vars; colours not checked',
  });
}

/* ------------------------------------------------------- 383 ransom note */
{
  type In = { ransom: string; magazine: string };
  cases.push({
    slug: '383-ransom-note',
    gen: (r): In => ({ ransom: rstr(r, rint(r, 1, 6), 'abc'), magazine: rstr(r, rint(r, 1, 9), r() < 0.5 ? 'abc' : 'ab') }),
    oracle: ({ ransom, magazine }) => {
      const out: State[] = [];
      const cnt = new Map<string, number>();
      const mapItems = () => [...cnt.entries()].map(([k, v]) => `${k} → ${v}`);
      let left = ransom.length;
      const snap = (ch: string | null, extra: Partial<State> = {}): State => ({ char: ch, left, map: mapItems(), verdict: null, ...extra });
      out.push(snap(null));
      for (const ch of magazine) { cnt.set(ch, (cnt.get(ch) ?? 0) + 1); out.push(snap(ch)); }
      out.push(snap(null));
      for (const ch of ransom) {
        out.push(snap(ch)); // look up
        if ((cnt.get(ch) ?? 0) <= 0) { out.push(snap(ch, { verdict: 'false' })); return out; }
        cnt.set(ch, cnt.get(ch)! - 1); left--;
        out.push(snap(ch));
      }
      out.push(snap(null, { verdict: 'true' }));
      return out;
    },
    project: (st) => ({ char: shown(st, 'char'), left: num(st, 'note left'), map: auxAt(st, 0), verdict: st.result ? st.result.title : null }),
    notes: 'grid cell colours not checked; the magazine letters count var is constant',
  });
}

/* -------------------------------------------------- 389 find the difference */
{
  type In = { s: string; t: string };
  cases.push({
    slug: '389-find-the-difference',
    gen: (r): In => {
      const s = rstr(r, rint(r, 0, 6), 'abcxyz');
      const t = [...s, rpick(r, [...'abcxyz'])].sort(() => r() - 0.5).join('');
      return { s, t };
    },
    oracle: ({ s, t }) => {
      const out: State[] = [];
      let acc = 0;
      out.push({ char: null, acc, from: null, hl: null });
      [...s].forEach((ch, i) => { acc ^= ch.charCodeAt(0); out.push({ char: ch, acc, from: 's', hl: i }); });
      [...t].forEach((ch, i) => { acc ^= ch.charCodeAt(0); out.push({ char: ch, acc, from: 't', hl: s.length + i }); });
      out.push({ char: null, acc, from: null, hl: null }); // answer: the extra letter's code
      return out;
    },
    project: (st) => {
      const hl = st.aux?.[0]?.highlight;
      return { char: shown(st, 'char'), acc: num(st, 'acc'), from: shown(st, 'from'), hl: hl === undefined || hl < 0 ? null : hl };
    },
    notes: 'bit grids are not compared (only the acc number); colours not checked',
  });
}

/* ------------------------------------------------------ 399 evaluate division */
{
  type In = { eqs: { a: string; b: string; v: number }[]; queries: [string, string][] };
  const fmtVal = (x: number) => (Number.isInteger(x) ? String(x) : String(+x.toFixed(4)));
  cases.push({
    slug: '399-evaluate-division',
    gen: (r): In => {
      const letters = [...'abcdefg'].slice(0, rint(r, 2, 7));
      const val = new Map(letters.map((l) => [l, rint(r, 1, 6)]));
      const eqs: In['eqs'] = [];
      const seen = new Set<string>();
      const ne = rint(r, 1, 6);
      for (let i = 0; i < ne * 3 && eqs.length < ne; i++) {
        const a = rpick(r, letters), b = rpick(r, letters);
        const key = [a, b].sort().join('');
        if (a === b || seen.has(key)) continue;
        seen.add(key);
        eqs.push({ a, b, v: val.get(a)! / val.get(b)! });
      }
      if (!eqs.length) eqs.push({ a: letters[0], b: letters[1], v: val.get(letters[0])! / val.get(letters[1])! });
      const all = [...'abcdefgh'];
      const queries: [string, string][] = arr(rint(r, 1, 3), () => [rpick(r, all.slice(0, letters.length + 1)), rpick(r, all.slice(0, letters.length + 1))]);
      return { eqs, queries };
    },
    oracle: ({ eqs, queries }: In) => {
      const names = [...new Set(eqs.flatMap((e) => [e.a, e.b]))].sort();
      const adj = new Map<string, [string, number][]>(names.map((n) => [n, []]));
      for (const e of eqs) { adj.get(e.a)!.push([e.b, e.v]); adj.get(e.b)!.push([e.a, 1 / e.v]); }
      const answers: string[] = [];
      const out: State[] = [];
      let query: string | null = null, node: string | null = null;
      let prod = new Map<string, number>(), queue: string[] = [];
      const snap = (): State => ({
        query, node, product: node === null ? null : fmtVal(prod.get(node) ?? 1), queue: queue.map((n) => `${n}: ${fmtVal(prod.get(n)!)}`),
        answers: [...answers], tags: names.map((n) => (prod.has(n) ? `×${fmtVal(prod.get(n)!)}` : null)),
      });
      out.push(snap());
      for (const [x, y] of queries) {
        query = `${x}/${y}`; node = null; prod = new Map(); queue = [];
        if (!adj.has(x) || !adj.has(y)) { answers.push((-1).toFixed(5)); out.push(snap()); continue; }
        prod.set(x, 1); queue.push(x);
        out.push(snap());
        let found = false;
        while (queue.length) {
          const u = queue.shift()!;
          node = u;
          if (u === y) { found = true; answers.push(prod.get(u)!.toFixed(5)); out.push(snap()); break; }
          out.push(snap());
          for (const [v, f] of adj.get(u)!) {
            if (prod.has(v)) continue;
            prod.set(v, prod.get(u)! * f); queue.push(v);
            out.push(snap());
          }
          node = null;
        }
        if (!found) { node = null; answers.push((-1).toFixed(5)); out.push(snap()); }
      }
      query = null; node = null; prod = new Map(); queue = [];
      out.push(snap());
      return out;
    },
    project: (st) => {
      const g = sceneOfKind(st, 'graph');
      return {
        query: shown(st, 'query'), node: shown(st, 'node'), product: shown(st, 'product'), queue: auxAt(st, 0), answers: auxAt(st, 1),
        tags: (g?.nodes ?? []).map((n) => n.tag ?? null),
      };
    },
    notes: 'node/edge colours, chosen-path highlight and from/to pointers not checked',
  });
}

/* ------------------------------------------------ 4 median of two sorted arrays */
{
  type In = { a: number[]; b: number[] };
  const fmt = (v: number) => (v === -Infinity ? '−∞' : v === Infinity ? '+∞' : String(v));
  cases.push({
    slug: '4-median-of-two-sorted-arrays',
    gen: (r): In => {
      const mk = (n: number) => rarr(r, n, -9, 9).sort((x, y) => x - y);
      let a = mk(rint(r, 0, 6)), b = mk(rint(r, 0, 6));
      if (!a.length && !b.length) a = mk(1);
      return { a, b };
    },
    oracle: ({ a, b }) => {
      // binary search over the shorter array (the first input when the lengths tie)
      const [A, B] = a.length > b.length ? [b, a] : [a, b];
      const m = A.length, n = B.length, half = Math.floor((m + n + 1) / 2);
      let lo = 0, hi = m;
      const out: State[] = [];
      const base = (i: number | null, j: number | null, borders: string[], median: string | null = null): State => ({ lo, i, j, hi, half, borders, median });
      out.push(base(null, null, []));
      while (lo <= hi) {
        const i = Math.floor((lo + hi) / 2), j = half - i;
        const l1 = i > 0 ? A[i - 1] : -Infinity, r1 = i < m ? A[i] : Infinity;
        const l2 = j > 0 ? B[j - 1] : -Infinity, r2 = j < n ? B[j] : Infinity;
        const borders = [`L1 → ${fmt(l1)}`, `R1 → ${fmt(r1)}`, `L2 → ${fmt(l2)}`, `R2 → ${fmt(r2)}`];
        out.push(base(i, j, borders));
        if (l1 <= r2 && l2 <= r1) {
          const lm = Math.max(l1, l2);
          const med = (m + n) % 2 === 1 ? lm : (lm + Math.min(r1, r2)) / 2;
          out.push(base(i, j, borders, String(med)));
          return out;
        }
        if (l1 > r2) hi = i - 1; else lo = i + 1;
        out.push(base(i, j, borders));
      }
      throw new Error('no valid cut found');
    },
    project: (st) => ({ lo: num(st, 'lo'), i: num(st, 'i'), j: num(st, 'j'), hi: num(st, 'hi'), half: num(st, 'half'), borders: auxAt(st, 0), median: st.result ? st.result.title : null }),
    invariants: [
      (st, k, steps, { a, b }) => { // end-to-end: the reported median equals the median of the merged sorted array
        if (k !== steps.length - 1) return null;
        const m = [...a, ...b].sort((x, y) => x - y);
        const want = m.length % 2 ? m[(m.length - 1) / 2] : (m[m.length / 2 - 1] + m[m.length / 2]) / 2;
        return Number(st.result?.title) === want ? null : `median ${st.result?.title} != merged median ${want}`;
      },
    ],
    notes: 'grid colours (left-half / border highlight), the alert banner and which border is highlighted are not checked',
  });
}

/* ------------------------------------------------ 438 find all anagrams in a string */
{
  type In = { s: string; p: string };
  cases.push({
    slug: '438-find-all-anagrams-in-a-string',
    gen: (r): In => {
      const alpha = rpick(r, ['ab', 'abc', 'abcd']);
      const p = rstr(r, rint(r, 1, 4), alpha);
      let s = rstr(r, rint(r, 0, 10), alpha) || 'a';
      if (r() < 0.5) { // plant an anagram of p
        const pa = [...p].sort(() => r() - 0.5).join('');
        const at = rint(r, 0, Math.max(0, s.length - 1));
        s = (s.slice(0, at) + pa + s.slice(at)).slice(0, 12);
      }
      return { s, p };
    },
    oracle: ({ s, p }) => {
      const k = p.length, n = s.length;
      const cnt = (str: string) => { const m = new Map<string, number>(); for (const c of str) m.set(c, (m.get(c) ?? 0) + 1); return m; };
      const items = (m: Map<string, number>) => [...m.entries()].filter(([, v]) => v > 0).sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(([c, v]) => `${c} → ${v}`);
      const need = cnt(p), res: number[] = [];
      const matchesOf = (w: Map<string, number>) => { let m = 0; for (let c = 0; c < 26; c++) { const ch = String.fromCharCode(97 + c); if ((need.get(ch) ?? 0) === (w.get(ch) ?? 0)) m++; } return m; };
      const out: State[] = [];
      const win = new Map<string, number>();
      const snap = (l: number | null, r: number | null, matches: number | null, needOn: boolean): State => ({ l, r, pl: l, pr: r, matches: matches === null ? null : `${matches}/26`, need: needOn ? items(need) : [], win: items(win), res: res.map(String) });
      out.push(snap(null, null, null, false)); // Start: the need table is still empty
      if (k > n) { out.push(snap(null, null, null, false)); out.push(snap(null, null, null, false)); return out; }
      out.push(snap(null, null, null, true)); // need table counted
      for (let i = 0; i < k; i++) { win.set(s[i], (win.get(s[i]) ?? 0) + 1); out.push(snap(0, i, null, true)); }
      // (pointer chips l / r equal the l / r vars at every step, see the projection)
      let mt = matchesOf(win);
      out.push(snap(0, k - 1, mt, true));
      if (mt === 26) { res.push(0); out.push(snap(0, k - 1, mt, true)); }
      for (let i = k; i < n; i++) {
        win.set(s[i], (win.get(s[i]) ?? 0) + 1);
        out.push(snap(i - k, i, matchesOf(win), true));
        win.set(s[i - k], win.get(s[i - k])! - 1);
        mt = matchesOf(win);
        out.push(snap(i - k + 1, i, mt, true));
        if (mt === 26) { res.push(i - k + 1); out.push(snap(i - k + 1, i, mt, true)); }
      }
      out.push(snap(null, null, mt, true)); // Done: pointers retired, the last match count stays
      return out;
    },
    project: (st) => ({ l: num(st, 'l'), r: num(st, 'r'), matches: shown(st, 'matches'), need: auxAt(st, 0), win: auxAt(st, 1), res: auxAt(st, 2), pl: ptr(st, 'l'), pr: ptr(st, 'r') }),
    invariants: [
      (st, k, steps, { s, p }) => { // end-to-end: the reported start indexes equal a brute-force anagram scan
        if (k !== steps.length - 1) return null;
        const key = (x: string) => [...x].sort().join('');
        const want: number[] = [];
        for (let i = 0; i + p.length <= s.length; i++) if (key(s.slice(i, i + p.length)) === key(p)) want.push(i);
        return st.result!.title === JSON.stringify(want) ? null : `result ${st.result!.title} != brute force ${JSON.stringify(want)}`;
      },
    ],
    notes: 'cell colours, the "bad" flags in the window panel and the highlighted found-index are not checked',
  });
}

/* ------------------------------------------------ 452 minimum arrows to burst balloons */
{
  type In = { iv: [number, number][] };
  cases.push({
    slug: '452-minimum-arrows-to-burst-balloons',
    gen: (r): In => {
      const n = rint(r, 1, 7);
      return { iv: arr(n, () => { const a = rint(r, -3, 12); return [a, a + rint(r, 0, 6)] as [number, number]; }) };
    },
    oracle: ({ iv }: In) => {
      const sorted = iv.map((x) => [...x] as [number, number]).sort((p, q) => p[1] - q[1]); // by right end (stable)
      const f = (b: [number, number]) => `[${b[0]}, ${b[1]}]`;
      const out: State[] = [];
      const shots: number[] = [];
      let x: number | null = null;
      const snap = (balloon: string | null, answer: number | null, sortedShown: boolean): State => ({
        balloon, x, arrows: shots.length, answer, order: (sortedShown ? sorted : iv).map((b) => f(b as [number, number])), shots: shots.map(String),
      });
      out.push(snap(null, null, false)); // Start: input order
      out.push(snap(null, null, true)); // sorted by end
      for (const b of sorted) {
        if (x !== null) out.push(snap(f(b), null, true)); // "Test b against x": the balloon shows while x is still the old arrow
        if (x === null || b[0] > x) { x = b[1]; shots.push(x); out.push(snap(f(b), null, true)); } // starts after x: shoot at its end
        // else: x lies inside the balloon -> popped by the same arrow, nothing changes
      }
      out.push(snap(null, shots.length, true));
      return out;
    },
    project: (st) => ({
      balloon: shown(st, 'balloon'), x: num(st, 'arrow x'), arrows: num(st, 'arrows'), answer: num(st, 'answer'),
      order: auxAt(st, 0), shots: auxAt(st, 1),
    }),
    invariants: [
      (st, k, steps, { iv }: { iv: [number, number][] }) => { // end-to-end: answer equals the minimum arrow count by the mirror greedy (sort by START, shrink the common overlap)
        if (k !== steps.length - 1) return null;
        const byStart = iv.map((x) => [...x]).sort((p, q) => p[0] - q[0]);
        let arrows = 0, hi = -Infinity;
        for (const [a, b] of byStart) { if (arrows === 0 || a > hi) { arrows++; hi = b; } else hi = Math.min(hi, b); }
        return Number(st.vars.answer) === arrows ? null : `answer ${st.vars.answer} != ${arrows}`;
      },
    ],
    notes: 'interval-bar states (popped / active) and the marker are not checked; the shooting arrows are checked through the panel and vars',
  });
}

/* ------------------------------------------------ 5 longest palindromic substring */
{
  type In = { s: string };
  cases.push({
    slug: '5-longest-palindromic-substring',
    gen: (r): In => ({ s: r() < 0.3 ? rstr(r, rint(r, 1, 11), 'ab') : rstr(r, rint(r, 1, 11), 'abc') }),
    oracle: ({ s }) => {
      const n = s.length;
      const out: State[] = [];
      let best: string | null = null;
      const snap = (center: string | null, l: number | null, r: number | null, pl: number | null, pr: number | null): State => ({ center, l, r, pl, pr, best });
      out.push(snap(null, null, null, null, null));
      for (let c = 0; c < n; c++) {
        for (const kind of ['odd', 'even'] as const) {
          if (kind === 'even' && c === n - 1) continue;
          let l = c, r = kind === 'odd' ? c : c + 1;
          const name = `${kind} @ ${c}`;
          out.push(snap(name, l, r, l, r));
          while (l >= 0 && r < n && s[l] === s[r]) {
            if (best === null || r - l + 1 > best.length) best = s.slice(l, r + 1);
            out.push(snap(name, l, r, l, r));
            l--; r++;
          }
          // stopped: off the edge (pointers keep the last palindrome) or a mismatch (pointers on the clashing pair)
          const edge = l < 0 || r >= n;
          out.push(snap(name, l, r, edge ? l + 1 : l, edge ? r - 1 : r));
        }
      }
      out.push(snap(null, null, null, null, null));
      return out;
    },
    project: (st) => {
      const b = shown(st, 'best');
      return { center: shown(st, 'center'), l: num(st, 'l'), r: num(st, 'r'), pl: ptr(st, 'l'), pr: ptr(st, 'r'), best: b === null ? null : String(b).replace(/^"|"$/g, '') };
    },
    invariants: [
      (st, k, steps, { s }) => { // end-to-end: the final "best" is a palindromic substring of maximal length (brute force)
        if (k !== steps.length - 1) return null;
        let want = 0;
        for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) { const t = s.slice(i, j + 1); if (t === [...t].reverse().join('')) want = Math.max(want, t.length); }
        const b = String(st.vars.best).replace(/^"|"$/g, '');
        return b.length === want && s.includes(b) && b === [...b].reverse().join('') ? null : `best "${b}" is not a longest palindromic substring (length ${want})`;
      },
    ],
    notes: 'cell colours not checked',
  });
}

/* ------------------------------------------------ 509 fibonacci number */
{
  type In = { n: number };
  cases.push({
    slug: '509-fibonacci-number',
    gen: (r): In => ({ n: rint(r, 0, 15) }),
    oracle: ({ n }) => {
      const dp: (number | null)[] = Array(n + 1).fill(null);
      const out: State[] = [];
      const snap = (i: number | null, a: number | null, b: number | null): State => ({ i, a, b, table: [...dp], p: i });
      out.push(snap(null, null, null));
      for (let i = 0; i <= Math.min(1, n); i++) { dp[i] = i; out.push(snap(i, null, null)); }
      for (let i = 2; i <= n; i++) {
        out.push(snap(i, dp[i - 1], dp[i - 2]));
        dp[i] = dp[i - 1]! + dp[i - 2]!;
        out.push(snap(i, dp[i - 1], dp[i - 2]));
      }
      out.push(snap(n, null, null));
      return out;
    },
    project: (st) => ({ i: num(st, 'i'), a: num(st, 'dp[i-1]'), b: num(st, 'dp[i-2]'), table: cellValues(st).map((v) => (v === '?' ? null : (v as number))), p: ptr(st, 'i') }),
    invariants: [
      (st) => {
        const t = cellValues(st);
        for (let i = 2; i < t.length; i++) if (typeof t[i] === 'number' && (t[i] as number) !== (t[i - 1] as number) + (t[i - 2] as number)) return `table[${i}] != table[${i - 1}] + table[${i - 2}]`;
        return null;
      },
    ],
    notes: 'cell colours not checked',
  });
}

/* ------------------------------------------------ 59 spiral matrix II */
{
  type In = { n: number };
  cases.push({
    slug: '59-spiral-matrix-ii',
    gen: (r): In => ({ n: rint(r, 1, 7) }),
    oracle: ({ n }) => {
      // order the cells with the layer-by-layer boundary method, then derive writes and turns from consecutive moves
      const order: [number, number][] = [];
      let top = 0, bottom = n - 1, left = 0, right = n - 1;
      while (top <= bottom && left <= right) {
        for (let c = left; c <= right; c++) order.push([top, c]);
        for (let r = top + 1; r <= bottom; r++) order.push([r, right]);
        if (top < bottom) for (let c = right - 1; c >= left; c--) order.push([bottom, c]);
        if (left < right) for (let r = bottom - 1; r > top; r--) order.push([r, left]);
        top++; bottom--; left++; right--;
      }
      const names = ['right', 'down', 'left', 'up'];
      const dirOf = (a: [number, number], b: [number, number]) => (b[1] > a[1] ? 0 : b[0] > a[0] ? 1 : b[1] < a[1] ? 2 : 3);
      const g = arr(n, () => arr(n, () => 0));
      const out: State[] = [];
      let d = 0;
      const snap = (k: number, cur: [number, number] | null): State => ({ k, row: cur ? cur[0] : null, col: cur ? cur[1] : null, direction: names[d], grid: g.map((row) => row.join(',')) });
      out.push(snap(1, null));
      order.forEach((cell, idx) => {
        g[cell[0]][cell[1]] = idx + 1;
        out.push(snap(idx + 1, cell));
        if (idx + 1 < order.length) {
          const nd = dirOf(cell, order[idx + 1]);
          if (nd !== d) { d = nd; out.push(snap(idx + 1, cell)); } // turn on the spot
        }
      });
      out.push(snap(n * n, null));
      return out;
    },
    project: (st) => ({ k: num(st, 'k'), row: num(st, 'row'), col: num(st, 'col'), direction: shown(st, 'direction'), grid: gridAll(st).map((row) => row.map((v) => (v === '·' ? 0 : v)).join(',')) }),
    notes: 'cell colours not checked',
  });
}

/* ------------------------------------------------ 621 task scheduler */
{
  type In = { tasks: string[]; n: number };
  cases.push({
    slug: '621-task-scheduler',
    gen: (r): In => {
      const alpha = [...rpick(r, ['AB', 'ABC', 'ABCD'])];
      return { tasks: arr(rint(r, 1, 10), () => rpick(r, alpha)), n: rint(r, 0, 4) };
    },
    oracle: ({ tasks, n }) => {
      const cnt = new Map<string, number>();
      for (const t of tasks) cnt.set(t, (cnt.get(t) ?? 0) + 1);
      const maxF = Math.max(...cnt.values());
      // ready list: most copies left first, ties alphabetical (the animation's displayed convention)
      const byRem = (p: [string, number], q: [string, number]) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1);
      let ready: [string, number][] = [...cnt].sort(byRem);
      let cool: { letter: string; rem: number; at: number }[] = [];
      const line: string[] = [];
      let time = 0, idle = 0;
      const snap = (): State => ({
        time, idle, maxF: `${maxF}×`, ready: ready.map(([l, c]) => `${l}×${c}`), cool: cool.map((c) => `${c.letter}×${c.rem} @t${c.at}`),
        line: line.length ? [...line] : [...tasks],
      });
      const out: State[] = [snap(), snap()];
      while (ready.length || cool.length) {
        time++;
        const rel = cool.filter((c) => c.at <= time);
        cool = cool.filter((c) => c.at > time);
        for (const c of rel) ready.push([c.letter, c.rem]);
        ready.sort(byRem);
        if (!ready.length) { idle++; line.push('·'); out.push(snap()); continue; }
        const [letter, rem] = ready.shift()!;
        line.push(letter);
        if (rem > 1) cool.push({ letter, rem: rem - 1, at: time + n + 1 });
        out.push(snap());
      }
      out.push(snap());
      return out;
    },
    project: (st) => ({
      time: num(st, 'time'), idle: num(st, 'idle slots'), maxF: shown(st, 'most frequent'), ready: auxAt(st, 0), cool: auxAt(st, 1), line: cellValues(st).map(String),
    }),
    invariants: [
      (st, _i, _steps, { tasks, n }) => {
        if (st.title !== 'Done') return null;
        const cnt = new Map<string, number>();
        for (const t of tasks) cnt.set(t, (cnt.get(t) ?? 0) + 1);
        const mf = Math.max(...cnt.values());
        const cm = [...cnt.values()].filter((c) => c === mf).length;
        const want = Math.max((mf - 1) * (n + 1) + cm, tasks.length);
        return Number(st.vars.time) === want ? null : `total time ${st.vars.time} != closed-form answer ${want}`;
      },
    ],
    notes: 'tie-break among ready tasks with equal copies left is alphabetical (display convention; the total time does not depend on it); the closed-form answer is checked on the Done step; cell colours not checked',
  });
}

/* ------------------------------------------------ 637 average of levels in binary tree */
{
  type In = { tokens: (number | null)[] };
  type Node = { v: number; l: Node | null; r: Node | null };
  cases.push({
    slug: '637-average-of-levels-in-binary-tree',
    gen: (r): In => {
      const total = rint(r, 1, 11);
      let made = 0;
      const mk = (depth: number): Node | null => {
        if (made >= total || (depth > 0 && r() < 0.3) || depth > 5) return null;
        made++;
        const nd: Node = { v: rint(r, -9, 30), l: null, r: null };
        nd.l = mk(depth + 1);
        nd.r = mk(depth + 1);
        return nd;
      };
      const root = mk(0) as Node;
      const tokens: (number | null)[] = [];
      const q: (Node | null)[] = [root];
      for (let h = 0; h < q.length; h++) { const nd = q[h]; tokens.push(nd ? nd.v : null); if (nd) q.push(nd.l, nd.r); }
      while (tokens.length && tokens[tokens.length - 1] === null) tokens.pop();
      return { tokens };
    },
    oracle: ({ tokens }) => {
      // level-order (LeetCode) deserialisation: each node takes its two children from the token list in order
      const nodes: Node[] = [];
      const root: Node = { v: tokens[0] as number, l: null, r: null };
      nodes.push(root);
      let ti = 1;
      for (let h = 0; h < nodes.length; h++) {
        for (const side of ['l', 'r'] as const) {
          if (ti >= tokens.length) break;
          const t = tokens[ti++];
          if (t !== null) { const c: Node = { v: t, l: null, r: null }; nodes[h][side] = c; nodes.push(c); }
        }
      }
      const idOf = new Map(nodes.map((nd, i) => [nd, i]));
      const label: (string | null)[] = nodes.map(() => null);
      const avgs: string[] = [];
      let queue: Node[] = [root];
      let level = 0, size = 0, sum = 0, node: number | null = null;
      const out: State[] = [];
      const snap = (): State => ({ level, size, sum, node, queue: queue.map((x) => String(x.v)), avgs: [...avgs], labels: [...label], vals: nodes.map((x) => x.v) });
      out.push(snap());
      let first = true;
      while (queue.length) {
        if (!first) level++;
        first = false;
        size = queue.length; sum = 0;
        out.push(snap());
        for (let k = 0, sz = size; k < sz; k++) {
          const nd = queue.shift()!;
          sum += nd.v; node = nd.v; label[idOf.get(nd)!] = `Σ${sum}`;
          out.push(snap());
          if (nd.l) queue.push(nd.l);
          if (nd.r) queue.push(nd.r);
          out.push(snap());
        }
        node = null;
        avgs.push(String(+(sum / size).toFixed(5))); // the animation shows averages rounded to 5 decimals
        out.push(snap());
      }
      level++; // Done: the number of levels
      out.push(snap());
      return out;
    },
    project: (st) => {
      const t = sceneOfKind(st, 'tree');
      return {
        level: num(st, 'level'), size: num(st, 'size'), sum: num(st, 'sum'), node: num(st, 'node'), queue: auxAt(st, 0), avgs: auxAt(st, 1),
        labels: (t?.nodes ?? []).map((nd) => t!.labels[nd.id] ?? null), vals: (t?.nodes ?? []).map((nd) => nd.value as number),
      };
    },
    notes: 'node colours (queued / active / done) not checked; tree shape is checked indirectly through the BFS levels (queue contents and sums)',
  });
}

/* ------------------------------------------------ 680 valid palindrome II */
{
  type In = { s: string };
  cases.push({
    slug: '680-valid-palindrome-ii',
    gen: (r): In => {
      if (r() < 0.5) { // near-palindrome: mirror then corrupt/insert one char
        const h = rstr(r, rint(r, 1, 5), 'abc');
        const mid = r() < 0.5 ? '' : rstr(r, 1, 'abc');
        let s = h + mid + [...h].reverse().join('');
        if (r() < 0.7) { const k = rint(r, 0, s.length); s = s.slice(0, k) + rstr(r, 1, 'abc') + s.slice(k); }
        return { s: s.slice(0, 12) };
      }
      return { s: rstr(r, rint(r, 1, 9), r() < 0.5 ? 'ab' : 'abc') };
    },
    oracle: ({ s }) => {
      const n = s.length;
      const out: State[] = [];
      let l = 0, r = n - 1;
      // chips: l / r while scanning the outside, i / j during a deletion trial, none once the verdict is shown
      const snap = (i: number | null, j: number | null, skipped: string, verdict: string | null = null): State => ({
        l, r, i, j, skipped, verdict, pl: i === null && verdict === null ? l : null, pr: i === null && verdict === null ? r : null, pi: i, pj: j,
      });
      out.push(snap(null, null, 'none'));
      const trial = (i0: number, j0: number, del: number): boolean => {
        let i = i0, j = j0;
        out.push(snap(i, j, `s[${del}]`));
        while (i < j) {
          out.push(snap(i, j, `s[${del}]`));
          if (s[i] !== s[j]) return false;
          i++; j--;
        }
        return true;
      };
      while (l < r) {
        if (s[l] === s[r]) { out.push(snap(null, null, 'none')); l++; r--; continue; } // "Match" step shows the pair before the pointers move
        out.push(snap(null, null, 'none')); // "Mismatch" step: the one deletion must be s[l] or s[r]
        if (trial(l + 1, r, l)) { out.push(snap(null, null, `s[${l}]`, 'true')); return out; }
        if (trial(l, r - 1, r)) { out.push(snap(null, null, `s[${r}]`, 'true')); return out; }
        out.push(snap(null, null, 'none', 'false'));
        return out;
      }
      out.push(snap(null, null, 'none', 'true')); // already a palindrome
      return out;
    },
    project: (st) => ({
      l: num(st, 'l'), r: num(st, 'r'), i: num(st, 'i'), j: num(st, 'j'), skipped: shown(st, 'skipped'), verdict: st.result ? st.result.title : null,
      pl: ptr(st, 'l'), pr: ptr(st, 'r'), pi: ptr(st, 'i'), pj: ptr(st, 'j'),
    }),
    notes: 'cell colours not checked; the deleted-character highlight is checked only via the "skipped" var',
  });
}

/* ------------------------------------------------ 746 min cost climbing stairs */
{
  type In = { cost: number[] };
  cases.push({
    slug: '746-min-cost-climbing-stairs',
    gen: (r): In => ({ cost: rarr(r, rint(r, 2, 11), 0, r() < 0.3 ? 5 : 99) }),
    oracle: ({ cost }) => {
      const n = cost.length;
      const dp: (number | null)[] = Array(n + 1).fill(null);
      const out: State[] = [];
      const snap = (i: number | null, a: number | null, b: number | null): State => ({ i, a, b, dp: [...dp], cost: [...cost] });
      out.push(snap(null, null, null));
      dp[0] = 0; out.push(snap(0, null, null));
      dp[1] = 0; out.push(snap(1, null, null));
      for (let i = 2; i <= n; i++) {
        const a = dp[i - 1]! + cost[i - 1], b = dp[i - 2]! + cost[i - 2];
        out.push(snap(i, a, b));
        dp[i] = Math.min(a, b);
        out.push(snap(i, a, b));
      }
      out.push(snap(n, null, null));
      return out;
    },
    project: (st) => ({
      i: num(st, 'i'), a: num(st, 'via 1 step'), b: num(st, 'via 2 steps'),
      dp: gridRowValues(st, 1).map((v) => (v === '?' ? null : (v as number))),
      cost: gridRowValues(st, 0).slice(0, -1).map((v) => v as number),
    }),
    notes: 'cell colours not checked',
  });
}

/* ------------------------------------------------ 76 minimum window substring */
{
  type In = { s: string; t: string };
  cases.push({
    slug: '76-minimum-window-substring',
    gen: (r): In => {
      const alpha = rpick(r, ['AB', 'ABC', 'ABCD']);
      return { s: rstr(r, rint(r, 1, 12), alpha + (r() < 0.4 ? 'X' : '')), t: rstr(r, rint(r, 1, 4), alpha) };
    },
    oracle: ({ s, t }) => {
      const n = s.length;
      const need = new Map<string, number>();
      for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);
      const win = new Map<string, number>();
      const req = need.size;
      let formed = 0, l = 0, bestLen = Infinity, bestL = 0;
      const out: State[] = [];
      const snap = (r: number | null, verdict: string | null = null): State => ({
        l, r, pl: r === null ? null : Math.min(l, n - 1), pr: r, formed: `${formed}/${req}`, best: bestLen === Infinity ? null : bestLen,
        need: [...need].map(([c, v]) => `${c} → ${v}`), win: [...win].filter(([, v]) => v > 0).map(([c, v]) => `${c} → ${v}`).sort(), verdict,
      });
      out.push(snap(null)); out.push(snap(null));
      for (let r = 0; r < n; r++) {
        const c = s[r];
        win.set(c, (win.get(c) ?? 0) + 1);
        if (need.has(c) && win.get(c) === need.get(c)) formed++;
        out.push(snap(r));
        while (formed === req) {
          if (r - l + 1 < bestLen) { bestLen = r - l + 1; bestL = l; }
          out.push(snap(r)); // valid window recorded
          const o = s[l];
          win.set(o, win.get(o)! - 1);
          if (need.has(o) && win.get(o)! < need.get(o)!) formed--;
          l++;
          out.push(snap(r)); // shrink
        }
      }
      out.push(snap(null, JSON.stringify(bestLen === Infinity ? '' : s.slice(bestL, bestL + bestLen))));
      return out;
    },
    project: (st) => ({
      l: num(st, 'l'), r: num(st, 'r'), pl: ptr(st, 'l'), pr: ptr(st, 'r'), formed: shown(st, 'formed'), best: num(st, 'best'), need: auxAt(st, 0), win: [...auxAt(st, 1)].sort(), verdict: st.result ? st.result.title : null,
    }),
    invariants: [
      (st, k, steps, { s, t }) => { // end-to-end: shortest window covering t (brute force over all substrings)
        if (k !== steps.length - 1) return null;
        const covers = (w: string) => { const c = new Map<string, number>(); for (const x of w) c.set(x, (c.get(x) ?? 0) + 1); const nd = new Map<string, number>(); for (const x of t) nd.set(x, (nd.get(x) ?? 0) + 1); return [...nd].every(([x, v]) => (c.get(x) ?? 0) >= v); };
        let want = Infinity;
        for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) if (covers(s.slice(i, j + 1))) want = Math.min(want, j - i + 1);
        const got = JSON.parse(st.result!.title) as string;
        return (want === Infinity ? got === '' : got.length === want && s.includes(got) && covers(got)) ? null : `window "${got}" is not a shortest covering window (length ${want})`;
      },
    ],
    notes: 'window-count panel compared as a sorted set (the animation lists letters in first-seen order); cell colours and the highlighted letter not checked',
  });
}

/* ------------------------------------------------ 763 partition labels */
{
  type In = { s: string };
  cases.push({
    slug: '763-partition-labels',
    gen: (r): In => ({ s: rstr(r, rint(r, 1, 16), rpick(r, ['ab', 'abc', 'abcdef', 'abcdefgh'])) }),
    oracle: ({ s }) => {
      const last = new Map<string, number>();
      [...s].forEach((c, i) => last.set(c, i));
      const lastItems = [...last].map(([c, v]) => `${c} → ${v}`).sort();
      const sizes: number[] = [];
      let start = 0, end = 0, parts = 0;
      const out: State[] = [];
      // chips: i always while scanning; start / end chips while a partition is open (start is removed right after a cut)
      const snap = (i: number | null, open = false): State => ({
        i, start, end, parts, sizes: sizes.map(String), last: lastItems, pi: i, pstart: open ? start : null, pend: i === null ? null : end,
      });
      out.push(snap(null));
      for (let i = 0; i < s.length; i++) {
        end = Math.max(end, last.get(s[i])!);
        out.push(snap(i, true));
        if (i === end) { sizes.push(i - start + 1); start = i + 1; parts++; out.push(snap(i, false)); }
      }
      out.push(snap(null));
      return out;
    },
    project: (st) => ({
      i: num(st, 'i'), start: num(st, 'start'), end: num(st, 'end'), parts: num(st, 'parts'), sizes: auxAt(st, 1), last: [...auxAt(st, 0)].sort(),
      pi: ptr(st, 'i'), pstart: ptr(st, 'start'), pend: ptr(st, 'end'),
    }),
    invariants: [
      (st, _i, _s, { s }) => (st.title === 'Done' && Number(st.vars.start) !== s.length ? 'partitions do not cover the whole string' : null),
    ],
    notes: 'last-index map compared as a sorted set; cell colours/tones and the start/end pointers are not checked',
  });
}

/* ------------------------------------------------ 81 search in rotated sorted array II */
{
  type In = { nums: number[]; target: number };
  cases.push({
    slug: '81-search-in-rotated-sorted-array-ii',
    gen: (r): In => {
      const n = rint(r, 1, 10);
      const sorted = rarr(r, n, 0, r() < 0.5 ? 3 : 9).sort((a, b) => a - b);
      const k = rint(r, 0, n - 1);
      return { nums: [...sorted.slice(k), ...sorted.slice(0, k)], target: rint(r, -1, 10) };
    },
    oracle: ({ nums, target }: In) => {
      let lo = 0, hi = nums.length - 1, iter = 0;
      const out: State[] = [];
      // pm = the mid pointer chip (only drawn while the probe is being examined); dim = cells outside [lo, hi]; pl / ph = lo / hi chips
      const snap = (mid: number | null, pm: number | null, verdict: string | null = null): State => ({
        lo, mid, hi, iter, verdict, pm, pl: lo < nums.length ? lo : null, ph: hi >= 0 ? hi : null, dim: nums.map((_, i) => i < lo || i > hi),
      });
      out.push(snap(null, null));
      while (lo <= hi) {
        iter++;
        const mid = lo + Math.floor((hi - lo) / 2);
        out.push(snap(mid, mid));
        if (nums[mid] === target) { out.push(snap(mid, mid, 'true')); return out; }
        if (nums[lo] === nums[mid] && nums[mid] === nums[hi]) { lo++; hi--; out.push(snap(mid, null)); continue; }
        if (nums[lo] <= nums[mid]) { // left half sorted
          if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
        } else if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
        out.push(snap(mid, null));
      }
      out.push({ ...snap(null, null, 'false'), pl: null, ph: null }); // Not found: all cells dim and every chip removed
      return out;
    },
    project: (st) => ({
      lo: num(st, 'lo'), mid: num(st, 'mid'), hi: num(st, 'hi'), iter: num(st, 'iterations'), verdict: st.result ? st.result.title : null,
      pm: ptr(st, 'mid'), pl: ptr(st, 'lo'), ph: ptr(st, 'hi'), dim: (sceneOfKind(st, 'array')?.cells ?? []).map((c) => c.state === 'dim'),
    }),
    invariants: [
      (st, _i, _s, { nums, target }) => (st.title === 'Done' || !st.result ? null : st.result.title === String(nums.includes(target)) ? null : `verdict ${st.result.title} but target ${nums.includes(target) ? 'is' : 'is not'} in nums`),
    ],
    notes: 'compass-colour highlights other than "dim" (probe = compare, sorted half = active) are not checked; the half chosen is verified through the resulting lo/hi; the dim (discarded) cells and the lo/mid/hi chips are checked',
  });
}

/* ------------------------------------------------ 83 remove duplicates from sorted list */
{
  type In = { vals: number[] };
  cases.push({
    slug: '83-remove-duplicates-from-sorted-list',
    gen: (r): In => ({ vals: rarr(r, rint(r, 1, 10), -3, r() < 0.5 ? 1 : 6).sort((a, b) => a - b) }),
    oracle: ({ vals }) => {
      const list = [...vals];
      let cur = 0, removed = 0;
      const out: State[] = [];
      const snap = (c: number | null): State => ({
        list: [...list], cur: c === null ? 'null' : list[c], next: c === null ? 'null' : c + 1 < list.length ? list[c + 1] : 'null', removed, p: c,
      });
      out.push(snap(cur));
      while (cur < list.length - 1) {
        out.push(snap(cur)); // compare cur and cur.next
        if (list[cur] === list[cur + 1]) { list.splice(cur + 1, 1); removed++; out.push(snap(cur)); }
        else cur++; // advance (the new position is first shown by the next compare step)
      }
      out.push(snap(null)); // Done
      return out;
    },
    project: (st) => {
      const l = sceneOfKind(st, 'list');
      return { list: (l?.nodes ?? []).map((n) => n.value as number), cur: shown(st, 'curr'), next: shown(st, 'curr.next'), removed: num(st, 'removed'), p: ptr(st, 'curr') };
    },
    notes: 'node colours not checked; the transient "advance" step is not distinguishable from the next compare (the pointer moves between them)',
  });
}

/* ------------------------------------------------ 832 flipping an image */
{
  type In = { image: number[][] };
  cases.push({
    slug: '832-flipping-an-image',
    gen: (r): In => { const n = rint(r, 1, 6); return { image: arr(n, () => arr(n, () => rint(r, 0, 1))) }; },
    oracle: ({ image }: In) => {
      const n = image.length;
      const g = image.map((row) => [...row]);
      const out: State[] = [];
      const snap = (row: number | null, l: number | null, r: number | null): State => ({ row, l, r, grid: g.map((x) => x.join('')) });
      out.push(snap(null, null, null));
      for (let i = 0; i < n; i++) {
        let l = 0, r = n - 1;
        while (l <= r) {
          out.push(snap(i, l, r)); // Row / Pair / Middle step
          if (l < r) { const a = g[i][l], b = g[i][r]; g[i][l] = 1 - b; g[i][r] = 1 - a; } // swap the two cells and invert both
          else g[i][l] = 1 - g[i][l]; // middle cell: just invert
          out.push(snap(i, l, r));
          l++; r--;
        }
      }
      out.push(snap(null, null, null));
      return out;
    },
    project: (st) => ({ row: num(st, 'row'), l: num(st, 'l'), r: num(st, 'r'), grid: gridAll(st).map((row) => row.join('')) }),
    notes: 'cell colours/tones not checked',
  });
}

/* ------------------------------------------------ 912 bubble sort */
{
  type In = { nums: number[] };
  cases.push({
    slug: '912-bubble-sort',
    gen: (r): In => ({ nums: rarr(r, rint(r, 1, 10), -9, r() < 0.4 ? 3 : 20) }),
    oracle: ({ nums }) => {
      const a = [...nums], n = a.length;
      let compares = 0, swaps = 0;
      const out: State[] = [];
      // hot = the highlighted pair ("j:compare" / "j:swap"), pj / pj1 = the j and j+1 pointer chips
      const snap = (i: number | null, j: number | null, locked: number, hot: string[] = []): State => ({
        i, j, compares, swaps, arr: [...a], locked, hot, pj: j, pj1: j === null ? null : j + 1,
      });
      out.push(snap(null, null, 0));
      for (let i = 0; i < n - 1; i++) {
        out.push(snap(i, null, i));
        let swapped = false;
        for (let j = 0; j < n - 1 - i; j++) {
          compares++;
          out.push(snap(i, j, i, [`${j}:compare`, `${j + 1}:compare`]));
          if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; swaps++; swapped = true; out.push(snap(i, j, i, [`${j}:swap`, `${j + 1}:swap`])); }
        }
        out.push(snap(i, null, swapped ? i + 1 : n));
        if (!swapped) break;
      }
      out.push(snap(null, null, n));
      return out;
    },
    project: (st) => ({
      i: num(st, 'pass i'), j: num(st, 'j'), compares: num(st, 'compares'), swaps: num(st, 'swaps'), arr: cellValues(st),
      locked: (sceneOfKind(st, 'array')?.cells ?? []).filter((c) => c.state === 'sorted').length,
      hot: (sceneOfKind(st, 'array')?.cells ?? []).flatMap((c, k) => (c.state === 'compare' || c.state === 'swap' ? [`${k}:${c.state}`] : [])),
      pj: ptr(st, 'j'), pj1: ptr(st, 'j1'),
    }),
    invariants: [
      (st, idx, steps) => {
        const a = cellValues(st), b = cellValues(steps[0]);
        const byNum = (x: string | number, y: string | number) => Number(x) - Number(y);
        if ([...a].sort(byNum).join() !== [...b].sort(byNum).join()) return 'array is no longer a permutation of the input';
        // end-to-end: the last step shows the array sorted ascending
        return idx === steps.length - 1 && [...a].sort(byNum).join() !== a.join() ? 'final array is not sorted' : null;
      },
    ],
    notes: 'the locked suffix is counted from the cells in the "sorted" state (swap highlights sit left of it)',
  });
}

/* ------------------------------------------------ 912 insertion sort */
{
  type In = { nums: number[] };
  cases.push({
    slug: '912-insertion-sort',
    gen: (r): In => ({ nums: rarr(r, rint(r, 1, 10), -9, r() < 0.4 ? 3 : 20) }),
    oracle: ({ nums }) => {
      const a = [...nums], n = a.length;
      let compares = 0, shifts = 0;
      const out: State[] = [];
      // kpos = the key chip, pj = the j chip (drawn while j >= 0 on the pick / compare steps, not on the shift step)
      const snap = (i: number | null, j: number | null, key: number | null, kpos: number | null, pj: number | null = null): State => ({ i, j, key, compares, shifts, arr: [...a], kpos, pj });
      out.push(snap(null, null, null, null));
      for (let i = 1; i < n; i++) {
        const key = a[i];
        let kpos = i, j = i - 1;
        out.push(snap(i, j, key, kpos, j >= 0 ? j : null)); // pick the key
        while (j >= 0) {
          compares++;
          out.push(snap(i, j, key, kpos, j));
          if (!(a[j] > key)) break;
          // shift: the key trades places with the bigger left neighbour (it stays visible at the gap)
          [a[j], a[kpos]] = [a[kpos], a[j]];
          kpos = j; shifts++;
          out.push(snap(i, j, key, kpos));
          j--;
        }
        out.push(snap(i, kpos - 1, key, null)); // insert at kpos
      }
      out.push(snap(null, null, null, null));
      return out;
    },
    project: (st) => ({ i: num(st, 'i'), j: num(st, 'j'), key: num(st, 'key'), compares: num(st, 'compares'), shifts: num(st, 'shifts'), arr: cellValues(st), kpos: ptr(st, 'key'), pj: ptr(st, 'j') }),
    invariants: [
      (st, idx, steps) => {
        const a = cellValues(st), b = cellValues(steps[0]);
        const byNum = (x: string | number, y: string | number) => Number(x) - Number(y);
        if ([...a].sort(byNum).join() !== [...b].sort(byNum).join()) return 'array is no longer a permutation of the input';
        // end-to-end: the last step shows the array sorted ascending
        return idx === steps.length - 1 && [...a].sort(byNum).join() !== a.join() ? 'final array is not sorted' : null;
      },
    ],
    notes: 'design choice: the key travels left by adjacent swaps (so it stays visible in the array) instead of the "lift out, shift, drop" form; the oracle follows the swap form; the sorted-prefix colouring is not checked',
  });
}

/* ------------------------------------------------ 912 heap sort */
{
  type In = { nums: number[] };
  cases.push({
    slug: '912-heap-sort',
    gen: (r): In => ({ nums: rarr(r, rint(r, 1, 10), -9, r() < 0.4 ? 3 : 20) }),
    oracle: ({ nums }) => {
      const a = [...nums], n = a.length;
      let compares = 0, swaps = 0, size = n, phase = 'build heap';
      const out: State[] = [];
      // pi / pl / pr = pointer chips for the parent and the in-heap children (children only while a node is being examined)
      const snap = (i: number | null, kids: string[] = [], pl: number | null = null, pr: number | null = null): State => ({ phase, i, size, compares, swaps, arr: [...a], kids, pi: i, pl, pr });
      const at = (x: number) => (x < size ? a[x] : '—');
      const siftDown = (i0: number) => {
        let i = i0;
        for (;;) {
          const l = 2 * i + 1, r = 2 * i + 2;
          let largest = i;
          if (l < size) { compares++; if (a[l] > a[largest]) largest = l; }
          if (r < size) { compares++; if (a[r] > a[largest]) largest = r; }
          out.push(snap(i, [`parent[${i}] → ${a[i]}`, `left[${l}] → ${at(l)}`, `right[${r}] → ${at(r)}`], l < size ? l : null, r < size ? r : null));
          if (largest === i) return;
          [a[i], a[largest]] = [a[largest], a[i]]; swaps++;
          i = largest;
          out.push(snap(i));
        }
      };
      out.push(snap(null));
      for (let s = Math.floor(n / 2) - 1; s >= 0; s--) { out.push(snap(s)); siftDown(s); }
      out.push(snap(null)); // max-heap built
      phase = 'extract max';
      for (let end = n - 1; end >= 1; end--) {
        [a[0], a[end]] = [a[end], a[0]]; swaps++;
        size = end;
        out.push(snap(0));
        siftDown(0);
      }
      size = 0;
      out.push(snap(null));
      return out;
    },
    project: (st) => ({
      phase: shown(st, 'phase'), i: num(st, 'i'), size: num(st, 'heap size'), compares: num(st, 'compares'), swaps: num(st, 'swaps'), arr: cellValues(st), kids: auxAt(st, 0),
      pi: ptr(st, 'i'), pl: ptr(st, 'l'), pr: ptr(st, 'r'),
    }),
    invariants: [
      (st, idx, steps) => {
        const a = cellValues(st), b = cellValues(steps[0]);
        const byNum = (x: string | number, y: string | number) => Number(x) - Number(y);
        if ([...a].sort(byNum).join() !== [...b].sort(byNum).join()) return 'array is no longer a permutation of the input';
        // end-to-end: the last step shows the array sorted ascending
        return idx === steps.length - 1 && [...a].sort(byNum).join() !== a.join() ? 'final array is not sorted' : null;
      },
    ],
    notes: 'ties keep the parent (strict >), standard textbook sift-down; cell colours not checked; the whole array (heap prefix + sorted suffix) is compared at every step',
  });
}

/* ------------------------------------------------ 94 binary tree inorder traversal */
{
  type In = { tokens: (number | null)[] };
  type Node = { v: number; l: Node | null; r: Node | null };
  cases.push({
    slug: '94-binary-tree-inorder-traversal',
    gen: (r): In => {
      const total = rint(r, 1, 11);
      let made = 0;
      const mk = (depth: number): Node | null => {
        if (made >= total || (depth > 0 && r() < 0.3) || depth > 5) return null;
        made++;
        const nd: Node = { v: rint(r, -9, 30), l: null, r: null };
        nd.l = mk(depth + 1);
        nd.r = mk(depth + 1);
        return nd;
      };
      const root = mk(0) as Node;
      const tokens: (number | null)[] = [];
      const q: (Node | null)[] = [root];
      for (let h = 0; h < q.length; h++) { const nd = q[h]; tokens.push(nd ? nd.v : null); if (nd) q.push(nd.l, nd.r); }
      while (tokens.length && tokens[tokens.length - 1] === null) tokens.pop();
      return { tokens };
    },
    oracle: ({ tokens }) => {
      const nodes: Node[] = [{ v: tokens[0] as number, l: null, r: null }];
      let ti = 1;
      for (let h = 0; h < nodes.length; h++) {
        for (const side of ['l', 'r'] as const) {
          if (ti >= tokens.length) break;
          const t = tokens[ti++];
          if (t !== null) { const c: Node = { v: t, l: null, r: null }; nodes[h][side] = c; nodes.push(c); }
        }
      }
      const idOf = new Map(nodes.map((nd, i) => [nd, i]));
      const stack: Node[] = [], res: number[] = [];
      const label: (string | null)[] = nodes.map(() => null);
      const out: State[] = [];
      const snap = (cur: number | string): State => ({ cur, stack: stack.map((x) => String(x.v)), res: res.map(String), labels: [...label] });
      out.push(snap('root'));
      let cur: Node | null = nodes[0];
      while (cur !== null || stack.length) {
        while (cur !== null) { stack.push(cur); out.push(snap(cur.v)); cur = cur.l; }
        const nd = stack.pop()!;
        res.push(nd.v); label[idOf.get(nd)!] = `#${res.length}`;
        out.push(snap(nd.v));
        cur = nd.r;
        out.push(snap(cur ? cur.v : 'null'));
      }
      out.push(snap('null'));
      return out;
    },
    project: (st) => {
      const t = sceneOfKind(st, 'tree');
      return { cur: shown(st, 'cur'), stack: auxAt(st, 0), res: auxAt(st, 1), labels: (t?.nodes ?? []).map((nd) => t!.labels[nd.id] ?? null) };
    },
    invariants: [
      (st, _i, _s, { tokens }: { tokens: (number | null)[] }) => {
        const sz = Number(st.vars['stack size']), vis = Number(st.vars.visited);
        const total = tokens.filter((x) => x !== null).length;
        return vis <= total && sz <= total ? null : 'stack/visited exceed the node count';
      },
    ],
    notes: 'node colours not checked; tree structure is checked via the traversal order (visit labels per node) and stack contents; the first state shows cur as the word "root" (mirrored in the oracle)',
  });
}

/* ------------------------------------------------ 977 squares of a sorted array */
{
  type In = { nums: number[] };
  cases.push({
    slug: '977-squares-of-a-sorted-array',
    gen: (r): In => ({ nums: rarr(r, rint(r, 1, 10), -9, r() < 0.3 ? 3 : 12).sort((a, b) => a - b) }),
    oracle: ({ nums }) => {
      const n = nums.length;
      const res: (number | null)[] = Array(n).fill(null);
      let l = 0, r = n - 1, k = n - 1;
      const out: State[] = [];
      const snap = (): State => ({ l, r, k, res: res.map((v) => (v === null ? '?' : String(v))), pl: l <= r ? l : null, pr: l <= r ? r : null });
      out.push(snap());
      while (l <= r) {
        const a = nums[l] * nums[l], b = nums[r] * nums[r];
        if (a > b) { res[k] = a; out.push(snap()); l++; } else { res[k] = b; out.push(snap()); r--; }
        k--;
        out.push(snap()); // pointers moved (this is also the Done state after the last placement)
      }
      return out;
    },
    project: (st) => ({ l: num(st, 'l'), r: num(st, 'r'), k: num(st, 'k'), res: auxAt(st, 0), pl: ptr(st, 'l'), pr: ptr(st, 'r') }),
    invariants: [
      (st, _i, _s, { nums }: { nums: number[] }) => {
        const items = auxAt(st, 0).filter((x) => x !== '?').map(Number);
        const sq = nums.map((x) => x * x).sort((a, b) => a - b);
        // filled slots (from the right) must be the largest squares in ascending order
        const want = sq.slice(sq.length - items.length);
        return items.join() === want.join() ? null : `filled result ${items} != ${want}`;
      },
    ],
    notes: 'cell colours (dim / active / found) not checked; ties take the right end (>= rule), standard',
  });
}

/* ------------------------------------------------ shared: min-largest-group-sum family (allocate pages, painters) */
type PartIn = { nums: number[]; k: number };
function partitionOracle({ nums, k }: PartIn, tag: string, impossibleWhenKGtN: boolean): State[] {
  const out: State[] = [];
  const greedyOf = (cap: number) => {
    const sums: number[] = [0], group: number[] = [];
    for (const x of nums) {
      if (sums[sums.length - 1] + x > cap) sums.push(0);
      sums[sums.length - 1] += x;
      group.push(sums.length - 1);
    }
    return { sums, group };
  };
  const mk = (lo: number | null, mid: number | null, hi: number | null, need: number | null, space: string[], sums: string[], groups: (string | null)[], verdict: string | null = null): State => ({ lo, mid, hi, need, k, space, sums, groups, verdict });
  if (impossibleWhenKGtN && k > nums.length) {
    out.push(mk(null, null, null, null, [], [], []));
    out.push(mk(null, null, null, null, [], [], []));
    out.push(mk(null, null, null, null, [], [], [], '-1'));
    return out;
  }
  let lo = Math.max(...nums), hi = nums.reduce((a, b) => a + b, 0);
  const blank = nums.map(() => '·');
  const sp = (mid?: number) => [`lo → ${lo}`, ...(mid !== undefined ? [`mid → ${mid}`] : []), `hi → ${hi}`];
  out.push(mk(lo, null, hi, null, sp(), [], blank));
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    out.push(mk(lo, mid, hi, null, sp(mid), [], blank));
    const { sums, group } = greedyOf(mid);
    const ok = sums.length <= k;
    out.push(mk(lo, mid, hi, sums.length, sp(mid), sums.map((s, i) => `${tag}${i + 1}: ${s}`), group.map((g) => `${tag}${g + 1}`)));
    if (ok) hi = mid; else lo = mid + 1;
    out.push(mk(lo, mid, hi, sums.length, sp(), [], blank));
  }
  const { sums, group } = greedyOf(lo);
  out.push(mk(lo, null, hi, sums.length, [], sums.map((s, i) => `${tag}${i + 1}: ${s}`), group.map((g) => `${tag}${g + 1}`), String(lo)));
  return out;
}
const partitionProject = (needKey: string, kKey: string) => (st: Step): State => {
  const aux = st.aux ?? [];
  const space = aux.find((a) => a.kind === 'map')?.items ?? [];
  const sums = aux.find((a) => a.kind === 'list')?.items ?? [];
  const g = sceneOfKind(st, 'grid');
  return {
    lo: num(st, 'lo'), mid: num(st, 'mid'), hi: num(st, 'hi'), need: num(st, needKey), k: num(st, kKey), space, sums,
    groups: g ? (g.rows[1] ?? []).map((c) => String(c.value)) : [], verdict: st.result ? st.result.title : null,
  };
};
const genPart = (r: () => number, allowKGtN: boolean): PartIn => {
  const n = rint(r, 1, 8);
  return { nums: rarr(r, n, 1, r() < 0.3 ? 5 : 40), k: allowKGtN ? rint(r, 1, 10) : rint(r, 1, n) };
};
const partInvariant = (st: Step, idx: number, steps: Step[], { nums, k }: PartIn): string | null => {
  if (idx === steps.length - 1) { // end-to-end: the answer equals a DP over contiguous splits into at most k groups (min of the max group sum)
    const n = nums.length;
    const pre = [0]; nums.forEach((x) => pre.push(pre[pre.length - 1] + x));
    let dp = arr(n + 1, (i) => (i === 0 ? 0 : pre[i])); // one group
    for (let g = 2; g <= Math.min(k, n); g++) dp = arr(n + 1, (i) => { let best = Infinity; for (let j = 0; j < i; j++) best = Math.min(best, Math.max(dp[j], pre[i] - pre[j])); return i === 0 ? 0 : best; });
    const got = st.result?.title;
    if (got === '-1') { if (!(k > n)) return 'answer -1 although k <= n'; }
    else if (Number(got) !== dp[n]) return `answer ${got} != DP optimum ${dp[n]}`;
  }
  // the greedy sums shown must add up to the whole array and no group may exceed the limit shown in "mid"
  const sums = (st.aux ?? []).find((a) => a.kind === 'list')?.items.map((x) => Number(x.split(': ')[1])) ?? [];
  if (!sums.length) return null;
  const total = nums.reduce((a, b) => a + b, 0);
  if (sums.reduce((a, b) => a + b, 0) !== total) return `group sums ${sums} do not add up to ${total}`;
  const mid = st.vars.mid === '—' ? null : Number(st.vars.mid);
  if (mid !== null && sums.some((s) => s > mid)) return `a group sum exceeds the limit ${mid}`;
  void k;
  return null;
};

/* ------------------------------------------------ gfg allocate minimum pages */
cases.push({
  slug: 'gfg-allocate-minimum-pages',
  gen: (r): PartIn => genPart(r, true),
  oracle: (inp: PartIn) => partitionOracle(inp, 'S', true),
  project: partitionProject('students needed', 'm'),
  invariants: [partInvariant],
  notes: 'cell tones/colours and the red overflow cells are not checked; k > n is the -1 shortcut (3 states); the final answer is also checked against the oracle binary search',
});

/* ------------------------------------------------ ib painters partition */
cases.push({
  slug: 'ib-painters-partition-problem',
  gen: (r): PartIn => genPart(r, true),
  oracle: (inp: PartIn) => partitionOracle(inp, 'P', false),
  project: partitionProject('painters needed', 'painters'),
  invariants: [partInvariant],
  notes: 'cell tones/colours and the red overflow cells are not checked; k may exceed the number of boards (extra painters idle)',
});

/* ------------------------------------------------ gfg minimum platforms */
{
  type In = { arr: number[]; dep: number[] };
  const hhmm = (m: number) => Math.floor(m / 60) * 100 + (m % 60);
  cases.push({
    slug: 'gfg-minimum-platforms',
    gen: (r): In => {
      const n = rint(r, 1, 8);
      const arrM = arr(n, () => rint(r, 0, r() < 0.4 ? 30 : 600));
      const depM = arrM.map((a) => a + rint(r, 0, r() < 0.4 ? 20 : 240));
      return { arr: arrM.map(hhmm), dep: depM.map(hhmm) };
    },
    oracle: ({ arr: a0, dep: d0 }) => {
      const a = [...a0].sort((x, y) => x - y), d = [...d0].sort((x, y) => x - y);
      const n = a.length;
      let i = 0, j = 0, plat = 0, best = 0;
      const out: State[] = [];
      const snap = (): State => ({ i, j, plat, best, arrRow: [...a], depRow: [...d] });
      out.push(snap()); out.push(snap());
      while (i < n) {
        if (a[i] <= d[j]) { plat++; best = Math.max(best, plat); out.push(snap()); i++; }
        else { plat--; out.push(snap()); j++; }
      }
      out.push(snap());
      return out;
    },
    project: (st) => ({
      i: num(st, 'i'), j: num(st, 'j'), plat: num(st, 'platforms now'), best: num(st, 'max platforms'),
      arrRow: gridRowValues(st, 0).map(Number), depRow: gridRowValues(st, 1).map(Number),
    }),
    invariants: [
      (st) => (Number(st.vars['platforms now']) >= 0 && Number(st.vars['platforms now']) <= Number(st.vars['max platforms']) ? null : 'platforms now outside 0..max'),
    ],
    notes: 'grid colours (processed / active) not checked; an arrival at the same minute as a departure takes a platform first (<=)',
  });
}

/* ------------------------------------------------ gfg reverse first k elements of queue */
{
  type In = { queue: number[]; k: number };
  cases.push({
    slug: 'gfg-reverse-first-k-elements-of-queue',
    gen: (r): In => { const n = rint(r, 1, 9); return { queue: rarr(r, n, -9, 30), k: rint(r, 1, n) }; },
    oracle: ({ queue, k }) => {
      const q = [...queue], st: number[] = [];
      const n = q.length;
      let phase = 'start';
      const out: State[] = [];
      const snap = (): State => ({ phase, k, qsize: q.length, ssize: st.length, queue: q.map(String), stack: st.map(String) });
      out.push(snap());
      phase = 'queue → stack';
      for (let i = 0; i < k; i++) { st.push(q.shift()!); out.push(snap()); }
      phase = 'stack → queue';
      for (let i = 0; i < k; i++) { q.push(st.pop()!); out.push(snap()); }
      phase = 'rotate rest';
      for (let i = 0; i < n - k; i++) { q.push(q.shift()!); out.push(snap()); }
      phase = 'done';
      out.push(snap());
      return out;
    },
    project: (st) => ({
      phase: shown(st, 'phase'), k: num(st, 'k'), qsize: num(st, 'queue size'), ssize: num(st, 'stack size'), queue: auxAt(st, 0), stack: auxAt(st, 1),
    }),
    invariants: [
      (st, _i, _s, { queue, k }) => {
        if (st.vars.phase !== 'done') return null;
        const want = [...queue.slice(0, k).reverse(), ...queue.slice(k)].map(String);
        return auxAt(st, 0).join() === want.join() ? null : `final queue ${auxAt(st, 0)} != ${want}`;
      },
    ],
    notes: 'cell colours (moved / on-stack markers on the original strip) not checked',
  });
}

// @@NEXT@@
