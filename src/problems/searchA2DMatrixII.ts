import type { Cell, LogicTone, ProblemDef, Step } from '../engine/types.ts';

interface In { m: number[][]; target: number }

function parse(raw: string): In {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error('Format: matrix rows, then "|", then the target, e.g. 1 4 7; 2 5 8; 3 6 9 | 5');
  const m = parts[0].split(/[;/\n]+/).map((r) => r.trim()).filter(Boolean).map((r) => r.split(/[\s,]+/).filter(Boolean).map(Number));
  const target = Number(parts[1].trim());
  if (!m.length || m.some((r) => !r.length || r.some((n) => !Number.isInteger(n)))) throw new Error('Rows must be whole numbers separated by ";"');
  if (!Number.isInteger(target)) throw new Error('The target must be a whole number');
  if (m.some((r) => r.length !== m[0].length)) throw new Error('Every row must have the same number of columns');
  if (m.length > 7 || m[0].length > 9) throw new Error('Use at most 7 rows and 9 columns');
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[0].length; c++) {
      if (c > 0 && m[r][c] < m[r][c - 1]) throw new Error('Each row must be sorted ascending (left to right)');
      if (r > 0 && m[r][c] < m[r - 1][c]) throw new Error('Each column must be sorted ascending (top to bottom)');
    }
  }
  return { m, target };
}

function build({ m, target }: In): Step[] {
  const R = m.length;
  const C = m[0].length;
  let r = 0;
  let c = C - 1;
  let hit: [number, number] | null = null;
  const steps: Step[] = [];

  const rows = (): Cell[][] =>
    m.map((row, i) => row.map((v, j) => {
      let state: Cell['state'];
      if (hit && hit[0] === i && hit[1] === j) state = 'found';
      else if (i === r && j === c) state = 'active';
      else if (i < r || j > c) state = 'dim';
      return { key: `${i},${j}`, value: v, state };
    }));
  const push = (title: string, desc: string, logic: string, tone: LogicTone, j: number[], p: number[], a: number, result?: Step['result']) =>
    steps.push({
      title, desc, scene: { kind: 'grid', rows: rows(), rowHeads: m.map((_, i) => String(i)), colHeads: m[0].map((_, j2) => String(j2)) },
      vars: { target, row: r, col: c, current: r < R && c >= 0 ? m[r][c] : '—' }, logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, result,
    });

  push('Start at the top-right corner', `Looking for ${target}. The top-right cell (${r}, ${c}) = ${m[r][c]} is the largest in its row and the smallest in its column.`,
    'From this corner every move discards a whole row or column: left means smaller, down means larger.', 'info', [1, 2], [1, 2], 0);

  while (r < R && c >= 0) {
    const v = m[r][c];
    if (v === target) {
      hit = [r, c];
      push(`Found ${target} at (${r}, ${c})`, `${v} equals the target.`, 'The staircase walk ended on the target.', 'success', [4], [4, 5], 1,
        { title: 'true', text: `${target} is at row ${r}, column ${c}` });
      return steps;
    }
    if (v > target) {
      push(`${v} > ${target}: move left`, `Everything below ${v} in column ${c} is even bigger, so the whole column is out. c becomes ${c - 1}.`,
        'Too big: eliminate the current column.', 'warn', [5, 6], [6, 7], 2);
      c--;
    } else {
      push(`${v} < ${target}: move down`, `Everything left of ${v} in row ${r} is even smaller, so the whole row is out. r becomes ${r + 1}.`,
        'Too small: eliminate the current row.', 'warn', [7, 8], [8, 9], 3);
      r++;
    }
  }

  push('Walked off the grid', `No row or column is left, so ${target} is not in the matrix.`, 'Every cell was either checked or eliminated by the sorted order.', 'warn', [11], [10], 3,
    { title: 'false', text: `${target} is not in the matrix` });
  return steps;
}

export const searchA2DMatrixII: ProblemDef<In> = {
  slug: '240-search-a-2d-matrix-ii',
  id: '240', title: 'Search a 2D Matrix II', difficulty: 'Medium', category: 'Matrix', tag: 'staircase search',
  statement: 'Each row of the matrix is sorted ascending left to right, and each column is sorted ascending top to bottom. Decide whether a target value is present.',
  constraints: '1 ≤ m, n ≤ 300 (animation input is limited to 7 × 9); rows and columns sorted ascending',
  examples: [
    { label: '1 4 7 11; 2 5 8 12; 3 6 9 16; 10 13 14 17 | 5', input: { m: [[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16], [10, 13, 14, 17]], target: 5 }, output: 'true' },
    { label: '1 4 7 11; 2 5 8 12; 3 6 9 16; 10 13 14 17 | 15', input: { m: [[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16], [10, 13, 14, 17]], target: 15 }, output: 'false' },
    { label: '1 3 5; 2 4 6 | 6', input: { m: [[1, 3, 5], [2, 4, 6]], target: 6 }, output: 'true' },
  ],
  inputPlaceholder: 'matrix | target, e.g. 1 4 7; 2 5 8; 3 6 9 | 5',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current cell', state: 'active' }, { label: 'Eliminated row/column', state: 'dim' }, { label: 'Target found', state: 'found' }],
  varLabels: ['target', 'row', 'col', 'current'],
  approach: {
    title: 'Walk the staircase from a corner',
    text: 'Start at the top-right cell. If it is too big the whole column below it is too big, so step left. If it is too small the whole row to its left is too small, so step down. Each move discards a full line.',
  },
  java: [
    'public boolean searchMatrix(int[][] m, int target) {',
    '    int r = 0, c = m[0].length - 1;',
    '    while (r < m.length && c >= 0) {',
    '        int v = m[r][c];',
    '        if (v == target) return true;',
    '        else if (v > target) {',
    '            c--;',
    '        } else {',
    '            r++;',
    '        }',
    '    }',
    '    return false;',
    '}',
  ],
  python: [
    'def search_matrix(m, target):',
    '    r, c = 0, len(m[0]) - 1',
    '    while r < len(m) and c >= 0:',
    '        v = m[r][c]',
    '        if v == target:',
    '            return True',
    '        if v > target:',
    '            c -= 1',
    '        else:',
    '            r += 1',
    '    return False',
  ],
  algorithm: [
    'Start at the top-right corner',
    'If the cell equals the target, return true',
    'If it is larger than the target, move left (drop the column)',
    'If it is smaller, move down (drop the row); if you fall off the grid return false',
  ],
  complexity: [{ label: 'Time', value: 'O(m + n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The top-right cell is the maximum of its row and the minimum of its column, so comparing it with the target always rules out a full row or a full column without losing the answer. Each step shrinks the live rectangle by one line, so at most m + n steps happen.',
};
