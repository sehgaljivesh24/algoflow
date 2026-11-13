import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { at, heads, inList, recorder } from './stepKit.ts';

interface In { grid: string[] }

function parse(raw: string): In {
  const grid = raw.split(/[\s,;]+/).filter(Boolean);
  if (!grid.length || grid.some((r) => /[^01]/.test(r))) throw new Error('Rows of 0 (free) and 1 (obstacle) separated by spaces, e.g. 000 010 000');
  if (grid.some((r) => r.length !== grid[0].length)) throw new Error('Every row must have the same length');
  if (grid.length > 7 || grid[0].length > 9) throw new Error('Use at most 7 rows and 9 columns');
  return { grid };
}

function build({ grid }: In): Step[] {
  const m = grid.length;
  const n = grid[0].length;
  const blocked = grid.map((row) => [...row].map((ch) => ch === '1'));
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
      rows: dp.map((row, r) => row.map((v, c): Cell => {
        const key = `${r},${c}`;
        if (blocked[r][c]) return { key, value: '✕', state: at(cur, r, c) ? 'active' : 'error' };
        const state = at(cur, r, c) ? (done ? 'found' : 'active') : inList(src, r, c) ? 'compare' : v === null ? 'dim' : undefined;
        return { key, value: v === null ? '?' : v, state };
      })),
      rowHeads: heads(m, (i) => `r${i}`), colHeads: heads(n, (i) => `c${i}`),
    },
    vars: { r: cur ? cur[0] : '—', c: cur ? cur[1] : '—', 'from above': up, 'from left': left },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Define the table', tag: 'DEFINE —', desc: `dp[r][c] = ways to reach cell (r, c). Red ✕ cells are obstacles and can never be entered, so their count is 0.`,
    logic: 'Same recurrence as the plain grid, except an obstacle forces the cell\'s count to 0.',
    java: [0, 1, 2], py: [0, 1, 2], algo: 0, note: `${m}×${n} grid, ${blocked.flat().filter(Boolean).length} obstacle(s)`,
  });

  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      cur = [r, c];
      src = [];
      up = '—';
      left = '—';
      if (blocked[r][c]) {
        dp[r][c] = 0;
        say({
          title: `Obstacle at (${r}, ${c})`, tag: 'OBSTACLE —', desc: `Cell (${r}, ${c}) is blocked, so dp[${r}][${c}] = 0: no path can pass through it.`,
          logic: 'Zero ways here also zeroes out whatever depends on this cell.', tone: 'warn', java: [6], py: [6, 7], algo: 1,
          note: `g[${r}][${c}] == 1 → dp[${r}][${c}] = 0`, alert: `Obstacle at (${r}, ${c}): zero paths enter this cell, so cells that depend on it lose those routes.`,
        });
        continue;
      }
      if (r === 0 && c === 0) {
        dp[r][c] = 1;
        done = true;
        say({
          title: 'Start cell dp[0][0] = 1', tag: 'BASE CASE —', desc: 'One way to be at the start: do nothing, so dp[0][0] = 1.',
          logic: 'This is the base case that seeds every other count.', tone: 'success', java: [3], py: [3], algo: 1, note: 'dp[0][0] = 1 (start is free)',
        });
        done = false;
        continue;
      }
      const a = r > 0 ? dp[r - 1][c]! : 0;
      const b = c > 0 ? dp[r][c - 1]! : 0;
      up = r > 0 ? a : 'edge';
      left = c > 0 ? b : 'edge';
      src = [...(r > 0 ? [[r - 1, c] as [number, number]] : []), ...(c > 0 ? [[r, c - 1] as [number, number]] : [])];
      dp[r][c] = a + b;
      done = true;
      say({
        title: `dp[${r}][${c}] = ${dp[r][c]}`, tag: 'FILL CELL —', desc: `Cell (${r}, ${c}): from above ${r > 0 ? a : 'none (top edge)'}, from the left ${c > 0 ? b : 'none (left edge)'}. Total ${a} + ${b} = ${a + b}.`,
        logic: 'Sum the routes from the two neighbours; blocked neighbours contribute 0.', java: [8, 9, 10], py: [8, 9], algo: 2,
        note: `dp[${r}][${c}] = ${a} + ${b} = ${a + b}`,
      });
      done = false;
    }
  }

  cur = [m - 1, n - 1];
  src = [];
  up = '—';
  left = '—';
  done = true;
  const ans = dp[m - 1][n - 1]!;
  say({
    title: 'Done', tag: ans === 0 ? '❌ Blocked!' : '✅ Done!', note: `return dp[${m - 1}][${n - 1}] = ${ans}`,
    desc: ans === 0 ? 'The finish cannot be reached: dp[m−1][n−1] = 0 paths.' : `dp[${m - 1}][${n - 1}] = ${ans}: ${ans} path${ans === 1 ? '' : 's'} avoid every obstacle.`,
    logic: blocked[m - 1][n - 1] || blocked[0][0] ? 'The start or the finish is blocked, so there is no path.' : 'The bottom-right cell holds the answer.',
    tone: ans ? 'success' : 'warn', java: [13], py: [10], algo: 3,
    result: { title: String(ans), text: `Paths from top-left to bottom-right` },
  });
  return steps;
}

export const uniquePathsII: ProblemDef<In> = {
  slug: '63-unique-paths-ii',
  id: '63', title: 'Unique Paths II', difficulty: 'Medium', category: 'Dynamic Programming', tag: '2D DP + obstacles',
  statement: 'Like Unique Paths, but some cells are obstacles (1) that cannot be stepped on; free cells are 0. A robot moving only right or down starts top-left. Count the paths to the bottom-right corner.',
  constraints: '1 ≤ m, n ≤ 100 (animation input is limited to 7 rows × 9 columns)',
  examples: [
    { label: '000 010 000', input: { grid: ['000', '010', '000'] }, output: '2' },
    { label: '01 00', input: { grid: ['01', '00'] }, output: '1' },
    { label: '0000 0100 0010 0000', input: { grid: ['0000', '0100', '0010', '0000'] }, output: '4' },
  ],
  inputPlaceholder: 'rows of 0/1, e.g. 000 010 000',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Computing', state: 'active' }, { label: 'Sources', state: 'compare' }, { label: 'Done', state: 'found' }, { label: 'Obstacle', state: 'error' }, { label: 'Not yet', state: 'dim' }],
  varLabels: ['r', 'c', 'from above', 'from left'],
  emphasis: ['obstacles', 'right or down', 'Count the paths'],
  phases: [
    { icon: '🧱', label: 'Define dp[r][c]', tone: 'blue' },
    { icon: '🚧', label: 'Start & obstacles', tone: 'orange' },
    { icon: '➕', label: 'Fill: above + left', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Grid DP where obstacles count as zero',
    text: 'dp[0][0] = 1 (unless blocked). For each cell: 0 if it is an obstacle, otherwise dp[r−1][c] + dp[r][c−1], treating off-grid neighbours as 0.',
  },
  java: [
    'public int uniquePathsWithObstacles(int[][] g) {',
    '    int m = g.length, n = g[0].length;',
    '    int[][] dp = new int[m][n];',
    '    dp[0][0] = g[0][0] == 1 ? 0 : 1;',
    '    for (int r = 0; r < m; r++) {',
    '        for (int c = 0; c < n; c++) {',
    '            if (g[r][c] == 1) { dp[r][c] = 0; continue; }',
    '            if (r == 0 && c == 0) continue;',
    '            int up = r > 0 ? dp[r - 1][c] : 0;',
    '            int left = c > 0 ? dp[r][c - 1] : 0;',
    '            dp[r][c] = up + left;',
    '        }',
    '    }',
    '    return dp[m - 1][n - 1];',
    '}',
  ],
  python: [
    'def unique_paths_with_obstacles(g):',
    '    m, n = len(g), len(g[0])',
    '    dp = [[0] * n for _ in range(m)]',
    '    dp[0][0] = 0 if g[0][0] else 1',
    '    for r in range(m):',
    '        for c in range(n):',
    '            if g[r][c]:',
    '                dp[r][c] = 0',
    '            elif r or c:',
    '                dp[r][c] = (dp[r - 1][c] if r else 0) + (dp[r][c - 1] if c else 0)',
    '    return dp[m - 1][n - 1]',
  ],
  algorithm: [
    'Create the dp table; obstacles will hold 0',
    'Seed dp[0][0] = 1 if the start is free, and mark obstacles as 0',
    'Other free cells: dp = dp[above] + dp[left] (off-grid counts as 0)',
    'Return dp[m−1][n−1]',
  ],
  complexity: [{ label: 'Time', value: 'O(m · n)' }, { label: 'Space', value: 'O(m · n), or O(n) rolling' }],
  why: 'A path to a free cell must arrive from above or from the left, and an obstacle neighbour simply contributes zero paths. Setting blocked cells to 0 propagates that automatically, so no explicit path search around obstacles is needed.',
};
