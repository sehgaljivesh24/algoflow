/**
 * Shared animation of the "interval table" DP used by the palindromic problems: dp[i][j] describes s[i..j], filled by
 * increasing interval length so that dp[i+1][j-1], dp[i+1][j] and dp[i][j-1] are always ready.
 */
import type { Cell, Step } from '../engine/types.ts';
import { capSteps, heads, recorder } from './stepKit.ts';

export interface PalIn { s: string }

export function parsePalString(raw: string, max: number, min = 1): PalIn {
  const s = raw.trim();
  if (s.length < min || s.length > max) throw new Error(`Use ${min === max ? max : `${min} to ${max}`} letters, e.g. bbbab`);
  if (!/^[a-z]+$/.test(s)) throw new Error('Use lowercase letters a–z only (no spaces)');
  return { s };
}

type Lines = { j: number[]; p: number[] };

export interface PalSpec {
  intro: { title: string; desc: string; logic: string };
  baseVal: number;
  baseDesc: string;
  baseLogic: string;
  /** diag = dp[i+1][j-1] (0 for an empty inside) */
  match: (diag: number) => number;
  matchDesc: (a: string, diag: number, v: number, len: number) => string;
  matchLogic: string;
  mismatch: (down: number, left: number) => number;
  mismatchDesc: (a: string, b: string, down: number, left: number, v: number) => string;
  mismatchLogic: string;
  doneDesc: (ans: number) => string;
  doneLogic: string;
  resultText: string;
  lines: { intro: Lines; base: Lines; match: Lines; mismatch: Lines; done: Lines };
}

export function buildPalInterval({ s }: PalIn, spec: PalSpec): Step[] {
  const n = s.length;
  const dp: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
  const steps: Step[] = [];
  let cur: [number, number] | null = null;
  let src: [number, number][] = [];
  let done = false;
  let len: number | string = '—';

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      variant: 'table' as const,
      rows: dp.map((row, r) => row.map((v, c): Cell => {
        if (c < r) return { key: `${r},${c}`, value: '·', state: 'dim' };
        const here = !!cur && cur[0] === r && cur[1] === c;
        const isSrc = src.some(([a, b]) => a === r && b === c);
        return { key: `${r},${c}`, value: v === null ? '?' : v, state: here ? (done ? 'found' : 'active') : isSrc ? 'compare' : v === null ? 'dim' : undefined };
      })),
      rowHeads: [...s].map((ch, i) => `i=${i} ${ch}`),
      colHeads: heads(n, (j) => `${s[j]}${j}`),
    },
    vars: { i: cur ? cur[0] : '—', j: cur ? cur[1] : '—', len, ends: cur && cur[0] !== cur[1] ? `${s[cur[0]]} vs ${s[cur[1]]}` : '—' },
  });
  const say = recorder(steps, snap);

  say({ ...spec.intro, java: spec.lines.intro.j, py: spec.lines.intro.p, algo: 0, tag: 'DEFINE —', note: `s = "${s}", dp is ${n}×${n}, answer = dp[0][${n - 1}]` });

  for (let i = 0; i < n; i++) dp[i][i] = spec.baseVal;
  len = 1;
  say({
    title: 'Base: every single letter', desc: spec.baseDesc, logic: spec.baseLogic, tone: 'success', java: spec.lines.base.j, py: spec.lines.base.p, algo: 1,
    tag: 'BASE CASE —', note: `dp[i][i] = ${spec.baseVal} for i = 0..${n - 1}`,
  });

  for (let L = 2; L <= n; L++) {
    for (let i = 0; i + L - 1 < n; i++) {
      const j = i + L - 1;
      cur = [i, j];
      len = L;
      done = false;
      if (s[i] === s[j]) {
        const diag = L === 2 ? 0 : dp[i + 1][j - 1]!;
        src = L === 2 ? [] : [[i + 1, j - 1]];
        dp[i][j] = spec.match(diag);
        done = true;
        say({
          title: `"${s.slice(i, j + 1)}": '${s[i]}' = '${s[j]}' → ${dp[i][j]}`, desc: spec.matchDesc(s[i], diag, dp[i][j]!, L),
          logic: spec.matchLogic, tone: 'success', java: spec.lines.match.j, py: spec.lines.match.p, algo: 2,
          tag: 'ENDS MATCH —', note: `s[${i}] = s[${j}] = '${s[i]}' → dp[${i}][${j}] = ${dp[i][j]} (inside ${L === 2 ? 'empty' : `dp[${i + 1}][${j - 1}] = ${diag}`})`,
        });
      } else {
        src = [[i + 1, j], [i, j - 1]];
        const down = dp[i + 1][j]!;
        const left = dp[i][j - 1]!;
        dp[i][j] = spec.mismatch(down, left);
        done = true;
        say({
          title: `"${s.slice(i, j + 1)}": '${s[i]}' ≠ '${s[j]}' → ${dp[i][j]}`, desc: spec.mismatchDesc(s[i], s[j], down, left, dp[i][j]!),
          logic: spec.mismatchLogic, java: spec.lines.mismatch.j, py: spec.lines.mismatch.p, algo: 3,
          tag: 'ENDS DIFFER —', note: `s[${i}] = '${s[i]}' ≠ s[${j}] = '${s[j]}' → dp[${i}][${j}] = ${dp[i][j]} from dp[${i + 1}][${j}] = ${down}, dp[${i}][${j - 1}] = ${left}`,
        });
      }
    }
  }

  cur = [0, n - 1];
  src = [];
  done = true;
  len = n;
  const ans = dp[0][n - 1]!;
  say({
    title: 'Done', tag: '✅ Done!', note: `return dp[0][${n - 1}] = ${ans}`, desc: spec.doneDesc(ans), logic: spec.doneLogic, tone: 'success', java: spec.lines.done.j, py: spec.lines.done.p, algo: 4,
    result: { title: String(ans), text: spec.resultText },
  });
  return steps;
}

export { capSteps };
