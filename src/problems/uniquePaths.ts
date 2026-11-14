import type { ProblemDef, Step } from '../engine/types.ts';
import { plural, verb } from './text.ts';
import { at, heads, inList, recorder, tableRows } from './stepKit.ts';

interface In { m: number; n: number }

function parse(raw: string): In {
  const p = raw.split(/[\s,;x×]+/).filter(Boolean).map(Number);
  if (p.length !== 2 || p.some((x) => !Number.isInteger(x))) throw new Error('Format: rows cols — e.g. 3 7');
  const [m, n] = p;
  if (m < 1 || m > 7 || n < 1 || n > 9) throw new Error('Use 1-7 rows and 1-9 columns');
  return { m, n };
}

function build({ m, n }: In): Step[] {
  const dp: (number | null)[][] = Array.from({ length: m }, () => Array(n).fill(null));
  const steps: Step[] = [];
  let cur: [number, number] | null = null;
  let src: [number, number][] = [];
  let done = false;
  let up: number | string = '—';
  let left: number | string = '—';

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: tableRows(dp, (r, c) => (at(cur, r, c) ? (done ? 'found' : 'active') : inList(src, r, c) ? 'compare' : undefined)),
      rowHeads: heads(m, (i) => `r${i}`), colHeads: heads(n, (i) => `c${i}`),
    },
    vars: { r: cur ? cur[0] : '—', c: cur ? cur[1] : '—', 'dp[r-1][c]': up, 'dp[r][c-1]': left },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', tag: 'DEFINE —', desc: `dp[r][c] = number of ways to reach cell (r, c) from the top-left corner moving only right or down. The grid is ${m}×${n}.`,
    logic: 'A robot can enter a cell only from above or from the left, so those two counts add up.',
    java: [0, 1], py: [0, 1], algo: 0, note: `dp is ${m}×${n}, goal cell = dp[${m - 1}][${n - 1}]`,
  });

  for (let r = 0; r < m; r++) dp[r][0] = 1;
  cur = null;
  say({
    title: 'First column = 1', tag: 'BASE CASE —', desc: `Down the left edge there is only one route (straight down), so dp[0..${m - 1}][0] = 1.`,
    logic: 'No cell sits to the left of column 0, so only the "from above" route exists.', tone: 'success', java: [2], py: [1], algo: 1,
    note: `dp[r][0] = 1 for r = 0..${m - 1}`,
  });
  for (let c = 0; c < n; c++) dp[0][c] = 1;
  say({
    title: 'First row = 1', tag: 'BASE CASE —', desc: `Along the top edge there is only one route (straight right), so dp[0][0..${n - 1}] = 1.`,
    logic: 'Likewise, nothing sits above row 0, so only the "from the left" route exists.', tone: 'success', java: [3], py: [1], algo: 1,
    note: `dp[0][c] = 1 for c = 0..${n - 1}`,
  });

  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) {
      cur = [r, c];
      src = [[r - 1, c], [r, c - 1]];
      up = dp[r - 1][c]!;
      left = dp[r][c - 1]!;
      dp[r][c] = up + left;
      done = true;
      say({
        title: `dp[${r}][${c}] = ${dp[r][c]}`, tag: 'FILL CELL —', desc: `Cell (${r}, ${c}): ${plural(up, 'way')} from above + ${left} from the left = ${plural(dp[r][c]!, 'way')}.`,
        logic: 'The two sets of routes end with a different final move, so they never overlap and the counts simply add.', java: [5, 6], py: [3, 4], algo: 2,
        note: `dp[${r}][${c}] = ${up} + ${left} = ${dp[r][c]}`,
      });
      done = false;
    }
  }

  cur = [m - 1, n - 1];
  src = [];
  up = '—';
  left = '—';
  done = true;
  say({
    title: 'Done', tag: '✅ Done!', desc: `dp[${m - 1}][${n - 1}] = ${dp[m - 1][n - 1]}: there ${verb(dp[m - 1][n - 1]!, 'is', 'are')} ${plural(dp[m - 1][n - 1]!, 'unique path')} in a ${m}×${n} grid.`,
    logic: 'The bottom-right cell holds the number of routes to the finish.', tone: 'success', java: [9], py: [5], note: `return dp[${m - 1}][${n - 1}] = ${dp[m - 1][n - 1]}`,
    algo: 3, result: { title: String(dp[m - 1][n - 1]), text: `Unique paths in a ${m}×${n} grid` },
  });
  return steps;
}

export const uniquePaths: ProblemDef<In> = {
  slug: '62-unique-paths',
  id: '62', title: 'Unique Paths', difficulty: 'Easy', category: 'Dynamic Programming', tag: '2D DP',
  statement: 'A robot starts in the top-left corner of an m×n grid and can only move right or down. Count the distinct paths to the bottom-right corner.',
  constraints: '1 ≤ m, n ≤ 100 (animation input is limited to 7 rows × 9 columns)',
  examples: [
    { label: '3 × 7', input: { m: 3, n: 7 }, output: '28' },
    { label: '3 × 2', input: { m: 3, n: 2 }, output: '3' },
    { label: '4 × 5', input: { m: 4, n: 5 }, output: '35' },
  ],
  inputPlaceholder: 'rows cols, e.g. 3 7',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Computing', state: 'active' }, { label: 'Sources (above, left)', state: 'compare' }, { label: 'Done', state: 'found' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['r', 'c', 'dp[r-1][c]', 'dp[r][c-1]'],
  emphasis: ['only move right or down', 'distinct paths'],
  phases: [
    { icon: '🧱', label: 'Define dp[r][c]', tone: 'blue' },
    { icon: '🌱', label: 'Base: first row & column', tone: 'blue' },
    { icon: '➕', label: 'Fill: above + left', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Each cell = paths from above + paths from the left',
    text: 'Set the first row and first column to 1. Every other cell is dp[r−1][c] + dp[r][c−1]. Fill row by row; the corner is the answer.',
  },
  java: [
    'public int uniquePaths(int m, int n) {',
    '    int[][] dp = new int[m][n];',
    '    for (int r = 0; r < m; r++) dp[r][0] = 1;',
    '    for (int c = 0; c < n; c++) dp[0][c] = 1;',
    '    for (int r = 1; r < m; r++) {',
    '        for (int c = 1; c < n; c++) {',
    '            dp[r][c] = dp[r - 1][c] + dp[r][c - 1];',
    '        }',
    '    }',
    '    return dp[m - 1][n - 1];',
    '}',
  ],
  python: [
    'def unique_paths(m, n):',
    '    dp = [[1] * n for _ in range(m)]  # first row and column are 1',
    '    for r in range(1, m):',
    '        for c in range(1, n):',
    '            dp[r][c] = dp[r - 1][c] + dp[r][c - 1]',
    '    return dp[m - 1][n - 1]',
  ],
  algorithm: [
    'Create an m×n table; dp[r][c] counts paths to cell (r, c)',
    'Fill the first row and the first column with 1',
    'For every other cell: dp[r][c] = dp[r−1][c] + dp[r][c−1]',
    'Return dp[m−1][n−1]',
  ],
  complexity: [{ label: 'Time', value: 'O(m · n)' }, { label: 'Space', value: 'O(m · n), or O(n) with one rolling row' }],
  why: 'Every path to (r, c) ends with either a down move from (r−1, c) or a right move from (r, c−1); these are disjoint groups, so the counts add. Filling in row-major order ensures both neighbours are known. The result also equals the binomial coefficient C(m+n−2, m−1), a handy cross-check.',
};
