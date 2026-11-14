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
  const push = (title: string, desc: string, logic: string, tone: LogicTone, j: number[], p: number[], a: number, extra: { tag: string; note: string; alert?: string }, result?: Step['result']) =>
    steps.push({
      title, desc, scene: { kind: 'grid', rows: rows(), rowHeads: m.map((_, i) => String(i)), colHeads: m[0].map((_, j2) => String(j2)) },
      vars: { target, row: r, col: c, current: r < R && c >= 0 ? m[r][c] : '—' }, logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, result, ...extra,
    });

  push('Start at the top-right corner', `looking for ${target}: the top-right cell (${r}, ${c}) = ${m[r][c]} is the largest in its row and the smallest in its column`,
    'From this corner every move discards a whole row or column: left means smaller, down means larger.', 'info', [1, 2], [1, 2], 0,
    { tag: 'START', note: `r = 0, c = ${c}, target = ${target}` });

  while (r < R && c >= 0) {
    const v = m[r][c];
    push(`Compare ${v} with ${target}`, `cell (${r}, ${c}) holds ${v}: ${v === target ? `${v} = ${target}, a match` : v > target ? `${v} > ${target}, too big` : `${v} < ${target}, too small`}`,
      'The corner cell is the max of its row and the min of its column, so one comparison rules out a whole line.', v === target ? 'success' : 'info', [3, 4], [3, 4], 1,
      { tag: 'COMPARE', note: `v = m[${r}][${c}] = ${v}; v == target is ${v === target}` });
    if (v === target) {
      hit = [r, c];
      push('Done', `${target} sits at row ${r}, column ${c}, so the answer is true`, 'The staircase walk ended on the target.', 'success', [4], [4, 5], 4,
        { tag: '✅ Done!', note: 'v == target → return true' }, { title: 'true', text: `${target} is at row ${r}, column ${c}` });
      return steps;
    }
    if (v > target) {
      const oldC = c;
      c--;
      push(`${v} > ${target}: move left`, `${v} > ${target}, so column ${oldC} is out (everything below ${v} is even bigger) and c becomes ${c}`,
        'Too big: eliminate the current column.', 'warn', [5, 6], [6, 7], 2,
        { tag: 'MOVE LEFT', note: `c-- → c = ${c}`, alert: `Column ${oldC} is eliminated: every cell from row ${r} down is at least ${v}, more than ${target}.` });
    } else {
      const oldR = r;
      r++;
      push(`${v} < ${target}: move down`, `${v} < ${target}, so row ${oldR} is out (everything left of ${v} is even smaller) and r becomes ${r}`,
        'Too small: eliminate the current row.', 'warn', [7, 8], [8, 9], 3,
        { tag: 'MOVE DOWN', note: `r++ → r = ${r}`, alert: `Row ${oldR} is eliminated: every cell up to column ${c} is at most ${v}, less than ${target}.` });
    }
  }

  push('Walked off the grid', `r = ${r} and c = ${c} left the matrix, so no row or column remains and ${target} is not present`, 'Every cell was either checked or eliminated by the sorted order.', 'warn', [11], [10], 4,
    { tag: '✅ Done!', note: 'loop ends → return false', alert: `The staircase walk left the grid: ${target} is not in the matrix.` }, { title: 'false', text: `${target} is not in the matrix` });
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
  emphasis: ['sorted ascending', 'target'],
  phases: [
    { icon: '🚩', label: 'START top-right', tone: 'blue' },
    { icon: '⚖', label: 'COMPARE with target', tone: 'cyan' },
    { icon: '⬅', label: 'TOO BIG → left', tone: 'orange' },
    { icon: '⬇', label: 'TOO SMALL → down', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
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
    'Compare the cell with the target; if equal, return true',
    'If it is larger than the target, move left (drop the column)',
    'If it is smaller, move down (drop the row)',
    'Return true on a match, or false once you fall off the grid',
  ],
  complexity: [{ label: 'Time', value: 'O(m + n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The top-right cell is the maximum of its row and the minimum of its column, so comparing it with the target always rules out a full row or a full column without losing the answer. Each step shrinks the live rectangle by one line, so at most m + n steps happen.',
};
