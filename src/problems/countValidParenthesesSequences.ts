import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { find, gc, heads, parseOne, recorder } from './dpAdvKit.ts';

interface In { n: number }

const java = [
  'public long countSequences(int n) {',
  '    long[][] dp = new long[n + 1][n + 1];   // dp[i][j]: i "(" and j ")" placed, never more ")" than "("',
  '    dp[0][0] = 1;',
  '    for (int i = 0; i <= n; i++) {',
  '        for (int j = 0; j <= i; j++) {',
  '            if (i > 0 && j < i) dp[i][j] += dp[i - 1][j];   // last character was "("',
  '            if (j > 0) dp[i][j] += dp[i][j - 1];            // last character was ")"',
  '        }',
  '    }',
  '    return dp[n][n];',
  '}',
];
const python = [
  'def count_sequences(n):',
  '    dp = [[0] * (n + 1) for _ in range(n + 1)]   # dp[i][j]: i "(" and j ")" placed',
  '    dp[0][0] = 1',
  '    for i in range(n + 1):',
  '        for j in range(i + 1):                    # never more ")" than "("',
  '            if i > 0 and j < i:',
  '                dp[i][j] += dp[i - 1][j]          # last character was "("',
  '            if j > 0:',
  '                dp[i][j] += dp[i][j - 1]          # last character was ")"',
  '    return dp[n][n]',
];
const J = { def: find(java, 'long[][] dp'), base: find(java, 'dp[0][0] = 1'), cell: find(java, 'for (int j', 'if (i > 0', 'if (j > 0'), diag: find(java, 'for (int i'), ret: find(java, 'return dp[n][n]') };
const P = { def: find(python, 'dp = [[0]'), base: find(python, 'dp[0][0] = 1'), cell: find(python, 'for j in', 'if i > 0', 'if j > 0'), diag: find(python, 'for i in'), ret: find(python, 'return dp[n][n]') };

function build({ n }: In): Step[] {
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, () => Array(n + 1).fill(null));
  const steps: Step[] = [];
  let cur: [number, number] | null = null;
  let src: [number, number][] = [];
  let done = false;
  let diag: string[] = [];
  let fromOpen: number | string = '—';
  let fromClose: number | string = '—';

  const snap = () => ({
    scene: {
      kind: 'grid' as const, variant: 'table' as const,
      rows: dp.map((row, i) => row.map((v, j) => {
        if (j > i) return gc(`${i},${j}`, '×', 'dim');
        let s: CellState | undefined;
        if (cur && cur[0] === i && cur[1] === j) s = done ? 'found' : 'active';
        else if (src.some(([a, b]) => a === i && b === j)) s = 'compare';
        else if (v === null) s = 'dim';
        return gc(`${i},${j}`, v === null ? '?' : v, s);
      })),
      rowHeads: heads(n + 1, (i) => `${i} "("`), colHeads: heads(n + 1, (j) => `${j} ")"`),
    },
    aux: [{ title: 'diagonal dp[i][i] = Catalan numbers', kind: 'list' as const, items: [...diag] }],
    vars: { i: cur ? cur[0] : '—', j: cur ? cur[1] : '—', 'from "("': fromOpen, 'from ")"': fromClose },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', desc: `dp[i][j] = number of valid prefixes made of i "(" and j ")". Cells with j > i are impossible (a ")" with nothing to close), so the table is a triangle. We want dp[${n}][${n}].`,
    logic: 'A sequence is valid when no prefix has more ")" than "(" and the totals are equal. Counting prefixes cell by cell enforces the first rule for free.',
    java: J.def, py: P.def, algo: 0, tag: 'DEFINE —', note: `dp is ${n + 1}×${n + 1} (triangle j ≤ i), goal dp[${n}][${n}]`,
  });
  dp[0][0] = 1;
  cur = [0, 0];
  done = true;
  diag = ['dp[0][0] = 1'];
  say({
    title: 'Base case dp[0][0] = 1', desc: 'The empty prefix is the one way to place nothing, so dp[0][0] = 1.',
    logic: 'Every valid prefix grows from this single starting point, one character at a time.', tone: 'success', java: J.base, py: P.base, algo: 1,
    tag: 'BASE CASE —', note: 'dp[0][0] = 1',
  });

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= i; j++) {
      if (i === 0 && j === 0) continue;
      cur = [i, j];
      done = false;
      src = [];
      const a = i > 0 && j < i ? dp[i - 1][j]! : 0;
      const b = j > 0 ? dp[i][j - 1]! : 0;
      if (i > 0 && j < i) src.push([i - 1, j]);
      if (j > 0) src.push([i, j - 1]);
      fromOpen = i > 0 && j < i ? a : '—';
      fromClose = j > 0 ? b : '—';
      dp[i][j] = a + b;
      done = true;
      if (i === j) diag.push(`dp[${i}][${i}] = ${dp[i][j]}`);
      say({
        title: `dp[${i}][${j}] = ${dp[i][j]}`,
        desc: `${i > 0 && j < i ? `Append "(" to a prefix with ${plural(i - 1, 'open')}, ${plural(j, 'close')}: ${plural(a, 'way')}.` : i > 0 ? `A "(" can't be the last character here: the previous prefix would have more ")" than "(".` : ''}${j > 0 ? `${i > 0 ? ' ' : ''}Append ")" to a prefix with ${plural(i, 'open')}, ${plural(j - 1, 'close')}: ${plural(b, 'way')}.` : ''} Total ${a} + ${b} = ${dp[i][j]}.`,
        logic: 'The last character was either "(" or ")", and the two cases never overlap, so the counts add.',
        tone: 'info', java: J.cell, py: P.cell, algo: 2,
        tag: i === j ? 'DIAGONAL —' : 'FILL CELL —',
        note: `dp[${i}][${j}] = ${i > 0 && j < i ? `dp[${i - 1}][${j}] = ${a}` : '0'} + ${j > 0 ? `dp[${i}][${j - 1}] = ${b}` : '0'} = ${dp[i][j]}`,
      });
    }
  }

  cur = [n, n];
  src = [];
  done = true;
  say({
    title: 'Done', tag: '✅ Done!', note: `return dp[${n}][${n}] = ${dp[n][n]}`, desc: `dp[${n}][${n}] = ${dp[n][n]} valid sequences of ${n} pair${n === 1 ? '' : 's'} of brackets. The diagonal read down is 1, 1, 2, 5, 14, 42, … — the Catalan numbers again.`,
    logic: 'This lattice-path table and the root-split convolution count the same objects, so they must agree.', tone: 'success',
    java: J.ret, py: P.ret, algo: 3, result: { title: String(dp[n][n]), text: 'Valid sequences' },
  });
  return steps;
}

export const countValidParenthesesSequences: ProblemDef<In> = {
  slug: 'cp-count-valid-parentheses-sequences',
  id: 'CP', title: 'Count Valid Parentheses Sequences', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'Catalan · ballot table',
  statement: 'Given n pairs of round brackets, count how many different well-formed bracket strings of length 2n exist (this is the number of strings LeetCode 22, Generate Parentheses, would list).',
  constraints: '1 ≤ n ≤ 18 for 64-bit answers (animation input: 1 ≤ n ≤ 8)',
  examples: [
    { label: 'n = 3', input: { n: 3 }, output: '5' },
    { label: 'n = 1', input: { n: 1 }, output: '1' },
    { label: 'n = 5', input: { n: 5 }, output: '42' },
  ],
  inputPlaceholder: 'n pairs, e.g. 4',
  parseInput: (raw) => ({ n: parseOne(raw, 'the number of pairs', 1, 8, '4') }),
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Cell being computed', state: 'active' }, { label: 'Cells it adds up', state: 'compare' }, { label: 'Finished cell', state: 'found' }, { label: 'Not yet / impossible', state: 'dim' }],
  varLabels: ['i', 'j', 'from "("', 'from ")"'],
  emphasis: ['valid', 'bracket sequences'],
  phases: [
    { icon: '🧱', label: 'Define the triangle dp[i][j]', tone: 'blue' },
    { icon: '🌱', label: 'Base: dp[0][0] = 1', tone: 'blue' },
    { icon: '➕', label: 'Cell = above + left', tone: 'cyan' },
    { icon: '✅', label: 'Done: dp[n][n]', tone: 'green' },
  ],
  approach: {
    title: 'Count lattice paths that stay on one side of the diagonal',
    text: 'Treat "(" as a step down and ")" as a step right. dp[i][j] counts the ways to reach (i opens, j closes) without ever having more closes than opens. A cell is the sum of the cell above (last char "(") and the cell to its left (last char ")"). The corner dp[n][n] is the answer.',
  },
  java, python,
  algorithm: [
    'dp[i][j] = valid prefixes with i opens and j closes (needs j ≤ i)',
    'Base: dp[0][0] = 1',
    'Fill row by row: dp[i][j] = dp[i−1][j] (if j < i) + dp[i][j−1]',
    'Return dp[n][n]',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(n²)' }],
  why: 'Every valid bracket string is a path from (0,0) to (n,n) that never crosses above the diagonal j = i, and every such path is a valid string, so the strings are in one-to-one correspondence with those paths. The last step of a path came from exactly one of two neighbours, so each cell is the sum of two earlier cells, and restricting the table to j ≤ i enforces the "never more closes than opens" rule. This yields the same Catalan numbers as the root-split convolution, from a different angle.',
};
