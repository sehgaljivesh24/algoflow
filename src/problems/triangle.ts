import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { at, heads, inList, recorder } from './stepKit.ts';

interface In { tri: number[][] }

function parse(raw: string): In {
  const tri = raw.split(/[/|;]/).map((row) => row.split(/[\s,]+/).filter(Boolean).map(Number));
  if (tri.length < 1 || tri.length > 6) throw new Error('Use 1 to 6 rows, separated by "/", e.g. 2 / 3 4 / 6 5 7');
  tri.forEach((row, i) => {
    if (row.length !== i + 1) throw new Error(`Row ${i + 1} must contain exactly ${i + 1} number${i ? 's' : ''}`);
    if (row.some((v) => !Number.isInteger(v) || v < -99 || v > 99)) throw new Error('Use whole numbers between -99 and 99');
  });
  return { tri };
}

function build({ tri }: In): Step[] {
  const R = tri.length;
  const dp = tri.map((row) => [...row]);
  const known = tri.map((row, r) => row.map(() => r === R - 1));
  const steps: Step[] = [];
  let cur: [number, number] | null = null;
  let src: [number, number][] = [];
  let done = false;
  let below: number | string = '—';
  let belowRight: number | string = '—';

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      rows: Array.from({ length: R }, (_, r) => Array.from({ length: R }, (_, c): Cell => {
        const key = `${r},${c}`;
        if (c > r) return { key, value: '', state: 'dim' };
        // known cells show the DP value (best path sum from here down); unknown ones still show the original number
        const state = at(cur, r, c) ? (done ? 'found' : 'active') : inList(src, r, c) ? 'compare' : known[r][c] ? undefined : 'dim';
        return { key, value: dp[r][c], state };
      })),
      rowHeads: heads(R, (i) => `row ${i}`), colHeads: heads(R),
    },
    vars: { row: cur ? cur[0] : '—', col: cur ? cur[1] : '—', 'below': below, 'below-right': belowRight },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Start at the bottom', tag: 'BASE CASE —', desc: `dp[r][c] = cheapest path sum from (r, c) down to the last row. Row ${R - 1} is already final: [${tri[R - 1].join(', ')}].`,
    logic: 'Working bottom-up means each cell only needs the two cells directly beneath it, which are already final.',
    java: [0, 1], py: [0, 1], algo: 0, note: `dp[${R - 1}] = [${tri[R - 1].join(', ')}]`,
  });

  for (let r = R - 2; r >= 0; r--) {
    for (let c = 0; c <= r; c++) {
      cur = [r, c];
      src = [[r + 1, c], [r + 1, c + 1]];
      below = dp[r + 1][c];
      belowRight = dp[r + 1][c + 1];
      done = false;
      say({
        title: `Look below (${r}, ${c})`, tag: 'LOOK BELOW —', desc: `Cell (${r}, ${c}) = ${tri[r][c]}. The two cells beneath hold ${below} and ${belowRight}; the cheaper one is ${Math.min(below, belowRight)}.`,
        logic: 'From (r, c) you may move to (r+1, c) or (r+1, c+1): pick whichever has the smaller remaining sum.', java: [2, 3], py: [2, 3], algo: 1,
        note: `min(dp[${r + 1}][${c}], dp[${r + 1}][${c + 1}]) = min(${below}, ${belowRight}) = ${Math.min(below, belowRight)}`,
      });
      dp[r][c] = tri[r][c] + Math.min(below, belowRight);
      known[r][c] = true;
      done = true;
      say({
        title: `dp[${r}][${c}] = ${tri[r][c]} + ${Math.min(below, belowRight)} = ${dp[r][c]}`, tag: 'COLLAPSE —', desc: `dp[${r}][${c}] = ${tri[r][c]} + ${Math.min(below, belowRight)} = ${dp[r][c]}: the cheapest path from (${r}, ${c}) to the bottom.`,
        logic: 'Own value plus the better of the two continuations.', tone: 'success', java: [4], py: [4], algo: 2,
        note: `dp[${r}][${c}] = ${tri[r][c]} + ${Math.min(below, belowRight)} = ${dp[r][c]}`,
      });
      done = false;
    }
  }

  cur = [0, 0];
  src = [];
  below = '—';
  belowRight = '—';
  done = true;
  say({
    title: 'Done', tag: '✅ Done!', note: `return dp[0][0] = ${dp[0][0]}`, desc: `The minimum top-to-bottom path sum is dp[0][0] = ${dp[0][0]}.`,
    logic: 'After the sweep reaches the apex, its cell contains the best total over all valid paths.', tone: 'success', java: [7], py: [5],
    algo: 3, result: { title: String(dp[0][0]), text: 'Minimum path sum from top to bottom' },
  });
  return steps;
}

export const triangle: ProblemDef<In> = {
  slug: '120-triangle',
  id: '120', title: 'Triangle', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'bottom-up DP',
  statement: 'Given a triangle of numbers, find the minimum path sum from the top to the bottom. From a cell in row i, you may step to the adjacent cells directly below: column j or column j+1 of row i+1.',
  constraints: '1 ≤ rows ≤ 200 (animation input is limited to 6 rows), −10⁴ ≤ value ≤ 10⁴ (here −99..99)',
  examples: [
    { label: '2 / 3 4 / 6 5 7 / 4 1 8 3', input: { tri: [[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]] }, output: '11' },
    { label: '-10', input: { tri: [[-10]] }, output: '-10' },
    { label: '1 / 5 2 / 9 8 3', input: { tri: [[1], [5, 2], [9, 8, 3]] }, output: '6' },
  ],
  inputPlaceholder: 'rows split by "/", e.g. 2 / 3 4 / 6 5 7 / 4 1 8 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Computing', state: 'active' }, { label: 'The two cells below', state: 'compare' }, { label: 'Done (best sum from here)', state: 'found' }, { label: 'Still the original number', state: 'dim' }],
  varLabels: ['row', 'col', 'below', 'below-right'],
  emphasis: ['minimum path sum', 'adjacent cells directly below'],
  phases: [
    { icon: '🌱', label: 'Base: bottom row', tone: 'blue' },
    { icon: '👀', label: 'Look at the two below', tone: 'cyan' },
    { icon: '⬆️', label: 'Collapse upward', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Collapse the triangle from the bottom up',
    text: 'Start from the second-to-last row. Replace each cell with its own value plus the smaller of the two cells below it. When the sweep reaches the top, the apex holds the answer.',
  },
  java: [
    'public int minimumTotal(List<List<Integer>> t) {',
    '    int[][] dp = t.stream().map(row -> row.stream().mapToInt(Integer::intValue).toArray()).toArray(int[][]::new);   // copy; last row is already final',
    '    for (int r = t.size() - 2; r >= 0; r--) {',
    '        for (int c = 0; c <= r; c++) {',
    '            dp[r][c] = t.get(r).get(c) + Math.min(dp[r + 1][c], dp[r + 1][c + 1]);',
    '        }',
    '    }',
    '    return dp[0][0];',
    '}',
  ],
  python: [
    'def minimum_total(t):',
    '    dp = [row[:] for row in t]  # last row is already final',
    '    for r in range(len(t) - 2, -1, -1):',
    '        for c in range(r + 1):',
    '            dp[r][c] = t[r][c] + min(dp[r + 1][c], dp[r + 1][c + 1])',
    '    return dp[0][0]',
  ],
  algorithm: [
    'Copy the triangle; the bottom row is the base case',
    'Move up one row at a time, starting at the second-to-last',
    'dp[r][c] = value + min(dp[r+1][c], dp[r+1][c+1])',
    'Return dp[0][0]',
  ],
  complexity: [{ label: 'Time', value: 'O(n²) for n rows' }, { label: 'Space', value: 'O(n²), or O(n) with one reused row' }],
  why: 'Bottom-up removes the need to remember which branch is best from the top: each cell stores the best total of every path that starts there, and a path from (r, c) must continue through one of its two lower neighbours. Taking the minimum of those already-optimal values keeps optimality, and the apex ends up with the global best.',
};
