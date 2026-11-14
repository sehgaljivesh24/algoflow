import type { Cell, LogicTone, ProblemDef, Step } from '../engine/types.ts';
import { plural, verb } from './text.ts';

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
  const push = (title: string, tag: string, desc: string, note: string, logic: string, tone: LogicTone, j: number[], p: number[], a: number, extra: { result?: Step['result']; alert?: string } = {}) =>
    steps.push({
      title, tag, desc, note, alert: extra.alert, scene: { kind: 'grid', rows: rows(), rowHeads: g.map((_, i) => String(i)), colHeads: g.map((_, i) => String(i)) },
      vars: { k, row: cur ? cur[0] : '—', col: cur ? cur[1] : '—', direction: NAMES[d] }, logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, result: extra.result,
    });

  push('Start', 'START —', `an empty ${n}×${n} grid: write 1, 2, …, ${n * n} along a clockwise spiral, starting at (0, 0) heading right.`, `r = 0, c = 0, d = right`,
    'Instead of walls we use one direction vector and turn right whenever the next cell is off the grid or already filled.', 'info', [1, 2, 3], [1, 2, 3], 0);

  for (k = 1; k <= n * n; k++) {
    cur = [r, c];
    g[r][c] = k;
    push(`Write ${k}`, 'WRITE:', `put ${k} into cell (${r}, ${c}) while heading ${NAMES[d]}; ${n * n - k} cell${n * n - k === 1 ? '' : 's'} still to fill.`, `g[${r}][${c}] = ${k}`,
      'Fill the current cell, then look at where one more step would land.', 'info', [5], [5], 1);
    if (k === n * n) break;
    const nr = r + DR[d];
    const nc = c + DC[d];
    if (nr < 0 || nc < 0 || nr >= n || nc >= n || g[nr][nc] !== 0) {
      const old = NAMES[d];
      const outside = nr < 0 || nc < 0 || nr >= n || nc >= n;
      d = (d + 1) % 4;
      push(`Turn ${old} → ${NAMES[d]}`, 'TURN:', `the next cell (${nr}, ${nc}) is ${outside ? 'outside the grid' : 'already filled'}, so rotate clockwise from ${old} to ${NAMES[d]}.`,
        `(${nr}, ${nc}) ${outside ? 'off grid' : `holds ${g[nr][nc]}`} → d = ${NAMES[d]}`,
        'A turn happens exactly at the edge of the grid or at the edge of the filled region.', 'warn', [6, 7], [6, 7, 8], 2,
        { alert: `Blocked: (${nr}, ${nc}) is ${outside ? 'outside the grid' : `already filled with ${g[nr][nc]}`}, so the walk turns ${NAMES[d]}.` });
    }
    r += DR[d];
    c += DC[d];
  }

  cur = null;
  k = n * n;
  push('Done', '✅ Done!', `all ${plural(n * n, 'number')} ${verb(n * n, 'is', 'are')} placed in a spiral and every cell was filled exactly once.`, `return g (${n} × ${n})`, 'Every cell was filled exactly once.', 'success', [10], [10], 3,
    { result: { title: JSON.stringify(g), text: `${n} × ${n} spiral matrix` } });
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
  phases: [
    { icon: '🧱', label: 'Empty grid, head right', tone: 'blue' },
    { icon: '✏️', label: 'Write next number', tone: 'green' },
    { icon: '↩️', label: 'Blocked: turn clockwise', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['n × n matrix', 'clockwise spiral order'],
  algorithm: [
    'Create an empty n × n grid and start at (0, 0) heading right',
    'Write the next number into the current cell',
    'If the next cell is off the grid or filled, turn clockwise; then step forward',
    'Done: after n² numbers return the grid',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(1) extra (besides the output)' }],
  why: 'The spiral only turns when blocked, and a blocked cell is always either the grid edge or a cell already written, so the path never overlaps itself and never skips an empty cell. After each number we move exactly one step, so n² numbers visit n² cells exactly once.',
};
