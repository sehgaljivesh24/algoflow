import type { Cell, LogicTone, ProblemDef, Step } from '../engine/types.ts';

interface In { n: number }

function parse(raw: string): In {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 1 || n > 7) throw new Error('Enter a whole number n between 1 and 7');
  return { n };
}

function build({ n }: In): Step[] {
  const g: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const DR = [0, 1, 0, -1];
  const DC = [1, 0, -1, 0];
  const NAMES = ['right', 'down', 'left', 'up'];
  let r = 0, c = 0, d = 0, k = 1;
  let cur: [number, number] | null = null;
  const steps: Step[] = [];

  const rows = (): Cell[][] =>
    g.map((row, i) => row.map((v, j) => ({
      key: `${i},${j}`, value: v === 0 ? '·' : v,
      state: cur && cur[0] === i && cur[1] === j ? 'active' : v === 0 ? 'dim' : 'sorted',
    })));
  const push = (title: string, desc: string, logic: string, tone: LogicTone, j: number[], p: number[], a: number, result?: Step['result']) =>
    steps.push({
      title, desc, scene: { kind: 'grid', rows: rows(), rowHeads: g.map((_, i) => String(i)), colHeads: g.map((_, i) => String(i)) },
      vars: { k, row: cur ? cur[0] : '—', col: cur ? cur[1] : '—', direction: NAMES[d] }, logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, result,
    });

  push('Start', `An empty ${n}×${n} grid. We will write 1, 2, …, ${n * n} along a clockwise spiral.`,
    'Instead of walls we use one direction vector and turn right whenever the next cell is off the grid or already filled.', 'info', [1, 2], [1, 2], 0);

  for (k = 1; k <= n * n; k++) {
    cur = [r, c];
    g[r][c] = k;
    push(`Write ${k}`, `Put ${k} at (${r}, ${c}), heading ${NAMES[d]}.`, 'Fill the current cell, then look at where one more step would land.', 'info', [4, 5], [4, 5], 1);
    if (k === n * n) break;
    const nr = r + DR[d];
    const nc = c + DC[d];
    if (nr < 0 || nc < 0 || nr >= n || nc >= n || g[nr][nc] !== 0) {
      const old = NAMES[d];
      d = (d + 1) % 4;
      push(`Turn ${old} → ${NAMES[d]}`, `The next cell (${nr}, ${nc}) is ${nr < 0 || nc < 0 || nr >= n || nc >= n ? 'outside the grid' : 'already filled'}, so rotate clockwise.`,
        'A turn happens exactly at the edge of the grid or at the edge of the filled region.', 'warn', [6, 7], [6, 7], 2);
    }
    r += DR[d];
    c += DC[d];
  }

  cur = null;
  k = n * n;
  push('Done', `All ${n * n} numbers are placed.`, 'Every cell was filled exactly once.', 'success', [10], [10], 3,
    { title: JSON.stringify(g), text: `${n} × ${n} spiral matrix` });
  return steps;
}

export const spiralMatrixII: ProblemDef<In> = {
  slug: '59-spiral-matrix-ii',
  id: '59', title: 'Spiral Matrix II', difficulty: 'Medium', category: 'Matrix', tag: 'simulation',
  statement: 'Given a positive integer n, build an n × n matrix containing 1 through n² in clockwise spiral order, starting at the top-left cell.',
  constraints: '1 ≤ n ≤ 20 (animation input is limited to n ≤ 7)',
  examples: [
    { label: 'n = 3', input: { n: 3 }, output: '[[1,2,3],[8,9,4],[7,6,5]]' },
    { label: 'n = 4', input: { n: 4 }, output: '[[1,2,3,4],[12,13,14,5],[11,16,15,6],[10,9,8,7]]' },
    { label: 'n = 1', input: { n: 1 }, output: '[[1]]' },
  ],
  inputPlaceholder: 'a number from 1 to 7, e.g. 4',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Cell just written', state: 'active' }, { label: 'Filled', state: 'sorted' }, { label: 'Still empty', state: 'dim' }],
  varLabels: ['k', 'row', 'col', 'direction'],
  approach: {
    title: 'Walk with a direction, turn at obstacles',
    text: 'Start at the top-left heading right. Write the next number, then peek one step ahead. If that cell is off the grid or already filled, rotate the direction clockwise (right, down, left, up) before moving.',
  },
  java: [
    'public int[][] generateMatrix(int n) {',
    '    int[][] g = new int[n][n];',
    '    int[] dr = {0, 1, 0, -1}, dc = {1, 0, -1, 0};',
    '    int r = 0, c = 0, d = 0;',
    '    for (int k = 1; k <= n * n; k++) {',
    '        g[r][c] = k;',
    '        int nr = r + dr[d], nc = c + dc[d];',
    '        if (nr < 0 || nc < 0 || nr >= n || nc >= n || g[nr][nc] != 0) d = (d + 1) % 4;',
    '        r += dr[d]; c += dc[d];',
    '    }',
    '    return g;',
    '}',
  ],
  python: [
    'def generate_matrix(n):',
    '    g = [[0] * n for _ in range(n)]',
    '    dr, dc = [0, 1, 0, -1], [1, 0, -1, 0]',
    '    r = c = d = 0',
    '    for k in range(1, n * n + 1):',
    '        g[r][c] = k',
    '        nr, nc = r + dr[d], c + dc[d]',
    '        if not (0 <= nr < n and 0 <= nc < n) or g[nr][nc] != 0:',
    '            d = (d + 1) % 4',
    '        r += dr[d]; c += dc[d]',
    '    return g',
  ],
  algorithm: [
    'Create an empty n × n grid and start at (0, 0) heading right',
    'Write the next number into the current cell',
    'If the next cell is off the grid or filled, turn clockwise',
    'Step forward; after n² numbers return the grid',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(1) extra (besides the output)' }],
  why: 'The spiral only turns when blocked, and a blocked cell is always either the grid edge or a cell already written, so the path never overlaps itself and never skips an empty cell. After each number we move exactly one step, so n² numbers visit n² cells exactly once.',
};
